'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { INTERVENTION_CATEGORIES, INTERVENTION_NATURES, getCategoryById, getNatureById } from '@/lib/interventionTypes';
import { supabase } from '@/lib/supabase';
import { computePriorityScore } from '@/lib/workflowEngine';

// ── Types ──────────────────────────────────────────────────────────────────
interface Props {
  interventionSites: { intervention_site_id: string; label: string }[];
  entities: { entity_id: string; code: string; name: string }[];
  userRole?: 'demandeur' | 'prestataire';
}

interface FormState {
  intervention_site_id: string;
  location_comment: string;
  category: string;
  nature: string;
  issuing_entity_id: string;
  contact_type: 'demandeur' | 'autre';
  contact_name: string;
  contact_phone: string;
  contact_remark: string;
  safety_risk: boolean;
  production_stop: boolean;
}

const EMPTY_FORM: FormState = {
  intervention_site_id: '',
  location_comment: '',
  category: '',
  nature: '',
  issuing_entity_id: '',
  contact_type: 'demandeur',
  contact_name: '',
  contact_phone: '',
  contact_remark: '',
  safety_risk: false,
  production_stop: false,
};

const STEPS = [
  { n: 1, label: 'Localisation' },
  { n: 2, label: 'Intervention' },
  { n: 3, label: 'Organisation' },
  { n: 4, label: 'Urgence & photos' },
];

// ── Step indicator ─────────────────────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                s.n < current
                  ? 'bg-green-500 text-white'
                  : s.n === current
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {s.n < current ? '✓' : s.n}
            </div>
            <span
              className={`text-xs mt-1 whitespace-nowrap ${
                s.n === current ? 'text-slate-900 font-medium' : 'text-slate-400'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 mb-5 transition-all ${
                s.n < current ? 'bg-green-500' : 'bg-slate-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Success screen ─────────────────────────────────────────────────────────
function SuccessScreen({ requestId, willNeedValidation, userRole }: { requestId: string; willNeedValidation: boolean; userRole: 'demandeur' | 'prestataire' }) {
  const router = useRouter();
  const shortId = requestId.slice(0, 8).toUpperCase();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {userRole === 'prestataire' ? 'Signalement soumis' : 'Demande soumise'}
        </h2>
        <p className="text-slate-500 text-sm mt-1">Référence : <span className="font-mono font-semibold text-slate-700">#{shortId}</span></p>
      </div>
      <div className={`rounded-lg p-4 text-sm text-left ${willNeedValidation ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'}`}>
        {willNeedValidation ? (
          <>
            <p className="font-medium text-amber-800">En attente de validation direction</p>
            <p className="text-amber-700 mt-1">
              {userRole === 'prestataire'
                ? "Le signalement concerne un risque sécurité ou un arrêt de production. Le directeur de l'entité devra valider avant planification."
                : "La demande concerne un risque sécurité ou un arrêt de production. Le directeur de votre entité sera notifié pour approbation avant que l'électricien intervienne."}
            </p>
          </>
        ) : (
          <>
            <p className="font-medium text-blue-800">
              {userRole === 'prestataire' ? 'Signalement enregistré' : 'En cours de clarification'}
            </p>
            <p className="text-blue-700 mt-1">
              {userRole === 'prestataire'
                ? "Votre signalement a été transmis au responsable d'entité. Il sera planifié dans vos interventions à venir."
                : "Le prestataire de service assigné va prendre contact avec vous pour comprendre la panne et préparer son intervention."}
            </p>
          </>
        )}
      </div>
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => router.push('/demandes')}
          className="flex-1 border border-slate-200 text-slate-700 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Voir toutes les demandes
        </button>
        <button
          onClick={() => router.push(`/demandes/${requestId}`)}
          className="flex-1 bg-slate-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-slate-700 transition-colors"
        >
          Suivre cette demande →
        </button>
      </div>
    </div>
  );
}

// ── Main form ──────────────────────────────────────────────────────────────
export default function NewDemandeForm({ interventionSites, entities, userRole = 'demandeur' }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Validation per step ──────────────────────────────────────────────────
  function validateStep(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!form.intervention_site_id) e.intervention_site_id = 'Choisissez un site d\'intervention';
      if (form.intervention_site_id && !form.location_comment.trim()) e.location_comment = 'Décrivez la localisation exacte';
    }
    if (s === 2) {
      if (!form.category) e.category = 'Choisissez une catégorie de travaux';
      if (!form.nature) e.nature = 'Choisissez la nature des travaux';
    }
    if (s === 3) {
      if (!form.issuing_entity_id) e.issuing_entity_id = 'Choisissez l\'entité émettrice';
    }
    return e;
  }

  function next() {
    const errs = validateStep(step);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep((s) => s + 1);
  }

  function back() {
    setErrors({});
    setStep((s) => s - 1);
  }

  // ── Photo handling ───────────────────────────────────────────────────────
  function addFiles(files: FileList | null) {
    if (!files) return;
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'));
    setPhotos((prev) => [...prev, ...images].slice(0, 5));
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, []);

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const errs = validateStep(4);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const needsValidation = form.safety_risk || form.production_stop;
      const initialStatus = 'soumise'; // toutes les demandes démarrent en "soumise"

      const priorityScore = computePriorityScore({
        safetyRisk: form.safety_risk,
        productionStop: form.production_stop,
        submittedAt: new Date().toISOString(),
        equipmentCriticality: 3, // valeur par défaut sans scan équipement
        repeatFailureCount: 0,
      });

      // ── Insert demande ────────────────────────────────────────────────
      const { data: request, error: insertError } = await supabase
        .from('maintenance_requests')
        .insert({
          intervention_site_id: form.intervention_site_id,
          location_comment: form.location_comment.trim(),
          category: form.category,
          intervention_nature: form.nature,
          issuing_entity_id: form.issuing_entity_id,
          safety_risk: form.safety_risk,
          production_stop: form.production_stop,
          status: initialStatus,
          priority_score: priorityScore,
          submitted_at: new Date().toISOString(),
          sync_status: 'synced',
          created_offline: false,
          rework: false,
        })
        .select('request_id')
        .single();

      if (insertError) throw new Error(insertError.message);
      const requestId: string = request.request_id;

      // ── Upload photos → Supabase Storage ─────────────────────────────
      if (photos.length > 0) {
        await Promise.all(
          photos.map(async (photo, idx) => {
            const ext = photo.name.split('.').pop() ?? 'jpg';
            const path = `${requestId}/${idx + 1}.${ext}`;

            const { error: uploadError } = await supabase.storage
              .from('demande-photos')
              .upload(path, photo, { upsert: false });

            if (uploadError) {
              // Upload photo non bloquant : la demande est déjà créée
              console.warn(`[upload] photo ${idx + 1} échouée :`, uploadError.message);
              return;
            }

            // Enregistrer le chemin dans la table attachments
            await supabase.from('attachments').insert({
              request_id: requestId,
              type: 'photo',
              file_path: path,
              captured_offline: false,
            });
          })
        );
      }

      setSuccessId(requestId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setSubmitError(
        msg.includes('Failed to fetch') || msg.includes('invalid input')
          ? 'Impossible de contacter la base de données. Vérifiez votre connexion ou configurez .env.local.'
          : `Erreur lors de la soumission : ${msg}`
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const selectedSite = interventionSites.find((s) => s.intervention_site_id === form.intervention_site_id);
  const selectedCategory = getCategoryById(form.category);
  const selectedNature = getNatureById(form.nature);
  const selectedEntity = entities.find((e) => e.entity_id === form.issuing_entity_id);
  const needsValidation = form.safety_risk || form.production_stop;

  if (successId) {
    return <SuccessScreen requestId={successId} willNeedValidation={needsValidation} userRole={userRole} />;
  }

  return (
    <div>
      <StepBar current={step} />

      {/* ── Step 1 : Localisation ──────────────────────────────────── */}
      {step === 1 && (
        <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-slate-900 mb-1">Où se situe la panne ?</h2>
            <p className="text-sm text-slate-500">Sélectionnez le site puis précisez la localisation exacte.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Site d&apos;intervention <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {interventionSites.map((s) => (
                <button
                  key={s.intervention_site_id}
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, intervention_site_id: s.intervention_site_id, location_comment: '' }));
                    setErrors((e) => ({ ...e, intervention_site_id: '' }));
                  }}
                  className={`text-sm px-4 py-3 rounded-lg border text-left font-medium transition-all ${
                    form.intervention_site_id === s.intervention_site_id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 hover:border-slate-400 text-slate-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {errors.intervention_site_id && (
              <p className="text-red-500 text-xs mt-1.5">{errors.intervention_site_id}</p>
            )}
          </div>

          {form.intervention_site_id && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Localisation exacte — <span className="text-slate-500 font-normal">{selectedSite?.label}</span>{' '}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={form.location_comment}
                onChange={(e) => {
                  setForm((f) => ({ ...f, location_comment: e.target.value }));
                  if (e.target.value.trim()) setErrors((er) => ({ ...er, location_comment: '' }));
                }}
                placeholder="Ex : Atelier B, tableau électrique côté nord — 2ème niveau"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none transition-colors ${
                  errors.location_comment ? 'border-red-300' : 'border-slate-200'
                }`}
              />
              {errors.location_comment && (
                <p className="text-red-500 text-xs mt-1">{errors.location_comment}</p>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Step 2 : Catégorie & Nature ────────────────────────────── */}
      {step === 2 && (
        <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <div>
            <h2 className="font-semibold text-slate-900 mb-1">Quelle intervention ?</h2>
            <p className="text-sm text-slate-500">Choisissez la catégorie de travaux et la nature de l&apos;intervention.</p>
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Catégorie de travaux <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INTERVENTION_CATEGORIES.map((cat) => {
                const selected = form.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, category: cat.id }));
                      setErrors((e) => ({ ...e, category: '' }));
                    }}
                    className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-base flex-shrink-0">{cat.icon}</span>
                    <span className={`text-xs font-medium leading-tight ${selected ? 'text-slate-900' : 'text-slate-700'}`}>
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.category && <p className="text-red-500 text-xs mt-1.5">{errors.category}</p>}
          </div>

          {/* Nature des travaux */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Nature des travaux <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {INTERVENTION_NATURES.map((nat) => {
                const selected = form.nature === nat.id;
                return (
                  <button
                    key={nat.id}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, nature: nat.id }));
                      setErrors((e) => ({ ...e, nature: '' }));
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      selected
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        selected ? 'border-slate-900 bg-slate-900' : 'border-slate-300'
                      }`}>
                        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-slate-900">{nat.label}</span>
                        <p className="text-xs text-slate-500 mt-0.5">{nat.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.nature && <p className="text-red-500 text-xs mt-1.5">{errors.nature}</p>}
          </div>
        </section>
      )}

      {/* ── Step 3 : Organisation ─────────────────────────────────── */}
      {step === 3 && (
        <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-slate-900 mb-1">Organisation</h2>
            <p className="text-sm text-slate-500">Entité émettrice et contact pour la clarification.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Entité émettrice <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {entities.map((en) => (
                <button
                  key={en.entity_id}
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, issuing_entity_id: en.entity_id }));
                    setErrors((e) => ({ ...e, issuing_entity_id: '' }));
                  }}
                  className={`text-sm px-4 py-2.5 rounded-lg border font-medium transition-all ${
                    form.issuing_entity_id === en.entity_id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 hover:border-slate-400 text-slate-700'
                  }`}
                >
                  {en.code}
                </button>
              ))}
            </div>
            {errors.issuing_entity_id && (
              <p className="text-red-500 text-xs mt-1.5">{errors.issuing_entity_id}</p>
            )}
          </div>

          {/* ── Personne à contacter ──────────────────────────────────── */}
          <div className="pt-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {userRole === 'prestataire' ? 'Responsable à contacter sur site' : 'Personne à contacter pour clarification'}
            </label>
            <div className="space-y-2">
              {([
                { value: 'demandeur', label: userRole === 'prestataire' ? 'Le responsable de l\'entité' : 'Le demandeur lui-même' },
                { value: 'autre',     label: 'Autre personne' },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((f) => ({
                    ...f,
                    contact_type: value,
                    contact_name: '',
                    contact_phone: '',
                    contact_remark: '',
                  }))}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left ${
                    form.contact_type === value
                      ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    form.contact_type === value ? 'border-slate-900 bg-slate-900' : 'border-slate-300'
                  }`}>
                    {form.contact_type === value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="font-medium text-slate-900 text-sm">{label}</span>
                </button>
              ))}
            </div>

            {form.contact_type === 'autre' && (
              <div className="mt-3 space-y-3 pl-4 border-l-2 border-slate-200">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nom et prénom</label>
                    <input
                      type="text"
                      value={form.contact_name}
                      onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                      placeholder="Prénom Nom"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">N° de portable</label>
                    <input
                      type="tel"
                      value={form.contact_phone}
                      onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                      placeholder="+216 XX XXX XXX"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Remarque</label>
                  <textarea
                    value={form.contact_remark}
                    onChange={(e) => setForm((f) => ({ ...f, contact_remark: e.target.value }))}
                    rows={2}
                    placeholder="Disponibilités, informations complémentaires…"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Step 4 : Urgence, photos, récap ────────────────────────── */}
      {step === 4 && (
        <div className="space-y-4">
          {/* Urgence */}
          <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <div>
              <h2 className="font-semibold text-slate-900 mb-1">Niveau d&apos;urgence</h2>
              <p className="text-sm text-slate-500">
                Si coché → validation obligatoire du directeur avant l&apos;intervention.
              </p>
            </div>
            <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              form.safety_risk ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-slate-300'
            }`}>
              <input
                type="checkbox"
                checked={form.safety_risk}
                onChange={(e) => setForm((f) => ({ ...f, safety_risk: e.target.checked }))}
                className="mt-0.5 accent-red-600 w-4 h-4"
              />
              <div>
                <div className="font-semibold text-slate-900">Risque sécurité</div>
                <div className="text-sm text-slate-500">Danger pour les personnes ou les installations.</div>
              </div>
            </label>
            <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              form.production_stop ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-slate-300'
            }`}>
              <input
                type="checkbox"
                checked={form.production_stop}
                onChange={(e) => setForm((f) => ({ ...f, production_stop: e.target.checked }))}
                className="mt-0.5 accent-amber-600 w-4 h-4"
              />
              <div>
                <div className="font-semibold text-slate-900">Arrêt de production</div>
                <div className="text-sm text-slate-500">La panne bloque ou ralentit la production.</div>
              </div>
            </label>

            {needsValidation && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                ⚠️ Cette demande sera soumise à <strong>validation direction</strong> avant traitement.
              </div>
            )}
          </section>

          {/* Photos */}
          <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Photos</h2>
                <p className="text-sm text-slate-500">Optionnel — max 5 images, aide l&apos;électricien à préparer son intervention.</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                photos.length >= 5 ? 'bg-slate-200 text-slate-500' : 'bg-slate-100 text-slate-500'
              }`}>
                {photos.length}/5
              </span>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => photos.length < 5 && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                photos.length >= 5
                  ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50'
                  : dragOver
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
              <div className="text-3xl mb-2">📷</div>
              <p className="text-sm font-medium text-slate-700">
                {dragOver ? 'Déposez ici' : 'Cliquez ou déposez des photos'}
              </p>
              <p className="text-xs text-slate-400 mt-1">JPG, PNG, HEIC — max 5 photos</p>
            </div>

            {/* Preview grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {photos.map((f, i) => (
                  <div key={i} className="relative group aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(f)}
                      alt=""
                      className="w-full h-full object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex shadow-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Récapitulatif */}
          <section className="bg-slate-50 rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Récapitulatif</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Site</dt>
                <dd className="font-medium text-slate-900">{selectedSite?.label}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Localisation</dt>
                <dd className="font-medium text-slate-900 text-right max-w-56 truncate">{form.location_comment}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Catégorie</dt>
                <dd className="font-medium text-slate-900">{selectedCategory?.icon} {selectedCategory?.label}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Nature</dt>
                <dd className="font-medium text-slate-900">{selectedNature?.label}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Entité</dt>
                <dd className="font-medium text-slate-900">{selectedEntity?.code}</dd>
              </div>
              {userRole !== 'prestataire' && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Prestataire</dt>
                  <dd className="font-medium text-slate-400 italic">Assigné par le responsable</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500">{userRole === 'prestataire' ? 'Contact sur site' : 'Contact clarification'}</dt>
                <dd className="font-medium text-slate-900">
                  {form.contact_type === 'demandeur'
                    ? (userRole === 'prestataire' ? 'Responsable entité' : 'Le demandeur')
                    : form.contact_name || 'Autre personne'}
                  {form.contact_type === 'autre' && form.contact_phone && (
                    <span className="text-slate-500 font-normal"> · {form.contact_phone}</span>
                  )}
                </dd>
              </div>
              {(form.safety_risk || form.production_stop) && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Urgence</dt>
                  <dd className="font-medium text-red-600">
                    {[form.safety_risk && 'Risque sécurité', form.production_stop && 'Arrêt production']
                      .filter(Boolean)
                      .join(' · ')}
                  </dd>
                </div>
              )}
              {photos.length > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Photos</dt>
                  <dd className="font-medium text-slate-900">{photos.length} jointe{photos.length > 1 ? 's' : ''}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Submit error */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
              {submitError}
            </div>
          )}
        </div>
      )}

      {/* ── Navigation buttons ─────────────────────────────────────── */}
      <div className="flex gap-3 mt-6">
        {step > 1 ? (
          <button
            type="button"
            onClick={back}
            disabled={submitting}
            className="flex-1 border border-slate-200 text-slate-700 text-sm font-medium py-3 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            ← Retour
          </button>
        ) : (
          <a
            href="/demandes"
            className="flex-1 border border-slate-200 text-slate-700 text-sm font-medium py-3 rounded-xl hover:bg-slate-50 transition-colors text-center"
          >
            Annuler
          </a>
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={next}
            className="flex-1 bg-slate-900 text-white text-sm font-medium py-3 rounded-xl hover:bg-slate-700 transition-colors"
          >
            Suivant →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-slate-900 text-white text-sm font-medium py-3 rounded-xl hover:bg-slate-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Envoi en cours…
              </span>
            ) : (
              'Soumettre la demande'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
