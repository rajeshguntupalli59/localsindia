"""add app_error_logs

Revision ID: b3c4d5e6f7a8
Revises: a7b8c9d0e1f2
Create Date: 2026-07-14 20:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'b3c4d5e6f7a8'
down_revision = 'a7b8c9d0e1f2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'app_error_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('platform', sa.String(20), nullable=False),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('stack', sa.Text, nullable=True),
        sa.Column('context', sa.String(200), nullable=True),
        sa.Column('app_version', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("platform IN ('mobile','web')", name='ck_app_error_logs_platform'),
    )
    op.create_index('idx_app_error_logs_created', 'app_error_logs', ['created_at'])


def downgrade() -> None:
    op.drop_index('idx_app_error_logs_created', table_name='app_error_logs')
    op.drop_table('app_error_logs')
