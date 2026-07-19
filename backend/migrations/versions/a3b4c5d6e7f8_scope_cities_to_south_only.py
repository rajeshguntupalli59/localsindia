"""scope_cities_to_south_only

Revision ID: a3b4c5d6e7f8
Revises: f2b3c4d5e6a7
Create Date: 2026-07-18 20:00:00.000000

Raj's explicit decision (2026-07-18): scope the live product down to South
India only for now, rather than all 496 seeded cities across 34 states/UTs.
Reversible data-only change -- flips the existing `cities.active` flag,
which every city-touching endpoint already gates on (listings, search,
businesses, events, buyer-requests, chat, city picker, sitemap). No rows
deleted, no schema change. Downgrade restores every city to active,
matching pre-migration state.
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text, bindparam, String


revision: str = 'a3b4c5d6e7f8'
down_revision: Union[str, None] = 'f2b3c4d5e6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SOUTH_STATES = ('Telangana', 'Andhra Pradesh', 'Karnataka', 'Tamil Nadu', 'Kerala', 'Puducherry')


def upgrade() -> None:
    conn = op.get_bind()
    deactivate = text("UPDATE cities SET active = false WHERE state NOT IN :states").bindparams(
        bindparam("states", expanding=True, type_=String)
    )
    activate = text("UPDATE cities SET active = true WHERE state IN :states").bindparams(
        bindparam("states", expanding=True, type_=String)
    )
    conn.execute(deactivate, {"states": list(SOUTH_STATES)})
    conn.execute(activate, {"states": list(SOUTH_STATES)})


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(text("UPDATE cities SET active = true"))
