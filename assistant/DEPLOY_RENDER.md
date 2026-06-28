# Deploying the Ojaoba Assistant on Render (same repo)

The assistant is a **frontend-only** app. It reuses your existing Render backend,
database and Paystack — you do **not** create a new database or re-enter secrets.
You deploy it as a second Render service that points at the `assistant/` folder of
this same repo.

---

## Step 1 — Get the new code live (one-time)
Merge the feature branch into the branch Render deploys (usually `master`/`main`).
Render will auto-redeploy your **existing backend**, which adds the two endpoints the
assistant needs: `POST /api/ai/chat` and `POST /api/track`. (No data is touched.)

Optional but recommended — on your **existing backend** service, add:
- `ANTHROPIC_API_KEY` = your Anthropic key  → makes Adaeze fully smart.
  (Without it she still works using keyword search.)
- `ASSISTANT_MODEL` = `claude-haiku-4-5` (optional; this is the default)

## Step 2 — Create the assistant web service
Render Dashboard → **New +** → **Web Service** → connect this same repo.

| Setting | Value |
| --- | --- |
| **Root Directory** | `assistant` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start` |
| **Branch** | the one you merged into (e.g. `master`) |

## Step 3 — Environment variables (all 3 are values you already have)
Add these to the new service (copy them from what you already use):

| Var | Paste in |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | the **same** backend URL your storefront uses, e.g. `https://ojaoba-backend.onrender.com/api` |
| `NEXT_PUBLIC_STORE_URL` | your storefront URL, e.g. `https://www.ojaba.com` |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | the **same** Paystack public key you already use |

> Note: `NEXT_PUBLIC_*` values are baked in at build time. If you change one later,
> trigger a redeploy.

## Step 4 — Domain
In the new service → **Settings → Custom Domains** → add e.g. `chat.ojaba.com`,
then add the CNAME it shows you at your DNS provider. Done.

---

### That's it
- ✅ No new database
- ✅ No new backend
- ✅ Same Paystack, same secrets
- ✅ Its own URL, deploys & scales independently

Everything is wired to the backend you already run on Render.
