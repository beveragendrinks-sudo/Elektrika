-- ============================================================
-- LOT 2 — MOTEUR KPI
-- Vues de calcul + fonction de rafraîchissement des snapshots
-- À exécuter après migration_001_schema.sql
-- ============================================================

-- ============================================================
-- 1. TEMPS (TWT, TTT, TT) — par technicien et par jour
-- ============================================================
CREATE OR REPLACE VIEW v_kpi_time_technician_daily AS
SELECT
  m.technician_id,
  m.site_id,
  m.mission_date,
  COALESCE(SUM(m.total_work_time_min), 0) / 60.0 AS twt_hours,
  COALESCE(SUM(m.total_travel_time_min), 0) / 60.0 AS ttt_hours,
  COALESCE(SUM(m.total_work_time_min + m.total_travel_time_min), 0) / 60.0 AS tt_hours
FROM missions m
WHERE m.status = 'completed'
GROUP BY m.technician_id, m.site_id, m.mission_date;

-- ============================================================
-- 2. PRODUCTIVITÉ (UR, TR) — dérivé directement de la vue temps
-- ============================================================
CREATE OR REPLACE VIEW v_kpi_productivity_technician_daily AS
SELECT
  technician_id,
  site_id,
  mission_date,
  twt_hours,
  ttt_hours,
  tt_hours,
  CASE WHEN tt_hours > 0 THEN ROUND((twt_hours / tt_hours) * 100, 1) ELSE NULL END AS utilization_rate,
  CASE WHEN tt_hours > 0 THEN ROUND((ttt_hours / tt_hours) * 100, 1) ELSE NULL END AS travel_ratio
FROM v_kpi_time_technician_daily;

-- ============================================================
-- 3. PRODUCTIVITÉ PAR POINTS (DP, PPH, CU)
-- ============================================================
CREATE OR REPLACE VIEW v_kpi_points_technician_daily AS
SELECT
  m.technician_id,
  m.site_id,
  m.mission_date,
  SUM(r.points) AS daily_points,
  t.max_daily_capacity_points,
  CASE WHEN SUM(m.total_work_time_min) > 0
    THEN ROUND(SUM(r.points) / (SUM(m.total_work_time_min) / 60.0), 2)
    ELSE NULL END AS points_per_hour,
  CASE WHEN t.max_daily_capacity_points > 0
    THEN ROUND((SUM(r.points)::NUMERIC / t.max_daily_capacity_points) * 100, 1)
    ELSE NULL END AS capacity_utilization
FROM missions m
JOIN mission_interventions mi ON mi.mission_id = m.mission_id
JOIN maintenance_requests r ON r.request_id = mi.request_id
JOIN technicians t ON t.technician_id = m.technician_id
WHERE m.status = 'completed'
GROUP BY m.technician_id, m.site_id, m.mission_date, t.max_daily_capacity_points;

-- ============================================================
-- 4. SLA & RÉACTIVITÉ — au niveau de chaque demande
-- ============================================================
-- SLA48 : prise en charge (entrée en 'clarification') sous 48h après soumission.
-- MRT   : durée entre soumission et prise en charge.
-- MTTR  : durée entre début d'exécution et clôture.
CREATE OR REPLACE VIEW v_kpi_sla_per_request AS
SELECT
  r.request_id,
  r.site_id,
  r.issuing_entity_id,
  r.submitted_at,
  h_clarif.entered_at AS clarification_entered_at,
  EXTRACT(EPOCH FROM (h_clarif.entered_at - r.submitted_at)) / 3600 AS response_hours,
  (EXTRACT(EPOCH FROM (h_clarif.entered_at - r.submitted_at)) / 3600) <= 48 AS sla48_respected,
  r.started_at,
  r.closed_at,
  CASE WHEN r.started_at IS NOT NULL AND r.closed_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (r.closed_at - r.started_at)) / 3600
    ELSE NULL END AS mttr_hours
FROM maintenance_requests r
LEFT JOIN LATERAL (
  SELECT entered_at FROM request_status_history h
  WHERE h.request_id = r.request_id AND h.status = 'clarification'
  ORDER BY entered_at ASC LIMIT 1
) h_clarif ON true
WHERE r.submitted_at IS NOT NULL;

CREATE OR REPLACE VIEW v_kpi_sla_site_daily AS
SELECT
  site_id,
  DATE(submitted_at) AS day,
  COUNT(*) AS total_requests,
  ROUND(AVG(CASE WHEN sla48_respected THEN 1 ELSE 0 END) * 100, 1) AS sla48_compliance_pct,
  ROUND(AVG(response_hours)::NUMERIC, 1) AS mean_response_time_hours,
  ROUND(AVG(mttr_hours)::NUMERIC, 1) AS mean_repair_time_hours
FROM v_kpi_sla_per_request
GROUP BY site_id, DATE(submitted_at);

-- ============================================================
-- 5. QUALITÉ (RR, FTFR, RSS)
-- ============================================================
CREATE OR REPLACE VIEW v_kpi_quality_site_monthly AS
SELECT
  r.site_id,
  DATE_TRUNC('month', r.closed_at) AS month,
  COUNT(*) FILTER (WHERE r.status = 'accepted') AS total_closed,
  COUNT(*) FILTER (WHERE r.rejection_reason IS NOT NULL) AS total_rejected,
  ROUND(
    (COUNT(*) FILTER (WHERE r.rejection_reason IS NOT NULL)::NUMERIC
     / NULLIF(COUNT(*) FILTER (WHERE r.status = 'accepted'), 0)) * 100, 1
  ) AS rework_rate_pct,
  ROUND(
    100 - (COUNT(*) FILTER (WHERE r.rejection_reason IS NOT NULL)::NUMERIC
     / NULLIF(COUNT(*) FILTER (WHERE r.status = 'accepted'), 0)) * 100, 1
  ) AS first_time_fix_rate_pct,
  ROUND(AVG(r.requester_feedback_score)::NUMERIC, 2) AS requester_satisfaction_score
FROM maintenance_requests r
WHERE r.closed_at IS NOT NULL
GROUP BY r.site_id, DATE_TRUNC('month', r.closed_at);

-- ============================================================
-- 6. OPTIMISATION (GE — groupage ; MES/TS/SOI approximés)
-- ============================================================
CREATE OR REPLACE VIEW v_kpi_optimization_site_daily AS
SELECT
  m.site_id,
  m.mission_date,
  COUNT(*) AS total_missions,
  COUNT(*) FILTER (WHERE mi_count.intervention_count > 1) AS grouped_missions,
  ROUND(
    (COUNT(*) FILTER (WHERE mi_count.intervention_count > 1)::NUMERIC
     / NULLIF(COUNT(*), 0)) * 100, 1
  ) AS grouping_efficiency_pct,
  ROUND(AVG(m.total_travel_time_min)::NUMERIC, 1) AS avg_travel_min_per_mission
FROM missions m
JOIN LATERAL (
  SELECT COUNT(*) AS intervention_count FROM mission_interventions mi WHERE mi.mission_id = m.mission_id
) mi_count ON true
WHERE m.status = 'completed'
GROUP BY m.site_id, m.mission_date;
-- Note : MES (Mission Efficiency Score) et SOI (Site Optimization Index) nécessitent
-- une référence baseline (trajet sans optimisation) non capturée actuellement.
-- Recommandation : stocker un "trajet baseline" estimé par zone lors du paramétrage
-- des zones (zones.travel_time_matrix) pour activer le calcul de TS (Travel Saved)
-- et MES en phase 2 — non bloquant pour le pilotage quotidien.

-- ============================================================
-- 7. FIABILITÉ ÉQUIPEMENT (RFR, MTBF) — sur 90 jours glissants
-- ============================================================
CREATE OR REPLACE VIEW v_kpi_equipment_reliability AS
SELECT
  equipment_id,
  COUNT(*) AS interventions_90d,
  COUNT(*) - 1 AS repeat_failures_90d, -- au-delà de la 1ère intervention = répétition
  CASE WHEN COUNT(*) > 1
    THEN ROUND(
      EXTRACT(EPOCH FROM (MAX(closed_at) - MIN(closed_at))) / 3600 / (COUNT(*) - 1), 1
    )
    ELSE NULL END AS mtbf_hours
FROM maintenance_requests
WHERE closed_at IS NOT NULL AND closed_at >= now() - INTERVAL '90 days'
GROUP BY equipment_id;

-- ============================================================
-- 8. ACHATS — écart budget estimé vs réel (alimente CPI niveau management)
-- ============================================================
CREATE OR REPLACE VIEW v_kpi_purchase_variance_site_monthly AS
SELECT
  r.site_id,
  DATE_TRUNC('month', po.created_at) AS month,
  COUNT(*) AS total_po,
  SUM(po.total_estimated_amount) AS total_estimated,
  SUM(po.actual_amount) AS total_actual,
  ROUND(
    ((SUM(po.actual_amount) - SUM(po.total_estimated_amount))
     / NULLIF(SUM(po.total_estimated_amount), 0)) * 100, 1
  ) AS variance_pct
FROM purchase_orders po
JOIN maintenance_requests r ON r.request_id = po.request_id
WHERE po.actual_amount IS NOT NULL
GROUP BY r.site_id, DATE_TRUNC('month', po.created_at);

-- ============================================================
-- 9. WORKFORCE BALANCE INDEX (WBI) — variance de charge entre techniciens
-- ============================================================
CREATE OR REPLACE VIEW v_kpi_workforce_balance_site_daily AS
SELECT
  site_id,
  mission_date,
  ROUND(VAR_POP(daily_points)::NUMERIC, 2) AS workforce_balance_index,
  -- plus c'est bas, mieux la charge est répartie entre techniciens
  COUNT(DISTINCT technician_id) AS active_technicians
FROM v_kpi_points_technician_daily
GROUP BY site_id, mission_date;

-- ============================================================
-- 10. FONCTION DE RAFRAÎCHISSEMENT — alimente kpi_snapshots
-- ============================================================
-- À appeler quotidiennement (cron) pour figer un snapshot consultable
-- même après expiration des données sources détaillées.
CREATE OR REPLACE FUNCTION refresh_kpi_snapshot(p_site_id UUID, p_date DATE)
RETURNS void AS $$
DECLARE
  v_metrics JSONB;
BEGIN
  SELECT jsonb_build_object(
    'sla48_compliance_pct', sla.sla48_compliance_pct,
    'mean_response_time_hours', sla.mean_response_time_hours,
    'mean_repair_time_hours', sla.mean_repair_time_hours,
    'grouping_efficiency_pct', opt.grouping_efficiency_pct,
    'avg_travel_min_per_mission', opt.avg_travel_min_per_mission,
    'workforce_balance_index', wbi.workforce_balance_index,
    'active_technicians', wbi.active_technicians
  ) INTO v_metrics
  FROM (SELECT 1) dummy
  LEFT JOIN v_kpi_sla_site_daily sla ON sla.site_id = p_site_id AND sla.day = p_date
  LEFT JOIN v_kpi_optimization_site_daily opt ON opt.site_id = p_site_id AND opt.mission_date = p_date
  LEFT JOIN v_kpi_workforce_balance_site_daily wbi ON wbi.site_id = p_site_id AND wbi.mission_date = p_date;

  INSERT INTO kpi_snapshots (site_id, technician_id, period_date, period_type, metrics)
  VALUES (p_site_id, NULL, p_date, 'daily', COALESCE(v_metrics, '{}'::jsonb))
  ON CONFLICT DO NOTHING; -- pas de contrainte unique définie ici volontairement,
  -- à ajouter si vous voulez interdire les doublons de snapshot (site, date, period_type)
END;
$$ LANGUAGE plpgsql;
