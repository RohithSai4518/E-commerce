/**
 * Administrative Dashboard & Operations View
 */

const AdminView = {
  currentTab: 'analytics', // analytics, orders, products, coupons

  async render(rootEl) {
    const user = store.get('user');

    if (!user || user.role !== 'admin') {
      rootEl.innerHTML = `
        <div class="container" style="padding: 80px 0; text-align: center;">
          <h2>Administrator Access Required</h2>
          <p style="margin: 12px 0 24px;">Please sign in with administrative credentials.</p>
          <button class="btn btn-primary btn-lg" onclick="Modal.openAuth('login')">Admin Sign In</button>
        </div>
      `;
      return;
    }

    rootEl.innerHTML = `
      <div class="container" style="padding-top: var(--space-8);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-6);">
          <div>
            <h1>Operations Console</h1>
            <p>System metrics, product inventory, and order fulfillment</p>
          </div>
          <span class="badge badge-accent">Production Environment</span>
        </div>

        <div class="admin-layout">
          <!-- Sidebar Nav -->
          <aside class="admin-sidebar">
            <ul class="admin-nav-list">
              <li>
                <button class="admin-nav-btn ${this.currentTab === 'analytics' ? 'active' : ''}" onclick="AdminView.switchTab('analytics')">
                  📊 Analytics & KPIs
                </button>
              </li>
              <li>
                <button class="admin-nav-btn ${this.currentTab === 'orders' ? 'active' : ''}" onclick="AdminView.switchTab('orders')">
                  📦 Order Fulfillment
                </button>
              </li>
              <li>
                <button class="admin-nav-btn ${this.currentTab === 'products' ? 'active' : ''}" onclick="AdminView.switchTab('products')">
                  🏷️ Catalog & Inventory
                </button>
              </li>
              <li>
                <button class="admin-nav-btn ${this.currentTab === 'coupons' ? 'active' : ''}" onclick="AdminView.switchTab('coupons')">
                  🎟️ Promotional Coupons
                </button>
              </li>
            </ul>
          </aside>

          <!-- Main Admin Content Area -->
          <section id="admin-content-panel">
            <div class="view-loading-spinner"><div class="spinner-ring"></div></div>
          </section>
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
    const panel = document.getElementById('admin-content-panel');
    if (!panel) return;

    if (this.currentTab === 'analytics') {
      try {
        const res = await api.getAdminAnalytics();
        const data = res.data;
        const kpis = data.kpis;
        const inv = data.inventory;

        panel.innerHTML = `
          <!-- KPI Cards -->
          <div class="admin-metrics-grid">
            <div class="metric-card">
              <span class="metric-title">Total Revenue</span>
              <span class="metric-value">${Utils.formatCurrency(kpis.totalRevenue)}</span>
              <span class="metric-sub">↑ From all settled orders</span>
            </div>
            <div class="metric-card">
              <span class="metric-title">Total Orders</span>
              <span class="metric-value">${kpis.totalOrders}</span>
              <span class="metric-sub">${kpis.successfulOrders} fulfilled / processing</span>
            </div>
            <div class="metric-card">
              <span class="metric-title">Average Order Value</span>
              <span class="metric-value">${Utils.formatCurrency(kpis.averageOrderValue)}</span>
              <span class="metric-sub">Across customer base</span>
            </div>
            <div class="metric-card">
              <span class="metric-title">Stock Health</span>
              <span class="metric-value" style="color: ${inv.lowStockCount > 0 ? 'var(--color-warning)' : 'var(--color-success)'};">${inv.totalSKUs} SKUs</span>
              <span class="metric-sub" style="color: var(--color-warning);">${inv.lowStockCount} low stock alerts</span>
            </div>
          </div>

          <!-- SVG Sales Trend Chart -->
          <div class="admin-chart-box">
            <div class="chart-header">
              <h3>7-Day Revenue Velocity</h3>
              <span style="font-size: 0.85rem; color: var(--text-muted);">Real-time metrics</span>
            </div>
            ${this.renderSvgChart(data.charts.revenueTimeline)}
          </div>

          <!-- Low Stock Warnings Table -->
          ${inv.lowStockItems.length > 0 ? `
            <div class="card" style="padding: 20px; margin-bottom: 24px;">
              <h3 style="color: var(--color-warning); margin-bottom: 12px;">⚠️ Low Inventory Restock Warnings</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                <thead>
                  <tr style="border-bottom: 1px solid var(--border-subtle); text-align: left;">
                    <th style="padding: 8px 0;">Product</th>
                    <th style="padding: 8px 0;">SKU</th>
                    <th style="padding: 8px 0;">Remaining Stock</th>
                  </tr>
                </thead>
                <tbody>
                  ${inv.lowStockItems.map(item => `
                    <tr style="border-bottom: 1px solid var(--border-subtle);">
                      <td style="padding: 8px 0; font-weight: 600;">${Utils.escapeHtml(item.name)}</td>
                      <td style="padding: 8px 0; color: var(--text-muted);">${item.sku}</td>
                      <td style="padding: 8px 0; color: var(--color-danger); font-weight: 700;">${item.stock} Units</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
        `;
      } catch (err) {
        panel.innerHTML = `<p style="color: var(--color-danger);">${Utils.escapeHtml(err.message)}</p>`;
      }
    } else if (this.currentTab === 'orders') {
      try {
        const res = await api.getAdminOrders();
        const orders = res.data;

        panel.innerHTML = `
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${orders.map(order => `
                  <tr>
                    <td><strong>${order.orderNumber}</strong></td>
                    <td>${Utils.escapeHtml(order.customer?.name)}<br><span style="font-size: 0.75rem; color: var(--text-muted);">${order.customer?.email}</span></td>
                    <td>${Utils.formatDate(order.createdAt)}</td>
                    <td><strong>${Utils.formatCurrency(order.totals?.grandTotal)}</strong></td>
                    <td><span class="badge badge-accent">${order.payment?.method}</span></td>
                    <td><span class="status-pill ${order.status}">${order.status}</span></td>
                    <td>
                      <select onchange="AdminView.updateOrderStatus('${order.id}', this.value)" class="form-select" style="font-size: 0.8rem; padding: 2px 6px;">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                      </select>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      } catch (err) {
        panel.innerHTML = `<p style="color: var(--color-danger);">${Utils.escapeHtml(err.message)}</p>`;
      }
    } else if (this.currentTab === 'products') {
      try {
        const res = await api.getAdminProducts();
        const products = res.data;

        panel.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3>Product Catalog (${products.length} Items)</h3>
            <button class="btn btn-primary btn-sm" onclick="AdminView.openCreateProductModal()">+ Add New Product</button>
          </div>

          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${products.map(p => `
                  <tr>
                    <td><strong>${Utils.escapeHtml(p.name)}</strong></td>
                    <td>${p.sku}</td>
                    <td>${Utils.formatCurrency(p.price)}</td>
                    <td>${p.stock <= 5 ? `<span style="color:var(--color-danger);font-weight:700;">${p.stock}</span>` : p.stock}</td>
                    <td>${p.rating} ★ (${p.reviewCount})</td>
                    <td>
                      <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary btn-sm" onclick="AdminView.openEditProductModal('${p.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="AdminView.deleteProduct('${p.id}')">Delete</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      } catch (err) {
        panel.innerHTML = `<p style="color: var(--color-danger);">${Utils.escapeHtml(err.message)}</p>`;
      }
    } else if (this.currentTab === 'coupons') {
      try {
        const res = await api.getAdminCoupons();
        const coupons = res.data;

        panel.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3>Promotions & Coupons</h3>
            <button class="btn btn-primary btn-sm" onclick="AdminView.openCreateCouponModal()">+ Create Coupon</button>
          </div>

          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Usage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${coupons.map(c => `
                  <tr>
                    <td><strong><code>${c.code}</code></strong></td>
                    <td>${Utils.escapeHtml(c.description)}</td>
                    <td>${c.discountType}</td>
                    <td>${c.discountType === 'percentage' ? `${c.discountValue}%` : Utils.formatCurrency(c.discountValue)}</td>
                    <td>${c.usageCount || 0} / ${c.maxUsage || '∞'}</td>
                    <td><span class="badge ${c.isActive ? 'badge-success' : 'badge-danger'}">${c.isActive ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      } catch (err) {
        panel.innerHTML = `<p style="color: var(--color-danger);">${Utils.escapeHtml(err.message)}</p>`;
      }
    }
  },

  renderSvgChart(timeline = []) {
    if (!timeline || timeline.length === 0) return '<p>No historical data</p>';

    const width = 700;
    const height = 200;
    const padding = 30;

    const maxVal = Math.max(...timeline.map(t => t.revenue), 100);
    const points = timeline.map((t, idx) => {
      const x = padding + (idx / (timeline.length - 1)) * (width - padding * 2);
      const y = height - padding - (t.revenue / maxVal) * (height - padding * 2);
      return { x, y, ...t };
    });

    const pathD = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');

    return `
      <svg class="svg-chart" viewBox="0 0 ${width} ${height}">
        <!-- Grid lines -->
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#e4e4e7" stroke-width="1" />
        <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="#e4e4e7" stroke-width="1" stroke-dasharray="4" />

        <!-- Line graph -->
        <path d="${pathD}" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" />

        <!-- Points -->
        ${points.map(pt => `
          <circle cx="${pt.x}" cy="${pt.y}" r="5" fill="#18181b" stroke="#ffffff" stroke-width="2" />
          <text x="${pt.x}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#71717a">${pt.date.slice(5)}</text>
        `).join('')}
      </svg>
    `;
  },

  async updateOrderStatus(orderId, status) {
    try {
      await api.updateOrderStatus(orderId, status, `Status changed to ${status} by admin.`);
      Toast.success(`Order status updated to ${status}`);
    } catch (err) {
      Toast.error('Could not update status');
    }
  },

  openCreateProductModal() {
    const categories = store.get('categories') || [];
    const content = `
      <form onsubmit="AdminView.handleCreateProduct(event)">
        <div class="form-group">
          <label class="form-label">Product Name</label>
          <input type="text" id="adm-pname" class="form-input" required />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Price ($)</label>
            <input type="number" step="0.01" id="adm-pprice" class="form-input" required />
          </div>
          <div class="form-group">
            <label class="form-label">Initial Stock</label>
            <input type="number" id="adm-pstock" class="form-input" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <select id="adm-pcat" class="form-select">
            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="adm-pdesc" class="form-textarea" required></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-block" style="margin-top: 16px;">Create Product</button>
      </form>
    `;
    Modal.open({ title: 'Add New Product', contentHtml: content });
  },

  async handleCreateProduct(e) {
    e.preventDefault();
    const name = document.getElementById('adm-pname').value;
    const price = parseFloat(document.getElementById('adm-pprice').value);
    const stock = parseInt(document.getElementById('adm-pstock').value, 10);
    const category = document.getElementById('adm-pcat').value;
    const description = document.getElementById('adm-pdesc').value;

    const catObj = (store.get('categories') || []).find(c => c.id === category);

    try {
      await api.createAdminProduct({
        name,
        price,
        stock,
        category,
        categorySlug: catObj ? catObj.slug : 'general',
        description,
        isFeatured: true
      });
      Toast.success('Product created successfully');
      Modal.close();
      this.renderTabContent();
    } catch (err) {
      Toast.error(err.message || 'Could not create product');
    }
  },

  async deleteProduct(id) {
    if (!confirm('Are you sure you want to permanently delete this product?')) return;
    try {
      await api.deleteAdminProduct(id);
      Toast.info('Product deleted');
      this.renderTabContent();
    } catch (err) {
      Toast.error('Could not delete product');
    }
  },

  openCreateCouponModal() {
    const content = `
      <form onsubmit="AdminView.handleCreateCoupon(event)">
        <div class="form-group">
          <label class="form-label">Coupon Code (Uppercase)</label>
          <input type="text" id="cpn-code" class="form-input" placeholder="SUMMER25" required style="text-transform: uppercase;" />
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <input type="text" id="cpn-desc" class="form-input" placeholder="25% off summer collection" required />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Discount Type</label>
            <select id="cpn-type" class="form-select">
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Dollar ($)</option>
              <option value="free_shipping">Free Shipping</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Discount Value</label>
            <input type="number" id="cpn-val" class="form-input" placeholder="25" required />
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block" style="margin-top: 16px;">Save Promo Code</button>
      </form>
    `;
    Modal.open({ title: 'Create Promotional Code', contentHtml: content });
  },

  async handleCreateCoupon(e) {
    e.preventDefault();
    const code = document.getElementById('cpn-code').value.trim().toUpperCase();
    const description = document.getElementById('cpn-desc').value;
    const discountType = document.getElementById('cpn-type').value;
    const discountValue = parseFloat(document.getElementById('cpn-val').value);

    try {
      await api.request('/api/admin/coupons', {
        method: 'POST',
        body: { code, description, discountType, discountValue, isActive: true, maxUsage: 500 }
      });
      Toast.success('Coupon created successfully');
      Modal.close();
      this.renderTabContent();
    } catch (err) {
      Toast.error(err.message || 'Could not create coupon');
    }
  }
};
