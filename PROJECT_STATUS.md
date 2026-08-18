# Black Rabbit / Cut My Grass — session handoff

Last updated: 2026-08-14 · **make it work, then make it pretty**

## ⚠️ Token expiry (king note)
- **`xai_api_key` (Vercel label) — 30-day expiry.** Rotated **2026-08-14**; old key **revoked**. Next rotate ~**2026-09-13**. Dead key → *“Chat not configured”* / auth errors. Fix: console.x.ai → new key → Vercel **`xai_api_key`** → **Redeploy**. Code also accepts legacy `XAI_API_KEY`.
- **Site-found user goal** is its own clock (since 8/11). See **🎯 30-day goal**.
- **`GITHUB_TOKEN`** — no expiration (~2026-07-21). Needs **Contents: Read and write** (or classic `repo`). Durable leads + track verified live.
- **`LEAD_ADMIN_TOKEN`** — no auto-expiry. Live **401** on list without token.
- Secrets only in Vercel + password manager — never the repo.

## Live stack
- **Domain:** `www.blackrabbitlawn.com` on **Vercel** (apex → www).
- **Repo:** `jkillen5150/BlackRabbitApp2026` → Vercel project **2026** (public on purpose — owner choice).
- **Pushed main (2026-07-22):** Porch Mode, cozy UI, vernacular, leads gitignore (`d453d46` / `a5c4f11` lineage).

## What works (live)
- Marketing site + SEO landings + **cozy porch** home / CMG / thank-you
- **Ask AI** + **Porch Mode™** (`data/ai-knowledge.json`) — occasional **fam / cuz / fren** (not slang spam)
- **Cut My Grass** book → lead → optional **$25 Stripe** deposit → **track** page
- Durable leads via **`GITHUB_TOKEN`** (API path `data/leads.json`)
- Admin lead list locked with **`LEAD_ADMIN_TOKEN`**
- Client Web3Forms backup (server free tier often fails — expected)

## Shipped this session (2026-07-22)
| Area | What |
|------|------|
| UX | Cozy landing (hero, porch card, softer forms/CTAs) |
| AI | **Porch Mode™** personality + sample lines + FAQs |
| AI voice | Occasional vernacular: fam, cuz, fren, friend, neighbor, y'all |
| Env | Chat reads **`xai_api_key`** first, then `XAI_API_KEY` |
| Docs | 30 new users goal, token notes, BACKUP/README |
| Privacy | **`data/leads.json` gitignored** + removed from git (repo stays **public**) |
| Fire drill | Site/chat/Stripe/lead-gate OK; chat key fixed on Vercel |
| Distribution | **Facebook Reels + posts already in progress** (Jerry) — keep linking site / CMG |

## Distribution status
| Channel | Status |
|---------|--------|
| **Facebook Reels + posts** | **In progress — already doing** |
| Nextdoor / neighbors / past customers | Next wave for **new users** |
| Yard sign / truck / QR → site | Optional, high leverage |
| Paid ads | **Not yet** — after a few closed jobs |
| Marketplace / job board | Parked (code lives in BlackRabbitLandscapingApp) |

## 🎯 30-day goal (site-found, since 8/11)

| | |
|--|--|
| **Window** | **2026-08-11 → ~2026-09-11** (28 days left as of 8/14) |
| **Goal** | **30 new users** who found us from the site (CMG / organic). Not drills, not you. |
| **On the board** | **2 / 30** — Harold (8/11) + Rene White (8/14), both CMG |
| **Pace** | **28 more in 28 days** → about **1 first-timer a day** |
| **Not in this count** | Jessica Bryant (homepage form) — still a real lead, different path |
| **Stretch** | Turn as many as possible into real jobs → Google reviews |
| **Separate ops** | **`xai_api_key` rotated 2026-08-14** (old key revoked). Next ~**2026-09-13** |

### Scoreboard
| Checkpoint | Date | **Site-found** | Notes |
|------------|------|----------------|-------|
| Clock start | 2026-08-11 | **1 / 30** | Harold — CMG, found us from the site |
| +3 days | 2026-08-14 | **2 / 30** | Rene White — CMG, Yelm, bi-weekly, active |
| Need | ~2026-09-11 | **30 / 30** | 28 more · 1 a day |
| Ask AI key | 2026-08-14 | done | Rotated + old key revoked. Next ~2026-09-13 |

## Env vars (Vercel Production — exact names)
| Name | Purpose |
|------|---------|
| **`xai_api_key`** | Ask AI — **30-day** · rotated 2026-08-14 · next ~2026-09-13 |
| `STRIPE_SECRET_KEY` | Deposits (`sk_` or `rk_live_`) |
| `SITE_URL` | Prefer `https://www.blackrabbitlawn.com` |
| `GITHUB_TOKEN` | Durable leads/track (Contents write) |
| `LEAD_ADMIN_TOKEN` | Lock Admin lead list |
| `LEADS_ENCRYPTION_KEY` | Encrypt `data/leads.json` at rest (independent of admin token) |
| `STRIPE_DEPOSIT_AMOUNT_CENTS` | Optional; default `2500` |
| `WEB3FORMS_KEY` | Optional override |
| `GOOGLE_PLACES_API_KEY` | Optional review Sync |
| `GOOGLE_SHEETS_WEBHOOK` | Apps Script web app on Client Database |
| `GOOGLE_SHEETS_ID` | Defaults to existing Client Database |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Optional Sheets API (instead of webhook) |

## Key URLs
- Home: `/` · Book: `/cut-my-grass` · Track: `/track?t=` · Ask AI: `/assistant`
- APIs: `/api/lead`, `/api/create-deposit`, `/api/confirm-deposit`, `/api/track`, `/api/chat`

## Privacy / repo choice
- Repo stays **public** (owner decision).
- **Never commit** `data/leads.json` (gitignored). Example only: `data/leads.example.json`.
- Durable store may still **create/update** `data/leads.json` on GitHub via API — if that bothers later, private data repo (`GITHUB_REPO`) or another store.
- Old git history may still contain past test leads / old `.env` — rotate any leaked xAI keys.

## Lessons learned
1. Domain + APIs = **Vercel**, not GitHub Pages.
2. Web3Forms free ≈ client OK, server often blocked.
3. Serverless functions **don’t share memory** — need durable store for track.
4. Vercel env name for chat is **`xai_api_key`** (lowercase).
5. Public repo + committed PII = bad; gitignore is the minimum fix.

## Core product (done)
- [x] Durable leads + track (`GITHUB_TOKEN`)
- [x] Lead admin token lock
- [x] Stripe Checkout deposit ($25)
- [x] Cut My Grass + client email backup
- [x] Ask AI live + **Porch Mode™** + vernacular
- [x] Cozy landing UX
- [x] Stop tracking `data/leads.json` in git
- [x] Push Porch Mode / cozy / vernacular to `main`

## TODO — optional upgrades (when volume hurts)
1. Stripe webhook backup (deposit paid if they never return from Checkout)
2. SMS track link (Twilio)
3. Clearer recurring weekly fields in CMG
4. Tune deposit amount
5. Paid ads (after close rate known)
6. Physical/clone backup — **`BACKUP.md`**
7. Private leads store (if API-written `leads.json` on public repo is a problem)

## Not now / tabled
- Native app
- Multi-crew marketplace / “Uber for lawn” (old app still in BlackRabbitLandscapingApp)
- Trademark filing (~$850) until scale
- Making the GitHub repo private
- Big feature builds while reading + distributing

---

## ✅ Checklist — next session

### Start here (5 min)
- [x] Calendar: **2026-08-21** rotate `xai_api_key` — **done early 2026-08-14**; move reminder to **~2026-09-13**
- [ ] Confirm Vercel deploy of latest `main` is **Ready**
- [ ] Smoke: home, `/cut-my-grass`, `/assistant`, `/api/quote`, `/api/pipeline`
- [ ] Admin: paste **`LEAD_ADMIN_TOKEN`** if needed → lead list + pipeline load
- [ ] Paste Apps Script (`docs/ops-sheet-apps-script.js`) → set `GOOGLE_SHEETS_WEBHOOK`

### Dry runs + frens (week 1)
- [ ] You: full path book → (cancel) deposit → track → Admin status once
- [ ] **3–5 frens users** click the real URL; gather “what felt weird”
- [x] Site-found count since 8/11: **Harold + Rene White = 2 / 30** (Jessica Bryant is a form lead, not in this count)
- [ ] Clear old **fire-drill / test** leads from Admin when convenient

### Distribution (already rolling)
- [x] **Facebook Reels + posts** — keep going
- [ ] Every Reel/post: clear **link** (home or Cut My Grass) + phone
- [ ] After each real job: ask for **Google review**
- [ ] Optional: Nextdoor / neighbor text wave for site first-timers
- [ ] Optional: QR on truck/cards → blackrabbitlawn.com

### Ops hygiene
- [ ] Password manager has all secrets from **BACKUP.md**
- [ ] Optional: `git bundle` / USB code backup (still open)
- [ ] Calendar: **~2026-09-13** next `xai_api_key` rotate + score site-found users

### Only if something’s broken
- [ ] Chat dead → check **`xai_api_key`** + redeploy
- [ ] Track 404 → check **`GITHUB_TOKEN`** scopes + durable flag
- [ ] Deposit fail → **`STRIPE_SECRET_KEY`** on project **2026** Production

### Build later (not default next step)
- [ ] Stripe webhook / SMS track / marketplace comeback — only when volume hurts

## Admin tips
- Lead token = `LEAD_ADMIN_TOKEN` → **Save on this device**
- Copy track link → text customer
- Status buttons drive `/track`
- If Admin warns about GITHUB_TOKEN, track will fail for customers

## Plugin
- `npx plugins add vercel/vercel-plugin` installed (restart agents to load)
