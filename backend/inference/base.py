from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class CompletionResponse:
    """Standardized response from any inference provider."""
    content: str
    model: str
    provider: str
    usage: dict = field(default_factory=dict)
    raw: dict = field(default_factory=dict)


class InferenceProvider(ABC):
    """
    Abstract base for all inference providers.

    Every provider wraps an OpenAI-compatible endpoint, so the heavy
    lifting is done in OpenAICompatibleProvider (see providers/_openai_compat.py).
    Subclasses only need to supply name, base_url, api_key, and default model.
    """

    # -- identity --------------------------------------------------------

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable provider name (e.g. 'openai', 'crusoe')."""

    # -- completion ------------------------------------------------------

    @abstractmethod
    def complete(
        self,
        messages: list[dict],
        *,
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
        json_mode: bool = False,
        **kwargs,
    ) -> CompletionResponse:
        """Send a chat completion request and return a standardized response."""

    async def complete_async(
        self,
        messages: list[dict],
        *,
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
        json_mode: bool = False,
        **kwargs,
    ) -> CompletionResponse:
        """Async version of complete. Default implementation wraps sync."""
        return self.complete(
            messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            json_mode=json_mode,
            **kwargs,
        )

    # -- embeddings (optional) -------------------------------------------

    def embed(self, text: str | list[str], *, model: str | None = None) -> list[list[float]]:
        """Return embedding vectors.  Not every provider supports this."""
        raise NotImplementedError(f"{self.name} does not support embeddings")

    # -- helpers ---------------------------------------------------------

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} name={self.name!r}>"
