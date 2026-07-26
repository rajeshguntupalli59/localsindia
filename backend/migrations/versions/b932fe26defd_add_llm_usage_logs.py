"""add llm_usage_logs table

Revision ID: b932fe26defd
Revises: f8a2bbd71ecb
Create Date: 2026-07-26 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b932fe26defd'
down_revision: Union[str, None] = 'f8a2bbd71ecb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('llm_usage_logs',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('provider', sa.String(length=20), nullable=False),
    sa.Column('model', sa.String(length=100), nullable=False),
    sa.Column('context', sa.String(length=50), nullable=True),
    sa.Column('input_tokens', sa.Integer(), nullable=False),
    sa.Column('output_tokens', sa.Integer(), nullable=False),
    sa.Column('estimated_cost_usd', sa.Numeric(10, 6), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("provider IN ('gemini','claude')", name='ck_llm_usage_logs_provider'),
    sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_llm_usage_logs_created', 'llm_usage_logs', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_llm_usage_logs_created', table_name='llm_usage_logs')
    op.drop_table('llm_usage_logs')
