-- ═══════════════════════════════════════════════════════════
--  AKFA Romix — Buyurtma avansi kim tomonidan qabul qilingani
--  Supabase SQL Editor'ga kiritib "Run" bosing.
--  (paid_amount va payment_date ustunlari romix_finance.sql orqali
--  allaqachon qo'shilgan bo'lishi kerak — shularni qayta ishlatamiz)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS advance_received_by TEXT;
