-- 2026-07-14_employees_salary_lockdown.sql
--
-- Xavfsizlik tuzatishi: `employees` jadvalidagi maosh ustunlari (salary_info,
-- advance_paid) hozircha ochiq anon-kalit orqali hech qanday login/parolsiz
-- o'qib (va yozib) bo'lardi — 2026-07-14 tekshiruvida tasdiqlandi (haqiqiy
-- xodimlar ismi, lavozimi, oyligi hech qanday autentifikatsiyasiz to'liq
-- o'qildi).
--
-- Bu skript FAQAT shu ikki ustunni anon/authenticated rollari uchun yopadi.
-- Boshqa barcha `employees` ustunlari (ism, lavozim, telefon va h.k.) va
-- boshqa jadvallar o'zgarishsiz qoladi.
--
-- MUHIM — buni ishga tushirishdan oldin:
-- 1. api/employees-secure.js production'da deploy qilingan va sinovdan
--    o'tgan bo'lishi kerak (u SUPABASE_SERVICE_ROLE_KEY orqali ishlaydi —
--    bu skript service_role'ga ta'sir qilmaydi, u RLS/grant'larni chetlab
--    o'tadi).
-- 2. Romix HR paneli, AutoClapak Buxgalter/HR moduli va xodimlar mini-app
--    real login (admin/hr/buxgalter/ac_manager va xodimning o'zi) bilan
--    ochib ko'rilib, maosh to'g'ri ko'rinayotgani tasdiqlangan bo'lishi kerak.
-- Shundan keyingina bu skriptni Supabase SQL Editor'da ishga tushiring —
-- ishga tushirilgandan keyin ESKI to'g'ridan-to'g'ri yo'l (anon-kalit orqali
-- salary_info/advance_paid) butunlay yopiladi.

REVOKE SELECT (salary_info, advance_paid), UPDATE (salary_info, advance_paid)
    ON public.employees
    FROM anon, authenticated;

-- Tekshirish (ixtiyoriy): ishga tushirgandan keyin quyidagini sinab ko'ring —
-- anon kalit bilan xato qaytishi kerak, service_role bilan ishlashda davom etishi kerak.
--
-- SELECT id, full_name, salary_info FROM employees LIMIT 1; -- anon kalit bilan: permission denied
