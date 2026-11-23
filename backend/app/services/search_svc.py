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
    lat: float | None = None,
    lng: float | None = None,
) -> dict:
    offset = (page - 1) * page_size

    # Category filter fragment — appended only when provided
    cat_filter = "AND l.category_id = :category_id" if category_id else ""

    # OR-match each word instead of requiring every word (plainto_tsquery ANDs
    # them all together, so one harmless extra word like "near"/"me" used to
    # make the whole search return zero results even for an exact-topic match).
    # ts_rank still favours documents matching more of the words, so this
    # returns strictly more results, better-ranked, instead of an all-or-nothing match.
    words = [w for w in q.strip().split() if w] or ["a"]
    word_params = {f"w{i}": w for i, w in enumerate(words)}
    tsquery_expr = " || ".join(f"plainto_tsquery('simple', :w{i})" for i in range(len(words)))

    # Haversine distance in km — no PostGIS/earthdistance extension available
    # on this Postgres instance, so compute it directly. NULL when either side
    # is NULL (unlocated listing, or caller didn't pass lat/lng), which lets
    # ORDER BY ... NULLS LAST keep unlocated listings in the results instead of
    # dropping them.
    if lat is not None and lng is not None:
        distance_expr = """
            (6371 * acos(
                LEAST(1.0, GREATEST(-1.0,
                    cos(radians(:lat)) * cos(radians(l.latitude)) * cos(radians(l.longitude) - radians(:lng))
                    + sin(radians(:lat)) * sin(radians(l.latitude))
                ))
            ))
        """
        order_distance = "distance_km ASC NULLS LAST,"
    else:
        distance_expr = "NULL"
        order_distance = ""

    sql = text(f"""
        SELECT
            l.id, l.title, l.description, l.price, l.contact_phone,
            l.whatsapp_url, l.status, l.is_featured, l.expires_at,
            l.created_at, l.city_id, l.category_id, l.user_id,
            l.latitude, l.longitude,
            ts_rank(l.search_vector, ({tsquery_expr})) AS rank,
            {distance_expr} AS distance_km
        FROM listings l
        WHERE l.city_id = :city_id
          AND l.status = 'active'
          AND l.deleted_at IS NULL
          AND l.expires_at > NOW()
          {cat_filter}
          AND (
              l.search_vector @@ ({tsquery_expr})
              OR l.title ILIKE :q_like
          )
        ORDER BY l.is_featured DESC, {order_distance} rank DESC, l.created_at DESC
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
              l.search_vector @@ ({tsquery_expr})
              OR l.title ILIKE :q_like
          )
    """)

    params: dict = {
        "city_id": city_id,
        "q_like": f"%{q}%",
        "limit": page_size,
        "offset": offset,
        **word_params,
    }
    if category_id:
        params["category_id"] = category_id
    if lat is not None and lng is not None:
        params["lat"] = lat
        params["lng"] = lng

    rows = (await db.execute(sql, params)).mappings().all()
    total = (await db.execute(count_sql, params)).scalar() or 0

    return {
        "items": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


async def search_businesses(
    db: AsyncSession,
    *,
    city_id: uuid.UUID,
    type: str | None = None,
    name: str | None = None,
    area: str | None = None,
    limit: int = 5,
):
    """Businesses in a city for the chatbot: by type (catalog subcategory slug),
    words in the name (all must appear), and/or area (locality). Same order as
    the businesses list. With no filter at all → nothing (never a whole city).
    Returns (businesses, total matching)."""
    from sqlalchemy import func, select
    from app.models.business import Business

    name_words = [w for w in (name or "").split() if w][:5]
    area = (area or "").strip()
    if not (type or name_words or area):
        return [], 0

    conds = [Business.city_id == city_id, Business.deleted_at.is_(None)]
    if type:
        conds.append(Business.subcategory_slug == type)
    for w in name_words:
        conds.append(Business.name.ilike(f"%{w}%"))
    if area:
        conds.append(Business.locality.ilike(f"%{area}%"))

    total = await db.scalar(select(func.count()).select_from(Business).where(*conds)) or 0
    rows = (await db.execute(
        select(Business).where(*conds)
        .order_by(Business.verified.desc(), Business.owner_id.is_(None),
                  Business.avg_rating.desc().nulls_last(), Business.phone.is_(None), Business.name)
        .limit(limit)
    )).scalars().all()
    return list(rows), total
