// ═══════════════════════════════════════════════════════════
//  AKFA Romix — Telegram AI Yordamchi bot (Vercel serverless webhook)
//  O'qish: to'liq loyiha ma'lumoti. Yozish: FAQAT harajat + to'lov (tasdiq bilan).
//  Ovoz: o'zbekcha ovozli xabar. Miya: Gemini function-calling.
//  Asosiy interfeys: Mini App (menyu tugmasi orqali ochiladi).
// ═══════════════════════════════════════════════════════════

import db from "./_romixdb.js";
import ai from "./_romixai.js";
import asst from "./_romixassistant.js";

const { TOKEN, PASSWORD, stGet, stSet, stDel, tg, esc, send, sendVoice, tgFilePath, downloadB64, runAssistantTurn, runConfirm } = asst;
const WEBHOOK_SECRET = process.env.TG_WEBHOOK_SECRET || "";
// ?v= — Telegram WebView eski nusxani keshlab qolmasligi uchun har katta o'zgarishda oshiriladi
const MINI_APP_VERSION = "4";
const MINI_APP_URL = (process.env.ROMIX_MINI_APP_URL || "https://akfa-romix.vercel.app/src/mini-app/romix-ai/index.html") + "?v=" + MINI_APP_VERSION;

const YESNO = { inline_keyboard: [[{ text: "✅ Ha, bajar", callback_data: "romix:yes" }, { text: "❌ Bekor", callback_data: "romix:no" }]] };
const OPEN_APP_KB = { inline_keyboard: [[{ text: "🤖 Yordamchini ochish", web_app: { url: MINI_APP_URL } }]] };

let menuButtonSynced = false;
async function ensureMenuButton() {
    if (menuButtonSynced) return;
    menuButtonSynced = true;
    try {
        await tg("setChatMenuButton", { menu_button: { type: "web_app", text: "Yordamchi", web_app: { url: MINI_APP_URL } } });
    } catch (e) { console.error("[MENU BUTTON ERROR]", e); }
}

const HELP = `🤖 <b>AKFA Romix Yordamchi</b>\n\nMen loyiha haqida JONLI ma'lumot beraman va HARAJAT/TO'LOV kiritishga yordam beraman.\n\n<b>Misollar:</b>\n• <i>Umumiy holat qanday?</i>\n• <i>Zakazlar holati</i>\n• <i>Ombor qoldig'i</i>\n• <i>Kim menga qarzdor / kimga qarzim bor?</i>\n• <i>Xodimlar nechta?</i>\n• <i>Ijaraga 3 mln harajat yoz</i>\n• <i>Akmalga 5 mln to'lov qildim (qarz)</i>\n• 🎤 Ovozli xabar ham yuborsangiz bo'ladi\n\nEkran pastidagi <b>Yordamchi</b> tugmasi (yoki menyu tugmasi) orqali to'liq chat ilovasini oching.\n\nBuyruqlar: /holat /help /id`;

async function handleAI(chatId, userText, shouldReplyVoice = false) {
    const voiceMode = await stGet("voice_" + chatId); // "maftuna", "bobur", or null
    const histKey = "hist_" + chatId;
    let hist = (await stGet(histKey, [])) || [];

    const result = await runAssistantTurn(chatId, userText, hist);

    if (result.type === "confirm") {
        await send(chatId, result.summary + "\n\nTasdiqlaysizmi?", { reply_markup: YESNO });
        return;
    }
    if (result.type === "error") {
        await send(chatId, result.text);
        return;
    }
    const text = result.text;
    if (!text) return;

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
            } catch (ttsErr) { console.error('[MUXLISA TTS ERROR]', ttsErr); }
        } else if (elevenLabsApiKey) {
            try {
                const plainText = text.replace(/<[^>]*>/g, '');
                const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
                const audioBuffer = await ai.textToSpeechElevenLabs(plainText, elevenLabsApiKey, voiceId);
                await sendVoice(chatId, audioBuffer);
            } catch (ttsErr) { console.error('[ELEVENLABS TTS ERROR]', ttsErr); }
        }
    }
}

async function handleCallback(cb) {
    const chatId = cb.message.chat.id, mid = cb.message.message_id;
    await tg("answerCallbackQuery", { callback_query_id: cb.id });
    await tg("editMessageReplyMarkup", { chat_id: chatId, message_id: mid, reply_markup: { inline_keyboard: [] } });
    if (cb.data === "romix:no") { await runConfirm(chatId, false); await send(chatId, "❌ Bekor qilindi."); return; }
    if (cb.data === "romix:yes") {
        const r = await runConfirm(chatId, true);
        if (r.type === "error") await send(chatId, r.text);
        else if (r.type === "result") await send(chatId, r.text);
    }
}

async function handleText(chatId, text) {
    const t = (text || "").trim();
    if (t === "/start" || t === "/menu") { await send(chatId, "👋 Pastdagi <b>Yordamchi</b> tugmasini bosing — to'liq AI chat ilovasi ochiladi.\n\n" + HELP, { reply_markup: OPEN_APP_KB }); return; }
    if (t === "/help" || t === "/yordam") { await send(chatId, HELP, { reply_markup: OPEN_APP_KB }); return; }
    if (t === "/id") { await send(chatId, "Chat ID: <code>" + chatId + "</code>"); return; }
    if (t === "/holat") { const o = await db.overview(); await send(chatId, "📊 <b>Umumiy holat</b>\n" + Object.entries(o).map(([k, v]) => `• ${esc(k.replace(/_/g, " "))}: <b>${esc(v)}</b>`).join("\n")); return; }
    await handleAI(chatId, t);
}

export async function handleUpdate(update) {
    await ensureMenuButton();

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
            await send(chatId, "✅ Kirish tasdiqlandi!\n\nQuyidagi <b>Yordamchi</b> tugmasini bosing — to'liq AI chat ilovasi ochiladi (yozma yoki ovozli savol berishingiz mumkin).\n\n" + HELP, { reply_markup: OPEN_APP_KB });
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
    const fmtSom = asst.fmtSom;

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
                    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://dzsswblbpnjuluyqvewt.supabase.co";
                    const ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
                    const res = await fetch(`${SUPABASE_URL}/rest/v1/romix_inventory?id=eq.${record.product_id}&select=product_name`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
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
            try { await send(chatId, msg); }
            catch (err) { console.error(`Failed to send webhook notification to ${chatId}:`, err); }
        }
    }
}

// ── Vercel serverless entrypoint ──
export default async function handler(req, res) {
    if (req.method === "GET") { return res.status(200).json({ ok: true, bot: "AKFA Romix Yordamchi", configured: !!TOKEN, version: "miniapp-v1" }); }
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
