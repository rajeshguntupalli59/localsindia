# LocalIndia API — localsindia.com
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.core.limiter import limiter
from app.routers import auth, cities, categories, listings, uploads, search, admin, events, businesses, payments, users, chat, saved_searches, favorites, notifications, preferences


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-run DB migrations on startup (idempotent — safe on every restart)
    try:
        from alembic.config import Config
        from alembic import command
        import os
        alembic_cfg = Config(os.path.join(os.path.dirname(__file__), "../../alembic.ini"))
        alembic_cfg.set_main_option("script_location", os.path.join(os.path.dirname(__file__), "../../migrations"))
        command.upgrade(alembic_cfg, "head")
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Migration skipped: {e}")
    yield


app = FastAPI(
    title="LocalIndia API",
    description="India hyperlocal community platform - localsindia.com",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_cors_origins = list({
    settings.FRONTEND_URL,
    settings.FRONTEND_URL.replace("https://www.", "https://"),
    settings.FRONTEND_URL.replace("https://", "https://www."),
    "http://localhost:3000",
    "http://localhost:8081",
    "http://localhost:19006",
})

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(cities.router)
app.include_router(categories.router)
app.include_router(listings.router)
app.include_router(uploads.router)
app.include_router(search.router)
app.include_router(admin.router)
app.include_router(events.router)
app.include_router(businesses.router)
app.include_router(payments.router)
app.include_router(users.router)
app.include_router(chat.router)
app.include_router(saved_searches.router)
app.include_router(favorites.router)
app.include_router(notifications.router)
app.include_router(preferences.router)


@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "service": "localindia-api"}


@app.get("/api/v1/chat-ping")
async def chat_ping():
    """Debug: test Anthropic connectivity from Azure without tools."""
    import anthropic
    key = settings.ANTHROPIC_API_KEY
    if not key:
        return {"error": "no key"}
    client = anthropic.Anthropic(api_key=key)
    try:
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=20,
            messages=[{"role": "user", "content": "say hi"}],
        )
        return {"status": "ok", "reply": resp.content[0].text}
    except Exception as e:
        return {"status": "error", "type": type(e).__name__, "detail": str(e)[:300]}
