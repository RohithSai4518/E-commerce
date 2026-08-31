/**
 * Authentication & User Management Service
 * 
 * Handles customer & administrator registration, credential verification,
 * HMAC token creation, profile modification, and address book operations.
 */

const { db } = require('../db/database');
const { Security } = require('../core/security');
const { eventBus, EVENTS } = require('../core/event-bus');

class AuthService {
  constructor() {
    this.users = db.collection('users');
    this.auditLogs = db.collection('audit_logs');
  }

  /**
   * Register a new customer
   */
  async register({ email, password, name, phone }) {
    const cleanEmail = email.toLowerCase().trim();
    
    // Check existing email
    const existing = this.users.findOne({ email: cleanEmail });
    if (existing) {
      const err = new Error('An account with this email address already exists');
      err.status = 409;
      throw err;
    }

    if (!password || password.length < 8) {
      const err = new Error('Password must be at least 8 characters in length');
      err.status = 400;
      throw err;
    }

    const passwordHash = await Security.hashPassword(password);

    const newUser = await this.users.insert({
      email: cleanEmail,
      passwordHash,
      name: Security.sanitize(name.trim()),
      phone: phone ? Security.sanitize(phone.trim()) : '',
      role: 'customer',
      addresses: [],
      wishlist: []
    });

    eventBus.emit(EVENTS.USER_REGISTERED, { userId: newUser.id, email: newUser.email });

    const token = Security.generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name
    });

    return {
      user: this._sanitizeUser(newUser),
      token
    };
  }

  /**
   * Authenticate user credentials and issue session token
   */
  async login({ email, password }) {
    const cleanEmail = (email || '').toLowerCase().trim();
    const user = this.users.findOne({ email: cleanEmail });

    if (!user) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    const isValid = await Security.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    // Log successful sign-in
    await this.auditLogs.insert({
      action: 'USER_LOGIN',
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    });

    const token = Security.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    return {
      user: this._sanitizeUser(user),
      token
    };
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId) {
    const user = this.users.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }
    return this._sanitizeUser(user);
  }

  /**
   * Update profile details
   */
  async updateProfile(userId, { name, phone, currentPassword, newPassword }) {
    const user = this.users.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    const updates = {};
    if (name) updates.name = Security.sanitize(name.trim());
    if (phone !== undefined) updates.phone = Security.sanitize(phone.trim());

    if (newPassword) {
      if (!currentPassword) {
        const err = new Error('Current password is required to set a new password');
        err.status = 400;
        throw err;
      }
      const match = await Security.verifyPassword(currentPassword, user.passwordHash);
      if (!match) {
        const err = new Error('Incorrect current password');
        err.status = 400;
        throw err;
      }
      if (newPassword.length < 8) {
        const err = new Error('New password must be at least 8 characters');
        err.status = 400;
        throw err;
      }
      updates.passwordHash = await Security.hashPassword(newPassword);
    }

    const updatedUser = await this.users.update(userId, updates);
    return this._sanitizeUser(updatedUser);
  }

  /**
   * Address management
   */
  async addAddress(userId, addressData) {
    const user = this.users.findById(userId);
    if (!user) throw new Error('User not found');

    const addresses = user.addresses || [];
    const newAddress = {
      id: Security.generateUuid(),
      label: Security.sanitize(addressData.label || 'Home'),
      street: Security.sanitize(addressData.street || ''),
      city: Security.sanitize(addressData.city || ''),
      state: Security.sanitize(addressData.state || ''),
      postalCode: Security.sanitize(addressData.postalCode || ''),
      country: Security.sanitize(addressData.country || 'US'),
      isDefault: addresses.length === 0 || !!addressData.isDefault
    };

    if (newAddress.isDefault) {
      addresses.forEach(a => { a.isDefault = false; });
    }

    addresses.push(newAddress);
    await this.users.update(userId, { addresses });
    return newAddress;
  }

  async deleteAddress(userId, addressId) {
    const user = this.users.findById(userId);
    if (!user) throw new Error('User not found');

    const addresses = (user.addresses || []).filter(a => a.id !== addressId);
    if (addresses.length > 0 && !addresses.some(a => a.isDefault)) {
      addresses[0].isDefault = true;
    }
    await this.users.update(userId, { addresses });
    return { success: true };
  }

  _sanitizeUser(user) {
    const copy = { ...user };
    delete copy.passwordHash;
    return copy;
  }
}

module.exports = new AuthService();
