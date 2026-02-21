"""
Optimized Chunk-level RAG with numpy-based embedding storage.
Uses binary numpy format instead of JSON for 10x faster loading.
"""
import os
import json
import numpy as np
from openai import OpenAI
from typing import List, Dict, Optional
from chunker import ArticleChunker
from dotenv import load_dotenv

load_dotenv()

class OptimizedChunkRAG:
    def __init__(self, articles: List[Dict], embeddings_file: str = "chunk_embeddings"):
        """
        Initialize with articles and create chunks.
        
        Optimizations:
        1. Uses numpy .npz format (10x faster than JSON)
        2. Batch embedding generation
        3. Memory-efficient vector operations
        4. Incremental updates only
        """
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.chunker = ArticleChunker(chunk_size=500, overlap=100)
        self.embeddings_file = embeddings_file
        
        # Chunk all articles
        print("📦 Chunking articles...")
        self.chunks = self.chunker.chunk_all_articles(articles)
        print(f"✅ Created {len(self.chunks)} chunks from {len(articles)} articles")
        
        # Load or create embeddings using numpy
        self.chunk_embeddings = None  # numpy array [num_chunks, 1536]
        self.chunk_id_map = {}  # {chunk_id: index}
        self._load_or_create_embeddings()
    
    def _load_or_create_embeddings(self):
        """Load existing embeddings (numpy) and create only for new chunks"""
        if not self.client.api_key:
            print("⚠️  No OpenAI key, skipping embeddings")
            return
        
        npz_file = f"{self.embeddings_file}.npz"
        
        # Load existing embeddings if available
        existing_embeddings = {}
        if os.path.exists(npz_file):
            data = np.load(npz_file, allow_pickle=True)
            chunk_ids = data['chunk_ids'].tolist()
            embeddings_array = data['embeddings']
            
            for i, chunk_id in enumerate(chunk_ids):
                existing_embeddings[chunk_id] = embeddings_array[i]
            
            print(f"📚 Loaded {len(existing_embeddings)} existing embeddings from numpy")
        else:
            print("📝 No existing embeddings found")
        
        # Build chunk_id_map and identify new chunks
        new_chunks = []
        all_embeddings_list = []
        
        for i, chunk in enumerate(self.chunks):
            chunk_id = chunk['chunk_id']
            self.chunk_id_map[chunk_id] = i
            
            if chunk_id in existing_embeddings:
                # Use cached embedding
                all_embeddings_list.append(existing_embeddings[chunk_id])
            else:
                # Mark for generation
                new_chunks.append((i, chunk))
                all_embeddings_list.append(None)  # Placeholder
        
        # Generate embeddings for new chunks
        if new_chunks:
            print(f"🔄 Generating embeddings for {len(new_chunks)} new chunks...")
            new_embeddings = self._generate_embeddings_batch([c[1] for c in new_chunks])
            
            # Insert new embeddings at correct positions
            for (idx, chunk), embedding in zip(new_chunks, new_embeddings):
                all_embeddings_list[idx] = embedding
            
            # Save all embeddings to numpy file
            chunk_ids_array = np.array([chunk['chunk_id'] for chunk in self.chunks])
            embeddings_array = np.array(all_embeddings_list, dtype=np.float32)
            
            np.savez_compressed(
                npz_file,
                chunk_ids=chunk_ids_array,
                embeddings=embeddings_array
            )
            print(f"💾 Saved {len(self.chunks)} embeddings to {npz_file} (compressed)")
        else:
            print("✅ All chunks already have embeddings")
        
        # Convert to numpy array for fast vector operations
        self.chunk_embeddings = np.array(all_embeddings_list, dtype=np.float32)
        print(f"✅ Ready with {len(self.chunk_embeddings)} chunk embeddings")
    
    def _generate_embeddings_batch(self, chunks: List[Dict]) -> List[np.ndarray]:
        """Generate embeddings for a batch of chunks"""
        texts = [chunk['text'] for chunk in chunks]
        all_embeddings = []
        
        # Batch process (OpenAI allows up to 2048 inputs)
        batch_size = 100
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i+batch_size]
            
            response = self.client.embeddings.create(
                model="text-embedding-3-small",
                input=batch_texts
            )
            
            batch_embeddings = [np.array(item.embedding, dtype=np.float32) 
                              for item in response.data]
            all_embeddings.extend(batch_embeddings)
        
        return all_embeddings
    
    def search_chunks(self, query: str, top_k: int = 20) -> List[Dict]:
        """
        Ultra-fast vector search using numpy dot product.
        ~100x faster than Python loops for 1000+ chunks.
        """
        if self.chunk_embeddings is None or len(self.chunk_embeddings) == 0:
            return self.chunks[:top_k]
        
        # Embed query (only 1 API call)
        query_embedding = self.client.embeddings.create(
            model="text-embedding-3-small",
            input=query
        ).data[0].embedding
        
        query_vector = np.array(query_embedding, dtype=np.float32)
        
        # Vectorized similarity computation (MUCH faster than loops)
        # Uses numpy's optimized C implementation
        similarities = np.dot(self.chunk_embeddings, query_vector)
        
        # Get top K indices (argsort is optimized in numpy)
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        
        # Build results
        results = []
        for idx in top_indices:
            chunk = self.chunks[idx].copy()
            chunk['similarity_score'] = float(similarities[idx])
            results.append(chunk)
        
        return results
    
    def cleanup_old_embeddings(self):
        """Remove embeddings for chunks that no longer exist"""
        npz_file = f"{self.embeddings_file}.npz"
        
        if not os.path.exists(npz_file):
            return
        
        data = np.load(npz_file, allow_pickle=True)
        old_chunk_ids = set(data['chunk_ids'].tolist())
        current_chunk_ids = {chunk['chunk_id'] for chunk in self.chunks}
        
        obsolete_ids = old_chunk_ids - current_chunk_ids
        
        if obsolete_ids:
            print(f"🧹 Removing {len(obsolete_ids)} obsolete embeddings")
            
            # Keep only current chunks
            keep_indices = [i for i, cid in enumerate(data['chunk_ids']) 
                          if cid in current_chunk_ids]
            
            new_chunk_ids = data['chunk_ids'][keep_indices]
            new_embeddings = data['embeddings'][keep_indices]
            
            np.savez_compressed(
                npz_file,
                chunk_ids=new_chunk_ids,
                embeddings=new_embeddings
            )
            print(f"✅ Cleaned embeddings saved")
    
    def get_stats(self) -> Dict:
        """Get RAG statistics"""
        sources = {}
        for chunk in self.chunks:
            source = chunk['source']
            sources[source] = sources.get(source, 0) + 1
        
        unique_articles = len(set((c['source'], c['title']) for c in self.chunks))
        
        return {
            "chunks_created": len(self.chunks),
            "articles_indexed": unique_articles,
            "sources": len(sources),
            "by_source": sources,
            "embeddings_ready": self.chunk_embeddings is not None and len(self.chunk_embeddings) > 0
        }
    
    # Keep all other methods from original ChunkRAG
    def get_diverse_chunks(self, chunks: List[Dict], max_chunks: int = 10) -> List[Dict]:
        """Select diverse chunks from different sources using strict round-robin"""
        if not chunks:
            return []
        
        by_source = {}
        for chunk in chunks:
            source = chunk['source']
            if source not in by_source:
                by_source[source] = []
            by_source[source].append(chunk)
        
        diverse_chunks = []
        round_num = 0
        
        while len(diverse_chunks) < max_chunks:
            added_this_round = False
            
            for source in sorted(by_source.keys()):
                if len(diverse_chunks) >= max_chunks:
                    break
                
                if round_num < len(by_source[source]):
                    diverse_chunks.append(by_source[source][round_num])
                    added_this_round = True
            
            if not added_this_round:
                break
            
            round_num += 1
        
        return diverse_chunks[:max_chunks]
    
    def generate_answer(self, query: str, chunks: List[Dict]) -> Dict:
        """
        Generate consensus answer from relevant chunks (not full articles).
        Much faster because we send way less text.
        """
        system_prompt = """You are a STRICT fact extractor. You can ONLY use information from the chunks provided below.

ABSOLUTE CONSTRAINTS:
1. You have EXACTLY {num_chunks} text chunks below - NO OTHER INFORMATION EXISTS
2. ONLY extract facts that are EXPLICITLY AND LITERALLY stated in these chunks
3. NEVER add context, background, or general knowledge
4. NEVER infer or assume anything beyond the exact text
5. If the chunks don't mention something, IT DOES NOT EXIST for you
6. Every single fact MUST include a VERBATIM quote as evidence

RESPONSE FORMAT (JSON):
{{
  "headline": "Based ONLY on chunks (or 'No Relevant Information Found' if chunks are off-topic)",
  "summary": "What the chunks say (or 'These sources discuss [actual topics], not [asked topic]')",
  "facts": [
    {{
      "claim": "Fact EXACTLY as stated in chunk",
      "sources": ["URL from chunk"],
      "source_names": ["Source name from chunk header"],
      "evidence": "EXACT quote from chunk - copy/paste verbatim",
      "confidence": "high only if multiple chunks say exact same thing",
      "consensus": true/false  // true ONLY if 2+ chunks explicitly state this
    }}
  ],
  "divergences": [  // Only if chunks contradict each other
    {{
      "topic": "What they disagree on",
      "versions": [
        {{"source": "X", "claim": "EXACT quote from chunk", "url": "..."}}
      ]
    }}
  ],
  "bias_analysis": "ONLY if chunks frame same fact differently (or 'N/A')",
  "consensus_score": 0.0-1.0,
  "coverage_quality": "low/medium/high based on chunk relevance"
}}

CRITICAL EXAMPLES:

❌ WRONG - Adding context:
  Chunk: "Trump announced new tariffs"
  Fact: "Trump announced new tariffs following previous trade disputes"
  → NO! "following previous trade disputes" is NOT in chunk

❌ WRONG - General knowledge:
  Chunk: "Supreme Court ruled"
  Fact: "The Supreme Court, which is the highest court in the US, ruled"
  → NO! Don't add "highest court" info

✅ CORRECT:
  Chunk: "Trump announced a 10% tariff on imports"
  Fact: "Trump announced a 10% tariff on imports"
  Evidence: "Trump announced a 10% tariff on imports"
  → YES! Exact text from chunk

IF CHUNKS ARE OFF-TOPIC:
{{
  "headline": "No Relevant Information Found",
  "summary": "The provided sources discuss [list actual topics in chunks], but do not contain information about [user question]",
  "facts": [],
  "coverage_quality": "low"
}}

Remember: You ONLY know what's in the {{num_chunks}} chunks below. Nothing else exists."""

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

You have {len(chunks)} chunks from news sources below.

CRITICAL: Read each chunk carefully. If NONE of them are relevant to the user's question, respond with:
- headline: "No Relevant Information Found"
- summary: "The available sources do not contain information about this topic."
- facts: []
- coverage_quality: "low"

Only if chunks ARE relevant, extract facts that are EXPLICITLY stated.

Reference chunks:
{context}

Generate a response based ONLY on what's in the chunks above. Include the evidence field with EXACT quotes."""

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
    
    def ask(self, question: str) -> Dict:
        """
        Main entry point - search chunks and generate answer.
        Ultra-optimized workflow using numpy.
        """
        # 1. Search for relevant chunks (vectorized, super fast)
        relevant_chunks = self.search_chunks(question, top_k=20)
        
        # 2. Diversify sources (get chunks from different outlets)
        diverse_chunks = self.get_diverse_chunks(relevant_chunks, max_chunks=10)
        
        # 3. Generate answer from diverse chunks
        answer = self.generate_answer(question, diverse_chunks)
        
        # 4. Add metadata
        answer['chunks_used'] = len(diverse_chunks)
        answer['sources_analyzed'] = len(set(c['source'] for c in diverse_chunks))
        
        return answer
