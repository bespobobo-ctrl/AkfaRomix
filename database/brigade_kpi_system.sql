-- ═══════════════════════════════════════════════════════════
--  AKFA Romix — Brigada boshqaruvi, o'rnatish materiallari va KPI tizimi
--  Supabase SQL Editor'ga kiritib "Run" bosing.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS romix_brigades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS romix_brigade_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brigade_id UUID REFERENCES romix_brigades(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS romix_installation_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES romix_inventory(id),
    product_name TEXT,
    qty NUMERIC,
    unit TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS romix_brigade_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
    brigade_id UUID REFERENCES romix_brigades(id),
    quality_score INTEGER,
    timeliness_score INTEGER,
    service_score INTEGER,
    note TEXT,
    rated_at TIMESTAMPTZ DEFAULT now()
);

-- Mavjud 3 ta brigadani boshlang'ich ma'lumot sifatida qo'shish (ixtiyoriy)
INSERT INTO romix_brigades (name)
SELECT v.name FROM (VALUES ('Brigada 1 (Alijon)'), ('Brigada 2 (Sardor)'), ('Tezkor Guruh (Jasur)')) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM romix_brigades WHERE romix_brigades.name = v.name);
