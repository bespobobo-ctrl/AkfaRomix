-- ═══════════════════════════════════════════════════════════
--  AKFA Romix — Ombor tasdiqlash oqimi (avtomatik material hisobi)
--  Supabase SQL Editor'ga kiritib "Run" bosing.
-- ═══════════════════════════════════════════════════════════

-- Sotuvda buyurtma olinganda avtomatik hisoblangan profil/aksessuar ehtiyoji
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS material_estimate JSONB DEFAULT '{}'::jsonb;

-- Ombor buyurtmani tasdiqlagani (mahsulot yetarli, ombordan ajratib/minus qilingan)
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS ombor_confirmed_at TIMESTAMPTZ;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS ombor_confirmed_by TEXT;

-- Tasdiqlash paytida haqiqatda ombordan ajratilgan mahsulotlar (profil/aksesuvar/qoldiq/oynak) —
-- material_estimate'dan farqli, bu YAKUNIY ro'yxat (qoldiq/oynak qo'lda qo'shilganlarni ham
-- o'z ichiga oladi) — "Hujjatlar Tarixi"da tasdiqnomani keyinchalik qayta chiqarish uchun kerak.
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS ombor_confirmed_materials JSONB;
