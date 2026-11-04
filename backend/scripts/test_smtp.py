"""Send one test email through the support@ mailbox (GoDaddy SMTP).

Run:  python backend/scripts/test_smtp.py you@gmail.com
Asks for the mailbox password (hidden); nothing is saved.
"""
import asyncio
import getpass
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ["SMTP_PASSWORD"] = getpass.getpass("support@localsindia.com password: ")

from app.services import email_svc  # noqa: E402  (reads SMTP_PASSWORD at import)

to = sys.argv[1] if len(sys.argv) > 1 else input("Send test to: ")
ok = asyncio.run(email_svc.send_email(
    to, "LocalsIndia test email", "<p>If you can read this, sending from support@ works.</p>",
    "If you can read this, sending from support@ works."))
print("SENT - check the inbox (and spam)" if ok else "FAILED - see the error above")
