import { supabase } from '@/core/supabase.js';

export const authService = {
    async login(username, password) {
        // 0. Check Auto Clapak Manager (Hardcoded)
        if (username.toUpperCase().replace(/\s+/g, '') === 'AC1' && password === '123') {
            const userData = { id: 'AC1', username: 'AC1', role: 'ac_manager', full_name: 'Ishlab Chiqarish Boshlig\'i' };
            localStorage.setItem('currentUser', JSON.stringify(userData));
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
            return userData;
        }

        // 0.2 Check Kraska Operators
        if ((username.toLowerCase() === 'kraska1' && password === '123') || (username.toLowerCase() === 'kraska2' && password === '123')) {
            const userData = {
                id: username.toLowerCase() === 'kraska1' ? 'K1' : 'K2',
                username: username,
                role: 'kraska',
                full_name: username.toLowerCase() === 'kraska1' ? 'Rassom 1' : 'Rassom 2'
            };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('kraska_session', JSON.stringify({ id: userData.id, username: username, role: 'kraska', name: userData.full_name }));
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
            case 'hr': return base + 'src/projects/romix/hr/hr_dashboard.html';
            case 'employee': return base + 'src/projects/romix/hr/akfa_hr_mini.html';
            case 'manager': return base + 'src/projects/romix/warehouse/warehouse_dashboard.html';
            case 'sotuv': return base + 'src/projects/romix/sales/sales_dashboard.html';
            case 'showroom': return base + 'src/projects/romix/showroom/showroom_dashboard.html';
            case 'ishlab_chiqarish': return base + 'src/projects/romix/production/production_dashboard.html';
            case 'ac_manager': return base + 'src/projects/autoclapak/pages/admin_dashboard.html';
            case 'stanok': return base + 'src/projects/autoclapak/mini-app/stanok-app/index.html';
            case 'kraska': return base + 'src/projects/autoclapak/mini-app/kraska-app/index.html';
            case 'qadoqlash': return base + 'src/projects/autoclapak/mini-app/qadoqlash-app/index.html';
            default: return base + 'src/projects/romix/generic_dashboard.html';
        }
    }
};
