/**
 * Slide-Over Cart Drawer Controller
 */

const CartDrawer = {
  drawerEl: null,
  overlayEl: null,

  init() {
    this.drawerEl = document.getElementById('cart-drawer');
    this.overlayEl = document.getElementById('cart-drawer-overlay');

    this.overlayEl.addEventListener('click', () => this.close());
    store.subscribe('cart', () => {
      if (store.get('isCartDrawerOpen')) {
        this.render();
      }
    });
  },

  open() {
    if (!this.drawerEl) this.init();
    this.render();
    this.drawerEl.classList.add('open');
    this.overlayEl.classList.add('open');
    store.set('isCartDrawerOpen', true);
    document.body.style.overflow = 'hidden';
  },

  close() {
    if (!this.drawerEl) return;
    this.drawerEl.classList.remove('open');
    this.overlayEl.classList.remove('open');
    store.set('isCartDrawerOpen', false);
    document.body.style.overflow = '';
  },

  render() {
    const cart = store.get('cart');
    const items = cart?.items || [];
    const summary = cart?.summary || { grandTotal: 0, subtotal: 0 };

    this.drawerEl.innerHTML = `
      <div class="cart-drawer-header">
        <h3>Your Shopping Bag (${items.length})</h3>
        <button class="modal-close-btn" onclick="CartDrawer.close()">&times;</button>
      </div>

      <div class="cart-drawer-items">
        ${items.length === 0 ? `
          <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
            <div style="font-size: 3rem; margin-bottom: 12px;">🛍️</div>
            <h4>Your bag is currently empty</h4>
            <p style="font-size: 0.85rem; margin-top: 6px; margin-bottom: 20px;">Explore our catalog to find premium gear.</p>
            <a href="#/catalog" class="btn btn-primary btn-sm" onclick="CartDrawer.close()">Explore Catalog</a>
          </div>
        ` : items.map(item => `
          <div class="cart-item-row">
            <img src="${item.image || '/images/placeholder.png'}" alt="${Utils.escapeHtml(item.name)}" class="cart-item-img" />
            
            <div class="cart-item-details">
              <h4>${Utils.escapeHtml(item.name)}</h4>
              ${item.variantName ? `<span class="cart-item-variant">${Utils.escapeHtml(item.variantName)}</span>` : ''}
              <div class="cart-item-price">${Utils.formatCurrency(item.price)}</div>
            </div>

            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
              <button 
                style="background:none;border:none;color:var(--color-danger);font-size:0.8rem;cursor:pointer;" 
                onclick="CartDrawer.removeItem('${item.id}')"
              >
                Remove
              </button>

              <div class="qty-stepper" style="height: 32px;">
                <button class="qty-btn" style="width: 28px; height: 30px;" onclick="CartDrawer.updateQty('${item.id}', ${item.quantity - 1})">-</button>
                <span style="padding: 0 8px; font-weight: 700; font-size: 0.85rem;">${item.quantity}</span>
                <button class="qty-btn" style="width: 28px; height: 30px;" onclick="CartDrawer.updateQty('${item.id}', ${item.quantity + 1})">+</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      ${items.length > 0 ? `
        <div class="cart-drawer-footer">
          <div class="cart-summary-line">
            <span>Subtotal</span>
            <span>${Utils.formatCurrency(summary.subtotal)}</span>
          </div>
          ${summary.discountAmount > 0 ? `
            <div class="cart-summary-line" style="color: var(--color-success);">
              <span>Discount</span>
              <span>-${Utils.formatCurrency(summary.discountAmount)}</span>
            </div>
          ` : ''}
          <div class="cart-summary-line total">
            <span>Estimated Total</span>
            <span>${Utils.formatCurrency(summary.grandTotal)}</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 16px;">
            <a href="#/checkout" class="btn btn-accent btn-block btn-lg" onclick="CartDrawer.close()">
              Proceed to Checkout →
            </a>
            <a href="#/cart" class="btn btn-outline btn-block btn-sm" onclick="CartDrawer.close()">
              View Full Cart Details
            </a>
          </div>
        </div>
      ` : ''}
    `;
  },

  async updateQty(itemId, newQty) {
    try {
      const res = await api.updateCartItem(itemId, newQty);
      store.set('cart', res.data);
    } catch (err) {
      Toast.error(err.message || 'Could not update quantity');
    }
  },

  async removeItem(itemId) {
    try {
      const res = await api.removeFromCart(itemId);
      store.set('cart', res.data);
      Toast.info('Item removed');
    } catch (err) {
      Toast.error(err.message || 'Could not remove item');
    }
  }
};
