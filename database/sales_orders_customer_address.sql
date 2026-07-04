-- ═══════════════════════════════════════════════════════════
--  AKFA Romix — Sotuv buyurtmalariga mijoz manzili ustuni
--  Supabase SQL Editor'ga kiritib "Run" bosing.
--  Bularsiz manzil faqat brauzer localStorage'da qoladi
--  (qurilmalararo va admin panelда sinxron bo'lmaydi).
-- ═══════════════════════════════════════════════════════════

ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS customer_address TEXT;
