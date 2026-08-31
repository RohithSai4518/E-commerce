/**
 * Authentication & Account API Controller
 */

const authService = require('../services/auth-service');
const { Security } = require('../core/security');

// Auth Verification Middleware
async function authenticate(ctx, next) {
  const token = ctx.getAuthToken();
  if (!token) {
    return ctx.status(401).json({ success: false, error: 'Authentication token required' });
  }

  const payload = Security.verifyToken(token);
  if (!payload || !payload.userId) {
    return ctx.status(401).json({ success: false, error: 'Invalid or expired authentication session' });
  }

  ctx.user = payload;
  await next();
}

// Admin Role Guard Middleware
async function requireAdmin(ctx, next) {
  if (!ctx.user || ctx.user.role !== 'admin') {
    return ctx.status(403).json({ success: false, error: 'Administrative privileges required' });
  }
  await next();
}

class AuthController {
  async register(ctx) {
    const { email, password, name, phone } = ctx.body || {};
    if (!email || !password || !name) {
      return ctx.status(400).json({ success: false, error: 'Email, password, and name are required' });
    }

    const result = await authService.register({ email, password, name, phone });
    return ctx.status(201).json({ success: true, data: result });
  }

  async login(ctx) {
    const { email, password } = ctx.body || {};
    if (!email || !password) {
      return ctx.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const result = await authService.login({ email, password });
    return ctx.json({ success: true, data: result });
  }

  async getCurrentUser(ctx) {
    const user = await authService.getProfile(ctx.user.userId);
    return ctx.json({ success: true, data: user });
  }

  async updateProfile(ctx) {
    const result = await authService.updateProfile(ctx.user.userId, ctx.body || {});
    return ctx.json({ success: true, data: result });
  }

  async addAddress(ctx) {
    const address = await authService.addAddress(ctx.user.userId, ctx.body || {});
    return ctx.status(201).json({ success: true, data: address });
  }

  async deleteAddress(ctx) {
    const result = await authService.deleteAddress(ctx.user.userId, ctx.params.id);
    return ctx.json({ success: true, data: result });
  }
}

module.exports = {
  authController: new AuthController(),
  authenticate,
  requireAdmin
};
