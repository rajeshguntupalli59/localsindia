# LocalIndia â€” Account Setup Guide
> Complete these 4 accounts before starting the build. Each takes 5-15 minutes.

---

## 1. MSG91 â€” Phone OTP (Indian SMS)

**Cost:** Rs.0.20/OTP, pay-as-you-go. No monthly fee.
**Free trial:** Yes â€” MSG91 gives free credits on signup.

### Steps
1. Go to **msg91.com** â†’ click "Sign Up Free"
2. Register with your email (queryoptimizer78@gmail.com)
3. Verify phone number (your Indian mobile)
4. Dashboard â†’ **"OTP"** section in left sidebar
5. Click **"Add Template"** â†’ create OTP template:
   ```
   Template name: LocalIndia OTP
   Template body: Your LocalIndia OTP is ##OTP##. Valid for 10 minutes. Do not share.
   ```
6. Submit for DLT approval (takes 1-24 hours for transactional SMS)
7. Go to **"API"** â†’ copy your **Auth Key** (looks like: `12345ABC6789DE`)
8. Go to OTP â†’ **Template ID** (looks like: `6123abc456def789`)

### What to put in .env
```bash
MSG91_AUTH_KEY=<your auth key from step 7>
MSG91_TEMPLATE_ID=<your template id from step 8>
```

### Note: Mock mode available
The backend is built with a mock mode â€” if MSG91_AUTH_KEY is not set, OTPs are printed to the server console instead of sent via SMS. This means Day 1 development works without a MSG91 account.

---

## 2. Cloudinary â€” Image CDN

**Cost:** Free tier = 25GB storage + 25GB bandwidth/month. More than enough for Phase 1.

### Steps
1. Go to **cloudinary.com** â†’ "Sign Up for Free"
2. Register with Google (use queryoptimizer78@gmail.com)
3. After login â†’ **Dashboard** shows your credentials immediately:
   - **Cloud Name** (e.g., `dxyz12abc`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcDEF_ghiJKL-mnoPQR`)
4. Go to **Settings â†’ Upload** â†’ scroll to "Upload presets"
5. Click **"Add upload preset"**:
   ```
   Preset name: localindia_listings
   Signing mode: Unsigned  (allows direct browser upload)
   Folder: localindia/listings
   Allowed formats: jpg, jpeg, png, webp
   Max file size: 5MB
   ```
6. Save preset â†’ copy the **Preset Name**

### What to put in .env
```bash
CLOUDINARY_CLOUD_NAME=<your cloud name from step 3>
CLOUDINARY_API_KEY=<your api key from step 3>
CLOUDINARY_API_SECRET=<your api secret from step 3>
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<same cloud name>
```

---

## 3. Google OAuth — REMOVED 2026-10-25

Not used. LocalIndia logs in with phone OTP (signup) + phone/password only; the Google sign-in code and settings were deleted.

---

## 4. Azure — Deployment

**Already live.** Resource group: `localsindia-rg` (East Asia region).

| Resource | Name | Purpose |
|---|---|---|
| App Service | `localsindia-backend` | FastAPI backend (B1 plan) |
| Static Web App | `localsindia-web` | Next.js frontend (Free tier) |
| PostgreSQL Flexible Server | `localsindia-db` | Database (Standard_B1ms) |

### CI/CD (automatic)
Push to `master` → GitHub Actions triggers two workflows:
- Backend → Azure App Service via zip deploy
- Frontend → Azure SWA via `azure/static-web-apps-deploy`

### Env vars
Azure Portal → App Service `localsindia-backend` → Configuration → Application settings.

### Domain
- `www.localsindia.com` → CNAME → Azure SWA (GoDaddy DNS) ✅
- Apex `localsindia.com` → forwarded to `www` ✅

---

## 5. GitHub Repo

```bash
# Run this from C:\Users\rajes\ (not inside localindia folder)
cd C:\Users\rajes
git init localindia
cd localindia
git add .
git commit -m "Initial project setup â€” architecture, CLAUDE.md, build plan, skill files"
```

Then on github.com â†’ New Repository â†’ name: `localindia` â†’ private â†’ don't init
```bash
git remote add origin https://github.com/rajeshguntupalli59/localindia.git
git branch -M main
git push -u origin main
```

---

## Day 1 Build Order (tomorrow)

You can start building **without** MSG91 or Cloudinary being set up.
The backend builds mock modes for both:

| Account | Needed by | Mock available? |
|---|---|---|
| MSG91 | Week 1-2 auth tests | Yes â€” OTP printed to console |
| Cloudinary | Week 2-3 image upload | Yes â€” saves to local /tmp instead |
| Azure | LIVE — App Service + SWA + PostgreSQL | Already configured |

**Start building today** with `docker-compose up -d` â€” zero accounts needed for Week 1-2.

