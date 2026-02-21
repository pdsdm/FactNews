# Consensus Newsroom

AI-powered news verification system that analyzes multiple sources and uses a council of LLMs to find consensus and contested facts.

## 🎯 Features

- **Multi-source ingestion**: Collect news from 20+ media outlets via RSS
- **Vector search**: Semantic search powered by Supabase pgvector
- **LLM Council**: Multiple AI models cross-verify facts
- **Consensus scoring**: Identify agreed facts vs. contested information
- **Transparent sourcing**: Every claim links back to original sources

## 🚀 Quick Start

### Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

## 📦 Stack

- **Backend**: FastAPI + Python
- **Frontend**: Next.js + TailwindCSS
- **Vector DB**: Supabase (pgvector)
- **LLMs**: OpenAI, Anthropic, Google
- **Ingestion**: RSS feeds

## 🛠️ Development Roadmap

- [x] Project setup
- [ ] Phase 1: Hello World MVP
- [ ] Phase 2: Single LLM + embeddings
- [ ] Phase 3: RSS ingestion
- [ ] Phase 4: Vector DB integration
- [ ] Phase 5: Multi-LLM council
- [ ] Phase 6: Consensus UI

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details
