# Consensus Newsroom

AI-powered news verification system that analyzes multiple sources and uses a council of LLMs to find consensus and contested facts.

## 🎯 Features

- **Multi-source ingestion**: Collect news from 20+ media outlets via RSS
- **Vector search**: Semantic search powered by Supabase pgvector
- **LLM Council**: Multiple AI models cross-verify facts
- **Consensus scoring**: Identify agreed facts vs. contested information
- **Transparent sourcing**: Every claim links back to original sources

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Backend (FastAPI)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
python app.py
```

Backend runs on: http://localhost:8000  
API Docs: http://localhost:8000/docs

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: http://localhost:3000

## 📦 Stack

- **Backend**: FastAPI + Python
- **Frontend**: Next.js + TailwindCSS
- **Vector DB**: Supabase (pgvector)
- **LLMs**: OpenAI, Anthropic, Google
- **Ingestion**: RSS feeds

## 🛠️ Development Roadmap

- [x] Project setup with Git
- [x] Phase 1: Hello World MVP (Backend + Frontend)
- [ ] Phase 2: Single LLM + embeddings
- [ ] Phase 3: RSS ingestion
- [ ] Phase 4: Vector DB integration (Supabase pgvector)
- [ ] Phase 5: Multi-LLM council
- [ ] Phase 6: Consensus UI

## 🌐 GitHub Repository

To publish this repo to GitHub:

```bash
# If using GitHub CLI (recommended)
gh auth login
gh repo create FactNews --public --source=. --remote=origin --push

# Or manually:
# 1. Go to https://github.com/new
# 2. Create repo named "FactNews" (public, no README)
# 3. Then run:
git remote add origin https://github.com/YOUR_USERNAME/FactNews.git
git branch -M main
git push -u origin main
```

## 🔑 Environment Variables

Create `backend/.env` from `backend/.env.example`:
- `OPENAI_API_KEY`: Your OpenAI API key
- `SUPABASE_URL`: Your Supabase project URL  
- `SUPABASE_KEY`: Your Supabase anon key

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details
