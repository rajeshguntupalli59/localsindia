# LocalIndia — Account Setup Guide
> Complete these 4 accounts before starting the build. Each takes 5-15 minutes.

---

## 1. MSG91 — Phone OTP (Indian SMS)

**Cost:** Rs.0.20/OTP, pay-as-you-go. No monthly fee.
**Free trial:** Yes — MSG91 gives free credits on signup.

### Steps
1. Go to **msg91.com** → click "Sign Up Free"
2. Register with your email (queryoptimizer78@gmail.com)
3. Verify phone number (your Indian mobile)
4. Dashboard → **"OTP"** section in left sidebar
5. Click **"Add Template"** → create OTP template:
   ```
   Template name: LocalIndia OTP
   Template body: Your LocalIndia OTP is ##OTP##. Valid for 10 minutes. Do not share.
   ```
6. Submit for DLT approval (takes 1-24 hours for transactional SMS)
7. Go to **"API"** → copy your **Auth Key** (looks like: `12345ABC6789DE`)
8. Go to OTP → **Template ID** (looks like: `6123abc456def789`)

### What to put in .env
```bash
MSG91_AUTH_KEY=<your auth key from step 7>
MSG91_TEMPLATE_ID=<your template id from step 8>
```

### Note: Mock mode available
The backend is built with a mock mode — if MSG91_AUTH_KEY is not set, OTPs are printed to the server console instead of sent via SMS. This means Day 1 development works without a MSG91 account.

---

## 2. Cloudinary — Image CDN

**Cost:** Free tier = 25GB storage + 25GB bandwidth/month. More than enough for Phase 1.

### Steps
1. Go to **cloudinary.com** → "Sign Up for Free"
2. Register with Google (use queryoptimizer78@gmail.com)
3. After login → **Dashboard** shows your credentials immediately:
   - **Cloud Name** (e.g., `dxyz12abc`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcDEF_ghiJKL-mnoPQR`)
4. Go to **Settings → Upload** → scroll to "Upload presets"
5. Click **"Add upload preset"**:
   ```
   Preset name: localindia_listings
   Signing mode: Unsigned  (allows direct browser upload)
   Folder: localindia/listings
   Allowed formats: jpg, jpeg, png, webp
   Max file size: 5MB
   ```
6. Save preset → copy the **Preset Name**

### What to put in .env
```bash
CLOUDINARY_CLOUD_NAME=<your cloud name from step 3>
CLOUDINARY_API_KEY=<your api key from step 3>
CLOUDINARY_API_SECRET=<your api secret from step 3>
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<same cloud name>
```

---

## 3. Google OAuth — Sign in with Google

**Cost:** Free.

### Steps
1. Go to **console.cloud.google.com**
2. Click **"New Project"** → name it `LocalIndia` → Create
3. Left sidebar → **"APIs & Services"** → **"OAuth consent screen"**
4. Choose **External** → Fill:
   ```
   App name: LocalIndia
   User support email: queryoptimizer78@gmail.com
   Developer contact: queryoptimizer78@gmail.com
   ```
5. Scopes: click "Add or remove scopes" → add `.../auth/userinfo.email` and `.../auth/userinfo.profile`
6. Test users: add your own Gmail for testing
7. Left sidebar → **"Credentials"** → **"+ Create Credentials"** → **"OAuth client ID"**
8. Application type: **Web application**
9. Name: `LocalIndia Web`
10. Authorized redirect URIs — add ALL of these:
    ```
    http://localhost:3000/api/auth/callback/google
    http://localhost:8000/api/v1/auth/google/callback
    https://localindia.in/api/v1/auth/google/callback
    https://api.localindia.in/api/v1/auth/google/callback
    ```
11. Click **Create** → a popup shows:
    - **Client ID** (ends in `.apps.googleusercontent.com`)
    - **Client Secret**

### What to put in .env
```bash
GOOGLE_CLIENT_ID=<client id from step 11>
GOOGLE_CLIENT_SECRET=<client secret from step 11>
```

---

## 4. Railway — Deployment

**Cost:** Free hobby plan (512MB RAM, 1GB disk). Upgrade to $5/month Pro when you need more.

### Steps
1. Go to **railway.app** → "Login with GitHub"
2. Click **"New Project"** → "Empty Project"
3. Name it `localindia`
4. Add services (do this when ready to deploy, not now):
   - **Add Service** → "Database" → PostgreSQL (Railway manages it)
   - **Add Service** → "GitHub Repo" → select your localindia repo → service name: `backend`
   - **Add Service** → "GitHub Repo" → same repo → service name: `frontend`
5. For each service → **Variables** tab → add all env vars from ARCHITECTURE.md
6. Railway auto-generates domain: `localindia-backend.up.railway.app`

### Custom domain (after deploy)
1. Frontend service → Settings → Domains → "Add Custom Domain"
2. Enter: `localindia.in`
3. Railway gives you DNS records → add them in your domain registrar

---

## 5. GitHub Repo

```bash
# Run this from C:\Users\rajes\ (not inside localindia folder)
cd C:\Users\rajes
git init localindia
cd localindia
git add .
git commit -m "Initial project setup — architecture, CLAUDE.md, build plan, skill files"
```

Then on github.com → New Repository → name: `localindia` → private → don't init
```bash
git remote add origin https://github.com/rajeshguntupalli59/localindia.git
git branch -M main
git push -u origin main
```

---

## Day 1 Build Order (tomorrow)

You can start building **without** MSG91, Cloudinary, or Google OAuth being set up.
The backend builds mock modes for all three:

| Account | Needed by | Mock available? |
|---|---|---|
| MSG91 | Week 1-2 auth tests | Yes — OTP printed to console |
| Cloudinary | Week 2-3 image upload | Yes — saves to local /tmp instead |
| Google OAuth | Week 1-2 auth tests | Yes — skip OAuth in test env |
| Railway | Week 5-6 deploy | N/A — local docker-compose works |

**Start building today** with `docker-compose up -d` — zero accounts needed for Week 1-2.
