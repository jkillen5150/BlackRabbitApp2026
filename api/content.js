/**
 * GET  /api/content — public site content (reviews, portfolio, pins)
 * PUT  /api/content — replace content.json (admin token)
 * POST /api/content — { action: 'upload-photo', dataUrl, id? } → media path
 * POST /api/content — { action: 'delete-photo', path } (admin)
 *
 * Env:
 *   GITHUB_TOKEN      — required for durable read/write
 *   LEAD_ADMIN_TOKEN  — if set, required on PUT/POST (same token as Admin leads)
 *   GITHUB_OWNER / GITHUB_REPO — optional overrides
 */
import {
  githubDeletePortfolioPhoto,
  githubGetContent,
  githubSaveContent,
  githubUploadPortfolioPhoto,
  isDurableConfigured,
  lastGithubStoreError,
  normalizeContent,
  publicMediaUrl
} from './_lib/content-store.js';

function requireAdmin(req, res) {
  const secret = String(process.env.LEAD_ADMIN_TOKEN || '').trim();
  // If no admin token configured, still allow when durable is set (same model as early leads),
  // but warn — production should always set LEAD_ADMIN_TOKEN.
  if (!secret) return true;
  const header = String(req.headers['x-lead-token'] || '').trim();
  const auth = String(req.headers.authorization || '');
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || '';
  if (header === secret || bearer === secret) return true;
  res.status(401).json({
    error: 'Unauthorized',
    note: 'Set X-Lead-Token to match LEAD_ADMIN_TOKEN on Vercel (same token as Admin leads).'
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

function parseDataUrl(dataUrl) {
  const m = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1], content: m[2] };
}

function extForMime(mime) {
  const m = String(mime || '').toLowerCase();
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  return 'jpg';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Lead-Token, Authorization'
  );
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // —— GET: public content ——
  if (req.method === 'GET') {
    if (!isDurableConfigured()) {
      return res.status(200).json({
        durable: false,
        content: null,
        note: 'GITHUB_TOKEN not set — clients should use static data/content.json'
      });
    }
    const gh = await githubGetContent();
    if (!gh) {
      return res.status(502).json({
        durable: true,
        content: null,
        error: lastGithubStoreError() || 'Could not load content from GitHub'
      });
    }
    return res.status(200).json({
      durable: true,
      content: gh.content,
      sha: gh.sha
    });
  }

  // —— PUT: publish full content.json ——
  if (req.method === 'PUT') {
    if (!requireAdmin(req, res)) return;
    if (!isDurableConfigured()) {
      return res.status(503).json({
        ok: false,
        error:
          'GITHUB_TOKEN not set on Vercel. Portfolio cannot be published until durable storage is configured.'
      });
    }

    const body = parseBody(req);
    const content = normalizeContent(body.content || body);
    let sha = body.sha || null;

    // Always re-read sha if missing to avoid accidental create races
    if (!sha) {
      const current = await githubGetContent();
      if (!current) {
        return res.status(502).json({
          ok: false,
          error: lastGithubStoreError() || 'Could not read current content.json'
        });
      }
      sha = current.sha;
    }

    const saved = await githubSaveContent(
      content,
      sha,
      `chore: admin publish content (${(content.portfolio || []).length} portfolio)`
    );
    if (!saved.ok) {
      // Conflict: one retry with fresh sha
      if (String(saved.error || '').includes('409') || String(saved.error || '').includes('sha')) {
        const fresh = await githubGetContent();
        if (fresh) {
          const retry = await githubSaveContent(
            content,
            fresh.sha,
            'chore: admin publish content (retry)'
          );
          if (retry.ok) {
            return res.status(200).json({
              ok: true,
              durable: true,
              content,
              sha: retry.sha,
              note: 'Published to data/content.json on GitHub. Site redeploy may take a minute; API readers see it now.'
            });
          }
          return res.status(502).json({ ok: false, error: retry.error });
        }
      }
      return res.status(502).json({ ok: false, error: saved.error });
    }

    return res.status(200).json({
      ok: true,
      durable: true,
      content,
      sha: saved.sha,
      note: 'Published to data/content.json on GitHub. Portfolio page loads from this API immediately; full CDN may update after redeploy.'
    });
  }

  // —— POST: photo upload / delete ——
  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    if (!isDurableConfigured()) {
      return res.status(503).json({
        ok: false,
        error:
          'GITHUB_TOKEN not set on Vercel. Photo upload needs durable storage.'
      });
    }

    const body = parseBody(req);
    const action = String(body.action || 'upload-photo').trim();

    if (action === 'delete-photo') {
      const path = String(body.path || '').trim();
      if (!path) return res.status(400).json({ ok: false, error: 'path required' });
      const result = await githubDeletePortfolioPhoto(
        path,
        `chore: admin delete portfolio photo`
      );
      if (!result.ok) {
        return res.status(502).json({ ok: false, error: result.error });
      }
      return res.status(200).json({ ok: true, path, missing: !!result.missing });
    }

    if (action !== 'upload-photo') {
      return res.status(400).json({ ok: false, error: 'Unknown action' });
    }

    const parsed = parseDataUrl(body.dataUrl || body.dataURL);
    if (!parsed) {
      return res.status(400).json({
        ok: false,
        error: 'dataUrl required (data:image/...;base64,...)'
      });
    }
    if (!String(parsed.mime || '').startsWith('image/')) {
      return res.status(400).json({ ok: false, error: 'Not an image data URL' });
    }
    if (parsed.content.length > 1_600_000) {
      return res.status(413).json({
        ok: false,
        error: 'Photo too large. Compress more or upload one at a time.'
      });
    }

    const id = String(body.id || '')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 40);
    const stamp = Date.now().toString(36);
    const ext = extForMime(parsed.mime);
    const filename = `${id || 'port'}-${stamp}.${ext}`;

    const up = await githubUploadPortfolioPhoto({
      filename,
      base64: parsed.content,
      message: `chore: portfolio photo ${filename}`
    });
    if (!up.ok) {
      return res.status(502).json({ ok: false, error: up.error });
    }

    // Prefer raw.githubusercontent.com so the photo is visible before Vercel redeploys
    const image = publicMediaUrl(up.path);
    return res.status(200).json({
      ok: true,
      path: up.path,
      image
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
