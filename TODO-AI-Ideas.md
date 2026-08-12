# Black Rabbit / Cut My Grass — AI & Product Ideas To-Do

Last updated: August 10, 2026

---

## High Priority — User Acquisition & Core Experience

- [ ] Build the “Cut My Grass” agent flow (exact messaging already drafted)
- [x] Implement the refined pricing algorithm (working, not pretty)
  - `/api/quote` + Admin **Ballpark quote** + `js/pricing.js`
  - Minimum price: $45 (public: service starts at $45 a cut)
  - Cleanup: $4 per full bag
  - Human override always available
- [ ] Make the quote experience feel agentic (not just a form)

## High Priority — Ops Backend & Agentic Automation

- [x] Set up Google Sheets as live ops backend (working path)
  - Existing centerpiece: **Black Rabbit PNW • Client Database**
  - New tab written by the site: **Web Leads** (does not touch Client Database rows)
  - Core columns: Timestamp | Source | Name | Phone | Address | Service | Notes | Status | Track token | Deposit paid? | Assigned | Next action | Lead ID
  - Fastest connect: paste `docs/ops-sheet-apps-script.js` → `GOOGLE_SHEETS_WEBHOOK`
- [x] Extend `/api/lead` (and status updates) to append/update Web Leads when webhook or service account is set
  - Keep existing leads.json durability
- [x] Wire admin status changes and deposit confirmations to the same Sheet (when configured)
- [ ] Add thin agent layer on top of the Sheet:
  - Daily/periodic review of open leads
  - Draft personalized quotes or SMS using address + photos + pricing algorithm
  - Suggest next actions / flag silent leads
  - Keep human (Jerry) as final decision maker
- [ ] Competitive positioning note: Use the Sheet + agent to stay more reliable and personal than LawnStarter / GreenPal / Plowz & Mowz (faster response, transparent status, owner-operated feel) while reducing admin time

## High Priority — Commercial Pipeline & Door-Knocking Agents (new)

**Primary Sheet:** Black Rabbit PNW • Client Database (existing centerpiece)
Add new tab: **Commercial Pipeline**

### Research / List-Building Agent (First Agent – Outline)
**Job Title:** Commercial Research Associate  
**Role:** Find and maintain a clean list of commercial properties, property managers, and brokers in the core service area (Yelm, Rainier, Lacey, Olympia, Tumwater, Tenino, Roy + nearby) that are realistic targets for ongoing grounds maintenance, seasonal cleanups, or project work.

**Core Responsibilities:**
1. Build and continuously refresh a target list of:
   - Multi-family / apartment complexes
   - Retail centers & strip malls
   - Office parks / light commercial
   - Industrial / light industrial sites
   - Larger HOAs or managed communities
   - Properties with visible maintenance needs or recent ownership changes
2. Enrich each entry with:
   - Property address + city
   - Estimated size / complexity
   - Property management company (if any)
   - Decision-maker or broker name + contact method (email / LinkedIn / phone when available)
   - Recent signals (new listing, renovation, tenant turnover, online complaints, etc.)
   - Suggested outreach angle
3. Output everything cleanly into the **Commercial Pipeline** tab of the Client Database sheet.
4. Flag high-priority or high-fit targets for human review.

**Tools the agent should use:**
- Web search + page browsing (county assessor, commercial listing sites, Google Maps, Chamber directories, LinkedIn)
- Structured output to Google Sheet
- Optional later: public data APIs or simple scrapers if we decide to harden it

**Guardrails:**
- Hyper-local only (stay inside realistic driving / service radius)
- Quality over quantity (better 40 solid targets than 400 noise)
- No automated cold email or LinkedIn spam — agent researches and drafts; Jerry reviews and sends
- Always note source of information for later verification

**Success metric for v1:** Deliver a usable first batch of 25–40 enriched commercial targets that Jerry can review and start personalized outreach from.

- [x] v1 list shipped: `data/commercial-pipeline.json` (30 targets) + Admin **Commercial pipeline**. Ridgeline marked Nurture (already hired). No residential client PII in the repo.

### Follow-on Agents (later)
- Enrichment / Contact Finder Agent
- Outreach Drafting Agent (personalized short messages referencing specific properties)
- Follow-up & Tracking Agent (logs touches back into the same Commercial Pipeline tab)

### Commercial Pipeline Tab – Suggested Columns
| Column | Purpose |
|--------|--------|
| ID | Simple sequential |
| Property / Company Name | |
| Address | |
| City | |
| Type (Multi-family / Retail / Office / Industrial / HOA / Other) | |
| Est. Size / Complexity | |
| Property Manager / Owner | |
| Decision Maker | |
| Contact Method (Email / LinkedIn / Phone) | |
| Contact Details | |
| Recent Signal / Why Target | |
| Suggested Angle | |
| Priority (High / Med / Low) | |
| Status (New / Researched / Contacted / Replied / Meeting / Won / Lost / Nurture) | |
| Last Touch Date | |
| Notes | |
| Source of Data | |

---

## Medium Priority — Future Agent Capabilities

- [ ] Explore simple design agents for specialty projects (e.g. Western Gothic retaining wall for Andy & Jenny)
- [ ] Research whether any NVIDIA Agent Toolkit / NOOA pieces become practical for small ops later
- [ ] Consider provider-side agent (job notifications, suggested pricing, response help)

## Notes / Reference

### Pricing Algorithm (Current Version)
1. Serviceable Sq Ft = Lot Size – House Size
2. Base = Serviceable × 0.0056
3. Single Cut = Base × 1.10 → round to nearest $5 → min $45
4. Bi-weekly = Single × 2.15
5. Weekly = Single × 4.30
6. Apply 15% discount → round UP to nearest $5
7. Cleanup add-on = bags × $4

### Key Insight from NVIDIA GTC Taipei 2026
The industry is moving from chatbots to agents that *do work*.  
Black Rabbit should make the core experience feel like an agent that executes a lawn-care workflow, not just answers questions.

### Google Sheets + Agent Design (Aug 10 2026 discussion)
- Stay on existing Vercel static + serverless stack — no native app required.
- Sheet becomes the single live ops view (filterable on phone).
- Serverless functions do the reliable writes; agent works *on top* of the data.
- Smallest useful version: Sheet + auto-write from /api/lead → then status updates → then agent review loop.

### Commercial Door-Knocking System (Aug 10 2026)
- Primary sheet remains the existing Client Database.
- New **Commercial Pipeline** tab will hold research targets.
- First agent = Research / List-Building (outline above).
- Philosophy: agents act as junior employees that research and draft; human (Jerry) remains the relationship owner and final sender.

---

Keep this file updated as ideas solidify.
