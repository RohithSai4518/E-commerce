/**
 * AuraCommerce Client Application Bootstrap & SPA Hash Router
 */

const App = {
  rootEl: null,

  async init() {
    this.rootEl = document.getElementById('app-root');

    // Initialize Global Components
    Toast.init();
    Modal.init();
    Navbar.init();
    CartDrawer.init();

    // Top ticker close handler
    const tickerClose = document.getElementById('ticker-close-btn');
    if (tickerClose) {
      tickerClose.addEventListener('click', () => {
        document.getElementById('top-ticker')?.remove();
      });
    }

    // 1. Fetch current session / authenticated user if token exists
    if (store.get('token')) {
      try {
        const userRes = await api.getMe();
        store.set('user', userRes.data);
      } catch (e) {
        store.set('token', null);
      }
    }

    // 2. Fetch categories and initial cart
    try {
      const [catRes, cartRes] = await Promise.all([
        api.getCategories(),
        api.getCart()
      ]);
      store.set('categories', catRes.data);
      store.set('cart', cartRes.data);
    } catch (e) {
      console.warn('[App Init Error]:', e);
    }

    // 3. Setup Hash Router
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  handleRoute() {
    const hash = window.location.hash || '#/';
    const [pathPart, queryPart] = hash.split('?');

    const queryParams = {};
    if (queryPart) {
      const searchParams = new URLSearchParams(queryPart);
      for (const [key, value] of searchParams.entries()) {
        queryParams[key] = value;
      }
    }

    Navbar.render();
    window.scrollTo(0, 0);

    // Route Matching
    if (pathPart === '#/' || pathPart === '#' || pathPart === '') {
      HomeView.render(this.rootEl);
    } else if (pathPart === '#/catalog') {
      CatalogView.render(this.rootEl, queryParams);
    } else if (pathPart.startsWith('#/product/')) {
      const slug = pathPart.replace('#/product/', '');
      ProductView.render(this.rootEl, { slug, ...queryParams });
    } else if (pathPart === '#/cart') {
      CartView.render(this.rootEl);
    } else if (pathPart === '#/checkout') {
      CheckoutView.render(this.rootEl);
    } else if (pathPart === '#/account') {
      AccountView.render(this.rootEl);
    } else if (pathPart === '#/admin') {
      AdminView.render(this.rootEl);
    } else {
      this.rootEl.innerHTML = `
        <div class="container" style="padding: 80px 0; text-align: center;">
          <h1>404 - Page Not Found</h1>
          <p style="margin: 12px 0 24px;">The page you are looking for does not exist.</p>
          <a href="#/" class="btn btn-primary">Return Home</a>
        </div>
      `;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
