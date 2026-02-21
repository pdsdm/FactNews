"""
Redis client singleton with graceful fallback.
Falls back to no-op if REDIS_URL is not set or Redis is unreachable.
"""
import os
import logging
from typing import Optional

import redis

logger = logging.getLogger(__name__)


def _make_client() -> Optional[redis.Redis]:
    """Attempt to create and verify a Redis connection. Returns None on failure."""
    url = os.getenv("REDIS_URL")
    if not url:
        logger.info("REDIS_URL not set - embedding cache disabled")
        return None

    try:
        client: redis.Redis = redis.from_url(
            url,
            decode_responses=False,  # keep binary for embeddings
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
        )
        client.ping()
        logger.info("Redis connected successfully")
        print("✅ Redis connected - embedding cache enabled")
        return client
    except Exception as e:
        logger.warning(f"Redis unavailable ({e}) - falling back to file cache")
        print(f"⚠️  Redis unavailable ({e}) - falling back to file cache")
        return None


class RedisClient:
    """
    Lazy singleton Redis client.
    `available` is False and `client` is None whenever Redis cannot be reached,
    so callers can branch on `available` without handling exceptions.
    """

    _instance: Optional["RedisClient"] = None
    _client: Optional[redis.Redis] = None
    _available: bool = False

    def __new__(cls) -> "RedisClient":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            c = _make_client()
            cls._instance._client = c
            cls._instance._available = c is not None
        return cls._instance

    @property
    def available(self) -> bool:
        return self._available

    @property
    def client(self) -> Optional[redis.Redis]:
        """Returns the underlying redis.Redis instance, or None if unavailable."""
        return self._client if self._available else None

    def health_check(self) -> bool:
        """Ping Redis to verify the connection is still alive."""
        if not self._available or self._client is None:
            return False
        try:
            self._client.ping()
            return True
        except Exception:
            self._available = False
            return False


# ---------------------------------------------------------------------------
# Module-level singleton accessor
# ---------------------------------------------------------------------------

_redis_client: Optional[RedisClient] = None


def get_redis() -> RedisClient:
    global _redis_client
    if _redis_client is None:
        _redis_client = RedisClient()
    return _redis_client
