from datetime import datetime
from uuid import UUID
from typing import Literal

from pydantic import BaseModel


class TrashItem(BaseModel):
    id: UUID
    type: Literal["conversation", "document"]
    title: str
    project_id: UUID
    deleted_at: datetime
    created_at: datetime


class TrashListResponse(BaseModel):
    items: list[TrashItem]
    total: int
