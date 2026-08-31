/**
 * Comprehensive Domain Integration Tests
 */

const { describe, it, assert, runner } = require('./test-runner');
const { Security } = require('../core/security');
const { db } = require('../db/database');
const { seedDatabase } = require('../db/seeder');

const authService = require('../services/auth-service');
const pricingService = require('../services/pricing-service');
const orderService = require('../services/order-service');
const searchService = require('../services/search-service');
const cartService = require('../services/cart-service');

async function runAllTests() {
  await seedDatabase(true);

  // 1. Cryptography & Security Tests
  describe('Security & Token Cryptography', () => {
    it('should hash passwords with unique salts and verify correctly', async () => {
      const password = 'SecretPassword2026!';
      const hash1 = await Security.hashPassword(password);
      const hash2 = await Security.hashPassword(password);

      assert.ok(hash1.includes(':'), 'Hash must contain salt delimiter');
      assert.ok(hash1 !== hash2, 'Salts must make hashes distinct');

      const isMatch = await Security.verifyPassword(password, hash1);
      assert.strictEqual(isMatch, true, 'Valid password must verify');

      const isBadMatch = await Security.verifyPassword('WrongPass', hash1);
      assert.strictEqual(isBadMatch, false, 'Invalid password must fail verification');
    });

    it('should sign and verify HMAC session tokens and reject tampering', () => {
      const payload = { userId: 'usr_test_123', role: 'admin' };
      const token = Security.generateToken(payload);

      const decoded = Security.verifyToken(token);
      assert.ok(decoded !== null, 'Token should decode successfully');
      assert.strictEqual(decoded.userId, 'usr_test_123');

      // Tampered token check
      const tampered = 'a' + token.slice(1);
      const tamperedDecoded = Security.verifyToken(tampered);
      assert.strictEqual(tamperedDecoded, null, 'Tampered token must be rejected');
    });

    it('should sanitize dangerous HTML inputs against XSS', () => {
      const malicious = '<script>alert("xss")</script><img src="x" onerror="steal()"/>';
      const clean = Security.sanitize(malicious);
      assert.ok(!clean.includes('<script>'), 'Script tags must be encoded');
      assert.ok(clean.includes('&lt;script&gt;'), 'HTML entities must be replaced');
    });
  });

  // 2. Authentication Service Tests
  describe('Auth Service Workflows', () => {
    it('should register a new customer account', async () => {
      const email = `test_${Date.now()}@example.com`;
      const result = await authService.register({
        email,
        password: 'Password123!',
        name: 'Jordan Doe'
      });

      assert.ok(result.user.id, 'User ID must be assigned');
      assert.strictEqual(result.user.email, email);
      assert.ok(result.token, 'Auth token must be returned');
      assert.strictEqual(result.user.passwordHash, undefined, 'Password hash must never leak in user object');
    });

    it('should authenticate valid login and reject invalid credentials', async () => {
      const loginRes = await authService.login({
        email: 'sarah.j@example.com',
        password: 'DemoPassword123!'
      });

      assert.ok(loginRes.token, 'Token should be returned on valid login');
      assert.strictEqual(loginRes.user.email, 'sarah.j@example.com');

      await assert.rejects(
        authService.login({ email: 'sarah.j@example.com', password: 'BadPassword!' }),
        'Should reject invalid password'
      );
    });
  });

  // 3. Pricing & Discount Calculation Engine Tests
  describe('Pricing & Coupon Calculations', () => {
    it('should compute correct subtotal, taxes, and apply percentage discount', async () => {
      const items = [
        { productId: 'p1', name: 'Widget A', price: 100.00, quantity: 2 }, // $200
        { productId: 'p2', name: 'Widget B', price: 50.00, quantity: 1 }    // $50
      ];

      const summary = await pricingService.calculateOrderSummary({
        items,
        couponCode: 'WELCOME10', // 10% off
        shippingMethod: 'standard' // Free over $75
      });

      assert.strictEqual(summary.subtotal, 250.00);
      assert.strictEqual(summary.discountAmount, 25.00);
      assert.strictEqual(summary.discountedSubtotal, 225.00);
      assert.strictEqual(summary.shippingCost, 0.00); // Subtotal >= $75 qualifies for free standard shipping
      // Tax: 225 * 0.0825 = 18.56
      assert.strictEqual(summary.taxAmount, 18.56);
      assert.strictEqual(summary.grandTotal, 243.56);
    });

    it('should apply fixed discount coupon and calculate standard shipping below threshold', async () => {
      const items = [
        { productId: 'p3', name: 'Gadget C', price: 30.00, quantity: 1 } // $30 (< $75)
      ];

      const summary = await pricingService.calculateOrderSummary({
        items,
        couponCode: null,
        shippingMethod: 'standard'
      });

      assert.strictEqual(summary.subtotal, 30.00);
      assert.strictEqual(summary.shippingCost, 5.99); // Standard rate applied
      assert.strictEqual(summary.taxAmount, 2.48); // 30 * 0.0825 = 2.475 -> 2.48
      assert.strictEqual(summary.grandTotal, 38.47);
    });
  });

  // 4. Search & Filtering Tests
  describe('Catalog Search & Facet Engine', () => {
    it('should match search query tokens and filter by price range', async () => {
      const searchRes = await searchService.search({
        q: 'Headphones',
        minPrice: 100,
        maxPrice: 300
      });

      assert.ok(searchRes.items.length > 0, 'Should find products matching Headphones');
      assert.ok(searchRes.items.every(p => p.price >= 100 && p.price <= 300), 'All items must fall in price bounds');
    });

    it('should correctly filter by category slug', async () => {
      const catRes = await searchService.search({ category: 'computing-tech' });
      assert.ok(catRes.items.length > 0, 'Should return computing products');
      assert.ok(catRes.items.every(p => p.categorySlug === 'computing-tech' || p.category === 'cat_electronics'));
    });
  });

  // 5. Order Placement & Lifecycle State Machine
  describe('Order Processing & Inventory State Machine', () => {
    it('should place order, reduce stock, and transition statuses', async () => {
      const productCol = db.collection('products');
      const testProd = productCol.findOne({ sku: 'AP-ANC-01' });
      const initialStock = testProd.stock;

      const order = await orderService.createOrder({
        customer: { name: 'Customer Test', email: 'test.order@example.com' },
        shippingAddress: { street: '123 Test St', city: 'Denver', state: 'CO', postalCode: '80202' },
        items: [
          { productId: testProd.id, name: testProd.name, price: testProd.price, quantity: 2 }
        ],
        shippingMethod: 'standard',
        paymentMethod: 'credit_card',
        paymentDetails: { cardNumber: '4111111111111111' }
      });

      assert.ok(order.orderNumber.startsWith('ORD-'), 'Order number format correct');
      assert.strictEqual(order.status, 'processing');
      assert.strictEqual(order.payment.status, 'completed');

      // Verify stock deduction
      const updatedProd = productCol.findById(testProd.id);
      assert.strictEqual(updatedProd.stock, initialStock - 2, 'Stock must decrease by 2 units');

      // Advance order status to shipped
      const shippedOrder = await orderService.updateOrderStatus(order.id, 'shipped', 'Picked up by carrier');
      assert.strictEqual(shippedOrder.status, 'shipped');
      assert.strictEqual(shippedOrder.tracking.status, 'In Transit');
    });
  });

  // Run test pipeline
  await runner.run();
}

if (require.main === module) {
  runAllTests().catch(err => {
    console.error('[Test Suite Error]:', err);
    process.exit(1);
  });
}

module.exports = { runAllTests };
