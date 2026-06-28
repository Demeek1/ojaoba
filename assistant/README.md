# Ojaoba Assistant 👑

A **standalone, conversational AI shopping website** for Ojaoba — meet **Adaeze**,
who lets customers shop entirely by chatting (like ChatGPT / WhatsApp). It is a
fully separate app from the main storefront: its own project, its own deploy, its
own domain (e.g. `chat.ojaba.com`). It talks to the shared Ojaoba backend for the
AI brain, products and orders.

## What it does
- Full-screen chat UI with conversation history (saved on the device) and "New chat".
- Adaeze answers questions, finds products, plans meals, and drops in **tappable
  product cards** + quick-reply chips.
- Self-contained **cart and checkout** (Paystack) — customers can complete an order
  without leaving the assistant.
- Mobile (WhatsApp-style) and desktop (ChatGPT-style) layouts.
- Anonymous behaviour tracking feeds the main admin "Customer Insights" dashboard.

## Architecture
This app is **frontend-only**. It calls the existing Ojaoba backend API:
- `POST /api/ai/chat` — the conversational assistant (Claude tool-use over the catalogue)
- `POST /api/track` — anonymous behaviour events
- `POST /api/whatsapp/orders`, `/orders/verify`, `/whatsapp/profile` — checkout

No backend code is duplicated — the brain is shared with the main store.

## Run locally
```bash
cp .env.local.example .env.local   # fill in values
npm install
npm run dev                        # http://localhost:3001
```
The backend must be running (see ../backend). With no `ANTHROPIC_API_KEY` on the
backend, Adaeze still works via keyword search.

## Environment
| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Ojaoba backend API base (e.g. `https://api.ojaba.com/api`) |
| `NEXT_PUBLIC_STORE_URL` | Link to the full storefront ("Go to full store") |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack public key for in-chat checkout |

## Deploy
Deploy as its own Vercel (or Node) project, pointed at this `assistant/` directory,
on its own domain/subdomain. Set the env vars above. Because it's standalone, it
deploys and scales independently of the storefront.
