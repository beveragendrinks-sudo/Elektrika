import cron from 'node-cron';
import { runDailyPlanningJob } from './planningJob';

let started = false;

export function startCronJobs(): void {
  if (started) return;
  started = true;

  // Planification quotidienne à 20h00 heure de Tunis (Africa/Tunis = UTC+1 hiver / UTC+2 été — DST géré automatiquement par IANA)
  cron.schedule(
    '0 20 * * *',
    async () => {
      console.log('[CRON] 20h00 — lancement job planification');
      try {
        await runDailyPlanningJob();
      } catch (err) {
        console.error('[CRON] Erreur job planification:', err);
      }
    },
    { timezone: 'Africa/Tunis' }
  );

  console.log('[CRON] Job planification enregistré — tir quotidien à 20h00 (Tunis)');
}
