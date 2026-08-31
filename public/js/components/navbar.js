/**
 * App Navigation Bar Component
 */

const Navbar = {
  headerEl: null,

  init() {
    this.headerEl = document.getElementById('app-header');
    this.render();

    // Subscribe to state updates
    store.subscribe('user', () => this.render());
    store.subscribe('cart', () => this.updateCartBadge());
    store.subscribe('categories', () => this.renderCategoryBar());

    // Scroll shadow effect
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        this.headerEl.classList.add('scrolled');
      } else {
        this.headerEl.classList.remove('scrolled');
      }
    });
  },

  render() {
    const user = store.get('user');
    const cart = store.get('cart');
    const itemCount = (cart?.items || []).reduce((sum, item) => sum + item.quantity, 0);

    this.headerEl.innerHTML = `
      <div class="container navbar-container">
        <!-- Brand Logo -->
        <a href="#/" class="nav-brand">
          <div class="brand-icon">⚡</div>
          <span>Aura<strong>Commerce</strong></span>
        </a>

        <!-- Global Search Bar -->
        <div class="nav-search">
          <form onsubmit="Navbar.handleSearch(event)" class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              id="global-search-input" 
              class="nav-search-input" 
              placeholder="Search premium headphones, displays, keyboards..." 
              value="${Utils.escapeHtml(store.get('searchQuery') || '')}"
            />
          </form>
        </div>

        <!-- Action Items -->
        <div class="nav-actions">
          <a href="#/catalog" class="nav-action-btn">
            <span>Explore</span>
          </a>

          ${user ? `
            <a href="#/account" class="nav-action-btn">
              <span>👤 ${Utils.escapeHtml(user.name.split(' ')[0])}</span>
            </a>
            ${user.role === 'admin' ? `
              <a href="#/admin" class="nav-action-btn" style="color: var(--color-accent);">
                <span>⚙️ Admin</span>
              </a>
            ` : ''}
          ` : `
            <button class="nav-action-btn" onclick="Modal.openAuth('login')">
              <span>Sign In</span>
            </button>
          `}

          <!-- Cart Trigger -->
          <button class="btn btn-primary btn-sm" onclick="CartDrawer.open()" style="border-radius: var(--radius-full); padding: 0.5rem 1rem;">
            <span>🛍️</span>
            <span>Cart</span>
            <span class="cart-btn-badge" id="nav-cart-count">${itemCount}</span>
          </button>
        </div>
      </div>

      <!-- Categories Sub-bar -->
      <nav class="nav-categories-bar">
        <div class="container">
          <ul class="category-nav-list" id="category-nav-list">
            <!-- Rendered by renderCategoryBar() -->
          </ul>
        </div>
      </nav>
    `;

    this.renderCategoryBar();
  },

  renderCategoryBar() {
    const listEl = document.getElementById('category-nav-list');
    if (!listEl) return;

    const categories = store.get('categories') || [];
    const activeRoute = window.location.hash;

    listEl.innerHTML = `
      <li class="category-nav-item">
        <a href="#/catalog" class="${activeRoute === '#/catalog' ? 'active' : ''}">All Products</a>
      </li>
      ${categories.map(cat => `
        <li class="category-nav-item">
          <a href="#/catalog?category=${cat.slug}" class="${activeRoute.includes(cat.slug) ? 'active' : ''}">
            ${cat.icon ? `${cat.icon} ` : ''}${cat.name}
          </a>
        </li>
      `).join('')}
    `;
  },

  updateCartBadge() {
    const badge = document.getElementById('nav-cart-count');
    if (!badge) return;
    const cart = store.get('cart');
    const count = (cart?.items || []).reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = count;
  },

  handleSearch(e) {
    e.preventDefault();
    const query = document.getElementById('global-search-input').value.trim();
    store.set('searchQuery', query);
    window.location.hash = `#/catalog?q=${encodeURIComponent(query)}`;
  }
};
