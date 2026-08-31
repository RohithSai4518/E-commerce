/**
 * Application Configuration Module
 * 
 * Centralized configuration settings for server environment, security parameters,
 * database persistence paths, business logic constants, and session management.
 * Built strictly with zero external dependencies using vanilla JavaScript.
 */

const path = require('path');

const config = {
  // Server networking
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '127.0.0.1',
    environment: process.env.NODE_ENV || 'development',
    cors: {
      allowedOrigins: ['*'],
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID', 'X-CSRF-Token'],
      allowCredentials: true,
      maxAge: 86400
    }
  },

  // Security and Cryptography
  security: {
    tokenSecret: process.env.TOKEN_SECRET || 'commerce_system_token_signing_secret_key_987654321',
    tokenExpirySeconds: 86400 * 7, // 7 days
    passwordHashIterations: 10000,
    passwordKeyLength: 64,
    passwordDigest: 'sha512',
    rateLimit: {
      windowMs: 60 * 1000, // 1 minute window
      maxRequests: 300,    // max 300 requests per IP per window
    },
    enableCsrf: false
  },

  // Database Persistence
  database: {
    storageDir: path.join(__dirname, '..', 'data'),
    dataFile: path.join(__dirname, '..', 'data', 'store.json'),
    walFile: path.join(__dirname, '..', 'data', 'store.wal'),
    autoSaveIntervalMs: 10000, // 10 seconds flush
    enableWal: true
  },

  // E-Commerce Business Logic Defaults
  commerce: {
    currency: {
      code: 'USD',
      symbol: '$',
      decimalPlaces: 2
    },
    taxRate: 0.0825, // 8.25% default sales tax
    shipping: {
      freeShippingThreshold: 75.00,
      standardRate: 5.99,
      expressRate: 14.99,
      overnightRate: 24.99
    },
    inventory: {
      lowStockThreshold: 5,
      outOfStockReserveTimeoutMinutes: 15
    },
    pagination: {
      defaultPageSize: 12,
      maxPageSize: 50
    }
  },

  // Asset Directories
  paths: {
    publicDir: path.join(__dirname, '..', 'public')
  }
};

module.exports = config;
