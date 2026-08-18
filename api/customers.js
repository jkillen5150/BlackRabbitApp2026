/**
 * Private client roster (exact addresses) — Admin only.
 *
 * GET  /api/customers — load roster (requires X-Lead-Token when LEAD_ADMIN_TOKEN set)
 * PUT  /api/customers — replace roster body { customers, groups, ... }
 *
 * Durable via GITHUB_TOKEN → encrypted data/customers.json (gitignored path).
 */
import {
  emptyRoster,
  githubGetRoster,
  githubSaveRoster,
  isCustomersDurableConfigured,
  lastGithubStoreError,
  loadRoster
} from './_lib/customers-store.js';

function requireLeadAdmin(req, res) {
  const secret = String(process.env.LEAD_ADMIN_TOKEN || '').trim();
  if (!secret) return true;
  const header = String(req.headers['x-lead-token'] || '').trim();
  const auth = String(req.headers.authorization || '');
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || '';
  if (header === secret || bearer === secret) return true;
  res.status(401).json({
    error: 'Unauthorized',
    note: 'Set X-Lead-Token to match LEAD_ADMIN_TOKEN (same token as Follow-up leads).'
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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (!requireLeadAdmin(req, res)) return;

  if (req.method === 'GET') {
    const loaded = await loadRoster();
    const customers = loaded.roster.customers || [];
    res.status(200).json({
      ...loaded.roster,
      customers,
      count: customers.length,
      durable: loaded.durable,
      error: loaded.error || null
    });
    return;
  }

  if (req.method === 'PUT') {
    if (!isCustomersDurableConfigured()) {
      res.status(503).json({
        error: 'Durable storage not configured',
        note: 'Set GITHUB_TOKEN (Contents: Read and write) on Vercel.'
      });
      return;
    }
    const enc = String(process.env.LEADS_ENCRYPTION_KEY || process.env.LEAD_ADMIN_TOKEN || '').trim();
    if (!enc) {
      res.status(503).json({
        error: 'Encryption secret missing',
        note: 'Set LEADS_ENCRYPTION_KEY or LEAD_ADMIN_TOKEN so the roster can be encrypted at rest.'
      });
      return;
    }

    const body = parseBody(req);
    const roster = {
      ...emptyRoster(),
      ...body,
      updatedAt: new Date().toISOString().slice(0, 10),
      customers: Array.isArray(body.customers) ? body.customers : [],
      groups: Array.isArray(body.groups) ? body.groups : []
    };

    const current = await githubGetRoster();
    if (current === null) {
      res.status(502).json({
        error: 'Could not read customers store',
        detail: lastGithubStoreError()
      });
      return;
    }

    const saved = await githubSaveRoster(
      roster,
      current.sha,
      `chore: update customers roster (${roster.customers.length})`
    );
    if (!saved) {
      res.status(502).json({
        error: 'Could not save customers roster',
        detail: lastGithubStoreError()
      });
      return;
    }

    res.status(200).json({
      ok: true,
      count: roster.customers.length,
      durable: true,
      updatedAt: roster.updatedAt
    });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
