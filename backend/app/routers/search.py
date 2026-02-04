from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.search import SearchRequest, SearchResponse
from app.services.search import global_search

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=SearchResponse)
async def search(
    request: SearchRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Search across documents and conversations.

    Supports filtering by:
    - project_id: Limit to specific project
    - search_type: "all", "documents", or "conversations"
    - category: Document category filter
    - date_from/date_to: Date range filter
    """
    return await global_search(db, request)
