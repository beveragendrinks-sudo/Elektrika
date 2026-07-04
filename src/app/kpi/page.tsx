'use client';

import { computeOEI } from '@/lib/kpiEngine';

// ── Trend data (6 months Fév–Jul) ─────────────────────────────────────────
const MONTHS = ['Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul'];

const TREND = {
  mttr:        [42, 38, 35, 33, 32, 31],
  sla48:       [80, 82, 84, 85, 85, 87],
  first_fix:   [84, 86, 87, 88, 90, 91],
  grouping:    [60, 62, 63, 65, 66, 67],
  interventions: [22, 24, 26, 28, 25, 28],
  bc_delay:    [5.1, 4.8, 4.2, 3.9, 3.5, 3.2],
  satisfaction:[3.9, 4.0, 4.1, 4.1, 4.1, 4.2],
};

const ANNUAL_BUDGET = { allocated: 250000, spent: 115880, committed: 28400 };

const MOCK_COMPONENTS = {
  utilizationRatePct:    78,
  sla48CompliancePct:    TREND.sla48[5],
  firstTimeFixRatePct:   TREND.first_fix[5],
  groupingEfficiencyPct: TREND.grouping[5],
};

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
function MonthlyBarChart() {
  const data = TREND.interventions;
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

// ── Page ───────────────────────────────────────────────────────────────────
export default function KpiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">KPI &amp; Performance</h1>
        <p className="text-slate-500 mt-1">Indicateurs de synthèse · Tendances Fév–Jul 2026 · Données de démonstration</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Barres = évolution mensuelle · Barre verte/rouge = mois en cours · ▲▼ = variation vs mois précédent · Moy. YTD = moyenne annuelle à ce jour
        </p>
      </div>

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
            {/* OEI trend note */}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-green-600 font-semibold">▲ +2.1 vs M-1</span>
              <span className="text-xs text-blue-400">Moy. YTD : 74.8</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Objectif ≥ 70</span>
            </div>
          </div>
          <div className={`text-5xl font-black shrink-0 ${oei >= 80 ? 'text-green-600' : oei >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
            {oei.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Budget */}
      <BudgetBar allocated={ANNUAL_BUDGET.allocated} spent={ANNUAL_BUDGET.spent} committed={ANNUAL_BUDGET.committed} />

      {/* Monthly interventions chart */}
      <MonthlyBarChart />

      {/* KPI cards with trends */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Indicateurs Détaillés — Tendances &amp; Objectifs</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TrendKpiCard
            label="Taux d'utilisation des techniciens"
            current={MOCK_COMPONENTS.utilizationRatePct} prev={75} ytd={72}
            unit="%" target={80} months={[70,72,73,75,75,78]}
            targetLabel="Objectif 75–85% — au-dessus peut indiquer une surcharge"
          />
          <TrendKpiCard
            acronym="SLA 48h"
            label="Conformité délai de traitement < 48h"
            current={TREND.sla48[5]} prev={TREND.sla48[4]} ytd={ytdAvg(TREND.sla48)}
            unit="%" target={90} months={TREND.sla48}
            targetLabel="Service Level Agreement — proportion traitée en < 48h"
          />
          <TrendKpiCard
            label="Taux de réparation au 1er passage"
            current={TREND.first_fix[5]} prev={TREND.first_fix[4]} ytd={ytdAvg(TREND.first_fix)}
            unit="%" target={85} months={TREND.first_fix}
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
            current={TREND.mttr[5]} prev={TREND.mttr[4]} ytd={ytdAvg(TREND.mttr)}
            unit="h" target={48} months={TREND.mttr} inverse={true}
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
    </div>
  );
}
