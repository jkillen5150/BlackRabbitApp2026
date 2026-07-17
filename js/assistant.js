/**
 * Full-page Black Rabbit AI + conversational "connect me / quote" handoff.
 * Asks name → phone → address (optional) → need, then emails Jerry + logs a lead.
 */
(function () {
  const history = [];
  const JERRY_PHONE = '407-951-1663';
  const JERRY_DIGITS = '4079511663';
  const PHONE_LINE = `Jerry's number is ${JERRY_PHONE} — text or call anytime 💬📞`;

  /** @type {{ step: string, data: Record<string,string> } | null} */
  let leadFlow = null;

  function endpoints() {
    if (window.BR_CHAT_API) return [window.BR_CHAT_API];
    return ['/api/chat', 'https://br-chat-proxy.vercel.app/api/chat'];
  }

  function leadUrl() {
    if (window.BR_LEAD_API) return window.BR_LEAD_API;
    return '/api/lead';
  }

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[’']/g, "'");
  }

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
    return false;
  }

  /** Start handoff interview (not just dump number) */
  function wantsHandoff(text) {
    const t = normalize(text);
    if (/\bconnect(\s+me)?\b/.test(t)) return true;
    if (/\b(get me (to )?jerry|talk to jerry|speak to jerry)\b/.test(t)) return true;
    if (/\b(i want a quote|get a quote|need a quote|book (a )?service|schedule|sign me up)\b/.test(t)) {
      return true;
    }
    if (/\b(come (out|over|mow)|mow my (lawn|yard)|yard (is|needs)|need (a )?mow)\b/.test(t)) {
      return true;
    }
    if (/^(yes|yeah|yep|sure|ok|okay)\b.{0,40}\b(connect|quote|jerry|book)\b/.test(t)) return true;
    if (/^(yes|yeah|yep|sure|ok|okay|please|do it)[!.,\s]*$/.test(t.trim()) && leadFlow) return true;
    return false;
  }

  function justWantsNumber(text) {
    const t = normalize(text);
    // Pure number ask — give digits, don't force full interview
    if (wantsHandoff(text) && !/\b(number|phone|cell|call me|text me|contact)\b/.test(t)) {
      return false;
    }
    if (isContactIntent(text) && !wantsHandoff(text)) return true;
    if (/\b(what('?s| is) (your |jerry'?s? )?(number|phone)|phone number|your number)\b/.test(t)) {
      return true;
    }
    return isContactIntent(text) && !/\b(quote|book|schedule|mow|connect me to jerry for)\b/.test(t);
  }

  function hasPhone(text) {
    return String(text || '').replace(/\D/g, '').includes(JERRY_DIGITS);
  }

  function enforcePhone(userText, reply) {
    let out = String(reply || '').trim();
    out = out.replace(/\s*would you like me to connect you to jerry[^.?!]*[.?!]?\s*/gi, ' ');
    out = out.replace(
      /\s*(i'?ll|i will|let me|sure[,.]?\s*i'?ll)\s+(get you\s+)?connected[^.?!]*[.?!]?\s*/gi,
      ' '
    );
    out = out.replace(/\s*connect(ing)? you (with|to) jerry[^.?!]*[.?!]?\s*/gi, ' ');
    out = out.replace(/\s{2,}/g, ' ').trim();

    if (justWantsNumber(userText)) {
      return `${PHONE_LINE} That's Jerry — fastest way to get a quote or book.`;
    }
    if (!hasPhone(out) && /connect you to jerry|get you connected|would you like me to connect/i.test(String(reply || ''))) {
      return out ? `${out}\n\n${PHONE_LINE}` : PHONE_LINE;
    }
    return out || reply || PHONE_LINE;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function bubble(role, text, extraClass) {
    const row = document.createElement('div');
    row.className = 'msg msg-' + role + (extraClass ? ' ' + extraClass : '');
    row.innerHTML = `<div class="msg-bubble">${escapeHtml(text)}</div>`;
    return row;
  }

  function scrollBottom() {
    const box = document.getElementById('chat-messages');
    if (box) box.scrollTop = box.scrollHeight;
  }

  function addBot(text) {
    const messages = document.getElementById('chat-messages');
    if (!messages) return;
    messages.appendChild(bubble('bot', text));
    history.push({ role: 'assistant', content: text });
    scrollBottom();
  }

  function startLeadFlow(reason) {
    leadFlow = { step: 'name', data: { reason: reason || '' } };
    return (
      `I can’t call Jerry from this chat, but I *can* take your info and email him a follow-up right now 😁\n\n` +
      `What’s your **name**?\n\n` +
      `(Or type **cancel** anytime. You can always text him direct: ${JERRY_PHONE})`
    );
  }

  async function submitLead(data) {
    const res = await fetch(leadUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        phone: data.phone,
        address: data.address,
        need: data.need,
        urgency: data.urgency || '',
        source: 'assistant-chat'
      })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || json.detail || 'Lead failed');
    }
    return json;
  }

  async function handleLeadStep(clean) {
    const t = normalize(clean);
    if (t === 'cancel' || t === 'stop' || t === 'nevermind' || t === 'never mind') {
      leadFlow = null;
      return `No problem 🙃 Anytime you want, text Jerry at ${JERRY_PHONE} or use the quote form on the homepage.`;
    }

    if (!leadFlow) return null;

    if (leadFlow.step === 'name') {
      if (clean.length < 2) return 'What name should Jerry see on the lead?';
      leadFlow.data.name = clean;
      leadFlow.step = 'phone';
      return `Thanks, ${clean.split(/\s+/)[0]} 👍 What’s the best **phone number** to reach you?`;
    }

    if (leadFlow.step === 'phone') {
      const digits = clean.replace(/\D/g, '');
      if (digits.length < 10) {
        return 'Need a real phone number (at least 10 digits) so Jerry can text you back 😅';
      }
      leadFlow.data.phone = clean;
      leadFlow.step = 'address';
      return (
        'Got it 📍 Property **address** helps (street + city), but it’s **optional** — ' +
        'type **skip** if you’d rather not share it. You’ll still get emailed to Jerry.'
      );
    }

    if (leadFlow.step === 'address') {
      const skip =
        !clean ||
        /^(skip|none|n\/?a|no|prefer not|rather not|no address|pass)$/i.test(t);
      leadFlow.data.address = skip ? '' : clean;
      leadFlow.step = 'need';
      return 'What do you need done, and how soon? (weekly mow, cleanup, this week, etc.) 🌱';
    }

    if (leadFlow.step === 'need') {
      leadFlow.data.need = clean;
      leadFlow.step = 'sending';
      const payload = { ...leadFlow.data };
      try {
        const result = await submitLead(payload);
        leadFlow = null;
        const addrLine = payload.address
          ? `• Address: ${payload.address}\n`
          : '• Address: (not provided)\n';
        return (
          `You’re on Jerry’s list ✅ I emailed him your details.\n\n` +
          `• Name: ${payload.name}\n` +
          `• Phone: ${payload.phone}\n` +
          addrLine +
          `\nHe’ll follow up. For the absolute fastest reply, text him yourself: **${result.jerryPhone || JERRY_PHONE}** 💬📞`
        );
      } catch (e) {
        leadFlow = null;
        return (
          `Couldn’t push the lead through automatically 😬 ` +
          `Please text Jerry directly at **${JERRY_PHONE}** with your name (and address if you want) — he’ll take care of you.`
        );
      }
    }

    return null;
  }

  async function postChat(payload) {
    let lastErr;
    for (const url of endpoints()) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const type = res.headers.get('content-type') || '';
        if (!res.ok && res.status === 404) {
          lastErr = new Error('404 ' + url);
          continue;
        }
        if (!type.includes('application/json')) {
          lastErr = new Error('non-json ' + url);
          continue;
        }
        const data = await res.json();
        if (data && (data.choices || data.error)) return data;
        lastErr = new Error('bad payload');
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('chat unavailable');
  }

  async function send(text) {
    const input = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');
    const sendBtn = document.getElementById('chat-send');
    if (!messages || !text.trim()) return;

    const clean = text.trim();
    messages.appendChild(bubble('user', clean));
    history.push({ role: 'user', content: clean });
    if (input) input.value = '';
    scrollBottom();

    // Mid handoff interview
    if (leadFlow) {
      if (sendBtn) sendBtn.disabled = true;
      try {
        const reply = await handleLeadStep(clean);
        if (reply) addBot(reply);
      } finally {
        if (sendBtn) sendBtn.disabled = false;
        input?.focus();
      }
      return;
    }

    // Start handoff (quote / connect) — ask questions instead of fake transfer
    if (wantsHandoff(clean)) {
      addBot(startLeadFlow(clean));
      return;
    }

    // Pure "what's your number"
    if (justWantsNumber(clean) || isContactIntent(clean)) {
      addBot(
        `${PHONE_LINE}\n\nWant me to email Jerry your name & phone for a quote? Say **quote** and I’ll ask a few quick questions (address is optional) 😁`
      );
      return;
    }

    const thinking = bubble('bot', 'Thinking…', 'msg-thinking');
    messages.appendChild(thinking);
    scrollBottom();
    if (sendBtn) sendBtn.disabled = true;

    try {
      const data = await postChat({
        message: clean,
        history: history.slice(0, -1)
      });
      let reply =
        data.choices?.[0]?.message?.content ||
        `Sorry, I'm having trouble right now. Text Jerry at ${JERRY_PHONE}!`;
      reply = enforcePhone(clean, reply);
      thinking.remove();
      messages.appendChild(bubble('bot', reply));
      history.push({ role: 'assistant', content: reply });

      // If model invited a quote without number path, soft offer handoff next
    } catch {
      thinking.remove();
      messages.appendChild(
        bubble(
          'bot',
          `Couldn’t reach the assistant 😅 Text Jerry at ${JERRY_PHONE} — or say **quote** and I’ll take your info for him.`
        )
      );
    } finally {
      if (sendBtn) sendBtn.disabled = false;
      scrollBottom();
      input?.focus();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      send(input?.value || '');
    });

    document.getElementById('suggestions')?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-q]');
      if (!btn) return;
      send(btn.dataset.q);
    });

    document.getElementById('start-quote-flow')?.addEventListener('click', () => {
      send('I want a quote');
    });

    setTimeout(() => input?.blur(), 0);
  });
})();
