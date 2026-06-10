"""add social links to listings

Revision ID: a1b2c3d4e5f6
Revises: 7dbd6791e1f6
Create Date: 2026-06-09 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '7dbd6791e1f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('listings', sa.Column('website_url', sa.Text(), nullable=True))
    op.add_column('listings', sa.Column('social_url', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('listings', 'social_url')
    op.drop_column('listings', 'website_url')
