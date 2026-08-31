/**
 * Enterprise E-Commerce Main Server Application
 * 
 * Built with native Node.js standard libraries (http, fs, path, crypto, url).
 * Zero external packages or frameworks.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const Router = require('./core/router');
const HttpContext = require('./core/http-context');
const { db } = require('./db/database');
const { seedDatabase } = require('./db/seeder');
const { rateLimiter } = require('./core/security');

// Controllers & Middlewares
const { authController, authenticate, requireAdmin } = require('./controllers/auth-controller');
const productController = require('./controllers/product-controller');
const cartController = require('./controllers/cart-controller');
const orderController = require('./controllers/order-controller');
const adminController = require('./controllers/admin-controller');
const reviewService = require('./services/review-service');
require('./services/notification-service'); // Initialize event listeners

const router = new Router();

// 1. Global CORS Middleware
router.use(async (ctx, next) => {
  ctx.setHeader('Access-Control-Allow-Origin', '*');
  ctx.setHeader('Access-Control-Allow-Methods', config.server.cors.allowedMethods.join(', '));
  ctx.setHeader('Access-Control-Allow-Headers', config.server.cors.allowedHeaders.join(', '));
  ctx.setHeader('Access-Control-Max-Age', '86400');
  
  if (ctx.method === 'OPTIONS') {
    return ctx.status(204).end();
  }
  await next();
});

// 2. Global Rate Limiter Middleware
router.use(async (ctx, next) => {
  const clientIp = ctx.headers['x-forwarded-for'] || ctx.req.socket.remoteAddress || '127.0.0.1';
  if (!rateLimiter.check(clientIp)) {
    return ctx.status(429).json({
      success: false,
      error: 'Too many requests. Please slow down and try again shortly.'
    });
  }
  await next();
});

// 3. Request Body Parser Middleware
router.use(async (ctx, next) => {
  if (ctx.pathname.startsWith('/api/')) {
    await ctx.parseBody();
  }
  await next();
});

// --- API ROUTES ---

// Auth Endpoints
router.post('/api/auth/register', (ctx) => authController.register(ctx));
router.post('/api/auth/login', (ctx) => authController.login(ctx));
router.get('/api/auth/me', authenticate, (ctx) => authController.getCurrentUser(ctx));
router.put('/api/auth/profile', authenticate, (ctx) => authController.updateProfile(ctx));
router.post('/api/auth/addresses', authenticate, (ctx) => authController.addAddress(ctx));
router.delete('/api/auth/addresses/:id', authenticate, (ctx) => authController.deleteAddress(ctx));

// Product Catalog & Category Endpoints
router.get('/api/products', (ctx) => productController.getProducts(ctx));
router.get('/api/products/featured', (ctx) => productController.getFeatured(ctx));
router.get('/api/products/:id', (ctx) => productController.getProductById(ctx));
router.get('/api/products/slug/:slug', (ctx) => productController.getProductBySlug(ctx));
router.get('/api/products/:id/recommendations', (ctx) => productController.getRecommendations(ctx));
router.get('/api/products/:id/reviews', (ctx) => productController.getReviews(ctx));
router.post('/api/products/:id/reviews', authenticate, (ctx) => productController.submitReview(ctx));
router.post('/api/reviews/:id/vote', (ctx) => reviewService.voteHelpful(ctx.params.id).then(r => ctx.json({ success: true, data: r })));
router.get('/api/categories', (ctx) => productController.getCategories(ctx));

// Cart Endpoints
router.get('/api/cart', (ctx) => cartController.getCart(ctx));
router.post('/api/cart/items', (ctx) => cartController.addItem(ctx));
router.put('/api/cart/items/:id', (ctx) => cartController.updateItem(ctx));
router.delete('/api/cart/items/:id', (ctx) => cartController.removeItem(ctx));
router.post('/api/cart/coupon', (ctx) => cartController.applyCoupon(ctx));
router.post('/api/cart/shipping', (ctx) => cartController.setShipping(ctx));

// Order Endpoints
router.post('/api/orders', (ctx) => orderController.createOrder(ctx));
router.get('/api/orders/:id', (ctx) => orderController.getOrderById(ctx));
router.get('/api/orders/user/my-orders', authenticate, (ctx) => orderController.getMyOrders(ctx));

// Admin Endpoints (Guarded with authenticate & requireAdmin)
router.get('/api/admin/analytics', authenticate, requireAdmin, (ctx) => adminController.getAnalytics(ctx));
router.get('/api/admin/orders', authenticate, requireAdmin, (ctx) => adminController.getOrders(ctx));
router.patch('/api/admin/orders/:id/status', authenticate, requireAdmin, (ctx) => adminController.updateOrderStatus(ctx));
router.get('/api/admin/products', authenticate, requireAdmin, (ctx) => adminController.getProducts(ctx));
router.post('/api/admin/products', authenticate, requireAdmin, (ctx) => adminController.createProduct(ctx));
router.put('/api/admin/products/:id', authenticate, requireAdmin, (ctx) => adminController.updateProduct(ctx));
router.delete('/api/admin/products/:id', authenticate, requireAdmin, (ctx) => adminController.deleteProduct(ctx));
router.get('/api/admin/coupons', authenticate, requireAdmin, (ctx) => adminController.getCoupons(ctx));
router.post('/api/admin/coupons', authenticate, requireAdmin, (ctx) => adminController.createCoupon(ctx));
router.get('/api/admin/audit-logs', authenticate, requireAdmin, (ctx) => adminController.getAuditLogs(ctx));

// 4. Static Asset Server & SPA Fallback Handler
const publicDir = config.paths.publicDir;

async function handleStaticOrSPA(ctx) {
  const reqPath = ctx.pathname;
  let targetPath = path.join(publicDir, reqPath === '/' ? 'index.html' : reqPath);

  // Check if file exists in public directory
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
    return ctx.serveFile(targetPath);
  }

  // SPA fallback for HTML routes (non-API)
  const indexHtml = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return ctx.serveFile(indexHtml);
  }

  return ctx.status(404).text('Not Found');
}

// Create Native HTTP Server
const server = http.createServer(async (req, res) => {
  const ctx = new HttpContext(req, res);

  // If path starts with /api/, route to router
  if (ctx.pathname.startsWith('/api/')) {
    await router.handle(ctx);
  } else {
    // Serve static files or SPA shell
    await handleStaticOrSPA(ctx);
  }
});

// Bootstrapping
async function start() {
  await db.load();
  await seedDatabase();

  server.listen(config.server.port, config.server.host, () => {
    console.log('====================================================');
    console.log(`🚀 E-Commerce Platform Server Live`);
    console.log(`📡 URL: http://${config.server.host}:${config.server.port}`);
    console.log(`🔒 Environment: ${config.server.environment}`);
    console.log(`⚡ Zero external dependencies (Pure Vanilla Node.js standard library)`);
    console.log('====================================================');
  });
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n[Server] Gracefully persisting database and shutting down...');
  await db.persist();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await db.persist();
  process.exit(0);
});

if (require.main === module) {
  start().catch(err => {
    console.error('[Fatal Startup Error]:', err);
  });
}

module.exports = { server, start, router };
