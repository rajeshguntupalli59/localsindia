"""add buyer_requests table

Revision ID: h8i9j0k1l2m3
Revises: g7h8i9j0k1l2
Create Date: 2026-06-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'h8i9j0k1l2m3'
down_revision = 'g7h8i9j0k1l2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'buyer_requests',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('city_id', UUID(as_uuid=True), sa.ForeignKey('cities.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('category_id', UUID(as_uuid=True), sa.ForeignKey('categories.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('budget', sa.Numeric(12, 2), nullable=True),
        sa.Column('contact_phone', sa.String(15), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('expires_at', sa.DateTime(timezone=True), server_default=sa.text("NOW() + INTERVAL '30 days'")),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('active','fulfilled','expired')", name='ck_buyer_requests_status'),
    )
    op.create_index('idx_buyer_requests_city', 'buyer_requests', ['city_id', 'status', 'created_at'])
    op.create_index('idx_buyer_requests_user', 'buyer_requests', ['user_id'])


def downgrade() -> None:
    op.drop_table('buyer_requests')
