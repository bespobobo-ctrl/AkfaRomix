-- 7 ta jadval (romix_accessories, romix_accessories_history, romix_qoldiq_profillar,
-- romix_oynak, romix_payment_log, romix_utility_readings, profile_requests) Postgres'ning
-- o'zida "relation does not exist" xatosi bilan tasdiqlandi — ular haqiqatan bazada yo'q.
-- Bu skript ularni ASL strukturasi bilan (loyihaning database/*.sql fayllaridagi original
-- CREATE TABLE'lar asosida) qayta yaratadi. IF NOT EXISTS ishlatilgani uchun xavfsiz —
-- agar biror jadval sirli tarzda hali ham mavjud bo'lsa, unga tegilmaydi.

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

CREATE TABLE IF NOT EXISTS romix_payment_log (
    id TEXT PRIMARY KEY,
    debt_id TEXT,
    creditor TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    note TEXT,
    date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS romix_utility_readings (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    month_key TEXT NOT NULL,
    meter_start NUMERIC,
    meter_end NUMERIC,
    avto_sarfi NUMERIC,
    expense_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- profile_requests uchun repo'da SQL fayl topilmadi (Dashboard orqali yaratilgan bo'lishi
-- kerak edi) — src/projects/romix/hr/hr_mini_final.js:715 va hr.js:1472 dagi
-- insert/select chaqiruvlaridan (employee_id, requested_data, status) ustunlar tiklandi.
CREATE TABLE IF NOT EXISTS profile_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id TEXT NOT NULL,
    requested_data JSONB,
    status TEXT DEFAULT 'pending',
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

ALTER TABLE romix_payment_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_paymentlog ON romix_payment_log;
CREATE POLICY anon_all_paymentlog ON romix_payment_log FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE romix_utility_readings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_utilityreadings ON romix_utility_readings;
CREATE POLICY anon_all_utilityreadings ON romix_utility_readings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE profile_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_profile_requests ON profile_requests;
CREATE POLICY anon_all_profile_requests ON profile_requests FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE
    romix_accessories, romix_accessories_history, romix_qoldiq_profillar, romix_oynak,
    romix_payment_log, romix_utility_readings, profile_requests
TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
