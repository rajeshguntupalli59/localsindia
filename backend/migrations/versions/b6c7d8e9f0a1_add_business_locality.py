"""add businesses.locality / locality_slug

Revision ID: b6c7d8e9f0a1
Revises: a4b5c6d7e8f9
Create Date: 2026-09-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b6c7d8e9f0a1'
down_revision: Union[str, None] = 'a4b5c6d7e8f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('businesses', sa.Column('locality', sa.String(80), nullable=True))
    op.add_column('businesses', sa.Column('locality_slug', sa.String(90), nullable=True))
    op.create_index('idx_businesses_locality', 'businesses', ['city_id', 'locality_slug'])


def downgrade() -> None:
    op.drop_index('idx_businesses_locality', table_name='businesses')
    op.drop_column('businesses', 'locality_slug')
    op.drop_column('businesses', 'locality')
