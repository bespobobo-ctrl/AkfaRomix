import { supabase } from '@/core/supabase.js';

// ── Login/logout/onlayn kuzatuvi (user_sessions jadvali) ──
// database/2026-07-28_ai_query_log_and_session_tracking.sql orqali qo'shiladi.
// Migratsiya hali ishga tushirilmagan bo'lsa insert/update xato qaytaradi — bu funksiyalar
// har doim try/catch bilan o'ralgan, shuning uchun login/logout ishlashiga ta'sir qilmaydi.
const HEARTBEAT_INTERVAL_MS = 60_000;
let heartbeatTimer = null;

function stopHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
}

function startHeartbeat(sessionId) {
    stopHeartbeat();
    heartbeatTimer = setInterval(async () => {
        try {
            await supabase.from('user_sessions').update({ last_seen: new Date().toISOString() }).eq('id', sessionId);
        } catch (e) { /* tarmoq uzilishi — keyingi urinishda davom etadi */ }
    }, HEARTBEAT_INTERVAL_MS);
}

// Har bir muvaffaqiyatli login uchun chaqiriladi (hardcoded operator loginlari ham,
// chunki kundalik haqiqiy loginlarning aksariyati aynan shu tarmoqlardan o'tadi —
// faqat Supabase system_users/employees orqali kirganlarni yozish user_sessions'ni
// deyarli bo'sh qoldirar edi).
async function logSession(userData) {
    try {
        const { data, error } = await supabase
            .from('user_sessions')
            .insert({ user_id: String(userData.id), user_name: userData.full_name || userData.username, user_role: userData.role })
            .select('id')
            .single();
        if (error) throw error;
        if (data && data.id) {
            localStorage.setItem('currentSessionId', data.id);
            startHeartbeat(data.id);
        }
    } catch (e) {
        console.warn('Session log yozishda xato (loginga ta\'sir qilmaydi):', e);
    }
}

// Sahifa yangilansa yoki yangi tab ochilsa login() qayta chaqirilmaydi — shuning uchun
// sessiya allaqachon ochiq bo'lsa, modul yuklanganda heartbeatni qayta ishga tushiramiz.
if (typeof localStorage !== 'undefined') {
    const existingSessionId = localStorage.getItem('currentSessionId');
    if (existingSessionId) startHeartbeat(existingSessionId);
}

export const authService = {
    async login(username, password) {
        // 0. Check Auto Clapak Manager (Hardcoded)
        if (username.toUpperCase().replace(/\s+/g, '') === 'AC1' && password === '123') {
            const userData = { id: 'AC1', username: 'AC1', role: 'ac_manager', full_name: 'Ishlab Chiqarish Boshlig\'i', password };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            await logSession(userData);
            return userData;
        }

        // 0.1 Check Stanok Operators
        if ((username === '7007' && password === '1234') || (username === '8008' && password === '1234')) {
            const userData = {
                id: username,
                username: username,
                role: 'stanok',
                full_name: username === '7007' ? 'Jaloliddin R.' : 'Sardorbek M.'
            };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('stanok_session', JSON.stringify({ id: username, name: userData.full_name }));
            await logSession(userData);
            return userData;
        }

        // 0.2 Check Kraska Operators
        if ((username.toLowerCase() === 'kraska1' && password === '123') || (username.toLowerCase() === 'kraska2' && password === '123') || (username.toLowerCase() === 'kraska3' && password === '123')) {
            const userData = {
                id: username.toLowerCase() === 'kraska1' ? 'K1' : username.toLowerCase() === 'kraska2' ? 'K2' : 'K3',
                username: username,
                role: 'kraska',
                full_name: username.toLowerCase() === 'kraska1' ? 'Rassom 1' : username.toLowerCase() === 'kraska2' ? 'Rassom 2' : 'Rassom 3'
            };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('kraska_session', JSON.stringify({ id: userData.id, username: username, role: 'kraska', name: userData.full_name }));
            await logSession(userData);
            return userData;
        }

        // 0.3 Check Qadoqlovchi Operators
        if ((username.toUpperCase().replace(/\s+/g, '') === 'Q1' || username.toLowerCase() === 'q1' || username.toLowerCase() === 'qadoq1') && password === '123') {
            const userData = {
                id: 'Q1',
                username: 'Q1',
                role: 'qadoqlash',
                full_name: 'Qadoqlovchi 1'
            };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('qadoqlash_session', JSON.stringify({ id: 'Q1', username: 'Qadoqlovchi 1', role: 'qadoqlash', name: 'Qadoqlovchi 1' }));
            await logSession(userData);
            return userData;
        }

        // 1. Try Local/Offline Credentials First (Bypasses Supabase connection hangs)
        const localUsers = [
            { id: "c019b7cb-1b30-48b0-a526-d87c3535cc89", username: "admin", password: "123", full_name: "Super Admin", role: "admin" },
            { id: "41842320-5831-4556-aaf9-a00b6c82133d", username: "hr", password: "123", full_name: "Kadirlar Bo'limi", role: "hr" },
            { id: "550b6df7-52fa-4b43-9285-383d55b6cb86", username: "ombor", password: "123", full_name: "Ali", role: "manager" },
            { id: "26bce1d4-3e98-4703-abf8-754cd686ed86", username: "sotuv", password: "123", full_name: "Jasur", role: "sotuv" },
            { id: "401046f5-7668-47c5-8099-cb9c81d0d6ca", username: "123", password: "123", full_name: "botir", role: "ishlab_chiqarish" },
            { id: "b8f2a4e1-6c3d-4a9f-9e5b-1d7c8a2e0f3b", username: "buxgalter", password: "123", full_name: "Buxgalter", role: "buxgalter" }
        ];

        const foundUser = localUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
        if (foundUser) {
            const userData = {
                id: foundUser.id,
                username: foundUser.username,
                role: foundUser.role,
                full_name: foundUser.full_name,
                password
            };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            await logSession(userData);
            return userData;
        }

        const localEmployees = [
            { id: "80bb0fbd-3216-4cfb-a1ea-fad946736347", full_name: "Farhod Manopov", avatar_url: "" }
        ];
        const effectivePassword = password || username;
        const foundEmp = localEmployees.find(e => e.id === username || e.full_name.toLowerCase() === username.toLowerCase());
        if (foundEmp && (effectivePassword === foundEmp.id || effectivePassword === '123456')) {
            const userData = {
                id: foundEmp.id,
                username: foundEmp.full_name,
                role: 'employee',
                full_name: foundEmp.full_name,
                avatar_url: foundEmp.avatar_url,
                password: effectivePassword
            };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            await logSession(userData);
            return userData;
        }

        // 2. Try Supabase System Users (if online)
        try {
            const { data: user, error } = await supabase
                .from('system_users')
                .select('id, username, role, full_name')
                .eq('username', username)
                .eq('password', password)
                .maybeSingle();

            if (error) throw error;

            if (user) {
                const userData = {
                    id: user.id || 'sys',
                    username: user.username,
                    role: user.role,
                    full_name: user.full_name,
                    password
                };
                localStorage.setItem('currentUser', JSON.stringify(userData));
                await logSession(userData);
                return userData;
            }
        } catch (dbError) {
            console.warn("Database system_users query failed:", dbError);
        }

        // 3. Try Supabase Employees (if online)
        try {
            const { data: emp, error } = await supabase
                .from('employees')
                .select('id, full_name, avatar_url')
                .or(`id.eq.${username},full_name.eq.${username}`)
                .maybeSingle();

            if (error) throw error;

            if (emp && (effectivePassword === emp.id || effectivePassword === '123456')) {
                const userData = {
                    id: emp.id,
                    username: emp.full_name,
                    role: 'employee',
                    full_name: emp.full_name,
                    avatar_url: emp.avatar_url,
                    password: effectivePassword
                };
                localStorage.setItem('currentUser', JSON.stringify(userData));
                await logSession(userData);
                return userData;
            }
        } catch (dbError) {
            console.warn("Database employees query failed:", dbError);
        }

        throw new Error('Login yoki parol xato!');
    },

    logout() {
        const sessionId = localStorage.getItem('currentSessionId');
        if (sessionId) {
            const now = new Date().toISOString();
            supabase.from('user_sessions').update({ logout_at: now, last_seen: now }).eq('id', sessionId)
                .then(() => {}, (e) => console.warn('Logout log yozishda xato:', e));
        }
        stopHeartbeat();
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentSessionId');
        window.location.href = '/index.html';
    },

    getCurrentUser() {
        return JSON.parse(localStorage.getItem('currentUser'));
    },

    getRedirectUrl(role) {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const base = '/';

        // If mobile, steer towards Mini App versions only for Employee role
        if (isMobile && role === 'employee') {
            return base + 'akfa_hr_mini.html';
        }

        switch (role) {
            case 'admin': return base + 'src/projects/romix/romix_dashboard.html?v=2026.pdf_fix';
            case 'hr': return base + 'src/projects/romix/xodimlar/hr_dashboard.html?v=2026.pdf_fix';
            case 'employee': return base + 'src/projects/romix/xodimlar/akfa_hr_mini.html?v=2026.pdf_fix';
            case 'manager': return base + 'src/projects/romix/ombor/warehouse_dashboard.html?v=2026.pdf_fix';
            case 'sotuv': return base + 'src/projects/romix/sotuv/sales_dashboard.html?v=2026.pdf_fix';
            case 'sotuvchi': return base + 'src/projects/romix/sotuv/sales_dashboard.html?v=2026.pdf_fix';
            case 'showroom': return base + 'src/projects/romix/korgazma/showroom_dashboard.html?v=2026.pdf_fix';
            case 'ishlab_chiqarish': return base + 'src/projects/romix/ishlab_chiqarish/production_dashboard.html?v=2026.pdf_fix';
            case 'buxgalter': return base + 'src/projects/romix/romix_dashboard.html?v=2026.pdf_fix';
            case 'ac_manager': return base + 'src/projects/autoclapak/pages/admin_dashboard.html';
            case 'stanok': return base + 'src/projects/autoclapak/mini-app/stanok-app/index.html';
            case 'kraska': return base + 'src/projects/autoclapak/mini-app/kraska-app/index.html';
            case 'qadoqlash': return base + 'src/projects/autoclapak/mini-app/qadoqlash-app/index.html';
            default: return base + 'index.html';
        }
    }
};
