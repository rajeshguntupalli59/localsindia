"""Optimise indexes: drop low-value indexes, add partial + GIN indexes

Revision ID: a2b3c4d5e6f7
Revises: f6a7b8c9d0e1
Create Date: 2026-06-21

Changes:
- DROP idx_listings_status  (status alone has terrible cardinality — never selected by PG)
- DROP idx_listings_city    (superseded by new partial index below)
- DROP idx_listings_category (superseded by new partial index below)
- ADD  idx_listings_search   GIN on search_vector  (full-text search was doing seq scans)
- ADD  idx_listings_active   partial (city_id, category_id, is_featured DESC, created_at DESC)
                              WHERE status='active' AND deleted_at IS NULL
                              (covers city home + category filter; smaller than what it replaces)
- ADD  idx_otp_active        partial (phone, expires_at) WHERE verified=false
                              (OTP lookup only touches unexpired+unverified rows)
- ADD  idx_events_active     partial (city_id, event_date) WHERE status='active' AND deleted_at IS NULL
                              (existing idx_events_city_date has no status filter)
"""
from alembic import op

revision = 'a2b3c4d5e6f7'
down_revision = 'f6a7b8c9d0e1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Drop low-value indexes ──────────────────────────────────────────────
    op.drop_index("idx_listings_status", table_name="listings")
    op.drop_index("idx_listings_city", table_name="listings")
    op.drop_index("idx_listings_category", table_name="listings")
    op.drop_index("idx_events_city_date", table_name="events")

    # ── Full-text search: GIN on computed tsvector column ──────────────────
    # Without this every /search call does a full sequential scan.
    op.execute(
        "CREATE INDEX idx_listings_search ON listings USING gin(search_vector)"
    )

    # ── Core browsing index (partial — active + non-deleted rows only) ──────
    # Covers both city home page and category-filtered listing queries.
    # Column order matches the most frequent ORDER BY: is_featured DESC, created_at DESC.
    # Being partial means it only contains ~60-70% of rows → smaller than the
    # three B-tree indexes it replaces.
    op.execute("""
        CREATE INDEX idx_listings_active
        ON listings(city_id, category_id, is_featured DESC, created_at DESC)
        WHERE status = 'active' AND deleted_at IS NULL
    """)

    # ── OTP lookup (partial — only rows still pending verification) ─────────
    # OTP requests accumulate quickly; this index only covers the tiny slice
    # of rows that haven't been verified yet, keeping it tiny forever.
    op.execute("""
        CREATE INDEX idx_otp_active
        ON otp_requests(phone, expires_at)
        WHERE verified = false
    """)

    # ── Events browsing (partial — replaces idx_events_city_date) ──────────
    op.execute("""
        CREATE INDEX idx_events_active
        ON events(city_id, event_date ASC)
        WHERE status = 'active' AND deleted_at IS NULL
    """)


def downgrade() -> None:
    op.drop_index("idx_listings_search", table_name="listings")
    op.drop_index("idx_listings_active", table_name="listings")
    op.drop_index("idx_otp_active", table_name="otp_requests")
    op.drop_index("idx_events_active", table_name="events")

    # Restore original indexes
    op.create_index("idx_listings_status", "listings", ["status"])
    op.create_index("idx_listings_city", "listings", ["city_id", "status", "created_at"])
    op.create_index("idx_listings_category", "listings", ["category_id"])
    op.create_index("idx_events_city_date", "events", ["city_id", "event_date"])
