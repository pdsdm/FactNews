from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag import rag
from rss_ingester import ingest_news
from clustering import ArticleClusterer, detect_bias_in_cluster
import os

app = FastAPI(title="Consensus Newsroom API")

# CORS para Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clusterer
clusterer = ArticleClusterer(similarity_threshold=0.3)

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
    articles_used: int | None = None
    clusters_found: int | None = None

@app.get("/")
def read_root():
    return {
        "status": "Consensus Newsroom API running",
        "phase": "FASE 3.5 - Full Scraping + Clustering + Bias Detection",
        "articles_loaded": len(rag.articles),
        "embeddings_ready": len(rag.embeddings) > 0
    }

@app.get("/stats")
def get_stats():
    """Get system statistics"""
    scraped_count = sum(1 for art in rag.articles if art.get('scraped', False))
    return {
        "total_articles": len(rag.articles),
        "fully_scraped": scraped_count,
        "embeddings_created": len(rag.embeddings),
        "has_openai_key": bool(os.getenv("OPENAI_API_KEY"))
    }

@app.post("/create-embeddings")
async def create_embeddings():
    """Force creation of embeddings for all articles"""
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured"
        )
    
    try:
        rag.create_embeddings()
        return {
            "success": True,
            "message": f"Created embeddings for {len(rag.embeddings)} articles",
            "total_articles": len(rag.articles)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating embeddings: {str(e)}")

@app.post("/refresh-news")
async def refresh_news(max_feeds: int | None = None, scrape_full: bool = True, days_back: int = 4):
    """Fetch latest news from RSS feeds with full article scraping"""
    try:
        # Ingest news with full scraping
        stats = ingest_news(max_feeds=max_feeds, scrape_full=scrape_full, days_back=days_back)
        
        # Reload articles in RAG
        import json
        with open("news.json", 'r', encoding='utf-8') as f:
            rag.articles = json.load(f)
        
        # Recreate embeddings
        rag.embeddings = []
        if os.getenv("OPENAI_API_KEY"):
            print("🔄 Creating embeddings for new articles...")
            rag.create_embeddings()
            print(f"✅ Created {len(rag.embeddings)} embeddings")
        
        return {
            "success": True,
            "message": "News updated with full scraping",
            **stats
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating news: {str(e)}")

@app.post("/ask")
def ask_question(request: QuestionRequest) -> ConsensusResponse:
    """Generate consensus article from multiple sources"""
    
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=500, 
            detail="OpenAI API key not configured. Add OPENAI_API_KEY to .env file"
        )
    
    try:
        # 1. Search relevant articles - GET MORE from DIVERSE sources
        all_relevant = rag.search(request.question, top_k=15)
        
        if not all_relevant:
            raise HTTPException(status_code=404, detail="No relevant articles found")
        
        # 2. Ensure diversity: get articles from different sources
        seen_sources = set()
        diverse_articles = []
        for art in all_relevant:
            if art['source'] not in seen_sources or len(diverse_articles) < 8:
                diverse_articles.append(art)
                seen_sources.add(art['source'])
            if len(diverse_articles) >= 8:  # Use 8 articles from different sources
                break
        
        # If we have less than 8, use what we have
        if len(diverse_articles) < 8:
            diverse_articles = all_relevant[:8]
        
        # 3. Cluster to understand the story landscape
        clusters = clusterer.get_story_clusters(diverse_articles)
        
        # 4. Generate consensus article with LLM using DIVERSE sources
        llm_response = rag.generate_answer(request.question, diverse_articles)
        
        # 5. Format response
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
        
        return ConsensusResponse(
            headline=llm_response.get("headline"),
            summary=llm_response.get("summary"),
            answer=llm_response.get("answer"),
            facts=facts,
            divergences=divergences if divergences else None,
            bias_analysis=llm_response.get("bias_analysis"),
            consensus_score=llm_response.get("consensus_score", 0.5),
            coverage_quality=llm_response.get("coverage_quality"),
            articles_used=len(diverse_articles),
            clusters_found=len(clusters)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
