import { supabase } from '@/core/supabase.js';

export const authService = {
    async login(username, password) {
        const { data: user, error } = await supabase
            .from('system_users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (error) throw error;
        if (!user) throw new Error('Login yoki parol xato!');

        const userData = {
            username: user.username,
            role: user.role,
            full_name: user.full_name
        };

        localStorage.setItem('currentUser', JSON.stringify(userData));
        return userData;
    },

    logout() {
        localStorage.removeItem('currentUser');
        window.location.href = '/index.html';
    },

    getCurrentUser() {
        return JSON.parse(localStorage.getItem('currentUser'));
    },

    getRedirectUrl(role) {
        const base = '/';
        switch (role) {
            case 'admin': return base + 'admin_dashboard.html';
            case 'hr': return base + 'hr_dashboard.html';
            case 'manager': return base + 'warehouse_dashboard.html';
            case 'sotuv': return base + 'sales_dashboard.html';
            case 'showroom': return base + 'showroom_dashboard.html';
            case 'ishlab_chiqarish': return base + 'production_dashboard.html';
            default: return base + 'generic_dashboard.html';
        }
    }
};
