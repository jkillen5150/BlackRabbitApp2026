# Black Rabbit / Cut My Grass — AI & Product Ideas To-Do

Last updated: August 10, 2026

---

## High Priority — User Acquisition & Core Experience

- [ ] Build the “Cut My Grass” agent flow (exact messaging already drafted)
- [ ] Implement the refined pricing algorithm
  - Minimum price: $45 (public: service starts at $45 a cut)
  - Cleanup: $4 per full bag
  - Human override always available
- [ ] Make the quote experience feel agentic (not just a form)

## High Priority — Ops Backend & Agentic Automation (new)

- [ ] Set up Google Sheets as live ops backend ("Black Rabbit Ops 2026")
  - Tabs: Leads, Jobs/Schedule, Clients
  - Core columns for Leads: Timestamp | Source | Name | Phone | Address | Service | Notes/Photos | Status | Track token | Deposit paid? | Assigned | Next action
- [ ] Extend `/api/lead` (and status updates) to automatically append/update rows in the Google Sheet via service account
  - Keep existing leads.json durability as fallback or phase it out later
  - Store Google service-account credentials as Vercel env var
- [ ] Wire admin status changes (texted → booked → on the way → done) and deposit confirmations to the same Sheet
- [ ] Add thin agent layer on top of the Sheet:
  - Daily/periodic review of open leads
  - Draft personalized quotes or SMS using address + photos + pricing algorithm
  - Suggest next actions / flag silent leads
  - Keep human (Jerry) as final decision maker
- [ ] Competitive positioning note: Use the Sheet + agent to stay more reliable and personal than LawnStarter / GreenPal / Plowz & Mowz (faster response, transparent status, owner-operated feel) while reducing admin time

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

---

Keep this file updated as ideas solidify.
