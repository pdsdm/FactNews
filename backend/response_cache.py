"""
Response cache layer for caching full API responses.
Uses Redis with a 1-hour TTL for identical questions.

Cache key: response:<sha256(question_normalized)>
Value: Full JSON response (compressed with gzip)
"""
import hashlib
import json
import gzip
import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime

from cache import get_redis

logger = logging.getLogger(__name__)

_RESPONSE_PREFIX = "response:"
_DEFAULT_RESPONSE_TTL = int(os.getenv("RESPONSE_CACHE_TTL", 3600))


def _normalize_question(question: str) -> str:
    """Normalize question for consistent caching."""
    return " ".join(question.lower().strip().split())


def _cache_key(question: str) -> str:
    """Generate cache key from normalized question."""
    normalized = _normalize_question(question)
    digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:32]
    return f"{_RESPONSE_PREFIX}{digest}"


def _serialize_response(response: Dict[str, Any]) -> bytes:
    """Serialize and compress response."""
    json_str = json.dumps(response, ensure_ascii=False, default=str)
    return gzip.compress(json_str.encode("utf-8"))


def _deserialize_response(data: bytes) -> Dict[str, Any]:
    """Decompress and deserialize response."""
    json_str = gzip.decompress(data).decode("utf-8")
    return json.loads(json_str)


class ResponseCache:
    """
    Cache for full API responses.
    
    Uses Redis when available, falls back to in-memory LRU cache.
    """
    
    _MAX_MEMORY_CACHE_SIZE = 100
    
    def __init__(self):
        self._memory_cache: Dict[str, tuple[bytes, float]] = {}
        self._access_order: list[str] = []
    
    def get(self, question: str) -> Optional[Dict[str, Any]]:
        """Get cached response for a question."""
        key = _cache_key(question)
        
        client = get_redis().client
        if client is not None:
            try:
                data = client.get(key)
                if data:
                    logger.debug(f"Response cache hit (Redis): {key}")
                    return _deserialize_response(data)
            except Exception as e:
                logger.debug(f"Redis get response error: {e}")
        
        if key in self._memory_cache:
            data, timestamp = self._memory_cache[key]
            if datetime.now().timestamp() - timestamp < _DEFAULT_RESPONSE_TTL:
                logger.debug(f"Response cache hit (memory): {key}")
                return _deserialize_response(data)
            else:
                del self._memory_cache[key]
                self._access_order.remove(key)
        
        return None
    
    def set(self, question: str, response: Dict[str, Any], ttl: Optional[int] = None) -> None:
        """Cache a response."""
        key = _cache_key(question)
        data = _serialize_response(response)
        effective_ttl = ttl if ttl is not None else _DEFAULT_RESPONSE_TTL
        
        client = get_redis().client
        if client is not None:
            try:
                client.setex(key, effective_ttl, data)
                logger.debug(f"Response cached (Redis): {key}")
                return
            except Exception as e:
                logger.debug(f"Redis set response error: {e}")
        
        self._memory_cache[key] = (data, datetime.now().timestamp())
        self._access_order.append(key)
        
        while len(self._memory_cache) > self._MAX_MEMORY_CACHE_SIZE:
            oldest_key = self._access_order.pop(0)
            if oldest_key in self._memory_cache:
                del self._memory_cache[oldest_key]
        
        logger.debug(f"Response cached (memory): {key}")
    
    def invalidate(self, question: str) -> None:
        """Invalidate cache for a specific question."""
        key = _cache_key(question)
        
        client = get_redis().client
        if client is not None:
            try:
                client.delete(key)
            except Exception:
                pass
        
        if key in self._memory_cache:
            del self._memory_cache[key]
            self._access_order.remove(key)
    
    def clear_all(self) -> None:
        """Clear all cached responses."""
        client = get_redis().client
        if client is not None:
            try:
                keys = client.keys(f"{_RESPONSE_PREFIX}*")
                if keys:
                    client.delete(*keys)
            except Exception:
                pass
        
        self._memory_cache.clear()
        self._access_order.clear()
    
    @property
    def available(self) -> bool:
        return get_redis().available or len(self._memory_cache) > 0
    
    def stats(self) -> dict:
        """Return cache statistics."""
        client = get_redis().client
        redis_count = 0
        if client is not None:
            try:
                redis_count = len(client.keys(f"{_RESPONSE_PREFIX}*"))
            except Exception:
                pass
        
        return {
            "redis_cached": redis_count,
            "memory_cached": len(self._memory_cache),
            "redis_available": get_redis().available,
        }


_response_cache: Optional[ResponseCache] = None


def get_response_cache() -> ResponseCache:
    global _response_cache
    if _response_cache is None:
        _response_cache = ResponseCache()
    return _response_cache
