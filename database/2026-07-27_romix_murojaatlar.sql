-- Barcha bo'limlar (Ombor, Sotuv, HR, Ishlab Chiqarish, Buhgalter) uchun umumiy
-- "Murojaatlar va Bildirishnomalar" jadvali.
--
-- SABAB: Ombor paneli (warehouse.js) o'zining murojaatlarini HR'ning xodim-profil
-- o'zgartirish so'rovlari uchun mo'ljallangan `profile_requests` jadvaliga yozib
-- kelgan edi (employee_id sifatida "ombor-user" kabi soxta qiymat bilan). HR paneli
-- (hr.js -> loadProfileRequests) esa BARCHA "pending" profile_requests yozuvlarini
-- `employees(full_name, avatar_url)` bilan JOIN qilib o'qiydi — mos xodim topilmasa
-- `emp.avatar_url` xato (TypeError) beradi va HR "So'rovlar" bo'limi butunlay
-- ishlamay qoladi. Shu jadval shu muammoni bartaraf etadi va barcha bo'limlar uchun
-- to'g'ri, mustaqil struktura beradi.
CREATE TABLE IF NOT EXISTS romix_murojaatlar (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    department TEXT NOT NULL,              -- 'ombor' | 'sotuv' | 'hr' | 'ishlab_chiqarish' | 'buxgalter'
    sender TEXT,
    sender_user_id TEXT,
    type TEXT,
    priority TEXT DEFAULT 'medium',        -- 'high' | 'medium' | 'low'
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',         -- 'pending' | 'in_progress' | 'resolved' | 'rejected'
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE romix_murojaatlar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_romix_murojaatlar ON romix_murojaatlar;
CREATE POLICY anon_all_romix_murojaatlar ON romix_murojaatlar FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE romix_murojaatlar TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
