/**
 * Universal Modal Dialog Controller
 */

const Modal = {
  backdrop: null,
  dialog: null,

  init() {
    this.backdrop = document.getElementById('modal-backdrop');
    this.dialog = document.getElementById('modal-dialog');

    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.backdrop.classList.contains('open')) {
        this.close();
      }
    });
  },

  open({ title, contentHtml, footerHtml = '' }) {
    if (!this.backdrop) this.init();

    this.dialog.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${Utils.escapeHtml(title)}</h3>
        <button class="modal-close-btn" onclick="Modal.close()">&times;</button>
      </div>
      <div class="modal-body">${contentHtml}</div>
      ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
    `;

    this.backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  close() {
    if (!this.backdrop) return;
    this.backdrop.classList.remove('open');
    document.body.style.overflow = '';
  },

  /**
   * Open standard Auth Modal (Login / Register Tabs)
   */
  openAuth(defaultTab = 'login') {
    const content = `
      <div style="display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
        <button id="tab-login-btn" class="btn ${defaultTab === 'login' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="Modal.switchAuthTab('login')">Sign In</button>
        <button id="tab-register-btn" class="btn ${defaultTab === 'register' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="Modal.switchAuthTab('register')">Create Account</button>
      </div>

      <div id="auth-login-form" style="display: ${defaultTab === 'login' ? 'block' : 'none'};">
        <form onsubmit="Modal.handleLogin(event)">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" id="login-email" class="form-input" placeholder="sarah.j@example.com" required value="sarah.j@example.com">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="login-password" class="form-input" placeholder="••••••••" required value="DemoPassword123!">
          </div>
          <div style="margin-top: 10px; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
            Demo account: <strong>sarah.j@example.com</strong> / <strong>DemoPassword123!</strong><br>
            Admin portal: <strong>admin@ecommerce.local</strong> / <strong>AdminSecret2026!</strong>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Sign In</button>
        </form>
      </div>

      <div id="auth-register-form" style="display: ${defaultTab === 'register' ? 'block' : 'none'};">
        <form onsubmit="Modal.handleRegister(event)">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" id="reg-name" class="form-input" placeholder="Alex Morgan" required>
          </div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" id="reg-email" class="form-input" placeholder="alex@example.com" required>
          </div>
          <div class="form-group">
            <label class="form-label">Password (Min 8 chars)</label>
            <input type="password" id="reg-password" class="form-input" placeholder="••••••••" required minlength="8">
          </div>
          <button type="submit" class="btn btn-accent btn-block" style="margin-top: 16px;">Create My Account</button>
        </form>
      </div>
    `;

    this.open({
      title: 'Welcome to AuraCommerce',
      contentHtml: content
    });
  },

  switchAuthTab(tab) {
    const loginForm = document.getElementById('auth-login-form');
    const regForm = document.getElementById('auth-register-form');
    const loginBtn = document.getElementById('tab-login-btn');
    const regBtn = document.getElementById('tab-register-btn');

    if (tab === 'login') {
      loginForm.style.display = 'block';
      regForm.style.display = 'none';
      loginBtn.className = 'btn btn-primary btn-sm';
      regBtn.className = 'btn btn-secondary btn-sm';
    } else {
      loginForm.style.display = 'none';
      regForm.style.display = 'block';
      loginBtn.className = 'btn btn-secondary btn-sm';
      regBtn.className = 'btn btn-primary btn-sm';
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const res = await api.login(email, password);
      store.set('token', res.data.token);
      store.set('user', res.data.user);
      Toast.success(`Welcome back, ${res.data.user.name}!`);
      Modal.close();

      // Refresh cart with merged items
      const cartRes = await api.getCart();
      store.set('cart', cartRes.data);
    } catch (err) {
      Toast.error(err.message || 'Login failed');
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
      const res = await api.register({ name, email, password });
      store.set('token', res.data.token);
      store.set('user', res.data.user);
      Toast.success(`Account created successfully! Welcome, ${name}.`);
      Modal.close();
    } catch (err) {
      Toast.error(err.message || 'Registration failed');
    }
  }
};
