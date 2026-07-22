# Black Rabbit / Cut My Grass — session handoff

Last updated: 2026-07-22

## ⚠️ Token expiry (king note)
- **`xai_api_key` (Vercel label) — 30-day expiry.** Replaced ~**2026-07-22** (correct name is lowercase `xai_api_key`, not a mislabeled key). Rotate / replace by ~**2026-08-21** (or xAI console expiry). When it dies, Ask AI returns *“Chat not configured”* or xAI auth errors. Fix: console.x.ai → new key → Vercel env **`xai_api_key`** → **Redeploy**. Code also accepts legacy `XAI_API_KEY` if present.
- **Same window = product goal:** **30 new users** on the site by key renew (~2026-08-21). See **🎯 30-day goal** below.
- **Live probe 2026-07-22:** chat **OK** after key replace (`POST /api/chat`).
- **`GITHUB_TOKEN` set to no expiration / indefinitely** (~2026-07-21). Does not auto-rotate.
- **Live probe 2026-07-22:** durable leads + track work (`saved: true`, `durable: true`). Earlier 403 was scopes; Contents R/W / `repo` must stay on.
- If track/Admin durable ever die: fix PAT scopes, update Vercel, redeploy.
- Still treat the PAT like a password — only in Vercel env, never in the repo.
- **`LEAD_ADMIN_TOKEN`** does not auto-expire (openssl string you control). Live **401** gate verified 2026-07-22.

## Live stack
- **Domain:** `www.blackrabbitlawn.com` on **Vercel** (apex redirects to www). Not GitHub Pages for traffic.
- **Repo:** `jkillen5150/BlackRabbitApp2026` → Vercel project “2026” / whole site + APIs.
- **Old:** Separate “BR chat proxy” Vercel project may still exist; **2026** must hold its own env vars.

## What works
- Marketing site + SEO landings + FAQ spacing
- **Ask AI** (`/api/chat` + `assistant.html`) — live verified 2026-07-22 (**`XAI_API_KEY`**, 30-day expiry); personality **Porch Mode™** in `data/ai-knowledge.json`
- **Cut My Grass** (`/cut-my-grass`) multi-step book flow
- Optional yard photos (client compress)
- Lead accept + **browser Web3Forms** notify (server Web3Forms free tier blocks server IP)
- Stripe **Checkout deposit** (`STRIPE_SECRET_KEY` = `sk_…` or **`rk_live_…`** restricted OK) — live verified 2026-07-21
- Deposit confirm → “DEPOSIT PAID” email path
- **Track page** `/track?t=…` + Admin status (texted / booked / **on the way** / done) — **needs `GITHUB_TOKEN`** (durable verified 2026-07-22)
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
| **`xai_api_key`** | Ask AI (`/api/chat`) — **30-day expiry** (replaced ~2026-07-22 → renew ~2026-08-21). Vercel label is lowercase. | required for chat |
| `STRIPE_SECRET_KEY` | Deposits — **`sk_` or `rk_live_`**, not `pk_` | required for deposits |
| `SITE_URL` | Prefer **`https://www.blackrabbitlawn.com`** | strongly recommended |
| **`GITHUB_TOKEN`** | Durable `data/leads.json` — **required for `/track` + Admin across cold starts**. **No expiration** (set ~2026-07-21). | set on Vercel |
| `LEAD_ADMIN_TOKEN` | Locks GET/PATCH leads; paste same value in Admin UI | **set** (live 401 verified) |
| `STRIPE_DEPOSIT_AMOUNT_CENTS` | Optional; default `2500` ($25) | optional |
| `WEB3FORMS_KEY` | Optional override; free plan often needs **client-side** submit | optional |

Env names are **exact**, not suggestions. Redeploy after every env change.

### GITHUB_TOKEN setup (2 minutes)
1. GitHub → Settings → Developer settings → Personal access tokens (fine-grained or classic)
2. Classic: `repo` scope, or fine-grained: this repo + **Contents: Read and write**
3. **Expiry: no expiration / indefinitely** (current king setup ~2026-07-21)
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

## Core product (done)
- [x] GITHUB_TOKEN durable leads + track
- [x] LEAD_ADMIN_TOKEN lock + Admin “Save on this device” (no pop-up loop)
- [x] Stripe Checkout deposit ($25)
- [x] Customer `/track` pipeline + Admin status buttons
- [x] Cut My Grass book flow + client Web3Forms backup
- [x] Ask AI live (`xai_api_key` on Vercel, 30-day)

## 🎯 30-day goal (key window)

| | |
|--|--|
| **Window** | **2026-07-22 → 2026-08-21** (same ~30 days as `xai_api_key` before renew) |
| **Goal** | **30 new users** |
| **“New user” means** | Someone who **hadn’t used the site before this window** — first real touch via web: Ask AI, quote form, **Cut My Grass** book, track link from a new book, or first-time call/text that started from the site. **Not** fire-drill / test leads. **Not** you. Repeat visits by the same person still count as **one** new user. |
| **North-star stretch** | As many of those 30 as possible become **real jobs** (book → deposit → cut → review) |
| **Count** | Unique new names/phones in Admin leads + first-time site-sourced texts. Optional: Vercel Analytics / GA later for “new visitors.” Primary: **unique first-timers**, not pageviews. |
| **Key renew day** | ~**2026-08-21** — rotate **`xai_api_key`** **and** score: _Did we hit **30 new users**?_ |

### 30-day play (keep it simple)
1. **Week 1** — Warm intros that still count as **new to the site** (neighbors/past customers who never booked online). Aim first **5 new** users.
2. **Weeks 2–3** — Reach people who don’t know the URL yet: yard signs / truck / Nextdoor / Facebook Yelm–Rainier + CMG link. Close jobs; ask for Google reviews (reviews pull more **new** users).
3. **Week 4** — Double down on channels that brought first-timers. Don’t build Uber-for-lawn until **30 new** proved demand.
4. **Day 30** — Renew xAI key, score **/30 new**, decide ads vs organic.

### Scoreboard (fill as you go)
| Checkpoint | Date | **New users** | Leads | Jobs closed | Notes |
|------------|------|---------------|-------|-------------|--------|
| Start | 2026-07-22 | **0 / 30** | — | — | Goal: 30 new users |
| Week 1 | | / 30 | | | |
| Week 2 | | / 30 | | | |
| Week 3 | | / 30 | | | |
| **Day 30 / key renew** | ~2026-08-21 | **/ 30** | | | Renew `xai_api_key` |

## TODO — optional upgrades (build when volume hurts)
1. **Stripe webhook backup** — mark deposit paid + email Jerry even if customer never returns to the success URL  
2. **SMS track link (Twilio)** — auto-text customer `/track?t=…` after book / after deposit  
3. **Recurring weekly option** — Cut My Grass choice + lead field for weekly/biweekly  
4. **Tune deposit amount** — `STRIPE_DEPOSIT_AMOUNT_CENTS` if $25 feels wrong  
5. **Ads / traffic** — after a few real closed jobs and known close rate (supports the 30-user goal, not before product proof)  
6. **Physical / clone backup** — see **`BACKUP.md`** (ZIP/bundle to USB + secrets in password manager + domain auto-renew)

## Not now
- Native app  
- Multi-crew “Uber for lawn” network  
- $850 trademark filing until ads/scale  

## Next when we resume (ops)
1. **30-day goal** — **30 new users**; log scoreboard weekly  
2. Real jobs: book → deposit → track → Admin → Google review ask  
3. ~**2026-08-21** — renew **`xai_api_key`** + score **new users / 30**  
4. Pull first item off **TODO — optional upgrades** when volume hurts  

## Admin tips
- Lead token field = `LEAD_ADMIN_TOKEN` → **Save on this device** (localStorage)
- Copy track link → text to customer
- Status buttons drive `/track` pipeline
- If meta says WARNING about GITHUB_TOKEN, track links will fail for customers

## Plugin
- `npx plugins add vercel/vercel-plugin` installed (restart agents to load)
