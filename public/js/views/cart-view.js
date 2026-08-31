/**
 * Dedicated Full Cart View
 */

const CartView = {
  async render(rootEl) {
    rootEl.innerHTML = `
      <div class="view-loading-spinner">
        <div class="spinner-ring"></div>
        <p>Loading your bag...</p>
      </div>
    `;

    try {
      const res = await api.getCart();
      const cart = res.data;
      store.set('cart', cart);
      const items = cart.items || [];
      const summary = cart.summary || { grandTotal: 0, subtotal: 0, shippingCost: 0, taxAmount: 0 };

      rootEl.innerHTML = `
        <div class="container" style="padding-top: var(--space-8);">
          <h1 style="margin-bottom: var(--space-6);">Shopping Bag (${items.length} items)</h1>

          ${items.length === 0 ? `
            <div class="card" style="text-align: center; padding: 60px 20px;">
              <div style="font-size: 3.5rem; margin-bottom: 12px;">🛍️</div>
              <h2>Your bag is currently empty</h2>
              <p style="margin-top: 8px; margin-bottom: 24px;">Discover our collection of premium acoustic and computing gear.</p>
              <a href="#/catalog" class="btn btn-primary btn-lg">Browse Collections</a>
            </div>
          ` : `
            <div style="display: grid; grid-template-columns: 1fr 380px; gap: var(--space-8);">
              <!-- Items Table -->
              <div class="card" style="padding: 24px;">
                <div style="display: flex; flex-direction: column; gap: 20px;">
                  ${items.map(item => `
                    <div style="display: grid; grid-template-columns: 80px 1fr auto; gap: 16px; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 16px;">
                      <img src="${item.image || '/images/placeholder.png'}" alt="${Utils.escapeHtml(item.name)}" style="width: 80px; height: 80px; object-fit: cover; border-radius: var(--radius-md);" />
                      
                      <div>
                        <a href="#/product/${item.slug}" style="font-weight: 700; font-size: 1.05rem;">${Utils.escapeHtml(item.name)}</a>
                        ${item.variantName ? `<div style="font-size: 0.85rem; color: var(--text-muted);">${Utils.escapeHtml(item.variantName)}</div>` : ''}
                        <div style="font-weight: 700; margin-top: 4px;">${Utils.formatCurrency(item.price)}</div>
                      </div>

                      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                        <div class="qty-stepper">
                          <button class="qty-btn" onclick="CartView.updateQty('${item.id}', ${item.quantity - 1})">-</button>
                          <span style="padding: 0 10px; font-weight: 700;">${item.quantity}</span>
                          <button class="qty-btn" onclick="CartView.updateQty('${item.id}', ${item.quantity + 1})">+</button>
                        </div>
                        <button style="background:none;border:none;color:var(--color-danger);font-size:0.8rem;cursor:pointer;" onclick="CartView.removeItem('${item.id}')">Remove</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Summary Sidebar -->
              <div>
                <div class="card" style="padding: 24px; position: sticky; top: 90px;">
                  <h3 style="margin-bottom: 16px;">Order Summary</h3>

                  <!-- Promo Code Input -->
                  <div style="margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 16px;">
                    <label class="form-label" style="font-size: 0.8rem;">Promotional Voucher</label>
                    <div style="display: flex; gap: 8px; margin-top: 4px;">
                      <input type="text" id="cart-voucher-input" class="form-input" placeholder="e.g. WELCOME10" value="${cart.couponCode || ''}" style="text-transform: uppercase;" />
                      <button class="btn btn-secondary btn-sm" onclick="CartView.applyPromo()">Apply</button>
                    </div>
                    ${summary.appliedCoupon ? `
                      <div style="font-size: 0.8rem; color: var(--color-success); margin-top: 6px; font-weight: 600;">
                        ✓ ${Utils.escapeHtml(summary.appliedCoupon.description)}
                      </div>
                    ` : ''}
                  </div>

                  <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.95rem;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: var(--text-secondary);">Subtotal</span>
                      <span>${Utils.formatCurrency(summary.subtotal)}</span>
                    </div>

                    ${summary.discountAmount > 0 ? `
                      <div style="display: flex; justify-content: space-between; color: var(--color-success);">
                        <span>Promotional Discount</span>
                        <span>-${Utils.formatCurrency(summary.discountAmount)}</span>
                      </div>
                    ` : ''}

                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: var(--text-secondary);">Estimated Tax (8.25%)</span>
                      <span>${Utils.formatCurrency(summary.taxAmount)}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: var(--text-secondary);">Standard Shipping</span>
                      <span>${summary.shippingCost === 0 ? '<strong style="color: var(--color-success);">FREE</strong>' : Utils.formatCurrency(summary.shippingCost)}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; font-size: 1.25rem; font-weight: 800; font-family: var(--font-heading); border-top: 1px dashed var(--border-strong); padding-top: 12px; margin-top: 6px;">
                      <span>Total</span>
                      <span>${Utils.formatCurrency(summary.grandTotal)}</span>
                    </div>
                  </div>

                  <a href="#/checkout" class="btn btn-accent btn-block btn-lg" style="margin-top: 24px;">
                    Proceed to Checkout →
                  </a>
                </div>
              </div>
            </div>
          `}
        </div>
      `;
    } catch (err) {
      console.error('[Cart View Error]:', err);
    }
  },

  async updateQty(itemId, newQty) {
    try {
      const res = await api.updateCartItem(itemId, newQty);
      store.set('cart', res.data);
      this.render(document.getElementById('app-root'));
    } catch (err) {
      Toast.error(err.message || 'Error updating quantity');
    }
  },

  async removeItem(itemId) {
    try {
      const res = await api.removeFromCart(itemId);
      store.set('cart', res.data);
      this.render(document.getElementById('app-root'));
    } catch (err) {
      Toast.error(err.message || 'Error removing item');
    }
  },

  async applyPromo() {
    const code = document.getElementById('cart-voucher-input').value.trim();
    try {
      const res = await api.applyCoupon(code);
      store.set('cart', res.data);
      Toast.success(code ? 'Coupon applied!' : 'Coupon removed');
      this.render(document.getElementById('app-root'));
    } catch (err) {
      Toast.error(err.message || 'Invalid coupon code');
    }
  }
};
