/**
 * Shopping Cart API Controller
 */

const cartService = require('../services/cart-service');
const { Security } = require('../core/security');

class CartController {
  _getIds(ctx) {
    const token = ctx.getAuthToken();
    let userId = null;
    if (token) {
      const payload = Security.verifyToken(token);
      if (payload) userId = payload.userId;
    }
    const sessionId = ctx.headers['x-session-id'] || ctx.query.sessionId || null;
    return { userId, sessionId };
  }

  async getCart(ctx) {
    const { userId, sessionId } = this._getIds(ctx);
    const cart = await cartService.getCart({ userId, sessionId });
    return ctx.json({ success: true, data: cart });
  }

  async addItem(ctx) {
    const { userId, sessionId } = this._getIds(ctx);
    const { productId, variantId, quantity } = ctx.body || {};

    if (!productId) {
      return ctx.status(400).json({ success: false, error: 'Product ID required' });
    }

    const cart = await cartService.addItem({
      userId,
      sessionId,
      productId,
      variantId,
      quantity: parseInt(quantity, 10) || 1
    });

    return ctx.json({ success: true, data: cart });
  }

  async updateItem(ctx) {
    const { userId, sessionId } = this._getIds(ctx);
    const itemId = ctx.params.id;
    const { quantity } = ctx.body || {};

    const cart = await cartService.updateItemQuantity({
      userId,
      sessionId,
      itemId,
      quantity: parseInt(quantity, 10)
    });

    return ctx.json({ success: true, data: cart });
  }

  async removeItem(ctx) {
    const { userId, sessionId } = this._getIds(ctx);
    const itemId = ctx.params.id;

    const cart = await cartService.removeItem({
      userId,
      sessionId,
      itemId
    });

    return ctx.json({ success: true, data: cart });
  }

  async applyCoupon(ctx) {
    const { userId, sessionId } = this._getIds(ctx);
    const { code } = ctx.body || {};

    const cart = await cartService.applyCoupon({
      userId,
      sessionId,
      code
    });

    return ctx.json({ success: true, data: cart });
  }

  async setShipping(ctx) {
    const { userId, sessionId } = this._getIds(ctx);
    const { shippingMethod } = ctx.body || {};

    const cart = await cartService.setShippingMethod({
      userId,
      sessionId,
      shippingMethod
    });

    return ctx.json({ success: true, data: cart });
  }
}

module.exports = new CartController();
