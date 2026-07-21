# Black Rabbit / Cut My Grass — session handoff

Last updated: 2026-07-21

## ⚠️ Token expiry (king note)
- **`GITHUB_TOKEN` is good for 30 days** from setup (**~2026-07-21 → rotate by ~2026-08-20**).
- When it expires: Admin durable list + `/track` break until you mint a new PAT, update Vercel env, redeploy.
- **`LEAD_ADMIN_TOKEN`** does not auto-expire (openssl string you control).

## Live stack
- **Domain:** `www.blackrabbitlawn.com` on **Vercel** (apex redirects to www). Not GitHub Pages for traffic.
- **Repo:** `jkillen5150/BlackRabbitApp2026` → Vercel project “2026” / whole site + APIs.
- **Old:** Separate “BR chat proxy” Vercel project may still exist; **2026** must hold its own env vars.

## What works
- Marketing site + SEO landings + FAQ spacing
- **Cut My Grass** (`/cut-my-grass`) multi-step book flow
- Optional yard photos (client compress)
- Lead accept + **browser Web3Forms** notify (server Web3Forms free tier blocks server IP)
- Stripe **Checkout deposit** (`STRIPE_SECRET_KEY` = `sk_…` or **`rk_live_…`** restricted OK) — live verified 2026-07-21
- Deposit confirm → “DEPOSIT PAID” email path
- **Track page** `/track?t=…` + Admin status (texted / booked / **on the way** / done) — **needs `GITHUB_TOKEN`**
- Branding: “Powered by **Black Rabbit**” (no “Landscaping” on CMG kicker)

## Live dry-run findings (2026-07-21)
| Step | Result |
|------|--------|
| Site / apex → www | OK (308 preserves query string) |
| `POST /api/create-deposit` | OK — live Stripe Checkout, $25 |
| `POST /api/lead` | Accepts lead; **server email fails** (expected free tier); **`saved: false`** |
| `GET /api/track?t=…` right after book | **404 Not found** — root cause below |
| `GET /api/lead` list | Returns warm memory on lead function only; `durable: false` |
| `LEAD_ADMIN_TOKEN` | **Not set** (list is public — set token for PII) |

### Root cause: track broken without durable storage
`/api/lead` and `/api/track` are **separate Vercel serverless isolates**. In-memory `globalThis.__brLeads` is **not shared**. Without **`GITHUB_TOKEN`** writing `data/leads.json`, customer track links never resolve on another function.

## Code fixes in this session (deploy to take effect)
1. Shared store: `api/_lib/leads-store.js` (memory + GitHub) used by lead / track / confirm-deposit / create-deposit
2. **confirm-deposit** now marks `deposit_paid` in **GitHub** (not only memory)
3. Canonical **`SITE_URL`** helper defaults / rewrites apex → `https://www.blackrabbitlawn.com`
4. Track / copy-link URLs use `/track?t=` (matches `trailingSlash: false`)
5. Admin warns when durable storage is off
6. Clearer 404 note when `GITHUB_TOKEN` missing

## Env vars (2026 Vercel · Production · exact names)
| Name | Purpose | Priority |
|------|---------|----------|
| `XAI_API_KEY` | Ask AI (`/api/chat`) | required for chat |
| `STRIPE_SECRET_KEY` | Deposits — **`sk_` or `rk_live_`**, not `pk_` | required for deposits |
| `SITE_URL` | Prefer **`https://www.blackrabbitlawn.com`** | strongly recommended |
| **`GITHUB_TOKEN`** | Durable `data/leads.json` — **required for `/track` + Admin across cold starts**. **30-day expiry** (set ~2026-07-21 → renew ~2026-08-20). | set on Vercel |
| `LEAD_ADMIN_TOKEN` | Locks GET/PATCH leads; paste same value in Admin UI | **set** (live 401 verified) |
| `STRIPE_DEPOSIT_AMOUNT_CENTS` | Optional; default `2500` ($25) | optional |
| `WEB3FORMS_KEY` | Optional override; free plan often needs **client-side** submit | optional |

Env names are **exact**, not suggestions. Redeploy after every env change.

### GITHUB_TOKEN setup (2 minutes)
1. GitHub → Settings → Developer settings → Personal access tokens (fine-grained or classic)
2. Classic: `repo` scope, or fine-grained: this repo + **Contents: Read and write**
3. **Expiry: 30 days** for the current token (king) — calendar renew ~**2026-08-20**
4. Vercel project **2026** → Settings → Environment Variables → Production (and Preview if you test there)
5. Name: `GITHUB_TOKEN` · Value: the token · Save → **Redeploy**
6. Book a test cut → Admin should show “durable storage on” → open track link → should load

## Key product URLs
- Book: `/cut-my-grass`
- Track: `/track?t=TOKEN`
- APIs: `/api/lead`, `/api/create-deposit`, `/api/confirm-deposit`, `/api/track`, `/api/chat`

## Lessons learned
1. GitHub Pages = static only → **405** on `/api/*`. Domain must be Vercel.
2. Web3Forms free = client-side OK; server-side from Vercel often **403**.
3. “Could not deliver lead” was email/save — **before** Stripe.
4. “Stripe isn’t configured” = missing `STRIPE_SECRET_KEY` on **this** project/Production or no redeploy.
5. Restricted Stripe keys start with **`rk_`** — OK. Publishable **`pk_`** — do not use for server.
6. **Serverless functions do not share memory** — track/admin durability needs `GITHUB_TOKEN` (or another shared store).

## Trademark / legal
- Not filing yet. ~$850 quote for a filing is normal ballpark for one mark/class.
- Later: USPTO search + TM for **Cut My Grass** / **Black Rabbit**; copyright automatic on content.
- Use ™ informally when ready; ® only after federal registration.

## Next when we resume (priority)
1. Confirm **`GITHUB_TOKEN`** is on Production + redeploy finished → Admin “durable storage on”
2. Confirm **`SITE_URL=https://www.blackrabbitlawn.com`** if return/track links ever go wrong
3. **Full live dry run:** book → client email → deposit → track loads → Admin “On the way” → track updates
4. **~2026-08-20:** rotate **`GITHUB_TOKEN`** (30-day) → update Vercel → redeploy
5. Tune deposit amount if desired
6. **Build options:** Stripe webhook backup · SMS track link (Twilio) · recurring weekly option
7. **Not now:** native app, multi-crew Uber network, $850 TM until ads/scale

## Admin tips
- Lead token field = `LEAD_ADMIN_TOKEN` (session)
- Copy track link → text to customer
- Status buttons drive `/track` pipeline
- If meta says WARNING about GITHUB_TOKEN, track links will fail for customers

## Plugin
- `npx plugins add vercel/vercel-plugin` installed (restart agents to load)
