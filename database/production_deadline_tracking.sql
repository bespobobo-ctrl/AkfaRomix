-- ═══════════════════════════════════════════════════════════
--  AKFA Romix — Buyurtma muddati va ishlab chiqarish nazorati
--  Supabase SQL Editor'ga kiritib "Run" bosing.
--  Bularsiz muddat/nazorat maydonlari faqat brauzer
--  localStorage'da qoladi (qurilmalararo sinxron bo'lmaydi).
-- ═══════════════════════════════════════════════════════════

-- Mijozga va'da qilingan "buyurtma tayyor bo'lish sanasi" (Sotuv kiritadi)
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS production_deadline DATE;

-- Ishlab chiqarish "Qabul Qilish" bosganda o'zi belgilaydigan chiqish/tayyor sanasi
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS production_target_date DATE;

-- Ishlab chiqarish buyurtmani qachon qabul qilgani (avtomatik, "Qabul Qilish" bosilganda)
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS production_accepted_at TIMESTAMPTZ;
