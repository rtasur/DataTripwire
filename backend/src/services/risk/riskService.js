import pool from '../../config/database.js';

const RISK_POINTS = {
  newDevice: 15,
  newLocation: 10,
  unusualLoginTime: 10,
  highRequestVolume: 15,
  unusualResource: 12,
};

const RISK_DECAY = 5;

function determineDecision(score) {
  if (score >= 85) {
    return 'QUARANTINE';
  }

  if (score >= 70) {
    return 'RESTRICT';
  }

  if (score >= 50) {
    return 'VERIFY';
  }

  if (score >= 30) {
    return 'MONITOR';
  }

  return 'ALLOW';
}

function resourceType(event) {
  const metadataType = event?.metadata?.resource_type;

  if (typeof metadataType === 'string' && metadataType.trim()) {
    return metadataType.trim().toLowerCase();
  }

  return null;
}

function isHourWithinRange(hour, start, end) {
  if (start === null || end === null) {
    return true;
  }

  if (start <= end) {
    return hour >= start && hour <= end;
  }

  // Handles ranges crossing midnight.
  return hour >= start || hour <= end;
}

export async function evaluateBehaviorRisk({
  userId,
  sessionId,
  event,
}) {
  const baselineResult = await pool.query(
    `
      SELECT
        avg_requests_per_minute,
        known_devices,
        known_locations,
        common_resource_types,
        usual_login_hour_start,
        usual_login_hour_end
      FROM user_baselines
      WHERE user_id = $1
    `,
    [userId],
  );

  const baseline = baselineResult.rows[0] ?? null;

  if (!baseline) {
    return {
      score: 0,
      decision: 'ALLOW',
      factors: [],
      explanation: 'No personal baseline exists yet.',
    };
  }

  const previousResult = await pool.query(
   `
    SELECT new_score
    FROM risk_decisions
    WHERE user_id = $1
      AND session_id = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [userId, sessionId],
  );

  const previousScore =
    previousResult.rows[0]?.new_score ?? 0;

  const factors = [];
  let scoreIncrease = 0;

  const knownDevices = Array.isArray(baseline.known_devices)
    ? baseline.known_devices
    : [];

  const knownLocations = Array.isArray(baseline.known_locations)
    ? baseline.known_locations
    : [];

  const commonResourceTypes = Array.isArray(
    baseline.common_resource_types,
  )
    ? baseline.common_resource_types
    : [];

  // ----------------------------------------------------------
  // DEVICE
  // ----------------------------------------------------------

  if (
    event.device_id &&
    !knownDevices.includes(event.device_id)
  ) {
    scoreIncrease += RISK_POINTS.newDevice;

    factors.push({
      type: 'new_device',
      points: RISK_POINTS.newDevice,
      detail: `Device "${event.device_id}" is not in the user's baseline.`,
    });
  }

  // ----------------------------------------------------------
  // LOCATION
  // ----------------------------------------------------------

  if (
    event.location &&
    !knownLocations.includes(event.location)
  ) {
    scoreIncrease += RISK_POINTS.newLocation;

    factors.push({
      type: 'new_location',
      points: RISK_POINTS.newLocation,
      detail: `Location "${event.location}" is not in the user's baseline.`,
    });
  }

  // ----------------------------------------------------------
  // REQUEST VOLUME
  // ----------------------------------------------------------

  const requestCount = Number(event.request_count);
  const averageRequests = Number(
    baseline.avg_requests_per_minute,
  );

  if (
    Number.isFinite(requestCount) &&
    averageRequests > 0 &&
    requestCount > averageRequests * 2
  ) {
    scoreIncrease += RISK_POINTS.highRequestVolume;

    factors.push({
      type: 'high_request_volume',
      points: RISK_POINTS.highRequestVolume,
      detail:
        `Request volume ${requestCount} is more than ` +
        `2x the user's baseline of ${averageRequests.toFixed(2)}.`,
    });
  }

  // ----------------------------------------------------------
  // RESOURCE TYPE
  // ----------------------------------------------------------

const currentResourceType = resourceType(event);

  if (
    currentResourceType &&
    !commonResourceTypes.includes(currentResourceType)
  ) {
    scoreIncrease += RISK_POINTS.unusualResource;

    factors.push({
      type: 'unusual_resource',
      points: RISK_POINTS.unusualResource,
      detail:
        `Resource category "${currentResourceType}" ` +
        'has not been observed in the user baseline.',
    });
  }

  // ----------------------------------------------------------
  // LOGIN TIME
  // ----------------------------------------------------------

  if (event.event_type === 'login') {
    const loginHour = new Date(event.occurred_at).getHours();

    const withinNormalWindow = isHourWithinRange(
      loginHour,
      baseline.usual_login_hour_start,
      baseline.usual_login_hour_end,
    );

    if (!withinNormalWindow) {
      scoreIncrease += RISK_POINTS.unusualLoginTime;

      factors.push({
        type: 'unusual_login_time',
        points: RISK_POINTS.unusualLoginTime,
        detail:
          `Login at hour ${loginHour} is outside the user's ` +
          `normal login window.`,
      });
    }
  }

  const calculatedScore =
  scoreIncrease === 0
    ? Math.max(0, Number(previousScore) - RISK_DECAY)
    : Number(previousScore) + scoreIncrease;

  const newScore = Math.min(100, calculatedScore);

  const decision = determineDecision(newScore);

  const explanation =
    factors.length === 0
      ? 'Observed behavior matches the current personal baseline.'
      : factors
          .map((factor) => factor.detail)
          .join(' ');

  return {
    previousScore: Number(previousScore),
    newScore,
    decision,
    factors,
    explanation,
  };
}

export async function saveRiskDecision({
  userId,
  sessionId,
  result,
}) {
  const decisionResult = await pool.query(
    `
      INSERT INTO risk_decisions (
        user_id,
        session_id,
        previous_score,
        new_score,
        decision,
        risk_factors,
        explanation,
        policy_id
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6::jsonb,
        $7,
        $8
      )
      RETURNING
        id,
        user_id,
        session_id,
        previous_score,
        new_score,
        decision,
        risk_factors,
        explanation,
        policy_id,
        created_at
    `,
    [
      userId,
      sessionId,
      result.previousScore,
      result.newScore,
      result.decision,
      JSON.stringify(result.factors),
      result.explanation,
      'default-zero-trust-v1',
    ],
  );

  return decisionResult.rows[0];
}