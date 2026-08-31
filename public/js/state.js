/**
 * AuraCommerce Reactive Global State Store
 */

class StateStore {
  constructor() {
    this.state = {
      user: null,
      token: localStorage.getItem('aura_auth_token') || null,
      cart: { items: [], summary: { grandTotal: 0, subtotal: 0 } },
      categories: [],
      activeRoute: 'home',
      routeParams: {},
      isCartDrawerOpen: false,
      searchQuery: ''
    };

    this.listeners = new Map();
  }

  /**
   * Subscribe to state changes
   * @param {string} key - State property or '*' for all
   * @param {Function} callback - Triggered on state change
   */
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      const set = this.listeners.get(key);
      if (set) set.delete(callback);
    };
  }

  /**
   * Update state property
   */
  set(key, value) {
    const oldValue = this.state[key];
    this.state[key] = value;

    // Persist token
    if (key === 'token') {
      if (value) {
        localStorage.setItem('aura_auth_token', value);
      } else {
        localStorage.removeItem('aura_auth_token');
      }
    }

    // Notify specific listeners
    const specificListeners = this.listeners.get(key);
    if (specificListeners) {
      specificListeners.forEach(cb => cb(value, oldValue));
    }

    // Notify global listeners
    const globalListeners = this.listeners.get('*');
    if (globalListeners) {
      globalListeners.forEach(cb => cb(this.state));
    }
  }

  /**
   * Get state property
   */
  get(key) {
    return this.state[key];
  }

  /**
   * Reset session on logout
   */
  logout() {
    this.set('token', null);
    this.set('user', null);
    window.location.hash = '#/';
  }
}

const store = new StateStore();
