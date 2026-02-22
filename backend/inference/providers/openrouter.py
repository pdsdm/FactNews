import os
from openai import OpenAI, AsyncOpenAI
from dotenv import load_dotenv
from inference.providers._openai_compat import OpenAICompatibleProvider

load_dotenv()


class OpenRouterProvider(OpenAICompatibleProvider):
    """OpenRouter — unified gateway to 200+ models via a single API key."""

    PROVIDER_NAME = "openrouter"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        # OpenRouter requires these headers for app attribution / dashboard tracking
        headers = {
            "HTTP-Referer": os.getenv("OPENROUTER_REFERER", "https://factnews.app"),
            "X-Title": os.getenv("OPENROUTER_APP_TITLE", "FactNews"),
        }

        self._client = OpenAI(
            api_key=self._api_key,
            base_url=self._base_url,
            default_headers=headers,
        )
        self._async_client = AsyncOpenAI(
            api_key=self._api_key,
            base_url=self._base_url,
            default_headers=headers,
        )
