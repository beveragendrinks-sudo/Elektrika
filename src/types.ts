// ============================================================
// LOT 1 — Types TypeScript (cohérents avec migration_001_schema.sql)
// ============================================================

export type RequestStatus =
  | 'soumise'       // 1. Demande soumise, en attente de prise en charge direction (ex : nouveau + en_attente)
  | 'appel_offre'   // 2. Appel d'offres en cours — devis sollicités auprès des prestataires agréés (Parcours B)
  | 'planifiee'     // 3. Ressource assignée, date fixée (ex : en_preparation + planifie)
  | 'en_cours'      // 4. Intervention en cours d'exécution
  | 'a_valider'     // 5. Travaux terminés, attente confirmation demandeur (ex : a_confirmer)
  | 'terminee'      // 6. Clôturée et acceptée (terminal)
  | 'annulee';      // 7. Annulée (terminal)

/** Sous-statut dérivé à la volée depuis les enregistrements devis — non stocké en BDD */
export type AppelOffreSousStatut =
  | 'sans_contact'        // 0 demandes de devis envoyées
  | 'en_attente_reponses' // ≥1 envoyées, < 2 reçues
  | 'comparatif_pret';    // ≥2 reçues, comparatif disponible, prêt à sélectionner

export type UserRole = 'admin' | 'directeur_general' | 'directeur_de_site' | 'electricien' | 'demandeur';

/** Conservé pour compatibilité ascendante avec l'ancien moteur de points */
export type InterventionType = 1 | 2 | 3;

/** 7 catégories de travaux Facility Management */
export type InterventionCategory =
  | 'electricite'
  | 'plomberie'
  | 'climatisation'
  | 'maconnerie'
  | 'peinture'
  | 'menuiserie'
  | 'autres';

/** 4 natures d'intervention */
export type InterventionNature =
  | 'corrective'
  | 'preventive'
  | 'amelioration'
  | 'travaux_neufs';

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
  preferred_supplier_id: string | null;
}

export interface UserProfile {
  user_id: string;
  role: UserRole;
  site_id: string | null;
  technician_id: string | null;
}

/**
 * Entité(s) du groupe pour lesquelles un utilisateur "direction" est responsable
 * et donc habilité à approuver les demandes.
 */
export interface DirectionEntityAssignment {
  user_id: string;
  entity_id: string;
  assigned_at: string;
}

export interface InterventionSite {
  intervention_site_id: string;
  label: string;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export interface BonDeLivraison {
  bl_id: string;
  po_id: string;
  bl_number: string | null;
  received_at: string;
  amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface MaintenanceRequest {
  request_id: string;
  site_id: string;
  equipment_id: string;
  requested_by: string;
  assigned_technician_id: string | null;
  category: InterventionCategory | null;
  intervention_nature: InterventionNature | null;
  points: 1 | 3 | 5;
  status: RequestStatus;
  parent_request_id: string | null;
  issuing_entity_id: string;
  required_skill_id: string | null;
  intervention_site_id: string | null;
  location_comment: string | null;
  priority_score: number | null;
  safety_risk: boolean;
  production_stop: boolean;
  management_approved: boolean | null;
  estimated_minutes: number | null;
  submitted_at: string | null;
  planned_mission_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  closed_at: string | null;
  rework: boolean;
  requester_feedback_score: number | null;
  rejection_reason: 'wrong_part' | 'failure_recurred' | 'incomplete_work' | 'other' | null;
  rejection_comment: string | null;
  pending_status_reason: string | null;
  ai_diagnosis_suggestion: string | null;
  ai_suggested_materials: { description: string; estimated_quantity: number; unit?: string }[] | null;
  ai_confidence: number | null;
  created_offline: boolean;
  client_uuid: string | null;
  sync_status: 'synced' | 'pending' | 'conflict';
  status_changed_at: string | null;
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
  planning_run_id: string | null;
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
  technician_id: string | null;
  period_date: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  metrics: Record<string, number>;
}

// ============================================================
// Moteur de planification
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
  unassigned_reason: Record<string, string> | null;
  status: PlanningRunStatus;
  error_message: string | null;
}

export interface PlanningEngineConfig {
  config_key: string;
  config_value: Record<string, unknown>;
  updated_by: string | null;
  updated_at: string;
}

// ============================================================
// Replanification d'urgence
// ============================================================

export type ReplanningStrategy =
  | 'free_slot'
  | 'swap_lower_priority'
  | 'move_single_mission'
  | 'shift_multiple_missions'
  | 'overtime'
  | 'postpone_next_week';

export interface MissionReplanningEvent {
  event_id: string;
  triggering_request_id: string;
  displaced_mission_id: string | null;
  strategy: ReplanningStrategy;
  cost_breakdown: {
    missions_moved: number;
    overtime_hours: number;
    extra_travel_hours: number;
    sla_delay_hours: number;
    production_impact_score: number;
    total_cost: number;
  };
  old_mission_date: string | null;
  new_mission_date: string | null;
  planning_run_id: string | null;
  created_at: string;
}

export interface WorkflowStatusRule {
  status: RequestStatus;
  low_alert_hours: number | null;
  escalation_hours: number | null;
  counts_as_site_time: boolean;
}

export interface RequestStatusHistory {
  history_id: string;
  request_id: string;
  status: RequestStatus;
  entered_at: string;
  exited_at: string | null;
  changed_by: string | null;
  reason: string | null;
}

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

export interface GroupEntity {
  entity_id: string;
  code: string;
  name: string;
  active: boolean;
}

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
  po_number: string | null;
  request_id: string;
  issuing_entity_id: string;
  supplier_id: string;
  status: PurchaseOrderStatus;
  total_estimated_amount: number | null;
  actual_amount: number | null;
  currency: string;
  created_by: string | null;
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
  line_total: number | null;
}

export type NotificationLevel = 'low' | 'escalation';
export type NotificationChannel = 'app' | 'email' | 'whatsapp' | 'sms';

export interface AppNotification {
  notification_id: string;
  request_id: string;
  level: NotificationLevel;
  recipient_user_id: string;
  channel: NotificationChannel;
  message: string;
  status_at_trigger: RequestStatus | 'mission_displaced' | 'config_incomplete';
  hours_in_status: number;
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
}
