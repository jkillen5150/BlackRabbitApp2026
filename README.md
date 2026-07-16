# Black Rabbit Landscaping

One project: **static website + Grok chat API**, meant to deploy together on **Vercel**.

Serving Yelm, Rainier, Lacey, Roy, Olympia & Thurston County.

## Pages

| Page | File |
|------|------|
| Home (+ quote form, rotating reviews) | `index.html` |
| Testimonials | `testimonials.html` |
| Portfolio | `portfolio.html` |
| Service map (pins) | `service-area.html` |
| **Ask AI** (full-page chat) | `assistant.html` |
| Customer / admin login | `login.html` |
| Admin CMS | `admin.html` |
| Customer dashboard | `customer.html` |
| Quote thank-you | `thankyou.html` |
| Chat API | `api/chat.js` → `POST /api/chat` |

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
3. Project env var: **`XAI_API_KEY`** = your xAI key (same one you used for the old proxy).
4. Deploy. Chat calls **`/api/chat`** on the same domain — no separate `br-chat-proxy` app needed.
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

## Content

- Seed data: `data/content.json`
- Styles: `css/site.css`
- Scripts: `js/`
