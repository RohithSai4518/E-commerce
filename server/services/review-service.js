/**
 * Customer Review & Rating Service
 * 
 * Manages customer reviews, verified purchase status checking,
 * dynamic rating aggregation and sentiment calculations.
 */

const { db } = require('../db/database');
const { Security } = require('../core/security');
const { eventBus, EVENTS } = require('../core/event-bus');

class ReviewService {
  constructor() {
    this.reviews = db.collection('reviews');
    this.products = db.collection('products');
    this.orders = db.collection('orders');
  }

  /**
   * Get reviews for a specific product with rating summary
   */
  async getProductReviews(productId) {
    const reviews = this.reviews.find({ productId }, { sort: { createdAt: -1 } });

    // Calculate rating breakdown
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalScore = 0;

    reviews.forEach(r => {
      const rating = Math.min(5, Math.max(1, Math.round(r.rating)));
      distribution[rating] = (distribution[rating] || 0) + 1;
      totalScore += r.rating;
    });

    const averageRating = reviews.length > 0 ? Math.round((totalScore / reviews.length) * 10) / 10 : 0;

    return {
      reviews,
      summary: {
        totalReviews: reviews.length,
        averageRating,
        distribution
      }
    };
  }

  /**
   * Submit a new customer review
   */
  async createReview({ productId, userId, userName, rating, title, comment }) {
    const product = this.products.findById(productId);
    if (!product) throw new Error('Product not found');

    // Check if user already reviewed this product
    const existing = this.reviews.findOne({ productId, userId });
    if (existing) {
      const err = new Error('You have already submitted a review for this product');
      err.status = 400;
      throw err;
    }

    // Check if verified purchase
    const userOrders = this.orders.find({ userId });
    const verifiedPurchase = userOrders.some(order => 
      order.items && order.items.some(item => item.productId === productId)
    );

    const numRating = Math.min(5, Math.max(1, parseInt(rating, 10) || 5));

    const newReview = await this.reviews.insert({
      productId,
      userId,
      userName: Security.sanitize(userName || 'Anonymous Buyer'),
      rating: numRating,
      title: Security.sanitize(title || ''),
      comment: Security.sanitize(comment.trim()),
      verifiedPurchase,
      helpfulVotes: 0,
      createdAt: new Date().toISOString()
    });

    // Update product rating and review count
    const allReviews = this.reviews.find({ productId });
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await this.products.update(productId, {
      rating: Math.round(avg * 10) / 10,
      reviewCount: allReviews.length
    });

    eventBus.emit(EVENTS.REVIEW_SUBMITTED, { review: newReview });
    return newReview;
  }

  /**
   * Upvote a review's helpfulness
   */
  async voteHelpful(reviewId) {
    const review = this.reviews.findById(reviewId);
    if (!review) throw new Error('Review not found');

    const updated = await this.reviews.update(reviewId, {
      helpfulVotes: (review.helpfulVotes || 0) + 1
    });

    return updated;
  }
}

module.exports = new ReviewService();
