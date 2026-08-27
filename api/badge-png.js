/**
 * Serves the original circular email-signature badge (192x192 PNG).
 * Do not redraw. Source: Graphic Designer original circle.
 *
 * Reads api/badge-192.js and applies unique transcription fixes so the
 * decoded PNG bytes match the original 23658-byte circle.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const FIXES = [
  ['neBD7dq1o5sKohgREWEMI', 'neBD7dq1o5SKohgREWEMI'],
  ['lly9fxis9e+YkhLi6\nukI', 'lly9fxis9e/YkhLi6\nukI'],
  ['br1q1Vq1aUqysLKyGeDc', 'br1q1Vq1aU0qysLKyGeDc'],
  ['v/fnnnyi5e+fuEomkZ8+e', 'v/fnnnyi5e/fuEomkZ8+e'],
  ['SJRHL69GlKUqlql+/Pmp', 'SJRHL69GlKqUqlql+/Pmp'],
  ['\nbOzff//N0/777+r1epD', '\nbOzff//N0P/777+r1epD'],
  ['AgK++eYbFsU2QigesYrhD', 'AgK++eYbFsX2QigesYrhD'],
  ['u7u7z5s07e+bsW2+9hYXM', 'u7u7z5s07e/bsW2+9hYXM'],
  ['CjmpkKrs9e+Yg6JuYlZdx', 'CjmpkKrs9e/Yg6JuYlZdx'],
  ['XL0dGRs6fP/QoEH+/v78', 'XL0dGRs6fP3/QoEH+/v78'],
  ['3bdvG4NK9e+dKaX5+vp2d', '3bdvG4NK9e3dKaX5+vp2d'],
  ['fdd7dv32YlN69Oysr\nKz', 'fdd7dv32Yl7N69Oysr\nKz'],
  ['xYsXb9++fe+ePZMRVeRxT', 'xYsXb9++fe/ePZMRVeRxT'],
];

function pngBuffer() {
  const dir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(dir, 'badge-192.js'),
    join(process.cwd(), 'api/badge-192.js'),
  ];
  let src = null;
  let lastErr = null;
  for (const p of candidates) {
    try {
      src = readFileSync(p, 'utf8');
      break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (src == null) throw lastErr || new Error('badge-192.js not found');
  for (const [from, to] of FIXES) {
    const count = src.split(from).length - 1;
    if (count !== 1) {
      throw new Error('badge fix needle count=' + count + ' for ' + JSON.stringify(from));
    }
    src = src.replace(from, to);
  }
  const startTok = 'const PNG_B64 = `';
  const start = src.indexOf(startTok);
  const end = src.indexOf('`.replace(', start);
  if (start < 0 || end < 0) throw new Error('PNG_B64 block not found');
  const b64 = src.slice(start + startTok.length, end).replace(/\s+/g, '');
  return Buffer.from(b64, 'base64');
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(204).end();
  }
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).end();
  }
  const buf = pngBuffer();
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(buf);
}
