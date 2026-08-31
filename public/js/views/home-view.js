/**
 * Home View
 */

const HomeView = {
  async render(rootEl) {
    rootEl.innerHTML = `
      <div class="view-loading-spinner">
        <div class="spinner-ring"></div>
        <p>Curating exceptional products...</p>
      </div>
    `;

    try {
      const [featuredProducts, categories] = await Promise.all([
        api.getFeaturedProducts(),
        api.getCategories()
      ]);

      store.set('categories', categories.data);

      rootEl.innerHTML = `
        <!-- Hero Section -->
        <section class="hero-section container">
          <div class="hero-banner">
            <div class="hero-content">
              <span class="badge badge-accent" style="margin-bottom: 12px; display: inline-block;">New Edition 2026</span>
              <h1>Engineered for Clarity & Precision.</h1>
              <p>Experience studio-grade acoustic depth and ergonomic workstations crafted with zero compromises.</p>
              <div class="hero-cta-group">
                <a href="#/catalog" class="btn btn-accent btn-lg">Explore Catalog →</a>
                <a href="#/catalog?category=audio-acoustics" class="btn btn-outline btn-lg" style="color: #fff; border-color: rgba(255,255,255,0.4);">Audio Collection</a>
              </div>
            </div>
            <div class="hero-visual">
              <img 
                src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80" 
                alt="AeroPulse Wireless Headphones" 
                class="hero-img"
              />
            </div>
          </div>

          <!-- Value Propositions -->
          <div class="value-props-grid">
            <div class="value-prop-card">
              <div class="prop-icon">🚀</div>
              <div class="prop-text">
                <h4>Free Express Shipping</h4>
                <p>On all orders above $75</p>
              </div>
            </div>
            <div class="value-prop-card">
              <div class="prop-icon">🛡️</div>
              <div class="prop-text">
                <h4>2-Year Warranty</h4>
                <p>Comprehensive standard coverage</p>
              </div>
            </div>
            <div class="value-prop-card">
              <div class="prop-icon">🔄</div>
              <div class="prop-text">
                <h4>30-Day Free Returns</h4>
                <p>Hassle-free return policy</p>
              </div>
            </div>
            <div class="value-prop-card">
              <div class="prop-icon">🔒</div>
              <div class="prop-text">
                <h4>Secure Checkout</h4>
                <p>Encrypted & privacy focused</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Categories Showcase Grid -->
        <section class="container" style="margin-bottom: var(--space-16);">
          <div class="section-header">
            <div>
              <h2>Browse Collections</h2>
              <p>Explore high-performance lifestyle categories</p>
            </div>
            <a href="#/catalog" class="btn btn-outline btn-sm">View All Categories →</a>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
            ${categories.data.map(cat => `
              <a href="#/catalog?category=${cat.slug}" class="card" style="text-align: center; padding: 24px 16px; text-decoration: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                <span style="font-size: 2.2rem;">${cat.icon || '📦'}</span>
                <h4 style="font-size: 1rem; color: var(--text-primary); margin-top: 4px;">${cat.name}</h4>
                <span style="font-size: 0.8rem; color: var(--color-accent); font-weight: 600;">Shop Now →</span>
              </a>
            `).join('')}
          </div>
        </section>

        <!-- Featured Products Grid -->
        <section class="container" style="margin-bottom: var(--space-16);">
          <div class="section-header">
            <div>
              <h2>Featured Best Sellers</h2>
              <p>Hand-selected by our engineering & design team</p>
            </div>
            <a href="#/catalog" class="btn btn-outline btn-sm">See Full Catalog →</a>
          </div>

          <div class="products-grid">
            ${featuredProducts.data.map(p => ProductCard.render(p)).join('')}
          </div>
        </section>

        <!-- Promotional Banner -->
        <section class="container" style="margin-bottom: var(--space-16);">
          <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: var(--radius-xl); padding: 48px; color: #fff; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 24px;">
            <div>
              <span class="badge badge-accent" style="margin-bottom: 8px;">Special Voucher</span>
              <h2 style="color: #fff; font-size: 2rem; margin-bottom: 8px;">Save 10% on your first order</h2>
              <p style="color: #c7d2fe; max-width: 460px;">Use coupon code <strong style="color: #fff; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px;">WELCOME10</strong> during checkout.</p>
            </div>
            <a href="#/catalog" class="btn btn-accent btn-lg" style="background: #fff; color: #1e1b4b;">Claim Offer Now</a>
          </div>
        </section>
      `;
    } catch (err) {
      rootEl.innerHTML = `
        <div class="container" style="padding: 60px 0; text-align: center;">
          <h3>Failed to load catalog showcase</h3>
          <p style="margin-bottom: 16px;">${Utils.escapeHtml(err.message)}</p>
          <button class="btn btn-primary" onclick="HomeView.render(document.getElementById('app-root'))">Retry</button>
        </div>
      `;
    }
  }
};
