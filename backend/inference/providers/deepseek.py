from inference.providers._openai_compat import OpenAICompatibleProvider


class DeepSeekProvider(OpenAICompatibleProvider):
    """DeepSeek (deepseek-chat, deepseek-coder, etc.)"""
    PROVIDER_NAME = "deepseek"
