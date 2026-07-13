'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GROUP_NAME, getEntity, getSitesForEntity } from '@/lib/entities';

// ── Chart primitives ────────────────────────────────────────────────────────
function SparkBars({ data, inverse = false }: { data: number[]; inverse?: boolean }) {
  const maxVal = Math.max(...data);
  const minVal = Math.min(...data);
  const range  = maxVal - minVal || 1;
  // inverse: lower = better (e.g. MTTR) → color the last bar green if it dropped
  const lastDelta = data[data.length - 1] - data[data.length - 2];
  const improving = inverse ? lastDelta < 0 : lastDelta > 0;

  return (
    <div className="flex items-end gap-0.5 h-10 w-full">
      {data.map((v, i) => {
        const h = Math.max(((v - minVal) / range) * 100, 8);
        const isLast = i === data.length - 1;
        const barColor = isLast
          ? improving ? 'bg-green-500' : 'bg-red-400'
          : 'bg-slate-200';
        return (
          <div key={i} className="flex-1 flex items-end">
            <div className={`w-full rounded-sm transition-all ${barColor}`} style={{ height: `${h}%` }} />
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
  const sign = delta > 0 ? '+' : '';
  if (delta === 0) return <span className="text-xs text-slate-400">= M-1</span>;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${improving ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {improving ? '▲' : '▼'} {sign}{delta}{unit} vs M-1
    </span>
  );
}

function TargetBar({ value, target, unit, inverse = false }: {
  value: number; target: number; unit: string; inverse?: boolean;
}) {
  const achieved = inverse ? value <= target : value >= target;
  const pct = inverse
    ? Math.min((target / value) * 100, 100)
    : Math.min((value / target) * 100, 100);
  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-400">
          Objectif : {inverse ? '≤' : '≥'} {target}{unit}
        </span>
        <span className={`text-xs font-semibold ${achieved ? 'text-green-600' : 'text-amber-600'}`}>
          {achieved ? '✓ Atteint' : `⚠ Écart ${inverse ? '-' : '-'}${Math.abs(value - target)}${unit}`}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${achieved ? 'bg-green-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TrendKpiCard({
  acronym, label, current, prev, ytd, unit, target, targetLabel,
  months, inverse = false,
}: {
  acronym?: string; label: string;
  current: number; prev: number; ytd: number;
  unit: string; target: number; targetLabel?: string;
  months: number[]; inverse?: boolean;
}) {
  const achieved = inverse ? current <= target : current >= target;
  const valColor = achieved ? 'text-green-600' : 'text-amber-600';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
      {/* Header */}
      <div>
        {acronym && <div className="text-xs font-black text-slate-400 uppercase tracking-widest">{acronym}</div>}
        <div className="text-xs text-slate-500 leading-tight">{label}</div>
      </div>

      {/* Main value + trend */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className={`text-3xl font-bold ${valColor}`}>
            {current}<span className="text-base font-normal ml-0.5 text-slate-400">{unit}</span>
          </div>
          <div className="mt-1">
            <TrendBadge current={current} prev={prev} unit={unit} inverse={inverse} />
          </div>
        </div>
        {/* Mini YTD */}
        <div className="text-right shrink-0">
          <div className="text-xs text-slate-400">Moy. YTD</div>
          <div className="text-sm font-semibold text-slate-700">{ytd}{unit}</div>
        </div>
      </div>

      {/* Sparkline */}
      <SparkBars data={months} inverse={inverse} />
      <div className="flex justify-between text-xs text-slate-300 -mt-1">
        <span>Fév</span><span>Mar</span><span>Avr</span><span>Mai</span><span>Jun</span><span>Jul</span>
      </div>

      {/* Target */}
      <TargetBar value={current} target={target} unit={unit} inverse={inverse} />
      {targetLabel && <div className="text-xs text-slate-400 -mt-1">{targetLabel}</div>}
    </div>
  );
}

// ── Vertical bar chart (monthly interventions) ─────────────────────────────
function BarChart({
  title, labels, bars, sub,
}: {
  title: string;
  labels: string[];
  bars: { label: string; values: number[]; color: string }[];
  sub?: string;
}) {
  const maxVal = Math.max(...bars.flatMap(b => b.values));
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="font-semibold text-slate-900">{title}</div>
        {sub && <div className="text-xs text-slate-400">{sub}</div>}
      </div>
      {/* Legend */}
      <div className="flex gap-4 mb-4">
        {bars.map(b => (
          <div key={b.label} className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className={`w-2.5 h-2.5 rounded-sm ${b.color}`} />
            {b.label}
          </div>
        ))}
      </div>
      {/* Bars */}
      <div className="flex items-end gap-3" style={{ height: '120px' }}>
        {labels.map((label, i) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-1">
            {/* Value labels */}
            <div className="flex gap-0.5 w-full justify-center text-xs text-slate-500 mb-1">
              {bars.map(b => <span key={b.label}>{b.values[i]}</span>)}
            </div>
            {/* Bars group */}
            <div className="flex items-end gap-0.5 w-full" style={{ height: '80px' }}>
              {bars.map(b => {
                const h = maxVal > 0 ? (b.values[i] / maxVal) * 80 : 0;
                const isLast = i === labels.length - 1;
                return (
                  <div key={b.label} className="flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-sm ${isLast ? b.color.replace('200', '600').replace('100', '500') : b.color}`}
                      style={{ height: `${Math.max(h, 3)}px` }}
                    />
                  </div>
                );
              })}
            </div>
            <span className="text-xs text-slate-400 mt-1">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mock data ──────────────────────────────────────────────────────────────
// Directeur FAD Industrie — site principal : Pôle Industriel Jbel Oust
const ENTITY_CODE = 'FAD';
const _entityDef  = getEntity(ENTITY_CODE)!;
const ENTITY_NAME = _entityDef.name;
const ENTITY_SITES = getSitesForEntity(ENTITY_CODE);

const MONTHS = ['Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul'];

const TREND = {
  mttr:        [48, 44, 42, 38, 35, 31],
  sla48:       [78, 80, 82, 84, 85, 87],
  first_fix:   [81, 83, 85, 87, 89, 91],
  satisfaction: [3.9, 4.0, 4.0, 4.1, 4.1, 4.2],
  interventions_done:    [18, 21, 24, 26, 25, 28],
  interventions_pending: [8, 7, 9, 8, 9, 12],
};

// YTD averages (mean of the 6 months)
function ytdAvg(arr: number[]) {
  return Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;
}

const STATUS_SUMMARY = [
  { label: 'Actives',           count: 12, color: 'bg-blue-100 text-blue-700',   href: '/demandes' },
  { label: 'À valider (moi)',   count: 3,  color: 'bg-amber-100 text-amber-700', href: '/demandes' },
  { label: 'Planifiées demain', count: 4,  color: 'bg-violet-100 text-violet-700', href: '/ordres-de-travail' },
  { label: 'Clôturées ce mois', count: 28, color: 'bg-green-100 text-green-700', href: '/demandes' },
];

const PENDING_VALIDATION = {
  demandes: 2,
  bcs: 3,
};

const TOP_EQUIPMENT = [
  { name: 'Tableau TGS-B2',    pannes: 4, cout: 1200, trend: 'stable' },
  { name: 'Moteur Pompe P-12', pannes: 3, cout: 840,  trend: 'up'    },
  { name: 'Compresseur C-01',  pannes: 2, cout: 560,  trend: 'down'  },
  { name: 'Armoire AT-04',     pannes: 2, cout: 420,  trend: 'stable'},
];

const TECHNICIAN_LOAD = [
  { name: 'Mohamed Salah', load: 78, missions: 5 },
  { name: 'Karim Bejaoui', load: 65, missions: 4 },
  { name: 'Anis Trabelsi', load: 45, missions: 3 },
];

const RECENT_BCS = [
  { po: 'BC-FAD-2026-000041', status: 'draft',     amount: 1840, date: '28/06' },
  { po: 'BC-FAD-2026-000040', status: 'confirmed', amount: 620,  date: '25/06' },
  { po: 'BC-FAD-2026-000039', status: 'received',  amount: 3200, date: '20/06' },
];

const BC_STATUS_LABEL: Record<string, string> = { draft: 'À valider', sent: 'Envoyé', confirmed: 'Confirmé', received: 'Reçu', cancelled: 'Annulé' };
const BC_STATUS_COLOR: Record<string, string>  = { draft: 'bg-amber-100 text-amber-700', sent: 'bg-blue-100 text-blue-700', confirmed: 'bg-violet-100 text-violet-700', received: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-600' };

const SPENDING = { spent: 37200, committed: 6200 };

// ── SLA alertes (calculées depuis les demandes actives) ────────────────────
const SLA_THRESHOLDS: Partial<Record<string, { warn: number; escalate: number }>> = {
  clarification:                  { warn: 4,  escalate: 24 },
  preparation:                    { warn: 24, escalate: 72 },
  planned:                        { warn: 24, escalate: 72 },
  completed_pending_confirmation: { warn: 24, escalate: 48 },
  awaiting_materials:             { warn: 48, escalate: 120 },
};

interface SlaAlert {
  title: string;
  site: string;
  status: string;
  hours: number;
  level: 'warning' | 'escalation';
}

const DEMANDES_SITE: Array<{ title: string; site: string; status: string; hours_in_status: number }> = [
  { title: 'Tableau TGS-B2',           site: 'Atelier B',  status: 'clarification',                 hours_in_status: 29 },
  { title: 'Compresseur C-01',          site: 'Zone C',     status: 'ready_to_plan',                 hours_in_status: 51 },
  { title: 'Pompe hydraulique P-12',    site: 'Atelier A',  status: 'preparation',                   hours_in_status: 18 },
  { title: 'Ventilation CTA-2',         site: 'Zone B',     status: 'awaiting_materials',            hours_in_status: 56 },
  { title: 'Remplacement moteur comp.', site: 'Zone D',     status: 'planned',                       hours_in_status: 8 },
  { title: 'Câblage armoire AT-04',     site: 'Siège',      status: 'completed_pending_confirmation', hours_in_status: 52 },
];

const SLA_ALERTS: SlaAlert[] = DEMANDES_SITE.flatMap((d): SlaAlert[] => {
  const thresh = SLA_THRESHOLDS[d.status];
  if (!thresh) return [];
  if (d.hours_in_status >= thresh.escalate) return [{ title: d.title, site: d.site, status: d.status, hours: d.hours_in_status, level: 'escalation' }];
  if (d.hours_in_status >= thresh.warn) return [{ title: d.title, site: d.site, status: d.status, hours: d.hours_in_status, level: 'warning' }];
  return [];
}).sort((a, b) => (b.level === 'escalation' ? 1 : 0) - (a.level === 'escalation' ? 1 : 0));

// ── Budget card ────────────────────────────────────────────────────────────
function AnnualBudgetCard() {
  const [budget, setBudget]   = useState(60000);
  const [editing, setEditing] = useState(false);
  const [input, setInput]     = useState('60000');

  const { spent, committed } = SPENDING;
  const spentPct     = Math.min((spent / budget) * 100, 100);
  const committedPct = Math.min((committed / budget) * 100, Math.max(0, 100 - spentPct));
  const remaining    = Math.max(0, budget - spent - committed);
  const overBudget   = spent + committed > budget;
  const usedPct      = ((spent + committed) / budget) * 100;

  function handleSave() {
    const v = parseInt(input.replace(/\s/g, ''), 10);
    if (!isNaN(v) && v > 0) setBudget(v);
    setEditing(false);
  }

  return (
    <div className={`rounded-xl border p-5 space-y-4 ${overBudget ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="font-semibold text-slate-900">Budget annuel maintenance — 2026</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {ENTITY_NAME} · {ENTITY_SITES.map(s => `${s.label}, ${s.city}`).join(' — ')} · Fixé par le directeur d&apos;entité
          </div>
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <input type="number" value={input} onChange={e => setInput(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 w-32 focus:outline-none focus:ring-2 focus:ring-slate-900" />
            <span className="text-sm text-slate-500">TND</span>
            <button onClick={handleSave} className="text-xs font-semibold bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700">OK</button>
            <button onClick={() => setEditing(false)} className="text-xs text-slate-500 hover:text-slate-700">Annuler</button>
          </div>
        ) : (
          <button onClick={() => { setEditing(true); setInput(String(budget)); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium shrink-0">
            Modifier le budget
          </button>
        )}
      </div>

      <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
        <div className="flex h-full">
          <div className="bg-slate-700 transition-all" style={{ width: `${spentPct}%` }} />
          <div className="bg-blue-300 transition-all" style={{ width: `${committedPct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
        <div>
          <div className="text-xs text-slate-400 mb-0.5">Budget alloué</div>
          <div className="font-bold text-slate-900">{budget.toLocaleString('fr-TN')} TND</div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mb-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" />Dépensé
          </div>
          <div className="font-bold text-slate-900">{spent.toLocaleString('fr-TN')} TND</div>
          <div className="text-xs text-slate-400">{spentPct.toFixed(0)}%</div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mb-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-300 inline-block" />Engagé (BCs)
          </div>
          <div className="font-bold text-slate-900">{committed.toLocaleString('fr-TN')} TND</div>
          <div className="text-xs text-slate-400">{committedPct.toFixed(0)}%</div>
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-0.5">Disponible</div>
          <div className={`font-bold ${overBudget ? 'text-red-600' : 'text-green-600'}`}>
            {overBudget ? '— Dépassé' : `${remaining.toLocaleString('fr-TN')} TND`}
          </div>
          {!overBudget && <div className="text-xs text-slate-400">{(100 - usedPct).toFixed(0)}% restant</div>}
        </div>
      </div>

      {overBudget && (
        <div className="text-xs text-red-700 font-medium bg-red-100 rounded-lg px-3 py-2">
          ⚠ Les engagements ({(spent + committed).toLocaleString('fr-TN')} TND) dépassent le budget alloué. Contactez le Directeur Général.
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mt-6 mb-3">{children}</h2>;
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function DirecteurDashboard() {
  const mttr     = TREND.mttr;
  const sla      = TREND.sla48;
  const firstFix = TREND.first_fix;
  const sat      = TREND.satisfaction;

  return (
    <div className="space-y-2">

      {/* Header */}
      <div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{GROUP_NAME}</div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord — Directeur d&apos;entité</h1>
        <p className="text-slate-500 mt-0.5">
          Entité <span className="font-semibold text-slate-700">{ENTITY_NAME}</span>
          {' · '}{ENTITY_SITES.map((s, i) => (
            <span key={s.id}>{i > 0 && <span className="mx-1 text-slate-300">·</span>}<span className="font-medium text-slate-600">{s.label}, {s.city}</span></span>
          ))}
          {' · '}Juillet 2026
        </p>
      </div>

      {/* Mes cadrans */}
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Mes cadrans</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/demandes"
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors group">
          <span className="text-xl">⚠️</span>
          <div>
            <div className="text-lg font-bold text-amber-900">{PENDING_VALIDATION.demandes}</div>
            <div className="text-xs text-amber-700 font-medium">Demandes à valider</div>
          </div>
        </Link>
        <Link href="/bons-de-commande"
          className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 hover:bg-orange-100 transition-colors group">
          <span className="text-xl">📋</span>
          <div>
            <div className="text-lg font-bold text-orange-900">{PENDING_VALIDATION.bcs}</div>
            <div className="text-xs text-orange-700 font-medium">BCs à valider</div>
          </div>
        </Link>
        <Link href="/ordres-de-travail"
          className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 hover:bg-violet-100 transition-colors group">
          <span className="text-xl">📅</span>
          <div>
            <div className="text-lg font-bold text-violet-900">{STATUS_SUMMARY.find(s => s.label === 'Planifiées demain')?.count}</div>
            <div className="text-xs text-violet-700 font-medium">Planifiées demain</div>
          </div>
        </Link>
        <Link href="/demandes/new"
          className="flex items-center gap-3 bg-slate-900 rounded-xl px-4 py-3 hover:bg-slate-700 transition-colors group">
          <span className="text-xl">➕</span>
          <div>
            <div className="text-sm font-bold text-white">Nouvelle demande</div>
            <div className="text-xs text-slate-400">Créer une intervention</div>
          </div>
        </Link>
      </div>

      {/* Résumé statuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {STATUS_SUMMARY.map((s) => (
          <Link key={s.label} href={s.href} className="bg-white rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition-colors">
            <div className={`text-xs font-medium px-2 py-0.5 rounded w-fit mb-2 ${s.color}`}>{s.label}</div>
            <div className="text-3xl font-bold text-slate-900">{s.count}</div>
          </Link>
        ))}
      </div>

      {/* Budget annuel */}
      <SectionTitle>Budget maintenance</SectionTitle>
      <AnnualBudgetCard />

      {/* KPIs avec tendances */}
      <SectionTitle>KPIs — Tendances &amp; Objectifs</SectionTitle>
      <p className="text-xs text-slate-400 -mt-2 mb-3">
        Barres = évolution Fév→Jul · Barre verte/rouge = mois en cours · ▲▼ = variation vs mois précédent
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TrendKpiCard
          acronym="MTTR"
          label="Mean Time To Repair — Temps Moyen de Réparation (h)"
          current={mttr[5]} prev={mttr[4]} ytd={ytdAvg(mttr)}
          unit="h" target={48} months={mttr} inverse={true}
          targetLabel="Objectif groupe : ≤ 48h — Objectif entité : ≤ 35h"
        />
        <TrendKpiCard
          acronym="SLA 48h"
          label="Conformité délai de traitement < 48h (%)"
          current={sla[5]} prev={sla[4]} ytd={ytdAvg(sla)}
          unit="%" target={85} months={sla}
          targetLabel="Plancher groupe : ≥ 85% — Objectif entité : ≥ 90%"
        />
        <TrendKpiCard
          label="Taux de réparation au 1er passage (%)"
          current={firstFix[5]} prev={firstFix[4]} ytd={ytdAvg(firstFix)}
          unit="%" target={80} months={firstFix}
          targetLabel="Plancher groupe : ≥ 80%"
        />
        <TrendKpiCard
          label="Satisfaction demandeur (/ 5)"
          current={sat[5]} prev={sat[4]} ytd={ytdAvg(sat)}
          unit=" / 5" target={4.0} months={sat.map(v => v * 20)}
          targetLabel="Cible : ≥ 4.0 / 5"
        />
      </div>

      {/* Monthly evolution chart */}
      <SectionTitle>Évolution mensuelle — Fév–Jul 2026</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-4">
        <BarChart
          title="Interventions"
          sub="Terminées vs En cours"
          labels={MONTHS}
          bars={[
            { label: 'Terminées',  values: TREND.interventions_done,    color: 'bg-slate-200' },
            { label: 'En attente', values: TREND.interventions_pending,  color: 'bg-amber-100' },
          ]}
        />
        <BarChart
          title="MTTR mensuel (h)"
          sub="Cible ≤ 48h"
          labels={MONTHS}
          bars={[
            { label: 'MTTR (h)', values: TREND.mttr, color: 'bg-blue-200' },
          ]}
        />
      </div>

      {/* Alertes SLA en cours */}
      <SectionTitle>Alertes SLA en cours</SectionTitle>
      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
        {SLA_ALERTS.length === 0 ? (
          <div className="px-5 py-4 text-sm text-green-700 bg-green-50 flex items-center gap-2">
            <span>✓</span> Aucune alerte SLA active — tous les délais sont respectés.
          </div>
        ) : (
          SLA_ALERTS.map((a, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <div>
                <div className="text-sm font-medium text-slate-900">{a.title}</div>
                <div className="text-xs text-slate-500">{a.site} · {a.status.replace(/_/g, ' ')}</div>
              </div>
              <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${a.level === 'escalation' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                {a.hours}h {a.level === 'escalation' ? '— Escalade' : '— Alerte'}
              </div>
            </div>
          ))
        )}
      </div>

      {/* BCs récents */}
      <SectionTitle>Bons de commande récents</SectionTitle>
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-medium text-slate-900">Bons de commande</span>
          <Link href="/bons-de-commande" className="text-xs text-blue-600 hover:underline">Tout voir →</Link>
        </div>
        <ul className="divide-y divide-slate-100">
          {RECENT_BCS.map((bc) => (
            <li key={bc.po} className="flex items-center justify-between px-5 py-3">
              <div>
                <div className="text-sm font-medium text-slate-900">{bc.po}</div>
                <div className="text-xs text-slate-400">{bc.date}/2026</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-700">{bc.amount.toLocaleString('fr-TN')} TND</span>
                <span className={`text-xs px-2.5 py-1 rounded-full ${BC_STATUS_COLOR[bc.status]}`}>{BC_STATUS_LABEL[bc.status]}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Top équipements */}
      <SectionTitle>Top équipements défaillants — 90 jours</SectionTitle>
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3">
        {(() => {
          const maxPannes = Math.max(...TOP_EQUIPMENT.map(e => e.pannes));
          return TOP_EQUIPMENT.map((eq, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-900 truncate">{eq.name}</span>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="text-xs text-slate-500">{eq.pannes} pannes</span>
                    <span className="text-xs font-semibold text-slate-700">{eq.cout.toLocaleString('fr-TN')} TND</span>
                    <span className={`text-xs ${eq.trend === 'up' ? 'text-red-500' : eq.trend === 'down' ? 'text-green-500' : 'text-slate-400'}`}>
                      {eq.trend === 'up' ? '▲' : eq.trend === 'down' ? '▼' : '—'}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-slate-400" style={{ width: `${(eq.pannes / maxPannes) * 100}%` }} />
                </div>
              </div>
            </div>
          ));
        })()}
        <div className="text-xs text-slate-400 pt-1">▲ en hausse vs période précédente · ▼ en baisse · — stable</div>
      </div>

      {/* Charge équipe */}
      <SectionTitle>Charge équipe</SectionTitle>
      <div className="grid sm:grid-cols-3 gap-3">
        {TECHNICIAN_LOAD.map((t) => (
          <div key={t.name} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm font-medium text-slate-900 mb-2">{t.name}</div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${t.load >= 80 ? 'bg-red-400' : t.load >= 60 ? 'bg-amber-400' : 'bg-green-400'}`}
                  style={{ width: `${t.load}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-slate-700 w-10 text-right">{t.load}%</span>
            </div>
            <div className="text-xs text-slate-400">{t.missions} missions cette semaine</div>
          </div>
        ))}
      </div>

    </div>
  );
}
