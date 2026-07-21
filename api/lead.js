/**
 * POST /api/lead — chat / handoff lead
 * 1) Emails Jerry via Web3Forms (same pipeline as homepage form)
 * 2) Appends to data/leads.json via GitHub when GITHUB_TOKEN is set
 * 3) Keeps a warm in-memory list as a short-lived backup (same function only)
 *
 * Env (optional):
 *   WEB3FORMS_KEY     — defaults to site public key
 *   GITHUB_TOKEN      — repo contents write (required for /api/track across instances)
 *   GITHUB_OWNER      — default jkillen5150
 *   GITHUB_REPO       — default BlackRabbitApp2026
 *   LEAD_ADMIN_TOKEN  — if set, required on GET/PATCH (header X-Lead-Token or Bearer)
 *   SITE_URL          — for track links in email (prefer https://www.blackrabbitlawn.com)
 */
import { randomBytes } from 'crypto';
import {
  appendLead,
  isDurableConfigured,
  leadForStorage,
  loadAllLeads,
  siteUrl,
  updateLead
} from './_lib/leads-store.js';

const WEB3_KEY =
  process.env.WEB3FORMS_KEY || '6467d992-e261-48c0-ae1e-2bc4b6cc557d';
const JERRY_PHONE = '407-951-1663';

/** When LEAD_ADMIN_TOKEN is set, block unauthenticated list/update of PII. */
function requireLeadAdmin(req, res) {
  const secret = process.env.LEAD_ADMIN_TOKEN;
  if (!secret) return true;
  const header = String(req.headers['x-lead-token'] || '');
  const auth = String(req.headers.authorization || '');
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || '';
  if (header === secret || bearer === secret) return true;
  res.status(401).json({
    error: 'Unauthorized',
    note: 'Set X-Lead-Token to match LEAD_ADMIN_TOKEN on Vercel (Admin can store it for this browser session).'
  });
  return false;
}

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  return body || {};
}

function clean(s, max = 500) {
  return String(s || '')
    .trim()
    .slice(0, max);
}

function makeTrackToken() {
  return randomBytes(18).toString('base64url');
}

function parseDataUrl(dataUrl) {
  const m = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1], content: m[2] };
}

/** Normalize client photos: max 2, JPEG base64 only, size-capped. */
function normalizePhotos(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw.slice(0, 2)) {
    const dataUrl = item && (item.dataUrl || item.dataURL || item.content);
    const parsed = parseDataUrl(dataUrl);
    if (!parsed || !parsed.content) continue;
    // ~350KB base64 ≈ safe for serverless + email attach
    if (parsed.content.length > 480000) continue;
    const mime = parsed.mime || 'image/jpeg';
    if (!String(mime).startsWith('image/')) continue;
    let filename = clean(item.filename || item.name || `yard-${out.length + 1}.jpg`, 80);
    if (!/\.(jpe?g|png|webp|gif)$/i.test(filename)) filename += '.jpg';
    out.push({
      filename,
      mimeType: mime,
      content: parsed.content,
      previewDataUrl: `data:${mime};base64,${parsed.content}`
    });
  }
  return out;
}

async function emailLead(lead) {
  const isCmg = String(lead.source || '').includes('cut-my-grass');
  const subject = isCmg
    ? `Cut My Grass request — ${lead.name || 'Customer'}`
    : `Black Rabbit CHAT lead — ${lead.name || 'Customer'}`;
  const fromName = isCmg ? 'Cut My Grass (Black Rabbit)' : 'Black Rabbit Website Chat';
  const banner = isCmg ? '--- Cut My Grass booking ---' : '--- Lead from Ask AI chat ---';
  const photoNote =
    lead.photoCount > 0
      ? `Photos: ${lead.photoCount} attached to this email`
      : 'Photos: none';
  const depositNote = isCmg
    ? 'Deposit: customer will be sent to Stripe Checkout after this email (watch for payment in Stripe Dashboard).'
    : null;
  const site = siteUrl();
  const trackNote =
    lead.trackToken && isCmg
      ? `Customer track link: ${site}/track?t=${lead.trackToken}`
      : null;

  const payload = {
    access_key: WEB3_KEY,
    subject,
    from_name: fromName,
    name: lead.name,
    phone: lead.phone,
    address: lead.address || '(not provided)',
    message: [
      banner,
      `Name: ${lead.name}`,
      `Phone: ${lead.phone}`,
      `Address: ${lead.address || '(not provided)'}`,
      `Need: ${lead.need || '(not provided)'}`,
      `Urgency: ${lead.urgency || '(not provided)'}`,
      `Source: ${lead.source || 'assistant-chat'}`,
      photoNote,
      depositNote,
      trackNote,
      `Time: ${lead.createdAt}`,
      '',
      'Text them back ASAP or call.',
      `Your public line: ${JERRY_PHONE}`
    ]
      .filter(Boolean)
      .join('\n')
  };

  // Web3Forms attachments: base64 content without data: prefix
  if (Array.isArray(lead._emailPhotos) && lead._emailPhotos.length) {
    payload.attachments = lead._emailPhotos.map((p) => ({
      filename: p.filename,
      mimeType: p.mimeType || 'image/jpeg',
      content: p.content
    }));
  }

  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'Email send failed');
  }
  return data;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Lead-Token, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — list leads for admin
  if (req.method === 'GET') {
    if (!requireLeadAdmin(req, res)) return;
    const { leads, durable } = await loadAllLeads();
    // Prefer full in-memory objects (photo previews) when present
    return res.status(200).json({
      leads,
      durable: durable || isDurableConfigured(),
      note: isDurableConfigured()
        ? 'Leads stored in data/leads.json + email'
        : 'Email sent on each lead. Set GITHUB_TOKEN on Vercel so track links & Admin list survive cold starts (required for /track).'
    });
  }

  // PATCH — update status { id, status }
  if (req.method === 'PATCH') {
    if (!requireLeadAdmin(req, res)) return;
    const body = parseBody(req);
    const id = clean(body.id, 80);
    const status = clean(body.status, 40) || 'new';
    if (!id) return res.status(400).json({ error: 'id required' });

    const lead = await updateLead(id, { status });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    return res.status(200).json({ lead: leadForStorage(lead) });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseBody(req);
  const name = clean(body.name, 120);
  const phone = clean(body.phone, 40);
  const address = clean(body.address, 300);
  const need = clean(body.need || body.message, 2000);
  const urgency = clean(body.urgency, 80);
  const source = clean(body.source, 80) || 'assistant-chat';
  const photos = normalizePhotos(body.photos);

  if (!name || !phone) {
    return res.status(400).json({
      error: 'Name and phone are required',
      jerryPhone: JERRY_PHONE
    });
  }

  const lead = {
    id: 'lead-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    trackToken: makeTrackToken(),
    name,
    phone,
    address,
    need,
    urgency,
    source,
    status: 'new',
    photoCount: photos.length,
    depositPaid: false,
    // warm Admin previews (not written to GitHub)
    photoPreviews: photos.map((p) => p.previewDataUrl),
    _emailPhotos: photos.map((p) => ({
      filename: p.filename,
      mimeType: p.mimeType,
      content: p.content
    })),
    createdAt: new Date().toISOString()
  };

  // Accept into memory + durable store first so booking continues even if email fails.
  const saved = await appendLead(lead);

  let emailed = false;
  let emailError = null;
  try {
    await emailLead(lead);
    emailed = true;
  } catch (e) {
    emailError = e.message || String(e);
    console.error('Lead email failed', e);
  }

  // Drop raw base64 from email helper field after send; keep previews for Admin session
  delete lead._emailPhotos;

  const publicLead = leadForStorage(lead);
  const site = siteUrl(req);

  // Never hard-fail the customer after we have a lead id — client may also email via Web3Forms.
  return res.status(200).json({
    ok: true,
    lead: publicLead,
    trackToken: lead.trackToken,
    trackUrl: lead.trackToken
      ? `${site}/track?t=${encodeURIComponent(lead.trackToken)}`
      : null,
    emailed,
    saved,
    durable: isDurableConfigured(),
    accepted: true,
    emailError: emailed ? null : emailError,
    jerryPhone: JERRY_PHONE,
    message: emailed
      ? 'Jerry has been emailed this lead.'
      : saved
        ? 'Lead saved. Server email failed — client fallback may still notify Jerry.'
        : 'Lead accepted. Server email failed — client should notify Jerry via Web3Forms.'
  });
}
