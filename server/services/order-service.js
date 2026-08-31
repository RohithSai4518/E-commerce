/**
 * Order Processing & Fulfillment Service
 * 
 * Implements an order state machine, stock locking, payment settlement simulation,
 * shipping manifest generation, and invoice formatting.
 */

const { db } = require('../db/database');
const pricingService = require('./pricing-service');
const productService = require('./product-service');
const cartService = require('./cart-service');
const { Security } = require('../core/security');
const { eventBus, EVENTS } = require('../core/event-bus');

class OrderService {
  constructor() {
    this.orders = db.collection('orders');
    this.coupons = db.collection('coupons');
  }

  /**
   * Create and place a new order
   */
  async createOrder({ userId = null, customer, shippingAddress, billingAddress, items, couponCode, shippingMethod, paymentMethod, paymentDetails }) {
    if (!items || items.length === 0) {
      const err = new Error('Cannot create an order with an empty item list');
      err.status = 400;
      throw err;
    }

    if (!customer || !customer.email || !customer.name) {
      const err = new Error('Customer contact details are required');
      err.status = 400;
      throw err;
    }

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.postalCode) {
      const err = new Error('Complete shipping address is required');
      err.status = 400;
      throw err;
    }

    // 1. Verify product availability & prices
    for (const item of items) {
      const product = await productService.getProductById(item.productId);
      if (!product) {
        throw new Error(`Product ${item.name || item.productId} no longer exists`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}`);
      }
    }

    // 2. Compute final audited totals
    const totals = await pricingService.calculateOrderSummary({
      items,
      couponCode,
      shippingMethod: shippingMethod || 'standard',
      destinationState: shippingAddress.state || 'CA'
    });

    // 3. Simulate payment transaction processing
    const paymentResult = this._processPayment(paymentMethod, totals.grandTotal, paymentDetails);

    // 4. Generate Order Reference
    const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const orderDoc = {
      orderNumber,
      userId: userId || null,
      customer: {
        name: Security.sanitize(customer.name),
        email: customer.email.toLowerCase().trim(),
        phone: Security.sanitize(customer.phone || '')
      },
      shippingAddress: {
        street: Security.sanitize(shippingAddress.street),
        city: Security.sanitize(shippingAddress.city),
        state: Security.sanitize(shippingAddress.state),
        postalCode: Security.sanitize(shippingAddress.postalCode),
        country: Security.sanitize(shippingAddress.country || 'US')
      },
      billingAddress: billingAddress ? {
        street: Security.sanitize(billingAddress.street),
        city: Security.sanitize(billingAddress.city),
        state: Security.sanitize(billingAddress.state),
        postalCode: Security.sanitize(billingAddress.postalCode),
        country: Security.sanitize(billingAddress.country || 'US')
      } : null,
      items: totals.verifiedItems || items,
      totals,
      payment: {
        method: paymentMethod || 'credit_card',
        status: paymentResult.status,
        transactionId: paymentResult.transactionId,
        paidAt: paymentResult.status === 'completed' ? new Date().toISOString() : null
      },
      status: paymentResult.status === 'completed' ? 'processing' : 'pending',
      tracking: {
        carrier: 'Standard Express Logistics',
        trackingNumber: `TRK-${Math.floor(100000000 + Math.random() * 900000000)}`,
        status: 'Order Placed',
        history: [
          {
            status: 'Order Placed',
            description: 'Order received and verified by system',
            timestamp: new Date().toISOString()
          }
        ]
      }
    };

    const newOrder = await this.orders.insert(orderDoc);

    // 5. Decrement inventory stock
    await productService.adjustStock(items, false);

    // 6. Update coupon usage
    if (couponCode) {
      const coupon = this.coupons.findOne({ code: couponCode.trim().toUpperCase() });
      if (coupon) {
        await this.coupons.update(coupon.id, { usageCount: (coupon.usageCount || 0) + 1 });
      }
    }

    // 7. Emit events
    eventBus.emit(EVENTS.ORDER_CREATED, { order: newOrder });
    if (newOrder.status === 'processing') {
      eventBus.emit(EVENTS.ORDER_PAID, { order: newOrder });
    }

    return newOrder;
  }

  /**
   * Get orders for a specific user
   */
  async getUserOrders(userId) {
    return this.orders.find({ userId }, { sort: { createdAt: -1 } });
  }

  /**
   * Get order by orderNumber or ID
   */
  async getOrder(orderIdOrNumber) {
    let order = this.orders.findById(orderIdOrNumber);
    if (!order) {
      order = this.orders.findOne({ orderNumber: orderIdOrNumber });
    }
    if (!order) {
      const err = new Error('Order not found');
      err.status = 404;
      throw err;
    }
    return order;
  }

  /**
   * Update order status (Admin fulfillment flow)
   */
  async updateOrderStatus(orderId, newStatus, trackingUpdate = null) {
    const order = await this.getOrder(orderId);
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid order status: ${newStatus}`);
    }

    const updates = { status: newStatus };
    const tracking = { ...(order.tracking || {}) };

    if (newStatus === 'shipped') {
      tracking.status = 'In Transit';
      tracking.history = tracking.history || [];
      tracking.history.push({
        status: 'In Transit',
        description: trackingUpdate || 'Package dispatched from primary fulfillment center',
        timestamp: new Date().toISOString()
      });
      updates.tracking = tracking;
      eventBus.emit(EVENTS.ORDER_FULFILLED, { order });
    } else if (newStatus === 'delivered') {
      tracking.status = 'Delivered';
      tracking.history = tracking.history || [];
      tracking.history.push({
        status: 'Delivered',
        description: trackingUpdate || 'Delivered to recipient address',
        timestamp: new Date().toISOString()
      });
      updates.tracking = tracking;
    } else if (newStatus === 'cancelled') {
      // Restock inventory if cancelled
      if (order.status !== 'cancelled') {
        await productService.adjustStock(order.items, true);
        eventBus.emit(EVENTS.ORDER_CANCELLED, { order });
      }
    }

    return this.orders.update(order.id, updates);
  }

  /**
   * Mock Payment Gateway Processor
   */
  _processPayment(method, amount, details = {}) {
    const transactionId = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (method === 'cod') {
      return {
        status: 'pending',
        transactionId,
        message: 'Cash on Delivery selected'
      };
    }

    // Simulate card validation
    if (method === 'credit_card' && details && details.cardNumber) {
      const cleanNum = details.cardNumber.replace(/\s+/g, '');
      if (cleanNum.endsWith('0000')) {
        const err = new Error('Card declined by issuing bank (Simulated test failure)');
        err.status = 402;
        throw err;
      }
    }

    return {
      status: 'completed',
      transactionId,
      message: 'Payment settled successfully'
    };
  }
}

module.exports = new OrderService();
