from inference.providers._openai_compat import OpenAICompatibleProvider


class AnthropicProvider(OpenAICompatibleProvider):
    """Anthropic Claude via OpenAI-compatible endpoint."""
    PROVIDER_NAME = "anthropic"
