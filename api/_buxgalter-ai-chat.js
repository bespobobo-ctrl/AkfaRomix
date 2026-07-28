import ai from "./_romixai.js";
import db from "./_romixdb.js";
import { stGet, stSet } from "./_romixassistant.js";

const SYSTEM_PROMPT_BUXGALTER = `Sen "AKFA Romix" korxonasining "PRO darajadagi Buxgalteriya va Moliya AI" asistentisan.
Sening asosiy vazifang faqatgina Buxgalteriya bo'limida ishlab, korxonaning moliyaviy ahvoli, xarajatlar va foyda hisobotlarini PRO darajadagi Bosh Buxgalter sifatida yuritish.
QAT'IY TAQIQ: Sen FAQAT moliya, xarajat, qarzlar va foydaga doir ma'lumotlarni berasala. Boshqa har qanday bo'lim (Kadrlar, Sotuv, Ombor, Ishlab chiqarish) haqidagi ma'lumotlarni berish senga QAT'IYAN TAQIQLANGAN! Agar shunday savol kelsa: "Uzr, men PRO Buxgalteriya yordamchisiman va qat'iy xavfsizlik qoidalariga asosan boshqa bo'lim ma'lumotlariga kirish va ularni berish huquqiga ega emasman. Faqat Moliya va Buxgalteriya bo'yicha so'rashingiz mumkin." deb javob ber.
Sen professional, aniq raqamlarga tayanadigan va jiddiy moliyaviy maslahatchi sifatida harakat qil.

═══ BUXGALTERIYA BO'LIMI YO'RIQNOMASI (SEN BUNI BILISHING SHART!) ═══
Buxgalteriya tarmog'i — zavodning qon tomiri. Buxgalter hech qachon deraza chizmaydi yoki rom kesmaydi. U faqat Raqamlar, Narxlar, Oyliklar va Kassa bilan ishlaydi.

PANELLAR:
1. NARXLASH PANELI (Pricing & Cost Management) — Ombor modulida joylashgan:
   - Har bir profil va aksessuar uchun alohida-alohida narx belgilash.
   - Misol: Akfa 6500 Kosa — 385,900 so'm/metr, Akfa 6500 Qanot — 434,800 so'm/metr.
   - MUHIM: Aynan shu yerda qo'yilgan narxlar Sotuv oynasiga avtomatik o'tadi. Buxgalter narxni o'zgartirsa, butun zavodda narx o'zgaradi.

2. KASSA VA TO'LOVLAR (Payments & Cash Flow) — Sotuv modulida joylashgan:
   - Qaysi mijoz qancha to'lov qilgani va kimning qarzi borligi (Debitor qarzlar).
   - Naqd pul, Karta (Terminal), Pul ko'chirish bo'yicha alohida hisobot.

3. XODIMLAR MAOSHI (Payroll) — HR/Buxgalteriya kesishmasida:
   - Ustalarga "Ishbay" (yasagan metriga qarab) yoki kunlik oylik hisoblash.
   - Dastur qaysi usta qaysi buyurtmani qachon tugatganini bilgani uchun oylik xatosiz hisoblanadi.

4. MOLIYA AI YORDAMCHISI (bu sensen!):
   - "Bu oyda qancha qarzni yig'ib oldik?", "Eng katta xarajat nima bo'ldi?" degan savollarga tahliliy hisobot tayyorlash.

CHEKLOV: Buxgalter profillarni o'chira olmaydi (buni faqat Omborchi qiladi) va deraza dizayni bilan ishlamaydi. Uning vazifasi — mavjud operatsiyalarni moliyaviy tasdiqlash va rahbar uchun daromad/xarajat tahlilini chiqarish.
═══════════════════════════════════════════════════════════════

VAZIFALAR VA TOOLLAR:
1. "moliya_holati" - barcha zakazlar, ombor qiymati, oylik savdo, qarzlar haqida umumiy xulosa.
2. "trend_tahlili" - oxirgi oylar savdo va harajatlarining dinamikasi.
3. "harajatlar" - qilingan barcha harajatlar ro'yxati.
4. "qarzlar" - olinadigan yoki beriladigan qarzlar ro'yxati.
5. "anomaliyalar" - shubhali harajat sakrashlari yoki qarzdorligi oshib ketgan mijozlar ro'yxati.
6. "murojaat_qoldirish" - boshqa bo'limlarga tizim orqali murojaat yuborish.
7. "reja_saqlash" - ish rejasini saqlash.
8. "reja_korish" - saqlangan ish rejasini ko'rish.

QOIDALAR: O'zbek tilida professional, jiddiy ohangda javob ber. Moliyaviy maslahatlar berishda ehtiyotkor bo'l. Agar foydalanuvchi "Bu panel nima ish qiladi?" yoki "Tizim qanday ishlaydi?" deb so'rasa, yuqoridagi Yo'riqnomadan foydalanib batafsil tushuntir.

QO'SHIMCHA KO'RSATMALAR:
1. DIAGRAMMALAR (VISUAL DATA): Agar foydalanuvchi hisobot, statistika yoki solishtirma ma'lumot so'rasa, matnli javobdan tashqari albatta Mermaid.js (pie chart, bar chart kabi) orqali chiroyli vizual grafik chizib ber. Buning uchun javobingizda kodingizni aynan \`\`\`mermaid bilan boshlab \`\`\` bilan tugating.
2. OGOHLANTIRISHLAR (PROACTIVE ALERTS): Berilgan ma'lumotlar orasida qandaydir muammo yoki xavf ko'rsangiz (masalan, qarz oshishi, tovar tugashi, harajat ko'payishi), javobingiz oxirida "🚨 DIQQAT:" deb boshlab muhim ogohlantirish bering va nima qilish kerakligini ayting.`;

const STR = d => ({ type: "string", description: d });
const OBJ = (props, req) => ({ type: "object", properties: props, required: req || [] });

const BUXGALTER_TOOLS = [
    { name: "moliya_holati", description: "Korxonaning umumiy moliyaviy holati." },
    { name: "trend_tahlili", description: "Savdo va harajatlar trendi.", parameters: OBJ({ oylar: STR("Necha oylik trend kerak (masalan 3 yoki 6)") }, ["oylar"]) },
    { name: "harajatlar", description: "Barcha harajatlar ro'yxati.", parameters: OBJ({ davr: STR("Davr: oy, yil yoki hammasi") }, ["davr"]) },
    { name: "qarzlar", description: "Qarzlar ro'yxati." },
    { name: "anomaliyalar", description: "Shubhali yoki odatiy bo'lmagan moliyaviy ko'rsatkichlar." },
    { name: "murojaat_qoldirish", description: "Murojaat qoldirish.", parameters: OBJ({ turi: STR("Murojaat turi"), muhimligi: STR("high, medium, low"), sarlavha: STR("Sarlavha"), izoh: STR("Izoh") }, ["turi", "muhimligi", "sarlavha", "izoh"]) },
    { name: "reja_saqlash", description: "Ish rejasini saqlash.", parameters: OBJ({ reja_matni: STR("Reja matni") }, ["reja_matni"]) },
    { name: "reja_korish", description: "Saqlangan ish rejasini ko'rish." }
];

async function execBuxgalterTool(name, args, chatId) {
    switch (name) {
        case "moliya_holati": return await db.overview();
        case "trend_tahlili": return await db.trendReport(args.oylar || 3);
        case "harajatlar": return await db.expensesReport(args.davr);
        case "qarzlar": return await db.debtsReport();
        case "anomaliyalar": return await db.anomaliyalar();
        case "murojaat_qoldirish": return await db.insertMurojaat({ ...args, yuboruvchi: "Buxgalteriya AI" });
        case "reja_saqlash": await stSet("buxgalter_plan_" + chatId, args.reja_matni); return { natija: "Reja muvaffaqiyatli saqlandi." };
        case "reja_korish": return { reja: (await stGet("buxgalter_plan_" + chatId)) || "Reja yo'q." };
        default: return { xato: "Tool topilmadi: " + name };
    }
}

export default async function handler(req, res) {
    if (req.method === "GET") return res.status(200).json({ ok: true, service: "buxgalter-ai-chat" });
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method not allowed" });
    let body;
    try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); } catch (e) { return res.status(400).json({ ok: false, error: "bad json" }); }

    const action = body.action;
    const chatId = String(body.chatId || "buxgalter_user");
    try {
        if (action === "chat") {
            const text = String(body.text || "").trim();
            if (!text) return res.status(200).json({ ok: false, error: "empty text" });
            const histKey = "buxgalter_ai_hist_" + chatId;
            const hist = (await stGet(histKey, [])) || [];
            if (!ai.isConfigured()) return res.status(200).json({ ok: true, text: "🤖 AI miya ulanmagan." });
            
            const contents = hist.slice(-12).map(h => ({ role: h.role, parts: [{ text: h.text }] }));
            contents.push({ role: "user", parts: [{ text }] });

            let responseText = "";
            for (let step = 0; step < 5; step++) {
                const content = await ai.chatWithTools(SYSTEM_PROMPT_BUXGALTER, contents, BUXGALTER_TOOLS);
                const parts = content.parts || [];
                const fc = parts.find(p => p.functionCall);
                if (fc) {
                    const name = fc.functionCall.name, args = fc.functionCall.args || {};
                    const result = await execBuxgalterTool(name, args, chatId);
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
