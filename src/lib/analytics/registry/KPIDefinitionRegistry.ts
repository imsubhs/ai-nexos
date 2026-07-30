import { KPIDefinition } from "../types";

export class KPIDefinitionRegistry {
  private kpis: Map<string, KPIDefinition> = new Map();

  /**
   * Registers a new KPI definition or updates an existing one (as a new version).
   */
  registerKPI(definition: KPIDefinition): void {
    // Basic validation
    if (
      !definition.id ||
      !definition.formulaVersion ||
      !definition.effectiveDate
    ) {
      throw new Error(
        "Invalid KPI Definition. ID, formulaVersion, and effectiveDate are required.",
      );
    }
    this.kpis.set(`${definition.id}_v${definition.formulaVersion}`, definition);
  }

  /**
   * Fetches a specific version of a KPI definition.
   */
  getKPIVersion(id: string, version: string): KPIDefinition | undefined {
    return this.kpis.get(`${id}_v${version}`);
  }

  /**
   * Resolves the active KPI definition for a given date.
   */
  resolveKPIForDate(id: string, date: Date): KPIDefinition | undefined {
    const targetDate = date.toISOString();
    let latestValid: KPIDefinition | undefined;

    for (const kpi of this.kpis.values()) {
      if (kpi.id === id && kpi.effectiveDate <= targetDate) {
        if (!latestValid || kpi.effectiveDate > latestValid.effectiveDate) {
          latestValid = kpi;
        }
      }
    }

    return latestValid;
  }
}

export const kpiRegistry = new KPIDefinitionRegistry();
