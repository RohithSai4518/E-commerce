/**
 * User Account & Order History View
 */

const AccountView = {
  currentTab: 'orders', // orders, profile, addresses

  async render(rootEl) {
    const user = store.get('user');

    if (!user) {
      rootEl.innerHTML = `
        <div class="container" style="padding: 80px 0; text-align: center;">
          <h2>Please Sign In</h2>
          <p style="margin: 12px 0 24px;">You need to be authenticated to access your account portal.</p>
          <button class="btn btn-primary btn-lg" onclick="Modal.openAuth('login')">Sign In to Account</button>
        </div>
      `;
      return;
    }

    rootEl.innerHTML = `
      <div class="container" style="padding-top: var(--space-8);">
        <!-- Profile Header -->
        <div class="card" style="padding: 24px; margin-bottom: var(--space-8); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700;">
              ${user.name.charAt(0)}
            </div>
            <div>
              <h2 style="font-size: 1.5rem;">${Utils.escapeHtml(user.name)}</h2>
              <p style="font-size: 0.9rem; color: var(--text-muted);">${Utils.escapeHtml(user.email)} • Role: <strong>${user.role}</strong></p>
            </div>
          </div>

          <button class="btn btn-outline btn-sm" onclick="store.logout()">Sign Out</button>
        </div>

        <!-- Navigation Tabs -->
        <div style="display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
          <button class="btn ${this.currentTab === 'orders' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="AccountView.switchTab('orders')">📦 Order History</button>
          <button class="btn ${this.currentTab === 'profile' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="AccountView.switchTab('profile')">👤 Profile Details</button>
          <button class="btn ${this.currentTab === 'addresses' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="AccountView.switchTab('addresses')">🏡 Address Book</button>
        </div>

        <!-- Tab Content Container -->
        <div id="account-tab-content">
          <div class="view-loading-spinner"><div class="spinner-ring"></div></div>
        </div>
      </div>
    `;

    await this.renderTabContent();
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.render(document.getElementById('app-root'));
  },

  async renderTabContent() {
    const container = document.getElementById('account-tab-content');
    if (!container) return;

    if (this.currentTab === 'orders') {
      try {
        const res = await api.getMyOrders();
        const orders = res.data || [];

        if (orders.length === 0) {
          container.innerHTML = `
            <div class="card" style="text-align: center; padding: 48px 20px;">
              <div style="font-size: 2.5rem; margin-bottom: 8px;">📦</div>
              <h3>No past orders found</h3>
              <p style="margin-bottom: 16px;">When you place orders, they will appear here for tracking and invoice generation.</p>
              <a href="#/catalog" class="btn btn-primary btn-sm">Start Shopping</a>
            </div>
          `;
        } else {
          container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 16px;">
              ${orders.map(order => `
                <div class="card" style="padding: 20px;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <div>
                      <strong style="font-size: 1.1rem;">${order.orderNumber}</strong>
                      <div style="font-size: 0.8rem; color: var(--text-muted);">Placed on ${Utils.formatDate(order.createdAt)}</div>
                    </div>
                    <div style="text-align: right;">
                      <span class="status-pill ${order.status}">${order.status}</span>
                      <div style="font-weight: 700; font-size: 1.1rem; margin-top: 4px;">${Utils.formatCurrency(order.totals.grandTotal)}</div>
                    </div>
                  </div>

                  <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
                    ${order.items.map(item => `
                      <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                        <span>${item.quantity}x ${Utils.escapeHtml(item.name)}</span>
                        <span>${Utils.formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    `).join('')}
                  </div>

                  <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 12px;">
                    <span style="font-size: 0.85rem; color: var(--text-secondary);">
                      🚚 Tracking: <strong>${order.tracking?.trackingNumber || 'N/A'}</strong> (${order.tracking?.status || 'Pending'})
                    </span>
                    <button class="btn btn-outline btn-sm" onclick="AccountView.openOrderTracking('${order.id}')">View Tracking Details</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }
      } catch (err) {
        container.innerHTML = `<p style="color: var(--color-danger);">${Utils.escapeHtml(err.message)}</p>`;
      }
    } else if (this.currentTab === 'profile') {
      const user = store.get('user');
      container.innerHTML = `
        <div class="card" style="max-width: 600px; padding: 24px;">
          <h3 style="margin-bottom: 16px;">Update Personal Details</h3>
          <form onsubmit="AccountView.handleProfileUpdate(event)">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" id="prof-name" class="form-input" value="${Utils.escapeHtml(user.name)}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input type="tel" id="prof-phone" class="form-input" value="${Utils.escapeHtml(user.phone || '')}" />
            </div>

            <h4 style="margin: 20px 0 12px; border-top: 1px solid var(--border-subtle); padding-top: 16px;">Change Password</h4>
            <div class="form-group">
              <label class="form-label">Current Password</label>
              <input type="password" id="prof-cur-pass" class="form-input" placeholder="••••••••" />
            </div>
            <div class="form-group">
              <label class="form-label">New Password</label>
              <input type="password" id="prof-new-pass" class="form-input" placeholder="••••••••" />
            </div>

            <button type="submit" class="btn btn-primary" style="margin-top: 16px;">Save Changes</button>
          </form>
        </div>
      `;
    } else if (this.currentTab === 'addresses') {
      const user = store.get('user');
      const addresses = user.addresses || [];

      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3>Saved Shipping Addresses</h3>
          <button class="btn btn-primary btn-sm" onclick="AccountView.openAddAddressModal()">+ Add Address</button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
          ${addresses.length === 0 ? `
            <p style="color: var(--text-muted);">No addresses saved yet.</p>
          ` : addresses.map(addr => `
            <div class="card" style="padding: 16px; position: relative;">
              ${addr.isDefault ? `<span class="badge badge-accent" style="margin-bottom: 8px;">Default</span>` : ''}
              <h4 style="margin-bottom: 4px;">${Utils.escapeHtml(addr.label)}</h4>
              <div style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.4;">
                ${Utils.escapeHtml(addr.street)}<br>
                ${Utils.escapeHtml(addr.city)}, ${Utils.escapeHtml(addr.state)} ${Utils.escapeHtml(addr.postalCode)}<br>
                ${Utils.escapeHtml(addr.country)}
              </div>
              <button style="background:none;border:none;color:var(--color-danger);font-size:0.8rem;cursor:pointer;margin-top:12px;" onclick="AccountView.deleteAddress('${addr.id}')">Delete</button>
            </div>
          `).join('')}
        </div>
      `;
    }
  },

  async handleProfileUpdate(e) {
    e.preventDefault();
    const name = document.getElementById('prof-name').value;
    const phone = document.getElementById('prof-phone').value;
    const currentPassword = document.getElementById('prof-cur-pass').value;
    const newPassword = document.getElementById('prof-new-pass').value;

    try {
      const res = await api.updateProfile({ name, phone, currentPassword, newPassword });
      store.set('user', res.data);
      Toast.success('Profile updated successfully');
    } catch (err) {
      Toast.error(err.message || 'Failed to update profile');
    }
  },

  openAddAddressModal() {
    const content = `
      <form onsubmit="AccountView.handleAddAddress(event)">
        <div class="form-group">
          <label class="form-label">Address Nickname (e.g. Home, Office)</label>
          <input type="text" id="new-addr-label" class="form-input" placeholder="Home" required />
        </div>
        <div class="form-group">
          <label class="form-label">Street Address</label>
          <input type="text" id="new-addr-street" class="form-input" placeholder="100 Main St" required />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">City</label>
            <input type="text" id="new-addr-city" class="form-input" required />
          </div>
          <div class="form-group">
            <label class="form-label">State</label>
            <input type="text" id="new-addr-state" class="form-input" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Postal Code</label>
            <input type="text" id="new-addr-zip" class="form-input" required />
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block" style="margin-top: 16px;">Save Address</button>
      </form>
    `;

    Modal.open({ title: 'Add New Address', contentHtml: content });
  },

  async handleAddAddress(e) {
    e.preventDefault();
    const label = document.getElementById('new-addr-label').value;
    const street = document.getElementById('new-addr-street').value;
    const city = document.getElementById('new-addr-city').value;
    const state = document.getElementById('new-addr-state').value;
    const postalCode = document.getElementById('new-addr-zip').value;

    try {
      await api.addAddress({ label, street, city, state, postalCode });
      const userRes = await api.getMe();
      store.set('user', userRes.data);
      Toast.success('Address saved!');
      Modal.close();
      this.renderTabContent();
    } catch (err) {
      Toast.error(err.message || 'Could not save address');
    }
  },

  async deleteAddress(id) {
    try {
      await api.deleteAddress(id);
      const userRes = await api.getMe();
      store.set('user', userRes.data);
      Toast.info('Address removed');
      this.renderTabContent();
    } catch (err) {
      Toast.error('Could not delete address');
    }
  },

  async openOrderTracking(orderId) {
    try {
      const res = await api.getOrder(orderId);
      const order = res.data;
      const tracking = order.tracking || {};
      const history = tracking.history || [];

      const content = `
        <div>
          <div style="background: var(--bg-surface-subtle); padding: 14px; border-radius: var(--radius-md); margin-bottom: 20px;">
            <div style="font-weight: 700; font-size: 1.1rem;">${order.orderNumber}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 2px;">
              Carrier: <strong>${tracking.carrier}</strong> • Tracking #: <strong>${tracking.trackingNumber}</strong>
            </div>
            <div style="margin-top: 8px;">Status: <span class="badge badge-accent">${tracking.status}</span></div>
          </div>

          <h4 style="margin-bottom: 12px;">Shipment Milestones</h4>
          <div style="display: flex; flex-direction: column; gap: 14px; border-left: 2px solid var(--color-accent); padding-left: 16px; margin-left: 8px;">
            ${history.map(h => `
              <div>
                <div style="font-weight: 700; font-size: 0.95rem;">${Utils.escapeHtml(h.status)}</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">${Utils.escapeHtml(h.description)}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${Utils.formatDate(h.timestamp)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      Modal.open({ title: 'Package Live Tracking', contentHtml: content });
    } catch (err) {
      Toast.error('Could not load tracking details');
    }
  }
};
