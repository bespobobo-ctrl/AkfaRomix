-- ═══════════════════════════════════════════════════════════
--  AKFA Romix — Buxgalter (moliya) jadvallari
--  Supabase SQL Editor'ga kiritib "Run" bosing.
--  Bularsiz harajat/to'lov faqat brauzer localStorage'da qoladi
--  (qurilmalararo va Telegram bot uchun sinxron bo'lmaydi).
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS romix_production_log (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    model_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS romix_expenses (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS romix_debts (
    id TEXT PRIMARY KEY,
    creditor TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    due_date TEXT,
    note TEXT,
    date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Sotuv buyurtmalarida to'lov holatini kuzatish uchun
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;

-- Telegram bot holati (ruxsat berilgan chatlar, tasdiq kutayotgan amallar, suhbat tarixi)
CREATE TABLE IF NOT EXISTS romix_bot_state (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: anon rol o'qish/yozishi uchun (loyiha allaqachon anon kalitni ishlatadi)
ALTER TABLE romix_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE romix_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE romix_production_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE romix_bot_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_expenses ON romix_expenses;
DROP POLICY IF EXISTS anon_all_debts ON romix_debts;
DROP POLICY IF EXISTS anon_all_prodlog ON romix_production_log;
DROP POLICY IF EXISTS anon_all_botstate ON romix_bot_state;
CREATE POLICY anon_all_expenses ON romix_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY anon_all_debts ON romix_debts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY anon_all_prodlog ON romix_production_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY anon_all_botstate ON romix_bot_state FOR ALL USING (true) WITH CHECK (true);
