import os
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = "postgresql+asyncpg://homora:homoradev@localhost:5432/homora"
    database_url_sync: str = "postgresql://homora:homoradev@localhost:5432/homora"

    # LLM API Keys
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    ollama_base_url: str = "http://localhost:11434"

    # Default LLM settings
    default_llm_provider: Literal["openai", "anthropic", "ollama"] = "openai"
    default_chat_model: str = "gpt-4o"
    default_embedding_model: str = "text-embedding-3-small"

    # Document storage
    documents_path: str = "./documents"

    # Security
    secret_key: str = "dev-secret-key-change-in-production"

    # Embedding settings
    embedding_dimension: int = 1536
    chunk_size: int = 300  # tokens
    chunk_overlap: int = 75  # tokens

    # Retrieval settings
    retrieval_top_k: int = 15


@lru_cache
def get_settings() -> Settings:
    return Settings()
