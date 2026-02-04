from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.message import MessageRole


class Citation(BaseModel):
    document_id: UUID
    document_name: str
    page: int | None = None
    section: str | None = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    conversation_id: UUID | None = None


class MessageResponse(BaseModel):
    id: UUID
    role: MessageRole
    content: str
    citations: list[Citation] | None = None
    suggested_followups: list[str] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: UUID
    project_id: UUID
    title: str | None
    archived: bool
    messages: list[MessageResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationListResponse(BaseModel):
    conversations: list[ConversationResponse]
    total: int


class ChatResponse(BaseModel):
    conversation_id: UUID
    message: MessageResponse


class StructuredResponse(BaseModel):
    answer: str
    evidence: list[str]
    risk_flags: list[str]
    unknowns: list[str]
    next_steps: list[str]
    citations: list[Citation]
    suggested_followups: list[str]
