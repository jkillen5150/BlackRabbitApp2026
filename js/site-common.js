/**
 * Shared nav, FABs, chat, urgency form helpers
 */
(function () {
  function navHtml(active) {
    const links = [
      { href: 'index.html', id: 'home', label: 'Home' },
      { href: 'testimonials.html', id: 'testimonials', label: 'Testimonials' },
      { href: 'portfolio.html', id: 'portfolio', label: 'Portfolio' },
      { href: 'service-area.html', id: 'map', label: 'Service Map' },
      { href: 'index.html#service-form', id: 'quote', label: 'Get a Quote' },
      { href: 'login.html', id: 'login', label: 'Login' }
    ];
    return `
      <nav class="site-nav" id="site-nav" aria-label="Main">
        <div class="site-nav-inner">
          <a class="site-nav-brand" href="index.html">
            <img src="Black Rabbit Logo Nu.jpg" alt="" width="40" height="40">
            <span>Black Rabbit</span>
          </a>
          <button type="button" class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="nav-links">Menu</button>
          <div class="site-nav-links" id="nav-links">
            ${links
              .map(
                (l) =>
                  `<a href="${l.href}" class="${l.id === active ? 'active' : ''}">${l.label}</a>`
              )
              .join('')}
          </div>
        </div>
      </nav>
    `;
  }

  function injectNav(active) {
    const mount = document.getElementById('site-nav-mount');
    if (!mount) return;
    mount.innerHTML = navHtml(active);
    const nav = document.getElementById('site-nav');
    const btn = document.getElementById('nav-toggle');
    if (btn && nav) {
      btn.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
  }

  function wireUrgencyButtons() {
    const field = document.getElementById('urgency-field');
    document.querySelectorAll('.urgency-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.urgency-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        if (field) field.value = btn.dataset.value || '';
      });
    });
  }

  const PROXY_URL = 'https://br-chat-proxy.vercel.app/api/chat';

  window.toggleChat = function toggleChat() {
    const win = document.getElementById('chat-window');
    if (!win) return;
    win.style.display = win.style.display === 'none' || !win.style.display ? 'block' : 'none';
  };

  window.sendMessage = async function sendMessage() {
    const input = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');
    if (!input || !messages) return;
    const text = input.value.trim();
    if (!text) return;

    messages.innerHTML += `<div style="margin:8px 0; text-align:right;"><strong>You:</strong> ${escape(text)}</div>`;
    input.value = '';

    try {
      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      const reply =
        data.choices?.[0]?.message?.content ||
        "Sorry, I'm having trouble right now. Text Jerry at (407) 951-1663!";
      messages.innerHTML += `<div style="margin:8px 0;"><strong>Black Rabbit AI:</strong> ${escape(reply)}</div>`;
    } catch {
      messages.innerHTML += `<div style="margin:8px 0; color:red;">Error connecting to AI. Try texting Jerry.</div>`;
    }
    messages.scrollTop = messages.scrollHeight;
  };

  function escape(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const active = document.body.dataset.page || '';
    injectNav(active);
    wireUrgencyButtons();

    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') window.sendMessage();
      });
    }
  });
})();
