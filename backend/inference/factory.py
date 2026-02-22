"""
Factory for creating inference providers by name.

Usage:
    from inference import get_provider
    provider = get_provider("crusoe")
    response = provider.complete([{"role": "user", "content": "Hello"}])
"""
from __future__ import annotations
from inference.base import InferenceProvider
from inference.providers import (
    OpenAIProvider,
    CrusoeProvider,
    DeepSeekProvider,
    GoogleProvider,
    AnthropicProvider,
    GrokProvider,
    CerebrasProvider,
    ZAIProvider,
    OpenRouterProvider,
)

_REGISTRY: dict[str, type[InferenceProvider]] = {
    "openai": OpenAIProvider,
    "crusoe": CrusoeProvider,
    "deepseek": DeepSeekProvider,
    "google": GoogleProvider,
    "anthropic": AnthropicProvider,
    "grok": GrokProvider,
    "cerebras": CerebrasProvider,
    "zai": ZAIProvider,
    "openrouter": OpenRouterProvider,
}

# Cache: one instance per provider name (singleton-ish)
_instances: dict[str, InferenceProvider] = {}


def get_provider(name: str, *, fresh: bool = False, **kwargs) -> InferenceProvider:
    """
    Return a provider instance by name.

    Args:
        name:   Provider key (e.g. 'openai', 'crusoe', 'grok')
        fresh:  If True, create a new instance instead of reusing the cached one
        **kwargs: Forwarded to the provider constructor (api_key, model, etc.)

    Returns:
        An InferenceProvider ready to use.
    """
    if name not in _REGISTRY:
        available = ", ".join(sorted(_REGISTRY.keys()))
        raise KeyError(f"Unknown provider '{name}'. Available: {available}")

    if fresh or name not in _instances or kwargs:
        _instances[name] = _REGISTRY[name](**kwargs)

    return _instances[name]


def list_providers() -> list[str]:
    """Return all registered provider names."""
    return sorted(_REGISTRY.keys())
