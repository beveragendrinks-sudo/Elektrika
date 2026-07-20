'use client';

import { useState, useMemo } from 'react';
import {
  MOCK_INTERVENTIONS,
  ACTIVE_STATUSES,
  HISTORY_STATUSES,
  CATEGORY_LABEL,
  CATEGORY_ICON,
  CATEGORY_COLORS,
  type InterventionCategory,
} from '@/lib/interventionData';
import KanbanBoard from '@/components/KanbanBoard';
import TwoWeekCalendar from '@/components/TwoWeekCalendar';
import { QuickBarDesktop, QuickBarMobile } from '@/components/QuickBar';
import { SectionTitle, HistoryRow } from '@/components/DashboardShared';

// Demo: demandeur sees LAD / Siège Ben Arous requests
const BASE = MOCK_INTERVENTIONS.filter(i => i.entity === 'LAD' && i.site === 'Siège Ben Arous');
const ALL_CATEGORIES = Array.from(new Set(BASE.map(i => i.category))) as InterventionCategory[];

export default function DemandeurDashboard() {
  const [filterCat, setFilterCat] = useState<InterventionCategory | 'all'>('all');
  const [histoOpen, setHistoOpen] = useState(false);
  const [histoCat, setHistoCat] = useState<InterventionCategory | 'all'>('all');

  const active = useMemo(() =>
    BASE.filter(i =>
      ACTIVE_STATUSES.includes(i.status) &&
      (filterCat === 'all' || i.category === filterCat),
    ), [filterCat]);

  const history = useMemo(() =>
    BASE.filter(i =>
      HISTORY_STATUSES.includes(i.status) &&
      (histoCat === 'all' || i.category === histoCat),
    ), [histoCat]);

  const criticalCount = BASE.filter(i => i.isCritical && ACTIVE_STATUSES.includes(i.status)).length;
  const toConfirm = BASE.filter(i => i.status === 'a_valider').length;

  return (
    <div className="px-4 sm:px-6 py-4 pb-28 lg:pb-8 max-w-7xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mes demandes</h1>
          <p className="text-sm text-slate-500 mt-0.5">LAD · Siège Ben Arous</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-sm text-slate-600">
              <span className="font-bold text-slate-900">{BASE.filter(i => ACTIVE_STATUSES.includes(i.status)).length}</span> actives
            </span>
            {toConfirm > 0 && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                ⏳ {toConfirm} à confirmer
              </span>
            )}
            {criticalCount > 0 && (
              <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                ⚡ {criticalCount} critique{criticalCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="hidden lg:block">
          <QuickBarDesktop role="demandeur" />
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setFilterCat('all')}
          className={`text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${filterCat === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}
        >
          Toutes catégories
        </button>
        {ALL_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${
              filterCat === cat
                ? `${CATEGORY_COLORS[cat].bar.replace('bg-', 'bg-')} text-white border-transparent`
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
            }`}
            style={filterCat === cat ? {} : {}}
          >
            {CATEGORY_ICON[cat]} {CATEGORY_LABEL[cat]}
          </button>
        ))}
      </div>

      {/* ── Kanban ─────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Tableau des demandes</SectionTitle>
        <KanbanBoard interventions={active} defaultColumn="soumise" />
      </section>

      {/* ── 2-week planning ────────────────────────────────────────── */}
      <section>
        <SectionTitle>Planning 2 semaines</SectionTitle>
        <TwoWeekCalendar interventions={active} />
      </section>

      {/* ── Historique ─────────────────────────────────────────────── */}
      <section>
        <button
          onClick={() => setHistoOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <span>📁 Historique des interventions</span>
          <span className="flex items-center gap-2">
            <span className="text-xs font-normal text-slate-400">{BASE.filter(i => HISTORY_STATUSES.includes(i.status)).length} terminées</span>
            <span>{histoOpen ? '▲' : '▼'}</span>
          </span>
        </button>

        {histoOpen && (
          <div className="mt-3 space-y-3">
            {/* History category filter */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(['all', ...ALL_CATEGORIES] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setHistoCat(cat)}
                  className={`text-xs px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all ${histoCat === cat ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  {cat === 'all' ? 'Tout' : `${CATEGORY_ICON[cat as InterventionCategory]} ${CATEGORY_LABEL[cat as InterventionCategory]}`}
                </button>
              ))}
            </div>

            {/* History list */}
            {history.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Aucune intervention dans l&apos;historique</p>
            ) : (
              <div className="space-y-2">
                {history.map(i => (
                  <HistoryRow key={i.id} item={i} variant="category" />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Mobile quick bar ───────────────────────────────────────── */}
      <QuickBarMobile role="demandeur" />
    </div>
  );
}

