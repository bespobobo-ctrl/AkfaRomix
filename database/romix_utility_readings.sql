-- ═══════════════════════════════════════════════════════════
--  AKFA Romix — Kommunal (Svet/Suv/Gaz) oy boshi/oxiri ko'rsatkichlari
--  Supabase SQL Editor'ga kiritib "Run" bosing.
--  Har oy uchun (kategoriya, oy) bo'yicha bitta yozuv: avval oy
--  boshi ko'rsatkichi kiritiladi, keyin (oy oxirida) oy oxiri
--  ko'rsatkichi va (Svet uchun) AvtoClapak sarfi qo'shiladi —
--  shunda tegishli romix_expenses yozuvi avtomatik yaratiladi.
-- ═══════════════════════════════════════════════════════════

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

ALTER TABLE romix_utility_readings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_utilityreadings ON romix_utility_readings;
CREATE POLICY anon_all_utilityreadings ON romix_utility_readings FOR ALL USING (true) WITH CHECK (true);
