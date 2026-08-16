/**
 * GET  /api/reviews — Google listing summary + write-review URL (public)
 * POST /api/reviews — { action: 'sync' } merge latest Google reviews into content.json (admin)
 *
 * Env:
 *   GOOGLE_PLACES_API_KEY  — Places API key (legacy Place Details)
 *   GOOGLE_PLACE_ID        — optional; otherwise Find Place from text
 *   GOOGLE_PLACE_QUERY     — default "Black Rabbit Landscaping"
 *   LEAD_ADMIN_TOKEN       — required on POST when set (same as Admin)
 *   GITHUB_TOKEN           — required for sync write
 */
import {
  githubGetContent,
  githubSaveContent,
  isDurableConfigured,
  lastGithubStoreError
} from './_lib/content-store.js';

const DEFAULT_QUERY = 'Black Rabbit Landscaping';
const DEFAULT_PHONE = '14079511663';
/** From https://g.page/r/Cd-1M_ymvQphEBM/review (service-area listing). */
const DEFAULT_PLACE_CID = '6992609896339584479';
const DEFAULT_PLACE_ID_GUESSES = [
  'ChIJ37Uz_Ka9CmED3j0iWsNDIQ',
  'ChIJA949IlrDQyHftTP8pr0KYQ',
  'ChIJIUPDWiI93gNhCr2m_DO13w',
  'ChIJYQq9pvwztd8hQ8NaIj3eAw'
];
const DEFAULT_SEARCH_URL =
  'https://www.google.com/search?q=Black+Rabbit+Landscaping';
const CACHE_MS = 6 * 60 * 60 * 1000;

let placeCache = { at: 0, data: null };

function placesKey() {
  return String(
    process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || ''
  ).trim();
}

function configuredPlaceId() {
  return String(process.env.GOOGLE_PLACE_ID || '').trim();
}

function placeQuery() {
  return String(process.env.GOOGLE_PLACE_QUERY || DEFAULT_QUERY).trim();
}

function writeReviewUrl(placeId) {
  if (placeId) {
    return 'https://search.google.com/local/writereview?placeid=' + encodeURIComponent(placeId);
  }
  return DEFAULT_SEARCH_URL;
}

function mapsUrl(placeId) {
  if (placeId) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(placeQuery()) +
      '&query_place_id=' + encodeURIComponent(placeId);
  }
  return DEFAULT_SEARCH_URL;
}

function requireAdmin(req, res) {
  const secret = String(process.env.LEAD_ADMIN_TOKEN || '').trim();
  if (!secret) return true;
  const header = String(req.headers['x-lead-token'] || '').trim();
  const auth = String(req.headers.authorization || '');
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || '';
  if (header === secret || bearer === secret) return true;
  res.status(401).json({
    error: 'Unauthorized',
    note: 'Set X-Lead-Token to match LEAD_ADMIN_TOKEN (same token as Admin leads).'
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

function reviewKey(name, text) {
  const n = String(name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  const t = String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return n + '|' + t;
}

function slugName(name) {
  return String(name || 'guest')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 36) || 'guest';
}

function toIsoDate(unix) {
  const n = Number(unix);
  if (!n) return new Date().toISOString().slice(0, 10);
  return new Date(n * 1000).toISOString().slice(0, 10);
}

function mapGoogleReview(r) {
  const name = String(r.author_name || r.authorAttribution?.displayName || 'Google reviewer').trim();
  const text = String(r.text || r.originalText?.text || '').trim();
  const time = r.time || 0;
  return {
    id: 'rev-google-' + slugName(name) + '-' + String(time || Date.now()),
    name,
    location: '',
    rating: Number(r.rating) || 5,
    text,
    source: 'Google',
    date: toIsoDate(time),
    featured: true,
    sourceId: time ? 'g-' + slugName(name) + '-' + time : ''
  };
}

async function fetchJson(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function queryList() {
  const primary = placeQuery();
  const extras = [
    'Black Rabbit Landscaping',
    'Black Rabbit Landscaping Rainier WA',
    'Black Rabbit Landscaping Yelm WA'
  ];
  const out = [];
  for (const q of [primary, ...extras]) {
    const t = String(q || '').trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

async function searchPlacesNew(key, query) {
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.rating,places.userRatingCount,places.googleMapsUri,places.nationalPhoneNumber'
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 5
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        data.error && data.error.message
          ? data.error.message
          : 'Places New HTTP ' + res.status;
      if (/API has not been used|PERMISSION_DENIED|SERVICE_DISABLED/i.test(msg)) {
        return { disabled: true, error: msg };
      }
      return { error: 'Places New: ' + msg };
    }
    const places = Array.isArray(data.places) ? data.places : [];
    const phone = String(process.env.GOOGLE_PLACE_PHONE || DEFAULT_PHONE).replace(/\D/g, '');
    const picked =
      places.find((p) => String(p.nationalPhoneNumber || '').replace(/\D/g, '').endsWith(phone.slice(-10))) ||
      places.find((p) => /black rabbit/i.test((p.displayName && p.displayName.text) || '')) ||
      places[0];
    if (picked && picked.id) return { placeId: picked.id };
    return {};
  } catch (e) {
    return { error: 'Places New: ' + (e.message || String(e)) };
  }
}

async function findPlaceFromText(key, input, inputType) {
  const url =
    'https://maps.googleapis.com/maps/api/place/findplacefromtext/json' +
    '?input=' +
    encodeURIComponent(input) +
    '&inputtype=' +
    encodeURIComponent(inputType) +
    '&fields=place_id,name,rating,user_ratings_total' +
    '&key=' +
    encodeURIComponent(key);
  const { data } = await fetchJson(url);
  if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return { error: 'Find Place: ' + data.status + (data.error_message ? ' — ' + data.error_message : '') };
  }
  const cand = (data.candidates || [])[0];
  if (cand && cand.place_id) return { placeId: cand.place_id };
  return {};
}

async function findPlaceId(key) {
  const known = configuredPlaceId();
  if (known) return { placeId: known };

  const newQueries = queryList().concat(['Black Rabbit Landscaping Washington']);
  for (const q of newQueries) {
    const neu = await searchPlacesNew(key, q);
    if (neu.disabled) break;
    if (neu.placeId) return { placeId: neu.placeId };
  }

  const cid = String(process.env.GOOGLE_PLACE_CID || DEFAULT_PLACE_CID).replace(/\D/g, '');
  if (cid) {
    const byCid = await fetchPlaceDetails(key, null, cid);
    if (byCid.placeId && !byCid.error) return { placeId: byCid.placeId };
  }

  for (const guess of DEFAULT_PLACE_ID_GUESSES) {
    const details = await fetchPlaceDetails(key, guess);
    if (details.placeId && !details.error) return { placeId: details.placeId };
  }

  const tried = [];
  for (const q of queryList()) {
    tried.push(q);
    const found = await findPlaceFromText(key, q, 'textquery');
    if (found.error) return found;
    if (found.placeId) return { placeId: found.placeId };
  }

  const phone = String(process.env.GOOGLE_PLACE_PHONE || DEFAULT_PHONE).replace(/\D/g, '');
  if (phone) {
    tried.push('phone ' + phone);
    const found = await findPlaceFromText(key, '+' + phone, 'phonenumber');
    if (found.error) return found;
    if (found.placeId) return { placeId: found.placeId };
  }

  return {
    error:
      'No Google place matched (' +
      tried.join(' · ') +
      '). Set GOOGLE_PLACE_ID on Vercel, or open the listing → Share and send the link.'
  };
}

async function fetchPlaceDetails(key, placeId, cid) {
  const qs = cid
    ? 'cid=' + encodeURIComponent(cid)
    : 'place_id=' + encodeURIComponent(placeId);
  const url =
    'https://maps.googleapis.com/maps/api/place/details/json' +
    '?' +
    qs +
    '&fields=place_id,name,rating,user_ratings_total,url,reviews' +
    '&reviews_sort=newest' +
    '&key=' +
    encodeURIComponent(key);
  const { data } = await fetchJson(url);
  if (data.status && data.status !== 'OK') {
    return {
      error: 'Place Details: ' + data.status + (data.error_message ? ' — ' + data.error_message : '')
    };
  }
  const r = data.result || {};
  return {
    placeId: r.place_id || placeId,
    name: r.name || 'Black Rabbit Landscaping',
    rating: typeof r.rating === 'number' ? r.rating : null,
    userRatingCount: typeof r.user_ratings_total === 'number' ? r.user_ratings_total : null,
    mapsUrl: r.url || mapsUrl(r.place_id || placeId),
    reviews: Array.isArray(r.reviews) ? r.reviews.map(mapGoogleReview).filter((x) => x.text) : []
  };
}

async function loadGoogle(force) {
  const now = Date.now();
  if (!force && placeCache.data && now - placeCache.at < CACHE_MS) {
    return placeCache.data;
  }

  const key = placesKey();
  if (!key) {
    const empty = {
      configured: false,
      placeId: configuredPlaceId() || null,
      rating: null,
      userRatingCount: null,
      reviews: [],
      writeReviewUrl: writeReviewUrl(configuredPlaceId()),
      mapsUrl: mapsUrl(configuredPlaceId()),
      note: 'Add GOOGLE_PLACES_API_KEY on Vercel to pull live Google reviews.'
    };
    placeCache = { at: now, data: empty };
    return empty;
  }

  const found = await findPlaceId(key);
  if (found.error) {
    const err = {
      configured: true,
      placeId: configuredPlaceId() || null,
      rating: null,
      userRatingCount: null,
      reviews: [],
      writeReviewUrl: writeReviewUrl(configuredPlaceId()),
      mapsUrl: mapsUrl(configuredPlaceId()),
      error: found.error
    };
    return err;
  }

  const details = await fetchPlaceDetails(key, found.placeId);
  if (details.error) {
    return {
      configured: true,
      placeId: found.placeId,
      rating: null,
      userRatingCount: null,
      reviews: [],
      writeReviewUrl: writeReviewUrl(found.placeId),
      mapsUrl: mapsUrl(found.placeId),
      error: details.error
    };
  }

  const payload = {
    configured: true,
    placeId: details.placeId,
    name: details.name,
    rating: details.rating,
    userRatingCount: details.userRatingCount,
    reviews: details.reviews,
    writeReviewUrl: writeReviewUrl(details.placeId),
    mapsUrl: details.mapsUrl,
    fetchedAt: new Date().toISOString(),
    note:
      'Google Places returns up to 5 reviews. Paste older ones in Admin if you want the full porch list.'
  };
  placeCache = { at: now, data: payload };
  return payload;
}

function mergeReviews(existing, incoming) {
  const have = new Set();
  for (const r of existing || []) {
    have.add(reviewKey(r.name, r.text));
    if (r.sourceId) have.add('id:' + r.sourceId);
  }
  const added = [];
  for (const r of incoming || []) {
    const k = reviewKey(r.name, r.text);
    if (have.has(k) || (r.sourceId && have.has('id:' + r.sourceId))) continue;
    added.push(r);
    have.add(k);
    if (r.sourceId) have.add('id:' + r.sourceId);
  }
  return {
    reviews: added.concat(existing || []),
    added: added.length,
    skipped: (incoming || []).length - added.length
  };
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
    const google = await loadGoogle(false);
    return res.status(200).json(google);
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    const body = parseBody(req);
    const action = String(body.action || 'sync').trim();
    if (action !== 'sync') {
      return res.status(400).json({ ok: false, error: 'Unknown action' });
    }
    if (!placesKey()) {
      return res.status(503).json({
        ok: false,
        error:
          'GOOGLE_PLACES_API_KEY is not set on Vercel. Add a Places API key, then Sync again. You can still paste reviews by hand.'
      });
    }
    if (!isDurableConfigured()) {
      return res.status(503).json({
        ok: false,
        error: 'GITHUB_TOKEN not set — cannot publish synced reviews.'
      });
    }

    const google = await loadGoogle(true);
    if (google.error) {
      return res.status(502).json({ ok: false, error: google.error, google });
    }

    const current = await githubGetContent();
    if (!current) {
      return res.status(502).json({
        ok: false,
        error: lastGithubStoreError() || 'Could not read data/content.json'
      });
    }

    const merged = mergeReviews(current.content.reviews || [], google.reviews || []);
    const content = Object.assign({}, current.content, { reviews: merged.reviews });
    const saved = await githubSaveContent(
      content,
      current.sha,
      `chore: sync ${merged.added} Google review${merged.added === 1 ? '' : 's'}`
    );
    if (!saved.ok) {
      return res.status(502).json({ ok: false, error: saved.error });
    }

    return res.status(200).json({
      ok: true,
      added: merged.added,
      skipped: merged.skipped,
      total: merged.reviews.length,
      rating: google.rating,
      userRatingCount: google.userRatingCount,
      writeReviewUrl: google.writeReviewUrl,
      note:
        merged.added === 0
          ? 'No new Google reviews to add (Places only returns the latest 5). Paste any older ones by hand.'
          : 'Added ' + merged.added + ' new Google review' + (merged.added === 1 ? '' : 's') + '.'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
