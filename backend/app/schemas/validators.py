"""Shared field checks for request schemas."""
import re

_SCHEME = re.compile(r"^[a-z][a-z0-9+.-]*:", re.IGNORECASE)


def web_url(v: str | None) -> str | None:
    """Links shown on public pages must be plain web addresses.

    "instagram.com/shop" → "https://instagram.com/shop" (people rarely type the
    scheme, and the app hints say "instagram.com/..."). Any other scheme —
    javascript:, data:, … — is refused, since it would run script when tapped."""
    if v is None:
        return None
    v = v.strip()
    if not v:
        return None
    if v.lower().startswith(("http://", "https://")):
        return v
    if _SCHEME.match(v) and not re.match(r"^[^:/]+:\d", v):   # "shop.com:8080" is a port, not a scheme
        raise ValueError("Link must start with http:// or https://")
    return "https://" + v.lstrip("/")
