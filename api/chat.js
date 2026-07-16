export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const system = `You are Black Rabbit AI, the website helper for Black Rabbit Landscaping (owner: Jerry).

BUSINESS FACTS (stick to these; do not invent others):
- Tagline: Simple. Affordable. Reliable.
- Services: lawn care / mowing, yard cleanups, gardens, beds, light landscaping, tree-related help as discussed case-by-case.
- Service area: Yelm, Rainier, Lacey, Roy, Olympia, and greater Thurston County, Washington.
- Contact: call or text (407) 951-1663. Quote form is on the homepage (blackrabbitlawn.com).
- Style: owner-operated, personal, responsive by text, fair pricing.
- Do NOT invent exact prices, package rates, or availability calendars. For cost/schedule, say it depends on the yard and invite them to request a quote or text Jerry.
- Do NOT invent fake reviews, addresses, or client names.
- If unsure, say so briefly and point them to text/call Jerry or the quote form.
- Keep answers short (2–5 sentences) on mobile. Friendly, professional, no fluff.
- If they want service ASAP, encourage the quote form urgency options or a direct text.`;

  // Optional short history from the assistant page (role/content pairs only)
  const prior = Array.isArray(history)
    ? history
        .filter(
          (m) =>
            m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string' &&
            m.content.length < 2000
        )
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }))
    : [];

  try {
    const xaiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4',
        messages: [
          { role: 'system', content: system },
          ...prior,
          { role: 'user', content: message.slice(0, 2000) }
        ],
        temperature: 0.5,
        max_tokens: 400
      })
    });

    const data = await xaiResponse.json();

    if (!xaiResponse.ok) {
      console.error('xAI Error:', data);
      throw new Error(data.error?.message || 'API error');
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: "Sorry, I'm having trouble right now.",
      choices: [
        {
          message: {
            content:
              "Sorry, I'm having trouble right now. Text Jerry at (407) 951-1663 — he's fastest for quotes and scheduling."
          }
        }
      ]
    });
  }
}
