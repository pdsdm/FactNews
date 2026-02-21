import json
import numpy as np
from typing import List, Dict, Tuple
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

class SimpleRAG:
    def __init__(self, news_file: str = "news.json"):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.articles = []
        self.embeddings = []
        
        with open(news_file, 'r', encoding='utf-8') as f:
            self.articles = json.load(f)
        
        print(f"📰 Loaded {len(self.articles)} articles")
        
        # Auto-create embeddings if OpenAI key is available
        if os.getenv("OPENAI_API_KEY") and len(self.articles) > 0:
            print("🔄 Auto-creating embeddings...")
            try:
                self.create_embeddings()
            except Exception as e:
                print(f"⚠️  Could not create embeddings: {e}")
                print("   → Add OPENAI_API_KEY to .env or call /create-embeddings endpoint")
    
    def create_embeddings(self):
        """Create embeddings for all articles"""
        print("🔄 Creating embeddings...")
        texts = [f"{art['title']} {art['content']}" for art in self.articles]
        
        response = self.client.embeddings.create(
            input=texts,
            model="text-embedding-3-small"
        )
        
        self.embeddings = [item.embedding for item in response.data]
        print(f"✅ Created {len(self.embeddings)} embeddings")
    
    def cosine_similarity(self, a: List[float], b: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        a = np.array(a)
        b = np.array(b)
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
    
    def search(self, query: str, top_k: int = 5) -> List[Dict]:
        """Search for relevant articles using semantic similarity"""
        if not self.embeddings:
            self.create_embeddings()
        
        # Get query embedding
        response = self.client.embeddings.create(
            input=query,
            model="text-embedding-3-small"
        )
        query_embedding = response.data[0].embedding
        
        # Calculate similarities
        similarities = []
        for idx, emb in enumerate(self.embeddings):
            sim = self.cosine_similarity(query_embedding, emb)
            similarities.append((idx, sim, self.articles[idx]))
        
        # Sort by similarity and return top_k
        similarities.sort(key=lambda x: x[1], reverse=True)
        results = [
            {
                **item[2],
                "similarity_score": float(item[1])
            }
            for item in similarities[:top_k]
        ]
        
        return results
    
    def generate_answer(self, query: str, context_articles: List[Dict]) -> Dict:
        """Generate FACT-BASED answer using GPT-4 with context"""
        
        # Build context from articles
        context = "\n\n".join([
            f"[{art['source']} - {art['date']}]\nTítulo: {art['title']}\nContenido: {art['content'][:1500]}\nURL: {art['url']}"
            for art in context_articles
        ])
        
        system_prompt = """You are an investigative journalist specializing in fact-checking.

YOUR MISSION:
- Generate a FACT-BASED article (NO opinions, NO speculation)
- Every claim MUST be backed by at least one source
- Identify CONSENSUS (what multiple sources say) vs DIVERGENCES (what only one says)
- Detect BIASES by comparing how different outlets report the same fact

RESPONSE FORMAT (JSON):
{
  "headline": "Clear and factual headline",
  "summary": "2-3 line summary of main facts",
  "facts": [
    {
      "claim": "Specific and verifiable fact",
      "sources": ["URL1", "URL2"],
      "source_names": ["Source1", "Source2"],
      "evidence": "Direct quote or concrete data",
      "confidence": "high/medium/low",
      "consensus": true/false
    }
  ],
  "divergences": [
    {
      "topic": "Aspect where sources differ",
      "versions": [
        {"source": "X", "claim": "...", "url": "..."}
      ]
    }
  ],
  "bias_analysis": "Brief analysis of detected biases (if any)",
  "consensus_score": 0.0-1.0,
  "coverage_quality": "high/medium/low"
}

RULES:
1. Only include verifiable facts in 'facts'
2. Contradictions go in 'divergences'
3. 'consensus': true if 2+ sources confirm the fact
4. 'confidence' based on: number of sources, evidence quality, consistency
5. NO speculation or interpretation beyond what sources say
6. If something is unclear, mark it as 'low confidence'"""
        
        user_prompt = f"""User question: {query}

Reference articles:
{context}

Generate a fact-based article from these sources."""
        
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,  # Muy baja para maximizar factualidad
            response_format={"type": "json_object"}
        )
        
        return json.loads(response.choices[0].message.content)


# Global instance
rag = SimpleRAG()
