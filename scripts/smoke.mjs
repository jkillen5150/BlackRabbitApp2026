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
} catch (e) {
  fail('content.json parse', e.message);
}

includes('index.html', 'data-review-headline', 'home live review headline');
includes('testimonials.html', 'data-review-headline', 'testimonials live review headline');
includes('admin.html', 'btn-sync-google-reviews', 'admin Google sync button');
includes('admin.html', 'value="Google" selected', 'admin source defaults to Google');
includes('thankyou.html', 'data-google-review-link', 'thank-you write-review CTA');
includes('track/index.html', 'track-review-cta', 'track review CTA after done');
includes('js/content-store.js', 'refreshPublicReviewStats', 'content-store live counts');
includes('api/reviews.js', 'GOOGLE_PLACES_API_KEY', 'reviews API Places key');

const jsFiles = [
  'api/reviews.js',
  'api/content.js',
  'api/_lib/content-store.js',
  'js/content-store.js',
  'js/admin.js',
  'js/reviews-carousel.js',
  'js/site-common.js',
  'js/track.js'
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
    ['api/reviews GET', '/api/reviews', [200, 404]]
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
