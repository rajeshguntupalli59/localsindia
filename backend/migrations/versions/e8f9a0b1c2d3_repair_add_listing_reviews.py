"""repair: create listing_reviews table (was inserted mid-chain, never ran on prod)

Revision ID: e8f9a0b1c2d3
Revises: 51db33fc81d5
Create Date: 2026-06-24

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'e8f9a0b1c2d3'
down_revision: Union[str, None] = '51db33fc81d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS listing_reviews (
            id UUID PRIMARY KEY,
            listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            rating INTEGER NOT NULL,
            body TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            CONSTRAINT ck_listing_reviews_rating CHECK (rating BETWEEN 1 AND 5),
            CONSTRAINT uq_listing_reviews_listing_user UNIQUE (listing_id, user_id)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_listing_reviews_listing ON listing_reviews(listing_id, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_listing_reviews_user ON listing_reviews(user_id)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_listing_reviews_user")
    op.execute("DROP INDEX IF EXISTS idx_listing_reviews_listing")
    op.execute("DROP TABLE IF EXISTS listing_reviews")
