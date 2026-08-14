"""
meta_client.py — Shared Cloudinary upload + Facebook/Instagram Graph API
publishing functions. Used by both meta_poster.py (recurring evergreen
posts) and ecosystem_poster.py (the richer one-off/rotating poster), so
the publish logic lives in exactly one place.
"""
import os
import time

import httpx

GRAPH_API = "https://graph.facebook.com/v21.0"


def upload_to_cloudinary(image_path, public_id: str, folder: str = "localsindia/social_posts") -> str:
    import cloudinary
    import cloudinary.uploader

    cloudinary.config(
        cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
        api_key=os.environ["CLOUDINARY_API_KEY"],
        api_secret=os.environ["CLOUDINARY_API_SECRET"],
    )
    result = cloudinary.uploader.upload(
        str(image_path),
        folder=folder,
        public_id=public_id,
        resource_type="image",
    )
    return result["secure_url"]


def upload_video_to_cloudinary(video_path, public_id: str, folder: str = "localsindia/social_posts") -> str:
    import cloudinary
    import cloudinary.uploader

    cloudinary.config(
        cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
        api_key=os.environ["CLOUDINARY_API_KEY"],
        api_secret=os.environ["CLOUDINARY_API_SECRET"],
    )
    result = cloudinary.uploader.upload(
        str(video_path),
        folder=folder,
        public_id=public_id,
        resource_type="video",
    )
    return result["secure_url"]


def post_to_facebook_page(image_url: str, caption: str) -> str:
    resp = httpx.post(
        f"{GRAPH_API}/{os.environ['META_PAGE_ID']}/photos",
        data={
            "url": image_url,
            "caption": caption,
            "access_token": os.environ["META_PAGE_ACCESS_TOKEN"],
        },
        timeout=30.0,
    )
    resp.raise_for_status()
    return resp.json().get("post_id") or resp.json().get("id")


def post_to_facebook_link(message: str, link: str) -> str:
    """Link post — Facebook crawls the URL itself and builds the preview
    card (title/image/description) from its OG tags, no image upload
    needed. Used for sharing blog articles."""
    resp = httpx.post(
        f"{GRAPH_API}/{os.environ['META_PAGE_ID']}/feed",
        data={
            "message": message,
            "link": link,
            "access_token": os.environ["META_PAGE_ACCESS_TOKEN"],
        },
        timeout=30.0,
    )
    resp.raise_for_status()
    return resp.json()["id"]


def post_to_facebook_text(message: str) -> str:
    """Plain text status update — no image. Facebook-only; Instagram's API
    has no equivalent (every IG post requires media)."""
    resp = httpx.post(
        f"{GRAPH_API}/{os.environ['META_PAGE_ID']}/feed",
        data={
            "message": message,
            "access_token": os.environ["META_PAGE_ACCESS_TOKEN"],
        },
        timeout=30.0,
    )
    resp.raise_for_status()
    return resp.json()["id"]


def _ig_create_and_publish(image_url: str, access_token: str, ig_id: str, media_type: str = None, caption: str = None) -> str:
    data = {"image_url": image_url, "access_token": access_token}
    if media_type:
        data["media_type"] = media_type
    if caption:
        data["caption"] = caption

    create = httpx.post(f"{GRAPH_API}/{ig_id}/media", data=data, timeout=30.0)
    create.raise_for_status()
    creation_id = create.json()["id"]

    # Instagram needs a moment to process the media before it can be published.
    time.sleep(5)

    publish = httpx.post(
        f"{GRAPH_API}/{ig_id}/media_publish",
        data={"creation_id": creation_id, "access_token": access_token},
        timeout=30.0,
    )
    publish.raise_for_status()
    return publish.json()["id"]


def post_to_instagram_feed(image_url: str, caption: str) -> str:
    return _ig_create_and_publish(
        image_url,
        os.environ["META_IG_ACCESS_TOKEN"],
        os.environ["META_IG_BUSINESS_ID"],
        caption=caption,
    )


def post_to_instagram_story(image_url: str) -> str:
    return _ig_create_and_publish(
        image_url,
        os.environ["META_IG_ACCESS_TOKEN"],
        os.environ["META_IG_BUSINESS_ID"],
        media_type="STORIES",
    )


def post_to_facebook_video(video_url: str, caption: str) -> str:
    """Video post to the Facebook Page feed. `file_url` tells Graph API to
    fetch and transcode the hosted video itself — no chunked upload needed
    for files this small."""
    resp = httpx.post(
        f"{GRAPH_API}/{os.environ['META_PAGE_ID']}/videos",
        data={
            "file_url": video_url,
            "description": caption,
            "access_token": os.environ["META_PAGE_ACCESS_TOKEN"],
        },
        timeout=60.0,
    )
    resp.raise_for_status()
    return resp.json()["id"]


def post_to_instagram_reel(video_url: str, caption: str, max_wait_s: int = 180) -> str:
    """Instagram Reels publish. Unlike images, video containers process
    asynchronously server-side — must poll status_code until FINISHED
    before media_publish will succeed (calling it too early 400s)."""
    access_token = os.environ["META_IG_ACCESS_TOKEN"]
    ig_id = os.environ["META_IG_BUSINESS_ID"]

    create = httpx.post(
        f"{GRAPH_API}/{ig_id}/media",
        data={
            "video_url": video_url,
            "media_type": "REELS",
            "caption": caption,
            "access_token": access_token,
        },
        timeout=30.0,
    )
    create.raise_for_status()
    creation_id = create.json()["id"]

    waited = 0
    poll_interval = 5
    while waited < max_wait_s:
        time.sleep(poll_interval)
        waited += poll_interval
        status = httpx.get(
            f"{GRAPH_API}/{creation_id}",
            params={"fields": "status_code,status", "access_token": access_token},
            timeout=30.0,
        )
        status.raise_for_status()
        code = status.json().get("status_code")
        if code == "FINISHED":
            break
        if code == "ERROR":
            raise RuntimeError(f"Instagram Reels processing failed: {status.json()}")
    else:
        raise TimeoutError(f"Instagram Reels container {creation_id} did not finish processing within {max_wait_s}s")

    publish = httpx.post(
        f"{GRAPH_API}/{ig_id}/media_publish",
        data={"creation_id": creation_id, "access_token": access_token},
        timeout=30.0,
    )
    publish.raise_for_status()
    return publish.json()["id"]
