from inference.providers._openai_compat import OpenAICompatibleProvider


class GoogleProvider(OpenAICompatibleProvider):
    """Google Gemini via OpenAI-compatible endpoint."""
    PROVIDER_NAME = "google"
