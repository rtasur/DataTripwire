import pool from '../config/database.js';

export async function requireActiveSession(req, res, next) {
  try {
    const result = await pool.query(
      `
      SELECT status
      FROM sessions
      WHERE id = $1
        AND user_id = $2
      `,
      [req.auth.sessionId, req.auth.userId],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Session not found',
      });
    }

    const { status } = result.rows[0];

    if (status !== 'active') {
      return res.status(403).json({
        error: 'Protected action requires an active session',
        sessionStatus: status,
      });
    }

    return next();
  } catch (error) {
    console.error('Session policy middleware error:', error);

    return res.status(500).json({
      error: 'Unable to verify session policy',
    });
  }
}
