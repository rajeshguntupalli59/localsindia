"""add businesses.email (owner email for claim outreach)

Revision ID: e3f4a5b6c7d8
Revises: c7d8e9f0a1b2
Create Date: 2026-11-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e3f4a5b6c7d8'
down_revision: Union[str, None] = 'c7d8e9f0a1b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('businesses', sa.Column('email', sa.String(length=254), nullable=True))


def downgrade() -> None:
    op.drop_column('businesses', 'email')
