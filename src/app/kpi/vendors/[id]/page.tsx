'use client';

import Link from 'next/link';
import { MOCK_APPROVED_VENDORS, MOCK_QUOTE_REQUESTS, computeVendorKPI } from '@/lib/quoteData';
import { CATEGORY_LABEL, CATEGORY_ICON } from '@/lib/interventionData';
import type { InterventionCategory } from '@/types';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  sent:     { label: 'En attente',  cls: 'bg-blue-100 text-blue-700' },
  received: { label: 'Devis reçu',  cls: 'bg-violet-100 text-violet-700' },
  selected: { label: 'Sélectionné', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Non retenu',  cls: 'bg-slate-100 text-slate-500' },
};

export default function VendorDetailPage({ params }: { params: { id: string } }) {
  const vendor = MOCK_APPROVED_VENDORS.find(v => v.id === params.id);

  if (!vendor) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">🔍</div>
        <div className="text-slate-600 font-medium mb-2">Vendor introuvable</div>
        <Link href="/kpi" className="text-blue-600 hover:underline text-sm">← KPI</Link>
      </div>
    );
  }

  const kpi    = computeVendorKPI(params.id);
  const quotes = MOCK_QUOTE_REQUESTS.filter(q => q.vendorId === params.id);
  const typeLabel = vendor.type === 'prestataire' ? 'Prestataire de service' : 'Fournisseur de matériaux';
  const accent = vendor.type === 'prestataire'
    ? { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' }
    : { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800' };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/kpi" className="hover:text-slate-900">KPI</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{vendor.name}</span>
      </div>

      {/* Header card */}
      <div className={`rounded-xl border p-5 ${accent.bg} ${accent.border}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${accent.text} opacity-60`}>{typeLabel}</div>
            <h1 className={`text-2xl font-bold ${accent.text}`}>{vendor.name}</h1>
            <div className="text-sm text-slate-600 mt-1">{vendor.email} · {vendor.phone}</div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {vendor.categories.map(cat => (
              <span key={cat} className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600">
                {CATEGORY_ICON[cat as InterventionCategory]} {CATEGORY_LABEL[cat as InterventionCategory]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Demandes envoyées', value: kpi.demandesEnvoyees, cls: 'bg-white border-slate-200 text-slate-800' },
          { label: 'Devis reçus',       value: kpi.devisRecus,       cls: 'bg-white border-slate-200 text-slate-800' },
          { label: 'Taux de réponse',   value: `${kpi.tauxReponse}%`, cls: kpi.tauxReponse >= 80 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800' },
          { label: 'Taux de victoire',  value: kpi.devisRecus > 0 ? `${kpi.tauxVictoire}%` : '—', cls: kpi.tauxVictoire >= 50 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-slate-50 border-slate-200 text-slate-700' },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.cls}`}>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs mt-1 opacity-60 leading-tight">{c.label}</div>
          </div>
        ))}
      </div>

      {kpi.delaiMoyenReponseH !== null && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xl font-bold text-slate-800">{kpi.delaiMoyenReponseH}h</div>
            <div className="text-xs text-slate-500 mt-1">Délai moyen de réponse</div>
          </div>
          {kpi.montantMoyenDevis !== null && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xl font-bold text-slate-800">{kpi.montantMoyenDevis.toLocaleString('fr-TN')} TND</div>
              <div className="text-xs text-slate-500 mt-1">Montant moyen des devis</div>
            </div>
          )}
        </div>
      )}

      {kpi.montantTotalGagne > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-800">{kpi.montantTotalGagne.toLocaleString('fr-TN')} TND</div>
          <div className="text-xs text-green-600 mt-0.5">Montant total des marchés remportés</div>
        </div>
      )}

      {/* Historique des devis */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 font-semibold text-slate-900 text-sm">
          Historique des demandes de devis ({quotes.length})
        </div>
        {quotes.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">Aucun devis enregistré</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {quotes.map(q => (
              <div key={q.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/demandes/${q.interventionId}`} className="text-sm font-medium text-blue-600 hover:underline font-mono">
                      {q.interventionRef || q.bcId || q.id}
                    </Link>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Envoyé le {new Date(q.sentAt).toLocaleDateString('fr-TN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    {q.receivedAt && (
                      <> · Répondu le {new Date(q.receivedAt).toLocaleDateString('fr-TN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</>
                    )}
                  </div>
                  {q.amount && (
                    <div className="text-xs font-semibold text-slate-700 mt-0.5">{q.amount.toLocaleString('fr-TN')} TND</div>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-lg shrink-0 ${STATUS_BADGE[q.status]?.cls}`}>
                  {STATUS_BADGE[q.status]?.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
