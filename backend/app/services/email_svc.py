import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

SENDGRID_KEY = os.getenv("SENDGRID_API_KEY", "")
FROM_EMAIL = os.getenv("EMAIL_FROM", "noreply@localsindia.com")
FROM_NAME = os.getenv("EMAIL_FROM_NAME", "LocalsIndia")


async def send_email(to: str, subject: str, html: str, text: str = "") -> bool:
    if not SENDGRID_KEY:
        logger.warning(f"[EMAIL MOCK] To: {to} | Subject: {subject}")
        return True
    try:
        import httpx
        payload = {
            "personalizations": [{"to": [{"email": to}]}],
            "from": {"email": FROM_EMAIL, "name": FROM_NAME},
            "subject": subject,
            "content": [
                {"type": "text/plain", "value": text or subject},
                {"type": "text/html", "value": html},
            ],
        }
        async with httpx.AsyncClient() as client:
            r = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                json=payload,
                headers={"Authorization": f"Bearer {SENDGRID_KEY}"},
                timeout=10,
            )
            if r.status_code not in (200, 202):
                logger.error(f"SendGrid error {r.status_code}: {r.text[:200]}")
                return False
        return True
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return False


def _base_template(title: str, body_html: str) -> str:
    return f"""
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:20px}}
  .card{{max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}}
  .header{{background:#1A1A2E;padding:24px 32px}}
  .logo{{color:#F7921E;font-size:20px;font-weight:800;letter-spacing:-0.5px}}
  .body{{padding:32px}}
  h2{{color:#1a1a2e;font-size:20px;margin:0 0 12px}}
  p{{color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 16px}}
  .btn{{display:inline-block;background:#F7921E;color:#fff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none}}
  .footer{{padding:16px 32px;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:11px;text-align:center}}
</style></head><body>
<div class="card">
  <div class="header"><div class="logo">LocalsIndia</div></div>
  <div class="body">
    <h2>{title}</h2>
    {body_html}
  </div>
  <div class="footer">
    LocalsIndia · India's hyperlocal community platform<br>
    <a href="https://localsindia.com/unsubscribe" style="color:#9ca3af">Unsubscribe</a>
  </div>
</div>
</body></html>"""


async def send_welcome_email(to: str, name: str) -> bool:
    html = _base_template(
        f"Welcome to LocalsIndia, {name}!",
        f"""<p>You're all set! LocalsIndia connects you with jobs, PGs, and services in your city.</p>
        <p>Start by browsing listings in your city or post your first listing for free.</p>
        <p><a class="btn" href="https://localsindia.com">Explore LocalsIndia →</a></p>"""
    )
    return await send_email(to, f"Welcome to LocalsIndia, {name}!", html)


async def send_listing_approved_email(to: str, listing_title: str, listing_url: str) -> bool:
    html = _base_template(
        "Your listing is live!",
        f"""<p>Great news! Your listing <strong>"{listing_title}"</strong> has been approved and is now visible to buyers in your city.</p>
        <p><a class="btn" href="{listing_url}">View Your Listing →</a></p>
        <p style="font-size:12px;color:#9ca3af">Tip: Add photos to get 5× more views. Promote your listing for just ₹99/week to appear at the top.</p>"""
    )
    return await send_email(to, f"Your listing is live — {listing_title}", html)


async def send_listing_expiry_email(to: str, listing_title: str, renew_url: str, days_left: int) -> bool:
    html = _base_template(
        f"Your listing expires in {days_left} days",
        f"""<p>Your listing <strong>"{listing_title}"</strong> will expire in <strong>{days_left} days</strong>.</p>
        <p>Renew it now to stay visible to buyers in your city.</p>
        <p><a class="btn" href="{renew_url}">Renew Listing →</a></p>"""
    )
    return await send_email(to, f"Renew your listing — expires in {days_left} days", html)


async def send_digest_email(to: str, city_name: str, listings: list[dict]) -> bool:
    items_html = "".join([
        f'<div style="border:1px solid #f3f4f6;border-radius:10px;padding:12px;margin-bottom:10px">'
        f'<p style="margin:0;font-weight:700;color:#1a1a2e">{l["title"]}</p>'
        f'<p style="margin:4px 0 8px;color:#6b7280;font-size:12px">{l.get("area","")}</p>'
        f'<a href="https://localsindia.com/listing/{l["id"]}" style="color:#F7921E;font-size:12px;font-weight:600">View listing →</a>'
        f'</div>'
        for l in listings[:5]
    ])
    html = _base_template(
        f"New listings in {city_name}",
        f"""<p>{len(listings)} new listings posted in {city_name} recently. Don't miss out!</p>
        {items_html}
        <p><a class="btn" href="https://localsindia.com/{city_name.lower()}">See All Listings →</a></p>"""
    )
    return await send_email(to, f"{len(listings)} new listings in {city_name} — LocalsIndia", html)
