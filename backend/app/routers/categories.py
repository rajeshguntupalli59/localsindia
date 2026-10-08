from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.category import Category
from app.schemas.category import CategoryOut

router = APIRouter(prefix="/api/v1/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Category)
        .where(Category.parent_id.is_(None))
        .order_by(Category.sort_order, Category.name)
    )
    return result.scalars().all()


@router.get("/catalog")
async def category_catalog(db: AsyncSession = Depends(get_db)):
    """Every top-level category with its subcategories and posting questions
    (app/core/category_catalog.py) — what web and mobile build their post
    forms, subcategory chips and filters from."""
    from app.core.category_catalog import public_catalog

    result = await db.execute(
        select(Category)
        .where(Category.parent_id.is_(None))
        .order_by(Category.sort_order, Category.name)
    )
    names = {c.slug: (c.name, c.icon) for c in result.scalars().all()}
    return public_catalog(names)
