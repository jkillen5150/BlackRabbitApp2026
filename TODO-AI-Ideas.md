# Black Rabbit / Cut My Grass — AI & Product Ideas To-Do

Last updated: August 3, 2026

---

## High Priority — User Acquisition & Core Experience

- [ ] Build the “Cut My Grass” agent flow (exact messaging already drafted)
- [ ] Implement the refined pricing algorithm
  - Minimum price: $40
  - Cleanup: $4 per full bag
  - Human override always available
- [ ] Make the quote experience feel agentic (not just a form)

## Medium Priority — Future Agent Capabilities

- [ ] Explore simple design agents for specialty projects (e.g. Western Gothic retaining wall for Andy & Jenny)
- [ ] Research whether any NVIDIA Agent Toolkit / NOOA pieces become practical for small ops later
- [ ] Consider provider-side agent (job notifications, suggested pricing, response help)

## Notes / Reference

### Pricing Algorithm (Current Version)
1. Serviceable Sq Ft = Lot Size – House Size
2. Base = Serviceable × 0.0056
3. Single Cut = Base × 1.10 → round to nearest $5 → min $40
4. Bi-weekly = Single × 2.15
5. Weekly = Single × 4.30
6. Apply 15% discount → round UP to nearest $5
7. Cleanup add-on = bags × $4

### Key Insight from NVIDIA GTC Taipei 2026
The industry is moving from chatbots to agents that *do work*.  
Black Rabbit should make the core experience feel like an agent that executes a lawn-care workflow, not just answers questions.

---

Keep this file updated as ideas solidify.
