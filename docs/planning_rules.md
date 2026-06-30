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

### Règle 3 — Compatibilité compétence (simplifiée)
Une demande n'est assignée qu'à un technicien possédant le `skill_id` requis (`technician_skills`). **Aucun niveau minimal n'est exigé** : la présence du technicien dans le système avec ce skill suffit — s'il est enregistré avec cette compétence, on considère qu'il est habilité. *(Décision actée : simplifie le moteur, évite une granularité inutile en exploitation réelle.)*

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

## 3. Décisions actées

| Question | Décision |
|---|---|
| Réessai des demandes non assignées | **Oui** — chaque run hebdomadaire reprend automatiquement les demandes encore `ready_to_plan` issues de runs précédents (pas seulement les nouvelles), avec leur `priority_score` recalculé (l'ancienneté augmente le score, donc elles remontent naturellement) |
| Niveau de compétence minimal | **Supprimé** — présence du skill dans `technician_skills` suffit, pas de granularité de niveau exigée pour l'assignation |
| Déplacement d'une mission déjà planifiée pour une urgence sécurité | **Oui** — voir moteur de replanification ci-dessous |

---

## 4. Moteur de replanification d'urgence

Quand une demande `safety_risk` ou `production_stop` est approuvée et qu'aucun créneau libre n'existe, le système peut déplacer une mission déjà planifiée non urgente. Cette décision n'est jamais arbitraire : elle est **chiffrée et journalisée**.

### 4.1 Fonction de coût

Pour chaque solution candidate, le moteur calcule :

```
Coût = (nombre d'interventions déplacées × 10)
     + (heures supplémentaires générées × 8)
     + (temps de déplacement supplémentaire en heures × 2)
     + (retard généré sur SLA × 20)
     + (impact production estimé × 30)
```

Le planning retenu est celui dont le **coût total est minimal**. Chaque composante est enregistrée dans `mission_replanning_events.cost_breakdown` (traçabilité complète — le chef d'usine peut auditer pourquoi telle mission a été déplacée plutôt qu'une autre).

### 4.2 Ordre de priorité des stratégies testées

Le moteur teste les stratégies dans cet ordre, et retient la première qui donne un coût acceptable (ou la moins coûteuse si plusieurs sont testées en parallèle) :

1. **Utiliser un créneau libre** — aucun déplacement, coût quasi nul
2. **Échanger avec une intervention de priorité inférieure** du même technicien le même jour
3. **Déplacer uniquement la mission concernée** (la plus proche en priorité de l'urgence)
4. **Décaler plusieurs missions** si cela réduit le coût global par rapport à un déplacement isolé mal positionné
5. **Autoriser des heures supplémentaires** pour absorber l'urgence sans rien déplacer
6. **Dernier recours : reporter une intervention à la semaine suivante**

Cette approche reproduit la logique des logiciels APS (Advanced Planning & Scheduling) : elle limite les perturbations, respecte les priorités déjà établies, et évite une règle fixe de décalage systématique qui dégraderait inutilement le planning.

### 4.3 Notification obligatoire en cas de déplacement

Toute mission déplacée déclenche une notification immédiate (canal `app`, niveau `escalation` pour traçabilité) à **trois destinataires** :
- le **demandeur** de la demande déplacée (son intervention est retardée)
- le **responsable direction de l'entité juridique** de la demande déplacée (visibilité sur l'impact)
- l'**électricien** concerné (son planning change)

La notification précise : ancien créneau, nouveau créneau, raison du déplacement (urgence sécurité X), et lien vers `mission_replanning_events` pour le détail du calcul de coût.

---

## 5. Erreur à éviter

Ne pas laisser le moteur "réessayer indéfiniment en silence" une demande non assignable sans alerte — sans la règle 8 + 9, le système peut sembler fonctionner alors qu'il accumule un arriéré invisible. La traçabilité (`planning_runs`) existe précisément pour empêcher ça.
