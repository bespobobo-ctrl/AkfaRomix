const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ ok: false, error: 'Username va parol kiritilishi shart' });
        }

        const uname = String(username);
        const pwd = String(password);
        const unameUpper = uname.toUpperCase().replace(/\s+/g, '');
        const unameLower = uname.toLowerCase();

        // 0. Hardcoded Service Accounts (Server-side)
        if (unameUpper === 'AC1' && pwd === '123') {
            return res.status(200).json({ ok: true, user: { id: 'AC1', username: 'AC1', role: 'ac_manager', full_name: "Ishlab Chiqarish Boshlig'i" } });
        }
        if ((uname === '7007' && pwd === '1234') || (uname === '8008' && pwd === '1234')) {
            return res.status(200).json({ ok: true, user: { id: uname, username: uname, role: 'stanok', full_name: uname === '7007' ? 'Jaloliddin R.' : 'Sardorbek M.' } });
        }
        if (['kraska1', 'kraska2', 'kraska3'].includes(unameLower) && pwd === '123') {
            const id = unameLower === 'kraska1' ? 'K1' : unameLower === 'kraska2' ? 'K2' : 'K3';
            const fn = unameLower === 'kraska1' ? 'Rassom 1' : unameLower === 'kraska2' ? 'Rassom 2' : 'Rassom 3';
            return res.status(200).json({ ok: true, user: { id, username: uname, role: 'kraska', full_name: fn } });
        }
        if (['Q1', 'QADOQ1'].includes(unameUpper) && pwd === '123') {
            return res.status(200).json({ ok: true, user: { id: 'Q1', username: 'Q1', role: 'qadoqlash', full_name: 'Qadoqlovchi 1' } });
        }

        // 1. Static Local Users (Now secure on server)
        const localUsers = [
            { id: "c019b7cb-1b30-48b0-a526-d87c3535cc89", username: "admin", password: "123", full_name: "Super Admin", role: "admin" },
            { id: "41842320-5831-4556-aaf9-a00b6c82133d", username: "hr", password: "123", full_name: "Kadirlar Bo'limi", role: "hr" },
            { id: "550b6df7-52fa-4b43-9285-383d55b6cb86", username: "ombor", password: "123", full_name: "Ali", role: "manager" },
            { id: "26bce1d4-3e98-4703-abf8-754cd686ed86", username: "sotuv", password: "123", full_name: "Jasur", role: "sotuv" },
            { id: "401046f5-7668-47c5-8099-cb9c81d0d6ca", username: "123", password: "123", full_name: "botir", role: "ishlab_chiqarish" },
            { id: "b8f2a4e1-6c3d-4a9f-9e5b-1d7c8a2e0f3b", username: "buxgalter", password: "123", full_name: "Buxgalter", role: "buxgalter" }
        ];

        const foundUser = localUsers.find(u => u.username.toLowerCase() === unameLower && u.password === pwd);
        if (foundUser) {
            return res.status(200).json({ ok: true, user: { id: foundUser.id, username: foundUser.username, role: foundUser.role, full_name: foundUser.full_name } });
        }

        const localEmployees = [
            { id: "80bb0fbd-3216-4cfb-a1ea-fad946736347", full_name: "Farhod Manopov", avatar_url: "" }
        ];
        const effectivePassword = pwd || uname;
        const foundEmp = localEmployees.find(e => e.id === uname || e.full_name.toLowerCase() === unameLower);
        if (foundEmp && (effectivePassword === foundEmp.id || effectivePassword === '123456')) {
            return res.status(200).json({ ok: true, user: { id: foundEmp.id, username: foundEmp.full_name, role: 'employee', full_name: foundEmp.full_name, avatar_url: foundEmp.avatar_url } });
        }

        // 2. Query Supabase (if URL/KEY is present)
        if (SUPABASE_URL && SUPABASE_KEY) {
            const headers = {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
            };

            // Query system_users
            try {
                // PostgREST query: username=eq.X & password=eq.Y
                const sysRes = await fetch(`${SUPABASE_URL}/rest/v1/system_users?select=id,username,role,full_name&username=eq.${encodeURIComponent(uname)}&password=eq.${encodeURIComponent(pwd)}&limit=1`, { headers });
                if (sysRes.ok) {
                    const sysData = await sysRes.json();
                    if (sysData && sysData.length > 0) {
                        const u = sysData[0];
                        return res.status(200).json({ ok: true, user: { id: u.id || 'sys', username: u.username, role: u.role, full_name: u.full_name } });
                    }
                }
            } catch(e) { console.warn("Supabase system_users login query failed:", e); }

            // Query employees
            try {
                // or=(id.eq.X,full_name.eq.X)
                const empRes = await fetch(`${SUPABASE_URL}/rest/v1/employees?select=id,full_name,avatar_url&or=(id.eq.${encodeURIComponent(uname)},full_name.eq.${encodeURIComponent(uname)})&limit=1`, { headers });
                if (empRes.ok) {
                    const empData = await empRes.json();
                    if (empData && empData.length > 0) {
                        const emp = empData[0];
                        if (effectivePassword === emp.id || effectivePassword === '123456') {
                            return res.status(200).json({ ok: true, user: { id: emp.id, username: emp.full_name, role: 'employee', full_name: emp.full_name, avatar_url: emp.avatar_url } });
                        }
                    }
                }
            } catch(e) { console.warn("Supabase employees login query failed:", e); }
        }

        return res.status(401).json({ ok: false, error: 'Login yoki parol xato!' });
    } catch (error) {
        console.error("Login xatosi:", error);
        return res.status(500).json({ ok: false, error: 'Server xatosi' });
    }
}
