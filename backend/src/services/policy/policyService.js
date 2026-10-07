import pool from '../../config/database.js';

const POLICY_ID = 'default-zero-trust-v1';

const POLICY_ACTIONS = {
  ALLOW: {
    requiredAction: 'NONE',
    enforcement: 'APPLICATION_CONTINUES',
  },
  MONITOR: {
    requiredAction: 'INCREASE_MONITORING',
    enforcement: 'APPLICATION_CONTINUES',
  },
  VERIFY: {
    requiredAction: 'STEP_UP_AUTH',
    enforcement: 'APPLICATION_HANDLED',
  },
  RESTRICT: {
    requiredAction: 'LIMIT_CAPABILITIES',
    enforcement: 'APPLICATION_HANDLED',
  },
  QUARANTINE: {
    requiredAction: 'DENY_PROTECTED_ACTIONS',
    enforcement: 'APPLICATION_HANDLED',
  },
};

export async function applyPolicy({
  userId,
  sessionId,
  decision,
}) {
  const action = POLICY_ACTIONS[decision];

  if (!action) {
    throw new Error(`Unsupported policy decision: ${decision}`);
  }

  let sessionStatus = null;
  let stepUpRequired = false;
  let stepUpVerifiedAt = null;

  /*
   * VERIFY means DataTripwire requires the protected application
   * to perform its own step-up authentication.
   *
   * DataTripwire does not decide whether that mechanism is
   * OTP, password re-entry, WebAuthn, MFA, etc.
   */
  if (decision === 'VERIFY') {
    await pool.query(
      `
      UPDATE sessions
      SET step_up_required = TRUE,
          step_up_verified_at = NULL,
          last_activity_at = NOW()
      WHERE id = $1
        AND user_id = $2
      `,
      [sessionId, userId],
    );
  }

  if (decision === 'RESTRICT') {
    await pool.query(
      `
      UPDATE sessions
      SET status = 'restricted',
          last_activity_at = NOW()
      WHERE id = $1
        AND user_id = $2
      `,
      [sessionId, userId],
    );
  }

  if (decision === 'QUARANTINE') {
    await pool.query(
      `
      UPDATE sessions
      SET status = 'quarantined',
          last_activity_at = NOW()
      WHERE id = $1
        AND user_id = $2
      `,
      [sessionId, userId],
    );
  }

  const result = await pool.query(
    `
    SELECT
      status,
      step_up_required,
      step_up_verified_at
    FROM sessions
    WHERE id = $1
      AND user_id = $2
    `,
    [sessionId, userId],
  );

  sessionStatus = result.rows[0]?.status ?? null;
  stepUpRequired = result.rows[0]?.step_up_required ?? false;
  stepUpVerifiedAt = result.rows[0]?.step_up_verified_at ?? null;

  return {
    policyId: POLICY_ID,
    decision,
    requiredAction: action.requiredAction,
    enforcement: action.enforcement,
    sessionStatus,
    stepUpRequired,
    stepUpVerifiedAt,
  };
}