import logging
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_otp(phone: str, otp: str) -> bool:
    if not settings.MSG91_AUTH_KEY:
        # Mock mode — OTP printed to console for local development
        logger.warning(f"[MOCK OTP] Phone: {phone}  OTP: {otp}")
        return True

    url = "https://control.msg91.com/api/v5/otp"
    params = {
        "template_id": settings.MSG91_TEMPLATE_ID,
        "mobile": phone.replace("+", ""),
        "authkey": settings.MSG91_AUTH_KEY,
        "otp": otp,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, params=params)
            data = resp.json()
            logger.info(f"MSG91 response for {phone}: {data}")
            if data.get("type") != "success":
                logger.error(f"MSG91 error: {data}")
            return data.get("type") == "success"
    except Exception as exc:
        logger.error(f"MSG91 send failed: {exc}")
        return False
