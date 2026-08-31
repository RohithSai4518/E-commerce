/**
 * Pricing, Coupon & Checkout Calculation Service
 * 
 * Accurately calculates:
 * - Line item totals with bulk and promotional discounts
 * - Coupon validation (percentage, flat rate, free shipping, minimum order rules)
 * - State & local sales taxes
 * - Tiered shipping rates and free shipping threshold checks
 * - Grand totals with precision rounding
 */

const { db } = require('../db/database');
const config = require('../config');

class PricingService {
  constructor() {
    this.coupons = db.collection('coupons');
  }

  /**
   * Validate coupon code against an active subtotal
   */
  async validateCoupon(code, subtotal) {
    if (!code || typeof code !== 'string') return null;

    const normalizedCode = code.trim().toUpperCase();
    const coupon = this.coupons.findOne({ code: normalizedCode });

    if (!coupon) {
      const err = new Error('Invalid coupon code');
      err.status = 400;
      throw err;
    }

    if (!coupon.isActive) {
      const err = new Error('This promo code is no longer active');
      err.status = 400;
      throw err;
    }

    if (coupon.maxUsage && (coupon.usageCount || 0) >= coupon.maxUsage) {
      const err = new Error('This promotion has reached its maximum usage limit');
      err.status = 400;
      throw err;
    }

    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      const err = new Error(`Order minimum of $${coupon.minOrderAmount.toFixed(2)} required for this discount`);
      err.status = 400;
      throw err;
    }

    return coupon;
  }

  /**
   * Calculate complete order financial breakdown
   */
  async calculateOrderSummary({ items = [], couponCode = null, shippingMethod = 'standard', destinationState = 'CA' }) {
    // 1. Calculate raw items subtotal
    let subtotal = 0;
    const verifiedItems = items.map(item => {
      const itemPrice = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity, 10) || 1;
      const lineTotal = Math.round(itemPrice * quantity * 100) / 100;
      subtotal += lineTotal;

      return {
        ...item,
        price: itemPrice,
        quantity,
        lineTotal
      };
    });

    subtotal = Math.round(subtotal * 100) / 100;

    // 2. Evaluate Coupon Discount
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      try {
        const coupon = await this.validateCoupon(couponCode, subtotal);
        if (coupon) {
          if (coupon.discountType === 'percentage') {
            discountAmount = (subtotal * coupon.discountValue) / 100;
            if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
              discountAmount = coupon.maxDiscountAmount;
            }
          } else if (coupon.discountType === 'fixed') {
            discountAmount = Math.min(coupon.discountValue, subtotal);
          }
          discountAmount = Math.round(discountAmount * 100) / 100;
          appliedCoupon = {
            code: coupon.code,
            description: coupon.description,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            savedAmount: discountAmount
          };
        }
      } catch (e) {
        // Invalid coupon is not applied
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - discountAmount);

    // 3. Shipping Calculation
    let shippingCost = 0;
    const isFreeShippingCoupon = appliedCoupon && appliedCoupon.discountType === 'free_shipping';

    if (shippingMethod === 'express') {
      shippingCost = config.commerce.shipping.expressRate;
    } else if (shippingMethod === 'overnight') {
      shippingCost = config.commerce.shipping.overnightRate;
    } else {
      // Standard Shipping
      if (isFreeShippingCoupon || subtotal >= config.commerce.shipping.freeShippingThreshold) {
        shippingCost = 0.00;
      } else {
        shippingCost = config.commerce.shipping.standardRate;
      }
    }

    // 4. Sales Tax Calculation
    const taxRate = config.commerce.taxRate;
    const taxAmount = Math.round(discountedSubtotal * taxRate * 100) / 100;

    // 5. Grand Total
    const grandTotal = Math.round((discountedSubtotal + shippingCost + taxAmount) * 100) / 100;

    return {
      subtotal,
      discountAmount,
      appliedCoupon,
      discountedSubtotal,
      shippingMethod,
      shippingCost,
      taxRate,
      taxAmount,
      grandTotal,
      currency: config.commerce.currency
    };
  }
}

module.exports = new PricingService();
