import type { InterventionCategory } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApprovedVendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'prestataire' | 'fournisseur';
  categories: InterventionCategory[];
  active: boolean;
}

export type QuoteStatus = 'sent' | 'received' | 'selected' | 'rejected';

export interface QuoteRequest {
  id: string;
  interventionId: string;
  interventionRef: string;
  bcId?: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  sentAt: string;
  receivedAt?: string;
  amount?: number;
  currency: 'TND';
  fileUrl?: string;
  fileSource?: 'email' | 'upload' | 'camera';
  status: QuoteStatus;
  notes?: string;
}

export interface VendorKPI {
  vendor: ApprovedVendor;
  demandesEnvoyees: number;
  devisRecus: number;
  devisGagnes: number;
  devisRejetes: number;
  tauxReponse: number;
  tauxVictoire: number;
  delaiMoyenReponseH: number | null;
  montantMoyenDevis: number | null;
  montantTotalGagne: number;
}

// ── Prestataires & fournisseurs agréés (définis par le DG) ───────────────────

export const MOCK_APPROVED_VENDORS: ApprovedVendor[] = [
  // ── Prestataires (main-d'œuvre / services) ───────────────────────────────
  { id: 'vp-1',  name: 'Elkateb Électricité',      email: 'contact@elkateb-elec.tn',    phone: '+216 71 234 567', type: 'prestataire', categories: ['electricite'],                      active: true  },
  { id: 'vp-2',  name: 'Tunisie Électrique SARL',  email: 'vente@tunisie-elec.tn',      phone: '+216 70 123 456', type: 'prestataire', categories: ['electricite', 'climatisation'],     active: true  },
  { id: 'vp-3',  name: 'STEG Ingénierie',          email: 'ingenierie@steg.com.tn',     phone: '+216 71 345 678', type: 'prestataire', categories: ['electricite'],                      active: true  },
  { id: 'vp-4',  name: 'Techno Hydraulique',       email: 'contact@techno-hyd.tn',      phone: '+216 73 456 789', type: 'prestataire', categories: ['plomberie'],                        active: true  },
  { id: 'vp-5',  name: 'Sarl Plomberie Pro',       email: 'plomberie.pro@gmail.com',    phone: '+216 71 567 890', type: 'prestataire', categories: ['plomberie'],                        active: true  },
  { id: 'vp-6',  name: 'Climatech Services',       email: 'info@climatech.tn',          phone: '+216 71 678 901', type: 'prestataire', categories: ['climatisation'],                    active: true  },
  { id: 'vp-7',  name: 'Froid Express Tunis',      email: 'contact@froid-express.tn',   phone: '+216 72 789 012', type: 'prestataire', categories: ['climatisation'],                    active: true  },
  { id: 'vp-8',  name: 'Entreprise Ghazi BTP',     email: 'ghazi.btp@gmail.com',        phone: '+216 71 890 123', type: 'prestataire', categories: ['maconnerie', 'peinture'],           active: true  },
  { id: 'vp-9',  name: 'Bâtiment Plus SARL',       email: 'contact@batiment-plus.tn',   phone: '+216 71 901 234', type: 'prestataire', categories: ['maconnerie'],                       active: true  },
  { id: 'vp-10', name: 'Peinture Moderne Tunis',   email: 'moderne.peinture@gmail.com', phone: '+216 71 012 345', type: 'prestataire', categories: ['peinture'],                         active: true  },
  { id: 'vp-11', name: 'Menuiserie Artisanale',    email: 'contact@menuiserie-a.tn',    phone: '+216 72 123 456', type: 'prestataire', categories: ['menuiserie'],                       active: true  },
  { id: 'vp-12', name: 'Bois & Design Tunis',      email: 'info@bois-design.tn',        phone: '+216 73 234 567', type: 'prestataire', categories: ['menuiserie'],                       active: true  },
  { id: 'vp-13', name: 'Multi Services Maghreb',   email: 'ms.maghreb@gmail.com',       phone: '+216 71 111 222', type: 'prestataire', categories: ['autres'],                           active: true  },
  // ── Fournisseurs (matériaux / pièces) ─────────────────────────────────────
  { id: 'vf-1',  name: 'Maghreb Electric',         email: 'info@maghreb-electric.tn',   phone: '+216 70 456 789', type: 'fournisseur', categories: ['electricite'],                      active: true  },
  { id: 'vf-2',  name: 'SONELEC Tunisie',          email: 'contact@sonelec.tn',         phone: '+216 71 456 789', type: 'fournisseur', categories: ['electricite', 'climatisation'],     active: true  },
  { id: 'vf-3',  name: 'Robinetterie Tunisie',     email: 'vente@robin-tn.com',         phone: '+216 71 567 890', type: 'fournisseur', categories: ['plomberie'],                        active: true  },
  { id: 'vf-4',  name: 'Sanitaire Plus SARL',      email: 'contact@sanitaire-plus.tn',  phone: '+216 72 678 901', type: 'fournisseur', categories: ['plomberie'],                        active: true  },
  { id: 'vf-5',  name: 'Climatec Fournitures',     email: 'fournitures@climatec.tn',    phone: '+216 71 789 012', type: 'fournisseur', categories: ['climatisation'],                    active: true  },
  { id: 'vf-6',  name: 'Ciments du Nord',          email: 'vente@ciments-nord.tn',      phone: '+216 71 890 123', type: 'fournisseur', categories: ['maconnerie'],                       active: true  },
  { id: 'vf-7',  name: 'Matériaux BTP Tunis',      email: 'contact@mat-btp.tn',         phone: '+216 71 901 234', type: 'fournisseur', categories: ['maconnerie', 'peinture'],           active: true  },
  { id: 'vf-8',  name: 'Leroy Merlin Pro TN',      email: 'pro@leroymerlin.tn',         phone: '+216 71 012 345', type: 'fournisseur', categories: ['peinture', 'menuiserie', 'electricite'], active: true },
  { id: 'vf-9',  name: 'Quincaillerie Central',    email: 'vente@quinc-central.tn',     phone: '+216 71 333 444', type: 'fournisseur', categories: ['menuiserie', 'autres'],             active: false },
];

// ── Demandes de devis (mock) ──────────────────────────────────────────────────
// interventionId correspond à l'id dans MOCK_INTERVENTIONS
// interventionId '5' = DEM-2026-048 (Porte bureau P3, menuiserie) — appel_offre
// interventionId '4' = DEM-2026-047 (Peinture hall, peinture) — en_preparation (devis reçus)
// interventionId '13' = DEM-2026-044 (Pompe hydraulique, plomberie) — en_preparation (sélectionné)

export const MOCK_QUOTE_REQUESTS: QuoteRequest[] = [
  // ── Intervention 5 : DEM-2026-048 — Réparation porte bureau P3 (menuiserie) — statut: appel_offre
  {
    id: 'q-01', interventionId: '5', interventionRef: 'DEM-2026-048',
    vendorId: 'vp-11', vendorName: 'Menuiserie Artisanale', vendorEmail: 'contact@menuiserie-a.tn',
    sentAt: '2026-07-15T13:00:00', currency: 'TND', status: 'sent',
  },
  {
    id: 'q-02', interventionId: '5', interventionRef: 'DEM-2026-048',
    vendorId: 'vp-12', vendorName: 'Bois & Design Tunis', vendorEmail: 'info@bois-design.tn',
    sentAt: '2026-07-15T13:00:00', receivedAt: '2026-07-16T09:30:00',
    amount: 1850, currency: 'TND', fileSource: 'email', status: 'received',
  },

  // ── Intervention 27 : DEM-2026-054 — Fenêtres double vitrage (menuiserie) — statut: appel_offre
  {
    id: 'q-03', interventionId: '27', interventionRef: 'DEM-2026-054',
    vendorId: 'vp-11', vendorName: 'Menuiserie Artisanale', vendorEmail: 'contact@menuiserie-a.tn',
    sentAt: '2026-07-15T14:00:00', currency: 'TND', status: 'sent',
  },
  {
    id: 'q-04', interventionId: '27', interventionRef: 'DEM-2026-054',
    vendorId: 'vp-12', vendorName: 'Bois & Design Tunis', vendorEmail: 'info@bois-design.tn',
    sentAt: '2026-07-15T14:00:00', currency: 'TND', status: 'sent',
  },

  // ── Intervention 4 : DEM-2026-047 — Peinture hall (peinture) — statut: en_preparation (≥2 devis reçus)
  {
    id: 'q-05', interventionId: '4', interventionRef: 'DEM-2026-047',
    vendorId: 'vp-8', vendorName: 'Entreprise Ghazi BTP', vendorEmail: 'ghazi.btp@gmail.com',
    sentAt: '2026-07-10T10:00:00', receivedAt: '2026-07-11T14:00:00',
    amount: 2800, currency: 'TND', fileSource: 'email', status: 'selected',
    notes: 'Devis le plus compétitif, référence vérifiée',
  },
  {
    id: 'q-06', interventionId: '4', interventionRef: 'DEM-2026-047',
    vendorId: 'vp-10', vendorName: 'Peinture Moderne Tunis', vendorEmail: 'moderne.peinture@gmail.com',
    sentAt: '2026-07-10T10:00:00', receivedAt: '2026-07-12T09:00:00',
    amount: 3200, currency: 'TND', fileSource: 'upload', status: 'rejected',
  },

  // ── Intervention 13 : DEM-2026-044 — Pompe hydraulique (plomberie) — sélectionné
  {
    id: 'q-07', interventionId: '13', interventionRef: 'DEM-2026-044',
    vendorId: 'vp-4', vendorName: 'Techno Hydraulique', vendorEmail: 'contact@techno-hyd.tn',
    sentAt: '2026-07-01T16:00:00', receivedAt: '2026-07-03T10:00:00',
    amount: 4500, currency: 'TND', fileSource: 'email', status: 'selected',
  },
  {
    id: 'q-08', interventionId: '13', interventionRef: 'DEM-2026-044',
    vendorId: 'vp-5', vendorName: 'Sarl Plomberie Pro', vendorEmail: 'plomberie.pro@gmail.com',
    sentAt: '2026-07-01T16:00:00', receivedAt: '2026-07-04T11:00:00',
    amount: 5200, currency: 'TND', fileSource: 'camera', status: 'rejected',
  },

  // ── Devis fournisseurs / matières premières ─────────────────────────────────

  // bc-1 : LAD électricité — Panne disjoncteur local technique (interventionId 'd1')
  {
    id: 'qf-01', interventionId: 'd1', interventionRef: 'DEM-2026-041', bcId: 'bc-1',
    vendorId: 'vf-1', vendorName: 'Maghreb Electric', vendorEmail: 'info@maghreb-electric.tn',
    sentAt: '2026-07-12T10:00:00Z', receivedAt: '2026-07-14T09:00:00Z',
    amount: 742.500, currency: 'TND', fileSource: 'email', status: 'selected',
    notes: 'Variateur ABB + câble + connecteurs — devis retenu',
  },
  {
    id: 'qf-02', interventionId: 'd1', interventionRef: 'DEM-2026-041', bcId: 'bc-1',
    vendorId: 'vf-2', vendorName: 'SONELEC Tunisie', vendorEmail: 'contact@sonelec.tn',
    sentAt: '2026-07-12T10:00:00Z', currency: 'TND', status: 'sent',
  },

  // bc-3 : FAD plomberie — Pompe hydraulique P-12 (interventionId 'd7')
  {
    id: 'qf-03', interventionId: 'd7', interventionRef: 'DEM-2026-044', bcId: 'bc-3',
    vendorId: 'vf-3', vendorName: 'Robinetterie Tunisie', vendorEmail: 'vente@robin-tn.com',
    sentAt: '2026-06-30T08:00:00Z', receivedAt: '2026-07-02T10:00:00Z',
    amount: 1380.000, currency: 'TND', fileSource: 'email', status: 'selected',
    notes: 'Pompe 18cc/tr + joints + huile HM46',
  },
  {
    id: 'qf-04', interventionId: 'd7', interventionRef: 'DEM-2026-044', bcId: 'bc-3',
    vendorId: 'vf-4', vendorName: 'Sanitaire Plus SARL', vendorEmail: 'contact@sanitaire-plus.tn',
    sentAt: '2026-06-30T08:00:00Z', receivedAt: '2026-07-03T14:00:00Z',
    amount: 1620.000, currency: 'TND', fileSource: 'upload', status: 'rejected',
  },

  // bc-6 : LAD peinture — Couloir administratif bâtiment A (interventionId '12')
  {
    id: 'qf-05', interventionId: '12', interventionRef: 'DEM-2026-029', bcId: 'bc-6',
    vendorId: 'vf-7', vendorName: 'Matériaux BTP Tunis', vendorEmail: 'contact@mat-btp.tn',
    sentAt: '2026-07-08T09:00:00Z', receivedAt: '2026-07-10T11:00:00Z',
    amount: 414.000, currency: 'TND', fileSource: 'email', status: 'selected',
    notes: 'Enduit + peinture lessivable + papier de verre',
  },
  {
    id: 'qf-06', interventionId: '12', interventionRef: 'DEM-2026-029', bcId: 'bc-6',
    vendorId: 'vf-8', vendorName: 'Leroy Merlin Pro TN', vendorEmail: 'pro@leroymerlin.tn',
    sentAt: '2026-07-08T09:00:00Z', currency: 'TND', status: 'sent',
  },

  // ── Intervention 6 : DEM-2026-049 — Fissures mur parking (maçonnerie)
  {
    id: 'q-09', interventionId: '6', interventionRef: 'DEM-2026-049',
    vendorId: 'vp-8', vendorName: 'Entreprise Ghazi BTP', vendorEmail: 'ghazi.btp@gmail.com',
    sentAt: '2026-07-08T09:00:00', receivedAt: '2026-07-09T11:00:00',
    amount: 6200, currency: 'TND', fileSource: 'email', status: 'selected',
  },
  {
    id: 'q-10', interventionId: '6', interventionRef: 'DEM-2026-049',
    vendorId: 'vp-9', vendorName: 'Bâtiment Plus SARL', vendorEmail: 'contact@batiment-plus.tn',
    sentAt: '2026-07-08T09:00:00', receivedAt: '2026-07-10T14:00:00',
    amount: 7800, currency: 'TND', fileSource: 'upload', status: 'rejected',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getVendorsForCategory(
  category: InterventionCategory,
  type: 'prestataire' | 'fournisseur',
): ApprovedVendor[] {
  return MOCK_APPROVED_VENDORS.filter(v => v.type === type && v.active && v.categories.includes(category));
}

export function getQuotesForIntervention(interventionId: string): QuoteRequest[] {
  return MOCK_QUOTE_REQUESTS.filter(q => q.interventionId === interventionId && !q.bcId);
}

export function getQuotesForBCs(bcIds: string[]): QuoteRequest[] {
  return MOCK_QUOTE_REQUESTS.filter(q => q.bcId && bcIds.includes(q.bcId));
}

export function countReceivedQuotes(interventionId: string): number {
  return MOCK_QUOTE_REQUESTS.filter(
    q => q.interventionId === interventionId && (q.status === 'received' || q.status === 'selected' || q.status === 'rejected'),
  ).length;
}

export function computeVendorKPI(vendorId: string): VendorKPI {
  const vendor = MOCK_APPROVED_VENDORS.find(v => v.id === vendorId)!;
  const quotes = MOCK_QUOTE_REQUESTS.filter(q => q.vendorId === vendorId);
  const received = quotes.filter(q => q.status !== 'sent');
  const won      = quotes.filter(q => q.status === 'selected');
  const rejected = quotes.filter(q => q.status === 'rejected');

  const delays = received
    .filter(q => q.receivedAt)
    .map(q => (new Date(q.receivedAt!).getTime() - new Date(q.sentAt).getTime()) / 3_600_000);

  const amounts = received.filter(q => q.amount).map(q => q.amount!);

  return {
    vendor,
    demandesEnvoyees:   quotes.length,
    devisRecus:         received.length,
    devisGagnes:        won.length,
    devisRejetes:       rejected.length,
    tauxReponse:        quotes.length  > 0 ? Math.round((received.length / quotes.length)  * 100) : 0,
    tauxVictoire:       received.length > 0 ? Math.round((won.length     / received.length) * 100) : 0,
    delaiMoyenReponseH: delays.length  > 0 ? Math.round(delays.reduce((a, b) => a + b) / delays.length) : null,
    montantMoyenDevis:  amounts.length > 0 ? Math.round(amounts.reduce((a, b) => a + b) / amounts.length) : null,
    montantTotalGagne:  won.filter(q => q.amount).reduce((acc, q) => acc + (q.amount ?? 0), 0),
  };
}

export function computeAllVendorKPIs(): VendorKPI[] {
  return MOCK_APPROVED_VENDORS
    .filter(v => v.active)
    .map(v => computeVendorKPI(v.id))
    .sort((a, b) => b.demandesEnvoyees - a.demandesEnvoyees);
}
