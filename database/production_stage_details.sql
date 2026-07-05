-- ═══════════════════════════════════════════════════════════
--  AKFA Romix — Ishlab chiqarish bosqichlari tafsiloti + tarixi
--  Supabase SQL Editor'ga kiritib "Run" bosing.
-- ═══════════════════════════════════════════════════════════

-- Har bir bosqich yakunlanganda: kim ishlagan, qancha material/chiqindi,
-- nechta joy payvandlangan, nechta yig'uvchi/qadoqlovchi ishlagani va h.k.
-- shu yerga append qilinadi (buyurtma bo'yicha to'liq tarix jurnali).
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS production_history JSONB DEFAULT '[]'::jsonb;
