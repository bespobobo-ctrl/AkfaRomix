// ═══════════════════════════════════════════════════════════
//  AKFA Romix — Mini App uchun AI chat API (Vercel serverless)
//  Bot bilan bir xil holat (auth, tarix, pending amal)ni Supabase orqali ulashadi.
//  Ovozli suhbat Gemini Live API orqali brauzerdan to'g'ridan-to'g'ri ketadi
//  (qarang: romix-live-token.js / romix-live-tool.js) — bu yerda faqat login
//  va matn-fallback (ovoz mumkin bo'lmagan holatlar uchun) bor.
// ═══════════════════════════════════════════════════════════

import asst from "./_romixassistant.js";

const { PASSWORD, stGet, stSet, runAssistantTurn, runConfirm } = asst;

async function isAuthed(chatId) {
    const auth = (await stGet("auth", [])) || [];
    return auth.includes(chatId);
}

export default async function handler(req, res) {
    if (req.method === "GET") return res.status(200).json({ ok: true, service: "romix-ai-chat" });
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method not allowed" });

    let body;
    try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); }
    catch (e) { return res.status(400).json({ ok: false, error: "bad json" }); }

    const action = body.action;
    const chatId = Number(body.chatId);
    if (!chatId || !Number.isFinite(chatId)) return res.status(400).json({ ok: false, error: "chatId required" });

    try {
        if (action === "check") {
            return res.status(200).json({ ok: true, authed: await isAuthed(chatId) });
        }

        if (action === "login") {
            const password = String(body.password || "");
            if (password !== PASSWORD) return res.status(200).json({ ok: false, error: "Parol noto'g'ri" });
            const auth = (await stGet("auth", [])) || [];
            if (!auth.includes(chatId)) { auth.push(chatId); await stSet("auth", auth); }
            return res.status(200).json({ ok: true, authed: true });
        }

        // Quyidagi amallar avtorizatsiya talab qiladi
        if (!(await isAuthed(chatId))) return res.status(200).json({ ok: false, error: "not_authenticated" });

        if (action === "history") {
            const hist = (await stGet("hist_" + chatId, [])) || [];
            return res.status(200).json({ ok: true, history: hist });
        }

        if (action === "chat") {
            const text = String(body.text || "").trim();
            if (!text) return res.status(200).json({ ok: false, error: "empty text" });
            const histKey = "hist_" + chatId;
            const hist = (await stGet(histKey, [])) || [];
            const result = await runAssistantTurn(chatId, text, hist);
            if (result.type === "text" && result.text) {
                hist.push({ role: "user", text }); hist.push({ role: "model", text: result.text });
                await stSet(histKey, hist.slice(-16));
            }
            return res.status(200).json({ ok: true, result });
        }

        if (action === "confirm") {
            const approved = !!body.approved;
            const result = await runConfirm(chatId, approved);
            return res.status(200).json({ ok: true, result });
        }

        return res.status(400).json({ ok: false, error: "unknown action" });
    } catch (e) {
        console.error("[ROMIX-AI-CHAT ERROR]", e);
        return res.status(500).json({ ok: false, error: String((e && e.message) || e) });
    }
}
