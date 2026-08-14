# AI-generated marketing images

Generated via ComfyUI (SD1.5) running on a free Google Colab T4 GPU, driven
directly through ComfyUI's REST API (`/prompt`, `/history`, `/view`) — not
part of any automated pipeline, since Colab requires a manual browser
session and isn't reachable by the scheduled GitHub Actions workflows.

768x768 source images, no text/branding baked in — `meta_poster.py` /
`ecosystem_poster.py` (or manual video edits) still need to composite the
logo/headline/CTA on top, same as with the existing CSS/SVG card pipeline.

| File | Topic |
|---|---|
| `city_spotlight_market.png` | City spotlight — street market scene |
| `city_spotlight_coastal.png` | City spotlight — coastal fish market |
| `city_temple_town.png` | City spotlight — temple town at golden hour |
| `city_tech_hub.png` | City spotlight — modern skyline at dusk |
| `app_promo.png` | App install poster — phone mockup over a street market |
| `app_whatsapp_direct.png` | Feature — WhatsApp chat on phone |
| `category_tiffin.png` | Category — home-cooked tiffin spread |
| `category_pg_room.png` | Category — PG room interior |
| `category_jobs.png` | Category — local shop owner |
| `category_bikes.png` | Category — second-hand bikes/scooters |
| `category_events.png` | Category — community festival gathering |
| `category_electronics.png` | Category — second-hand electronics |
| `safety_trust.png` | Safety/trust — phone handoff, friendly chat |
| `community_neighbors.png` | Community — neighbors on a residential street |
| `festival_marketplace.png` | Seasonal — flower/festival marketplace |
| `referral_friends_1.png` | Referral — friends looking at a phone |
| `referral_friends_2.png` | Referral — group sharing a phone, laughing |

Four finished promo videos (built from these + real Play Store screenshots
+ royalty-free music via ffmpeg) were delivered directly to the founder,
not committed here (large binaries, not needed by any script).
