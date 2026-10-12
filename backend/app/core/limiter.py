from slowapi import Limiter
from starlette.requests import Request


def client_ip(request: Request) -> str:
    """Real visitor IP behind Azure App Service's front end.

    The app only ever sees the proxy (169.254.130.1) as the socket peer, so
    keying on it made every limit one site-wide bucket — a bot hammering
    /auth/otp/send kept it full and real users got 429. Azure sets
    X-Client-IP and *appends* "ip:port" to X-Forwarded-For, so the last
    entry is the one a client can't forge.
    """
    ip = request.headers.get("x-client-ip")
    if not ip:
        xff = request.headers.get("x-forwarded-for")
        if xff:
            ip = xff.split(",")[-1].strip()
            if ip.count(":") == 1:  # "1.2.3.4:5678" -> drop the port (leave IPv6 alone)
                ip = ip.split(":")[0]
    return ip or (request.client.host if request.client else "unknown")


# Shared rate limiter — key by client IP
# Chat endpoint: 5/minute + 20/hour per IP
# To change limits: update the @limiter.limit decorators in routers/chat.py
limiter = Limiter(key_func=client_ip)
