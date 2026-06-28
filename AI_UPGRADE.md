# Ojaoba — AI Upgrade & Secure Admin

This release turns Ojaoba into an **AI-driven shopping experience** with a hardened,
role-based admin back office and a customer-behaviour dashboard — all in the existing
royal-market brand (deep purple `#2D0A4E` + gold `#F59E0B` + crown).

## 1. Adaeze — the on-site AI shopping assistant

A floating **"Ask Adaeze"** button (gold crown, bottom-right) opens a conversational
assistant on the storefront. Customers can shop three ways, whichever feels natural:

- **Type** — "I need palm oil, indomie and stockfish" → she finds them.
- **Select** — tap quick-reply chips (categories, "What's popular?", "Checkout").
- **Swipe** — she replies with a row of swipeable product cards; one tap adds to cart.

She understands Nigerian food culture and misspellings (ponmo, egusi, garri…), keeps
replies short and warm, and drives the customer smoothly to checkout. The cart is shared
with the main store, so anything she adds appears in the normal cart instantly.

**How it works:** `POST /api/ai/chat` runs Claude with tool-use over the live catalogue
(`search_products`, `browse_category`, `popular_items`, `list_categories`).
- Model is configurable via `ASSISTANT_MODEL` (default `claude-haiku-4-5`).
- **Graceful fallback:** with no `ANTHROPIC_API_KEY` it still works via keyword search.

## 2. Secure, role-based admin (no loopholes)

- **Roles:** `owner` (full, protected), `admin`, `manager`, `staff`.
- **Granular permissions:** manage staff, products, orders, sessions, broadcasts,
  analytics, settings. Roles set sensible defaults; each can be fine-tuned per person.
- **Every request re-checks the database** — deactivating an account or revoking a
  permission takes effect immediately, even on an unexpired token.
- The seeded `ADMIN_EMAIL` account is always the protected **owner** (cannot be demoted,
  deactivated or deleted). Only the owner can mint owner/admin accounts.
- Guard rails prevent self-lockout (you can't deactivate/delete your own account).

### Activity Log (audit trail)
Every privileged action — logins (success/failed), staff created/updated/deleted,
password changes — is written to `audit_log` with actor, target, IP and timestamp, and
shown in **Admin → Activity Log**.

## 3. Customer behaviour dashboard

**Admin → Customer Insights** visualises how shoppers behave (7/30/90-day windows):

- KPI cards: visitors, product views, add-to-cart, overall conversion.
- **Conversion funnel:** views → cart → checkout → purchase, with step rates.
- Daily activity, most-viewed products, top search terms.
- **AI engagement** (conversations & messages) and device split.

Data comes from anonymous, privacy-friendly events (`/api/track`, random session id, no
PII) emitted by the storefront and the AI assistant.

## New endpoints

| Method | Route | Access |
| --- | --- | --- |
| POST | `/api/ai/chat` | public (rate-limited) |
| POST | `/api/track` | public (rate-limited, anonymous) |
| GET/POST/PATCH/DELETE | `/api/admin/staff[...]` | `manage_staff` |
| GET | `/api/admin/audit` | `manage_staff` |
| GET | `/api/admin/behavior` | `view_analytics` |
| POST | `/api/admin/change-password` | any admin |

## New env vars (see `backend/.env.example`)

```
ANTHROPIC_API_KEY=   # enables full AI assistant (optional but recommended)
ASSISTANT_MODEL=claude-haiku-4-5
GROQ_API_KEY=        # optional, WhatsApp voice transcription
```

## Database

New/extended tables are created idempotently on boot (`setupDatabase`):
`admins` (+ `role`, `permissions`, `active`, `last_login`, `created_by`),
`audit_log`, `web_events`, `ai_conversations`.
