import test from 'node:test';
import assert from 'node:assert/strict';
import app from './app.js';

// Lightweight test without adding a test framework yet.
test('backend module exposes an Express app', () => {
  assert.equal(typeof app, 'function');
});
