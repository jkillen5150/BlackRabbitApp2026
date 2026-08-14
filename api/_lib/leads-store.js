/**
 * Shared lead storage for serverless functions.
 *
 * In-memory (globalThis) is only warm within ONE function instance.
 * /api/lead and /api/track are separate lambdas — they do not share memory.
 * Durable reads/writes go through GitHub when GITHUB_TOKEN is set.
 *
 * The GitHub file is encrypted at rest (AES-256-GCM) so a public repo
 * cannot publish customer PII as plain JSON. Key: LEADS_ENCRYPTION_KEY
 * or, if unset, LEAD_ADMIN_TOKEN. Plaintext files are migrated on read.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const DEFAULT_SITE = 'https://www.blackrabbitlawn.com';
const LEADS_WRAP_VERSION = 1;
const LEADS_ALG = 'aes-256-gcm';

export function siteUrl(req) {
  let base = process.env.SITE_URL || '';
  if (!base && req) {
    const proto = req.headers?.['x-forwarded-proto'] || 'https';
    const host = req.headers?.['x-forwarded-host'] || req.headers?.host || '';
    if (host) base = `${proto}://${host}`;
  }
  if (!base) base = DEFAULT_SITE;
  base = String(base).replace(/\/$/, '');
  // Apex 308s to www — keep customer/email links on the canonical host
  if (base === 'https://blackrabbitlawn.com' || base === 'http://blackrabbitlawn.com') {
    base = DEFAULT_SITE;
  }
  return base;
}

/** Trim whitespace/newlines — common when pasting into Vercel. */
export function githubToken() {
  const t = process.env.GITHUB_TOKEN;
  if (!t) return '';
  return String(t).trim();
}

export function memoryLeads() {
  const g = globalThis;
  if (!g.__brLeads) g.__brLeads = [];
  return g.__brLeads;
}

export function leadForStorage(lead) {
  if (!lead || typeof lead !== 'object') return lead;
  const { _emailPhotos, photoPreviews, ...rest } = lead;
  return {
    ...rest,
    photoCount: lead.photoCount || 0
  };
}

function githubRepo() {
  return {
    owner: process.env.GITHUB_OWNER || 'jkillen5150',
    repo: process.env.GITHUB_REPO || 'BlackRabbitApp2026',
    path: process.env.GITHUB_LEADS_PATH || 'data/leads.json'
  };
}

/** Secret used to wrap the GitHub leads file. Prefer a dedicated key. */
export function leadsStorageSecret() {
  return String(process.env.LEADS_ENCRYPTION_KEY || process.env.LEAD_ADMIN_TOKEN || '').trim();
}

function leadsKey(secret) {
  return createHash('sha256').update('br-leads-v1:' + secret).digest();
}

export function isWrappedLeadsBlob(value) {
  return !!(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Number(value.v) === LEADS_WRAP_VERSION &&
    value.alg === LEADS_ALG &&
    value.iv &&
    value.tag &&
    value.data
  );
}

/** Encrypt a leads array for GitHub. Exported for smoke tests. */
export function wrapLeadsForStorage(leads, secret) {
  const key = leadsKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(LEADS_ALG, key, iv);
  const plain = Buffer.from(JSON.stringify(Array.isArray(leads) ? leads : []), 'utf8');
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return JSON.stringify({
    v: LEADS_WRAP_VERSION,
    alg: LEADS_ALG,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64')
  });
}

/** Decrypt a wrapped blob, or pass through a legacy plaintext array. */
export function unwrapLeadsFromStorage(textOrObj, secret) {
  const parsed = typeof textOrObj === 'string' ? JSON.parse(textOrObj) : textOrObj;
  if (Array.isArray(parsed)) return parsed;
  if (!isWrappedLeadsBlob(parsed)) {
    throw new Error('Unknown leads storage format');
  }
  if (!secret) {
    throw new Error('Missing LEADS_ENCRYPTION_KEY or LEAD_ADMIN_TOKEN');
  }
  const decipher = createDecipheriv(LEADS_ALG, leadsKey(secret), Buffer.from(parsed.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
  const out = Buffer.concat([
    decipher.update(Buffer.from(parsed.data, 'base64')),
    decipher.final()
  ]);
  const leads = JSON.parse(out.toString('utf8'));
  return Array.isArray(leads) ? leads : [];
}

function githubHeaders(token, extra) {
  return Object.assign(
    {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'black-rabbit-leads',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    extra || {}
  );
}

/** Last GitHub store error (safe message, no secrets) — for API diagnostics. */
export function lastGithubStoreError() {
  return globalThis.__brGithubStoreError || null;
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
  return msg;
}

/**
 * @returns {{ leads: any[], sha: string|null } | null}
 */
export async function githubGetLeads() {
  const token = githubToken();
  if (!token) {
    setGithubStoreError('GITHUB_TOKEN not set');
    return null;
  }
  const { owner, repo, path } = githubRepo();
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers: githubHeaders(token) }
    );
    if (res.status === 404) {
      setGithubStoreError(null);
      return { leads: [], sha: null };
    }
    if (!res.ok) {
      const text = await res.text();
      const err = parseGithubError(res.status, text);
      setGithubStoreError(err);
      console.error('GitHub get leads', err);
      return null;
    }
    const file = await res.json();
    const text = Buffer.from(file.content || '', 'base64').toString('utf8');
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = [];
    }

    if (Array.isArray(parsed)) {
      const secret = leadsStorageSecret();
      let sha = file.sha;
      if (secret) {
        const nextSha = await githubSaveLeads(
          parsed,
          file.sha,
          'chore: encrypt leads at rest'
        );
        if (typeof nextSha === 'string') sha = nextSha;
      }
      setGithubStoreError(null);
      return { leads: parsed, sha };
    }

    if (isWrappedLeadsBlob(parsed)) {
      try {
        const leads = unwrapLeadsFromStorage(parsed, leadsStorageSecret());
        setGithubStoreError(null);
        return { leads, sha: file.sha };
      } catch (e) {
        const err =
          'Leads decrypt failed — set LEADS_ENCRYPTION_KEY to the key used when the file was written (LEAD_ADMIN_TOKEN may have changed).';
        setGithubStoreError(err);
        console.error(err, e.message || e);
        return null;
      }
    }

    setGithubStoreError('Unknown leads storage format');
    return { leads: [], sha: file.sha };
  } catch (e) {
    const err = 'GitHub get failed: ' + (e.message || String(e));
    setGithubStoreError(err);
    console.error(err);
    return null;
  }
}

export async function githubSaveLeads(leads, sha, message) {
  const token = githubToken();
  if (!token) {
    setGithubStoreError('GITHUB_TOKEN not set');
    return false;
  }
  const { owner, repo, path } = githubRepo();
  const secret = leadsStorageSecret();
  const payload = secret
    ? wrapLeadsForStorage(leads, secret) + '\n'
    : JSON.stringify(leads, null, 2) + '\n';
  const content = Buffer.from(payload).toString('base64');
  try {
    const body = {
      message: String(message || `chore: update leads`).slice(0, 72),
      content
    };
    // Existing file requires sha; omit only when creating
    if (sha) body.sha = sha;

    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: githubHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body)
      }
    );
    if (!res.ok) {
      const text = await res.text();
      const err = parseGithubError(res.status, text);
      setGithubStoreError(err);
      console.error('GitHub save leads', err);
      return false;
    }
    const json = await res.json().catch(() => ({}));
    setGithubStoreError(null);
    return json.content?.sha || true;
  } catch (e) {
    const err = 'GitHub save failed: ' + (e.message || String(e));
    setGithubStoreError(err);
    console.error(err);
    return false;
  }
}

/** Admin-safe view: drop raw email blobs, keep photo previews when in memory. */
function leadForAdmin(lead) {
  if (!lead || typeof lead !== 'object') return lead;
  const { _emailPhotos, ...rest } = lead;
  return rest;
}

/** Merge GitHub file + this-instance memory (memory wins on same id for fresher fields). */
export async function loadAllLeads() {
  const gh = await githubGetLeads();
  const mem = memoryLeads();
  let leads = gh?.leads ? gh.leads.map(leadForStorage) : [];
  const byId = new Map(leads.map((l) => [l.id, l]));
  for (const l of mem) {
    if (!l || !l.id) continue;
    const prev = byId.get(l.id);
    // Memory may include photoPreviews (not stored on GitHub)
    byId.set(l.id, prev ? { ...prev, ...leadForAdmin(l) } : leadForAdmin(l));
  }
  leads = Array.from(byId.values());
  leads.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return {
    leads,
    sha: gh?.sha ?? null,
    durable: !!githubToken() && gh !== null
  };
}

export async function findLeadByTrackToken(token) {
  const t = String(token || '').trim();
  if (!t) return null;
  const mem = memoryLeads().find((l) => l && l.trackToken === t);
  if (mem) return mem;
  const gh = await githubGetLeads();
  if (!gh) return null;
  return gh.leads.find((l) => l && l.trackToken === t) || null;
}

export async function findLeadById(id) {
  const want = String(id || '').trim();
  if (!want) return null;
  const mem = memoryLeads().find((l) => l && l.id === want);
  if (mem) return mem;
  const gh = await githubGetLeads();
  if (!gh) return null;
  return gh.leads.find((l) => l && l.id === want) || null;
}

/**
 * Patch a lead in memory + GitHub (when available).
 * Returns updated lead or null if not found anywhere.
 */
export async function updateLead(id, patch) {
  const want = String(id || '').trim();
  if (!want) return null;

  const mem = memoryLeads();
  const mi = mem.findIndex((l) => l && l.id === want);
  let updated = null;

  if (mi >= 0) {
    mem[mi] = {
      ...mem[mi],
      ...patch,
      updatedAt: new Date().toISOString()
    };
    updated = mem[mi];
  }

  const gh = await githubGetLeads();
  if (gh) {
    const i = gh.leads.findIndex((l) => l && l.id === want);
    if (i >= 0) {
      const nextLead = {
        ...gh.leads[i],
        ...patch,
        updatedAt: new Date().toISOString()
      };
      const next = [...gh.leads];
      next[i] = leadForStorage(nextLead);
      await githubSaveLeads(
        next.map(leadForStorage),
        gh.sha,
        `chore: update lead ${want}`.slice(0, 72)
      );
      updated = nextLead;
      if (mi < 0) {
        mem.unshift(nextLead);
        if (mem.length > 200) mem.length = 200;
      } else {
        mem[mi] = { ...mem[mi], ...leadForStorage(nextLead) };
      }
    } else if (updated) {
      // Lead only in memory — append to durable store so /api/track can see it
      const next = [leadForStorage(updated), ...gh.leads.map(leadForStorage)].slice(0, 500);
      await githubSaveLeads(next, gh.sha, `chore: persist lead ${want}`.slice(0, 72));
    }
  }

  return updated;
}

/** Append new lead to memory + GitHub. */
export async function appendLead(lead) {
  const mem = memoryLeads();
  mem.unshift(lead);
  if (mem.length > 200) mem.length = 200;

  let saved = false;
  try {
    const gh = await githubGetLeads();
    if (gh) {
      const next = [leadForStorage(lead), ...gh.leads.map(leadForStorage)].slice(0, 500);
      saved = await githubSaveLeads(
        next,
        gh.sha,
        `chore: add chat lead ${lead.id || ''}`.slice(0, 72)
      );
    }
  } catch (e) {
    const err = 'Lead persist failed: ' + (e.message || String(e));
    setGithubStoreError(err);
    console.error(err);
  }
  return saved;
}

export function isDurableConfigured() {
  return !!githubToken();
}
