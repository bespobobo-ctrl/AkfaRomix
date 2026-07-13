// ═══════════════════════════════════════════════════════════
//  AKFA Romix — Mini App uchun AI chat API (Vercel serverless)
//  Bot bilan bir xil holat (auth, tarix, pending amal)ni Supabase orqali ulashadi.
// ═══════════════════════════════════════════════════════════

import ai from "./_romixai.js";
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

        if (action === "voice") {
            const audioBase64 = body.audioBase64;
            if (!audioBase64) return res.status(200).json({ ok: false, error: "audio required" });
            const heard = await ai.transcribeAudio(audioBase64, body.mimeType || "audio/ogg", "AKFA Romix deraza korxonasi");
            if (!heard) return res.status(200).json({ ok: true, transcript: "", result: { type: "error", text: "Ovozni tushunolmadim, qaytadan urinib ko'ring." } });

            const histKey = "hist_" + chatId;
            const hist = (await stGet(histKey, [])) || [];
            const result = await runAssistantTurn(chatId, heard, hist);
            if (result.type === "text" && result.text) {
                hist.push({ role: "user", text: heard }); hist.push({ role: "model", text: result.text });
                await stSet(histKey, hist.slice(-16));
            }

            let audioReplyBase64 = null;
            if (result.type === "text" && result.text) {
                try {
                    const muxlisaApiKey = process.env.MUXLISA_API_KEY || 'rzCxQLxbC0ayEzkKOsdIjnZ-vruLCgH_enc0QKfS';
                    const plainText = result.text.replace(/<[^>]*>/g, '');
                    const speakerId = body.speaker === "bobur" ? "1" : "0";
                    const buf = await ai.textToSpeechMuxlisa(plainText, muxlisaApiKey, speakerId);
                    audioReplyBase64 = buf.toString("base64");
                } catch (e) { console.error("[VOICE TTS ERROR]", e); }
            }
            return res.status(200).json({ ok: true, transcript: heard, result, audioBase64: audioReplyBase64 });
        }

        return res.status(400).json({ ok: false, error: "unknown action" });
    } catch (e) {
        console.error("[ROMIX-AI-CHAT ERROR]", e);
        return res.status(500).json({ ok: false, error: String((e && e.message) || e) });
    }
}
