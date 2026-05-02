# Ojaoba — Quick Setup (5 minutes)

Everything is built and ready. You just need to fill in 4 sets of credentials.

---

## Step 1: Get a FREE Database (2 minutes)

1. Go to **https://neon.tech** → Sign up free (Google/GitHub)
2. Click **"New Project"** → Name it `ojaoba` → Create
3. On the dashboard, copy the **Connection string** (looks like `postgresql://...`)
4. Open `backend/.env` and replace line 11:
   ```
   DATABASE_URL=postgresql://your-copied-string-here
   ```

---

## Step 2: Fill in your Paystack keys

You already have these. Open `backend/.env` and fill in:
```
PAYSTACK_SECRET_KEY=sk_live_xxxxxx   ← your live secret key
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxx   ← your live public key
```

---

## Step 3: Fill in WhatsApp (Meta)

From your Meta Developer Dashboard → WhatsApp → API Setup:
```
WA_PHONE_NUMBER_ID=123456789012345   ← the number shown
WA_ACCESS_TOKEN=EAAxxxxxxxxxx        ← click "Generate token"
```

---

## Step 4: Fill in Shopify

From Shopify Admin → Settings → Apps → Develop apps → your app → API credentials:
```
SHOPIFY_STORE_DOMAIN=yourstore.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxx
```

---

## Run locally

Double-click **`start-dev.bat`** — opens both servers automatically.

Or manually:
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

- Website: http://localhost:3000
- Admin:   http://localhost:3000/admin  (login with ADMIN_EMAIL/ADMIN_PASSWORD from .env)
- API:     http://localhost:4000/api

---

## Deploy to production → See DEPLOYMENT.md
