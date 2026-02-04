from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.project import RoleMode


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    role_mode: RoleMode = RoleMode.plain


class ProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    role_mode: RoleMode | None = None


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    role_mode: RoleMode
    document_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int
