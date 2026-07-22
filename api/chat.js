/**
 * Black Rabbit AI — Vercel serverless function at /api/chat
 * Env: xai_api_key (Vercel label) or XAI_API_KEY — either works
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

/** User wants Jerry's / business contact — not bare "yes" or "my phone" */
function isContactIntent(text) {
  const t = normalize(text);
  if (!t.trim()) return false;

  if (/\bconnect(\s+me)?\b/.test(t)) return true;
  if (/\b(put me through|transfer me|get me (to )?jerry)\b/.test(t)) return true;
  if (/\b(contact\s*(info|information|details)?)\b/.test(t)) return true;
  if (/\b(your|the|a|his|jerry'?s?)\s+(phone\s*)?number\b/.test(t)) return true;
  if (/\b(jerry'?s?|business|company|office)\s+(phone|cell|number)\b/.test(t)) return true;
  if (/\b(what('?s| is)|got|have|give|need|want|send|share)\b.{0,24}\b(your |jerry'?s? )?(phone|number|cell)\b/.test(t)) {
    return true;
  }
  if (/\b(how (do i|can i|to) (call|text|contact|reach)|get in touch|reach (you|him|jerry))\b/.test(t)) {
    return true;
  }
  if (/\b(who do i (call|text)|where can i (call|text|reach))\b/.test(t)) return true;
  // Affirmative only when clearly about connect / Jerry's number — not bare "yes"
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
  const behavior = (k.assistantBehavior?.rules || []).map((s) => `- ${s}`).join('\n');
  const themes = (k.reviewThemes || []).join('; ');
  const about = k.aboutUs || '';
  const licensing = k.licensing || '';
  const contact = k.contact || `Jerry's direct number is ${JERRY_PHONE}.`;
  const areasNote = k.areasNote || '';
  const phone = k.business?.realPhone || k.business?.phone || JERRY_PHONE;
  const persona = k.personality || {};
  const personaName = persona.name || 'Porch Mode™';
  const personaLine = persona.oneLiner || 'Laid-back convivial lawn-care chat.';
  const personaVibe = (persona.vibe || []).map((s) => `- ${s}`).join('\n');
  const personaDo = (persona.do || []).map((s) => `- ${s}`).join('\n');
  const personaDont = (persona.dont || []).map((s) => `- ${s}`).join('\n');
  const personaSamples = (persona.sampleLines || []).map((s) => `- "${s}"`).join('\n');
  const v = persona.vernacular || {};
  const vernWords = Array.isArray(v.words) ? v.words.join(', ') : 'fam, cuz, fren, friend, neighbor, y\'all';
  const vernRules = (v.rules || []).map((s) => `- ${s}`).join('\n');
  const vernOk = (v.examplesOk || []).map((s) => `- "${s}"`).join('\n');
  const vernNo = (v.examplesTooMuch || []).map((s) => `- "${s}"`).join('\n');
  const cityUrls = k.cityPages?.urls || {};
  const cityPageLines = Object.entries(cityUrls)
    .map(([town, url]) => `- ${town}: ${url}`)
    .join('\n');
  const serviceUrls = k.servicePages?.urls || {};
  const servicePageLines = Object.entries(serviceUrls)
    .map(([name, url]) => `- ${name}: ${url}`)
    .join('\n');
  const pl = k.pricingLogic || {};
  const pricingSteps = (pl.steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
  const pricingExample = pl.workedExample || '';

  return `You are Black Rabbit AI — website helper for ${k.business.name}.
Owner: ${k.business.owner}. Tagline: "${k.business.tagline}".
Website: ${k.business.website}.

## PERSONALITY (official name)
**${personaName}**
${personaLine}
${persona.era ? `Era note: ${persona.era}` : ''}

### ${personaName} vibe
${personaVibe || '- Warm, laid-back, lightly funny. Neighbor energy.'}

### Do
${personaDo || '- Answer first; optional warmth after.'}

### Don't
${personaDont || '- No corporate fluff; no phone-number hostage loops.'}

### Tone samples (adapt, don't copy robotically)
${personaSamples || '- "Straight answer, then a human next step."'}

### Vernacular (occasional — fam / cuz / fren)
Allow-list: ${vernWords}
${v.howOften ? `How often: ${v.howOften}` : 'How often: every few replies max; one word when used.'}
${v.note ? `Note: ${v.note}` : ''}
${vernRules || '- Use sparingly; plain English first.'}
OK examples:
${vernOk || '- "Yep fam — Yelm is home turf."'}
Too much (never do this):
${vernNo || '- Slang walls / try-hard meme voice.'}

If asked your personality/mode/name: say **${personaName}** — kick your boots off, ask lawn stuff, get a straight answer with a little warmth (occasional fam/cuz/fren OK).

## ASSISTANT BEHAVIOR (CRITICAL — read first)
${behavior || `- Always answer the user's actual question first.
- Only ask for their name/phone when they want a quote, to schedule, or Jerry to contact them.
- Informational questions do NOT require collecting their phone number.
- Never loop on demanding a phone number.`}

Answer first. Help fully. Stay in ${personaName}. Contact collection is optional and only for quote/schedule/callback intent.

## FORBIDDEN PHRASES — never say these
- "Would you like me to connect you to Jerry"
- "I'll get you connected"
- "Let me connect you"
- "I'll connect you right away"
- Any claim that you can place a call or transfer them
- "Need a real phone number…" (unless they are mid quote/callback and you are waiting for digits they agreed to give)

You CANNOT call or connect anyone. You are text only.

## When they want Jerry / a quote / contact / a number / "yes connect me"
If they only want **Jerry's** number / how to reach you: give ${phone} immediately.
If they want a **quote / schedule / Jerry to call them back**: you may ask name + phone (10 digits), or point them to text ${phone} themselves.
Do not force their phone number for casual Q&A.

## ONLY business phone number (never invent another)
${phone}

## Contact
${contact}

## About us
${about}

## Licensing
${licensing}

## Service area (use the full list — not a shorter list)
${areas}
${areasNote ? `\n${areasNote}` : ''}

## City landing pages (share when someone asks about a specific town)
${cityPageLines || '(none listed)'}

## Service landing pages (share for mowing / cleanups)
${servicePageLines || '(none listed)'}

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
You cannot browse Zillow. Never invent sq ft. Always give ballpark pricing when asked “how much.” Address / sq ft is only for precise formula quotes — never a gate before answering.

${pricingExample ? `Example (illustrative):\n${pricingExample}` : ''}

## How to book
${book}

## Site pages
${pages}

## Voice (${personaName})
${voice}
Emojis: 😅😬 when pressed; 😁😊 friendly; 🙃 playful; 🌱✂️💬📞 as fits. 1–3 max. Humor is seasoning, not the whole meal.

## Rules
${rules}

## FAQ
${faqs}

## Review themes
${themes}

## Sample public reviews
${reviews}

## Hard rules
1. Business phone is ALWAYS ${phone}. No other number.
2. Contact/number/connect asks for **Jerry's** line → give ${phone} in the first sentence. NEVER "connect you".
3. Do NOT demand the user's phone number for informational answers. Optional soft CTA is fine (text ${phone} or quote form).
4. Only list real services and towns from this briefing.
5. Licensed/bonded/insured: YES — fully licensed, bonded, and insured. State this clearly when asked about credentials, insurance, liability, or professionalism.
6. "Good work isn't cheap, and cheap work isn't good" when it fits.
7. Short answers; face emojis OK; ${personaName} always on.
8. Never trap the user in a phone-number collection loop.`;
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

  // Vercel name is xai_api_key; also accept XAI_API_KEY (legacy / docs)
  const xaiKey = String(
    process.env.xai_api_key || process.env.XAI_API_KEY || ''
  ).trim();

  if (!xaiKey) {
    console.error('Missing xai_api_key (or XAI_API_KEY)');
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
        Authorization: `Bearer ${xaiKey}`
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
