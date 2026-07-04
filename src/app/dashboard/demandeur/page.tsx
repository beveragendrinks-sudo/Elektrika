'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { RequestStatus, InterventionCategory, InterventionNature } from '@/types';

// ── Display maps ────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<RequestStatus, string> = {
  draft:                          'Brouillon',
  pending_management_validation:  'Attente validation',
  clarification:                  'Clarification',
  preparation:                    'Préparation',
  ready_to_plan:                  'Prête à planifier',
  planned:                        'Planifiée',
  in_progress:                    'En cours',
  cancelled:                      'Annulée',
  completed_pending_confirmation:  'À confirmer',
  accepted:                       'Acceptée',
};

const STATUS_COLOR: Record<RequestStatus, string> = {
  draft:                          'bg-slate-100 text-slate-500',
  pending_management_validation:  'bg-amber-100 text-amber-700',
  clarification:                  'bg-orange-100 text-orange-700',
  preparation:                    'bg-yellow-100 text-yellow-700',
  ready_to_plan:                  'bg-sky-100 text-sky-700',
  planned:                        'bg-violet-100 text-violet-700',
  in_progress:                    'bg-blue-100 text-blue-700',
  cancelled:                      'bg-red-100 text-red-600',
  completed_pending_confirmation:  'bg-teal-100 text-teal-700',
  accepted:                       'bg-green-100 text-green-700',
};

const CAT_LABEL: Record<InterventionCategory, string> = {
  electricite:  'Électricité',
  plomberie:    'Plomberie',
  climatisation:'Climatisation',
  maconnerie:   'Maçonnerie',
  peinture:     'Peinture',
  menuiserie:   'Menuiserie',
  autres:       'Autres',
};

const CAT_ICON: Record<InterventionCategory, string> = {
  electricite:  '⚡',
  plomberie:    '🔧',
  climatisation:'❄️',
  maconnerie:   '🧱',
  peinture:     '🎨',
  menuiserie:   '🪚',
  autres:       '🔩',
};

const NAT_LABEL: Record<InterventionNature, string> = {
  corrective:   'Corrective',
  preventive:   'Préventive',
  amelioration: 'Amélioration',
  travaux_neufs:'Travaux neufs',
  conformite:   'Conformité',
};

const TERMINAL_STATUSES: RequestStatus[] = ['accepted', 'cancelled'];
const RATABLE_STATUSES: RequestStatus[] = ['completed_pending_confirmation', 'accepted'];

// ── Types ──────────────────────────────────────────────────────────────────
interface Demande {
  id: string;
  ref: string;
  title: string;
  category: InterventionCategory;
  nature: InterventionNature;
  site: string;
  status: RequestStatus;
  prestataire: string;
  prestataireAvgRating: number | null; // avg rating across all interventions
  myRating: number | null;             // rating I gave for this intervention
  createdAt: string;
  updatedAt: string;
  daysElapsed: number;
  alertMessage?: string;               // populated if delayed
}

// ── Mock data ──────────────────────────────────────────────────────────────
const MOCK_DEMANDES: Demande[] = [
  {
    id: 'd1', ref: 'DEM-2026-041', title: 'Panne disjoncteur local technique RDC',
    category: 'electricite', nature: 'corrective',
    site: 'Siège, Ben Arous', status: 'in_progress',
    prestataire: 'Elkateb Électricité', prestataireAvgRating: 4.2, myRating: null,
    createdAt: '2026-06-28', updatedAt: '2026-07-01', daysElapsed: 3,
    alertMessage: 'En cours depuis 3 jours — délai habituel dépassé (2 j)',
  },
  {
    id: 'd2', ref: 'DEM-2026-039', title: 'Fuite canalisation bureau direction',
    category: 'plomberie', nature: 'corrective',
    site: 'Siège, Ben Arous', status: 'planned',
    prestataire: 'TunisPlumo SARL', prestataireAvgRating: 3.8, myRating: null,
    createdAt: '2026-06-30', updatedAt: '2026-07-02', daysElapsed: 4,
  },
  {
    id: 'd3', ref: 'DEM-2026-035', title: 'Climatiseur salle de réunion H4',
    category: 'climatisation', nature: 'preventive',
    site: 'Siège, Ben Arous', status: 'completed_pending_confirmation',
    prestataire: 'ClimaPro Tunisie', prestataireAvgRating: 4.7, myRating: null,
    createdAt: '2026-06-20', updatedAt: '2026-07-02', daysElapsed: 12,
  },
  {
    id: 'd4', ref: 'DEM-2026-028', title: 'Peinture couloir niveau 2',
    category: 'peinture', nature: 'amelioration',
    site: 'Siège, Ben Arous', status: 'accepted',
    prestataire: 'Décor & Bâti', prestataireAvgRating: 4.0, myRating: 4,
    createdAt: '2026-06-10', updatedAt: '2026-06-25', daysElapsed: 15,
  },
  {
    id: 'd5', ref: 'DEM-2026-021', title: 'Installation tableau électrique annexe',
    category: 'electricite', nature: 'travaux_neufs',
    site: 'Unité Production, La Manouba', status: 'accepted',
    prestataire: 'Elkateb Électricité', prestataireAvgRating: 4.2, myRating: 5,
    createdAt: '2026-05-28', updatedAt: '2026-06-18', daysElapsed: 21,
  },
  {
    id: 'd6', ref: 'DEM-2026-015', title: 'Réparation porte coupe-feu',
    category: 'menuiserie', nature: 'conformite',
    site: 'Siège, Ben Arous', status: 'accepted',
    prestataire: 'MenuisBTP', prestataireAvgRating: 3.5, myRating: 3,
    createdAt: '2026-05-10', updatedAt: '2026-05-28', daysElapsed: 18,
  },
];

// ── Star rating component ─────────────────────────────────────────────────
function StarRating({
  value, onChange, readonly = false, size = 'sm',
}: {
  value: number | null;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: 'xs' | 'sm' | 'md';
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const sizeClass = size === 'xs' ? 'text-sm' : size === 'sm' ? 'text-base' : 'text-xl';

  return (
    <span className={`inline-flex gap-0.5 ${sizeClass}`}>
      {[1, 2, 3, 4, 5].map(star => {
        const filled = (hovered ?? value ?? 0) >= star;
        return (
          <span
            key={star}
            className={`cursor-${readonly ? 'default' : 'pointer'} transition-colors select-none`}
            style={{ color: filled ? '#f59e0b' : '#d1d5db' }}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(null)}
            onClick={() => !readonly && onChange?.(star)}
          >
            ★
          </span>
        );
      })}
    </span>
  );
}

// ── Alert card ────────────────────────────────────────────────────────────
function AlertCard({ demandes }: { demandes: Demande[] }) {
  const alerts = demandes.filter(d => d.alertMessage);
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.map(d => (
        <div key={d.id} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-amber-500 text-lg mt-0.5">⚠️</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-amber-900">{d.ref} — {d.title}</div>
            <div className="text-xs text-amber-700 mt-0.5">{d.alertMessage}</div>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[d.status]}`}>
            {STATUS_LABEL[d.status]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Demande row ────────────────────────────────────────────────────────────
function DemandeRow({
  demande, onRate,
}: {
  demande: Demande;
  onRate?: (id: string, rating: number) => void;
}) {
  const [showRating, setShowRating] = useState(false);
  const canRate = RATABLE_STATUSES.includes(demande.status) && demande.myRating === null;

  return (
    <li className="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3 border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
      {/* Left: category icon + info */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="text-2xl mt-0.5 shrink-0">{CAT_ICON[demande.category]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-xs font-mono text-slate-400">{demande.ref}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[demande.status]}`}>
              {STATUS_LABEL[demande.status]}
            </span>
          </div>
          <div className="font-medium text-slate-900 text-sm mt-0.5 leading-tight">{demande.title}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
              {CAT_LABEL[demande.category]}
            </span>
            <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
              {NAT_LABEL[demande.nature]}
            </span>
            <span>📍 {demande.site}</span>
          </div>
        </div>
      </div>

      {/* Right: prestataire + rating + date */}
      <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
        <div className="flex items-center gap-1.5">
          {demande.prestataireAvgRating !== null && (
            <StarRating value={Math.round(demande.prestataireAvgRating)} readonly size="xs" />
          )}
          <span className="text-xs text-slate-600 font-medium">{demande.prestataire}</span>
        </div>
        {demande.prestataireAvgRating !== null && (
          <span className="text-xs text-slate-400">{demande.prestataireAvgRating.toFixed(1)} / 5</span>
        )}
        <span className="text-xs text-slate-400">
          Créée le {new Date(demande.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </span>

        {/* Rating section */}
        {canRate && !showRating && (
          <button
            onClick={() => setShowRating(true)}
            className="text-xs text-teal-600 hover:text-teal-800 font-medium underline underline-offset-2 mt-0.5"
          >
            Évaluer l&apos;intervention
          </button>
        )}
        {canRate && showRating && (
          <div className="flex flex-col items-end gap-1 mt-0.5 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
            <span className="text-xs text-teal-800 font-medium">Votre note (anonyme)</span>
            <StarRating
              value={null}
              size="md"
              onChange={(v) => {
                onRate?.(demande.id, v);
                setShowRating(false);
              }}
            />
          </div>
        )}
        {demande.myRating !== null && (
          <div className="flex items-center gap-1 mt-0.5">
            <StarRating value={demande.myRating} readonly size="xs" />
            <span className="text-xs text-slate-400">Ma note</span>
          </div>
        )}
      </div>
    </li>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function DemandeurDashboard() {
  const [demandes, setDemandes] = useState<Demande[]>(MOCK_DEMANDES);

  function handleRate(id: string, rating: number) {
    setDemandes(prev => prev.map(d => d.id === id ? { ...d, myRating: rating } : d));
  }

  const ongoing  = demandes.filter(d => !TERMINAL_STATUSES.includes(d.status));
  const history  = demandes.filter(d =>  TERMINAL_STATUSES.includes(d.status));

  // Status summary for ongoing
  const statusCounts: Partial<Record<RequestStatus, number>> = {};
  for (const d of ongoing) {
    statusCounts[d.status] = (statusCounts[d.status] ?? 0) + 1;
  }
  const summaryItems = Object.entries(statusCounts).map(([status, count]) => ({
    status: status as RequestStatus,
    count: count ?? 0,
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mon espace — Demandeur</h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            Siège, Ben Arous · LAD · Juillet 2026
          </p>
        </div>
        <Link
          href="/demandes/new"
          className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          + Nouvelle demande
        </Link>
      </div>

      {/* ── Alertes ── */}
      <AlertCard demandes={demandes} />

      {/* ── Récapitulatif statuts ── */}
      {summaryItems.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Demandes en cours — récapitulatif
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {summaryItems.map(({ status, count }) => (
              <div key={status} className="bg-white rounded-lg border border-slate-200 p-4">
                <div className={`text-xs font-medium px-2 py-0.5 rounded w-fit mb-2 ${STATUS_COLOR[status]}`}>
                  {STATUS_LABEL[status]}
                </div>
                <div className="text-3xl font-bold text-slate-900">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Demandes en cours ── */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="font-medium text-slate-900">Demandes en cours</div>
          <span className="text-xs text-slate-400">{ongoing.length} demande{ongoing.length !== 1 ? 's' : ''}</span>
        </div>
        {ongoing.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Aucune demande en cours</div>
        ) : (
          <ul>
            {ongoing.map(d => (
              <DemandeRow key={d.id} demande={d} onRate={handleRate} />
            ))}
          </ul>
        )}
      </div>

      {/* ── Historique ── */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="font-medium text-slate-900">Historique</div>
          <span className="text-xs text-slate-400">{history.length} demande{history.length !== 1 ? 's' : ''}</span>
        </div>
        {history.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Aucun historique</div>
        ) : (
          <ul>
            {history.map(d => (
              <DemandeRow key={d.id} demande={d} onRate={handleRate} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
