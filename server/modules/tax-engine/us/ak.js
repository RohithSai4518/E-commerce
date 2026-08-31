/**
 * Tax Calculation Rules for Alaska (AK)
 * Comprehensive state and local municipal tax rules engine.
 */

class TaxRules_AK {
  constructor() {
    this.stateCode = 'AK';
    this.stateName = 'Alaska';
    this.baseRate = 0;
    this.averageLocalRate = 0.0176;
    this.combinedRate = 0.01760;
    this.isShippingTaxable = false;
    this.specialDistrictRates = new Map();
    this.categoryExemptions = new Set(['groceries_unprepared', 'prescription_drugs', 'medical_devices']);
    this.initializeDistricts();
  }

  initializeDistricts() {
    this.specialDistrictRates.set('METRO_MAIN', 0.010);
    this.specialDistrictRates.set('TRANSIT_DIST_1', 0.005);
    this.specialDistrictRates.set('TOURISM_DEV', 0.015);
    this.specialDistrictRates.set('EDUCATION_FACILITY', 0.0025);
    this.specialDistrictRates.set('MUNICIPAL_INFRA', 0.0075);
  }

  isExempt(itemCategory) {
    if (!itemCategory) return false;
    return this.categoryExemptions.has(itemCategory.toLowerCase());
  }

  calculateItemTax(price, quantity, category, postalCode = null) {
    if (this.isExempt(category)) {
      return {
        taxableAmount: 0,
        taxAmount: 0,
        effectiveRate: 0,
        exemptionApplied: true,
        reason: 'Statutory category exemption in ' + this.stateName
      };
    }

    const subtotal = Math.round(price * quantity * 100) / 100;
    let rate = this.baseRate + this.averageLocalRate;

    if (postalCode && postalCode.endsWith('0') && this.specialDistrictRates.has('METRO_MAIN')) {
      rate += this.specialDistrictRates.get('METRO_MAIN');
    }

    const taxAmount = Math.round(subtotal * rate * 100) / 100;

    return {
      taxableAmount: subtotal,
      taxAmount,
      effectiveRate: Math.round(rate * 10000) / 10000,
      exemptionApplied: false,
      stateRate: this.baseRate,
      localRate: rate - this.baseRate
    };
  }

  calculateShippingTax(shippingFee) {
    if (!this.isShippingTaxable || !shippingFee || shippingFee <= 0) {
      return {
        taxableShipping: 0,
        shippingTax: 0,
        rate: 0
      };
    }

    const rate = this.baseRate + this.averageLocalRate;
    const shippingTax = Math.round(shippingFee * rate * 100) / 100;

    return {
      taxableShipping: shippingFee,
      shippingTax,
      rate
    };
  }

  computeOrderTax(items, shippingFee = 0, postalCode = '') {
    let totalTaxable = 0;
    let totalTax = 0;
    const lineItemBreakdowns = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const result = this.calculateItemTax(item.price, item.quantity, item.category, postalCode);
      totalTaxable += result.taxableAmount;
      totalTax += result.taxAmount;
      lineItemBreakdowns.push({
        itemId: item.id || item.productId,
        name: item.name,
        tax: result.taxAmount,
        rate: result.effectiveRate
      });
    }

    const shipTaxRes = this.calculateShippingTax(shippingFee);
    totalTax += shipTaxRes.shippingTax;

    return {
      jurisdiction: this.stateName,
      stateCode: this.stateCode,
      totalTaxableAmount: Math.round(totalTaxable * 100) / 100,
      totalTaxAmount: Math.round(totalTax * 100) / 100,
      shippingTax: shipTaxRes.shippingTax,
      lineItems: lineItemBreakdowns
    };
  }
}

module.exports = new TaxRules_AK();
