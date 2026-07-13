import logging
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_otp(phone: str, otp: str) -> tuple[bool, dict]:
    if not settings.MSG91_AUTH_KEY:
        logger.warning(f"[MOCK OTP] Phone: {phone}  OTP: {otp}")
        return True, {}

    url = "https://control.msg91.com/api/v5/otp"
    headers = {"authkey": settings.MSG91_AUTH_KEY}
    params = {
        "mobile": phone.replace("+", ""),
        "template_id": settings.MSG91_TEMPLATE_ID,
        "otp": otp,
        "otp_expiry": 10,
        "otp_length": len(otp),
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, params=params, headers=headers)
            data = resp.json()
            logger.info(f"MSG91 OTP response for {phone}: status={resp.status_code} data={data}")
            if data.get("type") != "success":
                logger.error(f"MSG91 error: {data}")
            return data.get("type") == "success", data
    except Exception as exc:
        logger.error(f"MSG91 send failed: {exc}")
        return False, {"message": str(exc)}
