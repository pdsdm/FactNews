"""
Chunk-level RAG for faster and more precise retrieval.
"""
import os
import json
import numpy as np
from openai import OpenAI
from typing import List, Dict, Optional
from chunker import ArticleChunker
from dotenv import load_dotenv

load_dotenv()

class ChunkRAG:
    def __init__(self, articles: List[Dict]):
        """Initialize with articles and create chunks"""
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.chunker = ArticleChunker(chunk_size=500, overlap=100)
        
        # Chunk all articles
        print("📦 Chunking articles...")
        self.chunks = self.chunker.chunk_all_articles(articles)
        print(f"✅ Created {len(self.chunks)} chunks from {len(articles)} articles")
        
        # Create embeddings for all chunks
        self.chunk_embeddings = []
        self._create_chunk_embeddings()
    
    def _create_chunk_embeddings(self):
        """Create embeddings for all chunks"""
        if not self.client.api_key:
            print("⚠️  No OpenAI key, skipping embeddings")
            return
        
        print("🔄 Creating chunk embeddings...")
        texts = [chunk['text'] for chunk in self.chunks]
        
        # Batch process (OpenAI allows up to 2048 inputs)
        batch_size = 100
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            response = self.client.embeddings.create(
                model="text-embedding-3-small",
                input=batch
            )
            batch_embeddings = [item.embedding for item in response.data]
            all_embeddings.extend(batch_embeddings)
        
        self.chunk_embeddings = all_embeddings
        print(f"✅ Created {len(all_embeddings)} chunk embeddings")
    
    def search_chunks(self, query: str, top_k: int = 20) -> List[Dict]:
        """
        Search for most relevant chunks (not full articles).
        Returns chunks with similarity scores.
        """
        if not self.chunk_embeddings:
            return self.chunks[:top_k]
        
        # Embed query
        query_embedding = self.client.embeddings.create(
            model="text-embedding-3-small",
            input=query
        ).data[0].embedding
        
        # Calculate similarities
        similarities = []
        for i, chunk_emb in enumerate(self.chunk_embeddings):
            score = np.dot(query_embedding, chunk_emb)
            similarities.append((score, i))
        
        # Sort by score and get top K
        similarities.sort(reverse=True, key=lambda x: x[0])
        
        results = []
        for score, idx in similarities[:top_k]:
            chunk = self.chunks[idx].copy()
            chunk['similarity_score'] = float(score)
            results.append(chunk)
        
        return results
    
    def get_diverse_chunks(self, chunks: List[Dict], max_chunks: int = 10) -> List[Dict]:
        """
        Select diverse chunks from different sources.
        Ensures we don't get 10 chunks from the same article.
        """
        seen_sources = set()
        seen_articles = set()
        diverse_chunks = []
        
        for chunk in chunks:
            article_key = (chunk['source'], chunk['title'])
            
            # Prefer chunks from new sources/articles
            if article_key not in seen_articles or len(diverse_chunks) < max_chunks:
                diverse_chunks.append(chunk)
                seen_sources.add(chunk['source'])
                seen_articles.add(article_key)
            
            if len(diverse_chunks) >= max_chunks:
                break
        
        return diverse_chunks
    
    def generate_answer(self, query: str, chunks: List[Dict]) -> Dict:
        """
        Generate consensus answer from relevant chunks (not full articles).
        Much faster because we send way less text.
        """
        system_prompt = """You are an investigative journalist specializing in fact-checking.

YOUR MISSION:
- Generate a FACT-BASED article from CHUNKS of different news articles
- Each chunk comes from a different news source
- CRITICALLY IMPORTANT: Cross-reference chunks to find consensus
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
      "sources": ["URL1", "URL2"],
      "source_names": ["Source1", "Source2"],
      "evidence": "Direct quote from chunk",
      "confidence": "high/medium/low",
      "consensus": true  // TRUE if 2+ sources confirm
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
  "bias_analysis": "How different sources frame this story",
  "consensus_score": 0.0-1.0,
  "coverage_quality": "high/medium/low"
}

CRITICAL RULES:
1. You have chunks from DIFFERENT sources - USE THEM ALL
2. For each fact, CHECK if other chunks mention it too
3. If 2+ sources confirm → "consensus": true + list ALL sources
4. If only 1 source → "consensus": false + note in divergences
5. ALWAYS compare how different sources frame the story
6. NO speculation beyond what chunks state"""

        # Build context from chunks with source labels
        context_parts = []
        for i, chunk in enumerate(chunks):
            # Get chunk with surrounding context
            chunk_with_context = self.chunker.get_chunk_with_context(chunk, self.chunks)
            
            context_parts.append(
                f"SOURCE {i+1}: {chunk['source']} - {chunk['title']}\n"
                f"{'='*80}\n"
                f"{chunk_with_context}\n"
                f"URL: {chunk['url']}"
            )
        
        context = "\n\n" + "="*80 + "\n\n".join(context_parts)
        
        user_prompt = f"""User question: {query}

You have {len(chunks)} relevant chunks from DIFFERENT news sources below.
Each chunk is a paragraph or section from a news article.
IMPORTANT: Cross-reference them to find what multiple sources agree on.

Reference chunks:
{context}

Generate a consensus fact-based article that:
1. Identifies facts confirmed by MULTIPLE sources (consensus: true)
2. Notes facts from only ONE source (consensus: false, add to divergences)
3. Compares how different sources frame this story (bias_analysis)"""

        # Call LLM (much faster now - only ~3-5k tokens instead of 16k)
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
    
    def get_stats(self) -> Dict:
        """Return RAG statistics"""
        unique_sources = len(set(c['source'] for c in self.chunks))
        unique_articles = len(set((c['source'], c['title']) for c in self.chunks))
        
        return {
            "total_chunks": len(self.chunks),
            "total_articles": unique_articles,
            "total_sources": unique_sources,
            "embeddings_ready": len(self.chunk_embeddings) > 0,
            "avg_chunks_per_article": round(len(self.chunks) / max(unique_articles, 1), 1)
        }
