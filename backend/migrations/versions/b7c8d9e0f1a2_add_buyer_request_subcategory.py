"""add buyer_requests.subcategory_slug

Revision ID: b7c8d9e0f1a2
Revises: e3f4a5b6c7d8
Create Date: 2026-11-23
"""
from alembic import op
import sqlalchemy as sa

revision = "b7c8d9e0f1a2"
down_revision = "e3f4a5b6c7d8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("buyer_requests", sa.Column("subcategory_slug", sa.String(length=60), nullable=True))


def downgrade() -> None:
    op.drop_column("buyer_requests", "subcategory_slug")
