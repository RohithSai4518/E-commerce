/**
 * Product Recommendation Engine
 * 
 * Computes contextual product recommendations using:
 * - Content-based filtering (shared category, tags, price tier)
 * - Co-occurrence analysis ("Customers who bought this also bought...")
 * - Popularity & rating ranking
 */

const { db } = require('../db/database');

class RecommendationService {
  constructor() {
    this.products = db.collection('products');
    this.orders = db.collection('orders');
  }

  /**
   * Get related products for a given product ID
   */
  async getRelatedProducts(productId, limit = 4) {
    const targetProduct = this.products.findById(productId);
    if (!targetProduct) return [];

    const allProducts = this.products.find({ id: { $ne: productId } });
    const targetTags = new Set(targetProduct.tags || []);

    // Calculate affinity score
    const scored = allProducts.map(p => {
      let score = 0;

      // Same category (+5 points)
      if (p.category === targetProduct.category || p.categorySlug === targetProduct.categorySlug) {
        score += 5;
      }

      // Shared tags (+2 points each)
      if (Array.isArray(p.tags)) {
        p.tags.forEach(t => {
          if (targetTags.has(t)) score += 2;
        });
      }

      // Price similarity (within 30% range -> +2 points)
      const priceDiffRatio = Math.abs(p.price - targetProduct.price) / targetProduct.price;
      if (priceDiffRatio <= 0.3) {
        score += 2;
      }

      // Base rating weight
      score += (p.rating || 0) * 0.5;

      return { product: p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(item => item.product);
  }

  /**
   * "Frequently Bought Together" bundle suggestions
   */
  async getFrequentlyBoughtTogether(productId, limit = 3) {
    const orders = this.orders.find({});
    const coOccurrence = {};

    orders.forEach(order => {
      const items = order.items || [];
      const hasTarget = items.some(item => item.productId === productId);
      if (hasTarget) {
        items.forEach(item => {
          if (item.productId !== productId) {
            coOccurrence[item.productId] = (coOccurrence[item.productId] || 0) + 1;
          }
        });
      }
    });

    const sortedIds = Object.keys(coOccurrence).sort((a, b) => coOccurrence[b] - coOccurrence[a]);
    let recommended = sortedIds.map(id => this.products.findById(id)).filter(Boolean);

    // Fallback to related if insufficient order history
    if (recommended.length < limit) {
      const related = await this.getRelatedProducts(productId, limit - recommended.length);
      const existingIds = new Set(recommended.map(p => p.id));
      related.forEach(p => {
        if (!existingIds.has(p.id)) recommended.push(p);
      });
    }

    return recommended.slice(0, limit);
  }
}

module.exports = new RecommendationService();
