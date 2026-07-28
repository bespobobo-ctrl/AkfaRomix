-- ═══════════════════════════════════════════════════════════
--  AKFA Romix — AI so'rovlar logi + login/logout/online kuzatuvi
--  Supabase SQL Editor'ga kiritib "Run" bosing.
--  Bularsiz: (1) xodimlar AI yordamchidan nima so'rayotgani hech qayerda
--  saqlanmaydi, (2) kim tizimga qachon kirgani/chiqqani va hozir onlaynmi —
--  degan ma'lumot umuman yo'q (login/logout hozircha faqat brauzer
--  localStorage'ida, serverga hech narsa yozilmaydi).
-- ═══════════════════════════════════════════════════════════

-- Har qanday bo'lim AI vidjeti (hozircha faqat Ombor) so'ragan savol + javobni
-- shu yerga yozadi. Kelajakda boshqa bo'limlarga AI qo'shilsa, 'source' orqali
-- shu bitta jadvalga yozishda davom etaveradi.
CREATE TABLE IF NOT EXISTS ai_query_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    user_id TEXT,
    user_name TEXT,
    user_role TEXT,
    question TEXT NOT NULL,
    answer TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Har bir login — alohida qator (tarix sifatida, bitta xodim uchun bitta
-- yoziladigan qator emas) — rahbar "kim qachon kirgan/chiqqan" tarixini ko'ra olishi uchun.
-- user_id TEXT, chunki ko'p loginlar UUID emas (masalan 'K1', '7007', 'AC1').
-- logout_at NULL = sessiya hali "ochiq" deb hisoblanadi; last_seen har ~60 soniyada
-- brauzerdagi heartbeat orqali yangilanadi — "hozir onlaynmi" shundan hisoblanadi
-- (logout_at IS NULL VA last_seen so'nggi 3 daqiqa ichida), chunki tab yopilib
-- ketishi logout() chaqirilishini kafolatlamaydi.
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_name TEXT,
    user_role TEXT,
    login_at TIMESTAMPTZ DEFAULT now(),
    logout_at TIMESTAMPTZ,
    last_seen TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_login ON user_sessions (user_id, login_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_query_log_created ON ai_query_log (created_at DESC);

-- RLS: anon rol o'qish/yozishi uchun (loyiha allaqachon anon kalitni ishlatadi, boshqa jadvallar bilan bir xil)
ALTER TABLE ai_query_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_ai_query_log ON ai_query_log;
CREATE POLICY anon_all_ai_query_log ON ai_query_log FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_user_sessions ON user_sessions;
CREATE POLICY anon_all_user_sessions ON user_sessions FOR ALL USING (true) WITH CHECK (true);

-- RLS + GRANT ikkalasi ham kerak — avvalgi hodisada (romix_missing_tables_grant_fix.sql)
-- faqat RLS/policy qo'yilgan, lekin GRANT unutilgan jadvallar PostgREST'ga "topilmadi (404)"
-- bo'lib ko'ringan. Shuni takrorlamaslik uchun bu ikkovi ham shu yerda.
GRANT ALL ON TABLE public.ai_query_log, public.user_sessions TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
