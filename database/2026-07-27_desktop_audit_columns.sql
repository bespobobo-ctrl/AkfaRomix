-- ═══════════════════════════════════════════════════════════
--  AKFA Romix Desktop AI Assistant — audit ustunlari
--  Supabase SQL Editor'ga kiritib "Run" bosing.
--  Maqsad: desktop ilova orqali kiritilgan harajat/to'lov yozuvlariga
--  QAYSI XODIM yozgani (audit) qayd etilsin. Bularsiz: desktop ilovada
--  kim harajat qo'shgani/to'lov kiritgani hech qayerda saqlanmaydi.
--
--  MUHIM: desktop ilova kodi (akfa-romix-ai) bu ustunlarga faqat
--  .env'da AUDIT_COLUMNS_READY=true qo'lda o'rnatilgandan keyin yoza
--  boshlaydi — shuning uchun bu SQL ishga tushirilmagan bo'lsa ham
--  mavjud funksionallik BUZILMAYDI, faqat yangi audit maydoni bo'sh qoladi.
-- ═══════════════════════════════════════════════════════════

-- Harajat (romix_expenses) — qaysi xodim qo'shgani
ALTER TABLE romix_expenses ADD COLUMN IF NOT EXISTS added_by TEXT;

-- Tashqi qarz to'lovi (romix_debts) — qaysi xodim to'lov kiritgani
ALTER TABLE romix_debts ADD COLUMN IF NOT EXISTS paid_by TEXT;

-- Mijoz zakazi to'lovi (sales_orders) — qaysi xodim to'lovni kiritgani.
-- E'tibor: sales_orders'da allaqachon mavjud 'created_by' (buyurtmani QABUL QILGAN xodim,
-- sales_agents_and_reporting.sql) va 'advance_received_by' (oldindan to'lov, sales_orders_advance_tracking.sql)
-- bor — bular boshqa oqim. Bu ustun aynan desktop ilovadagi 'tolov_qoshish' amali uchun alohida.
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS payment_recorded_by TEXT;
