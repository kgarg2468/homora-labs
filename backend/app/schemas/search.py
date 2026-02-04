from datetime import datetime
from uuid import UUID
from typing import Literal

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    project_id: UUID | None = None
    search_type: Literal["all", "documents", "conversations"] = "all"
    category: str | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class SearchResult(BaseModel):
    id: UUID
    type: Literal["document", "conversation", "chunk"]
    title: str
    snippet: str
    project_id: UUID
    project_name: str
    document_id: UUID | None = None
    page_number: int | None = None
    relevance_score: float
    created_at: datetime


class SearchResponse(BaseModel):
    results: list[SearchResult]
    total: int
    query: str
