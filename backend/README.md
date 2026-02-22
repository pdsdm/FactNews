# Consensus Newsroom API

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
# Required for embeddings
OPENAI_API_KEY=your_key_here

# Required for RAG completions (crusoe is default)
CRUSOE_API_KEY=your_key_here

# Redis URL for fast embedding cache (optional)
REDIS_URL=redis://localhost:6379

# Model Council Providers (comma separated)
COUNCIL_PROVIDERS=openai,deepseek,anthropic

# Optional - enable additional providers
ANTHROPIC_API_KEY=your_key_here
DEEPSEEK_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
GROK_API_KEY=your_key_here
ZAI_API_KEY=your_key_here
CEREBRAS_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
```

> Embeddings require a provider that supports them. Currently `openai` and `google` do.
> The default RAG setup uses `crusoe` for completions and `openai` for embeddings.

## Architecture Highlights

1. **Optimized Chunk-level RAG**: 
   - Multi-tiered embedding cache (Redis -> local `.npz` -> OpenAI API). 
   - Fast numpy vector operations for similarity searches without a heavy Vector DB.
   - Cross-process concurrency with `filelock` for safe `.npz` writes.
2. **Model Council**: 
   - `/ask` endpoint uses `ModelCouncil` for concurrent deliberation over retrieved facts.
   - Multiple LLMs process RAG chunks in parallel; a judge LLM synthesizes the final answer.
3. **Graceful Fallbacks**:
   - Runs fine without Redis, degrading to local `npz` cache.
   - Council deliberation continues if individual providers fail or rate-limit.

```
backend/
  app.py                 # FastAPI routes
  rag_optimized.py       # ChunkRAG with multi-tier cache & filelock
  embedding_cache.py     # Redis embedding store
  response_cache.py      # L1/L2 response caching
  cache.py               # Redis connection utility
  lru_cache.py           # In-memory LRU cache
  chunker.py             # News chunking logic
  rss_ingester.py        # RSS feed ingestion
  scraper.py             # Web scraping utilities
  sources_catalog.py     # Source catalog by country
  pulse.py               # AI Pulse arena logic
  ai_newspaper.py        # Newspaper edition generator
  clustering.py          # Article clustering
  news.json              # Cached articles

  inference/                         # Multi-provider LLM layer
    __init__.py                      # get_provider, list_providers, ModelCouncil
    factory.py                       # Provider factory
    config.py                        # Provider configurations
    base.py                          # InferenceProvider base class
    council.py                       # ModelCouncil: N models + 1 LLM judge
    providers/                       # Provider integrations
      openai_provider.py
      crusoe.py
      deepseek.py
      google.py
      anthropic.py
      grok.py
      cerebras.py
      zai.py
      openrouter.py
```

## Inference System

All providers share the same OpenAI-compatible interface:

```python
from inference import get_provider

provider = get_provider("crusoe")   # or "openai", "deepseek", "cerebras", etc.
response = provider.complete([{"role": "user", "content": "Hello"}])
print(response.content)
```

To add a new provider, add an entry to `inference/config.py` and a class in `inference/providers/`.

### Model Council

Multiple models deliberate in parallel, then a judge LLM synthesizes:

```python
from inference import ModelCouncil

council = ModelCouncil(
    providers=["crusoe", "deepseek", "grok"],
    judge="openai"
)
result = council.deliberate("Analyze this news story")
print(result["judgment"]["synthesis"])
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Status + active providers |
| GET | `/stats` | Article and embedding counts |
| GET | `/health` | Health check (Redis, RAG status) |
| POST | `/ask` | Generate consensus fact-check |
| POST | `/ask/search` | Fast chunk search without AI |
| POST | `/ask/stream` | SSE streaming consensus generation |
| GET | `/articles` | List articles with pagination |
| GET | `/sources/catalog` | All sources grouped by country |
| GET | `/sources/selected` | Currently selected sources |
| PUT | `/sources/selected` | Save source selection & re-scrape |
| GET/POST/DELETE | `/sources` | Legacy source management |
| POST | `/refresh-news` | Re-ingest RSS feeds |
| POST | `/api/ai-pulse` | Multi-agent arena debate |
| GET | `/api/newspaper` | AI-generated newspaper edition |

## Running

```bash
uvicorn app:app --reload --port 8000
```
