"""
FactNews Backend API - Optimized with caching, streaming, and background tasks.

Improvements over MVP:
- Response caching (L1: memory, L2: Redis)
- Async background tasks for RSS ingestion
- Streaming SSE endpoint for real-time updates
- Structured logging and metrics
- Rate limiting
"""
import os
import json
import time
import logging
import asyncio
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import redis as redis_client

from rag_optimized import OptimizedChunkRAG
from rss_ingester import ingest_news
import os
import json
import asyncio
import time
from typing import AsyncGenerator, Optional

app = FastAPI(title="Consensus Newsroom API")

# CORS para Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://100.98.98.88:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    cached: bool = False


@app.get("/")
def read_root():
    stats = _chunk_rag.get_stats() if _chunk_rag else {}
    return {
        "status": "Consensus Newsroom API",
        "version": "2.0.0",
        "features": ["response_caching", "streaming", "background_tasks", "rate_limiting"],
        "ingestion_status": _ingestion_status,
        **stats,
    }


@app.get("/stats")
def get_stats():
    if not _chunk_rag:
        return {"error": "RAG not initialized"}
    
    rag_stats = _chunk_rag.get_stats()
    response_cache = get_response_cache()
    
    return {
        "articles_indexed": rag_stats.get("articles_indexed", 0),
        "chunks_created": rag_stats.get("chunks_created", 0),
        "sources": rag_stats.get("sources", 0),
        "embeddings_ready": rag_stats.get("embeddings_ready", False),
        "cache_stats": {
            "response": response_cache.stats(),
            "embeddings": rag_stats.get("embedding_cache", {}),
        },
        "metrics": {
            "requests_total": METRICS["requests_total"],
            "requests_cached": METRICS["requests_cached"],
            "requests_errors": METRICS["requests_errors"],
            "avg_response_time_ms": round(METRICS["avg_response_time_ms"], 2),
        },
    }


@app.get("/health")
def health_check():
    redis_ok = get_redis().available
    rag_ok = _chunk_rag is not None and _chunk_rag.chunk_embeddings is not None
    
    status = "healthy" if (redis_ok or True) and rag_ok else "degraded"
    
    return {
        "status": status,
        "redis": "connected" if redis_ok else "unavailable",
        "rag": "ready" if rag_ok else "not_ready",
        "articles": len(_articles),
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/refresh-news")
async def refresh_news(
    request: Request,
    max_feeds: int | None = None,
    scrape_full: bool = True,
    days_back: int = 4,
    background: bool = True,
):
    """Fetch latest news from RSS feeds. Use background=true for async."""
    global _ingestion_status
    
    rate_error = _check_rate_limit(request)
    if rate_error:
        raise HTTPException(status_code=429, detail=rate_error)
    
    if _ingestion_status["running"]:
        return {
            "status": "already_running",
            "message": "Ingestion already in progress",
            "last_run": _ingestion_status["last_run"],
        }
    
    if background:
        asyncio.create_task(
            _run_ingestion_background(max_feeds=max_feeds, scrape_full=scrape_full, days_back=days_back)
        )
        return {
            "status": "started",
            "message": "Ingestion started in background",
        }
    
    return await _run_ingestion(max_feeds=max_feeds, scrape_full=scrape_full, days_back=days_back)


async def _run_ingestion_background(max_feeds: int | None, scrape_full: bool, days_back: int):
    """Background task for RSS ingestion."""
    await _run_ingestion(max_feeds=max_feeds, scrape_full=scrape_full, days_back=days_back)


async def _run_ingestion(max_feeds: int | None, scrape_full: bool, days_back: int):
    """Execute RSS ingestion and update RAG."""
    global _articles, _chunk_rag, _ingestion_status
    
    _ingestion_status["running"] = True
    logger.info("Starting RSS ingestion...")
    
    try:
        loop = asyncio.get_event_loop()
        stats = await loop.run_in_executor(
            None,
            lambda: ingest_news(max_feeds=max_feeds, scrape_full=scrape_full, days_back=days_back),
        )
        
        with open("news.json", "r", encoding="utf-8") as f:
            _articles = json.load(f)
        
        logger.info(f"Re-initializing RAG with {len(_articles)} articles...")
        _chunk_rag = OptimizedChunkRAG(_articles)
        _chunk_rag.cleanup_old_embeddings()
        
        _ingestion_status["last_run"] = datetime.utcnow().isoformat()
        _ingestion_status["articles_added"] = stats.get("new_articles", 0)
        
        get_response_cache().clear_all()
        
        logger.info(f"Ingestion complete: {stats}")
        return {
            "success": True,
            "message": "News refreshed successfully",
            "articles_fetched": stats.get("total_articles", 0),
            "sources_used": stats.get("sources_used", 0),
            **_chunk_rag.get_stats(),
        }
    
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Error refreshing news: {str(e)}")
    
    finally:
        _ingestion_status["running"] = False


@app.post("/ask/search")
def search_chunks_only(request: QuestionRequest, http_request: Request):
    """Fast search - returns relevant chunks without AI processing."""
    rate_error = _check_rate_limit(http_request)
    if rate_error:
        raise HTTPException(status_code=429, detail=rate_error)
    
    if not _chunk_rag:
        raise HTTPException(status_code=503, detail="RAG not initialized")
    
    try:
        result = _chunk_rag.search_relevant_chunks(request.question, top_k=20)
        
        preview_facts = []
        for chunk in result.get("chunks", []):
            preview_facts.append({
                "source": chunk.get("source", ""),
                "title": chunk.get("title", ""),
                "url": chunk.get("url", ""),
                "preview": chunk.get("text", "")[:200] + "...",
                "similarity": chunk.get("similarity_score", 0),
            })
        
        return {
            "sources_analyzed": result.get("sources_analyzed", 0),
            "chunks_found": result.get("chunks_used", 0),
            "preview_facts": preview_facts,
            "status": "searching",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ask")
def ask_question(http_request: Request, request: QuestionRequest) -> ConsensusResponse:
    """Generate consensus article from multiple sources."""
    start_time = time.time()
    
    rate_error = _check_rate_limit(http_request)
    if rate_error:
        raise HTTPException(status_code=429, detail=rate_error)
    
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
        
        sources_used = {}
        for chunk in diverse_chunks:
            source = chunk.get("source", "unknown")
            sources_used[source] = sources_used.get(source, 0) + 1
        
        if len(sources_used) < 3 and len(relevant_chunks) > len(diverse_chunks):
            diverse_chunks = _chunk_rag.get_diverse_chunks(relevant_chunks, max_chunks=20)
        
        # 3. Generate consensus article with LLM - MUCH FASTER (way less tokens)
        llm_start = time.time()
        print(f"🤖 Generating consensus article with {len(diverse_chunks)} chunks...")
        llm_response = chunk_rag.generate_answer(request.question, diverse_chunks)
        llm_time = time.time() - llm_start
        print(f"⏱️  LLM generation completed in {llm_time:.3f}s")
        
        facts = [
            Fact(
                claim=fact.get("claim", ""),
                sources=fact.get("sources", []),
                source_names=fact.get("source_names", []),
                confidence=fact.get("confidence", "medium"),
                evidence=fact.get("evidence"),
                consensus=fact.get("consensus", False),
                date=fact.get("date"),
            )
            for fact in llm_response.get("facts", [])
        ]
        
        divergences = [
            Divergence(
                topic=div.get("topic", ""),
                versions=div.get("versions", []),
            )
            for div in llm_response.get("divergences", [])
        ]
        
        unique_sources = len(set(c.get("source") for c in diverse_chunks))
        
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
            sources_analyzed=unique_sources,
            cached=False,
        )
        
        response_cache.set(request.question, response.model_dump())
        
        response_time = (time.time() - start_time) * 1000
        _update_metrics(response_time)
        logger.info(f"Request completed in {response_time:.0f}ms")
        
        return response
    
    except HTTPException:
        raise
    except Exception as e:
        response_time = (time.time() - start_time) * 1000
        _update_metrics(response_time, error=True)
        logger.error(f"Error processing question: {e}")
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

@app.get("/articles")
def get_articles(limit: int = 100, offset: int = 0, source: Optional[str] = None):
    """Return articles list from news.json for the feed"""
    arts = chunk_rag.articles
    if source:
        arts = [a for a in arts if a.get("source") == source]
    total = len(arts)
    page = arts[offset:offset + limit]
    return {
        "articles": [
            {
                "id": a.get("id"),
                "title": a.get("title", ""),
                "source": a.get("source", ""),
                "url": a.get("url", ""),
                "date": a.get("date", ""),
                "content_length": a.get("content_length", 0),
            }
            for a in page
        ],
        "total": total,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
