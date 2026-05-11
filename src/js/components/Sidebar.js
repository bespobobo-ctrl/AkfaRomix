export const Sidebar = () => {
    const user = JSON.parse(localStorage.getItem('currentUser')) || { role: 'generic' };

    return `
        <nav class="sidebar">
            <div class="sidebar-logo">AR</div>
            <button class="nav-btn active" title="Dashboard" onclick="window.switchTab('dashboard')">
                <i data-lucide="layout-grid"></i>
            </button>
            <button class="nav-btn" title="QR Scanner" onclick="window.switchTab('scanner')">
                <i data-lucide="qr-code"></i>
            </button>
            <button class="nav-btn" title="Hisobotlar" onclick="window.switchTab('reports')">
                <i data-lucide="file-bar-chart"></i>
            </button>
            <button class="nav-btn" title="Tarix" onclick="window.switchTab('history')">
                <i data-lucide="history"></i>
            </button>
            <button class="nav-btn" title="Oshxona" onclick="window.switchTab('kitchen')">
                <i data-lucide="coffee"></i>
            </button>
            <div style="flex:1"></div>
            <button class="nav-btn" id="logoutBtn">
                <i data-lucide="log-out"></i>
            </button>
        </nav>
    `;
};
