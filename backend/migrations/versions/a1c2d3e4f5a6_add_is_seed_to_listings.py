"""add_is_seed_to_listings

Revision ID: a1c2d3e4f5a6
Revises: b932fe26defd
Create Date: 2026-08-11 16:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1c2d3e4f5a6'
down_revision: Union[str, None] = 'b932fe26defd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'listings',
        sa.Column('is_seed', sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column('listings', 'is_seed')
