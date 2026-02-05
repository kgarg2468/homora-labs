import uuid
import json
import zipfile
import shutil
from io import BytesIO
from pathlib import Path
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.project import Project
from app.models.document import Document, DocumentTag
from app.models.conversation import Conversation
from app.models.message import Message
from app.config import get_settings

settings = get_settings()


async def export_project(
    db: AsyncSession,
    project_id: uuid.UUID,
) -> bytes:
    """
    Export a project as a portable ZIP archive.
    Includes project metadata, documents, and conversations.
    """
    # Get project
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise ValueError(f"Project {project_id} not found")

    # Get all related data
    result = await db.execute(
        select(Document).where(Document.project_id == project_id)
    )
    documents = result.scalars().all()

    result = await db.execute(
        select(Conversation).where(Conversation.project_id == project_id)
    )
    conversations = result.scalars().all()

    # Get messages for all conversations
    conv_messages = {}
    for conv in conversations:
        result = await db.execute(
            select(Message).where(Message.conversation_id == conv.id)
        )
        conv_messages[str(conv.id)] = result.scalars().all()

    # Get document tags
    doc_tags = {}
    for doc in documents:
        result = await db.execute(
            select(DocumentTag).where(DocumentTag.document_id == doc.id)
        )
        doc_tags[str(doc.id)] = result.scalars().all()

    # Create ZIP archive
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Add manifest
        manifest = {
            "version": "1.0",
            "exported_at": datetime.now().isoformat(),
            "project_id": str(project.id),
            "project_name": project.name,
        }
        zf.writestr("manifest.json", json.dumps(manifest, indent=2))

        # Add project metadata
        project_data = {
            "id": str(project.id),
            "name": project.name,
            "description": project.description,
            "role_mode": project.role_mode.value,
            "created_at": project.created_at.isoformat(),
            "updated_at": project.updated_at.isoformat(),
        }
        zf.writestr("project.json", json.dumps(project_data, indent=2))

        # Add documents metadata
        docs_data = []
        used_filenames = set()

        for doc in documents:
            # Handle filename collisions in ZIP
            filename = doc.filename
            if filename in used_filenames:
                stem = Path(filename).stem
                suffix = Path(filename).suffix
                filename = f"{stem}_{str(doc.id)[:8]}{suffix}"
            used_filenames.add(filename)

            doc_data = {
                "id": str(doc.id),
                "filename": filename,  # Use potentially renamed filename
                "file_type": doc.file_type.value,
                "category": doc.category.value,
                "page_count": doc.page_count,
                "tags": [t.tag for t in doc_tags.get(str(doc.id), [])],
                "created_at": doc.created_at.isoformat(),
            }
            docs_data.append(doc_data)

            # Add actual document file if exists
            file_path = Path(doc.file_path)
            if file_path.exists():
                zf.write(file_path, f"documents/{filename}")

        zf.writestr("documents.json", json.dumps(docs_data, indent=2))

        # Add conversations
        convs_data = []
        for conv in conversations:
            messages_data = [
                {
                    "id": str(m.id),
                    "role": m.role.value,
                    "content": m.content,
                    "citations": m.citations,
                    "suggested_followups": m.suggested_followups,
                    "created_at": m.created_at.isoformat(),
                }
                for m in conv_messages.get(str(conv.id), [])
            ]
            conv_data = {
                "id": str(conv.id),
                "title": conv.title,
                "archived": conv.archived,
                "created_at": conv.created_at.isoformat(),
                "updated_at": conv.updated_at.isoformat(),
                "messages": messages_data,
            }
            convs_data.append(conv_data)

        zf.writestr("conversations.json", json.dumps(convs_data, indent=2))

    buffer.seek(0)
    return buffer.read()


async def import_project(
    db: AsyncSession,
    archive_data: bytes,
    new_name: str | None = None,
) -> uuid.UUID:
    """
    Import a project from a portable ZIP archive.
    Returns the new project ID.
    """
    buffer = BytesIO(archive_data)

    with zipfile.ZipFile(buffer, "r") as zf:
        # Read manifest
        manifest = json.loads(zf.read("manifest.json"))

        # Read project data
        project_data = json.loads(zf.read("project.json"))

        # Create new project
        project = Project(
            name=new_name or f"{project_data['name']} (Imported)",
            description=project_data.get("description"),
            role_mode=project_data.get("role_mode", "plain"),
        )
        db.add(project)
        await db.flush()

        # Map old IDs to new IDs
        doc_id_map = {}

        # Read and create documents
        docs_data = json.loads(zf.read("documents.json"))
        for doc_data in docs_data:
            old_id = doc_data["id"]

            # Save document file
            doc_filename = doc_data["filename"]
            archive_path = f"documents/{doc_filename}"

            if archive_path in zf.namelist():
                # Create project documents directory
                project_docs_dir = Path(settings.documents_path) / str(project.id)
                project_docs_dir.mkdir(parents=True, exist_ok=True)

                file_path = project_docs_dir / doc_filename
                with zf.open(archive_path) as src, open(file_path, "wb") as dst:
                    dst.write(src.read())
            else:
                file_path = ""

            doc = Document(
                project_id=project.id,
                filename=doc_filename,
                file_type=doc_data["file_type"],
                file_path=str(file_path),
                page_count=doc_data.get("page_count"),
                category=doc_data.get("category", "other"),
                ingestion_status="pending",  # Will need re-ingestion
            )
            db.add(doc)
            await db.flush()
            doc_id_map[old_id] = doc.id

            # Create tags
            for tag in doc_data.get("tags", []):
                doc_tag = DocumentTag(document_id=doc.id, tag=tag)
                db.add(doc_tag)

        # Read and create conversations
        convs_data = json.loads(zf.read("conversations.json"))
        for conv_data in convs_data:
            conv = Conversation(
                project_id=project.id,
                title=conv_data.get("title"),
                archived=conv_data.get("archived", False),
            )
            db.add(conv)
            await db.flush()

            # Create messages
            for msg_data in conv_data.get("messages", []):
                # Update citations with new document IDs
                citations = msg_data.get("citations")
                if citations:
                    for citation in citations:
                        old_doc_id = citation.get("document_id")
                        if old_doc_id and old_doc_id in doc_id_map:
                            citation["document_id"] = str(doc_id_map[old_doc_id])

                msg = Message(
                    conversation_id=conv.id,
                    role=msg_data["role"],
                    content=msg_data["content"],
                    citations=citations,
                    suggested_followups=msg_data.get("suggested_followups"),
                )
                db.add(msg)

        await db.commit()

        return project.id
