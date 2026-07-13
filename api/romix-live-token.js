// ═══════════════════════════════════════════════════════════
//  AKFA Romix — Gemini Live API uchun muddati cheklangan (ephemeral) token
//  Brauzer to'g'ridan-to'g'ri Gemini bilan WebSocket orqali ulanadi (real vaqtli ovozli suhbat),
//  shu sababli asosiy GEMINI_API_KEY hech qachon klientga yuborilmaydi — faqat qisqa muddatli token.
// ═══════════════════════════════════════════════════════════

import { GoogleGenAI } from "@google/genai";
import asst from "./_romixassistant.js";

const { stGet, LIVE_TOOLS, SYSTEM_PROMPT_LIVE } = asst;
const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || "gemini-3.1-flash-live-preview";

async function isAuthed(chatId) {
    const auth = (await stGet("auth", [])) || [];
    return auth.includes(chatId);
}

export default async function handler(req, res) {
    if (req.method === "GET") return res.status(200).json({ ok: true, service: "romix-live-token" });
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method not allowed" });

    let body;
    try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); }
    catch (e) { return res.status(400).json({ ok: false, error: "bad json" }); }

    const chatId = Number(body.chatId);
    if (!chatId || !Number.isFinite(chatId)) return res.status(400).json({ ok: false, error: "chatId required" });

    if (!(await isAuthed(chatId))) return res.status(200).json({ ok: false, error: "not_authenticated" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(200).json({ ok: false, error: "GEMINI_API_KEY sozlanmagan" });

    try {
        const client = new GoogleGenAI({ apiKey });
        const now = Date.now();
        const expireTime = new Date(now + 30 * 60 * 1000);
        const newSessionExpireTime = new Date(now + 60 * 1000);

        const token = await client.authTokens.create({
            config: {
                uses: 1,
                expireTime: expireTime.toISOString(),
                newSessionExpireTime: newSessionExpireTime.toISOString(),
                httpOptions: { apiVersion: "v1alpha" }
            }
        });

        return res.status(200).json({
            ok: true,
            token: token.name,
            model: LIVE_MODEL,
            systemInstruction: SYSTEM_PROMPT_LIVE,
            tools: LIVE_TOOLS
        });
    } catch (e) {
        console.error("[LIVE TOKEN ERROR]", e);
        return res.status(500).json({ ok: false, error: String((e && e.message) || e) });
    }
}
