import bcrypt from 'bcryptjs';
import pool from '../../config/database.js';
import { createAccessToken } from '../../utils/jwt.js';

export async function loginUser({
  email,
  password,
  deviceId,
  location,
  ipAddress,
  userAgent,
}) {
  const userResult = await pool.query(
    `
      SELECT id, email, full_name, role, status, password_hash
      FROM users
      WHERE email = $1
    `,
    [email],
  );

  if (userResult.rows.length === 0) {
    return null;
  }

  const user = userResult.rows[0];

  if (user.status !== 'active') {
    return null;
  }

  const passwordValid = await bcrypt.compare(
    password,
    user.password_hash,
  );

  if (!passwordValid) {
    return null;
  }

  const sessionResult = await pool.query(
    `
      INSERT INTO sessions (
        user_id,
        device_id,
        ip_address,
        location,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        user_id,
        device_id,
        ip_address,
        location,
        status,
        started_at,
        last_activity_at
    `,
    [
      user.id,
      deviceId ?? null,
      ipAddress ?? null,
      location ?? null,
      userAgent ?? null,
    ],
  );

  const session = sessionResult.rows[0];

    await pool.query(
    `
      INSERT INTO behavior_events (
        user_id,
        session_id,
        event_type,
        device_id,
        ip_address,
        location,
        metadata
      )
      VALUES (
        $1,
        $2,
        'login',
        $3,
        $4,
        $5,
        $6::jsonb
      )
    `,
    [
      user.id,
      session.id,
      deviceId ?? null,
      ipAddress ?? null,
      location ?? null,
      JSON.stringify({
        authentication: 'password',
      }),
    ],
  );

  const token = createAccessToken({
    userId: user.id,
    sessionId: session.id,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    },
    session,
    token,
  };
}

export async function getAuthenticatedUser(userId, sessionId) {
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.status,
        s.id AS session_id,
        s.status AS session_status,
        s.device_id,
        s.location,
        s.started_at,
        s.last_activity_at
      FROM users u
      JOIN sessions s
        ON s.user_id = u.id
      WHERE u.id = $1
        AND s.id = $2
    `,
    [userId, sessionId],
  );

  return result.rows[0] ?? null;
}

export async function logoutUser(userId, sessionId) {
  const result = await pool.query(
    `
      UPDATE sessions
      SET
        status = 'ended',
        ended_at = NOW(),
        last_activity_at = NOW()
      WHERE id = $1
        AND user_id = $2
        AND status = 'active'
      RETURNING id
    `,
    [sessionId, userId],
  );

  return result.rowCount > 0;
}