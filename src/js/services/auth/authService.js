import { supabase } from '@/core/supabase.js';

export const authService = {
    async login(username, password) {
        // 1. Try System Users First (Admin, HR, etc)
        const { data: user } = await supabase
            .from('system_users')
            .select('*')
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
            .select('*')
            .or(`id.eq.${username},full_name.eq.${username}`)
            .maybeSingle();

        // For employees, we can use their ID as the password for simplicity
        if (emp && (password === emp.id || password === '123456')) {
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
            case 'admin': return base + 'admin_dashboard.html';
            case 'hr': return base + 'hr_dashboard.html';
            case 'employee': return base + 'akfa_hr_mini.html';
            case 'manager': return base + 'warehouse_dashboard.html';
            case 'sotuv': return base + 'sales_dashboard.html';
            case 'showroom': return base + 'showroom_dashboard.html';
            case 'ishlab_chiqarish': return base + 'production_dashboard.html';
            default: return base + 'generic_dashboard.html';
        }
    }
};
