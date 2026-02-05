"""Initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable required extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # Create enum types
    op.execute("CREATE TYPE rolemode AS ENUM ('plain', 'analytical')")
    op.execute("CREATE TYPE filetype AS ENUM ('pdf', 'docx', 'xlsx', 'image')")
    op.execute("CREATE TYPE ingestionstatus AS ENUM ('pending', 'processing', 'completed', 'failed')")
    op.execute("CREATE TYPE documentcategory AS ENUM ('lease', 'appraisal', 'title', 'zoning', 'financial', 'survey', 'environmental', 'other')")
    op.execute("CREATE TYPE messagerole AS ENUM ('user', 'assistant')")

    # Create projects table
    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("role_mode", postgresql.ENUM("plain", "analytical", name="rolemode", create_type=False), nullable=False, server_default="plain"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create documents table
    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("file_type", postgresql.ENUM("pdf", "docx", "xlsx", "image", name="filetype", create_type=False), nullable=False),
        sa.Column("file_path", sa.String(1000), nullable=False),
        sa.Column("page_count", sa.Integer, nullable=True),
        sa.Column("ingestion_status", postgresql.ENUM("pending", "processing", "completed", "failed", name="ingestionstatus", create_type=False), nullable=False, server_default="pending"),
        sa.Column("ingestion_progress", sa.Integer, server_default=sa.text("0")),
        sa.Column("category", postgresql.ENUM("lease", "appraisal", "title", "zoning", "financial", "survey", "environmental", "other", name="documentcategory", create_type=False), nullable=False, server_default="other"),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_documents_project_id", "documents", ["project_id"])

    # Create document_tags table
    op.create_table(
        "document_tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tag", sa.String(100), nullable=False),
    )
    op.create_index("idx_document_tags_document_id", "document_tags", ["document_id"])

    # Create chunks table with vector column
    op.create_table(
        "chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("page_number", sa.Integer, nullable=True),
        sa.Column("section", sa.String(500), nullable=True),
        sa.Column("embedding", Vector(1536), nullable=True),
        sa.Column("metadata", postgresql.JSONB, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_chunks_document_id", "chunks", ["document_id"])

    # Create vector index for similarity search
    op.execute("""
        CREATE INDEX idx_chunks_embedding ON chunks
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    """)

    # Create GIN index for full-text search
    op.execute("""
        CREATE INDEX idx_chunks_content_fts ON chunks
        USING GIN (to_tsvector('english', content))
    """)

    # Create conversations table
    op.create_table(
        "conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("archived", sa.Boolean, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index("idx_conversations_project_id", "conversations", ["project_id"])

    # Create messages table
    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", postgresql.ENUM("user", "assistant", name="messagerole", create_type=False), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("citations", postgresql.JSONB, nullable=True),
        sa.Column("suggested_followups", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_messages_conversation_id", "messages", ["conversation_id"])

    # Create GIN index for message content search
    op.execute("""
        CREATE INDEX idx_messages_content_fts ON messages
        USING GIN (to_tsvector('english', content))
    """)

    # Create report_templates table
    op.create_table(
        "report_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("sections", postgresql.JSONB, server_default=sa.text("'[]'")),
        sa.Column("is_default", sa.Boolean, server_default=sa.text("false")),
    )

    # Create settings table
    op.create_table(
        "settings",
        sa.Column("key", sa.String(255), primary_key=True),
        sa.Column("value", postgresql.JSONB, nullable=True),
        sa.Column("encrypted_value", sa.LargeBinary, nullable=True),
    )


def downgrade() -> None:
    op.drop_table("settings")
    op.drop_table("report_templates")
    op.drop_table("messages")
    op.drop_table("conversations")
    op.drop_table("chunks")
    op.drop_table("document_tags")
    op.drop_table("documents")
    op.drop_table("projects")

    op.execute("DROP TYPE IF EXISTS messagerole")
    op.execute("DROP TYPE IF EXISTS documentcategory")
    op.execute("DROP TYPE IF EXISTS ingestionstatus")
    op.execute("DROP TYPE IF EXISTS filetype")
    op.execute("DROP TYPE IF EXISTS rolemode")
