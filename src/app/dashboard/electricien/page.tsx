'use client';

import { useState } from 'react';
import type { RequestStatus, InterventionCategory } from '@/types';
import Link from 'next/link';
import FilterBar from '@/components/FilterBar';
import type { ActiveCategories, ActiveTypes } from '@/components/FilterBar';
import { WEEK_PLAN, TYPE_LABEL, TYPE_COLOR } from '@/lib/weekPlanData';
import type { WeekMission, WeekDay } from '@/lib/weekPlanData';

const ELECTRICIAN_NAME = 'Mohamed Salah';
const CAPACITY_MAX = 10;
const TODAY_DATE = '02/07';

// ── Types ──────────────────────────────────────────────────────────────────
interface ActiveDemande {
  id: string;
  ot_id?: string;
  title: string;
  site: string;
  status: RequestStatus;
  type: 1 | 2 | 3;
  category: InterventionCategory;
  hours: number;
  hours_in_status: number;
  mission_date?: string;
}

// ── Mock data ──────────────────────────────────────────────────────────────
// WEEK_PLAN, TYPE_LABEL, TYPE_COLOR are imported from @/lib/weekPlanData

// Categories this prestataire is qualified to handle
const ALLOWED_CATEGORIES: InterventionCategory[] = ['electricite'];

const MY_DEMANDES: ActiveDemande[] = [
  { id: '1',  ot_id: 'ot-1', title: 'Panne tableau TGS-B2',             site: 'Siège Ben Arous',           status: 'clarification',                 type: 1, category: 'electricite', hours: 6,  hours_in_status: 6 },
  { id: '2',  ot_id: 'ot-2', title: 'Remplacement fusible armoire B3',  site: 'Siège Ben Arous',           status: 'in_progress',                   type: 1, category: 'electricite', hours: 3,  hours_in_status: 3 },
  { id: '3',  ot_id: 'ot-3', title: 'Câblage armoire AT-04',            site: 'Siège Ben Arous',           status: 'completed_pending_confirmation', type: 3, category: 'electricite', hours: 0,  hours_in_status: 52 },
  { id: '4',  ot_id: 'ot-4', title: 'Disjoncteur Atelier C',            site: 'Pôle Industriel Jbel Oust', status: 'planned',                       type: 1, category: 'electricite', hours: 0,  hours_in_status: 2, mission_date: '2026-07-02' },
  { id: '5',  ot_id: 'ot-5', title: 'Remplacement variateur V-08',      site: 'Megrine',                   status: 'preparation',                   type: 2, category: 'electricite', hours: 0,  hours_in_status: 18 },
  { id: '8',  ot_id: 'ot-8', title: 'Vérification tableau BT',          site: 'Pôle Industriel Jbel Oust', status: 'in_progress',                   type: 2, category: 'electricite', hours: 5,  hours_in_status: 5 },
  { id: '9',  ot_id: undefined, title: 'Maintenance préventive armoire P2', site: 'Pôle Industriel Jbel Oust', status: 'ready_to_plan',              type: 3, category: 'electricite', hours: 0,  hours_in_status: 3 },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const STATUS_LABEL: Partial<Record<RequestStatus, string>> = {
  clarification:                  'Clarification',
  preparation:                    'Préparation',
  awaiting_materials:             'Attente matériaux',
  ready_to_plan:                  'Prête à planifier',
  planned:                        'Planifiée',
  in_progress:                    'En cours',
  completed_pending_confirmation: 'À confirmer',
};

const STATUS_COLOR: Partial<Record<RequestStatus, string>> = {
  clarification:                  'bg-yellow-100 text-yellow-700',
  preparation:                    'bg-blue-100 text-blue-700',
  awaiting_materials:             'bg-orange-100 text-orange-700',
  ready_to_plan:                  'bg-violet-100 text-violet-700',
  planned:                        'bg-indigo-100 text-indigo-700',
  in_progress:                    'bg-cyan-100 text-cyan-700',
  completed_pending_confirmation: 'bg-teal-100 text-teal-700',
};


function capacityColor(pct: number) {
  if (pct >= 90) return { bar: 'bg-red-400', text: 'text-red-600' };
  if (pct >= 70) return { bar: 'bg-amber-400', text: 'text-amber-600' };
  return { bar: 'bg-green-400', text: 'text-green-600' };
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

// ── SLA thresholds (heures dans le statut avant alerte / escalade) ─────────
const SLA_BY_STATUS: Partial<Record<RequestStatus, { warn: number; escalate: number; label: string }>> = {
  clarification:                 { warn: 4,  escalate: 24, label: 'Clarification sans réponse' },
  preparation:                   { warn: 24, escalate: 72, label: 'Préparation prolongée' },
  planned:                       { warn: 24, escalate: 72, label: 'Démarrage non confirmé' },
  completed_pending_confirmation:{ warn: 24, escalate: 48, label: 'Confirmation demandeur attendue' },
};

const SLA_IN_PROGRESS: Record<1 | 2 | 3, { warn: number; escalate: number }> = {
  1: { warn: 2,  escalate: 6  },  // panne simple
  2: { warn: 8,  escalate: 24 },  // réparation
  3: { warn: 24, escalate: 72 },  // travaux
};

type AlertLevel = 'escalate' | 'warn' | null;

function getAlertLevel(d: ActiveDemande): AlertLevel {
  const h = d.hours_in_status;
  if (d.status === 'in_progress') {
    const s = SLA_IN_PROGRESS[d.type];
    if (h >= s.escalate) return 'escalate';
    if (h >= s.warn)     return 'warn';
    return null;
  }
  const s = SLA_BY_STATUS[d.status];
  if (!s) return null;
  if (h >= s.escalate) return 'escalate';
  if (h >= s.warn)     return 'warn';
  return null;
}

function getAlertMessage(d: ActiveDemande): string {
  const h = d.hours_in_status;
  const level = getAlertLevel(d);
  if (!level) return '';
  if (d.status === 'in_progress') {
    const s = SLA_IN_PROGRESS[d.type];
    const threshold = level === 'escalate' ? s.escalate : s.warn;
    return `En cours depuis ${h}h · seuil ${TYPE_LABEL[d.type]} : ${threshold}h`;
  }
  const s = SLA_BY_STATUS[d.status]!;
  const threshold = level === 'escalate' ? s.escalate : s.warn;
  return `${s.label} · ${h}h dans ce statut · seuil : ${threshold}h`;
}

// ── Morning documents checklist ────────────────────────────────────────────
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
            {totalDocs} document{totalDocs > 1 ? 's' : ''} à préparer&nbsp;:&nbsp;
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

// ── Site section inside a day card ─────────────────────────────────────────
function SiteSection({
  site, missions, isToday, defaultOpen,
}: {
  site: string; missions: WeekMission[]; isToday: boolean; defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const hasBCs = missions.some(m => (m.validated_bcs?.length ?? 0) > 0);

  return (
    <div className="rounded-lg overflow-hidden border border-slate-100">
      {/* Site header — clickable */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors ${
          isToday
            ? 'bg-slate-800 hover:bg-slate-700 text-white'
            : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
        }`}
      >
        {/* Pin icon */}
        <svg className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isToday ? 'text-amber-300' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-bold leading-tight truncate ${isToday ? 'text-white' : 'text-slate-800'}`}>
            {site}
          </div>
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

      {/* Expanded missions list */}
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

// ── Week planning day card — site-first view ───────────────────────────────
function DayCard({ day }: { day: WeekDay }) {
  const used = day.missions.reduce((s, m) => s + m.points, 0);
  const pct = Math.round((used / CAPACITY_MAX) * 100);
  const color = capacityColor(pct);
  const isEmpty = day.missions.length === 0;
  const siteGroups = groupBySite(day.missions);
  const siteList = Array.from(siteGroups.entries());
  const uniqueSites = siteList.length;

  return (
    <div className={`rounded-xl border flex flex-col overflow-hidden ${
      day.isToday
        ? 'border-slate-900 shadow-md'
        : day.isPast
        ? 'border-slate-100 bg-slate-50/70 opacity-70'
        : 'border-slate-200 bg-white'
    }`}>
      {/* Day header */}
      <div className={`px-3 py-2 flex items-center justify-between ${
        day.isToday ? 'bg-slate-900' : day.isPast ? 'bg-slate-100' : 'bg-white border-b border-slate-100'
      }`}>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-sm font-bold ${day.isToday ? 'text-white' : 'text-slate-700'}`}>{day.shortLabel}</span>
          <span className={`text-xs ${day.isToday ? 'text-slate-300' : 'text-slate-400'}`}>{day.date}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {day.isToday && (
            <span className="text-xs bg-amber-400 text-slate-900 font-bold px-1.5 py-0.5 rounded">Auj.</span>
          )}
          {!isEmpty && (
            <span className={`text-xs font-semibold ${day.isToday ? 'text-slate-300' : 'text-slate-500'}`}>
              {uniqueSites} site{uniqueSites > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Sites */}
      <div className="flex-1 p-2 space-y-1.5">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-6 gap-1">
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
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">Charge</span>
            <span className={`text-xs font-bold ${color.text}`}>{used}/{CAPACITY_MAX} pts</span>
          </div>
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

// ── Main component ─────────────────────────────────────────────────────────
export default function ElectricienDashboard() {
  const [selectedCategories, setSelectedCategories] = useState<ActiveCategories>([]);
  const [selectedTypes, setSelectedTypes] = useState<ActiveTypes>([]);

  const todayMissions = WEEK_PLAN.find((d) => d.isToday)?.missions ?? [];
  const capacityUsed = todayMissions.reduce((s, m) => s + m.points, 0);
  const capacityPct = Math.round((capacityUsed / CAPACITY_MAX) * 100);
  const todayColor = capacityColor(capacityPct);

  // Apply category + type filters to MY_DEMANDES
  const filteredDemandes = MY_DEMANDES.filter(d => {
    const catOk = selectedCategories.length === 0 || selectedCategories.includes(d.category);
    const typeOk = selectedTypes.length === 0 || selectedTypes.includes(d.type);
    return catOk && typeOk;
  });

  // Alertes : demandes dépassant leur SLA de statut
  const alertedDemandes = filteredDemandes.filter(d => getAlertLevel(d) !== null)
    .sort((a, b) => {
      const order = { escalate: 0, warn: 1, null: 2 };
      return (order[getAlertLevel(a) ?? 'null'] ?? 2) - (order[getAlertLevel(b) ?? 'null'] ?? 2);
    });

  // Résumé par statut
  const statusCounts: Partial<Record<RequestStatus, number>> = {};
  for (const d of filteredDemandes) {
    statusCounts[d.status] = (statusCounts[d.status] ?? 0) + 1;
  }
  const statusSummary = Object.entries(statusCounts) as [RequestStatus, number][];

  return (
    <div className="space-y-2">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mon espace — Prestataire de service</h1>
          <p className="text-slate-500 mt-0.5">{ELECTRICIAN_NAME} · {TODAY_DATE.split('/').reverse().join('/')} 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/planning"
            className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:border-slate-500 hover:text-slate-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Planning semaine
          </Link>
          <Link
            href="/demandes/new"
            className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            + Nouvelle demande
          </Link>
        </div>
      </div>

      {/* ── Mes cadrans ─────────────────────────────────────────────────────── */}
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Mes cadrans</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/demandes"
          className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 hover:bg-slate-100 transition-colors">
          <span className="text-xl">📁</span>
          <div>
            <div className="text-lg font-bold text-slate-900">{MY_DEMANDES.length}</div>
            <div className="text-xs text-slate-600 font-medium">Demandes affectées</div>
          </div>
        </Link>
        <button
          onClick={() => document.getElementById('section-alertes')?.scrollIntoView({ behavior: 'smooth' })}
          className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors text-left ${alertedDemandes.length > 0 ? 'bg-red-50 border border-red-200 hover:bg-red-100' : 'bg-green-50 border border-green-200 hover:bg-green-100'}`}>
          <span className="text-xl">{alertedDemandes.length > 0 ? '⚠️' : '✅'}</span>
          <div>
            <div className={`text-lg font-bold ${alertedDemandes.length > 0 ? 'text-red-800' : 'text-green-800'}`}>
              {alertedDemandes.length}
            </div>
            <div className={`text-xs font-medium ${alertedDemandes.length > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {alertedDemandes.length > 0 ? 'Alerte(s) active(s)' : 'Aucune alerte'}
            </div>
          </div>
        </button>
        <Link href="/bons-de-commande"
          className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 hover:bg-orange-100 transition-colors">
          <span className="text-xl">📋</span>
          <div>
            <div className="text-lg font-bold text-orange-900">1</div>
            <div className="text-xs text-orange-700 font-medium">BC en attente</div>
          </div>
        </Link>
        <Link href="/ordres-de-travail"
          className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 hover:bg-indigo-100 transition-colors">
          <span className="text-xl">📅</span>
          <div>
            <div className="text-lg font-bold text-indigo-900">{todayMissions.length}</div>
            <div className="text-xs text-indigo-700 font-medium">Missions aujourd&apos;hui</div>
          </div>
        </Link>
      </div>

      {/* ── Filtres demandes ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2 mt-2">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Filtrer mes demandes</h2>
          {(selectedCategories.length > 0 || selectedTypes.length > 0) && (
            <span className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{filteredDemandes.length}</span> / {MY_DEMANDES.length}
            </span>
          )}
        </div>
        <FilterBar
          selectedCategories={selectedCategories}
          selectedTypes={selectedTypes}
          onCategoriesChange={setSelectedCategories}
          onTypesChange={setSelectedTypes}
          allowedCategories={ALLOWED_CATEGORIES}
        />
      </div>

      {/* ── Résumé par statut ─────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 mt-2">
          Mes demandes — Répartition par statut
          {(selectedCategories.length > 0 || selectedTypes.length > 0) && (
            <span className="ml-2 text-blue-500 normal-case font-normal">— vue filtrée</span>
          )}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {statusSummary.map(([status, count]) => {
            const hasAlert = filteredDemandes.filter(d => d.status === status).some(d => getAlertLevel(d) !== null);
            return (
              <Link key={status} href="/demandes"
                className="bg-white rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors relative">
                {hasAlert && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-400" title="Alerte active" />
                )}
                <div className={`text-xs font-medium px-2 py-0.5 rounded w-fit mb-2 ${STATUS_COLOR[status] ?? 'bg-slate-100 text-slate-500'}`}>
                  {STATUS_LABEL[status] ?? status}
                </div>
                <div className="text-2xl font-bold text-slate-900">{count}</div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Alertes — Demandes dépassant leur SLA ───────────────────────── */}
      <div id="section-alertes">
        {alertedDemandes.length > 0 ? (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 mt-2">
              Alertes — Demandes en retard de traitement
            </h2>
            {alertedDemandes.map(d => {
              const level = getAlertLevel(d)!;
              const isEscalate = level === 'escalate';
              return (
                <div key={d.id}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${isEscalate ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <span className="text-lg shrink-0 mt-0.5">{isEscalate ? '🔴' : '⚠️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${isEscalate ? 'text-red-900' : 'text-amber-900'}`}>
                      {d.title}
                    </div>
                    <div className={`text-xs mt-0.5 ${isEscalate ? 'text-red-700' : 'text-amber-700'}`}>
                      {getAlertMessage(d)} · {d.site}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isEscalate ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {isEscalate ? 'ESCALADE' : 'ALERTE'}
                    </span>
                    {d.ot_id && (
                      <Link href={`/ordres-de-travail/${d.ot_id}`}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 text-slate-600 hover:border-slate-500 hover:text-slate-900 transition-colors font-medium">
                        OT
                      </Link>
                    )}
                    <Link href={`/demandes/${d.id}`}
                      className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 text-slate-600 hover:border-slate-500 hover:text-slate-900 transition-colors font-medium">
                      Voir
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mt-2">
            <div className="text-sm text-green-800 font-medium">✓ Aucune alerte — toutes vos demandes sont dans les délais</div>
          </div>
        )}
      </div>

      {/* 🖨️ Morning documents alert */}
      <div className="mt-2">
        <MorningChecklist missions={todayMissions} />
      </div>

      {/* Charge du jour */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium text-slate-900">Charge aujourd&apos;hui</div>
          <span className={`text-sm font-bold ${todayColor.text}`}>
            {capacityUsed} / {CAPACITY_MAX} pts ({capacityPct}%)
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${todayColor.bar}`}
            style={{ width: `${capacityPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <p className="text-xs text-slate-400">1 pt = panne simple · 3 pts = réparation · 5 pts = travaux lourds</p>
          <p className="text-xs text-slate-400">Capacité max : {CAPACITY_MAX} pts</p>
        </div>
      </div>

      {/* KPIs personnels */}
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mt-6 mb-3">Ma performance — Juillet 2026</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">Interventions complétées</div>
          <div className="text-3xl font-bold text-slate-900">11</div>
          <div className="text-xs text-slate-400">ce mois</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">Taux 1er passage</div>
          <div className="text-2xl font-bold text-green-600">93%</div>
          <div className="text-xs text-slate-400">1 re-intervention</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">Temps moyen</div>
          <div className="text-2xl font-bold text-blue-600">2.4<span className="text-base font-normal ml-0.5">h</span></div>
          <div className="text-xs text-slate-400">toutes pannes</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">Satisfaction</div>
          <div className="text-2xl font-bold text-green-600">★ 4.3<span className="text-sm font-normal text-slate-400"> / 5</span></div>
          <div className="text-xs text-slate-400">8 retours ce mois</div>
        </div>
      </div>

      {/* Planning semaine — vue par site */}
      <div className="flex items-center justify-between mt-6 mb-1">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Planning semaine 30/06 – 04/07</h2>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        Sites en vue directe · cliquer sur un site pour voir les missions et les Ordres de Travail
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {WEEK_PLAN.map((day) => (
          <DayCard key={day.key} day={day} />
        ))}
      </div>

      {/* Mes demandes en cours */}
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mt-6 mb-3">Mes demandes en cours</h2>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {MY_DEMANDES.map((d) => {
          const isPlanned = d.status === 'planned' || d.status === 'in_progress';
          return (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
              <Link href={`/demandes/${d.id}`} className="flex-1 min-w-0 group">
                <div className="font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">{d.title}</div>
                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                  <span>{d.site}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLOR[d.type]}`}>{TYPE_LABEL[d.type]}</span>
                  {d.mission_date && <span>📅 {d.mission_date.slice(5).replace('-', '/')}</span>}
                </div>
              </Link>

              <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOR[d.status] ?? 'bg-slate-100 text-slate-500'}`}>
                {STATUS_LABEL[d.status] ?? d.status}
              </span>

              {isPlanned && d.ot_id && (
                <Link
                  href={`/ordres-de-travail/${d.ot_id}`}
                  className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:border-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap flex items-center gap-1"
                  title="Voir / imprimer l'Ordre de Travail"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  OT
                </Link>
              )}

              {d.status === 'preparation' && (
                <Link
                  href={`/bons-de-commande/new?request_id=${d.id}`}
                  className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:border-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap"
                  title="Créer un Bon de Commande pour cette demande"
                >
                  + BC
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Mes BCs */}
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mt-6 mb-3">Mes bons de commande</h2>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {[
          { id: 'bc-1', po: 'BC-LAD-2026-000041', status: 'draft',     amount: 742.5, desc: 'Remplacement variateur V-08', demande: '#5' },
          { id: 'bc-2', po: 'BC-LAD-2026-000038', status: 'confirmed', amount: 320,   desc: 'Câblage armoire AT-04',      demande: '#3' },
        ].map((bc) => (
          <Link
            key={bc.id}
            href={`/bons-de-commande/${bc.id}`}
            className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
          >
            <div>
              <div className="text-sm font-medium text-slate-900">{bc.po}</div>
              <div className="text-xs text-slate-400">{bc.desc} · Demande {bc.demande}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-700">
                {bc.amount.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} TND
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full ${bc.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                {bc.status === 'draft' ? 'En attente' : 'Validé'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
