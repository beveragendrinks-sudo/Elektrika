'use client';

import { useState } from 'react';
import InterventionCard from './InterventionCard';
import type { Intervention } from '@/lib/interventionData';
import type { RequestStatus } from '@/types';

interface Column {
  id: string;
  label: string;
  statuses: RequestStatus[];
  colBg: string;
  headerText: string;
  dot: string;
}

const COLUMNS: Column[] = [
  { id: 'new',     label: 'Nouvelles',       statuses: ['nouveau'],        colBg: 'bg-slate-100',  headerText: 'text-slate-700',  dot: 'bg-slate-400'  },
  { id: 'wait',    label: 'En attente',      statuses: ['en_attente'],     colBg: 'bg-amber-50',   headerText: 'text-amber-700',  dot: 'bg-amber-500'  },
  { id: 'offre',   label: "Appel d'offres",  statuses: ['appel_offre'],    colBg: 'bg-orange-50',  headerText: 'text-orange-700', dot: 'bg-orange-500' },
  { id: 'prep',    label: 'En préparation',  statuses: ['en_preparation'], colBg: 'bg-blue-50',    headerText: 'text-blue-700',   dot: 'bg-blue-500'   },
  { id: 'planned', label: 'Planifiées',      statuses: ['planifie'],       colBg: 'bg-indigo-50',  headerText: 'text-indigo-700', dot: 'bg-indigo-500' },
  { id: 'inprog',  label: 'En cours',        statuses: ['en_cours'],       colBg: 'bg-teal-50',    headerText: 'text-teal-700',   dot: 'bg-teal-500'   },
  { id: 'confirm', label: 'À confirmer',     statuses: ['a_confirmer'],    colBg: 'bg-green-50',   headerText: 'text-green-700',  dot: 'bg-green-500'  },
];

interface KanbanBoardProps {
  interventions: Intervention[];
  defaultColumn?: string;
}

export default function KanbanBoard({ interventions, defaultColumn = 'inprog' }: KanbanBoardProps) {
  const firstNonEmpty = COLUMNS.find(c =>
    interventions.some(i => c.statuses.includes(i.status as RequestStatus))
  );
  const [activeCol, setActiveCol] = useState(defaultColumn || firstNonEmpty?.id || 'inprog');

  function colItems(col: Column) {
    return interventions
      .filter(i => col.statuses.includes(i.status as RequestStatus))
      .sort((a, b) => Number(b.isCritical) - Number(a.isCritical));
  }

  const totalActive = interventions.length;

  return (
    <div>
      {/* ── Mobile: tab selector ────────────────────────────────── */}
      <div className="lg:hidden overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex gap-1.5 min-w-max">
          {COLUMNS.map(col => {
            const count = colItems(col).length;
            const isActive = activeCol === col.id;
            return (
              <button
                key={col.id}
                onClick={() => setActiveCol(col.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                  isActive
                    ? `${col.colBg} ${col.headerText} border-current/30 shadow-sm`
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                {col.label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/70 text-current' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Mobile: single column cards ─────────────────────────── */}
      <div className="lg:hidden mt-3 space-y-2">
        {(() => {
          const col = COLUMNS.find(c => c.id === activeCol)!;
          const items = colItems(col);
          if (items.length === 0) {
            return (
              <div className="py-10 text-center text-sm text-slate-400">
                Aucune intervention dans cette colonne
              </div>
            );
          }
          return items.map(item => <InterventionCard key={item.id} item={item} />);
        })()}
      </div>

      {/* ── Desktop: horizontal scrollable columns ──────────────── */}
      <div className="hidden lg:flex gap-3 overflow-x-auto pb-3">
        {COLUMNS.map(col => {
          const items = colItems(col);
          return (
            <div key={col.id} className={`flex-shrink-0 w-60 rounded-xl ${col.colBg} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${col.headerText}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                  {col.label}
                </div>
                {items.length > 0 && (
                  <span className="text-[10px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                )}
              </div>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-0.5">
                {items.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">—</div>
                ) : (
                  items.map(item => <InterventionCard key={item.id} item={item} />)
                )}
              </div>
            </div>
          );
        })}
      </div>

      {totalActive === 0 && (
        <div className="py-12 text-center text-sm text-slate-400">
          Aucune intervention active
        </div>
      )}
    </div>
  );
}
