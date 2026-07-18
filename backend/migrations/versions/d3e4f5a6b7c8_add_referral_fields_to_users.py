"""add_referral_fields_to_users

Revision ID: d3e4f5a6b7c8
Revises: f906010e814a
Create Date: 2026-07-18 10:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, None] = 'f906010e814a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('referral_code', sa.String(12), nullable=True))
    op.add_column('users', sa.Column(
        'referred_by_user_id',
        postgresql.UUID(as_uuid=True),
        sa.ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True,
    ))
    op.add_column('users', sa.Column(
        'referral_rewards_count', sa.Integer(), nullable=False, server_default='0',
    ))
    op.create_unique_constraint('uq_users_referral_code', 'users', ['referral_code'])
    op.create_index('idx_users_referral_code', 'users', ['referral_code'])


def downgrade() -> None:
    op.drop_index('idx_users_referral_code', table_name='users')
    op.drop_constraint('uq_users_referral_code', 'users', type_='unique')
    op.drop_column('users', 'referral_rewards_count')
    op.drop_column('users', 'referred_by_user_id')
    op.drop_column('users', 'referral_code')
