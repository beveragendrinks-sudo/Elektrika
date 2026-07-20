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

// Demo: directeur gérant plusieurs entités
const MY_ENTITIES = ['FAD', 'BTFI'];
const ENTITY_BASE = MOCK_INTERVENTIONS.filter(i => MY_ENTITIES.includes(i.entity));

const BUDGET_PER_ENTITY: Record<string, { allocated: number; consumed: number; committed: number }> = {
  FAD:  { allocated: 180000, consumed: 127500, committed: 28000 },
  BTFI: { allocated: 95000,  consumed: 68000,  committed: 12000 },
};

export default function DirecteurDashboard() {
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterSite,  setFilterSite]  = useState<string>('all');
  const [filterPrest, setFilterPrest] = useState<string>('all');
  const [filterCat,   setFilterCat]   = useState<InterventionCategory | 'all'>('all');
  const [histoOpen,   setHistoOpen]   = useState(false);
  const [histoSite,   setHistoSite]   = useState<string>('all');
  const [histoCat,    setHistoCat]    = useState<InterventionCategory | 'all'>('all');
  const [histoPrest,  setHistoPrest]  = useState<string>('all');

  const entityBase = useMemo(() =>
    filterEntity === 'all' ? ENTITY_BASE : ENTITY_BASE.filter(i => i.entity === filterEntity),
    [filterEntity]);

  const availSites = useMemo(() => Array.from(new Set(entityBase.map(i => i.site))), [entityBase]);
  const availPrest = useMemo(() => Array.from(new Set(entityBase.filter(i => i.prestataire).map(i => i.prestataire!))), [entityBase]);
  const availCats  = useMemo(() => Array.from(new Set(entityBase.map(i => i.category))) as InterventionCategory[], [entityBase]);

  const active = useMemo(() =>
    entityBase.filter(i =>
      ACTIVE_STATUSES.includes(i.status) &&
      (filterSite  === 'all' || i.site === filterSite) &&
      (filterPrest === 'all' || i.prestataire === filterPrest) &&
      (filterCat   === 'all' || i.category === filterCat),
    ), [entityBase, filterSite, filterPrest, filterCat]);

  const history = useMemo(() =>
    entityBase.filter(i =>
      HISTORY_STATUSES.includes(i.status) &&
      (histoSite  === 'all' || i.site === histoSite) &&
      (histoPrest === 'all' || i.prestataire === histoPrest) &&
      (histoCat   === 'all' || i.category === histoCat),
    ), [entityBase, histoSite, histoCat, histoPrest]);

  const budget = useMemo(() => {
    if (filterEntity === 'all') {
      return MY_ENTITIES.reduce(
        (acc, e) => {
          const b = BUDGET_PER_ENTITY[e];
          return { allocated: acc.allocated + b.allocated, consumed: acc.consumed + b.consumed, committed: acc.committed + b.committed };
        },
        { allocated: 0, consumed: 0, committed: 0 }
      );
    }
    return BUDGET_PER_ENTITY[filterEntity] ?? { allocated: 0, consumed: 0, committed: 0 };
  }, [filterEntity]);

  const criticalCount = entityBase.filter(i => i.isCritical && ACTIVE_STATUSES.includes(i.status)).length;
  const toValidate    = entityBase.filter(i => i.status === 'a_valider').length;
  const inProgress    = entityBase.filter(i => i.status === 'en_cours').length;
  const budgetRemain  = budget.allocated - budget.consumed - budget.committed;
  const budgetPct     = Math.round((budget.consumed / budget.allocated) * 100);

  const entityLabel = filterEntity === 'all' ? MY_ENTITIES.join(' + ') : filterEntity;

  function handleEntityChange(entity: string) {
    setFilterEntity(entity);
    setFilterSite('all');
    setFilterPrest('all');
    setFilterCat('all');
  }

  return (
    <div className="px-4 sm:px-6 py-4 pb-28 lg:pb-8 max-w-7xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tableau de bord — {entityLabel}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filterEntity === 'all' ? 'Toutes mes entités' : filterEntity} · Juillet 2026
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-sm text-slate-600">
              <span className="font-bold text-slate-900">{entityBase.filter(i => ACTIVE_STATUSES.includes(i.status)).length}</span> actives
            </span>
            {toValidate > 0 && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                ⏳ {toValidate} à valider
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
          <QuickBarDesktop role="directeur" />
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {/* Entity filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center pr-1">Entité</span>
          <FilterChip active={filterEntity === 'all'} onClick={() => handleEntityChange('all')}>Toutes</FilterChip>
          {MY_ENTITIES.map(e => (
            <FilterChip key={e} active={filterEntity === e} onClick={() => handleEntityChange(e)}>🏭 {e}</FilterChip>
          ))}
        </div>
        {/* Site filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center pr-1">Site</span>
          <FilterChip active={filterSite === 'all'} onClick={() => setFilterSite('all')}>Tous</FilterChip>
          {availSites.map(s => (
            <FilterChip key={s} active={filterSite === s} onClick={() => setFilterSite(s)}>📍 {s}</FilterChip>
          ))}
        </div>
        {/* Prestataire + Category */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 flex-wrap sm:flex-nowrap">
          <div className="flex gap-1.5 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center pr-1">Prest.</span>
            <FilterChip active={filterPrest === 'all'} onClick={() => setFilterPrest('all')}>Tous</FilterChip>
            {availPrest.map(p => (
              <FilterChip key={p} active={filterPrest === p} onClick={() => setFilterPrest(p)}>👤 {p.split(' ')[0]}</FilterChip>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center pr-1">Catég.</span>
            <FilterChip active={filterCat === 'all'} onClick={() => setFilterCat('all')}>Tout</FilterChip>
            {availCats.map(cat => (
              <FilterChip key={cat} active={filterCat === cat} onClick={() => setFilterCat(cat)}>{CATEGORY_ICON[cat]} {CATEGORY_LABEL[cat]}</FilterChip>
            ))}
          </div>
        </div>
      </div>

      {/* ── Kanban ─────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Tableau des interventions</SectionTitle>
        <KanbanBoard interventions={active} defaultColumn="inprog" />
      </section>

      {/* ── 2-week calendar ────────────────────────────────────────── */}
      <section>
        <SectionTitle>Planning 2 semaines</SectionTitle>
        <TwoWeekCalendar interventions={active} />
      </section>

      {/* ── KPIs + Budget ──────────────────────────────────────────── */}
      <section>
        <SectionTitle>KPIs &amp; Budget</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <KpiCard label="En cours"        value={inProgress}    color="bg-blue-50 border-blue-100"   valueColor="text-blue-700"  />
          <KpiCard label="À valider"       value={toValidate}    color="bg-amber-50 border-amber-100" valueColor="text-amber-700" />
          <KpiCard label="Terminées (mois)"value={entityBase.filter(i => i.status === 'terminee').length} color="bg-green-50 border-green-100" valueColor="text-green-700" />
          <KpiCard label="Actives totales" value={entityBase.filter(i => ACTIVE_STATUSES.includes(i.status)).length} color="bg-slate-50 border-slate-100" valueColor="text-slate-700" />
        </div>

        {/* Budget card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-slate-800">Budget maintenance {entityLabel}</div>
            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${budgetPct > 80 ? 'bg-red-100 text-red-700' : budgetPct > 60 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
              {budgetPct}% consommé
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full ${budgetPct > 80 ? 'bg-red-500' : budgetPct > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-base font-bold text-slate-900">{(budget.allocated / 1000).toFixed(0)}k</div>
              <div className="text-[10px] text-slate-400">Alloué</div>
            </div>
            <div>
              <div className="text-base font-bold text-red-600">{(budget.consumed / 1000).toFixed(0)}k</div>
              <div className="text-[10px] text-slate-400">Consommé</div>
            </div>
            <div>
              <div className="text-base font-bold text-green-600">{(budgetRemain / 1000).toFixed(0)}k</div>
              <div className="text-[10px] text-slate-400">Disponible</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Historique ─────────────────────────────────────────────── */}
      <section>
        <button
          onClick={() => setHistoOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <span>📁 Historique des interventions — {entityLabel}</span>
          <span className="flex items-center gap-2">
            <span className="text-xs font-normal text-slate-400">
              {entityBase.filter(i => HISTORY_STATUSES.includes(i.status)).length} terminées
            </span>
            <span>{histoOpen ? '▲' : '▼'}</span>
          </span>
        </button>

        {histoOpen && (
          <div className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center">Site</span>
                <FilterChipSm active={histoSite === 'all'} onClick={() => setHistoSite('all')}>Tous</FilterChipSm>
                {availSites.map(s => <FilterChipSm key={s} active={histoSite === s} onClick={() => setHistoSite(s)}>{s}</FilterChipSm>)}
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 flex-wrap">
                <div className="flex gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center">Prest.</span>
                  <FilterChipSm active={histoPrest === 'all'} onClick={() => setHistoPrest('all')}>Tous</FilterChipSm>
                  {availPrest.map(p => <FilterChipSm key={p} active={histoPrest === p} onClick={() => setHistoPrest(p)}>{p.split(' ')[0]}</FilterChipSm>)}
                </div>
                <div className="flex gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center">Catég.</span>
                  <FilterChipSm active={histoCat === 'all'} onClick={() => setHistoCat('all')}>Tout</FilterChipSm>
                  {availCats.map(cat => <FilterChipSm key={cat} active={histoCat === cat} onClick={() => setHistoCat(cat)}>{CATEGORY_ICON[cat]} {CATEGORY_LABEL[cat]}</FilterChipSm>)}
                </div>
              </div>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Aucune dans l&apos;historique</p>
            ) : (
              <div className="space-y-2">
                {history.map(i => <HistoryRow key={i.id} item={i} showEntity={filterEntity === 'all'} />)}
              </div>
            )}
          </div>
        )}
      </section>

      <QuickBarMobile role="directeur" />
    </div>
  );
}
