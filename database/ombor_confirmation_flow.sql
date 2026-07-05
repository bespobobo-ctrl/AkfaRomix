-- ═══════════════════════════════════════════════════════════
--  AKFA Romix — Ombor tasdiqlash oqimi (avtomatik material hisobi)
--  Supabase SQL Editor'ga kiritib "Run" bosing.
-- ═══════════════════════════════════════════════════════════

-- Sotuvda buyurtma olinganda avtomatik hisoblangan profil/aksessuar ehtiyoji
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS material_estimate JSONB DEFAULT '{}'::jsonb;

-- Ombor buyurtmani tasdiqlagani (mahsulot yetarli, ombordan ajratib/minus qilingan)
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS ombor_confirmed_at TIMESTAMPTZ;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS ombor_confirmed_by TEXT;
