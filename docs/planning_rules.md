# Règles de Gestion — Moteur de Planification Automatique
## Le "planificateur" est un système, pas une personne

---

## 1. Principe général

Il n'existe plus de rôle utilisateur "planificateur". La planification est exécutée par un **job automatique** :

| Déclenchement | Quand |
|---|---|
| **Hebdomadaire** (`scheduled_weekly`) | Chaque lundi 5h (paramétrable, `planning_engine_config.run_schedule`), par site |
| **Urgence** (`emergency`) | Immédiatement après l'approbation d'une demande `safety_risk` ou `production_stop` en `pending_management_validation` |

Chaque exécution est journalisée dans `planning_runs` : nombre de demandes considérées, missions créées, demandes non assignées (avec raison), succès/échec. **Aucune décision du système n'est invisible** — le chef d'usine peut auditer chaque run.

Le rôle `planner` reste disponible dans le système (cf. RACI) pour les **ajustements manuels exceptionnels** (ex. technicien absent de dernière minute) — mais ne planifie plus depuis zéro.

---

## 2. Règles de gestion appliquées par le moteur

### Règle 1 — Périmètre d'entrée
Le moteur ne considère que les demandes au statut `ready_to_plan`, groupées **par site** (jamais de mélange entre sites, cf. règle multi-site déjà actée).

### Règle 2 — Tri par priorité
Les demandes sont triées par `priority_score` décroissant (formule déjà définie : 35% sécurité/urgence, 25% SLA, 20% criticité équipement, 10% pannes répétées, 10% ancienneté).

### Règle 3 — Compatibilité compétence
Une demande n'est assignée qu'à un technicien possédant le `skill_id` requis (`technician_skills`), avec un niveau suffisant si vous voulez ajouter cette granularité plus tard (actuellement non discriminant, juste présence du skill).

### Règle 4 — Capacité journalière (points)
Chaque technicien a une capacité maximale de points par jour (`max_daily_capacity_points`). Le moteur ne dépasse jamais cette capacité sur une même journée. Une demande de 5 points (Type 3) ne peut être ajoutée à une mission si la capacité restante est inférieure à 5.

### Règle 5 — Groupage géographique (minimisation des trajets)
Pour un même technicien et une même journée, les demandes sont regroupées par zone (`zones.travel_time_matrix`) selon un algorithme du plus proche voisin : à chaque étape, on choisit la demande dont le coût marginal (temps d'intervention + temps de trajet depuis la dernière position) est le plus faible.

### Règle 6 — Équilibrage de charge entre techniciens
À demandes équivalentes en priorité et compétence, le moteur répartit vers le technicien ayant le moins de points déjà affectés ce jour-là (minimise `Workforce Balance Index`).

### Règle 7 — Demandes sécurité/arrêt = priorité absolue
Une demande `safety_risk` ou `production_stop` approuvée passe en tête de file, **hors cycle hebdomadaire** : elle déclenche un run `emergency` qui ne replanifie que cette demande (et réorganise la journée du technicien concerné si nécessaire), sans attendre le lundi suivant.

### Règle 8 — Demandes non assignables
Si aucun technicien compatible n'a de capacité disponible sur la semaine, la demande reste `ready_to_plan` et apparaît dans `planning_runs.unassigned_reason` avec un motif explicite (ex. `"no_technician_with_skill"`, `"capacity_exhausted"`). **Le système ne force jamais une affectation impossible.** Le chef d'usine est notifié (alerte bas niveau sur le statut `ready_to_plan` si la demande dépasse son seuil).

### Règle 9 — Plafond de volume
Si le nombre de demandes `ready_to_plan` sur un site dépasse `max_requests_per_run_per_site` (200 par défaut), une alerte est envoyée à l'admin : au-delà de ce volume, l'algorithme glouton actuel montre ses limites et un solveur dédié (OR-Tools) devient nécessaire — anticipé dans la spec initiale.

### Règle 10 — Traçabilité de la décision
Chaque mission créée porte `planning_run_id`, qui pointe vers l'exécution exacte qui l'a générée, avec horodatage et paramètres utilisés (`scoring_weights` au moment du run, conservés implicitement via le score déjà calculé sur chaque demande).

---

## 3. Ce qui reste à trancher avec vous

| Question | Pourquoi elle compte |
|---|---|
| Le run hebdomadaire doit-il aussi re-essayer les demandes en `unassigned_reason` des semaines précédentes ? | Sinon une demande non assignée une fois risque de rester bloquée indéfiniment |
| Faut-il un niveau de compétence minimal (`technician_skills.level`) discriminant, ou la simple présence du skill suffit ? | Impacte la règle 3 — actuellement non exploité |
| Le run `emergency` doit-il pouvoir **déplacer** une intervention déjà planifiée (non urgente) pour faire de la place à une urgence sécurité ? | Sinon une urgence peut rester bloquée si tous les techniciens sont déjà pleins ce jour-là |

---

## 4. Erreur à éviter

Ne pas laisser le moteur "réessayer indéfiniment en silence" une demande non assignable sans alerte — sans la règle 8 + 9, le système peut sembler fonctionner alors qu'il accumule un arriéré invisible. La traçabilité (`planning_runs`) existe précisément pour empêcher ça.
