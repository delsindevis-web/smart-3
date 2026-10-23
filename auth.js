import crypto from 'node:crypto';
import { HttpError } from '../errors.js';
import { audit, tx } from '../db.js';
import { createFailureLimiter, hashPassword, signToken, verifyPassword } from '../auth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ROLES = ['student', 'teacher'];

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha256(a), sha256(b));

export function registerAuthRoutes(r, app) {
  const { db, config } = app;
  const limiter = createFailureLimiter(10, 60_000);
  const ipLimiter = createFailureLimiter(120, 60_000);
  const signupLimiter = createFailureLimiter(10, 60_000); // counts every signup attempt per IP
  const dummyPasswordHash = hashPassword(crypto.randomUUID());

  const userView = (u) => ({ id: u.id, loginId: u.login_id, name: u.name, role: u.role });

  // POST /api/auth/register   { email, name, password, role, accessCode? }
  r.post('/api/auth/register', ({ body, req }) => {
    const remoteAddress = req.socket.remoteAddress || 'unknown';
    signupLimiter.check(remoteAddress);
    signupLimiter.fail(remoteAddress);

    const email = String(body.email ?? '').trim().toLowerCase();
    const name = String(body.name ?? '').trim();
    const password = String(body.password ?? '');
    const role = body.role;

    if (!ROLES.includes(role)) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Choose Student or Teacher.');
    }
    if (!EMAIL_RE.test(email) || email.length > 254) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Enter a valid email address.');
    }
    if (!name || name.length > 100) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Enter your full name (100 characters maximum).');
    }
    if (password.length < 8 || password.length > 1024) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Password must be between 8 and 1024 characters.');
    }

    // Anyone can reach this endpoint, so teacher accounts (which can open sessions and
    // override attendance) are gated by a shared access code.
    if (role === 'teacher') {
      if (config.teacherSignupCode) {
        if (!safeEqual(body.accessCode ?? '', config.teacherSignupCode)) {
          throw new HttpError(403, 'INVALID_ACCESS_CODE', 'That teacher access code is not correct.');
        }
      } else if (config.nodeEnv === 'production') {
        throw new HttpError(403, 'TEACHER_SIGNUP_DISABLED', 'Teacher sign-up is disabled. Ask an administrator for an account.');
      }
    }

    if (db.prepare('SELECT 1 FROM users WHERE login_id = ? COLLATE NOCASE').get(email)) {
      throw new HttpError(409, 'USER_ALREADY_EXISTS', 'An account with that email already exists. Try logging in.');
    }

    let userId;
    try {
      userId = tx(db, () => {
        const id = Number(db.prepare(
          'INSERT INTO users (login_id, name, role, password_hash, password_required, created_at) VALUES (?,?,?,?,?,?)'
        ).run(email, name, role, hashPassword(password), 1, Date.now()).lastInsertRowid);
        if (role === 'student' && config.autoEnrollOnSignup) {
          db.prepare('INSERT INTO enrollments (course_id, student_id) SELECT id, ? FROM courses').run(id);
        }
        return id;
      });
    } catch (err) {
      if (/UNIQUE/i.test(err.message)) {
        throw new HttpError(409, 'USER_ALREADY_EXISTS', 'An account with that email already exists. Try logging in.');
      }
      throw err;
    }

    audit(db, userId, 'registered', { role });
    const user = { id: userId, login_id: email, name, role };
    return { status: 201, body: { token: signToken(config, { sub: userId, role }), user: userView(user) } };
  });

  // POST /api/auth/login   { loginId | email | studentId, password, role? }
  r.post('/api/auth/login', async ({ body, req }) => {
    const loginId = String(body.loginId ?? body.email ?? body.studentId ?? '').trim();
    if (!loginId || loginId.length > 100) throw new HttpError(400, 'VALIDATION_ERROR', 'Enter a valid email or ID (100 characters maximum).');
    const password = String(body.password ?? '');
    if (password.length > 1024) throw new HttpError(400, 'VALIDATION_ERROR', 'Password must be 1024 characters or fewer.');
    if (body.role !== undefined && !ROLES.includes(body.role)) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Choose Student or Teacher.');
    }
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
      return new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email/ID or password.');
    };

    if (!user) {
      if (config.requirePassword) await verifyPassword(password, dummyPasswordHash);
      throw fail();
    }
    if (passwordNeeded && !(await verifyPassword(password, user.password_hash || dummyPasswordHash))) throw fail();

    // Checked only after the credentials are proven, so it never reveals which accounts exist.
    if (body.role && body.role !== user.role) {
      throw new HttpError(403, 'ROLE_MISMATCH', `This account is registered as a ${user.role}. Switch the role and try again.`);
    }

    limiter.reset(key);
    audit(db, user.id, 'login');
    return {
      token: signToken(config, { sub: user.id, role: user.role }),
      user: userView(user),
    };
  });

  // GET /api/auth/me
  r.get('/api/auth/me', ({ user }) => ({ user: userView(user) }), { roles: ['student', 'teacher'] });
}
