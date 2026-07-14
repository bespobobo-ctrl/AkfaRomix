// ═══════════════════════════════════════════════════════════
//  AKFA Romix — umumiy AI yordamchi mantig'i (bot + mini-app uchun)
//  Gemini function-calling tool-loop, o'qish/yozish toollari, Telegram helperlar.
// ═══════════════════════════════════════════════════════════

import db from "./_romixdb.js";
import ai from "./_romixai.js";

export const TOKEN = process.env.ROMIX_BOT_TOKEN || "";
export const PASSWORD = process.env.ROMIX_BOT_PASSWORD || "romix2026";
const TG = (m) => `https://api.telegram.org/bot${TOKEN}/${m}`;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SBH = { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" };

// ── Holat (romix_bot_state key/value) — bot va mini-app bir xil kalitlarni ishlatadi ──
export async function stGet(key, def = null) {
    try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/romix_bot_state?key=eq.${encodeURIComponent(key)}&select=value`, { headers: SBH });
        const d = await r.json();
        return (d && d[0]) ? d[0].value : def;
    } catch (e) { return def; }
}
export async function stSet(key, value) {
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/romix_bot_state`, {
            method: "POST", headers: { ...SBH, Prefer: "resolution=merge-duplicates" },
            body: JSON.stringify({ key, value, updated_at: new Date().toISOString() })
        });
    } catch (e) { }
}
export async function stDel(key) {
    try { await fetch(`${SUPABASE_URL}/rest/v1/romix_bot_state?key=eq.${encodeURIComponent(key)}`, { method: "DELETE", headers: SBH }); } catch (e) { }
}

// ── Telegram yordamchilari ──
export async function tg(method, payload) {
    try {
        const r = await fetch(TG(method), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        return await r.json();
    } catch (e) { return { ok: false }; }
}
export const esc = s => String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
export async function send(chatId, text, extra = {}) { return tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra }); }

export async function sendVoice(chatId, audioBuffer) {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    formData.append('voice', blob, 'voice.mp3');

    const r = await fetch(TG('sendVoice'), { method: 'POST', body: formData });
    return await r.json();
}

export async function tgFilePath(fileId) {
    const d = await tg("getFile", { file_id: fileId });
    return d.ok ? d.result.file_path : null;
}
export async function downloadB64(filePath) {
    const r = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${filePath}`);
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.toString("base64");
}

// ── Toollar (Gemini function declarations) ──
const STR = d => ({ type: "string", description: d });
const NUM = d => ({ type: "number", description: d });
const OBJ = (props, req) => ({ type: "object", properties: props, required: req || [] });
const READ_TOOLS = [
    { name: "umumiy_holat", description: "Loyihaning umumiy holati: zakazlar soni, oylik savdo, mijoz qarzi, ombor qiymati, oylik harajat, tashqi qarz." },
    { name: "zakazlar", description: "Sotuv buyurtmalari ro'yxati va holati (mijoz, summa, to'langan, qoldiq, muddat, brigada).", parameters: OBJ({ holat: STR("Holat bo'yicha filtr, masalan 'Jarayonda', 'Tayyor', 'Yetkazildi' (ixtiyoriy)") }) },
    { name: "ombor", description: "Ombor zaxirasi: mahsulot turlari, umumiy qiymat, kam qolgan mahsulotlar." },
    { name: "harajatlar", description: "Harajatlar hisoboti.", parameters: OBJ({ davr: STR("'oy' = shu oy, bo'sh = hammasi (ixtiyoriy)") }) },
    { name: "qarzlar", description: "Tashqi qarzlar (ta'minotchi/kreditorlarga): kimga, qancha, qoldiq, muddat." },
    { name: "xodimlar", description: "Xodimlar (HR): jami/faol xodim, bugun kelganlar, oylik fond, ro'yxat." },
    { name: "zakaz_qidirish", description: "Buyurtmalarni mijoz ismi yoki telefoni bo'yicha to'liq ma'lumotlar bazasidan qidirish.", parameters: OBJ({ qidiruv: STR("Mijoz ismi yoki telefon raqami") }, ["qidiruv"]) },
    { name: "mahsulot_qidirish", description: "Omborda bor mahsulotlarni nomi bo'yicha to'liq qidirish.", parameters: OBJ({ qidiruv: STR("Mahsulot nomi yoki kalit so'zi") }, ["qidiruv"]) },
    { name: "xodim_qidirish", description: "Xodimlarni ismi bo'yicha qidirish.", parameters: OBJ({ qidiruv: STR("Xodim ismi") }, ["qidiruv"]) },
    { name: "ishlab_chiqarish_holati", description: "Ishlab chiqarish (kesish, payvandlash, yig'ish, qadoqlash) bosqichlari bo'yicha faol partiyalar (batches) holati hisoboti." },
    { name: "brigadalar_tarkibi", description: "Montajchilar va ishchilar brigadalari hamda ularga biriktirilgan xodimlar tarkibi." },
    { name: "material_sorovlari", description: "Buyurtmalar bo'yicha ishlab chiqarishga yuborilgan material so'rovlari va ularning tasdiqlanish holatlari." },
    { name: "excel_hisobot", description: "Muayyan oy uchun barcha sotuvlar, harajatlar va qarz to'lovlarini Excel (CSV) fayli shaklida generatsiya qilish.", parameters: OBJ({ oy: STR("Yil va oy, masalan '2026-06' yoki '2026-07'. Bo'sh bo'lsa joriy oy. (ixtiyoriy)") }) },
    { name: "tendentsiya_tahlili", description: "Oxirgi bir necha oy davomida savdo, harajat va foyda qanday o'zgarganini taqqoslaydi — 'bu oy o'tgan oyga nisbatan qanday', 'savdo o'sayaptimi yoki tushayaptimi' kabi savollar uchun ishlat.", parameters: OBJ({ oylar_soni: NUM("Nechta oxirgi oyni solishtirish kerak, 2 dan 6 gacha, default 3 (ixtiyoriy)") }) },
    { name: "eslatmalar", description: "Diqqatga molik narsalar bitta ro'yxatda: muddati o'tgan qarzlar, kechikkan buyurtmalar, kam qolgan mahsulotlar. Foydalanuvchi 'nimalarga e'tibor berishim kerak', 'muammo bormi' desa shu toolni chaqir." },
    { name: "top_mijozlar", description: "Eng katta hajmda buyurtma bergan mijozlar reytingi (jami summa, to'langan, qoldiq).", parameters: OBJ({ soni: NUM("Nechta mijoz ko'rsatish, default 5 (ixtiyoriy)") }) }
];
const WRITE_TOOLS = [
    { name: "harajat_qoshish", description: "Yangi HARAJAT (chiqim) qo'shish. Tizim avval tasdiq so'raydi.", parameters: OBJ({ summa: NUM("Harajat summasi (so'm)"), kategoriya: STR("Kategoriya, masalan Ijara, Maosh, Kommunal, Material, Boshqa"), izoh: STR("Izoh (ixtiyoriy)"), sana: STR("Sana YYYY-MM-DD (ixtiyoriy, default bugun)") }, ["summa"]) },
    { name: "tolov_qoshish", description: "TO'LOV kiritish. tur='qarz' → tashqi qarzni (kreditorga) to'lash; tur='zakaz' → mijoz zakazi to'lovi. Tizim avval tasdiq so'raydi.", parameters: OBJ({ tur: STR("'qarz' yoki 'zakaz'"), kimga: STR("Kreditor nomi (qarz) yoki mijoz ismi (zakaz)"), summa: NUM("To'lov summasi (so'm)") }, ["tur", "kimga", "summa"]) }
];
export const WRITE_NAMES = WRITE_TOOLS.map(t => t.name);
const CONFIRM_TOOL = { name: "tasdiqlash", description: "Foydalanuvchi oldin taklif qilingan HARAJAT yoki TO'LOV amalini ovozda tasdiqlagach yoki rad etgach shu toolni chaqir.", parameters: OBJ({ tasdiqlaymi: { type: "boolean", description: "true = foydalanuvchi \"ha\" dedi (amalni bajar), false = \"yo'q\" dedi (bekor qil)" } }, ["tasdiqlaymi"]) };
const stripEmptyParams = t => {
    if (t.parameters && Object.keys(t.parameters.properties || {}).length === 0) { const { parameters, ...rest } = t; return rest; }
    return t;
};
// Gemini bo'sh properties'ni rad etadi — parametersiz toollardan olib tashlaymiz
export const ALL_TOOLS = [...READ_TOOLS, ...WRITE_TOOLS].map(stripEmptyParams);
// Live (jonli ovozli qo'ng'iroq) rejimi uchun: yozish toollari darhol bajarilmaydi,
// faqat taklif sifatida saqlanadi — 'tasdiqlash' toolini kutadi (runLiveTool orqali).
export const LIVE_TOOLS = [...READ_TOOLS, ...WRITE_TOOLS, CONFIRM_TOOL].map(stripEmptyParams);

export const fmtSom = n => Math.round(Number(n) || 0).toLocaleString("uz-UZ") + " so'm";

// ── Toolni bajarish (o'qish darhol) ──
export async function execRead(name, a, chatId) {
    switch (name) {
        case "umumiy_holat": return await db.overview();
        case "zakazlar": return await db.ordersReport(a.holat);
        case "ombor": return await db.warehouse();
        case "harajatlar": return await db.expensesReport(a.davr);
        case "qarzlar": return await db.debtsReport();
        case "xodimlar": return await db.hrReport();
        case "zakaz_qidirish": return await db.searchOrder(a.qidiruv);
        case "mahsulot_qidirish": return await db.searchProduct(a.qidiruv);
        case "xodim_qidirish": return await db.searchEmployee(a.qidiruv);
        case "ishlab_chiqarish_holati": return await db.productionReport();
        case "brigadalar_tarkibi": return await db.brigadesReport();
        case "material_sorovlari": return await db.materialRequestsReport();
        case "tendentsiya_tahlili": return await db.trendReport(a.oylar_soni);
        case "eslatmalar": return await db.eslatmalar();
        case "top_mijozlar": return await db.topMijozlar(a.soni);
        case "excel_hisobot": {
            const oy = a.oy || new Date(new Date().getTime() + 5 * 3600 * 1000).toISOString().slice(0, 7);
            const data = await db.excelReport(oy);

            let csv = "﻿";
            csv += `=== SOTUV BUYURTMALARI (${oy}) ===\n`;
            csv += `Sana,Mijoz,Telefon,Summa,Tolangan,Qoldiq,Status\n`;
            (data.orders || []).forEach(o => {
                const total = Number(o.total_price) || 0;
                const paid = Number(o.paid_amount) || 0;
                const qoldiq = Math.max(0, total - paid);
                csv += `"${(o.created_at || '').slice(0, 10)}","${(o.customer_name || '').replace(/"/g, '""')}","${o.customer_phone || ''}",${total},${paid},${qoldiq},"${o.status || ''}"\n`;
            });
            csv += `\n`;

            csv += `=== HARAJATLAR (${oy}) ===\n`;
            csv += `Sana,Kategoriya,Summa,Izoh\n`;
            (data.expenses || []).forEach(e => {
                csv += `"${e.date || ''}","${(e.category || '').replace(/"/g, '""')}",${Number(e.amount) || 0},"${(e.note || '').replace(/"/g, '""')}"\n`;
            });
            csv += `\n`;

            csv += `=== TASHQI QARZ TO'LOVLARI (${oy}) ===\n`;
            csv += `Sana,Kreditor,Summa,Izoh\n`;
            (data.payments || []).forEach(p => {
                csv += `"${p.date || ''}","${(p.creditor || '').replace(/"/g, '""')}",${Number(p.amount) || 0},"${(p.note || '').replace(/"/g, '""')}"\n`;
            });

            try {
                const formData = new FormData();
                formData.append('chat_id', chatId);
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                formData.append('document', blob, `romix_hisobot_${oy}.csv`);
                formData.append('caption', `📊 <b>${oy}</b> oyi uchun moliyaviy hisobot (Excel formatida).`);
                formData.append('parse_mode', 'HTML');

                const r = await fetch(TG('sendDocument'), { method: 'POST', body: formData });
                const resData = await r.json();
                if (!resData.ok) throw new Error(JSON.stringify(resData));
                return `Hisobot generatsiya qilindi va Telegram orqali yuborildi.`;
            } catch (err) {
                console.error('[EXCEL SEND ERROR]', err);
                return `Xato: Hisobot faylini yuborib bo'lmadi.`;
            }
        }
        default: return { xato: "Noma'lum: " + name };
    }
}
export async function execWrite(name, a) {
    if (name === "harajat_qoshish") return await db.addExpense({ amount: a.summa, category: a.kategoriya, note: a.izoh, date: a.sana });
    if (name === "tolov_qoshish") return (a.tur === "qarz") ? await db.payDebt({ creditor: a.kimga, amount: a.summa }) : await db.payOrder({ customer: a.kimga, amount: a.summa });
    return { xato: "Noma'lum: " + name };
}
export function writeSummary(name, a) {
    if (name === "harajat_qoshish") return `🧾 <b>Harajat qo'shish</b>\n• Summa: <b>${fmtSom(a.summa)}</b>\n• Kategoriya: ${esc(a.kategoriya || "Boshqa")}` + (a.izoh ? `\n• Izoh: ${esc(a.izoh)}` : "") + (a.sana ? `\n• Sana: ${esc(a.sana)}` : "\n• Sana: bugun");
    if (name === "tolov_qoshish") return `💸 <b>To'lov kiritish</b>\n• Turi: ${a.tur === "qarz" ? "Tashqi qarzga (kreditor)" : "Mijoz zakaziga"}\n• ${a.tur === "qarz" ? "Kreditor" : "Mijoz"}: <b>${esc(a.kimga)}</b>\n• Summa: <b>${fmtSom(a.summa)}</b>`;
    return "Amal";
}
export function resultSummary(name, r, a) {
    if (r && r.xato) return "⚠️ " + esc(r.xato);
    if (name === "harajat_qoshish") return `✅ <b>Harajat qo'shildi</b>\n• ${fmtSom(a.summa)} · ${esc(a.kategoriya || "Boshqa")}\n📉 Shu oy jami harajat: <b>${esc(r.shu_oy_jami_harajat || "")}</b>`;
    if (name === "tolov_qoshish") return `✅ <b>To'lov kiritildi</b>\n• ${esc(r.kimga || r.mijoz || a.kimga)}: <b>${esc(r.tolandi || fmtSom(a.summa))}</b>\n💰 Qolgan qarz: <b>${esc(r.qolgan_qarz || "")}</b>`;
    return "✅ Bajarildi";
}

export const SYSTEM_PROMPT =
    `Sen "AKFA Romix" deraza va eshik ishlab chiqarish korxonasi uchun AQLLI YORDAMCHI botsan. Egasi bilan O'ZBEK tilida samimiy, qisqa, aniq muloqot qil.

LOYIHA HAQIDA:
AKFA Romix — PVC/aluminiy deraza-eshik ishlab chiqaruvchi korxona (HR + Sotuv + Ombor + Ishlab chiqarish + Showroom + Buxgalteriya). Sotuv buyurtmalari pipeline: Kutilmoqda → Jarayonda → Tayyor → Yetkazildi.

VAZIFANG:
1. Egasi muayyan ma'lumotlarni so'rasa, tegishli o'qish toolini chaqir.
   - Umumiy holat uchun 'umumiy_holat'.
   - Muayyan bir mijozning zakazini bilish uchun 'zakaz_qidirish' toolidan foydalan (masalan: "Ali zakazi nima bo'ldi?", "Maftuna opa zakazi").
   - Omborda muayyan mahsulot borligini bilish uchun 'mahsulot_qidirish' toolidan foydalan (masalan: "oyna qancha qolgan", "ruchka bormi").
   - Xodimni qidirish uchun 'xodim_qidirish' toolidan foydalan.
   - Ishlab chiqarish jarayonidagi partiyalar, kesish, payvandlash bosqichlari uchun 'ishlab_chiqarish_holati' toolini chaqir.
   - Ustalar va montajchilar guruhlari/brigadalari uchun 'brigadalar_tarkibi' toolini chaqir.
   - Buyurtmalar uchun jo'natilgan material so'rovlari holatini bilish uchun 'material_sorovlari' toolini chaqir.
   - Excel (CSV) moliyaviy hisobotini olish uchun 'excel_hisobot' toolidan foydalan (masalan: 'iyun hisoboti Excel', 'oylik hisobotni Excel qilib ber' -> oy='2026-06').
   - Agar biron holat bo'yicha filtrlanmagan oxirgi zakazlar/ombor/xodimlar ro'yxati kerak bo'lsa, mos ravishda 'zakazlar', 'ombor', 'xodimlar', 'harajatlar', 'qarzlar' toollarini chaqir.
2. Egasi FAQAT ikki xil amalni kirita oladi: HARAJAT (chiqim) va TO'LOV. Boshqa hech narsa yozma/o'zgartirma — faqat ma'lumot ber.
   - Harajat uchun 'harajat_qoshish', to'lov uchun 'tolov_qoshish' toolini chaqir.
   - MUHIM: tizim bu amalni DARHOL bajarmaydi — avval ✅/❌ tugma bilan tasdiq so'raydi. Shuning uchun "tasdiqlaysizmi?" deb yozma, to'g'ridan toolni chaqiraver.
   - To'lov: kreditorga/ta'minotchiga bo'lsa tur='qarz'; mijoz o'z zakazini to'lasa tur='zakaz'. Noaniq bo'lsa qisqa so'ra.
3. Summa/ism yetishmasa yoki so'rov (ayniqsa ovozdan) tushunarsiz bo'lsa — toolni chaqirma, nimani aniqlashtirish kerakligini qisqa so'ra.
4. Pul summalarini minglarni probel bilan yoz, "so'm" qo'sh (masalan 1 250 000 so'm). "mln"=million, "ming"=1000.
5. Sen matnli va ovozli muloqot qila olasan. Agar egasi "gapir", "ovozli javob ber" desa yoki ovozli xabar yuborsa, tizim sening javobingni avtomatik ravishda ovozga aylantirib yuboradi. Hech qachon "ovoz yubora olmayman" deb aytma.
6. Markdown sarlavha ishlatma — oddiy matn, <b>qalin</b> va emoji. Javoblar qisqa, Telegram uchun mos.`;

// ── Jonli ovozli qo'ng'iroq (Gemini Live API) uchun tizim prompti ──
export const SYSTEM_PROMPT_LIVE =
    `Sen "AKFA Romix" deraza va eshik ishlab chiqarish korxonasining IChKI MOLIYAVIY-BOSHQARUV MASLAHATCHISAN — tajribali biznes-konsultant kabi ishlaydigan jonli ovozli yordamchi. Bu telefon qo'ng'irog'iga o'xshash real vaqtli suhbat — vazmin, ishonchli, samimiy O'ZBEK tilida gapir. Markdown, HTML teg yoki yulduzcha ISHLATMA — faqat gapiriladigan oddiy matn.

LOYIHA HAQIDA:
AKFA Romix — PVC/aluminiy deraza-eshik ishlab chiqaruvchi korxona (HR + Sotuv + Ombor + Ishlab chiqarish + Showroom + Buxgalteriya). Sotuv buyurtmalari pipeline: Kutilmoqda → Jarayonda → Tayyor → Yetkazildi.

QANDAY ISHLASHING KERAK (MUHIM — bu seni oddiy "savol-javob botidan" ajratib turadi):
- Sen shunchaki raqam o'qib beruvchi emassan — ma'lumotni TAHLIL qilib, IZOHLAB ber: bu son yaxshimi-yomonmi, nega shunday, nimaga e'tibor qaratish kerak.
- Imkon qadar PROAKTIV bo'l: agar javobing ichida diqqatga molik narsa (masalan muddati o'tgan qarz, kechikkan buyurtma, kam qolgan mahsulot, savdo pasayishi) ko'rinsa — so'ralmasa ham qisqa ogohlantir va zarur bo'lsa keyingi qadamni tavsiya qil.
- Raqamlar orasidagi bog'liqlikni ko'rsat: masalan "savdo o'sdi, lekin harajat undan tezroq o'sayapti" kabi kuzatishlarni ayt.
- Egasi bilan ISH YURITASAN — kerak bo'lsa aniqlashtiruvchi savol ber, muqobil variant taklif qil, o'z fikringni bildir. Bu bir martalik savol-javob emas, davom etadigan muhokama.

TOOLLARING:
- Umumiy ko'rinish: 'umumiy_holat'. Tendentsiya/taqqoslash (bu oy o'tganiga nisbatan qanday, o'sish/pasayish): 'tendentsiya_tahlili'. Diqqatga molik narsalar (qarz, kechikish, kam qolgan mahsulot bir joyda): 'eslatmalar'. Eng katta mijozlar: 'top_mijozlar'.
- Batafsil ro'yxatlar: 'zakazlar', 'ombor', 'harajatlar', 'qarzlar', 'xodimlar'. Qidiruv: 'zakaz_qidirish', 'mahsulot_qidirish', 'xodim_qidirish'. Ishlab chiqarish: 'ishlab_chiqarish_holati', 'brigadalar_tarkibi', 'material_sorovlari'. Excel hisobot: 'excel_hisobot'.
- Bir savolga javob berish uchun kerak bo'lsa bir nechta toolni ketma-ket chaqirishing mumkin (masalan holatni tushunish uchun avval 'umumiy_holat', keyin 'eslatmalar').

QO'NG'IROQ BOSHLANISHI: Foydalanuvchi hali hech narsa demasdan turib senga birinchi signal kelsa — o'zing qisqa salomlashib, 'umumiy_holat' va 'eslatmalar' toollarini chaqirib, ENG MUHIM 1-2 narsani (masalan bitta muammo yoki bitta ijobiy natija) o'z-o'zidan qisqa aytib ber, so'ng "Nima haqida gaplashamiz?" kabi savol bilan tugat. Bu majlis boshidagi qisqa hisobot kabi bo'lsin, uzun ro'yxat emas.

HARAJAT va TO'LOV kiritish:
- Egasi FAQAT shu ikki amalni kirita oladi. Boshqa hech narsani yozma/o'zgartirma.
- harajat_qoshish yoki tolov_qoshish toolini chaqirganingda, bu amal DARHOL bajarilmaydi — tizim uni faqat taklif sifatida saqlaydi va senga qisqa tavsif qaytaradi.
- Shu tavsifni ovozda tabiiy tarzda ayt va "tasdiqlaysizmi?" deb so'ra.
- Foydalanuvchi keyingi gapida tasdiqlasa ("ha", "xa", "mayli", "bajaring" va h.k.) — 'tasdiqlash' toolini tasdiqlaymi=true bilan chaqir. Rad etsa ("yo'q", "bekor", "kerak emas") — tasdiqlaymi=false bilan chaqir.
- 'tasdiqlash' natijasini ovozda ayt.
- Summa/ism yetishmasa yoki nima demoqchi ekani tushunarsiz bo'lsa — toolni chaqirma, qisqa aniqlashtirib so'ra.

USLUB:
- Pul summalarini tabiiy gapirilgandek ayt (masalan "bir million ikki yuz ellik ming so'm"), raqamlarni harf-harf o'qima.
- Javoblaring QISQA va tabiiy suhbat uslubida bo'lsin — bu jonli qo'ng'iroq, uzun ma'ruza emas. Bir vaqtning o'zida bir nechta savolga javob berma, navbat bilan gapir. Lekin "qisqa" — "yuzaki" degani emas: agar tahlil kerak bo'lsa, 2-3 gapda mazmunli fikr bildir.`;

// ── AI tool-loop: bitta foydalanuvchi xabarini AI orqali qayta ishlaydi ──
// Qaytaradi: {type:'text', text} | {type:'confirm', name, args, summary} | {type:'error', text}
export async function runAssistantTurn(chatId, userText, history) {
    if (!ai.isConfigured()) return { type: "error", text: "🤖 AI miya ulanmagan. Administrator GEMINI_API_KEY ni qo'shsa ishlaydi." };
    const contents = (history || []).slice(-12).map(h => ({ role: h.role, parts: [{ text: h.text }] }));
    contents.push({ role: "user", parts: [{ text: userText }] });

    for (let step = 0; step < 6; step++) {
        let content;
        try { content = await ai.chatWithTools(SYSTEM_PROMPT, contents, ALL_TOOLS); }
        catch (e) { return { type: "error", text: "⚠️ AI xato: " + (e.message || e) }; }
        const parts = content.parts || [];
        const fc = parts.find(p => p.functionCall);
        if (fc) {
            const name = fc.functionCall.name, args = fc.functionCall.args || {};
            if (WRITE_NAMES.includes(name)) {
                await stSet("pending_" + chatId, { name, args });
                return { type: "confirm", name, args, summary: writeSummary(name, args) };
            }
            const result = await execRead(name, args, chatId);
            contents.push({ role: "model", parts: [{ functionCall: fc.functionCall }] });
            contents.push({ role: "user", parts: [{ functionResponse: { name, response: { natija: result } } }] });
            continue;
        }
        const text = parts.map(p => p.text || "").join("").trim();
        return { type: "text", text };
    }
    return { type: "error", text: "⚠️ Javob juda uzoq cho'zildi. Qaytadan urinib ko'ring." };
}

// ── Tasdiqlangan/bekor qilingan pending write amalini bajarish ──
export async function runConfirm(chatId, approved) {
    const p = await stGet("pending_" + chatId);
    if (!approved) { await stDel("pending_" + chatId); return { type: "cancelled" }; }
    if (!p) return { type: "error", text: "⏳ Tasdiqlanadigan amal topilmadi." };
    await stDel("pending_" + chatId);
    try {
        const r = await execWrite(p.name, p.args);
        return { type: "result", text: resultSummary(p.name, r, p.args) };
    } catch (e) {
        return { type: "error", text: "⚠️ Bajarishda xato: " + (e.message || e) };
    }
}

export const stripHtml = s => String(s == null ? "" : s).replace(/<[^>]*>/g, "");

// ── Gemini Live: bitta function-call'ni bajarish (o'qish darhol, yozish taklif, tasdiqlash ijro) ──
// Qaytaradi: oddiy (HTML'siz) obyekt/matn — to'g'ridan-to'g'ri Live toolResponse'ga qo'yiladi.
export async function runLiveTool(chatId, name, args) {
    if (name === "tasdiqlash") {
        const r = await runConfirm(chatId, !!args.tasdiqlaymi);
        if (r.type === "cancelled") return { bekor_qilindi: true };
        if (r.type === "error") return { xato: stripHtml(r.text) };
        return { bajarildi: true, natija: stripHtml(r.text) };
    }
    if (WRITE_NAMES.includes(name)) {
        await stSet("pending_" + chatId, { name, args });
        return { tasdiq_kerak: true, tavsif: stripHtml(writeSummary(name, args)) };
    }
    const result = await execRead(name, args, chatId);
    return result;
}

// ── Qo'ng'iroq xulosasi: transkriptdan qisqa yozma xulosa yasab, Telegram'ga yuborish + keyingi safar uchun saqlash ──
export async function summarizeCall(transcriptText) {
    if (!transcriptText || !transcriptText.trim() || !ai.isConfigured()) return null;
    const prompt = `Quyida "AKFA Romix" korxonasi egasi bilan uning AI moliyaviy maslahatchisi o'rtasidagi OVOZLI SUHBAT transkripti berilgan. Shu asosida QISQA, professional xulosa yoz — Telegram uchun HTML formatda (faqat <b>qalin</b> ishlatish mumkin, boshqa teg yo'q):

1. Muhokama qilingan asosiy mavzular (1-3 band, qisqa)
2. Qabul qilingan qarorlar yoki bajarilgan amallar (agar bo'lsa; bo'lmasa bu bandni butunlay tashla)
3. Keyingi safar davom ettirish uchun eslatma (agar tegishli bo'lsa; bo'lmasa tashla)

Juda qisqa yoz (5-8 qatordan oshmasin), suvsiz, faqat muhim narsalarni yoz. Boshida "📋 <b>Qo'ng'iroq xulosasi</b>" deb boshla. Agar suhbatda hech qanday muhim narsa muhokama qilinmagan bo'lsa (masalan faqat salomlashish bo'lgan), bo'sh matn qaytar.

SUHBAT TRANSKRIPTI:
${transcriptText}`;
    try {
        const text = await ai.chatText("Sen professional yig'ilish kotibisan, qisqa va aniq xulosa yozasan.", prompt);
        return (text || "").trim() || null;
    } catch (e) {
        console.error("[SUMMARIZE ERROR]", e);
        return null;
    }
}
export async function saveCallSummary(chatId, summaryText) {
    await stSet("last_call_summary_" + chatId, { text: summaryText, at: new Date().toISOString() });
}
export async function getCallSummary(chatId) {
    return await stGet("last_call_summary_" + chatId, null);
}

export default {
    TOKEN, PASSWORD, stGet, stSet, stDel, tg, esc, send, sendVoice, tgFilePath, downloadB64,
    ALL_TOOLS, LIVE_TOOLS, WRITE_NAMES, fmtSom, execRead, execWrite, writeSummary, resultSummary, stripHtml,
    SYSTEM_PROMPT, SYSTEM_PROMPT_LIVE, runAssistantTurn, runConfirm, runLiveTool,
    summarizeCall, saveCallSummary, getCallSummary
};
