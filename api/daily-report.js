import fetch from 'node-fetch';
import db from './_romixdb.js';
import ai from './_romixai.js';

const TOKEN = process.env.ROMIX_BOT_TOKEN || "";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://dzsswblbpnjuluyqvewt.supabase.co";
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk";

const SBH = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, "Content-Type": "application/json" };

const fmt = n => Math.round(Number(n) || 0).toLocaleString("uz-UZ") + " so'm";
const esc = t => String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function send(chatId, text) {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" })
    });
}

export default async function handler(req, res) {
    if (req.method !== "POST" && req.method !== "GET") {
        return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    try {
        const now = new Date();
        const uzTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
        const todayStr = uzTime.toISOString().split('T')[0];

        // 1. Get auth chats
        const stateRes = await fetch(`${SUPABASE_URL}/rest/v1/romix_bot_state?key=eq.auth&select=value`, { headers: SBH });
        const stateData = await stateRes.json();
        const auth = (stateData && stateData[0]) ? stateData[0].value : [];
        if (!auth || !auth.length) {
            return res.status(200).json({ ok: true, message: "No authorized chats found" });
        }

        // 2. Fetch today's sales orders
        const ordersRes = await fetch(`${SUPABASE_URL}/rest/v1/sales_orders?select=created_at,total_price,paid_amount,payment_history&order=created_at.desc`, { headers: SBH });
        const orders = await ordersRes.json();
        
        const todayOrders = orders.filter(o => (o.created_at || '').startsWith(todayStr));
        const newOrdersCount = todayOrders.length;
        const newOrdersSum = todayOrders.reduce((s, o) => s + (Number(o.total_price) || 0), 0);

        // 3. Fetch today's customer payments
        let tushum = 0;
        orders.forEach(o => {
            const history = Array.isArray(o.payment_history) ? o.payment_history : [];
            history.forEach(p => {
                if (p.at && p.at.startsWith(todayStr)) {
                    tushum += (Number(p.amount) || 0);
                }
            });
            // If payment_history is empty but order was created today with initial paid_amount
            if (history.length === 0 && (o.created_at || '').startsWith(todayStr)) {
                tushum += (Number(o.paid_amount) || 0);
            }
        });

        // 4. Fetch today's expenses
        const expRes = await fetch(`${SUPABASE_URL}/rest/v1/romix_expenses?date=eq.${todayStr}&select=amount`, { headers: SBH });
        const expenses = await expRes.json();
        const jamiHarajat = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

        // 5. Fetch today's production log
        const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/romix_production_log?date=eq.${todayStr}&select=quantity`, { headers: SBH });
        const prodLogs = await prodRes.json();
        const jamiTayyor = prodLogs.reduce((s, p) => s + (Number(p.quantity) || 0), 0);

        // 6. Fetch today's attendance & employees
        const empsRes = await fetch(`${SUPABASE_URL}/rest/v1/employees?select=id,full_name,status`, { headers: SBH });
        const employees = await empsRes.json();
        
        const attRes = await fetch(`${SUPABASE_URL}/rest/v1/attendance?date=eq.${todayStr}&select=employee_id`, { headers: SBH });
        const attendance = await attRes.json();

        const activeEmployees = employees.filter(e => e.status !== 'noactive');
        const attendedIds = new Set(attendance.map(a => a.employee_id));
        const absentEmployees = activeEmployees.filter(e => !attendedIds.has(e.id));

        // Format absent employee list
        const absentListText = absentEmployees.length
            ? absentEmployees.map((e, idx) => `${idx + 1}. <b>${esc(e.full_name)}</b>`).join('\n')
            : "✅ Hamma xodimlar kelgan";

        // Build report message
        const reportMsg = 
            `📊 <b>KUN YAKUNI HISOBOTI</b> (Sana: <code>${todayStr}</code>)\n\n` +
            `🛒 <b>Bugungi yangi zakazlar:</b>\n` +
            `• Soni: <b>${newOrdersCount} ta</b>\n` +
            `• Umumiy summasi: <b>${fmt(newOrdersSum)}</b>\n\n` +
            `💰 <b>Bugungi tushum (kassaga kirgan pul):</b>\n` +
            `• Jami: <b>${fmt(tushum)}</b>\n\n` +
            `💸 <b>Bugungi chiqim (harajatlar):</b>\n` +
            `• Jami: <b>${fmt(jamiHarajat)}</b>\n\n` +
            `🏭 <b>Bugun ishlab chiqarishda tayyorlangan mahsulotlar:</b>\n` +
            `• Soni: <b>${jamiTayyor} dona</b>\n\n` +
            `👥 <b>Bugun ishga kelmaganlar:</b>\n` +
            `${absentListText}`;

        // 7. Diqqatga molik narsalar bo'lsa — AI orqali qisqa proaktiv ogohlantirish tuzish
        let alertMsg = null;
        try {
            const [alerts, trend, anomalies] = await Promise.all([db.eslatmalar(), db.trendReport(2), db.anomaliyalar()]);
            const hasAlerts = (alerts.muddati_otgan_qarzlar || []).length
                || (alerts.kechikkan_buyurtmalar || []).length
                || (alerts.kam_qolgan_mahsulotlar || []).length;
            const hasAnomalies = (anomalies.harajat_sakrashi || []).length
                || (anomalies.mijoz_tolov_ogishi || []).length
                || (anomalies.brigada_sustligi || []).length;
            const change = trend.shu_oy_savdo_ozgarishi_foizda;
            const badTrend = typeof change === "number" && change <= -15;
            if ((hasAlerts || hasAnomalies || badTrend) && ai.isConfigured()) {
                const prompt = `Quyida "AKFA Romix" korxonasining bugungi diqqatga molik ma'lumotlari va nostandart naqshlari (JSON) berilgan. Shu asosida egasiga QISQA (4-6 qatordan oshmasin), professional, harakatga chorlaydigan ogohlantirish xabari yoz. Telegram uchun HTML formatda (faqat <b>qalin</b>), "🔔 <b>Diqqat kerak</b>" bilan boshla. Faqat haqiqiy muammolarni ayt, bo'sh gap yozma.\n\nMA'LUMOT: ${JSON.stringify({ alerts, anomalies, savdo_ozgarishi_foizda: change })}`;
                alertMsg = await ai.chatText("Sen qisqa va aniq yozadigan biznes maslahatchisan.", prompt);
                if (alertMsg) alertMsg = alertMsg.trim();
            }
        } catch (err) {
            console.error('Proactive alert build error:', err);
        }

        // Send report (+ proaktiv ogohlantirish bo'lsa) barcha avtorizatsiyadan o'tgan chatlarga
        for (const chatId of auth) {
            try {
                await send(chatId, reportMsg);
                if (alertMsg) await send(chatId, alertMsg);
            } catch (err) {
                console.error(`Failed to send daily report to ${chatId}:`, err);
            }
        }

        res.status(200).json({ ok: true, sent: auth.length, date: todayStr, alert: !!alertMsg });
    } catch (e) {
        console.error('Daily report handler error:', e);
        res.status(500).json({ ok: false, error: e.message });
    }
}
