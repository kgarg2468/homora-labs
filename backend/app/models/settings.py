from sqlalchemy import String, LargeBinary
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Settings(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    value: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    encrypted_value: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
