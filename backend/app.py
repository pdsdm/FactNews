from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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

class ConsensusResponse(BaseModel):
    answer: str
    facts: list[Fact]
    consensus_score: float

@app.get("/")
def read_root():
    return {"status": "Consensus Newsroom API running"}

@app.post("/ask")
def ask_question(request: QuestionRequest) -> ConsensusResponse:
    # FASE 1: Respuesta hardcoded
    return ConsensusResponse(
        answer="Esta es una respuesta de ejemplo. En FASE 2 conectaremos LLMs reales.",
        facts=[
            Fact(
                claim="Hecho verificado número 1",
                sources=["https://elpais.com/example1", "https://bbc.com/example1"],
                confidence="high"
            ),
            Fact(
                claim="Hecho parcialmente verificado",
                sources=["https://reuters.com/example2"],
                confidence="medium"
            ),
            Fact(
                claim="Hecho disputado entre fuentes",
                sources=["https://cnn.com/example3"],
                confidence="low"
            )
        ],
        consensus_score=0.75
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
