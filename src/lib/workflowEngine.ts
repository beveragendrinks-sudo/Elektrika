// ============================================================
// LOT 1 — Moteur de workflow (state machine)
// Réplique côté app les règles imposées par les triggers SQL
// (défense en profondeur : à valider aussi côté client mobile offline)
// ============================================================

import type { RequestStatus } from '@/types';

export const STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  nouveau:        ['en_attente', 'appel_offre', 'annule'],
  en_attente:     ['appel_offre', 'en_preparation', 'annule'],
  appel_offre:    ['en_preparation', 'annule'],
  en_preparation: ['planifie', 'annule'],
  planifie:       ['en_cours', 'annule'],
  en_cours:       ['a_confirmer', 'annule'],
  a_confirmer:    ['termine'],
  // pas d'annulation possible après travaux terminés : un refus du demandeur
  // se traite via une 2ème intervention liée (parent_request_id), jamais en
  // rouvrant ou en annulant cette fiche — voir createSecondIntervention()
  annule:         [],
  termine:        [],
};

export interface MaintenanceRequestLike {
  status: RequestStatus;
  safety_risk: boolean;
  production_stop: boolean;
  management_approved: boolean | null;
  submitted_at: string | null;
}

export interface TransitionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Valide une transition de statut avant tout appel Supabase.
 * Bloque côté UI ce que les triggers SQL bloqueraient côté DB,
 * pour donner un message clair à l'utilisateur sans aller-retour réseau.
 *
 * @param transitionReason motif saisi par l'utilisateur, à écrire dans
 *   pending_status_reason avant l'UPDATE. Obligatoire pour 'cancelled'
 *   (miroir du trigger SQL trg_require_cancellation_reason).
 */
export function canTransition(
  request: MaintenanceRequestLike,
  nextStatus: RequestStatus,
  transitionReason?: string
): TransitionResult {
  const allowedNext = STATUS_TRANSITIONS[request.status] ?? [];

  if (!allowedNext.includes(nextStatus)) {
    return {
      allowed: false,
      reason: `Transition non autorisée : ${request.status} → ${nextStatus}`,
    };
  }

  if (
    request.status === 'en_attente' &&
    nextStatus !== 'annule' &&
    request.management_approved !== true
  ) {
    return {
      allowed: false,
      reason: 'Approbation direction requise (demande liée à la sécurité ou à un arrêt de production)',
    };
  }

  if (nextStatus === 'annule' && (!transitionReason || transitionReason.trim().length === 0)) {
    return {
      allowed: false,
      reason: 'Un motif est obligatoire pour annuler une demande',
    };
  }

  return { allowed: true };
}

/**
 * Vérifie côté app si un utilisateur peut approuver une demande au statut
 * "pending_management_validation". Miroir du trigger SQL enforce_management_approval.
 * @param userRole rôle de l'utilisateur courant
 * @param userAssignedEntityIds liste des entity_id pour lesquelles cet utilisateur "direction" est responsable
 * @param requestIssuingEntityId entité émettrice de la demande à approuver
 */
export function canApproveRequest(
  userRole: 'admin' | 'directeur_general' | 'directeur_de_site' | 'electricien' | 'demandeur',
  userAssignedEntityIds: string[],
  requestIssuingEntityId: string
): TransitionResult {
  if (userRole === 'admin') return { allowed: true };

  if (userRole === 'directeur_de_site' && userAssignedEntityIds.includes(requestIssuingEntityId)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "Seul un directeur de site assigné à l'entité émettrice (ou un admin) peut approuver cette demande",
  };
}

export function requiresManagementValidation(request: {
  safety_risk: boolean;
  production_stop: boolean;
}): boolean {
  return request.safety_risk || request.production_stop;
}

export type RejectionReason = 'wrong_part' | 'failure_recurred' | 'incomplete_work' | 'other';

/**
 * Crée la fiche liée pour une "2ème intervention demandée" (statut 11 du métier).
 * Ne réutilise JAMAIS la fiche d'origine — sinon les KPI de durée/MTTR sont faussés.
 * À appeler après confirmation explicite du refus du demandeur sur la fiche `completed_pending_confirmation`.
 *
 * @param rejection motif catégorisé du refus, écrit sur la fiche D'ORIGINE (pas la nouvelle)
 *   pour garder la trace de pourquoi le travail initial n'a pas été accepté.
 */
export function buildSecondInterventionPayload(
  originalRequest: {
    request_id: string;
    site_id: string;
    equipment_id: string;
    required_skill_id: string | null;
    issuing_entity_id: string;
  },
  rejection: { reason: RejectionReason; comment?: string }
) {
  return {
    newRequest: {
      site_id: originalRequest.site_id,
      equipment_id: originalRequest.equipment_id,
      required_skill_id: originalRequest.required_skill_id,
      issuing_entity_id: originalRequest.issuing_entity_id,
      parent_request_id: originalRequest.request_id,
      status: 'en_preparation' as RequestStatus, // repart directement en préparation
    },
    originalRequestUpdate: {
      // à appliquer sur la fiche d'origine, pour tracer le motif de refus
      rejection_reason: rejection.reason,
      rejection_comment: rejection.comment ?? null,
    },
  };
}

/**
 * Durée écoulée depuis l'entrée dans un statut, comparée aux seuils définis
 * par la direction (table workflow_status_rules / WorkflowStatusRule).
 * Reproduit côté app la logique de la vue SQL v_request_status_alerts.
 */
export function evaluateStatusAlert(
  enteredAt: string,
  rule: { low_alert_hours: number | null; escalation_hours: number | null } | undefined
): { hoursInStatus: number; isDelayed: boolean; needsEscalation: boolean } {
  const hoursInStatus = (Date.now() - new Date(enteredAt).getTime()) / (1000 * 60 * 60);
  const isDelayed = rule?.low_alert_hours != null && hoursInStatus >= rule.low_alert_hours;
  const needsEscalation = rule?.escalation_hours != null && hoursInStatus >= rule.escalation_hours;
  return { hoursInStatus, isDelayed, needsEscalation };
}

/** Heures restantes avant un seuil donné (négatif si déjà dépassé). Usage générique, tous statuts. */
export function hoursRemainingBeforeThreshold(enteredAt: string, thresholdHours: number): number {
  const elapsedHours = (Date.now() - new Date(enteredAt).getTime()) / (1000 * 60 * 60);
  return thresholdHours - elapsedHours;
}

export function pointsForType(type: 1 | 2 | 3): 1 | 3 | 5 {
  if (type === 1) return 1;
  if (type === 2) return 3;
  return 5;
}

/**
 * Un bon de commande peut être généré pendant "preparation" ou "awaiting_materials"
 * (si un BC supplémentaire doit être ajouté après envoi du premier).
 * Miroir côté app du trigger SQL trg_enforce_po_creation_status.
 */
export function canGeneratePurchaseOrder(status: RequestStatus): TransitionResult {
  if (status !== 'en_preparation') {
    return {
      allowed: false,
      reason: `Le bon de commande ne peut être créé qu'au statut "en préparation" (statut actuel : ${status})`,
    };
  }
  return { allowed: true };
}

// ============================================================
// Transitions de statut — MISSIONS
// ============================================================

export type MissionStatus = 'planned' | 'in_progress' | 'completed' | 'pending_sync' | 'cancelled';

export const MISSION_STATUS_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  planned: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'pending_sync', 'cancelled'],
  pending_sync: ['completed'],
  completed: [],
  cancelled: [],
};

export function canTransitionMission(
  current: MissionStatus,
  next: MissionStatus
): TransitionResult {
  const allowedNext = MISSION_STATUS_TRANSITIONS[current] ?? [];
  if (!allowedNext.includes(next)) {
    return {
      allowed: false,
      reason: `Transition mission non autorisée : ${current} → ${next}`,
    };
  }
  return { allowed: true };
}


/**
 * Calcule le score de priorité IA (0–100) tel que défini dans la spec
 * (35% sécurité/urgence, 25% SLA restant, 20% criticité équipement,
 *  10% pannes répétées, 10% ancienneté).
 */
export function computePriorityScore(input: {
  safetyRisk: boolean;
  productionStop: boolean;
  submittedAt: string;
  equipmentCriticality: number; // 1–5
  repeatFailureCount: number; // nb interventions répétées sur l'équipement (90j)
}): number {
  const safetyFactor = input.safetyRisk || input.productionStop ? 1 : 0;

  const ageHours = (Date.now() - new Date(input.submittedAt).getTime()) / (1000 * 60 * 60);
  // SLA "réactivité" : plus on s'approche/dépasse 48h sans sortir de draft, plus le score monte
  const slaFactor = Math.min(1, ageHours / 48);

  const criticalityFactor = input.equipmentCriticality / 5;

  const repeatFactor = Math.min(1, input.repeatFailureCount / 3);

  const ageFactor = Math.min(1, ageHours / (7 * 24)); // plafonne à 7 jours

  const score =
    35 * safetyFactor +
    25 * slaFactor +
    20 * criticalityFactor +
    10 * repeatFactor +
    10 * ageFactor;

  return Math.round(score * 100) / 100;
}
