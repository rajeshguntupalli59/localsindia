"""Tell claimed business owners about a new Buyer Request that matches their work.

Match = same city + same category + same type (subcategory). If the request
has no type but its category has types (old app builds), nobody is told —
otherwise every "Services" business would get every services request.
Unclaimed businesses are never contacted (Raj's call, 2026-11-23).
"""
import html
import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.category_catalog import category_entry, subcategory_entry
from app.models.business import Business
from app.models.buyer_request import BuyerRequest
from app.models.category import Category
from app.models.city import City
from app.models.user import User
from app.services.email_svc import _base_template, send_email
from app.services.notification_svc import notify

logger = logging.getLogger(__name__)

MAX_OWNERS_PER_REQUEST = 20
SITE = "https://www.localsindia.com"


async def notify_matching_owners(db: AsyncSession, request_id: uuid.UUID) -> int:
    """Notify matching owners once each; returns how many were told. Never raises
    for a single failed email/push."""
    req = await db.get(BuyerRequest, request_id)
    if not req or req.deleted_at or req.status != "open":
        return 0
    cat = await db.get(Category, req.category_id) if req.category_id else None
    city = await db.get(City, req.city_id)
    if not cat or not city:
        return 0

    has_types = bool((category_entry(cat.slug) or {}).get("subcategories"))
    if has_types and not req.subcategory_slug:
        return 0

    q = (select(Business.owner_id)
         .where(Business.city_id == req.city_id, Business.category_id == req.category_id,
                Business.owner_id.is_not(None), Business.owner_id != req.user_id,
                Business.deleted_at.is_(None))
         .distinct().limit(MAX_OWNERS_PER_REQUEST))
    if req.subcategory_slug:
        q = q.where(Business.subcategory_slug == req.subcategory_slug)
    owner_ids = [oid for (oid,) in (await db.execute(q)).all()]
    if not owner_ids:
        return 0

    sub = subcategory_entry(req.subcategory_slug)
    what = sub[1]["name"] if sub else cat.name
    title = f"New customer request: {what} in {city.name}"
    snippet = req.description if len(req.description) <= 140 else req.description[:137] + "…"
    action_url = f"/{city.slug}#buyer-requests"
    email_html = _lead_email(what, city.name, req, f"{SITE}{action_url}")

    owners = (await db.execute(select(User).where(User.id.in_(owner_ids)))).scalars().all()
    for owner in owners:
        try:
            await notify(db, owner.id, "buyer_request_match", title, snippet, action_url)
        except Exception:
            logger.exception("buyer request %s: in-app notice to %s failed", req.id, owner.id)
        if owner.email:
            try:
                await send_email(owner.email, title, email_html)
            except Exception:
                logger.exception("buyer request %s: email to owner %s failed", req.id, owner.id)
    return len(owners)


def _lead_email(what: str, city_name: str, req: BuyerRequest, url: str) -> str:
    e = html.escape
    digits = req.contact_phone.lstrip("+")
    budget = f"<p><strong>Budget:</strong> ₹{req.budget:,.0f}</p>" if req.budget else ""
    return _base_template(
        f"A customer in {e(city_name)} needs {e(what)}",
        f"""<p>Someone just posted this on LocalsIndia:</p>
        <p style="background:#f9fafb;border-radius:10px;padding:12px 16px;color:#1a1a2e">{e(req.description)}</p>
        {budget}
        <p><strong>Contact:</strong> {e(req.contact_phone)}</p>
        <p><a class="btn" style="background:#25D366" href="https://wa.me/{e(digits)}">Reply on WhatsApp</a></p>
        <p style="font-size:12px;color:#9ca3af">You get this because you own a {e(what)} business on LocalsIndia in {e(city_name)}.
        See all requests: <a href="{e(url)}">{e(url)}</a></p>""",
    )
