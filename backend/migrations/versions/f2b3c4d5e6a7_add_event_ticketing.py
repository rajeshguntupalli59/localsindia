"""add_event_ticketing

Revision ID: f2b3c4d5e6a7
Revises: e1a2b3c4d5f6
Create Date: 2026-07-18 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'f2b3c4d5e6a7'
down_revision: Union[str, None] = 'e1a2b3c4d5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('events', sa.Column('ticket_price', sa.Numeric(10, 2), nullable=True))

    op.create_table(
        'tickets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('event_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('events.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('razorpay_order_id', sa.String(64), nullable=False),
        sa.Column('razorpay_payment_id', sa.String(64), nullable=False),
        sa.Column('qr_token', sa.String(64), nullable=False, unique=True),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('idx_tickets_qr_token', 'tickets', ['qr_token'])
    op.create_index('idx_tickets_user', 'tickets', ['user_id'])
    op.create_index('idx_tickets_event', 'tickets', ['event_id'])


def downgrade() -> None:
    op.drop_index('idx_tickets_event', table_name='tickets')
    op.drop_index('idx_tickets_user', table_name='tickets')
    op.drop_index('idx_tickets_qr_token', table_name='tickets')
    op.drop_table('tickets')
    op.drop_column('events', 'ticket_price')
