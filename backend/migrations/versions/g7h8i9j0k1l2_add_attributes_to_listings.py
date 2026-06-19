"""add attributes jsonb to listings

Revision ID: g7h8i9j0k1l2
Revises: f6a7b8c9d0e1
Create Date: 2026-06-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = 'g7h8i9j0k1l2'
down_revision = 'f6a7b8c9d0e1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('listings', sa.Column('attributes', JSONB, nullable=True, server_default='{}'))


def downgrade() -> None:
    op.drop_column('listings', 'attributes')
