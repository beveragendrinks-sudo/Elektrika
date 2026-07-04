'use client';

import React, { useState, useRef } from 'react';
import { ENTITY_LIST, getAllSites, entitySitesLabel } from '@/lib/entities';

// ── Types ──────────────────────────────────────────────────────────────────
type Tab = 'sites' | 'entities' | 'prestataires' | 'users' | 'objectifs';

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

const ENTITIES_OPTS = ['LAD', 'FAD', 'BTFI', '3Ps', 'K&Ko', 'Groupe'];

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
interface SiteItem { id: string; label: string; entityCode: string; entityName: string; active: boolean; }

// Tous les sites physiques du groupe, dérivés de ENTITY_LIST
const MOCK_SITES: SiteItem[] = getAllSites().map(s => ({
  id:         s.id,
  label:      `${s.label}, ${s.city}`,
  entityCode: s.entityCode,
  entityName: s.entityName,
  active:     true,
}));

const MOCK_ENTITIES: EntityDetail[] = [
  { id: '1', code: 'LAD',   name: 'LAD',   full_name: 'Société LAD',            address: 'Zone Industrielle Charguia II, 2035 Ariana',      phone: '+216 71 234 000', matricule_fiscale: '1234567/A/M/000', active: true },
  { id: '2', code: 'FAD',   name: 'FAD',   full_name: 'FAD Industrie S.A.R.L.', address: 'Pôle Industriel Jbel Oust, 2082 Jbel Oust',      phone: '+216 72 345 678', matricule_fiscale: '2345678/B/P/000', active: true },
  { id: '3', code: 'BTFI',  name: 'BTFI',  full_name: 'BTFI Technologie',       address: 'Sénia Beni Khaled, 8061 Beni Khaled',            phone: '+216 72 456 789', matricule_fiscale: '3456789/C/N/000', active: true },
  { id: '4', code: '3Ps',   name: '3Ps',   full_name: '3Ps Solutions',          address: 'Route de Megrine, 2033 Megrine',                  phone: '+216 71 567 890', matricule_fiscale: '4567890/D/M/000', active: true },
  { id: '5', code: 'K&Ko',  name: 'K&Ko',  full_name: 'K&Ko Groupe',            address: 'Zone Carthage, 2016 Carthage',                   phone: '+216 71 678 901', matricule_fiscale: '5678901/E/M/000', active: true },
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
  { id: '1', name: 'Mohamed Salah', site: 'Siège, Ben Arous (LAD)',            categories: ['electricite', 'autres'],               email: 'msalah@lad.tn',    whatsapp: '+216 50 123 456', active: true },
  { id: '2', name: 'Karim Bejaoui', site: 'Pôle Industriel, Jbel Oust (FAD)', categories: ['plomberie', 'climatisation'],          email: 'kbejaoui@fad.tn',  whatsapp: '+216 55 234 567', active: true },
  { id: '3', name: 'Anis Trabelsi', site: 'Site Principal, Megrine (3Ps)',      categories: ['maconnerie', 'peinture', 'menuiserie'], email: 'atrabelsi@3ps.tn', whatsapp: '+216 52 345 678', active: true },
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

// ── Site row (inline edit + toggle + delete) ───────────────────────────────
function SiteRow({ site, onSave, onToggle, onDelete }: {
  site: SiteItem;
  onSave: (label: string) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(site.label);
  const [saved, setSaved]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(site.label);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSave() {
    if (!draft.trim() || draft.trim() === site.label) { setEditing(false); return; }
    onSave(draft.trim());
    setSaved(true);
    setTimeout(() => { setSaved(false); setEditing(false); }, 1200);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setDraft(site.label); setEditing(false); }
  }

  return (
    <li className="flex items-center gap-3 px-5 py-3 group border-b border-slate-100 last:border-0">
      {editing ? (
        <>
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <button onClick={handleSave}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-700'}`}>
            {saved ? '✓ Enregistré' : 'Enregistrer'}
          </button>
          <button onClick={() => { setDraft(site.label); setEditing(false); }}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
            Annuler
          </button>
        </>
      ) : (
        <>
          <span className={`flex-1 text-sm ${site.active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
            {site.label}
          </span>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={startEdit} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
              Modifier
            </button>
            {confirmDel ? (
              <>
                <span className="text-xs text-red-600">Supprimer ?</span>
                <button onClick={onDelete} className="text-xs font-semibold text-red-600 hover:text-red-800">Oui</button>
                <button onClick={() => setConfirmDel(false)} className="text-xs text-slate-400 hover:text-slate-600">Non</button>
              </>
            ) : (
              <button onClick={() => setConfirmDel(true)} className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
          <button onClick={onToggle}
            className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${site.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {site.active ? 'Actif' : 'Désactivé'}
          </button>
        </>
      )}
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
                    {sites.filter(s => s.entityCode === draft.entity).map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
                    {sites.filter(s => s.entityCode === draft.entity).length === 0 &&
                      sites.map(s => <option key={s.id} value={s.label}>{s.entityCode} — {s.label}</option>)}
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
              {sites.filter(s => s.entityCode === form.entity).map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
              {sites.filter(s => s.entityCode === form.entity).length === 0 &&
                sites.map(s => <option key={s.id} value={s.label}>{s.entityCode} — {s.label}</option>)}
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

// ── Objectifs tab ──────────────────────────────────────────────────────────
function ObjectifsTab() {
  const [viewRole, setViewRole] = useState<ViewRole>('dg');
  const [group, setGroup]       = useState<GroupKpiTargets>(GROUP_TARGETS_INIT);
  const [entities, setEntities] = useState<EntityKpiTargets[]>(ENTITY_TARGETS_INIT);

  const isDG = viewRole === 'dg';
  const totalViolations = entities.filter(e => validateEntityVsGroup(e, group).length > 0).length;

  function updateEntity(code: string, updated: EntityKpiTargets) {
    setEntities(prev => prev.map(e => e.entity === code ? updated : e));
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
          {isDG ? 'Le DG voit et modifie l\'enveloppe groupe. Il voit tous les objectifs par entité (lecture seule).' : `${viewRole} voit l\'enveloppe DG en lecture seule et modifie uniquement ses propres objectifs.`}
        </div>
      </div>

      {/* Group targets */}
      <GroupTargetCard targets={group} onSave={setGroup} canEdit={isDG} />

      {/* Conformité résumé */}
      {isDG && (
        <div className={`rounded-lg px-4 py-3 flex items-center gap-3 ${totalViolations > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          <span className={`text-xl ${totalViolations > 0 ? '' : ''}`}>{totalViolations > 0 ? '⚠' : '✓'}</span>
          <div className="text-sm">
            {totalViolations > 0 ? (
              <><span className="font-semibold text-red-800">{totalViolations} entité{totalViolations > 1 ? 's' : ''} hors enveloppe</span><span className="text-red-600"> — les objectifs définis dépassent les contraintes groupe</span></>
            ) : (
              <span className="font-semibold text-green-800">Toutes les entités respectent l&apos;enveloppe groupe</span>
            )}
          </div>
        </div>
      )}

      {/* Entity targets */}
      <div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Objectifs par entité</div>
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

      {/* Legend */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500 space-y-1">
        <div className="font-semibold text-slate-600 mb-1.5">Règles de cohérence</div>
        <div>• <strong>MTTR</strong> : l&apos;objectif entité (≤ Xh) doit être <strong>inférieur ou égal</strong> à celui du groupe — plus strict est autorisé</div>
        <div>• <strong>SLA, 1er passage, Groupage</strong> : l&apos;objectif entité (≥ X%) doit être <strong>supérieur ou égal</strong> au plancher groupe</div>
        <div>• <strong>Budget annuel</strong> : ne peut pas dépasser le plafond par entité fixé par le DG</div>
        <div className="mt-1 text-slate-400">Un objectif entité hors enveloppe ne peut pas être enregistré tant que l&apos;écart n&apos;est pas corrigé.</div>
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
          <div className="font-medium text-slate-900">Prestataires de service</div>
          <div className="text-xs text-slate-400 mt-0.5">
            Le site de base = aucun déplacement. Autres sites = déplacement requis (groupage recommandé).
          </div>
        </div>
        <span className="text-xs text-slate-400">{prestataires.filter(p => p.active).length} actifs · {prestataires.length} total</span>
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
            + Ajouter un prestataire
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

// ── Main component ─────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab]           = useState<Tab>('sites');
  const [sites, setSites]       = useState(MOCK_SITES);
  const [entities, setEntities] = useState<EntityDetail[]>(MOCK_ENTITIES);
  const [prestataires, setPrestataires] = useState<Prestataire[]>(MOCK_PRESTATAIRES);
  const [users, setUsers]       = useState<AppUser[]>(INITIAL_USERS);
  const [newLabel, setNewLabel]           = useState('');
  const [newSiteEntity, setNewSiteEntity] = useState('LAD');
  const [newCode, setNewCode]             = useState('');
  const [newName, setNewName]             = useState('');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sites',       label: "Sites d'intervention" },
    { key: 'entities',    label: 'Entités' },
    { key: 'prestataires', label: 'Prestataires' },
    { key: 'users',       label: 'Utilisateurs' },
    { key: 'objectifs',   label: 'Objectifs KPI' },
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
              <div className="text-xs text-slate-400 mt-0.5">Sites physiques du groupe — classés par entité</div>
            </div>
            <span className="text-xs text-slate-400">{sites.filter(s => s.active).length} actifs · {sites.length} total</span>
          </div>
          {/* Groupement par entité */}
          {ENTITY_LIST.map(ent => {
            const entSites = sites.filter(s => s.entityCode === ent.code);
            if (entSites.length === 0) return null;
            return (
              <div key={ent.code}>
                <div className="px-5 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{ent.code}</span>
                  <span className="text-xs text-slate-400">{ent.name}</span>
                  <span className="ml-auto text-xs text-slate-400">{entSites.length} site{entSites.length > 1 ? 's' : ''}</span>
                </div>
                <ul>
                  {entSites.map((s) => (
                    <SiteRow
                      key={s.id}
                      site={s}
                      onSave={(label) => setSites(prev => prev.map(x => x.id === s.id ? { ...x, label } : x))}
                      onToggle={() => setSites(prev => prev.map(x => x.id === s.id ? { ...x, active: !x.active } : x))}
                      onDelete={() => setSites(prev => prev.filter(x => x.id !== s.id))}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
          {/* Sites sans entité (ajoutés manuellement sans entité) */}
          {sites.filter(s => !s.entityCode).length > 0 && (
            <div>
              <div className="px-5 py-2 bg-slate-50 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Sans entité</span>
              </div>
              <ul>
                {sites.filter(s => !s.entityCode).map((s) => (
                  <SiteRow
                    key={s.id}
                    site={s}
                    onSave={(label) => setSites(prev => prev.map(x => x.id === s.id ? { ...x, label } : x))}
                    onToggle={() => setSites(prev => prev.map(x => x.id === s.id ? { ...x, active: !x.active } : x))}
                    onDelete={() => setSites(prev => prev.filter(x => x.id !== s.id))}
                  />
                ))}
              </ul>
            </div>
          )}
          {sites.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">Aucun site configuré</div>
          )}
          {/* Ajouter un site */}
          <div className="px-5 py-4 border-t border-slate-100 flex gap-2 flex-wrap">
            <select
              value={newSiteEntity}
              onChange={e => setNewSiteEntity(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white w-28"
            >
              {ENTITY_LIST.map(e => <option key={e.code} value={e.code}>{e.code}</option>)}
            </select>
            <input
              type="text"
              placeholder="Libellé du nouveau site…"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newLabel.trim()) {
                  const ent = ENTITY_LIST.find(x => x.code === newSiteEntity)!;
                  setSites(prev => [...prev, { id: Date.now().toString(), label: newLabel.trim(), entityCode: ent.code, entityName: ent.name, active: true }]);
                  setNewLabel('');
                }
              }}
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 min-w-[160px]"
            />
            <button
              onClick={() => {
                if (!newLabel.trim()) return;
                const ent = ENTITY_LIST.find(x => x.code === newSiteEntity)!;
                setSites(prev => [...prev, { id: Date.now().toString(), label: newLabel.trim(), entityCode: ent.code, entityName: ent.name, active: true }]);
                setNewLabel('');
              }}
              className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
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

      {/* ── Objectifs KPI ────────────────────────────────────────────── */}
      {tab === 'objectifs' && <ObjectifsTab />}
    </div>
  );
}
