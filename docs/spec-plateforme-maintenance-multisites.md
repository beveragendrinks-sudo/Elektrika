# Plateforme de Gestion de Maintenance Industrielle Multi-Sites
## Spécification Technique Complète — Architecture, Données, IA, KPI, UI, Offline

---

## 0. Hypothèses retenues (à valider avec vous)

| Sujet | Hypothèse |
|---|---|
| Backend / DB | PostgreSQL (compatible Supabase, cohérent avec votre stack TORTITRACK) |
| Mobile offline | React Native ou Flutter + SQLite local, sync différée |
| Web admin | React + Tailwind, style SAP Fiori (tables denses, KPI tiles, chips de statut) |
| Périmètre multi-site | Chaque site = une usine/unité du groupe ; aucune mission ne traverse deux sites |
| Système de points | 1 / 3 / 5 pts selon Type 1/2/3, capacité technicien = points max/jour |
| Déclenchement IA | Planification quotidienne (batch) + recalcul à la demande si urgence/sécurité |

Si une hypothèse ne correspond pas à votre réalité terrain, dites-le-moi et j'ajuste le schéma et la logique en conséquence.

---

## 1. Architecture Système

```
┌─────────────────────────────────────────────────────────────────┐
│ CLOUD CORE (multi-site)                                         │
│  - DB centrale (Postgres/Supabase)                              │
│  - Moteur IA de planification                                   │
│  - Moteur KPI (temps réel + batch)                              │
│  - API Gateway (REST + Auth JWT)                                │
│  - RBAC (Direction / Resp. Site / Planificateur / Technicien)   │
│  - Audit log (toutes actions horodatées + auteur)               │
└───────────────┬───────────────────────────────────────────────-─┘
                │
        ┌───────┴────────┐
        │  EDGE (optionnel, par site) │
        │  - Cache missions du jour    │
        │  - Buffer offline local      │
        │  - File de synchronisation   │
        └───────┬────────┘
                │
┌───────────────┴───────────────────────────────────────────────-─┐
│ APP MOBILE TECHNICIEN (offline-first)                           │
│  - SQLite local (missions, requêtes, équipements)               │
│  - Capture photo / signature offline                            │
│  - Scan QR équipement → historique local                        │
│  - Moteur de sync avec résolution de conflits                   │
└───────────────────────────────────────────────────────────────-─┘
```

**Règle multi-site (non négociable) :**
- Aucune mission ne contient des interventions de deux sites différents.
- L'optimisation (regroupement, équilibrage de charge) se fait **site par site**, jamais en transverse.
- Chaque site a ses propres technicians, zones, capacités, matrice de temps de trajet.

---

## 2. Schéma de Base de Données (multi-site + sync offline)

```sql
-- ===== ORGANISATION =====
CREATE TABLE sites (
  site_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Africa/Tunis',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zones (
  zone_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(site_id),
  name VARCHAR(100),
  travel_time_matrix JSONB  -- {"zone_id_x": minutes, ...}
);

CREATE TABLE equipment (
  equipment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(site_id),
  zone_id UUID REFERENCES zones(zone_id),
  name VARCHAR(150),
  qr_code VARCHAR(100) UNIQUE,
  criticality SMALLINT CHECK (criticality BETWEEN 1 AND 5),
  install_date DATE,
  status VARCHAR(20) DEFAULT 'operational'
);

CREATE TABLE technicians (
  technician_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(site_id),
  name VARCHAR(100),
  max_daily_capacity_points INT DEFAULT 20,
  active BOOLEAN DEFAULT true
);

CREATE TABLE skills (
  skill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100)
);

CREATE TABLE technician_skills (
  technician_id UUID REFERENCES technicians(technician_id),
  skill_id UUID REFERENCES skills(skill_id),
  level SMALLINT CHECK (level BETWEEN 1 AND 5),
  PRIMARY KEY (technician_id, skill_id)
);

-- ===== DEMANDES / WORKFLOW =====
CREATE TABLE maintenance_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(site_id),
  equipment_id UUID REFERENCES equipment(equipment_id),
  type SMALLINT CHECK (type IN (1,2,3)),
  points SMALLINT GENERATED ALWAYS AS (
    CASE type WHEN 1 THEN 1 WHEN 2 THEN 3 WHEN 3 THEN 5 END
  ) STORED,
  status VARCHAR(30) DEFAULT 'draft',
  -- draft, submitted, accepted, waiting_parts, waiting_planning,
  -- planned, in_progress, completed, pending_sync, closed, to_rework, cancelled
  priority_score NUMERIC(5,2),
  safety_risk BOOLEAN DEFAULT false,
  production_stop BOOLEAN DEFAULT false,
  management_approved BOOLEAN,
  estimated_minutes INT,
  required_skill_id UUID REFERENCES skills(skill_id),
  submitted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  planned_mission_id UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  rework BOOLEAN DEFAULT false,
  requester_feedback_score SMALLINT CHECK (requester_feedback_score BETWEEN 1 AND 5),
  created_offline BOOLEAN DEFAULT false,
  client_uuid UUID,              -- généré côté mobile pour dédup
  sync_status VARCHAR(20) DEFAULT 'synced'
);

-- ===== MISSIONS =====
CREATE TABLE missions (
  mission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(site_id),
  technician_id UUID REFERENCES technicians(technician_id),
  mission_date DATE,
  status VARCHAR(20) DEFAULT 'planned',
  total_work_time_min INT,
  total_travel_time_min INT,
  created_by VARCHAR(20) DEFAULT 'ai_engine'
);

CREATE TABLE mission_interventions (
  mission_id UUID REFERENCES missions(mission_id),
  request_id UUID REFERENCES maintenance_requests(request_id),
  sequence_order INT,
  travel_time_from_previous INT,
  PRIMARY KEY (mission_id, request_id)
);

-- ===== OFFLINE SYNC =====
CREATE TABLE sync_queue (
  sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(100),
  entity_type VARCHAR(50),       -- request, attachment, mission_status
  entity_client_uuid UUID,
  payload JSONB,
  client_timestamp TIMESTAMPTZ,
  server_received_at TIMESTAMPTZ,
  sync_status VARCHAR(20) DEFAULT 'pending', -- pending, applied, conflict, rejected
  conflict_resolution VARCHAR(20)
);

CREATE TABLE attachments (
  attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES maintenance_requests(request_id),
  type VARCHAR(20),              -- photo, signature
  file_path TEXT,
  captured_offline BOOLEAN DEFAULT false,
  client_uuid UUID
);

-- ===== KPI =====
CREATE TABLE kpi_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(site_id),
  technician_id UUID,            -- NULL = agrégat site
  period_date DATE,
  period_type VARCHAR(10),       -- daily, weekly, monthly
  metrics JSONB                  -- {"UR":82.4,"SLA48":91.0,"OEI":76.2,...}
);
```

---

## 3. Design API

| Domaine | Méthode | Endpoint | Description |
|---|---|---|---|
| Auth | POST | `/auth/login` | Connexion, retourne JWT + rôle |
| Sites | GET | `/sites` | Liste des sites (selon droits) |
| Équipements | GET | `/sites/{id}/equipment` | Liste équipements + QR codes |
| Équipements | GET | `/equipment/{id}/history` | Historique interventions (offline-friendly) |
| Demandes | POST | `/requests` | Créer une demande (online ou rejouée depuis sync) |
| Demandes | PATCH | `/requests/{id}/status` | Changement de statut (avec règles SLA/sécurité) |
| Demandes | GET | `/sites/{id}/requests?status=` | Liste filtrée |
| Planification | POST | `/planning/run` | Déclenche le moteur IA pour un site/jour donné |
| Planification | GET | `/missions?site_id=&date=` | Missions générées |
| Missions | PATCH | `/missions/{id}` | Ajustement manuel (planificateur) |
| Mobile sync | POST | `/sync/push` | Pousse la file locale (requests, attachments, statuts) |
| Mobile sync | GET | `/sync/pull?since=` | Récupère les mises à jour serveur depuis le dernier sync |
| KPI | GET | `/kpi/site/{id}?period=` | KPI agrégés site |
| KPI | GET | `/kpi/technician/{id}?period=` | KPI individuels technicien |
| KPI | GET | `/kpi/management/overview` | Vue Direction multi-site |
| Audit | GET | `/audit/requests/{id}` | Historique complet d'une demande |

**Règles de sécurité API (RBAC) :**
- Technicien : lecture/écriture limitée à ses missions du jour + son site.
- Responsable site : lecture/écriture sur son site uniquement.
- Direction : lecture multi-site, écriture interdite sur le détail opérationnel.
- Toute demande `safety_risk=true` ou `production_stop=true` bloque le passage à `planned` sans `management_approved=true`.

---

## 4. Moteur de Planification IA

### 4.1 Scoring de priorité (0–100)

```
PriorityScore =
    35% × SafetyUrgencyFactor      (1 si safety_risk ou production_stop, sinon 0)
  + 25% × SLARemainingFactor       (proche de 48h non acceptée → score monte)
  + 20% × EquipmentCriticalityFactor (criticality/5)
  + 10% × RepeatFailureFactor      (interventions répétées sur même équipement)
  + 10% × AgeFactor                (ancienneté de la demande)
```

### 4.2 Algorithme de clustering (par site, par jour)

```
POUR chaque site actif:
  1. Filtrer les demandes status='accepted' du site, trier par PriorityScore desc
  2. POUR chaque technicien disponible (filtré par compétence requise):
       capacité_restante = max_daily_capacity_points
       mission = []
  3. TANT QUE demandes non assignées ET capacité disponible:
       a. Sélectionner la demande prioritaire compatible (compétence + capacité)
       b. Calculer le coût marginal = temps intervention + temps trajet
          depuis la dernière position de la mission en cours
       c. Affecter à la mission du technicien dont le coût marginal est le plus faible
          ET qui respecte la capacité restante (points)
       d. Mettre à jour capacité_restante -= points de la demande
  4. Réordonner chaque mission par proximité géographique (algorithme glouton
     du plus proche voisin sur la matrice zones.travel_time_matrix)
  5. Calculer TWT, TTT par mission → stocker dans missions
```

*Approche : variante simplifiée d'un VRP (Vehicle Routing Problem) à capacité, sans dépendance à un solveur lourd — suffisant pour un volume de quelques dizaines de demandes/jour/site. Si le volume grossit (>200 demandes/jour/site), prévoir un solveur dédié (ex. OR-Tools).*

### 4.3 Déclencheurs
- Planification batch automatique chaque matin (ex. 5h) par site.
- Replanification à la demande si une requête `safety_risk` est approuvée en cours de journée.

---

## 5. Moteur KPI (module critique)

### 5.1 Temps

| KPI | Formule | Fréquence |
|---|---|---|
| Temps de travail total (TWT) | Σ temps d'exécution interventions | Temps réel |
| Temps de trajet total (TTT) | Σ temps de trajet entre interventions | Temps réel |
| Temps total (TT) | TWT + TTT + temps admin | Temps réel |

### 5.2 Productivité

| KPI | Formule |
|---|---|
| Taux d'utilisation (UR) | (TWT / TT) × 100 |
| Ratio trajet (TR) | (TTT / TT) × 100 |
| Surcharge admin (AO) | (temps admin / TT) × 100 |

### 5.3 Productivité par points

| KPI | Formule |
|---|---|
| Points journaliers (DP) | Σ points complétés / technicien / jour |
| Points par heure (PPH) | DP / TWT |
| Utilisation de capacité (CU) | (DP / capacité max journalière) × 100 |

### 5.4 SLA & réactivité

| KPI | Formule |
|---|---|
| Conformité SLA 48h (SLA48) | (demandes acceptées <48h / total) × 100 |
| Temps de réponse moyen (MRT) | moyenne(accepted_at − submitted_at) |
| MTTR | moyenne(closed_at − started_at) |

### 5.5 Qualité

| KPI | Formule |
|---|---|
| Taux de retouche (RR) | (statut "to_rework" / total complété) × 100 |
| First Time Fix Rate (FTFR) | (complété sans retouche / total complété) × 100 |
| Satisfaction demandeur (RSS) | moyenne(requester_feedback_score) |

### 5.6 Optimisation

| KPI | Formule |
|---|---|
| Mission Efficiency Score (MES) | (nb interventions groupées / temps trajet moyen), normalisé |
| Trajet économisé (TS) | trajet baseline − trajet optimisé |
| Efficacité de groupage (GE) | (missions >1 intervention / total missions) × 100 |
| Site Optimization Index (SOI) | mesure de la densité de clustering par zone |

### 5.7 Fiabilité équipement

| KPI | Formule |
|---|---|
| Repeat Failure Rate (RFR) | interventions répétées même équipement / total |
| Equipment Downtime Index (EDI) | downtime total par équipement |
| MTBF | temps moyen entre pannes par équipement |

### 5.8 KPI Direction (vue globale)

| KPI | Formule |
|---|---|
| Overall Efficiency Index (OEI) | 30%×Productivité + 25%×SLA + 25%×Qualité + 20%×Optimisation |
| Cost Proxy Index (CPI) | (temps trajet + temps intervention) / points livrés |
| Workforce Balance Index (WBI) | variance de charge entre techniciens |

### 5.9 Flux de calcul

```
ÉVÉNEMENT (changement de statut, sync reçue)
   → recalcul immédiat : SLA48, MRT, MTTR, RR, FTFR, DP, PPH, CU
   → écriture kpi_snapshots (period_type='daily', upsert)

JOB NOCTURNE (toutes les nuits, par site)
   → agrégation historique : OEI, WBI, MTBF, EDI, MES, SOI
   → snapshots weekly/monthly
   → archivage des KPI techniciens individuels
```

---

## 6. Structure UI (style SAP Fiori)

| Page | Rôle | Composants clés | Plateforme |
|---|---|---|---|
| Dashboard global | Direction | KPI tiles (OEI, SLA48, RR), filtre multi-site, comparatif sites | Web |
| Planificateur de missions | Planificateur/Resp. site | Tableau dense, drag-drop interventions, carte zones, statut chips | Web |
| Gestion des demandes | Resp. site / Planificateur | Filtres avancés (statut/priorité/site), panneau latéral détail | Web |
| Interface technicien | Technicien | Liste missions du jour, bouton offline, scan QR, signature | Mobile |
| Historique équipement | Tous (lecture) | Hiérarchie Site → Zone → Équipement, timeline interventions | Web + Mobile |

**Éléments Fiori obligatoires :** tableaux denses avec tri/filtre par colonne, status chips colorés (brouillon/en attente/en cours/clos), panneaux latéraux de détail sans changement de page, tuiles KPI cliquables en page d'accueil, arborescence Site→Zone→Équipement dans la navigation.

---

## 7. Stratégie de Synchronisation Offline

### 7.1 Principes
- Le mobile fonctionne **100% offline** : création/mise à jour de demandes, photos, signatures, scan QR, tout est écrit en local (SQLite) avec un `client_uuid`.
- À la reconnexion : `POST /sync/push` envoie la file locale ; `GET /sync/pull` récupère les mises à jour serveur depuis le dernier `since`.

### 7.2 Résolution de conflits

| Type de conflit | Règle |
|---|---|
| Données techniciens (statut, heures, photos, signature) | **Toujours préservées** — jamais écrasées par le serveur |
| Planification (mission, affectation) | **Le serveur est autoritaire** si replanifié pendant la déconnexion |
| Statut de demande modifié des deux côtés | Réconciliation par timestamp le plus récent, avec log de conflit pour revue manuelle si ambigu |

### 7.3 Séquence de synchronisation
```
1. Device → POST /sync/push (payload : requests modifiées, attachments, statuts)
2. Serveur : pour chaque item → vérifier client_uuid (dédup) → appliquer ou marquer 'conflict'
3. Serveur → réponse avec sync_status par item
4. Device → GET /sync/pull?since=<dernier_timestamp>
5. Device : merge local (priorité planification serveur, données technicien jamais écrasées)
6. Device : marquer local comme 'synced'
```

---

## 8. Exemple de Génération de Mission

**Contexte : Site "Usine Tortilla", journée du jour, 2 techniciens disponibles**

| Demande | Zone | Type (pts) | Criticité éq. | PriorityScore |
|---|---|---|---|---|
| R1 | Pétrissage | 3 (5pts) | 5 — safety | 92 |
| R2 | Cuisson | 1 (1pt) | 2 | 38 |
| R3 | Pétrissage | 2 (3pts) | 4 | 65 |
| R4 | Emballage | 1 (1pt) | 1 | 22 |
| R5 | Cuisson | 2 (3pts) | 3 | 54 |

- Tech A (capacité 12 pts), Tech B (capacité 10 pts)

**Résultat du moteur :**
- **Mission A (Tech A)** : R1 (5pts, sécurité) → R3 (3pts, même zone Pétrissage) → R5 (3pts, zone proche) = 11 pts, TWT 95 min, TTT 18 min, UR ≈ 84%
- **Mission B (Tech B)** : R2 (1pt) → R4 (1pt) = 2 pts (capacité résiduelle pour demandes additionnelles en cours de journée)

→ Le moteur a priorisé la sécurité (R1), groupé par zone pour minimiser les trajets (R1+R3 même zone), et équilibré la charge entre les deux techniciens.

---

## 9. Définitions des Dashboards KPI

### Dashboard Direction Générale (multi-site)
- Tuile OEI par site (comparatif)
- Tuile SLA48 global
- Tuile RR (taux de retouche) avec alerte si >5%
- Graphique WBI (équilibrage charge) par site

### Dashboard Responsable de Site
- Tuiles UR, TR, DP du jour
- Liste des demandes en attente >48h (alerte SLA)
- MTTR par type d'équipement
- Carte des missions du jour (groupage géographique)

### Dashboard Technicien (mobile)
- Mission du jour (liste ordonnée, statuts)
- Points réalisés / objectif jour (CU)
- Historique équipement scanné

---

## Prochaines étapes proposées

1. **Valider les hypothèses** (section 0) — notamment stack technique et système de points.
2. **Prioriser un lot de build** : je recommande de commencer par (a) schéma DB + workflow statuts, (b) moteur KPI, (c) moteur IA de planification, (d) sync offline, (e) UI — dans cet ordre, car chaque lot dépend du précédent.
3. Si vous voulez, je peux directement générer le **code source** (React/Supabase, cohérent avec TORTITRACK) pour un des lots ci-dessus.
