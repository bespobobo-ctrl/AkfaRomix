import { supabase } from '@/core/supabase.js';

export const authService = {
    async login(username, password) {
        // 0. Check Auto Clapak Manager (Hardcoded)
        if (username.toUpperCase().replace(/\s+/g, '') === 'AC1' && password === '123') {
            const userData = { id: 'AC1', username: 'AC1', role: 'ac_manager', full_name: 'Ishlab Chiqarish Boshlig\'i' };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            return userData;
        }

        // 1. Try System Users First (Admin, HR, etc)
        // SECURITY NOTE: Passwords should be stored as hashes (e.g. Bcrypt) and checked via Supabase Auth
        const { data: user } = await supabase
            .from('system_users')
            .select('id, username, role, full_name')
            .eq('username', username)
            .eq('password', password)
            .maybeSingle();

        if (user) {
            const userData = {
                id: user.id || 'sys',
                username: user.username,
                role: user.role,
                full_name: user.full_name
            };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            return userData;
        }

        // 2. Try Employees Table (Username = ID or Full Name, Password = ID)
        const { data: emp } = await supabase
            .from('employees')
            .select('id, full_name, avatar_url')
            .or(`id.eq.${username},full_name.eq.${username}`)
            .maybeSingle();

        // For employees, we can use their ID as the password for simplicity
        // If password is not provided (manual ID entry), we assume password matches ID
        const effectivePassword = password || username;

        if (emp && (effectivePassword === emp.id || effectivePassword === '123456')) {
            const userData = {
                id: emp.id,
                username: emp.full_name,
                role: 'employee',
                full_name: emp.full_name,
                avatar_url: emp.avatar_url
            };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            return userData;
        }

        throw new Error('Login yoki parol xato!');
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

        // If mobile, steer towards Mini App versions for core HR/Staff roles
        if (isMobile && (role === 'hr' || role === 'admin' || role === 'employee')) {
            return base + 'akfa_hr_mini.html';
        }

        switch (role) {
            case 'admin': return base + 'src/projects/autoclapak/pages/admin_dashboard.html';
            case 'hr': return base + 'src/projects/romix/pages/hr_dashboard.html';
            case 'employee': return base + 'src/projects/romix/pages/akfa_hr_mini.html';
            case 'manager': return base + 'src/projects/romix/pages/warehouse_dashboard.html';
            case 'sotuv': return base + 'src/projects/romix/pages/sales_dashboard.html';
            case 'showroom': return base + 'src/projects/romix/pages/showroom_dashboard.html';
            case 'ishlab_chiqarish': return base + 'src/projects/romix/pages/production_dashboard.html';
            case 'ac_manager': return base + 'src/projects/autoclapak/pages/admin_dashboard.html';
            default: return base + 'src/projects/romix/pages/generic_dashboard.html';
        }
    }
};
