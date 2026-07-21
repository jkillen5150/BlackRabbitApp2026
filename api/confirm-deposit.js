/**
 * POST /api/confirm-deposit
 * After Stripe Checkout success, verify the session and notify Jerry.
 *
 * Body: { sessionId }
 *
 * Env:
 *   STRIPE_SECRET_KEY
 *   WEB3FORMS_KEY (optional — same as lead email)
 *   GITHUB_TOKEN (optional but required so deposit_paid shows on /track)
 *   SITE_URL
 */
import {
  findLeadById,
  siteUrl,
  updateLead
} from './_lib/leads-store.js';

const WEB3_KEY =
  process.env.WEB3FORMS_KEY || '6467d992-e261-48c0-ae1e-2bc4b6cc557d';
const JERRY_PHONE = '407-951-1663';

function clean(s, max = 200) {
  return String(s || '')
    .trim()
    .slice(0, max);
}

function dollars(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return '—';
  return (n / 100).toFixed(2);
}

function confirmedSet() {
  const g = globalThis;
  if (!g.__brDepositConfirmed) g.__brDepositConfirmed = new Set();
  return g.__brDepositConfirmed;
}

async function markLeadDepositPaid(leadId, info) {
  if (!leadId) return null;
  const existing = await findLeadById(leadId);
  const nextStatus =
    existing && existing.status && existing.status !== 'new'
      ? existing.status
      : 'deposit_paid';
  return updateLead(leadId, {
    depositPaid: true,
    depositAmountCents: info.amountCents,
    depositSessionId: info.sessionId,
    status: nextStatus
  });
}

async function emailJerryPaid(info) {
  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: WEB3_KEY,
      subject: `DEPOSIT PAID $${info.amountLabel} — ${info.name || 'Customer'}`,
      from_name: 'Cut My Grass (Stripe)',
      name: info.name || 'Customer',
      phone: info.phone || '',
      message: [
        '--- Cut My Grass DEPOSIT PAID ---',
        `Amount: $${info.amountLabel}`,
        `Name: ${info.name || '(unknown)'}`,
        `Phone: ${info.phone || '(unknown)'}`,
        `Address: ${info.address || '(not provided)'}`,
        `Service: ${info.service || '(not provided)'}`,
        `Lead ID: ${info.leadId || '(none)'}`,
        info.trackUrl ? `Customer track: ${info.trackUrl}` : null,
        `Stripe session: ${info.sessionId}`,
        `Payment status: ${info.paymentStatus}`,
        `Time: ${new Date().toISOString()}`,
        '',
        'Text them to confirm the slot. Update status in Admin so their track page moves.',
        `Your public line: ${JERRY_PHONE}`
      ]
        .filter(Boolean)
        .join('\n')
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'Email send failed');
  }
  return data;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  const sessionId = clean(body.sessionId || body.session_id, 200);
  if (!sessionId || !sessionId.startsWith('cs_')) {
    return res.status(400).json({ error: 'Valid Stripe sessionId required' });
  }

  // Idempotent — don't spam Jerry on refresh
  if (confirmedSet().has(sessionId)) {
    return res.status(200).json({ ok: true, alreadyConfirmed: true, paid: true });
  }

  try {
    const stripeRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      {
        headers: {
          Authorization: `Bearer ${secret}`,
          'Stripe-Version': '2024-06-20'
        }
      }
    );
    const session = await stripeRes.json().catch(() => ({}));
    if (!stripeRes.ok) {
      console.error('Stripe retrieve session', session);
      return res.status(502).json({
        error: 'Could not verify payment',
        detail: session.error?.message || 'Stripe error'
      });
    }

    const paid =
      session.payment_status === 'paid' ||
      (session.status === 'complete' && session.payment_status !== 'unpaid');

    if (!paid) {
      return res.status(200).json({
        ok: true,
        paid: false,
        paymentStatus: session.payment_status || session.status
      });
    }

    const meta = session.metadata || {};
    const amountCents =
      session.amount_total != null
        ? session.amount_total
        : parseInt(process.env.STRIPE_DEPOSIT_AMOUNT_CENTS || '2500', 10);
    const info = {
      sessionId,
      amountCents,
      amountLabel: dollars(amountCents),
      name: clean(meta.customer_name, 120),
      phone: clean(meta.customer_phone, 40),
      address: clean(meta.address, 300),
      service: clean(meta.service, 120),
      leadId: clean(meta.lead_id, 80),
      paymentStatus: session.payment_status
    };

    // Prefer customer_details from Stripe if metadata empty
    if (!info.name && session.customer_details?.name) {
      info.name = clean(session.customer_details.name, 120);
    }
    if (!info.phone && session.customer_details?.phone) {
      info.phone = clean(session.customer_details.phone, 40);
    }

    const lead = await markLeadDepositPaid(info.leadId, info);
    const site = siteUrl(req);
    const trackToken = lead && lead.trackToken ? lead.trackToken : null;
    const trackUrl = trackToken
      ? `${site}/track?t=${encodeURIComponent(trackToken)}`
      : null;

    let emailed = false;
    try {
      await emailJerryPaid({ ...info, trackUrl });
      emailed = true;
    } catch (e) {
      console.error('Deposit paid email failed', e);
    }

    confirmedSet().add(sessionId);

    return res.status(200).json({
      ok: true,
      paid: true,
      emailed,
      amountLabel: info.amountLabel,
      leadId: info.leadId || null,
      name: info.name || null,
      trackToken,
      trackUrl
    });
  } catch (e) {
    console.error('confirm-deposit', e);
    return res.status(500).json({
      error: 'Confirm failed',
      detail: e.message || String(e)
    });
  }
}
