# Vérification Workflow & Alertes — Matrice de Responsabilité (RACI)
## Module Réparation Électrique — Multi-Sites

---

## 0. Mise à jour du modèle de rôles (gouvernance entités juridiques)

| Changement | Détail |
|---|---|
| Nouveau rôle `admin` | Gère les utilisateurs (création de comptes, rôles, association site) et les référentiels du groupe (entités juridiques, fournisseurs) — auparavant porté à tort par `direction` |
| Chaque demande liée à une entité juridique | `maintenance_requests.issuing_entity_id` obligatoire dès la création (LAD, FAD, BTFI, 3Ps, K&Ko...), géré uniquement par `admin` |
| `direction` devient un rôle multi-instance scopé | Plusieurs utilisateurs peuvent porter le rôle `direction`. Chacun est responsable d'une ou plusieurs entités juridiques via la table `direction_entity_assignments` |
| Validation = responsabilité par entité, pas globale | Un utilisateur `direction` ne peut approuver (`management_approved = true`) que les demandes dont `issuing_entity_id` figure dans ses entités assignées — vérifié en base par trigger, pas seulement côté app |
| Lecture transverse conservée | `direction` et `admin` gardent une visibilité multi-site complète (transparence), seule l'**approbation** est restreinte par entité |

**Exemple concret** : si M. X (direction) est assigné à `LAD` et `FAD`, il peut approuver toute demande sécurité/arrêt émise par LAD ou FAD, sur n'importe quel site. Il voit aussi les demandes des autres entités (BTFI, 3Ps, K&Ko) mais ne peut pas les approuver — le bouton "Approuver" doit être grisé côté UI pour ces demandes-là (logique déjà disponible via `canApproveRequest()`).

---

## 0bis. Mise à jour — planificateur système, sites gérés par admin, direction multi-entités

| Changement | Détail |
|---|---|
| `planner` n'est plus une personne qui planifie | Le moteur automatique (`planning_runs`) exécute la planification chaque semaine selon les règles définies dans `planning_rules.md`. Le rôle `planner` humain ne fait que des **ajustements manuels exceptionnels** |
| Liste des sites gérée par `admin` | Bug RLS corrigé : la table `sites` n'avait aucune policy (blocage total). Désormais lecture pour tous, écriture admin uniquement — symétrique au modèle des entités juridiques |
| `direction` peut gérer plusieurs entités | Déjà natif via `direction_entity_assignments` (many-to-many) — aucun changement de schéma nécessaire, juste confirmé |
| `direction` sans entité assignée = configuration incomplète détectée | Vue `v_direction_missing_entity` + trigger `alert_direction_missing_entity` : notifie automatiquement tous les `admin` dès qu'un utilisateur devient `direction` sans assignation |

---

## 1. Vérification du workflow (10 statuts)

| # | Statut | Transitions sortantes valides | Garde-fou actif | Vérifié |
|---|---|---|---|---|
| 1 | `draft` | → `pending_management_validation`, `clarification`, `cancelled` | Aucun (libre) | ✅ |
| 2 | `pending_management_validation` | → `clarification`, `cancelled` | Sortie bloquée sans `management_approved = true` (sauf annulation) | ✅ |
| 3 | `clarification` | → `preparation`, `ready_to_plan`, `cancelled` | Aucun — l'électricien choisit selon besoin matériel ou non | ✅ |
| 4 | `preparation` | → `ready_to_plan`, `cancelled` | BC uniquement créable ici (trigger dédié) | ✅ |
| 5 | `ready_to_plan` | → `planned`, `cancelled` | Aucun | ✅ |
| 6 | `planned` | → `in_progress`, `cancelled` | Aucun | ✅ |
| 7 | `in_progress` | → `completed_pending_confirmation`, `cancelled` | Aucun | ✅ |
| 8 | `cancelled` | Terminal | Motif obligatoire (`pending_status_reason`) pour y entrer | ✅ |
| 9 | `completed_pending_confirmation` | → `accepted` | Pas d'annulation possible ici (cf. décision actée) | ✅ |
| 10 | `accepted` | Terminal | Si refus → nouvelle fiche liée (`parent_request_id`), jamais réouverture | ✅ |

**Cas particulier vérifié — refus du demandeur (statut 11 du besoin métier) :**
Le refus ne réutilise jamais la fiche n°9. Il génère une fiche liée via `buildSecondInterventionPayload()`, avec :
- `rejection_reason` (catégorisé : pièce incorrecte / panne réapparue / travail incomplet / autre) écrit sur la fiche **d'origine**
- nouvelle fiche en statut `clarification`, liée par `parent_request_id`

→ Le KPI "taux de 2ème intervention" reste fiable, et l'historique de durée par statut de la fiche d'origine n'est pas pollué.

**Incohérence corrigée pendant cette vérification :** aucune fiche n'avait de champ `requested_by` — impossible de savoir qui a soumis la demande initiale ni qui doit confirmer en statut 9. Ajouté (`requested_by`, `assigned_technician_id`).

---

## 2. Vérification des alertes (table `workflow_status_rules`)

| Statut | Alerte bas niveau | Escalade direction | Logique vérifiée |
|---|---|---|---|
| `draft` | 24h | 72h | ✅ Une demande non soumise ne doit pas traîner indéfiniment |
| `pending_management_validation` | 4h | 12h | ✅ Cohérent avec criticité sécurité/arrêt — seuils courts intentionnels |
| `clarification` | 24h | 48h | ✅ Couvre le délai d'appel + photos WhatsApp |
| `preparation` | 48h | 120h (5j) | ✅ Couvre délai fournisseur réaliste |
| `ready_to_plan` | 24h | 72h | ✅ Ne doit pas stagner avant planification |
| `planned` | 24h | 48h | ✅ Mission planifiée doit démarrer rapidement |
| `in_progress` | 8h | 24h | ✅ Seuils courts — une intervention en cours doit se clôturer dans la journée |
| `completed_pending_confirmation` | 48h | 120h (5j) | ✅ Laisse le temps au demandeur de tester avant validation |
| `cancelled` / `accepted` | — | — | ✅ Statuts terminaux, pas d'alerte (logique) |

**Vérification du mécanisme technique :**
- La vue `v_request_status_alerts` calcule `is_delayed` / `needs_escalation` en temps réel à partir de `request_status_history` (ligne ouverte, `exited_at IS NULL`) — ✅ cohérent, aucune dépendance à un job pour le calcul lui-même.
- La **notification poussée** (table `notifications`) dépend d'un job périodique (15-30 min) — c'est la seule partie non garantie en temps réel strict ; acceptable pour ce cas d'usage (pas de système d'astreinte seconde près).

**Point résolu depuis l'introduction de la responsabilité par entité :** l'escalade direction (`pending_management_validation` > 12h) est désormais notifiée uniquement aux utilisateurs `direction` assignés à l'entité juridique émettrice de la demande (table `direction_entity_assignments`), plus `admin` en filet de sécurité. Fini le bruit générique "toute la direction reçoit tout".

---

## 3. Matrice de Responsabilité (RACI)

**Légende** : R = Responsable (exécute) · A = Approbateur (rend compte, décision finale) · C = Consulté · I = Informé

| Activité / Statut | Demandeur | Électricien | Chef d'usine (site_manager) | Planificateur | Direction *(son entité)* | Admin |
|---|---|---|---|---|---|---|
| Création de la demande (`draft`) — choix de l'entité juridique obligatoire | **R** | I | I | — | — | — |
| Validation sécurité/arrêt (`pending_management_validation`) | I | I | C | — | **R/A** *(si assigné à l'entité)* | **A** *(toujours habilité)* |
| Clarification (appel, photos) (`clarification`) | C | **R/A** | I | — | I (si escalade) | — |
| Génération du bon de commande (`preparation`) | — | **R** | **A** | I | I (montants élevés) | — |
| Réception facture / coût réel | — | C | **A** | — | I | — |
| Planification de la mission (`ready_to_plan` → `planned`) | I | C | C | **R/A** *(système, ajustements exceptionnels par un humain)* | — | — |
| Exécution de l'intervention (`in_progress`) | I | **R** | I | I | — | — |
| Clôture travaux (`completed_pending_confirmation`) | C | **R** | I | — | — | — |
| Confirmation finale (`accepted`) | **R/A** | I | I | — | — | — |
| Refus / 2ème intervention | **R/A** | I | C | — | I | — |
| Annulation (à tout statut, motif obligatoire) | C | **R** (si terrain) | **A** | C | I | I |
| Création/édition des utilisateurs et rôles | — | — | — | — | — | **R/A** |
| Création/édition des entités juridiques du groupe | — | — | — | — | C | **R/A** |
| Création/édition de la liste des sites du groupe | — | — | C | — | — | **R/A** |
| Assignation direction ↔ entité juridique | — | — | — | — | I | **R/A** |
| Paramétrage des seuils d'alerte | — | — | C | — | **R/A** | — |
| Paramétrage fournisseurs | — | — | C | — | — | **R/A** |
| Consultation KPI / dashboards | I | I | **R** (son site) | I | **A** (vue globale) | **A** (vue globale) |
| Réception des alertes bas niveau | **R** | **R** | I | — | — | — |
| Réception des alertes d'escalade | I | I | I | — | **R/A** *(son entité)* | I |

### Lecture rapide pour vous (chef d'usine / site_manager)

Votre rôle est concentré sur 4 points : **approbation des bons de commande**, **réception des factures réelles**, **consultation quotidienne des KPI de votre site**, et **approbation des annulations**. Vous êtes consulté (pas décisionnaire) sur la planification — le planificateur reste responsable de l'optimisation des missions, mais vous gardez la visibilité complète via le dashboard et la timeline.

### Lecture rapide pour un utilisateur direction

Vous voyez l'ensemble des sites et entités (transparence totale), mais vous ne pouvez **approuver** (statut sécurité/arrêt) que les demandes des entités juridiques pour lesquelles l'admin vous a explicitement assigné la responsabilité. Si une demande sécurité émise par une entité qui n'est pas la vôtre arrive, vous la voyez mais ne pouvez pas l'approuver — seul un responsable de cette entité (ou l'admin) le peut.

---

## 4. Erreurs à éviter (issues de cette vérification)

- Ne pas laisser un BC en `draft` sans suite — ajouter une alerte similaire sur `purchase_orders.status` si le volume devient significatif (non fait à ce stade, à reconsidérer en Lot 3).
- Ne pas oublier de peupler `requested_by` à la création de chaque demande dans l'écran de saisie — sans cela, la confirmation finale (statut 9→10) ne peut identifier qui a le droit de valider.
- Ne pas notifier individuellement à chaque vérification du job — dédupliquer par statut+niveau (déjà prévu dans le commentaire de conception de la table `notifications`, à implémenter strictement au Lot Notifications).

## 5. Indicateurs de suivi recommandés (chef d'usine)

| Indicateur | Fréquence de consultation |
|---|---|
| Nombre de demandes en alerte (`is_delayed = true`) | Quotidien |
| Nombre de demandes en escalade (`needs_escalation = true`) | Quotidien, premier réflexe du matin |
| Taux de 2ème intervention (refus) | Hebdomadaire |
| Écart budget estimé vs réel sur BC | Hebdomadaire |
| Durée moyenne par statut (surtout `clarification` et `preparation`) | Mensuel, pour identifier les goulots |

## 6. Autres propositions d'amélioration

| Proposition | Pourquoi | Effort |
|---|---|---|
| **Rejouer automatiquement les demandes non assignées** la semaine suivante (au lieu d'attendre une intervention manuelle) | Évite l'arriéré invisible identifié dans `planning_rules.md` (règle 8) | Faible — logique déjà dans `planning_runs`, juste à activer dans le job |
| **Capacité technicien variable par jour** (congé, formation, mi-temps) au lieu d'une capacité fixe `max_daily_capacity_points` | Le moteur planifierait sur une capacité réelle, pas théorique — sinon le système peut sur-planifier un technicien absent | Moyen — table `technician_availability(technician_id, date, capacity_override)` |
| **Historique de fiabilité fournisseur** (délai moyen de livraison réel par fournisseur) | Avec l'historique des BC, on pourrait alerter si un fournisseur dérive (retards récurrents) | Moyen — calcul KPI sur `purchase_orders.sent_at` vs `received` |
| **Double validation pour les BC au-dessus d'un montant seuil** | Cohérent avec vos budgets tiers (Low/Mid/High) — actuellement aucun seuil ne déclenche une validation supplémentaire sur le bon de commande lui-même | Faible — trigger similaire à `enforce_management_approval`, seuil paramétrable par entité |
| **Export PDF du bon de commande** prêt à envoyer au fournisseur | Le BC existe en base mais rien ne génère le document physique à transmettre (ex. à "Elkateb Electricité") | Moyen — utilise le skill PDF déjà disponible |
| **Tableau de bord "configuration incomplète"** pour l'admin | Au-delà de `v_direction_missing_entity` : entités sans aucun responsable direction, sites sans technicien actif, skills sans fournisseur préféré | Faible — vue SQL agrégée + écran dédié |

Je recommande de traiter en priorité la **double validation par seuil de montant** (cohérent avec vos budgets déjà définis) et la **réassignation automatique des demandes non planifiées** — ce sont les deux trous qui produisent le plus de friction silencieuse en exploitation réelle. Le reste peut attendre un lot ultérieur.
