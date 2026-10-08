import {
  loginUser,
  getAuthenticatedUser,
  logoutUser,
} from '../services/auth/authService.js';

export async function login(req, res) {
  try {
    const {
      email,
      password,
      device_id: deviceId,
      location,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    const result = await loginUser({
      email,
      password,
      deviceId,
      location,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    if (!result) {
      return res.status(401).json({
        error: 'Invalid credentials',
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      error: 'Authentication service error',
    });
  }
}

export async function me(req, res) {
  try {
    const user = await getAuthenticatedUser(
      req.auth.userId,
      req.auth.sessionId,
    );

    if (!user) {
      return res.status(401).json({
        error: 'Session is no longer valid',
      });
    }

    return res.status(200).json({
      user,
    });
  } catch (error) {
    console.error('Me endpoint error:', error);

    return res.status(500).json({
      error: 'Authentication service error',
    });
  }
}

export async function logout(req, res) {
  try {
    const ended = await logoutUser(
      req.auth.userId,
      req.auth.sessionId,
    );

    if (!ended) {
      return res.status(401).json({
        error: 'Session is already inactive',
      });
    }

    return res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);

    return res.status(500).json({
      error: 'Authentication service error',
    });
  }
}