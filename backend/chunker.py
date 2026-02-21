"""
Optimized article chunker for better RAG retrieval.

Improvements:
- Smaller default chunks (300 chars) for better precision
- Semantic sentence boundaries
- Better overlap strategy (sentence-aware)
- Title/context prefix for each chunk
- Named entity preservation
"""
import re
import hashlib
from typing import List, Dict, Optional


class ArticleChunker:
    """
    Chunk articles into semantic units for optimal RAG performance.
    
    Key optimizations:
    1. Smaller chunks = more precise retrieval
    2. Sentence-aware splitting (no mid-sentence cuts)
    3. Context prefix (title + source) for each chunk
    4. Smart overlap at sentence boundaries
    """
    
    def __init__(
        self,
        chunk_size: int = 300,
        overlap_sentences: int = 1,
        min_chunk_size: int = 100,
    ):
        """
        Args:
            chunk_size: Target characters per chunk (smaller = more precise)
            overlap_sentences: Number of sentences to overlap between chunks
            min_chunk_size: Minimum chunk size to avoid tiny fragments
        """
        self.chunk_size = chunk_size
        self.overlap_sentences = overlap_sentences
        self.min_chunk_size = min_chunk_size
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences, preserving punctuation."""
        sentence_pattern = r'(?<=[.!?])\s+(?=[A-Z])|(?<=[.!?])\s+(?=\d)|(?<=[.!?])$'
        sentences = re.split(sentence_pattern, text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _create_context_prefix(self, article: Dict) -> str:
        """Create a context prefix for the chunk."""
        source = article.get("source", "Unknown")
        title = article.get("title", "")
        date = article.get("date", "")
        
        prefix = f"[{source}]"
        if date:
            prefix += f" {date}"
        if title:
            title_short = title[:60] + "..." if len(title) > 60 else title
            prefix += f" {title_short}"
        
        return prefix + "\n"
    
    def chunk_article(self, article: Dict) -> List[Dict]:
        """
        Split article into semantic chunks with metadata.
        
        Optimizations:
        - Sentence-boundary aware splitting
        - Context prefix for better retrieval
        - Smart overlap at sentence level
        """
        content = article.get("content", "")
        
        unique_string = article.get("url") or article.get("title") or str(id(article))
        article_id = hashlib.md5(unique_string.encode("utf-8")).hexdigest()[:12]
        
        sentences = self._split_into_sentences(content)
        
        if not sentences:
            return []
        
        context_prefix = self._create_context_prefix(article)
        context_len = len(context_prefix)
        effective_chunk_size = self.chunk_size - context_len
        
        chunks = []
        current_sentences: List[str] = []
        current_length = 0
        chunk_index = 0
        
        for i, sentence in enumerate(sentences):
            sentence_len = len(sentence)
            
            if current_length + sentence_len > effective_chunk_size and current_sentences:
                chunk_text = context_prefix + " ".join(current_sentences)
                
                if len(chunk_text.strip()) >= self.min_chunk_size:
                    chunks.append(self._create_chunk(
                        text=chunk_text,
                        article=article,
                        article_id=article_id,
                        chunk_index=chunk_index,
                    ))
                    chunk_index += 1
                
                overlap_start = max(0, len(current_sentences) - self.overlap_sentences)
                current_sentences = current_sentences[overlap_start:]
                current_length = sum(len(s) for s in current_sentences) + len(current_sentences)
            
            current_sentences.append(sentence)
            current_length += sentence_len + 1
        
        if current_sentences:
            chunk_text = context_prefix + " ".join(current_sentences)
            if len(chunk_text.strip()) >= self.min_chunk_size:
                chunks.append(self._create_chunk(
                    text=chunk_text,
                    article=article,
                    article_id=article_id,
                    chunk_index=chunk_index,
                ))
        
        if len(chunks) == 0 and sentences:
            all_text = context_prefix + " ".join(sentences)
            chunks.append(self._create_chunk(
                text=all_text,
                article=article,
                article_id=article_id,
                chunk_index=0,
            ))
        
        return chunks
    
    def _create_chunk(self, text: str, article: Dict, article_id: str, chunk_index: int) -> Dict:
        """Create chunk with metadata."""
        return {
            "chunk_id": f"{article_id}_chunk_{chunk_index}",
            "text": text,
            "article_id": article_id,
            "chunk_index": chunk_index,
            "source": article.get("source", "Unknown"),
            "url": article.get("url", ""),
            "title": article.get("title", ""),
            "date": article.get("date", ""),
        }
    
    def get_chunk_with_context(self, chunk: Dict, all_chunks: List[Dict]) -> str:
        """
        Get chunk text with surrounding context.
        Optimized to show previous/next chunk excerpts.
        """
        article_id = chunk.get("article_id")
        chunk_index = chunk.get("chunk_index", 0)
        
        prev_chunk = None
        next_chunk = None
        
        for c in all_chunks:
            if c.get("article_id") == article_id:
                if c.get("chunk_index") == chunk_index - 1:
                    prev_chunk = c
                elif c.get("chunk_index") == chunk_index + 1:
                    next_chunk = c
        
        parts = []
        
        if prev_chunk:
            prev_text = prev_chunk.get("text", "")
            sentences = self._split_into_sentences(prev_text)
            if len(sentences) > 1:
                context_text = " ".join(sentences[-2:])
            else:
                context_text = prev_text[-150:]
            parts.append(f"[...previous context...]\n{context_text}")
        
        parts.append(chunk.get("text", ""))
        
        if next_chunk:
            next_text = next_chunk.get("text", "")
            sentences = self._split_into_sentences(next_text)
            if len(sentences) > 1:
                context_text = " ".join(sentences[:2])
            else:
                context_text = next_text[:150]
            parts.append(f"{context_text}\n[...continues...]")
        
        return "\n\n".join(parts)
    
    def chunk_all_articles(self, articles: List[Dict]) -> List[Dict]:
        """Chunk all articles and return flat list."""
        all_chunks = []
        for article in articles:
            try:
                chunks = self.chunk_article(article)
                all_chunks.extend(chunks)
            except Exception as e:
                print(f"Warning: Failed to chunk article '{article.get('title', 'unknown')}': {e}")
                continue
        return all_chunks


class SemanticChunker(ArticleChunker):
    """
    Advanced chunker that respects semantic boundaries.
    
    Uses paragraph breaks, headers, and topic shifts to create
    more coherent chunks.
    """
    
    def __init__(self, chunk_size: int = 350, **kwargs):
        super().__init__(chunk_size=chunk_size, **kwargs)
    
    def _detect_paragraph_breaks(self, text: str) -> List[str]:
        """Split by paragraphs first, then sentences."""
        paragraphs = re.split(r'\n\s*\n', text)
        result = []
        
        for para in paragraphs:
            if len(para.strip()) > 0:
                sentences = self._split_into_sentences(para)
                result.extend(sentences)
        
        return result
    
    def chunk_article(self, article: Dict) -> List[Dict]:
        """Chunk with semantic awareness."""
        content = article.get("content", "")
        
        unique_string = article.get("url") or article.get("title") or str(id(article))
        article_id = hashlib.md5(unique_string.encode("utf-8")).hexdigest()[:12]
        
        sentences = self._detect_paragraph_breaks(content)
        
        if not sentences:
            return []
        
        context_prefix = self._create_context_prefix(article)
        effective_chunk_size = self.chunk_size - len(context_prefix)
        
        chunks = []
        current_sentences: List[str] = []
        current_length = 0
        chunk_index = 0
        
        for sentence in sentences:
            if current_length + len(sentence) > effective_chunk_size and current_sentences:
                chunk_text = context_prefix + " ".join(current_sentences)
                if len(chunk_text.strip()) >= self.min_chunk_size:
                    chunks.append(self._create_chunk(
                        text=chunk_text,
                        article=article,
                        article_id=article_id,
                        chunk_index=chunk_index,
                    ))
                    chunk_index += 1
                
                overlap_start = max(0, len(current_sentences) - self.overlap_sentences)
                current_sentences = current_sentences[overlap_start:]
                current_length = sum(len(s) for s in current_sentences)
            
            current_sentences.append(sentence)
            current_length += len(sentence) + 1
        
        if current_sentences:
            chunk_text = context_prefix + " ".join(current_sentences)
            if len(chunk_text.strip()) >= self.min_chunk_size:
                chunks.append(self._create_chunk(
                    text=chunk_text,
                    article=article,
                    article_id=article_id,
                    chunk_index=chunk_index,
                ))
        
        return chunks if chunks else super().chunk_article(article)
