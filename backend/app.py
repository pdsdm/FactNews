from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag_v2 import ChunkRAG  # New chunk-level RAG
from rss_ingester import ingest_news
from clustering import ArticleClusterer, detect_bias_in_cluster
from inference import list_providers, get_provider
import os
import json

app = FastAPI(title="Consensus Newsroom API")

# CORS para Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load articles and initialize chunk-level RAG
with open("news.json", 'r', encoding='utf-8') as f:
    articles = json.load(f)

print("🚀 Initializing Chunk-level RAG...")
chunk_rag = ChunkRAG(articles)

class QuestionRequest(BaseModel):
    question: str

class Fact(BaseModel):
    claim: str
    sources: list[str]
    source_names: list[str] | None = None
    confidence: str
    evidence: str | None = None
    consensus: bool | None = None

class Divergence(BaseModel):
    topic: str
    versions: list[dict]

class ConsensusResponse(BaseModel):
    headline: str | None = None
    summary: str | None = None
    answer: str | None = None
    facts: list[Fact]
    divergences: list[Divergence] | None = None
    bias_analysis: str | None = None
    consensus_score: float
    coverage_quality: str | None = None
    chunks_used: int | None = None
    sources_analyzed: int | None = None

@app.get("/")
def read_root():
    stats = chunk_rag.get_stats()
    return {
        "status": "Consensus Newsroom API running",
        "phase": "FASE 4 - Multi-Provider Inference + Model Council",
        "articles_loaded": len(rag.articles),
        "embeddings_ready": len(rag.embeddings) > 0,
        "inference_provider": rag.provider.name,
        "available_providers": list_providers(),
    }

@app.get("/stats")
def get_stats():
    """Get system statistics"""
    stats = chunk_rag.get_stats()
    return {
        "total_articles": len(rag.articles),
        "fully_scraped": scraped_count,
        "embeddings_created": len(rag.embeddings),
        "inference_provider": rag.provider.name,
        "embed_provider": rag.embed_provider.name,
        "available_providers": list_providers(),
    }

@app.post("/create-embeddings")
async def create_embeddings():
    """Force creation of embeddings for all articles"""
    try:
        rag.create_embeddings()
        return {
            "success": True,
            "message": f"Created embeddings for {len(rag.embeddings)} articles",
            "embed_provider": rag.embed_provider.name,
            "total_articles": len(rag.articles)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating embeddings: {str(e)}")

@app.post("/refresh-news")
async def refresh_news(max_feeds: int | None = None, scrape_full: bool = True, days_back: int = 4):
    """Fetch latest news from RSS feeds with full article scraping"""
    global chunk_rag
    
    try:
        # Ingest news with full scraping
        stats = ingest_news(max_feeds=max_feeds, scrape_full=scrape_full, days_back=days_back)
        
        # Reload articles and re-initialize RAG
        with open("news.json", 'r', encoding='utf-8') as f:
            articles = json.load(f)
        
        # Recreate embeddings
        rag.embeddings = []
        try:
            print(f"Creating embeddings via {rag.embed_provider.name}...")
            rag.create_embeddings()
            print(f"Created {len(rag.embeddings)} embeddings")
        except Exception as e:
            print(f"Could not create embeddings: {e}")
        
        return {
            "success": True,
            "message": "News refreshed and re-chunked successfully",
            "articles_fetched": stats['total_articles'],
            "sources_used": stats['sources_used'],
            **chunk_rag.get_stats()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error refreshing news: {str(e)}")

@app.post("/ask")
def ask_question(request: QuestionRequest) -> ConsensusResponse:
    """Generate consensus article from multiple sources"""
    
    try:
        # 1. Search relevant articles - GET MORE from DIVERSE sources
        all_relevant = rag.search(request.question, top_k=15)
        
        if not relevant_chunks:
            raise HTTPException(status_code=404, detail="No relevant content found")
        
        # 2. Ensure diversity: chunks from different sources/articles
        print(f"📊 Selecting diverse chunks...")
        diverse_chunks = chunk_rag.get_diverse_chunks(relevant_chunks, max_chunks=10)
        
        print(f"✅ Selected {len(diverse_chunks)} chunks from {len(set(c['source'] for c in diverse_chunks))} sources")
        
        # 3. Generate consensus article with LLM - MUCH FASTER (way less tokens)
        print(f"🤖 Generating consensus article...")
        llm_response = chunk_rag.generate_answer(request.question, diverse_chunks)
        
        # 4. Format response
        facts = [
            Fact(
                claim=fact.get("claim", ""),
                sources=fact.get("sources", []),
                source_names=fact.get("source_names", []),
                confidence=fact.get("confidence", "medium"),
                evidence=fact.get("evidence"),
                consensus=fact.get("consensus", False)
            )
            for fact in llm_response.get("facts", [])
        ]
        
        divergences = [
            Divergence(
                topic=div.get("topic", ""),
                versions=div.get("versions", [])
            )
            for div in llm_response.get("divergences", [])
        ]
        
        # Count unique sources
        unique_sources = len(set(c['source'] for c in diverse_chunks))
        
        return ConsensusResponse(
            headline=llm_response.get("headline"),
            summary=llm_response.get("summary"),
            answer=llm_response.get("answer"),
            facts=facts,
            divergences=divergences if divergences else None,
            bias_analysis=llm_response.get("bias_analysis"),
            consensus_score=llm_response.get("consensus_score", 0.5),
            coverage_quality=llm_response.get("coverage_quality"),
            chunks_used=len(diverse_chunks),
            sources_analyzed=unique_sources
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
