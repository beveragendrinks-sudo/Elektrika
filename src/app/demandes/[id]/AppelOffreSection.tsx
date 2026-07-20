'use client';

import { useState } from 'react';
import {
  getVendorsForCategory,
  getQuotesForIntervention,
  type ApprovedVendor,
  type QuoteRequest,
} from '@/lib/quoteData';
import type { InterventionCategory } from '@/types';

const QUOTE_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  sent:     { label: 'En attente',  cls: 'bg-blue-100 text-blue-700' },
  received: { label: 'Devis reçu',  cls: 'bg-violet-100 text-violet-700' },
  selected: { label: 'Sélectionné', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Non retenu',  cls: 'bg-slate-100 text-slate-500' },
};

const FILE_SOURCE_ICON: Record<string, string> = {
  email:  '📧',
  upload: '📎',
  camera: '📷',
};

interface Props {
  interventionId: string;
  interventionRef: string;
  category: InterventionCategory;
}

export default function AppelOffreSection({ interventionId, interventionRef, category }: Props) {
  const vendors = getVendorsForCategory(category, 'prestataire');
  const [quotes, setQuotes] = useState<QuoteRequest[]>(() => getQuotesForIntervention(interventionId));
  const [sending, setSending]   = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const [compareView, setCompareView] = useState(false);

  const sentVendorIds = new Set(quotes.map(q => q.vendorId));
  const unsolicited   = vendors.filter(v => !sentVendorIds.has(v.id));
  const receivedQuotes = quotes.filter(q => q.status === 'received' || q.status === 'selected' || q.status === 'rejected');
  const canValidate    = receivedQuotes.length >= 2;
  const selectedQuote  = quotes.find(q => q.status === 'selected');

  function handleSend(vendor: ApprovedVendor) {
    setSending(vendor.id);
    setTimeout(() => {
      setQuotes(prev => [...prev, {
        id: `q-new-${vendor.id}-${Date.now()}`,
        interventionId,
        interventionRef,
        vendorId:    vendor.id,
        vendorName:  vendor.name,
        vendorEmail: vendor.email,
        sentAt:      new Date().toISOString(),
        currency:    'TND',
        status:      'sent',
      }]);
      setSending(null);
    }, 800);
  }

  function handleSimulateReceive(quoteId: string) {
    const amount = Math.round(1200 + Math.random() * 3000);
    setQuotes(prev => prev.map(q =>
      q.id === quoteId
        ? { ...q, status: 'received', receivedAt: new Date().toISOString(), amount, fileSource: 'email' }
        : q,
    ));
  }

  function handleSelect(quoteId: string) {
    setQuotes(prev => prev.map(q => ({
      ...q,
      status:
        q.id === quoteId  ? 'selected'
        : q.status === 'received' ? 'rejected'
        : q.status,
    })));
  }

  function handleValidate() {
    setValidated(true);
  }

  if (validated) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4">
        <div className="text-sm font-semibold text-green-800">
          ✓ Appel d&apos;offres clôturé — passage en préparation
        </div>
        <div className="text-xs text-green-700 mt-1">
          Prestataire retenu : <span className="font-medium">{selectedQuote?.vendorName}</span>
          {selectedQuote?.amount && <> · {selectedQuote.amount.toLocaleString('fr-TN')} TND</>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-orange-50 border-b border-orange-200 flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-orange-900 text-sm">Appel d&apos;offres — Devis prestataires</div>
          <div className="text-xs text-orange-700 mt-0.5">
            {receivedQuotes.length} devis reçu{receivedQuotes.length !== 1 ? 's' : ''} sur {quotes.length} sollicité{quotes.length !== 1 ? 's' : ''} · Minimum 2 requis pour valider
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            selectedQuote
              ? 'bg-green-100 text-green-700'
              : canValidate
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-orange-100 text-orange-700'
          }`}>
            {selectedQuote
              ? '✓ Prestataire sélectionné'
              : canValidate
              ? '✓ Prêt à valider'
              : `⏳ ${Math.max(0, 2 - receivedQuotes.length)} manquant${2 - receivedQuotes.length > 1 ? 's' : ''}`}
          </span>
          {receivedQuotes.length >= 2 && (
            <button
              onClick={() => setCompareView(v => !v)}
              className="text-[10px] px-2.5 py-1 rounded-lg border border-orange-300 text-orange-700 hover:bg-orange-100 transition-colors shrink-0"
            >
              {compareView ? '☰ Liste' : '⇔ Comparer'}
            </button>
          )}
        </div>
      </div>

      {!compareView ? (
        <>
          {/* Quote requests */}
          {quotes.length > 0 && (
            <div className="divide-y divide-slate-100">
              {quotes.map(q => (
                <div key={q.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800">{q.vendorName}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {q.vendorEmail}
                      {q.receivedAt && q.amount && (
                        <>
                          {' · '}
                          <span className="font-semibold text-slate-700">
                            {q.amount.toLocaleString('fr-TN')} TND
                          </span>
                          {q.fileSource && <> · {FILE_SOURCE_ICON[q.fileSource]} {q.fileSource}</>}
                        </>
                      )}
                      {!q.receivedAt && (
                        <> · Envoyé le {new Date(q.sentAt).toLocaleDateString('fr-TN', { day: '2-digit', month: '2-digit' })}</>
                      )}
                    </div>
                    {q.notes && (
                      <div className="text-xs text-slate-500 mt-0.5 italic">&quot;{q.notes}&quot;</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${QUOTE_STATUS_BADGE[q.status]?.cls}`}>
                      {QUOTE_STATUS_BADGE[q.status]?.label}
                    </span>
                    {q.status === 'sent' && (
                      <button
                        onClick={() => handleSimulateReceive(q.id)}
                        className="text-[10px] px-2 py-0.5 rounded border border-violet-200 text-violet-600 hover:bg-violet-50 transition-colors"
                        title="Simuler réception devis"
                      >
                        + Reçu
                      </button>
                    )}
                    {q.status === 'received' && canValidate && !selectedQuote && (
                      <button
                        onClick={() => handleSelect(q.id)}
                        className="text-[10px] px-2.5 py-1 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 font-medium transition-colors"
                      >
                        Sélectionner
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Unsolicited vendors */}
          {unsolicited.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-3 bg-slate-50">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                Prestataires agréés non sollicités
              </div>
              <div className="space-y-2">
                {unsolicited.map(v => (
                  <div key={v.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-700">{v.name}</div>
                      <div className="text-xs text-slate-400">{v.email}</div>
                    </div>
                    <button
                      onClick={() => handleSend(v)}
                      disabled={sending === v.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50 transition-colors shrink-0 flex items-center gap-1.5"
                    >
                      {sending === v.id ? '⏳ Envoi…' : <><span>📧</span> Demander devis</>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {quotes.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              Aucune demande de devis envoyée — sollicitez les prestataires agréés ci-dessus
            </div>
          )}
        </>
      ) : (
        /* Vue comparative */
        <div className="p-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
            Comparatif des devis reçus
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold">Prestataire</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold">Montant</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold">Délai réponse</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold">Source</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold">Statut</th>
                  {canValidate && !selectedQuote && <th className="px-3 py-2.5"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receivedQuotes.map((q, idx) => {
                  const delayH = q.receivedAt
                    ? Math.round((new Date(q.receivedAt).getTime() - new Date(q.sentAt).getTime()) / 3_600_000)
                    : null;
                  const isLowest = receivedQuotes
                    .filter(x => x.amount)
                    .every(x => x.id === q.id || (q.amount ?? Infinity) <= (x.amount ?? Infinity));
                  return (
                    <tr
                      key={q.id}
                      className={`${idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'} ${q.status === 'selected' ? 'ring-2 ring-green-400 ring-inset' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{q.vendorName}</div>
                        <div className="text-xs text-slate-400">{q.vendorEmail}</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {q.amount ? (
                          <div>
                            <div className={`font-bold tabular-nums ${isLowest && receivedQuotes.length > 1 ? 'text-green-600' : 'text-slate-800'}`}>
                              {q.amount.toLocaleString('fr-TN')} TND
                            </div>
                            {isLowest && receivedQuotes.length > 1 && (
                              <div className="text-[10px] text-green-600">✓ Moins cher</div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-600">
                        {delayH !== null ? `${delayH}h` : '—'}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {q.fileSource ? (
                          <span className="text-base">{FILE_SOURCE_ICON[q.fileSource]}</span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${QUOTE_STATUS_BADGE[q.status]?.cls}`}>
                          {QUOTE_STATUS_BADGE[q.status]?.label}
                        </span>
                      </td>
                      {canValidate && !selectedQuote && (
                        <td className="px-3 py-3 text-center">
                          {q.status === 'received' && (
                            <button
                              onClick={() => handleSelect(q.id)}
                              className="text-[10px] px-2.5 py-1 rounded-lg bg-green-700 text-white hover:bg-green-600 font-medium transition-colors"
                            >
                              Sélectionner
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {receivedQuotes.some(q => q.amount) && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td className="px-4 py-2 text-xs font-semibold text-slate-600">Écart de prix</td>
                    <td className="px-3 py-2 text-center" colSpan={4}>
                      {(() => {
                        const amounts = receivedQuotes.filter(q => q.amount).map(q => q.amount!);
                        if (amounts.length < 2) return null;
                        const diff = Math.max(...amounts) - Math.min(...amounts);
                        const pct  = Math.round((diff / Math.min(...amounts)) * 100);
                        return (
                          <span className="text-xs font-semibold text-amber-700">
                            {diff.toLocaleString('fr-TN')} TND (+{pct}% entre min et max)
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Validation gate — directeur selects winner */}
      {selectedQuote && (
        <div className="border-t border-green-200 bg-green-50 px-5 py-4">
          <div className="text-sm font-semibold text-green-800 mb-0.5">
            Prestataire retenu : {selectedQuote.vendorName}
          </div>
          <div className="text-xs text-green-700 mb-3">
            Montant devis : {selectedQuote.amount?.toLocaleString('fr-TN')} TND
            {' · '}
            {receivedQuotes.length} devis comparés
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleValidate}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors"
            >
              Valider et passer en préparation
            </button>
            <span className="text-xs text-green-600">Directeur d&apos;entité</span>
          </div>
        </div>
      )}

      {!selectedQuote && canValidate && (
        <div className="border-t border-emerald-100 bg-emerald-50 px-5 py-3">
          <div className="text-xs text-emerald-700">
            ✓ {receivedQuotes.length} devis reçus — sélectionnez le prestataire retenu pour valider
          </div>
        </div>
      )}
    </div>
  );
}
