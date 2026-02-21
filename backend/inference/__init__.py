"""
Inference package - unified access to multiple LLM providers.

Quick start:
    from inference import get_provider, list_providers, ModelCouncil

    # Single provider
    provider = get_provider("crusoe")
    response = provider.complete([{"role": "user", "content": "Hello"}])
    print(response.content)

    # Model council
    council = ModelCouncil(providers=["crusoe", "deepseek", "grok"], judge="openai")
    result = council.deliberate("Analyze this news story")
    print(result["judgment"]["synthesis"])
"""
from inference.factory import get_provider, list_providers
from inference.base import InferenceProvider, CompletionResponse
from inference.council import ModelCouncil

__all__ = [
    "get_provider",
    "list_providers",
    "InferenceProvider",
    "CompletionResponse",
    "ModelCouncil",
]
