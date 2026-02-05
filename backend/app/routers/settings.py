from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from cryptography.fernet import Fernet

from app.database import get_db
from app.models.settings import Settings as SettingsModel
from app.schemas.settings import SettingsUpdate, SettingsResponse, LLMSettings, EmbeddingSettings
from app.services.llm import get_llm_provider
from app.config import get_settings

config = get_settings()
router = APIRouter(prefix="/settings", tags=["settings"])

# Generate encryption key from secret
import hashlib
import base64

def get_encryption_key():
    key = hashlib.sha256(config.secret_key.encode()).digest()
    return base64.urlsafe_b64encode(key)


def encrypt_value(value: str) -> bytes:
    f = Fernet(get_encryption_key())
    return f.encrypt(value.encode())


def decrypt_value(encrypted: bytes) -> str:
    f = Fernet(get_encryption_key())
    return f.decrypt(encrypted).decode()


@router.get("", response_model=SettingsResponse)
async def get_settings_endpoint(db: AsyncSession = Depends(get_db)):
    """Get current settings."""
    # Get settings from DB
    result = await db.execute(select(SettingsModel))
    settings_dict = {s.key: s for s in result.scalars().all()}

    # Build LLM settings
    llm_settings = LLMSettings(
        provider=settings_dict.get("llm_provider", SettingsModel(value={"v": "openai"})).value.get("v", "openai"),
        model=settings_dict.get("llm_model", SettingsModel(value={"v": "gpt-4o"})).value.get("v", "gpt-4o"),
        api_key=None,  # Never return API keys
    )

    # Build embedding settings
    embedding_settings = EmbeddingSettings(
        model=settings_dict.get("embedding_model", SettingsModel(value={"v": "text-embedding-3-small"})).value.get("v", "text-embedding-3-small"),
    )

    # Get theme
    theme = settings_dict.get("theme", SettingsModel(value={"v": "system"})).value.get("v", "system")

    # Get available models per provider
    # Hardcoded fallback lists so the UI always shows model options,
    # even before API keys are configured.
    fallback_models = {
        "openai": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
        "anthropic": ["claude-sonnet-4-20250514", "claude-haiku-35-20241022"],
        "ollama": ["llama3", "mistral", "codellama"],
    }
    available_models = {}
    for provider_name in ["openai", "anthropic", "ollama"]:
        try:
            provider = get_llm_provider(provider_name)
            available_models[provider_name] = provider.get_available_models()
        except (ValueError, Exception):
            available_models[provider_name] = fallback_models.get(provider_name, [])

    return SettingsResponse(
        llm=llm_settings,
        embedding=embedding_settings,
        theme=theme,
        documents_path=config.documents_path,
        available_providers=["openai", "anthropic", "ollama"],
        available_models=available_models,
    )


@router.patch("")
async def update_settings(
    data: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update settings."""
    if data.llm:
        if data.llm.provider:
            await upsert_setting(db, "llm_provider", {"v": data.llm.provider})
        if data.llm.model:
            await upsert_setting(db, "llm_model", {"v": data.llm.model})
        if data.llm.api_key:
            # Encrypt API key
            encrypted = encrypt_value(data.llm.api_key)
            result = await db.execute(
                select(SettingsModel).where(SettingsModel.key == f"api_key_{data.llm.provider}")
            )
            setting = result.scalar_one_or_none()
            if setting:
                setting.encrypted_value = encrypted
            else:
                setting = SettingsModel(
                    key=f"api_key_{data.llm.provider}",
                    encrypted_value=encrypted,
                )
                db.add(setting)

    if data.embedding:
        await upsert_setting(db, "embedding_model", {"v": data.embedding.model})

    if data.theme:
        await upsert_setting(db, "theme", {"v": data.theme})

    await db.commit()

    return {"status": "updated"}


async def upsert_setting(db: AsyncSession, key: str, value: dict):
    """Insert or update a setting."""
    result = await db.execute(select(SettingsModel).where(SettingsModel.key == key))
    setting = result.scalar_one_or_none()

    if setting:
        setting.value = value
    else:
        setting = SettingsModel(key=key, value=value)
        db.add(setting)


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
