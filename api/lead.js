/**
 * POST /api/lead — chat / handoff lead
 * 1) Emails Jerry via Web3Forms (same pipeline as homepage form)
 * 2) Appends to data/leads.json via GitHub when GITHUB_TOKEN is set
 * 3) Keeps a warm in-memory list as a short-lived backup
 *
 * Env (optional):
 *   WEB3FORMS_KEY — defaults to site public key
 *   GITHUB_TOKEN  — repo contents write for durable admin list
 *   GITHUB_OWNER  — default jkillen5150
 *   GITHUB_REPO   — default BlackRabbitApp2026
 */
const WEB3_KEY =
  process.env.WEB3FORMS_KEY || '6467d992-e261-48c0-ae1e-2bc4b6cc557d';
const JERRY_PHONE = '407-951-1663';

function globalLeads() {
  const g = globalThis;
  if (!g.__brLeads) g.__brLeads = [];
  return g.__brLeads;
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

async function emailLead(lead) {
  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: WEB3_KEY,
      subject: `Black Rabbit CHAT lead — ${lead.name || 'Customer'}`,
      from_name: 'Black Rabbit Website Chat',
      name: lead.name,
      phone: lead.phone,
      address: lead.address || '(not provided)',
      message: [
        '--- Lead from Ask AI chat ---',
        `Name: ${lead.name}`,
        `Phone: ${lead.phone}`,
        `Address: ${lead.address || '(not provided)'}`,
        `Need: ${lead.need || '(not provided)'}`,
        `Urgency: ${lead.urgency || '(not provided)'}`,
        `Source: ${lead.source || 'assistant-chat'}`,
        `Time: ${lead.createdAt}`,
        '',
        'Text them back ASAP or call.',
        `Your public line: ${JERRY_PHONE}`
      ].join('\n')
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'Email send failed');
  }
  return data;
}

async function githubGetLeads() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  const owner = process.env.GITHUB_OWNER || 'jkillen5150';
  const repo = process.env.GITHUB_REPO || 'BlackRabbitApp2026';
  const path = 'data/leads.json';
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'black-rabbit-leads'
      }
    }
  );
  if (res.status === 404) return { leads: [], sha: null };
  if (!res.ok) {
    console.error('GitHub get leads', res.status, await res.text());
    return null;
  }
  const file = await res.json();
  const text = Buffer.from(file.content || '', 'base64').toString('utf8');
  let leads = [];
  try {
    leads = JSON.parse(text);
    if (!Array.isArray(leads)) leads = [];
  } catch {
    leads = [];
  }
  return { leads, sha: file.sha };
}

async function githubSaveLeads(leads, sha) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return false;
  const owner = process.env.GITHUB_OWNER || 'jkillen5150';
  const repo = process.env.GITHUB_REPO || 'BlackRabbitApp2026';
  const path = 'data/leads.json';
  const content = Buffer.from(JSON.stringify(leads, null, 2) + '\n').toString(
    'base64'
  );
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'black-rabbit-leads'
      },
      body: JSON.stringify({
        message: `chore: add chat lead ${leads[0]?.id || ''}`.slice(0, 72),
        content,
        sha: sha || undefined
      })
    }
  );
  if (!res.ok) {
    console.error('GitHub save leads', res.status, await res.text());
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — list leads for admin
  if (req.method === 'GET') {
    const gh = await githubGetLeads();
    const mem = globalLeads();
    let leads = gh?.leads || [];
    // merge in-memory leads not yet in file
    const ids = new Set(leads.map((l) => l.id));
    for (const l of mem) {
      if (!ids.has(l.id)) leads.unshift(l);
    }
    leads.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return res.status(200).json({
      leads,
      durable: !!process.env.GITHUB_TOKEN,
      note: process.env.GITHUB_TOKEN
        ? 'Leads stored in data/leads.json + email'
        : 'Email sent on each lead. Set GITHUB_TOKEN on Vercel for a durable Admin list.'
    });
  }

  // PATCH — update status { id, status }
  if (req.method === 'PATCH') {
    const body = parseBody(req);
    const id = clean(body.id, 80);
    const status = clean(body.status, 40) || 'new';
    if (!id) return res.status(400).json({ error: 'id required' });

    const gh = await githubGetLeads();
    let leads = gh?.leads || [...globalLeads()];
    const i = leads.findIndex((l) => l.id === id);
    if (i === -1) {
      // try memory
      const mem = globalLeads();
      const m = mem.find((l) => l.id === id);
      if (!m) return res.status(404).json({ error: 'Lead not found' });
      m.status = status;
      m.updatedAt = new Date().toISOString();
      return res.status(200).json({ lead: m });
    }
    leads[i] = {
      ...leads[i],
      status,
      updatedAt: new Date().toISOString()
    };
    await githubSaveLeads(leads, gh?.sha);
    // sync memory
    const mem = globalLeads();
    const mi = mem.findIndex((l) => l.id === id);
    if (mi >= 0) mem[mi] = leads[i];
    return res.status(200).json({ lead: leads[i] });
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

  if (!name || !phone) {
    return res.status(400).json({
      error: 'Name and phone are required',
      jerryPhone: JERRY_PHONE
    });
  }

  const lead = {
    id: 'lead-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    phone,
    address,
    need,
    urgency,
    source,
    status: 'new',
    createdAt: new Date().toISOString()
  };

  let emailed = false;
  let emailError = null;
  try {
    await emailLead(lead);
    emailed = true;
  } catch (e) {
    emailError = e.message || String(e);
    console.error('Lead email failed', e);
  }

  // memory
  globalLeads().unshift(lead);
  if (globalLeads().length > 200) globalLeads().length = 200;

  // durable
  let saved = false;
  try {
    const gh = await githubGetLeads();
    if (gh) {
      const next = [lead, ...gh.leads].slice(0, 500);
      saved = await githubSaveLeads(next, gh.sha);
    }
  } catch (e) {
    console.error('Lead persist failed', e);
  }

  if (!emailed && !saved) {
    return res.status(502).json({
      error: 'Could not deliver lead',
      detail: emailError,
      jerryPhone: JERRY_PHONE,
      fallback: `Text Jerry directly at ${JERRY_PHONE}`
    });
  }

  return res.status(200).json({
    ok: true,
    lead,
    emailed,
    saved,
    jerryPhone: JERRY_PHONE,
    message: emailed
      ? 'Jerry has been emailed this lead.'
      : 'Lead saved; email may have failed — text Jerry too.'
  });
}
