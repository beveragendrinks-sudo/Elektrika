-- ============================================================
-- LOT 3 — Sites d'intervention, localisation, bons de livraison
-- ============================================================

-- ===== SITES D'INTERVENTION (localisation physique de la panne) =====
-- Distinct de "sites" (entité organisationnelle) : ici c'est l'adresse physique
-- où l'électricien doit se rendre. Géré par l'admin via les Settings.
CREATE TABLE intervention_sites (
  intervention_site_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label VARCHAR(100) NOT NULL,
  active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO intervention_sites (label, sort_order) VALUES
  ('Siège Ben Arous',            1),
  ('Pôle Industriel Jbel Oust',  2),
  ('Sénia Beni Khaled',          3),
  ('Megrine',                    4),
  ('Carthage',                   5),
  ('Autre',                      6);

-- RLS : lecture pour tous, écriture admin
ALTER TABLE intervention_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY intervention_sites_select ON intervention_sites FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY intervention_sites_write ON intervention_sites FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role = 'admin')
);

-- ===== AJOUT CHAMPS À maintenance_requests =====
ALTER TABLE maintenance_requests
  ADD COLUMN intervention_site_id UUID REFERENCES intervention_sites(intervention_site_id),
  ADD COLUMN location_comment TEXT;
-- intervention_site_id : site physique choisi dans la liste (obligatoire en pratique, NOT NULL après migration)
-- location_comment     : description précise de la localisation ("Atelier B, tableau côté nord")

-- ===== BONS DE LIVRAISON (liés à un bon de commande) =====
-- Un BC peut avoir plusieurs livraisons partielles.
-- Le montant réel du BC = somme des BLs reçus (ou saisi manuellement sur le BC).
CREATE TABLE bons_de_livraison (
  bl_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
  bl_number VARCHAR(60),        -- numéro du BL fournisseur (ex: BL-ELKAT-2026-0041)
  received_at DATE NOT NULL,    -- date de réception physique
  amount NUMERIC(12,2) NOT NULL, -- montant de cette livraison (TND)
  notes TEXT,
  created_by UUID REFERENCES user_profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bl_po ON bons_de_livraison(po_id);

-- Mise à jour automatique de actual_amount sur le BC à chaque nouveau BL
CREATE OR REPLACE FUNCTION update_po_actual_amount()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE purchase_orders
    SET actual_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM bons_de_livraison
      WHERE po_id = NEW.po_id
    )
  WHERE po_id = NEW.po_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_po_actual_amount
AFTER INSERT OR UPDATE OR DELETE ON bons_de_livraison
FOR EACH ROW EXECUTE FUNCTION update_po_actual_amount();

-- RLS bons_de_livraison (même politique que purchase_orders)
ALTER TABLE bons_de_livraison ENABLE ROW LEVEL SECURITY;

CREATE POLICY bl_select ON bons_de_livraison
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    JOIN maintenance_requests r ON r.request_id = po.request_id
    JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE po.po_id = bons_de_livraison.po_id
      AND (up.site_id = r.site_id OR up.role IN ('direction','admin'))
  )
);

CREATE POLICY bl_insert ON bons_de_livraison
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    JOIN maintenance_requests r ON r.request_id = po.request_id
    JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE po.po_id = bons_de_livraison.po_id
      AND up.site_id = r.site_id
      AND up.role IN ('site_manager','planner','technician')
  )
);
