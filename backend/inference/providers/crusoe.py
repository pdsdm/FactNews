from inference.providers._openai_compat import OpenAICompatibleProvider


class CrusoeProvider(OpenAICompatibleProvider):
    """Crusoe Cloud (Qwen3-235B via Crusoe hackathon endpoint)."""
    PROVIDER_NAME = "crusoe"
