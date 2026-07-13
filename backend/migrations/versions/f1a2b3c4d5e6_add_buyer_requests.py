"""add buyer_requests table

Revision ID: f1a2b3c4d5e6
Revises: c4d5e6f7a8b9
Create Date: 2026-07-12 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'f1a2b3c4d5e6'
down_revision = 'c4d5e6f7a8b9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'buyer_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('city_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('cities.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('categories.id', ondelete='SET NULL'), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('budget', sa.Float(), nullable=True),
        sa.Column('contact_phone', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='open'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("status IN ('open','fulfilled')", name='ck_buyer_requests_status'),
    )
    op.create_index(
        'idx_buyer_requests_active', 'buyer_requests', ['city_id', 'created_at'],
        postgresql_where=sa.text("status = 'open' AND deleted_at IS NULL"),
    )
    op.create_index('idx_buyer_requests_user', 'buyer_requests', ['user_id'])


def downgrade() -> None:
    op.drop_index('idx_buyer_requests_user', table_name='buyer_requests')
    op.drop_index('idx_buyer_requests_active', table_name='buyer_requests')
    op.drop_table('buyer_requests')
