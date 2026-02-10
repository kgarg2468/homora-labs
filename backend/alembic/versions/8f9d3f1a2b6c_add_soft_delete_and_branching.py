"""add soft delete and conversation branching

Revision ID: 8f9d3f1a2b6c
Revises: 250ea8a213cc
Create Date: 2026-02-07 16:05:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "8f9d3f1a2b6c"
down_revision: Union[str, None] = "250ea8a213cc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "conversations",
        sa.Column("parent_conversation_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "conversations",
        sa.Column("branch_from_message_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "conversations",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_conversations_parent_conversation_id",
        "conversations",
        "conversations",
        ["parent_conversation_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_conversations_branch_from_message_id",
        "conversations",
        "messages",
        ["branch_from_message_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_conversations_project_deleted_updated",
        "conversations",
        ["project_id", "deleted_at", "updated_at"],
        unique=False,
    )
    op.create_index(
        "ix_conversations_parent_updated",
        "conversations",
        ["parent_conversation_id", "updated_at"],
        unique=False,
    )

    op.add_column(
        "documents",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_documents_project_deleted_created",
        "documents",
        ["project_id", "deleted_at", "created_at"],
        unique=False,
    )

    op.add_column(
        "messages",
        sa.Column("edited_from_message_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_messages_edited_from_message_id",
        "messages",
        "messages",
        ["edited_from_message_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_messages_edited_from_message_id", "messages", type_="foreignkey")
    op.drop_column("messages", "edited_from_message_id")

    op.drop_index("ix_documents_project_deleted_created", table_name="documents")
    op.drop_column("documents", "deleted_at")

    op.drop_index("ix_conversations_parent_updated", table_name="conversations")
    op.drop_index("ix_conversations_project_deleted_updated", table_name="conversations")
    op.drop_constraint(
        "fk_conversations_branch_from_message_id", "conversations", type_="foreignkey"
    )
    op.drop_constraint(
        "fk_conversations_parent_conversation_id", "conversations", type_="foreignkey"
    )
    op.drop_column("conversations", "deleted_at")
    op.drop_column("conversations", "branch_from_message_id")
    op.drop_column("conversations", "parent_conversation_id")
