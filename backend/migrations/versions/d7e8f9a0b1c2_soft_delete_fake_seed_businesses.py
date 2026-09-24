"""soft-delete seeded businesses with fictional phone numbers

agents/city_launcher.py used to post 10 AI-generated businesses per city with
the fictional numbers +916400000001..+916400000010 (~1,510 rows), owned by the
admin account. They outranked real (OpenStreetMap-imported) businesses. Soft
delete only — rows stay, deleted_at is set — per the no-hard-delete rule.
Only rows with exactly those numbers and no import source are touched.

Revision ID: d7e8f9a0b1c2
Revises: c5e6f7a8b9d0
Create Date: 2026-09-24

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'd7e8f9a0b1c2'
down_revision: Union[str, None] = 'c5e6f7a8b9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FAKE = ", ".join(f"'+9164{str(i).zfill(8)}'" for i in range(1, 11))
_MARK = "2026-09-24 00:00:00+00"   # fixed timestamp so downgrade can find exactly these rows


def upgrade() -> None:
    op.execute(
        f"UPDATE businesses SET deleted_at = '{_MARK}' "
        f"WHERE phone IN ({_FAKE}) AND source IS NULL AND deleted_at IS NULL"
    )


def downgrade() -> None:
    op.execute(
        f"UPDATE businesses SET deleted_at = NULL "
        f"WHERE phone IN ({_FAKE}) AND source IS NULL AND deleted_at = '{_MARK}'"
    )
