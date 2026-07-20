'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  CATEGORY_ICON,
  CATEGORY_LABEL,
  CATEGORY_COLORS,
  type InterventionCategory,
} from '@/lib/interventionData';

// ── Types ──────────────────────────────────────────────────────────────────
export interface DemandeOption {
  id:       string;
  ref:      string;
  title:    string;
  site:     string;
  entity:   string;
  category: InterventionCategory;
}

interface Supplier {
  id:      string;
  name:    string;
  contact: string;
  phone:   string;
  email:   string;
}

interface BCLine {
  _id:        string;
  description: string;
  quantity:   string;
  unit:       string;
  unit_price: string;
}

interface DevisFile {
  id:     string;
  name:   string;
  size:   number;
  type:   'pdf' | 'image';
  source: 'upload' | 'camera';
}

interface Props {
  initialRequestId: string;
  demandesEnPrep:   DemandeOption[];
  suppliers:        Supplier[];
  electricianName:  string;
}

const UNITS = ['pièce', 'ml', 'm²', 'kg', 'litre', 'heure', 'forfait', 'lot'];

function newLine(): BCLine {
  return { _id: crypto.randomUUID(), description: '', quantity: '1', unit: 'pièce', unit_price: '' };
}

function lineTotal(l: BCLine): number {
  return (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0);
}

function fmt(n: number) {
  return n.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// ── Demande card ───────────────────────────────────────────────────────────
function DemandeCard({
  demande,
  selected,
  onClick,
}: {
  demande: DemandeOption;
  selected: boolean;
  onClick: () => void;
}) {
  const colors = CATEGORY_COLORS[demande.category];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 p-3.5 transition-all ${
        selected
          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
          : 'border-slate-200 hover:border-slate-400 bg-white'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            selected ? 'border-white bg-white' : 'border-slate-300'
          }`}
        >
          {selected && (
            <svg className="w-3 h-3 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${selected ? 'text-slate-400' : 'text-slate-400'}`}>
            {demande.ref}
          </div>
          <div className={`text-sm font-semibold leading-snug ${selected ? 'text-white' : 'text-slate-900'}`}>
            {demande.title}
          </div>
          <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
            <span>📍 {demande.site}</span>
            <span>🏢 {demande.entity}</span>
          </div>
          <div className="mt-2">
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              selected ? 'bg-white/10 border-white/20 text-white' : `${colors.badge}`
            }`}>
              {CATEGORY_ICON[demande.category]} {CATEGORY_LABEL[demande.category]}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Main form ──────────────────────────────────────────────────────────────
export default function NewBCForm({ initialRequestId, demandesEnPrep, suppliers, electricianName }: Props) {
  const router = useRouter();

  // ── Demande selection
  const [selectedDemandeId, setSelectedDemandeId] = useState(initialRequestId);
  const [pickerOpen, setPickerOpen] = useState(!initialRequestId);

  const selectedDemande = demandesEnPrep.find(d => d.id === selectedDemandeId) ?? null;

  function selectDemande(id: string) {
    setSelectedDemandeId(id);
    setPickerOpen(false);
  }

  // ── Order lines
  const [supplierId,  setSupplierId]  = useState('');
  const [lines,       setLines]       = useState<BCLine[]>([newLine()]);
  const [notes,       setNotes]       = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  // ── Devis (quotes)
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [devis, setDevis] = useState<DevisFile[]>([]);
  const [hasComparativeDevis, setHasComparativeDevis] = useState(false);
  const [singleDevisJustification, setSingleDevisJustification] = useState('');

  const selectedSupplier = suppliers.find(s => s.id === supplierId) ?? null;
  const grandTotal = lines.reduce((s, l) => s + lineTotal(l), 0);

  // ── Line helpers
  const updateLine = useCallback((id: string, field: keyof BCLine, value: string) =>
    setLines(prev => prev.map(l => l._id === id ? { ...l, [field]: value } : l)), []);

  const addLine = useCallback(() =>
    setLines(prev => [...prev, newLine()]), []);

  const removeLine = useCallback((id: string) =>
    setLines(prev => prev.length > 1 ? prev.filter(l => l._id !== id) : prev), []);

  // ── Devis helpers
  function handleFiles(files: FileList | null, source: 'upload' | 'camera') {
    if (!files) return;
    const mapped: DevisFile[] = Array.from(files).map(f => ({
      id:     crypto.randomUUID(),
      name:   f.name,
      size:   f.size,
      type:   f.type === 'application/pdf' ? 'pdf' : 'image',
      source,
    }));
    setDevis(prev => [...prev, ...mapped]);
    setErrors(e => ({ ...e, devis: '', devis_confirm: '' }));
    // Reset inputs so same file can be re-added
    if (fileInputRef.current)   fileInputRef.current.value   = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }

  function removeDevis(id: string) {
    setDevis(prev => {
      const next = prev.filter(f => f.id !== id);
      if (next.length < 2) setHasComparativeDevis(false);
      return next;
    });
  }

  // ── Validation
  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!selectedDemandeId) errs.demande = 'Veuillez sélectionner une demande d\'intervention.';
    if (!supplierId)         errs.supplier = 'Veuillez sélectionner un fournisseur.';

    const filled = lines.filter(l => l.description.trim() || l.unit_price);
    if (filled.length === 0) {
      errs.lines = 'Ajoutez au moins une ligne de commande.';
    } else {
      filled.forEach((l, i) => {
        if (!l.description.trim())                         errs[`line_desc_${i}`]  = 'Désignation requise.';
        if (!l.unit_price || parseFloat(l.unit_price) <= 0) errs[`line_price_${i}`] = 'Prix requis.';
      });
    }

    if (devis.length === 0) {
      errs.devis = 'Joignez au moins un devis fournisseur (PDF, image ou photo).';
    } else if (!hasComparativeDevis && !singleDevisJustification.trim()) {
      errs.devis_confirm = 'Cochez la case si 2 devis comparatifs ont été fournis, ou justifiez pourquoi un seul devis.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      const mockBcId = `bc-${Date.now()}`;
      router.push(
        `/bons-de-commande/${mockBcId}?preview=1&request_id=${selectedDemandeId}&supplier_id=${supplierId}&total=${grandTotal.toFixed(3)}&entity=${selectedDemande?.entity ?? ''}`
      );
    } catch {
      setErrors({ submit: 'Erreur lors de la création du bon de commande. Réessayez.' });
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── 1. Demande d'intervention ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              Demande d&apos;intervention <span className="text-red-500">*</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {demandesEnPrep.length} demande{demandesEnPrep.length !== 1 ? 's' : ''} en préparation
            </p>
          </div>
          {selectedDemande && !pickerOpen && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Changer
            </button>
          )}
        </div>

        {/* Selected demande — compact view */}
        {selectedDemande && !pickerOpen && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-base">
                {CATEGORY_ICON[selectedDemande.category]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">{selectedDemande.ref}</div>
                <div className="font-semibold text-slate-900 mt-0.5">{selectedDemande.title}</div>
                <div className="flex flex-wrap gap-x-3 text-xs text-slate-500 mt-1">
                  <span>📍 {selectedDemande.site}</span>
                  <span>🏢 {selectedDemande.entity}</span>
                </div>
              </div>
              <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            </div>
          </div>
        )}

        {/* Picker — list of selectable demandes */}
        {pickerOpen && (
          <>
            {demandesEnPrep.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-xl">
                Aucune demande en préparation actuellement.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2.5">
                {demandesEnPrep.map(d => (
                  <DemandeCard
                    key={d.id}
                    demande={d}
                    selected={d.id === selectedDemandeId}
                    onClick={() => selectDemande(d.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {errors.demande && <p className="text-red-500 text-xs">{errors.demande}</p>}
      </div>

      {/* ── 2. Fournisseur ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-900">Fournisseur <span className="text-red-500">*</span></h2>
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
        {errors.supplier && <p className="text-red-500 text-xs">{errors.supplier}</p>}
      </div>

      {/* ── 3. Lignes de commande ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-900">Désignation des matériaux / prestations</h2>

        <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">
          <div className="col-span-5">Désignation</div>
          <div className="col-span-2 text-center">Qté</div>
          <div className="col-span-2">Unité</div>
          <div className="col-span-2 text-right">Prix U. (TND)</div>
          <div className="col-span-1" />
        </div>

        <div className="space-y-2">
          {lines.map((line, idx) => {
            const filledIdx = lines.filter((l, i) => i <= idx && (l.description.trim() || l.unit_price)).length - 1;
            return (
              <div key={line._id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-12 sm:col-span-5">
                  <input
                    type="text"
                    placeholder={`Ligne ${idx + 1} — ex : Câble H07V 6mm²`}
                    value={line.description}
                    onChange={e => updateLine(line._id, 'description', e.target.value)}
                    className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300 ${errors[`line_desc_${filledIdx}`] ? 'border-red-400' : 'border-slate-200'}`}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <input
                    type="number" min="0.01" step="0.01" placeholder="1"
                    value={line.quantity}
                    onChange={e => updateLine(line._id, 'quantity', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <select
                    value={line.unit}
                    onChange={e => updateLine(line._id, 'unit', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <input
                    type="number" min="0" step="0.001" placeholder="0.000"
                    value={line.unit_price}
                    onChange={e => updateLine(line._id, 'unit_price', e.target.value)}
                    className={`w-full text-sm border rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-slate-300 ${errors[`line_price_${filledIdx}`] ? 'border-red-400' : 'border-slate-200'}`}
                  />
                </div>
                <div className="col-span-1 flex flex-col items-end gap-1">
                  {lineTotal(line) > 0 && (
                    <span className="text-xs font-medium text-slate-600 whitespace-nowrap">{fmt(lineTotal(line))}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeLine(line._id)}
                    disabled={lines.length === 1}
                    className="text-slate-300 hover:text-red-400 transition-colors disabled:opacity-0 text-xl leading-none"
                    title="Supprimer"
                  >×</button>
                </div>
              </div>
            );
          })}
        </div>

        {errors.lines && <p className="text-red-500 text-xs">{errors.lines}</p>}

        <button type="button" onClick={addLine} className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
          + Ajouter une ligne
        </button>

        <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-4">
          <span className="text-sm font-medium text-slate-600">Total estimé</span>
          <span className="text-xl font-bold text-slate-900">{fmt(grandTotal)} TND</span>
        </div>
      </div>

      {/* ── 4. Notes ──────────────────────────────────────────────── */}
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

      {/* ── 5. Devis fournisseur ──────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">Devis fournisseur <span className="text-red-500">*</span></h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Joignez les devis reçus en PDF ou image. La procédure interne requiert au minimum 2 devis comparatifs.
          </p>
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf,image/*"
          className="hidden"
          onChange={e => handleFiles(e.target.files, 'upload')}
        />
        <input
          ref={cameraInputRef}
          type="file"
          multiple
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => handleFiles(e.target.files, 'camera')}
        />

        {/* Drop zone */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-xl px-6 py-7 flex flex-col items-center gap-2 transition-all hover:bg-slate-50 ${
            errors.devis ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-400'
          }`}
        >
          <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <div className="text-sm font-medium text-slate-600">Glisser-déposer ou cliquer pour uploader</div>
          <div className="text-xs text-slate-400">PDF, JPG, PNG — plusieurs fichiers acceptés</div>
        </button>

        {/* Camera button */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Prendre en photo un devis
          <span className="text-xs text-slate-400 font-normal">(appareil photo)</span>
        </button>

        {errors.devis && <p className="text-red-500 text-xs">{errors.devis}</p>}

        {/* File list */}
        {devis.length > 0 && (
          <div className="space-y-2">
            {devis.map((f, idx) => (
              <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xl shrink-0">
                  {f.source === 'camera' ? '📷' : f.type === 'pdf' ? '📄' : '🖼️'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{f.name}</div>
                  <div className="text-xs text-slate-400">
                    {fmtSize(f.size)} · {f.source === 'camera' ? 'Photo' : f.type === 'pdf' ? 'PDF' : 'Image'}
                  </div>
                </div>
                <span className="text-xs text-slate-400 shrink-0">Devis {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeDevis(f.id)}
                  className="ml-1 text-slate-300 hover:text-red-400 transition-colors text-xl leading-none shrink-0"
                  title="Supprimer"
                >×</button>
              </div>
            ))}
          </div>
        )}

        {/* Confirmation devis comparatifs */}
        {devis.length > 0 && (
          <div className={`rounded-xl border px-4 py-4 transition-colors ${hasComparativeDevis ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasComparativeDevis}
                onChange={e => {
                  setHasComparativeDevis(e.target.checked);
                  if (e.target.checked) setSingleDevisJustification('');
                  setErrors(err => ({ ...err, devis_confirm: '' }));
                }}
                className="mt-0.5 h-4 w-4 rounded accent-green-600 shrink-0"
              />
              <span className={`text-sm font-medium leading-snug ${hasComparativeDevis ? 'text-green-800' : 'text-slate-800'}`}>
                J&apos;atteste qu&apos;au moins <strong>2 devis comparatifs</strong> ont été fournis et joints à ce bon de commande
              </span>
            </label>

            {devis.length >= 2 && !hasComparativeDevis && (
              <p className="text-xs text-amber-700 mt-2 pl-7">
                {devis.length} fichier{devis.length > 1 ? 's' : ''} joint{devis.length > 1 ? 's' : ''} — cochez la case pour confirmer qu&apos;il s&apos;agit de devis comparatifs.
              </p>
            )}

            {!hasComparativeDevis && (
              <div className="mt-4 pl-7 space-y-1.5">
                <label className="block text-xs font-bold text-amber-800 uppercase tracking-wide">
                  Justification — pourquoi un seul devis ?{' '}
                  <span className="text-red-500 normal-case tracking-normal font-semibold">Obligatoire</span>
                </label>
                <textarea
                  value={singleDevisJustification}
                  onChange={e => {
                    setSingleDevisJustification(e.target.value);
                    setErrors(err => ({ ...err, devis_confirm: '' }));
                  }}
                  rows={3}
                  placeholder="Ex : fournisseur unique agréé, urgence technique justifiée, accord-cadre en vigueur…"
                  className={`w-full text-sm border rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white ${errors.devis_confirm ? 'border-red-400' : 'border-amber-200'}`}
                />
                {errors.devis_confirm && <p className="text-red-500 text-xs">{errors.devis_confirm}</p>}
              </div>
            )}

            {hasComparativeDevis && (
              <div className="mt-2 pl-7 flex items-center gap-1.5 text-xs text-green-700">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Procédure de comparaison respectée — le BC peut être soumis pour validation.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 6. Résumé ─────────────────────────────────────────────── */}
      {selectedDemande && supplierId && grandTotal > 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-sm space-y-1.5">
          <div className="font-medium text-slate-700 mb-2">Récapitulatif</div>
          {[
            ['Demande',         selectedDemande.ref + ' — ' + selectedDemande.title],
            ['Fournisseur',     selectedSupplier?.name ?? ''],
            ['Lignes',          `${lines.filter(l => l.description.trim()).length} article${lines.filter(l => l.description.trim()).length > 1 ? 's' : ''}`],
            ['Montant estimé',  fmt(grandTotal) + ' TND'],
            ['Devis joints',    devis.length === 0 ? 'Aucun ⚠' : `${devis.length} fichier${devis.length > 1 ? 's' : ''} ${hasComparativeDevis ? '✓' : '(justifié)'}`],
            ['Établi par',      electricianName],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <span className="text-slate-500 shrink-0">{label}</span>
              <span className={`font-medium text-right ${label === 'Devis joints' && devis.length === 0 ? 'text-red-500' : label === 'Devis joints' && hasComparativeDevis ? 'text-green-700' : label === 'Devis joints' ? 'text-amber-700' : 'text-slate-800'}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{errors.submit}</div>
      )}

      {/* ── Actions ───────────────────────────────────────────────── */}
      <div className="flex gap-3 pb-4">
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
            'Créer le Bon de Commande →'
          )}
        </button>
      </div>
    </form>
  );
}
