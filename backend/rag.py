import json
import numpy as np
from typing import List, Dict
from dotenv import load_dotenv

from inference import get_provider

load_dotenv()


class SimpleRAG:
    def __init__(self, news_file: str = "news.json", provider: str = "crusoe", embed_provider: str = "openai"):
        """
        Args:
            news_file: Path to the news JSON file.
            provider: Name of the inference provider for completions (e.g. 'crusoe', 'openai').
            embed_provider: Name of the provider to use for embeddings (must support embeddings).
        """
        self.provider = get_provider(provider)
        self.embed_provider = get_provider(embed_provider)
        self.articles: list[dict] = []
        self.embeddings: list[list[float]] = []

        with open(news_file, 'r', encoding='utf-8') as f:
            self.articles = json.load(f)

        print(f"Loaded {len(self.articles)} articles (provider={self.provider.name})")

        # Auto-create embeddings if embed provider is available
        if len(self.articles) > 0:
            print(f"Auto-creating embeddings via {self.embed_provider.name}...")
            try:
                self.create_embeddings()
            except Exception as e:
                print(f"Could not create embeddings: {e}")
                print("  -> Check API key or call /create-embeddings endpoint")

    def create_embeddings(self):
        """Create embeddings for all articles."""
        print("Creating embeddings...")
        texts = [f"{art['title']} {art['content']}" for art in self.articles]

        # embed() returns list[list[float]]
        self.embeddings = self.embed_provider.embed(texts)
        print(f"Created {len(self.embeddings)} embeddings via {self.embed_provider.name}")

    def cosine_similarity(self, a: list[float], b: list[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        a_np = np.array(a)
        b_np = np.array(b)
        return float(np.dot(a_np, b_np) / (np.linalg.norm(a_np) * np.linalg.norm(b_np)))

    def search(self, query: str, top_k: int = 5) -> List[Dict]:
        """Search for relevant articles using semantic similarity."""
        if not self.embeddings:
            self.create_embeddings()

        # Get query embedding (single text -> list of 1 vector)
        query_vecs = self.embed_provider.embed(query)
        query_embedding = query_vecs[0]

        # Calculate similarities
        similarities = []
        for idx, emb in enumerate(self.embeddings):
            sim = self.cosine_similarity(query_embedding, emb)
            similarities.append((idx, sim, self.articles[idx]))

        # Sort by similarity and return top_k
        similarities.sort(key=lambda x: x[1], reverse=True)
        results = [
            {
                **item[2],
                "similarity_score": float(item[1])
            }
            for item in similarities[:top_k]
        ]

        return results

    def generate_answer(self, query: str, context_articles: List[Dict]) -> Dict:
        """Generate FACT-BASED answer using LLM with context."""

        # Build context from articles
        context = "\n\n" + "=" * 80 + "\n\n".join([
            f"SOURCE {i+1}: {art['source']} ({art['date']})\n" + "=" * 80 +
            f"\nTitle: {art['title']}\nContent: {art['content'][:2000]}\nURL: {art['url']}"
            for i, art in enumerate(context_articles)
        ])

        system_prompt = """You are an investigative journalist specializing in fact-checking.

YOUR MISSION:
- Generate a FACT-BASED article (NO opinions, NO speculation)
- CRITICALLY IMPORTANT: You MUST use information from MULTIPLE different sources
- Every fact MUST cite ALL sources that mention it (not just one)
- Identify CONSENSUS (what 2+ sources confirm) vs DIVERGENCES (only 1 source)
- Detect BIASES by comparing how different outlets report the same fact

RESPONSE FORMAT (JSON):
{
  "headline": "Clear and factual headline",
  "summary": "2-3 line summary of main facts",
  "facts": [
    {
      "claim": "Specific and verifiable fact",
      "sources": ["URL1", "URL2", "URL3"],
      "source_names": ["Source1", "Source2", "Source3"],
      "evidence": "Direct quote or concrete data",
      "confidence": "high/medium/low",
      "consensus": true
    }
  ],
  "divergences": [
    {
      "topic": "Aspect where sources differ",
      "versions": [
        {"source": "Wired", "claim": "...", "url": "..."},
        {"source": "NYT", "claim": "...", "url": "..."}
      ]
    }
  ],
  "bias_analysis": "Brief analysis comparing how different sources frame this story",
  "consensus_score": 0.0-1.0,
  "coverage_quality": "high/medium/low"
}

CRITICAL RULES:
1. You have articles from DIFFERENT sources - USE THEM ALL
2. For each fact, CHECK if other sources mention it too
3. If 2+ sources mention a fact -> "consensus": true + list ALL sources
4. If only 1 source mentions it -> "consensus": false + note in divergences
5. ALWAYS include 'divergences' showing where sources disagree
6. COMPARE how different outlets frame the story (bias_analysis)
7. NO speculation beyond what sources explicitly state"""

        user_prompt = f"""User question: {query}

You have {len(context_articles)} articles from DIFFERENT news sources below.
IMPORTANT: Cross-reference them to find what multiple sources agree on.

Reference articles:
{context}

Generate a consensus fact-based article that:
1. Identifies facts confirmed by MULTIPLE sources (consensus: true)
2. Notes facts from only ONE source (consensus: false, add to divergences)
3. Compares how different sources frame this story (bias_analysis)"""

        response = self.provider.complete(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            json_mode=True,
        )

        return json.loads(response.content)


# Global instance
rag = SimpleRAG()
