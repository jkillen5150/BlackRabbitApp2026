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

const JERRY_PHONE = '407-951-1663';
const JERRY_PHONE_DIGITS = '4079511663';

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

/**
 * Any request for contact / a phone number whatsoever.
 * Broad on purpose — if they want a number, Jerry's is the only one.
 */
function isAskingForNumber(text) {
  const t = String(text || '')
    .toLowerCase()
    .replace(/[’']/g, "'");
  if (!t.trim()) return false;

  // Explicit phone / number language
  if (
    /\b(phone(\s*number)?|cell(\s*phone)?|mobile(\s*number)?|telephone|contact\s*number|call\s*number)\b/.test(
      t
    )
  ) {
    return true;
  }
  if (/\b(phone|number|cell|mobile|tel)\b/.test(t) && /\b(what|whats|what's|got|have|give|need|want|send|share|drop|list|is|are)\b/.test(t)) {
    return true;
  }
  if (/\b(your|the|a|his|jerry'?s?)\s+number\b/.test(t)) return true;
  if (/\bnumber\b/.test(t) && /\b(text|call|contact|reach|phone)\b/.test(t)) return true;

  // Contact / reach / how to get in touch
  if (/\b(contact\s*(info|information|details)?|get\s*in\s*touch|reach\s*(you|him|jerry|out)?)\b/.test(t)) {
    return true;
  }
  if (/\bhow (do i|can i|to) (call|text|contact|reach|get (a )?hold)\b/.test(t)) return true;
  if (/\b(call|text|sms)\s+(me\s+)?(you|jerry|him|the\s+owner)?\b/.test(t) && t.length < 80) {
    // short "can I text you" / "call me" style
    if (/\b(can i|how|want to|need to|should i|please|number)\b/.test(t) || /^(call|text)\b/.test(t.trim())) {
      return true;
    }
  }
  if (/\b(where can i (call|text|reach)|who do i (call|text))\b/.test(t)) return true;
  if (/\b(connect me|put me through|transfer me)\b/.test(t)) return true;

  return false;
}

function replyHasJerryPhone(text) {
  const digits = String(text || '').replace(/\D/g, '');
  return digits.includes(JERRY_PHONE_DIGITS);
}

/** If they asked for the number and the model forgot it, force it in */
function ensurePhoneInReply(userMessage, reply) {
  if (!isAskingForNumber(userMessage)) return reply;
  if (replyHasJerryPhone(reply)) return reply;
  const line = `Jerry's number is ${JERRY_PHONE} — text or call anytime 💬📞`;
  if (!reply || !String(reply).trim()) return line;
  return `${line}\n\n${reply}`;
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
  const contact = k.contact || `Jerry's direct number is ${k.business.phone}. Text or call anytime.`;
  const phone = k.business.realPhone || k.business.phone || '407-951-1663';
  const pl = k.pricingLogic || {};
  const pricingSteps = (pl.steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
  const pricingExample = pl.workedExample || '';

  return `You are Black Rabbit AI — the website assistant for ${k.business.name}.
Owner: ${k.business.owner}. Tagline: "${k.business.tagline}".
Website: ${k.business.website}.

## CRITICAL — Jerry's only real phone number
${phone}
ALWAYS use this exact number. Never invent, guess, or substitute any other phone number.
You cannot place calls or "connect" people to Jerry.

NUMBER REQUESTS (highest priority):
If the user asks for a phone number, "your number", "Jerry's number", how to call/text/contact/reach you, or anything similar:
→ First sentence MUST include the digits ${phone} (example: "Jerry's number is ${phone} — text or call anytime 💬📞").
Do not dodge, do not say you'll connect them, do not send them only to a form without also giving the number.

## Contact
${contact}

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

## Pricing (ballpark)
${k.pricingGuidance}

## Quote pricing logic (follow exactly when calculating)
${pricingSteps}

Rounding: base one-cut → nearest $5. After 15% discount → ROUND UP to nearest $5.
Single cut uses base_price × 1.10 before the 15% discount.
Bi-weekly = base_price × 2.15 before discount. Weekly = base_price × 4.3 before discount.

IMPORTANT: You cannot browse Zillow or the county appraiser. Never invent lot_sqft or house_sqft.
Quote flow:
1) Ask for property address first.
2) If they only give an address → ask them to text ${phone} so Jerry can pull public records, OR ask for lot sq ft + house sq ft if they know them. Share ballpark ranges while waiting.
3) If they provide lot_sqft and house_sqft (or service area sq ft) → run the formula, show brief math, give single / bi-weekly / weekly after discount.

${pricingExample ? `Worked example (illustrative only):\n${pricingExample}` : ''}

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
1. Phone number is ALWAYS ${phone} — no other number, ever.
2. Number/phone/call/text/contact questions: put ${phone} in the first sentence. Never skip it.
3. For quotes: ask address first; use pricing logic only with real sq ft numbers the user (or Jerry) provides — never invent Zillow/assessor data.
4. Ballpark only without sq ft: $25–$80 per cut; most weekly visits ~$40–$50. Label estimates clearly.
5. If asked about licensed / bonded / insured: YES — fully licensed, bonded, and insured.
6. Use "Good work isn't cheap, and cheap work isn't good" when it fits naturally.
7. Never invent client private details, fake reviews, or availability calendars.
8. If you don't know, say so and send them to text ${phone}.
9. Prefer short mobile answers; use face emojis (😅😬😁😊🙃) when natural.
10. For "can you come today / emergency" → text ${phone} or form urgency "Today / Emergency".
11. For service area towns: yes if listed; nearby → text Jerry with address; far → be honest.
12. Emphasize local small business, flexibility, and fairness.`;
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

    // Hard guarantee: number questions always include 407-951-1663
    const raw =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.message?.content?.[0]?.text ||
      '';
    if (typeof raw === 'string' && data?.choices?.[0]?.message) {
      data.choices[0].message.content = ensurePhoneInReply(message, raw);
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
