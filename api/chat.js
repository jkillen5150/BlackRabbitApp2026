/**
 * Black Rabbit AI — Vercel serverless function at /api/chat
 * Env: XAI_API_KEY
 *
 * Knowledge: data/ai-knowledge.json
 * Contact: 407-951-1663 only — never "connect you to Jerry" without the digits.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

let knowledgeCache = null;

const JERRY_PHONE = '407-951-1663';
const JERRY_PHONE_DIGITS = '4079511663';
const PHONE_LINE = `Jerry's number is ${JERRY_PHONE} — text or call anytime 💬📞`;

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

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[’']/g, "'");
}

/** Any contact / phone / connect intent */
function isContactIntent(text) {
  const t = normalize(text);
  if (!t.trim()) return false;

  if (/\bconnect(\s+me)?\b/.test(t)) return true;
  if (/\b(put me through|transfer me|get me (to )?jerry)\b/.test(t)) return true;
  if (/\b(phone|cell|mobile|telephone)\b/.test(t)) return true;
  if (/\b(contact\s*(info|information|details)?)\b/.test(t)) return true;
  if (/\b(your|the|a|his|jerry'?s?)\s+number\b/.test(t)) return true;
  if (/\bnumber\b/.test(t) && /\b(what|whats|what's|got|have|give|need|want|send|share|call|text|phone)\b/.test(t)) {
    return true;
  }
  if (/\b(how (do i|can i|to) (call|text|contact|reach)|get in touch|reach (you|him|jerry))\b/.test(t)) {
    return true;
  }
  if (/\b(who do i (call|text)|where can i (call|text|reach))\b/.test(t)) return true;
  // short yes after a connect offer
  if (/^(yes|yeah|yep|sure|ok|okay|please|do it)[!.,\s]*$/.test(t.trim())) return true;
  if (/^(yes|yeah|yep|sure|ok)\b.{0,40}\b(connect|jerry|call|text|number)\b/.test(t)) return true;

  return false;
}

function replyHasJerryPhone(text) {
  return String(text || '').replace(/\D/g, '').includes(JERRY_PHONE_DIGITS);
}

/** Strip fake "I'll connect you" loops and force the real number */
function sanitizeBotReply(userMessage, reply) {
  let out = String(reply || '').trim();

  // Kill the broken CTA loop
  out = out.replace(
    /\s*would you like me to connect you to jerry[^.?!]*[.?!]?\s*/gi,
    ' '
  );
  out = out.replace(
    /\s*(i'?ll|i will|let me|sure[,.]?\s*i'?ll)\s+(get you\s+)?connected[^.?!]*[.?!]?\s*/gi,
    ' '
  );
  out = out.replace(/\s*connect(ing)? you (with|to) jerry[^.?!]*[.?!]?\s*/gi, ' ');
  out = out.replace(/\s{2,}/g, ' ').trim();

  const wantsContact = isContactIntent(userMessage);
  const hasPhone = replyHasJerryPhone(out);

  if (wantsContact) {
    // Hard answer — no games
    if (!hasPhone || !out) {
      return `${PHONE_LINE} That's the fastest way to get a quote or book — I can't place the call from here.`;
    }
    // Number is there but put it first if buried
    if (!out.replace(/\D/g, '').startsWith(JERRY_PHONE_DIGITS.slice(0, 3))) {
      return `${PHONE_LINE}\n\n${out}`;
    }
    return out;
  }

  // Even on normal answers: if model offered "connect" without a number, fix it
  if (!hasPhone && /connect you to jerry|get you connected/i.test(String(reply || ''))) {
    return out
      ? `${out}\n\n${PHONE_LINE}`
      : PHONE_LINE;
  }

  if (!hasPhone && /connect/i.test(out) && /jerry/i.test(out)) {
    return `${out}\n\n${PHONE_LINE}`;
  }

  return out || reply;
}

function buildSystemPrompt(k) {
  if (!k) {
    return `You are Black Rabbit AI for Black Rabbit Landscaping (Jerry). Phone ${JERRY_PHONE}. NEVER say you will "connect" someone — always give ${JERRY_PHONE}.`;
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
  const contact = k.contact || `Jerry's direct number is ${JERRY_PHONE}.`;
  const phone = k.business?.realPhone || k.business?.phone || JERRY_PHONE;
  const cityUrls = k.cityPages?.urls || {};
  const cityPageLines = Object.entries(cityUrls)
    .map(([town, url]) => `- ${town}: ${url}`)
    .join('\n');
  const pl = k.pricingLogic || {};
  const pricingSteps = (pl.steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
  const pricingExample = pl.workedExample || '';

  return `You are Black Rabbit AI — website helper for ${k.business.name}.
Owner: ${k.business.owner}. Tagline: "${k.business.tagline}".
Website: ${k.business.website}.

## FORBIDDEN PHRASES — never say these
- "Would you like me to connect you to Jerry"
- "I'll get you connected"
- "Let me connect you"
- "I'll connect you right away"
- Any claim that you can place a call or transfer them

You CANNOT call or connect anyone. You are text only.

## When they want Jerry / a quote / contact / a number / "yes connect me"
Reply with the number immediately, e.g.:
"Jerry's number is ${phone} — text or call anytime 💬📞"
That is the ONLY correct response pattern for contact. Do not ask if they want to be connected.

## ONLY phone number (never invent another)
${phone}

## Contact
${contact}

## About us
${about}

## Licensing
${licensing}

## Service area (use the full list — not a shorter list)
${areas}

## City landing pages (share when someone asks about a specific town)
${cityPageLines || '(none listed)'}

## Services we do (ONLY these — do not invent fertilization, aeration, etc.)
${services}

## Do not over-promise
${notOffered}

## Pricing (ballpark)
${k.pricingGuidance}

## Quote pricing logic
${pricingSteps}

Rounding: base one-cut → nearest $5. After 15% discount → ROUND UP to nearest $5.
Single: base×1.10 before discount. Bi-weekly: base×2.15. Weekly: base×4.3.
You cannot browse Zillow. Never invent sq ft. Ask address first; if only address, tell them to text ${phone} or provide lot+house sq ft.

${pricingExample ? `Example (illustrative):\n${pricingExample}` : ''}

## How to book
${book}

## Site pages
${pages}

## Voice
${voice}
Emojis: 😅😬 when pressed; 😁😊 friendly; 🙃 playful; 🌱✂️💬📞 as fits. 1–3 max.

## Rules
${rules}

## FAQ
${faqs}

## Review themes
${themes}

## Sample public reviews
${reviews}

## Hard rules
1. Phone is ALWAYS ${phone}. No other number.
2. Contact/number/connect asks → give ${phone} in the first sentence. NEVER "connect you".
3. End answers with a useful next step (text ${phone} or quote form) — not a fake connect CTA.
4. Only list real services and towns from this briefing.
5. Licensed/bonded/insured: yes.
6. "Good work isn't cheap, and cheap work isn't good" when it fits.
7. Short answers; face emojis OK.`;
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
            content: `Chat isn't wired up on the server yet. Text Jerry at ${JERRY_PHONE} 💬📞`
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

  // Pure number/contact asks — give digits. Quote/connect interview is handled in assistant.js.
  if (isContactIntent(message)) {
    const t = String(message).toLowerCase();
    const handoff =
      /\b(quote|book|schedule|connect me|mow my|want service)\b/.test(t) === false;
    return res.status(200).json({
      choices: [
        {
          message: {
            content: handoff
              ? `${PHONE_LINE} That's Jerry — owner of Black Rabbit. Want a follow-up quote without the form? Say "I want a quote" and the site will ask your name and phone (address optional), then email him 😁`
              : `${PHONE_LINE} Or say "I want a quote" so the chat can take your details and email Jerry a follow-up.`
          }
        }
      ]
    });
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
        temperature: 0.3,
        max_tokens: 450
      })
    });

    const data = await xaiResponse.json();

    if (!xaiResponse.ok) {
      console.error('xAI Error:', data);
      throw new Error(data.error?.message || 'API error');
    }

    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw === 'string' && data?.choices?.[0]?.message) {
      data.choices[0].message.content = sanitizeBotReply(message, raw);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: "Sorry, I'm having trouble right now.",
      choices: [
        {
          message: {
            content: `Sorry, glitch on my end 😅 Text Jerry at ${JERRY_PHONE} — he's fastest for quotes.`
          }
        }
      ]
    });
  }
}
