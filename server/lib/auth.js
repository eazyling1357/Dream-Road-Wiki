'use strict';
const crypto = require('crypto');
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'drw-dev-secret-change-me';
const TOKEN_TTL_MS = Number(process.env.TOKEN_TTL_MS) || 8 * 60 * 60 * 1000;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return salt.toString('hex') + ':' + hash.toString('hex');
}
function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || !stored.includes(':')) return false;
  const [saltHex, hashHex] = stored.split(':');
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password, salt, expected.length, { N: 16384, r: 8, p: 1 });
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch { return false; }
}
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  return body + '.' + sig;
}
function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload || typeof payload.sub !== 'string') return null;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}
function publicUser(u) { return { id: u.id, username: u.username, role: u.role, createdAt: u.createdAt }; }
function issueToken(user) {
  const exp = Date.now() + TOKEN_TTL_MS;
  return { token: sign({ sub: user.username, uid: user.id, role: user.role, exp }), expiresAt: exp, user: publicUser(user) };
}
module.exports = { TOKEN_TTL_MS, USERNAME_RE, hashPassword, verifyPassword, verifyToken, publicUser, issueToken };
