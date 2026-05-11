export const StatCard = (label, value, icon, color = 'var(--accent)') => {
    return `
        <div class="bento-card stat-card">
            <div style="display:flex; justify-content:space-between; align-items:start; width:100%;">
                <div>
                    <span class="stat-label">${label}</span>
                    <span class="stat-value" style="color:${color}">${value}</span>
                </div>
                <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:12px; color:${color}">
                    <i data-lucide="${icon}"></i>
                </div>
            </div>
        </div>
    `;
};
