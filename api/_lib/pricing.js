/**
 * Same math as js/pricing.js / pricing-algorithm.md
 */
export function calculateLawnPrices(lotSqft, houseSqft, bags) {
  const lot = Math.max(0, Number(lotSqft) || 0);
  const house = Math.max(0, Number(houseSqft) || 0);
  const bagCount = Math.max(0, Math.floor(Number(bags) || 0));
  const serviceable = Math.max(lot - house, 0);
  let oneTime = Math.round((serviceable * 0.0056 * 1.1) / 5) * 5;
  oneTime = Math.max(oneTime, 45);
  const biWeekly = Math.ceil((oneTime * 2.15 * 0.85) / 5) * 5;
  const weekly = Math.ceil((oneTime * 4.3 * 0.85) / 5) * 5;
  const cleanup = bagCount * 4;
  return {
    lotSqft: lot,
    houseSqft: house,
    serviceableSqft: Math.round(serviceable),
    oneTime,
    biWeekly,
    weekly,
    bags: bagCount,
    cleanup,
    oneTimeWithCleanup: oneTime + cleanup,
    note: 'Estimate only. Jerry can change this after seeing the yard. Service starts at $45 a cut.'
  };
}
