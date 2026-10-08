import test from 'node:test';
import assert from 'node:assert/strict';
import pool from './database.js';

test('PostgreSQL connection works', async () => {
  const result = await pool.query('SELECT 1 AS connected');

  assert.equal(result.rows[0].connected, 1);

  await pool.end();
});