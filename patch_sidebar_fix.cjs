const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/js/pages/admin.js');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Patch window.switchSection to also synchronize slim sidebar .nav-icon active states
const switchSectionOld = `    window.switchSection = (sectionId) => {
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(sectionId);
        if (target) target.classList.add('active');

        // Sidebar link active state
        document.querySelectorAll('.nav-link-v2').forEach(l => {
            l.classList.toggle('active', l.getAttribute('onclick')?.includes(sectionId));
        });

        // Mobile Nav active state
        document.querySelectorAll('.m-nav-item').forEach(mi => {
            mi.classList.toggle('active', mi.getAttribute('onclick')?.includes(sectionId));
        });
    };`;

const switchSectionNew = `    window.switchSection = (sectionId) => {
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(sectionId);
        if (target) target.classList.add('active');

        // Sync slim sidebar nav-icon active states
        const sectionName = sectionId.replace('section-', '');
        document.querySelectorAll('.nav-icon[data-section]').forEach(icon => {
            if (icon.getAttribute('data-section') === sectionName) {
                icon.classList.add('active');
            } else {
                icon.classList.remove('active');
            }
        });

        // Sidebar link active state
        document.querySelectorAll('.nav-link-v2').forEach(l => {
            l.classList.toggle('active', l.getAttribute('onclick')?.includes(sectionId));
        });

        // Mobile Nav active state
        document.querySelectorAll('.m-nav-item').forEach(mi => {
            mi.classList.toggle('active', mi.getAttribute('onclick')?.includes(sectionId));
        });
    };`;

if (content.includes(switchSectionOld)) {
    content = content.replace(switchSectionOld, switchSectionNew);
    console.log('window.switchSection patched.');
} else {
    console.error('Could not find switchSectionOld!');
}

// 2. Patch navIcons click switching & redirection logic completely
const navIconsOld = `    navIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const target = icon.getAttribute('data-section');

            // Cross-file redirection check
            if (target !== 'autoclapak' && !document.getElementById('section-dashboard')) {
                localStorage.setItem('activeRomixSection', \`section-\${target}\`);
                window.location.href = 'admin_dashboard.html';
                return;
            } 
            navIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');

            sections.forEach(sec => {
                sec.classList.remove('active');
                if (sec.id === \`section-\${target}\`) sec.classList.add('active');
            });

            // Show/Hide Romix Top Nav (Executive Tabs) based on section
            const romixTopNav = document.querySelector('.executive-tabs');
            if (romixTopNav && !romixTopNav.classList.contains('autoclapak-tabs')) {
                if (target === 'dashboard') {
                    romixTopNav.style.setProperty('display', 'flex', 'important');
                } else {
                    romixTopNav.style.setProperty('display', 'none', 'important');
                }
            }

            if (target === 'users') loadSystemUsers();

            // Auto Clapak specific load on sidebar icon click (for Admin / Rahbar role)
            if (target === 'autoclapak') {
                const activeAutoTab = document.querySelector('.nav-link-item[data-auto-tab].active');
                if (activeAutoTab) {
                    activeAutoTab.click();
                } else {
                    const firstTab = document.querySelector('.nav-link-item[data-auto-tab="auto-main"]');
                    if (firstTab) firstTab.click();
                }

                // Pre-load finished goods and sales data in background to ensure sync
                if (typeof window.loadAutoFinishedGoods === 'function') window.loadAutoFinishedGoods();
                if (typeof window.loadAutoSales === 'function') window.loadAutoSales();
            }
        });
    });`;

const navIconsNew = `    navIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const target = icon.getAttribute('data-section');

            // 1. Cross-file redirection check if we are on a sub-page (not admin_dashboard.html)
            if (!document.getElementById('section-dashboard')) {
                if (target === 'autoclapak') {
                    window.location.href = 'admin_dashboard.html';
                } else {
                    localStorage.setItem('activeRomixSection', \`section-\${target}\`);
                    window.location.href = 'admin_dashboard.html';
                }
                return;
            } 

            // 2. We are on admin_dashboard.html
            navIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');

            sections.forEach(sec => {
                sec.classList.remove('active');
                if (sec.id === \`section-\${target}\`) sec.classList.add('active');
            });

            // Show/Hide Romix Top Nav (Executive Tabs) based on section
            const romixTopNav = document.querySelector('.executive-tabs');
            if (romixTopNav && !romixTopNav.classList.contains('autoclapak-tabs')) {
                if (target === 'dashboard') {
                    romixTopNav.style.setProperty('display', 'flex', 'important');
                } else {
                    romixTopNav.style.setProperty('display', 'none', 'important');
                }
            }

            if (target === 'users') loadSystemUsers();

            // Auto Clapak specific load on sidebar icon click
            if (target === 'autoclapak') {
                const mainPanel = document.getElementById('sub-auto-main');
                if (mainPanel) {
                    mainPanel.style.display = 'block';
                }

                // Pre-load finished goods and sales data in background to ensure sync
                if (typeof window.loadAutoFinishedGoods === 'function') window.loadAutoFinishedGoods();
                if (typeof window.loadAutoSales === 'function') window.loadAutoSales();
            }
        });
    });`;

if (content.includes(navIconsOld)) {
    content = content.replace(navIconsOld, navIconsNew);
    console.log('navIcons click handler patched.');
} else {
    console.error('Could not find navIconsOld!');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patches saved successfully.');
