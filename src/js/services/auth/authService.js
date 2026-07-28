import { supabase } from '@/core/supabase.js';

// ── Login/logout/onlayn kuzatuvi (user_sessions jadvali) ──
// database/2026-07-28_ai_query_log_and_session_tracking.sql orqali qo'shiladi.
// Sessiya yozuvi endi serverda (api/login.js) yaratiladi — u yerdan qaytgan
// sessionId shu yerda faqat heartbeat/logout uchun ishlatiladi.
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

// Sahifa yangilansa yoki yangi tab ochilsa login() qayta chaqirilmaydi — shuning uchun
// sessiya allaqachon ochiq bo'lsa, modul yuklanganda heartbeatni qayta ishga tushiramiz.
if (typeof localStorage !== 'undefined') {
    const existingSessionId = localStorage.getItem('currentSessionId');
    if (existingSessionId) startHeartbeat(existingSessionId);
}

export const authService = {
    async login(username, password) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.ok && data.user) {
                const userData = data.user;

                // Qo'shimcha sessiya parametrlarini sozlash (role bo'yicha)
                if (userData.role === 'stanok') {
                    localStorage.setItem('stanok_session', JSON.stringify({ id: userData.id, name: userData.full_name }));
                } else if (userData.role === 'kraska') {
                    localStorage.setItem('kraska_session', JSON.stringify({ id: userData.id, username: userData.username, role: 'kraska', name: userData.full_name }));
                } else if (userData.role === 'qadoqlash') {
                    localStorage.setItem('qadoqlash_session', JSON.stringify({ id: userData.id, username: userData.username, role: 'qadoqlash', name: userData.full_name }));
                }

                // Ba'zi joylarda kutilayotgan password qatorini ham qo'shamiz (avvalgi kod mosligi uchun)
                userData.password = password;
                localStorage.setItem('currentUser', JSON.stringify(userData));

                if (data.sessionId) {
                    localStorage.setItem('currentSessionId', data.sessionId);
                    startHeartbeat(data.sessionId);
                }

                return userData;
            } else {
                throw new Error(data.error || 'Login yoki parol xato!');
            }
        } catch (error) {
            console.error("Login failed:", error);
            throw new Error(error.message || 'Server xatosi yoki internetga ulanish yo\'q');
        }
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
