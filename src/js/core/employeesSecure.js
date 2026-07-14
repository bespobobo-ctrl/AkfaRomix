// Xodimlar maoshi (salary_info/advance_paid) uchun himoyalangan server proxy bilan ishlash.
// Supabase'ga to'g'ridan-to'g'ri anon-kalit orqali emas — /api/employees-secure orqali,
// joriy login/parol serverda qayta tekshirilgandan keyingina ma'lumot qaytadi.

function currentUserObj() {
    try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); }
    catch (e) { return null; }
}

// {[id]: {salary_info, advance_paid}} ko'rinishida xarita qaytaradi. Muvaffaqiyatsiz bo'lsa — bo'sh xarita.
// 'employee' roli — faqat o'zining yozuvini oladi ('self'); boshqa rollar — to'liq ro'yxatni ('list').
export async function fetchEmployeeSalaryMap() {
    const u = currentUserObj();
    if (!u || !u.password) return {};
    let body;
    if (u.role === 'employee') {
        if (!u.id) return {};
        body = { id: u.id, password: u.password, action: 'self' };
    } else {
        if (!u.username) return {};
        body = { username: u.username, password: u.password, action: 'list' };
    }
    try {
        const r = await fetch('/api/employees-secure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await r.json();
        if (!data || !data.ok || !Array.isArray(data.employees)) return {};
        const map = {};
        data.employees.forEach(e => { map[e.id] = { salary_info: e.salary_info, advance_paid: e.advance_paid }; });
        return map;
    } catch (e) {
        console.warn('fetchEmployeeSalaryMap failed:', e);
        return {};
    }
}

// Ro'yxatdagi har bir xodimga salary_info/advance_paid'ni joyida qo'shib qo'yadi.
export async function attachSalaries(employeeList) {
    if (!Array.isArray(employeeList) || !employeeList.length) return employeeList;
    const map = await fetchEmployeeSalaryMap();
    employeeList.forEach(e => {
        const s = map[e.id];
        if (s) { e.salary_info = s.salary_info; e.advance_paid = s.advance_paid; }
    });
    return employeeList;
}

// Bitta xodim uchun maosh/avans yangilash (faqat admin/hr/buxgalter/ac_manager). { ok, employee? , error? } qaytaradi.
export async function updateEmployeeSalary(id, patch) {
    const u = currentUserObj();
    if (!u || !u.username || !u.password) return { ok: false, error: 'Sessiya topilmadi, qayta kiring.' };
    try {
        const r = await fetch('/api/employees-secure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u.username, password: u.password, action: 'update_salary', id, ...patch })
        });
        return await r.json();
    } catch (e) {
        return { ok: false, error: String(e.message || e) };
    }
}
