import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.project import Project
from app.models.document import Document
from app.models.conversation import Conversation
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
)
from app.schemas.trash import TrashListResponse, TrashItem
from app.services.export import export_project, import_project

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=ProjectListResponse)
async def list_projects(db: AsyncSession = Depends(get_db)):
    """List all projects with document counts."""
    # Query projects with document count
    query = (
        select(
            Project,
            func.count(Document.id).filter(Document.deleted_at.is_(None)).label("doc_count"),
        )
        .outerjoin(Document, Project.id == Document.project_id)
        .group_by(Project.id)
        .order_by(Project.updated_at.desc())
    )

    result = await db.execute(query)
    rows = result.all()

    projects = []
    for row in rows:
        project = row[0]
        doc_count = row[1]
        projects.append(
            ProjectResponse(
                id=project.id,
                name=project.name,
                description=project.description,
                role_mode=project.role_mode,
                document_count=doc_count,
                created_at=project.created_at,
                updated_at=project.updated_at,
            )
        )

    return ProjectListResponse(projects=projects, total=len(projects))


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new project."""
    project = Project(
        name=data.name,
        description=data.description,
        role_mode=data.role_mode,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        role_mode=project.role_mode,
        document_count=0,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a project by ID."""
    query = (
        select(
            Project,
            func.count(Document.id).filter(Document.deleted_at.is_(None)).label("doc_count"),
        )
        .outerjoin(Document, Project.id == Document.project_id)
        .where(Project.id == project_id)
        .group_by(Project.id)
    )

    result = await db.execute(query)
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Project not found")

    project = row[0]
    doc_count = row[1]

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        role_mode=project.role_mode,
        document_count=doc_count,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: uuid.UUID,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a project."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description
    if data.role_mode is not None:
        project.role_mode = data.role_mode

    await db.commit()
    await db.refresh(project)

    # Get document count
    count_result = await db.execute(
        select(func.count(Document.id)).where(
            Document.project_id == project_id,
            Document.deleted_at.is_(None),
        )
    )
    doc_count = count_result.scalar() or 0

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        role_mode=project.role_mode,
        document_count=doc_count,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a project and all associated data."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(project)
    await db.commit()


@router.get("/{project_id}/export")
async def export_project_archive(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Export a project as a portable ZIP archive."""
    from fastapi.responses import Response

    try:
        archive_data = await export_project(db, project_id)
        return Response(
            content=archive_data,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=project-{project_id}.zip"
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/import", response_model=ProjectResponse)
async def import_project_archive(
    file: UploadFile = File(...),
    new_name: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Import a project from a ZIP archive."""
    try:
        file_bytes = await file.read()
        project_id = await import_project(db, file_bytes, new_name)
        return await get_project(project_id, db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{project_id}/trash", response_model=TrashListResponse)
async def list_project_trash(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """List deleted conversations and documents for a project."""
    project_result = await db.execute(select(Project).where(Project.id == project_id))
    if not project_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    conversations_result = await db.execute(
        select(Conversation).where(
            Conversation.project_id == project_id,
            Conversation.deleted_at.is_not(None),
        )
    )
    documents_result = await db.execute(
        select(Document).where(
            Document.project_id == project_id,
            Document.deleted_at.is_not(None),
        )
    )

    items: list[TrashItem] = []
    for conversation in conversations_result.scalars().all():
        if not conversation.deleted_at:
            continue
        items.append(
            TrashItem(
                id=conversation.id,
                type="conversation",
                title=conversation.title or "Untitled conversation",
                project_id=conversation.project_id,
                deleted_at=conversation.deleted_at,
                created_at=conversation.created_at,
            )
        )

    for document in documents_result.scalars().all():
        if not document.deleted_at:
            continue
        items.append(
            TrashItem(
                id=document.id,
                type="document",
                title=document.filename,
                project_id=document.project_id,
                deleted_at=document.deleted_at,
                created_at=document.created_at,
            )
        )

    items.sort(key=lambda item: item.deleted_at, reverse=True)
    return TrashListResponse(items=items, total=len(items))
