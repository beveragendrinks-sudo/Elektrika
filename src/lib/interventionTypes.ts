import type { InterventionCategory, InterventionNature } from '@/types';
import { CATEGORY_ICON } from './interventionData';

export interface InterventionCategoryOption {
  id: InterventionCategory;
  label: string;
  icon: string;
  examples: string;
}

export interface InterventionNatureOption {
  id: InterventionNature;
  label: string;
  description: string;
  points: number;
}

export const INTERVENTION_CATEGORIES: InterventionCategoryOption[] = [
  { id: 'electricite',   label: 'Électricité',            icon: CATEGORY_ICON['electricite'],   examples: 'Éclairage, prises, tableaux électriques, câblage, disjoncteurs, groupes électrogènes, UPS' },
  { id: 'plomberie',     label: 'Plomberie & Sanitaire',  icon: CATEGORY_ICON['plomberie'],     examples: "Fuites, robinets, WC, lavabos, réseaux d'eau potable et d'eaux usées, pompes" },
  { id: 'climatisation', label: 'Climatisation',          icon: CATEGORY_ICON['climatisation'], examples: 'Climatisation, VMC, ventilation, extraction, maintenance des unités, nettoyage des filtres' },
  { id: 'maconnerie',    label: 'Maçonnerie & Génie civil',icon: CATEGORY_ICON['maconnerie'],   examples: 'Réparation de murs, sols, plafonds, fondations, rampes, trottoirs, caniveaux' },
  { id: 'peinture',      label: 'Peinture & Finitions',   icon: CATEGORY_ICON['peinture'],      examples: 'Peinture intérieure/extérieure, marquage au sol, enduits, retouches' },
  { id: 'menuiserie',    label: 'Menuiserie & Serrurerie',icon: CATEGORY_ICON['menuiserie'],    examples: 'Portes, fenêtres, serrures, portails, mobilier fixe, cloisons' },
  { id: 'autres',        label: 'Autres',                 icon: CATEGORY_ICON['autres'],        examples: 'Toiture, voirie, réseaux techniques, sécurité bâtiments, petits travaux, contrats prestataires' },
];

export const INTERVENTION_NATURES: InterventionNatureOption[] = [
  {
    id: 'corrective',
    label: 'Maintenance corrective',
    description: 'Réparation après une panne ou une dégradation constatée',
    points: 2,
  },
  {
    id: 'preventive',
    label: 'Maintenance préventive',
    description: 'Interventions planifiées pour prévenir les pannes',
    points: 1,
  },
  {
    id: 'amelioration',
    label: 'Amélioration continue',
    description: 'Modifications visant à améliorer la sécurité, la fiabilité ou les performances',
    points: 2,
  },
  {
    id: 'travaux_neufs',
    label: 'Travaux neufs',
    description: 'Création ou extension d\'installations',
    points: 3,
  },
  {
    id: 'conformite',
    label: 'Mise en conformité',
    description: 'Travaux pour respecter des exigences réglementaires ou normes internes',
    points: 3,
  },
];

export function getCategoryById(id: string): InterventionCategoryOption | undefined {
  return INTERVENTION_CATEGORIES.find((c) => c.id === id);
}

export function getNatureById(id: string): InterventionNatureOption | undefined {
  return INTERVENTION_NATURES.find((n) => n.id === id);
}

export function pointsForNature(nature: InterventionNature): number {
  return getNatureById(nature)?.points ?? 1;
}
