import uuid
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func
from pgvector.sqlalchemy import Vector

from app.models.chunk import Chunk
from app.models.document import Document
from app.services.embeddings import generate_single_embedding
from app.config import get_settings

settings = get_settings()


@dataclass
class RetrievedChunk:
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_name: str
    content: str
    page_number: int | None
    section: str | None
    score: float
    retrieval_relevance: float | None = None
    retrieval_rank: int | None = None
    answer_support: float | None = None
    cited_in_answer: bool = False


async def hybrid_search(
    db: AsyncSession,
    query: str,
    project_id: uuid.UUID,
    top_k: int | None = None,
    document_ids: list[uuid.UUID] | None = None,
) -> list[RetrievedChunk]:
    """
    Perform hybrid search combining vector similarity and keyword search.
    """
    top_k = top_k or settings.retrieval_top_k

    # Generate embedding for query
    query_embedding = await generate_single_embedding(query)

    # Vector similarity search using pgvector
    vector_results = await vector_search(
        db, query_embedding, project_id, top_k * 2, document_ids
    )

    # Keyword search using pg_trgm
    keyword_results = await keyword_search(
        db, query, project_id, top_k * 2, document_ids
    )

    # Merge and rerank results
    merged = merge_results(vector_results, keyword_results, top_k)

    return merged


async def vector_search(
    db: AsyncSession,
    query_embedding: list[float],
    project_id: uuid.UUID,
    top_k: int,
    document_ids: list[uuid.UUID] | None = None,
) -> list[RetrievedChunk]:
    """Perform vector similarity search."""
    # Build query
    query = (
        select(
            Chunk.id,
            Chunk.document_id,
            Document.filename,
            Chunk.content,
            Chunk.page_number,
            Chunk.section,
            Chunk.embedding.cosine_distance(query_embedding).label("distance"),
        )
        .join(Document, Chunk.document_id == Document.id)
        .where(Document.project_id == project_id)
    )

    if document_ids:
        query = query.where(Document.id.in_(document_ids))

    query = query.order_by("distance").limit(top_k)

    result = await db.execute(query)
    rows = result.all()

    return [
        RetrievedChunk(
            chunk_id=row.id,
            document_id=row.document_id,
            document_name=row.filename,
            content=row.content,
            page_number=row.page_number,
            section=row.section,
            # Cosine distance ranges 0-2, convert to similarity 0-1
            # distance=0 → similarity=1, distance=2 → similarity=0
            score=max(0, 1 - row.distance / 2),
            retrieval_relevance=max(0, 1 - row.distance / 2),
        )
        for row in rows
    ]


async def keyword_search(
    db: AsyncSession,
    query: str,
    project_id: uuid.UUID,
    top_k: int,
    document_ids: list[uuid.UUID] | None = None,
) -> list[RetrievedChunk]:
    """Perform keyword search using PostgreSQL full-text search."""
    sql = text("""
        SELECT
            c.id,
            c.document_id,
            d.filename,
            c.content,
            c.page_number,
            c.section,
            ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', :query)) as rank
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE d.project_id = :project_id
        AND to_tsvector('english', c.content) @@ plainto_tsquery('english', :query)
        ORDER BY rank DESC
        LIMIT :limit
    """)

    params = {
        "query": query,
        "project_id": str(project_id),
        "limit": top_k,
    }

    result = await db.execute(sql, params)
    rows = result.all()

    return [
        RetrievedChunk(
            chunk_id=row.id,
            document_id=row.document_id,
            document_name=row.filename,
            content=row.content,
            page_number=row.page_number,
            section=row.section,
            score=float(row.rank),
        )
        for row in rows
    ]


def merge_results(
    vector_results: list[RetrievedChunk],
    keyword_results: list[RetrievedChunk],
    top_k: int,
    vector_weight: float = 0.7,
    keyword_weight: float = 0.3,
) -> list[RetrievedChunk]:
    """
    Merge and rerank results from vector and keyword search.
    Uses reciprocal rank fusion with weights.
    """
    scores = {}
    chunks = {}

    # Score vector results
    for rank, chunk in enumerate(vector_results):
        rrf_score = 1 / (rank + 60)  # k=60 is a common choice
        scores[chunk.chunk_id] = scores.get(chunk.chunk_id, 0) + vector_weight * rrf_score
        if chunk.chunk_id not in chunks:
            chunks[chunk.chunk_id] = chunk
        elif (
            chunk.retrieval_relevance is not None
            and chunks[chunk.chunk_id].retrieval_relevance is None
        ):
            chunks[chunk.chunk_id].retrieval_relevance = chunk.retrieval_relevance

    # Score keyword results
    for rank, chunk in enumerate(keyword_results):
        rrf_score = 1 / (rank + 60)
        scores[chunk.chunk_id] = scores.get(chunk.chunk_id, 0) + keyword_weight * rrf_score
        if chunk.chunk_id not in chunks:
            chunks[chunk.chunk_id] = chunk

    # Sort by combined score
    sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)

    # Update chunk scores and return top_k
    results = []
    for idx, chunk_id in enumerate(sorted_ids[:top_k], start=1):
        chunk = chunks[chunk_id]
        chunk.score = scores[chunk_id]
        chunk.retrieval_rank = idx
        results.append(chunk)

    return results


def format_context_for_llm(chunks: list[RetrievedChunk]) -> str:
    """Format retrieved chunks into context string for LLM."""
    context_parts = []

    for chunk in chunks:
        header = f"[Document: {chunk.document_name}"
        if chunk.page_number:
            header += f", Page {chunk.page_number}"
        if chunk.section:
            header += f", Section: {chunk.section}"
        header += "]"

        context_parts.append(f"{header}\n{chunk.content}")

    return "\n\n---\n\n".join(context_parts)
