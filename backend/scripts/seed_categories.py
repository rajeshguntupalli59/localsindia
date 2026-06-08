"""Seed standard categories — idempotent (ON CONFLICT DO NOTHING)."""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/localindia"

CATEGORIES = [
    (0, "Classifieds",    "classifieds",  "🏷️"),
    (1, "PG / Roommate",  "pg-roommate",  "🏠"),
    (2, "Jobs",           "jobs",         "💼"),
    (3, "Vehicles",       "vehicles",     "🚗"),
    (4, "Electronics",    "electronics",  "📱"),
    (5, "Services",       "services",     "🛠️"),
    (6, "Events",         "events",       "🎉"),
    (7, "Businesses",     "businesses",   "🏪"),
    (8, "Tiffin / Food",  "tiffin",       "🍱"),
    (9, "Real Estate",    "real-estate",  "🏗️"),
    (10, "Furniture",     "furniture",    "🛋️"),
    (11, "Fashion",       "fashion",      "👗"),
]


async def main() -> None:
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        for sort_order, name, slug, icon in CATEGORIES:
            await conn.execute(text("""
                INSERT INTO categories (id, name, slug, icon, sort_order, created_at)
                VALUES (gen_random_uuid(), :name, :slug, :icon, :sort_order, NOW())
                ON CONFLICT (slug) DO NOTHING
            """), {"name": name, "slug": slug, "icon": icon, "sort_order": sort_order})
    await engine.dispose()
    print(f"Seeded {len(CATEGORIES)} categories.")


if __name__ == "__main__":
    asyncio.run(main())
