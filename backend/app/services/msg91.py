import logging
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_otp(phone: str, otp: str) -> tuple[bool, dict]:
    if not settings.MSG91_AUTH_KEY:
        # Mock mode — OTP printed to console for local development
        logger.warning(f"[MOCK OTP] Phone: {phone}  OTP: {otp}")
        return True, {}

    # Use Flow API so ##var## in the DLT-verified v1.1 template gets substituted
    url = "https://control.msg91.com/api/v5/flow/"
    headers = {
        "authkey": settings.MSG91_AUTH_KEY,
        "content-type": "application/json",
    }
    payload = {
        "template_id": settings.MSG91_TEMPLATE_ID,
        "short_url": 0,
        "realTimeResponse": 1,
        "recipients": [
            {
                "mobiles": phone.replace("+", ""),
                "var": otp,
            }
        ],
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload, headers=headers)
            data = resp.json()
            logger.info(f"MSG91 response for {phone}: {data}")
            if data.get("type") != "success":
                logger.error(f"MSG91 error code={data.get('code')} msg={data.get('message')} data={data}")
            return data.get("type") == "success", data
    except Exception as exc:
        logger.error(f"MSG91 send failed: {exc}")
        return False, {"message": str(exc)}
