import { supabase } from '@/core/supabase.js';

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
                
                return userData;
            } else {
                throw new Error(data.error || 'Login yoki parol xato!');
            }
        } catch (error) {
            console.error("Login failed:", error);
            throw new Error(error.message || 'Server xatosi yoki internetga ulanish yo\\'q');
        }
    },

    logout() {
        localStorage.removeItem('currentUser');
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
