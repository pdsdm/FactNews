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
        
        # Build context from articles - CLEARLY SHOW MULTIPLE SOURCES
        context = "\n\n" + "="*80 + "\n\n".join([
            f"SOURCE {i+1}: {art['source']} ({art['date']})\n" + "="*80 + f"\nTitle: {art['title']}\nContent: {art['content'][:2000]}\nURL: {art['url']}"
            for i, art in enumerate(context_articles)
        ])
        
        system_prompt = """You are an investigative journalist specializing in fact-checking.

YOUR MISSION:
- Generate a FACT-BASED article (NO opinions, NO speculation)
- CRITICALLY IMPORTANT: You MUST use information from MULTIPLE different sources
- Every fact MUST cite ALL sources that mention it (not just one)
- Identify CONSENSUS (what 2+ sources confirm) vs DIVERGENCES (only 1 source)
- Detect BIASES by comparing how different outlets report the same fact

RESPONSE FORMAT (JSON):
{
  "headline": "Clear and factual headline",
  "summary": "2-3 line summary of main facts",
  "facts": [
    {
      "claim": "Specific and verifiable fact",
      "sources": ["URL1", "URL2", "URL3"],
      "source_names": ["Source1", "Source2", "Source3"],
      "evidence": "Direct quote or concrete data",
      "confidence": "high/medium/low",
      "consensus": true  // TRUE if 2+ sources, FALSE if only 1
    }
  ],
  "divergences": [
    {
      "topic": "Aspect where sources differ",
      "versions": [
        {"source": "Wired", "claim": "...", "url": "..."},
        {"source": "NYT", "claim": "...", "url": "..."}
      ]
    }
  ],
  "bias_analysis": "Brief analysis comparing how different sources frame this story",
  "consensus_score": 0.0-1.0,
  "coverage_quality": "high/medium/low"
}

CRITICAL RULES:
1. You have articles from DIFFERENT sources - USE THEM ALL
2. For each fact, CHECK if other sources mention it too
3. If 2+ sources mention a fact → "consensus": true + list ALL sources
4. If only 1 source mentions it → "consensus": false + note in divergences
5. ALWAYS include 'divergences' showing where sources disagree
6. COMPARE how different outlets frame the story (bias_analysis)
7. NO speculation beyond what sources explicitly state

Example of GOOD output:
{
  "facts": [
    {
      "claim": "Supreme Court blocked tariffs",
      "sources": ["url1", "url2", "url3"],
      "source_names": ["Wired", "NYT", "Ars Technica"],
      "consensus": true  // ← 3 sources confirm this
    }
  ],
  "divergences": [
    {
      "topic": "Trump's response timeline",
      "versions": [
        {"source": "Wired", "claim": "New 10% tariff", "url": "..."},
        {"source": "NYT", "claim": "Raised to 15%", "url": "..."}
      ]
    }
  ]
}"""
        
        user_prompt = f"""User question: {query}

You have {len(context_articles)} articles from DIFFERENT news sources below.
IMPORTANT: Cross-reference them to find what multiple sources agree on.

Reference articles:
{context}

Generate a consensus fact-based article that:
1. Identifies facts confirmed by MULTIPLE sources (consensus: true)
2. Notes facts from only ONE source (consensus: false, add to divergences)
3. Compares how different sources frame this story (bias_analysis)"""
        
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
