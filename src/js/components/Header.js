export const Header = (title, actions = '') => {
    const user = JSON.parse(localStorage.getItem('currentUser')) || { username: 'Admin', role: 'admin' };
    const initials = (user.username || 'A')[0].toUpperCase();

    return `
        <header class="top-nav">
            <h1 class="brand-title">ROMIX <span>${title}</span></h1>
            <div style="display:flex; gap:15px; align-items:center; flex:1; max-width:600px; margin-left: 20px;">
                <div class="search-container" style="flex:1;">
                    <i data-lucide="search" size="18" style="color:var(--text-s)"></i>
                    <input type="text" id="hrSearchPrimary" placeholder="Qidirish..." autocomplete="off">
                </div>
                ${actions}
            </div>
            <div style="display:flex; align-items:center; gap:15px;">
                <div class="user-info-badge" style="display:flex; align-items:center; gap:12px; background:rgba(255,255,255,0.03); padding:5px 15px; border-radius:15px; border:1px solid var(--border-glass);">
                    <div style="width:32px; height:32px; border-radius:10px; background:linear-gradient(135deg, var(--accent), var(--accent-sec)); display:flex; align-items:center; justify-content:center; color:#000; font-weight:900; font-size:0.8rem;">
                        ${initials}
                    </div>
                    <div style="font-size:0.75rem; font-weight:700;">${user.full_name || user.username}</div>
                </div>
            </div>
        </header>
    `;
};
