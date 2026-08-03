# Black Rabbit / Cut My Grass — Pricing Algorithm

**Status:** Ready to deploy when needed  
**Last updated:** August 3, 2026

---

## Future Prompt for Grok

> When you’re ready to implement the pricing system, tell Grok:  
> **“Pull the pricing algorithm from `pricing-algorithm.md` into the main codebase.”**

---

## Pricing Rules (Current)

- Serviceable Sq Ft = Lot Size – House Size
- Base = Serviceable × 0.0056
- Single Cut = Base × 1.10 → round to nearest $5 → **minimum $40**
- Bi-weekly = Single × 2.15
- Weekly = Single × 4.30
- Apply 15% discount → round **UP** to nearest $5
- Cleanup add-on = **$4 per full bag**
- Always allow human override after seeing the actual yard

---

## Python Implementation

```python
import math

def calculate_lawn_prices(lot_sqft: float, house_sqft: float, bags: int = 0) -> dict:
    serviceable = max(lot_sqft - house_sqft, 0)
    base_price = serviceable * 0.0056

    # Single cut
    single = base_price * 1.10
    single = round(single / 5) * 5
    single = max(single, 40)          # Minimum $40

    # Frequency
    biweekly = single * 2.15
    weekly = single * 4.30

    def discount_and_round_up(price):
        return math.ceil((price * 0.85) / 5) * 5

    cleanup = bags * 4                # $4 per full bag

    return {
        "serviceable_sqft": round(serviceable),
        "one_time": int(single),
        "bi_weekly": int(discount_and_round_up(biweekly)),
        "weekly": int(discount_and_round_up(weekly)),
        "cleanup": cleanup,
        "note": "These are estimated prices. Final price can be adjusted after viewing the property."
    }
```

---

## JavaScript Implementation

```javascript
function calculateLawnPrices(lotSqft, houseSqft, bags = 0) {
  const serviceable = Math.max(lotSqft - houseSqft, 0);
  const basePrice = serviceable * 0.0056;

  let single = basePrice * 1.10;
  single = Math.round(single / 5) * 5;
  single = Math.max(single, 40);          // Minimum $40

  const biweekly = single * 2.15;
  const weekly = single * 4.30;

  function discountAndRoundUp(price) {
    return Math.ceil((price * 0.85) / 5) * 5;
  }

  return {
    serviceableSqft: Math.round(serviceable),
    oneTime: single,
    biWeekly: discountAndRoundUp(biweekly),
    weekly: discountAndRoundUp(weekly),
    cleanup: bags * 4,                    // $4 per full bag
    note: "These are estimated prices. Final price can be adjusted after viewing the property."
  };
}
```

---

Keep this file until you’re ready to wire it into the live app.
