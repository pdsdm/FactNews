# FactNews Backend

FastAPI backend for multi-source news fact-checking with RAG and multi-provider LLM inference.

## Setup

```bash
python3 -m venv env
source env/bin/activate       # Linux/Mac
# env\Scripts\activate        # Windows
pip install -r requirements.txt
```

## Environment Variables

Create a `.env` file in this directory. Add keys only for the providers you want to use:

```env
# Required for RAG completions (currently active)
CRUSOE_API_KEY=your_key_here

# Required for default embeddings (OpenAI)
OPENAI_API_KEY=your_key_here

# Redis URL for fast embedding cache
REDIS_URL=redis://localhost:6379

# Model Council Providers (comma separated list of providers for the ask endpoint to deliberate over)
COUNCIL_PROVIDERS=openai,deepseek,anthropic

# Optional - enable additional providers
ANTHROPIC_API_KEY=your_key_here
DEEPSEEK_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
GROK_API_KEY=your_key_here
ZAI_API_KEY=your_key_here
```

> Embeddings require a provider that supports them. Currently `openai` and `google` do.
> The default RAG setup uses `crusoe` for completions and `openai` for embeddings.

## Architecture Highlights

1. **Optimized Chunk-level RAG**: 
   - A multi-tiered embedding cache handles rapid lookups (Redis -> local `.npz` file -> OpenAI API). 
   - Fast numpy vector operations allow instantaneous similarity searches without needing a heavy Vector DB setup for < 1M chunks.
   - Cross-process concurrency is safely managed using `filelock` to avoid corruption when writing to `.npz` files.
2. **Model Council**: 
   - The `/ask` endpoint uses a `ModelCouncil` to concurrently deliberate over retrieved facts.
   - Multiple LLMs process the retrieved RAG chunks in parallel. A "judge" LLM then evaluates the responses, extracts agreement/disagreement points, and synthesizes a final structured JSON answer.
3. **Graceful Fallbacks**:
   - The app runs fine even if Redis is unavailable, cleanly degrading to the local `npz` cache.
   - If one Model Council provider fails or rate-limits, the deliberation process seamlessly continues with the successful models.

```
backend/
  app.py              # FastAPI routes
  rag_optimized.py    # Optimized ChunkRAG with multi-tier cache & filelock
  embedding_cache.py  # Redis embedding store
  chunker.py          # News chunking logic
  rss_ingester.py     # RSS feed ingestion
  news.json           # Cached articles

  inference/                         # Multi-provider LLM layer
    __init__.py                      # get_provider, list_providers, ModelCouncil
    council.py                       # ModelCouncil: N models + 1 LLM judge
    providers/                       # Provider integrations (OpenAI, DeepSeek, etc.)
```

## Inference System

All providers share the same OpenAI-compatible interface. Switching providers requires one line:

```python
from inference import get_provider

provider = get_provider("crusoe")   # or "openai", "deepseek", "grok", etc.
response = provider.complete([{"role": "user", "content": "Hello"}])
print(response.content)
```

To add a new provider, add an entry to `inference/config.py` and a 3-line class in `inference/providers/`.

### Model Council

Multiple models deliberate in parallel, then a judge LLM synthesizes the best answer:

```python
from inference import ModelCouncil

council = ModelCouncil(
    providers=["crusoe", "deepseek", "grok"],
    judge="openai"
)
result = council.deliberate("Analyze this news story")
print(result["judgment"]["synthesis"])
print(result["judgment"]["agreement_points"])
```

The judge returns a structured JSON with `synthesis`, `agreement_points`, `disagreement_points`, `model_rankings`, and `confidence`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Status + active providers |
| GET | `/stats` | Article and embedding counts |
| POST | `/ask` | Generate consensus fact-check from a question |
| POST | `/refresh-news` | Re-ingest RSS feeds and rebuild embeddings |
| POST | `/create-embeddings` | Rebuild embeddings without re-ingesting |
