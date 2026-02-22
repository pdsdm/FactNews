"""
AI Newspaper — generates fact-checked, unbiased articles from clustered news.

Pipeline:
  1. Cluster raw articles by story (TF-IDF similarity)
  2. For each top cluster, vector-search the chunk index for rich context
  3. Ask a fast LLM to write a factual article with source citations
  4. Return a structured "edition" ready for the front-end feed
"""
from __future__ import annotations

import asyncio
import json
import os
import random
import time
from typing import Dict, List, Optional

from clustering import ArticleClusterer
from inference import get_provider
from inference.config import PROVIDERS


# ── Helpers ──────────────────────────────────────────────────────────────────

class _ProviderQuotaError(Exception):
    """Raised when a provider returns a rate-limit / quota-exceeded error."""


def _pick_fast_provider(skip: set[str] | None = None) -> str | None:
    """Return the name of an available fast provider, skipping blacklisted ones."""
    preferred = ["cerebras", "crusoe", "google", "grok", "deepseek", "openai", "anthropic"]
    for name in preferred:
        if skip and name in skip:
            continue
        cfg = PROVIDERS.get(name)
        if cfg and os.getenv(cfg["env_key"]):
            return name
    return None


ARTICLE_SYSTEM = """You are a senior journalist at a prestigious fact-based newspaper.
Write a balanced, factual article using ONLY the information provided in the source material.
Rules:
- NO personal opinions, speculation, or editorializing.
- Attribute key facts to their source newspaper in parentheses, e.g. "(BBC News)".
- Use a neutral, professional tone like Reuters or AP.
- Structure: compelling headline → lead paragraph (who/what/when/where) → body → context.
- If sources disagree, present both sides fairly.
- Keep it concise: 250-400 words for the body."""

ARTICLE_PROMPT = """Write a fact-based news article synthesizing the following reports from different newspapers about the same story.

TOPIC: {topic}

SOURCE MATERIAL:
{context}

Respond in JSON:
{{
  "headline": "Clear, factual headline (max 15 words)",
  "summary": "1-2 sentence lead (who, what, when, where)",
  "body": "Full article body with source attributions in parentheses. Use paragraphs separated by \\n\\n.",
  "sources_referenced": ["Source Name 1", "Source Name 2", ...],
  "category": "one of: Politics, World, Economy, Technology, Science, Health, Sports, Entertainment, Other"
}}"""


# ── Core ─────────────────────────────────────────────────────────────────────

def _build_context_from_cluster(cluster: Dict, chunk_rag=None, max_chunks: int = 12) -> str:
    """Build rich context for a cluster using RAG chunks + article summaries."""
    parts: list[str] = []

    # 1. If we have a RAG index, vector-search for the topic
    if chunk_rag and chunk_rag.chunk_embeddings is not None:
        query = cluster["representative_title"]
        chunks = chunk_rag.search_chunks(query, top_k=max_chunks)
        seen_sources: set[str] = set()
        for ch in chunks:
            src = ch.get("source", "Unknown")
            text = ch.get("text", "")
            if text and len(text) > 60:
                parts.append(f"[{src}] {text}")
                seen_sources.add(src)
    else:
        # Fallback: use raw article content from the cluster
        for art in cluster["articles"][:6]:
            src = art.get("source", "Unknown")
            title = art.get("title", "")
            content = art.get("content", "")[:800]
            parts.append(f"[{src}] {title}\n{content}")

    return "\n\n---\n\n".join(parts)


def _generate_article(topic: str, context: str, provider_name: str) -> Optional[Dict]:
    """Call the LLM to write one article. Returns None if output is invalid."""
    provider = get_provider(provider_name)
    try:
        resp = provider.complete(
            messages=[
                {"role": "system", "content": ARTICLE_SYSTEM},
                {"role": "user", "content": ARTICLE_PROMPT.format(topic=topic, context=context)},
            ],
            temperature=0.3,
            json_mode=True,
        )
        raw = resp.content.strip()

        # Handle markdown-wrapped JSON (```json ... ```)
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        article = json.loads(raw)

        # Validate required fields are non-empty strings
        headline = (article.get("headline") or "").strip()
        summary = (article.get("summary") or "").strip()
        body = (article.get("body") or "").strip()

        if not headline or not summary or not body:
            print(f"  ⚠️  Article for '{topic[:50]}' has empty fields — headline={bool(headline)} summary={bool(summary)} body={bool(body)}")
            # Try to salvage: use topic as headline fallback
            if not headline:
                article["headline"] = topic
            if not summary and body:
                article["summary"] = body[:200].rsplit(".", 1)[0] + "." if "." in body[:200] else body[:200]
            if not body and summary:
                article["body"] = summary
            # If still no content at all, skip
            if not (article.get("headline") or "").strip() or not ((article.get("body") or "").strip() or (article.get("summary") or "").strip()):
                print(f"  ❌  Skipping '{topic[:50]}' — no usable content")
                return None

        # Ensure list fields
        if not isinstance(article.get("sources_referenced"), list):
            article["sources_referenced"] = []
        if not article.get("category"):
            article["category"] = "Other"

        return article
    except json.JSONDecodeError as e:
        print(f"  ⚠️  JSON parse failed for '{topic[:50]}': {e}")
        return None
    except Exception as e:
        err_str = str(e)
        # Detect quota / rate-limit errors — signal caller to switch provider
        if "429" in err_str or "quota" in err_str.lower() or "rate_limit" in err_str.lower() or "token_quota" in err_str.lower():
            raise _ProviderQuotaError(f"{provider_name}: {err_str[:120]}") from e
        print(f"  ⚠️  Article generation failed for '{topic[:50]}': {e}")
        return None


def generate_newspaper_edition(
    articles: List[Dict],
    chunk_rag=None,
    max_stories: int = 8,
    provider_name: str | None = None,
) -> Dict:
    t0 = time.time()
    blacklisted: set[str] = set()
    provider = provider_name or _pick_fast_provider(skip=blacklisted)
    if not provider:
        provider = "openai"  # last resort
    print(f"📰 Generating newspaper edition with {provider}...")

    # 1. Cluster articles
    clusterer = ArticleClusterer(similarity_threshold=0.3)
    clusters = clusterer.get_story_clusters(articles)

    # Filter: only clusters with 2+ articles from different sources
    multi_source = [
        c for c in clusters
        if c["unique_sources"] >= 2 and c["article_count"] >= 2
    ]

    # If not enough multi-source, also include large single-source clusters
    if len(multi_source) < max_stories:
        remaining = [c for c in clusters if c not in multi_source and c["article_count"] >= 1]
        multi_source.extend(remaining[:max_stories - len(multi_source)])

    top_clusters = multi_source[:max_stories]
    print(f"  📊 {len(clusters)} total clusters → {len(top_clusters)} selected stories")

    # 2. Generate an article for each cluster
    REQUIRED_FIELDS = {"headline", "summary", "body", "sources_referenced", "category"}
    generated: list[Dict] = []
    for i, cluster in enumerate(top_clusters):
        topic = cluster["representative_title"]
        print(f"  ✍️  [{i+1}/{len(top_clusters)}] {topic[:60]}...")

        context = _build_context_from_cluster(cluster, chunk_rag)

        # Try current provider, auto-fallback on quota errors
        article = None
        all_exhausted = False
        retries = 0
        while retries < len(PROVIDERS):
            try:
                article = _generate_article(topic, context, provider)
                break
            except _ProviderQuotaError as exc:
                print(f"  ⚠️  Quota exceeded on {provider}: {exc}")
                blacklisted.add(provider)
                next_provider = _pick_fast_provider(skip=blacklisted)
                if not next_provider:
                    print("  ❌  All providers quota-exceeded. Stopping generation.")
                    all_exhausted = True
                    break
                print(f"  ➡️  Switching to {next_provider}")
                provider = next_provider
                retries += 1

        if all_exhausted:
            break

        if article and REQUIRED_FIELDS.issubset(article.keys()) and article.get("headline") and article.get("body"):
            article["source_count"] = cluster["unique_sources"]
            article["cluster_size"] = cluster["article_count"]
            article["original_urls"] = cluster.get("urls", [])[:5]
            # Pick first available image from source articles in the cluster
            image_url = next(
                (a.get("image_url", "") for a in cluster.get("articles", []) if a.get("image_url")),
                ""
            )
            article["image_url"] = image_url
            generated.append(article)

    elapsed = round(time.time() - t0, 1)
    all_sources = set()
    for g in generated:
        all_sources.update(g.get("sources_referenced", []))

    print(f"📰 Edition complete: {len(generated)} articles in {elapsed}s")

    return {
        "edition_time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "articles": generated,
        "total_sources": len(all_sources),
        "generation_time_s": elapsed,
    }
