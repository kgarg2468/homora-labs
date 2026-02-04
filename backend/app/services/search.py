import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, or_, and_

from app.models.document import Document
from app.models.chunk import Chunk
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.project import Project
from app.schemas.search import SearchRequest, SearchResponse, SearchResult
from app.services.embeddings import generate_single_embedding


async def global_search(
    db: AsyncSession,
    request: SearchRequest,
) -> SearchResponse:
    """
    Search across documents and conversations with filters.
    """
    results = []

    if request.search_type in ("all", "documents"):
        doc_results = await search_documents(db, request)
        results.extend(doc_results)

    if request.search_type in ("all", "conversations"):
        conv_results = await search_conversations(db, request)
        results.extend(conv_results)

    # Sort by relevance score
    results.sort(key=lambda x: x.relevance_score, reverse=True)

    # Apply pagination
    total = len(results)
    results = results[request.offset : request.offset + request.limit]

    return SearchResponse(
        results=results,
        total=total,
        query=request.query,
    )


async def search_documents(
    db: AsyncSession,
    request: SearchRequest,
) -> list[SearchResult]:
    """Search within documents using full-text search."""
    # Build base query
    query = (
        select(
            Chunk.id,
            Chunk.document_id,
            Chunk.content,
            Chunk.page_number,
            Document.filename,
            Document.project_id,
            Project.name.label("project_name"),
            Chunk.created_at,
        )
        .join(Document, Chunk.document_id == Document.id)
        .join(Project, Document.project_id == Project.id)
    )

    # Apply filters
    if request.project_id:
        query = query.where(Document.project_id == request.project_id)

    if request.category:
        query = query.where(Document.category == request.category)

    if request.date_from:
        query = query.where(Document.created_at >= request.date_from)

    if request.date_to:
        query = query.where(Document.created_at <= request.date_to)

    # Full-text search
    search_terms = " & ".join(request.query.split())
    query = query.where(
        text("to_tsvector('english', chunks.content) @@ to_tsquery('english', :query)")
    ).params(query=search_terms)

    # Add ranking
    query = query.add_columns(
        text("ts_rank(to_tsvector('english', chunks.content), to_tsquery('english', :query)) as rank")
    ).params(query=search_terms)

    query = query.order_by(text("rank DESC")).limit(request.limit * 2)

    result = await db.execute(query)
    rows = result.all()

    results = []
    for row in rows:
        # Create snippet
        snippet = create_snippet(row.content, request.query)

        results.append(
            SearchResult(
                id=row.id,
                type="chunk",
                title=row.filename,
                snippet=snippet,
                project_id=row.project_id,
                project_name=row.project_name,
                document_id=row.document_id,
                page_number=row.page_number,
                relevance_score=float(row.rank) if row.rank else 0.0,
                created_at=row.created_at,
            )
        )

    return results


async def search_conversations(
    db: AsyncSession,
    request: SearchRequest,
) -> list[SearchResult]:
    """Search within conversations."""
    # Build query
    query = (
        select(
            Message.id,
            Message.content,
            Message.created_at,
            Conversation.id.label("conversation_id"),
            Conversation.title,
            Conversation.project_id,
            Project.name.label("project_name"),
        )
        .join(Conversation, Message.conversation_id == Conversation.id)
        .join(Project, Conversation.project_id == Project.id)
    )

    # Apply filters
    if request.project_id:
        query = query.where(Conversation.project_id == request.project_id)

    if request.date_from:
        query = query.where(Message.created_at >= request.date_from)

    if request.date_to:
        query = query.where(Message.created_at <= request.date_to)

    # Full-text search
    search_terms = " & ".join(request.query.split())
    query = query.where(
        text("to_tsvector('english', messages.content) @@ to_tsquery('english', :query)")
    ).params(query=search_terms)

    # Add ranking
    query = query.add_columns(
        text("ts_rank(to_tsvector('english', messages.content), to_tsquery('english', :query)) as rank")
    ).params(query=search_terms)

    query = query.order_by(text("rank DESC")).limit(request.limit * 2)

    result = await db.execute(query)
    rows = result.all()

    results = []
    for row in rows:
        snippet = create_snippet(row.content, request.query)

        results.append(
            SearchResult(
                id=row.conversation_id,
                type="conversation",
                title=row.title or "Untitled Conversation",
                snippet=snippet,
                project_id=row.project_id,
                project_name=row.project_name,
                document_id=None,
                page_number=None,
                relevance_score=float(row.rank) if row.rank else 0.0,
                created_at=row.created_at,
            )
        )

    return results


def create_snippet(text: str, query: str, max_length: int = 200) -> str:
    """Create a search result snippet highlighting the query match."""
    text_lower = text.lower()
    query_lower = query.lower()
    query_words = query_lower.split()

    # Find the first occurrence of any query word
    best_pos = len(text)
    for word in query_words:
        pos = text_lower.find(word)
        if pos != -1 and pos < best_pos:
            best_pos = pos

    if best_pos == len(text):
        # No match found, return start of text
        return text[:max_length] + "..." if len(text) > max_length else text

    # Center snippet around match
    start = max(0, best_pos - max_length // 2)
    end = min(len(text), start + max_length)

    snippet = text[start:end]

    # Add ellipsis if truncated
    if start > 0:
        snippet = "..." + snippet
    if end < len(text):
        snippet = snippet + "..."

    return snippet
