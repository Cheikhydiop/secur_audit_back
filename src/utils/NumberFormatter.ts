// src/utils/NumberFormatter.ts

/**
 * Utilitaire pour formater les nombres avec une précision maximale
 */
export class NumberFormatter {
  /**
   * Formate un nombre avec un maximum de décimales
   */
  static formatToMaxDecimals(value: number | null | undefined, maxDecimals = 2): number | null {
    if (value === null || value === undefined || isNaN(value)) {
      return null;
    }

    return Math.round(value * Math.pow(10, maxDecimals)) / Math.pow(10, maxDecimals);
  }

  /**
   * Formate un objet en appliquant la limitation de décimales sur tous les nombres
   */
  static formatObjectNumbers(obj: any, maxDecimals = 2): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'number') {
      return this.formatToMaxDecimals(obj, maxDecimals);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.formatObjectNumbers(item, maxDecimals));
    }

    if (typeof obj === 'object') {
      const formatted: any = {};
      for (const [key, value] of Object.entries(obj)) {
        formatted[key] = this.formatObjectNumbers(value, maxDecimals);
      }
      return formatted;
    }

    return obj;
  }

  /**
   * Formate spécifiquement les métriques de dashboard
   */
  static formatDashboardMetrics(metrics: any): any {
    const fieldsToFormat = [
      'averageQualityScore',
      'averagePowerFactor',
      'averageVoltage',
      'averageCurrent',
      'averageFrequency',
      'totalEnergyConsumption',
      'averageConsumption',
      'peakConsumption',
      'efficiency',
      'loadFactor',
      'voltageUnbalance',
      'currentUnbalance',
      'powerQuality',
      'thd',
      'cosPhiAverage',
      'energyActiveTotal',
      'energyReactiveTotal',
      'energyApparentTotal',
      'activePowerTotal',
      'reactivePowerTotal',
      'apparentPowerTotal',
    ];

    if (typeof metrics !== 'object' || metrics === null) {
      return metrics;
    }

    const formatted = { ...metrics };

    // Formater les champs spécifiques
    fieldsToFormat.forEach((field) => {
      if (formatted[field] !== undefined && formatted[field] !== null) {
        formatted[field] = this.formatToMaxDecimals(formatted[field], 2);
      }
    });

    // Formater récursivement les objets imbriqués
    Object.keys(formatted).forEach((key) => {
      if (typeof formatted[key] === 'object' && formatted[key] !== null && !Array.isArray(formatted[key])) {
        formatted[key] = this.formatDashboardMetrics(formatted[key]);
      } else if (Array.isArray(formatted[key])) {
        formatted[key] = formatted[key].map((item: any) => this.formatDashboardMetrics(item));
      }
    });

    return formatted;
  }
}
