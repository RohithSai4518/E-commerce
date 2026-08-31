/**
 * Product Detail Page (PDP) View
 */

const ProductView = {
  currentProduct: null,
  selectedVariantId: null,
  quantity: 1,

  async render(rootEl, params = {}) {
    const slug = params.slug;

    rootEl.innerHTML = `
      <div class="view-loading-spinner">
        <div class="spinner-ring"></div>
        <p>Loading product details...</p>
      </div>
    `;

    try {
      const res = await api.getProductBySlug(slug);
      const product = res.data;
      this.currentProduct = product;
      this.selectedVariantId = product.variants && product.variants.length > 0 ? product.variants[0].id : null;
      this.quantity = 1;

      const [reviewsRes, recsRes] = await Promise.all([
        api.getProductReviews(product.id),
        api.getProductRecommendations(product.id)
      ]);

      const reviewsData = reviewsRes.data;
      const recs = recsRes.data;
      const isOutOfStock = product.stock <= 0;
      const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;

      rootEl.innerHTML = `
        <div class="container" style="padding-top: var(--space-8);">
          <!-- Breadcrumbs -->
          <div style="margin-bottom: var(--space-6); font-size: 0.85rem; color: var(--text-muted);">
            <a href="#/">Home</a> / 
            <a href="#/catalog">Catalog</a> / 
            <a href="#/catalog?category=${product.categorySlug}">${Utils.escapeHtml(product.categorySlug ? product.categorySlug.replace(/-/g, ' ') : '')}</a> / 
            <span>${Utils.escapeHtml(product.name)}</span>
          </div>

          <!-- Product Main Display Grid -->
          <div class="pdp-layout">
            <!-- Left: Media Gallery -->
            <div>
              <div class="pdp-gallery-main">
                <img 
                  id="pdp-main-image" 
                  src="${product.images && product.images[0] ? product.images[0] : '/images/placeholder.png'}" 
                  alt="${Utils.escapeHtml(product.name)}" 
                  class="pdp-main-img"
                />
              </div>

              ${product.images && product.images.length > 1 ? `
                <div class="pdp-thumbnails">
                  ${product.images.map((img, idx) => `
                    <div class="pdp-thumb ${idx === 0 ? 'active' : ''}" onclick="ProductView.switchImage('${img}', this)">
                      <img src="${img}" alt="Thumbnail ${idx + 1}" />
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>

            <!-- Right: Product Information & Purchase Panel -->
            <div>
              <div class="pdp-info-header">
                ${product.badge ? `<span class="badge badge-accent" style="margin-bottom: 8px;">${product.badge}</span>` : ''}
                <h1 class="pdp-title">${Utils.escapeHtml(product.name)}</h1>
                <div style="display: flex; align-items: center; gap: 12px;">
                  ${Utils.renderStars(product.rating, product.reviewCount)}
                  <span style="font-size: 0.85rem; color: var(--text-muted);">SKU: ${product.sku}</span>
                </div>
              </div>

              <!-- Price Box -->
              <div class="pdp-price-box">
                <span class="pdp-current-price">${Utils.formatCurrency(product.price)}</span>
                ${hasDiscount ? `
                  <span style="font-size: 1.25rem; color: var(--text-muted); text-decoration: line-through;">
                    ${Utils.formatCurrency(product.compareAtPrice)}
                  </span>
                ` : ''}
              </div>

              <!-- Stock Availability Badge -->
              <div style="margin-bottom: var(--space-4);">
                ${isOutOfStock ? `
                  <span class="badge badge-danger">Out of Stock</span>
                ` : product.stock <= 5 ? `
                  <span class="badge badge-warning">⚡ Only ${product.stock} units left in stock!</span>
                ` : `
                  <span class="badge badge-success">In Stock (${product.stock} units)</span>
                `}
              </div>

              <!-- Description -->
              <p style="font-size: 1rem; line-height: 1.6; margin-bottom: var(--space-6);">
                ${Utils.escapeHtml(product.description)}
              </p>

              <!-- Variants Selector -->
              ${product.variants && product.variants.length > 0 ? `
                <div class="pdp-variants">
                  <label class="form-label">Select Color / Edition:</label>
                  <div class="variant-options-pills">
                    ${product.variants.map((v, i) => `
                      <button 
                        class="variant-pill ${i === 0 ? 'active' : ''}" 
                        onclick="ProductView.selectVariant('${v.id}', this)"
                      >
                        ${v.color ? `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${v.color};margin-right:6px;border:1px solid #ccc;"></span>` : ''}
                        ${Utils.escapeHtml(v.name)}
                      </button>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Actions & Quantity -->
              <div class="pdp-actions">
                <div class="qty-stepper">
                  <button class="qty-btn" onclick="ProductView.changeQty(-1)">-</button>
                  <input type="text" id="pdp-qty-input" class="qty-input" value="1" readonly />
                  <button class="qty-btn" onclick="ProductView.changeQty(1)">+</button>
                </div>

                <button 
                  class="btn btn-primary btn-lg" 
                  style="flex: 1;" 
                  onclick="ProductView.addToCart()" 
                  ${isOutOfStock ? 'disabled' : ''}
                >
                  ${isOutOfStock ? 'Sold Out' : 'Add to Bag'}
                </button>

                <button 
                  class="btn btn-accent btn-lg" 
                  style="flex: 1;" 
                  onclick="ProductView.buyNow()" 
                  ${isOutOfStock ? 'disabled' : ''}
                >
                  Buy Now
                </button>
              </div>

              <!-- Specifications List -->
              ${product.specifications && Object.keys(product.specifications).length > 0 ? `
                <div style="margin-top: var(--space-8); border-top: 1px solid var(--border-subtle); padding-top: var(--space-6);">
                  <h4 style="margin-bottom: 12px;">Technical Specifications</h4>
                  <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                    ${Object.entries(product.specifications).map(([key, val]) => `
                      <tr style="border-bottom: 1px solid var(--border-subtle);">
                        <td style="padding: 8px 0; color: var(--text-secondary); width: 40%;">${Utils.escapeHtml(key)}</td>
                        <td style="padding: 8px 0; font-weight: 600;">${Utils.escapeHtml(val)}</td>
                      </tr>
                    `).join('')}
                  </table>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Customer Reviews & Rating Breakdown Section -->
          <section class="reviews-section">
            <div class="section-header">
              <div>
                <h2>Verified Customer Reviews</h2>
                <p>Authentic feedback from verified purchasers</p>
              </div>

              <button class="btn btn-outline btn-sm" onclick="ProductView.openReviewModal('${product.id}')">
                ✍️ Write a Review
              </button>
            </div>

            <!-- Review Summary Overview -->
            <div class="reviews-summary-box">
              <div style="text-align: center;">
                <div class="score-big">${reviewsData.summary.averageRating}</div>
                <div style="margin: 6px 0;">${Utils.renderStars(reviewsData.summary.averageRating)}</div>
                <span style="font-size: 0.85rem; color: var(--text-muted);">Based on ${reviewsData.summary.totalReviews} reviews</span>
              </div>

              <!-- Rating Bars -->
              <div class="rating-bars">
                ${[5, 4, 3, 2, 1].map(star => {
                  const count = reviewsData.summary.distribution[star] || 0;
                  const percent = reviewsData.summary.totalReviews > 0 ? (count / reviewsData.summary.totalReviews) * 100 : 0;
                  return `
                    <div class="rating-bar-row">
                      <span style="width: 50px;">${star} Stars</span>
                      <div class="bar-track">
                        <div class="bar-fill" style="width: ${percent}%;"></div>
                      </div>
                      <span style="width: 30px; text-align: right; color: var(--text-muted);">${count}</span>
                    </div>
                  `;
                }).join('')}
              </div>

              <div>
                <button class="btn btn-secondary btn-sm" onclick="ProductView.openReviewModal('${product.id}')">
                  Share Your Experience
                </button>
              </div>
            </div>

            <!-- Review Cards List -->
            <div style="display: flex; flex-direction: column; gap: 16px;">
              ${reviewsData.reviews.length === 0 ? `
                <p style="text-align: center; color: var(--text-muted); padding: 30px;">Be the first to review this product!</p>
              ` : reviewsData.reviews.map(r => `
                <div class="card" style="padding: 20px;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <strong>${Utils.escapeHtml(r.userName)}</strong>
                        ${r.verifiedPurchase ? `<span class="badge badge-success" style="font-size: 0.7rem;">Verified Buyer</span>` : ''}
                      </div>
                      <div style="margin-top: 4px;">${Utils.renderStars(r.rating)}</div>
                    </div>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">${Utils.formatDate(r.createdAt)}</span>
                  </div>
                  ${r.title ? `<h4 style="margin: 8px 0 4px; font-size: 1rem;">${Utils.escapeHtml(r.title)}</h4>` : ''}
                  <p style="font-size: 0.925rem; line-height: 1.5;">${Utils.escapeHtml(r.comment)}</p>
                  <div style="margin-top: 12px; font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 12px;">
                    <span>Helpful?</span>
                    <button style="background:none;border:none;color:var(--color-accent);cursor:pointer;font-weight:600;" onclick="ProductView.voteHelpful('${r.id}', this)">
                      👍 Yes (${r.helpfulVotes || 0})
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </section>

          <!-- Recommendations / Frequently Bought Together -->
          ${recs.related && recs.related.length > 0 ? `
            <section style="margin-top: var(--space-16); margin-bottom: var(--space-16);">
              <div class="section-header">
                <h2>Related & Recommended</h2>
              </div>
              <div class="products-grid">
                ${recs.related.map(p => ProductCard.render(p)).join('')}
              </div>
            </section>
          ` : ''}
        </div>
      `;
    } catch (err) {
      rootEl.innerHTML = `
        <div class="container" style="padding: 80px 0; text-align: center;">
          <h2>Product Not Found</h2>
          <p style="margin-bottom: 16px;">The requested product could not be located.</p>
          <a href="#/catalog" class="btn btn-primary">Back to Catalog</a>
        </div>
      `;
    }
  },

  switchImage(src, thumbEl) {
    document.getElementById('pdp-main-image').src = src;
    document.querySelectorAll('.pdp-thumb').forEach(t => t.classList.remove('active'));
    thumbEl.classList.add('active');
  },

  selectVariant(variantId, pillEl) {
    this.selectedVariantId = variantId;
    document.querySelectorAll('.variant-pill').forEach(p => p.classList.remove('active'));
    pillEl.classList.add('active');
  },

  changeQty(delta) {
    const input = document.getElementById('pdp-qty-input');
    let current = parseInt(input.value, 10) || 1;
    let next = Math.max(1, current + delta);
    if (this.currentProduct && next > this.currentProduct.stock) {
      Toast.info(`Maximum available stock is ${this.currentProduct.stock}`);
      return;
    }
    this.quantity = next;
    input.value = next;
  },

  async addToCart() {
    try {
      const res = await api.addToCart(this.currentProduct.id, this.selectedVariantId, this.quantity);
      store.set('cart', res.data);
      Toast.success('Added to your shopping bag!');
      CartDrawer.open();
    } catch (err) {
      Toast.error(err.message || 'Could not add to cart');
    }
  },

  async buyNow() {
    try {
      const res = await api.addToCart(this.currentProduct.id, this.selectedVariantId, this.quantity);
      store.set('cart', res.data);
      window.location.hash = '#/checkout';
    } catch (err) {
      Toast.error(err.message || 'Could not initiate purchase');
    }
  },

  openReviewModal(productId) {
    const user = store.get('user');
    if (!user) {
      Toast.info('Please sign in to submit a review');
      Modal.openAuth('login');
      return;
    }

    const content = `
      <form onsubmit="ProductView.handleReviewSubmit(event, '${productId}')">
        <div class="form-group">
          <label class="form-label">Your Rating (1 to 5 Stars)</label>
          <select id="rev-rating" class="form-select" required>
            <option value="5">⭐⭐⭐⭐⭐ 5 Stars - Outstanding</option>
            <option value="4">⭐⭐⭐⭐ 4 Stars - Very Good</option>
            <option value="3">⭐⭐⭐ 3 Stars - Average</option>
            <option value="2">⭐⭐ 2 Stars - Subpar</option>
            <option value="1">⭐ 1 Star - Unsatisfactory</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Review Headline / Title</label>
          <input type="text" id="rev-title" class="form-input" placeholder="e.g. Exceptional sound clarity and build quality" required />
        </div>

        <div class="form-group">
          <label class="form-label">Detailed Comments</label>
          <textarea id="rev-comment" class="form-textarea" placeholder="Describe your experience with the materials, ergonomics, and performance..." required></textarea>
        </div>

        <button type="submit" class="btn btn-accent btn-block" style="margin-top: 16px;">Post Verified Review</button>
      </form>
    `;

    Modal.open({
      title: 'Review this product',
      contentHtml: content
    });
  },

  async handleReviewSubmit(e, productId) {
    e.preventDefault();
    const rating = document.getElementById('rev-rating').value;
    const title = document.getElementById('rev-title').value;
    const comment = document.getElementById('rev-comment').value;

    try {
      await api.submitReview(productId, { rating, title, comment });
      Toast.success('Thank you! Your review has been recorded.');
      Modal.close();
      this.render(document.getElementById('app-root'), { slug: this.currentProduct.slug });
    } catch (err) {
      Toast.error(err.message || 'Failed to submit review');
    }
  },

  async voteHelpful(reviewId, btnEl) {
    try {
      const res = await api.request(`/api/reviews/${reviewId}/vote`, { method: 'POST' });
      btnEl.textContent = `👍 Yes (${res.data.helpfulVotes})`;
      Toast.success('Vote recorded!');
    } catch (err) {
      Toast.error('Could not vote');
    }
  }
};
