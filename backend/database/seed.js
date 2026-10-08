import bcrypt from 'bcryptjs';
import pool from '../src/config/database.js';

const users = [
  {
    email: 'employee@datatripwire.local',
    fullName: 'Demo Employee',
    role: 'employee',
    password: 'password123',
  },
  {
    email: 'admin@datatripwire.local',
    fullName: 'Security Administrator',
    role: 'admin',
    password: 'admin123',
  },
];

try {
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 12);

    await pool.query(
      `
        INSERT INTO users (
          email,
          full_name,
          role,
          password_hash
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email)
        DO UPDATE SET
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role,
          password_hash = EXCLUDED.password_hash,
          updated_at = NOW()
      `,
      [
        user.email,
        user.fullName,
        user.role,
        passwordHash,
      ],
    );

    console.log(`Seeded ${user.email}`);
  }
} finally {
  await pool.end();
}