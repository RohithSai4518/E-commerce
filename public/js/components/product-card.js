/**
 * Product Card Component
 */

const ProductCard = {
  render(product) {
    const isOutOfStock = product.stock <= 0;
    const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
    const discountPercent = hasDiscount ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : 0;
    const firstVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;

    return `
      <div class="product-card" data-product-id="${product.id}">
        <!-- Badge -->
        ${product.badge ? `<span class="badge badge-primary product-card-badge">${product.badge}</span>` : ''}
        ${hasDiscount && !product.badge ? `<span class="badge badge-sale product-card-badge">Save ${discountPercent}%</span>` : ''}

        <!-- Media -->
        <a href="#/product/${product.slug}" class="product-card-media">
          <img 
            src="${product.images && product.images[0] ? product.images[0] : '/images/placeholder.png'}" 
            alt="${Utils.escapeHtml(product.name)}" 
            class="product-card-img"
            loading="lazy"
          />
        </a>

        <!-- Body -->
        <div class="product-card-body">
          <span class="product-card-category">${Utils.escapeHtml(product.categorySlug ? product.categorySlug.replace(/-/g, ' ') : '')}</span>
          <a href="#/product/${product.slug}" class="product-card-title">
            ${Utils.escapeHtml(product.name)}
          </a>

          <div class="product-card-rating">
            ${Utils.renderStars(product.rating, product.reviewCount)}
          </div>

          <!-- Footer -->
          <div class="product-card-footer">
            <div class="product-price-box">
              <span class="product-price">${Utils.formatCurrency(product.price)}</span>
              ${hasDiscount ? `<span class="product-compare-price">${Utils.formatCurrency(product.compareAtPrice)}</span>` : ''}
            </div>

            <button 
              class="btn ${isOutOfStock ? 'btn-secondary' : 'btn-accent'} btn-sm" 
              onclick="ProductCard.handleQuickAdd('${product.id}', '${firstVariant ? firstVariant.id : ''}')"
              ${isOutOfStock ? 'disabled' : ''}
            >
              ${isOutOfStock ? 'Sold Out' : '+ Add'}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  async handleQuickAdd(productId, variantId = '') {
    try {
      const res = await api.addToCart(productId, variantId || null, 1);
      store.set('cart', res.data);
      Toast.success('Added to bag!');
      CartDrawer.open();
    } catch (err) {
      Toast.error(err.message || 'Failed to add item');
    }
  }
};
