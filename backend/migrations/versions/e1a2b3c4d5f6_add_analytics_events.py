"""add_analytics_events

Revision ID: e1a2b3c4d5f6
Revises: d3e4f5a6b7c8
Create Date: 2026-07-18 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'e1a2b3c4d5f6'
down_revision: Union[str, None] = 'd3e4f5a6b7c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'analytics_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('business_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_type', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        'idx_analytics_events_business_type_created',
        'analytics_events',
        ['business_id', 'event_type', 'created_at'],
    )


def downgrade() -> None:
    op.drop_index('idx_analytics_events_business_type_created', table_name='analytics_events')
    op.drop_table('analytics_events')
