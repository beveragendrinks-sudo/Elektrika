'use client';

import Link from 'next/link';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface BCRow {
  id: string;
  po_number: string;
  status: string;
  amount: number;
  entity: string;
  demande_title: string;
  date: string;
  demande_id?: string;
}

const MOCK_BCS: BCRow[] = [
  { id: 'bc-1', po_number: 'BC-LAD-2026-000041',  status: 'draft',     amount: 742.5,   entity: 'LAD',  demande_title: 'Remplacement variateur V-08',     date: '2026-06-30', demande_id: 'd1' },
  { id: 'bc-5', po_number: 'BC-BTFI-2026-000035', status: 'draft',     amount: 3200,    entity: 'BTFI', demande_title: 'Installation armoire TGBT',      date: '2026-06-15' },
  { id: 'bc-3', po_number: 'BC-FAD-2026-000027',  status: 'sent',      amount: 1380,    entity: 'FAD',  demande_title: 'Remplacement pompe hydraulique P-12', date: '2026-07-01', demande_id: 'd7' },
  { id: 'bc-4', po_number: 'BC-FAD-2026-000039',  status: 'sent',      amount: 620,     entity: 'FAD',  demande_title: 'Remplacement moteur pompe P-12',  date: '2026-06-18', demande_id: '2' },
  { id: 'bc-2', po_number: 'BC-LAD-2026-000038',  status: 'confirmed', amount: 320,     entity: 'LAD',  demande_title: 'Câblage armoire AT-04',            date: '2026-06-25', demande_id: 'd3' },
  { id: 'bc-6', po_number: 'BC-FAD-2026-000040',  status: 'received',  amount: 1840,    entity: 'FAD',  demande_title: 'Tableau distribution atelier B',  date: '2026-06-20' },
];

const STATUS_LABEL: Record<string, string> = {
  draft:     'À valider',
  sent:      'Envoyé',
  confirmed: 'Confirmé',
  received:  'Reçu',
  cancelled: 'Annulé',
};

const STATUS_COLOR: Record<string, string> = {
  draft:     'bg-amber-100 text-amber-700',
  sent:      'bg-blue-100 text-blue-700',
  confirmed: 'bg-violet-100 text-violet-700',
  received:  'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

type Filter = 'all' | 'draft' | 'sent' | 'confirmed' | 'received';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',       label: 'Tous' },
  { key: 'draft',     label: 'À valider' },
  { key: 'sent',      label: 'Envoyés' },
  { key: 'confirmed', label: 'Confirmés' },
  { key: 'received',  label: 'Reçus' },
];

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function BCsInner() {
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    const f = searchParams.get('filter') as Filter | null;
    if (f && ['all', 'draft', 'sent', 'confirmed', 'received'].includes(f)) {
      setFilter(f);
    }
  }, [searchParams]);

  const counts: Record<string, number> = {
    draft:     MOCK_BCS.filter(b => b.status === 'draft').length,
    sent:      MOCK_BCS.filter(b => b.status === 'sent').length,
    confirmed: MOCK_BCS.filter(b => b.status === 'confirmed').length,
    received:  MOCK_BCS.filter(b => b.status === 'received').length,
  };

  const visible = filter === 'all' ? MOCK_BCS : MOCK_BCS.filter(b => b.status === filter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bons de commande</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {MOCK_BCS.length} bons de commande
            {counts.draft > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                · {counts.draft} en attente de validation
              </span>
            )}
          </p>
        </div>
        <Link
          href="/bons-de-commande/new"
          className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          + Nouveau BC
        </Link>
      </div>

      {/* Filtres / onglets */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(f => {
          const cnt = f.key === 'all' ? MOCK_BCS.length : counts[f.key] ?? 0;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900'
              }`}
            >
              {f.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {cnt}
              </span>
            </button>
          );
        })}
      </div>

      {/* Résumé visuel par statut */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: 'draft',     label: 'À valider',  color: 'bg-amber-50 border-amber-200 text-amber-800' },
          { key: 'sent',      label: 'Envoyés',    color: 'bg-blue-50 border-blue-200 text-blue-800' },
          { key: 'confirmed', label: 'Confirmés',  color: 'bg-violet-50 border-violet-200 text-violet-800' },
          { key: 'received',  label: 'Reçus',      color: 'bg-green-50 border-green-200 text-green-800' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key as Filter)}
            className={`rounded-xl border px-4 py-3 text-left transition-all hover:opacity-80 ${s.color} ${
              filter === s.key ? 'ring-2 ring-offset-1 ring-current' : ''
            }`}
          >
            <div className="text-2xl font-bold">{counts[s.key] ?? 0}</div>
            <div className="text-xs font-medium mt-0.5">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {visible.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            Aucun bon de commande dans ce statut.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visible.map((bc) => (
              <Link
                key={bc.id}
                href={`/bons-de-commande/${bc.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {bc.po_number}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {bc.demande_title}
                    {bc.demande_id && (
                      <span className="ml-1.5 font-medium text-slate-400">· {bc.entity}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-slate-700 tabular-nums hidden sm:block">
                    {bc.amount.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} TND
                  </span>
                  <span className="text-xs text-slate-400 w-20 text-right hidden sm:block">
                    {fmtDate(bc.date)}
                  </span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOR[bc.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {STATUS_LABEL[bc.status] ?? bc.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BonsDeCommandePage() {
  return (
    <Suspense fallback={<div className="animate-pulse space-y-4"><div className="h-10 bg-slate-100 rounded-xl" /><div className="h-40 bg-slate-100 rounded-xl" /></div>}>
      <BCsInner />
    </Suspense>
  );
}
