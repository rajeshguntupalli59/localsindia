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

from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.models.city import City
from app.services import search_svc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

_SYSTEM = """You are the LocalsIndia Assistant — a helpful guide for India's hyperlocal community platform at localsindia.com.

LocalsIndia lets people buy, sell, and connect in their city. It is 100% free. No middlemen, no spam calls. Sellers are contacted directly on WhatsApp.

Categories: classifieds, pg-roommate, jobs, vehicles, electronics, education, tiffin, events, businesses, doctors, services, real-estate, furniture, fashion.
Languages supported: English, Telugu, Tamil, Kannada, Malayalam.
LocalsIndia currently serves South India only: Telangana, Andhra Pradesh, Karnataka, Tamil Nadu, Kerala, and Puducherry (151 cities). If a user asks about a city outside these states, let them know LocalsIndia isn't available there yet.

Common questions:
- How to post: visit your city page → click "Post Listing" → fill 3 steps → submit. Listings need admin approval (usually a few hours).
- How to contact a seller: click the green WhatsApp button on any listing. You connect directly.
- How to change city: click the city name in the header.
- How to edit a listing: go to Profile → My Listings → Edit.
- Is it free: Yes, completely free to post and browse.
- Why is my listing under review: all listings need a quick admin check to keep out spam.

When a user wants to FIND, SEARCH, or LOOK FOR listings (e.g. "PG in Hyderabad under ₹7000", "iPhone for sale in Chennai", "tiffin near Ameerpet"), call the search_listings function.
If no city is mentioned, ask which city they are in before searching.
Keep replies short, friendly, and in the same language the user writes in."""

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


class ChatResponse(BaseModel):
    reply: str
    listings: list[ListingSnippet] | None = None


@router.post("", response_model=ChatResponse)
@limiter.limit("5/minute")
@limiter.limit("20/hour")
async def chat(request: Request, req: ChatRequest, db: AsyncSession = Depends(get_db)):
    if not settings.GOOGLE_AI_KEY:
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
    resolved_city_slug: str | None = None

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

        # Gemini may retry search_listings with narrower args when a search
        # comes back empty, rather than replying with text - loop until it
        # replies with text or gives up retrying.
        reply_text = None
        for _ in range(3):
            fn_call = None
            for part in response.candidates[0].content.parts:
                if part.function_call and part.function_call.name == "search_listings":
                    fn_call = part.function_call
                    break

            if not fn_call:
                reply_text = response.text
                break

            args = dict(fn_call.args)
            resolved_city_slug = args.get("city_slug") or req.city_slug or "hyderabad"
            query = args.get("query", "")

            city_row = await db.execute(
                select(City).where(City.slug == resolved_city_slug.lower(), City.active == True)
            )
            city = city_row.scalar_one_or_none()

            if city:
                result = await search_svc.search_listings(db, city_id=city.id, q=query, page_size=5)
                found_listings = result["items"]
                if found_listings:
                    snippets_text = "\n".join(
                        f"- {i['title']} | {'₹' + str(int(i['price'])) if i.get('price') else 'Price on request'}"
                        for i in found_listings
                    )
                    tool_result = f"Found {result['total']} listings. Top 5:\n{snippets_text}"
                else:
                    tool_result = f"No listings found for '{query}' in {resolved_city_slug}."
            else:
                tool_result = f"City '{resolved_city_slug}' not found on LocalsIndia."

            response = chat_session.send_message(
                types.Part.from_function_response(
                    name="search_listings",
                    response={"result": tool_result},
                )
            )

        reply_text = reply_text or response.text or (
            "I couldn't find any matches for that search — try a broader search term, "
            "or browse listings directly on the site."
        )

    except Exception as e:
        logger.error("Gemini API error: %s %s", type(e).__name__, str(e))
        return ChatResponse(reply="Our AI assistant is temporarily unavailable while we upgrade to a higher usage plan. As LocalsIndia grows, we're scaling our AI capacity — check back soon! In the meantime, use the search bar to find listings in your city.")

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

    return ChatResponse(reply=reply_text, listings=listing_snippets)
