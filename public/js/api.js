/**
 * AuraCommerce REST API Client
 */

class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-Session-ID': Utils.getSessionId(),
      ...options.headers
    };

    const token = store.get('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method: options.method || 'GET',
      headers,
      ...options
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const res = await fetch(url, config);
      const data = await res.json();

      if (!res.ok) {
        const error = new Error(data.error || 'Network request failed');
        error.status = res.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, err);
      throw err;
    }
  }

  // Auth
  login(email, password) { return this.request('/api/auth/login', { method: 'POST', body: { email, password } }); }
  register(userData) { return this.request('/api/auth/register', { method: 'POST', body: userData }); }
  getMe() { return this.request('/api/auth/me'); }
  updateProfile(data) { return this.request('/api/auth/profile', { method: 'PUT', body: data }); }
  addAddress(address) { return this.request('/api/auth/addresses', { method: 'POST', body: address }); }
  deleteAddress(id) { return this.request(`/api/auth/addresses/${id}`, { method: 'DELETE' }); }

  // Catalog
  getProducts(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/api/products?${qs}`);
  }
  getFeaturedProducts() { return this.request('/api/products/featured'); }
  getCategories() { return this.request('/api/categories'); }
  getProductBySlug(slug) { return this.request(`/api/products/slug/${slug}`); }
  getProductById(id) { return this.request(`/api/products/${id}`); }
  getProductRecommendations(id) { return this.request(`/api/products/${id}/recommendations`); }
  getProductReviews(id) { return this.request(`/api/products/${id}/reviews`); }
  submitReview(productId, reviewData) { return this.request(`/api/products/${productId}/reviews`, { method: 'POST', body: reviewData }); }

  // Cart
  getCart() { return this.request('/api/cart'); }
  addToCart(productId, variantId, quantity = 1) { return this.request('/api/cart/items', { method: 'POST', body: { productId, variantId, quantity } }); }
  updateCartItem(itemId, quantity) { return this.request(`/api/cart/items/${itemId}`, { method: 'PUT', body: { quantity } }); }
  removeFromCart(itemId) { return this.request(`/api/cart/items/${itemId}`, { method: 'DELETE' }); }
  applyCoupon(code) { return this.request('/api/cart/coupon', { method: 'POST', body: { code } }); }
  setShipping(shippingMethod) { return this.request('/api/cart/shipping', { method: 'POST', body: { shippingMethod } }); }

  // Orders
  createOrder(orderPayload) { return this.request('/api/orders', { method: 'POST', body: orderPayload }); }
  getOrder(orderId) { return this.request(`/api/orders/${orderId}`); }
  getMyOrders() { return this.request('/api/orders/user/my-orders'); }

  // Admin
  getAdminAnalytics() { return this.request('/api/admin/analytics'); }
  getAdminOrders() { return this.request('/api/admin/orders'); }
  updateOrderStatus(orderId, status, trackingMessage) { return this.request(`/api/admin/orders/${orderId}/status`, { method: 'PATCH', body: { status, trackingMessage } }); }
  getAdminProducts() { return this.request('/api/admin/products'); }
  createAdminProduct(product) { return this.request('/api/admin/products', { method: 'POST', body: product }); }
  updateAdminProduct(id, product) { return this.request(`/api/admin/products/${id}`, { method: 'PUT', body: product }); }
  deleteAdminProduct(id) { return this.request(`/api/admin/products/${id}`, { method: 'DELETE' }); }
  getAdminCoupons() { return this.request('/api/admin/coupons'); }
}

const api = new ApiClient();
