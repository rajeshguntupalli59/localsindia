"""add badge fields to businesses for verified badge monetization

Revision ID: a1b2c3d4e5f6
Revises: f6a7b8c9d0e1
Create Date: 2026-06-28 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'f6a7b8c9d0e1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('businesses', sa.Column('badge_plan', sa.String(20), nullable=True))
    op.add_column('businesses', sa.Column('badge_expires_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('businesses', 'badge_expires_at')
    op.drop_column('businesses', 'badge_plan')
