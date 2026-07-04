// ============================================================
// LOT 2 — KPI de synthèse direction (OEI, CPI)
// Combine les métriques déjà calculées par les vues SQL (002_kpi_engine.sql).
// Pondérations isolées ici pour rester ajustables sans migration SQL.
// ============================================================

export interface OEIComponents {
  utilizationRatePct: number; // productivité (UR) — composante "productivité"
  sla48CompliancePct: number; // SLA
  firstTimeFixRatePct: number; // qualité
  groupingEfficiencyPct: number; // optimisation
}

const OEI_WEIGHTS = {
  productivity: 0.30,
  sla: 0.25,
  quality: 0.25,
  optimization: 0.20,
};

/**
 * Overall Efficiency Index — indicateur de synthèse direction (0–100).
 * OEI = 30% productivité + 25% SLA + 25% qualité + 20% optimisation
 */
export function computeOEI(components: OEIComponents): number {
  const score =
    components.utilizationRatePct * OEI_WEIGHTS.productivity +
    components.sla48CompliancePct * OEI_WEIGHTS.sla +
    components.firstTimeFixRatePct * OEI_WEIGHTS.quality +
    components.groupingEfficiencyPct * OEI_WEIGHTS.optimization;

  return Math.round(score * 10) / 10;
}

export interface CPIInput {
  totalTravelHours: number;
  totalInterventionHours: number;
  totalPointsDelivered: number;
}

/**
 * Cost Proxy Index — (temps trajet + temps intervention) normalisé par points livrés.
 * Plus bas = plus efficient (moins de temps "consommé" par point de valeur livré).
 */
export function computeCPI(input: CPIInput): number | null {
  if (input.totalPointsDelivered <= 0) return null;
  const value =
    (input.totalTravelHours + input.totalInterventionHours) / input.totalPointsDelivered;
  return Math.round(value * 100) / 100;
}

/**
 * Classification visuelle pour dashboard (cf. RequestTimeline.tsx — mêmes seuils
 * de couleur que la timeline, pour cohérence visuelle dans toute l'app).
 */
export function oeiSeverity(oei: number): 'critical' | 'warning' | 'ok' {
  if (oei < 50) return 'critical';
  if (oei < 75) return 'warning';
  return 'ok';
}
