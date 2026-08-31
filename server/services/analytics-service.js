/**
 * Analytics & Business Intelligence Service
 * 
 * Computes live operational metrics for the administrative dashboard:
 * - Gross Revenue, Net Revenue, Taxes, Shipping Fees
 * - Order volume and Average Order Value (AOV)
 * - Sales distribution by category
 * - Inventory health and low stock warnings
 * - 7-day revenue trend data for charts
 */

const { db } = require('../db/database');
const config = require('../config');

class AnalyticsService {
  constructor() {
    this.orders = db.collection('orders');
    this.products = db.collection('products');
    this.categories = db.collection('categories');
    this.users = db.collection('users');
  }

  /**
   * Get administrative summary dashboard metrics
   */
  async getDashboardSummary() {
    const orders = this.orders.find({});
    const products = this.products.find({});
    const users = this.users.find({});
    const categories = this.categories.find({});

    let totalRevenue = 0;
    let totalTaxCollected = 0;
    let totalShippingCollected = 0;
    let totalDiscountsGiven = 0;
    let successfulOrders = 0;

    const categorySales = {};
    const dailyRevenueMap = {};

    // Initialize 7 days history
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateKey = d.toISOString().split('T')[0];
      dailyRevenueMap[dateKey] = 0;
    }

    orders.forEach(order => {
      if (order.status !== 'cancelled') {
        const grandTotal = order.totals?.grandTotal || 0;
        totalRevenue += grandTotal;
        totalTaxCollected += order.totals?.taxAmount || 0;
        totalShippingCollected += order.totals?.shippingCost || 0;
        totalDiscountsGiven += order.totals?.discountAmount || 0;
        successfulOrders++;

        // Day revenue
        const orderDate = (order.createdAt || '').split('T')[0];
        if (dailyRevenueMap[orderDate] !== undefined) {
          dailyRevenueMap[orderDate] += grandTotal;
        }

        // Category breakdown
        if (Array.isArray(order.items)) {
          order.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            const cat = product?.categorySlug || 'other';
            categorySales[cat] = (categorySales[cat] || 0) + (item.lineTotal || (item.price * item.quantity));
          });
        }
      }
    });

    const averageOrderValue = successfulOrders > 0 ? Math.round((totalRevenue / successfulOrders) * 100) / 100 : 0;

    // Inventory Health
    const lowStockThreshold = config.commerce.inventory.lowStockThreshold;
    const lowStockProducts = products.filter(p => (p.stock || 0) <= lowStockThreshold && (p.stock || 0) > 0);
    const outOfStockProducts = products.filter(p => (p.stock || 0) === 0);

    // Sales by Category Chart Data
    const categoryChartData = categories.map(cat => ({
      name: cat.name,
      slug: cat.slug,
      sales: Math.round((categorySales[cat.slug] || 0) * 100) / 100
    }));

    // Daily Sales Chart Data
    const revenueTimeline = Object.entries(dailyRevenueMap).map(([date, revenue]) => ({
      date,
      revenue: Math.round(revenue * 100) / 100
    }));

    return {
      kpis: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders: orders.length,
        successfulOrders,
        averageOrderValue,
        totalCustomers: users.filter(u => u.role === 'customer').length,
        totalProducts: products.length,
        totalDiscountsGiven: Math.round(totalDiscountsGiven * 100) / 100
      },
      inventory: {
        totalSKUs: products.length,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        lowStockItems: lowStockProducts.map(p => ({ id: p.id, name: p.name, stock: p.stock, sku: p.sku }))
      },
      charts: {
        revenueTimeline,
        categoryDistribution: categoryChartData
      },
      recentOrders: orders.slice(-5).reverse()
    };
  }
}

module.exports = new AnalyticsService();
