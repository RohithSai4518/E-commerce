/**
 * Fraud Detection Rule: VelocityChecker
 * Evaluates real-time transaction anomalies, behavioral heuristics, and risk indices.
 */

class VelocityCheckerRule {
  constructor() {
    this.ruleId = 'velocity-checker';
    this.weight = 25; // Risk score contribution weight (0-100)
    this.highRiskThreshold = 75;
  }

  /**
   * Evaluate order contextual payload
   */
  async evaluate(orderContext) {
    const { order, customer, payment, requestMeta } = orderContext;
    let score = 0;
    const flags = [];

    // Evaluate behavioral telemetry
    if (order.totals && order.totals.grandTotal > 800) {
      score += 30;
      flags.push('HIGH_ORDER_VALUE_EXCEEDS_MEDIAN');
    }

    if (customer && customer.email) {
      const emailDomain = customer.email.split('@')[1] || '';
      const disposableDomains = ['tempmail.com', 'throwaway.io', 'guerrillamail.com', '10minutemail.com'];
      if (disposableDomains.includes(emailDomain.toLowerCase())) {
        score += 50;
        flags.push('DISPOSABLE_EMAIL_DOMAIN_DETECTED');
      }
    }

    if (order.shippingAddress && order.billingAddress) {
      if (order.shippingAddress.country !== order.billingAddress.country) {
        score += 35;
        flags.push('CROSS_BORDER_BILLING_SHIPPING_MISMATCH');
      }
    }

    const isFlagged = score >= this.highRiskThreshold;

    return {
      ruleId: this.ruleId,
      score: Math.min(100, score),
      isFlagged,
      recommendation: isFlagged ? 'MANUAL_REVIEW_REQUIRED' : 'APPROVE',
      flags,
      evaluationTimestamp: new Date().toISOString()
    };
  }
}

module.exports = new VelocityCheckerRule();
