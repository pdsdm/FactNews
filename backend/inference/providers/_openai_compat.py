"""
Base class for all OpenAI-compatible inference providers.

Since every provider we support exposes an OpenAI-compatible REST API,
we centralise the actual HTTP logic here. Concrete providers only need
to override `name` and optionally tweak defaults.
"""
from __future__ import annotations
import os
from openai import OpenAI, AsyncOpenAI
from dotenv import load_dotenv

from inference.base import InferenceProvider, CompletionResponse
from inference.config import get_provider_config

load_dotenv()


class OpenAICompatibleProvider(InferenceProvider):
    """
    Generic provider that talks to any OpenAI-compatible endpoint.

    Subclasses set `PROVIDER_NAME` and the rest is automatic.
    """

    PROVIDER_NAME: str = ""  # override in subclass

    def __init__(self, *, api_key: str | None = None, base_url: str | None = None, model: str | None = None):
        cfg = get_provider_config(self.PROVIDER_NAME)

        self._api_key = api_key or os.getenv(cfg["env_key"], "")
        self._base_url = base_url or cfg["base_url"]
        self._default_model = model or cfg["model"]
        self._cfg = cfg

        self._client = OpenAI(
            api_key=self._api_key,
            base_url=self._base_url,
        )
        self._async_client = AsyncOpenAI(
            api_key=self._api_key,
            base_url=self._base_url,
        )

    # -- identity --------------------------------------------------------

    @property
    def name(self) -> str:
        return self.PROVIDER_NAME

    # -- completion ------------------------------------------------------

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
        params: dict = {
            "model": model or self._default_model,
            "messages": messages,
            "temperature": temperature,
            **kwargs,
        }

        if max_tokens is not None:
            params["max_tokens"] = max_tokens

        if json_mode:
            params["response_format"] = {"type": "json_object"}

        response = self._client.chat.completions.create(**params)
        choice = response.choices[0]

        return CompletionResponse(
            content=choice.message.content or "",
            model=response.model or params["model"],
            provider=self.name,
            usage={
                "prompt_tokens": getattr(response.usage, "prompt_tokens", 0),
                "completion_tokens": getattr(response.usage, "completion_tokens", 0),
                "total_tokens": getattr(response.usage, "total_tokens", 0),
            } if response.usage else {},
            raw=response.to_dict() if hasattr(response, "to_dict") else {},
        )

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
        params: dict = {
            "model": model or self._default_model,
            "messages": messages,
            "temperature": temperature,
            **kwargs,
        }

        if max_tokens is not None:
            params["max_tokens"] = max_tokens

        if json_mode:
            params["response_format"] = {"type": "json_object"}

        response = await self._async_client.chat.completions.create(**params)
        choice = response.choices[0]

        return CompletionResponse(
            content=choice.message.content or "",
            model=response.model or params["model"],
            provider=self.name,
            usage={
                "prompt_tokens": getattr(response.usage, "prompt_tokens", 0),
                "completion_tokens": getattr(response.usage, "completion_tokens", 0),
                "total_tokens": getattr(response.usage, "total_tokens", 0),
            } if response.usage else {},
            raw=response.to_dict() if hasattr(response, "to_dict") else {},
        )

    # -- embeddings ------------------------------------------------------

    def embed(self, text: str | list[str], *, model: str | None = None) -> list[list[float]]:
        if not self._cfg.get("supports_embeddings"):
            raise NotImplementedError(f"{self.name} does not support embeddings")

        embed_model = model or self._cfg.get("embed_model", self._default_model)
        input_text = text if isinstance(text, list) else [text]

        response = self._client.embeddings.create(
            input=input_text,
            model=embed_model,
        )

        return [item.embedding for item in response.data]

    # -- raw client access (escape hatch) --------------------------------

    @property
    def client(self) -> OpenAI:
        """Direct access to the underlying OpenAI client for edge cases."""
        return self._client
