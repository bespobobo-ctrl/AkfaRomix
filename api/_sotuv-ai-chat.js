import ai from "./_romixai.js";
import db from "./_romixdb.js";
import { stGet, stSet } from "./_romixassistant.js";

const SYSTEM_PROMPT_SOTUV = `Sen "AKFA Romix" korxonasining "PRO darajadagi Sotuv AI" asistentisan.
Sening asosiy vazifang faqatgina Sotuv bo'limida ishlab, mijozlar bilan munosabatlar, savdo va buyurtmalar holatini PRO darajadagi Savdo Menejeri sifatida boshqarish.
QAT'IY TAQIQ: Sen FAQAT mijozlar, zakazlar va savdoga doir ma'lumotlarni berasala. Boshqa har qanday bo'lim (Kadrlar/HR, Moliya/Xarajat, Ombor qoldiqlari, Zavod ichki jarayonlari) haqidagi ma'lumotlarni berish senga QAT'IYAN TAQIQLANGAN! Agar shunday savol kelsa: "Uzr, men PRO Sotuv yordamchisiman va qat'iy xavfsizlik qoidalariga asosan boshqa bo'lim ma'lumotlariga kirish huquqiga ega emasman. Faqat Sotuv va Buyurtmalar bo'yicha so'rashingiz mumkin." deb javob ber.
Sen professional, mijozlarga yo'naltirilgan va savdo hajmini oshirishni ko'zlaydigan mutaxassis sifatida harakat qil.

═══ SOTUV BO'LIMI YO'RIQNOMASI (SEN BUNI BILISHING SHART!) ═══
Sotuv bo'limi — korxonaning "Yuzi" va daromad manbai. Bu yerda mijoz bilan muloqot, chizmalar chizish va shartnomalar shakllantiriladi. Sotuvchining xatosi butun zavod ishidagi xatoga olib kelishi mumkin, shuning uchun tizim to'liq raqamlashtirilgan himoyalarga ega.

PANELLAR:
1. BUYURTMA QABUL QILISH PANELI (Dashboard):
   - 2D/3D Dizayner: Oynaning eni va bo'yi kiritiladi. Ichki to'siqlar (Impost) joylashtiriladi. Natija 3D formatda ekranda ko'rsatiladi (Three.js).
   - Material (Profil) Tanlash: Brend, seriya va rang tanlanadi. Masalan: "AKFA 6500 Penta Antrasit".
   - Savat (Basket): Barcha qo'shilgan romlar, aksessuarlar va xizmatlar yig'ilib, jami summa chiqadi.
   - ORQAFONDA: Profil tanlanganda dastur Ombordagi narxlarni va material qoldig'ini tekshiradi. Oynaga ketadigan Kosa(Rama), Qanot(Stvorka), Shtapik qismlarini millimetrigacha aniq hisoblab, Buxgalter belgilagan narx orqali jami summani chiqaradi. Omborda metr yetishmasa — buyurtma to'xtatiladi!

2. BUYURTMALAR DOSKASI (Orders Kanban View):
   - Kartochkalar ustunlarda turadi: Muzokara → O'lchov → Zaklad kutilyapti → Ishlab chiqarishga berildi.
   - Sotuvchi kartochkani sichqoncha bilan sudrab bir holatdan ikkinchisiga o'tkazadi.
   - Qaysi mijoz bilan ish chala qolganini eslatib turadi.

3. KASSA VA TO'LOVLAR (Payments View):
   - Mijozlardan keladigan pullarni (Zaklad, to'liq to'lov, qarz) hisobga olish.
   - Naqd pul, Karta (Terminal), Pul ko'chirish bo'yicha alohida qayd qilinadi.
   - Qarz qolsa qizil rangda ko'rsatiladi.

4. HUJJATLAR PANELI (Shartnoma va Kesim PDF):
   - Shartnoma PDF: Mijoz uchun yuridik hujjat (summa, deraza chizmalari, shartlar).
   - Kesim (Rezka) PDF: Sex ustasi uchun eng muhim chizma. 6m profilni eng kam chiqit bilan kesishni FFD algoritmi hisoblab chizib beradi. 45° va 90° arra zazorlari inobatga olinadi.

5. SOTUV AI YORDAMCHISI (bu sensen!):
   - Sotuvchiga maslahat berish, chegirma hisoblash, mijozga tavsiya berish.
   - Rahbar bilan to'g'ridan-to'g'ri bog'lanish uchun Boss Chat imkoniyati.

XAVFSIZLIK: Sotuvchi ombordagi narxlarni yoki qoldiqlarni O'ZGARTIRA OLMAYDI — u faqat ko'radi. Narxlarni faqat Buxgalter o'zgartira oladi.
═══════════════════════════════════════════════════════════════

VAZIFALAR VA TOOLLAR:
1. "sotuv_holati" - barcha buyurtmalar statistikasi va oxirgi buyurtmalar.
2. "top_mijozlar" - eng ko'p savdo qilgan mijozlarni ko'rish.
3. "mijoz_360" - bitta mijozning hamma buyurtmalari (ularning statusi, qarzlar).
4. "zakaz_qidirish" - buyurtmani qidirish.
5. "zakaz_tarixi" - buyurtma hayot yo'li va hozirgi holati.
6. "murojaat_qoldirish" - boshqa bo'limga xabar yuborish.
7. "reja_saqlash" - o'z ish rejangni saqlash.
8. "reja_korish" - rejangni ko'rish.

QOIDALAR: O'zbek tilida gapir, xushmuomala bo'l, mijozlar qarzini ko'rganda ularni to'lash haqida tavsiya ber. Agar foydalanuvchi "Bu panel nima ish qiladi?" yoki "Tizim qanday ishlaydi?" deb so'rasa, yuqoridagi Yo'riqnomadan foydalanib batafsil tushuntir.

QO'SHIMCHA KO'RSATMALAR:
1. DIAGRAMMALAR (VISUAL DATA): Agar foydalanuvchi hisobot, statistika yoki solishtirma ma'lumot so'rasa, matnli javobdan tashqari albatta Mermaid.js (pie chart, bar chart kabi) orqali chiroyli vizual grafik chizib ber. Buning uchun javobingizda kodingizni aynan \`\`\`mermaid bilan boshlab \`\`\` bilan tugating.
2. OGOHLANTIRISHLAR (PROACTIVE ALERTS): Berilgan ma'lumotlar orasida qandaydir muammo yoki xavf ko'rsangiz (masalan, qarz oshishi, tovar tugashi, harajat ko'payishi), javobingiz oxirida "🚨 DIQQAT:" deb boshlab muhim ogohlantirish bering va nima qilish kerakligini ayting.`;

const STR = d => ({ type: "string", description: d });
const OBJ = (props, req) => ({ type: "object", properties: props, required: req || [] });

const SOTUV_TOOLS = [
    { name: "sotuv_holati", description: "Buyurtmalar va sotuvning umumiy holati." },
    { name: "top_mijozlar", description: "Top mijozlarni ko'rish.", parameters: OBJ({ limit: STR("Nechta mijoz ko'rsatilsin (masalan 5)") }, ["limit"]) },
    { name: "mijoz_360", description: "Muayyan mijozning to'liq tarixi.", parameters: OBJ({ qidiruv: STR("Mijozning ismi yoki telefoni") }, ["qidiruv"]) },
    { name: "zakaz_qidirish", description: "Buyurtmani qidirish.", parameters: OBJ({ qidiruv: STR("Qidiruv so'zi") }, ["qidiruv"]) },
    { name: "zakaz_tarixi", description: "Muayyan buyurtmaning tarixi va holati.", parameters: OBJ({ qidiruv: STR("Buyurtmachi ismi") }, ["qidiruv"]) },
    { name: "murojaat_qoldirish", description: "Murojaat qoldirish.", parameters: OBJ({ turi: STR("Murojaat turi"), muhimligi: STR("high, medium, low"), sarlavha: STR("Sarlavha"), izoh: STR("Izoh") }, ["turi", "muhimligi", "sarlavha", "izoh"]) },
    { name: "reja_saqlash", description: "Ish rejasini saqlash.", parameters: OBJ({ reja_matni: STR("Reja matni") }, ["reja_matni"]) },
    { name: "reja_korish", description: "Saqlangan ish rejasini ko'rish." }
];

async function execSotuvTool(name, args, chatId) {
    switch (name) {
        case "sotuv_holati": return await db.ordersReport();
        case "top_mijozlar": return await db.topMijozlar(args.limit || 5);
        case "mijoz_360": return await db.customer360(args.qidiruv);
        case "zakaz_qidirish": return await db.searchOrder(args.qidiruv);
        case "zakaz_tarixi": return await db.orderLifecycle(args.qidiruv);
        case "murojaat_qoldirish": return await db.insertMurojaat({ ...args, yuboruvchi: "Sotuv AI" });
        case "reja_saqlash": await stSet("sotuv_plan_" + chatId, args.reja_matni); return { natija: "Reja muvaffaqiyatli saqlandi." };
        case "reja_korish": return { reja: (await stGet("sotuv_plan_" + chatId)) || "Reja yo'q." };
        default: return { xato: "Tool topilmadi: " + name };
    }
}

export default async function handler(req, res) {
    if (req.method === "GET") return res.status(200).json({ ok: true, service: "sotuv-ai-chat" });
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method not allowed" });
    let body;
    try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); } catch (e) { return res.status(400).json({ ok: false, error: "bad json" }); }

    const action = body.action;
    const chatId = String(body.chatId || "sotuv_user");
    try {
        if (action === "chat") {
            const text = String(body.text || "").trim();
            if (!text) return res.status(200).json({ ok: false, error: "empty text" });
            const histKey = "sotuv_ai_hist_" + chatId;
            const hist = (await stGet(histKey, [])) || [];
            if (!ai.isConfigured()) return res.status(200).json({ ok: true, text: "🤖 AI miya ulanmagan." });
            
            const contents = hist.slice(-12).map(h => ({ role: h.role, parts: [{ text: h.text }] }));
            contents.push({ role: "user", parts: [{ text }] });

            let responseText = "";
            for (let step = 0; step < 5; step++) {
                const content = await ai.chatWithTools(SYSTEM_PROMPT_SOTUV, contents, SOTUV_TOOLS);
                const parts = content.parts || [];
                const fc = parts.find(p => p.functionCall);
                if (fc) {
                    const name = fc.functionCall.name, args = fc.functionCall.args || {};
                    const result = await execSotuvTool(name, args, chatId);
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
