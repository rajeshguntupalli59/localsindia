"""add engagement counters to listings

Revision ID: f6a7b8c9d0e1
Revises: 9c7323b7409c
Create Date: 2026-06-17 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'f6a7b8c9d0e1'
down_revision = '9c7323b7409c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('listings', sa.Column('view_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('listings', sa.Column('contact_click_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('listings', sa.Column('last_renewed_at', sa.DateTime(timezone=True), nullable=True))

    # Saved searches table for P1 engagement hook
    op.create_table(
        'saved_searches',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('city_slug', sa.String(100), nullable=False),
        sa.Column('query_text', sa.String(200), nullable=True),
        sa.Column('category_slug', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('idx_saved_searches_user', 'saved_searches', ['user_id'])


def downgrade() -> None:
    op.drop_index('idx_saved_searches_user', table_name='saved_searches')
    op.drop_table('saved_searches')
    op.drop_column('listings', 'last_renewed_at')
    op.drop_column('listings', 'contact_click_count')
    op.drop_column('listings', 'view_count')
