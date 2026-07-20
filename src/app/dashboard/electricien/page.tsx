'use client';

import { useState, useMemo } from 'react';
import {
  MOCK_INTERVENTIONS,
  ACTIVE_STATUSES,
  HISTORY_STATUSES,
  CATEGORY_LABEL,
  CATEGORY_ICON,
  type InterventionCategory,
} from '@/lib/interventionData';
import KanbanBoard from '@/components/KanbanBoard';
import TwoWeekCalendar from '@/components/TwoWeekCalendar';
import { QuickBarDesktop, QuickBarMobile } from '@/components/QuickBar';
import { SectionTitle, FilterChip, KpiCard, HistoryRow } from '@/components/DashboardShared';

// Demo: électricien voit ses interventions assignées
const MY_PRESTATAIRE = 'Mohamed Salah';
const BASE = MOCK_INTERVENTIONS.filter(i => i.prestataire === MY_PRESTATAIRE);
const ALL_CATEGORIES = Array.from(new Set(BASE.map(i => i.category))) as InterventionCategory[];

const KPI_MOCK = {
  done: 12,
  inProgress: BASE.filter(i => i.status === 'en_cours').length,
  avgRating: 4.7,
  avgDays: 1.8,
};

export default function ElectricienDashboard() {
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

  const toConfirm = BASE.filter(i => i.status === 'a_valider').length;
  const criticalCount = BASE.filter(i => i.isCritical && ACTIVE_STATUSES.includes(i.status)).length;
  const todayItems = BASE.filter(i => i.plannedDate === '2026-07-16' && ACTIVE_STATUSES.includes(i.status));

  return (
    <div className="px-4 sm:px-6 py-4 pb-28 lg:pb-8 max-w-7xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mon tableau de bord</h1>
          <p className="text-sm text-slate-500 mt-0.5">{MY_PRESTATAIRE} · Électricité</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {todayItems.length > 0 && (
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                📅 {todayItems.length} aujourd&apos;hui
              </span>
            )}
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
          <QuickBarDesktop role="electricien" />
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        <FilterChip active={filterCat === 'all'} onClick={() => setFilterCat('all')}>
          Toutes catégories
        </FilterChip>
        {ALL_CATEGORIES.map(cat => (
          <FilterChip key={cat} active={filterCat === cat} onClick={() => setFilterCat(cat)}>
            {CATEGORY_ICON[cat]} {CATEGORY_LABEL[cat]}
          </FilterChip>
        ))}
      </div>

      {/* ── Kanban ─────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Mes interventions</SectionTitle>
        <KanbanBoard interventions={active} defaultColumn="inprog" />
      </section>

      {/* ── 2-week calendar ────────────────────────────────────────── */}
      <section>
        <SectionTitle>Planning 2 semaines</SectionTitle>
        <TwoWeekCalendar interventions={active} />
      </section>

      {/* ── KPIs ───────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Ma performance</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Terminées ce mois" value={KPI_MOCK.done} unit="" color="bg-green-50 border-green-100" valueColor="text-green-700" />
          <KpiCard label="En cours" value={KPI_MOCK.inProgress} unit="" color="bg-blue-50 border-blue-100" valueColor="text-blue-700" />
          <KpiCard label="Note moyenne" value={KPI_MOCK.avgRating} unit="/5" color="bg-amber-50 border-amber-100" valueColor="text-amber-700" />
          <KpiCard label="Délai moyen" value={KPI_MOCK.avgDays} unit="j" color="bg-slate-50 border-slate-100" valueColor="text-slate-700" />
        </div>
      </section>

      {/* ── Historique ─────────────────────────────────────────────── */}
      <section>
        <button
          onClick={() => setHistoOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <span>📁 Mes interventions passées</span>
          <span className="flex items-center gap-2">
            <span className="text-xs font-normal text-slate-400">
              {BASE.filter(i => HISTORY_STATUSES.includes(i.status)).length} terminées
            </span>
            <span>{histoOpen ? '▲' : '▼'}</span>
          </span>
        </button>

        {histoOpen && (
          <div className="mt-3 space-y-3">
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
            {history.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Aucune dans l&apos;historique</p>
            ) : (
              <div className="space-y-2">
                {history.map(i => <HistoryRow key={i.id} item={i} variant="site" />)}
              </div>
            )}
          </div>
        )}
      </section>

      <QuickBarMobile role="electricien" />
    </div>
  );
}

