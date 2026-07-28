import ai from "./_romixai.js";
import db from "./_romixdb.js";
import { stGet, stSet } from "./_romixassistant.js";

const SYSTEM_PROMPT_HR = `Sen "AKFA Romix" korxonasining "PRO darajadagi HR (Kadrlar) AI" asistentisan.
Sening asosiy vazifang faqatgina Kadrlar bo'limida ishlab, xodimlar, davomat, oylik fondi va ish samaradorligini PRO darajadagi HR Direktor sifatida boshqarish.
QAT'IY TAQIQ: Sen FAQAT xodimlar va ularning faoliyatiga doir ma'lumotlarni berasala. Boshqa har qanday bo'lim (Sotuv, Moliya, Xarajat, Ombor, Ishlab chiqarish) haqidagi ma'lumotlarni berish senga QAT'IYAN TAQIQLANGAN! Agar shunday savol kelsa: "Uzr, men PRO HR yordamchisiman va qat'iy xavfsizlik qoidalariga asosan boshqa bo'lim ma'lumotlariga kirish va ularni berish huquqiga ega emasman. Faqat Xodimlar va Kadrlar masalasida so'rashingiz mumkin." deb javob ber.
Sen professional, xodimlarga g'amxo'r, lekin tartib-intizomni talab qiluvchi mutaxassis sifatida harakat qil.

VAZIFALAR VA TOOLLAR:
1. "xodimlar_holati" - barcha xodimlar statistikasi, oylik fondi va davomatini ko'rish.
2. "xodim_qidirish" - ism bo'yicha bitta xodimni qidirish.
3. "xodim_360" - bitta xodimning barcha ma'lumotlari (davomat, ishlagan ishlari, oyligi) ko'rish.
4. "murojaat_qoldirish" - boshqa bo'limlarga tizim orqali rasmiy murojaat yozish.
5. "reja_saqlash" - kuningizni rejalashtirish uchun saqlash.
6. "reja_korish" - oxirgi saqlangan ish rejasini o'qish.

QOIDALAR: O'zbek tilida, qisqa, aniq gapir va ma'lumotlarni chiroyli Markdown jadval yoki ro'yxat qilib ber.

QO'SHIMCHA KO'RSATMALAR:
1. DIAGRAMMALAR (VISUAL DATA): Agar foydalanuvchi hisobot, statistika yoki solishtirma ma'lumot so'rasa, matnli javobdan tashqari albatta Mermaid.js (pie chart, bar chart kabi) orqali chiroyli vizual grafik chizib ber. Buning uchun javobingizda kodingizni aynan ```mermaid bilan boshlab ``` bilan tugating.
2. OGOHLANTIRISHLAR (PROACTIVE ALERTS): Berilgan ma'lumotlar orasida qandaydir muammo yoki xavf ko'rsangiz (masalan, qarz oshishi, tovar tugashi, harajat ko'payishi), javobingiz oxirida "🚨 DIQQAT:" deb boshlab muhim ogohlantirish bering va nima qilish kerakligini ayting.`;

const STR = d => ({ type: "string", description: d });
const OBJ = (props, req) => ({ type: "object", properties: props, required: req || [] });

const HR_TOOLS = [
    { name: "xodimlar_holati", description: "Barcha xodimlar, davomat va oylik fondi statistikasi." },
    { name: "xodim_qidirish", description: "Ismi bo'yicha xodim qidirish.", parameters: OBJ({ qidiruv: STR("Xodimning ismi") }, ["qidiruv"]) },
    { name: "xodim_360", description: "Muayyan xodimning hamma ma'lumotlari (davomat, ishi, oyligi).", parameters: OBJ({ qidiruv: STR("Xodimning ismi") }, ["qidiruv"]) },
    { name: "murojaat_qoldirish", description: "Murojaat qoldirish.", parameters: OBJ({ turi: STR("Murojaat turi"), muhimligi: STR("high, medium, low"), sarlavha: STR("Sarlavha"), izoh: STR("Izoh") }, ["turi", "muhimligi", "sarlavha", "izoh"]) },
    { name: "reja_saqlash", description: "Ish rejasini saqlash.", parameters: OBJ({ reja_matni: STR("Reja matni") }, ["reja_matni"]) },
    { name: "reja_korish", description: "Saqlangan ish rejasini ko'rish." }
];

async function execHrTool(name, args, chatId) {
    switch (name) {
        case "xodimlar_holati": return await db.hrReport();
        case "xodim_qidirish": return await db.searchEmployee(args.qidiruv);
        case "xodim_360": return await db.employee360(args.qidiruv);
        case "murojaat_qoldirish": return await db.insertMurojaat({ ...args, yuboruvchi: "HR AI" });
        case "reja_saqlash": await stSet("hr_plan_" + chatId, args.reja_matni); return { natija: "Reja muvaffaqiyatli saqlandi." };
        case "reja_korish": return { reja: (await stGet("hr_plan_" + chatId)) || "Reja yo'q." };
        default: return { xato: "Tool topilmadi: " + name };
    }
}

export default async function handler(req, res) {
    if (req.method === "GET") return res.status(200).json({ ok: true, service: "hr-ai-chat" });
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method not allowed" });
    let body;
    try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); } catch (e) { return res.status(400).json({ ok: false, error: "bad json" }); }

    const action = body.action;
    const chatId = String(body.chatId || "hr_user");
    try {
        if (action === "chat") {
            const text = String(body.text || "").trim();
            if (!text) return res.status(200).json({ ok: false, error: "empty text" });
            const histKey = "hr_ai_hist_" + chatId;
            const hist = (await stGet(histKey, [])) || [];
            if (!ai.isConfigured()) return res.status(200).json({ ok: true, text: "🤖 AI miya ulanmagan." });
            
            const contents = hist.slice(-12).map(h => ({ role: h.role, parts: [{ text: h.text }] }));
            contents.push({ role: "user", parts: [{ text }] });

            let responseText = "";
            for (let step = 0; step < 5; step++) {
                const content = await ai.chatWithTools(SYSTEM_PROMPT_HR, contents, HR_TOOLS);
                const parts = content.parts || [];
                const fc = parts.find(p => p.functionCall);
                if (fc) {
                    const name = fc.functionCall.name, args = fc.functionCall.args || {};
                    const result = await execHrTool(name, args, chatId);
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
