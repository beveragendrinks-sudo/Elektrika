'use client';

import { useState } from 'react';
import Link from 'next/link';
import { computeOEI } from '@/lib/kpiEngine';
import { GROUP_NAME, ENTITY_LIST, getSitesForEntity } from '@/lib/entities';

type EntityFilter = 'all' | 'LAD' | 'FAD' | 'BTFI' | '3Ps' | 'K&Ko';

// ── Trend data (6 months Fév–Jul) per entity ──────────────────────────────
const MONTHS = ['Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul'];

const ENTITY_TRENDS: Record<string, { oei: number[]; mttr: number[]; sla: number[]; interventions: number[] }> = {
  LAD:    { oei: [72,74,76,75,77,79], mttr: [38,36,35,33,30,28], sla: [85,87,88,89,90,91], interventions: [18,21,24,26,25,28] },
  FAD:    { oei: [58,60,62,63,64,65], mttr: [50,49,48,47,46,41], sla: [79,80,82,83,83,84], interventions: [12,14,15,16,15,16] },
  BTFI:   { oei: [76,78,80,82,83,85], mttr: [56,55,53,54,52,52], sla: [74,75,76,76,77,78], interventions: [22,24,26,28,30,31] },
  '3Ps':  { oei: [80,82,83,84,85,86], mttr: [26,25,24,23,23,22], sla: [91,92,93,94,94,95], interventions: [8, 9, 9,10,10,10] },
  'K&Ko': { oei: [68,69,70,71,71,72], mttr: [38,37,36,36,35,35], sla: [84,85,86,87,87,88], interventions: [14,15,16,17,17,18] },
};

const ENTITIES = [
  {
    code: 'LAD' as EntityFilter,   site: 'Siège Ben Arous',
    kpi: { utilizationRatePct: 78, sla48CompliancePct: 91, firstTimeFixRatePct: 88, groupingEfficiencyPct: 72 },
    active: 8,  mttr: 28, budget_annuel: 80000,  budget_spent: 28680, budget_committed: 5660,  bcs_pending: 3, satisfaction: 4.3,
  },
  {
    code: 'FAD' as EntityFilter,   site: 'Pôle Industriel Jbel Oust',
    kpi: { utilizationRatePct: 65, sla48CompliancePct: 84, firstTimeFixRatePct: 79, groupingEfficiencyPct: 55 },
    active: 6,  mttr: 41, budget_annuel: 60000,  budget_spent: 37200, budget_committed: 6200,  bcs_pending: 1, satisfaction: 3.9,
  },
  {
    code: 'BTFI' as EntityFilter,  site: 'Sénia Beni Khaled',
    kpi: { utilizationRatePct: 90, sla48CompliancePct: 78, firstTimeFixRatePct: 82, groupingEfficiencyPct: 68 },
    active: 11, mttr: 52, budget_annuel: 120000, budget_spent: 68400, budget_committed: 11400, bcs_pending: 5, satisfaction: 4.0,
  },
  {
    code: '3Ps' as EntityFilter,   site: 'Megrine',
    kpi: { utilizationRatePct: 55, sla48CompliancePct: 95, firstTimeFixRatePct: 93, groupingEfficiencyPct: 80 },
    active: 3,  mttr: 22, budget_annuel: 25000,  budget_spent: 7920,  budget_committed: 1980,  bcs_pending: 0, satisfaction: 4.7,
  },
  {
    code: 'K&Ko' as EntityFilter,  site: 'Carthage',
    kpi: { utilizationRatePct: 70, sla48CompliancePct: 88, firstTimeFixRatePct: 86, groupingEfficiencyPct: 63 },
    active: 5,  mttr: 35, budget_annuel: 45000,  budget_spent: 16800, budget_committed: 4500,  bcs_pending: 2, satisfaction: 4.1,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function oeiColor(v: number)  { return v >= 80 ? 'text-green-600' : v >= 65 ? 'text-amber-600' : 'text-red-600'; }
function mttrColor(v: number) { return v <= 30 ? 'text-green-600' : v <= 48 ? 'text-amber-600' : 'text-red-600'; }
function budgetColor(spent: number, committed: number, total: number) {
  const pct = (spent + committed) / total;
  return pct > 1 ? 'text-red-600' : pct > 0.85 ? 'text-amber-600' : 'text-green-600';
}

// ── Chart components ───────────────────────────────────────────────────────
function SparkBars({ data, inverse = false }: { data: number[]; inverse?: boolean }) {
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range  = maxVal - minVal || 1;
  const lastDelta = data[data.length - 1] - data[data.length - 2];
  const improving = inverse ? lastDelta < 0 : lastDelta > 0;
  return (
    <div className="flex items-end gap-px h-8 w-full">
      {data.map((v, i) => {
        const h = Math.max(((v - minVal) / range) * 100, 10);
        const isLast = i === data.length - 1;
        return (
          <div key={i} className="flex-1 flex items-end">
            <div
              className={`w-full rounded-sm ${isLast ? (improving ? 'bg-green-500' : 'bg-red-400') : 'bg-slate-200'}`}
              style={{ height: `${h}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function TrendBadge({ current, prev, unit, inverse = false }: {
  current: number; prev: number; unit: string; inverse?: boolean;
}) {
  const delta = current - prev;
  const improving = inverse ? delta < 0 : delta > 0;
  if (delta === 0) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span className={`text-xs font-semibold ${improving ? 'text-green-600' : 'text-red-600'}`}>
      {improving ? '▲' : '▼'} {delta > 0 ? '+' : ''}{Math.round(delta * 10) / 10}{unit}
    </span>
  );
}

function MiniBudgetBar({ spent, committed, total }: { spent: number; committed: number; total: number }) {
  const spentPct = Math.min((spent / total) * 100, 100);
  const comPct   = Math.min((committed / total) * 100, Math.max(0, 100 - spentPct));
  const pct      = (spent + committed) / total;
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className="flex h-full">
          <div className="bg-slate-600" style={{ width: `${spentPct}%` }} />
          <div className="bg-blue-300" style={{ width: `${comPct}%` }} />
        </div>
      </div>
      <span className={`text-xs font-semibold w-8 text-right ${pct > 1 ? 'text-red-600' : pct > 0.85 ? 'text-amber-600' : 'text-slate-600'}`}>
        {(pct * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// ── Group monthly evolution chart ──────────────────────────────────────────
function GroupEvolutionChart({ entityCodes }: { entityCodes: string[] }) {
  const [metric, setMetric] = useState<'oei' | 'mttr' | 'sla' | 'interventions'>('oei');
  const inverse = metric === 'mttr';

  const METRIC_LABELS: Record<string, string> = {
    oei:           "OEI — Indice global d'efficacité",
    mttr:          'MTTR — Tps moyen réparation (h)',
    sla:           'SLA 48h — Conformité délai (%)',
    interventions: 'Interventions par mois',
  };

  const allData = MONTHS.map((_, mi) =>
    Math.round((entityCodes.reduce((sum, code) => sum + (ENTITY_TRENDS[code]?.[metric]?.[mi] ?? 0), 0) / entityCodes.length) * 10) / 10
  );

  const maxVal   = Math.max(...allData);
  const minVal   = Math.min(...allData);
  const range    = maxVal - minVal || 1;
  const lastDelta = allData[5] - allData[4];
  const ytdAvg  = Math.round((allData.reduce((s, v) => s + v, 0) / allData.length) * 10) / 10;
  const improving = inverse ? lastDelta < 0 : lastDelta > 0;
  const unitLabel = metric === 'mttr' ? 'h' : metric === 'interventions' ? '' : metric === 'oei' ? '' : '%';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="font-semibold text-slate-900">Évolution mensuelle — Fév–Jul 2026</div>
          <div className="text-xs text-slate-400 mt-0.5">{entityCodes.length > 1 ? 'Moyenne groupe' : entityCodes[0]}</div>
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['oei', 'mttr', 'sla', 'interventions'] as const).map(k => (
            <button key={k} onClick={() => setMetric(k)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${metric === k ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-500 hover:border-slate-400'}`}>
              {k === 'oei' ? 'OEI' : k === 'mttr' ? 'MTTR' : k === 'sla' ? 'SLA 48h' : 'Interventions'}
            </button>
          ))}
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-3" style={{ height: '110px' }}>
        {allData.map((v, i) => {
          const h = Math.max(((v - minVal) / range) * 80, 4);
          const isLast = i === allData.length - 1;
          const barColor = isLast ? (improving ? 'bg-green-500' : 'bg-red-400') : 'bg-slate-200';
          return (
            <div key={i} className="flex-1 flex flex-col items-center">
              <span className="text-xs text-slate-600 font-medium mb-1">{v}</span>
              <div className="w-full flex-1 flex items-end">
                <div className={`w-full rounded-t-sm transition-all ${barColor}`} style={{ height: `${h}px` }} />
              </div>
              <span className="text-xs text-slate-400 mt-1">{MONTHS[i]}</span>
            </div>
          );
        })}
      </div>

      {/* Target line annotation */}
      {metric === 'mttr' && (
        <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 bg-amber-400" />
          Cible groupe ≤ 48h
        </div>
      )}
      {metric === 'sla' && (
        <div className="mt-2 text-xs text-blue-500 flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 bg-blue-400" />
          Plancher groupe ≥ 85%
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <span className="text-xs text-slate-500">{METRIC_LABELS[metric]}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">Moy. YTD : <strong className="text-slate-700">{ytdAvg}{unitLabel}</strong></span>
          <span className={`text-xs font-semibold ${improving ? 'text-green-600' : 'text-red-600'}`}>
            {improving ? '▲' : '▼'} {lastDelta > 0 ? '+' : ''}{Math.round(lastDelta * 10) / 10}{unitLabel} vs M-1
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function DGDashboard() {
  const [filter, setFilter] = useState<EntityFilter>('all');

  const visible      = filter === 'all' ? ENTITIES : ENTITIES.filter(e => e.code === filter);
  const visibleCodes = visible.map(e => e.code as string);

  const totalBudget     = visible.reduce((s, e) => s + e.budget_annuel, 0);
  const totalSpent      = visible.reduce((s, e) => s + e.budget_spent, 0);
  const totalCommitted  = visible.reduce((s, e) => s + e.budget_committed, 0);
  const totalActive     = visible.reduce((s, e) => s + e.active, 0);
  const totalBcsPend    = visible.reduce((s, e) => s + e.bcs_pending, 0);
  const avgSatisfaction = (visible.reduce((s, e) => s + e.satisfaction, 0) / visible.length).toFixed(1);
  const groupOEI = computeOEI({
    utilizationRatePct:    visible.reduce((s, e) => s + e.kpi.utilizationRatePct, 0) / visible.length,
    sla48CompliancePct:    visible.reduce((s, e) => s + e.kpi.sla48CompliancePct, 0) / visible.length,
    firstTimeFixRatePct:   visible.reduce((s, e) => s + e.kpi.firstTimeFixRatePct, 0) / visible.length,
    groupingEfficiencyPct: visible.reduce((s, e) => s + e.kpi.groupingEfficiencyPct, 0) / visible.length,
  });

  // OEI group trend
  const oeiGroupTrend = MONTHS.map((_, mi) =>
    Math.round((visibleCodes.reduce((s, c) => s + (ENTITY_TRENDS[c]?.oei?.[mi] ?? 0), 0) / visibleCodes.length) * 10) / 10
  );
  const oeiDelta = Math.round((oeiGroupTrend[5] - oeiGroupTrend[4]) * 10) / 10;
  const oeiYTD   = Math.round((oeiGroupTrend.reduce((s, v) => s + v, 0) / oeiGroupTrend.length) * 10) / 10;

  return (
    <div className="space-y-2">

      {/* Header */}
      <div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{GROUP_NAME}</div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord — Direction Générale</h1>
        <p className="text-slate-500 mt-0.5">
          Juillet 2026 · {filter === 'all'
            ? `${ENTITY_LIST.length} entités consolidées`
            : (() => {
              const e = ENTITY_LIST.find(x => x.code === filter);
              if (!e) return filter;
              const sites = getSitesForEntity(e.code).map(s => `${s.label}, ${s.city}`).join(' · ');
              return `Entité ${e.code} — ${e.name} · ${sites}`;
            })()
          }
        </p>
      </div>

      {/* Mes cadrans */}
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Mes cadrans</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/demandes"
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors">
          <span className="text-xl">⚠️</span>
          <div>
            <div className="text-lg font-bold text-amber-900">5</div>
            <div className="text-xs text-amber-700 font-medium">Demandes à valider</div>
          </div>
        </Link>
        <Link href="/bons-de-commande"
          className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 hover:bg-orange-100 transition-colors">
          <span className="text-xl">📋</span>
          <div>
            <div className="text-lg font-bold text-orange-900">{totalBcsPend}</div>
            <div className="text-xs text-orange-700 font-medium">BCs à valider</div>
          </div>
        </Link>
        <Link href="/kpi"
          className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 hover:bg-blue-100 transition-colors">
          <span className="text-xl">📊</span>
          <div>
            <div className="text-lg font-bold text-blue-900">{groupOEI.toFixed(1)}</div>
            <div className="text-xs text-blue-700 font-medium">OEI Groupe</div>
          </div>
        </Link>
        <Link href="/demandes/new"
          className="flex items-center gap-3 bg-slate-900 rounded-xl px-4 py-3 hover:bg-slate-700 transition-colors">
          <span className="text-xl">➕</span>
          <div>
            <div className="text-sm font-bold text-white">Nouvelle demande</div>
            <div className="text-xs text-slate-400">Créer une intervention</div>
          </div>
        </Link>
      </div>

      {/* Filtre entité */}
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setFilter('all')}
          className={`text-sm px-4 py-2 rounded-lg border transition-all ${filter === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
          Toutes les entités
        </button>
        {ENTITY_LIST.map(e => (
          <button key={e.code} onClick={() => setFilter(e.code as EntityFilter)}
            className={`text-left px-3 py-2 rounded-lg border transition-all ${filter === e.code ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
            <div className="text-sm font-semibold leading-tight">{e.code}</div>
            <div className={`text-xs leading-tight ${filter === e.code ? 'text-slate-400' : 'text-slate-400'}`}>
              {(() => { const ss = getSitesForEntity(e.code); return ss.length ? `${ss[0].label}, ${ss[0].city}` : '—'; })()}
              {getSitesForEntity(e.code).length > 1 && <span className="ml-1 opacity-60">+{getSitesForEntity(e.code).length - 1}</span>}
            </div>
          </button>
        ))}
      </div>

      {/* OEI groupe */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start justify-between gap-4 mt-2">
        <div className="flex-1">
          <div className="text-xs font-black text-blue-400 uppercase tracking-widest">OEI</div>
          <div className="font-bold text-blue-900">Overall Efficiency Index — Indice Global d&apos;Efficacité</div>
          <div className="text-xs text-blue-500 mt-1">30% productivité · 25% SLA (délai 48h) · 25% qualité 1er passage · 20% optimisation groupage</div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <span className={`text-xs font-semibold ${oeiDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {oeiDelta >= 0 ? '▲' : '▼'} {oeiDelta >= 0 ? '+' : ''}{oeiDelta} vs M-1
            </span>
            <span className="text-xs text-blue-400">Moy. YTD : <strong>{oeiYTD}</strong></span>
            <span className="text-xs text-blue-400">{filter === 'all' ? 'Groupe (moyenne)' : filter}</span>
          </div>
          <div className="w-full max-w-xs mt-2">
            <SparkBars data={oeiGroupTrend} />
            <div className="flex justify-between text-xs text-blue-300 mt-0.5">
              {MONTHS.map(m => <span key={m}>{m}</span>)}
            </div>
          </div>
        </div>
        <div className={`text-5xl font-black shrink-0 ${oeiColor(groupOEI)}`}>{groupOEI.toFixed(1)}</div>
      </div>

      {/* KPIs consolidés */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">Demandes actives</div>
          <div className="text-3xl font-bold text-slate-900">{totalActive}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-0.5">Budget annuel consolidé</div>
          <div className="text-lg font-bold text-slate-900">{totalBudget.toLocaleString('fr-TN')} TND</div>
          <div className={`text-sm font-semibold ${budgetColor(totalSpent, totalCommitted, totalBudget)}`}>
            {((totalSpent + totalCommitted) / totalBudget * 100).toFixed(0)}% consommé / engagé
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">BCs en attente validation</div>
          <div className={`text-3xl font-bold ${totalBcsPend > 0 ? 'text-amber-600' : 'text-green-600'}`}>{totalBcsPend}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">Satisfaction moyenne</div>
          <div className="text-2xl font-bold text-green-600">★ {avgSatisfaction}<span className="text-sm font-normal text-slate-400"> / 5</span></div>
        </div>
      </div>

      {/* Budget consolidé */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-slate-900">Budget maintenance 2026 — {filter === 'all' ? 'Groupe' : filter}</div>
            <div className="text-xs text-slate-400 mt-0.5">Alloué par les directeurs d&apos;entité · Suivi BCs</div>
          </div>
          <div className={`text-lg font-bold ${budgetColor(totalSpent, totalCommitted, totalBudget)}`}>
            {((totalSpent + totalCommitted) / totalBudget * 100).toFixed(0)}%
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
          <div className="flex h-full">
            <div className="bg-slate-700 transition-all" style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }} />
            <div className="bg-blue-300 transition-all" style={{ width: `${Math.min((totalCommitted / totalBudget) * 100, Math.max(0, 100 - (totalSpent / totalBudget) * 100))}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs text-center">
          {[
            { dot: 'bg-slate-200', label: 'Alloué',  val: totalBudget },
            { dot: 'bg-slate-700', label: 'Dépensé', val: totalSpent },
            { dot: 'bg-blue-300',  label: 'Engagé',  val: totalCommitted },
            { dot: 'bg-slate-100', label: 'Reste',   val: Math.max(0, totalBudget - totalSpent - totalCommitted) },
          ].map(({ dot, label, val }) => (
            <div key={label}>
              <div className={`w-2.5 h-2.5 rounded-full ${dot} border border-slate-200 mx-auto mb-0.5`} />
              <div className="text-slate-500">{label}</div>
              <div className="font-bold text-slate-800">{val.toLocaleString('fr-TN')} TND</div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly evolution chart */}
      <GroupEvolutionChart entityCodes={visibleCodes} />

      {/* Comparatif par entité */}
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mt-4 mb-1">Comparatif par entité</h2>
      <p className="text-xs text-slate-400 mb-3">
        Barres grises = tendance 6 mois (Fév–Jul) · Barre colorée = mois en cours · ▲▼ = variation vs mois précédent
      </p>
      <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase">
              <th className="text-left px-5 py-3 font-semibold">Entité</th>
              <th className="px-4 py-3 font-semibold">
                <div>OEI</div><div className="font-normal normal-case text-slate-400">Eff. globale</div>
              </th>
              <th className="px-4 py-3 font-semibold">
                <div>MTTR</div><div className="font-normal normal-case text-slate-400">Tps réparation</div>
              </th>
              <th className="px-4 py-3 font-semibold">
                <div>SLA 48h</div><div className="font-normal normal-case text-slate-400">Délai traitement</div>
              </th>
              <th className="px-4 py-3 font-semibold">
                <div>Budget 2026</div><div className="font-normal normal-case text-slate-400">Consommé / Alloué</div>
              </th>
              <th className="text-right px-4 py-3 font-semibold">★</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ENTITIES.map((e) => {
              const oei     = computeOEI(e.kpi);
              const trends  = ENTITY_TRENDS[e.code as string];
              const oeiPrev = trends.oei[4];
              return (
                <tr key={e.code} className={filter !== 'all' && filter !== e.code ? 'opacity-20' : 'hover:bg-slate-50'}>
                  <td className="px-5 py-3">
                    {(() => { const def = ENTITY_LIST.find(x => x.code === e.code); return (
                      <>
                        <div className="font-semibold text-slate-900">{e.code} <span className="font-normal text-slate-500 text-xs">{def?.name}</span></div>
                        <div className="text-xs text-slate-400">
                          {(() => { const ss = getSitesForEntity(e.code); return ss.length ? `${ss[0].label}, ${ss[0].city}` : '—'; })()}
                          {(() => { const n = getSitesForEntity(e.code).length; return n > 1 ? <span className="ml-1 text-slate-300">· +{n - 1} site{n > 2 ? 's' : ''}</span> : null; })()}
                        </div>
                      </>
                    ); })()}
                  </td>
                  <td className="px-4 py-3">
                    <div className={`font-bold ${oeiColor(oei)}`}>{oei.toFixed(1)}</div>
                    <div className="w-20 mt-1"><SparkBars data={trends.oei} /></div>
                    <TrendBadge current={oei} prev={oeiPrev} unit="" />
                  </td>
                  <td className="px-4 py-3">
                    <div className={`font-bold ${mttrColor(e.mttr)}`}>{e.mttr}h</div>
                    <div className="w-20 mt-1"><SparkBars data={trends.mttr} inverse /></div>
                    <TrendBadge current={e.mttr} prev={trends.mttr[4]} unit="h" inverse />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-700">{e.kpi.sla48CompliancePct}%</div>
                    <div className="w-20 mt-1"><SparkBars data={trends.sla} /></div>
                    <TrendBadge current={e.kpi.sla48CompliancePct} prev={trends.sla[4]} unit="%" />
                  </td>
                  <td className="px-4 py-3">
                    <MiniBudgetBar spent={e.budget_spent} committed={e.budget_committed} total={e.budget_annuel} />
                    <div className="text-xs text-slate-400 mt-0.5">
                      {(e.budget_spent + e.budget_committed).toLocaleString('fr-TN')} / {e.budget_annuel.toLocaleString('fr-TN')} TND
                    </div>
                  </td>
                  <td className="text-right px-4 py-3 text-green-600 font-medium">★ {e.satisfaction}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Points d'attention */}
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mt-4 mb-3">Points d&apos;attention</h2>
      <div className="space-y-2">
        {ENTITIES.filter(e => e.mttr > 48 && (filter === 'all' || filter === e.code)).map(e => (
          <div key={e.code} className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-red-800"><span className="font-semibold">{e.code}</span> — MTTR {e.mttr}h dépasse la cible (≤ 48h)</div>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">MTTR élevé</span>
          </div>
        ))}
        {ENTITIES.filter(e => (e.budget_spent + e.budget_committed) > e.budget_annuel && (filter === 'all' || filter === e.code)).map(e => (
          <div key={e.code + 'b'} className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-red-800"><span className="font-semibold">{e.code}</span> — Budget dépassé : {(e.budget_spent + e.budget_committed).toLocaleString('fr-TN')} / {e.budget_annuel.toLocaleString('fr-TN')} TND</div>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">Dépassement</span>
          </div>
        ))}
        {ENTITIES.filter(e => (e.budget_spent + e.budget_committed) / e.budget_annuel > 0.85 && (e.budget_spent + e.budget_committed) <= e.budget_annuel && (filter === 'all' || filter === e.code)).map(e => (
          <div key={e.code + 'w'} className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-amber-800"><span className="font-semibold">{e.code}</span> — Budget à {(((e.budget_spent + e.budget_committed) / e.budget_annuel) * 100).toFixed(0)}% · moins de 15% restant</div>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">Budget proche</span>
          </div>
        ))}
        {visible.every(e => e.mttr <= 48 && (e.budget_spent + e.budget_committed) <= e.budget_annuel * 0.85) && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <div className="text-sm text-green-800 font-medium">✓ Aucun point d&apos;attention — tous les indicateurs sont dans les normes</div>
          </div>
        )}
      </div>
    </div>
  );
}
