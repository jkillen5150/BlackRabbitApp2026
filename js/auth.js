/**
 * Auth for admin + customers.
 * Admin password is stored only as SHA-256 hash (never plaintext in source).
 */
(function (global) {
  const SESSION_KEY = 'br_session_v1';
  const CUSTOMERS_KEY = 'br_customers_v1';

  // Client-side gate only — not a substitute for server auth.
  const ADMIN = {
    username: 'jkillen5150',
    passwordHash: '5e259625878ec56c9622080a33a6b80506a7bb40b12780ea9af975c02d69c193'
  };

  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function setSession(session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function isAdmin() {
    const s = getSession();
    return !!(s && s.role === 'admin');
  }

  function isCustomer() {
    const s = getSession();
    return !!(s && s.role === 'customer');
  }

  function requireAdmin(redirectTo) {
    if (!isAdmin()) {
      window.location.href = redirectTo || 'login.html?role=admin';
      return false;
    }
    return true;
  }

  function getCustomers() {
    try {
      return JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveCustomers(list) {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(list));
  }

  async function loginAdmin(username, password) {
    const u = (username || '').trim().toLowerCase();
    const hash = await sha256(password || '');
    if (u === ADMIN.username.toLowerCase() && hash === ADMIN.passwordHash) {
      setSession({
        role: 'admin',
        username: ADMIN.username,
        name: 'Jerry (Admin)',
        at: Date.now()
      });
      return { ok: true };
    }
    return { ok: false, error: 'Invalid admin username or password.' };
  }

  async function registerCustomer({ name, email, password }) {
    const e = (email || '').trim().toLowerCase();
    const n = (name || '').trim();
    if (!n || !e || !password || password.length < 6) {
      return { ok: false, error: 'Name, email, and password (6+ chars) are required.' };
    }
    const list = getCustomers();
    if (list.some((c) => c.email === e)) {
      return { ok: false, error: 'An account with that email already exists.' };
    }
    const passwordHash = await sha256(password);
    list.push({
      id: 'cust-' + Date.now().toString(36),
      name: n,
      email: e,
      passwordHash,
      createdAt: new Date().toISOString()
    });
    saveCustomers(list);
    setSession({ role: 'customer', email: e, name: n, at: Date.now() });
    return { ok: true };
  }

  async function loginCustomer(email, password) {
    const e = (email || '').trim().toLowerCase();
    const hash = await sha256(password || '');
    const user = getCustomers().find((c) => c.email === e && c.passwordHash === hash);
    if (!user) {
      return { ok: false, error: 'Invalid email or password.' };
    }
    setSession({
      role: 'customer',
      email: user.email,
      name: user.name,
      at: Date.now()
    });
    return { ok: true };
  }

  function logout() {
    clearSession();
  }

  global.BRAuth = {
    getSession,
    isAdmin,
    isCustomer,
    requireAdmin,
    loginAdmin,
    loginCustomer,
    registerCustomer,
    logout,
    sha256
  };
})(window);
