from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, cities, categories, listings, uploads, search, admin, events, businesses, payments, users

app = FastAPI(
    title="LocalIndia API",
    description="India's hyperlocal community platform â€” localsindia.com",
    version="1.0.0",
)

_cors_origins = list({
    settings.FRONTEND_URL,
    settings.FRONTEND_URL.replace("https://www.", "https://"),
    settings.FRONTEND_URL.replace("https://", "https://www."),
    "http://localhost:3000",
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


@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "service": "localindia-api"}

