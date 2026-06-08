"""Full-text + trigram search using parameterized queries only (TC-009 safe)."""
import uuid
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def search_listings(
    db: AsyncSession,
    *,
    city_id: uuid.UUID,
    q: str,
    category_id: uuid.UUID | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    offset = (page - 1) * page_size

    # Category filter fragment — appended only when provided
    cat_filter = "AND l.category_id = :category_id" if category_id else ""

    sql = text(f"""
        SELECT
            l.id, l.title, l.description, l.price, l.contact_phone,
            l.whatsapp_url, l.status, l.is_featured, l.expires_at,
            l.created_at, l.city_id, l.category_id, l.user_id,
            ts_rank(l.search_vector, plainto_tsquery('simple', :q)) AS rank
        FROM listings l
        WHERE l.city_id = :city_id
          AND l.status = 'active'
          AND l.deleted_at IS NULL
          AND l.expires_at > NOW()
          {cat_filter}
          AND (
              l.search_vector @@ plainto_tsquery('simple', :q)
              OR l.title ILIKE :q_like
          )
        ORDER BY l.is_featured DESC, rank DESC, l.created_at DESC
        LIMIT :limit OFFSET :offset
    """)

    count_sql = text(f"""
        SELECT COUNT(*) FROM listings l
        WHERE l.city_id = :city_id
          AND l.status = 'active'
          AND l.deleted_at IS NULL
          AND l.expires_at > NOW()
          {cat_filter}
          AND (
              l.search_vector @@ plainto_tsquery('simple', :q)
              OR l.title ILIKE :q_like
          )
    """)

    params: dict = {
        "city_id": city_id,
        "q": q if q.strip() else "a",  # plainto_tsquery rejects empty string
        "q_like": f"%{q}%",
        "limit": page_size,
        "offset": offset,
    }
    if category_id:
        params["category_id"] = category_id

    rows = (await db.execute(sql, params)).mappings().all()
    total = (await db.execute(count_sql, params)).scalar() or 0

    return {
        "items": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
