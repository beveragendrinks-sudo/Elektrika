'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { computeOEI } from '@/lib/kpiEngine';
import { INTERVENTION_CATEGORIES } from '@/lib/interventionTypes';
import type { InterventionCategory } from '@/types';
import FilterBar from '@/components/FilterBar';
import type { ActiveCategories, ActiveTypes } from '@/components/FilterBar';
import { computeAllVendorKPIs, type VendorKPI } from '@/lib/quoteData';
import { CATEGORY_LABEL, CATEGORY_ICON } from '@/lib/interventionData';

// ── Trend data (6 months Fév–Jul) ─────────────────────────────────────────
const MONTHS = ['Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul'];

const TREND = {
  mttr:          [42, 38, 35, 33, 32, 31],
  sla48:         [80, 82, 84, 85, 85, 87],
  first_fix:     [84, 86, 87, 88, 90, 91],
  grouping:      [60, 62, 63, 65, 66, 67],
  interventions: [22, 24, 26, 28, 25, 28],
  bc_delay:      [5.1, 4.8, 4.2, 3.9, 3.5, 3.2],
  satisfaction:  [3.9, 4.0, 4.1, 4.1, 4.1, 4.2],
};

const ANNUAL_BUDGET = { allocated: 250000, spent: 115880, committed: 28400 };

const MOCK_COMPONENTS = {
  utilizationRatePct:    78,
  sla48CompliancePct:    TREND.sla48[5],
  firstTimeFixRatePct:   TREND.first_fix[5],
  groupingEfficiencyPct: TREND.grouping[5],
};

// ── Per-category KPI data ──────────────────────────────────────────────────
interface CategoryKpiData {
  mttr: number;
  sla48: number;
  firstFix: number;
  count: number;
  utilization: number;
  monthly: number[];
}

const CATEGORY_KPIS: Record<InterventionCategory, CategoryKpiData> = {
  electricite:   { mttr: 31, sla48: 87, firstFix: 91, count: 48, utilization: 82, monthly: [14,15,16,17,16,18] },
  plomberie:     { mttr: 22, sla48: 94, firstFix: 92, count: 18, utilization: 65, monthly: [3,4,4,4,3,4] },
  climatisation: { mttr: 45, sla48: 82, firstFix: 78, count: 12, utilization: 55, monthly: [2,2,2,3,2,2] },
  maconnerie:    { mttr: 72, sla48: 75, firstFix: 70, count: 6,  utilization: 45, monthly: [1,1,1,1,1,1] },
  peinture:      { mttr: 28, sla48: 96, firstFix: 95, count: 8,  utilization: 38, monthly: [1,1,1,2,1,2] },
  menuiserie:    { mttr: 18, sla48: 97, firstFix: 94, count: 6,  utilization: 42, monthly: [1,1,1,1,1,1] },
  autres:        { mttr: 35, sla48: 85, firstFix: 80, count: 6,  utilization: 40, monthly: [1,1,1,1,1,1] },
};

// ── Per-type KPI data ──────────────────────────────────────────────────────
interface TypeKpiData {
  mttr: number;
  sla48: number;
  firstFix: number;
  count: number;
  monthly: number[];
}

const TYPE_KPIS: Record<1 | 2 | 3, TypeKpiData> = {
  1: { mttr: 12, sla48: 95, firstFix: 92, count: 42, monthly: [10,11,11,12,11,12] },
  2: { mttr: 32, sla48: 87, firstFix: 85, count: 38, monthly: [8,9,10,11,9,11] },
  3: { mttr: 72, sla48: 74, firstFix: 72, count: 24, monthly: [4,4,5,5,5,5] },
};

// ── Filtered metrics computation ───────────────────────────────────────────
interface FilteredMetrics {
  mttr: number;
  sla48: number;
  firstFix: number;
  count: number;
  utilization: number;
  monthly: number[];
  mttrTrend: number[];
  sla48Trend: number[];
  firstFixTrend: number[];
}

function weightedAvg(items: { value: number; weight: number }[]): number {
  const total = items.reduce((s, i) => s + i.weight, 0);
  if (total === 0) return 0;
  return Math.round(items.reduce((s, i) => s + i.value * i.weight, 0) / total);
}

function sumMonthlyArrays(arrays: number[][]): number[] {
  if (arrays.length === 0) return [0, 0, 0, 0, 0, 0];
  return arrays.reduce((acc, arr) => acc.map((v, i) => v + arr[i]), [0, 0, 0, 0, 0, 0]);
}

function makeDecliningTrend(end: number, totalDrop: number): number[] {
  return MONTHS.map((_, i) => Math.round(end + ((MONTHS.length - 1 - i) / (MONTHS.length - 1)) * totalDrop));
}

function makeRisingTrend(end: number, totalRise: number): number[] {
  return MONTHS.map((_, i) => Math.round(end - ((MONTHS.length - 1 - i) / (MONTHS.length - 1)) * totalRise));
}

function computeFiltered(cats: ActiveCategories, types: ActiveTypes): FilteredMetrics | null {
  if (cats.length === 0 && types.length === 0) return null;

  if (cats.length === 0) {
    // Type filter only
    const items = types.map(t => TYPE_KPIS[t]);
    const total = items.reduce((s, k) => s + k.count, 0);
    const mttr = weightedAvg(items.map(k => ({ value: k.mttr, weight: k.count })));
    const sla48 = weightedAvg(items.map(k => ({ value: k.sla48, weight: k.count })));
    const firstFix = weightedAvg(items.map(k => ({ value: k.firstFix, weight: k.count })));
    const monthly = sumMonthlyArrays(items.map(k => k.monthly));
    return {
      mttr, sla48, firstFix, count: total, utilization: MOCK_COMPONENTS.utilizationRatePct, monthly,
      mttrTrend: makeDecliningTrend(mttr, Math.round(mttr * 0.25)),
      sla48Trend: makeRisingTrend(sla48, Math.round(sla48 * 0.07)),
      firstFixTrend: makeRisingTrend(firstFix, Math.round(firstFix * 0.07)),
    };
  }

  // Category filter (with optional type filter)
  const catItems = cats.map(c => CATEGORY_KPIS[c]);
  const totalCatCount = catItems.reduce((s, k) => s + k.count, 0);
  const mttr = weightedAvg(catItems.map(k => ({ value: k.mttr, weight: k.count })));
  const sla48 = weightedAvg(catItems.map(k => ({ value: k.sla48, weight: k.count })));
  const firstFix = weightedAvg(catItems.map(k => ({ value: k.firstFix, weight: k.count })));
  const utilization = weightedAvg(catItems.map(k => ({ value: k.utilization, weight: k.count })));
  let monthly = sumMonthlyArrays(catItems.map(k => k.monthly));

  let count = totalCatCount;
  if (types.length > 0) {
    const allTypeCount = Object.values(TYPE_KPIS).reduce((s, k) => s + k.count, 0);
    const selTypeCount = types.reduce((s, t) => s + TYPE_KPIS[t].count, 0);
    const ratio = selTypeCount / allTypeCount;
    count = Math.round(totalCatCount * ratio);
    monthly = monthly.map(v => Math.round(v * ratio));
  }

  return {
    mttr, sla48, firstFix, count, utilization, monthly,
    mttrTrend: makeDecliningTrend(mttr, Math.round(mttr * 0.25)),
    sla48Trend: makeRisingTrend(sla48, Math.round(sla48 * 0.07)),
    firstFixTrend: makeRisingTrend(firstFix, Math.round(firstFix * 0.07)),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────
const oei = computeOEI(MOCK_COMPONENTS);

function ytdAvg(arr: number[]) {
  return Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;
}

// ── Chart components ───────────────────────────────────────────────────────
function SparkBars({ data, inverse = false }: { data: number[]; inverse?: boolean }) {
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range  = maxVal - minVal || 1;
  const lastDelta = data[data.length - 1] - data[data.length - 2];
  const improving = inverse ? lastDelta < 0 : lastDelta > 0;
  return (
    <div className="flex items-end gap-px h-10 w-full">
      {data.map((v, i) => {
        const h = Math.max(((v - minVal) / range) * 100, 8);
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
  if (delta === 0) return <span className="text-xs text-slate-400">= M-1</span>;
  const sign = delta > 0 ? '+' : '';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${improving ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {improving ? '▲' : '▼'} {sign}{Math.round(delta * 10) / 10}{unit} vs M-1
    </span>
  );
}

function TargetLine({ value, target, unit, inverse = false }: {
  value: number; target: number; unit: string; inverse?: boolean;
}) {
  const achieved = inverse ? value <= target : value >= target;
  const pct = inverse ? Math.min((target / value) * 100, 100) : Math.min((value / target) * 100, 100);
  const delta = Math.abs(value - target);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">Objectif : {inverse ? '≤' : '≥'} {target}{unit}</span>
        <span className={`text-xs font-semibold ${achieved ? 'text-green-600' : 'text-amber-600'}`}>
          {achieved ? `✓ Atteint (+${delta}${unit})` : `⚠ Écart −${delta}${unit}`}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${achieved ? 'bg-green-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Rich KPI card ──────────────────────────────────────────────────────────
function TrendKpiCard({
  acronym, label, current, prev, ytd, unit, target, targetLabel, months, inverse = false,
}: {
  acronym?: string; label: string;
  current: number; prev: number; ytd: number; unit: string; target: number;
  targetLabel?: string; months: number[]; inverse?: boolean;
}) {
  const achieved = inverse ? current <= target : current >= target;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
      <div>
        {acronym && <div className="text-xs font-black text-slate-400 uppercase tracking-widest">{acronym}</div>}
        <div className="text-xs text-slate-500 leading-tight">{label}</div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className={`text-3xl font-bold ${achieved ? 'text-green-600' : 'text-amber-600'}`}>
            {current}<span className="text-base font-normal ml-0.5 text-slate-400">{unit}</span>
          </div>
          <div className="mt-1">
            <TrendBadge current={current} prev={prev} unit={unit} inverse={inverse} />
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-slate-400">Moy. YTD</div>
          <div className="text-sm font-semibold text-slate-700">{ytd}{unit}</div>
        </div>
      </div>
      <SparkBars data={months} inverse={inverse} />
      <div className="flex justify-between text-xs text-slate-300 -mt-1">
        {MONTHS.map(m => <span key={m}>{m}</span>)}
      </div>
      <TargetLine value={current} target={target} unit={unit} inverse={inverse} />
      {targetLabel && <div className="text-xs text-slate-400 -mt-2">{targetLabel}</div>}
    </div>
  );
}

// ── Monthly bar chart ──────────────────────────────────────────────────────
function MonthlyBarChart({ data }: { data: number[] }) {
  const max  = Math.max(...data);
  const ytd  = ytdAvg(data);
  const delta = data[5] - data[4];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-semibold text-slate-900">Interventions mensuelles</div>
          <div className="text-xs text-slate-400 mt-0.5">Demandes clôturées par mois</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Moy. YTD</div>
          <div className="text-lg font-bold text-slate-800">{ytd}</div>
        </div>
      </div>
      <div className="flex items-end gap-3" style={{ height: '100px' }}>
        {data.map((v, i) => {
          const h = Math.max((v / max) * 80, 4);
          const isLast = i === data.length - 1;
          const improving = delta >= 0;
          const barColor = isLast ? (improving ? 'bg-green-500' : 'bg-red-400') : 'bg-slate-200';
          return (
            <div key={i} className="flex-1 flex flex-col items-center">
              <span className="text-xs text-slate-600 font-medium mb-1">{v}</span>
              <div className="w-full flex-1 flex items-end">
                <div className={`w-full rounded-t-sm ${barColor}`} style={{ height: `${h}px` }} />
              </div>
              <span className="text-xs text-slate-400 mt-1">{MONTHS[i]}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <span className="text-xs text-slate-500">Interventions clôturées</span>
        <span className={`text-xs font-semibold ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {delta >= 0 ? '▲' : '▼'} {delta >= 0 ? '+' : ''}{delta} vs M-1
        </span>
      </div>
    </div>
  );
}

// ── Budget bar ─────────────────────────────────────────────────────────────
function BudgetBar({ allocated, spent, committed }: { allocated: number; spent: number; committed: number }) {
  const spentPct     = Math.min((spent / allocated) * 100, 100);
  const committedPct = Math.min((committed / allocated) * 100, Math.max(0, 100 - spentPct));
  const remaining    = Math.max(0, allocated - spent - committed);
  const overBudget   = spent + committed > allocated;
  const totalPct     = ((spent + committed) / allocated * 100).toFixed(0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-slate-900">Budget annuel maintenance — 2026</div>
          <div className="text-xs text-slate-400 mt-0.5">Consolidé — toutes entités et tous sites</div>
        </div>
        <div className={`text-xl font-bold ${overBudget ? 'text-red-600' : 'text-slate-900'}`}>
          {totalPct}%<span className="text-sm font-normal text-slate-400 ml-1">consommé</span>
        </div>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
        <div className="flex h-full">
          <div className="bg-slate-700 transition-all" style={{ width: `${spentPct}%` }} title={`Dépensé : ${spent.toLocaleString('fr-TN')} TND`} />
          <div className="bg-blue-300 transition-all" style={{ width: `${committedPct}%` }} title={`Engagé : ${committed.toLocaleString('fr-TN')} TND`} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 text-center">
        {[
          { color: 'bg-slate-200', label: 'Budget alloué', value: allocated, note: '(fixé par les directeurs)' },
          { color: 'bg-slate-700', label: 'Dépensé',       value: spent,     note: 'BCs confirmés / reçus' },
          { color: 'bg-blue-300',  label: 'Engagé',        value: committed, note: 'BCs en cours de validation' },
          { color: 'bg-slate-100', label: 'Disponible',    value: remaining, note: 'Budget restant estimé' },
        ].map(({ color, label, value, note }) => (
          <div key={label}>
            <div className={`w-3 h-3 rounded-full ${color} border border-slate-200 mx-auto mb-1`} />
            <div className="text-xs text-slate-500 font-medium">{label}</div>
            <div className="text-sm font-bold text-slate-900">{value.toLocaleString('fr-TN')} TND</div>
            <div className="text-xs text-slate-400">{note}</div>
          </div>
        ))}
      </div>
      {overBudget && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-xs text-red-700 font-medium">
          ⚠ Dépassement : les engagements ({(spent + committed).toLocaleString('fr-TN')} TND) excèdent le budget alloué ({allocated.toLocaleString('fr-TN')} TND).
        </div>
      )}
    </div>
  );
}

// ── Category breakdown cards ───────────────────────────────────────────────
function CategoryBreakdown({ cats, types }: { cats: ActiveCategories; types: ActiveTypes }) {
  const items: Array<{ id: string; icon: string; label: string; mttr: number; sla48: number; firstFix: number; count: number }> = [];

  if (cats.length > 0) {
    for (const c of cats) {
      const cat = INTERVENTION_CATEGORIES.find(x => x.id === c);
      const kpi = CATEGORY_KPIS[c];
      if (cat && kpi) {
        items.push({ id: c, icon: cat.icon, label: cat.label, ...kpi });
      }
    }
  } else if (types.length > 0) {
    const typeLabels: Record<1|2|3, string> = { 1: 'Panne simple', 2: 'Réparation', 3: 'Travaux' };
    const typeIcons: Record<1|2|3, string> = { 1: '⚡', 2: '🔧', 3: '🏗️' };
    for (const t of types) {
      const kpi = TYPE_KPIS[t];
      items.push({ id: `type-${t}`, icon: typeIcons[t], label: `Type ${t} — ${typeLabels[t]}`, ...kpi });
    }
  }

  if (items.length <= 1) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
        Répartition par {cats.length > 0 ? 'catégorie' : 'type'}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map(item => {
          const mttrOk = item.mttr <= 48;
          const slaOk = item.sla48 >= 90;
          return (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{item.icon}</span>
                <div className="text-xs font-semibold text-slate-700 leading-tight">{item.label}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <div className={`text-xl font-bold ${mttrOk ? 'text-green-600' : 'text-amber-600'}`}>{item.mttr}h</div>
                  <div className="text-xs text-slate-400">MTTR</div>
                </div>
                <div>
                  <div className={`text-xl font-bold ${slaOk ? 'text-green-600' : 'text-amber-600'}`}>{item.sla48}%</div>
                  <div className="text-xs text-slate-400">SLA 48h</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                <span>1er passage : <span className="font-semibold text-slate-700">{item.firstFix}%</span></span>
                <span className="text-slate-400">{item.count} int.</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Vendor KPI table ──────────────────────────────────────────────────────
function VendorKPITable({ title, vendors, accentColor }: {
  title: string;
  vendors: VendorKPI[];
  accentColor: 'orange' | 'blue';
}) {
  const accent = accentColor === 'orange'
    ? { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-700' }
    : { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   badge: 'bg-blue-100 text-blue-700' };

  if (vendors.length === 0) return null;

  return (
    <div>
      <h2 className="font-semibold text-slate-800 mb-3">{title}</h2>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className={`px-5 py-3 ${accent.bg} border-b ${accent.border}`}>
          <div className="grid grid-cols-8 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <div className="col-span-2">Entreprise</div>
            <div className="text-center">Catégories</div>
            <div className="text-center">Demandes</div>
            <div className="text-center">Reçus</div>
            <div className="text-center">Taux rép.</div>
            <div className="text-center">Taux victoire</div>
            <div className="text-center">Délai moy.</div>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {vendors.map(({ vendor, demandesEnvoyees, devisRecus, tauxReponse, tauxVictoire, delaiMoyenReponseH, montantTotalGagne }) => {
            const respColor = tauxReponse >= 80 ? 'text-green-600' : tauxReponse >= 50 ? 'text-amber-600' : 'text-red-600';
            const winColor  = tauxVictoire >= 50 ? 'text-green-600' : tauxVictoire >= 25 ? 'text-amber-600' : 'text-slate-500';
            return (
              <div key={vendor.id} className="grid grid-cols-8 gap-2 px-5 py-3 items-center hover:bg-slate-50 transition-colors">
                <div className="col-span-2">
                  <Link href={`/kpi/vendors/${vendor.id}`} className="text-sm font-medium text-blue-600 hover:underline">{vendor.name}</Link>
                  <div className="text-xs text-slate-400">{vendor.email}</div>
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {vendor.categories.slice(0, 2).map(cat => (
                    <span key={cat} className="text-xs" title={CATEGORY_LABEL[cat]}>
                      {CATEGORY_ICON[cat]}
                    </span>
                  ))}
                  {vendor.categories.length > 2 && (
                    <span className="text-[10px] text-slate-400">+{vendor.categories.length - 2}</span>
                  )}
                </div>
                <div className="text-center">
                  <span className="text-sm font-semibold text-slate-700">{demandesEnvoyees}</span>
                </div>
                <div className="text-center">
                  <span className="text-sm text-slate-600">{devisRecus}</span>
                </div>
                <div className="text-center">
                  <span className={`text-sm font-semibold ${respColor}`}>{tauxReponse}%</span>
                </div>
                <div className="text-center">
                  <span className={`text-sm font-semibold ${winColor}`}>
                    {devisRecus > 0 ? `${tauxVictoire}%` : '—'}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-sm text-slate-600">
                    {delaiMoyenReponseH !== null ? `${delaiMoyenReponseH}h` : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {/* Footer totals */}
        <div className={`px-5 py-3 ${accent.bg} border-t ${accent.border}`}>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{vendors.length} {vendors[0]?.vendor.type === 'prestataire' ? 'prestataires actifs' : 'fournisseurs actifs'}</span>
            <span className="font-medium">
              Total gagné : {vendors.reduce((s, v) => s + v.montantTotalGagne, 0).toLocaleString('fr-TN')} TND
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Vendors Tab ───────────────────────────────────────────────────────────
function VendorsTab() {
  const allKPIs = computeAllVendorKPIs();
  const [catFilter, setCatFilter] = useState<string>('all');

  const cats = Array.from(new Set(allKPIs.flatMap(k => k.vendor.categories)));
  const filtered = catFilter === 'all' ? allKPIs : allKPIs.filter(k => k.vendor.categories.includes(catFilter as InterventionCategory));
  const prestataires = filtered.filter(k => k.vendor.type === 'prestataire');
  const fournisseurs  = filtered.filter(k => k.vendor.type === 'fournisseur');

  return (
    <div className="space-y-6">
      {/* Filtre catégorie */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Catégorie</span>
        <button
          onClick={() => setCatFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${catFilter === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
        >
          Toutes
        </button>
        {cats.map(c => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${catFilter === c ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
          >
            {CATEGORY_ICON[c as InterventionCategory]} {CATEGORY_LABEL[c as InterventionCategory]}
          </button>
        ))}
      </div>
      <VendorKPITable title="Prestataires de service" vendors={prestataires} accentColor="orange" />
      <VendorKPITable title="Fournisseurs de matériaux" vendors={fournisseurs} accentColor="blue" />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function KpiPage() {
  const [activeTab, setActiveTab] = useState<'ops' | 'vendors'>('ops');
  const [selectedCategories, setSelectedCategories] = useState<ActiveCategories>([]);
  const [selectedTypes, setSelectedTypes] = useState<ActiveTypes>([]);
  const kpiRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  async function exportKpiPDF() {
    if (!kpiRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(kpiRef.current, {
        scale: 2, useCORS: true, logging: false, backgroundColor: '#f8fafc',
      });
      const pdf  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const imgH  = (canvas.height * pageW) / canvas.width;
      const imgData = canvas.toDataURL('image/png');
      let y = 0;
      while (y < imgH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -y, pageW, imgH);
        y += pdf.internal.pageSize.getHeight();
      }
      const date = new Date().toISOString().slice(0, 10);
      pdf.save(`KPI-Facility-Manager-${date}.pdf`);
    } catch (e) { console.error(e); }
    finally { setExporting(false); }
  }

  const filtered = computeFiltered(selectedCategories, selectedTypes);
  const hasFilter = selectedCategories.length > 0 || selectedTypes.length > 0;

  const displayMttr      = filtered ? filtered.mttr      : TREND.mttr[5];
  const displayMttrPrev  = filtered ? filtered.mttrTrend[4] : TREND.mttr[4];
  const displayMttrTrend = filtered ? filtered.mttrTrend : TREND.mttr;

  const displaySla48      = filtered ? filtered.sla48      : TREND.sla48[5];
  const displaySla48Prev  = filtered ? filtered.sla48Trend[4] : TREND.sla48[4];
  const displaySla48Trend = filtered ? filtered.sla48Trend : TREND.sla48;

  const displayFirstFix      = filtered ? filtered.firstFix      : TREND.first_fix[5];
  const displayFirstFixPrev  = filtered ? filtered.firstFixTrend[4] : TREND.first_fix[4];
  const displayFirstFixTrend = filtered ? filtered.firstFixTrend : TREND.first_fix;

  const displayMonthly = filtered ? filtered.monthly : TREND.interventions;

  const filteredOei = filtered
    ? computeOEI({
        utilizationRatePct:    filtered.utilization,
        sla48CompliancePct:    filtered.sla48,
        firstTimeFixRatePct:   filtered.firstFix,
        groupingEfficiencyPct: MOCK_COMPONENTS.groupingEfficiencyPct,
      })
    : oei;

  const filterLabel = [
    ...selectedCategories.map(c => INTERVENTION_CATEGORIES.find(x => x.id === c)?.label ?? c),
    ...selectedTypes.map(t => `Type ${t}`),
  ].join(' · ');

  return (
    <div ref={kpiRef} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">KPI &amp; Performance</h1>
        <p className="text-slate-500 mt-1">Indicateurs de synthèse · Tendances Fév–Jul 2026 · Données de démonstration</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Barres = évolution mensuelle · Barre verte/rouge = mois en cours · ▲▼ = variation vs mois précédent · Moy. YTD = moyenne annuelle à ce jour
        </p>
      </div>

      {/* Tab switcher + export */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
          <button
            onClick={() => setActiveTab('ops')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'ops' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            📊 Performance opérationnelle
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'vendors' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🏢 Prestataires &amp; Fournisseurs
          </button>
        </div>
        <button
          onClick={exportKpiPDF}
          disabled={exporting}
          className="text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:border-slate-400 transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          {exporting ? '⏳ Export…' : '⬇ Exporter PDF'}
        </button>
      </div>

      {activeTab === 'ops' && (
      <>
      <FilterBar
        selectedCategories={selectedCategories}
        selectedTypes={selectedTypes}
        onCategoriesChange={setSelectedCategories}
        onTypesChange={setSelectedTypes}
      />

      {/* Filtered view banner */}
      {hasFilter && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
          <span className="text-blue-500">◈</span>
          <span className="text-sm text-blue-800 font-medium">Vue filtrée</span>
          <span className="text-xs text-blue-600">{filterLabel}</span>
          <span className="ml-auto text-xs text-blue-500">
            {filtered?.count} interventions dans cette sélection
          </span>
        </div>
      )}

      {/* OEI global */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-xs font-black text-blue-400 uppercase tracking-widest mb-0.5">OEI</div>
            <div className="font-bold text-blue-900 text-base">Overall Efficiency Index</div>
            <div className="text-sm text-blue-700 mt-0.5">Indice Global d&apos;Efficacité Opérationnelle</div>
            <div className="text-xs text-blue-500 mt-2 leading-relaxed">
              30% productivité · 25% SLA · 25% qualité 1er passage · 20% optimisation groupage
            </div>
            <div className="flex items-center gap-3 mt-2">
              {hasFilter ? (
                <span className="text-xs text-blue-500">Calculé sur la sélection filtrée</span>
              ) : (
                <>
                  <span className="text-xs text-green-600 font-semibold">▲ +2.1 vs M-1</span>
                  <span className="text-xs text-blue-400">Moy. YTD : 74.8</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Objectif ≥ 70</span>
                </>
              )}
            </div>
          </div>
          <div className={`text-5xl font-black shrink-0 ${filteredOei >= 80 ? 'text-green-600' : filteredOei >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
            {filteredOei.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Budget — always global */}
      <BudgetBar allocated={ANNUAL_BUDGET.allocated} spent={ANNUAL_BUDGET.spent} committed={ANNUAL_BUDGET.committed} />

      {/* Monthly interventions chart */}
      <MonthlyBarChart data={displayMonthly} />

      {/* Category/type breakdown when multiple items selected */}
      {hasFilter && <CategoryBreakdown cats={selectedCategories} types={selectedTypes} />}

      {/* KPI cards with trends */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Indicateurs Détaillés
          {hasFilter && <span className="ml-2 text-blue-500 normal-case font-normal text-xs">— vue filtrée</span>}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TrendKpiCard
            label="Taux d'utilisation des techniciens"
            current={filtered ? filtered.utilization : MOCK_COMPONENTS.utilizationRatePct}
            prev={filtered ? filtered.utilization + 3 : 75}
            ytd={filtered ? filtered.utilization - 3 : 72}
            unit="%" target={80} months={filtered ? makeDecliningTrend(filtered.utilization, -8).reverse() : [70,72,73,75,75,78]}
            targetLabel="Objectif 75–85% — au-dessus peut indiquer une surcharge"
          />
          <TrendKpiCard
            acronym="SLA 48h"
            label="Conformité délai de traitement < 48h"
            current={displaySla48} prev={displaySla48Prev} ytd={ytdAvg(displaySla48Trend)}
            unit="%" target={90} months={displaySla48Trend}
            targetLabel="Service Level Agreement — proportion traitée en < 48h"
          />
          <TrendKpiCard
            label="Taux de réparation au 1er passage"
            current={displayFirstFix} prev={displayFirstFixPrev} ytd={ytdAvg(displayFirstFixTrend)}
            unit="%" target={85} months={displayFirstFixTrend}
            targetLabel="Sans re-intervention dans les 7 jours"
          />
          <TrendKpiCard
            label="Efficacité groupage des missions"
            current={TREND.grouping[5]} prev={TREND.grouping[4]} ytd={ytdAvg(TREND.grouping)}
            unit="%" target={70} months={TREND.grouping}
            targetLabel="Missions regroupées géographiquement — réduit les déplacements"
          />
        </div>
      </div>

      {/* Delays */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Délais &amp; Réactivité</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <TrendKpiCard
            acronym="MTTR"
            label="Mean Time To Repair — Temps Moyen de Réparation"
            current={displayMttr} prev={displayMttrPrev} ytd={ytdAvg(displayMttrTrend)}
            unit="h" target={48} months={displayMttrTrend} inverse={true}
            targetLabel="Objectif : clôturer chaque intervention en < 48h"
          />
          <TrendKpiCard
            acronym="MTBF"
            label="Mean Time Between Failures — Tps Moyen entre Pannes"
            current={18} prev={16} ytd={16}
            unit=" j" target={30} months={[12,13,14,15,16,18]}
            targetLabel="Indicateur de fiabilité des équipements — plus c'est long, mieux c'est"
          />
          <TrendKpiCard
            label="Délai de validation des Bons de Commande"
            current={TREND.bc_delay[5]} prev={TREND.bc_delay[4]} ytd={ytdAvg(TREND.bc_delay)}
            unit="h" target={8} months={TREND.bc_delay.map(v => v * 10)} inverse={true}
            targetLabel="Délai moyen entre soumission d'un BC et validation par le directeur"
          />
        </div>
      </div>

      {/* Satisfaction */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <div className="font-semibold text-slate-900">Score de satisfaction demandeur</div>
            <div className="text-xs text-slate-400 mt-0.5">Noté après clôture de chaque intervention (1 à 5 étoiles) · Cible : ≥ 4.0 / 5</div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <TrendBadge current={TREND.satisfaction[5]} prev={TREND.satisfaction[4]} unit="" />
              <span className="text-xs text-slate-400">Moy. YTD : ★ {ytdAvg(TREND.satisfaction)}</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Objectif ≥ 4.0 atteint</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-green-600 shrink-0">★ {TREND.satisfaction[5]}<span className="text-base font-normal text-slate-400 ml-1">/ 5</span></div>
        </div>
        <div className="mt-4">
          <SparkBars data={TREND.satisfaction.map(v => v * 20)} />
          <div className="flex justify-between text-xs text-slate-300 mt-0.5">
            {MONTHS.map(m => <span key={m}>{m}</span>)}
          </div>
        </div>
        <div className="text-xs text-slate-400 mt-2">Basé sur 18 retours ce mois</div>
      </div>
      </>
      )}

      {activeTab === 'vendors' && <VendorsTab />}
    </div>
  );
}
