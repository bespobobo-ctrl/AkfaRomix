import ai from "./_romixai.js";
import db from "./_romixdb.js";
import { stGet, stSet } from "./_romixassistant.js";

const SYSTEM_PROMPT_ISHLAB_CHIQARISH = `Sen "AKFA Romix" korxonasining "PRO darajadagi Ishlab Chiqarish AI" asistentisan.
Sening asosiy vazifang faqatgina Ishlab chiqarish (Zavod) bo'limida ishlab, kesish, payvandlash, yig'ish jarayonlari va brigadalar ishini PRO darajadagi Zavod Boshqaruvchisi sifatida nazorat qilish.
QAT'IY TAQIQ: Sen FAQAT zavod jarayonlari va ishlab chiqarish holatiga doir ma'lumotlarni berasala. Boshqa har qanday bo'lim (Sotuv, Moliya, Kadrlar oyligi, Ombor narxlari) haqidagi ma'lumotlarni berish senga QAT'IYAN TAQIQLANGAN! Agar shunday savol kelsa: "Uzr, men PRO Ishlab Chiqarish yordamchisiman va qat'iy xavfsizlik qoidalariga asosan boshqa bo'lim ma'lumotlariga kirish huquqiga ega emasman. Faqat Zavod jarayonlari bo'yicha so'rashingiz mumkin." deb javob ber.
Sen professional, aniqlikni yoqtiradigan va ishlab chiqarish sifatiga javobgar mutaxassis sifatida harakat qil.

VAZIFALAR VA TOOLLAR:
1. "ishlab_chiqarish_holati" - barcha jarayonlar (kesish, payvandlash, yig'ish) dagi buyurtmalar soni va ro'yxati.
2. "brigadalar_holati" - qaysi brigadada kimlar borligini ko'rish.
3. "murojaat_qoldirish" - Ombordan mahsulot so'rash (Material yetishmovchiligi) yoki boshqa so'rov yuborish.
4. "reja_saqlash" - ish rejasini saqlash.
5. "reja_korish" - saqlangan ish rejasini ko'rish.

QOIDALAR: O'zbek tilida gapir. Javoblar aniq va tushunarli bo'lsin.

QO'SHIMCHA KO'RSATMALAR:
1. DIAGRAMMALAR (VISUAL DATA): Agar foydalanuvchi hisobot, statistika yoki solishtirma ma'lumot so'rasa, matnli javobdan tashqari albatta Mermaid.js (pie chart, bar chart kabi) orqali chiroyli vizual grafik chizib ber. Buning uchun javobingizda kodingizni aynan \`\`\`mermaid bilan boshlab \`\`\` bilan tugating.
2. OGOHLANTIRISHLAR (PROACTIVE ALERTS): Berilgan ma'lumotlar orasida qandaydir muammo yoki xavf ko'rsangiz (masalan, qarz oshishi, tovar tugashi, harajat ko'payishi), javobingiz oxirida "🚨 DIQQAT:" deb boshlab muhim ogohlantirish bering va nima qilish kerakligini ayting.`;

const STR = d => ({ type: "string", description: d });
const OBJ = (props, req) => ({ type: "object", properties: props, required: req || [] });

const ISHLAB_CHIQARISH_TOOLS = [
    { name: "ishlab_chiqarish_holati", description: "Barcha jarayonlar (kesish, payvandlash, yig'ish) dagi vaziyat." },
    { name: "brigadalar_holati", description: "Brigadalar tarkibini ko'rish." },
    { name: "murojaat_qoldirish", description: "Murojaat qoldirish (Masalan ombordan profil so'rash).", parameters: OBJ({ turi: STR("Murojaat turi"), muhimligi: STR("high, medium, low"), sarlavha: STR("Sarlavha"), izoh: STR("Izoh") }, ["turi", "muhimligi", "sarlavha", "izoh"]) },
    { name: "reja_saqlash", description: "Ish rejasini saqlash.", parameters: OBJ({ reja_matni: STR("Reja matni") }, ["reja_matni"]) },
    { name: "reja_korish", description: "Saqlangan ish rejasini ko'rish." }
];

async function execIshlabChiqarishTool(name, args, chatId) {
    switch (name) {
        case "ishlab_chiqarish_holati": return await db.productionReport();
        case "brigadalar_holati": return await db.brigadesReport();
        case "murojaat_qoldirish": return await db.insertMurojaat({ ...args, yuboruvchi: "Ishlab Chiqarish AI" });
        case "reja_saqlash": await stSet("prod_plan_" + chatId, args.reja_matni); return { natija: "Reja muvaffaqiyatli saqlandi." };
        case "reja_korish": return { reja: (await stGet("prod_plan_" + chatId)) || "Reja yo'q." };
        default: return { xato: "Tool topilmadi: " + name };
    }
}

export default async function handler(req, res) {
    if (req.method === "GET") return res.status(200).json({ ok: true, service: "ishlab-chiqarish-ai-chat" });
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method not allowed" });
    let body;
    try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); } catch (e) { return res.status(400).json({ ok: false, error: "bad json" }); }

    const action = body.action;
    const chatId = String(body.chatId || "prod_user");
    try {
        if (action === "chat") {
            const text = String(body.text || "").trim();
            if (!text) return res.status(200).json({ ok: false, error: "empty text" });
            const histKey = "prod_ai_hist_" + chatId;
            const hist = (await stGet(histKey, [])) || [];
            if (!ai.isConfigured()) return res.status(200).json({ ok: true, text: "🤖 AI miya ulanmagan." });
            
            const contents = hist.slice(-12).map(h => ({ role: h.role, parts: [{ text: h.text }] }));
            contents.push({ role: "user", parts: [{ text }] });

            let responseText = "";
            for (let step = 0; step < 5; step++) {
                const content = await ai.chatWithTools(SYSTEM_PROMPT_ISHLAB_CHIQARISH, contents, ISHLAB_CHIQARISH_TOOLS);
                const parts = content.parts || [];
                const fc = parts.find(p => p.functionCall);
                if (fc) {
                    const name = fc.functionCall.name, args = fc.functionCall.args || {};
                    const result = await execIshlabChiqarishTool(name, args, chatId);
                    contents.push({ role: "model", parts: [{ functionCall: fc.functionCall }] });
                    contents.push({ role: "user", parts: [{ functionResponse: { name, response: { natija: result } } }] });
                    continue;
                }
                responseText = parts.map(p => p.text || "").join("").trim();
                break;
            }
            if (!responseText) responseText = "⚠️ Kechirasiz, tarmoqda xatolik yuz berdi.";
            else {
                hist.push({ role: "user", text }); hist.push({ role: "model", text: responseText });
                await stSet(histKey, hist.slice(-16));
            }
            return res.status(200).json({ ok: true, text: responseText });
        }
        return res.status(400).json({ ok: false, error: "unknown action" });
    } catch (e) {
        return res.status(500).json({ ok: false, error: String((e && e.message) || e) });
    }
}
