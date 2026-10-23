import crypto from 'node:crypto';
import { HttpError } from '../errors.js';

const MAX_CHALLENGES_PER_MINUTE = 3;
const MAX_CHALLENGES_PER_STUDENT_PER_MINUTE = 6;
const MIN_FRAMES = 10;
const MAX_FRAMES = 30;
const BASELINE_FRAME_COUNT = 5;
const MAX_FRAME_PAYLOAD_CHARS = 8_000_000;
const MAX_VERIFIER_RESPONSE_BYTES = 16_384;

const ACTIONS = ['blink', 'turn_left', 'turn_right', 'smile', 'nod'];

/** Issue a one-time, randomised challenge so a pre-recorded result can't be replayed. */
export function issueChallenge(app, attempt) {
  const { db, config } = app;
  const shuffled = [...ACTIONS];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const actions = shuffled.slice(0, 2);
  const issuedAt = Date.now();
  const recentCount = db.prepare(
    'SELECT COUNT(*) AS count FROM liveness_challenges WHERE attempt_id = ? AND issued_at > ?'
  ).get(attempt.id, issuedAt - 60_000).count;
  const studentRecentCount = db.prepare(
    `SELECT COUNT(*) AS count FROM liveness_challenges c
     JOIN attempts a ON a.id = c.attempt_id
     WHERE a.student_id = ? AND c.issued_at > ?`
  ).get(attempt.student_id, issuedAt - 60_000).count;
  if (studentRecentCount >= MAX_CHALLENGES_PER_STUDENT_PER_MINUTE) {
    throw new HttpError(429, 'LIVENESS_CHALLENGE_RATE_LIMITED', 'Too many face checks. Wait a minute before trying again.');
  }
  if (recentCount >= MAX_CHALLENGES_PER_MINUTE) {
    throw new HttpError(429, 'LIVENESS_CHALLENGE_RATE_LIMITED', 'Too many face checks. Wait a minute before trying again.');
  }
  // Keep only the newest challenge active and prune expired rows to bound table growth.
  db.prepare('UPDATE liveness_challenges SET used = 1 WHERE attempt_id = ? AND used = 0').run(attempt.id);
  db.prepare('DELETE FROM liveness_challenges WHERE expires_at < ?').run(issuedAt);
  const challenge = {
    id: crypto.randomUUID(),
    nonce: crypto.randomBytes(16).toString('hex'),
    issued_at: issuedAt,
    expires_at: issuedAt + config.livenessChallengeTtlSeconds * 1000,
  };
  db.prepare(
    'INSERT INTO liveness_challenges (id, attempt_id, nonce, actions, issued_at, expires_at) VALUES (?,?,?,?,?,?)'
  ).run(challenge.id, attempt.id, challenge.nonce, JSON.stringify(actions), challenge.issued_at, challenge.expires_at);
  return {
    challengeId: challenge.id,
    nonce: challenge.nonce,
    actions,
    baselineFrames: BASELINE_FRAME_COUNT,
    expiresAt: new Date(challenge.expires_at).toISOString(),
  };
}

/** Ask a trusted server-side model to evaluate captured frames and issued actions. */
export async function evaluateLiveness(app, { challenge, payload }) {
  const { livenessServiceUrl, livenessServiceToken, livenessMinScore } = app.config;
  if (!livenessServiceUrl) {
    throw new HttpError(503, 'LIVENESS_UNAVAILABLE', 'Server-side face verification is not configured.');
  }
  if (!Array.isArray(payload.frames) || payload.frames.length < MIN_FRAMES || payload.frames.length > MAX_FRAMES ||
      payload.frames.some((frame) => typeof frame !== 'string' || frame.length > 700_000) ||
      payload.frames.reduce((total, frame) => total + (typeof frame === 'string' ? frame.length : 0), 0) > MAX_FRAME_PAYLOAD_CHARS) {
    throw new HttpError(400, 'VALIDATION_ERROR', '`frames` must contain 10 to 30 captured image frames within the payload size limit.');
  }

  let response;
  try {
    response = await fetch(livenessServiceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${livenessServiceToken}` },
      signal: AbortSignal.timeout(app.config.livenessServiceTimeoutMs),
      body: JSON.stringify({ challengeId: challenge.id, nonce: challenge.nonce,
        actions: JSON.parse(challenge.actions), baselineFrames: BASELINE_FRAME_COUNT, frames: payload.frames }),
    });
  } catch {
    throw new HttpError(503, 'LIVENESS_UNAVAILABLE', 'Face verification service is unavailable. Please try again.');
  }
  if (!response.ok) {
    try { await response.body?.cancel(); } catch { /* response may already be closed */ }
    if (response.status >= 500) {
      throw new HttpError(503, 'LIVENESS_UNAVAILABLE', 'Face verification service is unavailable. Please try again.');
    }
    throw new HttpError(502, 'LIVENESS_BAD_RESPONSE', 'Face verification service rejected the verification request.');
  }

  let result;
  try {
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_VERIFIER_RESPONSE_BYTES) {
      await response.body?.cancel();
      throw new Error('Verifier response is too large');
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Verifier response is empty');
    const decoder = new TextDecoder();
    let text = '';
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_VERIFIER_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error('Verifier response is too large');
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    result = JSON.parse(text);
  } catch {
    throw new HttpError(502, 'LIVENESS_BAD_RESPONSE', 'Face verification service returned an invalid response.');
  }
  const score = result?.score;
  const actions = JSON.parse(challenge.actions);
  const completed = Array.isArray(result?.actionsCompleted) &&
    result.actionsCompleted.length === actions.length &&
    actions.every((action, index) => result.actionsCompleted[index] === action);
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1) {
    throw new HttpError(502, 'LIVENESS_BAD_RESPONSE', 'Face verification service returned an invalid score.');
  }
  return { ok: result.passed === true && completed && score >= livenessMinScore, score };
}
export async function verifyLiveness(app, attempt, payload) {
  const { db, config } = app;
  const { challengeId, nonce } = payload;
  if (typeof challengeId !== 'string' || typeof nonce !== 'string') {
    throw new HttpError(400, 'VALIDATION_ERROR', '`challengeId` and `nonce` are required.');
  }
  const challenge = db.prepare('SELECT * FROM liveness_challenges WHERE id = ? AND attempt_id = ?').get(challengeId, attempt.id);
  if (!challenge || challenge.nonce !== nonce) {
    throw new HttpError(422, 'LIVENESS_CHALLENGE_INVALID', 'Unknown liveness challenge. Request a new one.');
  }
  // single use: burn it before evaluating, so a failed check can't be retried on the same challenge
  const burned = db.prepare('UPDATE liveness_challenges SET used = 1 WHERE id = ? AND used = 0').run(challengeId);
  if (burned.changes === 0) {
    throw new HttpError(422, 'LIVENESS_CHALLENGE_USED', 'This liveness challenge was already used. Request a new one.');
  }
  const now = Date.now();
  if (now > challenge.expires_at) {
    throw new HttpError(422, 'LIVENESS_CHALLENGE_EXPIRED', 'Liveness challenge expired. Request a new one.');
  }
  if (now - challenge.issued_at < config.livenessMinResponseMs) {
    throw new HttpError(422, 'LIVENESS_TOO_FAST', 'Response was too fast to be a real liveness check.');
  }
  const result = await evaluateLiveness(app, { challenge, payload });
  if (!result.ok) {
    throw new HttpError(422, 'LIVENESS_FAILED', 'Face liveness could not be verified. Please try again.', {
      minScore: config.livenessMinScore,
    });
  }
  return { score: result.score };
}
