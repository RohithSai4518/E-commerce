/**
 * Global Freight Logistics & Route Optimization Engine: FreightLogisticsEngine_005
 * Multimodal shipping (Air, Ocean, Rail, LTL Freight, Last-Mile Couriers), carbon footprint estimator, and SLA tracking.
 */

class FreightLogisticsEngine_005 {
  constructor() {
    this.routerId = 'freight_router_005';
    this.hubId = 'HUB_REGION_5';
    this.carbonFactorPerTonKm = 0.062; // kg CO2 per metric ton-kilometer (Air: 0.50, Rail: 0.02, Ocean: 0.01)
    this.rateTiers = this.buildFreightRateTiers();
    this.transitMilestones = this.initializeMilestones();
  }

  buildFreightRateTiers() {
    return [
      { mode: 'AIR_EXPRESS', baseRatePerKg: 8.50, minCharge: 45.00, transitDays: 2, co2Factor: 0.52 },
      { mode: 'AIR_STANDARD', baseRatePerKg: 5.20, minCharge: 30.00, transitDays: 4, co2Factor: 0.44 },
      { mode: 'OCEAN_LCL', baseRatePerCbm: 110.00, minCharge: 150.00, transitDays: 22, co2Factor: 0.015 },
      { mode: 'RAIL_INTERMODAL', baseRatePerKg: 2.10, minCharge: 50.00, transitDays: 12, co2Factor: 0.028 },
      { mode: 'GROUND_LTL', baseRatePerKg: 1.40, minCharge: 25.00, transitDays: 3, co2Factor: 0.095 }
    ];
  }

  initializeMilestones() {
    return [
      'PICKUP_SCHEDULED',
      'ORIGIN_TERMINAL_RECEIVED',
      'CUSTOMS_EXPORT_CLEARED',
      'IN_TRANSIT_LINEHAUL',
      'PORT_OF_ENTRY_ARRIVED',
      'CUSTOMS_IMPORT_RELEASED',
      'DESTINATION_CROSSDOCK_SORTED',
      'OUT_FOR_FINAL_DELIVERY',
      'DELIVERED_POD_CONFIRMED'
    ];
  }

  /**
   * Calculate multimodal freight quote
   */
  quoteFreightConsignment(weightKg, volumeCbm, distanceKm = 1200, preferredMode = 'AIR_EXPRESS') {
    const weight = Math.max(1, parseFloat(weightKg) || 10);
    const volume = Math.max(0.01, parseFloat(volumeCbm) || 0.1);
    const tier = this.rateTiers.find(t => t.mode === preferredMode) || this.rateTiers[0];

    let freightBase = 0;
    if (tier.mode === 'OCEAN_LCL') {
      freightBase = Math.max(tier.minCharge, volume * tier.baseRatePerCbm);
    } else {
      const volumetricWeight = volume * 167; // IATA standard Air CBM to KG ratio
      const chargeableWeight = Math.max(weight, volumetricWeight);
      freightBase = Math.max(tier.minCharge, chargeableWeight * tier.baseRatePerKg);
    }

    const fuelSurcharge = freightBase * 0.125; // 12.5% fuel surcharge
    const securityFee = 15.00;
    const totalQuote = Math.round((freightBase + fuelSurcharge + securityFee) * 100) / 100;

    // Estimate CO2 Emissions in kg
    const tons = weight / 1000;
    const estimatedCo2Kg = Math.round(tons * distanceKm * tier.co2Factor * 10) / 10;

    return {
      routerId: this.routerId,
      hub: this.hubId,
      mode: tier.mode,
      chargeableWeightKg: weight,
      volumeCbm: volume,
      transitEstimateDays: tier.transitDays,
      pricing: {
        baseFreight: Math.round(freightBase * 100) / 100,
        fuelSurcharge: Math.round(fuelSurcharge * 100) / 100,
        securityAndTerminalFees: securityFee,
        totalCost: totalQuote
      },
      sustainability: {
        estimatedCo2EmissionsKg: estimatedCo2Kg,
        carbonOffsetCostUsd: Math.round(estimatedCo2Kg * 0.02 * 100) / 100
      },
      quoteValidUntil: new Date(Date.now() + 86400000 * 7).toISOString()
    };
  }

  /**
   * Generate live tracking event sequence
   */
  generateLiveTrackingHistory(trackingNumber, mode = 'AIR_EXPRESS') {
    const now = Date.now();
    const history = [];

    this.transitMilestones.forEach((milestone, idx) => {
      const eventTime = new Date(now - (this.transitMilestones.length - idx) * 3600000 * 6);
      history.push({
        sequence: idx + 1,
        milestone,
        location: 'Logistics Hub ' + this.hubId + ' Sector ' + (idx + 1),
        timestamp: eventTime.toISOString(),
        isCompleted: idx < 6
      });
    });

    return {
      trackingNumber,
      mode,
      currentStatus: 'IN_TRANSIT',
      events: history
    };
  }
}

module.exports = new FreightLogisticsEngine_005();
