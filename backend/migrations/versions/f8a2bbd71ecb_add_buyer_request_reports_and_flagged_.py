"""add buyer_request_reports table and flagged status to buyer_requests

Revision ID: f8a2bbd71ecb
Revises: bc6a44aafa08
Create Date: 2026-07-26 13:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f8a2bbd71ecb'
down_revision: Union[str, None] = 'bc6a44aafa08'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('buyer_requests', sa.Column('report_count', sa.Integer(), nullable=False, server_default='0'))

    op.drop_constraint('ck_buyer_requests_status', 'buyer_requests', type_='check')
    op.create_check_constraint(
        'ck_buyer_requests_status', 'buyer_requests', "status IN ('open','fulfilled','flagged')"
    )

    op.create_table('buyer_request_reports',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('buyer_request_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('reason', sa.String(length=50), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("reason IN ('spam','inappropriate','duplicate','wrong_category','other')", name='ck_buyer_request_reports_reason'),
    sa.ForeignKeyConstraint(['buyer_request_id'], ['buyer_requests.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('buyer_request_id', 'user_id', name='uq_buyer_request_reports_request_user'),
    )
    op.create_index('idx_buyer_request_reports_request', 'buyer_request_reports', ['buyer_request_id'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_buyer_request_reports_request', table_name='buyer_request_reports')
    op.drop_table('buyer_request_reports')

    op.drop_constraint('ck_buyer_requests_status', 'buyer_requests', type_='check')
    op.create_check_constraint(
        'ck_buyer_requests_status', 'buyer_requests', "status IN ('open','fulfilled')"
    )

    op.drop_column('buyer_requests', 'report_count')
