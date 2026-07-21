"""add_city_banners

Revision ID: b4c5d6e7f8a9
Revises: a3b4c5d6e7f8
Create Date: 2026-07-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'b4c5d6e7f8a9'
down_revision: Union[str, None] = 'a3b4c5d6e7f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'city_banners',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('city_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('cities.id', ondelete='CASCADE'), nullable=False),
        sa.Column('advertiser_name', sa.String(150), nullable=False),
        sa.Column('image_url', sa.Text(), nullable=False),
        sa.Column('link_url', sa.Text(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('idx_city_banners_city', 'city_banners', ['city_id'])
    op.create_index('idx_city_banners_dates', 'city_banners', ['start_date', 'end_date'])


def downgrade() -> None:
    op.drop_index('idx_city_banners_dates', table_name='city_banners')
    op.drop_index('idx_city_banners_city', table_name='city_banners')
    op.drop_table('city_banners')
