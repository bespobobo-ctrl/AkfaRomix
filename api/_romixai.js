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

// Spiska (kirim hujjati) rasmidan mahsulotlar ro'yxatini o'qib olish
export async function extractSpiskaFromImage(base64, mimeType) {
    const prompt = `Bu ombor kirim hujjati yoki qo'lda yozilgan tovar spiskasi rasmi. Rasmdagi HAR BIR mahsulot qatorini diqqat bilan o'qib, faqat quyidagi JSON massiv ko'rinishida javob qaytar (hech qanday qo'shimcha matn, izoh yoki markdown belgisi yozma):
[{"name": "mahsulot nomi", "qty": son, "unit": "dona|kg|litr|metr|pachka", "type": "profil" yoki "aksessuar", "category": "aksessuar bo'lsa: Zamoklar|Ruchkalar|Qistirmalar|Biriktiruvchilar|Boshqa..., profil bo'lsa bo'sh string", "spec": "rangi/o'lchami/xususiyati agar bor bo'lsa, aks holda bo'sh string", "lengthMm": profil turi uchun agar rasmda har bir dona/pachkaning uzunligi millimetrda (yoki metrda, mm'ga aylantirib) aniq ko'rsatilgan bo'lsa shu son, aks holda 0, "price": agar hujjatda har bir birlik/dona uchun NARX (so'm/summa) ustuni bo'lsa shu son (faqat raqam, valyuta belgisisiz), aks holda 0}]

"type" ni aniqlash qoidasi: profil, PVX, alyuminiy, shtapik, tokcha, lambri kabi qurilish/tuzilma materiallari — "profil"; zamok, ruchka, qistirma (rezinka), vint, burama, dovodchik kabi kichik butlovchi/aksessuar qismlar — "aksessuar". Agar noaniq bo'lsa "aksessuar" deb belgila. Miqdorni rasmda yozilgan songa qat'iy asoslanib yoz; agar biror qatorni ishonchli o'qiy olmasang, o'sha qatorni ro'yxatga umuman qo'shma. "lengthMm"ni FAQAT rasmda aniq yozilgan bo'lsagina to'ldir — taxmin qilma, noaniq bo'lsa 0 qo'y (buxgalter keyin qo'lda kiritadi). "price" ham xuddi shunday: FAQAT hujjatda aniq yozilgan narxni yoz (masalan "Narxi", "Summa", "Birlik narxi" ustuni), agar jami summa/qiymat ustuni bo'lib birlik narxi aniq bo'lmasa yoki umuman narx ustuni bo'lmasa 0 qo'y — taxmin qilma.`;
    const body = {
        contents: [{
            role: "user", parts: [
                { text: prompt },
                { inlineData: { mimeType: mimeType || "image/jpeg", data: base64 } }
            ]
        }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
    };
    const d = await callGemini(MODEL, body);
    const cand = d.candidates && d.candidates[0];
    const text = cand ? (cand.content.parts || []).map(p => p.text || "").join("").trim() : "[]";
    let items;
    try {
        items = JSON.parse(text);
    } catch (e) {
        const m = text.match(/\[[\s\S]*\]/);
        if (!m) throw new Error("AI javobini o'qib bo'lmadi: " + text.slice(0, 200));
        items = JSON.parse(m[0]);
    }
    if (!Array.isArray(items)) throw new Error("AI noto'g'ri formatda javob berdi");
    return items
        .filter(it => it && it.name && Number(it.qty) > 0)
        .map(it => ({
            name: String(it.name).trim(),
            qty: Number(it.qty) || 0,
            unit: it.unit || 'dona',
            type: it.type === 'profil' ? 'profil' : 'aksessuar',
            category: it.category || '',
            spec: it.spec || '',
            lengthMm: Number(it.lengthMm) || 0,
            price: Number(it.price) || 0
        }));
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
