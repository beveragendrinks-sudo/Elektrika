'use client';

import { useState } from 'react';
import Link from 'next/link';

const ELECTRICIAN_NAME = 'Mohamed Salah';
const CAPACITY_MAX = 10;
const TODAY_DATE = '02/07';
const WEEK_LABEL = '30 juin – 04 juillet 2026';
const WEEK_NUM = 27;

// ── Types ──────────────────────────────────────────────────────────────────
interface ValidatedBC { id: string; po: string }

interface WeekMission {
  id: string;
  ot_id: string;
  title: string;
  site: string;
  type: 1 | 2 | 3;
  points: 1 | 3 | 5;
  validated_bcs?: ValidatedBC[];
}

interface WeekDay {
  key: string;
  label: string;
  date: string;
  isToday?: boolean;
  isPast?: boolean;
  missions: WeekMission[];
}

const TYPE_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Panne simple',
  2: 'Réparation',
  3: 'Travaux',
};

const TYPE_COLOR: Record<1 | 2 | 3, string> = {
  1: 'bg-green-100 text-green-700',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-violet-100 text-violet-700',
};

// ── Mock planning data ─────────────────────────────────────────────────────
const WEEK_PLAN: WeekDay[] = [
  {
    key: 'lun', label: 'Lundi', date: '30/06', isPast: true,
    missions: [
      { id: '3', ot_id: 'ot-3', title: 'Câblage armoire AT-04', site: 'Siège Ben Arous', type: 3, points: 5 },
      { id: '6', ot_id: 'ot-6', title: 'Vérif. disj. ligne D', site: 'Siège Ben Arous', type: 1, points: 1 },
    ],
  },
  {
    key: 'mar', label: 'Mardi', date: '01/07', isPast: true,
    missions: [
      { id: '1', ot_id: 'ot-1', title: 'Panne tableau TGS-B2', site: 'Siège Ben Arous', type: 1, points: 1 },
      { id: '7', ot_id: 'ot-7', title: 'Fusible armoire B3', site: 'Siège Ben Arous', type: 1, points: 1 },
    ],
  },
  {
    key: 'mer', label: 'Mercredi', date: '02/07', isToday: true,
    missions: [
      {
        id: '4', ot_id: 'ot-4', title: 'Disjoncteur Atelier C', site: 'Pôle Industriel Jbel Oust',
        type: 1, points: 1,
        validated_bcs: [{ id: 'bc-2', po: 'BC-LAD-2026-000038' }],
      },
      {
        id: '8', ot_id: 'ot-8', title: 'Vérification tableau BT', site: 'Pôle Industriel Jbel Oust',
        type: 2, points: 3,
        validated_bcs: [],
      },
    ],
  },
  {
    key: 'jeu', label: 'Jeudi', date: '03/07',
    missions: [
      {
        id: '5', ot_id: 'ot-5', title: 'Remplacement variateur V-08', site: 'Megrine',
        type: 2, points: 3,
        validated_bcs: [{ id: 'bc-1', po: 'BC-LAD-2026-000041' }],
      },
    ],
  },
  {
    key: 'ven', label: 'Vendredi', date: '04/07',
    missions: [],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function capacityColor(pct: number) {
  if (pct >= 90) return { bar: 'bg-red-400', text: 'text-red-600', bg: 'bg-red-50 border-red-200' };
  if (pct >= 70) return { bar: 'bg-amber-400', text: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
  return { bar: 'bg-green-400', text: 'text-green-600', bg: 'bg-green-50 border-green-200' };
}

function groupBySite(missions: WeekMission[]): Map<string, WeekMission[]> {
  const map = new Map<string, WeekMission[]>();
  for (const m of missions) {
    const list = map.get(m.site) ?? [];
    list.push(m);
    map.set(m.site, list);
  }
  return map;
}

// ── Site accordion ─────────────────────────────────────────────────────────
function SiteSection({ site, missions, isToday, defaultOpen }: {
  site: string; missions: WeekMission[]; isToday: boolean; defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasBCs = missions.some(m => (m.validated_bcs?.length ?? 0) > 0);

  return (
    <div className="rounded-lg overflow-hidden border border-slate-100">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors ${
          isToday ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
        }`}
      >
        <svg className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isToday ? 'text-amber-300' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-bold leading-tight truncate ${isToday ? 'text-white' : 'text-slate-800'}`}>{site}</div>
          <div className={`text-xs mt-0.5 ${isToday ? 'text-slate-300' : 'text-slate-400'}`}>
            {missions.length} mission{missions.length > 1 ? 's' : ''}
            {hasBCs && ' · BCs ✓'}
          </div>
        </div>
        <svg
          className={`w-3.5 h-3.5 shrink-0 mt-0.5 transition-transform ${open ? 'rotate-180' : ''} ${isToday ? 'text-slate-300' : 'text-slate-400'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="divide-y divide-slate-100 bg-white">
          {missions.map((m) => (
            <div key={m.id} className="px-3 py-2">
              <div className="flex items-start gap-1.5 mb-1.5">
                <span className={`shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded ${TYPE_COLOR[m.type]}`}>
                  {m.points}pt
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-800 leading-snug">{m.title}</div>
                  <div className="text-xs text-slate-400">{TYPE_LABEL[m.type]}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap pl-0.5">
                <Link
                  href={`/ordres-de-travail/${m.ot_id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-slate-900 text-white hover:bg-slate-700 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  OT
                </Link>
                {m.validated_bcs?.map((bc) => (
                  <Link
                    key={bc.id}
                    href={`/bons-de-commande/${bc.id}`}
                    className="text-xs font-semibold px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    BC ✓
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Day card ───────────────────────────────────────────────────────────────
function DayCard({ day }: { day: WeekDay }) {
  const used = day.missions.reduce((s, m) => s + m.points, 0);
  const pct = Math.round((used / CAPACITY_MAX) * 100);
  const color = capacityColor(pct);
  const isEmpty = day.missions.length === 0;
  const siteGroups = groupBySite(day.missions);
  const siteList = Array.from(siteGroups.entries());

  return (
    <div className={`rounded-xl border flex flex-col overflow-hidden ${
      day.isToday
        ? 'border-slate-900 shadow-md'
        : day.isPast
        ? 'border-slate-100 bg-slate-50/70 opacity-70'
        : 'border-slate-200 bg-white'
    }`}>
      {/* Day header */}
      <div className={`px-3 py-2.5 flex items-center justify-between ${
        day.isToday ? 'bg-slate-900' : day.isPast ? 'bg-slate-100' : 'bg-white border-b border-slate-100'
      }`}>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-sm font-bold ${day.isToday ? 'text-white' : 'text-slate-700'}`}>{day.label}</span>
          <span className={`text-xs ${day.isToday ? 'text-slate-300' : 'text-slate-400'}`}>{day.date}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {day.isToday && (
            <span className="text-xs bg-amber-400 text-slate-900 font-bold px-1.5 py-0.5 rounded">Auj.</span>
          )}
          {!isEmpty && (
            <span className={`text-xs font-semibold ${day.isToday ? 'text-slate-300' : 'text-slate-500'}`}>
              {used}/{CAPACITY_MAX}pt
            </span>
          )}
        </div>
      </div>

      {/* Sites */}
      <div className="flex-1 p-2 space-y-1.5">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-8 gap-1">
            <svg className="w-5 h-5 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs text-slate-300 font-medium">Disponible</span>
          </div>
        ) : (
          siteList.map(([site, missions]) => (
            <SiteSection
              key={site}
              site={site}
              missions={missions}
              isToday={!!day.isToday}
              defaultOpen={!!day.isToday}
            />
          ))
        )}
      </div>

      {/* Capacity bar */}
      {!isEmpty && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-100">
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${color.bar}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Morning checklist ──────────────────────────────────────────────────────
function MorningChecklist({ missions }: { missions: WeekMission[] }) {
  if (missions.length === 0) return null;
  const totalBCs = missions.reduce((s, m) => s + (m.validated_bcs?.length ?? 0), 0);
  const totalDocs = missions.length + totalBCs;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">🖨️</span>
        <div>
          <div className="font-bold text-amber-900">Documents à imprimer — aujourd&apos;hui {TODAY_DATE}</div>
          <div className="text-xs text-amber-700 mt-0.5">
            {totalDocs} document{totalDocs > 1 ? 's' : ''}&nbsp;:&nbsp;
            {missions.length} OT{missions.length > 1 ? 's' : ''}
            {totalBCs > 0 && ` + ${totalBCs} BC${totalBCs > 1 ? 's' : ''} validé${totalBCs > 1 ? 's' : ''}`}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {missions.map((m) => (
          <div key={m.id} className="bg-white rounded-lg border border-amber-200 px-4 py-3">
            <div className="text-sm font-semibold text-slate-800 mb-2">
              {m.title}
              <span className="text-slate-400 font-normal"> · {m.site}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/ordres-de-travail/${m.ot_id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Ordre de Travail
              </Link>
              {m.validated_bcs?.map((bc) => (
                <Link
                  key={bc.id}
                  href={`/bons-de-commande/${bc.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {bc.po} ✓
                </Link>
              ))}
              {(!m.validated_bcs || m.validated_bcs.length === 0) && (
                <span className="text-xs text-amber-600 italic">Aucun BC — pas de matériel commandé</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function PlanningPage() {
  const todayMissions = WEEK_PLAN.find(d => d.isToday)?.missions ?? [];
  const totalMissions = WEEK_PLAN.reduce((s, d) => s + d.missions.length, 0);
  const capacityUsed = todayMissions.reduce((s, m) => s + m.points, 0);
  const capacityPct = Math.round((capacityUsed / CAPACITY_MAX) * 100);
  const todayColor = capacityColor(capacityPct);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link
              href="/dashboard/electricien"
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              ← Mon espace
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Planning semaine {WEEK_NUM}</h1>
          <p className="text-slate-500 mt-0.5 text-sm">{ELECTRICIAN_NAME} · {WEEK_LABEL}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${todayColor.bg} ${todayColor.text}`}>
            <span>Charge auj.</span>
            <span className="font-bold">{capacityUsed}/{CAPACITY_MAX} pts ({capacityPct}%)</span>
          </div>
        </div>
      </div>

      {/* Week summary bar */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {WEEK_PLAN.map(day => {
          const used = day.missions.reduce((s, m) => s + m.points, 0);
          const pct = Math.round((used / CAPACITY_MAX) * 100);
          const color = capacityColor(pct);
          return (
            <div
              key={day.key}
              className={`rounded-lg border px-3 py-2 text-center ${
                day.isToday
                  ? 'bg-slate-900 border-slate-900'
                  : day.isPast
                  ? 'bg-slate-50 border-slate-100 opacity-60'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className={`text-xs font-semibold ${day.isToday ? 'text-white' : 'text-slate-500'}`}>{day.label}</div>
              <div className={`text-lg font-bold mt-0.5 ${day.isToday ? 'text-white' : day.missions.length === 0 ? 'text-slate-300' : 'text-slate-800'}`}>
                {day.missions.length}
              </div>
              <div className={`text-xs ${day.isToday ? 'text-slate-300' : 'text-slate-400'}`}>mission{day.missions.length !== 1 ? 's' : ''}</div>
              {day.missions.length > 0 && (
                <div className={`text-xs font-medium mt-0.5 ${day.isToday ? 'text-amber-300' : color.text}`}>{used}pt</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Morning checklist for today */}
      <MorningChecklist missions={todayMissions} />

      {/* Day cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Vue détaillée — {totalMissions} mission{totalMissions !== 1 ? 's' : ''} cette semaine
          </h2>
          <span className="text-xs text-slate-400">
            1 pt = panne simple · 3 pts = réparation · 5 pts = travaux
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {WEEK_PLAN.map((day) => (
            <DayCard key={day.key} day={day} />
          ))}
        </div>
      </div>

      {/* Weekly capacity bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-medium text-slate-900">Charge hebdomadaire</div>
            <div className="text-xs text-slate-400 mt-0.5">Capacité max : {CAPACITY_MAX} pts/jour</div>
          </div>
        </div>
        <div className="space-y-2">
          {WEEK_PLAN.map(day => {
            const used = day.missions.reduce((s, m) => s + m.points, 0);
            const pct = Math.round((used / CAPACITY_MAX) * 100);
            const color = capacityColor(pct);
            return (
              <div key={day.key} className="flex items-center gap-3">
                <span className={`text-xs font-semibold w-8 shrink-0 ${day.isToday ? 'text-slate-900' : day.isPast ? 'text-slate-300' : 'text-slate-500'}`}>
                  {day.label.slice(0, 3)}
                </span>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${day.isPast ? 'bg-slate-300' : color.bar}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <span className={`text-xs w-12 text-right shrink-0 ${day.isPast ? 'text-slate-300' : color.text} font-medium`}>
                  {used}/{CAPACITY_MAX} pt
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
