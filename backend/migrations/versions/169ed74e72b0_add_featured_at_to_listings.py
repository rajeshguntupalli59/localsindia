"""add_featured_at_to_listings

Revision ID: 169ed74e72b0
Revises: a2b3c4d5e6f7
Create Date: 2026-06-23 10:44:25.439261

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '169ed74e72b0'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('listings', sa.Column('featured_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('listings', 'featured_at')
