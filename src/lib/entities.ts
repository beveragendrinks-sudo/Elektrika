export const GROUP_NAME = 'Groupe Elkateb';

export interface SiteDef {
  id: string;       // identifiant unique du site physique
  label: string;    // nom court du site (ex: "Pôle Industriel", "Siège")
  city: string;     // ville / localisation
}

export interface EntityDef {
  code: string;
  name: string;           // nom complet de l'entité (société)
  sites: SiteDef[];       // sites physiques de l'entité (1 ou plusieurs)
}

export const ENTITY_LIST: EntityDef[] = [
  { code: 'LAD', name: 'LAD', sites: [
    { id: 'lad-siege',  label: 'Siège',              city: 'Ben Arous'  },
    { id: 'lad-prod',   label: 'Unité de Production', city: 'La Manouba' },
  ]},
  { code: 'FAD', name: 'FAD Industrie', sites: [
    { id: 'fad-pole',   label: 'Pôle Industriel',     city: 'Jbel Oust'  },
    { id: 'fad-depot',  label: 'Dépôt Logistique',    city: 'Ben Arous'  },
  ]},
  { code: 'BTFI', name: 'BTFI', sites: [
    { id: 'btfi-senia',   label: 'Sénia',             city: 'Beni Khaled' },
    { id: 'btfi-atelier', label: 'Atelier Technique', city: 'Grombalia'   },
  ]},
  { code: '3Ps', name: '3Ps', sites: [
    { id: '3ps-megrine', label: 'Site Principal', city: 'Megrine' },
    { id: '3ps-rades',   label: 'Antenne Radès',  city: 'Radès'   },
  ]},
  { code: 'K&Ko', name: 'K & Ko', sites: [
    { id: 'kko-carthage', label: 'Site Carthage',     city: 'Carthage' },
    { id: 'kko-lamarsa',  label: 'Showroom La Marsa', city: 'La Marsa' },
  ]},
];

export function getEntity(code: string): EntityDef | undefined {
  return ENTITY_LIST.find(e => e.code === code);
}

/** Affichage court (site principal) : "FAD Industrie — Pôle Industriel, Jbel Oust (+1)" */
export function entityLabel(code: string): string {
  const e = getEntity(code);
  if (!e) return code;
  const s = e.sites[0];
  const extra = e.sites.length > 1 ? ` (+${e.sites.length - 1})` : '';
  return `${e.name} — ${s.label}, ${s.city}${extra}`;
}

/** Résumé de tous les sites d'une entité : "Siège Ben Arous · Unité de Production La Manouba" */
export function entitySitesLabel(code: string): string {
  const e = getEntity(code);
  if (!e) return '';
  return e.sites.map(s => `${s.label}, ${s.city}`).join(' · ');
}

/** Tous les sites de toutes les entités (aplati) avec contexte entité */
export function getAllSites(): (SiteDef & { entityCode: string; entityName: string })[] {
  return ENTITY_LIST.flatMap(e =>
    e.sites.map(s => ({ ...s, entityCode: e.code, entityName: e.name }))
  );
}

export function getSite(id: string): (SiteDef & { entityCode: string; entityName: string }) | undefined {
  return getAllSites().find(s => s.id === id);
}
