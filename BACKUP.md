# Black Rabbit / Cut My Grass — backup & recovery

If the laptop, Vercel, or a bad day takes the site down, this is how you get back up.

## What you own

| Layer | Where it lives | Notes |
|--------|----------------|--------|
| Code & site | GitHub `jkillen5150/BlackRabbitApp2026` | Clone / ZIP anytime |
| Lead list | `data/leads.json` via `GITHUB_TOKEN` (durable API) | **Gitignored** — do not commit. Old history may still have test leads. |
| Secrets | **Vercel env only** — not in the repo | Stripe, xAI, tokens |
| Payments | Stripe Dashboard | Survives site outages |
| Domain | Registrar + Vercel DNS | Point DNS elsewhere if needed |
| Notifications | Your email (Web3Forms) + phone | Independent of the app |

## King backup checklist (do once, refresh after secret rotates)

1. **Code on a drive**
   - GitHub → **Code** → **Download ZIP**, or:
   ```bash
   git clone https://github.com/jkillen5150/BlackRabbitApp2026.git
   ```
   - Copy folder (or a `git bundle`) to USB / second PC / encrypted cloud folder.

2. **Git bundle (single-file clone)**
   ```bash
   cd BlackRabbitApp2026
   git bundle create black-rabbit-backup.bundle --all
   ```
   - Restore later: `git clone black-rabbit-backup.bundle BlackRabbitApp2026`

3. **Secrets in a password manager** (never commit these)
   - `STRIPE_SECRET_KEY`
   - `xai_api_key` — **30-day expiry** (Vercel label; replaced ~2026-07-22; renew ~2026-08-21 at console.x.ai → update Vercel → redeploy). Legacy name `XAI_API_KEY` also works in code.
   - `GITHUB_TOKEN`
   - `LEAD_ADMIN_TOKEN`
   - `LEADS_ENCRYPTION_KEY` — dedicated leads-file key (do not rotate with the admin token)
   - `SITE_URL` (= `https://www.blackrabbitlawn.com`)
   - `STRIPE_DEPOSIT_AMOUNT_CENTS` (if set)
   - `WEB3FORMS_KEY` (if overridden)
   - Domain registrar login
   - Vercel login
   - GitHub login
   - Stripe login

4. **Domain** — confirm auto-renew is on at the registrar.

5. **Monthly (optional)** — new ZIP or bundle after a quiet week. Leads are **gitignored** locally; durable list still lives via `GITHUB_TOKEN` on GitHub when configured (don’t commit PII).

6. **Product goal reminder** — by ~**2026-08-21** renew **`xai_api_key`** and score **30 new users** (see `PROJECT_STATUS.md`). Facebook Reels/posts already part of distribution.

## If things go tits up

| Disaster | What to do |
|----------|------------|
| Laptop dies | `git clone` from GitHub + secrets from password manager |
| GitHub account issue | Use USB ZIP/bundle / second remote you set up earlier |
| Vercel down / project gone | Import same repo on Vercel (or Netlify/CF Pages+functions equivalent); re-add **all** env vars; redeploy; fix DNS if needed |
| Domain expired | Registrar account → renew → DNS back to host |
| Stripe glitch | History stays in Stripe; new keys → Vercel env → redeploy |
| Repo deleted | Restore from bundle/ZIP; push to a new GitHub repo; reconnect Vercel |

## Low-tech fail (still take money)

- Public line: **(407) 951-1663**
- Cash / Venmo / Stripe payment link
- Paper notes for name, phone, address, day

The app is leverage, not the only way to book a cut.

## Second remote (optional, stronger clone)

```bash
# one-time: bare repo on a USB
git init --bare /path/to/usb/BlackRabbitApp2026.git
git remote add backup /path/to/usb/BlackRabbitApp2026.git
git push backup main
```

## Related product backlog

Optional upgrades (webhook, SMS, weekly, etc.) live in `PROJECT_STATUS.md` — separate from disaster recovery.
