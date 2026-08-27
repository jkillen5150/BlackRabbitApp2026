import inner from './badge-192.js';

const FIXES = [
  ['neBD7dq1o5sKohgREWEMI', 'neBD7dq1o5SKohgREWEMI'],
  ['lly9fxis9e+YkhLi6ukI', 'lly9fxis9e/YkhLi6ukI'],
  ['br1q1Vq1aUqysLKyGeDc', 'br1q1Vq1aU0qysLKyGeDc'],
  ['v/fnnnyi5e+fuEomkZ8+e', 'v/fnnnyi5e/fuEomkZ8+e'],
  ['SJRHL69GlKUqlql+/Pmp', 'SJRHL69GlKqUqlql+/Pmp'],
  ['bOzff//N0/777+r1epD', 'bOzff//N0P/777+r1epD'],
  ['AgK++eYbFsU2QigesYrhD', 'AgK++eYbFsX2QigesYrhD'],
  ['u7u7z5s07e+bsW2+9hYXM', 'u7u7z5s07e/bsW2+9hYXM'],
  ['CjmpkKrs9e+Yg6JuYlZdx', 'CjmpkKrs9e/Yg6JuYlZdx'],
  ['XL0dGRs6fP/QoEH+/v78', 'XL0dGRs6fP3/QoEH+/v78'],
  ['3bdvG4NK9e+dKaX5+vp2d', '3bdvG4NK9e3dKaX5+vp2d'],
  ['fdd7dv32YlN69OysrKz', 'fdd7dv32Yl7N69OysrKz'],
  ['xYsXb9++fe+ePZMRVeRxT', 'xYsXb9++fe/ePZMRVeRxT'],
];

const origFrom = Buffer.from;

function patchedFrom(data, enc, ...rest) {
  if (enc === 'base64' && typeof data === 'string') {
    let s = data;
    for (const [from, to] of FIXES) s = s.split(from).join(to);
    return origFrom.call(Buffer, s, enc, ...rest);
  }
  return origFrom.call(Buffer, data, enc, ...rest);
}

export default async function handler(req, res) {
  Buffer.from = patchedFrom;
  try {
    return await inner(req, res);
  } finally {
    Buffer.from = origFrom;
  }
}
