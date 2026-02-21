from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag_optimized import OptimizedChunkRAG
from rss_ingester import ingest_news
import os
import json

app = FastAPI(title="Consensus Newsroom API")

# CORS para Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://100.98.98.88:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load articles and initialize optimized chunk-level RAG
with open("news.json", 'r', encoding='utf-8') as f:
    articles = json.load(f)

print("🚀 Initializing Optimized Chunk-level RAG...")
chunk_rag = OptimizedChunkRAG(articles)

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
        "status": "Consensus Newsroom API - CHUNK-LEVEL RAG",
        "phase": "FASE 4 - Fast Chunk-based Retrieval",
        **stats
    }

@app.get("/stats")
def get_stats():
    """Get system statistics"""
    stats = chunk_rag.get_stats()
    return {
        "articles_indexed": stats.get('articles_indexed', 0),
        "chunks_created": stats.get('chunks_created', 0),
        "sources": stats.get('sources', 0),
        "embeddings_ready": stats.get('embeddings_ready', False)
    }

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
        
        print("🔄 Re-initializing Optimized Chunk RAG with new articles...")
        chunk_rag = OptimizedChunkRAG(articles)
        
        # Cleanup embeddings for deleted articles/chunks
        chunk_rag.cleanup_old_embeddings()
        
        return {
            "success": True,
            "message": "News refreshed and re-chunked successfully",
            "articles_fetched": stats['total_articles'],
            "sources_used": stats['sources_used'],
            **chunk_rag.get_stats()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error refreshing news: {str(e)}")

@app.post("/ask/search")
def search_chunks_only(request: QuestionRequest):
    """Fast search - returns relevant chunks without AI processing"""
    try:
        result = chunk_rag.search_relevant_chunks(request.question, top_k=20)
        
        # Format chunks for preview
        preview_facts = []
        for chunk in result['chunks']:
            preview_facts.append({
                "source": chunk['source'],
                "title": chunk['title'],
                "url": chunk['url'],
                "preview": chunk['text'][:200] + "...",
                "similarity": chunk.get('similarity_score', 0)
            })
        
        return {
            "sources_analyzed": result['sources_analyzed'],
            "chunks_found": result['chunks_used'],
            "preview_facts": preview_facts,
            "status": "searching"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ask")
def ask_question(request: QuestionRequest) -> ConsensusResponse:
    """Generate consensus article from multiple sources using CHUNK-LEVEL RAG"""
    
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=500, 
            detail="OpenAI API key not configured. Add OPENAI_API_KEY to .env file"
        )
    
    try:
        # 1. Search for relevant CHUNKS (not full articles) - FAST
        print(f"🔍 Searching chunks for: {request.question}")
        relevant_chunks = chunk_rag.search_chunks(request.question, top_k=30)
        
        if not relevant_chunks:
            raise HTTPException(status_code=404, detail="No relevant content found")
        
        # 2. Ensure diversity: chunks from different sources/articles
        print(f"📊 Selecting diverse chunks from {len(set(c['source'] for c in relevant_chunks))} sources...")
        diverse_chunks = chunk_rag.get_diverse_chunks(relevant_chunks, max_chunks=12)
        
        # Verify we have good source diversity
        sources_used = {}
        for chunk in diverse_chunks:
            source = chunk['source']
            sources_used[source] = sources_used.get(source, 0) + 1
        
        print(f"✅ Selected {len(diverse_chunks)} chunks: {dict(sources_used)}")
        
        # If we don't have at least 3 different sources, get more chunks
        if len(sources_used) < 3 and len(relevant_chunks) > len(diverse_chunks):
            print("⚠️  Low diversity, searching more chunks...")
            diverse_chunks = chunk_rag.get_diverse_chunks(relevant_chunks, max_chunks=20)
        
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

        # Build answer from headline + summary if LLM didn't return an explicit answer field
        headline = llm_response.get("headline")
        summary = llm_response.get("summary")
        answer = llm_response.get("answer") or (
            f"{headline}\n\n{summary}" if headline and summary
            else headline or summary or "No answer generated."
        )
        
        return ConsensusResponse(
            headline=headline,
            summary=summary,
            answer=answer,
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
