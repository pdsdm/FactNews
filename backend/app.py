from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from rag_optimized import OptimizedChunkRAG
from rss_ingester import ingest_news
import os
import json
import asyncio
import time
from typing import AsyncGenerator

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
    date: str | None = None

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
        request_start = time.time()
        print(f"\n{'='*80}")
        print(f"🔍 NEW REQUEST: {request.question}")
        print(f"{'='*80}")
        
        # 1. Search for relevant CHUNKS (not full articles) - FAST
        search_start = time.time()
        relevant_chunks = chunk_rag.search_chunks(request.question, top_k=30)
        search_time = time.time() - search_start
        print(f"⏱️  Chunk search completed in {search_time:.3f}s")
        
        if not relevant_chunks:
            raise HTTPException(status_code=404, detail="No relevant content found")
        
        # 2. Ensure diversity: chunks from different sources/articles
        diversity_start = time.time()
        print(f"📊 Selecting diverse chunks from {len(set(c['source'] for c in relevant_chunks))} sources...")
        diverse_chunks = chunk_rag.get_diverse_chunks(relevant_chunks, max_chunks=12)
        diversity_time = time.time() - diversity_start
        print(f"⏱️  Diversity selection completed in {diversity_time:.3f}s")
        
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
        llm_start = time.time()
        print(f"🤖 Generating consensus article with {len(diverse_chunks)} chunks...")
        llm_response = chunk_rag.generate_answer(request.question, diverse_chunks)
        llm_time = time.time() - llm_start
        print(f"⏱️  LLM generation completed in {llm_time:.3f}s")
        
        # 4. Format response
        facts = [
            Fact(
                claim=fact.get("claim", ""),
                sources=fact.get("sources", []),
                source_names=fact.get("source_names", []),
                confidence=fact.get("confidence", "medium"),
                evidence=fact.get("evidence"),
                consensus=fact.get("consensus", False),
                date=fact.get("date")
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
        
        total_time = time.time() - request_start
        print(f"\n⏱️  TOTAL REQUEST TIME: {total_time:.3f}s")
        print(f"   ├─ Search: {search_time:.3f}s ({search_time/total_time*100:.1f}%)")
        print(f"   ├─ Diversity: {diversity_time:.3f}s ({diversity_time/total_time*100:.1f}%)")
        print(f"   └─ LLM: {llm_time:.3f}s ({llm_time/total_time*100:.1f}%)")
        print(f"{'='*80}\n")
        
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

@app.post("/ask/stream")
async def ask_question_stream(request: QuestionRequest):
    """Stream consensus article generation with real-time updates"""
    
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=500, 
            detail="OpenAI API key not configured"
        )
    
    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            request_start = time.time()
            print(f"\n{'='*80}")
            print(f"🔍 STREAMING REQUEST: {request.question}")
            print(f"{'='*80}")
            
            # Send initial status
            yield f"data: {json.dumps({'status': 'searching', 'message': 'Searching for relevant sources...'})}\n\n"
            
            # 1. Parallel chunk search - run in thread pool to avoid blocking
            search_start = time.time()
            loop = asyncio.get_event_loop()
            relevant_chunks = await loop.run_in_executor(
                None, 
                chunk_rag.search_chunks, 
                request.question, 
                30
            )
            search_time = time.time() - search_start
            print(f"⏱️  Chunk search completed in {search_time:.3f}s")
            
            if not relevant_chunks:
                yield f"data: {json.dumps({'status': 'error', 'message': 'No relevant content found'})}\n\n"
                return
            
            # Send discovery update
            sources_count = len(set(c['source'] for c in relevant_chunks))
            yield f"data: {json.dumps({'status': 'analyzing', 'message': f'Found content from {sources_count} sources. Analyzing...', 'sources': sources_count})}\n\n"
            
            # 2. Get diverse chunks - also in parallel
            diversity_start = time.time()
            diverse_chunks = await loop.run_in_executor(
                None,
                chunk_rag.get_diverse_chunks,
                relevant_chunks,
                12
            )
            diversity_time = time.time() - diversity_start
            print(f"⏱️  Diversity selection completed in {diversity_time:.3f}s")
            
            # Send chunks selected update
            yield f"data: {json.dumps({'status': 'generating', 'message': 'Generating consensus analysis...', 'chunks': len(diverse_chunks)})}\n\n"
            
            # 3. Generate answer with streaming
            llm_start = time.time()
            llm_response = await loop.run_in_executor(
                None,
                chunk_rag.generate_answer,
                request.question,
                diverse_chunks
            )
            llm_time = time.time() - llm_start
            print(f"⏱️  LLM generation completed in {llm_time:.3f}s")
            
            # Format and send final response
            facts = [
                {
                    "claim": fact.get("claim", ""),
                    "sources": fact.get("sources", []),
                    "source_names": fact.get("source_names", []),
                    "confidence": fact.get("confidence", "medium"),
                    "evidence": fact.get("evidence"),
                    "consensus": fact.get("consensus", False),
                    "date": fact.get("date")
                }
                for fact in llm_response.get("facts", [])
            ]
            
            divergences = [
                {
                    "topic": div.get("topic", ""),
                    "versions": div.get("versions", [])
                }
                for div in llm_response.get("divergences", [])
            ]
            
            unique_sources = len(set(c['source'] for c in diverse_chunks))
            
            total_time = time.time() - request_start
            print(f"\n⏱️  TOTAL STREAMING REQUEST TIME: {total_time:.3f}s")
            print(f"   ├─ Search: {search_time:.3f}s ({search_time/total_time*100:.1f}%)")
            print(f"   ├─ Diversity: {diversity_time:.3f}s ({diversity_time/total_time*100:.1f}%)")
            print(f"   └─ LLM: {llm_time:.3f}s ({llm_time/total_time*100:.1f}%)")
            print(f"{'='*80}\n")
            
            response_data = {
                "status": "complete",
                "headline": llm_response.get("headline"),
                "summary": llm_response.get("summary"),
                "answer": llm_response.get("answer") or f"{llm_response.get('headline')}\n\n{llm_response.get('summary')}",
                "facts": facts,
                "divergences": divergences if divergences else None,
                "bias_analysis": llm_response.get("bias_analysis"),
                "consensus_score": llm_response.get("consensus_score", 0.5),
                "coverage_quality": llm_response.get("coverage_quality"),
                "chunks_used": len(diverse_chunks),
                "sources_analyzed": unique_sources
            }
            
            yield f"data: {json.dumps(response_data)}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
