# Black Rabbit Landscaping

One project: **static website + Grok chat API**, meant to deploy together on **Vercel**.

Serving Yelm, Rainier, Lacey, Roy, Olympia, Tenino & Thurston County.

## Pages

| Page | File |
|------|------|
| Home (+ quote form, rotating reviews, FAQ) | `index.html` |
| City landings (local SEO) | `lawn-care-yelm/` … `lawn-care-tenino/` (folder form for GitHub Pages) |
| **Cut My Grass** (book-a-cut app flow) | `cut-my-grass/` |
| Service landings | `lawn-mowing/`, `yard-cleanup/`, `fall-leaf-cleanup/` |
| Testimonials | `testimonials.html` |
| Portfolio | `portfolio.html` |
| Service map (pins) | `service-area.html` |
| **Ask AI** (full-page chat) | `assistant.html` |
| Customer / admin login | `login.html` |
| Admin CMS | `admin.html` |
| Customer dashboard | `customer.html` |
| Quote thank-you | `thankyou.html` |
| Chat API | `api/chat.js` → `POST /api/chat` |
| Lead API | `api/lead.js` → `GET/POST/PATCH /api/lead` |

## Chat leads (“connect me” / quote without the form)

Ask AI can **interview** a customer (name → phone → address → need), then:

1. **Email you** via Web3Forms (same system as the homepage form)
2. **Log the lead** for Admin → **Follow-up quotes** (`GET/POST/PATCH /api/lead`)

**Track page + Admin list durability:** set **`GITHUB_TOKEN`** (repo **Contents: Read and write** on this repo) on Vercel so leads append to `data/leads.json`. **Required for customer `/track` links** — `/api/lead` and `/api/track` are separate serverless functions and do **not** share memory. Without the token, book → track returns “Not found” after a cold start. You still get **emails** either way (browser Web3Forms backup on Cut My Grass).

**Lead list privacy:** set **`LEAD_ADMIN_TOKEN`** on Vercel (Project → Settings → Environment Variables → Production + Preview). Use a long random string. When set, `GET`/`PATCH` `/api/lead` require header `X-Lead-Token`. In Admin, paste the same token under **Lead admin token** (session only). Public **POST** of new leads (Cut My Grass / Ask AI) still works without the token.

## Making the AI smarter (no “training”)

You do **not** fine-tune a model. Each chat request gets a **briefing packet**:

1. Edit **`data/ai-knowledge.json`** — services, towns, FAQs, review blurbs, booking steps, voice.
2. Redeploy Vercel (push to `main` if auto-deploy is on).
3. The API (`api/chat.js`) loads that file into the system prompt.

That’s “teaching the site,” not machine-learning training. Add new FAQs or services anytime.

## Backup & recovery

If the host or laptop dies: **`BACKUP.md`** — clone/ZIP, secrets checklist, “tits up” recovery table, low-tech phone fallback.

## One-piece deploy (Vercel)

GitHub Pages can’t run the chat function. Keep **everything on Vercel**:

1. Import **jkillen5150/BlackRabbitApp2026** in [vercel.com](https://vercel.com) (or link the existing project to this repo).
2. Framework preset: **Other** (static + `api/`).
3. Project env vars:
   - **`XAI_API_KEY`** — xAI key for Ask AI
   - **`STRIPE_SECRET_KEY`** — `sk_…` or `rk_live_…` for Cut My Grass deposits
   - **`SITE_URL`** — prefer `https://www.blackrabbitlawn.com` (canonical host)
   - **`GITHUB_TOKEN`** — **required for `/track`** + durable Admin lead list (repo contents write)
   - **`LEAD_ADMIN_TOKEN`** (optional) — gate Admin lead list/updates
   - **`WEB3FORMS_KEY`** (optional) — overrides the public form access key
   - **`STRIPE_DEPOSIT_AMOUNT_CENTS`** (optional) — default `2500` ($25)
4. Deploy. Chat calls **`/api/chat`** on the same domain — no separate proxy app needed.
5. Point **blackrabbitlawn.com** DNS to this Vercel project (Domains → Add).

Optional local full stack:

```bash
npx vercel dev
# open the URL it prints (serves HTML + /api/chat)
```

Static-only preview (chat won’t work without the API):

```bash
python3 -m http.server 8765
```

## Admin

1. **Login → Admin**
2. Username: `jkillen5150`
3. Add reviews, portfolio photos, map pins
4. Edits save in the browser; **Export content.json** → replace `data/content.json` → redeploy for everyone

**Security note:** Admin login is a **client-side gate** (password hash in `js/auth.js`). It is not server authentication. Do not put secrets only behind Admin HTML. Prefer `LEAD_ADMIN_TOKEN` + Vercel env for lead PII, and keep real keys only in Vercel env vars.

## Content

- Seed data: `data/content.json`
- AI briefing: `data/ai-knowledge.json`
- Styles: `css/site.css`
- Scripts: `js/`
- Brand: `logo.jpg` (favicon + LocalBusiness image)
- Social share image: `og-image.jpg`
- Portfolio/hero photos: `IMG_9642.jpeg`, `IMG_9650.jpeg`
- SEO: `robots.txt`, `sitemap.xml`, canonical URLs, LocalBusiness + review/FAQ JSON-LD on home and landings

### Admin drafts vs redeploy

Admin edits save in **this browser only** (localStorage), keyed to the current `data/content.json` fingerprint. After you export, commit, and redeploy a new `content.json`, any **stale** local draft is dropped automatically so the new site content shows. Export before redeploy if you still need local-only changes.

### Cut My Grass (v1)

Fast booking UX at **`/cut-my-grass/`**, branded as a product of Black Rabbit:

1. Home hero → **Try Cut My Grass**
2. Multi-step: service → address → when → contact
3. Posts to **`POST /api/lead`** with `source: cut-my-grass` (email + Admin list)
4. Optional **yard photos** (up to 2) — compressed on-device, emailed as attachments; Admin shows previews when the API is still warm
5. **Stripe deposit** — after the request is saved, customer is sent to Stripe Checkout (`POST /api/create-deposit`). Default **$25** (`STRIPE_DEPOSIT_AMOUNT_CENTS=2500`). Deposit applies to the final quote; balance after the job.
6. **Deposit confirm** — return URL calls `POST /api/confirm-deposit` with the Checkout `session_id`. Verifies payment with Stripe, emails you **DEPOSIT PAID**, marks the warm Admin lead when possible.
7. **Track page** — each lead gets a `trackToken`; customer opens `/track/?t=…` (`GET /api/track`). Admin sets status: texted → booked → **on the way** → done.

### Stripe env (Vercel)

| Variable | Required | Notes |
|----------|----------|--------|
| `STRIPE_SECRET_KEY` | Yes for deposits | `sk_live_…` (or `sk_test_…` while testing) |
| `STRIPE_DEPOSIT_AMOUNT_CENTS` | No | Default `2500` ($25.00) |
| `SITE_URL` | No | e.g. `https://blackrabbitlawn.com` if redirects mis-detect host |

Never commit secret keys. Dashboard → Developers → API keys → add to Vercel → **redeploy**.

### Housekeeping notes

- Public pages use `logo.jpg` (not a space-filled filename).
- Legacy root `styles.css` / `script.js` were removed; the live stack is `css/site.css` + `js/*`.
- A historical commit once tracked a `.env` with an xAI key. The file is gone from `HEAD`, but **rotate the key on the xAI console** if it may still be valid — git history remains public.
- Stale local git worktree: `site/multi-page-and-reviews` (safe to remove with `git worktree remove` when unused).
