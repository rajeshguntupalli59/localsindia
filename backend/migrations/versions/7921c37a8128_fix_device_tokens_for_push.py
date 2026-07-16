"""fix_device_tokens_for_push

Revision ID: 7921c37a8128
Revises: c5d6e7f8a9b0
Create Date: 2026-07-15 20:57:03.239555

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '7921c37a8128'
down_revision: Union[str, None] = 'c5d6e7f8a9b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # device_tokens was created (2026-06-11) storing only a bcrypt hash of the
    # push token — unusable, since sending an actual push requires the raw
    # Expo push token, not a one-way hash of it. The table was never wired up
    # to any model/endpoint, so no data exists to migrate.
    op.alter_column('device_tokens', 'token_hash', new_column_name='token')
    op.drop_column('device_tokens', 'expires_at')
    op.create_unique_constraint('uq_device_tokens_token', 'device_tokens', ['token'])


def downgrade() -> None:
    op.drop_constraint('uq_device_tokens_token', 'device_tokens', type_='unique')
    op.add_column('device_tokens', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))
    op.alter_column('device_tokens', 'token', new_column_name='token_hash')
