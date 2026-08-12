/**
 * GET  /api/pipeline — commercial targets (public list of businesses, no client PII)
 * POST /api/pipeline { action: 'sync-sheet' } — push to Google Sheet (admin)
 * GET  /api/pipeline?ops=1 — sheet + next-action helper status (admin if token set)
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { suggestNextAction, syncPipelineToSheet, sheetsPublicStatus } from './_lib/sheets.js';

function requireAdmin(req, res) {
  const secret = String(process.env.LEAD_ADMIN_TOKEN || '').trim();
  if (!secret) return true;
  const header = String(req.headers['x-lead-token'] || '').trim();
  const auth = String(req.headers.authorization || '');
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || '';
  if (header === secret || bearer === secret) return true;
  res.status(401).json({ error: 'Unauthorized' });
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

function loadPipeline() {
  const p = join(process.cwd(), 'data', 'commercial-pipeline.json');
  const raw = JSON.parse(readFileSync(p, 'utf8'));
  return raw;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Lead-Token, Authorization'
  );
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const data = loadPipeline();
    return res.status(200).json({
      ok: true,
      ...data,
      sheets: sheetsPublicStatus(),
      nextActionHint: suggestNextAction({ status: 'new' })
    });
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    const body = parseBody(req);
    if (String(body.action || '') !== 'sync-sheet') {
      return res.status(400).json({ ok: false, error: 'Unknown action' });
    }
    const data = loadPipeline();
    const result = await syncPipelineToSheet(data.targets || []);
    return res.status(result.ok ? 200 : 502).json({ ok: !!result.ok, ...result });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
