/**
 * Shared lead storage for serverless functions.
 *
 * In-memory (globalThis) is only warm within ONE function instance.
 * /api/lead and /api/track are separate lambdas — they do not share memory.
 * Durable reads/writes go through GitHub when GITHUB_TOKEN is set.
 */
const DEFAULT_SITE = 'https://www.blackrabbitlawn.com';

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

export async function githubGetLeads() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  const owner = process.env.GITHUB_OWNER || 'jkillen5150';
  const repo = process.env.GITHUB_REPO || 'BlackRabbitApp2026';
  const path = 'data/leads.json';
  try {
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
  } catch (e) {
    console.error('GitHub get leads failed', e);
    return null;
  }
}

export async function githubSaveLeads(leads, sha, message) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return false;
  const owner = process.env.GITHUB_OWNER || 'jkillen5150';
  const repo = process.env.GITHUB_REPO || 'BlackRabbitApp2026';
  const path = 'data/leads.json';
  const content = Buffer.from(JSON.stringify(leads, null, 2) + '\n').toString('base64');
  try {
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
          message: String(message || `chore: update leads`).slice(0, 72),
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
  } catch (e) {
    console.error('GitHub save leads failed', e);
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
  return { leads, sha: gh?.sha ?? null, durable: !!process.env.GITHUB_TOKEN && gh !== null };
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
    console.error('Lead persist failed', e);
  }
  return saved;
}

export function isDurableConfigured() {
  return !!process.env.GITHUB_TOKEN;
}
