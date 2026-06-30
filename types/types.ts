// ============================================================
// LOT 1 — Types TypeScript (cohérents avec migration_001_schema.sql)
// ============================================================

export type RequestStatus =
  | 'draft'                              // 1. brouillon, non soumise
  | 'pending_management_validation'      // 2. attente validation direction (sécurité/arrêt)
  | 'clarification'                      // 3. électricien clarifie à distance
  | 'preparation'                        // 4. achat matériel / devis / prestataire
  | 'ready_to_plan'                      // 5. prête à planifier
  | 'planned'                            // 6. planifiée
  | 'in_progress'                        // 7. en cours d'exécution
  | 'cancelled'                          // 8. annulée
  | 'completed_pending_confirmation'     // 9. terminé, attente confirmation demandeur
  | 'accepted';                          // 10. travaux acceptés (terminal)

export type UserRole = 'admin' | 'direction' | 'site_manager' | 'planner' | 'technician';

export type InterventionType = 1 | 2 | 3;

export interface Site {
  site_id: string;
  name: string;
  code: string;
  timezone: string;
  created_at: string;
}

export interface Zone {
  zone_id: string;
  site_id: string;
  name: string;
  travel_time_matrix: Record<string, number>; // { [zone_id]: minutes }
}

export interface Equipment {
  equipment_id: string;
  site_id: string;
  zone_id: string;
  name: string;
  qr_code: string;
  criticality: 1 | 2 | 3 | 4 | 5;
  install_date: string | null;
  status: 'operational' | 'down' | 'maintenance';
}

export interface Technician {
  technician_id: string;
  site_id: string;
  name: string;
  max_daily_capacity_points: number;
  active: boolean;
}

export interface Skill {
  skill_id: string;
  name: string;
  preferred_supplier_id: string | null; // fournisseur par défaut pour ce métier (ex: Électricité → Elkateb Electricité)
}

export interface UserProfile {
  user_id: string;
  role: UserRole;
  site_id: string | null;
  technician_id: string | null;
}

/**
 * Entité(s) du groupe pour lesquelles un utilisateur "direction" est responsable
 * et donc habilité à approuver les demandes (pending_management_validation).
 * Un utilisateur direction peut être responsable de plusieurs entités ;
 * une entité peut avoir plusieurs responsables direction.
 */
export interface DirectionEntityAssignment {
  user_id: string;
  entity_id: string;
  assigned_at: string;
}

export interface MaintenanceRequest {
  request_id: string;
  site_id: string;
  equipment_id: string;
  requested_by: string; // demandeur d'origine
  assigned_technician_id: string | null; // électricien en charge (clarification → préparation)
  type: InterventionType;
  points: 1 | 3 | 5; // calculé côté DB (generated column)
  status: RequestStatus;
  parent_request_id: string | null; // non nul = "2ème intervention demandée" (fiche liée)
  issuing_entity_id: string; // société du groupe émettrice (LAD, FAD, BTFI, 3Ps, K&Ko...), choisie à la création
  priority_score: number | null;
  safety_risk: boolean;
  production_stop: boolean;
  management_approved: boolean | null;
  estimated_minutes: number | null;
  required_skill_id: string | null;
  submitted_at: string | null;
  planned_mission_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  closed_at: string | null;
  rework: boolean;
  requester_feedback_score: number | null;
  rejection_reason: 'wrong_part' | 'failure_recurred' | 'incomplete_work' | 'other' | null;
  rejection_comment: string | null;
  pending_status_reason: string | null; // champ transitoire, écrit par l'app avant un changement de statut
  ai_diagnosis_suggestion: string | null;
  ai_suggested_materials: { description: string; estimated_quantity: number; unit?: string }[] | null;
  ai_confidence: number | null; // 0–1
  created_offline: boolean;
  client_uuid: string | null;
  sync_status: 'synced' | 'pending' | 'conflict';
}

export interface Mission {
  mission_id: string;
  site_id: string;
  technician_id: string;
  mission_date: string;
  status: 'planned' | 'in_progress' | 'completed' | 'pending_sync' | 'cancelled';
  total_work_time_min: number | null;
  total_travel_time_min: number | null;
  created_by: 'ai_engine' | 'manual';
  planning_run_id: string | null; // exécution du moteur qui a généré cette mission
}

export interface MissionIntervention {
  mission_id: string;
  request_id: string;
  sequence_order: number;
  travel_time_from_previous: number;
}

export interface KpiSnapshot {
  snapshot_id: string;
  site_id: string;
  technician_id: string | null; // null = agrégat site
  period_date: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  metrics: Record<string, number>; // { UR: 82.4, SLA48: 91.0, OEI: 76.2, ... }
}

// ============================================================
// Moteur de planification — SYSTÈME, pas un rôle utilisateur
// ============================================================

export type PlanningRunType = 'scheduled_weekly' | 'emergency';
export type PlanningRunStatus = 'running' | 'completed' | 'failed';

export interface PlanningRun {
  run_id: string;
  site_id: string;
  run_type: PlanningRunType;
  started_at: string;
  finished_at: string | null;
  requests_considered: number | null;
  missions_created: number | null;
  requests_unassigned: number | null;
  unassigned_reason: Record<string, string> | null; // { [request_id]: raison }
  status: PlanningRunStatus;
  error_message: string | null;
}

export interface PlanningEngineConfig {
  config_key: string;
  config_value: Record<string, unknown>;
  updated_by: string | null;
  updated_at: string;
}

/** Seuils d'alerte par statut, paramétrables par la direction (table workflow_status_rules). */
export interface WorkflowStatusRule {
  status: RequestStatus;
  low_alert_hours: number | null;   // alerte demandeur + électricien
  escalation_hours: number | null;  // alerte direction générale
  counts_as_site_time: boolean;     // exclu des KPI de productivité terrain si false
}

/** Reflet de la table request_status_history — une ligne par passage dans un statut. */
export interface RequestStatusHistory {
  history_id: string;
  request_id: string;
  status: RequestStatus;
  entered_at: string;
  exited_at: string | null; // null = statut actuel
  changed_by: string | null;
  reason: string | null;
}

/** Reflet de la vue SQL v_request_status_alerts — usage direct dans les dashboards. */
export interface RequestStatusAlert {
  request_id: string;
  site_id: string;
  status: RequestStatus;
  entered_at: string;
  hours_in_status: number;
  low_alert_hours: number | null;
  escalation_hours: number | null;
  is_delayed: boolean;
  needs_escalation: boolean;
}

/** Société du groupe pouvant émettre une demande / un bon de commande (LAD, FAD, BTFI, 3Ps, K&Ko...). */
export interface GroupEntity {
  entity_id: string;
  code: string;
  name: string;
  active: boolean;
}

/** Société fournisseur/prestataire externe (ex: Elkateb Electricité). */
export interface Supplier {
  supplier_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  active: boolean;
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';

export interface PurchaseOrder {
  po_id: string;
  po_number: string | null; // généré automatiquement (ex: BC-LAD-2026-000123)
  request_id: string;
  issuing_entity_id: string;
  supplier_id: string;
  status: PurchaseOrderStatus;
  total_estimated_amount: number | null;
  actual_amount: number | null; // coût réel facturé, renseigné à réception
  currency: string;
  created_at: string;
  sent_at: string | null;
}

export interface PurchaseOrderLine {
  line_id: string;
  po_id: string;
  item_description: string;
  quantity: number;
  unit: string | null;
  estimated_unit_price: number | null;
  line_total: number | null; // calculé côté DB (generated column)
}

export type NotificationLevel = 'low' | 'escalation';
export type NotificationChannel = 'app' | 'email' | 'whatsapp' | 'sms';

export interface AppNotification {
  notification_id: string;
  request_id: string;
  level: NotificationLevel; // low = demandeur + électricien, escalation = direction
  recipient_user_id: string;
  channel: NotificationChannel;
  message: string;
  status_at_trigger: RequestStatus;
  hours_in_status: number;
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
}
