/**
 * Multi-Step Checkout & Order Placement View
 */

const CheckoutView = {
  step: 1, // 1: Shipping, 2: Payment, 3: Success
  placedOrder: null,
  shippingDetails: {
    fullName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: 'CA',
    postalCode: '',
    country: 'US'
  },
  selectedShipping: 'standard',
  selectedPayment: 'credit_card',

  async render(rootEl) {
    const cart = store.get('cart');
    const items = cart?.items || [];
    const user = store.get('user');

    if (items.length === 0 && !this.placedOrder) {
      rootEl.innerHTML = `
        <div class="container" style="padding: 80px 0; text-align: center;">
          <h2>Your bag is empty</h2>
          <p style="margin: 12px 0 20px;">You cannot checkout without items in your cart.</p>
          <a href="#/catalog" class="btn btn-primary">Return to Catalog</a>
        </div>
      `;
      return;
    }

    if (this.placedOrder) {
      this.renderConfirmation(rootEl);
      return;
    }

    // Auto-fill user details if logged in
    if (user && !this.shippingDetails.email) {
      this.shippingDetails.fullName = user.name;
      this.shippingDetails.email = user.email;
      this.shippingDetails.phone = user.phone || '';
      if (user.addresses && user.addresses.length > 0) {
        const def = user.addresses.find(a => a.isDefault) || user.addresses[0];
        this.shippingDetails.street = def.street;
        this.shippingDetails.city = def.city;
        this.shippingDetails.state = def.state;
        this.shippingDetails.postalCode = def.postalCode;
      }
    }

    const summary = cart.summary || { grandTotal: 0, subtotal: 0 };

    rootEl.innerHTML = `
      <div class="container" style="padding-top: var(--space-8);">
        <!-- Step Progress Bar -->
        <div class="checkout-steps-bar">
          <div class="step-item ${this.step === 1 ? 'active' : this.step > 1 ? 'completed' : ''}">
            <span class="step-num">1</span>
            <span>Shipping Details</span>
          </div>
          <div class="step-item ${this.step === 2 ? 'active' : this.step > 2 ? 'completed' : ''}">
            <span class="step-num">2</span>
            <span>Payment & Review</span>
          </div>
          <div class="step-item ${this.step === 3 ? 'active' : ''}">
            <span class="step-num">3</span>
            <span>Confirmation</span>
          </div>
        </div>

        <div class="checkout-container">
          <!-- Main Wizard Form Step -->
          <div>
            ${this.step === 1 ? this.renderStep1Form() : this.renderStep2Form(summary)}
          </div>

          <!-- Order Summary Sidebar -->
          <div>
            <div class="card" style="padding: 24px; position: sticky; top: 90px;">
              <h3 style="margin-bottom: 16px;">Order Summary</h3>

              <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; max-height: 240px; overflow-y: auto;">
                ${items.map(item => `
                  <div style="display: flex; gap: 12px; align-items: center; font-size: 0.85rem;">
                    <img src="${item.image || '/images/placeholder.png'}" style="width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover;" />
                    <div style="flex: 1;">
                      <div style="font-weight: 600;">${Utils.escapeHtml(item.name)}</div>
                      <div style="color: var(--text-muted); font-size: 0.75rem;">Qty: ${item.quantity} ${item.variantName ? `(${item.variantName})` : ''}</div>
                    </div>
                    <div style="font-weight: 700;">${Utils.formatCurrency(item.price * item.quantity)}</div>
                  </div>
                `).join('')}
              </div>

              <div style="border-top: 1px solid var(--border-subtle); padding-top: 12px; display: flex; flex-direction: column; gap: 8px; font-size: 0.9rem;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-secondary);">Subtotal</span>
                  <span>${Utils.formatCurrency(summary.subtotal)}</span>
                </div>
                ${summary.discountAmount > 0 ? `
                  <div style="display: flex; justify-content: space-between; color: var(--color-success);">
                    <span>Discount</span>
                    <span>-${Utils.formatCurrency(summary.discountAmount)}</span>
                  </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-secondary);">Estimated Tax</span>
                  <span>${Utils.formatCurrency(summary.taxAmount)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-secondary);">Shipping</span>
                  <span>${summary.shippingCost === 0 ? 'FREE' : Utils.formatCurrency(summary.shippingCost)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: 800; font-family: var(--font-heading); border-top: 1px dashed var(--border-strong); padding-top: 10px; margin-top: 4px;">
                  <span>Grand Total</span>
                  <span>${Utils.formatCurrency(summary.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderStep1Form() {
    return `
      <div class="checkout-card">
        <h2 style="margin-bottom: 20px;">1. Shipping Information</h2>
        <form onsubmit="CheckoutView.submitStep1(event)">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Full Recipient Name *</label>
              <input type="text" id="chk-name" class="form-input" value="${Utils.escapeHtml(this.shippingDetails.fullName)}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Email Address (for order receipts) *</label>
              <input type="email" id="chk-email" class="form-input" value="${Utils.escapeHtml(this.shippingDetails.email)}" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Phone Number *</label>
            <input type="tel" id="chk-phone" class="form-input" value="${Utils.escapeHtml(this.shippingDetails.phone)}" placeholder="+1 (555) 019-2831" required />
          </div>

          <div class="form-group">
            <label class="form-label">Street Address *</label>
            <input type="text" id="chk-street" class="form-input" value="${Utils.escapeHtml(this.shippingDetails.street)}" placeholder="123 Innovation Way, Apt 4B" required />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">City *</label>
              <input type="text" id="chk-city" class="form-input" value="${Utils.escapeHtml(this.shippingDetails.city)}" required />
            </div>
            <div class="form-group">
              <label class="form-label">State / Province *</label>
              <input type="text" id="chk-state" class="form-input" value="${Utils.escapeHtml(this.shippingDetails.state)}" required />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Postal / ZIP Code *</label>
              <input type="text" id="chk-postal" class="form-input" value="${Utils.escapeHtml(this.shippingDetails.postalCode)}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Country</label>
              <select id="chk-country" class="form-select">
                <option value="US">United States (USD)</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
              </select>
            </div>
          </div>

          <button type="submit" class="btn btn-accent btn-lg btn-block" style="margin-top: 20px;">
            Continue to Payment & Shipping →
          </button>
        </form>
      </div>
    `;
  },

  renderStep2Form(summary) {
    return `
      <div class="checkout-card">
        <h2 style="margin-bottom: 20px;">2. Shipping Method & Payment</h2>

        <!-- Shipping Selection -->
        <div style="margin-bottom: 24px;">
          <h4 style="margin-bottom: 12px;">Choose Delivery Speed</h4>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <label class="card" style="padding: 14px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-color: ${this.selectedShipping === 'standard' ? 'var(--color-accent)' : 'var(--border-subtle)'};">
              <div style="display: flex; align-items: center; gap: 10px;">
                <input type="radio" name="ship-method" value="standard" ${this.selectedShipping === 'standard' ? 'checked' : ''} onchange="CheckoutView.changeShipping('standard')" />
                <div>
                  <div style="font-weight: 700;">Standard Delivery (3-5 Business Days)</div>
                  <div style="font-size: 0.8rem; color: var(--text-muted);">Free on orders over $75</div>
                </div>
              </div>
              <strong>${summary.subtotal >= 75 ? 'FREE' : '$5.99'}</strong>
            </label>

            <label class="card" style="padding: 14px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-color: ${this.selectedShipping === 'express' ? 'var(--color-accent)' : 'var(--border-subtle)'};">
              <div style="display: flex; align-items: center; gap: 10px;">
                <input type="radio" name="ship-method" value="express" ${this.selectedShipping === 'express' ? 'checked' : ''} onchange="CheckoutView.changeShipping('express')" />
                <div>
                  <div style="font-weight: 700;">Express Air (1-2 Business Days)</div>
                  <div style="font-size: 0.8rem; color: var(--text-muted);">Priority handling and tracking</div>
                </div>
              </div>
              <strong>$14.99</strong>
            </label>
          </div>
        </div>

        <!-- Payment Method -->
        <div style="margin-bottom: 24px;">
          <h4 style="margin-bottom: 12px;">Payment Method</h4>
          <div style="display: flex; gap: 10px; margin-bottom: 16px;">
            <button class="btn ${this.selectedPayment === 'credit_card' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="CheckoutView.changePayment('credit_card')">💳 Credit Card</button>
            <button class="btn ${this.selectedPayment === 'cod' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="CheckoutView.changePayment('cod')">📦 Cash On Delivery</button>
          </div>

          ${this.selectedPayment === 'credit_card' ? `
            <div style="background: var(--bg-surface-subtle); padding: 16px; border-radius: var(--radius-md);">
              <div class="form-group">
                <label class="form-label">Card Number</label>
                <input type="text" id="chk-card-num" class="form-input" placeholder="4242 •••• •••• 4242" value="4242 4242 4242 4242" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Expiry (MM/YY)</label>
                  <input type="text" id="chk-card-exp" class="form-input" placeholder="12/28" value="12/28" />
                </div>
                <div class="form-group">
                  <label class="form-label">CVC / CVV</label>
                  <input type="text" id="chk-card-cvc" class="form-input" placeholder="123" value="789" />
                </div>
              </div>
            </div>
          ` : `
            <div style="background: var(--bg-surface-subtle); padding: 16px; border-radius: var(--radius-md); font-size: 0.9rem;">
              Pay with cash upon arrival of your parcel.
            </div>
          `}
        </div>

        <div style="display: flex; gap: 12px;">
          <button class="btn btn-secondary" onclick="CheckoutView.setStep(1)">← Back to Shipping</button>
          <button class="btn btn-accent btn-lg" style="flex: 1;" onclick="CheckoutView.placeOrder()">
            Complete Order (${Utils.formatCurrency(summary.grandTotal)}) 🔒
          </button>
        </div>
      </div>
    `;
  },

  renderConfirmation(rootEl) {
    const order = this.placedOrder;
    rootEl.innerHTML = `
      <div class="container confirmation-hero">
        <div class="confirm-icon">✓</div>
        <h1>Thank You For Your Order!</h1>
        <p style="font-size: 1.1rem; margin-top: 8px;">Order Reference: <strong>${order.orderNumber}</strong></p>
        <p style="color: var(--text-muted); margin-top: 4px;">A confirmation receipt has been dispatched to <strong>${order.customer.email}</strong></p>

        <!-- Printable Invoice Box -->
        <div class="invoice-box">
          <div class="invoice-header">
            <div>
              <h3>AuraCommerce Invoice</h3>
              <p style="font-size: 0.85rem;">Date: ${Utils.formatDate(order.createdAt)}</p>
            </div>
            <div style="text-align: right;">
              <span class="badge badge-success">${order.status}</span>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Tracking: ${order.tracking?.trackingNumber}</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: left; margin-bottom: 20px; font-size: 0.85rem;">
            <div>
              <strong>Billed / Shipped To:</strong>
              <div>${order.customer.name}</div>
              <div>${order.shippingAddress.street}</div>
              <div>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}</div>
            </div>
            <div>
              <strong>Payment Summary:</strong>
              <div>Method: ${order.payment.method.toUpperCase()}</div>
              <div>Transaction ID: ${order.payment.transactionId}</div>
              <div>Status: ${order.payment.status}</div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; margin-bottom: 20px;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-subtle);">
                <th style="padding: 8px 0;">Item Description</th>
                <th style="padding: 8px 0; text-align: center;">Qty</th>
                <th style="padding: 8px 0; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr style="border-bottom: 1px solid var(--border-subtle);">
                  <td style="padding: 10px 0;">
                    ${Utils.escapeHtml(item.name)}
                    ${item.variantName ? `<span style="font-size: 0.75rem; color: var(--text-muted);"> (${item.variantName})</span>` : ''}
                  </td>
                  <td style="padding: 10px 0; text-align: center;">${item.quantity}</td>
                  <td style="padding: 10px 0; text-align: right;">${Utils.formatCurrency(item.price * item.quantity)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="display: flex; flex-direction: column; gap: 6px; text-align: right; font-size: 0.9rem;">
            <div>Subtotal: ${Utils.formatCurrency(order.totals.subtotal)}</div>
            ${order.totals.discountAmount > 0 ? `<div style="color: var(--color-success);">Discount: -${Utils.formatCurrency(order.totals.discountAmount)}</div>` : ''}
            <div>Shipping: ${order.totals.shippingCost === 0 ? 'FREE' : Utils.formatCurrency(order.totals.shippingCost)}</div>
            <div>Sales Tax: ${Utils.formatCurrency(order.totals.taxAmount)}</div>
            <div style="font-size: 1.3rem; font-weight: 800; font-family: var(--font-heading); margin-top: 8px;">
              Grand Total: ${Utils.formatCurrency(order.totals.grandTotal)}
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 12px; justify-content: center; margin-top: 24px;">
          <button class="btn btn-outline" onclick="window.print()">🖨️ Print Invoice</button>
          <a href="#/account" class="btn btn-primary">Track Order in Account</a>
          <a href="#/catalog" class="btn btn-secondary" onclick="CheckoutView.resetCheckout()">Continue Shopping</a>
        </div>
      </div>
    `;
  },

  submitStep1(e) {
    e.preventDefault();
    this.shippingDetails.fullName = document.getElementById('chk-name').value;
    this.shippingDetails.email = document.getElementById('chk-email').value;
    this.shippingDetails.phone = document.getElementById('chk-phone').value;
    this.shippingDetails.street = document.getElementById('chk-street').value;
    this.shippingDetails.city = document.getElementById('chk-city').value;
    this.shippingDetails.state = document.getElementById('chk-state').value;
    this.shippingDetails.postalCode = document.getElementById('chk-postal').value;

    this.step = 2;
    this.render(document.getElementById('app-root'));
  },

  setStep(s) {
    this.step = s;
    this.render(document.getElementById('app-root'));
  },

  async changeShipping(method) {
    this.selectedShipping = method;
    try {
      const res = await api.setShipping(method);
      store.set('cart', res.data);
      this.render(document.getElementById('app-root'));
    } catch (e) {
      console.error(e);
    }
  },

  changePayment(m) {
    this.selectedPayment = m;
    this.render(document.getElementById('app-root'));
  },

  async placeOrder() {
    const cart = store.get('cart');
    const orderPayload = {
      customer: {
        name: this.shippingDetails.fullName,
        email: this.shippingDetails.email,
        phone: this.shippingDetails.phone
      },
      shippingAddress: {
        street: this.shippingDetails.street,
        city: this.shippingDetails.city,
        state: this.shippingDetails.state,
        postalCode: this.shippingDetails.postalCode,
        country: 'US'
      },
      items: cart.items,
      couponCode: cart.couponCode,
      shippingMethod: this.selectedShipping,
      paymentMethod: this.selectedPayment,
      paymentDetails: {
        cardNumber: document.getElementById('chk-card-num')?.value || '4242424242424242'
      }
    };

    try {
      const res = await api.createOrder(orderPayload);
      this.placedOrder = res.data;
      this.step = 3;

      // Clear local cart
      const cartRes = await api.getCart();
      store.set('cart', cartRes.data);

      Toast.success('Order placed successfully!');
      this.render(document.getElementById('app-root'));
    } catch (err) {
      Toast.error(err.message || 'Payment settlement failed');
    }
  },

  resetCheckout() {
    this.step = 1;
    this.placedOrder = null;
  }
};
