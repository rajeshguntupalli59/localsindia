"""merge duplicate city 'tirupur' into 'tiruppur'

The full seed script created the same Tamil Nadu city twice under two
spellings. Repoint everything at 'tiruppur' and deactivate 'tirupur'
(soft — the row stays, so this is reversible). No-op if either row is missing.

Revision ID: a9c1d2e3f4b5
Revises: 22c078cd5037
Create Date: 2026-09-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a9c1d2e3f4b5'
down_revision: Union[str, None] = '22c078cd5037'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FK_TABLES = ('listings', 'businesses', 'events', 'buyer_requests', 'city_banners', 'users')


def upgrade() -> None:
    conn = op.get_bind()
    ids = dict(conn.execute(sa.text(
        "SELECT slug, id FROM cities WHERE slug IN ('tirupur', 'tiruppur')"
    )).fetchall())
    if 'tirupur' not in ids or 'tiruppur' not in ids:
        return
    params = {'keep': ids['tiruppur'], 'dup': ids['tirupur']}
    for table in _FK_TABLES:
        conn.execute(sa.text(f"UPDATE {table} SET city_id = :keep WHERE city_id = :dup"), params)
    conn.execute(sa.text("UPDATE saved_searches SET city_slug = 'tiruppur' WHERE city_slug = 'tirupur'"))
    conn.execute(sa.text("UPDATE cities SET active = false WHERE id = :dup"), params)


def downgrade() -> None:
    # Re-activates the duplicate row only; moved rows stay on 'tiruppur'.
    op.execute("UPDATE cities SET active = true WHERE slug = 'tirupur'")
