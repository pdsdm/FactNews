from inference.providers._openai_compat import OpenAICompatibleProvider


class CerebrasProvider(OpenAICompatibleProvider):
    """Cerebras ultra-fast inference (Llama models via Wafer-Scale Engine)."""
    PROVIDER_NAME = "cerebras"
