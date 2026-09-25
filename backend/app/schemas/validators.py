"""Shared field checks for request schemas."""


def web_url(v: str | None) -> str | None:
    """Links shown on public pages must be plain web addresses. Blocks
    javascript:/data: URLs, which would run script when a visitor taps them."""
    if v is None:
        return None
    v = v.strip()
    if not v:
        return None
    if not v.lower().startswith(("http://", "https://")):
        raise ValueError("Link must start with http:// or https://")
    return v
