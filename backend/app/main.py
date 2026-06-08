from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, cities, listings, uploads, search, admin

app = FastAPI(
    title="LocalIndia API",
    description="India's hyperlocal community platform — localindia.in",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(cities.router)
app.include_router(listings.router)
app.include_router(uploads.router)
app.include_router(search.router)
app.include_router(admin.router)


@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "service": "localindia-api"}
