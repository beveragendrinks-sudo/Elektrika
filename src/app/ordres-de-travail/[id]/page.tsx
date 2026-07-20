'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

// ── Entity profiles (same source as BC page, will come from Supabase settings) ──
interface EntityProfile {
  full_name: string;
  address: string;
  phone: string;
  matricule_fiscale: string;
}

const ENTITY_PROFILES: Record<string, EntityProfile> = {
  LAD:     { full_name: 'Société LAD',      address: 'Zone Industrielle Charguia II, 2035 Ariana', phone: '+216 71 234 000', matricule_fiscale: '1234567/A/M/000' },
  FAD:     { full_name: 'Société FAD',      address: 'Rue des Entrepreneurs, 2010 Tunis',           phone: '+216 71 345 111', matricule_fiscale: '2345678/B/M/000' },
  BTFI:    { full_name: 'BTFI S.A.',        address: 'Avenue Habib Bourguiba, 1000 Tunis',          phone: '+216 71 456 222', matricule_fiscale: '3456789/C/M/000' },
  '3Ps':   { full_name: '3Ps Industrie',    address: 'Route de Sfax km 8, 2040 Radès',             phone: '+216 71 567 333', matricule_fiscale: '4567890/D/M/000' },
  'K&Ko':  { full_name: 'K&Ko Services',    address: 'Zone Franche Bizerte, 7020 Bizerte',         phone: '+216 72 678 444', matricule_fiscale: '5678901/E/M/000' },
  'Privée':{ full_name: 'Propriété Privée', address: '12 Rue des Oliviers, 2080 Ariana',           phone: '+216 71 789 555', matricule_fiscale: '6789012/F/P/000' },
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface OTDemande {
  request_id: string;
  ref: string;
  title: string;
  site: string;
  type_label: string;
  location: string;
  safety_risk: boolean;
  production_stop: boolean;
  ai_diagnosis: string;
  ai_materials: { description: string; quantity: number; unit: string }[];
}

interface ValidatedBC {
  bc_id: string;
  po_number: string;
  supplier: string;
  lines_summary: string;
  total: number;
}

interface OTData {
  ot_id: string;
  ot_number: string;
  emission_date: string;
  mission_date: string;
  entity_code: string;
  electrician: string;
  status: 'planned' | 'in_progress' | 'completed';
  demande: OTDemande;
  validated_bcs: ValidatedBC[];
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_OTS: Record<string, OTData> = {
  'ot-2': {
    ot_id: 'ot-2', ot_number: 'OT-LAD-2026-000023',
    emission_date: '15/07/2026', mission_date: '15/07/2026',
    entity_code: 'LAD', electrician: 'Mohamed Salah', status: 'in_progress',
    demande: {
      request_id: '2', ref: 'DR-LAD-2026-000002',
      title: 'Remplacement fusible armoire B3', site: 'Siège Ben Arous',
      type_label: 'Dépannage / Panne simple',
      location: 'Armoire de distribution B3 — bâtiment principal, rez-de-chaussée',
      safety_risk: false, production_stop: false,
      ai_diagnosis: 'Fusible grillé suite à surcharge transitoire. Vérifier la charge en aval avant remplacement. Contrôler l\'état des bornes de connexion.',
      ai_materials: [
        { description: 'Fusible cylindrique 25A gG 10×38mm', quantity: 3, unit: 'pièce' },
      ],
    },
    validated_bcs: [],
  },
  'ot-3': {
    ot_id: 'ot-3', ot_number: 'OT-LAD-2026-000022',
    emission_date: '14/07/2026', mission_date: '14/07/2026',
    entity_code: 'LAD', electrician: 'Mohamed Salah', status: 'completed',
    demande: {
      request_id: '3', ref: 'DR-LAD-2026-000003',
      title: 'Câblage armoire AT-04', site: 'Siège Ben Arous',
      type_label: 'Travaux électriques',
      location: 'Armoire AT-04 — salle des machines, niveau 2',
      safety_risk: false, production_stop: false,
      ai_diagnosis: 'Câblage à refaire suite à modification du schéma électrique. Respect des codes couleurs NF C 15-100. Mise à jour du schéma synoptique.',
      ai_materials: [
        { description: 'Câble H07V-K 2.5mm² (rouge)', quantity: 30, unit: 'ml' },
        { description: 'Câble H07V-K 2.5mm² (bleu)', quantity: 30, unit: 'ml' },
        { description: 'Câble H07V-K 2.5mm² (vert/jaune)', quantity: 10, unit: 'ml' },
        { description: 'Embout de câblage E2508 — lot 100', quantity: 1, unit: 'lot' },
      ],
    },
    validated_bcs: [
      { bc_id: 'bc-2', po_number: 'BC-LAD-2026-000038', supplier: 'Tunisie Électrique', lines_summary: 'Câbles + disjoncteur', total: 320 },
    ],
  },
  'ot-1': {
    ot_id: 'ot-1', ot_number: 'OT-LAD-2026-000024',
    emission_date: '02/07/2026', mission_date: '02/07/2026',
    entity_code: 'LAD', electrician: 'Mohamed Salah', status: 'planned',
    demande: {
      request_id: '1', ref: 'DR-LAD-2026-000001',
      title: 'Panne tableau TGS-B2', site: 'Siège Ben Arous',
      type_label: 'Dépannage / Panne simple',
      location: 'Tableau général basse tension — bâtiment principal, sous-sol',
      safety_risk: true, production_stop: false,
      ai_diagnosis: "Probable disjoncteur défaillant ou court-circuit sur la ligne B2. Vérifier l'état des fusibles et la continuité du câblage en aval du tableau.",
      ai_materials: [
        { description: 'Disjoncteur modulaire 40A courbe C', quantity: 1, unit: 'pièce' },
        { description: 'Fusible cylindrique 25A gG', quantity: 4, unit: 'pièce' },
      ],
    },
    validated_bcs: [],
  },
  'ot-4': {
    ot_id: 'ot-4', ot_number: 'OT-LAD-2026-000025',
    emission_date: '02/07/2026', mission_date: '02/07/2026',
    entity_code: 'LAD', electrician: 'Mohamed Salah', status: 'planned',
    demande: {
      request_id: '4', ref: 'DR-LAD-2026-000004',
      title: 'Disjoncteur Atelier C', site: 'Pôle Industriel Jbel Oust',
      type_label: 'Dépannage / Panne simple',
      location: 'Armoire de distribution secondaire — Atelier C, rangée 3',
      safety_risk: false, production_stop: true,
      ai_diagnosis: 'Disjoncteur moteur en défaut thermique suite à surcharge. Vérifier la charge du moteur et la ventilation avant réarmement. Contrôler le calibre du disjoncteur.',
      ai_materials: [
        { description: 'Disjoncteur moteur GV2-ME14 (6-10A)', quantity: 1, unit: 'pièce' },
      ],
    },
    validated_bcs: [
      { bc_id: 'bc-2', po_number: 'BC-LAD-2026-000038', supplier: 'Elkateb Electricité', lines_summary: 'Câblage armoire + connecteurs', total: 320 },
    ],
  },
  'ot-5': {
    ot_id: 'ot-5', ot_number: 'OT-LAD-2026-000026',
    emission_date: '02/07/2026', mission_date: '03/07/2026',
    entity_code: 'LAD', electrician: 'Mohamed Salah', status: 'planned',
    demande: {
      request_id: '5', ref: 'DR-LAD-2026-000005',
      title: 'Remplacement variateur V-08', site: 'Megrine',
      type_label: 'Réparation avec matériel',
      location: 'Atelier production — armoire électrique principale, baie 2',
      safety_risk: false, production_stop: true,
      ai_diagnosis: "Variateur de fréquence ABB ACS580 hors service — défaut interne confirmé par code erreur F-0022. Remplacement complet de l'unité requis. Ne pas tenter de réparation sur site.",
      ai_materials: [
        { description: 'Variateur ABB ACS580 7.5kW 400V', quantity: 1, unit: 'pièce' },
        { description: 'Câble H07V-U 6mm² (rouge)', quantity: 10, unit: 'ml' },
        { description: 'Connecteurs type F — lot 10 pièces', quantity: 2, unit: 'lot' },
      ],
    },
    validated_bcs: [
      { bc_id: 'bc-1', po_number: 'BC-LAD-2026-000041', supplier: 'Elkateb Electricité', lines_summary: 'Variateur + câbles + connecteurs', total: 742.5 },
    ],
  },
  'ot-6': {
    ot_id: 'ot-6', ot_number: 'OT-FAD-2026-000011',
    emission_date: '14/07/2026', mission_date: '14/07/2026',
    entity_code: 'FAD', electrician: 'Karim Bejaoui', status: 'in_progress',
    demande: {
      request_id: '6', ref: 'DR-FAD-2026-000006',
      title: 'Fuite canalisation atelier C — eau froide', site: 'Pôle Industriel Jbel Oust',
      type_label: 'Dépannage / Panne simple',
      location: 'Réseau eau froide — atelier C, mur nord',
      safety_risk: false, production_stop: false,
      ai_diagnosis: 'Fuite sur raccord compression DN25. Probable corrosion du raccord. Couper l\'alimentation en eau avant intervention. Remplacer le raccord et vérifier l\'ensemble du réseau aval.',
      ai_materials: [
        { description: 'Raccord compression DN25 laiton', quantity: 2, unit: 'pièce' },
        { description: 'Joint torique 25mm — sachet 10', quantity: 1, unit: 'sachet' },
      ],
    },
    validated_bcs: [],
  },
  'ot-7': {
    ot_id: 'ot-7', ot_number: 'OT-LAD-2026-000020',
    emission_date: '14/07/2026', mission_date: '16/07/2026',
    entity_code: 'LAD', electrician: 'Anis Trabelsi', status: 'planned',
    demande: {
      request_id: '7', ref: 'DR-LAD-2026-000007',
      title: 'Climatiseur salle serveurs hors service', site: 'Siège Ben Arous',
      type_label: 'Réparation avec matériel',
      location: 'Salle serveurs — niveau 1, local technique',
      safety_risk: false, production_stop: false,
      ai_diagnosis: 'Unité extérieure hors service — code erreur E4 (fuite de gaz frigorigène). Recharge en R410A requise après détection et colmatage de la fuite. Prévoir kit de recharge et détecteur de fuite.',
      ai_materials: [
        { description: 'Gaz R410A (bouteille 10kg)', quantity: 1, unit: 'bouteille' },
        { description: 'Kit joint + raccord flare 1/4"', quantity: 1, unit: 'kit' },
      ],
    },
    validated_bcs: [],
  },
  'ot-9': {
    ot_id: 'ot-9', ot_number: 'OT-FAD-2026-000012',
    emission_date: '13/07/2026', mission_date: '18/07/2026',
    entity_code: 'FAD', electrician: 'Hichem Trabelsi', status: 'planned',
    demande: {
      request_id: '9', ref: 'DR-FAD-2026-000009',
      title: 'Remplacement pompe hydraulique P-12', site: 'Pôle Industriel Jbel Oust',
      type_label: 'Réparation avec matériel',
      location: 'Salle des machines — circuit hydraulique principal',
      safety_risk: false, production_stop: true,
      ai_diagnosis: 'Pompe hydraulique à engrenages P-12 hors service — usure avancée des dentures confirmée par analyse vibratoire. Remplacement complet de la pompe recommandé.',
      ai_materials: [
        { description: 'Pompe hydraulique à engrenages 18cc/tr', quantity: 1, unit: 'pièce' },
        { description: "Joint d'étanchéité kit complet", quantity: 2, unit: 'kit' },
        { description: 'Huile hydraulique HM46 (bidon 20L)', quantity: 1, unit: 'bidon' },
      ],
    },
    validated_bcs: [
      { bc_id: 'bc-5', po_number: 'BC-FAD-2026-000042', supplier: 'Techno Hydraulique Tunisie', lines_summary: 'Pompe + joints + huile', total: 1380 },
    ],
  },
  'ot-10': {
    ot_id: 'ot-10', ot_number: 'OT-BTFI-2026-000008',
    emission_date: '09/07/2026', mission_date: '21/07/2026',
    entity_code: 'BTFI', electrician: 'Anis Trabelsi', status: 'planned',
    demande: {
      request_id: '10', ref: 'DR-BTFI-2026-000010',
      title: 'Fissures mur porteur entrepôt Est', site: 'Entrepôt Est, Grombalia',
      type_label: 'Travaux de maçonnerie',
      location: 'Mur porteur B-Est — entrepôt Est, côté nord',
      safety_risk: true, production_stop: false,
      ai_diagnosis: 'Fissures structurelles sur mur porteur. Expertise requise avant travaux. Périmètre de sécurité à mettre en place. Reprise en sous-œuvre possible selon diagnostic béton armé.',
      ai_materials: [
        { description: 'Mortier de réparation structurelle', quantity: 3, unit: 'sac 25kg' },
        { description: 'Résine d\'injection époxy', quantity: 2, unit: 'cartouche 300ml' },
      ],
    },
    validated_bcs: [],
  },
  'ot-11': {
    ot_id: 'ot-11', ot_number: 'OT-FAD-2026-000013',
    emission_date: '16/07/2026', mission_date: '17/07/2026',
    entity_code: 'FAD', electrician: 'Mohamed Salah', status: 'planned',
    demande: {
      request_id: '11', ref: 'DR-FAD-2026-000011',
      title: 'Maintenance préventive armoire P2', site: 'Pôle Industriel Jbel Oust',
      type_label: 'Contrôle / Vérification périodique',
      location: 'Armoire de puissance P2 — atelier B, rangée 2',
      safety_risk: false, production_stop: false,
      ai_diagnosis: 'Maintenance préventive planifiée. Vérifier l\'état des contacts, la continuité des jeux de barres, resserrage des borniers, nettoyage des filtres ventilation.',
      ai_materials: [],
    },
    validated_bcs: [],
  },
  'ot-12': {
    ot_id: 'ot-12', ot_number: 'OT-LAD-2026-000028',
    emission_date: '10/07/2026', mission_date: '21/07/2026',
    entity_code: 'LAD', electrician: 'Anis Trabelsi', status: 'planned',
    demande: {
      request_id: '12', ref: 'DR-LAD-2026-000012',
      title: 'Peinture couloir administratif — bâtiment A', site: 'Siège Ben Arous',
      type_label: 'Travaux de peinture',
      location: 'Couloir A3 — bâtiment administratif, rez-de-chaussée',
      safety_risk: false, production_stop: false,
      ai_diagnosis: 'Peinture dégradée sur 45m² environ. Préparation de surface (ponçage, enduit), application 2 couches peinture lessivable blanc cassé. Prévoir protection sol et mobilier.',
      ai_materials: [
        { description: 'Enduit de lissage — sac 25kg', quantity: 2, unit: 'sac' },
        { description: 'Peinture lessivable blanc cassé — pot 15L', quantity: 3, unit: 'pot' },
        { description: 'Papier de verre grain 120', quantity: 5, unit: 'feuille' },
      ],
    },
    validated_bcs: [
      { bc_id: 'bc-6', po_number: 'BC-LAD-2026-000043', supplier: 'Peintures & Déco Tunis', lines_summary: 'Enduit + peinture + abrasif', total: 480 },
    ],
  },
  'ot-8': {
    ot_id: 'ot-8', ot_number: 'OT-LAD-2026-000027',
    emission_date: '02/07/2026', mission_date: '02/07/2026',
    entity_code: 'LAD', electrician: 'Mohamed Salah', status: 'planned',
    demande: {
      request_id: '8', ref: 'DR-LAD-2026-000008',
      title: 'Vérification tableau BT', site: 'Pôle Industriel Jbel Oust',
      type_label: 'Contrôle / Vérification périodique',
      location: 'Tableau basse tension — salle de distribution principale',
      safety_risk: false, production_stop: false,
      ai_diagnosis: "Vérification périodique du tableau BT. Contrôler l'état des disjoncteurs, la continuité des jeux de barres, la conformité des câblages et l'absence de points chauds.",
      ai_materials: [],
    },
    validated_bcs: [],
  },
};

const STATUS_LABEL: Record<OTData['status'], string> = {
  planned:    "Planifié — En attente d'exécution",
  in_progress:'En cours d\'exécution',
  completed:  'Intervention terminée',
};

const STATUS_COLORS: Record<OTData['status'], string> = {
  planned:    'bg-indigo-50 border-indigo-200 text-indigo-700',
  in_progress:'bg-cyan-50 border-cyan-200 text-cyan-700',
  completed:  'bg-green-50 border-green-200 text-green-700',
};

// ── OT Document (captured by html2canvas for PDF) ─────────────────────────────
function OTDocument({ ot, docRef }: { ot: OTData; docRef: React.RefObject<HTMLDivElement> }) {
  const entity = ENTITY_PROFILES[ot.entity_code] ?? {
    full_name: ot.entity_code, address: '—', phone: '—', matricule_fiscale: '—',
  };

  return (
    <div ref={docRef} className="bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>

      {/* ── HEADER ── */}
      <div className="px-10 pt-10 pb-7 border-b-2 border-slate-900">
        <div className="flex items-start justify-between gap-8">
          <div className="space-y-0.5">
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{ot.entity_code}</div>
            <div className="text-sm font-medium text-slate-600">{entity.full_name}</div>
            <div className="text-sm text-slate-500 mt-2">{entity.address}</div>
            <div className="text-sm text-slate-500">Tél. : {entity.phone}</div>
            <div className="text-sm text-slate-500">MF : {entity.matricule_fiscale}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-4xl font-black text-slate-900 tracking-tight uppercase">Ordre de Travail</div>
            <div className="mt-3 space-y-1">
              <div className="text-lg font-bold text-slate-700">{ot.ot_number}</div>
              <div className="text-sm text-slate-400">Émis le : {ot.emission_date}</div>
              <div className="text-sm font-semibold text-slate-600">Intervention prévue : <span className="text-slate-900">{ot.mission_date}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STATUS BAND ── */}
      <div className={`px-10 py-3 flex items-center justify-between border-b ${STATUS_COLORS[ot.status]}`}>
        <span className="text-sm font-semibold">{STATUS_LABEL[ot.status]}</span>
        <div className="text-sm">
          <span className="opacity-60">Prestataire : </span>
          <span className="font-semibold">{ot.electrician}</span>
          <span className="opacity-60"> — Prestataire de service</span>
        </div>
      </div>

      <div className="px-10 py-8 space-y-6">

        {/* ── INTERVENTION DETAILS ── */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Détails de l&apos;intervention</span>
            <span className="text-xs font-mono text-slate-400">{ot.demande.ref}</span>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="text-base font-bold text-slate-900">{ot.demande.title}</div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex gap-3">
                <span className="text-slate-400 w-24 shrink-0">Site</span>
                <span className="font-medium text-slate-800">{ot.demande.site}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-slate-400 w-24 shrink-0">Type</span>
                <span className="font-medium text-slate-800">{ot.demande.type_label}</span>
              </div>
              <div className="flex gap-3 sm:col-span-2">
                <span className="text-slate-400 w-24 shrink-0">Localisation</span>
                <span className="font-medium text-slate-800">{ot.demande.location}</span>
              </div>
            </div>
            {(ot.demande.safety_risk || ot.demande.production_stop) && (
              <div className="flex gap-2 pt-1 flex-wrap">
                {ot.demande.safety_risk && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded bg-red-100 text-red-700 border border-red-200">
                    ⚠ RISQUE SÉCURITÉ
                  </span>
                )}
                {ot.demande.production_stop && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded bg-orange-100 text-orange-700 border border-orange-200">
                    ⛔ ARRÊT DE PRODUCTION
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── AI DIAGNOSIS ── */}
        {ot.demande.ai_diagnosis && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Diagnostic / Description</span>
            </div>
            <div className="px-5 py-4 text-sm text-slate-700 leading-relaxed">{ot.demande.ai_diagnosis}</div>
          </div>
        )}

        {/* ── MATERIALS TO BRING ── */}
        {ot.demande.ai_materials.length > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Matériaux recommandés à apporter</span>
            </div>
            <div className="px-5 py-4">
              <ul className="space-y-2">
                {ot.demande.ai_materials.map((m, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="w-8 text-right font-bold text-slate-900 tabular-nums">{m.quantity}</span>
                    <span className="w-12 text-slate-400 text-xs shrink-0">{m.unit}</span>
                    <span className="text-slate-800">{m.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── VALIDATED BCS ── */}
        {ot.validated_bcs.length > 0 && (
          <div className="border border-green-200 rounded-lg overflow-hidden">
            <div className="bg-green-50 px-5 py-3 border-b border-green-200">
              <span className="text-xs font-bold text-green-700 uppercase tracking-widest">Bons de commande validés — matériaux commandés</span>
            </div>
            <div className="px-5 py-4 space-y-3">
              {ot.validated_bcs.map((bc) => (
                <div key={bc.bc_id} className="flex items-start justify-between gap-4 text-sm">
                  <div>
                    <div className="font-bold text-green-800">{bc.po_number}</div>
                    <div className="text-green-600 text-xs mt-0.5">{bc.supplier} · {bc.lines_summary}</div>
                  </div>
                  <span className="font-bold text-green-800 tabular-nums shrink-0">
                    {bc.total.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} TND
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── CUT LINE ── */}
      <div className="mx-8 my-0">
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t-2 border-dashed border-slate-400" />
          <span className="text-slate-400 text-xl select-none" aria-hidden>✂</span>
          <span className="text-xs text-slate-400 italic whitespace-nowrap">Conserver le bas pour signature sur site</span>
          <div className="flex-1 border-t-2 border-dashed border-slate-400" />
        </div>
      </div>

      {/* ── RAPPORT D'INTERVENTION ── */}
      <div className="px-10 pt-6 pb-10 space-y-6">

        {/* Rapport header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-black text-slate-900 uppercase tracking-wide">Rapport d&apos;Intervention</div>
            <div className="text-xs text-slate-400 mt-0.5">{ot.ot_number} — {ot.demande.title}</div>
          </div>
          <div className="text-xs text-slate-500 text-right shrink-0">
            <div>{ot.demande.site}</div>
            <div>{ot.electrician}</div>
          </div>
        </div>

        {/* Time fields */}
        <div className="grid grid-cols-3 gap-6">
          {["Date d'intervention", "Heure de début", "Heure de fin"].map((label) => (
            <div key={label}>
              <div className="text-xs font-semibold text-slate-500 mb-2">{label}</div>
              <div className="border-b-2 border-dashed border-slate-400 h-8" />
            </div>
          ))}
        </div>

        {/* Work done */}
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Travaux réalisés</div>
          {[0, 1, 2, 3].map((i) => <div key={i} className="border-b border-dashed border-slate-300 h-8 mt-1" />)}
        </div>

        {/* Materials used */}
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Matériaux effectivement utilisés</div>
          {[0, 1, 2].map((i) => <div key={i} className="border-b border-dashed border-slate-300 h-8 mt-1" />)}
        </div>

        {/* Duration + Observations */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Durée effective</div>
            <div className="flex items-end gap-6">
              <div>
                <div className="border-b-2 border-dashed border-slate-400 h-8 w-16" />
                <div className="text-xs text-slate-400 mt-1 text-center">heure(s)</div>
              </div>
              <div>
                <div className="border-b-2 border-dashed border-slate-400 h-8 w-16" />
                <div className="text-xs text-slate-400 mt-1 text-center">minute(s)</div>
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Observations / Remarques</div>
            {[0, 1].map((i) => <div key={i} className="border-b border-dashed border-slate-300 h-8 mt-1" />)}
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 pt-6 border-t-2 border-slate-200">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Établi par — Prestataire de service</div>
            <div className="h-16 border-b border-dashed border-slate-300 mb-3" />
            <div className="text-sm font-semibold text-slate-800">{ot.electrician}</div>
            <div className="text-xs text-slate-400 mt-0.5">Prestataire de service · {entity.full_name}</div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Validé par — Responsable sur place</div>
            <div className="space-y-1.5 mb-2">
              <div>
                <div className="text-xs text-slate-400 mb-1">Nom et prénom</div>
                <div className="border-b border-dashed border-slate-400 h-7" />
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Fonction / Titre</div>
                <div className="border-b border-dashed border-slate-400 h-7" />
              </div>
            </div>
            <div className="h-14 border-b border-dashed border-slate-300 mb-2" />
            <div className="text-xs text-slate-400">Cachet et signature</div>
          </div>
        </div>

        {/* Important note */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-3">
          <div className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Important</div>
          <div className="text-xs text-amber-700 leading-relaxed">
            Ce rapport doit être signé par un responsable présent sur site avant le départ de l&apos;électricien.
            L&apos;électricien photographie le bas de ce document signé pour clôturer l&apos;intervention dans le système.
            L&apos;original est remis au responsable ou conservé sur site.
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-300 pt-2 border-t border-slate-100">
          {ot.ot_number} · {entity.full_name} · Généré via Facility Manager · {ot.emission_date}
        </div>
      </div>
    </div>
  );
}

// ── OT Validation Panel ───────────────────────────────────────────────────────
function OTValidationPanel({ status }: { status: OTData['status'] }) {
  const [remarques, setRemarques] = useState('');
  const [actionState, setActionState] = useState<'idle' | 'starting' | 'completing' | 'started' | 'completed'>('idle');

  if (status === 'completed') return null;

  if (actionState === 'started') {
    return (
      <div className="bg-cyan-50 border border-cyan-200 rounded-xl px-6 py-5 flex items-center gap-4">
        <div className="text-2xl">⚡</div>
        <div>
          <div className="font-bold text-cyan-800">Intervention en cours</div>
          <div className="text-sm text-cyan-600 mt-0.5">L&apos;OT a été marqué comme en cours d&apos;exécution.</div>
        </div>
      </div>
    );
  }

  if (actionState === 'completed') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-5 flex items-center gap-4">
        <div className="text-2xl">✓</div>
        <div>
          <div className="font-bold text-green-800">Intervention terminée</div>
          <div className="text-sm text-green-600 mt-0.5">En attente de clôture avec les photos requises.</div>
        </div>
      </div>
    );
  }

  const busy = actionState === 'starting' || actionState === 'completing';

  async function doAction(type: 'starting' | 'completing') {
    setActionState(type);
    await new Promise((r) => setTimeout(r, 800));
    setActionState(type === 'starting' ? 'started' : 'completed');
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
        <div className="font-semibold text-slate-900 text-sm">Actions sur l&apos;ordre de travail</div>
        <div className="text-xs text-slate-500 mt-0.5">
          {status === 'planned' ? "Démarrez l'intervention ou marquez-la comme terminée." : "Marquez l'intervention comme terminée."}
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
            Remarques <span className="font-normal text-slate-400 normal-case tracking-normal">(optionnel)</span>
          </label>
          <textarea
            value={remarques}
            onChange={(e) => setRemarques(e.target.value)}
            rows={3}
            placeholder="Observations, difficultés d'accès, matériaux supplémentaires requis, informations pour la clôture…"
            disabled={busy}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none transition-colors disabled:opacity-50"
          />
        </div>
        <div className="flex gap-3">
          {status === 'planned' && (
            <button
              onClick={() => doAction('starting')}
              disabled={busy}
              className="flex-1 border border-cyan-300 text-cyan-700 text-sm font-semibold py-2.5 rounded-lg hover:bg-cyan-50 transition-colors disabled:opacity-50"
            >
              {actionState === 'starting' ? 'Démarrage…' : 'Démarrer l\'intervention'}
            </button>
          )}
          <button
            onClick={() => doAction('completing')}
            disabled={busy}
            className="flex-1 bg-slate-900 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionState === 'completing' ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Enregistrement…
              </>
            ) : 'Marquer comme terminé'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OTPage({ params }: { params: { id: string } }) {
  const docRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const ot = MOCK_OTS[params.id] ?? null;

  async function downloadPDF() {
    if (!docRef.current || !ot) return;
    setGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const el = docRef.current;
      const canvas = await html2canvas(el, {
        scale: 2, useCORS: true, logging: false,
        backgroundColor: '#ffffff',
        windowWidth: el.scrollWidth, windowHeight: el.scrollHeight,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      let yOffset = 0;
      while (yOffset < imgH) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -yOffset, pageW, imgH);
        yOffset += pageH;
      }
      pdf.save(`${ot.ot_number}.pdf`);
    } catch (err) {
      console.error('Erreur génération PDF:', err);
      alert('Impossible de générer le PDF. Réessayez.');
    } finally {
      setGenerating(false);
    }
  }

  if (!ot) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">📋</div>
        <h2 className="text-lg font-semibold text-slate-700">Ordre de Travail introuvable</h2>
        <p className="text-slate-500 mt-2 text-sm">L&apos;OT &ldquo;{params.id}&rdquo; n&apos;existe pas ou n&apos;est pas encore généré.</p>
        <Link href="/dashboard/electricien" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          ← Retour au tableau de bord
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/dashboard/electricien" className="hover:text-slate-900 transition-colors">Tableau de bord</Link>
          <span>/</span>
          <Link href={`/demandes/${ot.demande.request_id}`} className="hover:text-slate-900 transition-colors">
            Demande #{ot.demande.request_id}
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">{ot.ot_number}</span>
        </nav>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/bons-de-commande/new?request_id=${ot.demande.request_id}`}
            className="text-sm border border-slate-200 text-slate-600 font-medium px-4 py-2 rounded-lg hover:border-slate-400 transition-colors"
          >
            + Nouveau BC
          </Link>
          <button
            onClick={downloadPDF}
            disabled={generating}
            className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {generating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Génération…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Télécharger PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Document */}
      <div className="max-w-4xl mx-auto space-y-6">
        <OTValidationPanel status={ot.status} />
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <OTDocument ot={ot} docRef={docRef} />
        </div>
      </div>
    </div>
  );
}
