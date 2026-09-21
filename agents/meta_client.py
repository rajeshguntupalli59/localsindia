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


def _raise_for_status(resp: httpx.Response) -> None:
    """raise_for_status(), but print Meta's error body first (it holds the real reason for a 400)."""
    if resp.is_error:
        print(f"[MetaClient] {resp.request.method} {resp.request.url.path} -> {resp.status_code}: {resp.text[:1000]}")
    resp.raise_for_status()


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
    _raise_for_status(resp)
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
    _raise_for_status(resp)
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
    _raise_for_status(resp)
    return resp.json()["id"]


def _ig_jpeg_url(image_url: str) -> str:
    """Ask Cloudinary for a JPEG rendition — Instagram officially supports only JPEG, and
    fetching our PNGs failed intermittently (error 9004/2207052, "media could not be fetched")."""
    if "res.cloudinary.com" in image_url and "/upload/" in image_url:
        return image_url.replace("/upload/", "/upload/f_jpg,q_90/", 1)
    return image_url


def _ig_create_and_publish(image_url: str, access_token: str, ig_id: str, media_type: str = None, caption: str = None) -> str:
    jpeg_url = _ig_jpeg_url(image_url)
    # Cloudinary builds a rendition on its first request; if Instagram is the first to ask it can
    # time out mid-build and report "media could not be fetched". Fetch it once ourselves so it's
    # built and cached before Instagram downloads it.
    try:
        httpx.get(jpeg_url, timeout=60.0, follow_redirects=True).raise_for_status()
    except httpx.HTTPError as e:
        print(f"[MetaClient] Image pre-warm failed ({e}); continuing anyway")
    data = {"image_url": jpeg_url, "access_token": access_token}
    if media_type:
        data["media_type"] = media_type
    if caption:
        data["caption"] = caption

    create = httpx.post(f"{GRAPH_API}/{ig_id}/media", data=data, timeout=30.0)
    if create.status_code == 400 and '"error_subcode":2207052' in create.text:
        # Instagram couldn't download the image yet — give the CDN a moment and try once more.
        print("[MetaClient] Instagram could not fetch the image; retrying once in 10s")
        time.sleep(10)
        create = httpx.post(f"{GRAPH_API}/{ig_id}/media", data=data, timeout=30.0)
    _raise_for_status(create)
    creation_id = create.json()["id"]

    # Instagram needs a moment to process the media before it can be published.
    time.sleep(5)

    publish = httpx.post(
        f"{GRAPH_API}/{ig_id}/media_publish",
        data={"creation_id": creation_id, "access_token": access_token},
        timeout=30.0,
    )
    _raise_for_status(publish)
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
    _raise_for_status(resp)
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
    _raise_for_status(create)
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
        _raise_for_status(status)
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
    _raise_for_status(publish)
    return publish.json()["id"]
