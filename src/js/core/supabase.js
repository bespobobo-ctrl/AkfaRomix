import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function checkAuth(roles = []) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        window.location.href = '/index.html';
        return null;
    }
    if (roles.length > 0 && !roles.includes(user.role)) {
        window.location.href = '/src/pages/generic_dashboard.html';
        return null;
    }
    return user;
}

export function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = '/index.html';
}
