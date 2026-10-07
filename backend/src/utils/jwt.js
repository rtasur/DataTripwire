import jwt from 'jsonwebtoken';
import '../config/env.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not configured');
}

export function createAccessToken({ userId, sessionId }) {
  return jwt.sign(
    {
      userId,
      sessionId,
    },
    JWT_SECRET,
    {
      expiresIn: '8h',
    },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}