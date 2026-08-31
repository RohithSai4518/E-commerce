/**
 * Notification & Activity Logging Service
 * 
 * Subscribes to system EventBus events and handles:
 * - Transactional email simulations (Order confirmations, shipment tracking)
 * - Low-stock alerts
 * - Customer audit logs
 */

const { eventBus, EVENTS } = require('../core/event-bus');
const { db } = require('../db/database');

class NotificationService {
  constructor() {
    this.auditLogs = db.collection('audit_logs');
    this.setupListeners();
  }

  setupListeners() {
    // Listen for new orders
    eventBus.on(EVENTS.ORDER_CREATED, ({ order }) => {
      this.sendOrderConfirmationEmail(order);
      this.logActivity('ORDER_CREATED', `Order ${order.orderNumber} placed for $${order.totals.grandTotal}`, order.userId);
    });

    // Listen for order status transitions
    eventBus.on(EVENTS.ORDER_FULFILLED, ({ order }) => {
      this.sendShippingNotificationEmail(order);
      this.logActivity('ORDER_SHIPPED', `Order ${order.orderNumber} dispatched with tracking ${order.tracking?.trackingNumber}`, order.userId);
    });

    // Listen for stock warnings
    eventBus.on(EVENTS.STOCK_LOW, ({ product, remainingStock }) => {
      console.warn(`[Inventory Alert] Product "${product.name}" (SKU: ${product.sku}) has reached low stock: ${remainingStock} remaining.`);
      this.logActivity('STOCK_LOW', `Product ${product.name} has only ${remainingStock} units left.`);
    });
  }

  async sendOrderConfirmationEmail(order) {
    console.log(`[Email Simulator] -> Sent "Order Confirmation #${order.orderNumber}" to ${order.customer.email}`);
  }

  async sendShippingNotificationEmail(order) {
    console.log(`[Email Simulator] -> Sent "Your Order #${order.orderNumber} Has Shipped" to ${order.customer.email}`);
  }

  async logActivity(action, details, userId = null) {
    try {
      await this.auditLogs.insert({
        action,
        details,
        userId,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('[Audit Log Error]:', e.message);
    }
  }
}

module.exports = new NotificationService();
