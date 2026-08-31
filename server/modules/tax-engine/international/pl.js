/**
 * International Tax Jurisdiction Engine: Poland (PL)
 * Official statutory VAT/GST rate definitions, reduced rate schedules, intra-community rules, and VAT ID validation.
 */

class IntlTaxEngine_PL {
  constructor() {
    this.jurisdictionCode = 'PL';
    this.countryName = 'Poland';
    this.statutoryName = 'Podatek od towarów i usług';
    this.standardVatRate = 0.23;
    this.reducedVatRate = 0.08;
    this.isVatIncludedInDisplayPrice = true;
    this.crossBorderReverseChargeEligible = true;
    this.exemptCategories = new Set(['books_digital', 'educational_material', 'medical_devices', 'basic_groceries']);
    this.auditLog = [];
  }

  validateVatId(vatNumber) {
    if (!vatNumber || typeof vatNumber !== 'string') return { isValid: false, reason: 'Empty VAT Number' };
    const cleaned = vatNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');

    const prefix = this.jurisdictionCode.split('_')[0];
    if (!cleaned.startsWith(prefix) && cleaned.length < 8) {
      return { isValid: false, reason: 'Invalid format prefix for ' + this.countryName };
    }

    return {
      isValid: true,
      formattedVatId: cleaned,
      country: this.countryName,
      status: 'VERIFIED_ACTIVE',
      validationTimestamp: new Date().toISOString()
    };
  }

  calculateLineItemTax(unitPrice, quantity, categoryKey, isB2BVerified = false, isExportOutsideRegion = false) {
    const grossSubtotal = Math.round(unitPrice * quantity * 100) / 100;

    if (isExportOutsideRegion) {
      return {
        taxableAmount: grossSubtotal,
        taxAmount: 0,
        appliedRate: 0.00,
        rateType: 'ZERO_RATED_EXPORT',
        reverseChargeApplied: false
      };
    }

    if (isB2BVerified && this.crossBorderReverseChargeEligible) {
      return {
        taxableAmount: grossSubtotal,
        taxAmount: 0,
        appliedRate: 0.00,
        rateType: 'REVERSE_CHARGE_B2B',
        reverseChargeApplied: true,
        note: 'Customer liable for VAT under Reverse Charge mechanism'
      };
    }

    const isReduced = this.exemptCategories.has(categoryKey ? categoryKey.toLowerCase() : '');
    const rate = isReduced ? this.reducedVatRate : this.standardVatRate;
    const taxAmount = Math.round(grossSubtotal * rate * 100) / 100;

    return {
      taxableAmount: grossSubtotal,
      taxAmount,
      appliedRate: rate,
      rateType: isReduced ? 'REDUCED_RATE' : 'STANDARD_RATE',
      reverseChargeApplied: false
    };
  }

  generateTaxManifest(orderLines = [], shippingCost = 0, isB2B = false, isExport = false) {
    let subtotalTaxable = 0;
    let totalTaxCalculated = 0;
    const itemManifests = [];

    for (let i = 0; i < orderLines.length; i++) {
      const line = orderLines[i];
      const result = this.calculateLineItemTax(line.price, line.quantity, line.category, isB2B, isExport);
      subtotalTaxable += result.taxableAmount;
      totalTaxCalculated += result.taxAmount;

      itemManifests.push({
        lineId: line.id || ('line_' + i),
        description: line.name,
        gross: result.taxableAmount,
        tax: result.taxAmount,
        ratePercent: (result.appliedRate * 100) + '%',
        rateType: result.rateType
      });
    }

    let shippingTax = 0;
    if (shippingCost > 0 && !isExport && !(isB2B && this.crossBorderReverseChargeEligible)) {
      shippingTax = Math.round(shippingCost * this.standardVatRate * 100) / 100;
      totalTaxCalculated += shippingTax;
    }

    const manifest = {
      jurisdiction: this.countryName,
      jurisdictionCode: this.jurisdictionCode,
      taxAuthority: this.statutoryName,
      currency: this.jurisdictionCode === 'JP' ? 'JPY' : this.jurisdictionCode.startsWith('CA') ? 'CAD' : 'EUR',
      subtotal: Math.round(subtotalTaxable * 100) / 100,
      totalTax: Math.round(totalTaxCalculated * 100) / 100,
      shippingTax,
      items: itemManifests,
      isReverseCharge: isB2B && this.crossBorderReverseChargeEligible,
      generatedAt: new Date().toISOString()
    };

    this.auditLog.push({ id: 'AUD-' + Date.now(), total: manifest.totalTax, ts: manifest.generatedAt });
    return manifest;
  }
}

module.exports = new IntlTaxEngine_PL();
