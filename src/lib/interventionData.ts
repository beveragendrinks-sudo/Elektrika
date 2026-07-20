import type { RequestStatus, InterventionCategory } from '@/types';
export type { InterventionCategory } from '@/types';

export interface Intervention {
  id: string;
  ref: string;
  title: string;
  category: InterventionCategory;
  status: RequestStatus;
  type: 1 | 2 | 3;
  isCritical: boolean;
  site: string;
  entity: string;
  prestataire?: string;
  createdAt: string; // ISO
  plannedDate?: string; // YYYY-MM-DD
}

export const CATEGORY_COLORS: Record<InterventionCategory, { bar: string; badge: string; text: string }> = {
  electricite:   { bar: 'bg-yellow-400',  badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',  text: 'text-yellow-800' },
  plomberie:     { bar: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-800 border-blue-200',        text: 'text-blue-800'   },
  climatisation: { bar: 'bg-cyan-400',    badge: 'bg-cyan-100 text-cyan-800 border-cyan-200',        text: 'text-cyan-800'   },
  maconnerie:    { bar: 'bg-orange-500',  badge: 'bg-orange-100 text-orange-800 border-orange-200',  text: 'text-orange-800' },
  peinture:      { bar: 'bg-purple-400',  badge: 'bg-purple-100 text-purple-800 border-purple-200',  text: 'text-purple-800' },
  menuiserie:    { bar: 'bg-amber-700',   badge: 'bg-amber-100 text-amber-900 border-amber-200',     text: 'text-amber-900'  },
  autres:        { bar: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-700 border-slate-200',     text: 'text-slate-700'  },
};

export const CATEGORY_LABEL: Record<InterventionCategory, string> = {
  electricite:   'Électricité',
  plomberie:     'Plomberie',
  climatisation: 'Climatisation',
  maconnerie:    'Maçonnerie',
  peinture:      'Peinture',
  menuiserie:    'Menuiserie',
  autres:        'Autres',
};

export const CATEGORY_ICON: Record<InterventionCategory, string> = {
  electricite:   '⚡',
  plomberie:     '💧',
  climatisation: '❄️',
  maconnerie:    '🧱',
  peinture:      '🎨',
  menuiserie:    '🪵',
  autres:        '🔧',
};

export const STATUS_LABEL: Record<RequestStatus, string> = {
  soumise:     'Soumise',
  appel_offre: "Appel d'offres",
  planifiee:   'Planifiée',
  en_cours:    'En cours',
  a_valider:   'À valider',
  terminee:    'Terminée',
  annulee:     'Annulée',
};

export const STATUS_COLOR: Record<RequestStatus, string> = {
  soumise:     'bg-slate-100 text-slate-600',
  appel_offre: 'bg-orange-100 text-orange-700',
  planifiee:   'bg-blue-100 text-blue-700',
  en_cours:    'bg-cyan-100 text-cyan-700',
  a_valider:   'bg-teal-100 text-teal-700',
  terminee:    'bg-green-100 text-green-700',
  annulee:     'bg-red-100 text-red-600',
};

export function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days >= 1) return `${days}j`;
  return `${hours}h`;
}

// Demo today
const T = '2026-07-16';
function d(n: number): string {
  const dt = new Date(T);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

export const ACTIVE_STATUSES: RequestStatus[] = [
  'soumise', 'appel_offre', 'planifiee', 'en_cours', 'a_valider',
];

export const HISTORY_STATUSES: RequestStatus[] = ['terminee', 'annulee'];

export const MOCK_INTERVENTIONS: Intervention[] = [
  // ── LAD — Siège Ben Arous ─────────────────────────────────────────────────
  { id: '1',  ref: 'DEM-2026-041', title: 'Panne disjoncteur local technique RDC',      category: 'electricite',   status: 'en_cours',       type: 1, isCritical: true,  site: 'Siège Ben Arous',              entity: 'LAD',  prestataire: 'Mohamed Salah',   createdAt: '2026-07-14T08:00:00', plannedDate: d(0)  },
  { id: '2',  ref: 'DEM-2026-039', title: 'Fuite canalisation bureau direction',          category: 'plomberie',    status: 'planifiee',       type: 2, isCritical: false, site: 'Siège Ben Arous',              entity: 'LAD',  prestataire: 'Karim Bejaoui',   createdAt: '2026-07-13T10:00:00', plannedDate: d(1)  },
  { id: '3',  ref: 'DEM-2026-035', title: 'Climatiseur salle de réunion H4',             category: 'climatisation', status: 'a_valider',    type: 3, isCritical: false, site: 'Siège Ben Arous',              entity: 'LAD',  prestataire: 'Anis Trabelsi',   createdAt: '2026-06-20T09:00:00' },
  { id: '4',  ref: 'DEM-2026-047', title: "Peinture hall d'accueil — rafraîchissement",  category: 'peinture',     status: 'planifiee', type: 3, isCritical: false, site: 'Siège Ben Arous',              entity: 'LAD',                                  createdAt: '2026-07-10T09:00:00' },
  { id: '5',  ref: 'DEM-2026-048', title: 'Réparation porte bureau P3',                  category: 'menuiserie',   status: 'appel_offre',    type: 2, isCritical: false, site: 'Siège Ben Arous',              entity: 'LAD',                                  createdAt: '2026-07-15T11:00:00' },
  { id: '6',  ref: 'DEM-2026-049', title: 'Fissures mur parking niveau -1',              category: 'maconnerie',   status: 'planifiee', type: 2, isCritical: false, site: 'Siège Ben Arous',              entity: 'LAD',                                  createdAt: '2026-07-08T14:00:00' },
  { id: '7',  ref: 'DEM-2026-050', title: 'Alarme température salle serveurs',            category: 'climatisation', status: 'en_cours',      type: 1, isCritical: true,  site: 'Siège Ben Arous',              entity: 'LAD',  prestataire: 'Anis Trabelsi',   createdAt: '2026-07-16T06:00:00', plannedDate: d(0)  },
  { id: '8',  ref: 'DEM-2026-051', title: 'Groupe électrogène GE-02 — contrôle annuel', category: 'electricite',  status: 'planifiee',       type: 3, isCritical: false, site: 'Site Mégrine (LAD)',            entity: 'LAD',  prestataire: 'Mohamed Salah',   createdAt: '2026-07-12T09:00:00', plannedDate: d(3)  },
  { id: '9',  ref: 'DEM-2026-057', title: 'Armoire TGBT — révision générale',            category: 'electricite',  status: 'planifiee',       type: 3, isCritical: false, site: 'Siège Ben Arous',              entity: 'LAD',  prestataire: 'Mohamed Salah',   createdAt: '2026-07-10T08:00:00', plannedDate: d(10) },
  { id: '10', ref: 'DEM-2026-033', title: 'Câblage réseau open space 3ème étage',        category: 'electricite',  status: 'terminee',        type: 3, isCritical: false, site: 'Siège Ben Arous',              entity: 'LAD',  prestataire: 'Mohamed Salah',   createdAt: '2026-06-10T08:00:00' },
  { id: '11', ref: 'DEM-2026-028', title: 'Remplacement robinetterie toilettes bloc A',  category: 'plomberie',    status: 'terminee',        type: 2, isCritical: false, site: 'Siège Ben Arous',              entity: 'LAD',  prestataire: 'Karim Bejaoui',   createdAt: '2026-05-20T08:00:00' },
  { id: '12', ref: 'DEM-2026-023', title: 'Peinture bureaux direction — 2ème étage',    category: 'peinture',     status: 'terminee',        type: 3, isCritical: false, site: 'Siège Ben Arous',              entity: 'LAD',                                  createdAt: '2026-04-15T08:00:00' },
  // ── FAD — Pôle Industriel Jbel Oust ──────────────────────────────────────
  { id: '13', ref: 'DEM-2026-044', title: 'Remplacement pompe hydraulique P-12',         category: 'plomberie',    status: 'planifiee', type: 3, isCritical: false, site: 'Pôle Industriel Jbel Oust',    entity: 'FAD',  prestataire: 'Hichem Trabelsi', createdAt: '2026-07-01T14:00:00' },
  { id: '14', ref: 'DEM-2026-042', title: 'Câblage armoire AT-04',                       category: 'electricite',  status: 'a_valider',    type: 3, isCritical: false, site: 'Pôle Industriel Jbel Oust',    entity: 'FAD',  prestataire: 'Mohamed Salah',   createdAt: '2026-07-05T08:00:00' },
  { id: '15', ref: 'DEM-2026-040', title: 'Remplacement variateur V-08',                 category: 'electricite',  status: 'planifiee', type: 2, isCritical: false, site: 'Pôle Industriel Jbel Oust',    entity: 'FAD',  prestataire: 'Mohamed Salah',   createdAt: '2026-07-09T10:00:00' },
  { id: '16', ref: 'DEM-2026-043', title: 'Vérification tableau BT atelier',             category: 'electricite',  status: 'planifiee',       type: 2, isCritical: false, site: 'Pôle Industriel Jbel Oust',    entity: 'FAD',  prestataire: 'Mohamed Salah',   createdAt: '2026-07-11T08:00:00', plannedDate: d(2)  },
  { id: '17', ref: 'DEM-2026-045', title: 'Maintenance préventive compresseur C-01',     category: 'autres',       status: 'planifiee', type: 3, isCritical: false, site: 'Pôle Industriel Jbel Oust',    entity: 'FAD',                                  createdAt: '2026-07-03T08:00:00' },
  { id: '18', ref: 'DEM-2026-046', title: 'Panne climatisation atelier production',      category: 'climatisation', status: 'en_cours',      type: 1, isCritical: true,  site: 'Atelier Technique Grombalia',  entity: 'FAD',  prestataire: 'Anis Trabelsi',   createdAt: '2026-07-15T14:00:00', plannedDate: d(0)  },
  { id: '19', ref: 'DEM-2026-056', title: 'Surpresseur eau bâtiment B',                  category: 'plomberie',    status: 'planifiee',       type: 2, isCritical: false, site: 'Pôle Industriel Jbel Oust',    entity: 'FAD',  prestataire: 'Hichem Trabelsi', createdAt: '2026-07-11T08:00:00', plannedDate: d(8)  },
  { id: '20', ref: 'DEM-2026-036', title: 'Tableau TGS-B2 — révision annuelle',          category: 'electricite',  status: 'terminee',        type: 3, isCritical: false, site: 'Pôle Industriel Jbel Oust',    entity: 'FAD',  prestataire: 'Mohamed Salah',   createdAt: '2026-06-01T08:00:00' },
  // ── BTFI ─────────────────────────────────────────────────────────────────
  { id: '21', ref: 'DEM-2026-038', title: 'TGBT — mise en conformité électrique',        category: 'electricite',  status: 'planifiee', type: 3, isCritical: false, site: 'Sénia Beni Khaled',            entity: 'BTFI', prestataire: 'Sami Ghorbel',    createdAt: '2026-06-25T08:00:00' },
  { id: '22', ref: 'DEM-2026-037', title: 'Réseau eau froide — réparation fuites',       category: 'plomberie',    status: 'planifiee',       type: 2, isCritical: false, site: 'Sénia Beni Khaled',            entity: 'BTFI', prestataire: 'Karim Bejaoui',   createdAt: '2026-07-10T08:00:00', plannedDate: d(5)  },
  { id: '23', ref: 'DEM-2026-034', title: 'Fissures dalle industrielle — zone C',        category: 'maconnerie',   status: 'planifiee', type: 3, isCritical: false, site: 'Sénia Beni Khaled',            entity: 'BTFI',                                 createdAt: '2026-07-07T08:00:00' },
  // ── 3Ps ──────────────────────────────────────────────────────────────────
  { id: '24', ref: 'DEM-2026-052', title: 'Rénovation peinture façade bureaux',          category: 'peinture',     status: 'planifiee',       type: 3, isCritical: false, site: 'Megrine',                      entity: '3Ps',                                  createdAt: '2026-07-08T08:00:00', plannedDate: d(6)  },
  { id: '25', ref: 'DEM-2026-029', title: 'Électricité — tableau général production',    category: 'electricite',  status: 'terminee',        type: 2, isCritical: false, site: 'Megrine',                      entity: '3Ps',  prestataire: 'Sami Ghorbel',    createdAt: '2026-05-10T08:00:00' },
  // ── K&Ko ─────────────────────────────────────────────────────────────────
  { id: '26', ref: 'DEM-2026-053', title: 'Remplacement éclairage LED bâtiment A',       category: 'electricite',  status: 'en_cours',       type: 2, isCritical: false, site: 'Carthage',                     entity: 'K&Ko', prestataire: 'Sami Ghorbel',    createdAt: '2026-07-14T08:00:00', plannedDate: d(0)  },
  { id: '27', ref: 'DEM-2026-054', title: 'Fenêtres double vitrage — direction',         category: 'menuiserie',   status: 'appel_offre',    type: 3, isCritical: false, site: 'Carthage',                     entity: 'K&Ko',                                 createdAt: '2026-07-15T10:00:00' },
  { id: '28', ref: 'DEM-2026-055', title: "Maçonnerie — réfection parking extérieur",   category: 'maconnerie',   status: 'soumise',        type: 3, isCritical: false, site: 'Carthage',                     entity: 'K&Ko',                                 createdAt: '2026-07-16T09:00:00' },
  // ── Privée ───────────────────────────────────────────────────────────────
  { id: '29', ref: 'DEM-2026-058', title: 'Réparation climatisation bureau direction',  category: 'climatisation', status: 'en_cours',       type: 2, isCritical: false, site: 'Siège Privée Ariana',          entity: 'Privée', prestataire: 'Anis Trabelsi',  createdAt: '2026-07-15T09:00:00', plannedDate: d(0) },
  { id: '30', ref: 'DEM-2026-059', title: 'Plomberie salle de bain VIP',                category: 'plomberie',    status: 'planifiee', type: 1, isCritical: false, site: 'Siège Privée Ariana',          entity: 'Privée',                               createdAt: '2026-07-16T10:00:00' },
  { id: '31', ref: 'DEM-2026-060', title: 'Éclairage extérieur — remplacement LED',     category: 'electricite',  status: 'soumise',        type: 2, isCritical: false, site: 'Siège Privée Ariana',          entity: 'Privée',                               createdAt: '2026-07-17T08:00:00' },
  { id: '32', ref: 'DEM-2026-032', title: 'Réfection sol bureaux RDC',                  category: 'maconnerie',   status: 'terminee',        type: 3, isCritical: false, site: 'Siège Privée Ariana',          entity: 'Privée', prestataire: 'Sami Ghorbel',   createdAt: '2026-06-15T08:00:00' },
];
