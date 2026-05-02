# Ojaoba Deployment Guide

This guide walks you through deploying Ojaoba from your local machine to production.
Total time: ~30–45 minutes.

---

## Architecture Overview

```
WhatsApp Users → Meta Cloud API → Backend (Railway) → PostgreSQL (Neon)
                                        ↕
                              Shopify (product sync)
                              Paystack (payments)

Website visitors → Frontend (Vercel) → Backend (Railway)
Admin → /admin → Backend API
```

---

## Step 1: Database — Neon.tech (Free PostgreSQL)

1. Go to **https://neon.tech** and sign up (free)
2. Click **"New Project"**
   - Name: `ojaoba`
   - Region: pick closest to Nigeria (e.g. AWS eu-west-1)
3. Click **"Create project"**
4. Copy the **Connection string** — it looks like:
   ```
   postgresql://username:password@ep-xxx.eu-west-1.aws.neon.tech/neondb?sslmode=require
   ```
5. Save this as your `DATABASE_URL`

> **Note:** Tables are created automatically when the backend first starts.

---

## Step 2: Backend — Railway.app

1. Go to **https://railway.app** and sign up (free tier available)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
   - OR: **"Empty project"** → then use Railway CLI
3. If using GitHub:
   - Push the `ojaoba/` folder to a GitHub repo
   - Select the repo in Railway
   - Set **Root Directory** to `backend`
4. Add Environment Variables (click your service → Variables tab):

```
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...  (from Neon)

ADMIN_JWT_SECRET=your-very-long-random-secret-here-min-32-chars
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD=your-secure-password

PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxx

WA_PHONE_NUMBER_ID=123456789012345
WA_ACCESS_TOKEN=EAAxxxxxxxxxxxxx
WA_VERIFY_TOKEN=any-random-string-you-choose

SHOPIFY_STORE_DOMAIN=yourstore.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxx
SHOPIFY_WEBHOOK_SECRET=your-shopify-webhook-secret

BACKEND_URL=https://your-app.railway.app
SUPPORT_PHONE=2348012345678
SUPPORT_EMAIL=support@ojaoba.com
DELIVERY_FEE_KOBO=100000
```

5. Railway will build and deploy automatically
6. Note your backend URL: `https://your-app-name.railway.app`

---

## Step 3: Frontend — Vercel

1. Go to **https://vercel.com** and sign up
2. Click **"Add New Project"** → Import from GitHub
   - Set **Root Directory** to `frontend`
3. Add Environment Variables:

```
NEXT_PUBLIC_API_URL=https://your-app.railway.app/api
NEXT_PUBLIC_WA_NUMBER=2348012345678
NEXT_PUBLIC_SUPPORT_PHONE=2348012345678
```

4. Click **Deploy**
5. Your frontend will be live at `https://ojaoba.vercel.app` (or your custom domain)

---

## Step 4: Configure WhatsApp Webhook

1. Go to **https://developers.facebook.com** → your app → WhatsApp → Configuration
2. Set **Webhook URL**: `https://your-app.railway.app/api/whatsapp/webhook`
3. Set **Verify Token**: same value as `WA_VERIFY_TOKEN` in Railway
4. Click **"Verify and Save"**
5. Subscribe to **messages** webhook field

---

## Step 5: Configure Paystack Webhook

1. Go to **https://dashboard.paystack.com** → Settings → API Keys & Webhooks
2. Set **Webhook URL**: `https://your-app.railway.app/api/whatsapp/payment-callback`
3. Save

---

## Step 6: Sync Products from Shopify

1. Log in to admin panel: `https://ojaoba.vercel.app/admin`
2. Go to **Products** tab
3. Click **"Sync from Shopify"**
4. Wait for sync to complete (may take 1–2 minutes for large catalogs)

---

## Step 7: Test the WhatsApp Bot

1. Go to Meta Developer Dashboard → WhatsApp → API Setup
2. Under **"Step 1: Try it out"**, add your test phone number
3. Send a WhatsApp message to your business number
4. You should receive the welcome message from the bot!

---

## Custom Domain (Optional)

### Frontend (Vercel):
1. Vercel dashboard → your project → Settings → Domains
2. Add `ojaoba.com` and `www.ojaoba.com`
3. Update your DNS records as shown

### Backend (Railway):
1. Railway dashboard → your service → Settings → Networking → Custom Domain
2. Add `api.ojaoba.com`
3. Update your DNS
4. Update `NEXT_PUBLIC_API_URL` on Vercel to `https://api.ojaoba.com/api`
5. Update `BACKEND_URL` on Railway to `https://api.ojaoba.com`

---

## Environment Variables Quick Reference

### Backend (Railway)
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `ADMIN_JWT_SECRET` | Random 32+ char secret for JWT signing |
| `ADMIN_EMAIL` | Your admin login email |
| `ADMIN_PASSWORD` | Your admin login password |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (sk_live_...) |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key (pk_live_...) |
| `WA_PHONE_NUMBER_ID` | From Meta Developer Dashboard |
| `WA_ACCESS_TOKEN` | From Meta Developer Dashboard |
| `WA_VERIFY_TOKEN` | Any random string you choose |
| `SHOPIFY_STORE_DOMAIN` | yourstore.myshopify.com |
| `SHOPIFY_ACCESS_TOKEN` | From Shopify Admin API settings |
| `BACKEND_URL` | Your Railway backend URL |
| `DELIVERY_FEE_KOBO` | Delivery fee in kobo (100000 = ₦1000) |

### Frontend (Vercel)
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Your Railway backend URL + /api |
| `NEXT_PUBLIC_WA_NUMBER` | WhatsApp number (no + or spaces) |
| `NEXT_PUBLIC_SUPPORT_PHONE` | Support phone number |

---

## Troubleshooting

**Bot not responding to WhatsApp messages:**
- Check Railway logs for errors
- Verify webhook URL is correct in Meta dashboard
- Ensure `WA_VERIFY_TOKEN` matches on both Meta and Railway
- Check `WA_ACCESS_TOKEN` hasn't expired (permanent tokens don't expire)

**Products not syncing:**
- Verify `SHOPIFY_STORE_DOMAIN` is `yourstore.myshopify.com` (no https://)
- Check `SHOPIFY_ACCESS_TOKEN` has `read_products` scope
- Look at Railway logs for detailed error

**Payments not confirming:**
- Verify Paystack webhook URL is set correctly
- Check Railway logs for incoming webhook events
- Ensure `PAYSTACK_SECRET_KEY` is the live key (not test)

**Admin login not working:**
- Confirm `ADMIN_EMAIL` and `ADMIN_PASSWORD` match what you set
- Check Railway logs for startup errors
- The admin is seeded on first startup from env vars

---

## Keeping WhatsApp Access Token Fresh

The temporary token from Meta expires after 24 hours. To get a permanent token:

1. Meta Developer Dashboard → your app → WhatsApp → API Setup
2. Under "Step 2", click "Generate permanent access token"
3. Follow the prompts to create a System User
4. Update `WA_ACCESS_TOKEN` in Railway with the new token

---

*Built with Next.js, Express, PostgreSQL, Paystack, and Meta WhatsApp Business Cloud API.*
