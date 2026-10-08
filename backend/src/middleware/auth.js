import pool from '../config/database.js';
import { verifyAccessToken } from '../utils/jwt.js';

const AUTHENTICATABLE_SESSION_STATUSES = [
  'active',
  'restricted',
  'quarantined',
];

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
    });
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyAccessToken(token);

    const sessionResult = await pool.query(
      `
        SELECT
          s.id,
          s.user_id,
          s.status,
          u.status AS user_status
        FROM sessions s
        INNER JOIN users u
          ON u.id = s.user_id
        WHERE s.id = $1
          AND s.user_id = $2
      `,
      [payload.sessionId, payload.userId],
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Session not found',
      });
    }

    const session = sessionResult.rows[0];

    if (session.user_status !== 'active') {
      return res.status(401).json({
        error: 'User account is not active',
      });
    }

    if (!AUTHENTICATABLE_SESSION_STATUSES.includes(session.status)) {
      return res.status(401).json({
        error: 'Session is no longer active',
      });
    }

    req.auth = {
      userId: payload.userId,
      sessionId: payload.sessionId,
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);

    return res.status(401).json({
      error: 'Invalid or expired token',
    });
  }
}