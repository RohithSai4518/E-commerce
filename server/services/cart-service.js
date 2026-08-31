/**
 * Shopping Cart Management Service
 * 
 * Manages both guest session carts and authenticated persistent customer carts.
 * Supports line item modifications, variant selections, coupon assignment,
 * and live price recalculations.
 */

const { db } = require('../db/database');
const pricingService = require('./pricing-service');
const productService = require('./product-service');
const { Security } = require('../core/security');

class CartService {
  constructor() {
    this.carts = db.collection('carts');
  }

  /**
   * Get or initialize active cart by User ID or Session ID
   */
  async getCart({ userId = null, sessionId = null }) {
    let cart = null;

    if (userId) {
      cart = this.carts.findOne({ userId });
    } else if (sessionId) {
      cart = this.carts.findOne({ sessionId });
    }

    if (!cart) {
      cart = await this.carts.insert({
        userId: userId || null,
        sessionId: sessionId || Security.generateUuid(),
        items: [],
        couponCode: null,
        shippingMethod: 'standard'
      });
    }

    return this._hydrateCart(cart);
  }

  /**
   * Add or update an item in cart
   */
  async addItem({ userId, sessionId, productId, variantId, quantity = 1 }) {
    const cart = await this.getCart({ userId, sessionId });
    const product = await productService.getProductById(productId);

    if (!product) throw new Error('Product not found');
    if (product.stock < quantity) {
      const err = new Error(`Only ${product.stock} units available in stock`);
      err.status = 400;
      throw err;
    }

    const items = cart.items || [];
    const existingIndex = items.findIndex(i => i.productId === productId && i.variantId === variantId);

    if (existingIndex > -1) {
      const newQty = items[existingIndex].quantity + quantity;
      if (newQty > product.stock) {
        throw new Error(`Cannot add more than available stock (${product.stock})`);
      }
      items[existingIndex].quantity = newQty;
    } else {
      let selectedVariant = null;
      if (variantId && Array.isArray(product.variants)) {
        selectedVariant = product.variants.find(v => v.id === variantId);
      }

      items.push({
        id: Security.generateUuid(),
        productId: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        price: product.price,
        image: (product.images && product.images[0]) || '',
        variantId: variantId || null,
        variantName: selectedVariant ? selectedVariant.name : null,
        quantity: Math.max(1, quantity)
      });
    }

    await this.carts.update(cart.id, { items });
    return this.getCart({ userId, sessionId });
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity({ userId, sessionId, itemId, quantity }) {
    const cart = await this.getCart({ userId, sessionId });
    let items = cart.items || [];

    if (quantity <= 0) {
      items = items.filter(i => i.id !== itemId);
    } else {
      const item = items.find(i => i.id === itemId);
      if (item) {
        const product = await productService.getProductById(item.productId);
        if (product && quantity > product.stock) {
          throw new Error(`Only ${product.stock} units available`);
        }
        item.quantity = quantity;
      }
    }

    await this.carts.update(cart.id, { items });
    return this.getCart({ userId, sessionId });
  }

  /**
   * Remove item from cart
   */
  async removeItem({ userId, sessionId, itemId }) {
    const cart = await this.getCart({ userId, sessionId });
    const items = (cart.items || []).filter(i => i.id !== itemId);
    await this.carts.update(cart.id, { items });
    return this.getCart({ userId, sessionId });
  }

  /**
   * Apply coupon code
   */
  async applyCoupon({ userId, sessionId, code }) {
    const cart = await this.getCart({ userId, sessionId });
    const summary = await pricingService.calculateOrderSummary({
      items: cart.items,
      couponCode: code
    });

    if (code && !summary.appliedCoupon) {
      throw new Error('Coupon code is invalid or does not meet criteria');
    }

    await this.carts.update(cart.id, { couponCode: code ? code.trim().toUpperCase() : null });
    return this.getCart({ userId, sessionId });
  }

  /**
   * Set shipping method
   */
  async setShippingMethod({ userId, sessionId, shippingMethod }) {
    const cart = await this.getCart({ userId, sessionId });
    await this.carts.update(cart.id, { shippingMethod });
    return this.getCart({ userId, sessionId });
  }

  /**
   * Clear cart after checkout
   */
  async clearCart(cartId) {
    await this.carts.update(cartId, { items: [], couponCode: null });
  }

  /**
   * Merge guest session cart into user account cart upon login
   */
  async mergeCarts(userId, sessionId) {
    if (!userId || !sessionId) return;

    const guestCart = this.carts.findOne({ sessionId });
    if (!guestCart || !guestCart.items || guestCart.items.length === 0) return;

    const userCart = await this.getCart({ userId });
    const userItems = [...userCart.items];

    guestCart.items.forEach(guestItem => {
      const idx = userItems.findIndex(ui => ui.productId === guestItem.productId && ui.variantId === guestItem.variantId);
      if (idx > -1) {
        userItems[idx].quantity += guestItem.quantity;
      } else {
        userItems.push(guestItem);
      }
    });

    await this.carts.update(userCart.id, { items: userItems });
    await this.carts.delete(guestCart.id);
  }

  async _hydrateCart(cart) {
    const summary = await pricingService.calculateOrderSummary({
      items: cart.items || [],
      couponCode: cart.couponCode,
      shippingMethod: cart.shippingMethod || 'standard'
    });

    return {
      ...cart,
      summary
    };
  }
}

module.exports = new CartService();
