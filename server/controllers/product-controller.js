/**
 * Product & Catalog API Controller
 */

const productService = require('../services/product-service');
const searchService = require('../services/search-service');
const recommendationService = require('../services/recommendation-service');
const reviewService = require('../services/review-service');

class ProductController {
  async getProducts(ctx) {
    const results = await searchService.search(ctx.query);
    return ctx.json({ success: true, data: results });
  }

  async getFeatured(ctx) {
    const limit = parseInt(ctx.query.limit, 10) || 8;
    const products = await productService.getFeaturedProducts(limit);
    return ctx.json({ success: true, data: products });
  }

  async getCategories(ctx) {
    const categories = await productService.getCategories();
    return ctx.json({ success: true, data: categories });
  }

  async getProductById(ctx) {
    const product = await productService.getProductById(ctx.params.id);
    return ctx.json({ success: true, data: product });
  }

  async getProductBySlug(ctx) {
    const product = await productService.getProductBySlug(ctx.params.slug);
    return ctx.json({ success: true, data: product });
  }

  async getRecommendations(ctx) {
    const productId = ctx.params.id;
    const related = await recommendationService.getRelatedProducts(productId, 4);
    const bundle = await recommendationService.getFrequentlyBoughtTogether(productId, 3);

    return ctx.json({
      success: true,
      data: {
        related,
        frequentlyBoughtTogether: bundle
      }
    });
  }

  async getReviews(ctx) {
    const reviewsData = await reviewService.getProductReviews(ctx.params.id);
    return ctx.json({ success: true, data: reviewsData });
  }

  async submitReview(ctx) {
    const productId = ctx.params.id;
    const { rating, title, comment } = ctx.body || {};
    const review = await reviewService.createReview({
      productId,
      userId: ctx.user.userId,
      userName: ctx.user.name,
      rating,
      title,
      comment
    });

    return ctx.status(201).json({ success: true, data: review });
  }
}

module.exports = new ProductController();
