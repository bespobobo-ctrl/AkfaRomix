# Dasturchilar xonasi

Bu papka AKFA Romix loyihasining avtomatik nazorat tizimi uchun ma'lumot manbai. Har bir panel (Ombor, Buhgalter, Sotuv, HR, Ishlab chiqarish) `.claude/agents/*-reviewer.md` orqali o'ziga xos tekshiruvchiga ega (qarang: loyiha ildizidagi `.claude/agents/`). Bu papka ularning topilmalarini yig'adigan markaziy jurnal (`tracker.json`) va shundan qurilgan boshqaruv panelini (`dashboard.html`) saqlaydi.

## Rollar

- **Panel reviewer'lar** (`ombor-reviewer`, `buhgalter-reviewer`, `sotuv-reviewer`, `hr-reviewer`, `ishlabchiqarish-reviewer`) — faqat o'z panelidagi kodni tekshiradi, xatolarni topadi, tuzatishni baholaydi. Kod yozmaydi.
- **Sardor** (`.claude/agents/sardor.md`) — barcha reviewer'larni yig'ib boshqaradi: yangi topilmalarga muhimlik darajasini (severity) beradi, tuzatilgan narsalarni qayta tekshirtiradi (retest), natijani "qoniqarli"/"optimal emas — qayta ishlash kerak" deb baholaydi, `tracker.json`ni yangilaydi va `dashboard.html`ni qayta quradi.
- **Dasturchilar** — `tracker.json`dagi o'ziga tegishli muammoni ko'radi, tuzatadi, `status`ni qo'lda yoki keyingi Sardor skanerlashida `"fixed"`ga o'tkazadi (izoh bilan). Sardor keyingi safar avtomatik retest qiladi.

## `tracker.json` sxemasi

Har bir `issues[]` elementi:

| Maydon | Ma'no |
|---|---|
| `id` | Masalan `OMB-0001` (panel prefiksi + tartib raqami) |
| `panel` | `ombor` \| `buhgalter` \| `sotuv` \| `hr` \| `ishlab_chiqarish` |
| `title`, `description` | Xato mohiyati |
| `file`, `line` | Manba joyi |
| `foundBy`, `foundAt` | Qaysi reviewer va qachon topgan |
| `severity` | `low` \| `medium` \| `high` \| `critical` — **Sardor beradi**, moliyaviy/ma'lumot yo'qotish xatarlariga qarab |
| `status` | `open` → `in_progress` → `fixed` → `verified` (yoki `needs_revision` — Sardor rad etsa, sababi bilan qayta `open`ga qaytadi) |
| `fixedBy`, `fixedAt` | Kim va qachon tuzatgani |
| `retest` | `{ result: pending\|pass\|fail, by, at, note }` |
| `discussion[]` | Sardor va dasturchi o'rtasidagi muhokama tarixi — `{ from, at, message }` |
| `resolution` | `optimal` \| `acceptable` \| `null` — Sardorning yakuniy bahosi |

## Oqim

1. Sardor kod o'zgargan panellarni aniqlaydi (`git diff`/`git log`), tegishli reviewer'ni chaqiradi.
2. Yangi topilma → `tracker.json`ga `status: "open"` bilan qo'shiladi, Sardor severity beradi.
3. Dasturchi tuzatadi, `status: "fixed"` qiladi (yoki Sardor keyingi skanerlashda kodni o'zgargan deb topadi).
4. Sardor o'sha reviewer'ni qayta chaqirib retest qiladi: `pass` → `status: "verified"`, `resolution` belgilanadi; `fail` → `discussion`ga izoh qo'shilib, `status: "needs_revision"`ga qaytadi.
5. `dashboard.html` qayta quriladi va bir xil URL'ga qayta e'lon qilinadi (Artifact) — dasturchilar va rahbariyat har doim bitta link orqali joriy holatni ko'radi.

Dashboard havolasi: `tracker.json` ichidagi `dashboardUrl` maydonida saqlanadi.
