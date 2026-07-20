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
import { SectionTitle, FilterChip, FilterChipSm, KpiCard, HistoryRow } from '@/components/DashboardShared';

const ALL_ENTITIES = Array.from(new Set(MOCK_INTERVENTIONS.map(i => i.entity)));
const ALL_SITES    = Array.from(new Set(MOCK_INTERVENTIONS.map(i => i.site)));
const ALL_PREST    = Array.from(new Set(MOCK_INTERVENTIONS.filter(i => i.prestataire).map(i => i.prestataire!)));
const ALL_CATS     = Array.from(new Set(MOCK_INTERVENTIONS.map(i => i.category))) as InterventionCategory[];

const ENTITY_BUDGETS: Record<string, { allocated: number; consumed: number }> = {
  LAD:    { allocated: 220000, consumed: 153000 },
  FAD:    { allocated: 180000, consumed: 127500 },
  BTFI:   { allocated: 95000,  consumed: 68000  },
  '3Ps':  { allocated: 60000,  consumed: 41000  },
  'K&Ko': { allocated: 75000,  consumed: 29000  },
  'Privée':{ allocated: 40000, consumed: 8500   },
};

const KPI_GROUP = {
  oei: 82,
  mttr: 2.4,
  totalActive: MOCK_INTERVENTIONS.filter(i => ACTIVE_STATUSES.includes(i.status)).length,
  criticals: MOCK_INTERVENTIONS.filter(i => i.isCritical && ACTIVE_STATUSES.includes(i.status)).length,
  done: MOCK_INTERVENTIONS.filter(i => i.status === 'termine').length,
};

export default function DGDashboard() {
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterSite,   setFilterSite]   = useState<string>('all');
  const [filterPrest,  setFilterPrest]  = useState<string>('all');
  const [filterCat,    setFilterCat]    = useState<InterventionCategory | 'all'>('all');
  const [histoOpen, setHistoOpen] = useState(false);
  const [histoEntity, setHistoEntity] = useState<string>('all');
  const [histoSite,   setHistoSite]   = useState<string>('all');
  const [histoCat,    setHistoCat]    = useState<InterventionCategory | 'all'>('all');
  const [histoPrest,  setHistoPrest]  = useState<string>('all');

  const sitesForEntity = useMemo(() =>
    filterEntity === 'all'
      ? ALL_SITES
      : Array.from(new Set(MOCK_INTERVENTIONS.filter(i => i.entity === filterEntity).map(i => i.site))),
    [filterEntity]);

  const active = useMemo(() =>
    MOCK_INTERVENTIONS.filter(i =>
      ACTIVE_STATUSES.includes(i.status) &&
      (filterEntity === 'all' || i.entity === filterEntity) &&
      (filterSite   === 'all' || i.site === filterSite) &&
      (filterPrest  === 'all' || i.prestataire === filterPrest) &&
      (filterCat    === 'all' || i.category === filterCat),
    ), [filterEntity, filterSite, filterPrest, filterCat]);

  const history = useMemo(() =>
    MOCK_INTERVENTIONS.filter(i =>
      HISTORY_STATUSES.includes(i.status) &&
      (histoEntity === 'all' || i.entity === histoEntity) &&
      (histoSite   === 'all' || i.site === histoSite) &&
      (histoPrest  === 'all' || i.prestataire === histoPrest) &&
      (histoCat    === 'all' || i.category === histoCat),
    ), [histoEntity, histoSite, histoCat, histoPrest]);

  const totalBudget = Object.values(ENTITY_BUDGETS).reduce((a, b) => ({ allocated: a.allocated + b.allocated, consumed: a.consumed + b.consumed }), { allocated: 0, consumed: 0 });

  return (
    <div className="px-4 sm:px-6 py-4 pb-28 lg:pb-8 max-w-7xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Direction Générale</h1>
          <p className="text-sm text-slate-500 mt-0.5">Vue consolidée — {ALL_ENTITIES.join(', ')}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900">{KPI_GROUP.totalActive}</span>
            <span className="text-sm text-slate-500">actives</span>
            {KPI_GROUP.criticals > 0 && (
              <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                ⚡ {KPI_GROUP.criticals} critique{KPI_GROUP.criticals > 1 ? 's' : ''}
              </span>
            )}
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
              OEI {KPI_GROUP.oei}%
            </span>
          </div>
        </div>
        <div className="hidden lg:block">
          <QuickBarDesktop role="dg" />
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
        {/* Entity */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center pr-1 w-12">Entité</span>
          <FilterChip active={filterEntity === 'all'} onClick={() => { setFilterEntity('all'); setFilterSite('all'); }}>Toutes</FilterChip>
          {ALL_ENTITIES.map(e => (
            <FilterChip key={e} active={filterEntity === e} onClick={() => { setFilterEntity(e); setFilterSite('all'); }}>{e}</FilterChip>
          ))}
        </div>
        {/* Site */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center pr-1 w-12">Site</span>
          <FilterChip active={filterSite === 'all'} onClick={() => setFilterSite('all')}>Tous</FilterChip>
          {sitesForEntity.map(s => (
            <FilterChip key={s} active={filterSite === s} onClick={() => setFilterSite(s)}>📍 {s}</FilterChip>
          ))}
        </div>
        {/* Prestataire + Category */}
        <div className="flex gap-3 overflow-x-auto pb-0.5 flex-wrap sm:flex-nowrap">
          <div className="flex gap-1.5 overflow-x-auto shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center pr-1 w-12">Prest.</span>
            <FilterChip active={filterPrest === 'all'} onClick={() => setFilterPrest('all')}>Tous</FilterChip>
            {ALL_PREST.map(p => (
              <FilterChip key={p} active={filterPrest === p} onClick={() => setFilterPrest(p)}>👤 {p.split(' ')[0]}</FilterChip>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center pr-1 w-12">Catég.</span>
            <FilterChip active={filterCat === 'all'} onClick={() => setFilterCat('all')}>Tout</FilterChip>
            {ALL_CATS.map(cat => (
              <FilterChip key={cat} active={filterCat === cat} onClick={() => setFilterCat(cat)}>{CATEGORY_ICON[cat]} {CATEGORY_LABEL[cat]}</FilterChip>
            ))}
          </div>
        </div>
      </div>

      {/* ── Kanban ─────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Tableau des interventions {filterEntity !== 'all' ? `— ${filterEntity}` : '(groupe)'}</SectionTitle>
        <KanbanBoard interventions={active} defaultColumn="inprog" />
      </section>

      {/* ── 2-week calendar ────────────────────────────────────────── */}
      <section>
        <SectionTitle>Planning 2 semaines</SectionTitle>
        <TwoWeekCalendar interventions={active} />
      </section>

      {/* ── KPIs ───────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Indicateurs groupe</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <KpiCard label="OEI" value={`${KPI_GROUP.oei}%`} color="bg-indigo-50 border-indigo-100" valueColor="text-indigo-700" />
          <KpiCard label="MTTR (j)" value={`${KPI_GROUP.mttr}`} color="bg-slate-50 border-slate-100" valueColor="text-slate-700" />
          <KpiCard label="En cours" value={`${KPI_GROUP.totalActive}`} color="bg-blue-50 border-blue-100" valueColor="text-blue-700" />
          <KpiCard label="Terminées" value={`${KPI_GROUP.done}`} color="bg-green-50 border-green-100" valueColor="text-green-700" />
          <KpiCard label="Critiques" value={`${KPI_GROUP.criticals}`} color="bg-red-50 border-red-100" valueColor="text-red-700" />
        </div>
      </section>

      {/* ── Budget consolidé ───────────────────────────────────────── */}
      <section>
        <SectionTitle>Budget maintenance — groupe</SectionTitle>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Consolidated bar */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-800">Consolidé groupe</span>
              <span className="text-sm font-bold text-slate-900">
                {Math.round(totalBudget.consumed / totalBudget.allocated * 100)}% consommé
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full bg-blue-600"
                style={{ width: `${Math.min(Math.round(totalBudget.consumed / totalBudget.allocated * 100), 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1.5">
              <span>{(totalBudget.consumed / 1000).toFixed(0)}k / {(totalBudget.allocated / 1000).toFixed(0)}k DT consommés</span>
              <span className="text-green-600 font-medium">{((totalBudget.allocated - totalBudget.consumed) / 1000).toFixed(0)}k restant</span>
            </div>
          </div>

          {/* Per entity table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase">
                  <th className="text-left px-4 py-2">Entité</th>
                  <th className="text-right px-3 py-2">Alloué</th>
                  <th className="text-right px-3 py-2">Consommé</th>
                  <th className="text-right px-3 py-2">Restant</th>
                  <th className="px-3 py-2">%</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(ENTITY_BUDGETS).map(([entity, b]) => {
                  const pct = Math.round(b.consumed / b.allocated * 100);
                  const remain = b.allocated - b.consumed;
                  return (
                    <tr key={entity} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{entity}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{(b.allocated / 1000).toFixed(0)}k</td>
                      <td className="px-3 py-2.5 text-right text-slate-700 font-medium">{(b.consumed / 1000).toFixed(0)}k</td>
                      <td className={`px-3 py-2.5 text-right font-medium ${remain < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {(remain / 1000).toFixed(0)}k
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 min-w-[40px]">
                            <div
                              className={`h-1.5 rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-bold ${pct > 90 ? 'text-red-600' : pct > 70 ? 'text-amber-600' : 'text-slate-500'}`}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Historique ─────────────────────────────────────────────── */}
      <section>
        <button
          onClick={() => setHistoOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <span>📁 Historique — toutes entités</span>
          <span className="flex items-center gap-2">
            <span className="text-xs font-normal text-slate-400">
              {MOCK_INTERVENTIONS.filter(i => HISTORY_STATUSES.includes(i.status)).length} terminées
            </span>
            <span>{histoOpen ? '▲' : '▼'}</span>
          </span>
        </button>

        {histoOpen && (
          <div className="mt-3 space-y-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              {/* Entity filter */}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center w-12">Entité</span>
                <FilterChipSm active={histoEntity === 'all'} onClick={() => setHistoEntity('all')}>Toutes</FilterChipSm>
                {ALL_ENTITIES.map(e => <FilterChipSm key={e} active={histoEntity === e} onClick={() => setHistoEntity(e)}>{e}</FilterChipSm>)}
              </div>
              {/* Site filter */}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center w-12">Site</span>
                <FilterChipSm active={histoSite === 'all'} onClick={() => setHistoSite('all')}>Tous</FilterChipSm>
                {ALL_SITES.slice(0, 6).map(s => <FilterChipSm key={s} active={histoSite === s} onClick={() => setHistoSite(s)}>{s}</FilterChipSm>)}
              </div>
              {/* Prestataire + Category */}
              <div className="flex gap-3 flex-wrap">
                <div className="flex gap-1.5 overflow-x-auto">
                  <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center w-12">Prest.</span>
                  <FilterChipSm active={histoPrest === 'all'} onClick={() => setHistoPrest('all')}>Tous</FilterChipSm>
                  {ALL_PREST.map(p => <FilterChipSm key={p} active={histoPrest === p} onClick={() => setHistoPrest(p)}>{p.split(' ')[0]}</FilterChipSm>)}
                </div>
                <div className="flex gap-1.5 overflow-x-auto">
                  <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center w-12">Catég.</span>
                  <FilterChipSm active={histoCat === 'all'} onClick={() => setHistoCat('all')}>Tout</FilterChipSm>
                  {ALL_CATS.map(cat => <FilterChipSm key={cat} active={histoCat === cat} onClick={() => setHistoCat(cat)}>{CATEGORY_ICON[cat]} {CATEGORY_LABEL[cat]}</FilterChipSm>)}
                </div>
              </div>
            </div>

            {history.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Aucune dans l&apos;historique avec ces filtres</p>
            ) : (
              <div className="space-y-2">
                {history.map(i => <HistoryRow key={i.id} item={i} showEntity />)}
              </div>
            )}
          </div>
        )}
      </section>

      <QuickBarMobile role="dg" />
    </div>
  );
}

