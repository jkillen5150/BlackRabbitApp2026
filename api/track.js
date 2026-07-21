/**
 * GET /api/track?t=TOKEN
 * Public job status for Cut My Grass customers (token-gated, no full PII).
 *
 * Requires durable storage (GITHUB_TOKEN) in production — /api/lead memory
 * is a different serverless isolate and is not visible here.
 */
import { findLeadByTrackToken, isDurableConfigured } from './_lib/leads-store.js';

function clean(s, max = 200) {
  return String(s || '')
    .trim()
    .slice(0, max);
}

const STATUS_META = {
  new: {
    label: 'Request received',
    blurb: 'We’ve got your cut request. Jerry will follow up soon.',
    step: 0
  },
  deposit_paid: {
    label: 'Deposit received',
    blurb: 'Thanks — your slot hold is in. We’ll confirm timing next.',
    step: 1
  },
  texted: {
    label: 'We’re in touch',
    blurb: 'Jerry has reached out (or will shortly) to lock details.',
    step: 2
  },
  booked: {
    label: 'Scheduled',
    blurb: 'You’re on the calendar. We’ll see you at the property.',
    step: 3
  },
  en_route: {
    label: 'On the way',
    blurb: 'Crew is heading over. Hang tight.',
    step: 4
  },
  done: {
    label: 'Completed',
    blurb: 'Job marked done. Thanks for choosing Black Rabbit.',
    step: 5
  }
};

const PIPELINE = ['new', 'deposit_paid', 'texted', 'booked', 'en_route', 'done'];

function firstName(name) {
  const n = clean(name, 80);
  if (!n) return 'there';
  return n.split(/\s+/)[0];
}

function serviceHint(need) {
  const t = clean(need, 200);
  if (!t) return 'Lawn care';
  const m = t.match(/Service:\s*([^·]+)/i);
  if (m) return m[1].trim().slice(0, 80);
  return t.slice(0, 80);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const q = req.query || {};
  const t = clean(q.t || q.token || '', 80);
  if (!t || t.length < 8) {
    return res.status(400).json({ error: 'Missing track token' });
  }

  const lead = await findLeadByTrackToken(t);

  if (!lead) {
    return res.status(404).json({
      error: 'Not found',
      note: isDurableConfigured()
        ? 'This link may be old, or the job is no longer in active storage. Text Jerry at 407-951-1663.'
        : 'Track storage is not configured on the server (set GITHUB_TOKEN on Vercel, then redeploy). Text Jerry at 407-951-1663.'
    });
  }

  let status = clean(lead.status, 40) || 'new';
  if (lead.depositPaid && status === 'new') status = 'deposit_paid';
  if (!STATUS_META[status]) status = 'new';

  const meta = STATUS_META[status];
  const steps = PIPELINE.map((key) => {
    const m = STATUS_META[key];
    return {
      key,
      label: m.label,
      done: m.step <= meta.step,
      current: key === status
    };
  });

  return res.status(200).json({
    ok: true,
    status,
    statusLabel: meta.label,
    blurb: meta.blurb,
    steps,
    depositPaid: !!lead.depositPaid,
    firstName: firstName(lead.name),
    serviceHint: serviceHint(lead.need),
    urgency: clean(lead.urgency, 80) || null,
    createdAt: lead.createdAt || null,
    poweredBy: 'Black Rabbit'
  });
}
