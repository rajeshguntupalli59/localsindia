"""add listing_reviews table

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-06-10
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'listing_reviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('listing_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('listings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
        sa.CheckConstraint('rating BETWEEN 1 AND 5', name='ck_listing_reviews_rating'),
        sa.UniqueConstraint('listing_id', 'user_id', name='uq_listing_reviews_listing_user'),
    )
    op.create_index('idx_listing_reviews_listing', 'listing_reviews', ['listing_id', 'created_at'])
    op.create_index('idx_listing_reviews_user', 'listing_reviews', ['user_id'])


def downgrade():
    op.drop_index('idx_listing_reviews_user', table_name='listing_reviews')
    op.drop_index('idx_listing_reviews_listing', table_name='listing_reviews')
    op.drop_table('listing_reviews')
