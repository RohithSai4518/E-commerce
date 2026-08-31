/**
 * Product Catalog & Inventory Service
 * 
 * Manages product lifecycle, categories, stock tracking, variant lookups,
 * and administrative catalog mutations.
 */

const { db } = require('../db/database');
const { Security } = require('../core/security');
const { eventBus, EVENTS } = require('../core/event-bus');
const config = require('../config');

class ProductService {
  constructor() {
    this.products = db.collection('products');
    this.categories = db.collection('categories');
  }

  /**
   * Get all categories
   */
  async getCategories() {
    return this.categories.find({}, { sort: { name: 1 } });
  }

  /**
   * Get product by ID
   */
  async getProductById(id) {
    const product = this.products.findById(id);
    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }
    return product;
  }

  /**
   * Get product by Slug
   */
  async getProductBySlug(slug) {
    const product = this.products.findOne({ slug });
    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }
    return product;
  }

  /**
   * Get featured products for homepage
   */
  async getFeaturedProducts(limit = 8) {
    return this.products.find({ isFeatured: true }, { limit, sort: { rating: -1 } });
  }

  /**
   * Decrement stock for purchased items atomically
   */
  async adjustStock(items, isIncrement = false) {
    for (const item of items) {
      const product = this.products.findById(item.productId);
      if (!product) continue;

      const qtyChange = isIncrement ? item.quantity : -item.quantity;
      const newStock = Math.max(0, (product.stock || 0) + qtyChange);

      await this.products.update(item.productId, { stock: newStock });

      if (newStock === 0) {
        eventBus.emit(EVENTS.STOCK_DEPLETED, { product });
      } else if (newStock <= config.commerce.inventory.lowStockThreshold) {
        eventBus.emit(EVENTS.STOCK_LOW, { product, remainingStock: newStock });
      }
    }
  }

  /**
   * Admin: Create product
   */
  async createProduct(productData) {
    const slug = (productData.slug || productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    const sku = productData.sku || `SKU-${Date.now().toString(36).toUpperCase()}`;

    const newProduct = await this.products.insert({
      ...productData,
      slug,
      sku,
      rating: 0,
      reviewCount: 0,
      stock: parseInt(productData.stock, 10) || 0,
      price: parseFloat(productData.price) || 0.0,
      compareAtPrice: productData.compareAtPrice ? parseFloat(productData.compareAtPrice) : null,
      isFeatured: !!productData.isFeatured,
      images: Array.isArray(productData.images) ? productData.images : [productData.images || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'],
      specifications: productData.specifications || {},
      tags: Array.isArray(productData.tags) ? productData.tags : [],
      variants: Array.isArray(productData.variants) ? productData.variants : []
    });

    return newProduct;
  }

  /**
   * Admin: Update product
   */
  async updateProduct(id, updates) {
    const existing = this.products.findById(id);
    if (!existing) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }

    if (updates.price !== undefined) updates.price = parseFloat(updates.price);
    if (updates.stock !== undefined) updates.stock = parseInt(updates.stock, 10);
    if (updates.compareAtPrice !== undefined) {
      updates.compareAtPrice = updates.compareAtPrice ? parseFloat(updates.compareAtPrice) : null;
    }

    return this.products.update(id, updates);
  }

  /**
   * Admin: Delete product
   */
  async deleteProduct(id) {
    const existing = this.products.findById(id);
    if (!existing) throw new Error('Product not found');
    return this.products.delete(id);
  }
}

module.exports = new ProductService();
