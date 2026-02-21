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

# Optional - enable additional providers
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
DEEPSEEK_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
GROK_API_KEY=your_key_here
ZAI_API_KEY=your_key_here
```

> Embeddings require a provider that supports them. Currently `openai` and `google` do.
> The default RAG setup uses `crusoe` for completions and `openai` for embeddings.

## Run

```bash
source env/bin/activate
python app.py
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

## Architecture

```
backend/
  app.py              # FastAPI routes
  rag.py              # SimpleRAG - article search + LLM answer generation
  clustering.py       # Article grouping by story + bias detection
  rss_ingester.py     # RSS feed ingestion
  scraper.py          # Full article scraping
  news.json           # Cached articles

  inference/                         # Multi-provider LLM layer
    __init__.py                      # get_provider, list_providers, ModelCouncil
    base.py                          # InferenceProvider (ABC) + CompletionResponse
    config.py                        # Provider URLs, env keys, default models
    factory.py                       # get_provider("name") with instance cache
    council.py                       # ModelCouncil: N models + 1 LLM judge
    providers/
      _openai_compat.py              # Shared OpenAI-compatible base class
      openai_provider.py             # OpenAI (GPT-4o, GPT-4o-mini)
      crusoe.py                      # Crusoe Cloud (Qwen3-235B)
      deepseek.py                    # DeepSeek
      google.py                      # Google Gemini
      anthropic.py                   # Anthropic Claude
      grok.py                        # xAI Grok
      zai.py                         # Z AI (placeholder)
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
