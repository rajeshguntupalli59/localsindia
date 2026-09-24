"""soft-delete two leftover test businesses

'Amo ame kavali' ("Good bussineed for listing") and 'Test Business Badge
Flow' were created while testing the site and sat at the top of the Hyderabad
directory. Matched on exact name + phone. Soft delete, reversible.

Revision ID: e1f2a3b4c5d6
Revises: d7e8f9a0b1c2
Create Date: 2026-09-24

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, None] = 'd7e8f9a0b1c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_MATCH = """(name = 'Amo ame kavali' AND phone = '+919505212640')
         OR (name = 'Test Business Badge Flow' AND phone = '+919123456780')"""
_MARK = "2026-09-24 00:00:01+00"


def upgrade() -> None:
    op.execute(f"UPDATE businesses SET deleted_at = '{_MARK}' WHERE ({_MATCH}) AND deleted_at IS NULL")


def downgrade() -> None:
    op.execute(f"UPDATE businesses SET deleted_at = NULL WHERE ({_MATCH}) AND deleted_at = '{_MARK}'")
