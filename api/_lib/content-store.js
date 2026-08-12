/**
 * Durable site content (reviews, portfolio, pins) via GitHub Contents API.
 * Same GITHUB_TOKEN / owner / repo as leads-store.
 *
 * Portfolio photos are stored as real files under media/portfolio/
 * so content.json stays small (paths only, not base64).
 */
import { githubToken, lastGithubStoreError } from './leads-store.js';

// Re-export token helpers that live on leads-store error state
export { githubToken, lastGithubStoreError };

const CONTENT_PATH = 'data/content.json';
const MEDIA_DIR = 'media/portfolio';

function githubRepo() {
  return {
    owner: process.env.GITHUB_OWNER || 'jkillen5150',
    repo: process.env.GITHUB_REPO || 'BlackRabbitApp2026',
    branch: process.env.GITHUB_BRANCH || 'main'
  };
}

/** Public URL that works as soon as GitHub has the file (before Vercel redeploy). */
export function publicMediaUrl(relPath) {
  const { owner, repo, branch } = githubRepo();
  const path = String(relPath || '').replace(/^\/+/, '');
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

function githubHeaders(token, extra) {
  return Object.assign(
    {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'black-rabbit-content',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    extra || {}
  );
}

function setGithubStoreError(msg) {
  globalThis.__brGithubStoreError = msg ? String(msg).slice(0, 300) : null;
}

function parseGithubError(status, bodyText) {
  let msg = `GitHub HTTP ${status}`;
  try {
    const j = JSON.parse(bodyText || '{}');
    if (j.message) msg = `GitHub ${status}: ${j.message}`;
  } catch {
    if (bodyText) msg = `GitHub ${status}: ${String(bodyText).slice(0, 160)}`;
  }
  if (status === 401 || status === 403) {
    msg +=
      ' — check GITHUB_TOKEN is valid, not expired, and has Contents: Read and write on this repo.';
  }
  if (status === 409) {
    msg += ' — content changed on GitHub; retry.';
  }
  return msg;
}

export function emptyContent() {
  return { reviews: [], portfolio: [], pins: [], serviceAreas: [] };
}

export function normalizeContent(data) {
  return {
    reviews: (data && Array.isArray(data.reviews) ? data.reviews : []) || [],
    portfolio: (data && Array.isArray(data.portfolio) ? data.portfolio : []) || [],
    pins: (data && Array.isArray(data.pins) ? data.pins : []) || [],
    serviceAreas:
      (data && Array.isArray(data.serviceAreas) ? data.serviceAreas : []) || []
  };
}

/**
 * @returns {{ content: object, sha: string|null } | null}
 */
export async function githubGetContent() {
  const token = githubToken();
  if (!token) {
    setGithubStoreError('GITHUB_TOKEN not set');
    return null;
  }
  const { owner, repo } = githubRepo();
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${CONTENT_PATH}`,
      { headers: githubHeaders(token) }
    );
    if (res.status === 404) {
      setGithubStoreError(null);
      return { content: emptyContent(), sha: null };
    }
    if (!res.ok) {
      const text = await res.text();
      const err = parseGithubError(res.status, text);
      setGithubStoreError(err);
      console.error('GitHub get content', err);
      return null;
    }
    const file = await res.json();
    const text = Buffer.from(file.content || '', 'base64').toString('utf8');
    let parsed = emptyContent();
    try {
      parsed = normalizeContent(JSON.parse(text));
    } catch {
      parsed = emptyContent();
    }
    setGithubStoreError(null);
    return { content: parsed, sha: file.sha };
  } catch (e) {
    const err = 'GitHub get content failed: ' + (e.message || String(e));
    setGithubStoreError(err);
    console.error(err);
    return null;
  }
}

/**
 * Write data/content.json. Pass sha of current file when updating.
 * @returns {{ ok: true, sha?: string } | { ok: false, error: string }}
 */
export async function githubSaveContent(content, sha, message) {
  const token = githubToken();
  if (!token) {
    setGithubStoreError('GITHUB_TOKEN not set');
    return { ok: false, error: 'GITHUB_TOKEN not set' };
  }
  const { owner, repo } = githubRepo();
  const normalized = normalizeContent(content);
  const bodyText = JSON.stringify(normalized, null, 2) + '\n';
  const payload = {
    message: String(message || 'chore: update site content').slice(0, 72),
    content: Buffer.from(bodyText, 'utf8').toString('base64')
  };
  if (sha) payload.sha = sha;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${CONTENT_PATH}`,
      {
        method: 'PUT',
        headers: githubHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      }
    );
    if (!res.ok) {
      const text = await res.text();
      const err = parseGithubError(res.status, text);
      setGithubStoreError(err);
      console.error('GitHub save content', err);
      return { ok: false, error: err };
    }
    const file = await res.json().catch(() => ({}));
    setGithubStoreError(null);
    return { ok: true, sha: file?.content?.sha || null };
  } catch (e) {
    const err = 'GitHub save content failed: ' + (e.message || String(e));
    setGithubStoreError(err);
    console.error(err);
    return { ok: false, error: err };
  }
}

/**
 * Upload a portfolio image (base64, no data: prefix) to media/portfolio/{filename}.
 * @returns {{ ok: true, path: string } | { ok: false, error: string }}
 */
export async function githubUploadPortfolioPhoto({ filename, base64, message }) {
  const token = githubToken();
  if (!token) {
    setGithubStoreError('GITHUB_TOKEN not set');
    return { ok: false, error: 'GITHUB_TOKEN not set' };
  }
  const safeName = String(filename || '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
  if (!safeName || !/\.(jpe?g|png|webp|gif)$/i.test(safeName)) {
    return { ok: false, error: 'Invalid image filename (use .jpg/.png).' };
  }
  const raw = String(base64 || '').replace(/\s/g, '');
  if (!raw || raw.length < 32) {
    return { ok: false, error: 'Missing image data.' };
  }
  // ~1.2MB base64 ≈ ~900KB binary — keep under serverless body + GitHub comfort zone
  if (raw.length > 1_600_000) {
    return {
      ok: false,
      error: 'Photo too large after compression. Try one smaller photo at a time.'
    };
  }

  const path = `${MEDIA_DIR}/${safeName}`;
  const { owner, repo } = githubRepo();

  try {
    // If file already exists, need sha to overwrite
    let sha = null;
    const getRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers: githubHeaders(token) }
    );
    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha || null;
    } else if (getRes.status !== 404) {
      const text = await getRes.text();
      const err = parseGithubError(getRes.status, text);
      setGithubStoreError(err);
      return { ok: false, error: err };
    }

    const payload = {
      message: String(message || `chore: portfolio photo ${safeName}`).slice(0, 72),
      content: raw
    };
    if (sha) payload.sha = sha;

    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: githubHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      }
    );
    if (!res.ok) {
      const text = await res.text();
      const err = parseGithubError(res.status, text);
      setGithubStoreError(err);
      console.error('GitHub upload portfolio photo', err);
      return { ok: false, error: err };
    }
    setGithubStoreError(null);
    return { ok: true, path };
  } catch (e) {
    const err = 'GitHub upload failed: ' + (e.message || String(e));
    setGithubStoreError(err);
    console.error(err);
    return { ok: false, error: err };
  }
}

/**
 * Best-effort delete of a media/portfolio file. Ignores missing files.
 */
export async function githubDeletePortfolioPhoto(path, message) {
  const token = githubToken();
  if (!token) return { ok: false, error: 'GITHUB_TOKEN not set' };

  const rel = String(path || '').replace(/^\/+/, '');
  if (!rel.startsWith(MEDIA_DIR + '/') || rel.includes('..')) {
    return { ok: false, error: 'Can only delete files under media/portfolio/.' };
  }

  const { owner, repo } = githubRepo();
  try {
    const getRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${rel}`,
      { headers: githubHeaders(token) }
    );
    if (getRes.status === 404) return { ok: true, missing: true };
    if (!getRes.ok) {
      const text = await getRes.text();
      return { ok: false, error: parseGithubError(getRes.status, text) };
    }
    const file = await getRes.json();
    const delRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${rel}`,
      {
        method: 'DELETE',
        headers: githubHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          message: String(message || `chore: remove portfolio photo`).slice(0, 72),
          sha: file.sha
        })
      }
    );
    if (!delRes.ok) {
      const text = await delRes.text();
      return { ok: false, error: parseGithubError(delRes.status, text) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

export function isDurableConfigured() {
  return !!githubToken();
}
