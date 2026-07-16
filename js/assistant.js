/**
 * Full-page Black Rabbit AI chat (mobile-first)
 */
(function () {
  const PROXY_URL = 'https://br-chat-proxy.vercel.app/api/chat';
  const history = [];

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

    const thinking = bubble('bot', 'Thinking…', 'msg-thinking');
    messages.appendChild(thinking);
    scrollBottom();
    if (sendBtn) sendBtn.disabled = true;

    try {
      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: clean,
          history: history.slice(0, -1)
        })
      });
      const data = await res.json();
      const reply =
        data.choices?.[0]?.message?.content ||
        "Sorry, I'm having trouble right now. Text Jerry at (407) 951-1663!";
      thinking.remove();
      messages.appendChild(bubble('bot', reply));
      history.push({ role: 'assistant', content: reply });
    } catch {
      thinking.remove();
      messages.appendChild(
        bubble('bot', 'Couldn’t reach the assistant. Text Jerry at (407) 951-1663 — he’s fastest.')
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

    // Avoid iOS zoom weirdness focus jump when possible
    setTimeout(() => input?.blur(), 0);
  });
})();
