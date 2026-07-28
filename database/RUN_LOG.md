# SQL migratsiyalarni ishga tushirish jurnali

Har bir yangi `database/*.sql` fayl shu yerga qo'shiladi. Foydalanuvchi Supabase SQL
Editor'da ishga tushirgach, `[ ]` → `[x]` ga o'zgartiriladi (CLAUDE.md, 4-band).

- [ ] 2026-07-14_employees_salary_lockdown.sql — `employees.salary_info`/`advance_paid` ustunlarini anon/authenticated rollari uchun yopadi (frontend/bot endi himoyalangan `api/employees-secure.js` orqali o'qiydi/yozadi). **Ishga tushirishdan oldin HR panel va xodimlar mini-appda maosh to'g'ri ko'rinayotganini tekshiring.**
- [ ] 2026-07-27_desktop_audit_columns.sql — `romix_expenses.added_by`, `romix_debts.paid_by`, `sales_orders.payment_recorded_by` (TEXT, NULL ruxsat) qo'shadi — akfa-romix-ai desktop ilovasida xarajat/to'lov yozuvlariga qaysi xodim yozgani qayd etilishi uchun. Ishga tushirilmaguncha desktop ilova bu ustunlarga yozmaydi (AUDIT_COLUMNS_READY flag orqali himoyalangan), shuning uchun xavfsiz — shoshilinch emas.
- [x] 2026-07-28_ai_query_log_and_session_tracking.sql — `ai_query_log` (bo'lim AI vidjetlariga berilgan savol/javoblar) va `user_sessions` (login/logout vaqti + onlayn holat uchun last_seen) jadvallarini yaratadi. Ishga tushirilmaguncha ombor AI vidjeti eski (soxta, kalit-so'z asosidagi) javoblarni berishda davom etadi va login/logout hech qayerga yozilmaydi — ishga tushirmasangiz ham mavjud funksiyalar buzilmaydi.
