"""
Chunk articles into semantic paragraphs for better RAG performance.
Each chunk gets its own embedding for precise retrieval.
"""
import re
from typing import List, Dict

class ArticleChunker:
    def __init__(self, chunk_size: int = 400, overlap: int = 50):
        """
        Args:
            chunk_size: Target characters per chunk
            overlap: Characters to overlap between chunks (for context)
        """
        self.chunk_size = chunk_size
        self.overlap = overlap
    
    def chunk_article(self, article: Dict) -> List[Dict]:
        """
        Split article into semantic chunks with metadata.
        
        Returns list of chunks:
        [
            {
                'chunk_id': 'article_hash_chunk_0',
                'text': 'paragraph text...',
                'article_id': 'article_hash',
                'chunk_index': 0,
                'source': 'BBC News',
                'url': 'https://...',
                'title': 'Article title',
                'date': '2026-02-21'
            }
        ]
        """
        content = article['content']
        
        import hashlib
        unique_string = article.get('url') or article.get('title') or str(id(article))
        article_id = hashlib.md5(unique_string.encode('utf-8')).hexdigest()[:12]
        
        # Try paragraph splitting first
        paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
        
        # If no paragraphs, split by sentences (for articles without \n\n)
        if len(paragraphs) == 1:
            # Split by sentence boundaries (. ! ?)
            import re
            sentences = re.split(r'(?<=[.!?])\s+', content)
            paragraphs = []
            current = ""
            
            # Group sentences into ~400 char chunks
            for sent in sentences:
                if len(current) + len(sent) > self.chunk_size and current:
                    paragraphs.append(current.strip())
                    current = sent
                else:
                    current += " " + sent if current else sent
            
            if current:
                paragraphs.append(current.strip())
        
        chunks = []
        current_chunk = ""
        chunk_index = 0
        
        for para in paragraphs:
            # If adding this paragraph exceeds chunk_size, save current chunk
            if len(current_chunk) + len(para) > self.chunk_size and current_chunk:
                chunks.append(self._create_chunk(
                    text=current_chunk,
                    article=article,
                    article_id=article_id,
                    chunk_index=chunk_index
                ))
                chunk_index += 1
                
                # Start new chunk with overlap (last N chars from previous)
                if self.overlap > 0 and len(current_chunk) > self.overlap:
                    current_chunk = current_chunk[-self.overlap:] + " " + para
                else:
                    current_chunk = para
            else:
                # Add paragraph to current chunk
                current_chunk += ("\n\n" if current_chunk else "") + para
        
        # Don't forget the last chunk
        if current_chunk:
            chunks.append(self._create_chunk(
                text=current_chunk,
                article=article,
                article_id=article_id,
                chunk_index=chunk_index
            ))
        
        return chunks
    
    def _create_chunk(self, text: str, article: Dict, article_id: str, chunk_index: int) -> Dict:
        """Create chunk metadata"""
        
        return {
            'chunk_id': f"{article_id}_chunk_{chunk_index}",
            'text': text,
            'article_id': article_id,
            'chunk_index': chunk_index,
            'source': article['source'],
            'url': article['url'],
            'title': article['title'],
            'date': article['date'],
        }
    
    def get_chunk_with_context(self, chunk: Dict, all_chunks: List[Dict]) -> str:
        """
        Get chunk text with surrounding context (prev + current + next).
        This improves LLM understanding.
        """
        article_id = chunk['article_id']
        chunk_index = chunk['chunk_index']
        
        # Find prev and next chunks from same article
        prev_chunk = None
        next_chunk = None
        
        for c in all_chunks:
            if c['article_id'] == article_id:
                if c['chunk_index'] == chunk_index - 1:
                    prev_chunk = c
                elif c['chunk_index'] == chunk_index + 1:
                    next_chunk = c
        
        # Build context string
        parts = []
        if prev_chunk:
            parts.append(f"[...previous context...]\n{prev_chunk['text'][-200:]}")
        
        parts.append(chunk['text'])
        
        if next_chunk:
            parts.append(f"{next_chunk['text'][:200]}\n[...continues...]")
        
        return "\n\n".join(parts)
    
    def chunk_all_articles(self, articles: List[Dict]) -> List[Dict]:
        """Chunk all articles and return flat list of chunks"""
        all_chunks = []
        for article in articles:
            chunks = self.chunk_article(article)
            all_chunks.extend(chunks)
        return all_chunks
