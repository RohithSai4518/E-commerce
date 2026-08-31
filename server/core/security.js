/**
 * Security & Cryptography Utilities
 * 
 * Provides robust, dependency-free security controls:
 * - PBKDF2 password hashing with cryptographically secure random salts
 * - HMAC-SHA256 stateless session & auth token creation and validation
 * - In-memory sliding-window IP rate limiter
 * - HTML string sanitization to prevent Stored & Reflected XSS
 */

const crypto = require('crypto');
const config = require('../config');

class Security {
  /**
   * Hash password using PBKDF2 with random 16-byte salt
   * @param {string} password - Raw password
   * @returns {Promise<string>} Format: salt:hash
   */
  static async hashPassword(password) {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');
      crypto.pbkdf2(
        password,
        salt,
        config.security.passwordHashIterations,
        config.security.passwordKeyLength,
        config.security.passwordDigest,
        (err, derivedKey) => {
          if (err) return reject(err);
          resolve(`${salt}:${derivedKey.toString('hex')}`);
        }
      );
    });
  }

  /**
   * Verify candidate password against salt:hash string
   */
  static async verifyPassword(candidatePassword, storedHash) {
    return new Promise((resolve, reject) => {
      const [salt, key] = storedHash.split(':');
      if (!salt || !key) return resolve(false);

      crypto.pbkdf2(
        candidatePassword,
        salt,
        config.security.passwordHashIterations,
        config.security.passwordKeyLength,
        config.security.passwordDigest,
        (err, derivedKey) => {
          if (err) return reject(err);
          // Constant-time buffer comparison to prevent timing attacks
          const keyBuffer = Buffer.from(key, 'hex');
          const derivedBuffer = derivedKey;
          if (keyBuffer.length !== derivedBuffer.length) return resolve(false);
          resolve(crypto.timingSafeEqual(keyBuffer, derivedBuffer));
        }
      );
    });
  }

  /**
   * Generate signed HMAC-SHA256 Token (Payload.Timestamp.Signature)
   */
  static generateToken(payload) {
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const timestamp = Date.now();
    const message = `${payloadBase64}.${timestamp}`;
    const signature = crypto
      .createHmac('sha256', config.security.tokenSecret)
      .update(message)
      .digest('base64url');

    return `${message}.${signature}`;
  }

  /**
   * Verify and decode HMAC-SHA256 Token
   */
  static verifyToken(token) {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [payloadBase64, timestampStr, signature] = parts;
    const message = `${payloadBase64}.${timestampStr}`;

    const expectedSignature = crypto
      .createHmac('sha256', config.security.tokenSecret)
      .update(message)
      .digest('base64url');

    // Timing-safe signature check
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();
    const expiryMs = config.security.tokenExpirySeconds * 1000;

    if (now - timestamp > expiryMs) {
      return null; // Expired
    }

    try {
      const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
      return JSON.parse(payloadJson);
    } catch (e) {
      return null;
    }
  }

  /**
   * Sanitize string against XSS
   */
  static sanitize(str) {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Generate unique UUID v4 format
   */
  static generateUuid() {
    return crypto.randomUUID ? crypto.randomUUID() : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16)
    );
  }
}

// In-Memory Sliding Window Rate Limiter
class RateLimiter {
  constructor(windowMs = 60000, maxRequests = 300) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.hits = new Map();

    // Clean expired windows every 2 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [ip, timestamps] of this.hits.entries()) {
        const valid = timestamps.filter(t => now - t < this.windowMs);
        if (valid.length === 0) {
          this.hits.delete(ip);
        } else {
          this.hits.set(ip, valid);
        }
      }
    }, 120000).unref();
  }

  check(ip) {
    const now = Date.now();
    let timestamps = this.hits.get(ip) || [];
    timestamps = timestamps.filter(t => now - t < this.windowMs);

    if (timestamps.length >= this.maxRequests) {
      return false; // Rate limit exceeded
    }

    timestamps.push(now);
    this.hits.set(ip, timestamps);
    return true;
  }
}

module.exports = {
  Security,
  rateLimiter: new RateLimiter(config.security.rateLimit.windowMs, config.security.rateLimit.maxRequests)
};
