from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

from app.models.message import MessageRole


class Citation(BaseModel):
    document_id: UUID
    document_name: str
    page: int | None = None
    section: str | None = None


class RetrievedChunkInfo(BaseModel):
    """A chunk retrieved during RAG search, exposed for transparency."""
    document_name: str
    page_number: int | None = None
    section: str | None = None
    content: str
    score: float
    retrieval_relevance: float | None = None
    answer_support: float | None = None
    retrieval_rank: int | None = None
    cited_in_answer: bool = False


class DebugInfo(BaseModel):
    """Debug information exposing the RAG pipeline for transparency."""
    retrieved_chunks: list[RetrievedChunkInfo]
    execution_time_ms: float
    llm_model: str
    system_prompt: str
    user_prompt: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    conversation_id: UUID | None = None


class EditAndRegenerateRequest(BaseModel):
    message_id: UUID
    new_content: str = Field(..., min_length=1)


class ConversationBranchMarker(BaseModel):
    message_id: UUID
    branch_conversation_ids: list[UUID]
    count: int


class MessageResponse(BaseModel):
    id: UUID
    role: MessageRole
    content: str
    citations: list[Citation] | None = None
    suggested_followups: list[str] | None = None
    debug_info: DebugInfo | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: UUID
    project_id: UUID
    parent_conversation_id: UUID | None = None
    branch_from_message_id: UUID | None = None
    title: str | None
    archived: bool
    deleted_at: datetime | None = None
    branch_markers: list[ConversationBranchMarker] = []
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


class EditAndRegenerateResponse(BaseModel):
    source_conversation_id: UUID
    new_conversation_id: UUID
    branch_from_message_id: UUID
    message: MessageResponse


class StructuredResponse(BaseModel):
    answer: str
    evidence: list[str]
    risk_flags: list[str]
    unknowns: list[str]
    next_steps: list[str]
    citations: list[Citation]
    suggested_followups: list[str]
