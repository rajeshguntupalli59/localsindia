"""AI chat assistant — natural language listing search + FAQ via Google Gemini Flash.

Rate limits (per IP): 5 requests/minute · 20 requests/hour
To change: update the @limiter.limit decorators on the chat() function below.
"""
import logging

from google import genai
from google.genai import types
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.category_catalog import CATALOG, subcategory_entry
from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.models.business import Business
from app.models.chatbot_question import ChatbotQuestion
from app.models.city import City
from app.models.llm_usage_log import LlmUsageLog
from app.services import search_svc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

# Estimated Gemini Flash pricing (per Google's public Gemini API pricing as of
# this writing) - a manually-updated constant, not fetched live. Sanity-check
# against https://ai.google.dev/gemini-api/docs/pricing if a real invoice ever
# looks wildly different from what this dashboard estimates.
_GEMINI_PRICE_PER_MILLION_INPUT_TOKENS = 0.075
_GEMINI_PRICE_PER_MILLION_OUTPUT_TOKENS = 0.30

_SYSTEM = """You are the LocalsIndia Assistant — a helpful guide for India's hyperlocal community platform at localsindia.com.

LocalsIndia lets people buy, sell, and connect in their city. 100% free, no middlemen, no spam calls — sellers are contacted directly on WhatsApp.

Categories: classifieds, pg-roommate, jobs, vehicles, electronics, education, tiffin, events, businesses, doctors, services, real-estate, furniture, fashion.
Supported languages: English, Telugu, Tamil, Kannada, Malayalam.
Coverage: 150 cities, all in South India (Andhra Pradesh, Telangana, Karnataka, Tamil Nadu, Kerala, Puducherry). If a user's city isn't listed, say LocalsIndia isn't there yet rather than guessing.

Common questions:
- Post a listing: city page → "Post Listing" → 3 steps → submit. Needs admin approval (usually a few hours).
- Contact a seller: tap the green WhatsApp button on any listing.
- Change city: tap the city name in the header.
- Edit a listing: Profile → My Listings → Edit.
- Cost: free to post and browse.
- Why "under review": every listing gets a quick admin spam check first.

Two searches:
- search_businesses for a PLACE or PROVIDER: doctors, dentists, hospitals, shops, restaurants, plumbers, tutors, salons, function halls… and "contact number of X" (e.g. "dentists in Hyderabad", "Apollo pharmacy Madhapur number"). Pick the closest type; put a business name in `name` and a neighbourhood in `area`.
- search_listings for THINGS posted by people: items to buy, PG/rooms to rent, jobs, vehicles (e.g. "PG in Hyderabad under ₹7000", "used iPhone in Chennai").
Ask which city first if none is mentioned. When results come back, say how many you found and name the top 2–3 (with their area if known); cards with Call buttons are shown below your reply, so don't write out phone numbers.
Keep replies short, friendly, in the same language the user writes in.
Write plain text only: no markdown, no ** or # symbols; put each item on its own line."""

_SEARCH_TOOL = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="search_listings",
            description="Search active listings on LocalsIndia matching the user's intent",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "query": types.Schema(
                        type=types.Type.STRING,
                        description="Search terms extracted from the user message (e.g. 'PG under 7000', 'iPhone 13')",
                    ),
                    "city_slug": types.Schema(
                        type=types.Type.STRING,
                        description="City slug such as 'hyderabad', 'chennai', 'bengaluru', 'mumbai'",
                    ),
                },
                required=["query", "city_slug"],
            ),
        )
    ]
)


# Business types the bot can search by — every catalog subcategory slug
_BUSINESS_TYPES = [sub["slug"] for c in CATALOG for sub in c.get("subcategories", [])]
_BUSINESS_TOOL = types.FunctionDeclaration(
    name="search_businesses",
    description=(
        "Search the LocalsIndia business directory (35,000+ real businesses: doctors, shops, services, "
        "restaurants, schools…) in one city. Give at least one of type / name / area. Types: "
        + ", ".join(f"{sub['slug']}={sub['name']}" for c in CATALOG for sub in c.get("subcategories", []))
    ),
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "city_slug": types.Schema(type=types.Type.STRING, description="City slug such as 'hyderabad', 'chennai', 'bengaluru'"),
            "type": types.Schema(type=types.Type.STRING, enum=_BUSINESS_TYPES, description="Closest business type"),
            "name": types.Schema(type=types.Type.STRING, description="Words from the business name, if the user named one"),
            "area": types.Schema(type=types.Type.STRING, description="Neighbourhood, e.g. 'Madhapur'"),
        },
        required=["city_slug"],
    ),
)
_SEARCH_TOOL.function_declarations.append(_BUSINESS_TOOL)


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    city_slug: str | None = None
    history: list[ChatMessage] = []


class ListingSnippet(BaseModel):
    id: str
    title: str
    price: float | None
    city_slug: str | None
    whatsapp_url: str | None


class BusinessSnippet(BaseModel):
    id: str
    name: str
    locality: str | None
    phone: str | None
    city_slug: str
    type_name: str | None


class ChatResponse(BaseModel):
    reply: str
    listings: list[ListingSnippet] | None = None
    businesses: list[BusinessSnippet] | None = None


async def _log_question(
    db: AsyncSession, req: ChatRequest, city_slug: str | None,
    search_query: str | None, results_count: int | None,
) -> None:
    """Record what the user asked, for /admin/chatbot. Never lets a logging
    failure break the chat reply."""
    try:
        db.add(ChatbotQuestion(
            question=req.message[:2000],
            city_slug=(city_slug or req.city_slug or None),
            search_query=search_query[:300] if search_query else None,
            results_count=results_count,
        ))
        await db.commit()
    except Exception:
        await db.rollback()
        logger.exception("Failed to log chatbot question")


@router.post("", response_model=ChatResponse)
@limiter.limit("5/minute")
@limiter.limit("20/hour")
async def chat(request: Request, req: ChatRequest, db: AsyncSession = Depends(get_db)):
    if not settings.GOOGLE_AI_KEY:
        await _log_question(db, req, None, None, None)
        return ChatResponse(reply="Our AI assistant is temporarily unavailable while we upgrade to a higher usage plan. As LocalsIndia grows, we're scaling our AI capacity — check back soon! In the meantime, use the search bar to find listings in your city.")

    client = genai.Client(api_key=settings.GOOGLE_AI_KEY)

    history = []
    for m in req.history[-10:]:
        role = "user" if m.role == "user" else "model"
        history.append(types.Content(role=role, parts=[types.Part(text=m.content)]))

    user_text = req.message
    if req.city_slug:
        user_text = f"[User's current city: {req.city_slug}] {req.message}"

    found_listings: list[dict] = []
    found_businesses: list[Business] = []
    resolved_city_slug: str | None = None
    search_query: str | None = None
    search_total: int | None = None
    total_input_tokens = 0
    total_output_tokens = 0

    def _track_usage(resp) -> None:
        nonlocal total_input_tokens, total_output_tokens
        usage = getattr(resp, "usage_metadata", None)
        if usage:
            total_input_tokens += usage.prompt_token_count or 0
            total_output_tokens += usage.candidates_token_count or 0

    try:
        chat_session = client.chats.create(
            model="gemini-flash-latest",
            config=types.GenerateContentConfig(
                system_instruction=_SYSTEM,
                tools=[_SEARCH_TOOL],
            ),
            history=history,
        )

        response = chat_session.send_message(user_text)
        _track_usage(response)

        # Gemini may retry search_listings with narrower args when a search
        # comes back empty, rather than replying with text - loop until it
        # replies with text or gives up retrying.
        reply_text = None
        for _ in range(3):
            fn_call = None
            for part in response.candidates[0].content.parts:
                if part.function_call and part.function_call.name in ("search_listings", "search_businesses"):
                    fn_call = part.function_call
                    break

            if not fn_call:
                reply_text = response.text
                break

            args = dict(fn_call.args)
            resolved_city_slug = args.get("city_slug") or req.city_slug or "hyderabad"
            search_total = 0

            city_row = await db.execute(
                select(City).where(City.slug == resolved_city_slug.lower(), City.active == True)
            )
            city = city_row.scalar_one_or_none()

            if not city:
                search_query = args.get("query") or args.get("type") or args.get("name") or ""
                tool_result = f"City '{resolved_city_slug}' not found on LocalsIndia."
            elif fn_call.name == "search_businesses":
                btype = args.get("type") if subcategory_entry(args.get("type")) else None
                search_query = " ".join(x for x in (btype, args.get("name"), args.get("area")) if x)
                found_businesses, search_total = await search_svc.search_businesses(
                    db, city_id=city.id, type=btype, name=args.get("name"), area=args.get("area"), limit=5)
                if found_businesses:
                    tool_result = f"Found {search_total} businesses. Top {len(found_businesses)}:\n" + "\n".join(
                        f"- {b.name}{' | ' + b.locality if b.locality else ''}" for b in found_businesses)
                else:
                    tool_result = f"No businesses found for '{search_query}' in {resolved_city_slug}."
            else:
                query = args.get("query", "")
                search_query = query
                result = await search_svc.search_listings(db, city_id=city.id, q=query, page_size=5)
                found_listings = result["items"]
                search_total = result["total"]
                if found_listings:
                    snippets_text = "\n".join(
                        f"- {i['title']} | {'₹' + str(int(i['price'])) if i.get('price') else 'Price on request'}"
                        for i in found_listings
                    )
                    tool_result = f"Found {result['total']} listings. Top 5:\n{snippets_text}"
                else:
                    tool_result = f"No listings found for '{query}' in {resolved_city_slug}."

            response = chat_session.send_message(
                types.Part.from_function_response(
                    name=fn_call.name,
                    response={"result": tool_result},
                )
            )
            _track_usage(response)

        reply_text = reply_text or response.text or (
            "I couldn't find any matches for that search — try a broader search term, "
            "or browse listings directly on the site."
        )
        # The chat window shows plain text — drop markdown bold that Gemini
        # sometimes adds anyway ("**37 dentists**" showed the asterisks)
        reply_text = reply_text.replace("**", "").replace("__", "")

        if total_input_tokens or total_output_tokens:
            cost = (
                total_input_tokens / 1_000_000 * _GEMINI_PRICE_PER_MILLION_INPUT_TOKENS
                + total_output_tokens / 1_000_000 * _GEMINI_PRICE_PER_MILLION_OUTPUT_TOKENS
            )
            db.add(LlmUsageLog(
                provider="gemini",
                model="gemini-flash-latest",
                context="chatbot",
                input_tokens=total_input_tokens,
                output_tokens=total_output_tokens,
                estimated_cost_usd=round(cost, 6),
            ))
            await db.commit()

    except Exception as e:
        logger.error("Gemini API error: %s %s", type(e).__name__, str(e))
        await db.rollback()
        await _log_question(db, req, resolved_city_slug, search_query, search_total)
        return ChatResponse(reply="Our AI assistant is temporarily unavailable while we upgrade to a higher usage plan. As LocalsIndia grows, we're scaling our AI capacity — check back soon! In the meantime, use the search bar to find listings in your city.")

    await _log_question(db, req, resolved_city_slug, search_query, search_total)

    listing_snippets = [
        ListingSnippet(
            id=str(item["id"]),
            title=item["title"],
            price=item.get("price"),
            city_slug=resolved_city_slug,
            whatsapp_url=item.get("whatsapp_url"),
        )
        for item in found_listings
    ] or None

    business_snippets = [
        BusinessSnippet(
            id=str(b.id),
            name=b.name,
            locality=b.locality,
            phone=b.phone,
            city_slug=resolved_city_slug,
            type_name=(subcategory_entry(b.subcategory_slug) or (None, {}))[1].get("name"),
        )
        for b in found_businesses
    ] or None

    return ChatResponse(reply=reply_text, listings=listing_snippets, businesses=business_snippets)
