/**
 * Order & Checkout API Controller
 */

const orderService = require('../services/order-service');
const { Security } = require('../core/security');

class OrderController {
  _getUserId(ctx) {
    const token = ctx.getAuthToken();
    if (token) {
      const payload = Security.verifyToken(token);
      if (payload) return payload.userId;
    }
    return null;
  }

  async createOrder(ctx) {
    const userId = this._getUserId(ctx);
    const { customer, shippingAddress, billingAddress, items, couponCode, shippingMethod, paymentMethod, paymentDetails } = ctx.body || {};

    const order = await orderService.createOrder({
      userId,
      customer,
      shippingAddress,
      billingAddress,
      items,
      couponCode,
      shippingMethod,
      paymentMethod,
      paymentDetails
    });

    return ctx.status(201).json({ success: true, data: order });
  }

  async getMyOrders(ctx) {
    const userId = ctx.user.userId;
    const orders = await orderService.getUserOrders(userId);
    return ctx.json({ success: true, data: orders });
  }

  async getOrderById(ctx) {
    const order = await orderService.getOrder(ctx.params.id);
    return ctx.json({ success: true, data: order });
  }
}

module.exports = new OrderController();
