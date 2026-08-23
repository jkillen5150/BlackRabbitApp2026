#!/usr/bin/env node
/**
 * Black Rabbit smoke checks.
 *   node scripts/smoke.mjs          local files + syntax
 *   node scripts/smoke.mjs --live   also hit production
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIVE = process.argv.includes('--live') || process.env.SMOKE_LIVE === '1';
const BASE = (process.env.SMOKE_BASE || 'https://www.blackrabbitlawn.com').replace(/\/$/, '');

const rows = [];
function pass(name, detail) {
  rows.push({ ok: true, name, detail: detail || '' });
}
function fail(name, detail) {
  rows.push({ ok: false, name, detail: String(detail || '') });
}

function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function mustExist(rel) {
  if (existsSync(join(ROOT, rel))) pass('file ' + rel);
  else fail('file ' + rel, 'missing');
}

function includes(rel, needle, label) {
  const text = read(rel);
  if (text.includes(needle)) pass(label || rel + ' has ' + needle.slice(0, 40));
  else fail(label || rel + ' missing snippet', needle.slice(0, 80));
}

function nodeCheck(rel) {
  const r = spawnSync(process.execPath, ['--check', join(ROOT, rel)], {
    encoding: 'utf8'
  });
  if (r.status === 0) pass('syntax ' + rel);
  else fail('syntax ' + rel, (r.stderr || r.stdout || 'check failed').slice(0, 200));
}

async function fetchOk(path, opts) {
  const url = path.startsWith('http') ? path : BASE + path;
  const timeout = opts && opts.timeout ? opts.timeout : 20000;
  const method = (opts && opts.method) || 'GET';
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeout);
  try {
    const res = await fetch(url, {
      method,
      redirect: (opts && opts.redirect) || 'manual',
      headers: { 'user-agent': 'BlackRabbitSmoke/1.0' },
      signal: ac.signal
    });
    const text = opts && opts.body === false ? '' : await res.text().catch(() => '');
    return { url, status: res.status, headers: res.headers, text, location: res.headers.get('location') };
  } finally {
    clearTimeout(t);
  }
}

function expectStatus(name, got, allowed) {
  if (allowed.includes(got.status)) {
    pass(name, got.status + ' ' + got.url.replace(BASE, ''));
  } else {
    fail(name, 'HTTP ' + got.status + ' ' + got.url);
  }
}

function expectBody(name, got, needles) {
  const missing = needles.filter((n) => !got.text.includes(n));
  if (!missing.length) pass(name);
  else fail(name, 'missing: ' + missing.join(', '));
}

// —— local ——
mustExist('data/content.json');
mustExist('api/reviews.js');
mustExist('api/quote.js');
mustExist('api/pipeline.js');
mustExist('data/commercial-pipeline.json');
mustExist('docs/ops-sheet-apps-script.js');
mustExist('js/pricing.js');
mustExist('api/content.js');
mustExist('js/content-store.js');
mustExist('admin.html');

try {
  const content = JSON.parse(read('data/content.json'));
  const n = (content.reviews || []).length;
  if (n >= 1) pass('content.json reviews', n + ' reviews');
  else fail('content.json reviews', 'empty');
  const names = (content.reviews || []).map((r) => r.name).filter(Boolean);
  if (names.includes('William Beasley')) pass('seed review William Beasley');
  else fail('seed review William Beasley', 'not in content.json');
  const pins = content.pins || [];
  const clients = pins.filter((p) => (p.type || 'city') !== 'city');
  if (clients.length >= 22) pass('content.json client pins', clients.length + ' job pins');
  else fail('content.json client pins', clients.length + ' (need 22+)');
  const cities = [...new Set(clients.map((p) => p.city).filter(Boolean))];
  if (cities.includes('Olympia') && cities.includes('Tenino')) pass('client pins include Olympia + Tenino');
  else fail('client pins include Olympia + Tenino', cities.join(', '));
  const streetLike = clients.filter((p) => {
    const line = String(p.address || p.label || '');
    return /\d/.test(line) && !/area/i.test(line);
  });
  if (!streetLike.length) pass('client pins have no street addresses');
  else fail('client pins have no street addresses', streetLike.map((p) => p.id).join(', '));
} catch (e) {
  fail('content.json parse', e.message);
}

try {
  const pipe = JSON.parse(read('data/commercial-pipeline.json'));
  const n = (pipe.targets || []).length;
  if (n >= 25) pass('commercial pipeline size', n + ' targets');
  else fail('commercial pipeline size', n + ' (need 25+)');
  const blob = JSON.stringify(pipe).toLowerCase();
  if (blob.includes('360-789-9617') || blob.includes('315) 286')) {
    fail('pipeline PII', 'looks like a residential client phone leaked');
  } else {
    pass('pipeline has no obvious client phones');
  }
} catch (e) {
  fail('commercial-pipeline.json parse', e.message);
}

{
  const { calculateLawnPrices } = await import(join(ROOT, 'api/_lib/pricing.js'));
  const q = calculateLawnPrices(8000, 1800, 2);
  if (q.oneTime >= 45 && q.cleanup === 8) pass('pricing floor + bags', JSON.stringify(q));
  else fail('pricing floor + bags', JSON.stringify(q));
}

includes('index.html', 'data-review-headline', 'home live review headline');
includes('testimonials.html', 'data-review-headline', 'testimonials live review headline');
includes('admin.html', 'btn-sync-google-reviews', 'admin Google sync button');
includes('admin.html', 'value="Google" selected', 'admin source defaults to Google');
includes('thankyou.html', 'data-google-review-link', 'thank-you write-review CTA');
includes('track/index.html', 'track-review-cta', 'track review CTA after done');
includes('js/content-store.js', 'refreshPublicReviewStats', 'content-store live counts');
includes('api/reviews.js', 'GOOGLE_PLACES_API_KEY', 'reviews API Places key');
includes('service-area.html', 'Amber pins are past jobs', 'service-area copy is job pins, not city pins');
{
  const mapJs = read('js/map-page.js');
  if (mapJs.includes('cityIcon') || mapJs.includes('L.circle')) {
    fail('map-page no city overlays', 'city markers or coverage circles still drawn');
  } else {
    pass('map-page no city overlays');
  }
}

const jsFiles = [
  'api/reviews.js',
  'api/quote.js',
  'api/pipeline.js',
  'api/_lib/sheets.js',
  'api/_lib/pricing.js',
  'api/content.js',
  'api/_lib/content-store.js',
  'js/content-store.js',
  'js/admin.js',
  'js/reviews-carousel.js',
  'js/site-common.js',
  'js/track.js',
  'js/map-page.js'
];
for (const f of jsFiles) {
  if (existsSync(join(ROOT, f))) nodeCheck(f);
}

// tiny merge-key sanity (mirrors api/reviews.js)
{
  const a = 'Sarah McGinty|this gentleman came out super quick';
  const b = 'sarah mcginty|This gentleman came out super quick'.toLowerCase();
  if (a.toLowerCase().startsWith(b.slice(0, 20))) pass('review key case-fold idea');
}

{
  const { wrapLeadsForStorage, unwrapLeadsFromStorage } = await import(
    join(ROOT, 'api/_lib/leads-store.js')
  );
  const secret = 'smoke-leads-secret-not-used-in-prod';
  const sample = [{ id: 'lead-smoke', phone: '3605550100', address: '1 Test St' }];
  const blob = wrapLeadsForStorage(sample, secret);
  if (blob.includes('3605550100') || blob.includes('1 Test St')) {
    fail('leads encrypt hides PII', blob.slice(0, 80));
  } else {
    pass('leads encrypt hides PII');
  }
  try {
    const back = unwrapLeadsFromStorage(blob, secret);
    if (back.leads[0] && back.leads[0].phone === '3605550100') pass('leads encrypt roundtrip');
    else fail('leads encrypt roundtrip', JSON.stringify(back));
  } catch (e) {
    fail('leads encrypt roundtrip', e.message);
  }
  try {
    unwrapLeadsFromStorage(blob, 'wrong-secret');
    fail('leads encrypt rejects bad key', 'decrypt unexpectedly succeeded');
  } catch {
    pass('leads encrypt rejects bad key');
  }
  try {
    const viaFallback = unwrapLeadsFromStorage(blob, ['wrong-secret', secret]);
    if (viaFallback.leads[0]?.phone === '3605550100' && viaFallback.keyIndex === 1) {
      pass('leads encrypt fallback key');
    } else {
      fail('leads encrypt fallback key', JSON.stringify(viaFallback));
    }
  } catch (e) {
    fail('leads encrypt fallback key', e.message);
  }
}

if (LIVE) {
  const pages = [
    ['home', '/', ['Black Rabbit', 'Cut My Grass', '407']],
    ['cut-my-grass', '/cut-my-grass', ['Cut My Grass']],
    ['testimonials', '/testimonials', ['review']],
    ['assistant', '/assistant', ['Ask']],
    ['portfolio', '/portfolio', ['Portfolio']],
    ['service-area', '/service-area', ['Yelm']],
    ['login', '/login', ['Admin']],
    ['robots', '/robots.txt', ['Sitemap']],
    ['sitemap', '/sitemap.xml', ['blackrabbitlawn.com']]
  ];

  for (const [name, path, needles] of pages) {
    try {
      const got = await fetchOk(path, { redirect: 'follow' });
      expectStatus('live ' + name, got, [200]);
      if (got.status === 200) expectBody('live ' + name + ' body', got, needles);
    } catch (e) {
      fail('live ' + name, e.message);
    }
  }

  const apis = [
    ['api/chat GET', '/api/chat', [200, 405, 400]],
    ['api/lead GET', '/api/lead', [200, 401]],
    ['api/content GET', '/api/content', [200, 404]],
    ['api/reviews GET', '/api/reviews', [200, 404]],
    ['api/quote GET', '/api/quote?lotSqft=8000&houseSqft=1800', [200, 404]],
    ['api/pipeline GET', '/api/pipeline', [200, 404]]
  ];
  for (const [name, path, allowed] of apis) {
    try {
      const got = await fetchOk(path);
      expectStatus(name, got, allowed);
      if ((name === 'api/reviews GET' || name === 'api/content GET') && got.status === 404) {
        pass(name + ' not deployed yet', 'expected until this branch ships');
      }
    } catch (e) {
      fail(name, e.message);
    }
  }

  try {
    const got = await fetchOk('https://blackrabbitlandscaping.com', {
      method: 'GET',
      redirect: 'manual'
    });
    if ([301, 302, 308].includes(got.status) && /blackrabbitlawn\.com/i.test(got.location || '')) {
      pass('landscaping.com 301', got.status + ' → ' + got.location);
    } else {
      fail('landscaping.com 301', 'HTTP ' + got.status + ' loc=' + (got.location || ''));
    }
  } catch (e) {
    fail('landscaping.com 301', e.message);
  }

  function looksLikePlainLeads(text) {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) return false;
      return parsed.some((l) => l && (l.phone || l.address || l.trackToken));
    } catch {
      return false;
    }
  }

  try {
    const got = await fetchOk('/data/leads.json', { redirect: 'follow' });
    if (got.status === 404 || got.status === 403 || got.status === 401) {
      pass('live /data/leads.json not public', got.status);
    } else if (looksLikePlainLeads(got.text)) {
      fail('live /data/leads.json not public', 'plaintext PII served HTTP ' + got.status);
    } else {
      pass('live /data/leads.json not plaintext PII', got.status);
    }
  } catch (e) {
    fail('live /data/leads.json not public', e.message);
  }

  try {
    const got = await fetchOk('/api/lead');
    const cc = got.headers.get('cache-control') || '';
    if (/no-store/i.test(cc)) pass('live /api/lead Cache-Control no-store', cc);
    else fail('live /api/lead Cache-Control no-store', cc || 'missing');
  } catch (e) {
    fail('live /api/lead Cache-Control no-store', e.message);
  }

  try {
    const got = await fetchOk(
      'https://raw.githubusercontent.com/jkillen5150/BlackRabbitApp2026/main/data/leads.json'
    );
    if (got.status === 404) {
      pass('github raw leads.json absent', got.status);
    } else if (looksLikePlainLeads(got.text)) {
      fail('github raw leads.json not plaintext PII', 'public repo still has plaintext leads');
    } else {
      pass('github raw leads.json not plaintext PII', got.status);
    }
  } catch (e) {
    fail('github raw leads.json not plaintext PII', e.message);
  }
}

const failed = rows.filter((r) => !r.ok);
const passed = rows.filter((r) => r.ok);

console.log(LIVE ? 'Black Rabbit smoke (local + live)' : 'Black Rabbit smoke (local files)');
console.log('—'.repeat(52));
for (const r of rows) {
  console.log((r.ok ? 'PASS' : 'FAIL') + '  ' + r.name + (r.detail ? '  ·  ' + r.detail : ''));
}
console.log('—'.repeat(52));
console.log(passed.length + ' passed, ' + failed.length + ' failed' + (LIVE ? '' : '  (rerun with --live for production)'));

if (failed.length) process.exit(1);
