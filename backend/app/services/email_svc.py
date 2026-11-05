import logging
import os

logger = logging.getLogger(__name__)

SENDGRID_KEY = os.getenv("SENDGRID_API_KEY", "")
FROM_EMAIL = os.getenv("EMAIL_FROM", "noreply@localsindia.com")
FROM_NAME = os.getenv("EMAIL_FROM_NAME", "LocalsIndia")
# Claim invites come from a real inbox so owners can reply
SUPPORT_EMAIL = os.getenv("EMAIL_SUPPORT", "support@localsindia.com")
# Own mailbox (GoDaddy) over SMTP — preferred over SendGrid (trial ended 2026-08-28).
# GoDaddy only lets the signed-in mailbox be the sender, so From is always SMTP_USER.
SMTP_HOST = os.getenv("SMTP_HOST", "smtpout.secureserver.net")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER", SUPPORT_EMAIL)
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")


def email_configured() -> bool:
    return bool(SMTP_PASSWORD or SENDGRID_KEY)


IMAP_HOST = os.getenv("IMAP_HOST", "imap.secureserver.net")


def bounced_recipients(raw_messages: list[bytes]) -> set[str]:
    """Recipient addresses from delivery-failure notices (mailer-daemon / postmaster bounces)."""
    import email as email_lib
    import re
    found = set()
    for raw in raw_messages:
        msg = email_lib.message_from_bytes(raw)
        frm, subj = str(msg.get("From", "")).lower(), str(msg.get("Subject", ""))
        if not ("mailer-daemon" in frm or "postmaster" in frm
                or re.search(r"undeliver|delivery (status|failure)|not delivered|returned mail", subj, re.I)):
            continue
        text = raw.decode("utf-8", "replace")
        rcpts = re.findall(r"(?:Final-Recipient|Original-Recipient):\s*rfc822;\s*<?([^\s<>;]+@[^\s<>;]+)", text, re.I)
        rcpts += re.findall(r"X-Failed-Recipients:\s*<?([^\s<>;,]+@[^\s<>;,]+)", text, re.I)
        ours = "@" + SMTP_USER.split("@")[-1]
        rcpts = [r.lower() for r in rcpts if not r.lower().endswith(ours)]
        if not rcpts:  # Yahoo names us as Final-Recipient; the address is in the quoted original
            rcpts = [r.lower() for r in re.findall(
                r"^(?:X-Apparently-To|To):\s*(?:[^<\n]*<)?([^\s<>;,]+@[^\s<>;,]+)", text, re.I | re.M)
                if not r.lower().endswith(ours)]
        found.update(rcpts)
    return found


def _fetch_inbox_since(days: int) -> list[bytes]:
    """Read-only (BODY.PEEK) fetch of the support@ INBOX for the last `days` days."""
    import imaplib
    from datetime import datetime, timedelta, timezone
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%d-%b-%Y")
    with imaplib.IMAP4_SSL(IMAP_HOST, 993, timeout=30) as m:
        m.login(SMTP_USER, SMTP_PASSWORD)
        m.select("INBOX", readonly=True)
        ids = m.search(None, f'(SINCE "{since}")')[1][0].split()
        return [m.fetch(i, "(BODY.PEEK[])")[1][0][1] for i in ids]


async def fetch_bounced_addresses(days: int = 7) -> set[str]:
    """Addresses that bounced in the last `days` days, read from the support@ mailbox."""
    if not SMTP_PASSWORD:
        return set()
    import asyncio
    return bounced_recipients(await asyncio.to_thread(_fetch_inbox_since, days))


def _smtp_send(to: str, subject: str, html: str, text: str) -> None:
    import smtplib
    import ssl
    from email.message import EmailMessage
    from email.utils import formataddr, make_msgid

    msg = EmailMessage()
    msg["From"] = formataddr((FROM_NAME, SMTP_USER))
    msg["To"] = to
    msg["Subject"] = subject
    msg["Message-ID"] = make_msgid(domain=SMTP_USER.split("@")[-1])
    msg.set_content(text or subject)
    msg.add_alternative(html, subtype="html")
    ctx = ssl.create_default_context()
    if SMTP_PORT == 465:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx, timeout=20) as s:
            s.login(SMTP_USER, SMTP_PASSWORD)
            s.send_message(msg)
    else:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as s:
            s.starttls(context=ctx)
            s.login(SMTP_USER, SMTP_PASSWORD)
            s.send_message(msg)


async def send_email(to: str, subject: str, html: str, text: str = "", from_email: str | None = None) -> bool:
    if SMTP_PASSWORD:
        import asyncio
        try:
            await asyncio.to_thread(_smtp_send, to, subject, html, text)
            return True
        except Exception as e:
            logger.error(f"SMTP send failed: {e}")
            return False
    if not SENDGRID_KEY:
        logger.warning(f"[EMAIL MOCK] To: {to} | Subject: {subject}")
        return True
    try:
        import httpx
        payload = {
            "personalizations": [{"to": [{"email": to}]}],
            "from": {"email": from_email or FROM_EMAIL, "name": FROM_NAME},
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


async def send_claim_code_email(to: str, business_name: str, code: str) -> bool:
    """Ownership code for claiming a business, sent to the business's own listed email."""
    from html import escape
    name = escape(business_name)
    html = _base_template(
        f"Your code: {code}",
        f"""<p>Someone is claiming <strong>{name}</strong> on LocalsIndia and asked for a code sent to this business email.</p>
        <p style="font-size:28px;font-weight:800;letter-spacing:6px;color:#1a1a2e">{code}</p>
        <p>Enter it on the claim screen within 24 hours. If this wasn't you, ignore this email — nothing changes without the code.</p>"""
    )
    text = (f"Your LocalsIndia code to claim {business_name}: {code}\n"
            f"Valid for 24 hours. If this wasn't you, ignore this email.")
    return await send_email(to, f"{code} is your code to claim {business_name}", html, text,
                            from_email=SUPPORT_EMAIL)


async def send_claim_invite_email(to: str, business_name: str, city_name: str,
                                  business_url: str, unsubscribe_url: str) -> bool:
    """One claim invite: one click on /admin/outreach, or the daily claim-invites cron (each address once)."""
    from html import escape
    name, city = escape(business_name), escape(city_name)
    html = _base_template(
        "Your business is listed on LocalsIndia",
        f"""<p>Namaste! <strong>{name}</strong> is listed for free on LocalsIndia, the local directory for {city}.</p>
        <p>Claim it for free to update your phone number, timings and photos, and reply to customer reviews.
        It takes about 2 minutes:</p>
        <ol style="color:#4b5563;font-size:14px;line-height:1.7;padding-left:20px;margin:0 0 16px">
          <li>Tap the button below. Your business page opens.</li>
          <li>Create a free account with your mobile number. We text you a code; then you pick a password. (Already have an account? Just sign in.)</li>
          <li>On the claim screen, choose <strong>Email code</strong>. We send a 6-digit code to <strong>this email address</strong>.</li>
          <li>Type the code. Done! The listing is now yours to edit.</li>
        </ol>
        <p><a class="btn" href="{business_url}">Claim {name} →</a></p>
        <p style="font-size:13px">Need help, or something is wrong in the listing? Just reply to this email and we'll sort it out for you.</p>"""
    ).replace('<a href="https://localsindia.com/unsubscribe" style="color:#9ca3af">Unsubscribe</a>',
              f'<a href="{unsubscribe_url}" style="color:#9ca3af">Unsubscribe — don\'t email us again</a>')
    text = (f"Namaste! {business_name} is listed for free on LocalsIndia, the local directory for {city_name}.\n\n"
            f"Claim it for free to update your phone number, timings and photos, and reply to customer reviews. "
            f"It takes about 2 minutes:\n"
            f"1. Open this link. Your business page opens: {business_url}\n"
            f"2. Create a free account with your mobile number. We text you a code; then you pick a password. (Already have an account? Just sign in.)\n"
            f"3. On the claim screen choose \"Email code\". We send a 6-digit code to this email address.\n"
            f"4. Type the code. Done.\n\n"
            f"Need help? Just reply to this email.\n\n"
            f"Not interested? Unsubscribe: {unsubscribe_url}")
    return await send_email(to, f"{business_name} is listed on LocalsIndia — claim it free", html, text,
                            from_email=SUPPORT_EMAIL)
