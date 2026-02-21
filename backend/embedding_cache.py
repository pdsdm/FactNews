"""
Embedding cache layer backed by Redis.

Two cache namespaces:
  emb:chunk:<chunk_id>  - chunk embeddings, 7-day TTL
  emb:query:<sha256>    - query embeddings,  24-hour TTL

Embeddings are stored as raw float32 bytes (6 KB per 1536-dim vector),
which is ~8x smaller than JSON and avoids any serialization overhead.

Falls back silently to returning None / no-ops when Redis is unavailable,
so rag_optimized.py continues working via the npz file path.
"""
import hashlib
import os
import logging
from typing import Dict, List, Optional

import numpy as np

from cache import get_redis

logger = logging.getLogger(__name__)

# Redis key prefixes
_CHUNK_PREFIX = "emb:chunk:"
_QUERY_PREFIX = "emb:query:"

# Embedding dimension for text-embedding-3-small
_EMBEDDING_DIM = 1536

# Default TTLs (can be overridden via env)
_DEFAULT_CHUNK_TTL = int(os.getenv("EMBEDDING_CACHE_TTL_CHUNK", 604800))   # 7 days
_DEFAULT_QUERY_TTL = int(os.getenv("EMBEDDING_CACHE_TTL_QUERY",  86400))   # 24 hours


# ---------------------------------------------------------------------------
# Serialization helpers
# ---------------------------------------------------------------------------

def _serialize(embedding: np.ndarray) -> bytes:
    """Convert a float32 numpy array to raw bytes."""
    return embedding.astype(np.float32).tobytes()


def _deserialize(data: bytes) -> np.ndarray:
    """Reconstruct a float32 numpy array from raw bytes."""
    return np.frombuffer(data, dtype=np.float32).copy()


def _query_key(query: str) -> str:
    """Stable cache key for a query string."""
    digest = hashlib.sha256(query.encode("utf-8")).hexdigest()[:32]
    return f"{_QUERY_PREFIX}{digest}"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class EmbeddingCache:
    """
    Thin cache layer over Redis for chunk and query embeddings.
    All methods are safe to call when Redis is unavailable - they return
    None / empty dict / no-op as appropriate.
    """

    # ------------------------------------------------------------------
    # Single-item ops
    # ------------------------------------------------------------------

    def get_chunk(self, chunk_id: str) -> Optional[np.ndarray]:
        """Return cached embedding for a chunk, or None on miss/unavailable."""
        client = get_redis().client
        if client is None:
            return None
        try:
            data = client.get(f"{_CHUNK_PREFIX}{chunk_id}")
            return _deserialize(data) if data else None
        except Exception as e:
            logger.debug(f"Redis get_chunk error: {e}")
            return None

    def set_chunk(self, chunk_id: str, embedding: np.ndarray, ttl: Optional[int] = None) -> None:
        """Store an embedding for a chunk."""
        client = get_redis().client
        if client is None:
            return
        try:
            client.setex(
                f"{_CHUNK_PREFIX}{chunk_id}",
                ttl if ttl is not None else _DEFAULT_CHUNK_TTL,
                _serialize(embedding),
            )
        except Exception as e:
            logger.debug(f"Redis set_chunk error: {e}")

    def get_query(self, query: str) -> Optional[np.ndarray]:
        """Return cached embedding for a query string, or None on miss/unavailable."""
        client = get_redis().client
        if client is None:
            return None
        try:
            data = client.get(_query_key(query))
            return _deserialize(data) if data else None
        except Exception as e:
            logger.debug(f"Redis get_query error: {e}")
            return None

    def set_query(self, query: str, embedding: np.ndarray, ttl: Optional[int] = None) -> None:
        """Store an embedding for a query string."""
        client = get_redis().client
        if client is None:
            return
        try:
            client.setex(
                _query_key(query),
                ttl if ttl is not None else _DEFAULT_QUERY_TTL,
                _serialize(embedding),
            )
        except Exception as e:
            logger.debug(f"Redis set_query error: {e}")

    # ------------------------------------------------------------------
    # Batch ops (use Redis pipeline for efficiency)
    # ------------------------------------------------------------------

    def batch_get_chunks(self, chunk_ids: List[str]) -> Dict[str, np.ndarray]:
        """
        Fetch multiple chunk embeddings in a single round-trip (MGET).
        Returns only the keys that were present in cache.
        """
        if not chunk_ids:
            return {}
        client = get_redis().client
        if client is None:
            return {}
        try:
            keys = [f"{_CHUNK_PREFIX}{cid}" for cid in chunk_ids]
            values = client.mget(keys)
            result: Dict[str, np.ndarray] = {}
            for chunk_id, data in zip(chunk_ids, values):
                if data is not None:
                    result[chunk_id] = _deserialize(data)
            return result
        except Exception as e:
            logger.debug(f"Redis batch_get_chunks error: {e}")
            return {}

    def batch_set_chunks(
        self,
        embeddings: Dict[str, np.ndarray],
        ttl: Optional[int] = None,
    ) -> None:
        """
        Store multiple chunk embeddings in a single pipeline.
        """
        if not embeddings:
            return
        client = get_redis().client
        if client is None:
            return
        effective_ttl = ttl if ttl is not None else _DEFAULT_CHUNK_TTL
        try:
            pipe = client.pipeline(transaction=False)
            for chunk_id, emb in embeddings.items():
                pipe.setex(
                    f"{_CHUNK_PREFIX}{chunk_id}",
                    effective_ttl,
                    _serialize(emb),
                )
            pipe.execute()
        except Exception as e:
            logger.debug(f"Redis batch_set_chunks error: {e}")

    # ------------------------------------------------------------------
    # Introspection helpers
    # ------------------------------------------------------------------

    @property
    def available(self) -> bool:
        return get_redis().available

    def stats(self) -> dict:
        """Return basic cache statistics (key counts per namespace)."""
        client = get_redis().client
        if client is None:
            return {"available": False}
        try:
            chunk_count = len(client.keys(f"{_CHUNK_PREFIX}*"))
            query_count = len(client.keys(f"{_QUERY_PREFIX}*"))
            return {
                "available": True,
                "cached_chunks": chunk_count,
                "cached_queries": query_count,
            }
        except Exception as e:
            return {"available": False, "error": str(e)}
