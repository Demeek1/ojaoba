# ChatCommerce

A multi-tenant **chat-commerce platform**. Any vendor can plug in their
**WhatsApp / Telegram / Instagram** chatbot and connect their store
(**Shopify / WooCommerce-WordPress / manual**), and their customers browse and
order right inside the chat. You — the platform owner — onboard vendors, monitor
everything centrally, and bill them, while every vendor stays **fully isolated**
from every other.

> This is a standalone product. It lives in its own `chatcommerce/` folder and
> shares **no code** with the original OJAOBA marketplace in this repo.

---

## What it does

- **Vendors self-onboard** at `/signup`, get an isolated tenant + storefront at `/store/<their-handle>`.
- **Connect a channel** (`/dashboard/channels`): WhatsApp Cloud API, Telegram bot, or Instagram DM. Each gets its own secret webhook URL.
- **Connect a store** (`/dashboard/stores`): one-click import of products from Shopify or WooCommerce — or add products manually.
- **Customers order in chat**: the bot answers `menu`, `add 1`, `cart`, `checkout` and records the order.
- **Platform console** at `/admin` (platform owner only): live counts and GMV across every vendor, suspend/activate vendors.
- **Billing gate** (Stripe): vendors subscribe to go live.

## Security & isolation (by design)

| Concern | How it's handled |
|---|---|
| Vendor A seeing Vendor B's data | Two layers: every vendor query runs through a **tenant-scoped client** (`tenantDb`) that injects `tenant_id` from the **signed session** (never from request input), **and** Postgres **Row-Level Security** policies (`db/schema.sql`) that physically block cross-tenant rows. |
| Secret leakage (channel tokens, store keys) | **AES-256-GCM** encryption at rest (`src/lib/crypto.ts`). Plaintext secrets never touch the database and are never returned to the browser. |
| Webhook spoofing | Each channel webhook URL carries a per-channel secret, compared in constant time before any data is touched. |
| Session security | Signed (HS256) JWT in an **httpOnly, Secure, SameSite=Lax** cookie. |
| Transport / headers | HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy (`next.config.js`). |
| Scale | Serverless Postgres (Neon) with `tenant_id`-leading composite indexes; serverless functions on Vercel's edge network. |

## Tech

Next.js 14 (App Router) · TypeScript · Tailwind · Neon serverless Postgres ·
`jose` (JWT) · `bcryptjs` · Zod. Designed to deploy on **Vercel**.

## Local development

```bash
cd chatcommerce
cp .env.example .env.local      # fill in the values (see DEPLOY.md)
npm install
npm run db:setup                # creates tables + RLS in your Postgres
npm run dev                     # http://localhost:3000
```

Sign up with the email in `PLATFORM_OWNER_EMAIL` to get the platform-owner role
and access `/admin`.

## Deploying

See **[DEPLOY.md](./DEPLOY.md)** — a ~10-minute, click-by-click guide to going
live on Vercel + Neon.
