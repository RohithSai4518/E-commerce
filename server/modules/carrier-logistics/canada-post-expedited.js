/**
 * Carrier Integration Adapter: Canada Post Expedited
 * Rate matrices, dimensional weight formulas, tracking status parsers and label manifests.
 */

class CarrierAdapter_CANADA_POST_EXPEDITED {
  constructor() {
    this.carrierId = 'canada-post-expedited';
    this.carrierName = 'Canada Post Expedited';
    this.dimDivisorDomestic = 139; // Standard domestic cubic inch divisor
    this.dimDivisorIntl = 166;
    this.baseDropOffFee = 2.50;
    this.fuelSurchargePercent = 0.085; // 8.5%
    this.zoneMatrix = this.initializeZoneMatrix();
  }

  initializeZoneMatrix() {
    const matrix = new Map();
    // Zone 1 through 8 distance rate multipliers
    matrix.set(1, { baseRate: 6.20, perPound: 0.85, estimatedDays: 1 });
    matrix.set(2, { baseRate: 7.10, perPound: 0.95, estimatedDays: 2 });
    matrix.set(3, { baseRate: 8.40, perPound: 1.15, estimatedDays: 2 });
    matrix.set(4, { baseRate: 9.80, perPound: 1.35, estimatedDays: 3 });
    matrix.set(5, { baseRate: 11.20, perPound: 1.65, estimatedDays: 4 });
    matrix.set(6, { baseRate: 12.90, perPound: 1.95, estimatedDays: 4 });
    matrix.set(7, { baseRate: 14.50, perPound: 2.25, estimatedDays: 5 });
    matrix.set(8, { baseRate: 16.80, perPound: 2.65, estimatedDays: 5 });
    return matrix;
  }

  /**
   * Calculate Billable Weight based on volumetric dimensions vs actual scale weight
   */
  calculateBillableWeight(actualWeightLbs, lengthInches, widthInches, heightInches, isInternational = false) {
    const divisor = isInternational ? this.dimDivisorIntl : this.dimDivisorDomestic;
    const cubicInches = lengthInches * widthInches * heightInches;
    const dimensionalWeight = Math.ceil(cubicInches / divisor);
    const billableWeight = Math.max(actualWeightLbs, dimensionalWeight);

    return {
      actualWeight: actualWeightLbs,
      dimensionalWeight,
      billableWeight,
      isOversize: billableWeight > 50 || lengthInches > 48
    };
  }

  /**
   * Determine shipping zone between origin zip and destination zip
   */
  calculateZone(originZip, destinationZip) {
    if (!originZip || !destinationZip) return 4; // Default median zone

    const origPrefix = parseInt(originZip.substring(0, 3), 10) || 100;
    const destPrefix = parseInt(destinationZip.substring(0, 3), 10) || 100;
    const diff = Math.abs(origPrefix - destPrefix);

    if (diff < 50) return 1;
    if (diff < 150) return 2;
    if (diff < 300) return 3;
    if (diff < 500) return 4;
    if (diff < 700) return 5;
    if (diff < 850) return 6;
    if (diff < 950) return 7;
    return 8;
  }

  /**
   * Calculate quote rate
   */
  getQuote({ actualWeightLbs = 2, length = 10, width = 8, height = 4, originZip = '94105', destZip = '10001', insuranceValue = 0 }) {
    const weightCalc = this.calculateBillableWeight(actualWeightLbs, length, width, height);
    const zone = this.calculateZone(originZip, destZip);
    const zoneData = this.zoneMatrix.get(zone) || this.zoneMatrix.get(4);

    let baseShipping = zoneData.baseRate + (weightCalc.billableWeight * zoneData.perPound);

    if (weightCalc.isOversize) {
      baseShipping += 15.00; // Oversize handling surcharge
    }

    // Fuel surcharge
    const fuelCharge = baseShipping * this.fuelSurchargePercent;

    // Declared value insurance ($0.80 per $100 after first $100)
    let insuranceFee = 0;
    if (insuranceValue > 100) {
      insuranceFee = Math.ceil((insuranceValue - 100) / 100) * 0.80;
    }

    const totalCost = Math.round((baseShipping + fuelCharge + insuranceFee + this.baseDropOffFee) * 100) / 100;

    return {
      carrierId: this.carrierId,
      carrierName: this.carrierName,
      zone,
      estimatedDeliveryDays: zoneData.estimatedDays,
      breakdown: {
        baseShipping: Math.round(baseShipping * 100) / 100,
        fuelSurcharge: Math.round(fuelCharge * 100) / 100,
        insuranceFee: Math.round(insuranceFee * 100) / 100,
        handlingFee: this.baseDropOffFee,
        totalCost
      },
      weightDetails: weightCalc
    };
  }

  /**
   * Generate mock label tracking payload
   */
  generateShipmentLabel(orderNumber, recipientAddress) {
    const timestamp = Date.now();
    const trackingNumber = 'TRK-' + this.carrierId.substring(0, 3).toUpperCase() + '-' + Math.floor(100000000 + Math.random() * 900000000);

    return {
      carrier: this.carrierName,
      carrierId: this.carrierId,
      trackingNumber,
      orderNumber,
      labelFormat: 'PDF_4X6_THERMAL',
      labelUrl: '/api/shipping/labels/' + trackingNumber + '.pdf',
      recipient: recipientAddress,
      createdTimestamp: new Date().toISOString(),
      estimatedDeliveryDate: new Date(timestamp + 86400000 * 3).toISOString()
    };
  }
}

module.exports = new CarrierAdapter_CANADA_POST_EXPEDITED();
