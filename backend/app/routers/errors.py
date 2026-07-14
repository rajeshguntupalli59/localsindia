from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.limiter import limiter
from app.models.app_error_log import AppErrorLog
from app.schemas.error_log import ErrorReportCreate

router = APIRouter(prefix="/api/v1/errors", tags=["errors"])


@router.post("/report", status_code=204)
@limiter.limit("20/minute")
async def report_error(
    request: Request,
    body: ErrorReportCreate,
    db: AsyncSession = Depends(get_db),
):
    """Public, unauthenticated — a crash can happen before login or when auth is broken."""
    log = AppErrorLog(
        platform=body.platform,
        message=body.message,
        stack=body.stack,
        context=body.context,
        app_version=body.app_version,
    )
    db.add(log)
    await db.commit()
