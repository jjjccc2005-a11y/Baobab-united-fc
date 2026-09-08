import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { getDatabase } from './db.js';

const database = getDatabase();
const SESSION_HOURS = 12;
const REMEMBER_DAYS = 30;

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedPassword) {
  const [salt, storedHash] = String(storedPassword).split(':');
  if (!salt || !storedHash) return false;
  const derivedHash = scryptSync(password, salt, 64);
  const expectedHash = Buffer.from(storedHash, 'hex');
  return expectedHash.length === derivedHash.length && timingSafeEqual(expectedHash, derivedHash);
}

export function createUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  return database.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)')
    .run(normalizedEmail, hashPassword(password), 'admin');
}

export function userCount() {
  return database.prepare('SELECT COUNT(*) AS count FROM users').get().count;
}

export function findUser(email) {
  return database.prepare('SELECT id, email, password_hash, role, created_at, last_login_at FROM users WHERE email = ?').get(email.trim().toLowerCase());
}

export function updatePassword(userId, password) {
  deleteUserSessions(userId);
  return database.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), userId);
}

export function recordLogin(userId) {
  return database.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(userId);
}

export function createPasswordReset(userId) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  database.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(userId);
  database.prepare('INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(tokenHash, userId, expiresAt);
  return { token, expiresAt };
}

export function consumePasswordReset(token, password) {
  const tokenHash = createHash('sha256').update(token || '').digest('hex');
  const reset = database.prepare("SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')").get(tokenHash);
  if (!reset) return false;
  updatePassword(reset.user_id, password);
  database.prepare("UPDATE password_reset_tokens SET used_at = datetime('now') WHERE token_hash = ?").run(tokenHash);
  return true;
}

export function createSession(userId, rememberMe = false) {
  const token = randomBytes(32).toString('hex');
  const csrfToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const maxAge = rememberMe ? REMEMBER_DAYS * 86400 : SESSION_HOURS * 3600;
  const expiresAt = new Date(Date.now() + maxAge * 1000).toISOString();
  database.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, csrf_token, remember_me) VALUES (?, ?, ?, ?, ?)').run(tokenHash, userId, expiresAt, csrfToken, rememberMe ? 1 : 0);
  return { token, csrfToken, expiresAt, maxAge };
}

export function getSessionUser(token) {
  if (!token) return null;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return database.prepare(`SELECT users.id, users.email, users.role, users.created_at, users.last_login_at, sessions.csrf_token FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > datetime('now')`).get(tokenHash) || null;
}

export function verifyCsrf(token, csrfToken) {
  if (!token || !csrfToken) return false;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return Boolean(database.prepare("SELECT 1 FROM sessions WHERE token_hash = ? AND csrf_token = ? AND expires_at > datetime('now')").get(tokenHash, csrfToken));
}

export function deleteSession(token) {
  if (!token) return;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

export function deleteUserSessions(userId) {
  return database.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}
