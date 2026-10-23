from fastapi import Response
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

MAX_PAGE_SIZE = 200
TOTAL_COUNT_HEADER = "X-Total-Count"


async def paginate(db: AsyncSession, query: Select, response: Response, page: int, page_size: int) -> Select:
    """Put the full row count in the X-Total-Count header and return `query` cut to one page.

    A header (not a wrapper object) keeps the list response shape unchanged for existing clients.
    """
    total = await db.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
    response.headers[TOTAL_COUNT_HEADER] = str(total or 0)
    page_size = max(1, min(page_size, MAX_PAGE_SIZE))
    return query.offset((max(page, 1) - 1) * page_size).limit(page_size)
