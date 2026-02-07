"""Add txt to FileType enum

Revision ID: 250ea8a213cc
Revises: 002_upgrade_embedding
Create Date: 2026-02-07 11:33:35.068160

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = '250ea8a213cc'
down_revision: Union[str, None] = '002_upgrade_embedding'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 'txt' to the FileType enum
    op.execute("ALTER TYPE filetype ADD VALUE IF NOT EXISTS 'txt'")


def downgrade() -> None:
    # Note: PostgreSQL doesn't support removing values from enums
    # A full migration with table recreation would be needed for downgrade
    pass
