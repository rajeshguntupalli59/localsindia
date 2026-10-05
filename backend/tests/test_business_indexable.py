import uuid

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models.business import Business
from app.models.business_image import BusinessImage
from tests.conftest import _make_engine


@pytest.mark.asyncio
async def test_thin_osm_pages_are_noindex_and_out_of_sitemap(client, city):
    tag = uuid.uuid4().hex[:6]
    osm = dict(city_id=city.id, source="osm", address="Road 1, Hyderabad")
    rows = {
        "thin": Business(name=f"Thin {tag}", source_ref=f"node/t{tag}", phone="+919848022338", **osm),
        "placeholder": Business(name=f"Placeholder {tag}", source_ref=f"node/p{tag}", **osm),
        "two_signals": Business(name=f"Strong {tag}", source_ref=f"node/s{tag}", phone="+919848022338",
                                opening_hours="Mo-Sa 09:00-21:00", **osm),
        "described": Business(name=f"Described {tag}", source_ref=f"node/d{tag}", description="Family-run", **osm),
        "photo": Business(name=f"Photo {tag}", source_ref=f"node/f{tag}", **osm),
        "manual": Business(name=f"Manual {tag}", city_id=city.id),
    }
    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as s:
        s.add_all(rows.values())
        await s.flush()
        s.add(BusinessImage(business_id=rows["placeholder"].id, url="https://placehold.co/600x400", cloudinary_id="x"))
        s.add(BusinessImage(business_id=rows["photo"].id, url="https://res.cloudinary.com/a.jpg", cloudinary_id="y"))
        await s.commit()
    await engine.dispose()

    expected = {"thin": False, "placeholder": False, "two_signals": True,
                "described": True, "photo": True, "manual": True}
    sitemap_ids = {e["id"] for e in (await client.get("/api/v1/businesses/sitemap-entries")).json()}
    for key, want in expected.items():
        bid = str(rows[key].id)
        detail = (await client.get(f"/api/v1/businesses/{bid}")).json()
        assert detail["indexable"] is want, key           # Python rule (page noindex)
        assert (bid in sitemap_ids) is want, key          # SQL rule (sitemap) agrees
