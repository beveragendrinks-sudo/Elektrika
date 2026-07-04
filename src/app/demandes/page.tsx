import type { RequestStatus } from '@/types';
import Link from 'next/link';

interface DemandeSummary {
  request_id: string;
  title: string;
  status: RequestStatus;
  site_name: string;
  equipment_name: string;
  submitted_at: string;
  priority_score: number;
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  draft: 'Brouillon',
  pending_management_validation: 'Validation direction',
  clarification: 'Clarification',
  preparation: 'Préparation',
  ready_to_plan: 'Prête à planifier',
  planned: 'Planifiée',
  in_progress: "En cours",
  cancelled: 'Annulée',
  completed_pending_confirmation: 'À confirmer',
  accepted: 'Acceptée',
};

const STATUS_COLOR: Record<RequestStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending_management_validation: 'bg-amber-100 text-amber-700',
  clarification: 'bg-yellow-100 text-yellow-700',
  preparation: 'bg-blue-100 text-blue-700',
  ready_to_plan: 'bg-violet-100 text-violet-700',
  planned: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-cyan-100 text-cyan-700',
  cancelled: 'bg-red-100 text-red-600',
  completed_pending_confirmation: 'bg-orange-100 text-orange-700',
  accepted: 'bg-green-100 text-green-700',
};

// Placeholder data — sera remplacé par des requêtes Supabase
const MOCK_DEMANDES: DemandeSummary[] = [
  {
    request_id: '1',
    title: 'Panne tableau électrique atelier B',
    status: 'clarification',
    site_name: 'Siège, Ben Arous',
    equipment_name: 'Tableau TGS-B2',
    submitted_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    priority_score: 72,
  },
  {
    request_id: '2',
    title: 'Remplacement moteur pompe circuit refroidissement',
    status: 'preparation',
    site_name: 'Pôle Industriel, Jbel Oust',
    equipment_name: 'Pompe P-12',
    submitted_at: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    priority_score: 55,
  },
  {
    request_id: '3',
    title: 'Maintenance préventive ligne production',
    status: 'planned',
    site_name: 'Atelier Technique, Grombalia',
    equipment_name: 'Ligne L3',
    submitted_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    priority_score: 30,
  },
];

function timeAgo(iso: string): string {
  const hours = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} j`;
}

export default function DemandesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Demandes de maintenance</h1>
          <p className="text-slate-500 mt-1">{MOCK_DEMANDES.length} demandes actives</p>
        </div>
        <Link href="/demandes/new" className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">
          + Nouvelle demande
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
        {MOCK_DEMANDES.map((d) => (
          <div key={d.request_id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
            {/* Lien vers la fiche */}
            <Link
              href={`/demandes/${d.request_id}`}
              className="flex-1 min-w-0 flex items-center justify-between gap-4 group"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">{d.title}</div>
                <div className="text-sm text-slate-500">{d.equipment_name} — {d.site_name}</div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <div className="text-xs text-slate-400">priorité</div>
                  <div className="text-sm font-semibold text-slate-700">{d.priority_score}</div>
                </div>
                <div className="text-xs text-slate-400 w-10 text-right">{timeAgo(d.submitted_at)}</div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOR[d.status]}`}>
                  {STATUS_LABELS[d.status]}
                </span>
              </div>
            </Link>

            {/* Bouton BC — uniquement au statut "préparation" (règle workflow) */}
            {d.status === 'preparation' && (
              <Link
                href={`/bons-de-commande/new?request_id=${d.request_id}`}
                className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:border-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap"
                title="Créer un Bon de Commande"
              >
                + BC
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
