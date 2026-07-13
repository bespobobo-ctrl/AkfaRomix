// ═══════════════════════════════════════════════════════════
//  AKFA Romix — Gemini Live API tool-call ijrochisi
//  Brauzer WebSocket orqali Gemindan toolCall olganda shu endpointga murojaat qiladi.
// ═══════════════════════════════════════════════════════════

import asst from "./_romixassistant.js";

const { stGet, runLiveTool } = asst;

async function isAuthed(chatId) {
    const auth = (await stGet("auth", [])) || [];
    return auth.includes(chatId);
}

export default async function handler(req, res) {
    if (req.method === "GET") return res.status(200).json({ ok: true, service: "romix-live-tool" });
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method not allowed" });

    let body;
    try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); }
    catch (e) { return res.status(400).json({ ok: false, error: "bad json" }); }

    const chatId = Number(body.chatId);
    const name = body.name;
    const args = body.args || {};
    if (!chatId || !Number.isFinite(chatId)) return res.status(400).json({ ok: false, error: "chatId required" });
    if (!name) return res.status(400).json({ ok: false, error: "name required" });

    if (!(await isAuthed(chatId))) return res.status(200).json({ ok: false, error: "not_authenticated" });

    try {
        const response = await runLiveTool(chatId, name, args);
        return res.status(200).json({ ok: true, response });
    } catch (e) {
        console.error("[LIVE TOOL ERROR]", e);
        return res.status(200).json({ ok: true, response: { xato: String((e && e.message) || e) } });
    }
}
