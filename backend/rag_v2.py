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
    def __init__(self, articles: List[Dict], embeddings_file: str = "chunk_embeddings.json"):
        """Initialize with articles and create chunks"""
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.chunker = ArticleChunker(chunk_size=500, overlap=100)
        self.embeddings_file = embeddings_file
        
        # Chunk all articles
        print("📦 Chunking articles...")
        self.chunks = self.chunker.chunk_all_articles(articles)
        print(f"✅ Created {len(self.chunks)} chunks from {len(articles)} articles")
        
        # Load existing embeddings or create new ones
        self.embeddings_db = {}  # {chunk_id: embedding_vector}
        self.chunk_embeddings = []  # Ordered list matching self.chunks
        self._load_or_create_embeddings()
    
    def _load_or_create_embeddings(self):
        """Load existing embeddings and create only for new chunks"""
        if not self.client.api_key:
            print("⚠️  No OpenAI key, skipping embeddings")
            return
        
        # Load existing embeddings from file
        if os.path.exists(self.embeddings_file):
            with open(self.embeddings_file, 'r') as f:
                self.embeddings_db = json.load(f)
            print(f"📚 Loaded {len(self.embeddings_db)} existing embeddings")
        else:
            print("📝 No existing embeddings found")
        
        # Identify new chunks that need embeddings
        new_chunks = []
        new_chunk_indices = []
        
        for i, chunk in enumerate(self.chunks):
            chunk_id = chunk['chunk_id']
            if chunk_id not in self.embeddings_db:
                new_chunks.append(chunk)
                new_chunk_indices.append(i)
        
        # Generate embeddings only for new chunks
        if new_chunks:
            print(f"🔄 Creating embeddings for {len(new_chunks)} new chunks...")
            self._generate_embeddings_batch(new_chunks)
            
            # Save updated embeddings to file
            with open(self.embeddings_file, 'w') as f:
                json.dump(self.embeddings_db, f)
            print(f"💾 Saved embeddings to {self.embeddings_file}")
        else:
            print("✅ All chunks already have embeddings")
        
        # Build ordered embedding list matching self.chunks
        self.chunk_embeddings = [
            self.embeddings_db.get(chunk['chunk_id'], [0.0] * 1536)
            for chunk in self.chunks
        ]
        print(f"✅ Ready with {len(self.chunk_embeddings)} chunk embeddings")
    
    def _generate_embeddings_batch(self, chunks: List[Dict]):
        """Generate embeddings for a batch of chunks and store in DB"""
        texts = [chunk['text'] for chunk in chunks]
        
        # Batch process (OpenAI allows up to 2048 inputs)
        batch_size = 100
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i+batch_size]
            batch_chunks = chunks[i:i+batch_size]
            
            response = self.client.embeddings.create(
                model="text-embedding-3-small",
                input=batch_texts
            )
            
            # Store embeddings with chunk_id as key
            for j, embedding_data in enumerate(response.data):
                chunk_id = batch_chunks[j]['chunk_id']
                self.embeddings_db[chunk_id] = embedding_data.embedding
    
    def cleanup_old_embeddings(self):
        """Remove embeddings for chunks that no longer exist"""
        current_chunk_ids = {chunk['chunk_id'] for chunk in self.chunks}
        old_chunk_ids = set(self.embeddings_db.keys()) - current_chunk_ids
        
        if old_chunk_ids:
            print(f"🧹 Removing {len(old_chunk_ids)} obsolete embeddings")
            for chunk_id in old_chunk_ids:
                del self.embeddings_db[chunk_id]
            
            # Save cleaned database
            with open(self.embeddings_file, 'w') as f:
                json.dump(self.embeddings_db, f)
    
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
        Select diverse chunks from different sources using strict round-robin.
        GUARANTEES maximum source diversity.
        """
        if not chunks:
            return []
        
        # Group chunks by source
        by_source = {}
        for chunk in chunks:
            source = chunk['source']
            if source not in by_source:
                by_source[source] = []
            by_source[source].append(chunk)
        
        # Strict round-robin: cycle through sources evenly
        diverse_chunks = []
        round_num = 0
        
        while len(diverse_chunks) < max_chunks:
            added_this_round = False
            
            # Go through each source in order
            for source in sorted(by_source.keys()):
                if len(diverse_chunks) >= max_chunks:
                    break
                
                # Take the next chunk from this source (if available)
                if round_num < len(by_source[source]):
                    diverse_chunks.append(by_source[source][round_num])
                    added_this_round = True
            
            # If no source had chunks for this round, we're done
            if not added_this_round:
                break
            
            round_num += 1
        
        return diverse_chunks[:max_chunks]
    
    def generate_answer(self, query: str, chunks: List[Dict]) -> Dict:
        """
        Generate consensus answer from relevant chunks (not full articles).
        Much faster because we send way less text.
        """
        # Build system prompt with chunk count
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

Remember: You ONLY know what's in the {num_chunks} chunks below. Nothing else exists.""".format(num_chunks=len(chunks))
        
        # Build context from chunks with source labels
        context_parts = []
        for i, chunk in enumerate(chunks):
            # Get chunk with surrounding context
            chunk_with_context = self.chunker.get_chunk_with_context(chunk, self.chunks)
            
            context_parts.append(
                f"CHUNK {i+1}/{len(chunks)}\n"
                f"SOURCE: {chunk['source']}\n"
                f"ARTICLE: {chunk['title']}\n"
                f"URL: {chunk['url']}\n"
                f"{'='*80}\n"
                f"{chunk_with_context}\n"
                f"{'='*80}"
            )
        
        context = "\n\n".join(context_parts)
        
        user_prompt = f"""User question: {query}

THESE ARE THE ONLY {len(chunks)} CHUNKS YOU HAVE ACCESS TO:

{context}

INSTRUCTIONS:
1. Read each chunk carefully
2. If chunks are NOT about "{query}", say "No Relevant Information Found"
3. If chunks ARE relevant, extract ONLY facts that are LITERALLY stated
4. Include EXACT quotes in the "evidence" field
5. Do NOT add any information not in these {len(chunks)} chunks

Generate JSON response now:"""

        # Call LLM (much faster now - only ~3-5k tokens instead of 16k)
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,  # Lower temperature for more factual
            response_format={"type": "json_object"}
        )
        
        return json.loads(response.choices[0].message.content)
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

Remember: You ONLY know what's in the {num_chunks} chunks below. Nothing else exists."""

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
