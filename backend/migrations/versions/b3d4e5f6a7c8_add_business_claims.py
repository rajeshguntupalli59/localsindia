"""add business_claims

Revision ID: b3d4e5f6a7c8
Revises: a9c1d2e3f4b5
Create Date: 2026-09-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'b3d4e5f6a7c8'
down_revision: Union[str, None] = 'a9c1d2e3f4b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'business_claims',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('business_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('method', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('otp_hash', sa.Text(), nullable=True),
        sa.Column('otp_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('otp_attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('contact_phone', sa.String(15), nullable=True),
        sa.Column('doc_type', sa.String(40), nullable=True),
        sa.Column('document_id', sa.Text(), nullable=True),
        sa.Column('shop_photo_id', sa.Text(), nullable=True),
        sa.Column('visiting_card_id', sa.Text(), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('reject_reason', sa.Text(), nullable=True),
        sa.Column('reviewed_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('idx_business_claims_business', 'business_claims', ['business_id'])
    op.create_index('idx_business_claims_status', 'business_claims', ['status'])


def downgrade() -> None:
    op.drop_index('idx_business_claims_status', table_name='business_claims')
    op.drop_index('idx_business_claims_business', table_name='business_claims')
    op.drop_table('business_claims')
