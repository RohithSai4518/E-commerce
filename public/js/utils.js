/**
 * AuraCommerce Client Utility Helpers
 */

const Utils = {
  /**
   * Format numeric value as currency (e.g. $249.99)
   */
  formatCurrency(amount, currency = 'USD') {
    const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(num);
  },

  /**
   * Format ISO date string into readable format
   */
  formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  },

  /**
   * Render Star Rating SVGs
   */
  renderStars(rating = 0, reviewCount = null) {
    const rounded = Math.round(rating * 2) / 2;
    let starsHtml = '';

    for (let i = 1; i <= 5; i++) {
      if (i <= rounded) {
        starsHtml += '★';
      } else if (i - 0.5 === rounded) {
        starsHtml += '★';
      } else {
        starsHtml += '<span class="rating-stars-empty">★</span>';
      }
    }

    return `
      <div class="rating-stars">
        ${starsHtml}
        ${reviewCount !== null ? `<span class="rating-count">(${reviewCount})</span>` : ''}
      </div>
    `;
  },

  /**
   * Debounce function for inputs
   */
  debounce(func, wait = 300) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },

  /**
   * Generate or retrieve guest session ID from localStorage
   */
  getSessionId() {
    let sid = localStorage.getItem('aura_session_id');
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('aura_session_id', sid);
    }
    return sid;
  },

  /**
   * HTML escape
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
