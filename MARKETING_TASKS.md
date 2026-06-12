# LocalIndia — Marketing Task List
> Ordered: minimum effort → hard build. Do one task at a time when you have time.
> Last updated: 2026-06-12 | AP ✅ | Telangana ✅ | Next seeding: Tamil Nadu

---

## SEEDING STATUS

| State | Lang | Cities | Status |
|-------|------|--------|--------|
| Andhra Pradesh | `te` | 10 cities | ✅ DONE |
| Telangana | `te` | 8 cities | ✅ DONE |
| Tamil Nadu | `ta` | 10 cities | ⏳ NEXT |
| Karnataka | `kn` | 9 cities | pending |
| Kerala | `ml` | 8 cities | pending |
| Maharashtra | `mr` | 6 cities | pending |
| Delhi + North | `hi` | 6 cities | pending |
| Gujarat + Rajasthan | `gu`/`hi` | pending | pending |
| West Bengal + Odisha | `bn`/`or` | pending | pending |

---

## TIER 1 — ZERO BUILD (just copy-paste, do in one sitting — ~45 mins total)

### Task 1 — Email YourStory + Inc42
**Time:** 5 min  
**File:** `agents/pr/yourstory_pitch.md`  
**Action:**
1. Open the file, copy the email body
2. Send to: editorial@yourstory.com
3. Send to: tips@inc42.com
4. Subject: "We built the free JustDial killer — WhatsApp-first, 8 languages, live in 20 cities"

---

### Task 2 — LinkedIn Short Post
**Time:** 5 min  
**File:** `agents/pr/linkedin_article.md` → "Short post" section  
**Action:**
1. Copy the "Caption" block from the file
2. Post it on your LinkedIn profile
3. Add 1-2 screenshots of the site (Hyderabad city page + listing detail)

---

### Task 3 — WhatsApp Broadcast to Personal Contacts
**Time:** 5 min  
**File:** `agents/pr/whatsapp_broadcast.md` → "Message 1"  
**Action:**
1. Copy Message 1 from the file
2. Send to your personal WhatsApp contacts list
3. Do NOT spam — send as a personal broadcast, not a group message

---

### Task 4 — Submit Sitemap to Google Search Console
**Time:** 10 min  
**Already verified:** Google Search Console is live (localsindia.com property verified)  
**Action:**
1. Go to: https://search.google.com/search-console
2. Select: localsindia.com property
3. Left menu → Sitemaps
4. Enter: `https://www.localsindia.com/sitemap.xml`
5. Click Submit
6. Wait 3-7 days for Google to crawl

---

### Task 5 — Set Razorpay Test Keys on Azure (for payment testing)
**Time:** 5 min  
**Already built:** Payment system is complete and ready  
**Action:**
1. Go to: Azure Portal → App Services → localsindia-backend
2. Settings → Configuration → Application settings
3. Add two new settings:
   - Name: `RAZORPAY_KEY_ID` | Value: `rzp_test_T0ltwVc0TJu3IW`
   - Name: `RAZORPAY_KEY_SECRET` | Value: `Df7NkAnvbLhsljtjKCSIKEzp`
4. Click Save → Continue (backend restarts)
5. Test at: `https://www.localsindia.com/hyderabad/classifieds/{any-listing-id}/promote`
6. Test card: `4111 1111 1111 1111`, any future expiry, any CVV

---

### Task 6 — Create Reddit Account
**Time:** 10 min  
**Action:**
1. Go to: https://www.reddit.com/register
2. Create account (use personal email)
3. Join subreddits: r/india, r/hyderabad, r/Andhra_Pradesh, r/startups, r/IndiaStartups
4. Wait 5-7 days before posting (new accounts flagged as spam)
5. Save credentials — needed for Task 11

---

### Task 7 — Drop WhatsApp Message in Local Groups
**Time:** 30 min  
**File:** `agents/pr/whatsapp_broadcast.md` → "WhatsApp Group Drop Message"  
**Action:**
1. Copy the "WhatsApp Group Drop Message" from the file
2. Replace `[CITY NAME]` with Hyderabad and `[CITY-SLUG]` with `hyderabad`
3. Drop in 5-10 groups:
   - Apartment/society WhatsApp groups
   - College alumni groups
   - Local business owner groups
   - Area groups (Kondapur, Madhapur, Gachibowli etc.)
   - Rotary/Lions Club groups if you have them

---

## TIER 2 — LIGHT WORK (I run it, you wait — ~1 hr total)

### Task 8 — Seed Tamil Nadu (Day 3)
**Time:** 30-45 min (runs in background)  
**Tell me:** "start Tamil Nadu seeding"  
**I will run:**
```powershell
cd C:\Users\rajes\localindia
$env:ANTHROPIC_API_KEY = "YOUR_KEY_FROM_agents/.env.agents"
$env:LOCALINDIA_ADMIN_PASSWORD = "YOUR_PASSWORD_FROM_agents/.env.agents"
$env:PYTHONIOENCODING = "utf-8"

python agents/city_launcher.py --city "Chennai" --lang "ta" --max-listings 20
python agents/city_launcher.py --city "Coimbatore" --lang "ta" --max-listings 20
python agents/city_launcher.py --city "Madurai" --lang "ta" --max-listings 20
python agents/city_launcher.py --city "Tiruchirappalli" --lang "ta" --max-listings 20
python agents/city_launcher.py --city "Salem" --lang "ta" --max-listings 20
python agents/city_launcher.py --city "Tirunelveli" --lang "ta" --max-listings 20
python agents/city_launcher.py --city "Vellore" --lang "ta" --max-listings 20
python agents/city_launcher.py --city "Erode" --lang "ta" --max-listings 20
python agents/city_launcher.py --city "Thoothukudi" --lang "ta" --max-listings 20
python agents/city_launcher.py --city "Dindigul" --lang "ta" --max-listings 20
```

---

### Task 9 — Seed Karnataka (Day 4)
**Time:** 30 min (runs in background)  
**Tell me:** "start Karnataka seeding"  
**Commands:**
```powershell
python agents/city_launcher.py --city "Bengaluru" --lang "kn" --max-listings 20
python agents/city_launcher.py --city "Mysuru" --lang "kn" --max-listings 20
python agents/city_launcher.py --city "Hubli" --lang "kn" --max-listings 20
python agents/city_launcher.py --city "Mangaluru" --lang "kn" --max-listings 20
python agents/city_launcher.py --city "Belagavi" --lang "kn" --max-listings 20
python agents/city_launcher.py --city "Kalaburagi" --lang "kn" --max-listings 20
python agents/city_launcher.py --city "Davanagere" --lang "kn" --max-listings 20
python agents/city_launcher.py --city "Ballari" --lang "kn" --max-listings 20
python agents/city_launcher.py --city "Shivamogga" --lang "kn" --max-listings 20
```

---

### Task 10 — Seed Kerala (Day 5)
**Time:** 25 min  
**Tell me:** "start Kerala seeding"  
```powershell
python agents/city_launcher.py --city "Thiruvananthapuram" --lang "ml" --max-listings 20
python agents/city_launcher.py --city "Kochi" --lang "ml" --max-listings 20
python agents/city_launcher.py --city "Kozhikode" --lang "ml" --max-listings 20
python agents/city_launcher.py --city "Thrissur" --lang "ml" --max-listings 20
python agents/city_launcher.py --city "Kollam" --lang "ml" --max-listings 20
python agents/city_launcher.py --city "Palakkad" --lang "ml" --max-listings 20
python agents/city_launcher.py --city "Alappuzha" --lang "ml" --max-listings 20
python agents/city_launcher.py --city "Kannur" --lang "ml" --max-listings 20
```

---

### Task 11 — Seed Maharashtra (Day 6)
**Time:** 20 min  
**Tell me:** "start Maharashtra seeding"  
```powershell
python agents/city_launcher.py --city "Mumbai" --lang "mr" --max-listings 20
python agents/city_launcher.py --city "Pune" --lang "mr" --max-listings 20
python agents/city_launcher.py --city "Nagpur" --lang "mr" --max-listings 20
python agents/city_launcher.py --city "Nashik" --lang "mr" --max-listings 20
python agents/city_launcher.py --city "Aurangabad" --lang "mr" --max-listings 20
python agents/city_launcher.py --city "Solapur" --lang "mr" --max-listings 20
```

---

### Task 12 — Seed Delhi + North India (Day 7)
**Time:** 20 min  
**Tell me:** "start Delhi seeding"  
```powershell
python agents/city_launcher.py --city "Delhi" --lang "hi" --max-listings 20
python agents/city_launcher.py --city "Noida" --lang "hi" --max-listings 20
python agents/city_launcher.py --city "Gurgaon" --lang "hi" --max-listings 20
python agents/city_launcher.py --city "Chandigarh" --lang "hi" --max-listings 20
python agents/city_launcher.py --city "Ludhiana" --lang "pa" --max-listings 20
python agents/city_launcher.py --city "Jaipur" --lang "hi" --max-listings 20
```

---

### Task 13 — Run Marketing Agents for Hyderabad
**Time:** 10 min  
**Tell me:** "run marketing agents Hyderabad"  
**I will run:**
```powershell
python agents/run_all.py --city "Hyderabad" --lang "te"
python agents/social_publisher.py --city "Hyderabad" --lang "te" --state "Telangana"
```
**Output:** `agents/output/hyderabad/` — SEO metadata, WA messages, Reddit draft, social posts  
**You then:** Post the Reddit draft to r/hyderabad

---

### Task 14 — Post Reddit r/hyderabad
**Time:** 5 min  
**Needs:** Task 6 (Reddit account) + Task 13 (generated content)  
**File:** `agents/output/hyderabad/reddit_posts_*.md` (generated by Task 13)  
**Action:**
1. Open the reddit post file
2. Post to r/hyderabad
3. Best time: Tuesday/Wednesday 8–10am IST
4. Reply to every comment within 1 hour

---

## TIER 3 — MEDIUM BUILD (I build, ~1-2 days each)

### Task 15 — WhatsApp Verified Badge (auto-mark on first WA click)
**Tell me:** "build WA verified badge"  
**What:** When buyer clicks WhatsApp on a listing → auto-set `wa_verified=true` on that listing  
**Impact:** Trust signal that JustDial structurally cannot copy  
**Build:** ~4 hours | Backend: `wa-click` endpoint sets `wa_verified=true` | Frontend: badge shows immediately

---

### Task 16 — "Notify Me" WA Subscriber System
**Tell me:** "build WA notify opt-in"  
**What:** Checkbox on post listing form: "Notify me when new listings appear in this category in my city"  
**Impact:** Builds WA broadcast list before Meta API is available  
**Build:** ~1 day | New DB table `category_subscribers` | Backend: subscribe/unsubscribe endpoint | Frontend: checkbox on post form

---

### Task 17 — Twitter/X Auto-Post on City Seed
**Tell me:** "build Twitter auto-post"  
**Needs:** Twitter Developer account (free) → API keys  
**What:** After each city_launcher.py run → auto-tweet "LocalsIndia is now live in [City]!"  
**Build:** ~4 hours | Add to `social_publisher.py` | Uses Twitter API v2

---

### Task 18 — LinkedIn Article Auto-Draft
**Tell me:** "build LinkedIn article Hyderabad"  
**What:** Run `content_writer.py` for each city → auto-formats as LinkedIn article  
**Output:** Ready-to-paste article per city — you just click publish  
**Build:** ~2 hours | New format in content_writer.py

---

### Task 19 — Google My Business Seeder Guide
**Tell me:** "build GMB guide"  
**What:** Auto-generate a PDF/doc per city with step-by-step GMB claim instructions  
**Impact:** When businesses claim their GMB, they link to LocalsIndia → SEO backlinks  
**Build:** ~4 hours | Python + jinja2 template → one PDF per city

---

## TIER 4 — HARD BUILD (major features, 2-5 days each)

### Task 20 — Reddit Auto-Post Agent
**Tell me:** "build Reddit auto-poster"  
**Needs:** Reddit account (Task 6) + API keys from reddit.com/prefs/apps  
**What:** `reddit_agent.py` stops being draft-only — actually posts to subreddits automatically  
**Build:** ~2 days | PRAW library | Rate limits | Subreddit rules compliance | Auto-schedule

---

### Task 21 — Medium/Blogger Auto-Publish
**Tell me:** "build Medium auto-publish"  
**What:** `content_writer.py` city blog output auto-posted to Medium  
**Impact:** Google indexes Medium posts quickly — backlinks to localsindia.com  
**Build:** ~2 days | Medium API (free, just needs token) | One blog post per city on seed

---

### Task 22 — "Category Followers" WA Broadcast
**Tell me:** "build WA category broadcast"  
**Needs:** Task 16 (subscriber list) + MSG91 DLT approval  
**What:** New listing in "tiffin + Hyderabad" → WA message to all Hyderabad tiffin subscribers  
**Impact:** Platform shifts from pull to push — retention multiplier  
**Build:** ~3 days | RQ/Celery job | MSG91 template | Unsubscribe link

---

### Task 23 — Business Analytics Dashboard
**Tell me:** "build business analytics"  
**What:** Business owners see: views last 30 days, WhatsApp clicks, reviews count, rating trend  
**Impact:** Reason to stay on platform — JustDial charges ₹5k/yr for same  
**Build:** ~3 days | analytics_events table | `/analytics/business/{id}` endpoint | Dashboard page

---

### Task 24 — Seller Referral Tracking + Leaderboard
**Tell me:** "build referral tracking"  
**What:** Invite links `?ref=USER_ID` → track who brought who → leaderboard page  
**Impact:** Gamifies growth — top inviters get Founding Member badge on profile  
**Build:** ~2 days | referrals table | invite link generation | leaderboard page

---

### Task 25 — ProductHunt Launch
**When:** After 500 active listings across 10+ cities  
**File:** `agents/pr/producthunt_launch.md` — full kit ready  
**Action:**
1. Create ProductHunt account
2. Schedule launch for a Tuesday at 12:01am PT (10:30am IST)
3. Post to Reddit + LinkedIn same day for cross-traffic
4. Ask 5-10 friends to upvote at launch time

---

## TIER 5 — BLOCKED ON YOU (external registrations)

### Task 26 — MSG91 DLT Registration (real OTP)
**Blocks:** Real SMS/WhatsApp OTP (currently mock — OTP shown on screen)  
**Steps:**
1. Register on Udyam portal: https://udyamregistration.gov.in (free, 20 min)
2. Use cert to register on DLT: https://vilpower.in
3. Register PE (Principal Entity) → get PE ID
4. Create Header: `LINDIA`
5. Create Template for OTP message
6. Set Azure env vars: `MSG91_AUTH_KEY` + `MSG91_TEMPLATE_ID`
7. Set `OTP_DEBUG=false` on Azure

---

### Task 27 — Google AdSense Approval
**Blocks:** Ad revenue on every page  
**Status:** AdSense code is built and ready — just needs PUB ID  
**Steps:**
1. Apply at: https://adsense.google.com
2. Add localsindia.com
3. Wait 1-2 weeks for review (site needs 20+ pages of content — you have 500+)
4. Once approved: get PUB ID (looks like `ca-pub-XXXXXXXXXXXXXXXXX`)
5. Set in Azure Static Web Apps: `NEXT_PUBLIC_ADSENSE_PUB_ID=ca-pub-XXXXXX`
6. Real ads go live immediately

---

### Task 28 — Razorpay Live Account (real payments)
**Blocks:** Real money from featured listings  
**Status:** Payment system fully built, test keys set  
**Steps:**
1. Complete KYC on Razorpay dashboard
2. Get live keys: `rzp_live_XXXXXX` (Key ID) + secret
3. Replace test keys on Azure with live keys
4. Unhide the "Promote Listing" button (remove comment in listing detail page)
5. Do this when you hit 1,000-5,000 users

---

### Task 29 — Meta Developer App (Facebook/Instagram auto-post)
**Blocks:** Auto-posting to Facebook Page + Instagram  
**Steps:**
1. Create Facebook Page for LocalsIndia
2. Create Instagram Business account (link to Facebook Page)
3. Go to: https://developers.facebook.com → Create App
4. App type: Business
5. Get Page Access Token
6. Tell me the App ID → I'll build the auto-post agent
7. Posts: city launch announcement + featured listing of the day

---

## QUICK REFERENCE — Commands

```powershell
# Env setup (every session)
cd C:\Users\rajes\localindia
$env:ANTHROPIC_API_KEY = "YOUR_KEY_FROM_agents/.env.agents"
$env:LOCALINDIA_ADMIN_PASSWORD = "YOUR_PASSWORD_FROM_agents/.env.agents"
$env:PYTHONIOENCODING = "utf-8"

# Seed a city
python agents/city_launcher.py --city "Chennai" --lang "ta" --max-listings 20

# Run all marketing agents for a city
python agents/run_all.py --city "Hyderabad" --lang "te"

# Generate social posts for a city
python agents/social_publisher.py --city "Hyderabad" --lang "te" --state "Telangana"

# Check growth stats
python agents/growth_tracker.py

# Run integration tests
python agents/test_integration.py
```

---

## LIVE URLS TO SHARE

- Homepage: https://www.localsindia.com
- Hyderabad: https://www.localsindia.com/hyderabad
- Vijayawada: https://www.localsindia.com/vijayawada
- Invite page: https://www.localsindia.com/invite
- Hyderabad launch: https://www.localsindia.com/hyderabad/launch
