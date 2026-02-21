from inference.providers._openai_compat import OpenAICompatibleProvider


class OpenAIProvider(OpenAICompatibleProvider):
    """OpenAI (GPT-4o, GPT-4o-mini, etc.)"""
    PROVIDER_NAME = "openai"
