const formMessage = document.querySelector('.form-message');
let csrfToken = null;
const isLocalPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname) && window.location.port !== '3001';
const apiOrigin = isLocalPreview ? 'http://localhost:3001' : '';
const showMessage = (message, isError = false) => { if (!formMessage) return; formMessage.textContent = message; formMessage.classList.toggle('error', isError); };

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (csrfToken && options.method && options.method !== 'GET') headers['X-CSRF-Token'] = csrfToken;
  const response = await fetch(`${apiOrigin}${path}`, { credentials: 'include', headers, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

async function ensureAdmin() {
  try {
    const data = await request('/api/auth/me');
    csrfToken = data.csrfToken;
    if (!data.user) {
      window.location.href = '/admin/login.html';
      return null;
    }
    return data.user;
  } catch (error) {
    window.location.href = '/admin/login.html';
    return null;
  }
}

const authForm = document.querySelector('[data-auth-form]');
if (authForm) {
  const mode = authForm.dataset.authForm;
  if (mode === 'setup') {
    request('/api/auth/status').then((data) => {
      if (!data.setupRequired) { window.location.href = '/admin/login.html'; return; }
      if (data.setupKeyRequired && !authForm.querySelector('[name="setup_key"]')) {
        const keyLabel = document.createElement('label');
        keyLabel.innerHTML = 'One-time setup key<input name="setup_key" type="password" autocomplete="off" required placeholder="Provided by the site owner">';
        authForm.insertBefore(keyLabel, authForm.querySelector('button[type="submit"]'));
      }
    }).catch(() => showMessage('Start the backend before setting up admin.', true));
  }
  authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = authForm.querySelector('button[type="submit"]');
    if (submitButton) { submitButton.disabled = true; submitButton.classList.add('is-loading'); }
    const body = Object.fromEntries(new FormData(authForm));
    if (mode === 'login') body.remember_me = Boolean(authForm.elements.remember_me?.checked);
    try {
      await request(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify(body) });
      window.location.href = mode === 'setup' ? '/admin/login.html' : '/admin/';
    } catch (error) {
      showMessage(error.message || 'Unable to sign in. Please try again.', true);
      if (submitButton) { submitButton.disabled = false; submitButton.classList.remove('is-loading'); }
    }
  });
}

const resetForm = document.querySelector('[data-reset-form]');
const resetToken = new URLSearchParams(window.location.search).get('token');
document.querySelector('[data-forgot-password]')?.addEventListener('click', () => {
  resetForm?.classList.toggle('hidden');
  resetForm?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});
resetForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(resetForm));
  try {
    await request(resetToken ? '/api/auth/reset-password' : '/api/auth/request-reset', { method: 'POST', body: JSON.stringify(resetToken ? { token: resetToken, password: body.password } : body) });
    resetForm.reset();
    resetForm.classList.add('hidden');
    showMessage(resetToken ? 'Password reset. You can now log in.' : 'If that email is registered, a reset link has been sent.');
  } catch (error) { showMessage(error.message, true); }
});

const fixtureForm = document.querySelector('[data-fixture-form]');
const fixtureList = document.querySelector('[data-fixture-list]');
const mediaList = document.querySelector('[data-media-list]');
const messageList = document.querySelector('[data-message-list]');

async function loadFixtures() {
  if (!fixtureList) return;
  try {
    const fixtures = await request('/api/fixtures');
    fixtureList.innerHTML = fixtures.map((fixture) => `<article class="admin-fixture-row"><div><strong>${fixture.opponent}</strong><small>${fixture.match_date} · ${fixture.status}${fixture.status === 'played' ? ` · ${fixture.opponent_score}–${fixture.baobab_score}` : ''}</small></div><button class="delete-button" data-delete-fixture="${fixture.id}">Delete</button></article>`).join('');
    fixtureList.querySelectorAll('[data-delete-fixture]').forEach((button) => button.addEventListener('click', async () => {
      if (!window.confirm('Delete this fixture or result?')) return;
      try { await request(`/api/fixtures/${button.dataset.deleteFixture}`, { method: 'DELETE' }); await loadFixtures(); showMessage('Fixture deleted.'); }
      catch (error) { showMessage(error.message, true); }
    }));
  } catch (error) { showMessage(error.message, true); }
}

if (fixtureForm) {
  fixtureForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(fixtureForm));
    const body = { ...formData, baobab_score: formData.baobab_score === '' ? null : Number(formData.baobab_score), opponent_score: formData.opponent_score === '' ? null : Number(formData.opponent_score) };
    try { await ensureAdmin(); await request('/api/fixtures', { method: 'POST', body: JSON.stringify(body) }); fixtureForm.reset(); showMessage('Saved. The Team page will show it after refresh.'); await loadFixtures(); }
    catch (error) { showMessage(error.message, true); }
  });
}

async function loadMedia() {
  if (!mediaList) return;
  try {
    const media = await request('/api/media');
    mediaList.innerHTML = media.length ? media.map((item) => `<article class="admin-media-row"><img src="${item.image_url}" alt="${item.alt_text}"><div><strong>${item.title}</strong><small>${item.category}</small></div><button class="delete-button" data-delete-media="${item.id}">Delete</button></article>`).join('') : '<p class="form-message">No uploaded pictures yet.</p>';
    mediaList.querySelectorAll('[data-delete-media]').forEach((button) => button.addEventListener('click', async () => {
      if (!window.confirm('Delete this uploaded picture?')) return;
      try { await request(`/api/media/${button.dataset.deleteMedia}`, { method: 'DELETE' }); await loadMedia(); showMessage('Picture deleted.'); }
      catch (error) { showMessage(error.message, true); }
    }));
  } catch (error) { showMessage(error.message, true); }
}

async function loadMessages() {
  if (!messageList) return;
  try {
    const messages = await request('/api/messages');
    messageList.innerHTML = messages.length ? messages.map((item) => `
      <article class="admin-message-card">
        <div class="admin-message-header">
          <span class="message-badge ${item.source === 'shop' ? 'shop' : item.source === 'contact' ? 'contact' : 'general'}">${item.source === 'shop' ? 'Shop signup' : item.source === 'contact' ? 'Contact enquiry' : 'Site form'}</span>
          <button class="delete-button" data-delete-message="${item.id}">Delete</button>
        </div>
        <div class="admin-message-meta">
          <strong>${item.name || 'Anonymous'}</strong>
          <span>${item.email}</span>
        </div>
        <div class="admin-message-subject">${item.subject || 'General enquiry'}</div>
        <p>${item.message}</p>
        <small>${new Date(item.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</small>
      </article>
    `).join('') : '<p class="form-message">No site messages yet.</p>';
    messageList.querySelectorAll('[data-delete-message]').forEach((button) => button.addEventListener('click', async () => {
      if (!window.confirm('Delete this message?')) return;
      try { await request(`/api/messages/${button.dataset.deleteMessage}`, { method: 'DELETE' }); await loadMessages(); showMessage('Message deleted.'); }
      catch (error) { showMessage(error.message, true); }
    }));
  } catch (error) { messageList.innerHTML = '<p class="form-message error">Unable to load messages.</p>'; }
}

async function initDashboard() {
  const user = await ensureAdmin();
  if (!user) return;
  await Promise.all([loadFixtures(), loadMedia(), loadMessages()]);
}

if (document.querySelector('[data-fixture-form]') || document.querySelector('[data-media-list]') || document.querySelector('[data-message-list]')) {
  initDashboard();
}

document.querySelector('[data-logout]')?.addEventListener('click', async () => { await request('/api/auth/logout', { method: 'POST' }); window.location.href = '/admin/login.html'; });

document.querySelector('[data-password-form]')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = new FormData(event.currentTarget).get('password');
  try { await ensureAdmin(); await request('/api/auth/password', { method: 'POST', body: JSON.stringify({ password }) }); window.location.href = '/admin/login.html?password=updated'; }
  catch (error) { showMessage(error.message, true); }
});

document.querySelector('[data-backup]')?.addEventListener('click', async () => {
  try { await ensureAdmin(); await request('/api/admin/backup', { method: 'POST', body: '{}' }); showMessage('Database backup created.'); }
  catch (error) { showMessage(error.message, true); }
});

document.querySelector('[data-media-form]')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  await ensureAdmin();
  const response = await fetch(`${apiOrigin}/api/media`, { method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': csrfToken }, body: new FormData(event.currentTarget) });
  const data = await response.json();
  if (!response.ok) return showMessage(data.error || 'Upload failed.', true);
  event.currentTarget.reset(); await loadMedia(); showMessage('Image uploaded to the media library.');
});

document.querySelectorAll('input[type="password"]').forEach((input) => {
  const wrapper = document.createElement('span');
  wrapper.className = 'password-field';
  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'password-toggle';
  toggle.setAttribute('aria-label', 'Show password');
  toggle.textContent = 'Show';
  toggle.addEventListener('click', () => {
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    toggle.textContent = visible ? 'Show' : 'Hide';
    toggle.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
  });
  wrapper.appendChild(toggle);
});
