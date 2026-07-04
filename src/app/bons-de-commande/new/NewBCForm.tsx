'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────
interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
}

interface BCLine {
  _id: string;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
}

interface Props {
  requestId: string;
  demande: { title: string; site: string; type: string; entity: string; status: string } | null;
  suppliers: Supplier[];
  electricianName: string;
  entity: string;
}

const UNITS = ['pièce', 'ml', 'm²', 'kg', 'litre', 'heure', 'forfait', 'lot'];

function newLine(): BCLine {
  return { _id: crypto.randomUUID(), description: '', quantity: '1', unit: 'pièce', unit_price: '' };
}

function lineTotal(line: BCLine): number {
  const qty = parseFloat(line.quantity) || 0;
  const price = parseFloat(line.unit_price) || 0;
  return qty * price;
}

function fmt(n: number) {
  return n.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

// ── Component ──────────────────────────────────────────────────────────────
export default function NewBCForm({ requestId, demande, suppliers, electricianName, entity }: Props) {
  const router = useRouter();

  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<BCLine[]>([newLine()]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedSupplier = suppliers.find(s => s.id === supplierId) ?? null;
  const grandTotal = lines.reduce((s, l) => s + lineTotal(l), 0);

  // ── Line editing ──────────────────────────────────────────────────────────
  const updateLine = useCallback((id: string, field: keyof BCLine, value: string) => {
    setLines(prev => prev.map(l => l._id === id ? { ...l, [field]: value } : l));
  }, []);

  const addLine = useCallback(() => {
    setLines(prev => [...prev, newLine()]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines(prev => prev.length > 1 ? prev.filter(l => l._id !== id) : prev);
  }, []);

  // ── Validation ────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!supplierId) errs.supplier = 'Veuillez sélectionner un fournisseur.';

    const filledLines = lines.filter(l => l.description.trim() || l.unit_price);
    if (filledLines.length === 0) {
      errs.lines = 'Ajoutez au moins une ligne de commande.';
    } else {
      filledLines.forEach((l, i) => {
        if (!l.description.trim()) errs[`line_desc_${i}`] = 'Désignation requise.';
        if (!l.unit_price || parseFloat(l.unit_price) <= 0) errs[`line_price_${i}`] = 'Prix requis.';
      });
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Supabase insert ici — pour l'instant on simule avec un ID temporaire
      await new Promise(r => setTimeout(r, 800));
      const mockBcId = `bc-${Date.now()}`;
      router.push(`/bons-de-commande/${mockBcId}?preview=1&request_id=${requestId}&supplier_id=${supplierId}&total=${grandTotal.toFixed(3)}&entity=${entity}`);
    } catch {
      setErrors({ submit: 'Erreur lors de la création du bon de commande. Réessayez.' });
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Demande de référence */}
      {demande ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">Demande de référence</div>
          <div className="font-semibold text-slate-900">{demande.title}</div>
          <div className="text-sm text-slate-600 mt-1 flex flex-wrap gap-3">
            <span>📍 {demande.site}</span>
            <span>🔧 {demande.type}</span>
            <span>🏢 {demande.entity}</span>
          </div>
          <div className="mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{demande.status}</span>
          </div>
        </div>
      ) : requestId ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          Demande #{requestId} — détails non disponibles (Supabase non connecté).
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
          Aucune demande associée. Ce BC sera créé sans référence.
        </div>
      )}

      {/* Fournisseur */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-900">Fournisseur</h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Sélectionner le fournisseur <span className="text-red-500">*</span>
          </label>
          <div className="grid sm:grid-cols-2 gap-2">
            {suppliers.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setSupplierId(s.id); setErrors(e => ({ ...e, supplier: '' })); }}
                className={`text-left p-3 rounded-lg border text-sm transition-all ${
                  supplierId === s.id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 hover:border-slate-400 text-slate-700'
                }`}
              >
                <div className="font-medium">{s.name}</div>
                <div className={`text-xs mt-0.5 ${supplierId === s.id ? 'text-slate-300' : 'text-slate-400'}`}>
                  {s.contact} · {s.phone}
                </div>
              </button>
            ))}
          </div>
          {errors.supplier && <p className="text-red-500 text-xs mt-2">{errors.supplier}</p>}
        </div>
      </div>

      {/* Lignes de commande */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Désignation des matériaux / prestations</h2>
        </div>

        {/* Table header */}
        <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">
          <div className="col-span-5">Désignation</div>
          <div className="col-span-2 text-center">Qté</div>
          <div className="col-span-2">Unité</div>
          <div className="col-span-2 text-right">Prix U. (TND)</div>
          <div className="col-span-1"></div>
        </div>

        <div className="space-y-2">
          {lines.map((line, idx) => {
            const total = lineTotal(line);
            const descKey = `line_desc_${lines.filter((l, i) => i <= idx && (l.description.trim() || l.unit_price)).length - 1}`;
            const priceKey = `line_price_${lines.filter((l, i) => i <= idx && (l.description.trim() || l.unit_price)).length - 1}`;
            return (
              <div key={line._id} className="grid grid-cols-12 gap-2 items-start">
                {/* Désignation */}
                <div className="col-span-12 sm:col-span-5">
                  <input
                    type="text"
                    placeholder={`Ligne ${idx + 1} — ex : Câble H07V 6mm²`}
                    value={line.description}
                    onChange={e => updateLine(line._id, 'description', e.target.value)}
                    className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300 ${errors[descKey] ? 'border-red-400' : 'border-slate-200'}`}
                  />
                </div>

                {/* Quantité */}
                <div className="col-span-4 sm:col-span-2">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="1"
                    value={line.quantity}
                    onChange={e => updateLine(line._id, 'quantity', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                {/* Unité */}
                <div className="col-span-4 sm:col-span-2">
                  <select
                    value={line.unit}
                    onChange={e => updateLine(line._id, 'unit', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                {/* Prix unitaire */}
                <div className="col-span-3 sm:col-span-2">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="0.000"
                    value={line.unit_price}
                    onChange={e => updateLine(line._id, 'unit_price', e.target.value)}
                    className={`w-full text-sm border rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-slate-300 ${errors[priceKey] ? 'border-red-400' : 'border-slate-200'}`}
                  />
                </div>

                {/* Total ligne + supprimer */}
                <div className="col-span-1 flex flex-col items-end gap-1">
                  {total > 0 && (
                    <span className="text-xs font-medium text-slate-600 whitespace-nowrap">{fmt(total)}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeLine(line._id)}
                    disabled={lines.length === 1}
                    className="text-slate-300 hover:text-red-400 transition-colors disabled:opacity-0 text-lg leading-none"
                    title="Supprimer cette ligne"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {errors.lines && <p className="text-red-500 text-xs">{errors.lines}</p>}

        <button
          type="button"
          onClick={addLine}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          + Ajouter une ligne
        </button>

        {/* Total général */}
        <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-4">
          <span className="text-sm font-medium text-slate-600">Total estimé</span>
          <span className="text-xl font-bold text-slate-900">{fmt(grandTotal)} TND</span>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <label className="block text-sm font-medium text-slate-700 mb-2">Notes / remarques</label>
        <textarea
          rows={3}
          placeholder="Instructions de livraison, délai souhaité, conditions particulières…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>

      {/* Résumé avant envoi */}
      {supplierId && grandTotal > 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-sm space-y-1">
          <div className="font-medium text-slate-700 mb-2">Récapitulatif</div>
          <div className="flex justify-between">
            <span className="text-slate-500">Fournisseur</span>
            <span className="font-medium text-slate-800">{selectedSupplier?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Lignes</span>
            <span className="font-medium text-slate-800">{lines.filter(l => l.description.trim()).length} article{lines.filter(l => l.description.trim()).length > 1 ? 's' : ''}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Montant estimé</span>
            <span className="font-bold text-slate-900">{fmt(grandTotal)} TND</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Établi par</span>
            <span className="font-medium text-slate-800">{electricianName}</span>
          </div>
        </div>
      )}

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{errors.submit}</div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-slate-200 text-slate-700 text-sm font-medium py-3 rounded-xl hover:bg-slate-50 transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-slate-900 text-white text-sm font-semibold py-3 rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Création en cours…
            </>
          ) : (
            'Créer le Bon de Commande'
          )}
        </button>
      </div>
    </form>
  );
}
