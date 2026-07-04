-- ═══════════════════════════════════════════════════════════
--  AKFA Romix — Ishlab chiqarish: miqdor-asosli (partial-batch) kuzatuv
--  Supabase SQL Editor'ga kiritib "Run" bosing.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS romix_production_batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
    stage TEXT NOT NULL, -- 'kesish' | 'payvandlash' | 'yigish_qadoqlash' | 'tayyor'
    quantity INTEGER NOT NULL,
    employee_id UUID REFERENCES employees(id),
    started_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);
