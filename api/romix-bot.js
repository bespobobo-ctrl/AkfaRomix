// ═══════════════════════════════════════════════════════════
//  AKFA Romix — Telegram AI Yordamchi bot (Vercel serverless webhook)
//  O'qish: to'liq loyiha ma'lumoti. Yozish: FAQAT harajat + to'lov (tasdiq bilan).
//  Ovoz: o'zbekcha ovozli xabar. Miya: Gemini function-calling.
// ═══════════════════════════════════════════════════════════

import db from "./_romixdb.js";
import ai from "./_romixai.js";

const TOKEN = process.env.ROMIX_BOT_TOKEN || "";
const PASSWORD = process.env.ROMIX_BOT_PASSWORD || "romix2026";
const WEBHOOK_SECRET = process.env.TG_WEBHOOK_SECRET || "";
const TG = (m) => `https://api.telegram.org/bot${TOKEN}/${m}`;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://dzsswblbpnjuluyqvewt.supabase.co";
// Anon kalit ochiq (frontend bundle'da ham bor) — hardcoded zaxira (_romixdb.js kabi)
const ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk";
const SBH = { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" };

// ── Holat (romix_bot_state key/value) ──
async function stGet(key, def = null) {
    try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/romix_bot_state?key=eq.${encodeURIComponent(key)}&select=value`, { headers: SBH });
        const d = await r.json();
        return (d && d[0]) ? d[0].value : def;
    } catch (e) { return def; }
}
async function stSet(key, value) {
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/romix_bot_state`, {
            method: "POST", headers: { ...SBH, Prefer: "resolution=merge-duplicates" },
            body: JSON.stringify({ key, value, updated_at: new Date().toISOString() })
        });
    } catch (e) { }
}
async function stDel(key) {
    try { await fetch(`${SUPABASE_URL}/rest/v1/romix_bot_state?key=eq.${encodeURIComponent(key)}`, { method: "DELETE", headers: SBH }); } catch (e) { }
}

// ── Telegram yordamchilari ──
async function tg(method, payload) {
    try {
        const r = await fetch(TG(method), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        return await r.json();
    } catch (e) { return { ok: false }; }
}
const esc = s => String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
async function send(chatId, text, extra = {}) { return tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra }); }

async function sendVoice(chatId, audioBuffer) {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    formData.append('voice', blob, 'voice.mp3');

    const r = await fetch(TG('sendVoice'), {
        method: 'POST',
        body: formData
    });
    return await r.json();
}

const YESNO = { inline_keyboard: [[{ text: "✅ Ha, bajar", callback_data: "romix:yes" }, { text: "❌ Bekor", callback_data: "romix:no" }]] };

// ── Menyu tugmalari (doimiy klaviatura) ──
const B = { 
    hr: "👥 Xodimlar", 
    ombor: "📦 Ombor", 
    tayyor: "✅ Tayyor mahsulot", 
    bux: "📊 Buxgalteriya", 
    harajat: "💸 Harajatlar", 
    tolov: "💰 To'lovlar", 
    qarz: "🔴 Tashqi qarz",
    voiceMaftuna: "🎙️ Ovoz: Maftuna",
    voiceBobur: "🎙️ Ovoz: Bobur",
    modeText: "✍️ Faqat matn"
};
const MENU_KB = { 
    keyboard: [
        [B.hr, B.ombor], 
        [B.tayyor, B.bux], 
        [B.harajat, B.tolov], 
        [B.qarz],
        [B.voiceMaftuna, B.voiceBobur],
        [B.modeText]
    ], 
    resize_keyboard: true, 
    is_persistent: true 
};

async function tgFilePath(fileId) {
    const d = await tg("getFile", { file_id: fileId });
    return d.ok ? d.result.file_path : null;
}
async function downloadB64(filePath) {
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
    { name: "material_sorovlari", description: "Buyurtmalar bo'yicha ishlab chiqarishga yuborilgan material so'rovlari va ularning tasdiqlanish holatlari." }
];
const WRITE_TOOLS = [
    { name: "harajat_qoshish", description: "Yangi HARAJAT (chiqim) qo'shish. Tizim avval tasdiq so'raydi.", parameters: OBJ({ summa: NUM("Harajat summasi (so'm)"), kategoriya: STR("Kategoriya, masalan Ijara, Maosh, Kommunal, Material, Boshqa"), izoh: STR("Izoh (ixtiyoriy)"), sana: STR("Sana YYYY-MM-DD (ixtiyoriy, default bugun)") }, ["summa"]) },
    { name: "tolov_qoshish", description: "TO'LOV kiritish. tur='qarz' → tashqi qarzni (kreditorga) to'lash; tur='zakaz' → mijoz zakazi to'lovi. Tizim avval tasdiq so'raydi.", parameters: OBJ({ tur: STR("'qarz' yoki 'zakaz'"), kimga: STR("Kreditor nomi (qarz) yoki mijoz ismi (zakaz)"), summa: NUM("To'lov summasi (so'm)") }, ["tur", "kimga", "summa"]) }
];
const WRITE_NAMES = WRITE_TOOLS.map(t => t.name);
// Gemini bo'sh properties'ni rad etadi — parametersiz toollardan olib tashlaymiz
const ALL_TOOLS = [...READ_TOOLS, ...WRITE_TOOLS].map(t => {
    if (t.parameters && Object.keys(t.parameters.properties || {}).length === 0) { const { parameters, ...rest } = t; return rest; }
    return t;
});

const fmtSom = n => Math.round(Number(n) || 0).toLocaleString("uz-UZ") + " so'm";

// ── Toolni bajarish (o'qish darhol) ──
async function execRead(name, a) {
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
        default: return { xato: "Noma'lum: " + name };
    }
}
async function execWrite(name, a) {
    if (name === "harajat_qoshish") return await db.addExpense({ amount: a.summa, category: a.kategoriya, note: a.izoh, date: a.sana });
    if (name === "tolov_qoshish") return (a.tur === "qarz") ? await db.payDebt({ creditor: a.kimga, amount: a.summa }) : await db.payOrder({ customer: a.kimga, amount: a.summa });
    return { xato: "Noma'lum: " + name };
}
function writeSummary(name, a) {
    if (name === "harajat_qoshish") return `🧾 <b>Harajat qo'shish</b>\n• Summa: <b>${fmtSom(a.summa)}</b>\n• Kategoriya: ${esc(a.kategoriya || "Boshqa")}` + (a.izoh ? `\n• Izoh: ${esc(a.izoh)}` : "") + (a.sana ? `\n• Sana: ${esc(a.sana)}` : "\n• Sana: bugun");
    if (name === "tolov_qoshish") return `💸 <b>To'lov kiritish</b>\n• Turi: ${a.tur === "qarz" ? "Tashqi qarzga (kreditor)" : "Mijoz zakaziga"}\n• ${a.tur === "qarz" ? "Kreditor" : "Mijoz"}: <b>${esc(a.kimga)}</b>\n• Summa: <b>${fmtSom(a.summa)}</b>`;
    return "Amal";
}
function resultSummary(name, r, a) {
    if (r && r.xato) return "⚠️ " + esc(r.xato);
    if (name === "harajat_qoshish") return `✅ <b>Harajat qo'shildi</b>\n• ${fmtSom(a.summa)} · ${esc(a.kategoriya || "Boshqa")}\n📉 Shu oy jami harajat: <b>${esc(r.shu_oy_jami_harajat || "")}</b>`;
    if (name === "tolov_qoshish") return `✅ <b>To'lov kiritildi</b>\n• ${esc(r.kimga || r.mijoz || a.kimga)}: <b>${esc(r.tolandi || fmtSom(a.summa))}</b>\n💰 Qolgan qarz: <b>${esc(r.qolgan_qarz || "")}</b>`;
    return "✅ Bajarildi";
}

const SYSTEM_PROMPT =
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
   - Agar biron holat bo'yicha filtrlanmagan oxirgi zakazlar/ombor/xodimlar ro'yxati kerak bo'lsa, mos ravishda 'zakazlar', 'ombor', 'xodimlar', 'harajatlar', 'qarzlar' toollarini chaqir.
2. Egasi FAQAT ikki xil amalni kirita oladi: HARAJAT (chiqim) va TO'LOV. Boshqa hech narsa yozma/o'zgartirma — faqat ma'lumot ber.
   - Harajat uchun 'harajat_qoshish', to'lov uchun 'tolov_qoshish' toolini chaqir.
   - MUHIM: tizim bu amalni DARHOL bajarmaydi — avval ✅/❌ tugma bilan tasdiq so'raydi. Shuning uchun "tasdiqlaysizmi?" deb yozma, to'g'ridan toolni chaqiraver.
   - To'lov: kreditorga/ta'minotchiga bo'lsa tur='qarz'; mijoz o'z zakazini to'lasa tur='zakaz'. Noaniq bo'lsa qisqa so'ra.
3. Summa/ism yetishmasa yoki so'rov (ayniqsa ovozdan) tushunarsiz bo'lsa — toolni chaqirma, nimani aniqlashtirish kerakligini qisqa so'ra.
4. Pul summalarini minglarni probel bilan yoz, "so'm" qo'sh (masalan 1 250 000 so'm). "mln"=million, "ming"=1000.
5. Sen matnli va ovozli muloqot qila olasan. Agar egasi "gapir", "ovozli javob ber" desa yoki ovozli xabar yuborsa, tizim sening javobingni avtomatik ravishda ovozga aylantirib yuboradi. Hech qachon "ovoz yubora olmayman" deb aytma.
6. Markdown sarlavha ishlatma — oddiy matn, <b>qalin</b> va emoji. Javoblar qisqa, Telegram uchun mos.`;

// ── AI suhbat (tool-loop) ──
async function handleAI(chatId, userText, shouldReplyVoice = false) {
    if (!ai.isConfigured()) { await send(chatId, "🤖 AI miya ulanmagan. Administrator GEMINI_API_KEY ni qo'shsa ishlaydi."); return; }
    const voiceMode = await stGet("voice_" + chatId); // "maftuna", "bobur", or null
    const histKey = "hist_" + chatId;
    let hist = (await stGet(histKey, [])) || [];
    const contents = hist.slice(-12).map(h => ({ role: h.role, parts: [{ text: h.text }] }));
    contents.push({ role: "user", parts: [{ text: userText }] });

    for (let step = 0; step < 6; step++) {
        let content;
        try { content = await ai.chatWithTools(SYSTEM_PROMPT, contents, ALL_TOOLS); }
        catch (e) { await send(chatId, "⚠️ AI xato: " + esc(e.message || e)); return; }
        const parts = content.parts || [];
        const fc = parts.find(p => p.functionCall);
        if (fc) {
            const name = fc.functionCall.name, args = fc.functionCall.args || {};
            if (WRITE_NAMES.includes(name)) {
                await stSet("pending_" + chatId, { name, args });
                await send(chatId, writeSummary(name, args) + "\n\nTasdiqlaysizmi?", { reply_markup: YESNO });
                return;
            }
            const result = await execRead(name, args);
            contents.push({ role: "model", parts: [{ functionCall: fc.functionCall }] });
            contents.push({ role: "user", parts: [{ functionResponse: { name, response: { natija: result } } }] });
            continue;
        }
        const text = parts.map(p => p.text || "").join("").trim();
        if (text) {
            hist.push({ role: "user", text: userText }); hist.push({ role: "model", text });
            await stSet(histKey, hist.slice(-16));
            await send(chatId, text);

            const muxlisaApiKey = process.env.MUXLISA_API_KEY || 'rzCxQLxbC0ayEzkKOsdIjnZ-vruLCgH_enc0QKfS';
            const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
            const activeVoiceReply = shouldReplyVoice || !!voiceMode;
            if (activeVoiceReply) {
                if (muxlisaApiKey) {
                    try {
                        const plainText = text.replace(/<[^>]*>/g, '');
                        const speakerId = (voiceMode === "bobur") ? "1" : "0";
                        const audioBuffer = await ai.textToSpeechMuxlisa(plainText, muxlisaApiKey, speakerId);
                        await sendVoice(chatId, audioBuffer);
                    } catch (ttsErr) {
                        console.error('[MUXLISA TTS ERROR]', ttsErr);
                    }
                } else if (elevenLabsApiKey) {
                    try {
                        const plainText = text.replace(/<[^>]*>/g, '');
                        const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
                        const audioBuffer = await ai.textToSpeechElevenLabs(plainText, elevenLabsApiKey, voiceId);
                        await sendVoice(chatId, audioBuffer);
                    } catch (ttsErr) {
                        console.error('[ELEVENLABS TTS ERROR]', ttsErr);
                    }
                }
            }
        }
        return;
    }
    await send(chatId, "⚠️ Javob juda uzoq cho'zildi. Qaytadan urinib ko'ring.");
}

async function handleCallback(cb) {
    const chatId = cb.message.chat.id, mid = cb.message.message_id;
    await tg("answerCallbackQuery", { callback_query_id: cb.id });
    await tg("editMessageReplyMarkup", { chat_id: chatId, message_id: mid, reply_markup: { inline_keyboard: [] } });
    if (cb.data === "romix:no") { await send(chatId, "❌ Bekor qilindi."); await stDel("pending_" + chatId); return; }
    if (cb.data === "romix:yes") {
        const p = await stGet("pending_" + chatId);
        if (!p) { await send(chatId, "⏳ Tasdiqlanadigan amal topilmadi."); return; }
        await stDel("pending_" + chatId);
        try { const r = await execWrite(p.name, p.args); await send(chatId, resultSummary(p.name, r, p.args)); }
        catch (e) { await send(chatId, "⚠️ Bajarishda xato: " + esc(e.message || e)); }
    }
}

const HELP = `🤖 <b>AKFA Romix Yordamchi</b>\n\nMen loyiha haqida JONLI ma'lumot beraman va HARAJAT/TO'LOV kiritishга yordam beraman.\n\n<b>Misollar:</b>\n• <i>Umumiy holat qanday?</i>\n• <i>Zakazlar holati</i>\n• <i>Ombor qoldig'i</i>\n• <i>Kim menga qarzdor / kimga qarzim bor?</i>\n• <i>Xodimlar nechta?</i>\n• <i>Ijaraga 3 mln harajat yoz</i>\n• <i>Akmalga 5 mln to'lov qildim (qarz)</i>\n• 🎤 Ovozli xabar ham yuborsangiz bo'ladi\n\nBuyruqlar: /holat /help /id`;

// Menyu tugmasini ishlash. Ishladi bo'lsa true.
async function handleButton(chatId, t) {
    if (t === B.hr) {
        const h = await db.hrReport();
        await send(chatId, `👥 <b>Xodimlar</b>\n• Jami: <b>${h.jami_xodim}</b> · Faol: <b>${h.faol_xodim}</b>\n• Bugun kelgan: <b>${h.bugun_kelgan}</b>\n• Oylik fond: <b>${h.oylik_fond}</b>\n\n` +
            h.xodimlar.slice(0, 15).map((e, i) => `${i + 1}. ${esc(e.ism)}${e.lavozim ? " — " + esc(e.lavozim) : ""} · ${esc(e.oylik)}`).join("\n"));
        return true;
    }
    if (t === B.ombor) {
        const w = await db.warehouse();
        await send(chatId, `📦 <b>Ombor</b>\n• Mahsulot turlari: <b>${w.mahsulot_turlari}</b>\n• Umumiy qiymat: <b>${w.ombor_qiymati}</b>\n\n` +
            (w.kam_qolganlar.length ? "⚠️ <b>Kam qolganlar:</b>\n" + w.kam_qolganlar.map(p => `• ${esc(p.nomi)} — ${esc(p.qoldiq)}`).join("\n") : "✅ Kam qolgan mahsulot yo'q"));
        return true;
    }
    if (t === B.tayyor) {
        const o = await db.ordersReport("Tayyor");
        await send(chatId, `✅ <b>Tayyor mahsulot (zakazlar)</b>\nSoni: <b>${o.soni}</b>\n\n` +
            (o.zakazlar.length ? o.zakazlar.slice(0, 15).map((z, i) => `${i + 1}. ${esc(z.mijoz)} — ${esc(z.summa)} · ${esc(z.holat)}`).join("\n") : "Tayyor holatidagi zakaz yo'q."));
        return true;
    }
    if (t === B.bux) {
        const o = await db.overview();
        await send(chatId, `📊 <b>Buxgalteriya</b>\n• Oylik savdo: <b>${esc(o.oylik_savdo)}</b>\n• Shu oy harajat: <b>${esc(o.shu_oy_harajat)}</b>\n• Mijoz qarzi (to'lanmagan): <b>${esc(o.tolanmagan_qarz_mijoz)}</b>\n• Tashqi qarz: <b>${esc(o.tashqi_qarz)}</b>\n• Ombor qiymati: <b>${esc(o.ombor_qiymati)}</b>\n• Zakazlar: <b>${o.jami_zakaz}</b> (faol ${o.faol_zakaz})`);
        return true;
    }
    if (t === B.harajat) {
        const e = await db.expensesReport("oy");
        await send(chatId, `💸 <b>Harajatlar (shu oy)</b>\nJami: <b>${esc(e.jami)}</b> · ${e.soni} ta\n\n` +
            (e.harajatlar.length ? e.harajatlar.slice(0, 15).map((x, i) => `${i + 1}. ${esc(x.sana)} · ${esc(x.kategoriya)} — <b>${esc(x.summa)}</b>${x.izoh ? " (" + esc(x.izoh) + ")" : ""}`).join("\n") : "Bu oy harajat yo'q.") +
            `\n\n<i>Qo'shish: masalan «Ijaraga 3 mln harajat»</i>`);
        return true;
    }
    if (t === B.tolov) {
        const o = await db.ordersReport();
        const qarzli = o.zakazlar.filter(z => z.qoldiq && z.qoldiq !== "0 so'm");
        await send(chatId, `💰 <b>To'lovlar</b>\nTo'lanmagan zakazlar: <b>${qarzli.length}</b>\n\n` +
            (qarzli.length ? qarzli.slice(0, 15).map((z, i) => `${i + 1}. ${esc(z.mijoz)} — qoldiq <b>${esc(z.qoldiq)}</b> (to'langan ${esc(z.tolangan)})`).join("\n") : "Barcha zakazlar to'langan ✅") +
            `\n\n<i>To'lov kiritish: «Ali 2 mln to'lov» yoki «Akmalga 5 mln qarz to'lovi»</i>`);
        return true;
    }
    if (t === B.qarz) {
        const d = await db.debtsReport();
        await send(chatId, `🔴 <b>Tashqi qarz</b>\nJami qoldiq: <b>${esc(d.jami_qarz)}</b> · ${d.soni} ta\n\n` +
            (d.qarzlar.length ? d.qarzlar.slice(0, 15).map((x, i) => `${i + 1}. ${esc(x.kimga)} — qoldiq <b>${esc(x.qoldiq)}</b>${x.muddat && x.muddat !== "—" ? " · muddat " + esc(x.muddat) : ""}`).join("\n") : "Tashqi qarz yo'q ✅"));
        return true;
    }
    if (t === B.voiceMaftuna) {
        await stSet("voice_" + chatId, "maftuna");
        await send(chatId, "🎙️ Ovozli rejim: <b>Maftuna (ayol)</b> faollashtirildi! Endi har qanday xabarga Maftuna ovozi bilan javob qaytaraman. (Matnga qaytish uchun '✍️ Faqat matn' ni bosing)");
        return true;
    }
    if (t === B.voiceBobur) {
        await stSet("voice_" + chatId, "bobur");
        await send(chatId, "🎙️ Ovozli rejim: <b>Bobur (erkak)</b> faollashtirildi! Endi har qanday xabarga Bobur ovozi bilan javob qaytaraman. (Matnga qaytish uchun '✍️ Faqat matn' ni bosing)");
        return true;
    }
    if (t === B.modeText) {
        await stDel("voice_" + chatId);
        await send(chatId, "✍️ <b>Matnli rejim</b> faollashtirildi. Savol-javoblar faqat matn ko'rinishida bo'ladi.");
        return true;
    }
    return false;
}

async function handleText(chatId, text) {
    const t = (text || "").trim();
    if (await handleButton(chatId, t)) return;
    if (t === "/start" || t === "/menu") { await send(chatId, "📋 <b>Menyu</b> — tugmani tanlang, yoki savolingizni yozing/ayting:", { reply_markup: MENU_KB }); return; }
    if (t === "/help" || t === "/yordam") { await send(chatId, HELP); return; }
    if (t === "/id") { await send(chatId, "Chat ID: <code>" + chatId + "</code>"); return; }
    if (t === "/holat") { const o = await db.overview(); await send(chatId, "📊 <b>Umumiy holat</b>\n" + Object.entries(o).map(([k, v]) => `• ${esc(k.replace(/_/g, " "))}: <b>${esc(v)}</b>`).join("\n")); return; }
    await handleAI(chatId, t);
}

export async function handleUpdate(update) {
    const cb = update.callback_query;
    if (cb) {
        const chatId = cb.message.chat.id;
        const auth = (await stGet("auth", [])) || [];
        if (!auth.includes(chatId)) { await tg("answerCallbackQuery", { callback_query_id: cb.id }); return; }
        return handleCallback(cb);
    }
    const msg = update.message;
    if (!msg || !msg.chat) return;
    const chatId = msg.chat.id;
    if (msg.chat.type !== "private") return; // faqat shaxsiy chat

    const auth = (await stGet("auth", [])) || [];
    const text = msg.text || "";

    // Parol tekshiruvi (ruxsat berilmagan bo'lsa)
    if (!auth.includes(chatId)) {
        if (text.trim() === PASSWORD) {
            auth.push(chatId); await stSet("auth", auth);
            await send(chatId, "✅ Kirish tasdiqlandi! Quyidagi tugmalardan foydalaning yoki savol yozing/ayting.\n\n" + HELP, { reply_markup: MENU_KB });
        } else if (text === "/start") {
            await send(chatId, "👋 Assalomu alaykum! Botga kirish uchun <b>parolni</b> yuboring.");
        } else {
            await send(chatId, "🔒 Avval parolni yuboring.");
        }
        return;
    }

    // Ovozli xabar
    if (msg.voice || msg.audio) {
        try {
            const fileId = (msg.voice || msg.audio).file_id;
            const fp = await tgFilePath(fileId);
            if (!fp) { await send(chatId, "⚠️ Ovozni yuklab bo'lmadi."); return; }
            const b64 = await downloadB64(fp);
            const mime = /\.oga|\.ogg/i.test(fp) ? "audio/ogg" : "audio/mpeg";
            const heard = await ai.transcribeAudio(b64, mime, "AKFA Romix deraza korxonasi");
            if (!heard) { await send(chatId, "⚠️ Ovozni tushunolmadim, qaytadan ayting."); return; }
            await send(chatId, "🎤 Eshitdim: «" + esc(heard) + "»");
            return handleAI(chatId, heard, true);
        } catch (e) { await send(chatId, "⚠️ Ovoz xatosi: " + esc(e.message || e)); return; }
    }

    if (text) return handleText(chatId, text);
}

// ── Supabase Database Webhook handler ──
async function handleSupabaseWebhook(payload) {
    const { table, type, record, old_record } = payload;
    const auth = (await stGet("auth", [])) || [];
    if (!auth || !auth.length) return;

    let msg = "";

    if (table === "sales_orders") {
        if (type === "INSERT") {
            msg = `🛒 <b>Yangi buyurtma qabul qilindi!</b>\n\n` +
                  `• Mijoz: <b>${esc(record.customer_name)}</b>\n` +
                  `• Telefon: ${esc(record.customer_phone || "—")}\n` +
                  `• Summa: <b>${fmtSom(record.total_price)}</b>\n` +
                  `• Avans: ${fmtSom(record.paid_amount || 0)}\n` +
                  `• Muddat: ${esc(record.deadline_date || "—")}`;
        } else if (type === "UPDATE" && old_record) {
            if (record.status !== old_record.status) {
                msg = `🔄 <b>Buyurtma holati o'zgardi!</b>\n\n` +
                      `• Mijoz: <b>${esc(record.customer_name)}</b>\n` +
                      `• Eski holat: <s>${esc(old_record.status || "Kutilmoqda")}</s>\n` +
                      `• Yangi holat: <b>${esc(record.status)}</b>`;
            } else if (Number(record.paid_amount) > Number(old_record.paid_amount)) {
                const diff = Number(record.paid_amount) - Number(old_record.paid_amount);
                const qoldiq = Math.max(0, Number(record.total_price) - Number(record.paid_amount));
                msg = `💰 <b>Mijozdan yangi to'lov qabul qilindi!</b>\n\n` +
                      `• Mijoz: <b>${esc(record.customer_name)}</b>\n` +
                      `• Qabul qilingan summa: <b>${fmtSom(diff)}</b>\n` +
                      `• Jami to'langan: ${fmtSom(record.paid_amount)}\n` +
                      `• Qolgan qarz: <b>${fmtSom(qoldiq)}</b>`;
            }
        }
    } 
    
    else if (table === "romix_expenses") {
        if (type === "INSERT") {
            msg = `💸 <b>Yangi harajat qo'shildi!</b>\n\n` +
                  `• Summa: <b>${fmtSom(record.amount)}</b>\n` +
                  `• Kategoriya: <b>${esc(record.category || "Boshqa")}</b>\n` +
                  `• Izoh: <i>${esc(record.note || "—")}</i>\n` +
                  `• Sana: ${esc(record.date || "bugun")}`;
        }
    } 
    
    else if (table === "romix_payment_log") {
        if (type === "INSERT") {
            msg = `💳 <b>Tashqi qarzga to'lov qilindi!</b>\n\n` +
                  `• Kreditor: <b>${esc(record.creditor)}</b>\n` +
                  `• To'langan summa: <b>${fmtSom(record.amount)}</b>\n` +
                  `• Izoh: <i>${esc(record.note || "—")}</i>\n` +
                  `• Sana: ${esc(record.date || "bugun")}`;
        }
    }

    else if (table === "romix_transactions") {
        if (type === "INSERT") {
            let productName = "Profil";
            try {
                const p = await stGet(`prod_name_${record.product_id}`);
                if (p) {
                    productName = p;
                } else {
                    const res = await fetch(`${SUPABASE_URL}/rest/v1/romix_inventory?id=eq.${record.product_id}&select=product_name`, { headers: SBH });
                    const data = await res.json();
                    if (data && data[0]) {
                        productName = data[0].product_name;
                        await stSet(`prod_name_${record.product_id}`, productName);
                    }
                }
            } catch (e) {
                console.error('Failed to fetch product name for transaction alert:', e);
            }

            const action = record.type === "IN" ? "📥 KIRIM (Keltirildi)" : "📤 CHIQIM (Ishlatildi)";
            msg = `📦 <b>Omborda harakat (Profil):</b>\n\n` +
                  `• Turi: <b>${action}</b>\n` +
                  `• Mahsulot: <b>${esc(productName)}</b>\n` +
                  `• Miqdor: <b>${record.quantity} kg/metr</b>\n` +
                  `• Izoh: <i>${esc(record.note || "Bosh panel orqali")}</i>`;
        }
    }

    else if (table === "romix_accessories_history") {
        if (type === "INSERT") {
            msg = `⚙️ <b>Aksessuarlar ombori harakati:</b>\n\n` +
                  `• Amal: <b>${esc(record.action || "O'zgarish")}</b>\n` +
                  `• Tafsilotlar: <b>${esc(record.details || "—")}</b>\n` +
                  `• Mas'ul: ${esc(record.operator || "Tizim")}`;
        }
    }

    if (msg) {
        for (const chatId of auth) {
            try {
                await send(chatId, msg);
            } catch (err) {
                console.error(`Failed to send webhook notification to ${chatId}:`, err);
            }
        }
    }
}

// ── Vercel serverless entrypoint ──
export default async function handler(req, res) {
    if (req.method === "GET") { return res.status(200).json({ ok: true, bot: "AKFA Romix Yordamchi", configured: !!TOKEN, version: "maftuna-v1" }); }
    if (req.method !== "POST") { return res.status(405).json({ ok: false }); }
    
    try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        
        // Check if it is a Supabase webhook
        if (body && body.table && body.type && body.record) {
            await handleSupabaseWebhook(body);
            return res.status(200).json({ ok: true, source: "supabase" });
        }
        
        if (WEBHOOK_SECRET && req.headers["x-telegram-bot-api-secret-token"] !== WEBHOOK_SECRET) {
            return res.status(401).json({ ok: false, error: "bad secret" });
        }
        await handleUpdate(body || {});
    } catch (e) {
        console.error('[HANDLER ERROR]', e);
    }
    return res.status(200).json({ ok: true });
}
