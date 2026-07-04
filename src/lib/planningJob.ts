import { supabase } from './supabase';

function nextWorkingDay(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split('T')[0];
}

export async function runDailyPlanningJob(): Promise<void> {
  console.log('[Planning] Démarrage — ' + new Date().toISOString());

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
      // Notifier admin : demande sans électricien
      await supabase.from('notifications').insert({
        request_id: req.request_id,
        level: 'escalation',
        recipient_user_id: null, // broadcast admins — à filtrer côté job
        channel: 'app',
        message: `Demande ${req.request_id.slice(0, 8)}… sans électricien assigné — planification impossible ce soir.`,
        status_at_trigger: 'ready_to_plan',
        hours_in_status: 0,
      });
      continue;
    }

    // Créer la mission pour le lendemain
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

    // Lier la demande à la mission
    await supabase.from('mission_interventions').insert({
      mission_id: mission.mission_id,
      request_id: req.request_id,
      sequence_order: 1,
      travel_time_from_previous: 0,
    });

    // Passer la demande à 'planned'
    await supabase
      .from('maintenance_requests')
      .update({ status: 'planned', planned_mission_id: mission.mission_id })
      .eq('request_id', req.request_id);

    // Notification → électricien
    await supabase.from('notifications').insert({
      request_id: req.request_id,
      level: 'low',
      recipient_user_id: req.assigned_technician_id,
      channel: 'app',
      message: `Nouvelle mission planifiée pour le ${missionDate}. Demande ${req.request_id.slice(0, 8)}…`,
      status_at_trigger: 'planned',
      hours_in_status: 0,
    });

    // Notification → demandeur
    await supabase.from('notifications').insert({
      request_id: req.request_id,
      level: 'low',
      recipient_user_id: req.requested_by,
      channel: 'app',
      message: `Votre demande a été planifiée. Intervention prévue le ${missionDate}.`,
      status_at_trigger: 'planned',
      hours_in_status: 0,
    });

    planned++;
  }

  console.log(`[Planning] Terminé — ${planned} planifiées, ${unassigned} sans électricien.`);
}
