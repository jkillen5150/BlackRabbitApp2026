/**
 * POST /api/create-deposit
 * Creates a Stripe Checkout Session for a Cut My Grass booking deposit.
 *
 * Env (Vercel):
 *   STRIPE_SECRET_KEY          — sk_live_… or sk_test_… (required)
 *   STRIPE_DEPOSIT_AMOUNT_CENTS — default 2500 ($25.00)
 *   SITE_URL                   — optional override, e.g. https://blackrabbitlawn.com
 *
 * Body JSON:
 *   { name, phone, address?, leadId?, service?, urgency? }
 *
 * Returns: { url, sessionId, amountCents, amountLabel }
 */
function clean(s, max = 200) {
  return String(s || '')
    .trim()
    .slice(0, max);
}

function siteBase(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'blackrabbitlawn.com';
  return `${proto}://${host}`.replace(/\/$/, '');
}

function dollars(cents) {
  return (Number(cents) / 100).toFixed(2);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return res.status(503).json({
      error: 'Stripe not configured',
      note: 'Set STRIPE_SECRET_KEY on Vercel (live or test), then redeploy.'
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  const name = clean(body.name, 120);
  const phone = clean(body.phone, 40);
  const address = clean(body.address, 300);
  const leadId = clean(body.leadId, 80);
  const service = clean(body.service, 120);
  const urgency = clean(body.urgency, 80);

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  const amountCents = Math.max(
    100,
    Math.min(
      50000,
      parseInt(process.env.STRIPE_DEPOSIT_AMOUNT_CENTS || '2500', 10) || 2500
    )
  );

  const base = siteBase(req);
  const successUrl = `${base}/cut-my-grass?deposit=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${base}/cut-my-grass?deposit=cancel`;

  const productName = 'Cut My Grass booking deposit';
  const productDesc = [
    'Holds your lawn-care slot with Black Rabbit.',
    'Applied to your final quote. Balance due after the job.',
    service && `Service: ${service}`,
    urgency && `When: ${urgency}`,
    address && `Property: ${address}`,
    `Contact: ${name} · ${phone}`
  ]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 450);

  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('success_url', successUrl);
  params.append('cancel_url', cancelUrl);
  params.append('submit_type', 'book');
  params.append('billing_address_collection', 'auto');
  params.append('phone_number_collection[enabled]', 'false');
  params.append('line_items[0][quantity]', '1');
  params.append('line_items[0][price_data][currency]', 'usd');
  params.append('line_items[0][price_data][unit_amount]', String(amountCents));
  params.append('line_items[0][price_data][product_data][name]', productName);
  params.append('line_items[0][price_data][product_data][description]', productDesc);
  params.append('payment_intent_data[description]', `Cut My Grass deposit — ${name} — ${phone}`);
  params.append('payment_intent_data[metadata][source]', 'cut-my-grass');
  params.append('payment_intent_data[metadata][customer_name]', name);
  params.append('payment_intent_data[metadata][customer_phone]', phone);
  if (leadId) params.append('payment_intent_data[metadata][lead_id]', leadId);
  if (address) params.append('payment_intent_data[metadata][address]', address.slice(0, 200));
  if (service) params.append('payment_intent_data[metadata][service]', service.slice(0, 100));
  params.append('metadata[source]', 'cut-my-grass');
  params.append('metadata[customer_name]', name);
  params.append('metadata[customer_phone]', phone);
  if (leadId) params.append('metadata[lead_id]', leadId);

  // Prefill name when Stripe supports custom fields is limited; metadata is enough for Jerry.
  params.append(
    'custom_text[submit][message]',
    'Deposit holds your slot. Powered by Black Rabbit — applied to your final lawn care quote.'
  );

  try {
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2024-06-20'
      },
      body: params.toString()
    });

    const session = await stripeRes.json().catch(() => ({}));
    if (!stripeRes.ok) {
      console.error('Stripe Checkout error', session);
      return res.status(502).json({
        error: 'Could not start card payment',
        detail: session.error?.message || session.message || 'Stripe error'
      });
    }

    if (!session.url) {
      return res.status(502).json({ error: 'Stripe did not return a checkout URL' });
    }

    return res.status(200).json({
      ok: true,
      url: session.url,
      sessionId: session.id,
      amountCents,
      amountLabel: `$${dollars(amountCents)}`
    });
  } catch (e) {
    console.error('create-deposit', e);
    return res.status(500).json({
      error: 'Deposit setup failed',
      detail: e.message || String(e)
    });
  }
}
