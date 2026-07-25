# Cut My Grass — Yard-sign copy, QR checklist & vanity domain (GoDaddy → Vercel 301)

Practical follow-up to `docs/cut-my-grass-public-blueprint.md`.  
**Canonical booking URL (freeze this until print is done):**

```text
https://www.blackrabbitlawn.com/cut-my-grass
```

**Phone (live site):** `(407) 951-1663`  
**Shop (verified):** Nisqually Post & Print · 12820 Yelm Hwy SE Ste C, Olympia, WA 98513 · 360-810-8600  
**Do not paste GoDaddy passwords into chat or into this repo.**

---

## Part A — Yard-sign copy

### Spec to ask the shop for

| Spec | Ask for |
|------|---------|
| Size | **24" × 18"** (landscape) corrugated plastic — confirm stock |
| Sides | **Double-sided** if budget allows (same art both sides); else single |
| Stake | **H-stake** included |
| Qty first run | **5–10** |
| Finish | Outdoor / UV-resistant |
| File | PDF or AI; shop can rebuild from text below if needed |

**Rough public list price (confirm in person):** single-sided 24×18 ~$19.80 each on their site; double-sided + cards = **get a written quote**.

### Visual rules (so QR actually works)

1. **QR is the hero** — at least **2.5–3 inches** square on a 24×18; more is better.
2. High contrast: **dark code on white** (or white quiet zone on dark sign with white box under QR).
3. **Quiet zone** around QR: empty margin ≥ width of 4 QR modules (roughly ½"+).
4. No logo, phone digits, or shadows overlapping the QR.
5. Phone readable from a car (~2–3" tall digits if possible).
6. Brand colors: dark green / near-black on cream or white (site theme ~`#1e3d1e`). Avoid yellow-on-green.

### Layout (recommended — double-sided same both faces)

```text
┌──────────────────────────────────────────────┐
│                                              │
│              CUT MY GRASS                    │  ← biggest type
│         Book a cut in a few taps             │
│                                              │
│     ┌────────────┐                           │
│     │            │   Scan to book            │
│     │    QR      │   Yelm & South Sound      │
│     │            │   Owner-operated · LBI    │
│     └────────────┘                           │
│                                              │
│         Call / Text (407) 951-1663            │
│         Powered by Black Rabbit              │
│                                              │
└──────────────────────────────────────────────┘
```

### Exact copy blocks (hand to designer / print shop)

**Headline**  
`CUT MY GRASS`

**Subhead (pick one)**  
- `Book a lawn cut in a few taps`  
- `Scan to book — Yelm & South Sound`

**Trust line (small)**  
`Owner-operated · Licensed · Bonded · Insured`

**Brand line (required)**  
`Powered by Black Rabbit`

**Phone**  
`(407) 951-1663`

**Optional geo (if space)**  
`Yelm · Rainier · Lacey · Olympia · Thurston County`

**Do not put on the sign**

- Fixed “always $40” guarantees (quotes vary by yard)
- Marketplace / “Uber for lawn” language
- A second URL (home + CMG) — **one QR destination only**
- Vanity domain text **until** 301 is live and tested (Part C)

### Short variants

**Truck / small magnet (minimal)**  
```text
CUT MY GRASS
Scan to book
(407) 951-1663
Powered by Black Rabbit
[QR → CMG URL]
```

**Business card**  
```text
Jerry · Black Rabbit Landscaping
Cut My Grass — book online
(407) 951-1663
[QR → CMG URL]
Yelm & South Sound · LBI
```

### Art file for the shop

Generate QR **only** for:

`https://www.blackrabbitlawn.com/cut-my-grass`

Prefer a free generator that outputs **PNG + SVG/EPS** with error correction **M or Q** (not lowest).  
Bring phone screenshots of a successful scan-test to the shop so they match the same URL.

---

## Part B — QR checklist (do this before you pay for print)

### B1. Freeze the destination

- [ ] Destination is exactly:  
  `https://www.blackrabbitlawn.com/cut-my-grass`  
  (www host is fine; site also treats apex — prefer **www** for consistency with Vercel canonical)
- [ ] No link shortener (bit.ly, etc.) for v1
- [ ] No vanity domain on the QR until Part C is green

### B2. Phone scan test (use a second phone if you can)

On **cellular data** (not only Wi‑Fi at home):

- [ ] Camera app opens the booking page (Step 1 of 4)
- [ ] Page loads under ~5 seconds on LTE
- [ ] Can complete book flow to lead submit
- [ ] Optional: cancel-safe deposit path still works
- [ ] Track link (if you get one after book) loads
- [ ] Call/text from the page works: `(407) 951-1663`

### B3. Print proof test (before full run)

When the shop emails/shows a proof PDF:

- [ ] Open PDF on phone; scan QR from the screen **and** from a paper print if they provide one
- [ ] Scan from **3–6 feet** in daylight and shade
- [ ] Still works if you tilt the sign ~30°
- [ ] Phone number digits are correct: **(407) 951-1663**
- [ ] “Powered by Black Rabbit” present
- [ ] No extra URL competing with the QR

### B4. Placement (legal + practical)

- [ ] Truck / trailer / equipment you own — always OK
- [ ] Active job sites only with **homeowner permission**
- [ ] Private property with permission — OK
- [ ] City right-of-way / utility poles / medians — **check Yelm / Thurston rules first** (not verified in research; many cities ban free placement)
- [ ] HOAs — ask before posting

### B5. After install

- [ ] One week later: re-scan a weather-worn sign
- [ ] If URL ever changes, **reprint** — do not “hope” redirects cover every old sign forever without testing

---

## Part C — Optional vanity domain → Vercel 301 (GoDaddy)

**Goal:** e.g. `getcutmygrass.com` always lands on Cut My Grass booking, without a second website.

**Only do this after Part B is solid.** Print can ship with the long URL; vanity is a later polish.

### C0. Decide the name

Preferred candidates (confirm availability at purchase time):

1. `getcutmygrass.com`  
2. `bookcutmygrass.com`  
3. `cutmygrasswa.com`

**Skip for launch:** `cutmygrass.com` (registered through 2029 / aftermarket — not free).

### C1. Register (GoDaddy UI — you do this)

1. Log into **GoDaddy** (password manager; not chat).
2. Search the name → purchase **domain only** if possible.
3. Decline extra upsells you don’t need (hosted email, Website Builder, etc.) unless you truly want them.
4. Turn **auto-renew ON**.
5. Note: new domains may have a **60-day transfer lock** — irrelevant if you only point DNS.

Rough cash: **~$10–25 first year** depending on promo/renewal.

### C2. Add domain on Vercel

1. Open [vercel.com](https://vercel.com) → project that serves **blackrabbitlawn.com** (this repo’s project).
2. **Settings → Domains → Add**.
3. Enter `getcutmygrass.com` (and optionally `www.getcutmygrass.com`).
4. Choose redirect behavior when Vercel offers it:
   - **Preferred:** redirect **to**  
     `https://www.blackrabbitlawn.com/cut-my-grass`  
     (or at minimum redirect apex vanity → `https://www.blackrabbitlawn.com` and accept an extra click — **path redirect is better**).
5. Vercel will show DNS records to create (often **A** for apex and **CNAME** for www). Copy them exactly.

**If Vercel only offers “point domain here” without path redirect:**

- Still point DNS so the domain is on the project, then set a **redirect** in project config (see C4) so every path goes to CMG.
- **Do not** leave vanity serving a second full copy of the site with its own SEO index.

### C3. DNS in GoDaddy (web only — protect email)

1. GoDaddy → **My Products → Domains →** your vanity domain → **DNS** (or “Manage DNS”).
2. Add the records Vercel shows (typical pattern):

| Type | Name | Value | Notes |
|------|------|--------|------|
| **A** | `@` | Vercel IP(s) they list | Apex |
| **CNAME** | `www` | `cname.vercel-dns.com` (or value Vercel shows) | www |

3. **Do not** delete or rewrite **MX / TXT (SPF/DKIM/DMARC)** on **blackrabbitlawn.com** while doing this. Vanity domain is separate; only edit the **new** domain’s DNS.
4. If GoDaddy “Domain Forwarding” conflicts with Vercel DNS, prefer **Vercel-managed redirect** + DNS records Vercel asks for — don’t run two competing forwarders.
5. Wait for DNS (often minutes; can be up to 24–48h).

### C4. Force a single canonical (301 only)

**Rule:** One public booking URL for SEO and for your brain. Vanity is a **door**, not a second house.

Checklist:

- [ ] `http://getcutmygrass.com` → HTTPS
- [ ] `https://getcutmygrass.com` → **301/308** → `https://www.blackrabbitlawn.com/cut-my-grass`
- [ ] `https://www.getcutmygrass.com` → same target
- [ ] Optional paths (`/anything`) also redirect to CMG (or at least home → CMG)
- [ ] **No** reverse-proxy that serves full site content on both hosts without redirects

**Vercel options (pick one that fits the UI that day):**

1. Domain redirect in **Project → Domains** (simplest if available for path).  
2. Or `vercel.json` redirect (example — only after you own the domain and want it in git):

```json
{
  "redirects": [
    {
      "source": "/:path*",
      "has": [{ "type": "host", "value": "getcutmygrass.com" }],
      "destination": "https://www.blackrabbitlawn.com/cut-my-grass",
      "permanent": true
    },
    {
      "source": "/:path*",
      "has": [{ "type": "host", "value": "www.getcutmygrass.com" }],
      "destination": "https://www.blackrabbitlawn.com/cut-my-grass",
      "permanent": true
    }
  ]
}
```

Merge carefully with **existing** `vercel.json` rules; don’t wipe current config.

### C5. Verify vanity before putting it on print

- [ ] Incognito: open vanity URL → lands on CMG booking
- [ ] Address bar ends on **blackrabbitlawn.com** (redirect worked)
- [ ] Book flow still works after redirect
- [ ] `curl -I https://getcutmygrass.com` shows **301 or 308** (optional technical check)
- [ ] Only then regenerate QR **or** use vanity text on **new** print runs

### C6. Stay on GoDaddy vs migrate (blackrabbitlawn.com)

| Action | When |
|--------|------|
| Keep **blackrabbitlawn.com** at GoDaddy | **Default** — already working with Vercel |
| Change only **A / CNAME** for web | Already done if site is live on Vercel |
| **Do not** switch nameservers casually | Risk to email if MX not recreated |
| Transfer registrar later | Optional; ~$10–15 + 1 year; only after DNS export + unlock + no 60-day lock |

**Launch does not require transferring blackrabbitlawn.com.**

---

## Part D — Order of operations (do this sequence)

| Step | Action | Done when |
|------|--------|-----------|
| 1 | Phone-scan CMG URL end-to-end | Lead (and optional deposit path) works on mobile data |
| 2 | Generate QR + draft sign PDF from Part A copy | You like the layout |
| 3 | Quote at **Nisqually Post & Print** (360-810-8600) | Written price for 5–10 signs ± cards |
| 4 | Approve shop proof with Part B3 scans | Paper/PDF QR works |
| 5 | Print + place (truck first) | Signs in the wild |
| 6 | *(Optional)* Register vanity + Part C 301 | Redirect verified |
| 7 | *(Optional)* Second print run with short domain | Only if 6 is green |

---

## Part E — One-page brief to text/email the print shop

Copy/paste:

> Hi — I’d like a quote for **5–10 outdoor corrugated yard signs**, **24×18**, **double-sided if possible**, with **H-stakes**.  
> Artwork: headline **CUT MY GRASS**, sub **Book a lawn cut in a few taps**, line **Powered by Black Rabbit**, phone **(407) 951-1663**, large **QR code** pointing to:  
> **https://www.blackrabbitlawn.com/cut-my-grass**  
> High contrast, weatherproof. Can you price single- vs double-sided and turnaround? I can supply a QR PNG/SVG or have you generate from that URL. Thanks — Jerry, Black Rabbit Landscaping / Yelm area.

---

*Aligned with go-public blueprint (2026-07-25 workflow). Shop hours/pricing: confirm live; site has listed 24×18 single-sided pricing and hours that may change.*

---

## Part F — Budget path if local print is too expensive (VistaPrint & friends)

Locals are great for **speed + same-day fixes**. If the quote is painful, go **online first** and keep total first-wave marketing under **~$50–120**.

### Reality check

| Path | Pros | Cons |
|------|------|------|
| **Nisqually Post & Print** | Local, advice, reorders easy | Can price higher for small runs |
| **VistaPrint / online** | Cheap unit prices, design in browser | Shipping time + cost; shipping can eat savings on **1–2** signs |
| **Amazon custom packs** | Sometimes cheap multi-packs | Quality varies; QR must still scan |
| **DIY home print** | Near $0 | Paper fades/warps outdoors fast — **OK for test only** |

**Rule:** Online wins when you order **enough units that shipping amortizes** (often **5–10+**), or when you catch a sale. One fancy local sign can cost as much as a whole online starter pack.

### Target budget ladders

| Budget | What to buy | Where |
|--------|-------------|--------|
| **$0–15** | No signs yet. Phone wallpaper QR + FB Reels + Nextdoor + text past customers. Print **1** free/cheap paper QR for the truck cab only (indoor). | Free channels |
| **~$25–50** | **2–5** single-sided 18×24 yard signs + wire stakes (sale pricing), **or** 1–2 signs + **50–100** cheapest business cards with QR | VistaPrint / Signs.com / similar |
| **~$50–100** | **5–10** single-sided 18×24 + stakes; truck gets 1–2; rest for job sites | Online bulk |
| **~$100–150** | 10 signs **or** 5 double-sided + cards; still skip vanity domain | Online |
| **Skip for now** | Vanity domain, truck wrap, paid ads, 50-sign political bulk | Later |

### VistaPrint (how to not overpay)

1. Go to VistaPrint **Yard Signs** (corrugated plastic / lawn signs).  
2. Size: **18" × 24"** (standard).  
3. **Single-sided first** — cuts cost; put signs where one face faces traffic.  
4. Order **5+** if possible — unit price drops; shipping is similar for 1 vs 5.  
5. Use their **upload design** (your QR + text) or a blank template — don’t pay for designer upsells.  
6. Stakes: add **wire H-stakes** in the order if not included.  
7. Shipping: pick the **cheapest standard** that still arrives in 1–2 weeks; rush is for emergencies only.  
8. Promo codes / email signup deals are common — check before checkout.  
9. **Always** upload a QR you already phone-tested (Part B).

**Copy for VistaPrint is the same as Part A** — short headline, big QR, phone, “Powered by Black Rabbit.” Don’t cram a paragraph; online templates look busy.

### Other online options to price-check the same day

| Vendor type | Why check |
|-------------|-----------|
| **VistaPrint** | Easy UI, frequent sales; yard signs often **from ~$11–15/unit** before bulk/shipping (varies) |
| **Signs.com / Signs on the Cheap / YardSignPlus-style** | Often **lower per-sign** on 18×24 coroplast in bulk |
| **Amazon** “custom yard signs 18x24 pack” | Sometimes multi-packs under $50–80 shipped — read reviews for outdoor durability |
| **Staples / Office Depot online** | Pickup if a store is closer than shipping wait |
| **UPS Store** | Sometimes competitive for **1–3** signs without waiting for mail |

Get **3 carts** (same size, qty 5, with stakes) and pick the lowest **total with shipping**.

### Ultra-budget sequence that still works

```text
Week 1 ( $0 )
  · Every FB Reel/post: link + phone
  · Nextdoor / neighbor texts
  · Google Business photo of the lawn work

Week 1–2 ( $0–10 )
  · Generate QR free → save PNG
  · Print 1 letter-size color page at library / home → tape in truck window (indoor)
  · Phone-scan test daily

Week 2–3 ( $40–80 online )
  · VistaPrint (or cheaper rival): 5× 18x24 single-sided + stakes
  · 1 on truck, 1 at home staging, 3 for jobs (permission)

Later (only if QR is getting scans / jobs)
  · Double-sided, more qty, local reprint for speed
  · Optional getcutmygrass.com
```

### Save money without looking cheap

| Do | Don’t |
|----|--------|
| One strong color (dark green + white) | Neon rainbow templates |
| Huge QR + short words | Tiny QR + long paragraphs |
| Single-sided, good placement | Double-sided nobody walks behind |
| 5 solid signs | 1 “premium” sign that sits in the garage |
| Same URL forever | Reprinting every week for new slogans |

### DIY QR file (free)

1. Use any free QR generator → **PNG**, error correction **M or Q**.  
2. URL only: `https://www.blackrabbitlawn.com/cut-my-grass`  
3. Open free Canva → **18×24 in** custom size (or their yard-sign template if listed).  
4. Paste Part A text + QR → download **PDF print**.  
5. Upload that PDF to VistaPrint / online printer.

### When to go back to the local shop

- Need signs **this weekend** for a job/event  
- Online shipping > local quote for small qty  
- First online batch was bad (peeling, unreadable QR) and you want a pro fix  
- Reorder of **same art** with next-day turnaround

### Bottom line

You can launch print on **~$50–100** with **VistaPrint (or cheaper online bulk)** without local pricing. Distribution (Reels, Nextdoor, truck QR) still does more than a $400 sign package. Local print is a **convenience upgrade**, not a requirement to go public.

---

## Part G — Making a “sexy” yard sign (with QR)

### What actually looks expensive on a lawn

Cheap signs fail because of **clutter**, not because of price. Premium signs share the same moves:

| Do | Why |
|----|-----|
| **One headline only** — `CUT MY GRASS` | Drivers get ~1 second |
| **Two colors + one accent** | Site palette: deep green `#1e3d1e`, cream `#f7f3eb`, amber `#c4a574` |
| **Huge type, short words** | Readable from a car |
| **QR in a pure white box** with padding | Scans + looks intentional |
| **Phone as backup** | Half of people still won’t scan |
| **“Powered by Black Rabbit” small** | Trust without competing with the product name |
| **Asymmetry** (text left / QR right) | Feels modern vs centered flyer junk |

### What kills the vibe (and the scan)

- Clip-art grass, cartoon mowers, 8 fonts  
- Yellow on green (low contrast)  
- QR smaller than a sticky note  
- URL typed out in tiny type *and* a QR (pick the QR; phone is enough backup)  
- “Licensed bonded insured free quotes weekly biweekly…” walls of text  
- Putting the logo *and* the full badge *and* a map *and* a QR  

### Layout formula (18×24 landscape)

```text
LEFT 60%  dark green
  amber kicker: YELM & SOUTH SOUND
  huge: CUT MY GRASS
  short line: Book a lawn cut in a few taps.
  phone: (407) 951-1663
  small: Powered by Black Rabbit · LBI

RIGHT 40%  cream panel (angled edge optional)
  white card
    [ BIG QR ]
  SCAN TO BOOK
  Owner-operated · Fair quotes
```

### Ready-made mockup (real QR)

| File | What |
|------|------|
| `docs/cmg-yard-sign-mockup.html` | Open in Chrome — Design A (dark/sexy) + Design B (light) |
| `docs/cmg-yard-sign-qr.png` | Scannable QR → live booking URL |

**How to use for VistaPrint / Canva**

1. Open `cmg-yard-sign-mockup.html` in a browser.  
2. Phone-scan the QR on screen (must open CMG).  
3. Screenshot Design A **or** Print → PDF (print CSS targets 24×18).  
4. Or rebuild in Canva: custom size **18×24 in**, paste same text + upload `cmg-yard-sign-qr.png`.  
5. Export PDF → upload to printer.

### Canva 5-minute version

1. Custom size **18 in × 24 in** (or 24×18 landscape).  
2. Background rectangle: `#1e3d1e`.  
3. Right third: cream `#f7f3eb`.  
4. Text: Montserrat or Impact-ish bold for headline only.  
5. Upload QR → size **≥ 3.5"** on the physical sign (bigger if you can).  
6. Amber accent bar or thin gold line for “expensive” cue.  
7. Download **PDF Print**.

### Optional “extra sexy” moves (still cheap)

- **Same art both sides** only if you got double-sided on sale  
- Matte dark green always beats glossy photo backgrounds for readability  
- One photo of a real Black Rabbit lawn **only** as a thin strip or corner — never under the QR  
- Don’t put Jerry’s face on v1 unless you want that brand vibe; product name + QR is cleaner for strangers  

### Copy lock (use exactly)

```text
YELM & SOUTH SOUND
CUT MY GRASS
Book a lawn cut in a few taps.
(407) 951-1663
Powered by Black Rabbit · LBI
SCAN TO BOOK
```

QR payload only: `https://www.blackrabbitlawn.com/cut-my-grass`

