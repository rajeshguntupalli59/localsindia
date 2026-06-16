from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared rate limiter — key by client IP
# Chat endpoint: 5/minute + 20/hour per IP
# To change limits: update the @limiter.limit decorators in routers/chat.py
limiter = Limiter(key_func=get_remote_address)
