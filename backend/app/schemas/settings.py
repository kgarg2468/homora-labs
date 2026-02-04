from typing import Literal

from pydantic import BaseModel


class LLMSettings(BaseModel):
    provider: Literal["openai", "anthropic", "ollama"] = "openai"
    model: str = "gpt-4o"
    api_key: str | None = None


class EmbeddingSettings(BaseModel):
    model: str = "text-embedding-3-small"


class SettingsUpdate(BaseModel):
    llm: LLMSettings | None = None
    embedding: EmbeddingSettings | None = None
    theme: Literal["light", "dark", "system"] | None = None
    documents_path: str | None = None


class SettingsResponse(BaseModel):
    llm: LLMSettings
    embedding: EmbeddingSettings
    theme: Literal["light", "dark", "system"]
    documents_path: str
    available_providers: list[str]
    available_models: dict[str, list[str]]
