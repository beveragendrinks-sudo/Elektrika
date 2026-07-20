'use client';

import React, { useState } from 'react';
import { ENTITY_LIST, getAllSites, entitySitesLabel, getEntitiesForSite } from '@/lib/entities';

// ── Types ──────────────────────────────────────────────────────────────────
type Tab = 'sites' | 'entities' | 'prestataires' | 'fournisseurs' | 'users' | 'objectifs' | 'alertes' | 'email';

type UserRoleType = 'admin' | 'directeur_general' | 'directeur_de_site' | 'electricien' | 'demandeur';

type ViewRole = 'dg' | 'LAD' | 'FAD' | 'BTFI' | '3Ps' | 'K&Ko';

interface EntityDetail {
  id: string; code: string; name: string; full_name: string;
  address: string; phone: string; matricule_fiscale: string; active: boolean;
}

interface AppUser {
  id: string; name: string; email: string; role: UserRoleType;
  entity: string; site: string; active: boolean; last_login?: string;
}

interface GroupKpiTargets {
  mttr_max_h: number;
  sla48_min_pct: number;
  first_fix_min_pct: number;
  grouping_min_pct: number;
  budget_per_entity_max: number;
}

interface EntityKpiTargets {
  entity: string;
  mttr_max_h: number;
  sla48_min_pct: number;
  first_fix_min_pct: number;
  grouping_min_pct: number;
  budget_annuel: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<UserRoleType, string> = {
  admin:               'Administrateur',
  directeur_general:   'Directeur Général',
  directeur_de_site:   "Directeur d'entité",
  electricien:         'Prestataire de service',
  demandeur:           'Demandeur',
};

const ROLE_COLORS: Record<UserRoleType, string> = {
  admin:               'bg-purple-100 text-purple-800',
  directeur_general:   'bg-blue-100 text-blue-800',
  directeur_de_site:   'bg-indigo-100 text-indigo-800',
  electricien:         'bg-teal-100 text-teal-800',
  demandeur:           'bg-green-100 text-green-800',
};

const ENTITIES_OPTS = ['LAD', 'FAD', 'BTFI', '3Ps', 'K&Ko', 'Privée', 'Groupe'];

// Résumé de tous les sites par entité — ex: "Siège Ben Arous · Unité de Production La Manouba"
const ENTITY_SITE: Record<string, string> = Object.fromEntries(
  ENTITY_LIST.map(e => [e.code, entitySitesLabel(e.code)])
);

function validateEntityVsGroup(e: EntityKpiTargets, g: GroupKpiTargets): string[] {
  const errs: string[] = [];
  if (e.mttr_max_h > g.mttr_max_h)
    errs.push(`MTTR (≤ ${e.mttr_max_h}h) dépasse le plafond groupe (≤ ${g.mttr_max_h}h)`);
  if (e.sla48_min_pct < g.sla48_min_pct)
    errs.push(`SLA 48h (≥ ${e.sla48_min_pct}%) sous le plancher groupe (≥ ${g.sla48_min_pct}%)`);
  if (e.first_fix_min_pct < g.first_fix_min_pct)
    errs.push(`1er passage (≥ ${e.first_fix_min_pct}%) sous le plancher groupe (≥ ${g.first_fix_min_pct}%)`);
  if (e.grouping_min_pct < g.grouping_min_pct)
    errs.push(`Groupage (≥ ${e.grouping_min_pct}%) sous le plancher groupe (≥ ${g.grouping_min_pct}%)`);
  if (e.budget_annuel > g.budget_per_entity_max)
    errs.push(`Budget (${e.budget_annuel.toLocaleString('fr-TN')} TND) dépasse le plafond groupe (${g.budget_per_entity_max.toLocaleString('fr-TN')} TND)`);
  return errs;
}

// ── Mock data ──────────────────────────────────────────────────────────────
interface SiteItem {
  id: string;
  label: string;
  city: string;
  entityCodes: string[]; // entités présentes sur ce site
  active: boolean;
}

interface SiteKpiTargets {
  siteId: string;
  mttr_max_h: number;
  sla48_min_pct: number;
  first_fix_min_pct: number;
  grouping_min_pct: number;
  budget_annuel: number;
}

// Sites générés depuis SITES_LIST (la source de vérité)
const MOCK_SITES: SiteItem[] = getAllSites().map(s => ({
  id:          s.id,
  label:       s.label,
  city:        s.city,
  entityCodes: s.entityCodes,
  active:      true,
}));

const SITE_TARGETS_INIT: SiteKpiTargets[] = [
  { siteId: 'ben-arous',   mttr_max_h: 40, sla48_min_pct: 88, first_fix_min_pct: 86, grouping_min_pct: 68, budget_annuel: 140000 },
  { siteId: 'la-manouba',  mttr_max_h: 35, sla48_min_pct: 92, first_fix_min_pct: 88, grouping_min_pct: 72, budget_annuel:  50000 },
  { siteId: 'jbel-oust',   mttr_max_h: 48, sla48_min_pct: 84, first_fix_min_pct: 79, grouping_min_pct: 55, budget_annuel:  45000 },
  { siteId: 'grombalia',   mttr_max_h: 52, sla48_min_pct: 80, first_fix_min_pct: 82, grouping_min_pct: 62, budget_annuel:  95000 },
  { siteId: 'beni-khaled', mttr_max_h: 52, sla48_min_pct: 78, first_fix_min_pct: 82, grouping_min_pct: 68, budget_annuel: 110000 },
  { siteId: 'megrine',     mttr_max_h: 30, sla48_min_pct: 93, first_fix_min_pct: 91, grouping_min_pct: 79, budget_annuel:  20000 },
  { siteId: 'rades',       mttr_max_h: 38, sla48_min_pct: 89, first_fix_min_pct: 88, grouping_min_pct: 67, budget_annuel:  30000 },
  { siteId: 'carthage',    mttr_max_h: 40, sla48_min_pct: 88, first_fix_min_pct: 86, grouping_min_pct: 65, budget_annuel:  40000 },
  { siteId: 'la-marsa',    mttr_max_h: 42, sla48_min_pct: 86, first_fix_min_pct: 85, grouping_min_pct: 63, budget_annuel:  15000 },
];

const MOCK_ENTITIES: EntityDetail[] = [
  { id: '1', code: 'LAD',   name: 'LAD',   full_name: 'Société LAD',            address: 'Zone Industrielle Charguia II, 2035 Ariana',      phone: '+216 71 234 000', matricule_fiscale: '1234567/A/M/000', active: true },
  { id: '2', code: 'FAD',   name: 'FAD',   full_name: 'FAD Industrie S.A.R.L.', address: 'Pôle Industriel Jbel Oust, 2082 Jbel Oust',      phone: '+216 72 345 678', matricule_fiscale: '2345678/B/P/000', active: true },
  { id: '3', code: 'BTFI',  name: 'BTFI',  full_name: 'BTFI Technologie',       address: 'Sénia Beni Khaled, 8061 Beni Khaled',            phone: '+216 72 456 789', matricule_fiscale: '3456789/C/N/000', active: true },
  { id: '4', code: '3Ps',   name: '3Ps',   full_name: '3Ps Solutions',          address: 'Route de Megrine, 2033 Megrine',                  phone: '+216 71 567 890', matricule_fiscale: '4567890/D/M/000', active: true },
  { id: '5', code: 'K&Ko',   name: 'K&Ko',   full_name: 'K&Ko Groupe',       address: 'Zone Carthage, 2016 Carthage',            phone: '+216 71 678 901', matricule_fiscale: '5678901/E/M/000', active: true },
  { id: '6', code: 'Privée', name: 'Privée', full_name: 'Propriété Privée', address: '12 Rue des Oliviers, 2080 Ariana',        phone: '+216 71 789 555', matricule_fiscale: '6789012/F/P/000', active: true },
];

interface Prestataire {
  id: string;
  name: string;
  site: string;
  categories: string[];
  email: string;
  whatsapp: string;
  active: boolean;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  electricite:   { label: 'Électricité',           icon: '⚡' },
  plomberie:     { label: 'Plomberie & Sanitaire',  icon: '🔧' },
  climatisation: { label: 'Climatisation',          icon: '❄️' },
  maconnerie:    { label: 'Maçonnerie & Génie civil', icon: '🏗️' },
  peinture:      { label: 'Peinture & Finitions',   icon: '🎨' },
  menuiserie:    { label: 'Menuiserie & Serrurerie', icon: '🚪' },
  autres:        { label: 'Autres',                 icon: '🔩' },
};

const ALL_CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);

const MOCK_PRESTATAIRES: Prestataire[] = [
  { id: 'vp-1',  name: 'Elkateb Électricité',      site: 'Ariana',        categories: ['electricite'],                      email: 'contact@elkateb-elec.tn',    whatsapp: '+216 71 234 567', active: true  },
  { id: 'vp-2',  name: 'Tunisie Électrique SARL',  site: 'Ben Arous',     categories: ['electricite', 'climatisation'],     email: 'vente@tunisie-elec.tn',      whatsapp: '+216 70 123 456', active: true  },
  { id: 'vp-3',  name: 'STEG Ingénierie',          site: 'Tunis',         categories: ['electricite'],                      email: 'ingenierie@steg.com.tn',     whatsapp: '+216 71 345 678', active: true  },
  { id: 'vp-4',  name: 'Techno Hydraulique',       site: 'Jbel Oust',     categories: ['plomberie'],                        email: 'contact@techno-hyd.tn',      whatsapp: '+216 73 456 789', active: true  },
  { id: 'vp-5',  name: 'Sarl Plomberie Pro',       site: 'Ben Arous',     categories: ['plomberie'],                        email: 'plomberie.pro@gmail.com',    whatsapp: '+216 71 567 890', active: true  },
  { id: 'vp-6',  name: 'Climatech Services',       site: 'Ariana',        categories: ['climatisation'],                    email: 'info@climatech.tn',          whatsapp: '+216 71 678 901', active: true  },
  { id: 'vp-7',  name: 'Froid Express Tunis',      site: 'Tunis',         categories: ['climatisation'],                    email: 'contact@froid-express.tn',   whatsapp: '+216 72 789 012', active: true  },
  { id: 'vp-8',  name: 'Entreprise Ghazi BTP',     site: 'Ben Arous',     categories: ['maconnerie', 'peinture'],           email: 'ghazi.btp@gmail.com',        whatsapp: '+216 71 890 123', active: true  },
  { id: 'vp-9',  name: 'Bâtiment Plus SARL',       site: 'Grombalia',     categories: ['maconnerie'],                       email: 'contact@batiment-plus.tn',   whatsapp: '+216 71 901 234', active: true  },
  { id: 'vp-10', name: 'Peinture Moderne Tunis',   site: 'Tunis',         categories: ['peinture'],                         email: 'moderne.peinture@gmail.com', whatsapp: '+216 71 012 345', active: true  },
  { id: 'vp-11', name: 'Menuiserie Artisanale',    site: 'Ben Arous',     categories: ['menuiserie'],                       email: 'contact@menuiserie-a.tn',    whatsapp: '+216 72 123 456', active: true  },
  { id: 'vp-12', name: 'Bois & Design Tunis',      site: 'Ariana',        categories: ['menuiserie'],                       email: 'info@bois-design.tn',        whatsapp: '+216 73 234 567', active: true  },
  { id: 'vp-13', name: 'Multi Services Maghreb',   site: 'Tunis',         categories: ['autres'],                           email: 'ms.maghreb@gmail.com',       whatsapp: '+216 71 111 222', active: true  },
];

interface Fournisseur {
  id: string;
  company: string;        // raison sociale
  contact: string;        // nom et prénom du contact
  email: string;
  whatsapp: string;
  address: string;
  matricule_fiscale: string;
  categories: string[];   // catégories de matériel fourni
  active: boolean;
}

const MOCK_FOURNISSEURS: Fournisseur[] = [
  {
    id: 'vf-1', company: 'Maghreb Electric',       contact: 'Ali Maghrebi',
    email: 'info@maghreb-electric.tn', whatsapp: '+216 70 456 789',
    address: 'Zone Industrielle Charguia II, 2035 Ariana',
    matricule_fiscale: '1001234/A/M/000',
    categories: ['electricite'], active: true,
  },
  {
    id: 'vf-2', company: 'SONELEC Tunisie',        contact: 'Riadh Sonelec',
    email: 'contact@sonelec.tn', whatsapp: '+216 71 456 789',
    address: 'Avenue de la Liberté, 1001 Tunis',
    matricule_fiscale: '1002345/B/P/000',
    categories: ['electricite', 'climatisation'], active: true,
  },
  {
    id: 'vf-3', company: 'Robinetterie Tunisie',   contact: 'Khaled Meddeb',
    email: 'vente@robin-tn.com', whatsapp: '+216 55 300 400',
    address: "Rue de l'Industrie, 2013 Ben Arous",
    matricule_fiscale: '1003456/C/N/000',
    categories: ['plomberie'], active: true,
  },
  {
    id: 'vf-4', company: 'Sanitaire Plus SARL',    contact: 'Nour Gharbi',
    email: 'contact@sanitaire-plus.tn', whatsapp: '+216 52 400 500',
    address: 'Avenue Habib Bourguiba, 2080 Ariana',
    matricule_fiscale: '1004567/D/M/000',
    categories: ['plomberie'], active: true,
  },
  {
    id: 'vf-5', company: 'Climatec Fournitures',   contact: 'Sana Cherif',
    email: 'fournitures@climatec.tn', whatsapp: '+216 71 789 012',
    address: 'Route de La Marsa, 2070 La Marsa',
    matricule_fiscale: '1005678/E/M/000',
    categories: ['climatisation'], active: true,
  },
  {
    id: 'vf-6', company: 'Ciments du Nord',        contact: 'Riadh Boussema',
    email: 'vente@ciments-nord.tn', whatsapp: '+216 50 500 600',
    address: 'Route de Grombalia, 8070 Grombalia',
    matricule_fiscale: '1006789/F/P/000',
    categories: ['maconnerie'], active: true,
  },
  {
    id: 'vf-7', company: 'Matériaux BTP Tunis',    contact: 'Fares Beltaief',
    email: 'contact@mat-btp.tn', whatsapp: '+216 71 901 234',
    address: 'Zone Industrielle La Charguia, 2035 Ariana',
    matricule_fiscale: '1007890/G/M/000',
    categories: ['maconnerie', 'peinture'], active: true,
  },
  {
    id: 'vf-8', company: 'Leroy Merlin Pro TN',    contact: 'Ahmed Karray',
    email: 'pro@leroymerlin.tn', whatsapp: '+216 71 012 345',
    address: 'Centre Commercial Tunis City, 1082 Tunis',
    matricule_fiscale: '1008901/H/M/000',
    categories: ['peinture', 'menuiserie', 'electricite'], active: true,
  },
];

const INITIAL_USERS: AppUser[] = [
  { id: '1', name: 'Admin Système',     email: 'admin@elektrika.tn',  role: 'admin',             entity: 'Groupe', site: '—',                          active: true },
  { id: '2', name: 'Directeur Général', email: 'dg@elektrika.tn',     role: 'directeur_general', entity: 'Groupe', site: '—',                          active: true, last_login: '02/07/2026' },
  { id: '3', name: 'Ahmed Ben Salah',   email: 'directeur@lad.tn',    role: 'directeur_de_site', entity: 'LAD',    site: 'Siège, Ben Arous',             active: true, last_login: '01/07/2026' },
  { id: '4', name: 'Mohamed Salah',     email: 'electricien@lad.tn',  role: 'electricien',       entity: 'LAD',    site: 'Siège, Ben Arous',             active: true, last_login: '02/07/2026' },
  { id: '5', name: 'Sonia Guesmi',      email: 'demandeur@lad.tn',    role: 'demandeur',         entity: 'LAD',    site: 'Siège, Ben Arous',             active: true, last_login: '28/06/2026' },
  { id: '6', name: 'Karim Bejaoui',     email: 'electricien2@fad.tn', role: 'electricien',       entity: 'FAD',    site: 'Pôle Industriel, Jbel Oust',   active: true, last_login: '01/07/2026' },
  { id: '7', name: 'Nadia Farhat',      email: 'directeur@fad.tn',    role: 'directeur_de_site', entity: 'FAD',    site: 'Pôle Industriel, Jbel Oust',   active: true, last_login: '02/07/2026' },
];

const GROUP_TARGETS_INIT: GroupKpiTargets = {
  mttr_max_h:           48,
  sla48_min_pct:        85,
  first_fix_min_pct:    80,
  grouping_min_pct:     65,
  budget_per_entity_max: 130000,
};

const ENTITY_TARGETS_INIT: EntityKpiTargets[] = [
  { entity: 'LAD',   mttr_max_h: 35, sla48_min_pct: 90, first_fix_min_pct: 85, grouping_min_pct: 70, budget_annuel: 80000  },
  { entity: 'FAD',   mttr_max_h: 48, sla48_min_pct: 84, first_fix_min_pct: 79, grouping_min_pct: 55, budget_annuel: 60000  },
  { entity: 'BTFI',  mttr_max_h: 52, sla48_min_pct: 78, first_fix_min_pct: 82, grouping_min_pct: 68, budget_annuel: 120000 },
  { entity: '3Ps',   mttr_max_h: 30, sla48_min_pct: 92, first_fix_min_pct: 90, grouping_min_pct: 78, budget_annuel: 25000  },
  { entity: 'K&Ko',  mttr_max_h: 40, sla48_min_pct: 88, first_fix_min_pct: 86, grouping_min_pct: 65, budget_annuel: 45000  },
];

// ── Site card (inline edit + entity chips + toggle + delete) ──────────────
function SiteCard({ site, onSave, onToggle, onDelete }: {
  site: SiteItem;
  onSave: (updated: SiteItem) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing]       = useState(false);
  const [draft, setDraft]           = useState(site);
  const [saved, setSaved]           = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  function startEdit() { setDraft(site); setEditing(true); }

  function handleSave() {
    if (!draft.label.trim()) return;
    onSave(draft);
    setSaved(true);
    setTimeout(() => { setSaved(false); setEditing(false); }, 1200);
  }

  function toggleEntity(code: string) {
    setDraft(prev => ({
      ...prev,
      entityCodes: prev.entityCodes.includes(code)
        ? prev.entityCodes.filter(c => c !== code)
        : [...prev.entityCodes, code],
    }));
  }

  if (editing) {
    return (
      <li className="px-5 py-4 bg-slate-50 border-b border-slate-100 last:border-0">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
              placeholder="Libellé du site *"
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
            <input type="text" value={draft.city} onChange={e => setDraft(d => ({ ...d, city: e.target.value }))}
              placeholder="Ville"
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
          </div>
          <div className="border border-slate-200 rounded-lg p-3 bg-white">
            <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Entités présentes sur ce site</div>
            <div className="flex flex-wrap gap-1.5">
              {ENTITY_LIST.map(e => {
                const checked = draft.entityCodes.includes(e.code);
                return (
                  <label key={e.code} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer text-xs font-medium transition-colors border ${checked ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleEntity(e.code)} className="hidden" />
                    <span className="font-bold">{e.code}</span>
                    <span className={checked ? 'text-slate-400' : 'text-slate-400'}>{e.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100">Annuler</button>
            <button onClick={handleSave} disabled={!draft.label.trim()}
              className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 ${saved ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-700'}`}>
              {saved ? '✓ Enregistré' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="px-5 py-4 group border-b border-slate-100 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${site.active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
              {site.label}
            </span>
            {site.city && (
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">📍 {site.city}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {site.entityCodes.map(code => {
              const e = ENTITY_LIST.find(x => x.code === code);
              return e ? (
                <span key={code} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium border border-blue-100">
                  <span className="font-bold">{e.code}</span>
                  <span className="text-blue-500 hidden sm:inline">{e.name}</span>
                </span>
              ) : null;
            })}
            {site.entityCodes.length === 0 && (
              <span className="text-xs text-slate-300 italic">Aucune entité associée</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {confirmDel ? (
            <>
              <span className="text-xs text-red-600 mr-1">Supprimer ?</span>
              <button onClick={onDelete} className="text-xs px-2.5 py-1 bg-red-500 text-white rounded-lg font-medium">Oui</button>
              <button onClick={() => setConfirmDel(false)} className="text-xs px-2.5 py-1 border border-slate-200 text-slate-600 rounded-lg">Non</button>
            </>
          ) : (
            <>
              <button onClick={startEdit} className="text-xs text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded hover:bg-slate-100">
                Modifier
              </button>
              <button onClick={() => setConfirmDel(true)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button onClick={onToggle} className={`text-xs px-2.5 py-1 rounded-full ${site.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {site.active ? 'Actif' : 'Désactivé'}
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

// ── Entity edit row ────────────────────────────────────────────────────────
function EntityRow({ entity, onSave, onToggle }: {
  entity: EntityDetail;
  onSave: (updated: EntityDetail) => void;
  onToggle: () => void;
}) {
  const [open, setOpen]   = useState(false);
  const [draft, setDraft] = useState(entity);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSave(draft);
    setSaved(true);
    setTimeout(() => { setSaved(false); setOpen(false); }, 1200);
  }
  function set(field: keyof EntityDetail, value: string) {
    setDraft(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  return (
    <li className="border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between px-5 py-3">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-3 text-left group flex-1 min-w-0">
          <svg className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div>
            <span className={`text-sm font-semibold ${entity.active ? 'text-slate-900' : 'text-slate-400'}`}>{entity.code}</span>
            {entity.full_name && entity.full_name !== entity.code && (
              <span className="text-sm text-slate-400 ml-2">{entity.full_name}</span>
            )}
          </div>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setOpen(o => !o)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">{open ? 'Fermer' : 'Modifier'}</button>
          <button onClick={onToggle} className={`text-xs px-2.5 py-1 rounded-full ${entity.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {entity.active ? 'Active' : 'Désactivée'}
          </button>
        </div>
      </div>
      {open && (
        <div className="mx-5 mb-4 bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Informations affichées sur les Bons de Commande</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Code entité</label>
              <input type="text" value={draft.code} onChange={e => set('code', e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Raison sociale</label>
              <input type="text" value={draft.full_name} onChange={e => set('full_name', e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Adresse</label>
            <input type="text" value={draft.address} onChange={e => set('address', e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Téléphone</label>
              <input type="tel" value={draft.phone} onChange={e => set('phone', e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Matricule fiscale</label>
              <input type="text" value={draft.matricule_fiscale} onChange={e => set('matricule_fiscale', e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
            </div>
          </div>
          <div className="border border-slate-200 rounded-lg bg-white p-4">
            <div className="text-xs text-slate-400 mb-3 font-medium">Aperçu — En-tête Bon de Commande</div>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-base font-extrabold text-slate-900">{draft.code || '—'}</div>
                {draft.full_name && <div className="text-xs text-slate-500">{draft.full_name}</div>}
                {draft.address && <div className="text-xs text-slate-400">{draft.address}</div>}
                {draft.phone && <div className="text-xs text-slate-400">Tél. : {draft.phone}</div>}
                {draft.matricule_fiscale && <div className="text-xs text-slate-400">MF : {draft.matricule_fiscale}</div>}
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-black text-slate-800 uppercase">Bon de Commande</div>
                <div className="text-xs text-slate-500 mt-1">N° BC-{draft.code}-2026-XXXXXX</div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setDraft(entity); setOpen(false); }} className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100">Annuler</button>
            <button onClick={handleSave} className={`text-sm px-4 py-2 rounded-lg font-medium ${saved ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-700'}`}>
              {saved ? '✓ Enregistré' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

// ── User row ───────────────────────────────────────────────────────────────
function UserRow({ user, sites, onSave, onToggle }: {
  user: AppUser; sites: typeof MOCK_SITES;
  onSave: (u: AppUser) => void; onToggle: () => void;
}) {
  const [open, setOpen]       = useState(false);
  const [draft, setDraft]     = useState(user);
  const [saved, setSaved]     = useState(false);
  const [pwdSent, setPwdSent] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const ADMIN_EMAIL = 'admin@elektrika.tn';

  function setD(field: keyof AppUser, value: string) {
    setDraft(prev => ({ ...prev, [field]: value as never }));
    setSaved(false);
  }
  function handleSave() {
    onSave(draft); setSaved(true);
    setTimeout(() => { setSaved(false); setOpen(false); }, 1200);
  }
  async function handleResetPwd() {
    setPwdLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setPwdLoading(false);
    setPwdSent(true);
    setTimeout(() => setPwdSent(false), 4000);
  }

  const needsSite = draft.role === 'directeur_de_site' || draft.role === 'electricien' || draft.role === 'demandeur';

  return (
    <li className="border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-xs font-bold text-slate-600">
          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900 truncate">{user.name}</div>
          <div className="text-xs text-slate-400 truncate">{user.email}</div>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}>{ROLE_LABELS[user.role]}</span>
        <span className="shrink-0 text-xs text-slate-500 hidden sm:block">{user.entity}</span>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setOpen(o => !o)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">{open ? 'Fermer' : 'Modifier'}</button>
          <button onClick={onToggle} className={`text-xs px-2.5 py-1 rounded-full ${user.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {user.active ? 'Actif' : 'Inactif'}
          </button>
        </div>
      </div>
      {open && (
        <div className="mx-5 mb-4 bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-5">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Modifier le profil</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nom complet</label>
                <input type="text" value={draft.name} onChange={e => setD('name', e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input type="email" value={draft.email} onChange={e => setD('email', e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rôle</label>
                <select value={draft.role} onChange={e => setD('role', e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
                  {(Object.keys(ROLE_LABELS) as UserRoleType[]).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Entité</label>
                <select value={draft.entity} onChange={e => setD('entity', e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
                  {ENTITIES_OPTS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              {needsSite && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Site d&apos;affectation</label>
                  <select value={draft.site} onChange={e => setD('site', e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
                    <option value="—">—</option>
                    {sites.filter(s => s.entityCodes.includes(draft.entity)).map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
                    {sites.filter(s => s.entityCodes.includes(draft.entity)).length === 0 &&
                      sites.map(s => <option key={s.id} value={s.label}>{s.entityCodes.join(', ')} — {s.label}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-3">
              <button onClick={handleSave} className={`text-sm px-4 py-2 rounded-lg font-medium ${saved ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-700'}`}>
                {saved ? '✓ Enregistré' : 'Enregistrer'}
              </button>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Réinitialiser le mot de passe</div>
            <div className="text-xs text-slate-500 mb-3">
              Un mot de passe temporaire sera généré automatiquement et envoyé à&nbsp;
              <strong className="text-slate-700">{user.email}</strong>&nbsp;et à&nbsp;
              <strong className="text-slate-700">{ADMIN_EMAIL}</strong>.
              L&apos;utilisateur devra le changer à la prochaine connexion.
            </div>
            {pwdSent ? (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm text-green-800 font-medium">
                ✓ Mot de passe temporaire envoyé à {user.email} et à {ADMIN_EMAIL}
              </div>
            ) : (
              <button onClick={handleResetPwd} disabled={pwdLoading}
                className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${pwdLoading ? 'bg-amber-400 text-white' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>
                {pwdLoading && (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                )}
                {pwdLoading ? 'Envoi en cours…' : 'Réinitialiser le mot de passe'}
              </button>
            )}
          </div>
          {user.last_login && <div className="text-xs text-slate-400 pt-1">Dernière connexion : {user.last_login}</div>}
        </div>
      )}
    </li>
  );
}

// ── Add user form ──────────────────────────────────────────────────────────
function AddUserForm({ sites, onAdd }: { sites: typeof MOCK_SITES; onAdd: (u: AppUser) => void }) {
  const [open, setOpen]   = useState(false);
  const [form, setForm]   = useState({ name: '', email: '', role: 'demandeur' as UserRoleType, entity: 'LAD', site: '' });
  const [pwd, setPwd]     = useState('');
  const [added, setAdded] = useState(false);

  function setF(field: string, value: string) { setForm(prev => ({ ...prev, [field]: value })); }
  function handleAdd() {
    if (!form.name || !form.email || !pwd) return;
    onAdd({ id: Date.now().toString(), name: form.name, email: form.email, role: form.role, entity: form.entity, site: form.site || '—', active: true });
    setAdded(true);
    setTimeout(() => { setAdded(false); setOpen(false); setForm({ name: '', email: '', role: 'demandeur', entity: 'LAD', site: '' }); setPwd(''); }, 1200);
  }
  const needsSite = form.role === 'directeur_de_site' || form.role === 'electricien' || form.role === 'demandeur';

  if (!open) return (
    <div className="px-5 py-4 border-t border-slate-100">
      <button onClick={() => setOpen(true)} className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">+ Ajouter un utilisateur</button>
    </div>
  );

  return (
    <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 space-y-4">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nouvel utilisateur</div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Nom complet</label>
          <input type="text" value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Prénom Nom" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Email professionnel</label>
          <input type="email" value={form.email} onChange={e => setF('email', e.target.value)} placeholder="prenom.nom@societe.tn" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Rôle</label>
          <select value={form.role} onChange={e => setF('role', e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
            {(Object.keys(ROLE_LABELS) as UserRoleType[]).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Entité</label>
          <select value={form.entity} onChange={e => setF('entity', e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
            {ENTITIES_OPTS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        {needsSite && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Site</label>
            <select value={form.site} onChange={e => setF('site', e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
              <option value="">—</option>
              {sites.filter(s => s.entityCodes.includes(form.entity)).map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
              {sites.filter(s => s.entityCodes.includes(form.entity)).length === 0 &&
                sites.map(s => <option key={s.id} value={s.label}>{s.entityCodes.join(', ')} — {s.label}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Mot de passe initial</label>
          <input type="text" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="ex: Elektrika@2026!" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white font-mono" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100">Annuler</button>
        <button onClick={handleAdd} disabled={!form.name || !form.email || !pwd}
          className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${added ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40'}`}>
          {added ? '✓ Créé' : 'Créer le compte'}
        </button>
      </div>
    </div>
  );
}

// ── KPI number input ───────────────────────────────────────────────────────
function KpiInput({ label, value, onChange, unit, min, max, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void;
  unit: string; min: number; max: number; step?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-slate-600 flex-1">{label}</label>
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="number"
          value={value}
          min={min} max={max} step={step}
          onChange={e => onChange(Number(e.target.value))}
          className="w-20 text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
        />
        <span className="text-xs text-slate-500 w-8">{unit}</span>
      </div>
    </div>
  );
}

// ── Group targets card ─────────────────────────────────────────────────────
function GroupTargetCard({ targets, onSave, canEdit }: {
  targets: GroupKpiTargets;
  onSave: (t: GroupKpiTargets) => void;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(targets);
  const [saved, setSaved]     = useState(false);

  function setT<K extends keyof GroupKpiTargets>(k: K, v: number) {
    setDraft(prev => ({ ...prev, [k]: v }));
  }

  function handleSave() {
    onSave(draft); setSaved(true);
    setTimeout(() => { setSaved(false); setEditing(false); }, 1200);
  }

  const KPI_ROWS: { label: string; key: keyof GroupKpiTargets; unit: string; prefix: string; min: number; max: number; step?: number }[] = [
    { label: 'MTTR — Temps moyen de réparation',        key: 'mttr_max_h',            unit: 'h',   prefix: '≤', min: 1,    max: 200   },
    { label: 'SLA 48h — Conformité délai traitement',   key: 'sla48_min_pct',         unit: '%',   prefix: '≥', min: 50,   max: 100   },
    { label: '1er passage — Taux réparation directe',   key: 'first_fix_min_pct',     unit: '%',   prefix: '≥', min: 50,   max: 100   },
    { label: 'Groupage — Efficacité des tournées',      key: 'grouping_min_pct',      unit: '%',   prefix: '≥', min: 30,   max: 100   },
    { label: 'Budget max par entité / an',              key: 'budget_per_entity_max', unit: 'TND', prefix: '≤', min: 10000, max: 999999, step: 1000 },
  ];

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-blue-900">Enveloppe groupe — Direction Générale</div>
          <div className="text-xs text-blue-600 mt-0.5">
            Contraintes minimales que chaque entité doit respecter dans ses propres objectifs
          </div>
        </div>
        {canEdit && !editing && (
          <button onClick={() => { setDraft(targets); setEditing(true); }}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-900 text-white hover:bg-blue-800 transition-colors">
            Modifier
          </button>
        )}
        {!canEdit && (
          <span className="shrink-0 text-xs bg-blue-100 text-blue-500 px-2 py-1 rounded font-medium">Lecture seule</span>
        )}
      </div>

      <div className="border-t border-blue-200 px-5 py-4 space-y-3 bg-white">
        {KPI_ROWS.map(({ label, key, unit, prefix, min, max, step }) => (
          <div key={key} className="flex items-center gap-3">
            <div className="flex-1 text-xs text-slate-600">{label}</div>
            <div className="shrink-0 flex items-center gap-1.5">
              <span className="text-xs text-slate-400">{prefix}</span>
              {editing ? (
                <KpiInput label="" value={draft[key]} onChange={v => setT(key, v)} unit={unit} min={min} max={max} step={step} />
              ) : (
                <span className="text-sm font-bold text-blue-800">
                  {key === 'budget_per_entity_max'
                    ? targets[key].toLocaleString('fr-TN')
                    : targets[key]}
                  <span className="text-xs font-normal text-blue-600 ml-0.5">{unit}</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="border-t border-blue-200 px-5 py-3 bg-blue-50 flex gap-2 justify-end">
          <button onClick={() => { setDraft(targets); setEditing(false); }} className="text-sm px-4 py-2 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-100">Annuler</button>
          <button onClick={handleSave} className={`text-sm px-4 py-2 rounded-lg font-medium ${saved ? 'bg-green-600 text-white' : 'bg-blue-900 text-white hover:bg-blue-800'}`}>
            {saved ? '✓ Enregistré' : 'Enregistrer l\'enveloppe'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Entity KPI target row ──────────────────────────────────────────────────
function EntityTargetRow({ target, group, canEdit, onSave }: {
  target: EntityKpiTargets;
  group: GroupKpiTargets;
  canEdit: boolean;
  onSave: (t: EntityKpiTargets) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [draft, setDraft]   = useState(target);
  const [saved, setSaved]   = useState(false);

  const errors = validateEntityVsGroup(draft, group);
  const savedErrors = validateEntityVsGroup(target, group);

  function setT<K extends keyof EntityKpiTargets>(k: K, v: number) {
    setDraft(prev => ({ ...prev, [k]: v }));
  }

  function handleSave() {
    onSave(draft); setSaved(true);
    setTimeout(() => { setSaved(false); setOpen(false); }, 1200);
  }

  // Individual field check
  function mttrOk(t: EntityKpiTargets) { return t.mttr_max_h <= group.mttr_max_h; }
  function slaOk(t: EntityKpiTargets) { return t.sla48_min_pct >= group.sla48_min_pct; }
  function ffOk(t: EntityKpiTargets) { return t.first_fix_min_pct >= group.first_fix_min_pct; }
  function grpOk(t: EntityKpiTargets) { return t.grouping_min_pct >= group.grouping_min_pct; }
  function budgetOk(t: EntityKpiTargets) { return t.budget_annuel <= group.budget_per_entity_max; }

  function FieldRow({ label, ok, display, draftOk }: { label: string; ok: boolean; display: string; draftOk: boolean }) {
    const statusOk = open ? draftOk : ok;
    return (
      <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded ${statusOk ? 'text-slate-700' : 'text-red-700 bg-red-50'}`}>
        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-xs shrink-0 ${statusOk ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
          {statusOk ? '✓' : '✗'}
        </span>
        <span className="flex-1">{label}</span>
        <span className="font-semibold">{display}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${savedErrors.length > 0 ? 'border-red-200' : 'border-slate-200'}`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center gap-3 ${savedErrors.length > 0 ? 'bg-red-50' : 'bg-white'}`}>
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <svg className={`w-3.5 h-3.5 shrink-0 transition-transform text-slate-400 ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 text-sm">{target.entity}</div>
            <div className="text-xs text-slate-400 truncate">{ENTITY_SITE[target.entity]}</div>
          </div>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {savedErrors.length === 0 ? (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Dans l&apos;enveloppe DG</span>
          ) : (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">⚠ {savedErrors.length} hors enveloppe</span>
          )}
          {canEdit && (
            <button onClick={() => { setDraft(target); setOpen(o => !o); }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium">
              {open ? 'Fermer' : 'Modifier'}
            </button>
          )}
          {!canEdit && (
            <button onClick={() => setOpen(o => !o)} className="text-xs text-slate-500 font-medium">{open ? 'Fermer' : 'Voir'}</button>
          )}
        </div>
      </div>

      {/* Content */}
      {open && (
        <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">

          {/* Inline violation warning */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-1">
              {errors.map(e => (
                <div key={e} className="text-xs text-red-700 flex items-start gap-1.5">
                  <span className="text-red-400 mt-0.5 shrink-0">•</span>{e}
                </div>
              ))}
            </div>
          )}

          {canEdit ? (
            /* Edit form */
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Objectifs de {target.entity}</div>

              {/* MTTR */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600">MTTR — délai max réparation</label>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${mttrOk(draft) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {mttrOk(draft) ? `✓ (DG ≤ ${group.mttr_max_h}h)` : `✗ dépasse DG (≤ ${group.mttr_max_h}h)`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">≤</span>
                  <input type="number" value={draft.mttr_max_h} min={1} max={200}
                    onChange={e => setT('mttr_max_h', Number(e.target.value))}
                    className={`w-24 text-sm border rounded-lg px-3 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white ${!mttrOk(draft) ? 'border-red-300' : 'border-slate-200'}`} />
                  <span className="text-xs text-slate-500">h</span>
                </div>
              </div>

              {/* SLA 48h */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600">SLA 48h — conformité délai</label>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${slaOk(draft) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {slaOk(draft) ? `✓ (DG ≥ ${group.sla48_min_pct}%)` : `✗ sous DG (≥ ${group.sla48_min_pct}%)`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">≥</span>
                  <input type="number" value={draft.sla48_min_pct} min={50} max={100}
                    onChange={e => setT('sla48_min_pct', Number(e.target.value))}
                    className={`w-24 text-sm border rounded-lg px-3 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white ${!slaOk(draft) ? 'border-red-300' : 'border-slate-200'}`} />
                  <span className="text-xs text-slate-500">%</span>
                </div>
              </div>

              {/* 1er passage */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600">1er passage — réparation directe</label>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${ffOk(draft) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {ffOk(draft) ? `✓ (DG ≥ ${group.first_fix_min_pct}%)` : `✗ sous DG (≥ ${group.first_fix_min_pct}%)`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">≥</span>
                  <input type="number" value={draft.first_fix_min_pct} min={50} max={100}
                    onChange={e => setT('first_fix_min_pct', Number(e.target.value))}
                    className={`w-24 text-sm border rounded-lg px-3 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white ${!ffOk(draft) ? 'border-red-300' : 'border-slate-200'}`} />
                  <span className="text-xs text-slate-500">%</span>
                </div>
              </div>

              {/* Groupage */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600">Groupage — efficacité tournées</label>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${grpOk(draft) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {grpOk(draft) ? `✓ (DG ≥ ${group.grouping_min_pct}%)` : `✗ sous DG (≥ ${group.grouping_min_pct}%)`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">≥</span>
                  <input type="number" value={draft.grouping_min_pct} min={30} max={100}
                    onChange={e => setT('grouping_min_pct', Number(e.target.value))}
                    className={`w-24 text-sm border rounded-lg px-3 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white ${!grpOk(draft) ? 'border-red-300' : 'border-slate-200'}`} />
                  <span className="text-xs text-slate-500">%</span>
                </div>
              </div>

              {/* Budget annuel */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600">Budget annuel réparations</label>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${budgetOk(draft) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {budgetOk(draft) ? `✓ (max DG ${group.budget_per_entity_max.toLocaleString('fr-TN')} TND)` : `✗ dépasse plafond DG`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" value={draft.budget_annuel} min={1000} max={group.budget_per_entity_max} step={1000}
                    onChange={e => setT('budget_annuel', Number(e.target.value))}
                    className={`w-36 text-sm border rounded-lg px-3 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white ${!budgetOk(draft) ? 'border-red-300' : 'border-slate-200'}`} />
                  <span className="text-xs text-slate-500">TND</span>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                <button onClick={() => { setDraft(target); setOpen(false); }} className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100">Annuler</button>
                <button onClick={handleSave} disabled={errors.length > 0}
                  className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${saved ? 'bg-green-600 text-white' : errors.length > 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-700'}`}>
                  {saved ? '✓ Enregistré' : errors.length > 0 ? 'Corriger les écarts' : 'Enregistrer'}
                </button>
              </div>
            </div>
          ) : (
            /* Read-only summary */
            <div className="space-y-1.5">
              <FieldRow label="MTTR max" display={`≤ ${target.mttr_max_h}h`} ok={mttrOk(target)} draftOk={mttrOk(draft)} />
              <FieldRow label="SLA 48h minimum" display={`≥ ${target.sla48_min_pct}%`} ok={slaOk(target)} draftOk={slaOk(draft)} />
              <FieldRow label="1er passage minimum" display={`≥ ${target.first_fix_min_pct}%`} ok={ffOk(target)} draftOk={ffOk(draft)} />
              <FieldRow label="Groupage minimum" display={`≥ ${target.grouping_min_pct}%`} ok={grpOk(target)} draftOk={grpOk(draft)} />
              <FieldRow label="Budget annuel" display={`${target.budget_annuel.toLocaleString('fr-TN')} TND`} ok={budgetOk(target)} draftOk={budgetOk(draft)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Site target row ────────────────────────────────────────────────────────
function SiteTargetRow({ target, group, onSave }: {
  target: SiteKpiTargets;
  group: GroupKpiTargets;
  onSave: (t: SiteKpiTargets) => void;
}) {
  const [open, setOpen]   = useState(false);
  const [draft, setDraft] = useState(target);
  const [saved, setSaved] = useState(false);
  const site = getAllSites().find(s => s.id === target.siteId);
  const entities = getEntitiesForSite(target.siteId);

  function setT<K extends keyof SiteKpiTargets>(k: K, v: number) {
    setDraft(prev => ({ ...prev, [k]: v }));
  }
  function handleSave() {
    onSave(draft); setSaved(true);
    setTimeout(() => { setSaved(false); setOpen(false); }, 1200);
  }

  const violations = [
    draft.mttr_max_h > group.mttr_max_h && `MTTR (≤ ${draft.mttr_max_h}h) dépasse le plafond groupe`,
    draft.sla48_min_pct < group.sla48_min_pct && `SLA 48h (≥ ${draft.sla48_min_pct}%) sous le plancher groupe`,
    draft.first_fix_min_pct < group.first_fix_min_pct && `1er passage sous le plancher groupe`,
    draft.grouping_min_pct < group.grouping_min_pct && `Groupage sous le plancher groupe`,
  ].filter(Boolean) as string[];

  return (
    <div className={`rounded-xl border overflow-hidden ${violations.length > 0 ? 'border-red-200' : 'border-slate-200'}`}>
      <div className={`px-4 py-3 flex items-center gap-3 ${violations.length > 0 ? 'bg-red-50' : 'bg-white'}`}>
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <svg className={`w-3.5 h-3.5 shrink-0 transition-transform text-slate-400 ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 text-sm">{site?.label ?? target.siteId}</div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-xs text-slate-400">📍 {site?.city}</span>
              {entities.map(e => (
                <span key={e.code} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">{e.code}</span>
              ))}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {violations.length === 0
            ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ OK</span>
            : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">⚠ {violations.length} écart{violations.length > 1 ? 's' : ''}</span>
          }
          <button onClick={() => { setDraft(target); setOpen(o => !o); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            {open ? 'Fermer' : 'Modifier'}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
          {violations.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-1">
              {violations.map(v => <div key={v} className="text-xs text-red-700">• {v}</div>)}
            </div>
          )}
          {[
            { label: 'MTTR max', key: 'mttr_max_h' as const, unit: 'h', prefix: '≤', min: 1, max: 200 },
            { label: 'SLA 48h minimum', key: 'sla48_min_pct' as const, unit: '%', prefix: '≥', min: 50, max: 100 },
            { label: '1er passage minimum', key: 'first_fix_min_pct' as const, unit: '%', prefix: '≥', min: 50, max: 100 },
            { label: 'Groupage minimum', key: 'grouping_min_pct' as const, unit: '%', prefix: '≥', min: 30, max: 100 },
            { label: 'Budget annuel', key: 'budget_annuel' as const, unit: 'TND', prefix: '≤', min: 1000, max: 999999 },
          ].map(({ label, key, unit, prefix, min, max }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="flex-1 text-xs text-slate-600">{label}</span>
              <span className="text-xs text-slate-400">{prefix}</span>
              <input type="number" value={draft[key]} min={min} max={max}
                onChange={e => setT(key, Number(e.target.value))}
                className="w-28 text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
              <span className="text-xs text-slate-500 w-10">{unit}</span>
            </div>
          ))}
          <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
            <button onClick={() => { setDraft(target); setOpen(false); }} className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100">Annuler</button>
            <button onClick={handleSave} disabled={violations.length > 0}
              className={`text-sm px-4 py-2 rounded-lg font-medium ${saved ? 'bg-green-600 text-white' : violations.length > 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-700'}`}>
              {saved ? '✓ Enregistré' : violations.length > 0 ? 'Corriger les écarts' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Objectifs tab ──────────────────────────────────────────────────────────
function ObjectifsTab() {
  const [viewRole, setViewRole]     = useState<ViewRole>('dg');
  const [group, setGroup]           = useState<GroupKpiTargets>(GROUP_TARGETS_INIT);
  const [entities, setEntities]     = useState<EntityKpiTargets[]>(ENTITY_TARGETS_INIT);
  const [siteTargets, setSiteTargets] = useState<SiteKpiTargets[]>(SITE_TARGETS_INIT);
  const [kpiDim, setKpiDim]         = useState<'entity' | 'site'>('entity');

  const isDG = viewRole === 'dg';
  const totalViolations = entities.filter(e => validateEntityVsGroup(e, group).length > 0).length;

  function updateEntity(code: string, updated: EntityKpiTargets) {
    setEntities(prev => prev.map(e => e.entity === code ? updated : e));
  }
  function updateSite(siteId: string, updated: SiteKpiTargets) {
    setSiteTargets(prev => prev.map(s => s.siteId === siteId ? updated : s));
  }

  const VIEW_ROLES: { key: ViewRole; label: string }[] = [
    { key: 'dg',    label: 'Direction Générale' },
    { key: 'LAD',   label: 'Directeur LAD' },
    { key: 'FAD',   label: 'Directeur FAD' },
    { key: 'BTFI',  label: 'Directeur BTFI' },
    { key: '3Ps',   label: 'Directeur 3Ps' },
    { key: 'K&Ko',  label: 'Directeur K&Ko' },
  ];

  return (
    <div className="space-y-5">
      {/* Role simulation */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <div className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Simulation de vue — selon le rôle connecté</div>
        <div className="flex flex-wrap gap-1">
          {VIEW_ROLES.map(r => (
            <button key={r.key} onClick={() => setViewRole(r.key)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border ${viewRole === r.key ? 'bg-slate-900 text-white border-slate-900' : 'border-amber-300 text-amber-800 hover:bg-amber-100'}`}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-amber-600 mt-2">
          {isDG ? 'Le DG définit l\'enveloppe groupe et voit les objectifs par entité et par site.' : `${viewRole} voit l\'enveloppe DG en lecture seule et modifie uniquement ses propres objectifs.`}
        </div>
      </div>

      {/* Group targets */}
      <GroupTargetCard targets={group} onSave={setGroup} canEdit={isDG} />

      {/* Dimension toggle — only for DG */}
      {isDG && (
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          <button onClick={() => setKpiDim('entity')}
            className={`text-xs px-4 py-2 rounded-md font-medium transition-all ${kpiDim === 'entity' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            Par entité — tous sites
          </button>
          <button onClick={() => setKpiDim('site')}
            className={`text-xs px-4 py-2 rounded-md font-medium transition-all ${kpiDim === 'site' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            Par site — toutes entités
          </button>
        </div>
      )}

      {/* Conformité résumé — entity view */}
      {isDG && kpiDim === 'entity' && (
        <div className={`rounded-lg px-4 py-3 flex items-center gap-3 ${totalViolations > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          <span>{totalViolations > 0 ? '⚠' : '✓'}</span>
          <div className="text-sm">
            {totalViolations > 0 ? (
              <><span className="font-semibold text-red-800">{totalViolations} entité{totalViolations > 1 ? 's' : ''} hors enveloppe</span><span className="text-red-600"> — objectifs dépassent les contraintes groupe</span></>
            ) : (
              <span className="font-semibold text-green-800">Toutes les entités respectent l&apos;enveloppe groupe</span>
            )}
          </div>
        </div>
      )}

      {/* Entity targets */}
      {(kpiDim === 'entity' || !isDG) && (
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Objectifs par entité — tous sites confondus</div>
          <div className="space-y-2">
            {entities.map(e => {
              const canEdit = isDG ? false : viewRole === e.entity;
              const visible = isDG ? true : viewRole === e.entity;
              if (!visible) return null;
              return (
                <EntityTargetRow
                  key={e.entity}
                  target={e}
                  group={group}
                  canEdit={canEdit}
                  onSave={updated => updateEntity(e.entity, updated)}
                />
              );
            })}
            {!isDG && (
              <div className="text-xs text-slate-400 italic pt-1">
                Les objectifs des autres entités ne sont pas visibles depuis cette vue.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Site targets — DG only */}
      {isDG && kpiDim === 'site' && (
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Objectifs par site — toutes entités confondues</div>
          <p className="text-xs text-slate-400 mb-3">KPIs agrégés pour tous les prestataires intervenant sur ce site, quelle que soit l&apos;entité émettrice.</p>
          <div className="space-y-2">
            {siteTargets.map(s => (
              <SiteTargetRow
                key={s.siteId}
                target={s}
                group={group}
                onSave={updated => updateSite(s.siteId, updated)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500 space-y-1">
        <div className="font-semibold text-slate-600 mb-1.5">Règles de cohérence</div>
        <div>• <strong>MTTR</strong> : objectif entité/site (≤ Xh) doit être <strong>≤ enveloppe groupe</strong></div>
        <div>• <strong>SLA, 1er passage, Groupage</strong> : objectif entité/site (≥ X%) doit être <strong>≥ plancher groupe</strong></div>
        <div>• <strong>Budget annuel</strong> : ne peut pas dépasser le plafond par entité fixé par le DG</div>
        <div className="mt-1 text-slate-400">Un objectif hors enveloppe ne peut pas être enregistré tant que l&apos;écart n&apos;est pas corrigé.</div>
      </div>
    </div>
  );
}

// ── Prestataire row (inline edit + toggle + delete) ───────────────────────
function PrestaRow({ p, sites, onSave, onToggle, onDelete }: {
  p: Prestataire;
  sites: SiteItem[];
  onSave: (updated: Prestataire) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing]     = useState(false);
  const [draft, setDraft]         = useState<Prestataire>(p);
  const [saved, setSaved]         = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  function startEdit() {
    setDraft(p);
    setEditing(true);
  }

  function handleSave() {
    if (!draft.name.trim()) return;
    onSave({ ...draft, name: draft.name.trim() });
    setSaved(true);
    setTimeout(() => { setSaved(false); setEditing(false); }, 1200);
  }

  function toggleCat(key: string) {
    setDraft(prev => ({
      ...prev,
      categories: prev.categories.includes(key)
        ? prev.categories.filter(k => k !== key)
        : [...prev.categories, key],
    }));
  }

  if (editing) {
    return (
      <li className="px-5 py-4 bg-slate-50 border-b border-slate-100 last:border-0">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              placeholder="Nom et prénom *"
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
            <div>
              <select value={draft.site} onChange={e => setDraft(d => ({ ...d, site: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
                <option value="">Site de base…</option>
                {sites.map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
              </select>
              <p className="text-xs text-slate-400 mt-0.5 ml-1">Aucun déplacement pour ce site</p>
            </div>
            <input type="email" value={draft.email} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))}
              placeholder="Email (notification)"
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
            <input type="tel" value={draft.whatsapp} onChange={e => setDraft(d => ({ ...d, whatsapp: e.target.value }))}
              placeholder="WhatsApp (+216…)"
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
          </div>
          <div className="border border-slate-200 rounded-lg p-3 bg-white">
            <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Catégories d&apos;intervention</div>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_CATEGORY_KEYS.map(key => {
                const c = CATEGORY_LABELS[key];
                const checked = draft.categories.includes(key);
                return (
                  <label key={key} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${checked ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700 border border-slate-100'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleCat(key)} className="hidden" />
                    <span>{c.icon}</span>
                    <span className="font-medium">{c.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)}
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100">Annuler</button>
            <button onClick={handleSave} disabled={!draft.name.trim()}
              className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 ${saved ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-700'}`}>
              {saved ? '✓ Enregistré' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="px-5 py-4 group border-b border-slate-100 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">{p.name}</span>
            {p.site && p.site !== '—' && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                📍 {p.site}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {p.categories.map(cat => {
              const c = CATEGORY_LABELS[cat];
              return c ? (
                <span key={cat} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                  {c.icon} {c.label}
                </span>
              ) : null;
            })}
            {p.categories.length === 0 && (
              <span className="text-xs text-slate-300 italic">Aucune catégorie</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 flex-wrap">
            {p.email && <span>✉ {p.email}</span>}
            {p.whatsapp && <span>📱 {p.whatsapp}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {confirmDel ? (
            <>
              <span className="text-xs text-red-600 mr-1">Supprimer ?</span>
              <button onClick={onDelete} className="text-xs px-2.5 py-1 bg-red-500 text-white rounded-lg font-medium">Oui</button>
              <button onClick={() => setConfirmDel(false)} className="text-xs px-2.5 py-1 border border-slate-200 text-slate-600 rounded-lg">Non</button>
            </>
          ) : (
            <>
              <button onClick={startEdit}
                className="text-xs text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded hover:bg-slate-100">
                Modifier
              </button>
              <button onClick={() => setConfirmDel(true)}
                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button onClick={onToggle}
                className={`text-xs px-2.5 py-1 rounded-full ${p.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {p.active ? 'Actif' : 'Désactivé'}
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

// ── Prestataires tab ──────────────────────────────────────────────────────
function PrestatairesTab({
  prestataires,
  sites,
  onUpdate,
}: {
  prestataires: Prestataire[];
  sites: SiteItem[];
  onUpdate: React.Dispatch<React.SetStateAction<Prestataire[]>>;
}) {
  const [newName, setNewName]   = useState('');
  const [newSite, setNewSite]   = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newWa, setNewWa]       = useState('');
  const [newCats, setNewCats]   = useState<string[]>([]);
  const [showAdd, setShowAdd]   = useState(false);

  function toggleCat(key: string) {
    setNewCats(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  function addPrestataire() {
    if (!newName.trim()) return;
    onUpdate(prev => [...prev, {
      id: Date.now().toString(),
      name: newName.trim(),
      site: newSite || '—',
      categories: newCats,
      email: newEmail.trim(),
      whatsapp: newWa.trim(),
      active: true,
    }]);
    setNewName(''); setNewSite(''); setNewEmail(''); setNewWa(''); setNewCats([]); setShowAdd(false);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <div className="font-medium text-slate-900">Prestataires agréés</div>
          <div className="text-xs text-slate-400 mt-0.5">
            Entreprises agréées par le DG pour soumissionner aux appels d&apos;offres par catégorie
          </div>
        </div>
        <span className="text-xs text-slate-400">{prestataires.filter(p => p.active).length} actifs · {prestataires.length} total</span>
      </div>

      {/* Résumé par catégorie */}
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => {
            const count = prestataires.filter(p => p.active && p.categories.includes(key)).length;
            return (
              <span key={key} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600">
                <span>{icon}</span>
                <span className="font-medium">{label}</span>
                <span className="text-slate-400">({count})</span>
              </span>
            );
          })}
        </div>
      </div>

      <ul>
        {prestataires.map((p) => (
          <PrestaRow
            key={p.id}
            p={p}
            sites={sites}
            onSave={(updated) => onUpdate(prev => prev.map(x => x.id === p.id ? updated : x))}
            onToggle={() => onUpdate(prev => prev.map(x => x.id === p.id ? { ...x, active: !x.active } : x))}
            onDelete={() => onUpdate(prev => prev.filter(x => x.id !== p.id))}
          />
        ))}
        {prestataires.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-slate-400">Aucun prestataire configuré</li>
        )}
      </ul>

      {/* Add form */}
      <div className="px-5 py-4 border-t border-slate-100">
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)}
            className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">
            + Nouveau prestataire agréé
          </button>
        ) : (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nouveau prestataire</div>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Nom et prénom *" value={newName} onChange={e => setNewName(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900" />
              <div>
                <select value={newSite} onChange={e => setNewSite(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
                  <option value="">Site de base…</option>
                  {sites.map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
                </select>
                <p className="text-xs text-slate-400 mt-0.5 ml-1">Aucun déplacement pour ce site</p>
              </div>
              <input type="email" placeholder="Email (notification)" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900" />
              <input type="tel" placeholder="WhatsApp (+216…)" value={newWa} onChange={e => setNewWa(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900" />
            </div>
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Catégories d&apos;intervention</div>
              <div className="grid grid-cols-2 gap-1.5">
                {ALL_CATEGORY_KEYS.map(key => {
                  const c = CATEGORY_LABELS[key];
                  const checked = newCats.includes(key);
                  return (
                    <label key={key} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${checked ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700 border border-slate-100'}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleCat(key)} className="hidden" />
                      <span>{c.icon}</span>
                      <span className="font-medium">{c.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowAdd(false); setNewName(''); setNewSite(''); setNewEmail(''); setNewWa(''); setNewCats([]); }}
                className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100">Annuler</button>
              <button onClick={addPrestataire} disabled={!newName.trim()}
                className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                + Ajouter
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add fournisseur form ───────────────────────────────────────────────────
function AddFournisseurForm({ onAdd }: { onAdd: (f: Fournisseur) => void }) {
  const empty: Omit<Fournisseur, 'id'> = {
    company: '', contact: '', email: '', whatsapp: '', address: '', matricule_fiscale: '', categories: [], active: true,
  };
  const [open, setOpen]   = useState(false);
  const [form, setForm]   = useState(empty);
  const [saved, setSaved] = useState(false);

  function setF<K extends keyof typeof empty>(k: K, v: (typeof empty)[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }
  function toggleCat(key: string) {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(key)
        ? prev.categories.filter(k => k !== key)
        : [...prev.categories, key],
    }));
  }
  function handleAdd() {
    if (!form.company.trim()) return;
    onAdd({ ...form, id: Date.now().toString(), company: form.company.trim(), contact: form.contact.trim() });
    setSaved(true);
    setTimeout(() => { setSaved(false); setOpen(false); setForm(empty); }, 1200);
  }

  if (!open) {
    return (
      <div className="px-5 py-3 border-t border-slate-100">
        <button onClick={() => setOpen(true)}
          className="text-sm text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors">
          + Ajouter un fournisseur
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 space-y-3">
      <div className="font-medium text-sm text-slate-700">Nouveau fournisseur</div>
      <div className="grid grid-cols-2 gap-2">
        <input type="text" value={form.company} onChange={e => setF('company', e.target.value)}
          placeholder="Raison sociale *"
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white col-span-2" />
        <input type="text" value={form.contact} onChange={e => setF('contact', e.target.value)}
          placeholder="Nom et prénom — contact"
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
        <input type="text" value={form.matricule_fiscale} onChange={e => setF('matricule_fiscale', e.target.value)}
          placeholder="Matricule fiscale"
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white font-mono" />
        <input type="email" value={form.email} onChange={e => setF('email', e.target.value)}
          placeholder="Email"
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
        <input type="tel" value={form.whatsapp} onChange={e => setF('whatsapp', e.target.value)}
          placeholder="WhatsApp (+216…)"
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
        <input type="text" value={form.address} onChange={e => setF('address', e.target.value)}
          placeholder="Adresse complète"
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white col-span-2" />
      </div>
      <div className="border border-slate-200 rounded-lg p-3 bg-white">
        <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Catégories de matériel fourni</div>
        <div className="grid grid-cols-2 gap-1.5">
          {ALL_CATEGORY_KEYS.map(key => {
            const c = CATEGORY_LABELS[key];
            const checked = form.categories.includes(key);
            return (
              <label key={key} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${checked ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700 border border-slate-100'}`}>
                <input type="checkbox" checked={checked} onChange={() => toggleCat(key)} className="hidden" />
                <span>{c.icon}</span>
                <span className="font-medium">{c.label}</span>
              </label>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={() => { setOpen(false); setForm(empty); }}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100">Annuler</button>
        <button onClick={handleAdd} disabled={!form.company.trim()}
          className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 ${saved ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-700'}`}>
          {saved ? '✓ Ajouté' : '+ Ajouter'}
        </button>
      </div>
    </div>
  );
}

// ── Fournisseur row (inline edit + toggle + delete) ───────────────────────
function FournisseurRow({ f, onSave, onToggle, onDelete }: {
  f: Fournisseur;
  onSave: (updated: Fournisseur) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing]       = useState(false);
  const [draft, setDraft]           = useState<Fournisseur>(f);
  const [saved, setSaved]           = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  function handleSave() {
    if (!draft.company.trim()) return;
    onSave({ ...draft, company: draft.company.trim(), contact: draft.contact.trim() });
    setSaved(true);
    setTimeout(() => { setSaved(false); setEditing(false); }, 1200);
  }

  function toggleCat(key: string) {
    setDraft(prev => ({
      ...prev,
      categories: prev.categories.includes(key)
        ? prev.categories.filter(k => k !== key)
        : [...prev.categories, key],
    }));
  }

  if (editing) {
    return (
      <li className="px-5 py-4 bg-slate-50 border-b border-slate-100 last:border-0">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={draft.company} onChange={e => setDraft(d => ({ ...d, company: e.target.value }))}
              placeholder="Raison sociale *"
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white col-span-2" />
            <input type="text" value={draft.contact} onChange={e => setDraft(d => ({ ...d, contact: e.target.value }))}
              placeholder="Nom et prénom — contact"
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
            <input type="text" value={draft.matricule_fiscale} onChange={e => setDraft(d => ({ ...d, matricule_fiscale: e.target.value }))}
              placeholder="Matricule fiscale"
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white font-mono" />
            <input type="email" value={draft.email} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))}
              placeholder="Email"
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
            <input type="tel" value={draft.whatsapp} onChange={e => setDraft(d => ({ ...d, whatsapp: e.target.value }))}
              placeholder="WhatsApp (+216…)"
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
            <input type="text" value={draft.address} onChange={e => setDraft(d => ({ ...d, address: e.target.value }))}
              placeholder="Adresse"
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white col-span-2" />
          </div>
          <div className="border border-slate-200 rounded-lg p-3 bg-white">
            <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Catégories de matériel fourni</div>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_CATEGORY_KEYS.map(key => {
                const c = CATEGORY_LABELS[key];
                const checked = draft.categories.includes(key);
                return (
                  <label key={key} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${checked ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700 border border-slate-100'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleCat(key)} className="hidden" />
                    <span>{c.icon}</span>
                    <span className="font-medium">{c.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setDraft(f); setEditing(false); }}
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100">Annuler</button>
            <button onClick={handleSave} disabled={!draft.company.trim()}
              className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 ${saved ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-700'}`}>
              {saved ? '✓ Enregistré' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="px-5 py-4 group border-b border-slate-100 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${f.active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{f.company}</span>
            {f.contact && <span className="text-xs text-slate-500">— {f.contact}</span>}
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {f.categories.map(cat => {
              const c = CATEGORY_LABELS[cat];
              return c ? (
                <span key={cat} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                  {c.icon} {c.label}
                </span>
              ) : null;
            })}
            {f.categories.length === 0 && <span className="text-xs text-slate-300 italic">Aucune catégorie</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-slate-400">
            {f.email && <span>✉ {f.email}</span>}
            {f.whatsapp && <span>📱 {f.whatsapp}</span>}
            {f.address && <span>📍 {f.address}</span>}
            {f.matricule_fiscale && <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{f.matricule_fiscale}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {confirmDel ? (
            <>
              <span className="text-xs text-red-600 mr-1">Supprimer ?</span>
              <button onClick={onDelete} className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg hover:bg-red-700">Oui</button>
              <button onClick={() => setConfirmDel(false)} className="text-xs border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-50">Non</button>
            </>
          ) : (
            <>
              <button onClick={() => { setDraft(f); setEditing(true); }}
                className="opacity-0 group-hover:opacity-100 text-xs text-slate-500 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100 transition-all">
                Modifier
              </button>
              <button onClick={onToggle}
                className={`text-xs px-2 py-1 rounded-lg border transition-colors ${f.active ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                {f.active ? 'Désactiver' : 'Activer'}
              </button>
              <button onClick={() => setConfirmDel(true)}
                className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 px-1 py-1 rounded transition-all">✕</button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

// ── Alertes & Escalades tab ────────────────────────────────────────────────
interface AlertRule {
  entity: string; // 'groupe' | entity code
  label: string;
  rappel_prestataire_h: number;
  escalade_directeur_h: number;
  escalade_dg_h: number;
  confirmation_rappel_h: number; // rappel demandeur pour confirmer réception
}

const GROUP_ALERT_DEFAULTS: AlertRule = {
  entity: 'groupe', label: 'Groupe Elkateb',
  rappel_prestataire_h: 24,
  escalade_directeur_h: 48,
  escalade_dg_h: 72,
  confirmation_rappel_h: 24,
};

const INITIAL_ALERT_RULES: AlertRule[] = [
  { ...GROUP_ALERT_DEFAULTS },
  { entity: 'LAD',   label: 'LAD',          rappel_prestataire_h: 20, escalade_directeur_h: 40, escalade_dg_h: 60, confirmation_rappel_h: 20 },
  { entity: 'FAD',   label: 'FAD Industrie', rappel_prestataire_h: 24, escalade_directeur_h: 48, escalade_dg_h: 72, confirmation_rappel_h: 24 },
  { entity: 'BTFI',  label: 'BTFI',          rappel_prestataire_h: 16, escalade_directeur_h: 36, escalade_dg_h: 60, confirmation_rappel_h: 16 },
  { entity: '3Ps',   label: '3Ps',           rappel_prestataire_h: 24, escalade_directeur_h: 48, escalade_dg_h: 72, confirmation_rappel_h: 24 },
  { entity: 'K&Ko',  label: 'K & Ko',        rappel_prestataire_h: 24, escalade_directeur_h: 48, escalade_dg_h: 72, confirmation_rappel_h: 24 },
];

function AlertRuleRow({ rule, group, isDG, onSave }: {
  rule: AlertRule;
  group: AlertRule;
  isDG: boolean;
  onSave: (r: AlertRule) => void;
}) {
  const [open, setOpen]   = useState(false);
  const [draft, setDraft] = useState(rule);
  const [saved, setSaved] = useState(false);
  const isGroup = rule.entity === 'groupe';

  function setF<K extends keyof AlertRule>(k: K, v: number) {
    setDraft(prev => ({ ...prev, [k]: v }));
  }

  const violations = isGroup ? [] : [
    draft.rappel_prestataire_h > group.rappel_prestataire_h    && `Rappel prestataire (${draft.rappel_prestataire_h}h) plus laxiste que le groupe (${group.rappel_prestataire_h}h)`,
    draft.escalade_directeur_h > group.escalade_directeur_h    && `Escalade directeur (${draft.escalade_directeur_h}h) plus laxiste que le groupe (${group.escalade_directeur_h}h)`,
    draft.escalade_dg_h > group.escalade_dg_h                  && `Escalade DG (${draft.escalade_dg_h}h) plus laxiste que le groupe (${group.escalade_dg_h}h)`,
    draft.confirmation_rappel_h > group.confirmation_rappel_h  && `Rappel confirmation (${draft.confirmation_rappel_h}h) plus laxiste que le groupe (${group.confirmation_rappel_h}h)`,
  ].filter(Boolean) as string[];

  function handleSave() {
    if (violations.length > 0) return;
    onSave(draft); setSaved(true);
    setTimeout(() => { setSaved(false); setOpen(false); }, 1200);
  }

  const canEdit = isGroup ? isDG : true;

  return (
    <div className={`rounded-xl border overflow-hidden ${violations.length > 0 ? 'border-red-200' : 'border-slate-200'}`}>
      <div className={`px-4 py-3 flex items-center gap-3 ${violations.length > 0 ? 'bg-red-50' : isGroup ? 'bg-slate-50' : 'bg-white'}`}>
        <button onClick={() => canEdit && setOpen(o => !o)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {canEdit && (
            <svg className={`w-3.5 h-3.5 shrink-0 transition-transform text-slate-400 ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          <div>
            <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              {rule.label}
              {isGroup && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Référence groupe</span>}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Rappel {rule.rappel_prestataire_h}h · Escalade directeur {rule.escalade_directeur_h}h · Escalade DG {rule.escalade_dg_h}h · Confirmation {rule.confirmation_rappel_h}h
            </div>
          </div>
        </button>
        <div className="shrink-0">
          {violations.length > 0
            ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">⚠ {violations.length} écart{violations.length > 1 ? 's' : ''}</span>
            : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ OK</span>}
        </div>
      </div>

      {open && canEdit && (
        <div className="px-5 py-4 border-t border-slate-100 space-y-4">
          {violations.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 space-y-0.5">
              {violations.map((v, i) => <div key={i}>⚠ {v}</div>)}
            </div>
          )}
          {!isGroup && (
            <p className="text-xs text-slate-400">Les règles d&apos;entité doivent être <strong>plus strictes ou égales</strong> aux règles groupe. Un délai plus court = règle plus stricte.</p>
          )}

          {[
            { key: 'rappel_prestataire_h'  as const, label: 'Rappel prestataire (inaction)',  desc: 'Email auto au prestataire si aucune mise à jour après X heures en statut "En cours"',  max: isGroup ? 72 : group.rappel_prestataire_h },
            { key: 'escalade_directeur_h'  as const, label: 'Escalade → Directeur d\'entité', desc: 'Si toujours bloqué X heures après rappel, email au directeur d\'entité',                 max: isGroup ? 96 : group.escalade_directeur_h },
            { key: 'escalade_dg_h'         as const, label: 'Escalade → Direction Générale',  desc: 'Si non résolu X heures après escalade directeur, email DG',                              max: isGroup ? 168 : group.escalade_dg_h },
            { key: 'confirmation_rappel_h' as const, label: 'Rappel confirmation demandeur',   desc: 'Email au demandeur si l\'intervention n\'est pas confirmée après X heures',              max: isGroup ? 72 : group.confirmation_rappel_h },
          ].map(({ key, label, desc, max }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700">{label}</label>
                <span className="text-xs text-slate-400">{desc}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={1} max={max} step={1}
                  value={draft[key] as number}
                  onChange={e => setF(key, Number(e.target.value))}
                  className="w-24 text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
                <span className="text-xs text-slate-500">heures{!isGroup && <span className="text-slate-300 ml-1">(max {max}h — plafond groupe)</span>}</span>
              </div>
            </div>
          ))}

          <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
            <button onClick={() => { setDraft(rule); setOpen(false); }} className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100">Annuler</button>
            <button onClick={handleSave} disabled={violations.length > 0}
              className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${saved ? 'bg-green-600 text-white' : violations.length > 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-700'}`}>
              {saved ? '✓ Enregistré' : violations.length > 0 ? 'Corriger les écarts' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertesTab() {
  const [isDG] = useState(true);
  const [rules, setRules] = useState<AlertRule[]>(INITIAL_ALERT_RULES);
  const group = rules.find(r => r.entity === 'groupe') ?? GROUP_ALERT_DEFAULTS;

  function updateRule(entity: string, updated: AlertRule) {
    setRules(prev => prev.map(r => r.entity === entity ? updated : r));
  }

  const entityRules = rules.filter(r => r.entity !== 'groupe');
  const entityViolations = entityRules.filter(r => {
    return r.rappel_prestataire_h > group.rappel_prestataire_h ||
           r.escalade_directeur_h > group.escalade_directeur_h ||
           r.escalade_dg_h > group.escalade_dg_h ||
           r.confirmation_rappel_h > group.confirmation_rappel_h;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
        <div className="font-medium text-slate-900">Règles d&apos;alertes et d&apos;escalades</div>
        <div className="text-xs text-slate-400 mt-0.5">
          Délais déclenchant les emails automatiques de rappel et d&apos;escalade — définis par la DG, affinés par entité
        </div>
      </div>

      {/* Légende du circuit */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 space-y-2">
        <div className="font-semibold text-slate-700 mb-1">Circuit d&apos;escalade automatique</div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">1</span><span><strong>Rappel prestataire</strong> — email auto si aucun progrès en cours d&apos;intervention</span></div>
          <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">2</span><span><strong>Escalade directeur</strong> — si toujours bloqué après le rappel, le directeur est notifié</span></div>
          <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">3</span><span><strong>Escalade DG</strong> — si non résolu après escalade directeur</span></div>
          <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">4</span><span><strong>Rappel confirmation</strong> — email demandeur pour confirmer réception des travaux</span></div>
        </div>
        <div className="text-slate-400 pt-1 border-t border-slate-200 mt-1">
          Les règles d&apos;entité doivent être <strong>plus strictes ou égales</strong> aux règles groupe. Elles ne peuvent pas être enregistrées si elles dépassent le plafond DG.
        </div>
      </div>

      {entityViolations > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          ⚠ <strong>{entityViolations} entité{entityViolations > 1 ? 's' : ''}</strong> avec des règles plus laxistes que le groupe — correction requise
        </div>
      )}

      {/* Règles groupe */}
      <div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Règles groupe — référence</div>
        <AlertRuleRow
          rule={group}
          group={group}
          isDG={isDG}
          onSave={updated => updateRule('groupe', updated)}
        />
      </div>

      {/* Règles par entité */}
      <div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Règles par entité</div>
        <p className="text-xs text-slate-400 mb-3">Par défaut identiques aux règles groupe. Les directeurs d&apos;entité peuvent les rendre plus strictes.</p>
        <div className="space-y-2">
          {entityRules.map(r => (
            <AlertRuleRow
              key={r.entity}
              rule={r}
              group={group}
              isDG={isDG}
              onSave={updated => updateRule(r.entity, updated)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab]           = useState<Tab>('sites');
  const [sites, setSites]       = useState(MOCK_SITES);
  const [entities, setEntities] = useState<EntityDetail[]>(MOCK_ENTITIES);
  const [prestataires, setPrestataires] = useState<Prestataire[]>(MOCK_PRESTATAIRES);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>(MOCK_FOURNISSEURS);
  const [users, setUsers]       = useState<AppUser[]>(INITIAL_USERS);
  const [newLabel, setNewLabel]           = useState('');
  const [newCity, setNewCity]             = useState('');
  const [newSiteEntity, setNewSiteEntity] = useState('LAD');
  const [newCode, setNewCode]             = useState('');
  const [newName, setNewName]             = useState('');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sites',       label: "Sites d'intervention" },
    { key: 'entities',    label: 'Entités' },
    { key: 'prestataires', label: 'Prestataires' },
    { key: 'fournisseurs', label: 'Fournisseurs BC' },
    { key: 'users',       label: 'Utilisateurs' },
    { key: 'objectifs',   label: 'Objectifs KPI' },
    { key: 'alertes',    label: 'Alertes & Escalades' },
    { key: 'email',      label: '✉ Email & Devis' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-slate-500 mt-1">Configuration de la plateforme — accès administrateur</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit flex-wrap">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === t.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
            {t.key === 'users' && (
              <span className="ml-1.5 text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{users.filter(u => u.active).length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Sites ────────────────────────────────────────────────────── */}
      {tab === 'sites' && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">Sites d&apos;intervention</div>
              <div className="text-xs text-slate-400 mt-0.5">Sites physiques du groupe — entités associées par site</div>
            </div>
            <span className="text-xs text-slate-400">{sites.filter(s => s.active).length} actifs · {sites.length} total</span>
          </div>
          <ul>
            {sites.map((s) => (
              <SiteCard
                key={s.id}
                site={s}
                onSave={(updated) => setSites(prev => prev.map(x => x.id === s.id ? updated : x))}
                onToggle={() => setSites(prev => prev.map(x => x.id === s.id ? { ...x, active: !x.active } : x))}
                onDelete={() => setSites(prev => prev.filter(x => x.id !== s.id))}
              />
            ))}
          </ul>
          {sites.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">Aucun site configuré</div>
          )}
          {/* Ajouter un site */}
          <div className="px-5 py-4 border-t border-slate-100 flex gap-2 flex-wrap items-center">
            <input
              type="text"
              placeholder="Libellé du site…"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 min-w-[140px]"
            />
            <input
              type="text"
              placeholder="Ville…"
              value={newCity}
              onChange={e => setNewCity(e.target.value)}
              className="w-32 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <select
              value={newSiteEntity}
              onChange={e => setNewSiteEntity(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white w-28"
            >
              {ENTITY_LIST.map(e => <option key={e.code} value={e.code}>{e.code}</option>)}
            </select>
            <button
              onClick={() => {
                if (!newLabel.trim()) return;
                setSites(prev => [...prev, {
                  id: Date.now().toString(),
                  label: newLabel.trim(),
                  city: newCity.trim() || '—',
                  entityCodes: newSiteEntity ? [newSiteEntity] : [],
                  active: true,
                }]);
                setNewLabel('');
                setNewCity('');
              }}
              className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              + Ajouter
            </button>
          </div>
        </div>
      )}

      {/* ── Entités ──────────────────────────────────────────────────── */}
      {tab === 'entities' && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">Entités du groupe</div>
              <div className="text-xs text-slate-400 mt-0.5">Informations affichées sur les Bons de Commande</div>
            </div>
            <span className="text-xs text-slate-400">{entities.filter(e => e.active).length} actives</span>
          </div>
          <ul>
            {entities.map((en) => (
              <EntityRow key={en.id} entity={en}
                onSave={(updated) => setEntities(prev => prev.map(x => x.id === en.id ? updated : x))}
                onToggle={() => setEntities(prev => prev.map(x => x.id === en.id ? { ...x, active: !x.active } : x))} />
            ))}
          </ul>
          <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
            <input type="text" placeholder="Code (ex: XYZ)" value={newCode} onChange={e => setNewCode(e.target.value)} className="w-28 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900" />
            <input type="text" placeholder="Nom complet…" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900" />
            <button onClick={() => {
              if (!newCode.trim()) return;
              const code = newCode.trim();
              setEntities(prev => [...prev, { id: Date.now().toString(), code, name: code, full_name: newName.trim() || code, address: '', phone: '', matricule_fiscale: '', active: true }]);
              setNewCode(''); setNewName('');
            }} className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">Ajouter</button>
          </div>
        </div>
      )}

      {/* ── Prestataires ─────────────────────────────────────────────── */}
      {tab === 'prestataires' && (
        <PrestatairesTab
          prestataires={prestataires}
          sites={sites}
          onUpdate={setPrestataires}
        />
      )}

      {/* ── Utilisateurs ─────────────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="font-medium text-slate-900">Gestion des utilisateurs</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {users.filter(u => u.active).length} comptes actifs · Seul l&apos;administrateur peut créer des comptes et définir les mots de passe initiaux
            </div>
          </div>
          <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap gap-2">
            {(Object.keys(ROLE_LABELS) as UserRoleType[]).map(r => (
              <span key={r} className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[r]}`}>{ROLE_LABELS[r]}</span>
            ))}
          </div>
          <ul>
            {users.map((u) => (
              <UserRow key={u.id} user={u} sites={sites}
                onSave={(updated) => setUsers(prev => prev.map(x => x.id === u.id ? updated : x))}
                onToggle={() => setUsers(prev => prev.map(x => x.id === u.id ? { ...x, active: !x.active } : x))} />
            ))}
          </ul>
          <AddUserForm sites={sites} onAdd={(u) => setUsers(prev => [...prev, u])} />
        </div>
      )}

      {/* ── Fournisseurs BC ──────────────────────────────────────────── */}
      {tab === 'fournisseurs' && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">Fournisseurs agréés</div>
              <div className="text-xs text-slate-400 mt-0.5">Fournisseurs de matériaux et pièces agréés pour les bons de commande</div>
            </div>
            <span className="text-xs text-slate-400">{fournisseurs.filter(f => f.active).length} actifs · {fournisseurs.length} total</span>
          </div>
          <ul>
            {fournisseurs.map(f => (
              <FournisseurRow
                key={f.id}
                f={f}
                onSave={updated => setFournisseurs(prev => prev.map(x => x.id === f.id ? updated : x))}
                onToggle={() => setFournisseurs(prev => prev.map(x => x.id === f.id ? { ...x, active: !x.active } : x))}
                onDelete={() => setFournisseurs(prev => prev.filter(x => x.id !== f.id))}
              />
            ))}
            {fournisseurs.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-slate-400">Aucun fournisseur configuré</li>
            )}
          </ul>
          {/* Ajouter un fournisseur */}
          <AddFournisseurForm onAdd={f => setFournisseurs(prev => [...prev, f])} />
        </div>
      )}

      {/* ── Objectifs KPI ────────────────────────────────────────────── */}
      {tab === 'objectifs' && <ObjectifsTab />}

      {/* ── Alertes & Escalades ──────────────────────────────────────── */}
      {tab === 'alertes' && <AlertesTab />}

      {/* ── Email & Devis ────────────────────────────────────────────── */}
      {tab === 'email' && <EmailDevisTab />}
    </div>
  );
}

// ── Email & Devis tab ──────────────────────────────────────────────────────
function EmailDevisTab() {
  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'ok' | 'err'>('idle');
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/devis-inbound`
    : '/api/devis-inbound';

  async function testWebhook() {
    setTestResult('testing');
    try {
      const res = await fetch('/api/devis-inbound');
      setTestResult(res.ok ? 'ok' : 'err');
    } catch {
      setTestResult('err');
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-1">Réception des devis par email</h2>
        <p className="text-sm text-slate-500">
          Les fournisseurs et prestataires reçoivent un email de demande de devis avec la référence de l&apos;intervention dans le sujet.
          Ils répondent en joignant leur devis — l&apos;application le récupère automatiquement via un webhook.
        </p>
      </div>

      {/* Webhook URL */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="font-semibold text-slate-800 text-sm">URL du webhook inbound</div>
          <div className="text-xs text-slate-500 mt-0.5">À configurer dans votre provider email (Mailgun ou Postmark)</div>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-900 text-green-400 text-sm font-mono px-4 py-2.5 rounded-lg overflow-x-auto">
              POST {webhookUrl}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(webhookUrl + '')}
              className="shrink-0 px-3 py-2.5 text-xs border border-slate-200 rounded-lg hover:border-slate-400 transition-colors text-slate-600"
            >
              Copier
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={testWebhook}
              disabled={testResult === 'testing'}
              className="text-xs px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {testResult === 'testing' ? '⏳ Test…' : '▶ Tester le webhook'}
            </button>
            {testResult === 'ok' && <span className="text-xs text-green-600 font-medium">✓ Webhook actif et accessible</span>}
            {testResult === 'err' && <span className="text-xs text-red-600">✗ Erreur — vérifiez l&apos;URL et le déploiement</span>}
          </div>
        </div>
      </div>

      {/* Format du sujet */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="font-semibold text-slate-800 text-sm">Format des emails de demande de devis</div>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Sujet envoyé aux prestataires/fournisseurs</div>
            <code className="block bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-800 font-mono text-xs">
              Demande de devis — [DEM-2026-048] Réparation porte bureau P3
            </code>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Réponse attendue du fournisseur</div>
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Répondre à l&apos;email en gardant la référence dans le sujet (RE: DEM-2026-048…)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Joindre le devis en PDF ou image (JPG/PNG)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">⚠</span>
                Délai maximum : 96h (configurable dans Alertes & Escalades)
              </li>
            </ul>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-800">
            <strong>Devis papier :</strong> Si le fournisseur apporte un document papier, le prestataire peut le prendre en photo et l&apos;uploader directement dans l&apos;application (bouton &quot;+ Reçu&quot; dans la section devis).
          </div>
        </div>
      </div>

      {/* Configuration Mailgun */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="font-semibold text-slate-800 text-sm">Configuration Mailgun</div>
          <div className="text-xs text-slate-500 mt-0.5">Pour recevoir les devis dans Mailgun → Store & Forward</div>
        </div>
        <div className="p-5 space-y-3 text-sm text-slate-600">
          <ol className="space-y-3 list-decimal list-inside">
            <li>Dans Mailgun → Routes → Créer une règle</li>
            <li>
              Filtre :
              <code className="ml-2 bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">
                match_header(&quot;subject&quot;, &quot;DEM-&quot;) OR match_header(&quot;subject&quot;, &quot;BC-&quot;)
              </code>
            </li>
            <li>
              Action :
              <code className="ml-2 bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">
                forward(&quot;{webhookUrl}&quot;)
              </code>
            </li>
            <li>Priorité : 10 · Cocher &quot;Stop processing&quot;</li>
          </ol>
        </div>
      </div>

      {/* Configuration Postmark */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="font-semibold text-slate-800 text-sm">Configuration Postmark</div>
          <div className="text-xs text-slate-500 mt-0.5">Inbound processing → webhook JSON</div>
        </div>
        <div className="p-5 text-sm text-slate-600 space-y-2">
          <p>Dans Postmark → Servers → votre serveur → Settings → Inbound :</p>
          <p>
            <strong>Inbound webhook URL :</strong>{' '}
            <code className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">{webhookUrl}</code>
          </p>
          <p className="text-xs text-slate-400">
            Postmark envoie du JSON application/json. Le webhook détecte automatiquement le format (Mailgun vs Postmark).
          </p>
        </div>
      </div>
    </div>
  );
}
