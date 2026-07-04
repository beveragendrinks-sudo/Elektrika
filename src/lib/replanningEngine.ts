// ============================================================
// LOT — Moteur de replanification d'urgence
// Logique de coût utilisée par le job de planification système
// quand une demande sécurité/arrêt doit être insérée sans créneau libre.
// Voir docs/planning_rules.md section 4 pour la logique métier complète.
// ============================================================

export type ReplanningStrategy =
  | 'free_slot'
  | 'swap_lower_priority'
  | 'move_single_mission'
  | 'shift_multiple_missions'
  | 'overtime'
  | 'postpone_next_week';

// Ordre de priorité testé par le moteur (du moins perturbateur au plus perturbateur)
export const STRATEGY_PRIORITY_ORDER: ReplanningStrategy[] = [
  'free_slot',
  'swap_lower_priority',
  'move_single_mission',
  'shift_multiple_missions',
  'overtime',
  'postpone_next_week',
];

export interface CostBreakdown {
  missionsMoved: number;
  overtimeHours: number;
  extraTravelHours: number;
  slaDelayHours: number;
  productionImpactScore: number; // 0–10, estimation qualitative de l'impact production
}

export interface CostedSolution {
  strategy: ReplanningStrategy;
  breakdown: CostBreakdown;
  totalCost: number;
  displacedMissionId: string | null;
  oldMissionDate: string | null;
  newMissionDate: string | null;
}

const COST_WEIGHTS = {
  missionsMoved: 10,
  overtimeHours: 8,
  extraTravelHours: 2,
  slaDelayHours: 20,
  productionImpactScore: 30,
};

/**
 * Calcule le coût total d'une solution candidate, selon la formule actée :
 * Coût = (interventions déplacées × 10) + (heures sup × 8) + (trajet sup × 2)
 *      + (retard SLA × 20) + (impact production × 30)
 */
export function computeReplanningCost(breakdown: CostBreakdown): number {
  return (
    breakdown.missionsMoved * COST_WEIGHTS.missionsMoved +
    breakdown.overtimeHours * COST_WEIGHTS.overtimeHours +
    breakdown.extraTravelHours * COST_WEIGHTS.extraTravelHours +
    breakdown.slaDelayHours * COST_WEIGHTS.slaDelayHours +
    breakdown.productionImpactScore * COST_WEIGHTS.productionImpactScore
  );
}

/**
 * Sélectionne la meilleure solution parmi les candidates générées par le job
 * de planification (chaque stratégie produit sa propre proposition chiffrée).
 * Retient celle au coût total minimal ; à coût égal, privilégie la stratégie
 * la moins perturbatrice selon STRATEGY_PRIORITY_ORDER.
 */
export function selectBestReplanningSolution(
  candidates: Omit<CostedSolution, 'totalCost'>[]
): CostedSolution | null {
  if (candidates.length === 0) return null;

  const costed: CostedSolution[] = candidates.map((c) => ({
    ...c,
    totalCost: computeReplanningCost(c.breakdown),
  }));

  costed.sort((a, b) => {
    if (a.totalCost !== b.totalCost) return a.totalCost - b.totalCost;
    return (
      STRATEGY_PRIORITY_ORDER.indexOf(a.strategy) - STRATEGY_PRIORITY_ORDER.indexOf(b.strategy)
    );
  });

  return costed[0];
}

/**
 * Construit le payload à insérer dans mission_replanning_events,
 * déclenchant automatiquement (via trigger SQL) la notification aux
 * 3 destinataires obligatoires : demandeur, direction de l'entité, électricien.
 */
export function buildReplanningEventPayload(
  triggeringRequestId: string,
  solution: CostedSolution,
  planningRunId: string | null
) {
  return {
    triggering_request_id: triggeringRequestId,
    displaced_mission_id: solution.displacedMissionId,
    strategy: solution.strategy,
    cost_breakdown: {
      missions_moved: solution.breakdown.missionsMoved,
      overtime_hours: solution.breakdown.overtimeHours,
      extra_travel_hours: solution.breakdown.extraTravelHours,
      sla_delay_hours: solution.breakdown.slaDelayHours,
      production_impact_score: solution.breakdown.productionImpactScore,
      total_cost: solution.totalCost,
    },
    old_mission_date: solution.oldMissionDate,
    new_mission_date: solution.newMissionDate,
    planning_run_id: planningRunId,
  };
}
