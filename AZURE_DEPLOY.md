# Azure Deployment Guide — localsindia.com

Everything is pre-configured. Follow these steps in order when ready to deploy.

---

## Pre-requisites (do once)
- [ ] Azure free account created at portal.azure.com
- [ ] GitHub repo created and code pushed (`git push origin main`)
- [ ] Azure CLI installed: `winget install Microsoft.AzureCLI`

---

## Step 1 — Login to Azure CLI
```bash
az login
az account show   # confirm your subscription
```

---

## Step 2 — Create Resource Group
```bash
az group create --name localsindia-rg --location eastasia
```
> eastasia = Singapore — closest to India, lowest latency

---

## Step 3 — Create PostgreSQL Database (FREE 12 months)
```bash
az postgres flexible-server create \
  --resource-group localsindia-rg \
  --name localsindia-db \
  --location eastasia \
  --admin-user localsindia_admin \
  --admin-password "YourStrongPassword123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --public-access 0.0.0.0

az postgres flexible-server db create \
  --resource-group localsindia-rg \
  --server-name localsindia-db \
  --database-name localsindia
```

Save the connection string:
```
postgresql+asyncpg://localsindia_admin:YourStrongPassword123!@localsindia-db.postgres.database.azure.com/localsindia
```

---

## Step 4 — Create Backend App Service (FREE F1 tier)
```bash
az appservice plan create \
  --name localsindia-plan \
  --resource-group localsindia-rg \
  --sku F1 \
  --is-linux

az webapp create \
  --name localsindia-api \
  --resource-group localsindia-rg \
  --plan localsindia-plan \
  --runtime "PYTHON:3.12"
```

Set environment variables:
```bash
az webapp config appsettings set \
  --name localsindia-api \
  --resource-group localsindia-rg \
  --settings \
    DATABASE_URL="postgresql+asyncpg://localsindia_admin:YourStrongPassword123!@localsindia-db.postgres.database.azure.com/localsindia" \
    SECRET_KEY="<generate: python -c 'import secrets; print(secrets.token_hex(32))'>" \
    FRONTEND_URL="https://localsindia.com" \
    MSG91_AUTH_KEY="" \
    CLOUDINARY_CLOUD_NAME="" \
    CLOUDINARY_API_KEY="" \
    CLOUDINARY_API_SECRET="" \
    GOOGLE_CLIENT_ID="" \
    GOOGLE_CLIENT_SECRET="" \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true \
    STARTUP_COMMAND="python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
```

---

## Step 5 — Create Frontend Static Web App (FREE forever)
```bash
az staticwebapp create \
  --name localsindia-web \
  --resource-group localsindia-rg \
  --location eastasia \
  --sku Free
```

Get the deploy token (needed for GitHub Actions):
```bash
az staticwebapp secrets list \
  --name localsindia-web \
  --resource-group localsindia-rg \
  --query "properties.apiKey" -o tsv
```

---

## Step 6 — Add GitHub Secrets
Go to your GitHub repo → Settings → Secrets → Actions, add:

| Secret Name | Value |
|-------------|-------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | token from Step 5 |
| `AZURE_CREDENTIALS` | output of `az ad sp create-for-rbac` (see below) |
| `NEXT_PUBLIC_API_URL` | `https://localsindia-api.azurewebsites.net` |

Get AZURE_CREDENTIALS:
```bash
az ad sp create-for-rbac \
  --name localsindia-deploy \
  --role contributor \
  --scopes /subscriptions/<your-subscription-id>/resourceGroups/localsindia-rg \
  --sdk-auth
```
Paste the entire JSON output as the `AZURE_CREDENTIALS` secret.

---

## Step 7 — Run Database Migrations
```bash
# Connect to Azure Postgres and run migrations
cd backend
$env:DATABASE_URL="postgresql+asyncpg://localsindia_admin:YourStrongPassword123!@localsindia-db.postgres.database.azure.com/localsindia"
python -m alembic upgrade head
python scripts/seed_cities.py
python scripts/seed_categories.py
```

> Allow your local IP in Azure Postgres firewall first:
> `az postgres flexible-server firewall-rule create --resource-group localsindia-rg --name localsindia-db --rule-name allow-local --start-ip-address <your-ip> --end-ip-address <your-ip>`

---

## Step 8 — Push to GitHub (triggers auto-deploy)
```bash
git add .
git commit -m "chore: add Azure deployment config"
git push origin main
```

GitHub Actions will:
- Build and deploy backend to `localsindia-api.azurewebsites.net`
- Build and deploy frontend to `localsindia-web.azurestaticapps.net`

---

## Step 9 — Point localsindia.com DNS to Azure

In your domain registrar (where you bought localsindia.com):

| Type | Name | Value |
|------|------|-------|
| CNAME | `@` or `www` | `localsindia-web.azurestaticapps.net` |
| CNAME | `api` | `localsindia-api.azurewebsites.net` |

Then add the custom domain in Azure:
```bash
az staticwebapp hostname set \
  --name localsindia-web \
  --resource-group localsindia-rg \
  --hostname localsindia.com

az webapp config hostname add \
  --webapp-name localsindia-api \
  --resource-group localsindia-rg \
  --hostname api.localsindia.com
```

---

## Step 10 — Verify Everything Works
- [ ] `https://localsindia-api.azurewebsites.net/api/v1/health` → `{"status":"ok"}`
- [ ] `https://localsindia-web.azurestaticapps.net` → city selector loads
- [ ] `https://localsindia.com` → live site (after DNS propagates, 30 min)
- [ ] `https://api.localsindia.com/api/v1/health` → live API

---

## Costs After Free Tier Expires (12 months)

| Service | Monthly Cost |
|---------|-------------|
| PostgreSQL B1ms | ~Rs.1,500 |
| App Service F1 | Free forever |
| Static Web Apps | Free forever |
| **Total** | **~Rs.1,500/mo** |

Upgrade App Service to B1 (~Rs.1,200/mo) only when you have paying users.

---

## Environment Variables Reference

```env
# Required
DATABASE_URL=postgresql+asyncpg://...
SECRET_KEY=<64-char hex string>
FRONTEND_URL=https://localsindia.com

# Optional (mock mode works without these)
MSG91_AUTH_KEY=
MSG91_TEMPLATE_ID=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```
