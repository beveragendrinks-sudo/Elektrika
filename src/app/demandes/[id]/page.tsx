import RequestTimeline from '@/components/RequestTimeline';
import type { TimelineStep } from '@/components/RequestTimeline';
import Link from 'next/link';
import ClotureSection from './ClotureSection';
import AppelOffreSection from './AppelOffreSection';
import type { RequestStatus } from '@/types';
import type { InterventionCategory } from '@/types';
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/interventionData';

interface MockDemande {
  ref: string;
  title: string;
  equipment: string;
  site: string;
  entity: string;
  status: RequestStatus;
  category: string;
  categoryKey?: InterventionCategory;
  nature: string;
  safety_risk: boolean;
  production_stop: boolean;
  priority_score: number;
  prestataire: string;
  steps: TimelineStep[];
  bcs?: { id: string; po_number: string; status: string; amount: number }[];
}

const now = Date.now();
const h   = (n: number) => new Date(now - n * 3_600_000).toISOString();

const MOCK_DEMANDES: Record<string, MockDemande> = {
  d1: {
    ref: 'DEM-2026-041', title: 'Panne disjoncteur local technique RDC',
    equipment: 'Tableau TGBT-RDC', site: 'Siège, Ben Arous', entity: 'LAD',
    status: 'en_cours', category: 'Électricité', nature: 'Corrective',
    safety_risk: false, production_stop: true, priority_score: 68,
    prestataire: 'Mohamed Salah',
    steps: [
      { status: 'nouveau',        entered_at: h(72), exited_at: h(70) },
      { status: 'en_preparation', entered_at: h(70), exited_at: h(8) },
      { status: 'planifie',       entered_at: h(8),  exited_at: h(3) },
      { status: 'en_cours',       entered_at: h(3),  exited_at: null, low_alert_hours: 8, escalation_hours: 24 },
    ],
    bcs: [{ id: 'bc-1', po_number: 'BC-LAD-2026-000041', status: 'draft', amount: 742.5 }],
  },
  d2: {
    ref: 'DEM-2026-039', title: 'Fuite canalisation bureau direction',
    equipment: 'Réseau plomberie — niveau 2', site: 'Siège, Ben Arous', entity: 'LAD',
    status: 'planifie', category: 'Plomberie', nature: 'Corrective',
    safety_risk: false, production_stop: false, priority_score: 42,
    prestataire: 'Karim Bejaoui',
    steps: [
      { status: 'nouveau',        entered_at: h(96), exited_at: h(94) },
      { status: 'en_preparation', entered_at: h(94), exited_at: h(12) },
      { status: 'planifie',       entered_at: h(12), exited_at: null, low_alert_hours: 24, escalation_hours: 72 },
    ],
  },
  d3: {
    ref: 'DEM-2026-035', title: 'Climatiseur salle de réunion H4',
    equipment: 'Unité CTA-H4', site: 'Siège, Ben Arous', entity: 'LAD',
    status: 'a_confirmer', category: 'Climatisation', nature: 'Préventive',
    safety_risk: false, production_stop: false, priority_score: 30,
    prestataire: 'Anis Trabelsi',
    steps: [
      { status: 'nouveau',        entered_at: h(288), exited_at: h(286) },
      { status: 'en_preparation', entered_at: h(286), exited_at: h(72) },
      { status: 'planifie',       entered_at: h(72),  exited_at: h(48) },
      { status: 'en_cours',       entered_at: h(48),  exited_at: h(4) },
      { status: 'a_confirmer',    entered_at: h(4),   exited_at: null, low_alert_hours: 24, escalation_hours: 48 },
    ],
    bcs: [{ id: 'bc-2', po_number: 'BC-LAD-2026-000038', status: 'confirmed', amount: 320 }],
  },
  d4: {
    ref: 'DEM-2026-028', title: 'Peinture couloir niveau 2',
    equipment: 'Couloir N2 — bâtiment principal', site: 'Siège, Ben Arous', entity: 'LAD',
    status: 'termine', category: 'Peinture', nature: 'Amélioration',
    safety_risk: false, production_stop: false, priority_score: 15,
    prestataire: 'Anis Trabelsi',
    steps: [
      { status: 'nouveau',        entered_at: h(600), exited_at: h(598) },
      { status: 'en_preparation', entered_at: h(598), exited_at: h(480) },
      { status: 'planifie',       entered_at: h(480), exited_at: h(360) },
      { status: 'en_cours',       entered_at: h(360), exited_at: h(240) },
      { status: 'a_confirmer',    entered_at: h(240), exited_at: h(120) },
      { status: 'termine',        entered_at: h(120), exited_at: null },
    ],
  },
  d5: {
    ref: 'DEM-2026-021', title: 'Installation tableau électrique annexe',
    equipment: 'Annexe A — tableau TGBT-A', site: 'Unité Production, La Manouba', entity: 'LAD',
    status: 'termine', category: 'Électricité', nature: 'Travaux neufs',
    safety_risk: true, production_stop: false, priority_score: 55,
    prestataire: 'Mohamed Salah',
    steps: [
      { status: 'nouveau',        entered_at: h(800), exited_at: h(798) },
      { status: 'en_attente',     entered_at: h(798), exited_at: h(780) },
      { status: 'en_preparation', entered_at: h(780), exited_at: h(360) },
      { status: 'planifie',       entered_at: h(360), exited_at: h(240) },
      { status: 'en_cours',       entered_at: h(240), exited_at: h(96) },
      { status: 'a_confirmer',    entered_at: h(96),  exited_at: h(48) },
      { status: 'termine',        entered_at: h(48),  exited_at: null },
    ],
    bcs: [
      { id: 'bc-3', po_number: 'BC-FAD-2026-000027', status: 'received', amount: 1380 },
      { id: 'bc-4', po_number: 'BC-FAD-2026-000039', status: 'received', amount: 620 },
    ],
  },
  d6: {
    ref: 'DEM-2026-015', title: 'Réparation porte coupe-feu',
    equipment: 'Porte RF-12 — accès sous-sol', site: 'Siège, Ben Arous', entity: 'LAD',
    status: 'termine', category: 'Menuiserie', nature: 'Conformité',
    safety_risk: false, production_stop: false, priority_score: 20,
    prestataire: 'Anis Trabelsi',
    steps: [
      { status: 'nouveau',        entered_at: h(1200), exited_at: h(1198) },
      { status: 'en_preparation', entered_at: h(1198), exited_at: h(900) },
      { status: 'planifie',       entered_at: h(900),  exited_at: h(700) },
      { status: 'en_cours',       entered_at: h(700),  exited_at: h(500) },
      { status: 'a_confirmer',    entered_at: h(500),  exited_at: h(300) },
      { status: 'termine',        entered_at: h(300),  exited_at: null },
    ],
  },
  d7: {
    ref: 'DEM-2026-044', title: 'Remplacement pompe hydraulique P-12',
    equipment: 'Pompe P-12 — circuit principal', site: 'Pôle Industriel, Jbel Oust', entity: 'FAD',
    status: 'en_preparation', category: 'Plomberie', nature: 'Réparation',
    safety_risk: false, production_stop: true, priority_score: 72,
    prestataire: 'Hichem Trabelsi',
    steps: [
      { status: 'nouveau',        entered_at: h(120), exited_at: h(118) },
      { status: 'en_preparation', entered_at: h(118), exited_at: null, low_alert_hours: 48, escalation_hours: 120 },
    ],
    bcs: [{ id: 'bc-3', po_number: 'BC-FAD-2026-000027', status: 'sent', amount: 1380 }],
  },
  '1': {
    ref: 'DEM-2026-041', title: 'Panne tableau électrique atelier B',
    equipment: 'Tableau TGS-B2', site: 'Siège, Ben Arous', entity: 'LAD',
    status: 'en_preparation', category: 'Électricité', nature: 'Corrective',
    safety_risk: false, production_stop: false, priority_score: 72,
    prestataire: 'Mohamed Salah',
    steps: [
      { status: 'nouveau',        entered_at: h(30), exited_at: h(28) },
      { status: 'en_preparation', entered_at: h(28), exited_at: null, low_alert_hours: 4, escalation_hours: 24 },
    ],
  },
  '2': {
    ref: 'DEM-2026-040', title: 'Remplacement fusible armoire B3',
    equipment: 'Armoire B3', site: 'Siège, Ben Arous', entity: 'LAD',
    status: 'en_cours', category: 'Électricité', nature: 'Corrective',
    safety_risk: false, production_stop: false, priority_score: 68,
    prestataire: 'Mohamed Salah',
    steps: [
      { status: 'nouveau',        entered_at: h(10), exited_at: h(8) },
      { status: 'en_preparation', entered_at: h(8),  exited_at: h(2) },
      { status: 'planifie',       entered_at: h(2),  exited_at: h(1) },
      { status: 'en_cours',       entered_at: h(1),  exited_at: null, low_alert_hours: 8, escalation_hours: 24 },
    ],
  },
  '3': {
    ref: 'DEM-2026-038', title: 'Câblage armoire AT-04',
    equipment: 'Armoire AT-04', site: 'Siège, Ben Arous', entity: 'LAD',
    status: 'a_confirmer', category: 'Électricité', nature: 'Travaux neufs',
    safety_risk: false, production_stop: false, priority_score: 45,
    prestataire: 'Mohamed Salah',
    steps: [
      { status: 'nouveau',        entered_at: h(72), exited_at: h(70) },
      { status: 'en_preparation', entered_at: h(70), exited_at: h(24) },
      { status: 'planifie',       entered_at: h(24), exited_at: h(8) },
      { status: 'en_cours',       entered_at: h(8),  exited_at: h(4) },
      { status: 'a_confirmer',    entered_at: h(4),  exited_at: null, low_alert_hours: 24, escalation_hours: 48 },
    ],
    bcs: [{ id: 'bc-2', po_number: 'BC-LAD-2026-000038', status: 'confirmed', amount: 320 }],
  },
  '4': {
    ref: 'DEM-2026-037', title: 'Disjoncteur Atelier C — remplacement',
    equipment: 'Disjoncteur C3', site: 'Pôle Industriel, Jbel Oust', entity: 'FAD',
    status: 'planifie', category: 'Électricité', nature: 'Corrective',
    safety_risk: false, production_stop: true, priority_score: 50,
    prestataire: 'Mohamed Salah',
    steps: [
      { status: 'nouveau',        entered_at: h(5),  exited_at: h(3) },
      { status: 'en_preparation', entered_at: h(3),  exited_at: h(1) },
      { status: 'planifie',       entered_at: h(1),  exited_at: null, low_alert_hours: 24, escalation_hours: 72 },
    ],
  },
  '5': {
    ref: 'DEM-2026-048', title: 'Réparation porte bureau P3',
    equipment: 'Porte bureau P3 — bâtiment principal', site: 'Siège, Ben Arous', entity: 'LAD',
    status: 'appel_offre', category: 'Menuiserie', categoryKey: 'menuiserie', nature: 'Corrective',
    safety_risk: false, production_stop: false, priority_score: 35,
    prestataire: '',
    steps: [
      { status: 'nouveau',      entered_at: h(80), exited_at: h(78) },
      { status: 'en_attente',   entered_at: h(78), exited_at: h(60) },
      { status: 'appel_offre',  entered_at: h(60), exited_at: null, low_alert_hours: 48, escalation_hours: 96 },
    ],
  },
  '6': {
    ref: 'DEM-2026-035', title: 'Fuite canalisation atelier C — eau froide',
    equipment: 'Réseau eau froide', site: 'Pôle Industriel, Jbel Oust', entity: 'FAD',
    status: 'en_cours', category: 'Plomberie', nature: 'Corrective',
    safety_risk: false, production_stop: false, priority_score: 80,
    prestataire: 'Karim Bejaoui',
    steps: [
      { status: 'nouveau',        entered_at: h(14), exited_at: h(12) },
      { status: 'en_preparation', entered_at: h(12), exited_at: h(4) },
      { status: 'planifie',       entered_at: h(4),  exited_at: h(2) },
      { status: 'en_cours',       entered_at: h(2),  exited_at: null, low_alert_hours: 8, escalation_hours: 24 },
    ],
  },
  '7': {
    ref: 'DEM-2026-034', title: 'Climatiseur salle serveurs hors service',
    equipment: 'Clim. split 18000 BTU', site: 'Siège, Ben Arous', entity: 'LAD',
    status: 'planifie', category: 'Climatisation', nature: 'Corrective',
    safety_risk: false, production_stop: false, priority_score: 90,
    prestataire: 'Anis Trabelsi',
    steps: [
      { status: 'nouveau',        entered_at: h(24), exited_at: h(22) },
      { status: 'en_preparation', entered_at: h(22), exited_at: h(8) },
      { status: 'planifie',       entered_at: h(8),  exited_at: null, low_alert_hours: 24, escalation_hours: 72 },
    ],
  },
  '8': {
    ref: 'DEM-2026-033', title: 'Vérification tableau BT — atelier Jbel Oust',
    equipment: 'Tableau BT', site: 'Pôle Industriel, Jbel Oust', entity: 'FAD',
    status: 'en_cours', category: 'Électricité', nature: 'Préventive',
    safety_risk: false, production_stop: false, priority_score: 55,
    prestataire: 'Mohamed Salah',
    steps: [
      { status: 'nouveau',        entered_at: h(8),  exited_at: h(7) },
      { status: 'en_preparation', entered_at: h(7),  exited_at: h(3) },
      { status: 'planifie',       entered_at: h(3),  exited_at: h(1) },
      { status: 'en_cours',       entered_at: h(1),  exited_at: null, low_alert_hours: 8, escalation_hours: 24 },
    ],
  },
  '9': {
    ref: 'DEM-2026-032', title: 'Remplacement pompe hydraulique P-12',
    equipment: 'Pompe P-12', site: 'Pôle Industriel, Jbel Oust', entity: 'FAD',
    status: 'en_preparation', category: 'Plomberie', nature: 'Réparation',
    safety_risk: false, production_stop: true, priority_score: 65,
    prestataire: 'Hichem Trabelsi',
    steps: [
      { status: 'nouveau',        entered_at: h(70), exited_at: h(68) },
      { status: 'en_preparation', entered_at: h(68), exited_at: null, low_alert_hours: 48, escalation_hours: 120 },
    ],
    bcs: [{ id: 'bc-5', po_number: 'BC-FAD-2026-000042', status: 'sent', amount: 1380 }],
  },
  '10': {
    ref: 'DEM-2026-031', title: 'Fissures mur porteur entrepôt Est',
    equipment: 'Mur B-Est', site: 'Entrepôt Est, Grombalia', entity: 'BTFI',
    status: 'en_attente', category: 'Maçonnerie', nature: 'Conformité',
    safety_risk: true, production_stop: false, priority_score: 60,
    prestataire: 'Anis Trabelsi',
    steps: [
      { status: 'nouveau',    entered_at: h(80), exited_at: h(75) },
      { status: 'en_attente', entered_at: h(75), exited_at: null, low_alert_hours: 24, escalation_hours: 72 },
    ],
  },
  '11': {
    ref: 'DEM-2026-030', title: 'Maintenance préventive armoire P2',
    equipment: 'Armoire P2', site: 'Pôle Industriel, Jbel Oust', entity: 'FAD',
    status: 'planifie', category: 'Électricité', nature: 'Préventive',
    safety_risk: false, production_stop: false, priority_score: 30,
    prestataire: 'Mohamed Salah',
    steps: [
      { status: 'nouveau',        entered_at: h(6),  exited_at: h(4) },
      { status: 'en_preparation', entered_at: h(4),  exited_at: h(1) },
      { status: 'planifie',       entered_at: h(1),  exited_at: null, low_alert_hours: 24, escalation_hours: 72 },
    ],
  },
  '12': {
    ref: 'DEM-2026-029', title: 'Peinture couloir administratif — bâtiment A',
    equipment: 'Couloir A3', site: 'Siège, Ben Arous', entity: 'LAD',
    status: 'en_preparation', category: 'Peinture', nature: 'Amélioration',
    safety_risk: false, production_stop: false, priority_score: 15,
    prestataire: 'Anis Trabelsi',
    steps: [
      { status: 'nouveau',        entered_at: h(42), exited_at: h(40) },
      { status: 'en_preparation', entered_at: h(40), exited_at: null, low_alert_hours: 24, escalation_hours: 72 },
    ],
    bcs: [{ id: 'bc-6', po_number: 'BC-LAD-2026-000043', status: 'draft', amount: 480 }],
  },
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

  const hasBCs         = (demande.bcs?.length ?? 0) > 0;
  const canClose       = demande.status === 'planifie' || demande.status === 'en_cours';
  const showAppelOffre = demande.status === 'appel_offre';
  const showOT         = demande.status !== 'nouveau' && demande.status !== 'en_attente' && demande.status !== 'appel_offre';
  const showNewBC      = demande.status === 'en_preparation';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/demandes" className="hover:text-slate-900 transition-colors">Demandes</Link>
        <span>/</span>
        <span className="font-mono text-slate-600">{demande.ref}</span>
      </div>

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
          {showOT && (
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
          {showNewBC && (
            <Link
              href={`/bons-de-commande/new?request_id=${params.id}`}
              className="shrink-0 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              + Nouveau BC
            </Link>
          )}
        </div>
      </div>

      <RequestTimeline
        requestTitle={demande.title}
        equipmentName={demande.equipment}
        siteName={demande.site}
        steps={demande.steps}
        currentStatus={demande.status}
      />

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

      {showAppelOffre && demande.categoryKey && (
        <AppelOffreSection
          interventionId={params.id}
          interventionRef={demande.ref}
          category={demande.categoryKey}
        />
      )}

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
