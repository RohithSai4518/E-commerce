/**
 * Zero-Dependency Test Runner & Assertion Library
 */

class TestRunner {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.passed = 0;
    this.failed = 0;
  }

  describe(name, fn) {
    const suite = { name, tests: [], beforeAll: [], afterAll: [] };
    this.suites.push(suite);
    this.currentSuite = suite;
    fn();
  }

  it(name, fn) {
    if (this.currentSuite) {
      this.currentSuite.tests.push({ name, fn });
    }
  }

  async run() {
    console.log('\n🧪 Running Automated E-Commerce Test Suite...\n');
    const startTime = Date.now();

    for (const suite of this.suites) {
      console.log(`📁 Suite: ${suite.name}`);
      for (const test of suite.tests) {
        try {
          await test.fn();
          this.passed++;
          console.log(`   ✅ PASS: ${test.name}`);
        } catch (err) {
          this.failed++;
          console.log(`   ❌ FAIL: ${test.name}`);
          console.log(`      Error: ${err.message}`);
          if (err.stack) {
            console.log(`      ${err.stack.split('\n')[1]}`);
          }
        }
      }
      console.log('');
    }

    const duration = Date.now() - startTime;
    console.log('==============================================');
    console.log(`🏁 Test Summary: ${this.passed} Passed, ${this.failed} Failed (${duration}ms)`);
    console.log('==============================================\n');

    if (this.failed > 0) {
      process.exitCode = 1;
    }
  }
}

const runner = new TestRunner();

// Custom Assertions
const assert = {
  strictEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected} but received ${actual}`);
    }
  },
  ok(value, message) {
    if (!value) {
      throw new Error(message || `Expected truthy value but received ${value}`);
    }
  },
  deepStrictEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(message || `Expected deep equality: ${JSON.stringify(expected)} vs ${JSON.stringify(actual)}`);
    }
  },
  throws(fn, message) {
    let threw = false;
    try {
      fn();
    } catch (e) {
      threw = true;
    }
    if (!threw) {
      throw new Error(message || 'Expected function to throw an error');
    }
  },
  async rejects(promise, message) {
    let rejected = false;
    try {
      await promise;
    } catch (e) {
      rejected = true;
    }
    if (!rejected) {
      throw new Error(message || 'Expected promise to reject');
    }
  }
};

module.exports = {
  describe: (name, fn) => runner.describe(name, fn),
  it: (name, fn) => runner.it(name, fn),
  assert,
  runner
};
