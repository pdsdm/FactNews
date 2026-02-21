from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag import rag
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

class QuestionRequest(BaseModel):
    question: str

class Fact(BaseModel):
    claim: str
    sources: list[str]
    confidence: str
    evidence: str | None = None

class ConsensusResponse(BaseModel):
    answer: str
    facts: list[Fact]
    consensus_score: float
    articles_used: int | None = None

@app.get("/")
def read_root():
    return {
        "status": "Consensus Newsroom API running",
        "phase": "FASE 2 - RAG + LLM",
        "articles_loaded": len(rag.articles),
        "embeddings_ready": len(rag.embeddings) > 0
    }

@app.get("/stats")
def get_stats():
    """Get system statistics"""
    return {
        "total_articles": len(rag.articles),
        "embeddings_created": len(rag.embeddings),
        "has_openai_key": bool(os.getenv("OPENAI_API_KEY"))
    }

@app.post("/ask")
def ask_question(request: QuestionRequest) -> ConsensusResponse:
    """FASE 2: RAG with real LLM"""
    
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=500, 
            detail="OpenAI API key not configured. Add OPENAI_API_KEY to .env file"
        )
    
    try:
        # 1. Search relevant articles
        relevant_articles = rag.search(request.question, top_k=5)
        
        # 2. Generate answer with LLM
        llm_response = rag.generate_answer(request.question, relevant_articles)
        
        # 3. Format response
        facts = [
            Fact(
                claim=fact.get("claim", ""),
                sources=fact.get("sources", []),
                confidence=fact.get("confidence", "medium"),
                evidence=fact.get("evidence")
            )
            for fact in llm_response.get("facts", [])
        ]
        
        return ConsensusResponse(
            answer=llm_response.get("answer", "No se pudo generar respuesta"),
            facts=facts,
            consensus_score=llm_response.get("consensus_score", 0.5),
            articles_used=len(relevant_articles)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
