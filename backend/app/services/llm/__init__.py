from app.services.llm.base import BaseLLMProvider, LLMResponse
from app.services.llm.openai import OpenAIProvider
from app.services.llm.anthropic import AnthropicProvider
from app.services.llm.ollama import OllamaProvider

__all__ = [
    "BaseLLMProvider",
    "LLMResponse",
    "OpenAIProvider",
    "AnthropicProvider",
    "OllamaProvider",
    "get_llm_provider",
]


def get_llm_provider(provider: str = "openai", api_key: str | None = None) -> BaseLLMProvider:
    """Factory function to get LLM provider instance."""
    providers = {
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
        "ollama": OllamaProvider,
    }

    if provider not in providers:
        raise ValueError(f"Unknown provider: {provider}")

    if api_key and provider != "ollama":
        return providers[provider](api_key=api_key)
    return providers[provider]()
