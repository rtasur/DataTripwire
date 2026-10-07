import pool from '../../config/database.js';

export async function recordBehaviorEvent({
  userId,
  sessionId,
  eventType,
  resource,
  method,
  deviceId,
  location,
  ipAddress,
  requestCount,
  metadata,
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Make sure the session belongs to the authenticated user
    // and is still active.
    const sessionResult = await client.query(
      `
        SELECT id, status
        FROM sessions
        WHERE id = $1
          AND user_id = $2
      `,
      [sessionId, userId],
    );

    if (sessionResult.rows.length === 0) {
      throw new Error('Session not found');
    }

    const sessionStatus = sessionResult.rows[0].status;

    if (!['active', 'restricted', 'quarantined'].includes(sessionStatus)) {
      throw new Error('Session is not available for telemetry');
    }

    const eventResult = await client.query(
      `
        INSERT INTO behavior_events (
          user_id,
          session_id,
          event_type,
          resource,
          method,
          device_id,
          ip_address,
          location,
          request_count,
          metadata
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10
        )
        RETURNING
          id,
          user_id,
          session_id,
          event_type,
          resource,
          method,
          device_id,
          ip_address,
          location,
          request_count,
          metadata,
          occurred_at
      `,
      [
        userId,
        sessionId,
        eventType,
        resource ?? null,
        method ?? null,
        deviceId ?? null,
        ipAddress ?? null,
        location ?? null,
        requestCount ?? null,
        metadata ?? {},
      ],
    );

    await client.query(
      `
        UPDATE sessions
        SET last_activity_at = NOW()
        WHERE id = $1
      `,
      [sessionId],
    );

    await client.query('COMMIT');

    return eventResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}