# SQL migratsiyalarni ishga tushirish jurnali

Har bir yangi `database/*.sql` fayl shu yerga qo'shiladi. Foydalanuvchi Supabase SQL
Editor'da ishga tushirgach, `[ ]` → `[x]` ga o'zgartiriladi (CLAUDE.md, 4-band).

- [ ] 2026-07-14_employees_salary_lockdown.sql — `employees.salary_info`/`advance_paid` ustunlarini anon/authenticated rollari uchun yopadi (frontend/bot endi himoyalangan `api/employees-secure.js` orqali o'qiydi/yozadi). **Ishga tushirishdan oldin HR panel va xodimlar mini-appda maosh to'g'ri ko'rinayotganini tekshiring.**
