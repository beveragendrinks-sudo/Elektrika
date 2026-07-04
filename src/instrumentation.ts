export async function register() {
  // Uniquement côté serveur Node.js (pas dans Edge Runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startCronJobs } = await import('./lib/cron');
    startCronJobs();
  }
}
