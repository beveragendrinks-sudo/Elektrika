'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

interface PhotoZoneProps {
  label: string;
  description: string;
  icon: string;
  files: File[];
  multiple?: boolean;
  onFiles: (files: FileList | null) => void;
}

function PhotoZone({ label, description, icon, files, multiple = true, onFiles }: PhotoZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const has = files.length > 0;

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className={`rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-all ${
        has
          ? 'border-green-400 bg-green-50 hover:bg-green-100'
          : 'border-slate-300 bg-slate-50 hover:border-slate-500 hover:bg-white'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <div className="text-3xl mb-2">{has ? '✅' : icon}</div>
      <div className="text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">{label}</div>
      <div className="text-xs text-slate-400 mb-3">{description}</div>
      {has ? (
        <div className="text-xs font-semibold text-green-700 bg-green-100 rounded-full px-3 py-1 inline-block">
          {files.length} fichier{files.length > 1 ? 's' : ''} sélectionné{files.length > 1 ? 's' : ''}
        </div>
      ) : (
        <div className="text-xs text-slate-400 italic">Cliquer pour ajouter</div>
      )}
    </div>
  );
}

interface ClotureSectionProps {
  demandeId: string;
  otId: string;
  /** Affiché seulement pour les statuts 'planifie' | 'en_cours' */
  status?: string;
}

export default function ClotureSection({ otId, status }: ClotureSectionProps) {
  const [photos, setPhotos] = useState<{ before: File[]; after: File[]; signed: File[] }>({
    before: [], after: [], signed: [],
  });
  const [remarques, setRemarques] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const canSubmit = photos.before.length > 0 && photos.after.length > 0 && photos.signed.length > 0;

  function addFiles(key: keyof typeof photos, files: FileList | null) {
    if (!files) return;
    setPhotos((prev) => ({ ...prev, [key]: [...prev[key], ...Array.from(files)] }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    // Simule l'upload Supabase Storage + changement de statut → completed_pending_confirmation
    await new Promise((r) => setTimeout(r, 1400));
    setDone(true);
    setSubmitting(false);
  }

  if (status && status !== 'planifie' && status !== 'en_cours') return null;

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center space-y-2">
        <div className="text-5xl">✓</div>
        <div className="font-bold text-green-800 text-lg">Intervention clôturée</div>
        <div className="text-sm text-green-600">
          Les photos ont été uploadées. Le dossier est envoyé au demandeur pour validation finale.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <h2 className="font-bold text-slate-900">Clôturer l&apos;intervention</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Uploadez les 3 documents photos requis pour fermer le dossier.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Steps reminder */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 space-y-2">
          <div className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Procédure de clôture</div>
          {[
            { n: 1, text: "Réaliser l'intervention sur site" },
            { n: 2, text: "Imprimer l'Ordre de Travail (OT) et le faire signer par un responsable sur place" },
            { n: 3, text: "Photographier la situation avant et après, puis le rapport signé, et uploader ici" },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-start gap-2.5 text-sm text-amber-800">
              <span className="shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold">
                {n}
              </span>
              <span>{text}</span>
            </div>
          ))}
          <div className="mt-2 ml-7">
            <Link
              href={`/ordres-de-travail/${otId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Générer / Imprimer l&apos;Ordre de Travail (OT)
            </Link>
          </div>
        </div>

        {/* Upload zones */}
        <div className="grid sm:grid-cols-3 gap-4">
          <PhotoZone
            label="Photos avant"
            description="État initial du problème"
            icon="📷"
            files={photos.before}
            onFiles={(f) => addFiles('before', f)}
          />
          <PhotoZone
            label="Photos après"
            description="Résultat des travaux effectués"
            icon="📸"
            files={photos.after}
            onFiles={(f) => addFiles('after', f)}
          />
          <PhotoZone
            label="Rapport signé"
            description="Photo de l'OT signé par le responsable sur place"
            icon="📄"
            files={photos.signed}
            multiple={false}
            onFiles={(f) => addFiles('signed', f)}
          />
        </div>

        {/* Progress indicators */}
        <div className="flex items-center gap-4 text-xs">
          {(['before', 'after', 'signed'] as const).map((k) => {
            const labels = { before: 'Avant', after: 'Après', signed: 'Rapport signé' };
            const ok = photos[k].length > 0;
            return (
              <div key={k} className={`flex items-center gap-1.5 ${ok ? 'text-green-600' : 'text-slate-400'}`}>
                <span>{ok ? '●' : '○'}</span>
                <span>{labels[k]}</span>
              </div>
            );
          })}
        </div>

        {/* Remarques */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
            Remarques de clôture <span className="font-normal text-slate-400 normal-case tracking-normal">(optionnel)</span>
          </label>
          <textarea
            value={remarques}
            onChange={(e) => setRemarques(e.target.value)}
            rows={3}
            placeholder="Observations sur l'intervention, difficultés rencontrées, recommandations…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none transition-colors"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-400">
            {!canSubmit
              ? `${3 - [photos.before, photos.after, photos.signed].filter((g) => g.length > 0).length} zone(s) sans photo`
              : 'Tous les documents sont prêts'}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="bg-green-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Envoi en cours…
              </>
            ) : (
              'Clôturer l\'intervention →'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
