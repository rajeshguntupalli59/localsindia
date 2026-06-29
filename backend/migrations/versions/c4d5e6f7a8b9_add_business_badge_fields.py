"""add badge fields to businesses for verified badge monetization

Revision ID: c4d5e6f7a8b9
Revises: e8f9a0b1c2d3
Create Date: 2026-06-28 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'c4d5e6f7a8b9'
down_revision = 'e8f9a0b1c2d3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('businesses', sa.Column('badge_plan', sa.String(20), nullable=True))
    op.add_column('businesses', sa.Column('badge_expires_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('businesses', 'badge_expires_at')
    op.drop_column('businesses', 'badge_plan')
