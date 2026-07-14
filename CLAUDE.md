# AKFA Romix — ishlash qoidalari

Bu loyiha bir nechta AI-agent (Claude Code, Google Antigravity va h.k.) tomonidan, ko'pincha mustaqil sessiyalarda ishlanadi. Quyidagi qoidalar 2026-07-13 arxitektura auditida topilgan haqiqiy hodisalar (2440 qator kod yo'qolishi, hardcoded bot tokeni takror sizib chiqishi, RUN qilinmagan SQL migratsiyalar yo'qolgan jadvalga olib kelgani) asosida yozilgan. Maqsad — bu hodisalarni TAKRORLAMASLIK.

## 1. Katta fayllarga tegishdan oldin — har doim yangilab oling

`admin.js`, `hr.js`, `warehouse.js`, `sales.js` kabi katta (1000+ qatorli) fayllar tez-tez, ko'pincha parallel sessiyalarda o'zgaradi. Bunday faylga birinchi Edit/Write qilishdan oldin:

```
git fetch origin && git merge --ff-only origin/main
```

Agar fast-forward ishlamasa (lokal commit bor), avval nima o'zgarganini ko'ring, keyin qo'lda merge qiling — hech qachon `git checkout -- <fayl>` yoki eski nusxani ustidan yozib qo'ymang.

**Sabab:** 2026-07-08 da bitta sessiya `admin.js`ni eskirgan lokal nusxa bilan ustidan yozib, ~2440 qator (butun Buxgalteriya Ombor moduli) bir zumda yo'qolgan edi (tuzatildi: commit `02ffedb`).

## 2. Har sessiya — alohida branch (mumkin bo'lsa)

To'g'ridan-to'g'ri `main`da katta/xavfli o'zgarish qilishdan oldin, ayniqsa bir nechta AI-agent parallel ishlayotgani ma'lum bo'lsa, alohida branch ochish tavsiya etiladi. Bu shart emas, lekin PR/review bo'lmasa ham, branch borligi tasodifiy ustidan-yozishni ko'rinadigan konfliktga aylantiradi (jimgina yo'qolish emas).

## 3. Maxfiy kalitlarni HECH QACHON kodga yozmang — hatto fallback sifatida ham

**Taqiqlangan naqsh:**
```js
const X = import.meta.env.VITE_X || "haqiqiy_qiymat_shu_yerda";
```

Bu naqsh loyihada bir necha marta takrorlangan (Supabase anon key 6 ta faylda, Telegram bot tokeni 4 ta faylda qo'lda nusxalangan) va oxirgisi hali ham hal qilinmagan xavfsizlik kamchiligi — brauzerga chiqarilgan JS orqali istalgan kishi tokenni o'qib oladi.

**To'g'ri yo'l:** `import.meta.env.VITE_X` — fallback yo'q. Agar env o'zgaruvchi yo'q bo'lsa, ilova aniq xato bilan to'xtasin, jim qolib eski/hardcoded qiymatga o'tmasin.

Yangi kalit/token qo'shsangiz — darhol `.env.example`ga (qiymatsiz, faqat nom) qo'shing, `.env`/`.env.local`ga emas.

## 4. Yangi SQL fayl yaratsangiz — RUN_LOG.md'ga yozing

`database/` papkasida 20+ SQL fayl bor, hech biri qachon productionga qo'llanilgani yozilmagan edi — bu 7 ta jadvalning "yo'qolib qolishi" (aslida hech qachon yaratilmagan yoki GRANT yetishmagan) hodisasiga olib keldi.

Yangi migratsiya fayli yaratganingizda:
1. Fayl nomini sana bilan boshlang: `2026-07-13_nimadir.sql`
2. `database/RUN_LOG.md`ga qator qo'shing (fayl mavjud bo'lmasa yarating): `- [ ] 2026-07-13_nimadir.sql — <bir jumla tavsif>`
3. Foydalanuvchi Supabase SQL Editor'da ishga tushirganini tasdiqlagach, `[ ]`ni `[x]`ga o'zgartiring.

## 5. Katta fayllarga funksiya qo'shganda — tegingan bo'lakni ajratib chiqaring

`admin.js` hozir ~11 000 qator. Uni bir martalik "katta refaktor" bilan tozalash shart emas — buning o'rniga: shu faylga yangi funksiya qo'shayotganda, agar tegilgan bo'lim (masalan "Buxgalteriya Ombor" yoki "Xodimlar") allaqachon mantiqan ajralib turgan bo'lsa, uni alohida faylga (`admin/ombor.js` kabi) chiqarib, asosiy fayldan import qiling. Majburiy emas, lekin imkon bo'lganda qiling.

## 6. ARCHITECTURE.md / README.md — struktura o'zgarsa yangilang

Bu ikki fayl hozir eskirgan (`src/pages/`, `src/js/pages/` kabi mavjud bo'lmagan papkalarni tasvirlaydi — haqiqiy joylashuv `src/projects/romix/*` va `src/projects/autoclapak/*`). Katta strukturaviy o'zgarish (yangi modul, papka ko'chirish) qilsangiz, shu ikki faylni ham bir vaqtda yangilang.

## 7. `admin.js`ga tegingandan keyin — uni yuklaydigan HAR BIR sahifada `?v=` raqamini oshiring

`admin.js` 8 ta HTML sahifadan `<script type="module" src=".../admin.js?v=X.Y">` orqali yuklanadi (`romix_dashboard.html` + 7 ta `autoclapak/pages/admin_*.html`). Bu `?v=` — cache-buster: raqam o'zgarmasa, avval shu sahifaga kirgan brauzer ESKI `admin.js`ni cheksiz keshda saqlab, hech qachon serverdan qayta yuklamaydi — hatto fayl serverda o'zgargan va tuzatish push+deploy qilingan bo'lsa ham.

**Sabab:** 2026-07-14 da `admin.js`ga ikkita tuzatish ketma-ket push qilindi (Buxgalteriya "Rasmdan Chiqim (AI)" saqlanmaslik bug'i), lekin `?v=` hech birida oshirilmagan edi — foydalanuvchi push+deploydan keyin ham "hali ham ishlamayapti" deb qayta xabar berdi, chunki brauzeri eski faylni keshdan olardi. Alohida commit bilan tuzatildi (`129997c`).

`admin.js`ga har qanday funksional o'zgarish (yangi funksiya, bug fix — CSS/kommentariya emas) kiritganingizda, shu 8 ta faylning har birida `?v=` raqamini bittaga oshiring.

## Ma'lum, ataylab qoldirilgan tanlovlar (tasodifiy emas, deb hisoblang)

- Supabase Auth ishlatilmaydi, login `system_users` jadvali + qo'lda parol solishtirish orqali. RLS siyosati ko'p jadvalda `USING (true)` — amalda cheklovsiz. Bu kichik ishonchli jamoa uchun vaqtincha qabul qilingan, lekin xavfsizlik kamchiligi sifatida qayd etilgan — kengaytirmang, lekin ham "tuzatilishi shart" deb o'zboshimchalik bilan o'zgartirmang, avval foydalanuvchi bilan kelishing.
- Ombor uchun ikkita parallel oqim bor: eski qo'l-BOM (`material_requests`) va yangi avtomatik `material_estimate`. Ikkisi ham ishlaydi — eskisini o'chirishdan oldin foydalanuvchi bilan tasdiqlang.
- `romix_ombor_aksesuvar.html`ning katta skripti ATAYLAB inline (fayl ichida, alohida `.js` emas) — ko'plab `onclick="..."` handlerlari global funksiyalarga tayanadi, ES-modulga aylantirish ularni buzadi (2026-07-13 tekshirildi).
- **`admin.js`da (AutoClapak fayli) "ROMIX BUHGALTER MODULE" deb nomlangan blok (447-4798 qator atrofi) sarlavhasiga qaramay TOZA Romix kodi EMAS** — ichida AutoClapak'ning o'z "auto-*" tab-navigatsiyasi (`loadAutoClapakInventory`, `loadAutoProduction`, `loadAutoSales`, `loadBuhgalteriya`, `refreshAutoProduction` va h.k.) bir xil yopiq closure'da chambarchas aralashgan (2026-07-13 tekshirildi). Bu blokni Romix papkasiga ko'chirishga urinishdan oldin har bir funksiyani alohida tekshiring — avvalgi taxmin (butun blok = Romix) NOTO'G'RI chiqdi. Xavfsiz ko'chirilgan qism: faqat `window.loadSystemUsers`/`window.deleteSystemUser` (endi `src/projects/romix/tizim_foydalanuvchilari.js`da) — bular to'liq mustaqil va window-bog'langan edi.
