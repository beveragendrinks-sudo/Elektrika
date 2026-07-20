'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MOCK_APPROVED_VENDORS,
  MOCK_QUOTE_REQUESTS,
  computeVendorKPI,
  type QuoteRequest,
} from '@/lib/quoteData';
import { CATEGORY_LABEL, CATEGORY_ICON } from '@/lib/interventionData';
import type { InterventionCategory } from '@/types';

// ── Grouper les devis par intervention ──────────────────────────────────────
interface InterventionGroup {
  ref: string;
  interventionId: string;
  quotes: QuoteRequest[];
  receivedCount: number;
  selectedQuote: QuoteRequest | undefined;
  minAmount: number | null;
  maxAmount: number | null;
  category: InterventionCategory | null;
}

function buildGroups(): InterventionGroup[] {
  const byRef = new Map<string, QuoteRequest[]>();
  for (const q of MOCK_QUOTE_REQUESTS.filter(q => q.interventionRef)) {
    const list = byRef.get(q.interventionRef) ?? [];
    list.push(q);
    byRef.set(q.interventionRef, list);
  }
  const result: InterventionGroup[] = [];
  byRef.forEach((quotes, ref) => {
    const received   = quotes.filter(q => q.status !== 'sent');
    const amounts    = received.filter(q => q.amount).map(q => q.amount!);
    const vendor     = MOCK_APPROVED_VENDORS.find(v => v.id === quotes[0]?.vendorId);
    // on prend la catégorie de l'intervention depuis le premier vendor qui a une catégorie
    const category   = vendor?.categories[0] ?? null;
    result.push({
      ref,
      interventionId: quotes[0]?.interventionId ?? '',
      quotes,
      receivedCount: received.length,
      selectedQuote: quotes.find(q => q.status === 'selected'),
      minAmount: amounts.length > 0 ? Math.min(...amounts) : null,
      maxAmount: amounts.length > 0 ? Math.max(...amounts) : null,
      category,
    });
  });
  return result.sort((a, b) => b.receivedCount - a.receivedCount);
}

const GROUPS = buildGroups();

// ── Composant KPI cards ──────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs mt-0.5 opacity-70">{sub}</div>}
      <div className="text-xs mt-1 opacity-60 leading-tight">{label}</div>
    </div>
  );
}

export default function KpiDevisPage() {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'complete'>('all');

  const all         = MOCK_QUOTE_REQUESTS;
  const totalSent   = all.length;
  const totalRec    = all.filter(q => q.status !== 'sent').length;
  const totalSel    = all.filter(q => q.status === 'selected').length;
  const avgDelay    = (() => {
    const delays = all
      .filter(q => q.receivedAt)
      .map(q => (new Date(q.receivedAt!).getTime() - new Date(q.sentAt).getTime()) / 3_600_000);
    return delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b) / delays.length) : null;
  })();

  const groups = GROUPS.filter(g =>
    filterStatus === 'all'     ? true
    : filterStatus === 'pending' ? g.receivedCount < 2
    : filterStatus === 'complete' ? g.selectedQuote !== undefined
    : true,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/kpi" className="text-sm text-slate-400 hover:text-slate-700 transition-colors">← KPI</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-bold text-slate-900">Tableau des devis</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Demandes de devis envoyées" value={totalSent}  color="bg-blue-50 border-blue-200 text-blue-800" />
        <StatCard label="Devis reçus" value={totalRec} sub={`${Math.round(totalRec/totalSent*100)}% taux réponse`} color="bg-violet-50 border-violet-200 text-violet-800" />
        <StatCard label="Prestataires/fournisseurs sélectionnés" value={totalSel} color="bg-green-50 border-green-200 text-green-800" />
        <StatCard label="Délai moyen réponse" value={avgDelay !== null ? `${avgDelay}h` : '—'} color="bg-amber-50 border-amber-200 text-amber-800" />
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all',      label: 'Toutes les interventions' },
          { key: 'pending',  label: '⏳ En attente (< 2 devis)' },
          { key: 'complete', label: '✓ Validées' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key as typeof filterStatus)}
            className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${filterStatus === f.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-8 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <div className="col-span-2">Référence</div>
            <div className="text-center">Catég.</div>
            <div className="text-center">Envoyés</div>
            <div className="text-center">Reçus</div>
            <div className="text-center">Min TND</div>
            <div className="text-center">Max TND</div>
            <div className="text-center">Statut</div>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {groups.map(g => {
            const ecart = g.minAmount && g.maxAmount && g.maxAmount > g.minAmount
              ? Math.round(((g.maxAmount - g.minAmount) / g.minAmount) * 100)
              : null;
            return (
              <div key={g.ref} className="grid grid-cols-8 gap-2 px-5 py-3 items-center hover:bg-slate-50 transition-colors">
                <div className="col-span-2">
                  <Link href={`/demandes/${g.interventionId}`} className="text-sm font-medium text-blue-600 hover:underline font-mono">
                    {g.ref}
                  </Link>
                  <div className="text-xs text-slate-400 mt-0.5">{g.quotes.length} vendor{g.quotes.length > 1 ? 's' : ''} sollicité{g.quotes.length > 1 ? 's' : ''}</div>
                </div>
                <div className="text-center text-base" title={g.category ? CATEGORY_LABEL[g.category] : ''}>
                  {g.category ? CATEGORY_ICON[g.category] : '—'}
                </div>
                <div className="text-center text-sm font-medium text-slate-700">{g.quotes.length}</div>
                <div className="text-center">
                  <span className={`text-sm font-semibold ${g.receivedCount >= 2 ? 'text-green-600' : g.receivedCount === 1 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {g.receivedCount}
                  </span>
                  {g.receivedCount < 2 && (
                    <span className="text-[10px] text-slate-400 block">/ 2 min</span>
                  )}
                </div>
                <div className="text-center text-sm text-slate-600 tabular-nums">
                  {g.minAmount?.toLocaleString('fr-TN') ?? '—'}
                </div>
                <div className="text-center">
                  <span className="text-sm text-slate-600 tabular-nums">{g.maxAmount?.toLocaleString('fr-TN') ?? '—'}</span>
                  {ecart !== null && (
                    <span className="text-[10px] text-amber-600 block">+{ecart}%</span>
                  )}
                </div>
                <div className="text-center">
                  {g.selectedQuote ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-green-100 text-green-700">Sélectionné</span>
                  ) : g.receivedCount >= 2 ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700">Prêt</span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-orange-100 text-orange-700">En cours</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {groups.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400">Aucun résultat pour ce filtre</div>
        )}
      </div>
    </div>
  );
}
