import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import String, Text, Enum, DateTime, Integer, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class FileType(str, PyEnum):
    pdf = "pdf"
    docx = "docx"
    xlsx = "xlsx"
    image = "image"
    txt = "txt"


class IngestionStatus(str, PyEnum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class DocumentCategory(str, PyEnum):
    lease = "lease"
    appraisal = "appraisal"
    title = "title"
    zoning = "zoning"
    financial = "financial"
    survey = "survey"
    environmental = "environmental"
    other = "other"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[FileType] = mapped_column(Enum(FileType), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ingestion_status: Mapped[IngestionStatus] = mapped_column(
        Enum(IngestionStatus), default=IngestionStatus.pending, nullable=False
    )
    ingestion_progress: Mapped[int] = mapped_column(Integer, default=0)
    category: Mapped[DocumentCategory] = mapped_column(
        Enum(DocumentCategory), default=DocumentCategory.other, nullable=False
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="documents")
    chunks: Mapped[list["Chunk"]] = relationship(
        "Chunk", back_populates="document", cascade="all, delete-orphan"
    )
    tags: Mapped[list["DocumentTag"]] = relationship(
        "DocumentTag", back_populates="document", cascade="all, delete-orphan"
    )


class DocumentTag(Base):
    __tablename__ = "document_tags"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    tag: Mapped[str] = mapped_column(String(100), nullable=False)

    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="tags")
