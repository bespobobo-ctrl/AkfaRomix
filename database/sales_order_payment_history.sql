-- ═══════════════════════════════════════════════════════════
--  AKFA Romix — Sotuv: har bir to'lovning tarixi (kim/qachon/qancha)
--  Supabase SQL Editor'ga kiritib "Run" bosing.
--  Bularsiz to'lov tarixi faqat oxirgi umumiy summa (paid_amount)
--  sifatida saqlanadi, alohida-alohida to'lovlar ko'rinmaydi.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS payment_history JSONB DEFAULT '[]'::jsonb;
