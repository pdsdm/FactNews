"""
Optimized Chunk-level RAG with numpy-based embedding storage.
Uses binary numpy format instead of JSON for 10x faster loading.

Embedding lookup order:
  1. Redis cache (fast, shared across processes, TTL-managed)
  2. NumPy .npz file (local fallback when Redis unavailable)
  3. OpenAI API (only for embeddings not found in either cache)
"""
import os
import json
import numpy as np
from openai import OpenAI
from typing import List, Dict, Optional
from chunker import ArticleChunker
from embedding_cache import EmbeddingCache
from dotenv import load_dotenv

load_dotenv()

class OptimizedChunkRAG:
    def __init__(self, articles: List[Dict], embeddings_file: str = "chunk_embeddings"):
        """
        Initialize with articles and create chunks.
        
        Optimizations:
        1. Redis cache as primary embedding store (shared, TTL-managed)
        2. NumPy .npz file as secondary fallback
        3. Batch embedding generation for cache misses
        4. Memory-efficient vector operations
        5. Incremental updates only
        """
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.chunker = ArticleChunker(chunk_size=500, overlap=100)
        self.embeddings_file = embeddings_file
        self.embedding_cache = EmbeddingCache()
        
        # Chunk all articles
        print("📦 Chunking articles...")
        self.chunks = self.chunker.chunk_all_articles(articles)
        print(f"✅ Created {len(self.chunks)} chunks from {len(articles)} articles")
        
        # Load or create embeddings using numpy
        self.chunk_embeddings = None  # numpy array [num_chunks, 1536]
        self.chunk_id_map = {}  # {chunk_id: index}
        self._load_or_create_embeddings()
    
    def _load_or_create_embeddings(self):
        """
        Three-tier embedding lookup:
          1. Redis cache  (fast, shared, TTL-managed)
          2. NumPy .npz file  (local fallback)
          3. OpenAI API  (only for true cache misses)

        New embeddings are written to both Redis and the npz file so either
        path works independently on the next startup.
        """
        if not self.client.api_key:
            print("⚠️  No OpenAI key, skipping embeddings")
            return

        chunk_ids = [chunk['chunk_id'] for chunk in self.chunks]

        # Build chunk_id → index map
        for i, chunk_id in enumerate(chunk_ids):
            self.chunk_id_map[chunk_id] = i

        # ------------------------------------------------------------------
        # Stage 1: Redis cache (batch fetch)
        # ------------------------------------------------------------------
        resolved: Dict[str, np.ndarray] = {}

        if self.embedding_cache.available:
            resolved = self.embedding_cache.batch_get_chunks(chunk_ids)
            if resolved:
                print(f"⚡ Redis cache hit: {len(resolved)}/{len(chunk_ids)} chunks")
        
        missing_after_redis = [cid for cid in chunk_ids if cid not in resolved]

        # ------------------------------------------------------------------
        # Stage 2: NumPy .npz file (for any Redis misses)
        # ------------------------------------------------------------------
        npz_file = f"{self.embeddings_file}.npz"
        npz_embeddings: Dict[str, np.ndarray] = {}

        if missing_after_redis and os.path.exists(npz_file):
            data = np.load(npz_file, allow_pickle=True)
            npz_ids = data['chunk_ids'].tolist()
            npz_array = data['embeddings']
            npz_index = {cid: npz_array[i] for i, cid in enumerate(npz_ids)}

            for cid in missing_after_redis:
                if cid in npz_index:
                    npz_embeddings[cid] = npz_index[cid]

            if npz_embeddings:
                print(f"📚 npz file hit: {len(npz_embeddings)}/{len(missing_after_redis)} remaining chunks")
                # Back-fill Redis with the npz data so future startups skip the file
                if self.embedding_cache.available:
                    self.embedding_cache.batch_set_chunks(npz_embeddings)

        resolved.update(npz_embeddings)
        missing_after_npz = [
            (i, self.chunks[self.chunk_id_map[cid]])
            for cid in chunk_ids
            if cid not in resolved
            for i in [self.chunk_id_map[cid]]
        ]

        # ------------------------------------------------------------------
        # Stage 3: OpenAI API (only true cache misses)
        # ------------------------------------------------------------------
        newly_generated: Dict[str, np.ndarray] = {}

        if missing_after_npz:
            print(f"🔄 Generating embeddings for {len(missing_after_npz)} new chunks...")
            new_embeddings = self._generate_embeddings_batch([c[1] for c in missing_after_npz])

            for (_, chunk), embedding in zip(missing_after_npz, new_embeddings):
                newly_generated[chunk['chunk_id']] = embedding

            # Persist to Redis
            if self.embedding_cache.available:
                self.embedding_cache.batch_set_chunks(newly_generated)
                print(f"⚡ Cached {len(newly_generated)} new embeddings in Redis")

            # Persist to npz (merge with everything resolved so far)
            resolved.update(newly_generated)
            all_ids = np.array(chunk_ids)
            all_embs = np.array([resolved[cid] for cid in chunk_ids], dtype=np.float32)
            np.savez_compressed(npz_file, chunk_ids=all_ids, embeddings=all_embs)
            print(f"💾 Saved {len(chunk_ids)} embeddings to {npz_file} (compressed)")
        else:
            print("✅ All chunks already have embeddings")

        # ------------------------------------------------------------------
        # Build the in-memory numpy matrix for fast similarity search
        # ------------------------------------------------------------------
        self.chunk_embeddings = np.array(
            [resolved[cid] for cid in chunk_ids], dtype=np.float32
        )
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

        Query embeddings are cached in Redis (24h TTL) to avoid redundant
        API calls for repeated or near-identical questions.
        """
        if self.chunk_embeddings is None or len(self.chunk_embeddings) == 0:
            return self.chunks[:top_k]

        # Check Redis cache for this query's embedding first
        query_vector = self.embedding_cache.get_query(query)

        if query_vector is None:
            # Cache miss - call OpenAI and store result
            raw = self.client.embeddings.create(
                model="text-embedding-3-small",
                input=query
            ).data[0].embedding
            query_vector = np.array(raw, dtype=np.float32)
            self.embedding_cache.set_query(query, query_vector)
        
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
        
        stats: Dict = {
            "chunks_created": len(self.chunks),
            "articles_indexed": unique_articles,
            "sources": len(sources),
            "by_source": sources,
            "embeddings_ready": self.chunk_embeddings is not None and len(self.chunk_embeddings) > 0,
            "embedding_cache": self.embedding_cache.stats(),
        }
        return stats
    
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
  "headline": "Natural news headline summarizing the main story (or 'No Relevant Information Found' if off-topic)",
  "summary": "Clear 2-3 sentence summary of the main facts and developments. Write as a news summary, not meta-commentary about sources.",
  "facts": [
    {{
      "claim": "Fact EXACTLY as stated in chunk",
      "sources": ["URL from chunk"],
      "source_names": ["Source name from chunk header"],
      "date": "YYYY-MM-DD - MANDATORY: Copy from 'DATE:' line in chunk header",
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
  "bias_analysis": "Required analysis of how different sources frame the topic. Identify:
    - Which sources use more emotional/neutral language
    - Different emphasis or focus points
    - Omitted details in some sources
    - Political/ideological framing differences
    If all sources are neutral and identical: 'All sources report factually with minimal bias'",
  "consensus_score": 0.0-1.0,
  "coverage_quality": "low/medium/high based on chunk relevance"
}}

CRITICAL EXAMPLES:

HEADLINE & SUMMARY EXAMPLES:

❌ WRONG - Meta-commentary:
  Headline: "Based ONLY on chunks about Trump"
  Summary: "The chunks provide information about tariffs"
  → NO! Don't mention chunks or sources

✅ CORRECT - Natural news style:
  Headline: "Trump Announces 15% Global Tariffs, Criticizes Supreme Court"
  Summary: "President Trump increased tariffs to 15% on all imports and criticized Supreme Court justices who ruled against his trade policies. Multiple sources confirm the tariff increase takes effect immediately."
  → YES! Sounds like actual news

FACT EXAMPLES:

❌ WRONG - Adding context:
  Chunk: "Trump announced new tariffs"
  Fact: "Trump announced new tariffs following previous trade disputes"
  → NO! "following previous trade disputes" is NOT in chunk

✅ CORRECT - With DATE from chunk header:
  CHUNK HEADER shows:
    SOURCE 1: BBC News - Trump announces tariffs
    DATE: 2026-02-21
  CHUNK TEXT: "Trump announced a 10% tariff on imports"
  
  YOUR RESPONSE MUST BE:
  {{
    "claim": "Trump announced a 10% tariff on imports",
    "date": "2026-02-21",
    "evidence": "Trump announced a 10% tariff on imports"
  }}
  → YES! Date copied from "DATE: 2026-02-21" line

IF CHUNKS ARE OFF-TOPIC:
{{
  "headline": "No Relevant Information Found",
  "summary": "The available sources do not contain information about this topic.",
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
                f"DATE: {chunk.get('date', 'Unknown')}\n"
                f"{'='*80}\n"
                f"{chunk_with_context}\n"
                f"URL: {chunk['url']}"
            )
        
        context = "\n\n" + "="*80 + "\n\n".join(context_parts)
        
        user_prompt = f"""User question: {query}

You have {len(chunks)} news chunks below with dates.

CRITICAL INSTRUCTIONS:
1. If chunks are NOT relevant: Return "No Relevant Information Found"
2. If chunks ARE relevant:
   - Write a NATURAL NEWS HEADLINE (not "Based on chunks...")
   - Write a CLEAR SUMMARY as if reporting news (not "The chunks say...")
   - For EACH fact, you MUST include the "date" field with the date shown in the chunk header (in YYYY-MM-DD format)
   - Extract facts with dates from the chunks
   - Include exact quotes as evidence

MANDATORY DATE REQUIREMENT:
Each chunk header shows:
  SOURCE X: [name] - [title]
  DATE: 2026-02-21    <--- COPY THIS DATE

When you create a fact from that chunk, your JSON MUST include:
{{
  "claim": "...",
  "date": "2026-02-21",    <--- EXACT COPY from chunk's DATE line
  "evidence": "..."
}}

EXAMPLE - If chunk header shows "DATE: 2025-01-15", your fact JSON MUST have "date": "2025-01-15"

Reference chunks:
{context}

Generate a natural news-style response based ONLY on what's in the chunks above. DO NOT FORGET THE DATE FIELD FOR EACH FACT!"""

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
        
        return json.loads(response.choices[0].message.content or "{}")
    
    def search_relevant_chunks(self, question: str, top_k: int = 20) -> Dict:
        """
        Quick search - returns raw chunks without AI processing.
        Ultra-fast for initial display.
        """
        relevant_chunks = self.search_chunks(question, top_k=top_k)
        diverse_chunks = self.get_diverse_chunks(relevant_chunks, max_chunks=10)
        
        return {
            "chunks": diverse_chunks,
            "sources_analyzed": len(set(c['source'] for c in diverse_chunks)),
            "chunks_used": len(diverse_chunks)
        }
    
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
