from inference.providers._openai_compat import OpenAICompatibleProvider


class GrokProvider(OpenAICompatibleProvider):
    """xAI Grok via OpenAI-compatible endpoint."""
    PROVIDER_NAME = "grok"
