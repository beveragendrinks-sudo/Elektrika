import RequestTimeline from '@/components/RequestTimeline';
import type { TimelineStep } from '@/components/RequestTimeline';
import Link from 'next/link';
import ClotureSection from './ClotureSection';
import type { RequestStatus } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────
interface MockDemande {
  ref: string;
  title: string;
  equipment: string;
  site: string;
  entity: string;
  status: RequestStatus;
  category: string;
  nature: string;
  safety_risk: boolean;
  production_stop: boolean;
  priority_score: number;
  prestataire: string;
  steps: TimelineStep[];
  bcs?: { id: string; po_number: string; status: string; amount: number }[];
}

// ── Mock demandes ──────────────────────────────────────────────────────────
const now = Date.now();
const h   = (n: number) => new Date(now - n * 3_600_000).toISOString();

const MOCK_DEMANDES: Record<string, MockDemande> = {
  d1: {
    ref: 'DEM-2026-041', title: 'Panne disjoncteur local technique RDC',
    equipment: 'Tableau TGBT-RDC', site: 'Siège, Ben Arous', entity: 'LAD',
    status: 'in_progress', category: 'Électricité', nature: 'Corrective',
    safety_risk: false, production_stop: true, priority_score: 68,
    prestataire: 'Mohamed Salah',
    steps: [
      { status: 'draft',           entered_at: h(72), exited_at: h(70) },
      { status: 'clarification',   entered_at: h(70), exited_at: h(48) },
      { status: 'preparation',     entered_at: h(48), exited_at: h(24) },
      { status: 'ready_to_plan',   entered_at: h(24), exited_at: h(8) },
      { status: 'planned',         entered_at: h(8),  exited_at: h(3) },
      { status: 'in_progress',     entered_at: h(3),  exited_at: null, low_alert_hours: 8, escalation_hours: 24 },
    ],
    bcs: [{ id: 'bc-1', po_number: 'BC-LAD-2026-000041', status: 'draft', amount: 742.5 }],
  },
  d2: {
    ref: 'DEM-2026-039', title: 'Fuite canalisation bureau direction',
    equipment: 'Réseau plomberie — niveau 2', site: 'Siège, Ben Arous', entity: 'LAD',
    status: 'planned', category: 'Plomberie', nature: 'Corrective',
    safety_risk: false, production_stop: false, priority_score: 42,
    prestataire: 'Karim Bejaoui',
    steps: [
      { status: 'draft',         entered_at: h(96), exited_at: h(94) },
      { status: 'clarification', entered_at: h(94), exited_at: h(72) },
      { status: 'ready_to_plan', entered_at: h(72), exited_at: h(12) },
      { status: 'planned',       entered_at: h(12), exited_at: null, low_alert_hours: 24, escalation_hours: 72 },
    ],
  },
  d3: {
    ref: 'DEM-2026-035', title: 'Climatiseur salle de réunion H4',
    equipment: 'Unité CTA-H4', site: 'Siège, Ben Arous', entity: 'LAD',
    status: 'completed_pending_confirmation', category: 'Climatisation', nature: 'Préventive',
    safety_risk: false, production_stop: false, priority_score: 30,
    prestataire: 'Anis Trabelsi',
    steps: [
      { status: 'draft',                          entered_at: h(288), exited_at: h(286) },
      { status: 'clarification',                  entered_at: h(286), exited_at: h(260) },
      { status: 'preparation',                    entered_at: h(260), exited_at: h(200) },
      { status: 'awaiting_materials',             entered_at: h(200), exited_at: h(120) },
      { status: 'ready_to_plan',                  entered_at: h(120), exited_at: h(72) },
      { status: 'planned',                        entered_at: h(72),  exited_at: h(48) },
      { status: 'in_progress',                    entered_at: h(48),  exited_at: h(4) },
      { status: 'completed_pending_confirmation', entered_at: h(4),   exited_at: null, low_alert_hours: 24, escalation_hours: 48 },
    ],
    bcs: [{ id: 'bc-2', po_number: 'BC-LAD-2026-000038', status: 'confirmed', amount: 320 }],
  },
  d4: {
    ref: 'DEM-2026-028', title: 'Peinture couloir niveau 2',
    equipment: 'Couloir N2 — bâtiment principal', site: 'Siège, Ben Arous', entity: 'LAD',
    status: 'accepted', category: 'Peinture', nature: 'Amélioration',
    safety_risk: false, production_stop: false, priority_score: 15,
    prestataire: 'Anis Trabelsi',
    steps: [
      { status: 'draft',                          entered_at: h(600), exited_at: h(598) },
      { status: 'clarification',                  entered_at: h(598), exited_at: h(550) },
      { status: 'ready_to_plan',                  entered_at: h(550), exited_at: h(480) },
      { status: 'planned',                        entered_at: h(480), exited_at: h(360) },
      { status: 'in_progress',                    entered_at: h(360), exited_at: h(240) },
      { status: 'completed_pending_confirmation', entered_at: h(240), exited_at: h(120) },
      { status: 'accepted',                       entered_at: h(120), exited_at: null },
    ],
  },
  d5: {
    ref: 'DEM-2026-021', title: 'Installation tableau électrique annexe',
    equipment: 'Annexe A — tableau TGBT-A', site: 'Unité Production, La Manouba', entity: 'LAD',
    status: 'accepted', category: 'Électricité', nature: 'Travaux neufs',
    safety_risk: true, production_stop: false, priority_score: 55,
    prestataire: 'Mohamed Salah',
    steps: [
      { status: 'draft',                             entered_at: h(800), exited_at: h(798) },
      { status: 'pending_management_validation',     entered_at: h(798), exited_at: h(780) },
      { status: 'clarification',                     entered_at: h(780), exited_at: h(720) },
      { status: 'preparation',                       entered_at: h(720), exited_at: h(600) },
      { status: 'awaiting_materials',                entered_at: h(600), exited_at: h(480) },
      { status: 'ready_to_plan',                     entered_at: h(480), exited_at: h(360) },
      { status: 'planned',                           entered_at: h(360), exited_at: h(240) },
      { status: 'in_progress',                       entered_at: h(240), exited_at: h(96) },
      { status: 'completed_pending_confirmation',    entered_at: h(96),  exited_at: h(48) },
      { status: 'accepted',                          entered_at: h(48),  exited_at: null },
    ],
    bcs: [
      { id: 'bc-3', po_number: 'BC-FAD-2026-000027', status: 'received', amount: 1380 },
      { id: 'bc-4', po_number: 'BC-FAD-2026-000039', status: 'received', amount: 620 },
    ],
  },
  d6: {
    ref: 'DEM-2026-015', title: 'Réparation porte coupe-feu',
    equipment: 'Porte RF-12 — accès sous-sol', site: 'Siège, Ben Arous', entity: 'LAD',
    status: 'accepted', category: 'Menuiserie', nature: 'Conformité',
    safety_risk: false, production_stop: false, priority_score: 20,
    prestataire: 'Anis Trabelsi',
    steps: [
      { status: 'draft',                          entered_at: h(1200), exited_at: h(1198) },
      { status: 'clarification',                  entered_at: h(1198), exited_at: h(1100) },
      { status: 'ready_to_plan',                  entered_at: h(1100), exited_at: h(900) },
      { status: 'planned',                        entered_at: h(900),  exited_at: h(700) },
      { status: 'in_progress',                    entered_at: h(700),  exited_at: h(500) },
      { status: 'completed_pending_confirmation', entered_at: h(500),  exited_at: h(300) },
      { status: 'accepted',                       entered_at: h(300),  exited_at: null },
    ],
  },
  // Alias d7 : attente matériaux (BC envoyé fournisseur)
  d7: {
    ref: 'DEM-2026-044', title: 'Remplacement pompe hydraulique P-12',
    equipment: 'Pompe P-12 — circuit principal', site: 'Pôle Industriel, Jbel Oust', entity: 'FAD',
    status: 'awaiting_materials', category: 'Électricité', nature: 'Réparation',
    safety_risk: false, production_stop: true, priority_score: 72,
    prestataire: 'Hichem Trabelsi',
    steps: [
      { status: 'draft',              entered_at: h(120), exited_at: h(118) },
      { status: 'clarification',      entered_at: h(118), exited_at: h(96) },
      { status: 'preparation',        entered_at: h(96),  exited_at: h(36) },
      { status: 'awaiting_materials', entered_at: h(36),  exited_at: null, low_alert_hours: 48, escalation_hours: 120 },
    ],
    bcs: [{ id: 'bc-3', po_number: 'BC-FAD-2026-000027', status: 'sent', amount: 1380 }],
  },
  // IDs compatibles avec la page listing /demandes
  '1': {
    ref: 'DEM-2026-041', title: 'Panne tableau électrique atelier B',
    equipment: 'Tableau TGS-B2', site: 'Siège, Ben Arous', entity: 'LAD',
    status: 'clarification', category: 'Électricité', nature: 'Corrective',
    safety_risk: false, production_stop: false, priority_score: 72,
    prestataire: 'Mohamed Salah',
    steps: [
      { status: 'draft',         entered_at: h(30), exited_at: h(28) },
      { status: 'clarification', entered_at: h(28), exited_at: null, low_alert_hours: 4, escalation_hours: 24 },
    ],
  },
  '2': {
    ref: 'DEM-2026-040', title: 'Remplacement moteur pompe circuit refroidissement',
    equipment: 'Pompe P-12', site: 'Pôle Industriel, Jbel Oust', entity: 'FAD',
    status: 'preparation', category: 'Électricité', nature: 'Réparation',
    safety_risk: false, production_stop: true, priority_score: 55,
    prestataire: 'Hichem Trabelsi',
    steps: [
      { status: 'draft',         entered_at: h(50), exited_at: h(48) },
      { status: 'clarification', entered_at: h(48), exited_at: h(30) },
      { status: 'preparation',   entered_at: h(30), exited_at: null, low_alert_hours: 24, escalation_hours: 72 },
    ],
    bcs: [{ id: 'bc-4', po_number: 'BC-FAD-2026-000039', status: 'sent', amount: 620 }],
  },
  '3': {
    ref: 'DEM-2026-038', title: 'Maintenance préventive ligne production',
    equipment: 'Ligne L3', site: 'Atelier Technique, Grombalia', entity: 'BTFI',
    status: 'planned', category: 'Électricité', nature: 'Préventive',
    safety_risk: false, production_stop: false, priority_score: 30,
    prestataire: 'Karim Bejaoui',
    steps: [
      { status: 'draft',         entered_at: h(60), exited_at: h(58) },
      { status: 'clarification', entered_at: h(58), exited_at: h(40) },
      { status: 'ready_to_plan', entered_at: h(40), exited_at: h(12) },
      { status: 'planned',       entered_at: h(12), exited_at: null, low_alert_hours: 24, escalation_hours: 72 },
    ],
  },
};

// ── Status label (simple, sans import du dashboard) ────────────────────────
const STATUS_LABEL: Record<RequestStatus, string> = {
  draft:                         'Brouillon',
  pending_management_validation: 'Attente validation',
  clarification:                 'Clarification',
  preparation:                   'Préparation',
  awaiting_materials:            'Attente matériaux',
  ready_to_plan:                 'Prête à planifier',
  planned:                       'Planifiée',
  in_progress:                   'En cours',
  cancelled:                     'Annulée',
  completed_pending_confirmation:'À confirmer',
  accepted:                      'Acceptée',
};

const STATUS_COLOR: Record<RequestStatus, string> = {
  draft:                         'bg-slate-100 text-slate-600',
  pending_management_validation: 'bg-amber-100 text-amber-700',
  clarification:                 'bg-yellow-100 text-yellow-700',
  preparation:                   'bg-blue-100 text-blue-700',
  awaiting_materials:            'bg-orange-100 text-orange-700',
  ready_to_plan:                 'bg-violet-100 text-violet-700',
  planned:                       'bg-indigo-100 text-indigo-700',
  in_progress:                   'bg-cyan-100 text-cyan-700',
  cancelled:                     'bg-red-100 text-red-600',
  completed_pending_confirmation:'bg-teal-100 text-teal-700',
  accepted:                      'bg-green-100 text-green-700',
};

const BC_STATUS_COLOR: Record<string, string> = {
  draft:     'bg-amber-100 text-amber-700',
  sent:      'bg-blue-100 text-blue-700',
  confirmed: 'bg-violet-100 text-violet-700',
  received:  'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

const BC_STATUS_LABEL: Record<string, string> = {
  draft:     'À valider',
  sent:      'Envoyé',
  confirmed: 'Confirmé',
  received:  'Reçu',
  cancelled: 'Annulé',
};

export default function DemandePage({ params }: { params: { id: string } }) {
  const demande = MOCK_DEMANDES[params.id] ?? null;

  if (!demande) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">🔍</div>
        <div className="text-slate-600 font-medium mb-2">Demande introuvable</div>
        <div className="text-slate-400 text-sm mb-6">La demande #{params.id} n&apos;existe pas ou a été supprimée.</div>
        <Link href="/demandes" className="text-blue-600 hover:underline text-sm">
          ← Retour aux demandes
        </Link>
      </div>
    );
  }

  const hasBCs = (demande.bcs?.length ?? 0) > 0;
  const canClose = demande.status === 'planned' || demande.status === 'in_progress';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/demandes" className="hover:text-slate-900 transition-colors">Demandes</Link>
        <span>/</span>
        <span className="font-mono text-slate-600">{demande.ref}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOR[demande.status]}`}>
              {STATUS_LABEL[demande.status]}
            </span>
            {demande.safety_risk && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                ⚠ Risque sécurité
              </span>
            )}
            {demande.production_stop && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                ⏸ Arrêt production
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{demande.title}</h1>
          <p className="text-slate-500 mt-1 text-sm">{demande.equipment} · {demande.site}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {demande.status !== 'draft' && demande.status !== 'clarification' && (
            <Link
              href={`/ordres-de-travail/ot-${params.id}`}
              className="shrink-0 border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:border-slate-500 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Ordre de Travail
            </Link>
          )}
          {(demande.status === 'preparation' || demande.status === 'awaiting_materials') && (
            <Link
              href={`/bons-de-commande/new?request_id=${params.id}`}
              className="shrink-0 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              + Nouveau BC
            </Link>
          )}
        </div>
      </div>

      {/* Info panel pour awaiting_materials */}
      {demande.status === 'awaiting_materials' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7"
            />
          </svg>
          <div>
            <div className="font-semibold text-orange-900 text-sm">En attente de livraison des matériaux</div>
            <div className="text-sm text-orange-700 mt-0.5">
              Les bons de commande ont été validés et envoyés aux fournisseurs. Dès que tous les matériaux
              sont réceptionnés, confirmez la livraison depuis chaque bon de commande. La demande passera
              automatiquement en <strong>Prête à planifier</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <RequestTimeline
        requestTitle={demande.title}
        equipmentName={demande.equipment}
        siteName={demande.site}
        steps={demande.steps}
        currentStatus={demande.status}
      />

      {/* Détails */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Détails de la demande</h2>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-slate-400 text-xs font-medium uppercase tracking-wide">Catégorie</dt>
            <dd className="font-medium text-slate-900 mt-0.5">{demande.category}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-xs font-medium uppercase tracking-wide">Nature</dt>
            <dd className="font-medium text-slate-900 mt-0.5">{demande.nature}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-xs font-medium uppercase tracking-wide">Entité émettrice</dt>
            <dd className="font-medium text-slate-900 mt-0.5">{demande.entity}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-xs font-medium uppercase tracking-wide">Prestataire assigné</dt>
            <dd className="font-medium text-slate-900 mt-0.5">{demande.prestataire}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-xs font-medium uppercase tracking-wide">Risque sécurité</dt>
            <dd className={`font-medium mt-0.5 ${demande.safety_risk ? 'text-red-600' : 'text-slate-400'}`}>
              {demande.safety_risk ? 'Oui' : 'Non'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400 text-xs font-medium uppercase tracking-wide">Arrêt production</dt>
            <dd className={`font-medium mt-0.5 ${demande.production_stop ? 'text-amber-600' : 'text-slate-400'}`}>
              {demande.production_stop ? 'Oui' : 'Non'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400 text-xs font-medium uppercase tracking-wide">Score priorité</dt>
            <dd className="font-medium text-slate-900 mt-0.5">{demande.priority_score} / 100</dd>
          </div>
        </dl>
      </div>

      {/* Bons de commande liés */}
      {hasBCs && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="font-semibold text-slate-900 text-sm">Bons de commande liés</div>
            <Link href="/bons-de-commande" className="text-xs text-blue-600 hover:underline">Tout voir →</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {demande.bcs!.map(bc => (
              <Link
                key={bc.id}
                href={`/bons-de-commande/${bc.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors group"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {bc.po_number}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {bc.amount.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} TND
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${BC_STATUS_COLOR[bc.status] ?? 'bg-slate-100 text-slate-500'}`}>
                  {BC_STATUS_LABEL[bc.status] ?? bc.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Section clôture — visible pour les interventions planifiées / en cours */}
      {canClose && (
        <ClotureSection
          demandeId={params.id}
          otId={`ot-${params.id}`}
          status={demande.status}
        />
      )}
    </div>
  );
}
