/**
 * Live ops write to Google Sheets.
 *
 * Make-it-work order:
 *   1) GOOGLE_SHEETS_WEBHOOK — Apps Script web app on the Client Database (fastest)
 *   2) GOOGLE_SERVICE_ACCOUNT_JSON + GOOGLE_SHEETS_ID — Sheets API
 *
 * Never throw into the customer path. Callers should ignore { ok:false }.
 */
import { createSign } from 'crypto';

export const DEFAULT_SHEETS_ID = '1nAj_jLRODMlqoHCndEJQtoZ4u73NOxQpfrRPSMlP5bA';
export const DEFAULT_SHEETS_URL =
  'https://docs.google.com/spreadsheets/d/1nAj_jLRODMlqoHCndEJQtoZ4u73NOxQpfrRPSMlP5bA/edit';

const LEAD_TAB = process.env.GOOGLE_SHEETS_LEADS_TAB || 'Web Leads';
const PIPELINE_TABS = ['Commercial Pipeline', 'Commercial Pipline'];

function sheetsId() {
  return String(process.env.GOOGLE_SHEETS_ID || DEFAULT_SHEETS_ID).trim();
}

function webhookUrl() {
  return String(process.env.GOOGLE_SHEETS_WEBHOOK || '').trim();
}

function serviceAccount() {
  const raw = String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isSheetsConfigured() {
  return !!(webhookUrl() || serviceAccount());
}

export function sheetsPublicStatus() {
  return {
    configured: isSheetsConfigured(),
    mode: webhookUrl() ? 'webhook' : serviceAccount() ? 'service-account' : 'off',
    spreadsheetId: sheetsId(),
    url: DEFAULT_SHEETS_URL,
    leadsTab: LEAD_TAB
  };
}

function leadRow(lead, extra) {
  const l = lead || {};
  const x = extra || {};
  return {
    action: x.action || 'upsertLead',
    tab: LEAD_TAB,
    timestamp: l.createdAt || new Date().toISOString(),
    source: l.source || '',
    name: l.name || '',
    phone: l.phone || '',
    address: l.address || '',
    service: l.need || l.serviceHint || '',
    notes: [l.urgency, l.photoCount ? l.photoCount + ' photo(s)' : '']
      .filter(Boolean)
      .join(' · '),
    status: l.status || 'new',
    trackToken: l.trackToken || '',
    depositPaid: l.depositPaid ? 'yes' : 'no',
    assigned: l.assigned || '',
    nextAction: x.nextAction || suggestNextAction(l),
    leadId: l.id || ''
  };
}

export function suggestNextAction(lead) {
  const l = lead || {};
  const status = String(l.status || 'new');
  if (l.depositPaid && status === 'new') return 'Text to lock the slot';
  if (status === 'new') return 'Text back today';
  if (status === 'texted') return 'Book a day/time';
  if (status === 'booked') return 'Confirm morning-of';
  if (status === 'on_the_way' || status === 'enroute') return 'Do the cut';
  if (status === 'done') return 'Ask for a Google review';
  if (status === 'deposit_paid') return 'Text to lock the slot';
  return 'Check in';
}

async function postWebhook(payload) {
  const url = webhookUrl();
  if (!url) return { ok: false, skipped: true, reason: 'no-webhook' };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    return { ok: false, status: res.status, error: text.slice(0, 180) };
  }
  return { ok: true, mode: 'webhook' };
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function googleAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    })
  );
  const unsigned = header + '.' + claim;
  const sign = createSign('RSA-SHA256');
  sign.update(unsigned);
  const jwt = unsigned + '.' + b64url(sign.sign(sa.private_key));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwt
  });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) {
    throw new Error(data.error_description || data.error || 'Sheets token failed');
  }
  return data.access_token;
}

async function sheetsValues(token, method, path, body) {
  const url =
    'https://sheets.googleapis.com/v4/spreadsheets/' +
    encodeURIComponent(sheetsId()) +
    path;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || 'Sheets HTTP ' + res.status);
  }
  return data;
}

function leadValues(row) {
  return [
    row.timestamp,
    row.source,
    row.name,
    row.phone,
    row.address,
    row.service,
    row.notes,
    row.status,
    row.trackToken,
    row.depositPaid,
    row.assigned,
    row.nextAction,
    row.leadId
  ];
}

const LEAD_HEADER = [
  'Timestamp',
  'Source',
  'Name',
  'Phone',
  'Address',
  'Service',
  'Notes',
  'Status',
  'Track token',
  'Deposit paid?',
  'Assigned',
  'Next action',
  'Lead ID'
];

async function upsertLeadViaApi(row) {
  const sa = serviceAccount();
  if (!sa) return { ok: false, skipped: true, reason: 'no-sa' };
  const token = await googleAccessToken(sa);
  const range = encodeURIComponent(LEAD_TAB + '!A:M');
  let existing;
  try {
    existing = await sheetsValues(token, 'GET', '/values/' + range);
  } catch (e) {
    if (!String(e.message || '').toLowerCase().includes('unable to parse')) throw e;
    existing = { values: [] };
  }
  const values = existing.values || [];
  if (!values.length) {
    await sheetsValues(token, 'PUT', '/values/' + range + '?valueInputOption=RAW', {
      values: [LEAD_HEADER, leadValues(row)]
    });
    return { ok: true, mode: 'service-account', created: true };
  }
  const idCol = 12;
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol] || '') === String(row.leadId)) {
      rowIndex = i + 1;
      break;
    }
  }
  if (rowIndex < 0) {
    await sheetsValues(
      token,
      'POST',
      '/values/' + encodeURIComponent(LEAD_TAB + '!A:M') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',
      { values: [leadValues(row)] }
    );
    return { ok: true, mode: 'service-account', appended: true };
  }
  await sheetsValues(
    token,
    'PUT',
    '/values/' + encodeURIComponent(LEAD_TAB + '!A' + rowIndex + ':M' + rowIndex) + '?valueInputOption=RAW',
    { values: [leadValues(row)] }
  );
  return { ok: true, mode: 'service-account', updated: true, row: rowIndex };
}

async function upsertPipelineViaApi(rows) {
  const sa = serviceAccount();
  if (!sa) return { ok: false, skipped: true, reason: 'no-sa' };
  const token = await googleAccessToken(sa);
  const tab = PIPELINE_TABS[0];
  const header = [
    'ID',
    'Property / Company Name',
    'Address',
    'City',
    'Type',
    'Est. Size / Complexity',
    'Property Manager / Owner',
    'Decision Maker',
    'Contact Method',
    'Contact Details',
    'Recent Signal / Why Target',
    'Suggested Angle',
    'Priority',
    'Status',
    'Last Touch Date',
    'Notes',
    'Source of Data'
  ];
  const values = [header].concat(
    (rows || []).map((r) => [
      r.id,
      r.name,
      r.address,
      r.city,
      r.type,
      r.size,
      r.manager,
      r.decisionMaker,
      r.contactMethod,
      r.contact,
      r.signal,
      r.angle,
      r.priority,
      r.status,
      r.lastTouch || '',
      r.notes || '',
      r.source || ''
    ])
  );
  await sheetsValues(
    token,
    'PUT',
    '/values/' + encodeURIComponent(tab + '!A1') + '?valueInputOption=RAW',
    { values }
  );
  return { ok: true, mode: 'service-account', rows: (rows || []).length, tab };
}

export async function syncLeadToSheet(lead, extra) {
  if (!isSheetsConfigured()) return { ok: false, skipped: true, reason: 'not-configured' };
  const row = leadRow(lead, extra);
  try {
    if (webhookUrl()) return await postWebhook(row);
    return await upsertLeadViaApi(row);
  } catch (e) {
    console.error('sheets syncLead', e);
    return { ok: false, error: e.message || String(e) };
  }
}

export async function syncPipelineToSheet(rows) {
  if (!isSheetsConfigured()) return { ok: false, skipped: true, reason: 'not-configured' };
  const payload = { action: 'replacePipeline', tab: PIPELINE_TABS[0], rows };
  try {
    if (webhookUrl()) return await postWebhook(payload);
    return await upsertPipelineViaApi(rows);
  } catch (e) {
    console.error('sheets syncPipeline', e);
    return { ok: false, error: e.message || String(e) };
  }
}
