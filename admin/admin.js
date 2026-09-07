const formMessage = document.querySelector('.form-message');
let csrfToken = null;
const devPorts = new Set(['3000', '4173', '5500']);
const apiOrigin = devPorts.has(window.location.port) ? 'http://localhost:3001' : '';
const showMessage = (message, isError = false) => { if (!formMessage) return; formMessage.textContent = message; formMessage.classList.toggle('error', isError); };

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (csrfToken && options.method && options.method !== 'GET') headers['X-CSRF-Token'] = csrfToken;
  const response = await fetch(`${apiOrigin}${path}`, { credentials: 'include', headers, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

const authForm = document.querySelector('[data-auth-form]');
if (authForm) {
  const mode = authForm.dataset.authForm;
  if (mode === 'setup') {
    request('/api/auth/status').then((data) => { if (!data.setupRequired) window.location.href = '/admin/login.html'; }).catch(() => showMessage('Start the backend before setting up admin.', true));
  }
  authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(authForm));
    try { await request(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify(body) }); window.location.href = mode === 'setup' ? '/admin/login.html' : '/admin/'; }
    catch (error) { showMessage(error.message, true); }
  });
}

const resetForm = document.querySelector('[data-reset-form]');
document.querySelector('[data-forgot-password]')?.addEventListener('click', () => {
  resetForm?.classList.toggle('hidden');
  resetForm?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});
resetForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(resetForm));
  try {
    await request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(body) });
    resetForm.reset();
    resetForm.classList.add('hidden');
    showMessage('Password reset. You can now log in with the new password.');
  } catch (error) { showMessage(error.message, true); }
});

const fixtureForm = document.querySelector('[data-fixture-form]');
const fixtureList = document.querySelector('[data-fixture-list]');

request('/api/auth/me').then((data) => { csrfToken = data.csrfToken; }).catch(() => {});

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
  request('/api/auth/me').then((data) => { if (!data.user) window.location.href = '/admin/login.html'; csrfToken = data.csrfToken; }).catch(() => { window.location.href = '/admin/login.html'; });
  fixtureForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(fixtureForm));
    const body = { ...formData, baobab_score: formData.baobab_score === '' ? null : Number(formData.baobab_score), opponent_score: formData.opponent_score === '' ? null : Number(formData.opponent_score) };
    try { await request('/api/fixtures', { method: 'POST', body: JSON.stringify(body) }); fixtureForm.reset(); showMessage('Saved. The Team page will show it after refresh.'); await loadFixtures(); }
    catch (error) { showMessage(error.message, true); }
  });
}

loadFixtures();

document.querySelector('[data-logout]')?.addEventListener('click', async () => { await request('/api/auth/logout', { method: 'POST' }); window.location.href = '/admin/login.html'; });

document.querySelector('[data-password-form]')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = new FormData(event.currentTarget).get('password');
  try { await request('/api/auth/password', { method: 'POST', body: JSON.stringify({ password }) }); event.currentTarget.reset(); showMessage('Password updated.'); }
  catch (error) { showMessage(error.message, true); }
});

document.querySelector('[data-backup]')?.addEventListener('click', async () => {
  try { await request('/api/admin/backup', { method: 'POST', body: '{}' }); showMessage('Database backup created.'); }
  catch (error) { showMessage(error.message, true); }
});

document.querySelector('[data-media-form]')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const response = await fetch(`${apiOrigin}/api/media`, { method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': csrfToken }, body: new FormData(event.currentTarget) });
  const data = await response.json();
  if (!response.ok) return showMessage(data.error || 'Upload failed.', true);
  event.currentTarget.reset(); showMessage('Image uploaded to the media library.');
});
