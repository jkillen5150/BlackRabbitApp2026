# Black Rabbit / Cut My Grass — session handoff

Last updated: 2026-07-20

## Live stack
- **Domain:** `www.blackrabbitlawn.com` on **Vercel** (apex redirects to www). Not GitHub Pages for traffic.
- **Repo:** `jkillen5150/BlackRabbitApp2026` → Vercel project “2026” / whole site + APIs.
- **Old:** Separate “BR chat proxy” Vercel project may still exist; **2026** must hold its own env vars.

## What works
- Marketing site + SEO landings + FAQ spacing
- **Cut My Grass** (`/cut-my-grass/`) multi-step book flow
- Optional yard photos (client compress)
- Lead accept + **browser Web3Forms** notify (server Web3Forms free tier blocks server IP)
- Stripe **Checkout deposit** (`STRIPE_SECRET_KEY` = `sk_…` or **`rk_live_…`** restricted OK)
- Deposit confirm → “DEPOSIT PAID” email path
- **Track page** `/track/?t=…` + Admin status (texted / booked / **on the way** / done)
- Branding: “Powered by **Black Rabbit**” (no “Landscaping” on CMG kicker)

## Env vars (2026 Vercel · Production · exact names)
| Name | Purpose |
|------|---------|
| `XAI_API_KEY` | Ask AI (`/api/chat`) — same key as old proxy is fine; must be **on 2026** |
| `STRIPE_SECRET_KEY` | Deposits — **`sk_` or `rk_live_`**, not `pk_` |
| `SITE_URL` | Prefer `https://www.blackrabbitlawn.com` |
| `LEAD_ADMIN_TOKEN` | Optional; locks GET/PATCH leads; paste same value in Admin UI |
| `STRIPE_DEPOSIT_AMOUNT_CENTS` | Optional; default `2500` ($25) |
| `GITHUB_TOKEN` | Optional; durable `data/leads.json` + longer-lived track tokens |
| `WEB3FORMS_KEY` | Optional override; free plan often needs **client-side** submit |

Env names are **exact**, not suggestions. Redeploy after every env change.

## Key product URLs
- Book: `/cut-my-grass/`
- Track: `/track/?t=TOKEN`
- APIs: `/api/lead`, `/api/create-deposit`, `/api/confirm-deposit`, `/api/track`, `/api/chat`

## Lessons learned
1. GitHub Pages = static only → **405** on `/api/*`. Domain must be Vercel.
2. Web3Forms free = client-side OK; server-side from Vercel often **403**.
3. “Could not deliver lead” was email/save — **before** Stripe.
4. “Stripe isn’t configured” = missing `STRIPE_SECRET_KEY` on **this** project/Production or no redeploy.
5. Restricted Stripe keys start with **`rk_`** — OK. Publishable **`pk_`** — do not use for server.

## Trademark / legal
- Not filing yet. ~$850 quote for a filing is normal ballpark for one mark/class.
- Later: USPTO search + TM for **Cut My Grass** / **Black Rabbit**; copyright automatic on content.
- Use ™ informally when ready; ® only after federal registration.

## Next when we resume (priority)
1. **Stabilize** — full live dry run: book → email → deposit → track → Admin “on the way”
2. Confirm `SITE_URL=https://www.blackrabbitlawn.com` if track/return links wrong
3. Tune deposit amount if desired
4. **Build options:** Stripe webhook backup · SMS track link (Twilio) · recurring weekly option
5. **Not now:** native app, multi-crew Uber network, $850 TM until ads/scale

## Admin tips
- Lead token field = `LEAD_ADMIN_TOKEN` (session)
- Copy track link → text to customer
- Status buttons drive `/track` pipeline

## Plugin
- `npx plugins add vercel/vercel-plugin` installed (restart agents to load)
