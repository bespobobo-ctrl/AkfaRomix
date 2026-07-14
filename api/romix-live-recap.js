// ═══════════════════════════════════════════════════════════
//  AKFA Romix — Qo'ng'iroq tugagach yozma xulosa
//  Ovozli suhbat transkriptidan qisqa xulosa yasab, Telegram'ga yuboradi
//  va keyingi qo'ng'iroq uchun xotira sifatida saqlaydi.
// ═══════════════════════════════════════════════════════════

import asst from "./_romixassistant.js";

const { stGet, send, summarizeCall, saveCallSummary } = asst;

async function isAuthed(chatId) {
    const auth = (await stGet("auth", [])) || [];
    return auth.includes(chatId);
}

export default async function handler(req, res) {
    if (req.method === "GET") return res.status(200).json({ ok: true, service: "romix-live-recap" });
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method not allowed" });

    let body;
    try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); }
    catch (e) { return res.status(400).json({ ok: false, error: "bad json" }); }

    const chatId = Number(body.chatId);
    const transcript = Array.isArray(body.transcript) ? body.transcript : [];
    if (!chatId || !Number.isFinite(chatId)) return res.status(400).json({ ok: false, error: "chatId required" });
    if (!(await isAuthed(chatId))) return res.status(200).json({ ok: false, error: "not_authenticated" });

    if (!transcript.length) return res.status(200).json({ ok: true, summary: null });

    try {
        const transcriptText = transcript
            .filter(t => t && t.text && String(t.text).trim())
            .map(t => (t.role === "user" ? "Egasi: " : "Yordamchi: ") + String(t.text).trim())
            .join("\n");

        const summary = await summarizeCall(transcriptText);
        if (summary) {
            await send(chatId, summary);
            await saveCallSummary(chatId, summary);
        }
        return res.status(200).json({ ok: true, summary });
    } catch (e) {
        console.error("[LIVE RECAP ERROR]", e);
        return res.status(500).json({ ok: false, error: String((e && e.message) || e) });
    }
}
