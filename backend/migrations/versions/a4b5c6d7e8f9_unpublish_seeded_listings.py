"""unpublish AI-seeded listings with made-up phone numbers

agents/city_launcher.py (the retired City Seeder) posted ~3,000 AI-written
listings as the admin account, every one with a made-up contact number
+916300000001..+916300000099 — real Indian mobile numbers that may belong to
strangers. Soft delete only (deleted_at set, rows kept) per the no-hard-delete
rule. Only admin-posted rows with exactly that number pattern are touched, so
real users' listings can't match.

Revision ID: a4b5c6d7e8f9
Revises: f2a3b4c5d6e7
Create Date: 2026-09-25

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'a4b5c6d7e8f9'
down_revision: Union[str, None] = 'f2a3b4c5d6e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_MARK = "2026-09-25 00:00:00+00"   # fixed timestamp so downgrade can find exactly these rows
_MATCH = (
    r"contact_phone ~ '^\+9163000000[0-9]{2}$' "
    "AND user_id IN (SELECT id FROM users WHERE role = 'admin')"
)


def upgrade() -> None:
    op.execute(f"UPDATE listings SET deleted_at = '{_MARK}' WHERE {_MATCH} AND deleted_at IS NULL")


def downgrade() -> None:
    op.execute(f"UPDATE listings SET deleted_at = NULL WHERE {_MATCH} AND deleted_at = '{_MARK}'")
