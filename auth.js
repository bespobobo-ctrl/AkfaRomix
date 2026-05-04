import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMsg = document.getElementById('errorMsg');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.textContent = '';

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        const btn = document.querySelector('.auth-btn');
        btn.textContent = 'Tekshirilmoqda...';

        // Check Supabase system_users table
        const { data: user, error } = await supabase
            .from('system_users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (user) {
            // Login success
            localStorage.setItem('currentUser', JSON.stringify({
                username: user.username,
                role: user.role,
                full_name: user.full_name
            }));

            btn.textContent = 'Muvaffaqiyatli!';

            // Redirect based on role
            let targetUrl = 'generic_dashboard.html';
            if (user.role === 'admin') targetUrl = 'admin_dashboard.html';
            else if (user.role === 'hr') targetUrl = 'hr_dashboard.html';
            else if (user.role === 'manager') targetUrl = 'warehouse_dashboard.html';
            else if (user.role === 'sotuv') targetUrl = 'sales_dashboard.html';
            else if (user.role === 'showroom') targetUrl = 'showroom_dashboard.html';
            else if (user.role === 'ishlab_chiqarish') targetUrl = 'production_dashboard.html';

            setTimeout(() => {
                window.location.href = targetUrl;
            }, 800);
        } else {
            // Login failed
            btn.textContent = 'Kirish';
            errorMsg.textContent = 'Login yoki parol xato!';

            // Shake animation
            const card = document.querySelector('.auth-card');
            if (card) {
                card.style.animation = 'shake 0.4s';
                setTimeout(() => card.style.animation = '', 400);
            }
        }
    });
});
