-- ═══════════════════════════════════════════════════════════
--  AKFA Romix — Tashqi qarz to'lovlari tarixi (har bir to'lov alohida)
--  Supabase SQL Editor'ga kiritib "Run" bosing.
--  romix_debts.paid_amount jamlanma bo'lib qoladi; bu jadval esa
--  har bir to'lov voqeasini (kimga, qachon, qancha, izoh) saqlaydi.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS romix_payment_log (
    id TEXT PRIMARY KEY,
    debt_id TEXT,
    creditor TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    note TEXT,
    date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE romix_payment_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_paymentlog ON romix_payment_log;
CREATE POLICY anon_all_paymentlog ON romix_payment_log FOR ALL USING (true) WITH CHECK (true);
