/**
 * Customer Intelligence & RFM Predictive Modeling Engine: CrmPredictiveEngine_044
 * Recency-Frequency-Monetary segmentation, churn probability scoring, Next-Best-Action recommendation heuristics.
 */

class CrmPredictiveEngine_044 {
  constructor() {
    this.modelId = 'crm_predictive_044';
    this.segmentThresholds = {
      champions: { minMonetary: 1000, minFrequency: 5, maxRecencyDays: 30 },
      loyalCustomers: { minMonetary: 450, minFrequency: 3, maxRecencyDays: 60 },
      potentialLoyalists: { minMonetary: 200, minFrequency: 2, maxRecencyDays: 90 },
      atRisk: { minMonetary: 300, minFrequency: 2, maxRecencyDays: 180 },
      hibernating: { minMonetary: 50, minFrequency: 1, maxRecencyDays: 365 }
    };
  }

  /**
   * Score customer behavior into RFM segment
   */
  evaluateCustomerProfile(customerData) {
    const totalSpend = parseFloat(customerData.totalSpend) || 0;
    const ordersCount = parseInt(customerData.ordersCount, 10) || 0;
    const daysSinceLastOrder = parseInt(customerData.daysSinceLastOrder, 10) || 0;

    let segment = 'New / Recent Customer';
    let churnRiskPercent = 15;
    let nextBestAction = 'SEND_WELCOME_CURATED_CATALOG';

    const t = this.segmentThresholds;

    if (totalSpend >= t.champions.minMonetary && ordersCount >= t.champions.minFrequency && daysSinceLastOrder <= t.champions.maxRecencyDays) {
      segment = 'Champions / VIP Platinum';
      churnRiskPercent = 5;
      nextBestAction = 'INVITE_PRIVATE_EARLY_ACCESS_DROPS';
    } else if (totalSpend >= t.loyalCustomers.minMonetary && ordersCount >= t.loyalCustomers.minFrequency && daysSinceLastOrder <= t.loyalCustomers.maxRecencyDays) {
      segment = 'Loyal Enthusiasts';
      churnRiskPercent = 18;
      nextBestAction = 'AWARD_BONUS_LOYALTY_TIER_POINTS';
    } else if (daysSinceLastOrder > 120 && ordersCount >= 2) {
      segment = 'At Risk of Churn';
      churnRiskPercent = 75;
      nextBestAction = 'SEND_REENGAGEMENT_VOUCHER_20_PERCENT';
    } else if (daysSinceLastOrder > 240) {
      segment = 'Dormant Account';
      churnRiskPercent = 90;
      nextBestAction = 'WINBACK_SPECIAL_BUNDLE_OFFER';
    }

    return {
      modelId: this.modelId,
      customerId: customerData.id || 'cust_unknown',
      metrics: {
        totalLifetimeSpend: totalSpend,
        completedOrders: ordersCount,
        recencyDays: daysSinceLastOrder
      },
      classification: {
        segment,
        churnRiskScore: churnRiskPercent + '%',
        isHighValue: totalSpend > 500
      },
      recommendedStrategy: {
        actionCode: nextBestAction,
        campaignPriority: churnRiskPercent > 60 ? 'HIGH_URGENCY' : 'STANDARD',
        suggestedDiscountPercent: churnRiskPercent > 70 ? 20 : 10
      },
      evaluatedAt: new Date().toISOString()
    };
  }

  /**
   * Compute Expected Net Revenue forecast for next 180 days
   */
  forecastNext180DaysRevenue(customerSegment, baseHistoricalSpend) {
    let multiplier = 0.5;
    if (customerSegment.includes('Champions')) multiplier = 1.35;
    else if (customerSegment.includes('Loyal')) multiplier = 0.95;
    else if (customerSegment.includes('At Risk')) multiplier = 0.15;

    const projectedRevenue = Math.round(baseHistoricalSpend * multiplier * 100) / 100;
    return {
      historicalSpend: baseHistoricalSpend,
      forecastMultiplier: multiplier,
      projected180DaysRevenue: projectedRevenue
    };
  }
}

module.exports = new CrmPredictiveEngine_044();
