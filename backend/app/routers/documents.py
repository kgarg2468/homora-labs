import uuid
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.document import Document, DocumentTag, FileType, IngestionStatus
from app.models.project import Project
from app.schemas.document import (
    DocumentResponse,
    DocumentListResponse,
    DocumentTagCreate,
    DocumentTagResponse,
)
from app.services.ingestion import IngestionPipeline
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/projects/{project_id}/documents", tags=["documents"])

MIME_TYPE_MAP = {
    FileType.pdf: "application/pdf",
    FileType.docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    FileType.xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    FileType.txt: "text/plain",
}

IMAGE_MIME_MAP = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".tiff": "image/tiff",
    ".bmp": "image/bmp",
}


def get_media_type(document: Document) -> str:
    """Determine correct MIME type for a document."""
    if document.file_type == FileType.image:
        ext = os.path.splitext(document.filename)[1].lower()
        return IMAGE_MIME_MAP.get(ext, "application/octet-stream")
    return MIME_TYPE_MAP.get(document.file_type, "application/octet-stream")


def get_file_type(filename: str) -> FileType:
    """Determine file type from extension."""
    ext = filename.lower().split(".")[-1]
    if ext == "pdf":
        return FileType.pdf
    elif ext in ("doc", "docx"):
        return FileType.docx
    elif ext in ("xls", "xlsx"):
        return FileType.xlsx
    elif ext in ("png", "jpg", "jpeg", "gif", "tiff", "bmp"):
        return FileType.image
    elif ext == "txt":
        return FileType.txt
    else:
        raise ValueError(f"Unsupported file type: {ext}")


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    project_id: uuid.UUID,
    category: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List all documents in a project."""
    query = select(Document).where(Document.project_id == project_id)

    if category:
        query = query.where(Document.category == category)
    if status:
        query = query.where(Document.ingestion_status == status)

    query = query.order_by(Document.created_at.desc())

    result = await db.execute(query)
    documents = result.scalars().all()

    # Get tags for each document
    doc_responses = []
    for doc in documents:
        tags_result = await db.execute(
            select(DocumentTag).where(DocumentTag.document_id == doc.id)
        )
        tags = tags_result.scalars().all()

        doc_responses.append(
            DocumentResponse(
                id=doc.id,
                project_id=doc.project_id,
                filename=doc.filename,
                file_type=doc.file_type,
                file_path=doc.file_path,
                page_count=doc.page_count,
                ingestion_status=doc.ingestion_status,
                ingestion_progress=doc.ingestion_progress,
                category=doc.category,
                error_message=doc.error_message,
                tags=[DocumentTagResponse(id=t.id, tag=t.tag) for t in tags],
                created_at=doc.created_at,
            )
        )

    return DocumentListResponse(documents=doc_responses, total=len(doc_responses))


@router.post("", response_model=DocumentResponse, status_code=201)
async def upload_document(
    project_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a document and start ingestion."""
    # Verify project exists
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate file type
    try:
        file_type = get_file_type(file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Create project documents directory
    project_docs_dir = Path(settings.documents_path) / str(project_id)
    project_docs_dir.mkdir(parents=True, exist_ok=True)

    # Handle filename collisions
    filename = file.filename
    file_path = project_docs_dir / filename
    if file_path.exists():
        # Append short UUID to filename
        stem = Path(filename).stem
        suffix = Path(filename).suffix
        unique_id = str(uuid.uuid4())[:8]
        filename = f"{stem}_{unique_id}{suffix}"
        file_path = project_docs_dir / filename

    # Save file
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Create document record
    document = Document(
        project_id=project_id,
        filename=filename,
        file_type=file_type,
        file_path=str(file_path),
        ingestion_status=IngestionStatus.pending,
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)

    # Start background ingestion
    background_tasks.add_task(run_ingestion, document.id)

    return DocumentResponse(
        id=document.id,
        project_id=document.project_id,
        filename=document.filename,
        file_type=document.file_type,
        file_path=document.file_path,
        page_count=document.page_count,
        ingestion_status=document.ingestion_status,
        ingestion_progress=document.ingestion_progress,
        category=document.category,
        error_message=document.error_message,
        tags=[],
        created_at=document.created_at,
    )


async def run_ingestion(document_id: uuid.UUID):
    """Background task to run document ingestion."""
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        pipeline = IngestionPipeline(db)
        await pipeline.ingest_document(document_id)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a document by ID."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id, Document.project_id == project_id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Get tags
    tags_result = await db.execute(
        select(DocumentTag).where(DocumentTag.document_id == document.id)
    )
    tags = tags_result.scalars().all()

    return DocumentResponse(
        id=document.id,
        project_id=document.project_id,
        filename=document.filename,
        file_type=document.file_type,
        file_path=document.file_path,
        page_count=document.page_count,
        ingestion_status=document.ingestion_status,
        ingestion_progress=document.ingestion_progress,
        category=document.category,
        error_message=document.error_message,
        tags=[DocumentTagResponse(id=t.id, tag=t.tag) for t in tags],
        created_at=document.created_at,
    )


@router.get("/{document_id}/file")
async def download_document(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Download the original document file."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id, Document.project_id == project_id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        document.file_path,
        filename=document.filename,
        media_type=get_media_type(document),
        content_disposition_type="inline",
    )


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a document."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id, Document.project_id == project_id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete file from disk
    if os.path.exists(document.file_path):
        os.remove(document.file_path)

    await db.delete(document)
    await db.commit()


@router.post("/{document_id}/tags", response_model=DocumentTagResponse)
async def add_tag(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    data: DocumentTagCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add a tag to a document."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id, Document.project_id == project_id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    tag = DocumentTag(document_id=document_id, tag=data.tag)
    db.add(tag)
    await db.commit()
    await db.refresh(tag)

    return DocumentTagResponse(id=tag.id, tag=tag.tag)


@router.delete("/{document_id}/tags/{tag_id}", status_code=204)
async def remove_tag(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    tag_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Remove a tag from a document."""
    result = await db.execute(
        select(DocumentTag).where(
            DocumentTag.id == tag_id, DocumentTag.document_id == document_id
        )
    )
    tag = result.scalar_one_or_none()

    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    await db.delete(tag)
    await db.commit()


@router.post("/{document_id}/reprocess", response_model=DocumentResponse)
async def reprocess_document(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Reprocess a document (re-run ingestion)."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id, Document.project_id == project_id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Reset status
    document.ingestion_status = IngestionStatus.pending
    document.ingestion_progress = 0
    document.error_message = None
    await db.commit()
    await db.refresh(document)

    # Delete existing chunks (will be recreated)
    from app.models.chunk import Chunk

    await db.execute(
        Chunk.__table__.delete().where(Chunk.document_id == document_id)
    )
    await db.commit()

    # Start background ingestion
    background_tasks.add_task(run_ingestion, document.id)

    return await get_document(project_id, document_id, db)
