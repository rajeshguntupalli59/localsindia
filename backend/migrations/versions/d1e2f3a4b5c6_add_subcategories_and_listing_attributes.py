"""subcategories + listing answers in one JSONB column

Adds listings.subcategory_slug / listings.attributes and
businesses.subcategory_slug, then copies every existing answer from the 11
per-category *_details tables into listings.attributes. The old tables are
left in place (no longer written to) so this is fully reversible.

Revision ID: d1e2f3a4b5c6
Revises: c8d9e0f1a2b3
Create Date: 2026-10-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, None] = 'c8d9e0f1a2b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DETAIL_TABLES = [
    "vehicle_details", "job_details", "pg_roommate_details", "real_estate_details",
    "electronics_details", "furniture_details", "fashion_details", "education_details",
    "doctor_details", "service_details", "tiffin_details",
]


def upgrade() -> None:
    op.add_column('listings', sa.Column('subcategory_slug', sa.String(60), nullable=True))
    op.add_column('listings', sa.Column('attributes', postgresql.JSONB(), nullable=True))
    op.create_index('ix_listings_subcategory_slug', 'listings', ['subcategory_slug'])
    op.create_index('ix_listings_attributes', 'listings', ['attributes'], postgresql_using='gin')
    op.add_column('businesses', sa.Column('subcategory_slug', sa.String(60), nullable=True))
    op.create_index('ix_businesses_subcategory_slug', 'businesses', ['subcategory_slug'])

    # Numeric columns come out of to_jsonb as JSON numbers; strip the bookkeeping
    # columns and nulls so only real answers remain.
    for table in DETAIL_TABLES:
        op.execute(f"""
            UPDATE listings l
            SET attributes = NULLIF(
                jsonb_strip_nulls(to_jsonb(d) - 'id' - 'listing_id' - 'created_at'), '{{}}'::jsonb)
            FROM {table} d
            WHERE d.listing_id = l.id AND l.attributes IS NULL
        """)


def downgrade() -> None:
    op.drop_index('ix_businesses_subcategory_slug', table_name='businesses')
    op.drop_column('businesses', 'subcategory_slug')
    op.drop_index('ix_listings_attributes', table_name='listings')
    op.drop_index('ix_listings_subcategory_slug', table_name='listings')
    op.drop_column('listings', 'attributes')
    op.drop_column('listings', 'subcategory_slug')
