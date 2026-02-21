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
        """Generate answer using GPT-4 with context"""
        
        # Build context from articles
        context = "\n\n".join([
            f"[{art['source']}] {art['title']}\n{art['content']}\nURL: {art['url']}"
            for art in context_articles
        ])
        
        system_prompt = """Eres un asistente de verificación de noticias. 
Tu tarea es responder preguntas basándote SOLO en los artículos proporcionados.

Para cada afirmación que hagas:
1. Cita la fuente específica
2. Incluye el URL del artículo
3. Indica el nivel de consenso entre fuentes (alto/medio/bajo)
4. Si algo no está en los artículos, dilo claramente

Responde en formato JSON con esta estructura:
{
  "answer": "Respuesta clara y concisa",
  "facts": [
    {
      "claim": "Afirmación específica",
      "sources": ["URL1", "URL2"],
      "evidence": "Cita textual o resumen",
      "confidence": "high/medium/low"
    }
  ],
  "consensus_score": 0.0-1.0
}"""
        
        user_prompt = f"""Pregunta: {query}

Artículos de referencia:
{context}

Genera una respuesta basada únicamente en estos artículos."""
        
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        return json.loads(response.choices[0].message.content)


# Global instance
rag = SimpleRAG()
