"""Upgrade embedding dimension from 1536 to 3072

Revision ID: 002_upgrade_embedding
Revises: 0fe10ec32c1b
Create Date: 2026-02-06

Note: This migration changes the embedding vector dimension.
All existing embeddings will be dropped and need to be regenerated
by re-ingesting documents.
"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision = '002_upgrade_embedding'
down_revision = '0fe10ec32c1b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop all existing chunks since embeddings are incompatible
    op.execute("DELETE FROM chunks")
    
    # Alter the embedding column to new dimension
    op.execute("ALTER TABLE chunks DROP COLUMN embedding")
    op.add_column('chunks', sa.Column('embedding', Vector(3072), nullable=True))


def downgrade() -> None:
    # Drop all existing chunks since embeddings are incompatible
    op.execute("DELETE FROM chunks")
    
    # Revert to old dimension
    op.execute("ALTER TABLE chunks DROP COLUMN embedding")
    op.add_column('chunks', sa.Column('embedding', Vector(1536), nullable=True))
