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
        
        system_prompt = """Eres un periodista de investigación especializado en verificación de hechos.

TU MISIÓN:
- Generar un artículo BASADO EN HECHOS (NO opiniones, NO especulación)
- Cada afirmación DEBE estar respaldada por al menos una fuente
- Identifica CONSENSO (qué dicen múltiples fuentes) vs DIVERGENCIAS (qué solo dice una)
- Detecta SESGOS comparando cómo diferentes medios reportan el mismo hecho

FORMATO DE RESPUESTA (JSON):
{
  "headline": "Titular claro y factual",
  "summary": "Resumen de 2-3 líneas con los hechos principales",
  "facts": [
    {
      "claim": "Hecho específico y verificable",
      "sources": ["URL1", "URL2"],
      "source_names": ["Source1", "Source2"],
      "evidence": "Cita textual o dato concreto",
      "confidence": "high/medium/low",
      "consensus": true/false
    }
  ],
  "divergences": [
    {
      "topic": "Aspecto en el que difieren las fuentes",
      "versions": [
        {"source": "X", "claim": "...", "url": "..."}
      ]
    }
  ],
  "bias_analysis": "Breve análisis de sesgos detectados (si los hay)",
  "consensus_score": 0.0-1.0,
  "coverage_quality": "high/medium/low"
}

REGLAS:
1. Solo incluye hechos verificables en 'facts'
2. Si hay contradicciones, van en 'divergences'
3. 'consensus': true si 2+ fuentes confirman el hecho
4. 'confidence' basada en: número de fuentes, calidad de evidencia, consistencia
5. NO especules ni interpretes más allá de lo que dicen las fuentes
6. Si algo no está claro, márcalo como 'low confidence'"""
        
        user_prompt = f"""Pregunta del usuario: {query}

Artículos de referencia:
{context}

Genera un artículo basado en hechos verificables extraídos de estos artículos."""
        
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
