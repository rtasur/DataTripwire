import pool from '../../config/database.js';

export async function createAuditLog({
  userId,
  sessionId,
  riskDecisionId,
  action,
  previousState,
  newState,
  details = {},
}) {
  const result = await pool.query(
    `
      INSERT INTO audit_logs (
        user_id,
        session_id,
        risk_decision_id,
        action,
        previous_state,
        new_state,
        details
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7::jsonb
      )
      RETURNING *
    `,
    [
      userId,
      sessionId,
      riskDecisionId,
      action,
      previousState ?? null,
      newState ?? null,
      JSON.stringify(details),
    ],
  );

  return result.rows[0];
}