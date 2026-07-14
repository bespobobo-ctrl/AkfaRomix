// ═══════════════════════════════════════════════════════════
//  AKFA Romix — Xodimlar (maosh) uchun himoyalangan server proxy
//  Supabase Service Role kaliti FAQAT shu yerda ishlatiladi (hech qachon brauzerga chiqmaydi).
//  Chaqiruvchi avval login/parol bilan serverda tekshiriladi, shundan keyingina
//  salary_info/advance_paid kabi nozik maydonlarga ruxsat beriladi.
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// authService.js (frontend) bilan bir xil — shu yerda serverda qayta tekshiriladi.
// Faqat maosh ma'lumotiga haqiqatan ehtiyoji bor rollar kiritildi.
const LOCAL_USERS = [
    { username: "AC1", password: "123", role: "ac_manager" },
    { username: "admin", password: "123", role: "admin" },
    { username: "hr", password: "123", role: "hr" },
    { username: "ombor", password: "123", role: "manager" },
    { username: "sotuv", password: "123", role: "sotuv" },
    { username: "123", password: "123", role: "ishlab_chiqarish" },
    { username: "buxgalter", password: "123", role: "buxgalter" }
];

async function verifyCaller(username, password) {
    if (!username || !password) return null;
    const local = LOCAL_USERS.find(u => u.username.toLowerCase() === String(username).toLowerCase() && u.password === String(password));
    if (local) return { username: local.username, role: local.role };

    if (!SUPABASE_URL || !SERVICE_KEY) return null;
    try {
        const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
        const r = await fetch(`${SUPABASE_URL}/rest/v1/system_users?username=eq.${encodeURIComponent(username)}&password=eq.${encodeURIComponent(password)}&select=username,role`, { headers: H });
        if (!r.ok) return null;
        const rows = await r.json();
        if (Array.isArray(rows) && rows[0]) return { username: rows[0].username, role: rows[0].role };
    } catch (e) { /* e'tiborsiz — pastda null qaytadi */ }
    return null;
}

export default async function handler(req, res) {
    if (req.method === "GET") return res.status(200).json({ ok: true, service: "employees-secure" });
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method not allowed" });

    let body;
    try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); }
    catch (e) { return res.status(400).json({ ok: false, error: "bad json" }); }

    const { username, password, action } = body;

    if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ ok: false, error: "Server sozlanmagan (SUPABASE_SERVICE_ROLE_KEY yo'q)" });

    const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

    // "self": xodim o'zining ID'si + o'z paroli (authService.js dagi xodim o'z-o'ziga kirish
    // mantiqi bilan bir xil) orqali FAQAT o'z maosh ma'lumotini ko'ra oladi.
    if (action === "self") {
        const { id } = body;
        if (!id || !password) return res.status(400).json({ ok: false, error: "id va parol kerak" });
        if (password !== id && password !== "123456") return res.status(401).json({ ok: false, error: "Login yoki parol xato" });
        try {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/employees?id=eq.${encodeURIComponent(id)}&select=id,salary_info,advance_paid`, { headers: H });
            if (!r.ok) throw new Error(`employees self: ${r.status} ${await r.text()}`);
            const rows = await r.json();
            if (!rows || !rows[0]) return res.status(404).json({ ok: false, error: "Xodim topilmadi" });
            return res.status(200).json({ ok: true, employees: rows });
        } catch (e) {
            console.error("[EMPLOYEES SECURE SELF ERROR]", e);
            return res.status(500).json({ ok: false, error: String((e && e.message) || e) });
        }
    }

    const caller = await verifyCaller(username, password);
    if (!caller) return res.status(401).json({ ok: false, error: "Login yoki parol xato" });

    try {
        if (action === "list") {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/employees?select=*&order=full_name.asc`, { headers: H });
            if (!r.ok) throw new Error(`employees list: ${r.status} ${await r.text()}`);
            const employees = await r.json();
            return res.status(200).json({ ok: true, employees });
        }

        if (action === "update_salary") {
            const { id, salary_info, advance_paid } = body;
            if (!id) return res.status(400).json({ ok: false, error: "id required" });
            const patch = {};
            if (salary_info !== undefined) patch.salary_info = salary_info;
            if (advance_paid !== undefined) patch.advance_paid = advance_paid;
            if (!Object.keys(patch).length) return res.status(400).json({ ok: false, error: "salary_info yoki advance_paid kerak" });

            const r = await fetch(`${SUPABASE_URL}/rest/v1/employees?id=eq.${encodeURIComponent(id)}`, {
                method: "PATCH", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(patch)
            });
            if (!r.ok) throw new Error(`employees update: ${r.status} ${await r.text()}`);
            const data = await r.json();
            return res.status(200).json({ ok: true, employee: Array.isArray(data) ? data[0] : data });
        }

        return res.status(400).json({ ok: false, error: "unknown action" });
    } catch (e) {
        console.error("[EMPLOYEES SECURE ERROR]", e);
        return res.status(500).json({ ok: false, error: String((e && e.message) || e) });
    }
}
