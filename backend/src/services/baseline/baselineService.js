import pool from '../../config/database.js';

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce((sum, value) => sum + Number(value), 0) /
    values.length
  );
}

export async function calculateUserBaseline(userId) {
  const result = await pool.query(
  `
    SELECT
      behavior_events.session_id,
      behavior_events.event_type,
      behavior_events.resource,
      behavior_events.device_id,
      behavior_events.location,
      behavior_events.request_count,
      behavior_events.metadata,
      behavior_events.occurred_at
    FROM behavior_events
    INNER JOIN sessions
      ON sessions.id = behavior_events.session_id
    WHERE behavior_events.user_id = $1
      AND sessions.status IN ('active', 'ended')
    ORDER BY behavior_events.occurred_at ASC
  `,
  [userId],
);

  const events = result.rows;

  if (events.length === 0) {
    return null;
  }

  /*
   * ----------------------------------------------------------
   * LOGIN TIME BASELINE
   * ----------------------------------------------------------
   * Only explicit login events are used here.
   */
  const loginHours = events
    .filter((event) => event.event_type === 'login')
    .map((event) => new Date(event.occurred_at).getHours());

  const usualLoginHourStart =
    loginHours.length > 0
      ? Math.min(...loginHours)
      : null;

  const usualLoginHourEnd =
    loginHours.length > 0
      ? Math.max(...loginHours)
      : null;

  /*
   * ----------------------------------------------------------
   * REQUEST VOLUME BASELINE
   * ----------------------------------------------------------
   */
  const requestValues = events
    .map((event) => event.request_count)
    .filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        Number.isFinite(Number(value)),
    )
    .map(Number);

  const avgRequestsPerMinute =
    average(requestValues);

  /*
   * ----------------------------------------------------------
   * RESOURCES / SESSION
   * ----------------------------------------------------------
   */
  const sessionIds = new Set(
    events
      .map((event) => event.session_id)
      .filter(Boolean),
  );

  const resourcesBySession = new Map();

  for (const event of events) {
    if (!event.session_id || !event.resource) {
      continue;
    }

    if (!resourcesBySession.has(event.session_id)) {
      resourcesBySession.set(
        event.session_id,
        new Set(),
      );
    }

    resourcesBySession
      .get(event.session_id)
      .add(event.resource);
  }

  const resourceCounts = [
    ...resourcesBySession.values(),
  ].map((resources) => resources.size);

  const avgResourcesPerSession =
    average(resourceCounts);

  /*
   * ----------------------------------------------------------
   * KNOWN DEVICES
   * ----------------------------------------------------------
   */
  const knownDevices = [
    ...new Set(
      events
        .map((event) => event.device_id)
        .filter(Boolean),
    ),
  ];

  /*
   * ----------------------------------------------------------
   * KNOWN LOCATIONS
   * ----------------------------------------------------------
   */
  const knownLocations = [
    ...new Set(
      events
        .map((event) => event.location)
        .filter(Boolean),
    ),
  ];

  /*
 * ----------------------------------------------------------
 * COMMON RESOURCE TYPES
 * ----------------------------------------------------------
 * Resource semantics are supplied by the protected
 * application through normalized telemetry metadata.
 *
 * DataTripwire does not interpret application URL paths.
 */
const commonResourceTypes = [
  ...new Set(
    events
      .map((event) => {
        const resourceType =
          event.metadata?.resource_type;

        if (
          typeof resourceType === 'string' &&
          resourceType.trim()
        ) {
          return resourceType.trim().toLowerCase();
        }

        return null;
      })
      .filter(Boolean ),
  ),
];

  const baseline = {
    userId,
    usualLoginHourStart,
    usualLoginHourEnd,
    avgRequestsPerMinute,
    avgResourcesPerSession,
    knownDevices,
    knownLocations,
    commonResourceTypes,
    sampleCount: events.length,
  };

  await pool.query(
    `
      INSERT INTO user_baselines (
        user_id,
        usual_login_hour_start,
        usual_login_hour_end,
        avg_requests_per_minute,
        avg_resources_per_session,
        known_devices,
        known_locations,
        common_resource_types,
        sample_count,
        calculated_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6::jsonb,
        $7::jsonb,
        $8::jsonb,
        $9,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        usual_login_hour_start = EXCLUDED.usual_login_hour_start,
        usual_login_hour_end = EXCLUDED.usual_login_hour_end,
        avg_requests_per_minute = EXCLUDED.avg_requests_per_minute,
        avg_resources_per_session = EXCLUDED.avg_resources_per_session,
        known_devices = EXCLUDED.known_devices,
        known_locations = EXCLUDED.known_locations,
        common_resource_types = EXCLUDED.common_resource_types,
        sample_count = EXCLUDED.sample_count,
        calculated_at = NOW(),
        updated_at = NOW()
    `,
    [
      userId,
      baseline.usualLoginHourStart,
      baseline.usualLoginHourEnd,
      baseline.avgRequestsPerMinute,
      baseline.avgResourcesPerSession,
      JSON.stringify(baseline.knownDevices),
      JSON.stringify(baseline.knownLocations),
      JSON.stringify(baseline.commonResourceTypes),
      baseline.sampleCount,
    ],
  );

  return baseline;
}

export async function getUserBaseline(userId) {
  const result = await pool.query(
  `
    SELECT
      behavior_events.session_id,
      behavior_events.event_type,
      behavior_events.resource,
      behavior_events.device_id,
      behavior_events.location,
      behavior_events.request_count,
      behavior_events.metadata,
      behavior_events.occurred_at
    FROM behavior_events
    INNER JOIN sessions
      ON sessions.id = behavior_events.session_id
    WHERE behavior_events.user_id = $1
      AND sessions.status IN ('active', 'ended')
    ORDER BY behavior_events.occurred_at ASC
  `,
  [userId],
);

  return result.rows[0] ?? null;
}