import logging
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"


async def verify_otp_send(token: str | None) -> bool:
    """Verify a reCAPTCHA v3 token for the otp_send action.
    Unset RECAPTCHA_SECRET_KEY skips verification (mock mode for local/dev,
    same pattern as msg91.send_otp)."""
    if not settings.RECAPTCHA_SECRET_KEY:
        logger.warning("[RECAPTCHA_DEBUG] verification skipped — RECAPTCHA_SECRET_KEY not set")
        return True
    if not token:
        return False

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(VERIFY_URL, data={
                "secret": settings.RECAPTCHA_SECRET_KEY,
                "response": token,
            })
            data = resp.json()
    except Exception as exc:
        logger.error(f"reCAPTCHA verify request failed: {exc}")
        return False

    if not data.get("success"):
        logger.warning(f"reCAPTCHA verify failed: {data.get('error-codes')}")
        return False
    if data.get("action") != "otp_send":
        logger.warning(f"reCAPTCHA action mismatch: {data.get('action')}")
        return False
    if data.get("score", 0) < settings.RECAPTCHA_MIN_SCORE:
        logger.warning(f"reCAPTCHA score too low: {data.get('score')}")
        return False
    return True
