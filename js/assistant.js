/**
 * Full-page Black Rabbit AI chat (mobile-first)
 * Prefers same-origin /api/chat. Client-side phone enforcement so
 * "connect you to Jerry" loops never ship without 407-951-1663.
 */
(function () {
  const history = [];
  const JERRY_PHONE = '407-951-1663';
  const JERRY_DIGITS = '4079511663';
  const PHONE_LINE = `Jerry's number is ${JERRY_PHONE} — text or call anytime 💬📞`;

  function endpoints() {
    if (window.BR_CHAT_API) return [window.BR_CHAT_API];
    // Same project first; legacy proxy only as last resort
    return ['/api/chat', 'https://br-chat-proxy.vercel.app/api/chat'];
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
    if (/^(yes|yeah|yep|sure|ok|okay|please|do it)[!.,\s]*$/.test(t.trim())) return true;
    if (/^(yes|yeah|yep|sure|ok)\b.{0,40}\b(connect|jerry|call|text|number)\b/.test(t)) return true;
    return false;
  }

  function hasPhone(text) {
    return String(text || '').replace(/\D/g, '').includes(JERRY_DIGITS);
  }

  /** Fix dumb proxy / model loops on the client so the number always shows */
  function enforcePhone(userText, reply) {
    let out = String(reply || '').trim();

    out = out.replace(/\s*would you like me to connect you to jerry[^.?!]*[.?!]?\s*/gi, ' ');
    out = out.replace(
      /\s*(i'?ll|i will|let me|sure[,.]?\s*i'?ll)\s+(get you\s+)?connected[^.?!]*[.?!]?\s*/gi,
      ' '
    );
    out = out.replace(/\s*connect(ing)? you (with|to) jerry[^.?!]*[.?!]?\s*/gi, ' ');
    out = out.replace(/\s{2,}/g, ' ').trim();

    if (isContactIntent(userText)) {
      return `${PHONE_LINE} That's Jerry — fastest way to get a quote or book. This chat can't place the call 😁`;
    }

    if (!hasPhone(out) && /connect you to jerry|get you connected|would you like me to connect/i.test(String(reply || ''))) {
      return out ? `${out}\n\n${PHONE_LINE}` : PHONE_LINE;
    }

    if (!hasPhone(out) && /connect/i.test(out) && /jerry/i.test(out)) {
      return `${out}\n\n${PHONE_LINE}`;
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

    // Instant local answer — never wait on a dumb "I'll connect you" loop
    if (isContactIntent(clean)) {
      const reply = `${PHONE_LINE} That's Jerry — fastest way to get a quote or book. This chat can't place the call 😁`;
      messages.appendChild(bubble('bot', reply));
      history.push({ role: 'assistant', content: reply });
      scrollBottom();
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
    } catch {
      thinking.remove();
      messages.appendChild(
        bubble(
          'bot',
          `Couldn’t reach the assistant 😅 Text Jerry at ${JERRY_PHONE} — he’s fastest.`
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

    setTimeout(() => input?.blur(), 0);
  });
})();
