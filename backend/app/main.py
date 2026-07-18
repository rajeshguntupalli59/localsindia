# LocalIndia API — localsindia.com
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.core.limiter import limiter
from app.routers import auth, cities, categories, listings, uploads, search, admin, events, businesses, payments, users, chat, saved_searches, favorites, notifications, preferences, cron, buyer_requests, errors, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="LocalIndia API",
    description="India hyperlocal community platform - localsindia.com",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {exc}"},
    )

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
app.include_router(cron.router)
app.include_router(buyer_requests.router)
app.include_router(errors.router)
app.include_router(analytics.router)


@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "service": "localindia-api"}
