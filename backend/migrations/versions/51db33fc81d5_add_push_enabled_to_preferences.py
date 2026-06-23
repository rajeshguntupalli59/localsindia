"""add_push_enabled_to_preferences

Revision ID: 51db33fc81d5
Revises: bc67f85778f9
Create Date: 2026-06-23 15:52:53.031428

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '51db33fc81d5'
down_revision: Union[str, None] = 'bc67f85778f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('user_preferences',
        sa.Column('push_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true'))
    )


def downgrade() -> None:
    op.drop_column('user_preferences', 'push_enabled')
