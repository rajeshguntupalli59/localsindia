"""add business_images and event_images tables

Revision ID: bc6a44aafa08
Revises: d3c3f83522ec
Create Date: 2026-07-21 18:26:02.194288

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'bc6a44aafa08'
down_revision: Union[str, None] = 'd3c3f83522ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('business_images',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('business_id', sa.UUID(), nullable=False),
    sa.Column('url', sa.Text(), nullable=False),
    sa.Column('cloudinary_id', sa.Text(), nullable=False),
    sa.Column('display_order', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_business_images_business', 'business_images', ['business_id', 'display_order'], unique=False)
    op.create_table('event_images',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('event_id', sa.UUID(), nullable=False),
    sa.Column('url', sa.Text(), nullable=False),
    sa.Column('cloudinary_id', sa.Text(), nullable=False),
    sa.Column('display_order', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_event_images_event', 'event_images', ['event_id', 'display_order'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_event_images_event', table_name='event_images')
    op.drop_table('event_images')
    op.drop_index('idx_business_images_business', table_name='business_images')
    op.drop_table('business_images')
