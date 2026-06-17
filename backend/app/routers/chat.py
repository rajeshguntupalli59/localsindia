"""AI chat assistant — natural language listing search + FAQ via Claude Haiku.

Rate limits (per IP): 5 requests/minute · 20 requests/hour
To change: update the @limiter.limit decorators on the chat() function below.
"""
import logging
from typing import Any

import anthropic
from fastapi import APIRouter, Depends, Request

logger = logging.getLogger(__name__)
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.models.city import City
from app.services import search_svc

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

_SYSTEM = """You are the LocalsIndia Assistant — a helpful guide for India's hyperlocal community platform at localsindia.com.

LocalsIndia lets people buy, sell, and connect in their city. It is 100% free. No middlemen, no spam calls. Sellers are contacted directly on WhatsApp.

Categories: classifieds, pg-roommate, jobs, vehicles, electronics, education, tiffin, events, businesses.
Languages supported: English, Hindi, Telugu, Tamil, Kannada, Marathi, Bengali, Gujarati, Punjabi, Malayalam, Odia.

Common questions:
- How to post: visit your city page → click "Post Listing" → fill 3 steps → submit. Listings need admin approval (usually a few hours).
- How to contact a seller: click the green WhatsApp button on any listing. You connect directly.
- How to change city: click the city name in the header.
- How to edit a listing: go to Profile → My Listings → Edit.
- Is it free: Yes, completely free to post and browse.
- Why is my listing under review: all listings need a quick admin check to keep out spam.

When a user wants to FIND, SEARCH, or LOOK FOR listings (e.g. "PG in Hyderabad under ₹7000", "iPhone for sale in Chennai", "tiffin near Ameerpet"), use the search_listings tool.
If no city is mentioned, ask which city they are in before searching.
Keep replies short, friendly, and in the same language the user writes in."""

_TOOLS: list[dict[str, Any]] = [
    {
        "name": "search_listings",
        "description": "Search active listings on LocalsIndia matching the user's intent",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search terms extracted from the user message (e.g. 'PG under 7000', 'iPhone 13')",
                },
                "city_slug": {
                    "type": "string",
                    "description": "City slug such as 'hyderabad', 'chennai', 'bengaluru', 'mumbai'",
                },
            },
            "required": ["query", "city_slug"],
        },
    }
]


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
    if not settings.ANTHROPIC_API_KEY:
        return ChatResponse(reply="Chat assistant is not configured yet. Please check back soon!")

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    messages: list[dict[str, Any]] = [
        {"role": m.role, "content": m.content} for m in req.history[-10:]
    ]
    user_text = req.message
    if req.city_slug:
        user_text = f"[User's current city: {req.city_slug}] {req.message}"
    messages.append({"role": "user", "content": user_text})

    found_listings: list[dict] = []
    resolved_city_slug: str | None = None

    try:
        resp = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=_SYSTEM,
            tools=_TOOLS,
            messages=messages,
        )
    except (anthropic.PermissionDeniedError, anthropic.NotFoundError) as e:
        logger.error("Anthropic API error (permission/not found): %s %s", type(e).__name__, str(e))
        return ChatResponse(reply="Chat assistant is temporarily unavailable. Please try again later.")
    except anthropic.AuthenticationError as e:
        logger.error("Anthropic API auth error: %s", str(e))
        return ChatResponse(reply="Chat assistant is not configured correctly. Please contact support.")
    except Exception as e:
        logger.error("Anthropic API unexpected error: %s %s", type(e).__name__, str(e))
        return ChatResponse(reply=f"Chat error: {type(e).__name__}: {str(e)[:200]}")

    if resp.stop_reason == "tool_use":
        tool_block = next(b for b in resp.content if b.type == "tool_use")
        t_in = tool_block.input
        resolved_city_slug = t_in.get("city_slug") or req.city_slug or "hyderabad"
        query = t_in.get("query", "")

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

        messages.append({"role": "assistant", "content": resp.content})
        messages.append({
            "role": "user",
            "content": [{"type": "tool_result", "tool_use_id": tool_block.id, "content": tool_result}],
        })

        final = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=_SYSTEM,
            tools=_TOOLS,
            messages=messages,
        )
        reply_text = next((b.text for b in final.content if hasattr(b, "text")), "Here are the results!")
    else:
        reply_text = next((b.text for b in resp.content if hasattr(b, "text")), "How can I help you?")

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
