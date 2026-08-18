/**
 * Private client roster (exact addresses) via GitHub Contents API.
 * Encrypted at rest like leads — public repo must never get plaintext streets.
 *
 * Path: data/customers.json (gitignored)
 * Key: LEADS_ENCRYPTION_KEY, else LEAD_ADMIN_TOKEN
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import {
  githubToken,
  leadsStorageSecret,
  leadsStorageSecrets,
  lastGithubStoreError
} from './leads-store.js';

const WRAP_VERSION = 1;
const ALG = 'aes-256-gcm';
const DEFAULT_PATH = 'data/customers.json';

function githubRepo() {
  return {
    owner: process.env.GITHUB_OWNER || 'jkillen5150',
    repo: process.env.GITHUB_REPO || 'BlackRabbitApp2026',
    path: process.env.GITHUB_CUSTOMERS_PATH || DEFAULT_PATH
  };
}

function githubHeaders(token, extra) {
  return Object.assign(
    {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'black-rabbit-customers',
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
      ' — check GITHUB_TOKEN is valid and has Contents: Read and write on this repo.';
  }
  return msg;
}

function customersKey(secret) {
  return createHash('sha256').update('br-customers-v1:' + secret).digest();
}

export function emptyRoster() {
  return {
    updatedAt: new Date().toISOString().slice(0, 10),
    source: '',
    note: 'Private ops roster',
    customers: [],
    groups: []
  };
}

function normalizeRoster(data) {
  const base = emptyRoster();
  if (!data || typeof data !== 'object') return base;
  return {
    ...base,
    ...data,
    customers: Array.isArray(data.customers) ? data.customers : [],
    groups: Array.isArray(data.groups) ? data.groups : []
  };
}

export function isWrappedCustomersBlob(value) {
  return !!(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Number(value.v) === WRAP_VERSION &&
    value.alg === ALG &&
    value.kind === 'customers' &&
    value.iv &&
    value.tag &&
    value.data
  );
}

export function wrapRosterForStorage(roster, secret) {
  const key = customersKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, key, iv);
  const plain = Buffer.from(JSON.stringify(normalizeRoster(roster)), 'utf8');
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return JSON.stringify({
    v: WRAP_VERSION,
    alg: ALG,
    kind: 'customers',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64')
  });
}

function decryptRosterBlob(parsed, secret) {
  const decipher = createDecipheriv(ALG, customersKey(secret), Buffer.from(parsed.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
  const out = Buffer.concat([
    decipher.update(Buffer.from(parsed.data, 'base64')),
    decipher.final()
  ]);
  return normalizeRoster(JSON.parse(out.toString('utf8')));
}

export function unwrapRosterFromStorage(textOrObj, secret) {
  const parsed = typeof textOrObj === 'string' ? JSON.parse(textOrObj) : textOrObj;
  // Legacy plaintext roster object
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.customers) && !isWrappedCustomersBlob(parsed)) {
    return { roster: normalizeRoster(parsed), keyIndex: -1 };
  }
  if (!isWrappedCustomersBlob(parsed)) {
    throw new Error('Unknown customers storage format');
  }
  const secrets = (Array.isArray(secret) ? secret : [secret])
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  if (!secrets.length) {
    throw new Error('Missing LEADS_ENCRYPTION_KEY or LEAD_ADMIN_TOKEN');
  }
  let lastErr;
  for (let i = 0; i < secrets.length; i++) {
    try {
      return { roster: decryptRosterBlob(parsed, secrets[i]), keyIndex: i };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Customers decrypt failed');
}

export function isCustomersDurableConfigured() {
  return !!githubToken();
}

/**
 * @returns {{ roster: object, sha: string|null } | null}
 */
export async function githubGetRoster() {
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
      return { roster: emptyRoster(), sha: null };
    }
    if (!res.ok) {
      const text = await res.text();
      const err = parseGithubError(res.status, text);
      setGithubStoreError(err);
      console.error('GitHub get customers', err);
      return null;
    }
    const file = await res.json();
    const text = Buffer.from(file.content || '', 'base64').toString('utf8');
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = emptyRoster();
    }

    // Plaintext → encrypt on read when a secret is available
    if (parsed && Array.isArray(parsed.customers) && !isWrappedCustomersBlob(parsed)) {
      const secret = leadsStorageSecret();
      let sha = file.sha;
      if (secret) {
        const nextSha = await githubSaveRoster(
          parsed,
          file.sha,
          'chore: encrypt customers roster at rest'
        );
        if (typeof nextSha === 'string') sha = nextSha;
      }
      setGithubStoreError(null);
      return { roster: normalizeRoster(parsed), sha };
    }

    if (isWrappedCustomersBlob(parsed)) {
      try {
        const secrets = leadsStorageSecrets();
        const { roster, keyIndex } = unwrapRosterFromStorage(parsed, secrets);
        let sha = file.sha;
        if (keyIndex > 0 && leadsStorageSecret()) {
          const nextSha = await githubSaveRoster(
            roster,
            file.sha,
            'chore: rewrap customers with LEADS_ENCRYPTION_KEY'
          );
          if (typeof nextSha === 'string') sha = nextSha;
        }
        setGithubStoreError(null);
        return { roster, sha };
      } catch (e) {
        const err =
          'Customers decrypt failed — set LEADS_ENCRYPTION_KEY / LEAD_ADMIN_TOKEN to the key used when the file was written.';
        setGithubStoreError(err);
        console.error(err, e.message || e);
        return null;
      }
    }

    setGithubStoreError('Unknown customers storage format');
    return { roster: emptyRoster(), sha: file.sha };
  } catch (e) {
    const err = 'GitHub get customers failed: ' + (e.message || String(e));
    setGithubStoreError(err);
    console.error(err);
    return null;
  }
}

export async function githubSaveRoster(roster, sha, message) {
  const token = githubToken();
  if (!token) {
    setGithubStoreError('GITHUB_TOKEN not set');
    return false;
  }
  const { owner, repo, path } = githubRepo();
  const secret = leadsStorageSecret();
  if (!secret) {
    setGithubStoreError(
      'Refusing to write plaintext customers — set LEADS_ENCRYPTION_KEY or LEAD_ADMIN_TOKEN'
    );
    return false;
  }
  const payload = wrapRosterForStorage(roster, secret) + '\n';
  const content = Buffer.from(payload).toString('base64');
  try {
    const body = {
      message: String(message || 'chore: update customers roster').slice(0, 72),
      content
    };
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
      console.error('GitHub save customers', err);
      return false;
    }
    const json = await res.json().catch(() => ({}));
    setGithubStoreError(null);
    return json.content?.sha || true;
  } catch (e) {
    const err = 'GitHub save customers failed: ' + (e.message || String(e));
    setGithubStoreError(err);
    console.error(err);
    return false;
  }
}

export async function loadRoster() {
  const gh = await githubGetRoster();
  return {
    roster: gh?.roster ? normalizeRoster(gh.roster) : emptyRoster(),
    sha: gh?.sha ?? null,
    durable: !!githubToken() && gh !== null,
    error: lastGithubStoreError()
  };
}

export { lastGithubStoreError };
