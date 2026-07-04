export const GROUP_NAME = 'Groupe Elkateb';

// ── Core types ──────────────────────────────────────────────────────────────

export interface EntityDef {
  code: string;
  name: string;
}

/**
 * Site physique du groupe. Un site peut accueillir plusieurs entités ;
 * une entité peut opérer sur plusieurs sites.
 */
export interface SiteDef {
  id: string;
  label: string;       // nom court du site  (ex: "Pôle Industriel")
  city: string;        // ville / localisation (ex: "Jbel Oust")
  entityCodes: string[]; // entités présentes sur ce site
}

// ── Reference data ──────────────────────────────────────────────────────────

export const ENTITY_LIST: EntityDef[] = [
  { code: 'LAD',   name: 'LAD' },
  { code: 'FAD',   name: 'FAD Industrie' },
  { code: 'BTFI',  name: 'BTFI' },
  { code: '3Ps',   name: '3Ps' },
  { code: 'K&Ko',  name: 'K & Ko' },
];

/**
 * Sites physiques du groupe — source de vérité.
 * Chaque site liste les entités qui y opèrent (relation N–N).
 */
export const SITES_LIST: SiteDef[] = [
  { id: 'ben-arous',   label: 'Siège',             city: 'Ben Arous',   entityCodes: ['LAD', 'FAD']  },
  { id: 'la-manouba',  label: 'Unité Production',  city: 'La Manouba',  entityCodes: ['LAD']          },
  { id: 'jbel-oust',   label: 'Pôle Industriel',   city: 'Jbel Oust',   entityCodes: ['FAD']          },
  { id: 'grombalia',   label: 'Atelier Technique', city: 'Grombalia',   entityCodes: ['BTFI', 'FAD']  },
  { id: 'beni-khaled', label: 'Sénia',             city: 'Beni Khaled', entityCodes: ['BTFI']         },
  { id: 'megrine',     label: 'Site Principal',    city: 'Megrine',     entityCodes: ['3Ps']           },
  { id: 'rades',       label: 'Antenne',           city: 'Radès',       entityCodes: ['3Ps', 'K&Ko']  },
  { id: 'carthage',    label: 'Site',              city: 'Carthage',    entityCodes: ['K&Ko']          },
  { id: 'la-marsa',    label: 'Showroom',          city: 'La Marsa',    entityCodes: ['K&Ko']          },
];

// ── Lookups ─────────────────────────────────────────────────────────────────

export function getEntity(code: string): EntityDef | undefined {
  return ENTITY_LIST.find(e => e.code === code);
}

export function getSite(id: string): SiteDef | undefined {
  return SITES_LIST.find(s => s.id === id);
}

/** Sites où une entité est présente */
export function getSitesForEntity(code: string): SiteDef[] {
  return SITES_LIST.filter(s => s.entityCodes.includes(code));
}

/** Entités présentes sur un site */
export function getEntitiesForSite(siteId: string): EntityDef[] {
  const site = getSite(siteId);
  if (!site) return [];
  return ENTITY_LIST.filter(e => site.entityCodes.includes(e.code));
}

/** Tous les sites (alias pour accès direct à la liste) */
export function getAllSites(): SiteDef[] {
  return SITES_LIST;
}

// ── Display helpers ──────────────────────────────────────────────────────────

/** "FAD Industrie — Pôle Industriel, Jbel Oust (+1)" */
export function entityLabel(code: string): string {
  const e = getEntity(code);
  if (!e) return code;
  const sites = getSitesForEntity(code);
  if (!sites.length) return e.name;
  const extra = sites.length > 1 ? ` (+${sites.length - 1})` : '';
  return `${e.name} — ${sites[0].label}, ${sites[0].city}${extra}`;
}

/** "Siège Ben Arous · Unité Production La Manouba" */
export function entitySitesLabel(code: string): string {
  return getSitesForEntity(code).map(s => `${s.label}, ${s.city}`).join(' · ');
}

/** "Siège, Ben Arous" */
export function siteLabel(id: string): string {
  const s = getSite(id);
  return s ? `${s.label}, ${s.city}` : id;
}
