/**
 * Database Schema & Validator Specifications
 * 
 * Defines collection structures, mandatory fields, type checkers,
 * and uniqueness constraints for the e-commerce engine.
 */

const SCHEMAS = {
  users: {
    name: 'users',
    primaryKey: 'id',
    indexes: ['email', 'role'],
    unique: ['email'],
    validate: (doc) => {
      if (!doc.email || !doc.email.includes('@')) throw new Error('Valid email is required');
      if (!doc.passwordHash) throw new Error('Password hash is required');
      if (!doc.name) throw new Error('Name is required');
      if (!['customer', 'admin', 'moderator'].includes(doc.role || 'customer')) {
        throw new Error('Invalid role');
      }
      return true;
    }
  },

  products: {
    name: 'products',
    primaryKey: 'id',
    indexes: ['category', 'slug', 'status', 'featured'],
    unique: ['slug', 'sku'],
    validate: (doc) => {
      if (!doc.name) throw new Error('Product name is required');
      if (!doc.slug) throw new Error('Product slug is required');
      if (!doc.sku) throw new Error('Product SKU is required');
      if (typeof doc.price !== 'number' || doc.price < 0) throw new Error('Valid price is required');
      if (!doc.category) throw new Error('Category is required');
      return true;
    }
  },

  categories: {
    name: 'categories',
    primaryKey: 'id',
    indexes: ['slug'],
    unique: ['slug'],
    validate: (doc) => {
      if (!doc.name) throw new Error('Category name is required');
      if (!doc.slug) throw new Error('Category slug is required');
      return true;
    }
  },

  carts: {
    name: 'carts',
    primaryKey: 'id',
    indexes: ['userId', 'sessionId'],
    validate: (doc) => {
      if (!Array.isArray(doc.items)) throw new Error('Cart items array required');
      return true;
    }
  },

  orders: {
    name: 'orders',
    primaryKey: 'id',
    indexes: ['userId', 'orderNumber', 'status', 'createdAt'],
    unique: ['orderNumber'],
    validate: (doc) => {
      if (!doc.orderNumber) throw new Error('Order number is required');
      if (!doc.customer || !doc.customer.email) throw new Error('Customer information is required');
      if (!Array.isArray(doc.items) || doc.items.length === 0) throw new Error('Order items required');
      if (typeof doc.totals?.grandTotal !== 'number') throw new Error('Grand total required');
      return true;
    }
  },

  reviews: {
    name: 'reviews',
    primaryKey: 'id',
    indexes: ['productId', 'userId', 'rating'],
    validate: (doc) => {
      if (!doc.productId) throw new Error('Product ID is required');
      if (!doc.userId) throw new Error('User ID is required');
      if (typeof doc.rating !== 'number' || doc.rating < 1 || doc.rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }
      if (!doc.comment || doc.comment.trim().length === 0) {
        throw new Error('Review comment is required');
      }
      return true;
    }
  },

  coupons: {
    name: 'coupons',
    primaryKey: 'id',
    indexes: ['code', 'isActive'],
    unique: ['code'],
    validate: (doc) => {
      if (!doc.code) throw new Error('Coupon code is required');
      if (!['percentage', 'fixed', 'free_shipping'].includes(doc.discountType)) {
        throw new Error('Invalid discount type');
      }
      if (typeof doc.discountValue !== 'number' || doc.discountValue <= 0) {
        throw new Error('Valid discount value required');
      }
      return true;
    }
  },

  audit_logs: {
    name: 'audit_logs',
    primaryKey: 'id',
    indexes: ['action', 'userId', 'timestamp'],
    validate: (doc) => {
      if (!doc.action) throw new Error('Action is required');
      return true;
    }
  }
};

module.exports = { SCHEMAS };
