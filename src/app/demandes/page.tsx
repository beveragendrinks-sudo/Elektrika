'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  MOCK_INTERVENTIONS,
  ACTIVE_STATUSES,
  HISTORY_STATUSES,
  CATEGORY_LABEL,
  CATEGORY_ICON,
  type InterventionCategory,
} from '@/lib/interventionData';
import KanbanBoard from '@/components/KanbanBoard';
import { HistoryRow } from '@/components/DashboardShared';

const ELECTRICIEN_NAME = 'Mohamed Salah';

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap ${
        active
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
      }`}
    >
      {children}
    </button>
  );
}

function DemandesContent() {
  const searchParams   = useSearchParams();
  const showHistory    = searchParams.get('status') === 'termine';

  const [userRole, setUserRole]         = useState<string>('');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterCat, setFilterCat]       = useState<InterventionCategory | 'all'>('all');
  const [filterPrest, setFilterPrest]   = useState<string>('all');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('fm_session');
      if (raw) setUserRole(JSON.parse(raw).role ?? '');
    } catch { /* localStorage unavailable */ }
  }, []);

  // Reset filters when switching between kanban and history
  useEffect(() => {
    setFilterEntity('all');
    setFilterCat('all');
    setFilterPrest('all');
  }, [showHistory]);

  const isElectricien = userRole === 'electricien';

  // ── Kanban data ───────────────────────────────────────────────────
  const kanbanBase = useMemo(() => {
    const active = MOCK_INTERVENTIONS.filter(i => ACTIVE_STATUSES.includes(i.status));
    return isElectricien ? active.filter(i => i.prestataire === ELECTRICIEN_NAME) : active;
  }, [isElectricien]);

  const kanbanEntities = useMemo(() => Array.from(new Set(kanbanBase.map(i => i.entity))).sort(), [kanbanBase]);
  const kanbanCats     = useMemo(() => Array.from(new Set(kanbanBase.map(i => i.category))) as InterventionCategory[], [kanbanBase]);

  const kanbanItems = useMemo(() =>
    kanbanBase.filter(i =>
      (filterEntity === 'all' || i.entity === filterEntity) &&
      (filterCat    === 'all' || i.category === filterCat),
    ), [kanbanBase, filterEntity, filterCat]);

  // ── History data ──────────────────────────────────────────────────
  const historyBase = useMemo(() => {
    const closed = MOCK_INTERVENTIONS.filter(i => HISTORY_STATUSES.includes(i.status));
    return isElectricien ? closed.filter(i => i.prestataire === ELECTRICIEN_NAME) : closed;
  }, [isElectricien]);

  const historyEntities = useMemo(() => Array.from(new Set(historyBase.map(i => i.entity))).sort(), [historyBase]);
  const historyCats     = useMemo(() => Array.from(new Set(historyBase.map(i => i.category))) as InterventionCategory[], [historyBase]);
  const historyPrests   = useMemo(() => Array.from(new Set(historyBase.filter(i => i.prestataire).map(i => i.prestataire!))), [historyBase]);

  const historyItems = useMemo(() =>
    historyBase.filter(i =>
      (filterEntity === 'all' || i.entity === filterEntity) &&
      (filterCat    === 'all' || i.category === filterCat) &&
      (filterPrest  === 'all' || i.prestataire === filterPrest),
    ), [historyBase, filterEntity, filterCat, filterPrest]);

  const newDemandeHref  = isElectricien ? '/demandes/new?as=prestataire' : '/demandes/new';
  const newDemandeLabel = isElectricien ? '+ Signaler' : '+ Nouvelle demande';

  // ── History view ──────────────────────────────────────────────────
  if (showHistory) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/demandes" className="text-sm text-slate-400 hover:text-slate-700 transition-colors">
                ← Interventions actives
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Historique</h1>
            <p className="text-slate-500 mt-1 text-sm">
              <span className="font-medium">{historyItems.length}</span> intervention{historyItems.length !== 1 ? 's' : ''} close{historyItems.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          {!isElectricien && historyEntities.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center pr-1">Entité</span>
              <FilterChip active={filterEntity === 'all'} onClick={() => setFilterEntity('all')}>Toutes</FilterChip>
              {historyEntities.map(e => (
                <FilterChip key={e} active={filterEntity === e} onClick={() => setFilterEntity(e)}>🏭 {e}</FilterChip>
              ))}
            </div>
          )}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 flex-wrap sm:flex-nowrap">
            <div className="flex gap-1.5 overflow-x-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center pr-1">Catég.</span>
              <FilterChip active={filterCat === 'all'} onClick={() => setFilterCat('all')}>Tout</FilterChip>
              {historyCats.map(cat => (
                <FilterChip key={cat} active={filterCat === cat} onClick={() => setFilterCat(cat)}>
                  {CATEGORY_ICON[cat]} {CATEGORY_LABEL[cat]}
                </FilterChip>
              ))}
            </div>
            {historyPrests.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center pr-1">Prest.</span>
                <FilterChip active={filterPrest === 'all'} onClick={() => setFilterPrest('all')}>Tous</FilterChip>
                {historyPrests.map(p => (
                  <FilterChip key={p} active={filterPrest === p} onClick={() => setFilterPrest(p)}>
                    👤 {p.split(' ')[0]}
                  </FilterChip>
                ))}
              </div>
            )}
          </div>
        </div>

        {historyItems.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">Aucune intervention dans l&apos;historique</div>
        ) : (
          <div className="space-y-2">
            {historyItems.map(i => (
              <HistoryRow key={i.id} item={i} variant="full" showEntity={filterEntity === 'all' && !isElectricien} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Kanban view ───────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Demandes d&apos;intervention</h1>
          <p className="text-slate-500 mt-1 text-sm">
            <span className="font-medium">{kanbanItems.length}</span> intervention{kanbanItems.length !== 1 ? 's' : ''} active{kanbanItems.length !== 1 ? 's' : ''}
            {filterEntity !== 'all' && <> · {filterEntity}</>}
            {filterCat !== 'all' && <> · {CATEGORY_LABEL[filterCat]}</>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/demandes?status=termine"
            className="text-sm text-slate-500 border border-slate-200 px-3 py-2 rounded-xl hover:border-slate-400 transition-colors"
          >
            🕐 Historique
          </Link>
          <Link
            href={newDemandeHref}
            className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors"
          >
            {newDemandeLabel}
          </Link>
        </div>
      </div>

      <div className="space-y-2">
        {!isElectricien && kanbanEntities.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center pr-1">Entité</span>
            <FilterChip active={filterEntity === 'all'} onClick={() => setFilterEntity('all')}>Toutes</FilterChip>
            {kanbanEntities.map(e => (
              <FilterChip key={e} active={filterEntity === e} onClick={() => setFilterEntity(e)}>🏭 {e}</FilterChip>
            ))}
          </div>
        )}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 self-center pr-1">Catég.</span>
          <FilterChip active={filterCat === 'all'} onClick={() => setFilterCat('all')}>Tout</FilterChip>
          {kanbanCats.map(cat => (
            <FilterChip key={cat} active={filterCat === cat} onClick={() => setFilterCat(cat)}>
              {CATEGORY_ICON[cat]} {CATEGORY_LABEL[cat]}
            </FilterChip>
          ))}
        </div>
      </div>

      <KanbanBoard interventions={kanbanItems} />
    </div>
  );
}

export default function DemandesPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-slate-400">Chargement…</div>}>
      <DemandesContent />
    </Suspense>
  );
}
