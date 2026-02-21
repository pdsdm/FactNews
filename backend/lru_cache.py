"""
In-memory LRU cache for embeddings.
Provides ultra-fast lookups without Redis/network overhead.

Used as L1 cache before Redis (L2) and npz file (L3).
"""
import threading
from collections import OrderedDict
from typing import Optional
import numpy as np


class LRUCache:
    """
    Thread-safe LRU cache for embeddings.
    """
    
    def __init__(self, max_size: int = 500):
        self._max_size = max_size
        self._cache: OrderedDict[str, np.ndarray] = OrderedDict()
        self._lock = threading.RLock()
        self._hits = 0
        self._misses = 0
    
    def get(self, key: str) -> Optional[np.ndarray]:
        """Get embedding from cache, updating access order."""
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                self._hits += 1
                return self._cache[key]
            self._misses += 1
            return None
    
    def set(self, key: str, value: np.ndarray) -> None:
        """Add embedding to cache, evicting LRU if needed."""
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                self._cache[key] = value
                return
            
            while len(self._cache) >= self._max_size:
                self._cache.popitem(last=False)
            
            self._cache[key] = value
    
    def delete(self, key: str) -> bool:
        """Remove key from cache. Returns True if key existed."""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    def clear(self) -> None:
        """Clear all cached items."""
        with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0
    
    def stats(self) -> dict:
        """Return cache statistics."""
        with self._lock:
            total = self._hits + self._misses
            hit_rate = self._hits / total if total > 0 else 0.0
            return {
                "size": len(self._cache),
                "max_size": self._max_size,
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": round(hit_rate, 3),
            }
    
    def __len__(self) -> int:
        with self._lock:
            return len(self._cache)
    
    def __contains__(self, key: str) -> bool:
        with self._lock:
            return key in self._cache


_lru_instance: Optional[LRUCache] = None


def get_lru_cache(max_size: int = 500) -> LRUCache:
    """Get or create the global LRU cache instance."""
    global _lru_instance
    if _lru_instance is None:
        _lru_instance = LRUCache(max_size=max_size)
    return _lru_instance
