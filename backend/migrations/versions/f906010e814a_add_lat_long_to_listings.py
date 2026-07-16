"""add_lat_long_to_listings

Revision ID: f906010e814a
Revises: 7921c37a8128
Create Date: 2026-07-16 13:01:30.784930

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f906010e814a'
down_revision: Union[str, None] = '7921c37a8128'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('listings', sa.Column('latitude', sa.Numeric(9, 6), nullable=True))
    op.add_column('listings', sa.Column('longitude', sa.Numeric(9, 6), nullable=True))


def downgrade() -> None:
    op.drop_column('listings', 'longitude')
    op.drop_column('listings', 'latitude')
