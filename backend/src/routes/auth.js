import crypto from 'node:crypto';
import { HttpError } from '../errors.js';
import { audit } from '../db.js';
import { createFailureLimiter, hashPassword, signToken, verifyPassword } from '../auth.js';

export function registerAuthRoutes(r, app) {
  const { db, config } = app;
  const limiter = createFailureLimiter(10, 60_000);
  const ipLimiter = createFailureLimiter(120, 60_000);
  const dummyPasswordHash = hashPassword(crypto.randomUUID());

  // POST /api/auth/login   { studentId | loginId, password? }
  r.post('/api/auth/login', async ({ body, req }) => {
    const loginId = String(body.loginId ?? body.studentId ?? '').trim();
    if (!loginId || loginId.length > 100) throw new HttpError(400, 'VALIDATION_ERROR', 'Enter a valid ID (100 characters maximum).');
    const password = String(body.password ?? '');
    if (password.length > 1024) throw new HttpError(400, 'VALIDATION_ERROR', 'Password must be 1024 characters or fewer.');
    const remoteAddress = req.socket.remoteAddress || 'unknown';
    const key = `${remoteAddress}|${loginId.toLowerCase()}`;
    limiter.check(key);
    ipLimiter.check(remoteAddress);

    const user = db.prepare('SELECT * FROM users WHERE login_id = ? COLLATE NOCASE').get(loginId);
    const passwordNeeded = config.requirePassword || user?.role !== 'student' || Boolean(user?.password_required);
    const fail = () => {
      limiter.fail(key);
      ipLimiter.fail(remoteAddress);
      audit(db, user?.id, 'login_failed', { loginId });
      return new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid ID or password.');
    };

    if (!user) {
      if (config.requirePassword) await verifyPassword(password, dummyPasswordHash);
      throw fail();
    }
    if (passwordNeeded && !(await verifyPassword(password, user.password_hash || dummyPasswordHash))) throw fail();

    limiter.reset(key);
    audit(db, user.id, 'login');
    return {
      token: signToken(config, { sub: user.id, role: user.role }),
      user: { id: user.id, loginId: user.login_id, name: user.name, role: user.role },
    };
  });

  // GET /api/auth/me
  r.get('/api/auth/me', ({ user }) => ({
    user: { id: user.id, loginId: user.login_id, name: user.name, role: user.role },
  }), { roles: ['student', 'teacher'] });
}
