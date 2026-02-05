import asyncio
import uuid
from pathlib import Path
from typing import Callable

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.document import Document, IngestionStatus, FileType
from app.models.chunk import Chunk
from app.services.ingestion.extractors import extract_text_from_file, PageContent, get_page_count
from app.services.ingestion.chunker import chunk_text
from app.services.ingestion.categorizer import categorize_document
from app.services.ingestion.vision import extract_text_from_image
from app.services.embeddings import generate_embeddings
from app.config import get_settings

settings = get_settings()


class IngestionPipeline:
    """Orchestrates the document ingestion process."""

    def __init__(
        self,
        db: AsyncSession,
        progress_callback: Callable[[uuid.UUID, int], None] | None = None,
    ):
        self.db = db
        self.progress_callback = progress_callback

    async def ingest_document(self, document_id: uuid.UUID) -> bool:
        """
        Process a document through the full ingestion pipeline.
        Returns True on success, False on failure.
        """
        # Get document from DB
        result = await self.db.execute(
            select(Document).where(Document.id == document_id)
        )
        document = result.scalar_one_or_none()

        if not document:
            raise ValueError(f"Document {document_id} not found")

        try:
            # Update status to processing
            document.ingestion_status = IngestionStatus.processing
            document.ingestion_progress = 0
            await self.db.commit()

            # Get page count
            page_count = get_page_count(document.file_path, document.file_type)
            if page_count:
                document.page_count = page_count
                await self.db.commit()

            # Extract text page by page
            all_chunks = []
            pages_processed = 0
            total_pages = page_count or 1

            async for page_content in extract_text_from_file(
                document.file_path, document.file_type
            ):
                # Handle pages with images that need OCR
                text = page_content.text
                if page_content.has_images and len(text.strip()) < 50:
                    for img in page_content.images:
                        if isinstance(img, dict):
                            extracted = await extract_text_from_image(
                                img["data"],
                                img["ext"],
                                provider="openai",
                            )
                            text += "\n" + extracted
                        elif isinstance(img, Path):
                            image_data = img.read_bytes()
                            image_ext = img.suffix.lstrip(".")
                            extracted = await extract_text_from_image(
                                image_data,
                                image_ext,
                                provider="openai",
                            )
                            text += "\n" + extracted

                # Chunk the page text
                page_chunks = chunk_text(text, page_number=page_content.page_number)
                all_chunks.extend(page_chunks)

                # Update progress
                pages_processed += 1
                progress = int((pages_processed / total_pages) * 80)  # 80% for extraction
                document.ingestion_progress = progress
                await self.db.commit()

                if self.progress_callback:
                    self.progress_callback(document_id, progress)

            # Auto-categorize document if not already set
            if document.category.value == "other":
                full_text = " ".join(c.content for c in all_chunks[:10])  # Use first 10 chunks
                document.category = categorize_document(full_text, document.filename)
                await self.db.commit()

            # Generate embeddings for all chunks
            chunk_texts = [c.content for c in all_chunks]
            embeddings = await generate_embeddings(chunk_texts)

            document.ingestion_progress = 90
            await self.db.commit()

            # Store chunks with embeddings
            for i, (chunk_data, embedding) in enumerate(zip(all_chunks, embeddings)):
                chunk = Chunk(
                    document_id=document_id,
                    content=chunk_data.content,
                    page_number=chunk_data.page_number,
                    section=chunk_data.section,
                    embedding=embedding,
                    metadata_={
                        "token_count": chunk_data.token_count,
                        "chunk_index": i,
                    },
                )
                self.db.add(chunk)

            # Mark as completed
            document.ingestion_status = IngestionStatus.completed
            document.ingestion_progress = 100
            await self.db.commit()

            if self.progress_callback:
                self.progress_callback(document_id, 100)

            return True

        except Exception as e:
            # Mark as failed
            document.ingestion_status = IngestionStatus.failed
            document.error_message = str(e)
            await self.db.commit()
            return False

    async def ingest_multiple(
        self,
        document_ids: list[uuid.UUID],
        continue_on_error: bool = True,
    ) -> dict[uuid.UUID, bool]:
        """
        Process multiple documents, optionally continuing on errors.
        Returns dict of document_id -> success status.
        """
        results = {}

        for doc_id in document_ids:
            try:
                success = await self.ingest_document(doc_id)
                results[doc_id] = success
            except Exception as e:
                results[doc_id] = False
                if not continue_on_error:
                    raise

        return results
