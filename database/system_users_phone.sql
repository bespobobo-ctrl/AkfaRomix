-- ═══════════════════════════════════════════════════════════
--  AKFA Romix — Sotuvchi profili uchun telefon raqami
--  Supabase SQL Editor'ga kiritib "Run" bosing.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE system_users ADD COLUMN IF NOT EXISTS phone TEXT;
