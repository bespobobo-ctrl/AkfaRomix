const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Har bir bo'lim AI chatiga yuborilgan savol/javobni ai_query_log jadvaliga yozadi —
// Romix Kotibasi (desktop) shu orqali "xodimlar bo'limlarda AI'dan nima so'rashyapti"
// deb hisobot bera oladi. Best-effort: log yozilmasa ham haqiqiy javob foydalanuvchiga
// to'siqsiz yetib boradi (await qilinadi, lekin xatosi javobni to'xtatmaydi).
async function logAiQuery(dept, body, payload) {
    if (!SUPABASE_URL || !ANON_KEY) return;
    if (!body || body.action !== 'chat' || !body.text) return;
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/ai_query_log`, {
            method: 'POST',
            headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source: dept,
                user_id: body.userId ? String(body.userId) : null,
                user_name: body.userName || null,
                user_role: body.userRole || null,
                question: body.text,
                answer: payload && payload.ok ? payload.text || null : null
            })
        });
    } catch (e) {
        console.warn('[UNIFIED-CHAT] ai_query_log yozishda xato (javobga ta\'sir qilmaydi):', e);
    }
}

export default async function handler(req, res) {
    const dept = req.query.dept || 'romix';
    let module;
    try {
        if (dept === 'hr') module = await import('./_hr-ai-chat.js');
        else if (dept === 'sotuv') module = await import('./_sotuv-ai-chat.js');
        else if (dept === 'ishlab') module = await import('./_ishlab-chiqarish-ai-chat.js');
        else if (dept === 'buxgalter') module = await import('./_buxgalter-ai-chat.js');
        else if (dept === 'ombor') module = await import('./_ombor-ai-chat.js');
        else module = await import('./_romix-ai-chat.js');

        const originalJson = res.json.bind(res);
        res.json = async (payload) => {
            await logAiQuery(dept, req.body, payload);
            return originalJson(payload);
        };

        return module.default(req, res);
    } catch (e) {
        console.error("Unified Router Error:", e);
        return res.status(500).json({ ok: false, error: "Internal router error: " + String(e) });
    }
}
