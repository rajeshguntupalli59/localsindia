import logging
import os
import uuid
from app.core.config import settings

logger = logging.getLogger(__name__)


def _is_configured() -> bool:
    return bool(settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY)


async def upload_image(file_bytes: bytes, filename: str, folder: str = "localindia/listings") -> dict:
    if not _is_configured():
        mock_id = f"mock/{uuid.uuid4()}"
        mock_url = f"https://placehold.co/400x300/f97316/white?text=LocalsIndia"
        logger.warning(f"[MOCK UPLOAD] {filename} → {mock_url}")
        return {"url": mock_url, "cloudinary_id": mock_id}

    import cloudinary.uploader
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
    )
    result = cloudinary.uploader.upload(
        file_bytes,
        folder=folder,
        resource_type="image",
        format="webp",
    )
    return {"url": result["secure_url"], "cloudinary_id": result["public_id"]}


async def delete_image(cloudinary_id: str) -> bool:
    if not _is_configured():
        logger.warning(f"[MOCK DELETE] {cloudinary_id}")
        return True

    import cloudinary.uploader
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
    )
    result = cloudinary.uploader.destroy(cloudinary_id)
    return result.get("result") == "ok"


# ── Private uploads (business-claim proof documents) ─────────────────────────
# Stored as type="private": the asset has no public URL at all. Admins view it
# through private_download_url, which is signed and expires after 10 minutes,
# so an ID proof link that leaks stops working.

async def upload_private_image(file_bytes: bytes, filename: str, folder: str = "localindia/claims") -> str:
    """Returns the Cloudinary public_id (not a URL — there is no public URL)."""
    if not _is_configured():
        mock_id = f"mock-private/{uuid.uuid4()}"
        logger.warning(f"[MOCK PRIVATE UPLOAD] {filename} → {mock_id}")
        return mock_id

    import cloudinary.uploader
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
    )
    result = cloudinary.uploader.upload(
        file_bytes,
        folder=folder,
        resource_type="image",
        type="private",
        format="jpg",
    )
    return result["public_id"]


def private_image_url(public_id: str | None) -> str | None:
    """Expiring (10 min) signed download URL for a private asset — admin viewing only."""
    if not public_id:
        return None
    if not _is_configured():
        return "https://placehold.co/600x400/64748b/white?text=Private+document"

    import time
    import cloudinary
    import cloudinary.utils
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
    )
    return cloudinary.utils.private_download_url(
        public_id, "jpg", type="private", resource_type="image", expires_at=int(time.time()) + 600,
    )


async def delete_private_image(public_id: str) -> bool:
    if not _is_configured():
        return True
    import cloudinary.uploader
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
    )
    result = cloudinary.uploader.destroy(public_id, type="private")
    return result.get("result") == "ok"
