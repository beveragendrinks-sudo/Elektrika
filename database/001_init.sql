-- ============================================================
-- LOT 1 — SCHÉMA + WORKFLOW
-- Plateforme Maintenance Multi-Sites — Migration initiale
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== ORGANISATION =====
CREATE TABLE sites (
  site_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Africa/Tunis',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zones (
  zone_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(site_id) ON DELETE CASCADE,
  name VARCHAR(100),
  travel_time_matrix JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE equipment (
  equipment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(site_id) ON DELETE CASCADE,
  zone_id UUID REFERENCES zones(zone_id),
  name VARCHAR(150),
  qr_code VARCHAR(100) UNIQUE,
  criticality SMALLINT CHECK (criticality BETWEEN 1 AND 5),
  install_date DATE,
  status VARCHAR(20) DEFAULT 'operational'
);

CREATE TABLE technicians (
  technician_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(site_id) ON DELETE CASCADE,
  name VARCHAR(100),
  max_daily_capacity_points INT DEFAULT 20,
  active BOOLEAN DEFAULT true
);

CREATE TABLE skills (
  skill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100)
);

CREATE TABLE technician_skills (
  technician_id UUID REFERENCES technicians(technician_id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(skill_id) ON DELETE CASCADE,
  level SMALLINT CHECK (level BETWEEN 1 AND 5),
  PRIMARY KEY (technician_id, skill_id)
);

-- ===== MOTEUR DE PLANIFICATION (SYSTÈME, pas une personne) =====
-- Le "planificateur" n'est pas un rôle utilisateur : c'est un job automatique
-- qui s'exécute chaque semaine (ou à la demande pour les urgences) et applique
-- les règles de gestion ci-dessous. Voir document planning_rules.md pour le détail.

CREATE TABLE planning_engine_config (
  config_key VARCHAR(50) PRIMARY KEY,
  config_value JSONB NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO planning_engine_config (config_key, config_value) VALUES
  ('run_schedule', '{"cron": "0 5 * * 1", "timezone": "Africa/Tunis", "description": "chaque lundi 5h"}'),
  ('emergency_replanning', '{"enabled": true, "trigger": "safety_risk_approved"}'),
  ('scoring_weights', '{"safety": 35, "sla": 25, "criticality": 20, "repeat_failure": 10, "age": 10}'),
  ('max_requests_per_run_per_site', '{"value": 200, "note": "au-delà, alerter admin : volume hors capacité algorithme glouton"}');

-- Journal de chaque exécution du moteur — traçabilité indispensable pour un système
-- automatique : le chef d'usine doit pouvoir vérifier ce que la machine a décidé et pourquoi.
CREATE TABLE planning_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(site_id),
  run_type VARCHAR(20) NOT NULL CHECK (run_type IN ('scheduled_weekly', 'emergency')),
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  requests_considered INT,
  missions_created INT,
  requests_unassigned INT,
  unassigned_reason JSONB, -- {request_id: raison} pour transparence sur ce qui n'a pas pu être planifié
  status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  error_message TEXT
);

CREATE INDEX idx_planning_runs_site ON planning_runs(site_id, started_at DESC);

-- ===== ACHATS / FOURNISSEURS =====

-- Sociétés du groupe pouvant émettre un bon de commande (paramétrable par la direction)
-- Hypothèse de départ : LAD, FAD, BTFI, 3Ps, K&Ko — noms complets à compléter par vous.
CREATE TABLE group_entities (
  entity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO group_entities (code, name) VALUES
  ('LAD',  'LAD'),
  ('FAD',  'FAD'),
  ('BTFI', 'BTFI'),
  ('3Ps',  '3Ps'),
  ('K&Ko', 'K&Ko');

-- Sociétés fournisseurs/prestataires externes (catalogue géré par la direction)
CREATE TABLE suppliers (
  supplier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  contact_name VARCHAR(100),
  phone VARCHAR(30),
  email VARCHAR(100),
  address TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO suppliers (name) VALUES ('Elkateb Electricité');

-- Fournisseur préféré par corps de métier : la direction associe un fournisseur
-- par défaut à chaque compétence (ex. skill "Électricité" → "Elkateb Electricité").
-- Cela permet d'avoir un fournisseur préféré différent par métier (plomberie,
-- mécanique, etc.) le jour où ces compétences seront ajoutées.
ALTER TABLE skills ADD COLUMN preferred_supplier_id UUID REFERENCES suppliers(supplier_id);

-- Exemple de configuration une fois les skills créés par l'application :
-- UPDATE skills SET preferred_supplier_id =
--   (SELECT supplier_id FROM suppliers WHERE name = 'Elkateb Electricité')
-- WHERE name = 'Électricité';

-- ===== UTILISATEURS / RBAC =====
-- Rôles : admin (gère utilisateurs + référentiels), direction (valide pour son/ses entité(s)),
-- site_manager (chef d'usine), planner, technician
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','direction','site_manager','planner','technician')),
  site_id UUID REFERENCES sites(site_id),
  technician_id UUID REFERENCES technicians(technician_id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Entités du groupe pour lesquelles un utilisateur "direction" est responsable
-- et donc habilité à valider les demandes (pending_management_validation).
-- Une entité peut avoir plusieurs responsables direction ; un utilisateur direction
-- peut être responsable de plusieurs entités.
CREATE TABLE direction_entity_assignments (
  user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES group_entities(entity_id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, entity_id)
);

-- ===== DEMANDES / WORKFLOW =====
CREATE TABLE maintenance_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(site_id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(equipment_id),
  requested_by UUID REFERENCES user_profiles(user_id),
  -- demandeur d'origine — indispensable pour la traçabilité et la confirmation finale (statut 9→10)
  assigned_technician_id UUID REFERENCES technicians(technician_id),
  -- électricien en charge de la clarification/préparation, avant même la planification formelle
  type SMALLINT CHECK (type IN (1,2,3)),
  points SMALLINT GENERATED ALWAYS AS (
    CASE type WHEN 1 THEN 1 WHEN 2 THEN 3 WHEN 3 THEN 5 END
  ) STORED,
  status VARCHAR(40) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',                              -- 1. brouillon, non soumise
    'pending_management_validation',      -- 2. attente validation direction (si sécurité/arrêt)
    'clarification',                      -- 3. électricien clarifie à distance (appel, photos, pas de déplacement)
    'preparation',                        -- 4. achat matériel / devis / attente prestataire
    'ready_to_plan',                      -- 5. prête, en attente de planification
    'planned',                            -- 6. planifiée
    'in_progress',                        -- 7. en cours d'exécution
    'cancelled',                          -- 8. annulée
    'completed_pending_confirmation',     -- 9. travaux terminés, attente confirmation demandeur
    'accepted'                            -- 10. travaux acceptés (terminal)
  )),
  parent_request_id UUID REFERENCES maintenance_requests(request_id),
  -- non nul = "2ème intervention demandée" : nouvelle fiche liée à la demande d'origine
  -- (jamais de réutilisation de la même ligne, pour préserver la fiabilité des KPI)
  issuing_entity_id UUID NOT NULL REFERENCES group_entities(entity_id),
  -- société du groupe émettrice de la demande / du futur bon de commande
  -- (LAD, FAD, BTFI, 3Ps, K&Ko...) — à choisir obligatoirement à la création
  priority_score NUMERIC(5,2),
  safety_risk BOOLEAN DEFAULT false,
  production_stop BOOLEAN DEFAULT false,
  management_approved BOOLEAN,
  estimated_minutes INT,
  required_skill_id UUID REFERENCES skills(skill_id),
  submitted_at TIMESTAMPTZ,        -- sortie de 'draft'
  planned_mission_id UUID,
  started_at TIMESTAMPTZ,          -- entrée 'in_progress'
  completed_at TIMESTAMPTZ,        -- entrée 'completed_pending_confirmation'
  closed_at TIMESTAMPTZ,           -- entrée 'accepted' (terminal)
  rework BOOLEAN DEFAULT false,
  requester_feedback_score SMALLINT CHECK (requester_feedback_score BETWEEN 1 AND 5),
  rejection_reason VARCHAR(30) CHECK (rejection_reason IN (
    'wrong_part','failure_recurred','incomplete_work','other'
  )),
  rejection_comment TEXT,
  -- catégorie de refus du demandeur menant à une 2ème intervention (statut 11 du métier) ;
  -- renseigné sur la NOUVELLE fiche liée (parent_request_id), pas sur l'ancienne
  pending_status_reason TEXT,
  -- champ transitoire : l'app y écrit le motif juste avant un changement de statut
  -- (obligatoire pour 'cancelled'), le trigger le recopie dans l'historique puis le vide
  ai_diagnosis_suggestion TEXT,
  -- diagnostic structuré proposé par l'IA à partir des photos WhatsApp / notes électricien
  ai_suggested_materials JSONB,
  -- liste de matériel suggérée par l'IA (désignation, quantité estimée) à partir des photos
  ai_confidence NUMERIC(3,2),
  -- 0–1 : confiance du modèle sur sa suggestion, affichée à l'électricien avant validation
  created_offline BOOLEAN DEFAULT false,
  client_uuid UUID,
  sync_status VARCHAR(20) DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== MISSIONS =====
CREATE TABLE missions (
  mission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(site_id) ON DELETE CASCADE,
  technician_id UUID REFERENCES technicians(technician_id),
  mission_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned','in_progress','completed','pending_sync','cancelled'
  )),
  total_work_time_min INT,
  total_travel_time_min INT,
  created_by VARCHAR(20) DEFAULT 'ai_engine',
  planning_run_id UUID REFERENCES planning_runs(run_id)
  -- NULL si créée/ajustée manuellement par un planner humain (cas exceptionnel)
);

CREATE TABLE mission_interventions (
  mission_id UUID REFERENCES missions(mission_id) ON DELETE CASCADE,
  request_id UUID REFERENCES maintenance_requests(request_id) ON DELETE CASCADE,
  sequence_order INT,
  travel_time_from_previous INT,
  PRIMARY KEY (mission_id, request_id)
);

-- ===== OFFLINE SYNC =====
CREATE TABLE sync_queue (
  sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(100),
  entity_type VARCHAR(50),
  entity_client_uuid UUID,
  payload JSONB,
  client_timestamp TIMESTAMPTZ,
  server_received_at TIMESTAMPTZ DEFAULT now(),
  sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending','applied','conflict','rejected')),
  conflict_resolution VARCHAR(20)
);

CREATE TABLE attachments (
  attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES maintenance_requests(request_id) ON DELETE CASCADE,
  type VARCHAR(20) CHECK (type IN ('photo','signature')),
  file_path TEXT,
  captured_offline BOOLEAN DEFAULT false,
  client_uuid UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== ACHATS — BONS DE COMMANDE =====
-- Générable uniquement lorsque la demande est au statut "preparation" (voir trigger plus bas)

CREATE TABLE po_sequences (
  entity_id UUID REFERENCES group_entities(entity_id),
  year INT,
  last_number INT DEFAULT 0,
  PRIMARY KEY (entity_id, year)
);

CREATE TABLE purchase_orders (
  po_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(40) UNIQUE,  -- généré automatiquement, ex : BC-LAD-2026-000123
  request_id UUID NOT NULL REFERENCES maintenance_requests(request_id) ON DELETE CASCADE,
  issuing_entity_id UUID NOT NULL REFERENCES group_entities(entity_id),
  supplier_id UUID NOT NULL REFERENCES suppliers(supplier_id),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','sent','confirmed','received','cancelled'
  )),
  total_estimated_amount NUMERIC(12,2),
  actual_amount NUMERIC(12,2),
  -- coût réel facturé, renseigné à réception facture (status='received') ;
  -- permet le suivi budget estimé vs réel par panne / par site
  currency VARCHAR(3) DEFAULT 'TND',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE TABLE purchase_order_lines (
  line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
  item_description VARCHAR(255) NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  unit VARCHAR(20),
  estimated_unit_price NUMERIC(10,2),
  line_total NUMERIC(12,2) GENERATED ALWAYS AS (quantity * estimated_unit_price) STORED
);

-- ===== KPI =====
CREATE TABLE kpi_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(site_id),
  technician_id UUID,
  period_date DATE,
  period_type VARCHAR(10) CHECK (period_type IN ('daily','weekly','monthly')),
  metrics JSONB
);

-- ===== HISTORIQUE DE STATUT (base du calcul des durées et des KPI) =====
CREATE TABLE request_status_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES maintenance_requests(request_id) ON DELETE CASCADE,
  status VARCHAR(40) NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exited_at TIMESTAMPTZ,           -- NULL = statut actuel (ligne ouverte)
  changed_by UUID,
  reason TEXT                      -- obligatoire pour 'cancelled' (voir trigger require_cancellation_reason)
);

CREATE INDEX idx_status_history_open ON request_status_history(request_id) WHERE exited_at IS NULL;

-- ===== PARAMÉTRAGE DES ALERTES PAR STATUT (modifiable par la direction, sans code) =====
CREATE TABLE workflow_status_rules (
  status VARCHAR(40) PRIMARY KEY,
  low_alert_hours NUMERIC,        -- déclenche alerte demandeur + électricien
  escalation_hours NUMERIC,       -- déclenche alerte direction générale
  counts_as_site_time BOOLEAN DEFAULT false  -- exclu des KPI de productivité terrain si false
);

INSERT INTO workflow_status_rules (status, low_alert_hours, escalation_hours, counts_as_site_time) VALUES
  ('draft',                          24,  72,  false),
  ('pending_management_validation',  4,   12,  false),
  ('clarification',                  24,  48,  false),
  ('preparation',                    48,  120, false),
  ('ready_to_plan',                  24,  72,  false),
  ('planned',                        24,  48,  false),
  ('in_progress',                    8,   24,  true),
  ('cancelled',                      NULL, NULL, false),
  ('completed_pending_confirmation', 48,  120, false),
  ('accepted',                       NULL, NULL, false);

-- ===== NOTIFICATIONS (transparence poussée, pas seulement consultable) =====
CREATE TABLE notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES maintenance_requests(request_id) ON DELETE CASCADE,
  level VARCHAR(20) NOT NULL CHECK (level IN ('low','escalation')),
  -- low = demandeur + électricien ; escalation = direction générale
  recipient_user_id UUID REFERENCES user_profiles(user_id),
  channel VARCHAR(20) DEFAULT 'app' CHECK (channel IN ('app','email','whatsapp','sms')),
  message TEXT,
  status_at_trigger VARCHAR(40),
  hours_in_status NUMERIC,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_request ON notifications(request_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_user_id) WHERE read_at IS NULL;

-- Job périodique (toutes les 15-30 min, via cron Supabase / pg_cron) :
-- scanne v_request_status_alerts, et pour chaque ligne is_delayed=true ou
-- needs_escalation=true sans notification déjà envoyée pour ce statut+niveau,
-- insère une notification puis la pousse via le canal configuré (cf. n8n/edge function).
-- Le code applicatif de ce job sera fourni avec le Lot Notifications (hors SQL pur).

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_requests_site_status ON maintenance_requests(site_id, status);
CREATE INDEX idx_requests_priority ON maintenance_requests(site_id, priority_score DESC);
CREATE INDEX idx_missions_site_date ON missions(site_id, mission_date);
CREATE INDEX idx_equipment_site_zone ON equipment(site_id, zone_id);
CREATE INDEX idx_sync_queue_status ON sync_queue(sync_status, device_id);
CREATE INDEX idx_kpi_site_period ON kpi_snapshots(site_id, period_type, period_date);
CREATE INDEX idx_requests_parent ON maintenance_requests(parent_request_id);
CREATE INDEX idx_po_request ON purchase_orders(request_id);
CREATE INDEX idx_po_entity ON purchase_orders(issuing_entity_id);

-- ============================================================
-- TRIGGERS : moteur de workflow
-- ============================================================

-- 1) Blocage de sortie du statut "attente validation direction" sans approbation
--    ET restriction de qui a le droit de poser management_approved = true :
--    uniquement un admin, ou un utilisateur "direction" assigné à l'entité émettrice de la demande.
CREATE OR REPLACE FUNCTION enforce_management_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_authorized BOOLEAN;
BEGIN
  IF NEW.management_approved IS TRUE AND OLD.management_approved IS NOT TRUE THEN
    SELECT EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
        AND (
          up.role = 'admin'
          OR (
            up.role = 'direction'
            AND EXISTS (
              SELECT 1 FROM direction_entity_assignments dea
              WHERE dea.user_id = up.user_id AND dea.entity_id = NEW.issuing_entity_id
            )
          )
        )
    ) INTO v_authorized;

    IF NOT v_authorized THEN
      RAISE EXCEPTION 'Seul un responsable direction assigné à l''entité émettrice (ou un admin) peut approuver cette demande';
    END IF;
  END IF;

  IF OLD.status = 'pending_management_validation'
     AND NEW.status <> 'pending_management_validation'
     AND NEW.status <> 'cancelled'
     AND NEW.management_approved IS NOT TRUE THEN
    RAISE EXCEPTION 'Approbation direction requise avant de quitter le statut "attente validation direction"';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_management_approval
BEFORE UPDATE OF status, management_approved ON maintenance_requests
FOR EACH ROW EXECUTE FUNCTION enforce_management_approval();

-- 2) Horodatage automatique des jalons clés
CREATE OR REPLACE FUNCTION stamp_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'draft' AND NEW.status <> 'draft' AND NEW.submitted_at IS NULL THEN
    NEW.submitted_at = now();
  END IF;
  IF NEW.status = 'in_progress' AND OLD.status IS DISTINCT FROM 'in_progress' THEN
    NEW.started_at = now();
  END IF;
  IF NEW.status = 'completed_pending_confirmation' AND OLD.status IS DISTINCT FROM 'completed_pending_confirmation' THEN
    NEW.completed_at = now();
  END IF;
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    NEW.closed_at = now();
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stamp_status_timestamps
BEFORE UPDATE OF status ON maintenance_requests
FOR EACH ROW EXECUTE FUNCTION stamp_status_timestamps();

-- 3) Historisation automatique (alimente durées cumulées + alertes + motif)
CREATE OR REPLACE FUNCTION log_status_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO request_status_history (request_id, status, entered_at, reason, changed_by)
    VALUES (NEW.request_id, NEW.status, now(), NEW.pending_status_reason, auth.uid());
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE request_status_history
      SET exited_at = now()
      WHERE request_id = OLD.request_id AND exited_at IS NULL;
    INSERT INTO request_status_history (request_id, status, entered_at, reason, changed_by)
      VALUES (NEW.request_id, NEW.status, now(), NEW.pending_status_reason, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_status_history_insert
AFTER INSERT ON maintenance_requests
FOR EACH ROW EXECUTE FUNCTION log_status_history();

CREATE TRIGGER trg_log_status_history_update
AFTER UPDATE OF status ON maintenance_requests
FOR EACH ROW EXECUTE FUNCTION log_status_history();

-- 3bis) Motif obligatoire pour toute annulation, et nettoyage du champ transitoire après usage
CREATE OR REPLACE FUNCTION require_cancellation_reason()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled'
     AND OLD.status IS DISTINCT FROM 'cancelled'
     AND (NEW.pending_status_reason IS NULL OR length(trim(NEW.pending_status_reason)) = 0) THEN
    RAISE EXCEPTION 'Un motif est obligatoire pour annuler une demande';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_require_cancellation_reason
BEFORE UPDATE OF status ON maintenance_requests
FOR EACH ROW EXECUTE FUNCTION require_cancellation_reason();

-- Nettoyage du champ transitoire après écriture dans l'historique (AFTER, ne bloque rien)
CREATE OR REPLACE FUNCTION clear_pending_status_reason()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pending_status_reason IS NOT NULL THEN
    UPDATE maintenance_requests SET pending_status_reason = NULL WHERE request_id = NEW.request_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clear_pending_status_reason
AFTER UPDATE OF status ON maintenance_requests
FOR EACH ROW EXECUTE FUNCTION clear_pending_status_reason();

-- 5) Bon de commande : génération possible uniquement au statut "preparation"
CREATE OR REPLACE FUNCTION enforce_po_creation_status()
RETURNS TRIGGER AS $$
DECLARE
  v_status VARCHAR(40);
BEGIN
  SELECT status INTO v_status FROM maintenance_requests WHERE request_id = NEW.request_id;
  IF v_status IS DISTINCT FROM 'preparation' THEN
    RAISE EXCEPTION 'Un bon de commande ne peut être créé que lorsque la demande est au statut "préparation" (statut actuel : %)', v_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_po_creation_status
BEFORE INSERT ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION enforce_po_creation_status();

-- 6) Fournisseur par défaut = fournisseur préféré du métier (skill) de la demande,
--    sauf si l'électricien en choisit un autre manuellement
CREATE OR REPLACE FUNCTION default_po_supplier()
RETURNS TRIGGER AS $$
DECLARE
  v_skill_id UUID;
  v_default_supplier UUID;
BEGIN
  IF NEW.supplier_id IS NULL THEN
    SELECT required_skill_id INTO v_skill_id FROM maintenance_requests WHERE request_id = NEW.request_id;
    SELECT preferred_supplier_id INTO v_default_supplier FROM skills WHERE skill_id = v_skill_id;
    NEW.supplier_id := v_default_supplier;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_default_po_supplier
BEFORE INSERT ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION default_po_supplier();

-- 7) Numérotation automatique du BC, par société émettrice et par année
CREATE OR REPLACE FUNCTION generate_po_number(p_entity_id UUID, p_entity_code VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM now());
  v_number INT;
BEGIN
  INSERT INTO po_sequences (entity_id, year, last_number)
  VALUES (p_entity_id, v_year, 1)
  ON CONFLICT (entity_id, year) DO UPDATE SET last_number = po_sequences.last_number + 1
  RETURNING last_number INTO v_number;

  RETURN 'BC-' || p_entity_code || '-' || v_year || '-' || LPAD(v_number::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_po_number()
RETURNS TRIGGER AS $$
DECLARE
  v_code VARCHAR(20);
BEGIN
  SELECT code INTO v_code FROM group_entities WHERE entity_id = NEW.issuing_entity_id;
  NEW.po_number := generate_po_number(NEW.issuing_entity_id, v_code);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_po_number
BEFORE INSERT ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION set_po_number();
-- Ordre d'exécution garanti par Postgres (alphabétique) :
-- trg_default_po_supplier → trg_enforce_po_creation_status → trg_set_po_number

-- 4) Vue d'alertes en temps réel (niveau bas = demandeur/électricien, escalade = direction)
CREATE OR REPLACE VIEW v_request_status_alerts AS
SELECT
  r.request_id,
  r.site_id,
  r.status,
  h.entered_at,
  EXTRACT(EPOCH FROM (now() - h.entered_at)) / 3600 AS hours_in_status,
  wr.low_alert_hours,
  wr.escalation_hours,
  (wr.low_alert_hours IS NOT NULL
     AND EXTRACT(EPOCH FROM (now() - h.entered_at)) / 3600 >= wr.low_alert_hours) AS is_delayed,
  (wr.escalation_hours IS NOT NULL
     AND EXTRACT(EPOCH FROM (now() - h.entered_at)) / 3600 >= wr.escalation_hours) AS needs_escalation
FROM maintenance_requests r
JOIN request_status_history h ON h.request_id = r.request_id AND h.exited_at IS NULL
LEFT JOIN workflow_status_rules wr ON wr.status = r.status;

-- ===== CONFIGURATION INCOMPLÈTE — utilisateurs direction sans entité assignée =====
-- Un utilisateur 'direction' sans aucune ligne dans direction_entity_assignments
-- ne peut RIEN approuver (cf. trigger enforce_management_approval) : c'est un
-- état invalide qui doit être visible par l'admin, pas découvert lors d'un blocage terrain.
CREATE OR REPLACE VIEW v_direction_missing_entity AS
SELECT up.user_id, up.created_at
FROM user_profiles up
WHERE up.role = 'direction'
  AND NOT EXISTS (
    SELECT 1 FROM direction_entity_assignments dea WHERE dea.user_id = up.user_id
  );

-- Alerte automatique à la création/changement de rôle : si un utilisateur devient
-- 'direction' sans assignation immédiate, une notification 'escalation' est créée
-- pour tous les admins (déduplication faite par le job, cf. notifications).
CREATE OR REPLACE FUNCTION alert_direction_missing_entity()
RETURNS TRIGGER AS $$
DECLARE
  v_admin RECORD;
BEGIN
  IF NEW.role = 'direction' AND NOT EXISTS (
    SELECT 1 FROM direction_entity_assignments dea WHERE dea.user_id = NEW.user_id
  ) THEN
    FOR v_admin IN SELECT user_id FROM user_profiles WHERE role = 'admin' LOOP
      INSERT INTO notifications (recipient_user_id, level, channel, message, status_at_trigger)
      VALUES (
        v_admin.user_id, 'escalation', 'app',
        'Configuration incomplète : un utilisateur direction n''a aucune entité juridique assignée — il ne peut approuver aucune demande.',
        'config_incomplete'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_alert_direction_missing_entity
AFTER INSERT OR UPDATE OF role ON user_profiles
FOR EACH ROW EXECUTE FUNCTION alert_direction_missing_entity();
-- Remarque : si l'admin assigne l'entité dans la foulée (même transaction applicative,
-- deux requêtes séparées), une notification "obsolète" peut être créée puis ignorée —
-- préférable à l'absence totale d'alerte. Le job périodique peut aussi re-scanner
-- v_direction_missing_entity pour relancer l'alerte si la situation persiste >24h.
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_engine_config ENABLE ROW LEVEL SECURITY;

-- Sites : liste gérée exclusivement par l'admin, lecture pour tous les utilisateurs authentifiés
CREATE POLICY sites_select ON sites FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY sites_write ON sites FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role = 'admin')
);

-- Équipements : lecture selon site (ou direction/admin), écriture site_manager/admin
CREATE POLICY equipment_select ON equipment
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.user_id = auth.uid()
      AND (up.site_id = equipment.site_id OR up.role IN ('direction','admin'))
  )
);
CREATE POLICY equipment_write ON equipment
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.user_id = auth.uid()
      AND ((up.site_id = equipment.site_id AND up.role = 'site_manager') OR up.role = 'admin')
  )
);

-- Journal de planification : lecture site (ou direction/admin) ; écriture réservée au job système
-- (clé de service Supabase, qui contourne la RLS par conception — pas de policy d'écriture utilisateur)
CREATE POLICY planning_runs_select ON planning_runs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.user_id = auth.uid()
      AND (up.site_id = planning_runs.site_id OR up.role IN ('direction','admin'))
  )
);

CREATE POLICY planning_config_select ON planning_engine_config
FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY planning_config_write ON planning_engine_config
FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role IN ('admin','direction'))
);

-- Lecture : son propre site, ou rôle direction/admin (multi-site)
CREATE POLICY requests_select ON maintenance_requests
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.user_id = auth.uid()
      AND (up.site_id = maintenance_requests.site_id OR up.role IN ('direction','admin'))
  )
);

-- Écriture : uniquement sur son propre site, rôles opérationnels
CREATE POLICY requests_insert ON maintenance_requests
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.user_id = auth.uid() AND up.site_id = maintenance_requests.site_id
  )
);

CREATE POLICY requests_update ON maintenance_requests
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.user_id = auth.uid()
      AND up.site_id = maintenance_requests.site_id
      AND up.role IN ('site_manager','planner','technician')
  )
);

-- Même pattern à dupliquer sur missions, mission_interventions,
-- equipment, kpi_snapshots (select = site_id OU role='direction' ;
-- write = site_id + rôle opérationnel). Dites-moi si vous voulez
-- que je les génère toutes explicitement plutôt qu'en pattern.

CREATE POLICY missions_select ON missions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.user_id = auth.uid()
      AND (up.site_id = missions.site_id OR up.role IN ('direction','admin'))
  )
);

CREATE POLICY kpi_select ON kpi_snapshots
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.user_id = auth.uid()
      AND (up.site_id = kpi_snapshots.site_id OR up.role IN ('direction','admin'))
  )
);

-- Historique : visible selon le site de la demande liée
ALTER TABLE request_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY status_history_select ON request_status_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM maintenance_requests r
    JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE r.request_id = request_status_history.request_id
      AND (up.site_id = r.site_id OR up.role IN ('direction','admin'))
  )
);

-- Règles d'alerte : lecture pour tous les utilisateurs authentifiés, écriture direction uniquement
ALTER TABLE workflow_status_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY workflow_rules_select ON workflow_status_rules
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY workflow_rules_write ON workflow_status_rules
FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role = 'direction')
);

-- Bons de commande : visibles/modifiables selon le site de la demande liée
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY po_select ON purchase_orders
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM maintenance_requests r
    JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE r.request_id = purchase_orders.request_id
      AND (up.site_id = r.site_id OR up.role IN ('direction','admin'))
  )
);

CREATE POLICY po_insert ON purchase_orders
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM maintenance_requests r
    JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE r.request_id = purchase_orders.request_id
      AND up.site_id = r.site_id
      AND up.role IN ('site_manager','planner','technician')
  )
);

-- Référentiels (sociétés du groupe, fournisseurs) : lecture pour tous, écriture admin uniquement
ALTER TABLE group_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY group_entities_select ON group_entities FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY group_entities_write ON group_entities FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role = 'admin')
);

CREATE POLICY suppliers_select ON suppliers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY suppliers_write ON suppliers FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role = 'admin')
);

-- Utilisateurs : chacun voit son propre profil ; admin gère tous les profils (création/édition)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_profiles_select_own ON user_profiles
FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role IN ('admin','direction'))
);

CREATE POLICY user_profiles_admin_write ON user_profiles
FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role = 'admin')
);

-- Assignation direction ↔ entité : lecture pour direction/admin, écriture admin uniquement
ALTER TABLE direction_entity_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY dea_select ON direction_entity_assignments
FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role IN ('admin','direction'))
);

CREATE POLICY dea_admin_write ON direction_entity_assignments
FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role = 'admin')
);

-- Notifications : chacun voit les siennes ; direction voit tout (vue d'ensemble transparence)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select ON notifications
FOR SELECT USING (
  recipient_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role IN ('direction','admin'))
);

CREATE POLICY notifications_update_own ON notifications
FOR UPDATE USING (recipient_user_id = auth.uid());
-- (marquage "lu" par son destinataire ; l'insertion se fait par le job serveur, hors RLS utilisateur)
