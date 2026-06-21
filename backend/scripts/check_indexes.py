"""
Index performance check — run this inside the Azure SSH session after migration.

Usage:
  cd /home/site/wwwroot
  python scripts/check_indexes.py

Shows EXPLAIN ANALYZE for every critical query and prints:
  - Which index PostgreSQL chose
  - Estimated vs actual rows
  - Execution time in ms
  - A PASS / SLOW rating
"""
import os
import re
import sys
sys.stdout.reconfigure(encoding="utf-8")
import psycopg2
from psycopg2.extras import RealDictCursor

SLOW_MS = 50  # queries above this threshold are flagged as SLOW

# Build a sync psycopg2 URL from the async DATABASE_URL env var
RAW = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/localindia")
SYNC_URL = RAW.replace("postgresql+asyncpg://", "postgresql://")


def connect():
    try:
        conn = psycopg2.connect(SYNC_URL)
        conn.autocommit = True
        return conn
    except Exception as e:
        print(f"\n[ERROR] Cannot connect to DB: {e}")
        print(f"  URL used: {SYNC_URL[:40]}...")
        sys.exit(1)


def run_explain(cur, label: str, sql: str, params: dict):
    explain_sql = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) {sql}"
    cur.execute(explain_sql, params)
    lines = [row[0] for row in cur.fetchall()]
    plan_text = "\n".join(lines)

    # Extract execution time
    ms = 0.0
    for line in lines:
        m = re.search(r"Execution Time:\s*([\d.]+)\s*ms", line)
        if m:
            ms = float(m.group(1))

    # Detect index usage
    index_used = None
    for line in lines:
        m = re.search(r"Index (?:Scan|Only Scan) using (\S+)", line)
        if m:
            index_used = m.group(1)
            break
        if "Bitmap Index Scan on" in line:
            m2 = re.search(r"Bitmap Index Scan on (\S+)", line)
            if m2:
                index_used = m2.group(1)
                break

    seq_scan = any("Seq Scan" in l for l in lines)
    rating = "SLOW ⚠️ " if (ms > SLOW_MS or (seq_scan and "listings" in sql)) else "OK  ✅"

    print(f"\n{'─'*70}")
    print(f"  {rating}  {label}")
    print(f"{'─'*70}")
    if index_used:
        print(f"  Index used   : {index_used}")
    elif seq_scan:
        print(f"  Index used   : NONE — sequential scan")
    else:
        print(f"  Index used   : (see plan below)")
    print(f"  Exec time    : {ms:.2f} ms")

    # Extract rows from first node
    for line in lines:
        m = re.search(r"rows=(\d+) .* rows=(\d+) ", line)
        if m:
            print(f"  Est / actual : {m.group(1)} / {m.group(2)} rows")
            break

    # Print the condensed plan (first 12 lines)
    print()
    for line in lines[:12]:
        print(f"    {line}")
    if len(lines) > 12:
        print(f"    ... ({len(lines) - 12} more lines)")

    return ms, index_used, seq_scan


def main():
    conn = connect()
    cur = conn.cursor()

    # Fetch a real city_id and category_id to use in queries
    cur.execute("SELECT id FROM cities WHERE active = true LIMIT 1")
    row = cur.fetchone()
    if not row:
        print("[ERROR] No active cities found — seed the DB first.")
        sys.exit(1)
    city_id = row[0]

    cur.execute("SELECT id FROM categories LIMIT 1")
    row = cur.fetchone()
    category_id = row[0] if row else None

    cur.execute("SELECT id FROM listings WHERE status='active' AND deleted_at IS NULL LIMIT 1")
    row = cur.fetchone()
    listing_id = row[0] if row else None

    cur.execute("SELECT phone FROM otp_requests WHERE verified=false LIMIT 1")
    row = cur.fetchone()
    otp_phone = row[0] if row else "+910000000000"

    print("\n" + "═"*70)
    print("  LocalsIndia — Index Performance Check")
    print("═"*70)
    print(f"  city_id     : {city_id}")
    print(f"  category_id : {category_id}")
    print(f"  listing_id  : {listing_id}")

    results = []

    # ── Q1: City home page (most frequent query) ─────────────────────────
    ms, idx, seq = run_explain(cur, "City home page — active listings, newest first",
        """
        SELECT id, title, price, is_featured, created_at
        FROM listings
        WHERE city_id = %(city_id)s
          AND status = 'active'
          AND deleted_at IS NULL
        ORDER BY is_featured DESC, created_at DESC
        LIMIT 20
        """,
        {"city_id": city_id}
    )
    results.append(("City home page", ms, idx, seq))

    # ── Q2: City home + category filter ──────────────────────────────────
    if category_id:
        ms, idx, seq = run_explain(cur, "Category filter — city + category, active listings",
            """
            SELECT id, title, price, is_featured, created_at
            FROM listings
            WHERE city_id = %(city_id)s
              AND category_id = %(cat_id)s
              AND status = 'active'
              AND deleted_at IS NULL
            ORDER BY is_featured DESC, created_at DESC
            LIMIT 20
            """,
            {"city_id": city_id, "cat_id": category_id}
        )
        results.append(("Category filter", ms, idx, seq))

    # ── Q3: Full-text search ──────────────────────────────────────────────
    ms, idx, seq = run_explain(cur, "Full-text search via search_vector GIN",
        """
        SELECT id, title,
               ts_rank(search_vector, plainto_tsquery('simple', %(q)s)) AS rank
        FROM listings
        WHERE city_id = %(city_id)s
          AND status = 'active'
          AND deleted_at IS NULL
          AND expires_at > NOW()
          AND (
              search_vector @@ plainto_tsquery('simple', %(q)s)
              OR title ILIKE %(q_like)s
          )
        ORDER BY is_featured DESC, rank DESC, created_at DESC
        LIMIT 20
        """,
        {"city_id": city_id, "q": "house", "q_like": "%house%"}
    )
    results.append(("Full-text search", ms, idx, seq))

    # ── Q4: User's own listings (/listings/mine) ──────────────────────────
    cur.execute("SELECT id FROM users WHERE deleted_at IS NULL LIMIT 1")
    row = cur.fetchone()
    user_id = row[0] if row else city_id  # fallback

    ms, idx, seq = run_explain(cur, "My listings — by user_id",
        """
        SELECT id, title, status, created_at
        FROM listings
        WHERE user_id = %(user_id)s
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        """,
        {"user_id": user_id}
    )
    results.append(("My listings", ms, idx, seq))

    # ── Q5: BL-02 cap check ───────────────────────────────────────────────
    ms, idx, seq = run_explain(cur, "BL-02 active listing cap check (user + city)",
        """
        SELECT COUNT(*)
        FROM listings
        WHERE user_id = %(user_id)s
          AND city_id = %(city_id)s
          AND status IN ('active', 'pending')
          AND deleted_at IS NULL
        """,
        {"user_id": user_id, "city_id": city_id}
    )
    results.append(("BL-02 cap check", ms, idx, seq))

    # ── Q6: Today's listing count ─────────────────────────────────────────
    ms, idx, seq = run_explain(cur, "Today's listing count for city launch page",
        """
        SELECT COUNT(*)
        FROM listings
        WHERE city_id = %(city_id)s
          AND status = 'active'
          AND deleted_at IS NULL
          AND created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
        """,
        {"city_id": city_id}
    )
    results.append(("Today count", ms, idx, seq))

    # ── Q7: Trending listings ─────────────────────────────────────────────
    ms, idx, seq = run_explain(cur, "Trending listings (48h window, view_count sort)",
        """
        SELECT id, title, view_count, is_featured
        FROM listings
        WHERE city_id = %(city_id)s
          AND status = 'active'
          AND deleted_at IS NULL
          AND created_at >= NOW() - INTERVAL '48 hours'
        ORDER BY is_featured DESC, view_count DESC, created_at DESC
        LIMIT 10
        """,
        {"city_id": city_id}
    )
    results.append(("Trending", ms, idx, seq))

    # ── Q8: OTP lookup ────────────────────────────────────────────────────
    ms, idx, seq = run_explain(cur, "OTP lookup — pending OTP for phone",
        """
        SELECT id, otp_hash, attempts, expires_at
        FROM otp_requests
        WHERE phone = %(phone)s
          AND verified = false
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
        """,
        {"phone": otp_phone}
    )
    results.append(("OTP lookup", ms, idx, seq))

    # ── Q9: Admin pending listings ────────────────────────────────────────
    ms, idx, seq = run_explain(cur, "Admin — pending listings queue",
        """
        SELECT id, title, city_id, status, created_at
        FROM listings
        WHERE status = 'pending'
          AND deleted_at IS NULL
        ORDER BY created_at ASC
        LIMIT 20
        """,
        {}
    )
    results.append(("Admin pending queue", ms, idx, seq))

    # ── Q10: Events for city ──────────────────────────────────────────────
    ms, idx, seq = run_explain(cur, "Events — active events for city",
        """
        SELECT id, title, event_date, is_free
        FROM events
        WHERE city_id = %(city_id)s
          AND status = 'active'
          AND deleted_at IS NULL
        ORDER BY event_date ASC
        LIMIT 20
        """,
        {"city_id": city_id}
    )
    results.append(("Events listing", ms, idx, seq))

    # ── Summary ───────────────────────────────────────────────────────────
    print("\n" + "═"*70)
    print("  SUMMARY")
    print("═"*70)
    print(f"  {'Query':<28}  {'ms':>8}  {'Index':<35}  Rating")
    print(f"  {'─'*28}  {'─'*8}  {'─'*35}  {'─'*6}")
    for name, ms, idx, seq in results:
        idx_display = idx or ("SEQ SCAN ⚠️" if seq else "—")
        rating = "SLOW ⚠️" if ms > SLOW_MS else "OK ✅"
        print(f"  {name:<28}  {ms:>8.2f}  {idx_display:<35}  {rating}")

    slow = [r for r in results if r[1] > SLOW_MS or (r[3] and "listings" in r[0].lower())]
    print()
    if slow:
        print(f"  ⚠️  {len(slow)} query(ies) need attention (see details above)")
    else:
        print("  ✅  All queries under 50ms — indexes are working correctly")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
