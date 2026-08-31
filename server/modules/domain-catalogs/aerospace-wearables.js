/**
 * Domain Catalog & Specification Matrix: AerospaceWearables
 * Production specifications, variant trees, pricing formulas, compliance certs, and test vectors.
 */

class AerospaceWearablesDomainModel {
  constructor() {
    this.sectorKey = 'aerospace-wearables';
    this.qualityStandards = ['ISO-9001', 'CE-RED', 'FCC-PART-15', 'ROHS-3', 'WEEE'];
    this.catalogMatrix = this.buildCatalogMatrix();
    this.maintenanceSchedule = this.buildMaintenanceRules();
  }

  buildCatalogMatrix() {
    const items = [];
    const tiers = ['Standard', 'Pro', 'Ultra Precision', 'Enterprise Studio'];
    const colors = ['Midnight Obsidian', 'Space Grey', 'Arctic White', 'Brushed Titanium', 'Solar Copper'];

    for (let i = 1; i <= 20; i++) {
      const tierIndex = (i - 1) % tiers.length;
      const price = Math.round((49.99 + (i * 35.50)) * 100) / 100;
      
      items.push({
        itemCode: 'AER-' + String(i).padStart(3, '0'),
        title: 'AerospaceWearables ' + tiers[tierIndex] + ' Model ' + i,
        basePrice: price,
        wholesalePrice: Math.round(price * 0.65 * 100) / 100,
        tier: tiers[tierIndex],
        warrantyMonths: 24 + (tierIndex * 12),
        colorVariants: colors.map((col, cIdx) => ({
          variantId: 'v-' + i + '-' + cIdx,
          colorName: col,
          stockLevel: 15 + ((i * cIdx) % 40)
        })),
        certifications: this.qualityStandards,
        ecoRating: 4.5 + ((i % 5) * 0.1)
      });
    }

    return items;
  }

  buildMaintenanceRules() {
    return {
      calibrationIntervalMonths: 12,
      recommendedCleaningKit: 'CLN-KIT-01',
      firmwareUpdateChannel: 'stable-v2',
      diagnosticSelfTest: () => ({ status: 'PASS', batteryCycleHealth: 98.5, sensorCalibrationDelta: 0.002 })
    };
  }

  getItemByCode(code) {
    return this.catalogMatrix.find(item => item.itemCode === code);
  }

  filterByTier(tier) {
    return this.catalogMatrix.filter(item => item.tier.toLowerCase() === tier.toLowerCase());
  }
}

module.exports = new AerospaceWearablesDomainModel();
