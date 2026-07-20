# Black Rabbit Landscaping

One project: **static website + Grok chat API**, meant to deploy together on **Vercel**.

Serving Yelm, Rainier, Lacey, Roy, Olympia, Tenino & Thurston County.

## Pages

| Page | File |
|------|------|
| Home (+ quote form, rotating reviews, FAQ) | `index.html` |
| City landings (local SEO) | `lawn-care-yelm/` … `lawn-care-tenino/` (folder form for GitHub Pages) |
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

Optional durable list: set **`GITHUB_TOKEN`** (repo contents write) on Vercel so leads append to `data/leads.json`. Without it, you still get **emails**; the on-site list may be partial after cold starts.

Optional privacy: set **`LEAD_ADMIN_TOKEN`** on Vercel. When set, listing/updating leads requires header `X-Lead-Token` (Admin prompts once per browser session). Public **POST** of new leads still works without the token.

## Making the AI smarter (no “training”)

You do **not** fine-tune a model. Each chat request gets a **briefing packet**:

1. Edit **`data/ai-knowledge.json`** — services, towns, FAQs, review blurbs, booking steps, voice.
2. Redeploy Vercel (push to `main` if auto-deploy is on).
3. The API (`api/chat.js`) loads that file into the system prompt.

That’s “teaching the site,” not machine-learning training. Add new FAQs or services anytime.

## One-piece deploy (Vercel)

GitHub Pages can’t run the chat function. Keep **everything on Vercel**:

1. Import **jkillen5150/BlackRabbitApp2026** in [vercel.com](https://vercel.com) (or link the existing project to this repo).
2. Framework preset: **Other** (static + `api/`).
3. Project env vars:
   - **`XAI_API_KEY`** — xAI key for Ask AI
   - **`GITHUB_TOKEN`** (optional) — durable lead list
   - **`LEAD_ADMIN_TOKEN`** (optional) — gate Admin lead list/updates
   - **`WEB3FORMS_KEY`** (optional) — overrides the public form access key
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

### Housekeeping notes

- Public pages use `logo.jpg` (not a space-filled filename).
- Legacy root `styles.css` / `script.js` were removed; the live stack is `css/site.css` + `js/*`.
- A historical commit once tracked a `.env` with an xAI key. The file is gone from `HEAD`, but **rotate the key on the xAI console** if it may still be valid — git history remains public.
- Stale local git worktree: `site/multi-page-and-reviews` (safe to remove with `git worktree remove` when unused).
