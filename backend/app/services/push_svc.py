"""Delivers push notifications to devices via Expo's push API."""
import logging

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push(tokens: list[str], title: str, body: str, data: dict | None = None) -> None:
    if not tokens:
        return
    try:
        import httpx
        messages = [
            {"to": token, "title": title, "body": body, "data": data or {}}
            for token in tokens
        ]
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={"Content-Type": "application/json", "Accept": "application/json"},
            )
    except Exception as e:
        logger.error(f"Push send failed: {e}")
