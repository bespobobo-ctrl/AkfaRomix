// ═══════════════════════════════════════════════════════════
//  AKFA Romix — AI miya (Google Gemini)
//  chatWithTools: function-calling (o'qish/yozish toollari)
//  transcribeAudio: o'zbekcha ovozli xabar → matn
// ═══════════════════════════════════════════════════════════

const KEY = () => process.env.GEMINI_API_KEY || "";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export function isConfigured() { return !!KEY(); }

async function callGemini(model, body, retries = 3) {
    let lastErr;
    for (let i = 0; i < retries; i++) {
        try {
            const r = await fetch(`${BASE}/${model}:generateContent?key=${KEY()}`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
            });
            if (r.status === 429 || r.status >= 500) { lastErr = new Error("Gemini " + r.status); await new Promise(z => setTimeout(z, 800 * (i + 1))); continue; }
            const d = await r.json();
            if (d.error) throw new Error(d.error.message || "Gemini xato");
            return d;
        } catch (e) { lastErr = e; await new Promise(z => setTimeout(z, 600 * (i + 1))); }
    }
    throw lastErr || new Error("Gemini ulanmadi");
}

// Function-calling suhbat. Qaytaradi: candidate.content ({role, parts})
export async function chatWithTools(system, contents, tools, opts = {}) {
    const body = {
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature: opts.temperature ?? 0.4, maxOutputTokens: opts.maxOutputTokens ?? 1200 }
    };
    if (tools && tools.length) body.tools = [{ functionDeclarations: tools }];
    const d = await callGemini(MODEL, body);
    const cand = d.candidates && d.candidates[0];
    return cand ? cand.content : { role: "model", parts: [{ text: "Javob kelmadi." }] };
}

// Oddiy matn javob (toolsiz)
export async function chatText(system, userText) {
    const c = await chatWithTools(system, [{ role: "user", parts: [{ text: userText }] }], null);
    return (c.parts || []).map(p => p.text || "").join("").trim() || "…";
}

// O'zbekcha ovozli xabar → matn
export async function transcribeAudio(base64, mimeType, hint = "") {
    const body = {
        contents: [{
            role: "user", parts: [
                { text: "Bu o'zbek tilidagi ovozli xabar. Uni AYNAN o'zbekcha matnga aylantir (transkripsiya). Faqat matnni qaytar, boshqa izohsiz." + (hint ? " Kontekst: " + hint : "") },
                { inlineData: { mimeType: mimeType || "audio/ogg", data: base64 } }
            ]
        }],
        generationConfig: { temperature: 0.1 }
    };
    const d = await callGemini(MODEL, body);
    const cand = d.candidates && d.candidates[0];
    return cand ? (cand.content.parts || []).map(p => p.text || "").join("").trim() : "";
}

export default { isConfigured, chatWithTools, chatText, transcribeAudio };
