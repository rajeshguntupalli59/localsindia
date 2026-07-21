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
