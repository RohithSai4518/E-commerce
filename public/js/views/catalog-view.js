/**
 * Product Catalog & Faceted Search View (PLP)
 */

const CatalogView = {
  currentFilters: {},

  async render(rootEl, params = {}) {
    this.currentFilters = {
      q: params.q || '',
      category: params.category || '',
      minPrice: params.minPrice || '',
      maxPrice: params.maxPrice || '',
      minRating: params.minRating || '',
      inStockOnly: params.inStockOnly || '',
      sortBy: params.sortBy || 'featured',
      page: params.page || 1
    };

    rootEl.innerHTML = `
      <div class="container" style="padding-top: var(--space-8);">
        <!-- Breadcrumb & Header -->
        <div style="margin-bottom: var(--space-6);">
          <span style="font-size: 0.85rem; color: var(--text-muted);">
            <a href="#/">Home</a> / <span>Catalog</span>
          </span>
          <h1 style="margin-top: 6px;">All Collections</h1>
          <p id="catalog-results-subtitle">Loading filtered results...</p>
        </div>

        <div class="catalog-layout">
          <!-- Sidebar Filters -->
          <aside class="catalog-sidebar" id="catalog-sidebar">
            <!-- Rendered by renderSidebar() -->
          </aside>

          <!-- Main Results Area -->
          <section>
            <!-- Sort & Quick Controls -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-6); background: var(--bg-surface); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); flex-wrap: wrap; gap: 12px;">
              <div id="catalog-count-badge" style="font-weight: 600; font-size: 0.9rem;">
                Showing products...
              </div>

              <div style="display: flex; align-items: center; gap: 8px;">
                <label for="catalog-sort-select" style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 600;">Sort By:</label>
                <select id="catalog-sort-select" class="form-select" style="width: auto; padding: 4px 10px; font-size: 0.85rem;" onchange="CatalogView.handleSort(this.value)">
                  <option value="featured" ${this.currentFilters.sortBy === 'featured' ? 'selected' : ''}>Featured & Best Sellers</option>
                  <option value="price-asc" ${this.currentFilters.sortBy === 'price-asc' ? 'selected' : ''}>Price: Low to High</option>
                  <option value="price-desc" ${this.currentFilters.sortBy === 'price-desc' ? 'selected' : ''}>Price: High to Low</option>
                  <option value="rating" ${this.currentFilters.sortBy === 'rating' ? 'selected' : ''}>Customer Rating</option>
                  <option value="newest" ${this.currentFilters.sortBy === 'newest' ? 'selected' : ''}>New Arrivals</option>
                </select>
              </div>
            </div>

            <!-- Product Grid -->
            <div class="products-grid" id="catalog-products-grid">
              <div class="view-loading-spinner" style="grid-column: 1 / -1;">
                <div class="spinner-ring"></div>
              </div>
            </div>

            <!-- Pagination -->
            <div id="catalog-pagination" style="margin-top: var(--space-12); display: flex; justify-content: center; gap: 8px;"></div>
          </section>
        </div>
      </div>
    `;

    await this.fetchAndRenderProducts();
  },

  async fetchAndRenderProducts() {
    try {
      const res = await api.getProducts(this.currentFilters);
      const { items, pagination, facets } = res.data;

      // Update Subtitle & Count
      const countEl = document.getElementById('catalog-count-badge');
      const subtitleEl = document.getElementById('catalog-results-subtitle');
      if (countEl) countEl.textContent = `${pagination.totalItems} Products Available`;
      if (subtitleEl) {
        subtitleEl.textContent = this.currentFilters.q 
          ? `Search results for "${this.currentFilters.q}"` 
          : `Showing page ${pagination.currentPage} of ${pagination.totalPages}`;
      }

      // Render Sidebar
      this.renderSidebar(facets);

      // Render Products
      const gridEl = document.getElementById('catalog-products-grid');
      if (gridEl) {
        if (items.length === 0) {
          gridEl.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
              <div style="font-size: 3rem; margin-bottom: 12px;">🔍</div>
              <h3>No matching products found</h3>
              <p style="margin-bottom: 16px;">Try adjusting your search criteria or resetting filters.</p>
              <button class="btn btn-primary btn-sm" onclick="CatalogView.resetFilters()">Reset All Filters</button>
            </div>
          `;
        } else {
          gridEl.innerHTML = items.map(p => ProductCard.render(p)).join('');
        }
      }

      // Render Pagination Controls
      this.renderPagination(pagination);
    } catch (err) {
      console.error('[Catalog Error]:', err);
    }
  },

  renderSidebar(facets) {
    const sidebarEl = document.getElementById('catalog-sidebar');
    if (!sidebarEl) return;

    sidebarEl.innerHTML = `
      <div class="card" style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="font-size: 1.1rem;">Filters</h3>
          <button style="background:none;border:none;color:var(--color-accent);font-size:0.8rem;cursor:pointer;font-weight:600;" onclick="CatalogView.resetFilters()">Reset All</button>
        </div>

        <!-- Categories Facet -->
        <div class="filter-group">
          <h4 class="filter-title">Categories</h4>
          <div class="filter-checkbox-list">
            ${(facets?.categories || []).map(cat => `
              <label class="filter-checkbox-label">
                <span>
                  <input 
                    type="radio" 
                    name="filter-cat" 
                    value="${cat.slug}" 
                    ${this.currentFilters.category === cat.slug ? 'checked' : ''}
                    onchange="CatalogView.setFilter('category', this.value)"
                  />
                  ${cat.icon || ''} ${cat.name}
                </span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${cat.count}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Price Range Filter -->
        <div class="filter-group">
          <h4 class="filter-title">Price Range</h4>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input 
              type="number" 
              class="form-input" 
              placeholder="Min $" 
              value="${this.currentFilters.minPrice}" 
              style="padding: 4px 8px; font-size: 0.85rem;"
              onchange="CatalogView.setFilter('minPrice', this.value)"
            />
            <span>-</span>
            <input 
              type="number" 
              class="form-input" 
              placeholder="Max $" 
              value="${this.currentFilters.maxPrice}" 
              style="padding: 4px 8px; font-size: 0.85rem;"
              onchange="CatalogView.setFilter('maxPrice', this.value)"
            />
          </div>
        </div>

        <!-- Rating Filter -->
        <div class="filter-group">
          <h4 class="filter-title">Minimum Rating</h4>
          <div class="filter-checkbox-list">
            ${[4, 3, 2].map(r => `
              <label class="filter-checkbox-label">
                <span>
                  <input 
                    type="radio" 
                    name="filter-rating" 
                    value="${r}" 
                    ${this.currentFilters.minRating == r ? 'checked' : ''}
                    onchange="CatalogView.setFilter('minRating', this.value)"
                  />
                  ${r} Stars & Above
                </span>
                <span>★</span>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- In Stock Only -->
        <div class="filter-group" style="border-bottom: none; margin-bottom: 0; padding-bottom: 0;">
          <label class="filter-checkbox-label">
            <span>
              <input 
                type="checkbox" 
                ${this.currentFilters.inStockOnly === 'true' ? 'checked' : ''}
                onchange="CatalogView.setFilter('inStockOnly', this.checked ? 'true' : '')"
              />
              In-Stock Only
            </span>
          </label>
        </div>
      </div>
    `;
  },

  renderPagination(pagination) {
    const pagEl = document.getElementById('catalog-pagination');
    if (!pagEl || pagination.totalPages <= 1) {
      if (pagEl) pagEl.innerHTML = '';
      return;
    }

    let buttons = '';
    for (let p = 1; p <= pagination.totalPages; p++) {
      buttons += `
        <button 
          class="btn ${p === pagination.currentPage ? 'btn-primary' : 'btn-secondary'} btn-sm" 
          onclick="CatalogView.setPage(${p})"
        >
          ${p}
        </button>
      `;
    }

    pagEl.innerHTML = buttons;
  },

  setFilter(key, value) {
    this.currentFilters[key] = value;
    this.currentFilters.page = 1;
    this.updateUrlAndFetch();
  },

  setPage(pageNum) {
    this.currentFilters.page = pageNum;
    this.updateUrlAndFetch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  handleSort(sortBy) {
    this.currentFilters.sortBy = sortBy;
    this.updateUrlAndFetch();
  },

  resetFilters() {
    this.currentFilters = {
      q: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      minRating: '',
      inStockOnly: '',
      sortBy: 'featured',
      page: 1
    };
    this.updateUrlAndFetch();
  },

  updateUrlAndFetch() {
    const params = new URLSearchParams();
    Object.entries(this.currentFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    window.location.hash = `#/catalog?${params.toString()}`;
    this.fetchAndRenderProducts();
  }
};
