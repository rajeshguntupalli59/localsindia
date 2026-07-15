"""add featured_until to listings

Revision ID: c5d6e7f8a9b0
Revises: b3c4d5e6f7a8
Create Date: 2026-07-15 12:45:00.000000

Fixes a real production bug: promoting a listing overwrote its general
`expires_at` with the featured-plan duration (e.g. 7 days for "week"), and
nothing anywhere ever un-set `is_featured` when that period passed — so paid
featured boosts never expired. `featured_until` is a dedicated column for the
featured-boost window, decoupled from the listing's own lifecycle expiry.
"""
from alembic import op
import sqlalchemy as sa

revision = 'c5d6e7f8a9b0'
down_revision = 'b3c4d5e6f7a8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('listings', sa.Column('featured_until', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('listings', 'featured_until')
