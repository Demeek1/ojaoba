# Deploy ChatCommerce to Vercel (live in ~10 minutes)

You'll need two free accounts: **Neon** (Postgres) and **Vercel** (hosting).
Everything below is click-by-click.

---

## Step 1 — Create the database (Neon)

1. Go to **https://neon.tech** → sign up → **New Project**.
2. Name it `chatcommerce`, pick a region close to your customers, **Create**.
3. Copy the **connection string** (looks like
   `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`).
   Keep it — it's your `DATABASE_URL`.

## Step 2 — Generate your secrets

Run these locally (or use any random generator) and keep the output:

```bash
openssl rand -base64 48   # → AUTH_SECRET
openssl rand -base64 32   # → ENCRYPTION_KEY  (must be exactly 32 bytes)
```

> ⚠️ Keep `ENCRYPTION_KEY` safe and never change it after vendors store secrets —
> it's the key that decrypts their channel/store tokens.

## Step 3 — Create the tables

From your machine, with the Neon URL:

```bash
cd chatcommerce
npm install
DATABASE_URL="postgresql://...your neon url..." npm run db:setup
```

You should see `✅ Schema applied`. (You can also paste `db/schema.sql` into
Neon's SQL editor and run it.)

## Step 4 — Deploy on Vercel

1. Push this repo to GitHub (the `chatcommerce/` folder must be included).
2. Go to **https://vercel.com/new** → **Import** your repo.
3. **IMPORTANT:** set **Root Directory** to `chatcommerce`.
   Vercel auto-detects Next.js — leave build/output settings as default.
4. Open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | your Neon connection string |
   | `AUTH_SECRET` | the 48-byte secret from Step 2 |
   | `ENCRYPTION_KEY` | the 32-byte secret from Step 2 |
   | `PLATFORM_OWNER_EMAIL` | your email (becomes the super-admin) |
   | `NEXT_PUBLIC_APP_URL` | leave blank for now, fill after first deploy |

   Optional (only if you want to charge vendors right away):
   `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `BILLING_ENFORCED=true`.

5. Click **Deploy**. After it finishes you'll get a URL like
   `https://chatcommerce-xxxx.vercel.app`.
6. Go back to **Settings → Environment Variables**, set
   `NEXT_PUBLIC_APP_URL` to that URL, and **Redeploy** (so vendor webhook URLs
   are generated correctly).

## Step 5 — Make yourself the platform owner

Open your live site → `/signup` → register with the **exact** email you put in
`PLATFORM_OWNER_EMAIL`. You'll be dropped into `/admin`, the platform console.
Everyone else who signs up is a normal, isolated vendor.

## Step 6 — Verify

- `GET /api/health` → `{ "ok": true, "db": "up" }`
- Sign up a test vendor → connect a Telegram bot (token from @BotFather) →
  in your dashboard copy the webhook URL → register it with Telegram:
  ```
  https://api.telegram.org/bot<token>/setWebhook?url=<the webhook URL shown in the dashboard>
  ```
  Message your bot `menu`.

---

## Connecting each channel (what vendors paste)

- **WhatsApp** (Meta Cloud API): in Meta's app → WhatsApp → Configuration, set the
  Callback URL to the dashboard's webhook URL and the Verify Token to the value
  the vendor entered. Provide the access token + phone number ID in the dashboard.
- **Telegram**: create a bot via **@BotFather**, paste the token, then call
  `setWebhook` (above) with the dashboard URL.
- **Instagram**: connect via Meta (Instagram messaging), Callback URL = dashboard
  webhook URL, paste the page access token + verify token.

## Notes for scale & reliability

- Neon autoscales and supports connection pooling; the app uses the serverless
  driver, so it fits Vercel's per-request function model.
- Webhooks always return `200` to providers (so they don't disable the
  subscription) and fail safe — an unknown/forged URL touches no data.
- Move to Neon's paid tier (or add read replicas) as vendor count grows; the
  schema's `tenant_id`-leading indexes are built for it.
