/**
 * POST /api/quote — ballpark lawn price from lot / house sqft.
 * Public math. Jerry still overrides after seeing the yard.
 */
import { calculateLawnPrices } from './_lib/pricing.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};
  const lot = body.lotSqft ?? body.lot ?? req.query?.lotSqft;
  const house = body.houseSqft ?? body.house ?? req.query?.houseSqft;
  const bags = body.bags ?? req.query?.bags;

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!lot) {
    return res.status(400).json({
      error: 'lotSqft required',
      hint: 'POST { lotSqft, houseSqft, bags }'
    });
  }
  return res.status(200).json({ ok: true, quote: calculateLawnPrices(lot, house, bags) });
}
