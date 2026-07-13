import { supabase } from './supabase';
import {
  emailMissionPlanifiee,
  emailDemandePlanifiee,
  emailEscaladeDG,
  emailEscaladeDirecteur,
  emailRappelPrestataire,
  emailConfirmationRequise,
  emailBCValidationRequise,
} from './emailTemplates';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

function nextWorkingDay(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split('T')[0];
}

// ── SLA thresholds (heures dans le statut) ─────────────────────────────────
const SLA_THRESHOLDS: Partial<Record<string, { warn: number; escalate: number }>> = {
  clarification:                  { warn: 4,  escalate: 24 },
  preparation:                    { warn: 24, escalate: 72 },
  planned:                        { warn: 24, escalate: 72 },
  completed_pending_confirmation: { warn: 24, escalate: 48 },
  awaiting_materials:             { warn: 48, escalate: 120 },
};

// ── Planning + SLA job ─────────────────────────────────────────────────────
export async function runDailyPlanningJob(): Promise<void> {
  console.log('[Planning] Démarrage — ' + new Date().toISOString());

  await planReadyDemandes();
  await checkSlaAlerts();
  await checkBCsPendingValidation();
  await checkConfirmationsPending();
}

async function planReadyDemandes(): Promise<void> {
  const { data: requests, error } = await supabase
    .from('maintenance_requests')
    .select('request_id, site_id, assigned_technician_id, requested_by, issuing_entity_id, type, points')
    .eq('status', 'ready_to_plan');

  if (error) {
    console.error('[Planning] Erreur lecture demandes:', error.message);
    return;
  }
  if (!requests || requests.length === 0) {
    console.log('[Planning] Aucune demande à planifier.');
    return;
  }

  const missionDate = nextWorkingDay();
  let planned = 0;
  let unassigned = 0;

  for (const req of requests) {
    if (!req.assigned_technician_id) {
      unassigned++;
      await supabase.from('notifications').insert({
        request_id: req.request_id,
        level: 'escalation',
        recipient_user_id: null,
        channel: 'email',
        message: `Demande ${req.request_id.slice(0, 8)} sans prestataire assigné — planification impossible. Accès : ${APP_URL}/demandes`,
        status_at_trigger: 'ready_to_plan',
        hours_in_status: 0,
      });
      continue;
    }

    const { data: mission, error: mErr } = await supabase
      .from('missions')
      .insert({
        site_id: req.site_id,
        technician_id: req.assigned_technician_id,
        mission_date: missionDate,
        status: 'planned',
        created_by: 'ai_engine',
      })
      .select('mission_id')
      .single();

    if (mErr || !mission) {
      console.error('[Planning] Erreur création mission:', mErr?.message);
      continue;
    }

    await supabase.from('mission_interventions').insert({
      mission_id: mission.mission_id,
      request_id: req.request_id,
      sequence_order: 1,
      travel_time_from_previous: 0,
    });

    await supabase
      .from('maintenance_requests')
      .update({ status: 'planned', planned_mission_id: mission.mission_id })
      .eq('request_id', req.request_id);

    const emailPrestataire = emailMissionPlanifiee(missionDate);
    await supabase.from('notifications').insert({
      request_id: req.request_id,
      level: 'low',
      recipient_user_id: req.assigned_technician_id,
      channel: 'email',
      message: `Nouvelle mission planifiée pour le ${missionDate}. Voir : ${APP_URL}/dashboard/electricien`,
      email_subject: emailPrestataire.subject,
      email_html: emailPrestataire.html,
      status_at_trigger: 'planned',
      hours_in_status: 0,
    });

    const emailDemandeur = emailDemandePlanifiee(missionDate);
    await supabase.from('notifications').insert({
      request_id: req.request_id,
      level: 'low',
      recipient_user_id: req.requested_by,
      channel: 'email',
      message: `Votre demande a été planifiée. Intervention prévue le ${missionDate}. Suivre : ${APP_URL}/dashboard/demandeur`,
      email_subject: emailDemandeur.subject,
      email_html: emailDemandeur.html,
      status_at_trigger: 'planned',
      hours_in_status: 0,
    });

    planned++;
  }

  console.log(`[Planning] Planification — ${planned} planifiées, ${unassigned} sans prestataire.`);
}

async function checkSlaAlerts(): Promise<void> {
  const statuses = Object.keys(SLA_THRESHOLDS);

  const { data: requests, error } = await supabase
    .from('maintenance_requests')
    .select('request_id, status, status_changed_at, assigned_technician_id, issuing_entity_id, requested_by')
    .in('status', statuses);

  if (error || !requests) return;

  const now = Date.now();

  for (const req of requests) {
    const changedAt = req.status_changed_at ? new Date(req.status_changed_at).getTime() : now;
    const hoursInStatus = Math.round((now - changedAt) / (1000 * 60 * 60));
    const thresholds = SLA_THRESHOLDS[req.status];
    if (!thresholds) continue;

    const dedupeWindow = new Date(now - 23 * 60 * 60 * 1000).toISOString();
    const level = hoursInStatus >= thresholds.escalate ? 'escalation' : 'warning';
    const { data: existing } = await supabase
      .from('notifications')
      .select('notification_id')
      .eq('request_id', req.request_id)
      .eq('level', level)
      .eq('status_at_trigger', req.status)
      .gte('created_at', dedupeWindow)
      .limit(1);
    if (existing && existing.length > 0) continue;

    if (hoursInStatus >= thresholds.escalate) {
      // Escalade → DG + directeur d'entité
      const emailDg = emailEscaladeDG(req.request_id, hoursInStatus);
      await supabase.from('notifications').insert({
        request_id: req.request_id,
        level: 'escalation',
        recipient_user_id: null, // DG role
        channel: 'email',
        message: `ESCALADE : demande ${req.request_id.slice(0, 8)} en statut "${req.status}" depuis ${hoursInStatus}h — seuil ${thresholds.escalate}h dépassé.`,
        email_subject: emailDg.subject,
        email_html: emailDg.html,
        status_at_trigger: req.status,
        hours_in_status: hoursInStatus,
      });

      const emailDir = emailEscaladeDirecteur(req.request_id, hoursInStatus);
      await supabase.from('notifications').insert({
        request_id: req.request_id,
        level: 'escalation',
        recipient_user_id: req.issuing_entity_id,
        channel: 'email',
        message: `Escalade signalée. Demande ${req.request_id.slice(0, 8)} — ${hoursInStatus}h dans le statut "${req.status}".`,
        email_subject: emailDir.subject,
        email_html: emailDir.html,
        status_at_trigger: req.status,
        hours_in_status: hoursInStatus,
      });

    } else if (hoursInStatus >= thresholds.warn && req.assigned_technician_id) {
      // Rappel prestataire
      const emailRappel = emailRappelPrestataire(req.request_id, hoursInStatus);
      await supabase.from('notifications').insert({
        request_id: req.request_id,
        level: 'warning',
        recipient_user_id: req.assigned_technician_id,
        channel: 'email',
        message: `Rappel : demande ${req.request_id.slice(0, 8)} en attente depuis ${hoursInStatus}h. Seuil alerte : ${thresholds.warn}h.`,
        email_subject: emailRappel.subject,
        email_html: emailRappel.html,
        status_at_trigger: req.status,
        hours_in_status: hoursInStatus,
      });
    }
  }

  console.log(`[Planning] SLA alerts — ${requests.length} demandes vérifiées.`);
}

async function checkBCsPendingValidation(): Promise<void> {
  // BCs en draft depuis plus de 24h → rappel directeur
  const { data: bcs, error } = await supabase
    .from('purchase_orders')
    .select('po_id, po_number, created_at, request_id, issuing_entity_id')
    .eq('status', 'draft');

  if (error || !bcs) return;

  const now = Date.now();
  let reminded = 0;

  for (const bc of bcs) {
    const createdAt = new Date(bc.created_at).getTime();
    const hoursWaiting = Math.round((now - createdAt) / (1000 * 60 * 60));

    if (hoursWaiting >= 24) {
      const dedupeWindow = new Date(now - 23 * 60 * 60 * 1000).toISOString();
      const { data: dup } = await supabase
        .from('notifications')
        .select('notification_id')
        .eq('request_id', bc.request_id)
        .eq('level', 'warning')
        .eq('status_at_trigger', 'draft')
        .gte('created_at', dedupeWindow)
        .limit(1);
      if (dup && dup.length > 0) continue;

      const email = emailBCValidationRequise(bc.po_number, bc.po_id);
      await supabase.from('notifications').insert({
        request_id: bc.request_id,
        level: 'warning',
        recipient_user_id: bc.issuing_entity_id,
        channel: 'email',
        message: `BC ${bc.po_number} en attente de validation depuis ${hoursWaiting}h. Valider : ${APP_URL}/bons-de-commande/${bc.po_id}`,
        email_subject: email.subject,
        email_html: email.html,
        status_at_trigger: 'draft',
        hours_in_status: hoursWaiting,
      });
      reminded++;
    }
  }

  console.log(`[Planning] BCs — ${reminded} rappels de validation envoyés.`);
}

async function checkConfirmationsPending(): Promise<void> {
  // Demandes en completed_pending_confirmation → rappel demandeur
  const { data: requests, error } = await supabase
    .from('maintenance_requests')
    .select('request_id, status_changed_at, requested_by')
    .eq('status', 'completed_pending_confirmation');

  if (error || !requests) return;

  const now = Date.now();
  let reminded = 0;

  for (const req of requests) {
    const changedAt = req.status_changed_at ? new Date(req.status_changed_at).getTime() : now;
    const hoursWaiting = Math.round((now - changedAt) / (1000 * 60 * 60));

    if (hoursWaiting >= 4) {
      const dedupeWindow = new Date(now - 23 * 60 * 60 * 1000).toISOString();
      const { data: dup } = await supabase
        .from('notifications')
        .select('notification_id')
        .eq('request_id', req.request_id)
        .eq('level', 'warning')
        .eq('status_at_trigger', 'completed_pending_confirmation')
        .gte('created_at', dedupeWindow)
        .limit(1);
      if (dup && dup.length > 0) continue;

      const email = emailConfirmationRequise(req.request_id);
      await supabase.from('notifications').insert({
        request_id: req.request_id,
        level: 'warning',
        recipient_user_id: req.requested_by,
        channel: 'email',
        message: `Votre intervention est terminée. Merci de confirmer : ${APP_URL}/demandes/${req.request_id}`,
        email_subject: email.subject,
        email_html: email.html,
        status_at_trigger: 'completed_pending_confirmation',
        hours_in_status: hoursWaiting,
      });
      reminded++;
    }
  }

  console.log(`[Planning] Confirmations — ${reminded} rappels envoyés aux demandeurs.`);
}
