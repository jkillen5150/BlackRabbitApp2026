# Black Rabbit / Cut My Grass — session handoff

Last updated: 2026-07-22 (evening) · **tabled for reading / distribution**

## ⚠️ Token expiry (king note)
- **`xai_api_key` (Vercel label) — 30-day expiry.** Replaced ~**2026-07-22**. Rotate by ~**2026-08-21** (or xAI console). Dead key → *“Chat not configured”* / auth errors. Fix: console.x.ai → new key → Vercel **`xai_api_key`** → **Redeploy**. Code also accepts legacy `XAI_API_KEY`.
- **Same window = product goal:** **30 new users** by key renew (~2026-08-21). See **🎯 30-day goal**.
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

## 🎯 30-day goal (key window)

| | |
|--|--|
| **Window** | **2026-07-22 → ~2026-08-21** |
| **Goal** | **30 new users** (first-timers to the *site*, not drills, not you) |
| **Stretch** | Turn as many as possible into real jobs → Google reviews |
| **Count** | Unique new names/phones (Admin + site-sourced texts) |
| **Key renew** | Rotate **`xai_api_key`** + score **/30** |

### Scoreboard
| Checkpoint | Date | **New users** | Leads | Jobs closed | Notes |
|------------|------|---------------|-------|-------------|--------|
| Start | 2026-07-22 | **0 / 30** | — | — | Goal set; FB Reels/posts active |
| Week 1 | | / 30 | | | Frens dry runs + FB |
| Week 2 | | / 30 | | | |
| Week 3 | | / 30 | | | |
| **Day 30 / key renew** | ~2026-08-21 | **/ 30** | | | Renew `xai_api_key` |

## Env vars (Vercel Production — exact names)
| Name | Purpose |
|------|---------|
| **`xai_api_key`** | Ask AI — **30-day** · renew ~2026-08-21 |
| `STRIPE_SECRET_KEY` | Deposits (`sk_` or `rk_live_`) |
| `SITE_URL` | Prefer `https://www.blackrabbitlawn.com` |
| `GITHUB_TOKEN` | Durable leads/track (Contents write) |
| `LEAD_ADMIN_TOKEN` | Lock Admin lead list |
| `STRIPE_DEPOSIT_AMOUNT_CENTS` | Optional; default `2500` |
| `WEB3FORMS_KEY` | Optional override |

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
- [ ] Confirm Vercel deploy of latest `main` is **Ready** (Porch Mode + cozy live)
- [ ] Smoke: home, `/cut-my-grass`, `/assistant` (“what mode are you?”), phone number answer
- [ ] Admin: paste **`LEAD_ADMIN_TOKEN`** if needed → lead list loads

### Dry runs + frens (week 1)
- [ ] You: full path book → (cancel) deposit → track → Admin status once
- [ ] **3–5 frens users** click the real URL; gather “what felt weird”
- [ ] Log any real first-timers on the **scoreboard** (new users / 30)
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
- [ ] Calendar: **~2026-08-21** renew `xai_api_key` + score 30 new users

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
