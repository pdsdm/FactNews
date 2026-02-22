"""
Centralized configuration for all inference providers.

Each entry maps a provider name to:
  - base_url:  OpenAI-compatible API endpoint
  - env_key:   Name of the environment variable holding the API key
  - model:     Default model to use when none is specified
  - supports_embeddings: Whether the provider offers an embeddings endpoint
"""

PROVIDERS: dict[str, dict] = {
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "env_key": "OPENAI_API_KEY",
        "model": "gpt-4o-mini",
        "supports_embeddings": True,
        "embed_model": "text-embedding-3-small",
    },
    "crusoe": {
        "base_url": "https://hackeurope.crusoecloud.com/v1/",
        "env_key": "CRUSOE_API_KEY",
        "model": "NVFP4/Qwen3-235B-A22B-Instruct-2507-FP4",
        "supports_embeddings": False,
    },
    "deepseek": {
        "base_url": "https://api.deepseek.com/v1",
        "env_key": "DEEPSEEK_API_KEY",
        "model": "deepseek-chat",
        "supports_embeddings": False,
    },
    "google": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "env_key": "GOOGLE_API_KEY",
        "model": "gemini-2.0-flash",
        "supports_embeddings": True,
        "embed_model": "text-embedding-004",
    },
    "anthropic": {
        "base_url": "https://api.anthropic.com/v1/",
        "env_key": "ANTHROPIC_API_KEY",
        "model": "claude-sonnet-4-20250514",
        "supports_embeddings": False,
    },
    "grok": {
        "base_url": "https://api.x.ai/v1",
        "env_key": "GROK_API_KEY",
        "model": "grok-3-mini-fast",
        "supports_embeddings": False,
    },
    "cerebras": {
        "base_url": "https://api.cerebras.ai/v1",
        "env_key": "CEREBRAS_API_KEY",
        "model": "llama3.1-8b",
        "supports_embeddings": False,
    },
    "zai": {
        "base_url": "https://api.zai.com/v1",   # placeholder - update when available
        "env_key": "ZAI_API_KEY",
        "model": "zai-default",
        "supports_embeddings": False,
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "env_key": "OPENROUTER_API_KEY",
        "model": "meta-llama/llama-3.3-70b-instruct",
        "supports_embeddings": False,
    },
}


def get_provider_config(name: str) -> dict:
    """Return config dict for a provider, raising KeyError if unknown."""
    if name not in PROVIDERS:
        available = ", ".join(sorted(PROVIDERS.keys()))
        raise KeyError(f"Unknown provider '{name}'. Available: {available}")
    return PROVIDERS[name]
