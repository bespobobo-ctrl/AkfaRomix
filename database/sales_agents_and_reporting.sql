-- ═══════════════════════════════════════════════════════════
--  AKFA Romix — Sotuv: ko'p xodimli login + hisobot ustunlari
--  Supabase SQL Editor'ga kiritib "Run" bosing.
--  Bularsiz: (1) admin panelda yaratilgan yangi "sotuv" loginlar
--  faqat o'sha brauzerda ishlaydi (qurilmalararo sinxron bo'lmaydi),
--  (2) buyurtmani kim qabul qilgani va qachon bajarilgani saqlanmaydi.
-- ═══════════════════════════════════════════════════════════

-- Tizim foydalanuvchilari (login/parol) — admin panel "Xavfsizlik: Login va Parol"
-- bo'limida yaratiladigan har bir yangi xodim (masalan, qo'shimcha sotuv menejerlari) shu yerga yoziladi.
CREATE TABLE IF NOT EXISTS system_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Buyurtmani qaysi sotuv xodimi qabul qilgani (bir nechta sotuvchi ishlaganda kim nima sotganini bilish uchun)
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS created_by TEXT;
-- Buyurtma qachon to'liq bajarilgani (status='Tayyor / Yetkazildi' bo'lgan payt) — oylik hisobot uchun
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- RLS: anon rol o'qish/yozishi uchun (loyiha allaqachon anon kalitni ishlatadi)
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_system_users ON system_users;
CREATE POLICY anon_all_system_users ON system_users FOR ALL USING (true) WITH CHECK (true);

-- Hozirgi kodda hardcoded bo'lgan asosiy loginlarni ham shu jadvalga yozamiz — aks holda
-- admin bitta yangi "sotuv" xodim qo'shishi bilan bu jadval Supabase'dan o'qila boshlaydi va
-- eski hardcoded loginlar "Xavfsizlik" ro'yxatidan (faqat ro'yxatdan, ishlashdan emas) yo'qoladi.
INSERT INTO system_users (username, password, full_name, role) VALUES
    ('admin', '123', 'Super Admin', 'admin'),
    ('hr', '123', 'Kadirlar Bo''limi', 'hr'),
    ('ombor', '123', 'Ali', 'manager'),
    ('sotuv', '123', 'Jasur', 'sotuv'),
    ('123', '123', 'botir', 'ishlab_chiqarish'),
    ('buxgalter', '123', 'Buxgalter', 'buxgalter')
ON CONFLICT (username) DO NOTHING;
