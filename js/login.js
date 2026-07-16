document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const rolePref = params.get('role') || 'customer';

  const tabCustomer = document.getElementById('tab-customer');
  const tabAdmin = document.getElementById('tab-admin');
  const panelCustomer = document.getElementById('panel-customer');
  const panelAdmin = document.getElementById('panel-admin');
  const msg = document.getElementById('auth-msg');

  function showMsg(text, ok) {
    msg.textContent = text;
    msg.className = 'auth-msg ' + (ok ? 'ok' : 'error');
  }

  function clearMsg() {
    msg.textContent = '';
    msg.className = 'auth-msg';
  }

  function setTab(which) {
    clearMsg();
    const isAdmin = which === 'admin';
    tabCustomer.classList.toggle('active', !isAdmin);
    tabAdmin.classList.toggle('active', isAdmin);
    panelCustomer.hidden = isAdmin;
    panelAdmin.hidden = !isAdmin;
  }

  tabCustomer.addEventListener('click', () => setTab('customer'));
  tabAdmin.addEventListener('click', () => setTab('admin'));
  setTab(rolePref === 'admin' ? 'admin' : 'customer');

  // Already logged in?
  const session = BRAuth.getSession();
  if (session?.role === 'admin') {
    window.location.href = 'admin.html';
    return;
  }
  if (session?.role === 'customer') {
    window.location.href = 'customer.html';
    return;
  }

  document.getElementById('form-customer-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await BRAuth.loginCustomer(fd.get('email'), fd.get('password'));
    if (!res.ok) return showMsg(res.error, false);
    window.location.href = 'customer.html';
  });

  document.getElementById('form-customer-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await BRAuth.registerCustomer({
      name: fd.get('name'),
      email: fd.get('email'),
      password: fd.get('password')
    });
    if (!res.ok) return showMsg(res.error, false);
    window.location.href = 'customer.html';
  });

  document.getElementById('form-admin-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await BRAuth.loginAdmin(fd.get('username'), fd.get('password'));
    if (!res.ok) return showMsg(res.error, false);
    window.location.href = 'admin.html';
  });

  // Toggle register vs login customer
  const loginBlock = document.getElementById('customer-login-block');
  const registerBlock = document.getElementById('customer-register-block');
  document.getElementById('show-register')?.addEventListener('click', (e) => {
    e.preventDefault();
    loginBlock.hidden = true;
    registerBlock.hidden = false;
    clearMsg();
  });
  document.getElementById('show-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    loginBlock.hidden = false;
    registerBlock.hidden = true;
    clearMsg();
  });
});
