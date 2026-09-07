import { createServer } from 'node:http';
import { createServer as createSecureServer } from 'node:https';
import { extname, join, normalize } from 'node:path';
import { appendFile, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'node:url';
import { backupDatabase, deleteFixture, getDatabase, getTeamData, recordFixture } from './db.js';
import { consumePasswordReset, createPasswordReset, createSession, createUser, deleteSession, findUser, getSessionUser, updatePassword, userCount, verifyCsrf, verifyPassword } from './auth.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 3001);
const mimeTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.json': 'application/json' };
const database = getDatabase();
const production = process.env.NODE_ENV === 'production';
const loginAttempts = new Map();
const storageRoot = process.env.DATA_DIR || root;
const uploadDirectory = join(storageRoot, 'uploads');
const backupDirectory = join(storageRoot, 'backups');
const logDirectory = join(storageRoot, 'logs');
const publicUrl = process.env.PUBLIC_URL || `http://localhost:${port}`;
const mailTransport = process.env.SMTP_HOST ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }) : null;

const allowedOrigins = new Set(['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4173', 'http://localhost:5500']);

function sendJson(response, status, data) {
  const origin = response.req?.headers.origin;
  const allowedOrigin = allowedOrigins.has(origin) ? origin : null;
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin' } : {}), 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token' });
  response.end(JSON.stringify(data));
}

function sendRedirect(response, location) {
  response.writeHead(302, { Location: location });
  response.end();
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map((part) => {
    const [key, ...value] = part.trim().split('=');
    return [key, decodeURIComponent(value.join('='))];
  }));
}

function currentUser(request) {
  return getSessionUser(parseCookies(request).baobab_session);
}

function cookieOptions() {
  return `HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 86400}${production ? '; Secure' : ''}`;
}

function requestKey(request, email = '') {
  return `${request.socket.remoteAddress || 'unknown'}:${String(email).trim().toLowerCase()}`;
}

function loginBlocked(request, email) {
  const attempt = loginAttempts.get(requestKey(request, email));
  return attempt && attempt.until > Date.now();
}

function recordLoginFailure(request, email) {
  const key = requestKey(request, email);
  const attempt = loginAttempts.get(key) || { count: 0, until: 0 };
  attempt.count += 1;
  if (attempt.count >= 5) { attempt.until = Date.now() + 15 * 60 * 1000; attempt.count = 0; }
  loginAttempts.set(key, attempt);
}

function clearLoginFailures(request, email) { loginAttempts.delete(requestKey(request, email)); }

function requireAdmin(request, response) {
  const user = currentUser(request);
  if (!user) {
    sendJson(response, 401, { error: 'Authentication required' });
    return null;
  }
  return user;
}

function requireCsrf(request, response) {
  const user = requireAdmin(request, response);
  if (!user) return null;
  if (!verifyCsrf(parseCookies(request).baobab_session, request.headers['x-csrf-token'])) {
    sendJson(response, 403, { error: 'Invalid CSRF token' });
    return null;
  }
  return user;
}

async function logError(error, request) {
  await mkdir(logDirectory, { recursive: true });
  await appendFile(join(logDirectory, 'server.log'), `${new Date().toISOString()} ${request.method} ${request.url} ${error.stack || error}\n`);
}

async function readMultipart(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) { total += chunk.length; if (total > 10 * 1024 * 1024) throw new Error('Upload exceeds 10 MB'); chunks.push(chunk); }
  const body = Buffer.concat(chunks);
  const boundary = request.headers['content-type']?.match(/boundary=(.+)$/)?.[1];
  if (!boundary) throw new Error('Multipart boundary missing');
  const fields = {};
  const parts = body.toString('binary').split(`--${boundary}`).slice(1, -1);
  for (const part of parts) {
    const separator = part.indexOf('\r\n\r\n');
    if (separator < 0) continue;
    const headers = part.slice(0, separator);
    const content = part.slice(separator + 4, part.endsWith('\r\n') ? -2 : undefined);
    const name = headers.match(/name="([^"]+)"/)?.[1];
    const filename = headers.match(/filename="([^"]*)"/)?.[1];
    if (!name) continue;
    fields[name] = filename ? { filename, content: Buffer.from(content, 'binary'), type: headers.match(/Content-Type:\s*([^\r\n]+)/i)?.[1] || 'application/octet-stream' } : content;
  }
  return fields;
}

async function readBody(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}

async function serveStatic(request, response) {
  const requestPath = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  if (requestPath.startsWith('/uploads/')) {
    const uploadPath = normalize(join(uploadDirectory, requestPath.slice('/uploads/'.length)));
    if (!uploadPath.startsWith(normalize(uploadDirectory))) return sendJson(response, 403, { error: 'Forbidden' });
    try {
      const content = await readFile(uploadPath);
      response.writeHead(200, { 'Content-Type': mimeTypes[extname(uploadPath)] || 'application/octet-stream' });
      return response.end(content);
    } catch { return sendJson(response, 404, { error: 'Not found' }); }
  }
  const filePath = normalize(join(root, requestPath));
  if (!filePath.startsWith(root)) return sendJson(response, 403, { error: 'Forbidden' });
  if (/[/\\](data|backups|logs)[/\\]/i.test(filePath)) return sendJson(response, 403, { error: 'Forbidden' });
  try {
    const content = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': `${mimeTypes[extname(filePath)] || 'application/octet-stream'}; charset=utf-8` });
    response.end(content);
  } catch {
    sendJson(response, 404, { error: 'Not found' });
  }
}

const requestHandler = async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (request.method === 'OPTIONS') {
      const origin = request.headers.origin;
      response.writeHead(204, { ...(allowedOrigins.has(origin) ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin' } : {}), 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token' });
      return response.end();
    }
    if (url.pathname === '/api/health') return sendJson(response, 200, { ok: true, database: 'sqlite' });
    if (url.pathname === '/api/auth/status' && request.method === 'GET') { const user = currentUser(request); if (user) delete user.csrf_token; return sendJson(response, 200, { setupRequired: userCount() === 0, user }); }
    if (url.pathname === '/api/auth/setup' && request.method === 'POST') {
      if (userCount() > 0) return sendJson(response, 409, { error: 'Admin setup is already complete' });
      const body = await readBody(request);
      if (!body.email || !body.password || body.password.length < 10) return sendJson(response, 400, { error: 'Use an email and a password of at least 10 characters' });
      createUser(body.email, body.password);
      return sendJson(response, 201, { ok: true });
    }
    if (url.pathname === '/api/auth/request-reset' && request.method === 'POST') {
      const body = await readBody(request);
      const user = findUser(body.email || '');
      if (user && mailTransport) {
        const reset = createPasswordReset(user.id);
        await mailTransport.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: user.email, subject: 'Baobab United FC password reset', text: `Reset your admin password within 30 minutes: ${publicUrl}/admin/reset.html?token=${reset.token}` });
      }
      return sendJson(response, 200, { ok: true });
    }
    if (url.pathname === '/api/auth/reset-password' && request.method === 'POST') {
      const body = await readBody(request);
      if (!body.token || !body.password || body.password.length < 10) return sendJson(response, 400, { error: 'A valid reset token and password of at least 10 characters are required' });
      if (!consumePasswordReset(body.token, body.password)) return sendJson(response, 400, { error: 'This reset link is invalid or expired' });
      return sendJson(response, 200, { ok: true });
    }
    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      const body = await readBody(request);
      if (loginBlocked(request, body.email || '')) return sendJson(response, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
      const user = findUser(body.email || '');
      if (!user || !verifyPassword(body.password || '', user.password_hash)) { recordLoginFailure(request, body.email || ''); return sendJson(response, 401, { error: 'Invalid email or password' }); }
      clearLoginFailures(request, body.email || '');
      const session = createSession(user.id);
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Set-Cookie': `baobab_session=${session.token}; ${cookieOptions()}` });
      return response.end(JSON.stringify({ ok: true }));
    }
    if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
      deleteSession(parseCookies(request).baobab_session);
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Set-Cookie': `baobab_session=; ${cookieOptions().replace('Max-Age=604800', 'Max-Age=0')}` });
      return response.end(JSON.stringify({ ok: true }));
    }
    if (url.pathname === '/api/auth/me' && request.method === 'GET') { const user = currentUser(request); const csrfToken = user?.csrf_token || null; if (user) delete user.csrf_token; return sendJson(response, 200, { user, csrfToken }); }
    if (url.pathname === '/api/auth/password' && request.method === 'POST') {
      const user = requireCsrf(request, response); if (!user) return;
      const body = await readBody(request);
      if (!body.password || body.password.length < 10) return sendJson(response, 400, { error: 'Use a password of at least 10 characters' });
      updatePassword(user.id, body.password); return sendJson(response, 200, { ok: true });
    }
    if (url.pathname === '/api/team' && request.method === 'GET') return sendJson(response, 200, getTeamData());
    if (url.pathname === '/api/fixtures' && request.method === 'GET') return sendJson(response, 200, getTeamData().fixtures);
    if (url.pathname === '/api/standings' && request.method === 'GET') return sendJson(response, 200, getTeamData().standings);
    if (url.pathname === '/api/fixtures' && request.method === 'POST') {
      if (!requireCsrf(request, response)) return;
      const fixture = await readBody(request);
      const id = recordFixture(fixture);
      return sendJson(response, 201, { id });
    }
    const deleteMatch = url.pathname.match(/^\/api\/fixtures\/(\d+)$/);
    if (deleteMatch && request.method === 'DELETE') {
      if (!requireCsrf(request, response)) return;
      const deleted = deleteFixture(Number(deleteMatch[1]));
      return sendJson(response, deleted ? 200 : 404, deleted ? { ok: true } : { error: 'Fixture not found' });
    }
    if (url.pathname === '/api/admin/backup' && request.method === 'POST') {
      if (!requireCsrf(request, response)) return;
      await mkdir(backupDirectory, { recursive: true });
      const backupPath = join(backupDirectory, `baobab-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
      await backupDatabase(backupPath); return sendJson(response, 201, { ok: true, file: backupPath });
    }
    if (url.pathname === '/api/media' && request.method === 'GET') return sendJson(response, 200, database.prepare('SELECT * FROM media ORDER BY id DESC').all());
    if (url.pathname === '/api/media' && request.method === 'POST') {
      if (!requireCsrf(request, response)) return;
      const fields = await readMultipart(request); const file = fields.file;
      if (!file?.filename || !file.type.startsWith('image/')) return sendJson(response, 400, { error: 'Please upload an image file' });
      await mkdir(uploadDirectory, { recursive: true });
      const extension = extname(file.filename).toLowerCase().replace(/[^.a-z0-9]/g, ''); const filename = `${Date.now()}-${randomBytes(6).toString('hex')}${extension}`;
      await writeFile(join(uploadDirectory, filename), file.content);
      const title = fields.title || file.filename; const category = fields.category || 'Club';
      const result = database.prepare('INSERT INTO media (title, category, image_url, alt_text) VALUES (?, ?, ?, ?)').run(title, category, `/uploads/${filename}`, title);
      return sendJson(response, 201, { id: Number(result.lastInsertRowid), image_url: `/uploads/${filename}` });
    }
    const mediaMatch = url.pathname.match(/^\/api\/media\/(\d+)$/);
    if (mediaMatch && request.method === 'DELETE') {
      if (!requireCsrf(request, response)) return;
      const media = database.prepare('SELECT image_url FROM media WHERE id = ?').get(Number(mediaMatch[1]));
      if (!media) return sendJson(response, 404, { error: 'Media not found' });
      await unlink(join(storageRoot, media.image_url.replace(/^\/uploads\//, 'uploads/'))).catch(() => {});
      database.prepare('DELETE FROM media WHERE id = ?').run(Number(mediaMatch[1]));
      return sendJson(response, 200, { ok: true });
    }
    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      if (userCount() === 0) return sendRedirect(response, '/admin/setup.html');
      return sendRedirect(response, currentUser(request) ? '/admin/index.html' : '/admin/login.html');
    }
    return serveStatic(request, response);
  } catch (error) {
    await logError(error, request);
    sendJson(response, error.message.includes('Upload exceeds') ? 413 : 500, { error: production ? 'Internal server error' : error.message });
  }
};

const server = production && process.env.TLS_KEY_PATH && process.env.TLS_CERT_PATH
  ? createSecureServer({ key: readFileSync(process.env.TLS_KEY_PATH), cert: readFileSync(process.env.TLS_CERT_PATH) }, requestHandler)
  : createServer(requestHandler);
if (production && (!process.env.TLS_KEY_PATH || !process.env.TLS_CERT_PATH)) console.warn('Production HTTPS certificate paths are not set; use an HTTPS reverse proxy or configure TLS_KEY_PATH and TLS_CERT_PATH.');
server.listen(port, () => console.log(`Baobab United FC running at ${production && process.env.TLS_KEY_PATH ? 'https' : 'http'}://localhost:${port}`));
