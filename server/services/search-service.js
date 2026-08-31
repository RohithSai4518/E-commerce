/**
 * Search & Faceted Filtering Engine
 * 
 * Provides high-speed querying across catalog with support for:
 * - Full-text and keyword fuzzy token matching
 * - Multi-category selection and category slug filtering
 * - Min/Max price bounds and in-stock filter
 * - Rating threshold filtering
 * - Dynamic sorting (relevance, price-asc, price-desc, newest, rating)
 * - Result aggregation metadata (price ranges, categories with counts)
 */

const { db } = require('../db/database');
const config = require('../config');

class SearchService {
  constructor() {
    this.products = db.collection('products');
    this.categories = db.collection('categories');
  }

  /**
   * Search and filter product catalog
   */
  async search(params = {}) {
    const {
      q = '',
      category = '',
      minPrice,
      maxPrice,
      minRating,
      inStockOnly,
      featuredOnly,
      sortBy = 'featured',
      page = 1,
      limit = config.commerce.pagination.defaultPageSize
    } = params;

    const allProducts = this.products.find({});
    let results = [...allProducts];

    // 1. Text Search Query Matching
    if (q && q.trim()) {
      const tokens = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
      results = results.filter(product => {
        const searchText = `${product.name} ${product.description || ''} ${(product.tags || []).join(' ')} ${product.sku || ''}`.toLowerCase();
        // Check if any token matches
        return tokens.every(token => searchText.includes(token));
      });
    }

    // 2. Category Filter
    if (category) {
      const catSlugs = category.split(',').map(s => s.trim().toLowerCase());
      results = results.filter(p => 
        catSlugs.includes((p.categorySlug || '').toLowerCase()) || 
        catSlugs.includes(p.category)
      );
    }

    // 3. Price Range Filter
    if (minPrice !== undefined && minPrice !== '') {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) results = results.filter(p => p.price >= min);
    }
    if (maxPrice !== undefined && maxPrice !== '') {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) results = results.filter(p => p.price <= max);
    }

    // 4. Rating Threshold
    if (minRating !== undefined && minRating !== '') {
      const rating = parseFloat(minRating);
      if (!isNaN(rating)) results = results.filter(p => (p.rating || 0) >= rating);
    }

    // 5. In Stock Only
    if (inStockOnly === 'true' || inStockOnly === true) {
      results = results.filter(p => (p.stock || 0) > 0);
    }

    // 6. Featured Only
    if (featuredOnly === 'true' || featuredOnly === true) {
      results = results.filter(p => !!p.isFeatured);
    }

    // Compute Facet Aggregations before pagination
    const facets = this._computeFacets(allProducts, results);

    // 7. Sorting
    switch (sortBy) {
      case 'price-asc':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        results.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case 'featured':
      default:
        results.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || (b.rating || 0) - (a.rating || 0));
        break;
    }

    // 8. Pagination
    const totalItems = results.length;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(config.commerce.pagination.maxPageSize, Math.max(1, parseInt(limit, 10) || config.commerce.pagination.defaultPageSize));
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const startIndex = (pageNum - 1) * pageSize;
    const paginatedItems = results.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      pagination: {
        totalItems,
        totalPages,
        currentPage: pageNum,
        pageSize,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      facets
    };
  }

  _computeFacets(allProducts, currentFiltered) {
    const categories = this.categories.find({});
    const categoryCounts = {};
    
    currentFiltered.forEach(p => {
      const catKey = p.categorySlug || p.category;
      if (catKey) {
        categoryCounts[catKey] = (categoryCounts[catKey] || 0) + 1;
      }
    });

    const categoryFacets = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      count: categoryCounts[cat.slug] || categoryCounts[cat.id] || 0
    }));

    const prices = allProducts.map(p => p.price);
    const minPrice = prices.length ? Math.floor(Math.min(...prices)) : 0;
    const maxPrice = prices.length ? Math.ceil(Math.max(...prices)) : 1000;

    return {
      categories: categoryFacets,
      priceRange: { min: minPrice, max: maxPrice }
    };
  }
}

module.exports = new SearchService();
