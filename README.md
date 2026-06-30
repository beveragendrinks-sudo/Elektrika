# Elektrika — Plateforme de Maintenance Électrique Industrielle Multi-Sites

Système de gestion des demandes de réparation électrique pour un groupe industriel
multi-entités (LAD, FAD, BTFI, 3Ps, K&Ko), avec planification automatique,
bons de commande, KPI temps réel et assistance IA.

## Structure du dépôt

```
database/   Migrations SQL (Postgres / Supabase) — schéma, triggers, RLS, vues
types/      Types TypeScript correspondant au schéma
lib/        Logique métier (workflow, IA, calculs)
ui/         Composants React réutilisables
docs/       Spécifications, règles de gestion, matrice RACI
```

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `database/001_init.sql` | Schéma complet : sites, demandes, missions, achats, notifications, RLS multi-site |
| `types/types.ts` | Types TypeScript synchronisés avec le schéma SQL |
| `lib/workflowEngine.ts` | State machine du workflow (10 statuts), garde-fous d'approbation par entité |
| `lib/aiAssist.ts` | Intégration Claude API (analyse photos, structuration de rapports) |
| `ui/RequestTimeline.tsx` | Composant de visualisation chronologique d'une demande |
| `docs/spec-plateforme-maintenance-multisites.md` | Spécification technique complète (architecture, KPI, offline) |
| `docs/planning_rules.md` | Règles de gestion du moteur de planification automatique |
| `docs/verification_workflow_RACI.md` | Vérification du workflow + matrice de responsabilité par rôle |

## Modèle de rôles

- **admin** — gère les utilisateurs, les entités juridiques du groupe, la liste des sites, les fournisseurs
- **direction** — valide les demandes sécurité/arrêt pour la ou les entité(s) juridique(s) dont il est responsable
- **site_manager** (chef d'usine) — approuve les bons de commande et annulations de son site
- **technician** (électricien) — clarification, préparation, exécution
- *(planification automatique par le système — voir `docs/planning_rules.md`)*

## Stack technique cible

Next.js 14 · Supabase (Postgres + RLS) · Tailwind CSS · Claude API (Anthropic)

## Statut

🚧 En développement — Lot 1 (schéma + workflow) terminé. Lot 2 (moteur KPI) à venir.
