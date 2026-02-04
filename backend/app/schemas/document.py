from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.document import FileType, IngestionStatus, DocumentCategory


class DocumentCreate(BaseModel):
    filename: str = Field(..., min_length=1, max_length=500)
    file_type: FileType
    category: DocumentCategory | None = None


class DocumentTagCreate(BaseModel):
    tag: str = Field(..., min_length=1, max_length=100)


class DocumentTagResponse(BaseModel):
    id: UUID
    tag: str

    model_config = {"from_attributes": True}


class DocumentResponse(BaseModel):
    id: UUID
    project_id: UUID
    filename: str
    file_type: FileType
    file_path: str
    page_count: int | None
    ingestion_status: IngestionStatus
    ingestion_progress: int
    category: DocumentCategory
    error_message: str | None
    tags: list[DocumentTagResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int
