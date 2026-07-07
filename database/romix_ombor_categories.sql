-- ═══════════════════════════════════════════════════════════
--  AKFA Romix — Aksesuvar, Qoldiq Profillar, Oynak (Supabase'ga ko'chirish)
--  Supabase SQL Editor'ga kiritib "Run" bosing.
--  Bu uchta bo'lim avval faqat brauzer localStorage'ida saqlanardi
--  (bitta kompyuterda ko'rinar edi) — endi markazlashgan.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS romix_accessories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    qty NUMERIC DEFAULT 0,
    unit TEXT,
    spec TEXT,
    price NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS romix_accessories_history (
    id TEXT PRIMARY KEY,
    timestamp TEXT,
    action TEXT,
    details TEXT,
    operator TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS romix_qoldiq_profillar (
    id TEXT PRIMARY KEY,
    product_name TEXT,
    brand TEXT,
    series TEXT,
    color TEXT,
    profile_type TEXT,
    length NUMERIC DEFAULT 0,
    stock_quantity NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS romix_oynak (
    id TEXT PRIMARY KEY,
    brand TEXT,
    product_name TEXT,
    size TEXT,
    stock_quantity NUMERIC DEFAULT 0,
    unit TEXT,
    price NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE romix_accessories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_accessories ON romix_accessories;
CREATE POLICY anon_all_accessories ON romix_accessories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE romix_accessories_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_accessories_history ON romix_accessories_history;
CREATE POLICY anon_all_accessories_history ON romix_accessories_history FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE romix_qoldiq_profillar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_qoldiq ON romix_qoldiq_profillar;
CREATE POLICY anon_all_qoldiq ON romix_qoldiq_profillar FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE romix_oynak ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_oynak ON romix_oynak;
CREATE POLICY anon_all_oynak ON romix_oynak FOR ALL USING (true) WITH CHECK (true);
