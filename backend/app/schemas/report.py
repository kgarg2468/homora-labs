from uuid import UUID

from pydantic import BaseModel, Field


class ReportTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    sections: list[str] = Field(default_factory=list)
    is_default: bool = False


class ReportTemplateResponse(BaseModel):
    id: UUID
    name: str
    sections: list[str]
    is_default: bool

    model_config = {"from_attributes": True}


class ReportGenerateRequest(BaseModel):
    project_id: UUID
    template_id: UUID | None = None
    sections: list[str] | None = None
    title: str | None = None
