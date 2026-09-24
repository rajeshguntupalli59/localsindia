"""add businesses.source, source_ref, latitude, longitude

For admin-imported directory businesses (OpenStreetMap first). source_ref is
unique so an import can be re-run without creating duplicates.

Revision ID: c5e6f7a8b9d0
Revises: b3d4e5f6a7c8
Create Date: 2026-09-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c5e6f7a8b9d0'
down_revision: Union[str, None] = 'b3d4e5f6a7c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('businesses', sa.Column('source', sa.String(20), nullable=True))
    op.add_column('businesses', sa.Column('source_ref', sa.String(40), nullable=True))
    op.add_column('businesses', sa.Column('latitude', sa.Numeric(9, 6), nullable=True))
    op.add_column('businesses', sa.Column('longitude', sa.Numeric(9, 6), nullable=True))
    op.create_unique_constraint('uq_businesses_source_ref', 'businesses', ['source_ref'])


def downgrade() -> None:
    op.drop_constraint('uq_businesses_source_ref', 'businesses', type_='unique')
    op.drop_column('businesses', 'longitude')
    op.drop_column('businesses', 'latitude')
    op.drop_column('businesses', 'source_ref')
    op.drop_column('businesses', 'source')
