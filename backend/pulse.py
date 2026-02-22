"""
AI Arena — Six LLMs compete, one anonymous judge scores them all.

Stage 1: Six analysts answer in parallel (28s timeout).
Stage 2: Judge reads every answer, rates each model 1-10, picks best/worst.
"""

from __future__ import annotations

import json
import os
import random
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

ANALYSTS = [
    {"id": "openai/gpt-4o-mini",          "display_name": "GPT-4o Mini"},
    {"id": "anthropic/claude-haiku-4.5",   "display_name": "Claude Haiku 4.5"},
    {"id": "google/gemini-2.5-flash",      "display_name": "Gemini 2.5 Flash"},
    {"id": "x-ai/grok-4.1-fast",          "display_name": "Grok 4.1 Fast"},
    {"id": "mistralai/mistral-large-2512", "display_name": "Mistral Large 3"},
    {"id": "google/gemini-2.0-flash-001",  "display_name": "Gemini 2.0 Flash"},
]

JUDGE_POOL = [
    "openai/gpt-4o-mini",
    "anthropic/claude-haiku-4.5",
    "google/gemini-2.5-flash",
    "x-ai/grok-4.1-fast",
]

ANALYST_PROMPT = """You are a concise news analyst. Analyze the following topic/claim and give your honest, factual assessment in 3-5 sentences.

Topic: {news_data}

Reply ONLY with JSON: {{"answer":"Your 3-5 sentence analysis here."}}"""

JUDGE_PROMPT = """You are an impartial judge evaluating how well each AI model answered a question.

Original question: {news_data}

Here are the model answers:
{analyst_block}

Rate each model's answer from 1 to 10 based on accuracy, depth, and clarity.
Identify key points where models AGREE and DISAGREE.
Then write a short verdict (2-3 sentences) explaining which model did best and which did worst, and why.

Reply ONLY with valid JSON:
{{"ratings":{{"Model Name":8,"Another Model":6}},"agreements":["Point 1 where models agree","Point 2 where models agree"],"disagreements":["Point 1 where models disagree","Point 2 where models disagree"],"verdict":"Your 2-3 sentence summary of rankings.","best":"Best Model Name","worst":"Worst Model Name"}}"""

ANALYST_TIMEOUT_S = 28
MIN_ANALYSTS_FOR_JUDGE = 3


def _parse_json(raw: str | None) -> dict:
    if not raw or not raw.strip():
        raise ValueError("Empty or missing response")
    c = raw.strip()
    if c.startswith("```"):
        c = c.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    return json.loads(c)


def _query_analyst(analyst: dict, news_data: str) -> dict:
    start = time.time()
    try:
        res = client.chat.completions.create(
            model=analyst["id"],
            messages=[{"role": "user", "content": ANALYST_PROMPT.format(news_data=news_data)}],
            temperature=0.3,
            max_tokens=512,
        )
        raw = getattr(res.choices[0].message, "content", None) if res.choices else None
        if not raw or not str(raw).strip():
            return {
                **analyst, "status": "error",
                "error": "Empty response", "answer": None,
                "latency_s": round(time.time() - start, 2),
            }
        parsed = _parse_json(str(raw).strip())
        return {
            **analyst, "status": "ok",
            "answer": parsed.get("answer", str(raw).strip()),
            "latency_s": round(time.time() - start, 2),
        }
    except (json.JSONDecodeError, ValueError):
        # If JSON parse fails, try to use raw text as the answer
        raw_text = getattr(res.choices[0].message, "content", "") if res.choices else ""
        return {
            **analyst, "status": "ok",
            "answer": str(raw_text).strip() if raw_text else "Parse error",
            "latency_s": round(time.time() - start, 2),
        }
    except Exception as e:
        return {
            **analyst, "status": "error",
            "error": str(e), "answer": None,
            "latency_s": round(time.time() - start, 2),
        }


def get_ai_industry_analysis(news_data: str) -> dict:
    # ── Stage 1: Parallel analyst queries ─────────────────────────────
    results: list[dict] = []
    timed_out: list[dict] = []

    with ThreadPoolExecutor(max_workers=len(ANALYSTS)) as pool:
        future_map = {pool.submit(_query_analyst, a, news_data): a for a in ANALYSTS}
        try:
            for future in as_completed(future_map, timeout=ANALYST_TIMEOUT_S):
                results.append(future.result())
        except TimeoutError:
            for f, a in future_map.items():
                if not f.done():
                    timed_out.append({
                        **a, "status": "timeout",
                        "error": f"Timeout ({ANALYST_TIMEOUT_S}s)",
                        "answer": None, "latency_s": ANALYST_TIMEOUT_S,
                    })

    results.extend(timed_out)
    succeeded = [r for r in results if r["status"] == "ok"]

    # ── Stage 2: Judge rates every answer ─────────────────────────────
    analyst_block = "\n".join(
        f"[{r['display_name']}]: {(r.get('answer') or '')[:500]}"
        for r in succeeded
    )

    judge_model = random.choice(JUDGE_POOL)
    judge: dict = {"ratings": {}, "verdict": "", "best": "", "worst": ""}

    if len(succeeded) >= MIN_ANALYSTS_FOR_JUDGE:
        try:
            j = client.chat.completions.create(
                model=judge_model,
                messages=[{"role": "user", "content": JUDGE_PROMPT.format(
                    news_data=news_data, analyst_block=analyst_block,
                )}],
                temperature=0.2,
                max_tokens=512,
            )
            raw = getattr(j.choices[0].message, "content", None) if j.choices else None
            if raw and str(raw).strip():
                parsed = _parse_json(str(raw).strip())
                ratings_raw = parsed.get("ratings", {})
                # Normalize ratings to int, clamp 1-10
                ratings = {}
                for k, v in ratings_raw.items():
                    try:
                        ratings[k] = max(1, min(10, int(v)))
                    except (ValueError, TypeError):
                        ratings[k] = 5
                judge = {
                    "ratings": ratings,
                    "agreements": parsed.get("agreements", []),
                    "disagreements": parsed.get("disagreements", []),
                    "verdict": parsed.get("verdict", "").strip(),
                    "best": parsed.get("best", "").strip(),
                    "worst": parsed.get("worst", "").strip(),
                }
        except Exception:
            judge["verdict"] = "Judge was unable to produce ratings this time."

    # Fill missing ratings with 5
    for r in succeeded:
        name = r["display_name"]
        if name not in judge["ratings"]:
            judge["ratings"][name] = 5

    # ── Build response ────────────────────────────────────────────────
    models = []
    for r in results:
        entry: dict = {
            "model": r["display_name"],
            "model_id": r["id"],
            "status": r["status"],
            "latency_s": r.get("latency_s", 0),
            "rating": judge["ratings"].get(r["display_name"], 0),
        }
        if r["status"] == "ok":
            entry["answer"] = r.get("answer", "")
        else:
            entry["answer"] = None
            entry["error"] = r.get("error", "Unknown error")
        models.append(entry)

    # Sort by rating descending
    models.sort(key=lambda m: m["rating"], reverse=True)

    return {
        "models": models,
        "judge": {
            "agreements": judge.get("agreements", []),
            "disagreements": judge.get("disagreements", []),
            "verdict": judge["verdict"],
            "best": judge["best"],
            "worst": judge["worst"],
            "judge_model": "Anonymous",
        },
        "meta": {
            "succeeded": len(succeeded),
            "failed": len(results) - len(succeeded),
            "total": len(ANALYSTS),
        },
    }
