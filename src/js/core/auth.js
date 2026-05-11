import { authService } from '@/services/auth/authService.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMsg = document.getElementById('errorMsg');

    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.textContent = '';

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        const btn = document.querySelector('.auth-btn');
        btn.textContent = 'Tekshirilmoqda...';

        try {
            const user = await authService.login(username, password);
            btn.textContent = 'Muvaffaqiyatli!';

            const targetUrl = authService.getRedirectUrl(user.role);

            setTimeout(() => {
                window.location.href = targetUrl;
            }, 800);
        } catch (err) {
            btn.textContent = 'Kirish';
            errorMsg.textContent = err.message;

            const card = document.querySelector('.auth-card');
            if (card) {
                card.style.animation = 'shake 0.4s';
                setTimeout(() => card.style.animation = '', 400);
            }
        }
    });
});
