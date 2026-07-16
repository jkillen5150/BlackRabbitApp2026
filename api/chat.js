/**
 * Black Rabbit AI — Vercel serverless function at /api/chat
 * Env: XAI_API_KEY
 *
 * Intelligence = briefing packet (system prompt + data/ai-knowledge.json),
 * not fine-tuning. Edit data/ai-knowledge.json and redeploy to teach it more.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

let knowledgeCache = null;

function loadKnowledge() {
  if (knowledgeCache) return knowledgeCache;
  try {
    const path = join(process.cwd(), 'data', 'ai-knowledge.json');
    knowledgeCache = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    console.error('Could not load ai-knowledge.json', e);
    knowledgeCache = null;
  }
  return knowledgeCache;
}

function buildSystemPrompt(k) {
  if (!k) {
    return `You are Black Rabbit AI for Black Rabbit Landscaping (Jerry) in Yelm / Thurston County WA. Phone (407) 951-1663. Don't invent prices. Keep answers short.`;
  }

  const pages = (k.sitePages || [])
    .map((p) => `- ${p.path}: ${p.about}`)
    .join('\n');
  const faqs = (k.faqs || [])
    .map((f) => `Q: ${f.q}\nA: ${f.a}`)
    .join('\n\n');
  const reviews = (k.samplePublicReviews || [])
    .map((r) => `- ${r.name}: "${r.text}"`)
    .join('\n');
  const services = (k.services || []).map((s) => `- ${s}`).join('\n');
  const areas = (k.areas || []).join('; ');
  const notOffered = (k.notOfferedUnlessConfirmed || []).map((s) => `- ${s}`).join('\n');
  const book = (k.howToBook || []).map((s) => `- ${s}`).join('\n');
  const voice = (k.voice || []).map((s) => `- ${s}`).join('\n');
  const rules = (k.rules || []).map((s) => `- ${s}`).join('\n');
  const themes = (k.reviewThemes || []).join('; ');
  const about = k.aboutUs || '';
  const licensing = k.licensing || '';

  return `You are Black Rabbit AI — the website assistant for ${k.business.name}.
Owner: ${k.business.owner}. Tagline: "${k.business.tagline}".
Website: ${k.business.website}. Call/text: ${k.business.phone}.

## About us
${about}

## Licensing
${licensing}

Your job: answer accurately using ONLY the knowledge below plus the user's message. Sound useful and local. You are not a booking system.

## Service area
${areas}

## Services we do
${services}

## Do not over-promise
${notOffered}

## Pricing
${k.pricingGuidance}

## How customers book
${book}

## Website map (send people to the right page)
${pages}

## Voice / tone
${voice}

Use emojis like a friendly local texter — including face expressions:
- Pressed for hard answers (exact price, guarantees, urgency): 😅 or 😬 while still being helpful and honest
- Warm / happy / good news: 😁 (toothy) or 😊 (soft closed-eyes smile)
- Playful, dry, or light shrug energy: 🙃
- Topics: 🌱 ✂️ 🐰 📍 💬 📞 ✅ 🏡 as they fit
About 1–3 emojis per reply max — natural, never emoji spam.

## Business rules
${rules}

## FAQ playbook
${faqs}

## Review themes (public Google feedback)
${themes}

## Sample public Google reviews (OK to paraphrase or quote briefly)
${reviews}

## Hard rules
1. You MAY share Jerry's general price ranges from Pricing above ($25–$80; most weekly cuts $40–$50). Never invent a firm quote for their specific yard without seeing it.
2. Always push text/call ${k.business.phone} for a personalized quote when they're ready to book.
3. If asked about licensed / bonded / insured: answer YES — fully licensed, bonded, and insured (see Licensing).
4. Use "Good work isn't cheap, and cheap work isn't good" when it fits naturally (pricing / quality talk).
5. Never invent client street addresses, fake reviews, or availability calendars.
6. If you don't know, say so in one line and send them to text ${k.business.phone}.
7. Prefer 2–5 short sentences on mobile; use bullets only if it helps.
8. For "can you come today / emergency" → urge text or form urgency "Today / Emergency".
9. For "do you mow X town?" → if it's in the service area list say yes; if nearby, "probably — text Jerry with the address"; if far away, be honest.
10. Emphasize local small business, flexibility, and fairness.`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.XAI_API_KEY) {
    console.error('Missing XAI_API_KEY');
    return res.status(500).json({
      error: 'Chat not configured',
      choices: [
        {
          message: {
            content:
              "Chat isn't wired up on the server yet. Text Jerry at (407) 951-1663 and we'll get you sorted."
          }
        }
      ]
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

  const { message, history } = body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const knowledge = loadKnowledge();
  const system = buildSystemPrompt(knowledge);

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
        // Lower temp = fewer creative lies, more "follow the briefing"
        temperature: 0.35,
        max_tokens: 450
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
