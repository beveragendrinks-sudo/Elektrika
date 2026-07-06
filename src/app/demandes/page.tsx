'use client';

import { useState } from 'react';
import type { RequestStatus, InterventionCategory } from '@/types';
import Link from 'next/link';
import FilterBar from '@/components/FilterBar';
import type { ActiveCategories, ActiveTypes } from '@/components/FilterBar';

interface DemandeSummary {
  request_id: string;
  title: string;
  status: RequestStatus;
  site_name: string;
  equipment_name: string;
  submitted_at: string;
  priority_score: number;
  category: InterventionCategory;
  intervention_type: 1 | 2 | 3;
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  draft: 'Brouillon',
  pending_management_validation: 'Validation direction',
  clarification: 'Clarification',
  preparation: 'Préparation',
  awaiting_materials: 'Attente matériaux',
  ready_to_plan: 'Prête à planifier',
  planned: 'Planifiée',
  in_progress: 'En cours',
  cancelled: 'Annulée',
  completed_pending_confirmation: 'À confirmer',
  accepted: 'Acceptée',
};

const STATUS_COLOR: Record<RequestStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending_management_validation: 'bg-amber-100 text-amber-700',
  clarification: 'bg-yellow-100 text-yellow-700',
  preparation: 'bg-blue-100 text-blue-700',
  awaiting_materials: 'bg-orange-100 text-orange-700',
  ready_to_plan: 'bg-violet-100 text-violet-700',
  planned: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-cyan-100 text-cyan-700',
  cancelled: 'bg-red-100 text-red-600',
  completed_pending_confirmation: 'bg-teal-100 text-teal-700',
  accepted: 'bg-green-100 text-green-700',
};

const MOCK_DEMANDES: DemandeSummary[] = [
  {
    request_id: '1',
    title: 'Panne tableau électrique atelier B',
    status: 'clarification',
    site_name: 'Siège, Ben Arous',
    equipment_name: 'Tableau TGS-B2',
    submitted_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    priority_score: 72,
    category: 'electricite',
    intervention_type: 1,
  },
  {
    request_id: '2',
    title: 'Remplacement moteur pompe circuit refroidissement',
    status: 'preparation',
    site_name: 'Pôle Industriel, Jbel Oust',
    equipment_name: 'Pompe P-12',
    submitted_at: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    priority_score: 55,
    category: 'plomberie',
    intervention_type: 2,
  },
  {
    request_id: '3',
    title: 'Maintenance préventive armoire électrique P2',
    status: 'planned',
    site_name: 'Atelier Technique, Grombalia',
    equipment_name: 'Armoire P2',
    submitted_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    priority_score: 30,
    category: 'electricite',
    intervention_type: 3,
  },
  {
    request_id: '4',
    title: 'Fuite canalisation atelier C — eau froide',
    status: 'in_progress',
    site_name: 'Pôle Industriel, Jbel Oust',
    equipment_name: 'Réseau eau froide',
    submitted_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    priority_score: 80,
    category: 'plomberie',
    intervention_type: 1,
  },
  {
    request_id: '5',
    title: 'Climatiseur salle serveurs hors service',
    status: 'ready_to_plan',
    site_name: 'Siège, Ben Arous',
    equipment_name: 'Clim. split 18000 BTU',
    submitted_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    priority_score: 90,
    category: 'climatisation',
    intervention_type: 2,
  },
  {
    request_id: '6',
    title: 'Fissures mur porteur entrepôt Est',
    status: 'pending_management_validation',
    site_name: 'Entrepôt Est, Grombalia',
    equipment_name: 'Mur B-Est',
    submitted_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    priority_score: 60,
    category: 'maconnerie',
    intervention_type: 3,
  },
  {
    request_id: '7',
    title: 'Peinture couloir administratif — bâtiment A',
    status: 'preparation',
    site_name: 'Siège, Ben Arous',
    equipment_name: 'Couloir A3',
    submitted_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    priority_score: 15,
    category: 'peinture',
    intervention_type: 3,
  },
  {
    request_id: '8',
    title: 'Remplacement fenêtre cassée bureau 12',
    status: 'draft',
    site_name: 'Siège, Ben Arous',
    equipment_name: 'Fenêtre bureau 12',
    submitted_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    priority_score: 25,
    category: 'menuiserie',
    intervention_type: 1,
  },
  {
    request_id: '9',
    title: 'Remplacement variateur fréquence V-08',
    status: 'awaiting_materials',
    site_name: 'Megrine',
    equipment_name: 'Variateur V-08',
    submitted_at: new Date(Date.now() - 60 * 3600 * 1000).toISOString(),
    priority_score: 65,
    category: 'electricite',
    intervention_type: 2,
  },
  {
    request_id: '10',
    title: 'Installation VMC salle de réunion principale',
    status: 'accepted',
    site_name: 'Siège, Ben Arous',
    equipment_name: 'VMC salle 1',
    submitted_at: new Date(Date.now() - 120 * 3600 * 1000).toISOString(),
    priority_score: 20,
    category: 'climatisation',
    intervention_type: 3,
  },
];

function timeAgo(iso: string): string {
  const hours = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} j`;
}

export default function DemandesPage() {
  const [selectedCategories, setSelectedCategories] = useState<ActiveCategories>([]);
  const [selectedTypes, setSelectedTypes] = useState<ActiveTypes>([]);

  const filtered = MOCK_DEMANDES.filter(d => {
    const catOk = selectedCategories.length === 0 || selectedCategories.includes(d.category);
    const typeOk = selectedTypes.length === 0 || selectedTypes.includes(d.intervention_type);
    return catOk && typeOk;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Demandes de maintenance</h1>
          <p className="text-slate-500 mt-1">
            {filtered.length !== MOCK_DEMANDES.length
              ? <><span className="font-medium">{filtered.length}</span> / {MOCK_DEMANDES.length} demandes</>
              : <>{MOCK_DEMANDES.length} demandes actives</>
            }
          </p>
        </div>
        <Link href="/demandes/new" className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">
          + Nouvelle demande
        </Link>
      </div>

      <FilterBar
        selectedCategories={selectedCategories}
        selectedTypes={selectedTypes}
        onCategoriesChange={setSelectedCategories}
        onTypesChange={setSelectedTypes}
        resultCount={filtered.length}
        totalCount={MOCK_DEMANDES.length}
      />

      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">
            Aucune demande ne correspond aux filtres sélectionnés.
          </div>
        ) : (
          filtered.map((d) => (
            <div key={d.request_id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
              <Link
                href={`/demandes/${d.request_id}`}
                className="flex-1 min-w-0 flex items-center justify-between gap-4 group"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">{d.title}</div>
                  <div className="text-sm text-slate-500">{d.equipment_name} — {d.site_name}</div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-slate-400">priorité</div>
                    <div className="text-sm font-semibold text-slate-700">{d.priority_score}</div>
                  </div>
                  <div className="text-xs text-slate-400 w-10 text-right hidden sm:block">{timeAgo(d.submitted_at)}</div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOR[d.status]}`}>
                    {STATUS_LABELS[d.status]}
                  </span>
                </div>
              </Link>

              {(d.status === 'preparation' || d.status === 'awaiting_materials') && (
                <Link
                  href={`/bons-de-commande/new?request_id=${d.request_id}`}
                  className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:border-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap"
                  title="Créer un Bon de Commande"
                >
                  + BC
                </Link>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
