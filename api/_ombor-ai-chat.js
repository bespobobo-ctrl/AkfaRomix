import ai from "./_romixai.js";
import db from "./_romixdb.js";
import { stGet, stSet } from "./_romixassistant.js";

const SYSTEM_PROMPT_OMBOR = `Sen "AKFA Romix" korxonasining "Ombor AI" asistentisan.
Sening asosiy vazifang OMBOR xodimlari va Ombor Mudiriga yordam berish.
Senda faqat Ombor bilan bog'liq bo'lgan (zaxiralar, tarix, ish rejalari, murojaatlar) ma'lumotlar bor.
MUHIM CHEKLOV: Sen SOTUV, MOLIYA (harajat/qarz), HR (xodimlar oyligi) va BOSHQA bo'limlarga umuman kira olmaysan va bu haqdagi savollarga javob bera olmaysan. Agar foydalanuvchi "harajatlar", "qarz", "zakaz" kabi narsalarni so'rasa: "Men faqat Ombor bo'yicha ma'lumotlarga egaman va boshqa bo'lim ma'lumotlarini taqdim eta olmayman" deb qat'iy javob ber.

VAZIFALAR VA TOOLLAR:
1. "ombor_holati" - barcha profillar, aksessuarlar, oynak qoldiqlarini bilish uchun (ombor zaxirasi so'ralganda chaqir).
2. "mahsulot_tarixi" - muayyan mahsulotning qachon kelib, qachon chiqqanligi tarixini bilish uchun ('qidiruv' parametri bilan chaqir).
3. "murojaat_qoldirish" - ertangi kun uchun yoki shoshilinch ravishda rahbariyat/boshqa bo'limga murojaat (so'rov) qoldirish uchun chaqir. Bu haqiqiy ma'lumotlar bazasiga yoziladi.
4. "reja_saqlash" - ertangi kun yoki boshqa vaqt uchun "ish rejasi" (to-do) tuzishni so'rashganda, rejani yozib saqlash uchun chaqir. Reja saqlanadi.
5. "reja_korish" - avval tuzilgan ish rejalarini o'qish uchun chaqir.

QOIDALAR:
- O'zbek tilida, qisqa, aniq va professional ohangda gapir.
- Foydalanuvchi muammoni aytganda maslahat ber yoki Murojaat qoldirishni taklif qil.
- Markdown ishlat, chiroyli ro'yxatlar qil.
- Foydalanuvchilar sendan qanday mahsulotlar qolganligini so'rashi mumkin, bunda 'ombor_holati' ni chaqirib aniq javob ber.
- Boshqa bo'limlar haqida gaplashish qat'iyan man etiladi.
`;

const STR = d => ({ type: "string", description: d });
const OBJ = (props, req) => ({ type: "object", properties: props, required: req || [] });

const OMBOR_TOOLS = [
    { name: "ombor_holati", description: "Ombordagi joriy barcha zaxiralar: profil, aksessuar, qoldiq va oynak." },
    { name: "mahsulot_tarixi", description: "Bitta aniq mahsulotning kirim va chiqim tarixini bazadan qidirish.", parameters: OBJ({ qidiruv: STR("Mahsulotning nomi, masalan '6000 oq'") }, ["qidiruv"]) },
    { name: "murojaat_qoldirish", description: "Tizimga rasmiy murojaat yoki so'rov kiritish (masalan 'Oq profil kam qoldi, iltimos olib keling' deb murojaat kiritish).", parameters: OBJ({ turi: STR("Murojaat turi: 'Material Yetishmovchiligi' yoki 'Texnik / Uskuna Murojaati'"), muhimligi: STR("'high' (shoshilinch), 'medium' (o'rta) yoki 'low' (oddiy)"), sarlavha: STR("Murojaatning qisqacha mazmuni"), izoh: STR("Batafsil izoh") }, ["turi", "muhimligi", "sarlavha", "izoh"]) },
    { name: "reja_saqlash", description: "Ertangi kun (yoki boshqa vaqt) uchun ish rejasini yozib qoldirish.", parameters: OBJ({ reja_matni: STR("Ish rejasining to'liq matni (xronologik yoki ro'yxat tarzida)") }, ["reja_matni"]) },
    { name: "reja_korish", description: "Oxirgi marta saqlab qo'yilgan ish rejasini ko'rish." }
];

async function execOmborTool(name, args, chatId) {
    switch (name) {
        case "ombor_holati":
            return await db.warehouse();
        case "mahsulot_tarixi":
            return await db.mahsulotTarixi(args.qidiruv);
        case "murojaat_qoldirish":
            return await db.insertMurojaat({ ...args, yuboruvchi: "Ombor AI" });
        case "reja_saqlash":
            await stSet("ombor_plan_" + chatId, args.reja_matni);
            return { natija: "Reja muvaffaqiyatli saqlandi." };
        case "reja_korish":
            const reja = await stGet("ombor_plan_" + chatId);
            return { reja: reja || "Hozircha hech qanday reja tuzilmagan." };
        default:
            return { xato: "Bunday tool yo'q: " + name };
    }
}

export default async function handler(req, res) {
    if (req.method === "GET") return res.status(200).json({ ok: true, service: "ombor-ai-chat" });
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method not allowed" });

    let body;
    try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); }
    catch (e) { return res.status(400).json({ ok: false, error: "bad json" }); }

    const action = body.action;
    const chatId = String(body.chatId || "ombor_123");

    try {
        if (action === "chat") {
            const text = String(body.text || "").trim();
            if (!text) return res.status(200).json({ ok: false, error: "empty text" });
            
            const histKey = "ombor_ai_hist_" + chatId;
            const hist = (await stGet(histKey, [])) || [];
            
            if (!ai.isConfigured()) return res.status(200).json({ ok: true, text: "🤖 AI miya ulanmagan. Administrator GEMINI_API_KEY ni qo'shsa ishlaydi." });
            
            const contents = hist.slice(-12).map(h => ({ role: h.role, parts: [{ text: h.text }] }));
            contents.push({ role: "user", parts: [{ text }] });

            let responseText = "";
            for (let step = 0; step < 5; step++) {
                const content = await ai.chatWithTools(SYSTEM_PROMPT_OMBOR, contents, OMBOR_TOOLS);
                const parts = content.parts || [];
                const fc = parts.find(p => p.functionCall);
                if (fc) {
                    const name = fc.functionCall.name, args = fc.functionCall.args || {};
                    const result = await execOmborTool(name, args, chatId);
                    contents.push({ role: "model", parts: [{ functionCall: fc.functionCall }] });
                    contents.push({ role: "user", parts: [{ functionResponse: { name, response: { natija: result } } }] });
                    continue;
                }
                responseText = parts.map(p => p.text || "").join("").trim();
                break;
            }
            
            if (!responseText) {
                responseText = "⚠️ Kechirasiz, tarmoqda xatolik yuz berdi.";
            } else {
                hist.push({ role: "user", text }); 
                hist.push({ role: "model", text: responseText });
                await stSet(histKey, hist.slice(-16));
            }

            return res.status(200).json({ ok: true, text: responseText });
        }

        return res.status(400).json({ ok: false, error: "unknown action" });
    } catch (e) {
        console.error("[OMBOR-AI-CHAT ERROR]", e);
        return res.status(500).json({ ok: false, error: String((e && e.message) || e) });
    }
}
