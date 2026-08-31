/**
 * Administrative Management & Analytics Controller
 */

const analyticsService = require('../services/analytics-service');
const productService = require('../services/product-service');
const orderService = require('../services/order-service');
const { db } = require('../db/database');

class AdminController {
  async getAnalytics(ctx) {
    const data = await analyticsService.getDashboardSummary();
    return ctx.json({ success: true, data });
  }

  async getOrders(ctx) {
    const orders = db.collection('orders').find({}, { sort: { createdAt: -1 } });
    return ctx.json({ success: true, data: orders });
  }

  async updateOrderStatus(ctx) {
    const orderId = ctx.params.id;
    const { status, trackingMessage } = ctx.body || {};
    const updated = await orderService.updateOrderStatus(orderId, status, trackingMessage);
    return ctx.json({ success: true, data: updated });
  }

  async getProducts(ctx) {
    const products = db.collection('products').find({}, { sort: { createdAt: -1 } });
    return ctx.json({ success: true, data: products });
  }

  async createProduct(ctx) {
    const product = await productService.createProduct(ctx.body || {});
    return ctx.status(201).json({ success: true, data: product });
  }

  async updateProduct(ctx) {
    const product = await productService.updateProduct(ctx.params.id, ctx.body || {});
    return ctx.json({ success: true, data: product });
  }

  async deleteProduct(ctx) {
    await productService.deleteProduct(ctx.params.id);
    return ctx.json({ success: true, message: 'Product deleted successfully' });
  }

  async getCoupons(ctx) {
    const coupons = db.collection('coupons').find({});
    return ctx.json({ success: true, data: coupons });
  }

  async createCoupon(ctx) {
    const coupon = await db.collection('coupons').insert(ctx.body || {});
    return ctx.status(201).json({ success: true, data: coupon });
  }

  async getAuditLogs(ctx) {
    const logs = db.collection('audit_logs').find({}, { sort: { timestamp: -1 }, limit: 50 });
    return ctx.json({ success: true, data: logs });
  }
}

module.exports = new AdminController();
