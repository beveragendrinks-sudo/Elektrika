import RequestTimeline from '@/components/RequestTimeline';
import type { TimelineStep } from '@/components/RequestTimeline';
import Link from 'next/link';
import ClotureSection from './ClotureSection';

const MOCK_STEPS: TimelineStep[] = [
  {
    status: 'draft',
    entered_at: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    exited_at: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
  },
  {
    status: 'planned',
    entered_at: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    exited_at: null,
    low_alert_hours: 24,
    escalation_hours: 48,
  },
];

// Statut courant de la demande (viendra de Supabase)
const MOCK_STATUS = 'planned';

export default function DemandePage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/demandes" className="hover:text-slate-900 transition-colors">Demandes</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">#{params.id}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panne tableau électrique atelier B</h1>
          <p className="text-slate-500 mt-1">Tableau TGS-B2 — Site LAD Tunis</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/ordres-de-travail/ot-${params.id}`}
            className="shrink-0 border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:border-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Ordre de Travail
          </Link>
          <Link
            href={`/bons-de-commande/new?request_id=${params.id}`}
            className="shrink-0 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            + Nouveau Bon de Commande
          </Link>
        </div>
      </div>

      <RequestTimeline
        requestTitle="Panne tableau électrique atelier B"
        equipmentName="Tableau TGS-B2"
        siteName="Site LAD Tunis"
        steps={MOCK_STEPS}
        currentStatus={MOCK_STATUS}
      />

      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3">
        <h2 className="font-semibold text-slate-900">Détails de la demande</h2>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-slate-500">Risque sécurité</dt>
            <dd className="font-medium text-red-600">Oui</dd>
          </div>
          <div>
            <dt className="text-slate-500">Arrêt de production</dt>
            <dd className="font-medium text-slate-900">Non</dd>
          </div>
          <div>
            <dt className="text-slate-500">Score priorité</dt>
            <dd className="font-medium text-slate-900">72 / 100</dd>
          </div>
          <div>
            <dt className="text-slate-500">Entité émettrice</dt>
            <dd className="font-medium text-slate-900">LAD</dd>
          </div>
        </dl>
      </div>

      {/* Section clôture — visible uniquement pour les interventions planifiées / en cours */}
      <ClotureSection
        demandeId={params.id}
        otId={`ot-${params.id}`}
        status={MOCK_STATUS}
      />
    </div>
  );
}
