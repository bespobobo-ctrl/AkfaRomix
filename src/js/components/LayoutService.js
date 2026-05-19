import { Sidebar } from './Sidebar.js';
import { Header } from './Header.js';
import { authService } from '@/services/auth/authService.js';

export const LayoutService = {
    init(title = 'HR', actions = '') {
        this.injectSidebar();
        this.injectHeader(title, actions);
        this.setupLogout();
        if (window.lucide) {
            window.lucide.createIcons();
        }
    },

    injectSidebar() {
        const existingSidebar = document.querySelector('.sidebar, .sidebar-slim, .hr-left-sidebar');
        if (existingSidebar) {
            console.log('Sidebar already exists, skipping injection');
            return;
        }
        document.body.insertAdjacentHTML('afterbegin', Sidebar());
    },

    injectHeader(title, actions) {
        const existingHeader = document.querySelector('.top-nav');
        if (existingHeader) {
            existingHeader.outerHTML = Header(title, actions);
        }
    },

    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = () => authService.logout();
        }
    }
};
