import { supabase } from '@/core/supabase.js';
import { authService } from '@/services/auth/authService.js';
import { LayoutService } from '@/components/LayoutService.js';
import { ROLES } from '@/constants';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('AKFA Rahbar Paneli v2 Logic Loaded');

    // Switch to active Romix section if stored from sub-page redirection
    const activeRomixSec = localStorage.getItem('activeRomixSection');
    if (activeRomixSec && document.getElementById('section-dashboard')) {
        localStorage.removeItem('activeRomixSection');
        const targetName = activeRomixSec.replace('section-', '');
        setTimeout(() => {
            const icon = document.querySelector(`.nav-icon[data-section="${targetName}"]`);
            if (icon) icon.click();
            else window.switchSection(activeRomixSec);
        }, 150);
    }

    // Auto-detect present HTML elements and trigger data loading accordingly
    setTimeout(() => {
        if (document.getElementById('autoWarehouse3DGrid') || document.getElementById('categoryDonutChart') || document.getElementById('autoMaterialTable')) {
            loadAutoClapakInventory();
        }
        if (document.getElementById('fg-showroom-grid')) {
            loadAutoFinishedGoods();
        }
        if (document.getElementById('sales-showroom-grid')) {
            loadAutoSales();
        }
        if (document.getElementById('sub-auto-buhgalteriya')) {
            loadBuhgalteriya();
        }
        if (document.getElementById('finished-goods-list')) {
            loadAutoProduction();
        }
    }, 200);
    let editingUserId = null;

    // Auth Check
    const user = authService.getCurrentUser();
    console.log('Current User for Admin Dashboard:', user);

    if (!user || (user.role !== ROLES.ADMIN && user.role !== 'ac_manager')) {
        console.warn('Auth Failed: User is not an admin or ac_manager', user);
        // Wait a bit to show current page or error before redirecting
        setTimeout(() => {
            authService.logout();
        }, 500);
        return;
    }

    // The old ac_manager block was moved down to ensure synchronous execution after window.switchSection is defined.

    // Inject Premium CSS for Pulsing Unconfirmed Product Cards
    const premiumCardStyle = document.createElement('style');
    premiumCardStyle.innerHTML = `
        @keyframes premiumPulse {
            0% { box-shadow: 0 0 10px rgba(250, 187, 24, 0.25); border-color: rgba(250, 187, 24, 0.35); }
            50% { box-shadow: 0 0 25px rgba(250, 187, 24, 0.6); border-color: rgba(250, 187, 24, 0.95); }
            100% { box-shadow: 0 0 10px rgba(250, 187, 24, 0.25); border-color: rgba(250, 187, 24, 0.35); }
        }
        .premium-pulse-card {
            animation: premiumPulse 2s infinite ease-in-out !important;
            background: linear-gradient(135deg, rgba(20,15,5,0.85) 0%, rgba(13,22,34,0.85) 100%) !important;
        }
        @keyframes textBlink {
            0% { opacity: 0.65; }
            50% { opacity: 1; }
            100% { opacity: 0.65; }
        }
        .premium-blink-badge {
            animation: textBlink 1.5s infinite ease-in-out;
        }
    `;
    document.head.appendChild(premiumCardStyle);

    // Check if we are in admin-v2 layout which has its own sidebar
    if (document.querySelector('.sidebar-slim')) {
        console.log('Admin V2 Layout detected, skipping generic sidebar injection');
    } else {
        LayoutService.init();
    }

    // Initialize Telegram WebApp if available
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    if (tg) {
        tg.expand();
        // Set header color for premium look
        tg.setHeaderColor('#0d1622');
    }

    // Update Rahbar Profile Info
    const adminNameDisplay = document.getElementById('adminName');
    const adminAvatar = document.getElementById('adminAvatar');
    const safeUsername = user.username || user.name || 'Foydalanuvchi';
    const displayName = safeUsername.toLowerCase() === 'admin' ? 'RAHBAR' : safeUsername.toUpperCase();
    if (adminNameDisplay) adminNameDisplay.textContent = displayName;
    if (adminAvatar) adminAvatar.src = `https://ui-avatars.com/api/?name=${displayName}&background=007c52&color=fff&size=100`;

    // Global switchSection refinement for mobile state and cross-file routing
    window.switchSection = (sectionId) => {
        const target = document.getElementById(sectionId);
        
        // If the section does not exist in the current file, redirect!
        if (!target) {
            const sectionName = sectionId.replace('section-', '');
            if (sectionName === 'autoclapak') {
                window.location.href = '../../autoclapak/pages/admin_dashboard.html';
            } else {
                localStorage.setItem('activeRomixSection', sectionId);
                window.location.href = '../../romix/pages/romix_dashboard.html';
            }
            return;
        }

        // Otherwise, switch locally
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        target.classList.add('active');

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
    };



    // Theme Toggle Logic
    const themeBtn = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeBtn) themeBtn.textContent = '☀️';
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            let theme = 'light';
            if (document.body.classList.contains('dark-mode')) {
                theme = 'dark';
                themeBtn.textContent = '☀️';
            } else {
                themeBtn.textContent = '🌙';
            }
            localStorage.setItem('theme', theme);
        });
    }

    // Logout
    const logoutBtn = document.getElementById('sidebarLogout');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem('currentUser');
            window.location.href = '/';
        };
    }

    // --- SECTION SWITCHING LOGIC ---
    const navIcons = document.querySelectorAll('.nav-icon[data-section]');
    const sections = document.querySelectorAll('.admin-section');

    navIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const target = icon.getAttribute('data-section');

            // 1. Cross-file redirection logic
            const targetSectionExists = document.getElementById(`section-${target}`);
            
            if (!targetSectionExists) {
                // If the section doesn't exist in this file, we must redirect!
                if (target === 'autoclapak') {
                    window.location.href = '../../autoclapak/pages/admin_dashboard.html';
                } else {
                    // For Romix sections (dashboard, rassrochka, oynak)
                    localStorage.setItem('activeRomixSection', `section-${target}`);
                    window.location.href = '../../romix/pages/romix_dashboard.html';
                }
                return;
            }

            // 2. We are in a file that has this section (Local switching)
            navIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');

            sections.forEach(sec => {
                sec.classList.remove('active');
                if (sec.id === `section-${target}`) sec.classList.add('active');
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
    });

    // --- ROMIX SUB-SECTION SWITCHING (TOP NAV) ---
    const topNavLinks = document.querySelectorAll('.nav-link-item[data-tab]');
    const romixSubSections = document.querySelectorAll('.romix-sub-section');

    topNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = link.getAttribute('data-tab');

            topNavLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            romixSubSections.forEach(sec => {
                sec.classList.remove('active');
                if (sec.id === `section-${tab}`) sec.classList.add('active');
            });

            if (tab === 'logins') loadSystemUsers();
            if (tab === 'xodimlar') loadRomixHRData();
            if (tab === 'dashboard') loadRomixDashboardStats();
        });
    });

    // Auto-detect and set active Auto Clapak tab based on current URL path
    const currentPath = window.location.pathname;
    let activeLinkFound = false;
    
    document.querySelectorAll('.nav-link-item[data-auto-tab]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href !== '#') {
            const targetPathName = href.replace('./', '');
            if (currentPath.endsWith(targetPathName)) {
                // We are on this tab's page
                activeLinkFound = true;
                const tabName = link.getAttribute('data-auto-tab');
                localStorage.setItem('activeAutoTab', tabName);
                
                document.querySelectorAll('.nav-link-item[data-auto-tab]').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // Ensure the right content is visible (for pages with sub-sections)
                const autoSubSections = document.querySelectorAll('.auto-tab-content');
                if (autoSubSections.length > 0) {
                    autoSubSections.forEach(sec => {
                        sec.style.display = 'none';
                        if (sec.id === `sub-${tabName}`) sec.style.display = 'block';
                    });
                }
            }
        }
    });

    // Fallback if we are on a page not strictly matched, check if we have a saved tab that doesn't have an href
    if (!activeLinkFound) {
        const savedAutoTab = localStorage.getItem('activeAutoTab');
        if (savedAutoTab) {
            const targetLink = document.querySelector(`.nav-link-item[data-auto-tab="${savedAutoTab}"]`);
            if (targetLink && (!targetLink.getAttribute('href') || targetLink.getAttribute('href') === '#')) {
                document.querySelectorAll('.nav-link-item[data-auto-tab]').forEach(l => l.classList.remove('active'));
                targetLink.classList.add('active');
                
                const autoSubSections = document.querySelectorAll('.auto-tab-content');
                autoSubSections.forEach(sec => {
                    sec.style.display = 'none';
                    if (sec.id === `sub-${savedAutoTab}`) sec.style.display = 'block';
                });
            }
        }
    }

    // --- AVTO CLAPAK SUB-SECTION SWITCHING ---
    const autoNavLinks = document.querySelectorAll('.nav-link-item[data-auto-tab]');
    const autoSubSections = document.querySelectorAll('.auto-tab-content');

    autoNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const tab = link.getAttribute('data-auto-tab');
            localStorage.setItem('activeAutoTab', tab); // Persist state before browser handles redirect

            const href = link.getAttribute('href');
            if (href && href !== '#') {
                // Natural redirection to modular HTML files, let browser handle it!
                return;
            }
            e.preventDefault();

            autoNavLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            autoSubSections.forEach(sec => {
                sec.style.display = 'none';
                if (sec.id === `sub-${tab}`) sec.style.display = 'block';
            });

            if (tab === 'auto-ombor') loadAutoClapakInventory();
            if (tab === 'auto-ishlab-chiqarish') loadAutoProduction();
            if (tab === 'auto-tayyor') loadAutoFinishedGoods();
            if (tab === 'auto-sotuv') loadAutoSales();
            if (tab === 'auto-buhgalteriya') loadBuhgalteriya();
        });
    });

    // Apply AC Manager (Boshqaruvchi) specific UI overrides
    if (user.role === 'ac_manager') {
        // We no longer hide tabs because the Boshqaruvchi needs them as seen in their UI requirement
        
        // Auto-redirect to first allowed tab if they load admin_dashboard.html
        if (document.getElementById('section-dashboard')) {
            document.getElementById('section-dashboard').classList.remove('active');
            const acSection = document.getElementById('section-autoclapak');
            if (acSection) {
                acSection.classList.add('active');
                acSection.style.animation = 'none';
            }
        }
    }

    // --- AUTO CLAPAK FINISHED GOODS & SALES STATE INITIALIZATION ---
    // --- AUTO CLAPAK FINISHED GOODS & SALES STATE INITIALIZATION ---
    window.clapakSetPrice = parseInt(localStorage.getItem('clapak_set_price') || '150000');
    window.clapakBaseBoxes = 0; // Reset static baseline to 0 so it counts only actual production outputs!

    // Premium product database mapping
    window.clapakProducts = JSON.parse(localStorage.getItem('clapak_products_v4')) || [
        {
            id: 'prod-gentra',
            name: 'Gentra Premium Calpak',
            model: 'Gentra',
            price: 150000,
            design: 'gentra',
            boxes: 0, // Reset to 0 base
            image: '/src/assets/images/gentra_calpak.png',
            rawPerUnit: 0.6,
            accPerUnit: 1,
            packAccPerSet: 1,
            promoPerSet: 1
        },
        {
            id: 'prod-malibu',
            name: 'Malibu-2 Sport Carbon Calpak',
            model: 'Malibu-2',
            price: 280000,
            design: 'malibu',
            boxes: 0, // Reset to 0 base
            image: '/src/assets/images/malibu_calpak.png',
            rawPerUnit: 0.65,
            accPerUnit: 2,
            packAccPerSet: 1,
            promoPerSet: 1
        }
    ];

    // FIX DUPLICATE IDs IN CORRUPTED LOCAL STORAGE
    const uniqueIds = new Set();
    window.clapakProducts.forEach(p => {
        if (uniqueIds.has(p.id)) {
            p.id = p.id + '-' + Date.now() + Math.floor(Math.random() * 1000);
        }
        uniqueIds.add(p.id);
    });

    window.showPremiumToast = (title, message, isSuccess = true) => {
        const toast = document.getElementById('premium-toast');
        const toastTitle = document.getElementById('toast-title');
        const toastMessage = document.getElementById('toast-message');
        if (!toast || !toastTitle || !toastMessage) return;

        toastTitle.textContent = title;
        toastMessage.textContent = message;

        // Visual feedback based on status
        toast.style.borderColor = isSuccess ? '#00ff88' : '#ff4d4f';
        const iconContainer = toast.querySelector('div');
        if (iconContainer) {
            iconContainer.textContent = isSuccess ? '✓' : '✖';
            iconContainer.style.color = isSuccess ? '#00ff88' : '#ff4d4f';
            iconContainer.style.background = isSuccess ? 'rgba(0,255,136,0.1)' : 'rgba(255,77,79,0.1)';
        }

        // Trigger animation
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        toast.style.pointerEvents = 'auto';

        // Hide toast after 4 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-100px)';
            toast.style.pointerEvents = 'none';
        }, 4000);
    };

    window.loadAutoFinishedGoods = async () => {
        // Fetch latest today's production from Supabase to ensure data is synchronized in real-time
        await refreshAutoProduction();

        // Map live session finishes grouped by model
        const liveFinishedMap = new Map();
        window.pipelineData.finished.forEach(item => {
            if (item.stage === 'finished' || item.stage.startsWith('finished')) {
                let model = item.model || 'Gentra';
                if (model.includes('Gentra')) model = 'Gentra';
                if (model.includes('Malibu')) model = 'Malibu-2';
                if (model.includes('Cobalt')) model = 'Cobalt';
                liveFinishedMap.set(model, (liveFinishedMap.get(model) || 0) + item.boxes);
            }
        });

        // Auto-discover and register any new models coming from warehouse/packaging if not already in product catalogue
        let changed = false;
        liveFinishedMap.forEach((boxes, model) => {
            const exists = window.clapakProducts.some(p => p.model === model);
            if (!exists) {
                const defaultName = `${model} Premium Calpak`;
                const defaultDesign = model.toLowerCase().includes('malibu') ? 'malibu' : 'gentra';
                const defaultPrice = model.toLowerCase().includes('malibu') ? 280000 : 150000;
                
                window.clapakProducts.push({
                    id: 'prod-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
                    name: defaultName,
                    model: model,
                    price: defaultPrice,
                    design: defaultDesign,
                    boxes: 0,
                    priceConfirmed: false
                });
                changed = true;
            }
        });
        if (changed) {
            localStorage.setItem('clapak_products_v4', JSON.stringify(window.clapakProducts));
        }

        let totalBoxes = 0;
        let totalValuation = 0;

        // Render showroom cards
        const showroomGrid = document.getElementById('fg-showroom-grid');
        if (showroomGrid) {
            showroomGrid.innerHTML = window.clapakProducts.map(p => {
                const liveBoxes = liveFinishedMap.get(p.model) || 0;
                const currentBoxes = (p.boxes || 0) + liveBoxes;
                const currentUnits = currentBoxes * 4;
                const totalValue = currentBoxes * (p.price || 0);

                totalBoxes += currentBoxes;
                totalValuation += totalValue;

                const imageSrc = p.design === 'malibu' 
                    ? '/src/assets/images/malibu_calpak.png' 
                    : '/src/assets/images/gentra_calpak.png';

                const isConfirmed = p.priceConfirmed !== false;
                const cardClass = isConfirmed ? 'clapak-card' : 'clapak-card premium-pulse-card';
                const cardBorder = isConfirmed ? '1.5px solid rgba(255,255,255,0.06)' : '1.5px solid rgba(250,187,24,0.4)';
                
                const hoverBorderColor = isConfirmed ? 'rgba(0,255,136,0.3)' : 'rgba(250,187,24,0.8)';
                const normalBorderColor = isConfirmed ? 'rgba(255,255,255,0.06)' : 'rgba(250,187,24,0.4)';

                const imageBadge = isConfirmed 
                    ? `<div style="position: absolute; bottom: 8px; left: 8px; background: rgba(0,255,136,0.15); border: 1px solid rgba(0,255,136,0.3); color: #00ff88; padding: 2px 6px; border-radius: 4px; font-size: 0.55rem; font-weight: 700; letter-spacing: 0.3px;">OMBORDA</div>`
                    : `<div style="position: absolute; top: 8px; left: 8px; background: linear-gradient(135deg, #fabb18 0%, #ff9800 100%); color: #000; padding: 4px 8px; border-radius: 6px; font-size: 0.6rem; font-weight: 900; letter-spacing: 0.5px; box-shadow: 0 4px 10px rgba(250,187,24,0.3); z-index: 5; display: flex; align-items: center; gap: 4px;" class="premium-blink-badge"><span>⚠️</span> NARXNI TASDIQLANG</div>
                       <div style="position: absolute; bottom: 8px; left: 8px; background: rgba(250,187,24,0.15); border: 1px solid rgba(250,187,24,0.3); color: #fabb18; padding: 2px 6px; border-radius: 4px; font-size: 0.55rem; font-weight: 700; letter-spacing: 0.3px;">TASDIQLANMAGAN</div>`;

                const priceSpecHtml = isConfirmed
                    ? `<div style="display: flex; justify-content: space-between; align-items: center;">
                          <span style="font-size: 0.65rem; color: rgba(255,255,255,0.4);">Narxi (1 komplekt / 4 dona):</span>
                          <span style="font-size: 0.75rem; font-weight: 800; color: #fabb18;">${(p.price || 0).toLocaleString()} UZS</span>
                       </div>`
                    : `<div style="display: flex; justify-content: space-between; align-items: center; background: rgba(250,187,24,0.08); padding: 4px 6px; border-radius: 6px; border: 1px dashed rgba(250,187,24,0.3); margin: 2px 0;">
                          <span style="font-size: 0.65rem; color: #fabb18; font-weight: 700;">Narxi (1 komplekt):</span>
                          <span style="font-size: 0.75rem; font-weight: 800; color: #fabb18;">${(p.price || 0).toLocaleString()} UZS ⚠️</span>
                       </div>`;

                const actionButtonsHtml = isConfirmed
                    ? `<div style="display: flex; gap: 6px; margin-top: 4px;">
                           <button onclick="window.editProductSelector('${p.id}')" style="flex: 1; padding: 6px 10px; border-radius: 8px; font-size: 0.65rem; font-weight: 800; border: 1.5px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: #fff; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 4px;">
                               <span>✏️</span> Tahrirlash
                           </button>
                           <button onclick="window.deleteProduct('${p.id}')" style="padding: 6px 8px; border-radius: 8px; font-size: 0.65rem; font-weight: 800; border: 1.5px solid rgba(255,77,79,0.2); background: rgba(255,77,79,0.05); color: #ff4d4f; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center;">
                               🗑️
                           </button>
                       </div>`
                    : `<div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px; width: 100%;">
                           <div style="display: flex; gap: 6px; width: 100%;">
                               <button onclick="window.confirmProductPrice('${p.id}')" style="flex: 1; padding: 8px 6px; border-radius: 8px; font-size: 0.65rem; font-weight: 900; border: none; background: #00d2ff; color: #000; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 4px;">
                                   <span>✅</span> Tasdiqlash
                               </button>
                               <button onclick="window.openCostReviewModal('${p.id}')" style="flex: 1; padding: 8px 6px; border-radius: 8px; font-size: 0.65rem; font-weight: 900; border: none; background: linear-gradient(135deg, #fabb18 0%, #ff9800 100%); color: #000; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 4px; box-shadow: 0 4px 12px rgba(250,187,24,0.25);"
                                   onmouseenter="this.style.transform='scale(1.02)';" onmouseleave="this.style.transform='scale(1)';">
                                   <span>📊</span> Ko'rib chiqish
                               </button>
                           </div>
                           <div style="display: flex; gap: 6px; width: 100%;">
                               <button onclick="window.editProductSelector('${p.id}')" style="flex: 1; padding: 6px 10px; border-radius: 8px; font-size: 0.65rem; font-weight: 800; border: 1.5px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: #fff; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 4px;">
                                   <span>✏️</span> O'zgartirish
                               </button>
                               <button onclick="window.deleteProduct('${p.id}')" style="padding: 6px 8px; border-radius: 8px; font-size: 0.65rem; font-weight: 800; border: 1.5px solid rgba(255,77,79,0.2); background: rgba(255,77,79,0.05); color: #ff4d4f; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center;">
                                   🗑️
                               </button>
                           </div>
                       </div>`;

                return `
                    <div class="${cardClass}" style="background: rgba(13,22,34,0.75); border: ${cardBorder}; border-radius: 16px; overflow: hidden; padding: 0; box-shadow: 0 8px 24px rgba(0,0,0,0.3); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; width: 100%; box-sizing: border-box;" 
                        onmouseenter="this.style.borderColor='${hoverBorderColor}';" 
                        onmouseleave="this.style.borderColor='${normalBorderColor}';">
                        
                        <!-- Image -->
                        <div style="width: 100%; height: 130px; position: relative; background: #070f19; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                            <img src="${imageSrc}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.8;" />
                            <div style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); color: #fff; padding: 3px 8px; border-radius: 6px; font-size: 0.6rem; font-weight: 800; border: 1px solid rgba(255,255,255,0.1);">${p.model}</div>
                            ${imageBadge}
                        </div>

                        <!-- Content -->
                        <div style="padding: 12px; display: flex; flex-direction: column; gap: 8px; flex: 1; justify-content: space-between;">
                            <div>
                                <h4 style="margin: 0 0 2px 0; font-size: 0.85rem; font-weight: 800; color: #fff; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.name}">${p.name}</h4>
                                <span style="font-size: 0.65rem; color: rgba(255,255,255,0.4); font-weight: 600;">Dizayn: ${p.design === 'malibu' ? 'Sport Carbon' : 'Silver Multi'}</span>
                                
                                <!-- Compact Grid Specs -->
                                <div style="display: grid; grid-template-columns: 1fr; gap: 4px; margin-top: 10px; background: rgba(255,255,255,0.02); padding: 8px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.04);">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span style="font-size: 0.65rem; color: rgba(255,255,255,0.4);">Zaxira:</span>
                                        <span style="font-size: 0.75rem; font-weight: 800; color: #00ff88;">${currentBoxes.toLocaleString()} Komplekt <span style="font-size: 0.6rem; color: rgba(255,255,255,0.4); font-weight: 500;">(${currentUnits.toLocaleString()} dona)</span></span>
                                    </div>
                                    ${priceSpecHtml}
                                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px; margin-top: 2px;">
                                        <span style="font-size: 0.65rem; color: rgba(255,255,255,0.4);">Jami:</span>
                                        <span style="font-size: 0.75rem; font-weight: 800; color: #ba00ff;">${totalValue.toLocaleString()} UZS</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Actions -->
                            ${actionButtonsHtml}
                        </div>
                    </div>
                `;
            }).join('');
        }

        
        // Render 3D Parallax Showroom Cards
        setTimeout(() => {
            if (window.applyParallaxShowroom) window.applyParallaxShowroom();
        }, 100);
        
        const totalUnits = totalBoxes * 4;
        const averagePrice = window.clapakProducts.length > 0
            ? Math.round(window.clapakProducts.reduce((sum, p) => sum + (p.price || 0), 0) / window.clapakProducts.length)
            : 0;

        // Render top KPI cards
        const totalBoxesEl = document.getElementById('fg-total-boxes');
        const totalUnitsEl = document.getElementById('fg-total-units');
        const setPriceEl = document.getElementById('fg-set-price');
        const totalValuationEl = document.getElementById('fg-total-valuation');
        const todayAddedEl = document.getElementById('fg-today-added');
        const mainFgUnitsEl = document.getElementById('main-fg-total-units');

        if (totalBoxesEl) totalBoxesEl.innerHTML = `${totalBoxes.toLocaleString()} <small style="font-size: 0.8rem; font-weight: 500; color: rgba(255,255,255,0.5);">KOMPLEKT</small>`;
        if (totalUnitsEl) totalUnitsEl.innerHTML = `${totalUnits.toLocaleString()} <small style="font-size: 0.8rem; font-weight: 500; color: rgba(255,255,255,0.5);">DONA</small>`;
        if (setPriceEl) setPriceEl.innerHTML = `${averagePrice.toLocaleString()} <small style="font-size: 0.8rem; font-weight: 500; color: rgba(255,255,255,0.5);">UZS</small>`;
        if (totalValuationEl) totalValuationEl.innerHTML = `${totalValuation.toLocaleString()} <small style="font-size: 0.8rem; font-weight: 500; color: rgba(255,255,255,0.5);">UZS</small>`;
        if (todayAddedEl) todayAddedEl.textContent = `+${window.pipelineData.finished.reduce((sum, x) => sum + x.boxes, 0)} Komplekt bugun qo'shildi`;
        if (mainFgUnitsEl) mainFgUnitsEl.innerHTML = `${totalUnits.toLocaleString()} <small style="font-size: 1rem; color: var(--adm-text-sec); font-weight: 500;">dona</small>`;
    };

    window.editingProductId = null;

    window.editProductSelector = (id) => {
        const p = window.clapakProducts.find(x => x.id === id);
        if (!p) return;

        window.editingProductId = p.id;
        document.getElementById('modal-prod-model').value = p.model;
        document.getElementById('modal-prod-design').value = p.design;
        document.getElementById('modal-prod-name').value = p.name;
        document.getElementById('modal-prod-price').value = p.price;

        const modal = document.getElementById('editProductModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    };

    window.closeEditProductModal = () => {
        const modal = document.getElementById('editProductModal');
        if (modal) {
            modal.style.display = 'none';
        }
        window.editingProductId = null;
    };

    window.saveModalProduct = () => {
        if (!window.editingProductId) return;

        const model = document.getElementById('modal-prod-model').value;
        const design = document.getElementById('modal-prod-design').value;
        const name = document.getElementById('modal-prod-name').value.trim();
        const price = parseInt(document.getElementById('modal-prod-price').value);

        if (!name || isNaN(price) || price <= 0) {
            window.showPremiumToast("Xatolik", "Iltimos, barcha maydonlarni to'g'ri to'ldiring!", false);
            return;
        }

        const p = window.clapakProducts.find(x => x.id === window.editingProductId);
        if (p) {
            // BUG FIX: Do NOT update p.model or p.design here. 
            // Changing them breaks the mapping with auto-detected production items and causes duplicates.
            p.name = name;
            p.price = price;
            
            p.priceConfirmed = true;
            
            // Re-assign image based on existing design to be safe
            p.image = p.design === 'malibu' 
                ? '/src/assets/images/malibu_calpak.png' 
                : '/src/assets/images/gentra_calpak.png';
        }

        localStorage.setItem('clapak_products_v4', JSON.stringify(window.clapakProducts));
        window.closeEditProductModal();
        window.loadAutoFinishedGoods();
        window.showPremiumToast("Tovar Yangilandi", `"${name}" tovar sozlamalari saqlandi.`, true);
    };

    window.confirmProductPrice = (id) => {
        const p = window.clapakProducts.find(x => x.id === id);
        if (p) {
            p.priceConfirmed = true;
            localStorage.setItem('clapak_products_v4', JSON.stringify(window.clapakProducts));
            window.loadAutoFinishedGoods();
            window.showPremiumToast("Narx Tasdiqlandi", `"${p.name}" uchun ${p.price.toLocaleString()} UZS narxi muvaffaqiyatli tasdiqlandi.`, true);
        }
    };

    // ==========================================
    // COST REVIEW (TAN NARX) MODAL LOGIC
    // ==========================================
    window.costReviewProductId = null;
    
    window.openCostReviewModal = (id) => {
        const p = window.clapakProducts.find(x => x.id === id);
        if (!p) return;
        window.costReviewProductId = id;
        
        // Fetch raw material config
        const rawPerUnit = p.rawPerUnit || 0.6; // default 0.6 kg per piece
        const rawKg = (rawPerUnit * 36).toFixed(1); // 1 cart = 36 pieces
        document.getElementById('cost-lbl-raw-kg').textContent = rawKg;
        
        // Get last painter info for this model
        let lastPainterInfo = "Noma'lum (Kiritilmagan)";
        if (window.pipelineData && window.pipelineData.finished) {
            const finishedForModel = window.pipelineData.finished.filter(x => x.model === p.model && x.painter);
            if (finishedForModel.length > 0) {
                lastPainterInfo = finishedForModel[finishedForModel.length - 1].painter;
            }
        }
        const painterEl = document.getElementById('cost-lbl-painter-info');
        if (painterEl) painterEl.textContent = lastPainterInfo;
        
        // Open Modal
        const modal = document.getElementById('costReviewModal');
        if (modal) modal.style.display = 'flex';
        
        // Initial Calculation
        window.recalcCostReview();
    };

    window.closeCostReviewModal = () => {
        const modal = document.getElementById('costReviewModal');
        if (modal) modal.style.display = 'none';
        window.costReviewProductId = null;
    };

    window.recalcCostReview = () => {
        const p = window.clapakProducts.find(x => x.id === window.costReviewProductId);
        if (!p) return;
        
        // Get values from inputs
        const rawPricePerKg = parseFloat(document.getElementById('cost-raw-price').value) || 0;
        const paintPricePerUnit = parseFloat(document.getElementById('cost-paint-price').value) || 0;
        const stanokPrice = parseFloat(document.getElementById('cost-stanok-price').value) || 0;
        const profitPerKomplekt = parseFloat(document.getElementById('cost-profit').value) || 0;
        
        // Calculate Cost Elements
        const rawPerUnit = p.rawPerUnit || 0.6;
        const rawKg = rawPerUnit * 36;
        const totalRawCost = rawKg * rawPricePerKg;
        const totalPaintCost = paintPricePerUnit * 36;
        
        // Update Breakdown UI Elements
        document.getElementById('cost-val-raw').textContent = totalRawCost.toLocaleString() + ' UZS';
        document.getElementById('cost-val-stanok').textContent = stanokPrice.toLocaleString() + ' UZS';
        document.getElementById('cost-val-paint').textContent = totalPaintCost.toLocaleString() + ' UZS';
        
        // Calculate Totals
        const totalCartCost = totalRawCost + totalPaintCost + stanokPrice;
        document.getElementById('cost-val-total-cart').textContent = totalCartCost.toLocaleString() + ' UZS';
        
        // 36 pieces = 9 komplekt (sets)
        const costPerKomplekt = totalCartCost / 9; 
        document.getElementById('cost-val-komplekt').textContent = Math.round(costPerKomplekt).toLocaleString() + ' UZS';
        
        // Final Sale Price
        const finalSalePrice = Math.round(costPerKomplekt + profitPerKomplekt);
        document.getElementById('cost-val-final-sale').textContent = finalSalePrice.toLocaleString() + ' UZS';
    };

    window.saveCostReviewModal = () => {
        if (!window.costReviewProductId) return;
        const p = window.clapakProducts.find(x => x.id === window.costReviewProductId);
        if (!p) return;
        
        // Final recalculation to save correct price
        const rawPricePerKg = parseFloat(document.getElementById('cost-raw-price').value) || 0;
        const paintPricePerUnit = parseFloat(document.getElementById('cost-paint-price').value) || 0;
        const stanokPrice = parseFloat(document.getElementById('cost-stanok-price').value) || 0;
        const profitPerKomplekt = parseFloat(document.getElementById('cost-profit').value) || 0;
        
        const rawKg = (p.rawPerUnit || 0.6) * 36;
        const totalCartCost = (rawKg * rawPricePerKg) + (paintPricePerUnit * 36) + stanokPrice;
        const finalSalePrice = Math.round((totalCartCost / 9) + profitPerKomplekt);
        
        p.price = finalSalePrice;
        p.priceConfirmed = true;
        
        localStorage.setItem('clapak_products_v4', JSON.stringify(window.clapakProducts));
        window.closeCostReviewModal();
        window.loadAutoFinishedGoods();
        window.showPremiumToast("Narx Saqlandi", `Yangi tan narxi tasdiqlandi: ${finalSalePrice.toLocaleString()} UZS`, true);
    };

    window.deleteProduct = (id) => {
        if (!confirm("Haqiqatan ham ushbu tovar turini o'chirmoqchimisiz?")) return;
        window.clapakProducts = window.clapakProducts.filter(x => x.id !== id);
        localStorage.setItem('clapak_products_v4', JSON.stringify(window.clapakProducts));
        window.loadAutoFinishedGoods();
        window.showPremiumToast("Tovar O'chirildi", "Mahsulot showroomdan olib tashlandi.", true);
    };

    window.sendToSalesDepartment = () => {
        const syncData = {
            products: window.clapakProducts,
            finished_session: window.pipelineData.finished,
            timestamp: new Date().toLocaleTimeString().slice(0, 5)
        };
        localStorage.setItem('clapak_sales_sync_v2', JSON.stringify(syncData));

        window.showPremiumToast(
            "Sotuv Showroomi Sinxronlandi", 
            `Zaxiradagi barcha premium tovar kartochkalari sotuv bo'limiga yuborildi.`, 
            true
        );

        window.loadAutoSales();
    };

    window.loadAutoSales = async () => {
        // Fetch latest today's production from Supabase to ensure data is synchronized in real-time
        await refreshAutoProduction();

        const syncDataStr = localStorage.getItem('clapak_sales_sync_v2');
        let products = window.clapakProducts;
        let finishedSession = window.pipelineData.finished;
        let syncTime = "Faol";

        if (syncDataStr) {
            try {
                const syncData = JSON.parse(syncDataStr);
                products = syncData.products;
                finishedSession = syncData.finished_session || [];
                syncTime = `Sinxronlangan: ${syncData.timestamp}`;
            } catch (e) {
                console.error("Error parsing sync v2 data:", e);
            }
        }

        const liveFinishedMap = new Map();
        finishedSession.forEach(item => {
            if (item.stage === 'finished' || item.stage.startsWith('finished')) {
                let model = item.model || 'Gentra';
                if (model.includes('Gentra')) model = 'Gentra';
                if (model.includes('Malibu')) model = 'Malibu-2';
                if (model.includes('Cobalt')) model = 'Cobalt';
                liveFinishedMap.set(model, (liveFinishedMap.get(model) || 0) + item.boxes);
            }
        });

        const salesShowroom = document.getElementById('sales-showroom-grid');
        if (salesShowroom) {
            // Only show products in Sales department showroom that have actually been received (zaxira/currentBoxes > 0)
            const activeProducts = products.filter(p => {
                const liveBoxes = liveFinishedMap.get(p.model) || 0;
                const currentBoxes = (p.boxes || 0) + liveBoxes;
                return currentBoxes > 0;
            });

            if (activeProducts.length === 0) {
                salesShowroom.innerHTML = `
                    <div style="text-align: center; color: rgba(255,255,255,0.3); padding: 40px; grid-column: 1/-1; font-size: 0.85rem;">
                        Bugun ishlab chiqarish qadoqlash bo'limidan hali tayyor mahsulotlar qabul qilinmagan (sotuv uchun zaxira mavjud emas).
                    </div>
                `;
            } else {
                salesShowroom.innerHTML = activeProducts.map(p => {
                    const liveBoxes = liveFinishedMap.get(p.model) || 0;
                    const currentBoxes = (p.boxes || 0) + liveBoxes;
                    const currentUnits = currentBoxes * 4;
                    const totalValue = currentBoxes * (p.price || 0);

                    const imageSrc = p.design === 'malibu' 
                        ? '/src/assets/images/malibu_calpak.png' 
                        : '/src/assets/images/gentra_calpak.png';

                    return `
                        <div class="clapak-card" style="background: rgba(13,22,34,0.75); border: 1.5px solid rgba(0,210,255,0.15); border-radius: 16px; overflow: hidden; padding: 0; box-shadow: 0 8px 24px rgba(0,0,0,0.3); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; width: 100%; box-sizing: border-box;"
                            onmouseenter="this.style.borderColor='rgba(0,210,255,0.4)';" 
                            onmouseleave="this.style.borderColor='rgba(0,210,255,0.15)';" >
                            
                            <!-- Image Area -->
                            <div style="width: 100%; height: 130px; position: relative; background: #070f19; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                                <img src="${imageSrc}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.8;" />
                                <div style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); color: #fff; padding: 3px 8px; border-radius: 6px; font-size: 0.6rem; font-weight: 800; border: 1px solid rgba(255,255,255,0.1);">${p.model}</div>
                                <div style="position: absolute; bottom: 8px; left: 8px; background: rgba(0,210,255,0.15); border: 1px solid rgba(0,210,255,0.3); color: #00d2ff; padding: 2px 6px; border-radius: 4px; font-size: 0.55rem; font-weight: 700; letter-spacing: 0.3px;">SOTUVDA</div>
                            </div>

                            <!-- Content Area -->
                            <div style="padding: 12px; display: flex; flex-direction: column; gap: 8px; flex: 1; justify-content: space-between;">
                                <div>
                                    <h4 style="margin: 0 0 2px 0; font-size: 0.85rem; font-weight: 800; color: #fff; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.name}">${p.name}</h4>
                                    <span style="font-size: 0.65rem; color: rgba(255,255,255,0.4); font-weight: 600;">Dizayn: ${p.design === 'malibu' ? 'Sport Carbon' : 'Silver Multi'}</span>
                                    
                                    <!-- Compact Grid Specs -->
                                    <div style="display: grid; grid-template-columns: 1fr; gap: 4px; margin-top: 10px; background: rgba(255,255,255,0.02); padding: 8px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.04);">
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <span style="font-size: 0.65rem; color: rgba(255,255,255,0.4);">Sotuvda:</span>
                                            <span style="font-size: 0.75rem; font-weight: 800; color: #00ff88;">${currentBoxes.toLocaleString()} Komplekt <span style="font-size: 0.6rem; color: rgba(255,255,255,0.4); font-weight: 500;">(${currentUnits.toLocaleString()} dona)</span></span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <span style="font-size: 0.65rem; color: rgba(255,255,255,0.4);">Narxi (1 komplekt / 4 dona):</span>
                                            <span style="font-size: 0.75rem; font-weight: 800; color: #fabb18;">${(p.price || 0).toLocaleString()} UZS</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px; margin-top: 2px;">
                                            <span style="font-size: 0.65rem; color: rgba(255,255,255,0.4);">Jami:</span>
                                            <span style="font-size: 0.75rem; font-weight: 800; color: #00d2ff;">${totalValue.toLocaleString()} UZS</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Quick Action -->
                                <button onclick="alert('Yangi shartnoma interfeysi muvaffaqiyatli ochildi: ${p.name}')" style="width: 100%; justify-content: center; padding: 8px 12px; border-radius: 8px; background: linear-gradient(135deg, #00d2ff, #0072ff); color: #fff; font-size: 0.7rem; font-weight: 800; border: none; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,114,255,0.2);">
                                    <span>📄</span> Shartnoma Tuzish
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        
            // Render 3D Parallax Showroom Cards
            setTimeout(() => {
                if (window.applyParallaxShowroom) window.applyParallaxShowroom();
            }, 100);
            
            const timeEl = document.getElementById('sales-sync-time');
        if (timeEl) {
            timeEl.textContent = syncTime;
            timeEl.style.color = '#00ff88';
        }
    };

    // --- AUTO CLAPAK INVENTORY ---
    let cachedAutoInventory = [];
    async function loadAutoClapakInventory() {
        const tableBody = document.getElementById('autoMaterialTable');
        const hasIsoGrid = document.getElementById('isoWarehouseGrid');
        const has3DGrid = document.getElementById('autoWarehouse3DGrid'); // just in case
        if (!tableBody && !hasIsoGrid && !has3DGrid) return;

        const { data, error } = await supabase.from('clapak_inventory').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error("Auto Clapak Inventory Error:", error);
            return;
        }
        cachedAutoInventory = data;
        window.cachedInventory = data;
        
        if (tableBody) {
            renderAutoInventory(data);
        }
        
        if (typeof window.renderInventory === 'function') {
            window.renderInventory(data);
        }
    }
    
    window.addEventListener('saveAutoKirim', async (e) => {
        const { payload, editingId } = e.detail;
        let res;
        try {
            if (editingId) {
                res = await supabase.from('clapak_inventory').update(payload).eq('id', editingId);
            } else {
                const { data: existing } = await supabase.from('clapak_inventory').select('*').eq('product_name', payload.product_name).maybeSingle();
                if (existing) {
                    payload.stock_quantity = (parseFloat(existing.stock_quantity) || 0) + payload.stock_quantity;
                    res = await supabase.from('clapak_inventory').update(payload).eq('id', existing.id);
                } else {
                    res = await supabase.from('clapak_inventory').insert([payload]);
                }
            }
            if (res.error) throw res.error;
            alert('✅ Muvaffaqiyatli saqlandi!');
            document.getElementById('autoKirimModal').style.display = 'none';
            loadAutoClapakInventory();
        } catch (err) {
            alert('Xatolik: ' + err.message);
        } finally {
            const saveBtn = document.getElementById('saveAutoKirimBtn');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = editingId ? '<span>O\'zgarishlarni Saqlash</span> 💾' : '<span>Tasdiqlash va Saqlash</span> ⚡';
            }
        }
    });

    window.addEventListener('deleteAutoKirim', async (e) => {
        const { id } = e.detail;
        try {
            const { error } = await supabase.from('clapak_inventory').delete().eq('id', id);
            if (error) throw error;
            alert('🗑 Mahsulot o\'chirildi!');
            loadAutoClapakInventory();
        } catch (err) {
            alert('Xatolik: ' + err.message);
        }
    });

    window.filterAutoInventory = (cat, btn) => {
        document.querySelectorAll('.filter-chip').forEach(t => t.classList.remove('active'));
        if (btn) btn.classList.add('active');
        if (typeof renderAutoInventory === 'function') {
            renderAutoInventory(cat === 'all' ? cachedAutoInventory : cachedAutoInventory.filter(item => item.category === cat));
        }
    };

    function renderAutoInventory(items) {
        const tableBody = document.getElementById('autoMaterialTable');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        
        // KPI Variables
        let totalValueUSD = 0;
        let totalValueUZS = 0;
        let lowStockCount = 0;
        
        let catXomashyo = 0;
        let catPVX = 0;
        let catAksessuar = 0;

        items.forEach((item, index) => {
            const stock = item.stock_quantity || 0;
            const price = item.price || 0;
            const totalVal = stock * price;
            
            const descFull = item.description || '';
            const isUZS = descFull.includes('Currency: UZS');
            
            if (isUZS) totalValueUZS += totalVal;
            else totalValueUSD += totalVal;

            if (stock <= 10) lowStockCount++;
            
            if ((item.category || '') === 'PVX') catPVX++;
            else if ((item.category || '') === 'Aksessuar') catAksessuar++;
            else catXomashyo++;

            const tr = document.createElement('tr');
            tr.classList.add('elite-row');
            // Remove cursor pointer and onclick since 3D robot is gone

            // Premium status badge
            const statusColor = stock <= 10 ? '#ff4d4f' : (stock < 30 ? '#fabb18' : '#00ff88');
            const statusText = stock <= 10 ? 'KAM QOLDI' : (stock < 30 ? 'O\'RTA' : 'YETARLI');
            const statusBg = stock <= 10 ? 'rgba(255, 77, 79, 0.1)' : (stock < 30 ? 'rgba(250, 187, 24, 0.1)' : 'rgba(0, 255, 136, 0.1)');

            const cur = isUZS ? 'UZS' : 'USD';
            const mainDesc = descFull.split(' | Currency:')[0] || '';

            const priceDisplay = cur === 'USD' ? `$${price.toLocaleString()}` : `${price.toLocaleString()} so'm`;
            const totalDisplay = cur === 'USD' ? `$${totalVal.toLocaleString()}` : `${totalVal.toLocaleString()} so'm`;

            tr.innerHTML = `
                <td style="padding:15px 20px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div class="prod-icon-mini" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; border-radius: 10px; font-weight: 900; color: #fff;">${item.product_name[0]}</div>
                        <div>
                            <div style="font-weight:800; color:#fff; font-size:0.95rem;">${item.product_name}</div>
                            <div style="font-size:0.65rem; color:rgba(255,255,255,0.4); margin-top:4px; letter-spacing: 0.5px;">${mainDesc}</div>
                        </div>
                    </div>
                </td>
                <td><span class="badge-elite" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff;">${item.category || 'Xomashyo'}</span></td>
                <td style="font-weight:900; color:#fff; font-size:1rem;">
                    ${stock.toLocaleString()} <small style="font-size:0.65rem; color:rgba(255,255,255,0.4);">${item.unit || 'tonna'}</small>
                </td>
                <td style="color:rgba(255,255,255,0.6); font-weight:600; font-size:0.85rem;">${priceDisplay}</td>
                <td style="font-weight:900; color:var(--clapak-accent); font-size:1.05rem;">${totalDisplay}</td>
                <td>
                    <div style="display:inline-flex; align-items:center; gap:6px; background:${statusBg}; border: 1px solid ${statusColor}; padding: 4px 10px; border-radius: 8px;">
                        <div style="width:6px; height:6px; border-radius:50%; background:${statusColor}; box-shadow: 0 0 10px ${statusColor};"></div>
                        <span style="color:${statusColor}; font-size:0.65rem; font-weight:900; letter-spacing:0.5px;">${statusText}</span>
                    </div>
                </td>
                <td style="text-align:right; padding-right:25px;" onclick="event.stopPropagation()">
                    <div style="display:flex; gap:10px; justify-content:flex-end;">
                        <button onclick="window.editAutoItem('${item.id}')" class="btn-icon-elite edit" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 6px; cursor: pointer; transition: 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">✏️</button>
                        <button onclick="window.deleteAutoItem('${item.id}')" class="btn-icon-elite delete" style="background: rgba(255,77,79,0.1); border: 1px solid rgba(255,77,79,0.3); border-radius: 8px; padding: 6px; cursor: pointer; transition: 0.3s;" onmouseover="this.style.background='rgba(255,77,79,0.2)'" onmouseout="this.style.background='rgba(255,77,79,0.1)'">🗑️</button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Update KPIs if elements exist
        const kpiValue = document.getElementById('kpiTotalValue');
        const kpiItems = document.getElementById('kpiTotalItems');
        const kpiLow = document.getElementById('kpiLowStock');

        if (kpiValue) {
            let displayStr = '';
            if (totalValueUSD > 0) displayStr += `$${totalValueUSD.toLocaleString()}`;
            if (totalValueUZS > 0) {
                if (displayStr !== '') displayStr += ' + ';
                displayStr += `${totalValueUZS.toLocaleString()} so'm`;
            }
            if (displayStr === '') displayStr = '$0';
            kpiValue.textContent = displayStr;
        }
        if (kpiItems) kpiItems.textContent = `${items.length} ta`;
        if (kpiLow) kpiLow.textContent = `${lowStockCount} ta`;
        
        // Render Category Donut Chart
        const chartContainer = document.querySelector("#categoryDonutChart");
        if (chartContainer && window.ApexCharts) {
            chartContainer.innerHTML = ''; // clear loading
            
            const options = {
                series: [catXomashyo, catPVX, catAksessuar],
                labels: ['Xomashyo', 'PVX', 'Aksessuar'],
                chart: {
                    type: 'donut',
                    height: 250,
                    animations: { enabled: true, dynamicAnimation: { speed: 500 } },
                    background: 'transparent'
                },
                plotOptions: {
                    pie: {
                        donut: {
                            size: '75%',
                            labels: {
                                show: true,
                                name: { color: '#fff', fontSize: '14px' },
                                value: { color: '#00ff88', fontSize: '20px', fontWeight: 800 },
                                total: { show: true, showAlways: true, label: 'Jami', color: '#fff' }
                            }
                        }
                    }
                },
                colors: ['#00ff88', '#00d2ff', '#ba00ff'],
                dataLabels: { enabled: false },
                stroke: { show: false },
                legend: {
                    position: 'right',
                    labels: { colors: 'rgba(255,255,255,0.7)' }
                },
                tooltip: { theme: 'dark' }
            };
            
            if (window.donutChartInstance) {
                window.donutChartInstance.destroy();
            }
            window.donutChartInstance = new ApexCharts(chartContainer, options);
            window.donutChartInstance.render();
        }
        
        // Render Activity Feed
        const feedContainer = document.getElementById('activityFeedContainer');
        if (feedContainer) {
            feedContainer.innerHTML = '';
            if (items.length === 0) {
                feedContainer.innerHTML = `<div style="color: rgba(255,255,255,0.4); font-size: 0.8rem; text-align: center; padding: 20px;">Hozircha ma'lumot yo'q</div>`;
            } else {
                // Show top 6 latest incoming
                const recentItems = items.slice(0, 6);
                recentItems.forEach(ri => {
                    const timeAgo = new Date(ri.created_at).toLocaleTimeString('uz-UZ', {hour: '2-digit', minute:'2-digit'});
                    const feedItem = document.createElement('div');
                    feedItem.style.cssText = `display: flex; align-items: center; gap: 12px; padding: 10px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); transition: 0.3s;`;
                    feedItem.onmouseover = () => feedItem.style.background = 'rgba(255,255,255,0.05)';
                    feedItem.onmouseout = () => feedItem.style.background = 'rgba(255,255,255,0.02)';
                    
                    const catColor = (ri.category === 'PVX') ? '#00d2ff' : (ri.category === 'Aksessuar' ? '#ba00ff' : '#00ff88');
                    
                    feedItem.innerHTML = `
                        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${catColor}; box-shadow: 0 0 10px ${catColor};"></div>
                        <div style="flex: 1;">
                            <div style="color: #fff; font-weight: 800; font-size: 0.85rem;">${ri.product_name} <span style="color: #00ff88; margin-left: 5px;">+${ri.stock_quantity} ${ri.unit || 'tonna'}</span></div>
                            <div style="color: rgba(255,255,255,0.4); font-size: 0.7rem; margin-top: 3px;">Yangi qabul qilindi | ${ri.category || 'Xomashyo'}</div>
                        </div>
                        <div style="color: rgba(255,255,255,0.3); font-size: 0.75rem; font-weight: 600;">${timeAgo}</div>
                    `;
                    feedContainer.appendChild(feedItem);
                });
            }
        }
    }

    // --- AUTO CLAPAK PRODUCTION PIPELINE ---
    window.pipelineData = {
        zakazlar: [],
        sovutish: [],
        kraska: [],
        sushilka: [],
        packaging: 0,
        finished: []
    };

    // Fetch production data immediately in the background on page load
    refreshAutoProduction().then(() => {
        // Pre-render finished goods and sales once initial data is loaded
        if (typeof window.loadAutoFinishedGoods === 'function') window.loadAutoFinishedGoods();
        if (typeof window.loadAutoSales === 'function') window.loadAutoSales();
    }).catch(e => console.error("Initial production load error:", e));

    let autoProductionInterval = null;

    async function loadAutoProduction() {
        // Fetch immediately
        await refreshAutoProduction();

        // Start interval if not already running
        if (!autoProductionInterval) {
            autoProductionInterval = setInterval(async () => {
                // Only refresh if the active tab is still 'auto-ishlab-chiqarish'
                const activeTab = document.querySelector('.nav-link-item.active');
                if (activeTab && activeTab.getAttribute('data-auto-tab') === 'auto-ishlab-chiqarish') {
                    await refreshAutoProduction();
                } else {
                    clearInterval(autoProductionInterval);
                    autoProductionInterval = null;
                }
            }, 5000); // Check every 5 seconds for real-time updates!
        }
    }

    async function refreshAutoProduction() {
        const today = new Date().toISOString().split('T')[0];
        const startOfDay = `${today}T00:00:00.000Z`;
        const endOfDay = `${today}T23:59:59.999Z`;

        try {
            const { data: production, error } = await supabase
                .from('clapak_production')
                .select('*')
                .or(`status.eq.zakaz,start_time.gte.${startOfDay}`);

            if (error) throw error;

            if (production) {
                // Preserve remaining time for drying items in memory
                const oldSushilkaMap = new Map();
                window.pipelineData.sushilka.forEach(item => {
                    oldSushilkaMap.set(item.id.toString(), item.remainingTime);
                });

                window.pipelineData.zakazlar = [];
                window.pipelineData.sovutish = [];
                window.pipelineData.kraska = [];
                window.pipelineData.sushilka = [];
                window.pipelineData.packaging = 0;
                window.pipelineData.finished = [];

                production.forEach(p => {
                    const stagePart = p.stage ? p.stage.split('-')[0] : null;
                    const cartNum = p.stage && p.stage.includes('-') ? p.stage.split('-')[1] : null;

                    const item = {
                        id: p.id,
                        model: p.model,
                        qty: p.quantity || 36,
                        cart: cartNum || '',
                        operator: p.operator || 'Noma\'lum',
                        time: p.end_time 
                            ? new Date(p.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : (p.last_update ? new Date(p.last_update).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--')
                    };

                    if (p.status === 'zakaz' || stagePart === 'zakaz') {
                        window.pipelineData.zakazlar.push(item);
                    } else if (stagePart === 'sovutish') {
                        window.pipelineData.sovutish.push(item);
                    } else if (stagePart === 'kraska') {
                        window.pipelineData.kraska.push(item);
                    } else if (stagePart === 'sushilka') {
                        item.remainingTime = oldSushilkaMap.has(p.id.toString()) 
                            ? oldSushilkaMap.get(p.id.toString())
                            : 40 * 60;
                        window.pipelineData.sushilka.push(item);
                    } else if (stagePart === 'packaging') {
                        window.pipelineData.packaging += item.qty;
                    } else if (stagePart === 'finished' || stagePart === 'warehouse_pending') {
                        const operatorParts = p.operator ? p.operator.split(' | ') : [];
                        const stanokchi = operatorParts[0] || 'Noma\'lum';
                        const painter = operatorParts[1] || 'Noma\'lum';
                        
                        window.pipelineData.finished.push({
                            id: p.id,
                            model: p.model,
                            qty: p.quantity || 36,
                            boxes: Math.floor((p.quantity || 36) / 4),
                            cart: cartNum || '?',
                            stanokchi: stanokchi,
                            painter: painter,
                            time: item.time,
                            stage: p.stage
                        });
                    }
                });
            }
        } catch (e) {
            console.error("Error refreshing auto production:", e);
        }

        renderPipeline();
        updatePipelineStats();
    }

    function renderPipeline() {
        renderZakazlar();
        renderStanok();
        renderSovutish();
        renderKraska();
        renderSushilka();
        renderPackaging();
        renderFinishedGoodsList();
    }

    function renderZakazlar() {
        const list = document.getElementById('zakaz-list');
        if (!list) return;

        const activeOrdersCount = window.pipelineData.zakazlar.length;
        const utilPerc = Math.min(Math.round((activeOrdersCount / 10) * 100), 100);

        const orderCardHtml = `
            <div class="elite-prod-card" style="border-left: 4px solid #ffaa00; margin-bottom: 20px; background: linear-gradient(135deg, rgba(255,170,0,0.04), rgba(255,170,0,0.01)); cursor: pointer;" onclick="window.showOrdersDetails()">
                <div class="card-header-v3">
                    <span class="model-tag" style="color:#ffaa00; background:rgba(255,170,0,0.05); font-weight:800; font-size:0.6rem; letter-spacing:0.5px;">TIZIM HOLATI</span>
                    <div class="status-pill-v3" style="color:#ffaa00; font-weight:800; font-size:0.7rem;">
                        <div class="pulse-dot" style="background:#ffaa00; box-shadow:0 0 10px #ffaa00;"></div> ${activeOrdersCount > 0 ? 'FAOL' : 'NAVATCHI'}
                    </div>
                </div>
                <div class="prod-model-v3" style="font-size:1.25rem; font-weight:900; color:#fff; letter-spacing:-0.5px; margin: 10px 0;">ZAKAZLAR BO'LIMI</div>
                <div class="progress-container-v3" style="margin-bottom:15px;">
                    <div class="track-info" style="display:flex; justify-content:space-between; font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:700; margin-bottom:6px;">
                        <span>KUTAYOTGAN BUYURTMALAR</span>
                        <span style="color:#ffaa00; font-weight:800;">${activeOrdersCount} ta</span>
                    </div>
                    <div class="bar-v3" style="width:100%; height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden; position:relative;">
                        <div class="fill-v3" style="width: ${utilPerc}%; height:100%; background:#ffaa00; box-shadow:0 0 10px rgba(255,170,0,0.5); border-radius:3px; transition:width 0.4s ease;"></div>
                    </div>
                </div>
                <button class="action-btn-v3" style="border-color:#ffaa00; color:#ffaa00; width:100%;" 
                    onclick="event.stopPropagation(); window.showOrdersDetails()">BATAFSIL MA'LUMOT ➜</button>
            </div>
        `;

        list.innerHTML = orderCardHtml;

        // Auto update orders list modal if it is currently open
        const modal = document.getElementById('ordersDetailsModal');
        if (modal && modal.style.display === 'flex') {
            renderOrdersListModal();
        }
    }

    window.showOrdersDetails = () => {
        const modal = document.getElementById('ordersDetailsModal');
        if (!modal) return;
        modal.style.display = 'flex';
        renderOrdersListModal();
    };

    function renderOrdersListModal() {
        const grid = document.getElementById('pipeline-orders-list');
        const countEl = document.getElementById('od-active-count');
        if (!grid) return;

        const activeOrders = window.pipelineData.zakazlar;
        if (countEl) countEl.textContent = `${activeOrders.length} ta`;

        if (activeOrders.length === 0) {
            grid.innerHTML = `
                <div style="text-align: center; color: rgba(255,255,255,0.3); padding: 40px; grid-column: 1/-1; font-size: 0.85rem;">
                    Kutilayotgan yoki yangi buyurtmalar hozircha mavjud emas.
                </div>
            `;
            return;
        }

        grid.innerHTML = activeOrders.map(z => {
            let clientInfo = "Mijoz nomi noma'lum";
            let deadlineInfo = "Noma'lum";
            let rawNeeded = (z.qty * 0.6).toFixed(1);
            let accsNeeded = z.qty;
            let promoNeeded = Math.floor(z.qty / 4);

            try {
                if (z.operator && z.operator.startsWith('{')) {
                    const parsed = JSON.parse(z.operator);
                    clientInfo = parsed.isOmbor ? 'Ombor Zaxirasi' : (parsed.clientName || clientInfo);
                    deadlineInfo = parsed.deadline || deadlineInfo;
                    
                    if (parsed.rawNeeded !== undefined) rawNeeded = parsed.rawNeeded;
                    if (parsed.accsNeeded !== undefined) accsNeeded = parsed.accsNeeded;
                    if (parsed.promoNeeded !== undefined) promoNeeded = parsed.promoNeeded;
                }
            } catch(e) {}

            return `
                <div class="elite-prod-card" style="border-left: 4px solid #ffaa00; background: rgba(13,22,34,0.75); display: flex; flex-direction: column; justify-content: space-between; min-height: 280px; padding: 20px; border-radius: 20px;">
                    <div>
                        <div class="card-header-v3" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <span class="model-tag" style="color:#ffaa00; background:rgba(255,170,0,0.05); text-transform:uppercase;">${clientInfo}</span>
                            <div class="status-pill-v3" style="color:#ffaa00;">
                                <div class="pulse-dot" style="background:#ffaa00; box-shadow:0 0 10px #ffaa00;"></div> KUTYAPTI
                            </div>
                        </div>
                        <div class="prod-model-v3" style="font-size:1.15rem; font-weight:900; color:#fff; margin-bottom:4px;">${z.model}</div>
                        <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:rgba(255,255,255,0.4); margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                            <div>Miqdor: <strong style="color:#fff;">${z.qty} dona</strong></div>
                            <div>Muddat: <strong style="color:#ff4d4f;">${deadlineInfo}</strong></div>
                        </div>
                        
                        <!-- 📦 MATERIALLAR SARFI -->
                        <div style="background:rgba(255,255,255,0.02); padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.05); margin-bottom:15px; font-size:0.7rem; display:flex; flex-direction:column; gap:4px;">
                            <div style="font-weight:700; color:rgba(255,255,255,0.6); margin-bottom:2px; text-transform:uppercase; font-size:0.6rem; letter-spacing:0.5px;">📦 Kerakli materiallar sarfi:</div>
                            <div style="display:flex; justify-content:space-between;">
                                <span>⚡ Xom-ashyo:</span>
                                <strong style="color:#ba00ff;">${rawNeeded} kg</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between;">
                                <span>🛠️ Aksessuarlar:</span>
                                <strong style="color:#00d2ff;">${accsNeeded} dona</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between;">
                                <span>🎴 Reklama kartochkasi:</span>
                                <strong style="color:#00ff88;">${promoNeeded} dona</strong>
                            </div>
                        </div>
                    </div>

                    <!-- Assign Controls -->
                    <div style="border-top:1px solid rgba(255,255,255,0.05); padding-top:12px; display:flex; flex-direction:column; gap:10px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:700;">STANOK TANLASH:</span>
                            <select id="assign-machine-select-${z.id}" style="background:rgba(0,0,0,0.5); color:#fff; border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:6px 10px; font-size:0.75rem; font-family:inherit; font-weight:800; cursor:pointer;">
                                <option value="ST-1">ST-1 (Malibu R18)</option>
                                <option value="ST-2">ST-2 (Gentra R15)</option>
                            </select>
                        </div>
                        <button onclick="window.assignOrderToMachine('${z.id}')" 
                            style="width:100%; background:linear-gradient(135deg, #ffaa00, #ff7700); border:none; color:#fff; padding:10px 14px; border-radius:12px; font-size:0.75rem; font-weight:850; cursor:pointer; transition:all 0.2s;"
                            onmouseenter="this.style.transform='translateY(-1px)';"
                            onmouseleave="this.style.transform='translateY(0)';">
                            ⚡ ISHLAB CHIQARISHNI BOSHLASH
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.assignOrderToMachine = async (orderId) => {
        const selectEl = document.getElementById(`assign-machine-select-${orderId}`);
        if (!selectEl) return;
        const machineId = selectEl.value;

        if (!confirm(`Ushbu buyurtmani ${machineId} stanogiga biriktirib, ishlab chiqarishni boshlamoqchimisiz?`)) return;

        try {
            const order = window.pipelineData.zakazlar.find(z => z.id.toString() === orderId.toString());
            if (!order) {
                alert("Buyurtma topilmadi!");
                return;
            }

            const { error } = await supabase.from('clapak_production').update({
                machine: machineId,
                status: 'ACTIVE',
                stage: 'STANOK',
                start_time: new Date().toISOString(),
                operator: 'Jaloliddin R.'
            }).eq('id', orderId);

            if (error) throw error;

            window.showPremiumToast(
                "Stanokda Ish Boshlandi",
                `Buyurtma ${machineId} stanogiga biriktirildi va ishlab chiqarish boshlandi!`,
                true
            );

            document.getElementById('ordersDetailsModal').style.display = 'none';

            await refreshAutoProduction();

        } catch (e) {
            console.error("Error assigning order to machine:", e);
            alert("Xatolik yuz berdi: " + e.message);
        }
    };

    async function renderStanok() {
        const list = document.getElementById('stanok-list');
        if (!list) return;

        const today = new Date().toISOString().split('T')[0];
        const startOfDay = `${today}T00:00:00.000Z`;
        const endOfDay = `${today}T23:59:59.999Z`;

        const { data: production } = await supabase
            .from('clapak_production')
            .select('*')
            .gte('start_time', startOfDay)
            .lte('start_time', endOfDay);

        const machines = [
            { id: 'ST-1', model: 'MALIBU-2 R18', done: 0, total: 36, progress: 0, status: 'O\'CHIK' },
            { id: 'ST-2', model: 'GENTRA R15', done: 0, total: 36, progress: 0, status: 'O\'CHIK' }
        ];

        if (production) {
            machines.forEach(m => {
                const machineData = production.filter(p => p.machine === m.id);
                if (machineData.length > 0) {
                    const latest = machineData[machineData.length - 1];
                    m.done = machineData.reduce((sum, p) => sum + (p.quantity || 0), 0);
                    m.model = latest.model;
                    m.status = latest.status === 'ACTIVE' ? 'PROTSESSDA' : 'YAKUNLANDI';
                    m.progress = Math.min(Math.round((m.done / 500) * 100), 100); // 500 is daily goal
                }
            });
        }

        list.innerHTML = machines.map(m => `
            <div class="elite-prod-card" style="border-left: 4px solid ${m.status === 'PROTSESSDA' ? '#00baff' : '#555'}; cursor:pointer;" onclick="window.showMachineDetails('${m.id}')">
                <div class="card-header-v3">
                    <span class="model-tag">STANOK №${m.id.split('-')[1]}</span>
                    <div class="status-pill-v3">
                        <div class="pulse-dot" style="background:${m.status === 'PROTSESSDA' ? '#00baff' : '#555'}; box-shadow:0 0 10px ${m.status === 'PROTSESSDA' ? '#00baff' : 'transparent'};"></div> ${m.status}
                    </div>
                </div>
                <div class="prod-model-v3">${m.model}</div>
                <div class="progress-container-v3">
                    <div class="track-info">
                        <span>PROGRESS</span>
                        <span>${m.done} Dona</span>
                    </div>
                    <div class="bar-v3">
                        <div class="fill-v3" style="width: ${m.progress}%; background:#00baff;"></div>
                    </div>
                </div>
                <button class="action-btn-v3" style="border-color:#00baff; color:#00baff; width:100%;" 
                    onclick="event.stopPropagation(); window.showMachineDetails('${m.id}')">BATAFSIL MA'LUMOT ➜</button>
            </div>
        `).join('');
    }

    window.moveToSovutish = (source, model) => {
        const qty = 36;
        window.pipelineData.sovutish.push({ id: Date.now().toString(), model: model, qty: qty, cart: '' });
        renderSovutish();
        updatePipelineStats();
    };

    function renderSovutish() {
        const list = document.getElementById('sovutish-list');
        if (!list) return;

        // Calculate active carts stats
        const activeCartsCount = window.pipelineData.sovutish.length;
        const utilPerc = Math.round((activeCartsCount / 20) * 100);

        // Make the permanent Cooling Room Card HTML (looking exactly like Stanok card)
        const roomCardHtml = `
            <div class="elite-prod-card" style="border-left: 4px solid #00f2ff; margin-bottom: 20px; background: linear-gradient(135deg, rgba(0,242,255,0.04), rgba(0,186,255,0.01)); cursor: pointer;" onclick="window.showCoolingDetails()">
                <div class="card-header-v3">
                    <span class="model-tag" style="color:#00f2ff; background:rgba(0,242,255,0.05); font-weight:800; font-size:0.6rem; letter-spacing:0.5px;">TIZIM HOLATI</span>
                    <div class="status-pill-v3" style="color:#00f2ff; font-weight:800; font-size:0.7rem;">
                        <div class="pulse-dot" style="background:#00f2ff; box-shadow:0 0 10px #00f2ff;"></div> ${activeCartsCount > 0 ? 'FAOL' : 'NAVATCHI'}
                    </div>
                </div>
                <div class="prod-model-v3" style="font-size:1.25rem; font-weight:900; color:#fff; letter-spacing:-0.5px; margin: 10px 0;">SOVUTISH XONASI</div>
                <div class="progress-container-v3" style="margin-bottom:15px;">
                    <div class="track-info" style="display:flex; justify-content:space-between; font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:700; margin-bottom:6px;">
                        <span>BANDLIK (ARAVALAR)</span>
                        <span style="color:#00f2ff; font-weight:800;">${activeCartsCount} / 20 ta</span>
                    </div>
                    <div class="bar-v3" style="width:100%; height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden; position:relative;">
                        <div class="fill-v3" style="width: ${utilPerc}%; height:100%; background:#00f2ff; box-shadow:0 0 10px rgba(0,242,255,0.5); border-radius:3px; transition:width 0.4s ease;"></div>
                    </div>
                </div>
                <button class="action-btn-v3" style="border-color:#00f2ff; color:#00f2ff; width:100%;" 
                    onclick="event.stopPropagation(); window.showCoolingDetails()">BATAFSIL MA'LUMOT ➜</button>
            </div>
        `;

        list.innerHTML = roomCardHtml;
        
        // Also update details modal if it's currently open
        const modal = document.getElementById('coolingDetailsModal');
        if (modal && modal.style.display === 'flex') {
            renderCoolingCartsModal();
        }
    }

    window.showCoolingDetails = () => {
        const modal = document.getElementById('coolingDetailsModal');
        if (!modal) return;
        modal.style.display = 'flex';
        renderCoolingCartsModal();
    };

    function renderCoolingCartsModal() {
        const grid = document.getElementById('cooling-carts-grid');
        if (!grid) return;

        // Initialize 20 carts as empty
        const carts = Array.from({ length: 20 }, (_, idx) => ({
            num: idx + 1,
            active: false,
            isOccupied: false,
            status: 'BO\'SH',
            model: '',
            qty: 0,
            operator: '',
            time: '',
            id: ''
        }));

        // Fill active cooling carts from window.pipelineData.sovutish
        window.pipelineData.sovutish.forEach(item => {
            const cartNum = parseInt(item.cart);
            if (cartNum >= 1 && cartNum <= 20) {
                carts[cartNum - 1] = {
                    num: cartNum,
                    active: true,
                    isOccupied: true,
                    model: item.model,
                    qty: item.qty,
                    operator: item.operator || 'Operator',
                    time: item.time || '--:--',
                    id: item.id
                };
            }
        });

        // Mark carts that are in Kraska or Sushilka as occupied
        window.pipelineData.kraska.forEach(item => {
            const cartNum = parseInt(item.cart);
            if (cartNum >= 1 && cartNum <= 20 && !carts[cartNum - 1].active) {
                carts[cartNum - 1].isOccupied = true;
                carts[cartNum - 1].status = 'BO\'YALMOQDA';
            }
        });

        window.pipelineData.sushilka.forEach(item => {
            const cartNum = parseInt(item.cart);
            if (cartNum >= 1 && cartNum <= 20 && !carts[cartNum - 1].active) {
                carts[cartNum - 1].isOccupied = true;
                carts[cartNum - 1].status = 'SUSHILKADA';
            }
        });

        // Calculate stats
        const activeCount = carts.filter(c => c.active).length;
        const emptyCount = carts.filter(c => !c.isOccupied).length;
        const utilisation = Math.round(((20 - emptyCount) / 20) * 100);

        // Update stats elements
        document.getElementById('cd-active-carts').textContent = `${activeCount} ta`;
        document.getElementById('cd-empty-carts').textContent = `${emptyCount} ta`;
        document.getElementById('cd-utilisation').textContent = `${utilisation}%`;

        // Render the 20 carts with premium styled elements
        grid.innerHTML = carts.map(c => {
            if (c.active) {
                return `
                    <div style="background:linear-gradient(135deg, rgba(0,242,255,0.06), rgba(186,0,255,0.02)); border:1px solid rgba(0,242,255,0.35); padding:16px; border-radius:18px; position:relative; box-shadow:0 8px 25px rgba(0,242,255,0.05); transition:all 0.3s; display:flex; flex-direction:column; justify-content:space-between; min-height:175px;"
                        onmouseenter="this.style.borderColor='#00f2ff'; this.style.transform='translateY(-2px)'"
                        onmouseleave="this.style.borderColor='rgba(0,242,255,0.35)'; this.style.transform='translateY(0)'">
                        <div>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                                <span style="font-size:0.75rem; font-weight:900; background:rgba(0,242,255,0.1); color:#00f2ff; padding:4px 10px; border-radius:8px;">ARAVA #${c.num}</span>
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <div style="width:6px; height:6px; border-radius:50%; background:#00f2ff; box-shadow:0 0 8px #00f2ff; animation:clapak-pulse 1s infinite;"></div>
                                    <span style="font-size:0.6rem; color:#00f2ff; font-weight:800; letter-spacing:0.5px;">SOVUTISH</span>
                                </div>
                            </div>
                            <div style="font-size:1.15rem; font-weight:900; color:#fff; margin-bottom:4px;">${c.model}</div>
                            <div style="font-size:0.7rem; color:rgba(255,255,255,0.4); font-weight:600; margin-bottom:8px;">Miqdor: <strong style="color:#00f2ff;">${c.qty} dona</strong></div>
                        </div>
                        <div>
                            <div style="border-top:1px solid rgba(255,255,255,0.05); padding-top:8px; display:flex; justify-content:space-between; font-size:0.6rem; color:rgba(255,255,255,0.3); font-weight:700; margin-bottom:8px;">
                                <span>👤 ${c.operator.split(' ')[0]}</span>
                                <span>⏰ ${c.time}</span>
                            </div>
                            <button onclick="window.moveToKraska('${c.id}'); document.getElementById('coolingDetailsModal').style.display='none';" 
                                style="width:100%; background:rgba(0,242,255,0.1); border:1px solid rgba(0,242,255,0.3); color:#00f2ff; padding:8px 12px; border-radius:12px; font-size:0.7rem; font-weight:800; cursor:pointer; transition:all 0.2s;"
                                onmouseenter="this.style.background='rgba(0,242,255,0.25)'"
                                onmouseleave="this.style.background='rgba(0,242,255,0.1)'">
                                KRASKAGA O'TKAZISH ➜
                            </button>
                        </div>
                    </div>
                `;
            } else if (c.isOccupied) {
                return `
                    <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.1); padding:16px; border-radius:18px; display:flex; flex-direction:column; justify-content:space-between; height:105px; opacity:0.8;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.75rem; font-weight:800; color:rgba(255,255,255,0.5);">ARAVA #${c.num}</span>
                            <span style="font-size:0.6rem; color:#fabb18; font-weight:700;">BAND</span>
                        </div>
                        <div style="font-size:0.9rem; font-weight:800; color:rgba(255,255,255,0.4); text-align:center; margin:10px 0;">${c.status}</div>
                    </div>
                `;
            } else {
                return `
                    <div style="background:rgba(255,255,255,0.01); border:1px dashed rgba(255,255,255,0.07); padding:16px; border-radius:18px; display:flex; flex-direction:column; justify-content:space-between; height:105px; opacity:0.6; transition:all 0.3s;"
                        onmouseenter="this.style.opacity='1'; this.style.borderColor='rgba(255,255,255,0.15)'"
                        onmouseleave="this.style.opacity='0.6'; this.style.borderColor='rgba(255,255,255,0.07)'">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.75rem; font-weight:800; color:rgba(255,255,255,0.3); font-weight:750;">ARAVA #${c.num}</span>
                            <span style="font-size:0.6rem; color:rgba(255,255,255,0.25); font-weight:700;">BO'SH</span>
                        </div>
                        <div style="font-size:0.9rem; font-weight:800; color:rgba(255,255,255,0.15); text-align:center; margin:10px 0;">FOYDALANISHGA TAYYOR</div>
                    </div>
                `;
            }
        }).join('');
    }

    window.currentFilterDate = new Date().toISOString().split('T')[0];

    window.showMachineDetails = async (machineId) => {
        const modal = document.getElementById('machineDetailsModal');
        if (!modal) return;
        document.getElementById('md-title').textContent = `STANOK №${machineId.split('-')[1]}`;
        modal.style.display = 'flex';
        await updateMachineModalData(machineId, window.currentFilterDate);
    };

    async function updateMachineModalData(machineId, date) {
        if (document.getElementById('md-date-input')) document.getElementById('md-date-input').value = date;

        const startOfDay = `${date}T00:00:00.000Z`;
        const endOfDay = `${date}T23:59:59.999Z`;

        const { data, error } = await supabase
            .from('clapak_production')
            .select('*')
            .eq('machine', machineId)
            .gte('start_time', startOfDay)
            .lte('start_time', endOfDay)
            .order('start_time', { ascending: true });

        let totalQty = 0;
        let totalBrak = 0;
        let totalEnergy = 0;
        let totalRaw = 0;
        let startTime = "--:--";
        let operator = "Noma'lum";
        let durationStr = "Bugun ishlamadi";

        if (data && data.length > 0) {
            startTime = new Date(data[0].start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            operator = data[0].operator;

            data.forEach(row => {
                totalQty += (row.quantity || 0);
                totalBrak += (row.brak || 0);
                totalEnergy += (row.energy || 0);
                totalRaw += (row.raw_material || 0);
            });

            const firstStart = new Date(data[0].start_time);
            const lastData = data[data.length - 1];
            const lastTime = lastData.status === 'ACTIVE' ? new Date() : new Date(lastData.end_time || lastData.last_update || lastData.start_time);
            const diffMs = lastTime - firstStart;
            const diffH = Math.floor(diffMs / 3600000);
            const diffM = Math.floor((diffMs % 3600000) / 60000);
            durationStr = `${diffH} soat ${diffM} daqiqa ishladi`;
        }

        window.currentMachineProduction = data || [];

        // Dynamic rendering of last 3 produced products
        const lastProductsContainer = document.getElementById('md-last-products');
        if (lastProductsContainer) {
            if (data && data.length > 0) {
                const sortedProd = [...data].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
                const top3 = sortedProd.slice(0, 3);
                
                lastProductsContainer.innerHTML = top3.map(row => {
                    const timeStr = new Date(row.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const timeDiff = new Date() - new Date(row.start_time);
                    const diffMins = Math.floor(timeDiff / 60000);
                    let agoStr = '';
                    if (diffMins < 1) agoStr = 'Hozirgina';
                    else if (diffMins < 60) agoStr = `${diffMins} min oldin`;
                    else {
                        const diffHrs = Math.floor(diffMins / 60);
                        agoStr = `${diffHrs} soat oldin`;
                    }

                    const qty = row.quantity || 0;
                    const raw = row.raw_material || 0;
                    const brak = row.brak || 0;

                    const stagePart = row.stage ? row.stage.split('-')[0] : '';
                    const isReady = row.status !== 'ACTIVE' && (stagePart === 'finished' || !row.stage);

                    let statusText = 'TAYYOR ✓';
                    let statusColor = '#00ff88';
                    let statusBg = 'rgba(0,255,136,0.1)';
                    let statusIcon = '📦';

                    if (!isReady) {
                        if (stagePart === 'sovutish') {
                            statusText = 'SOVUTILMOQDA ⏳';
                            statusColor = '#00f2ff';
                            statusBg = 'rgba(0,242,255,0.1)';
                            statusIcon = '❄️';
                        } else if (stagePart === 'kraska') {
                            statusText = 'BO\'YALMOQDA 🎨';
                            statusColor = '#ba00ff';
                            statusBg = 'rgba(186,0,255,0.1)';
                            statusIcon = '🎨';
                        } else if (stagePart === 'sushilka') {
                            statusText = 'QURITILMOQDA ☀️';
                            statusColor = '#fabb18';
                            statusBg = 'rgba(250,187,24,0.1)';
                            statusIcon = '☀️';
                        } else if (stagePart === 'packaging') {
                            statusText = 'QADOQLANMOQDA 📦';
                            statusColor = '#ff4d4f';
                            statusBg = 'rgba(255,77,79,0.1)';
                            statusIcon = '📦';
                        } else {
                            statusText = 'SOVUTILMOQDA ⏳';
                            statusColor = '#00f2ff';
                            statusBg = 'rgba(0,242,255,0.1)';
                            statusIcon = '❄️';
                        }
                    }

                    const cardBg = isReady 
                        ? 'linear-gradient(135deg, rgba(0,255,136,0.04), rgba(0,186,255,0.02))'
                        : 'linear-gradient(135deg, rgba(0,242,255,0.04), rgba(186,0,255,0.01))';
                    const cardBorder = isReady ? 'rgba(0,255,136,0.1)' : 'rgba(0,242,255,0.25)';
                    
                    return `
                        <div style="display:flex; align-items:center; gap:16px; background:${cardBg}; border:1px solid ${cardBorder}; border-radius:18px; padding:16px 20px; transition:all 0.3s;"
                            onmouseenter="this.style.borderColor='${statusColor}'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.3)'; this.style.transform='translateY(-2px)'"
                            onmouseleave="this.style.borderColor='${cardBorder}'; this.style.boxShadow='none'; this.style.transform='translateY(0)'">
                            <div style="width:48px; height:48px; border-radius:14px; background:linear-gradient(135deg, ${statusColor}28, ${statusColor}0D); display:flex; align-items:center; justify-content:center; font-size:1.5rem; flex-shrink:0; border:1px solid ${statusColor}40;">
                                ${statusIcon}
                            </div>
                            <div style="flex:1; min-width:0;">
                                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
                                    <span style="font-size:0.95rem; font-weight:800; color:#fff;">${row.model || 'Noma\'lum mahsulot'}</span>
                                    <span style="font-size:0.55rem; font-weight:800; background:${statusBg}; color:${statusColor}; padding:3px 8px; border-radius:6px; letter-spacing:0.5px;">${statusText}</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                                    <span style="font-size:0.7rem; color:rgba(255,255,255,0.4); font-weight:600;">🔢 Miqdor: <strong style="color:rgba(255,255,255,0.7);">${qty} dona</strong></span>
                                    <span style="font-size:0.7rem; color:rgba(255,255,255,0.4); font-weight:600;">⚖️ Xom-ashyo: <strong style="color:rgba(255,255,255,0.7);">${raw} kg</strong></span>
                                    ${brak > 0 ? `<span style="font-size:0.7rem; color:#ff4d4f; font-weight:600;">🚨 Brak: <strong>${brak} dona</strong></span>` : ''}
                                </div>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px; flex-shrink:0;">
                                <div style="text-align:right;">
                                    <div style="font-size:0.7rem; color:${statusColor}; font-weight:700;">${timeStr}</div>
                                    <div style="font-size:0.6rem; color:rgba(255,255,255,0.25); margin-top:2px;">${agoStr}</div>
                                </div>
                                <button onclick="window.showProductDetail('${row.id}')" 
                                    style="background:rgba(0,186,255,0.1); border:1px solid rgba(0,186,255,0.25); color:#00baff; padding:6px 12px; border-radius:10px; font-size:0.7rem; font-weight:800; cursor:pointer; transition:all 0.2s;"
                                    onmouseenter="this.style.background='rgba(0,186,255,0.2)'; this.style.borderColor='#00baff'"
                                    onmouseleave="this.style.background='rgba(0,186,255,0.1)'; this.style.borderColor='rgba(0,186,255,0.25)'">
                                    👁️ Ko'rish
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                lastProductsContainer.innerHTML = `
                    <div style="text-align:center; padding:30px 20px; background:rgba(255,255,255,0.01); border:1px dashed rgba(255,255,255,0.08); border-radius:18px; color:rgba(255,255,255,0.3); font-size:0.85rem; display:flex; flex-direction:column; align-items:center; gap:10px;">
                        <span style="font-size:2rem; opacity:0.5;">📦</span>
                        <div>Bugun bu stanokda hali mahsulot ishlab chiqarilmagan</div>
                    </div>
                `;
            }
        }

        const stats = {
            startTime: startTime,
            workHours: durationStr,
            outputQty: totalQty.toLocaleString(),
            outputBoxes: `${Math.floor(totalQty / 4)} ta Box = ${Math.floor(totalQty / 1120)} komplekt`,
            energyRate: machineId === 'ST-1' ? "14.5" : "12.8",
            energyTotal: totalEnergy.toFixed(1),
            operator: operator,
            shift: "🕗 Smena: 08:00 – 17:00",
            rawQty: totalRaw.toFixed(0),
            rawPerc: `${Math.round((totalRaw / 500) * 100)}% / 500kg reja`,
            rawBar: Math.min(Math.round((totalRaw / 500) * 100), 100)
        };

        const safeSet = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        safeSet('md-start-time', stats.startTime);
        safeSet('md-work-hours', stats.workHours);
        safeSet('md-output-qty', stats.outputQty);
        safeSet('md-output-boxes', stats.outputBoxes);
        safeSet('md-energy', stats.energyRate);
        safeSet('md-energy-total', `⚡ Jami: ${stats.energyTotal} kWh`);
        safeSet('md-operator-name', stats.operator);
        safeSet('md-operator-shift', stats.shift);
        safeSet('md-input-raw', stats.rawQty);
        safeSet('md-raw-perc', stats.rawPerc);
        const bar = document.getElementById('md-raw-bar');
        if (bar) bar.style.width = `${stats.rawBar}%`;

        // Define showProductDetail handler
        window.showProductDetail = (productId) => {
            const prod = (window.currentMachineProduction || []).find(p => p.id.toString() === productId.toString());
            if (!prod) {
                alert("Mahsulot ma'lumoti topilmadi!");
                return;
            }

            const modal = document.getElementById('mdProductDetailModal');
            if (!modal) return;

            document.getElementById('pd-model-name').textContent = prod.model || 'Noma\'lum Mahsulot';
            
            const isReady = prod.status !== 'ACTIVE';
            const statusEl = document.getElementById('pd-status');
            statusEl.textContent = isReady ? 'TAYYOR' : 'SOVUTILMOQDA';
            statusEl.style.color = isReady ? '#00ff88' : '#00baff';
            document.getElementById('pd-status-badge').style.background = isReady ? 'rgba(0,255,136,0.1)' : 'rgba(0,186,255,0.1)';
            document.getElementById('pd-status-badge').style.borderColor = isReady ? 'rgba(0,255,136,0.2)' : 'rgba(0,186,255,0.2)';
            document.getElementById('pd-status-dot').style.background = isReady ? '#00ff88' : '#00baff';
            document.getElementById('pd-status-dot').style.boxShadow = isReady ? '0 0 8px #00ff88' : '0 0 8px #00baff';

            document.getElementById('pd-qty').textContent = (prod.quantity || 0).toLocaleString();
            document.getElementById('pd-raw').textContent = (prod.raw_material || 0).toLocaleString() + ' kg';
            document.getElementById('pd-brak').textContent = (prod.brak || 0).toLocaleString();
            document.getElementById('pd-energy').textContent = (prod.energy || 0).toFixed(1) + ' kWh';

            document.getElementById('pd-machine').textContent = prod.machine === 'ST-1' ? 'STANOK №1' : 'STANOK №2';
            document.getElementById('pd-operator').textContent = prod.operator || 'Noma\'lum';
            document.getElementById('pd-start-time').textContent = prod.start_time ? new Date(prod.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--';
            
            let endTimeStr = '--:--';
            if (prod.end_time) {
                endTimeStr = new Date(prod.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            } else if (prod.last_update) {
                endTimeStr = new Date(prod.last_update).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
            document.getElementById('pd-end-time').textContent = endTimeStr;

            modal.style.display = 'flex';
        };

        // Close on outside click
        const pdModal = document.getElementById('mdProductDetailModal');
        if (pdModal) {
            pdModal.onclick = (e) => {
                if (e.target === pdModal) pdModal.style.display = 'none';
            };
        }
    }

    const mdDateInput = document.getElementById('md-date-input');
    if (mdDateInput) {
        mdDateInput.addEventListener('change', (e) => {
            const newDate = e.target.value;
            if (newDate) {
                window.currentFilterDate = newDate;
                const currentId = document.getElementById('md-title').textContent.replace('STANOK №', 'ST-');
                updateMachineModalData(currentId, window.currentFilterDate);
            }
        });
    }

    window.moveToKraska = async (id) => {
        const idx = window.pipelineData.sovutish.findIndex(x => x.id.toString() === id.toString());
        if (idx > -1) {
            const item = window.pipelineData.sovutish.splice(idx, 1)[0];
            window.pipelineData.kraska.push(item);
            renderSovutish();
            renderKraska();
            updatePipelineStats();

            try {
                const dbStage = item.cart ? `kraska-${item.cart}` : 'kraska';
                await supabase.from('clapak_production').update({ stage: dbStage }).eq('id', id);
            } catch (e) {
                console.error("Error moving to kraska in DB:", e);
            }
        }
    };

    function renderKraska() {
        const list = document.getElementById('kraska-list');
        if (!list) return;
        if (window.pipelineData.kraska.length === 0) {
            list.innerHTML = `<div class="empty-state">NAVAT KUTILMOQDA...</div>`;
            return;
        }
        list.innerHTML = window.pipelineData.kraska.map(item => `
            <div class="elite-prod-card" style="border-left: 4px solid #ba00ff;">
                <div class="card-header-v3">
                    <span class="model-tag" style="color:#ba00ff; background:rgba(186,0,255,0.05);">${item.cart ? `ARAVA #${item.cart}` : `ARAVA #${item.id.toString().slice(-4)}`}</span>
                    <div class="status-pill-v3" style="color:#ba00ff;"><div class="pulse-dot" style="background:#ba00ff; box-shadow:0 0 10px #ba00ff;"></div> BO'YASHDA</div>
                </div>
                <div class="prod-model-v3">${item.model}</div>
                <p style="font-size: 0.7rem; color: rgba(255,255,255,0.3); margin: 5px 0 15px 0;">${item.qty} Dona oq karkas</p>
                <button class="action-btn-v3" style="border-color:#ba00ff; color:#ba00ff;" onmouseover="this.style.background='#ba00ff';this.style.color='#000'" onmouseout="this.style.background='transparent';this.style.color='#ba00ff'" onclick="window.moveToSushilka('${item.id}')">
                    SUSHILKAGA ➜</button>
            </div>
        `).join('');
    }

    window.moveToSushilka = async (id) => {
        const idx = window.pipelineData.kraska.findIndex(x => x.id.toString() === id.toString());
        if (idx > -1) {
            const item = window.pipelineData.kraska.splice(idx, 1)[0];
            item.remainingTime = 40 * 60; // 40 minutes
            window.pipelineData.sushilka.push(item);
            renderKraska();
            renderSushilka();

            try {
                const dbStage = item.cart ? `sushilka-${item.cart}` : 'sushilka';
                await supabase.from('clapak_production').update({ stage: dbStage }).eq('id', id);
            } catch (e) {
                console.error("Error moving to sushilka in DB:", e);
            }
        }
    };

    function renderSushilka() {
        const list = document.getElementById('sushilka-list');
        if (!list) return;

        // Calculate active carts stats
        const activeCartsCount = window.pipelineData.sushilka.length;
        const utilPerc = Math.round((activeCartsCount / 20) * 100);

        // Make the permanent Drying Room Card HTML (looking exactly like Cooling Room Card)
        const roomCardHtml = `
            <div class="elite-prod-card" style="border-left: 4px solid #fabb18; margin-bottom: 20px; background: linear-gradient(135deg, rgba(250,187,24,0.04), rgba(250,187,24,0.01)); cursor: pointer;" onclick="window.showSushilkaDetails()">
                <div class="card-header-v3">
                    <span class="model-tag" style="color:#fabb18; background:rgba(250,187,24,0.05); font-weight:800; font-size:0.6rem; letter-spacing:0.5px;">TIZIM HOLATI</span>
                    <div class="status-pill-v3" style="color:#fabb18; font-weight:800; font-size:0.7rem;">
                        <div class="pulse-dot" style="background:#fabb18; box-shadow:0 0 10px #fabb18;"></div> ${activeCartsCount > 0 ? 'FAOL' : 'NAVATCHI'}
                    </div>
                </div>
                <div class="prod-model-v3" style="font-size:1.25rem; font-weight:900; color:#fff; letter-spacing:-0.5px; margin: 10px 0;">SUSHILKA XONASI</div>
                <div class="progress-container-v3" style="margin-bottom:15px;">
                    <div class="track-info" style="display:flex; justify-content:space-between; font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:700; margin-bottom:6px;">
                        <span>BANDLIK (ARAVALAR)</span>
                        <span style="color:#fabb18; font-weight:800;">${activeCartsCount} / 20 ta</span>
                    </div>
                    <div class="bar-v3" style="width:100%; height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden; position:relative;">
                        <div class="fill-v3" style="width: ${utilPerc}%; height:100%; background:#fabb18; box-shadow:0 0 10px rgba(250,187,24,0.5); border-radius:3px; transition:width 0.4s ease;"></div>
                    </div>
                </div>
                <button class="action-btn-v3" style="border-color:#fabb18; color:#fabb18; width:100%;" 
                    onclick="event.stopPropagation(); window.showSushilkaDetails()">BATAFSIL MA'LUMOT ➜</button>
            </div>
        `;

        list.innerHTML = roomCardHtml;
        
        // Also update details modal if it's currently open
        const modal = document.getElementById('sushilkaDetailsModal');
        if (modal && modal.style.display === 'flex') {
            renderSushilkaCartsModal();
        }
    }

    window.showSushilkaDetails = () => {
        const modal = document.getElementById('sushilkaDetailsModal');
        if (!modal) return;
        modal.style.display = 'flex';
        renderSushilkaCartsModal();
    };

    function renderSushilkaCartsModal() {
        const grid = document.getElementById('sushilka-carts-grid');
        if (!grid) return;

        // Initialize 20 carts as empty
        const carts = Array.from({ length: 20 }, (_, idx) => ({
            num: idx + 1,
            active: false,
            model: '',
            qty: 0,
            operator: '',
            time: '',
            remainingTime: 0,
            id: ''
        }));

        // Fill active sushilka carts from window.pipelineData.sushilka
        window.pipelineData.sushilka.forEach(item => {
            const cartNum = parseInt(item.cart);
            if (cartNum >= 1 && cartNum <= 20) {
                carts[cartNum - 1] = {
                    num: cartNum,
                    active: true,
                    model: item.model,
                    qty: item.qty,
                    operator: item.operator || 'Operator',
                    time: item.time || '--:--',
                    remainingTime: item.remainingTime,
                    id: item.id
                };
            }
        });

        // Calculate stats
        const activeCount = carts.filter(c => c.active).length;
        const emptyCount = 20 - activeCount;
        const utilisation = Math.round((activeCount / 20) * 100);

        // Update stats elements
        document.getElementById('sd-active-carts').textContent = `${activeCount} ta`;
        document.getElementById('sd-empty-carts').textContent = `${emptyCount} ta`;
        document.getElementById('sd-utilisation').textContent = `${utilisation}%`;

        // Render the 20 carts with premium styled elements
        grid.innerHTML = carts.map(c => {
            if (c.active) {
                const mins = Math.floor(c.remainingTime / 60);
                const secs = c.remainingTime % 60;
                const progressPerc = Math.round(((40 * 60 - c.remainingTime) / (40 * 60)) * 100);
                return `
                    <div style="background:linear-gradient(135deg, rgba(250,187,24,0.06), rgba(186,0,255,0.02)); border:1px solid rgba(250,187,24,0.35); padding:16px; border-radius:18px; position:relative; box-shadow:0 8px 25px rgba(250,187,24,0.05); transition:all 0.3s; display:flex; flex-direction:column; justify-content:space-between; min-height:175px; cursor:pointer;"
                        onclick="window.showSushilkaPassport('${c.id}')"
                        onmouseenter="this.style.borderColor='#fabb18'; this.style.transform='translateY(-2px)'"
                        onmouseleave="this.style.borderColor='rgba(250,187,24,0.35)'; this.style.transform='translateY(0)'">
                        <div>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                                <span style="font-size:0.75rem; font-weight:900; background:rgba(250,187,24,0.1); color:#fabb18; padding:4px 10px; border-radius:8px;">ARAVA #${c.num}</span>
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <div style="width:6px; height:6px; border-radius:50%; background:#fabb18; box-shadow:0 0 8px #fabb18; animation:clapak-pulse 1s infinite;"></div>
                                    <span style="font-size:0.6rem; color:#fabb18; font-weight:800; letter-spacing:0.5px;">QURITISH</span>
                                </div>
                            </div>
                            <div style="font-size:1.15rem; font-weight:900; color:#fff; margin-bottom:4px;">${c.model}</div>
                            <div style="font-size:0.7rem; color:rgba(255,255,255,0.4); font-weight:600; margin-bottom:8px;">Vaqt qoldi: <strong style="color:#fabb18;">${mins}:${secs.toString().padStart(2, '0')}</strong></div>
                        </div>
                        <div>
                            <div style="margin-bottom: 8px;">
                                <div style="width:100%; height:4px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden;">
                                    <div style="width:${progressPerc}%; height:100%; background:#fabb18;"></div>
                                </div>
                            </div>
                            <div style="border-top:1px solid rgba(255,255,255,0.05); padding-top:8px; display:flex; justify-content:space-between; font-size:0.6rem; color:rgba(255,255,255,0.3); font-weight:700;">
                                <span>👤 ${c.operator.split(' | ')[0].split(' ')[0]}</span>
                                <span>⏰ ${c.time}</span>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div style="background:rgba(255,255,255,0.01); border:1px dashed rgba(255,255,255,0.07); padding:16px; border-radius:18px; display:flex; flex-direction:column; justify-content:space-between; height:105px; opacity:0.6; transition:all 0.3s;"
                        onmouseenter="this.style.opacity='1'; this.style.borderColor='rgba(255,255,255,0.15)'"
                        onmouseleave="this.style.opacity='0.6'; this.style.borderColor='rgba(255,255,255,0.07)'">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.75rem; font-weight:800; color:rgba(255,255,255,0.3); font-weight:750;">ARAVA #${c.num}</span>
                            <span style="font-size:0.6rem; color:rgba(255,255,255,0.25); font-weight:700;">BO'SH</span>
                        </div>
                        <div style="font-size:0.9rem; font-weight:800; color:rgba(255,255,255,0.15); text-align:center; margin:10px 0;">QURITISHGA TAYYOR</div>
                    </div>
                `;
            }
        }).join('');
    }

    window.showSushilkaPassport = async (cartId) => {
        const modal = document.getElementById('cartPassportModal');
        if (!modal) return;

        // Fetch cart details from database
        const { data: c, error } = await supabase
            .from('clapak_production')
            .select('*')
            .eq('id', cartId)
            .maybeSingle();

        if (error || !c) {
            alert('Aravacha pasporti yuklanmadi!');
            return;
        }

        const cartNum = c.stage.split('-')[1] || '0';
        
        // Split concatenated operator field
        const machineOperator = c.operator ? c.operator.split(' | ')[0] : 'Noma\'lum';
        const painter = c.operator && c.operator.includes(' | ') ? c.operator.split(' | ')[1] : 'Noma\'lum';

        const stanokTime = c.end_time 
            ? new Date(c.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '--:--';
        const sushilkaTime = c.last_update 
            ? new Date(c.last_update).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '--:--';

        // Update passport UI elements
        document.getElementById('pass-show-cart-num').textContent = `ARAVA #${cartNum}`;
        document.getElementById('pass-show-model').textContent = c.model || 'Noma\'lum';
        document.getElementById('pass-show-machine').textContent = c.machine === 'ST-1' ? 'STANOK №1' : 'STANOK №2';
        document.getElementById('pass-show-operator').textContent = machineOperator;
        document.getElementById('pass-show-painter').textContent = painter;
        document.getElementById('pass-show-qty-brak').innerHTML = `<span style="color:#00ff88;">${c.quantity || 0} ta</span> / <span style="color:#ff4d4f;">${c.brak || 0} ta</span>`;
        document.getElementById('pass-show-stanok-time').textContent = stanokTime;
        
        // Mock Kraskaga kirgan vaqt (e.g. Stanok time + 5 mins if start_time not strictly tracked for kraska phase)
        let kraskaTimeStr = '--:--';
        if (c.end_time) {
            const kt = new Date(c.end_time);
            kt.setMinutes(kt.getMinutes() + 5);
            kraskaTimeStr = kt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        const kraskaEl = document.getElementById('pass-show-kraska-time');
        if (kraskaEl) kraskaEl.textContent = kraskaTimeStr;

        document.getElementById('pass-show-sushilka-time').textContent = sushilkaTime;

        // Hook up the transition button
        const btn = document.getElementById('btn-passport-to-pack');
        btn.onclick = async () => {
            btn.textContent = 'O\'TKAZILMOQDA...';
            btn.disabled = true;
            try {
                // Call window.moveToPackaging(c.id)
                await window.moveToPackaging(c.id);
                document.getElementById('cartPassportModal').style.display = 'none';
                document.getElementById('sushilkaDetailsModal').style.display = 'none';
            } catch (err) {
                alert('Xatolik: ' + err.message);
                btn.textContent = 'QADOQLASHGA ➜';
                btn.disabled = false;
            }
        };

        modal.style.display = 'flex';
    };

    window.moveToPackaging = async (id) => {
        const idx = window.pipelineData.sushilka.findIndex(x => x.id.toString() === id.toString());
        if (idx > -1) {
            const item = window.pipelineData.sushilka.splice(idx, 1)[0];
            window.pipelineData.packaging += item.qty;
            renderSushilka();
            renderPackaging();

            try {
                const dbStage = item.cart ? `packaging-${item.cart}` : 'packaging';
                await supabase.from('clapak_production').update({ stage: dbStage }).eq('id', id);
            } catch (e) {
                console.error("Error moving to packaging in DB:", e);
            }
        }
    };

    function renderPackaging() {
        const qtyEl = document.getElementById('qadoqlash-pending-qty');
        const boxEl = document.getElementById('qadoqlash-boxes');
        const btn = document.getElementById('btn-finish-pack');
        if (!qtyEl) return;
        const total = window.pipelineData.packaging;
        const boxes = Math.floor(total / 4);
        qtyEl.textContent = total;
        boxEl.textContent = `${boxes} KOMPLEKT (BOX)`;
        if (total > 0) {
            btn.disabled = false;
            btn.style.background = '#ff4d4f';
            btn.style.color = '#000';
            btn.style.borderColor = '#ff4d4f';
            btn.style.cursor = 'pointer';
        } else {
            btn.disabled = true;
            btn.style.background = 'transparent';
            btn.style.color = 'rgba(255,255,255,0.1)';
            btn.style.borderColor = 'rgba(255,255,255,0.05)';
            btn.style.cursor = 'not-allowed';
        }
    }

    window.finalizePackaging = async () => {
        const total = window.pipelineData.packaging;
        if (total <= 0) return;
        const boxes = Math.floor(total / 4);
        window.pipelineData.finished.unshift({
            model: 'Auto Clapak Mix',
            boxes: boxes,
            time: new Date().toLocaleTimeString().slice(0, 5)
        });
        window.pipelineData.packaging = 0;
        renderPackaging();
        updatePipelineStats();

        // Dynamically reload finished goods inventory if current tab is tayyor mahsulot
        if (typeof window.loadAutoFinishedGoods === 'function') {
            window.loadAutoFinishedGoods();
        }

        try {
            const today = new Date().toISOString().split('T')[0];
            const startOfDay = `${today}T00:00:00.000Z`;
            const endOfDay = `${today}T23:59:59.999Z`;

            await supabase.from('clapak_production')
                .update({ stage: 'finished', status: 'DONE' })
                .eq('stage', 'packaging')
                .gte('start_time', startOfDay)
                .lte('start_time', endOfDay);
        } catch (e) {
            console.error("Error finalizing packaging in DB:", e);
        }

        window.showPremiumToast("Omborga Jo'natildi", `${boxes} ta box tayyor mahsulot omboriga muvaffaqiyatli qabul qilindi.`, true);
    };

    function updatePipelineStats() {
        const activeCarts = window.pipelineData.kraska.length + window.pipelineData.sushilka.length;
        const acEl = document.getElementById('active-carts-count');
        if (acEl) acEl.textContent = activeCarts;

        const totalDona = 1440 + window.pipelineData.finished.reduce((sum, x) => sum + (x.qty || 0), 0);
        const totalBoxes = 360 + window.pipelineData.finished.filter(x => x.stage === 'finished' || x.stage.startsWith('finished')).reduce((sum, x) => sum + x.boxes, 0);

        const tdEl = document.getElementById('today-total-production');
        const tbEl = document.getElementById('today-total-boxes');
        if (tdEl) tdEl.textContent = totalDona.toLocaleString();
        if (tbEl) tbEl.textContent = totalBoxes.toLocaleString();
    }

    async function renderFinishedGoodsList() {
        const list = document.getElementById('finished-goods-list');
        if (!list) return;

        if (window.pipelineData.finished.length === 0) {
            list.innerHTML = `<div style="text-align: center; opacity: 0.2; padding-top: 30px; font-size: 0.75rem;">Hali qabul qilinmadi</div>`;
            return;
        }

        list.innerHTML = window.pipelineData.finished.map(item => {
            const isPending = item.stage === 'warehouse_pending' || item.stage.startsWith('warehouse_pending');
            
            let actionButton = '';
            if (isPending) {
                actionButton = `
                    <button onclick="window.receiveCartToWarehouse('${item.id}', '${item.cart}', ${item.boxes})" 
                        style="width:100%; margin-top:12px; background:linear-gradient(135deg, #00ff88, #00b359); border:none; color:#000; padding:10px 14px; border-radius:12px; font-size:0.75rem; font-weight:800; cursor:pointer; transition:all 0.2s; box-shadow:0 4px 15px rgba(0,255,136,0.2);"
                        onmouseenter="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(0,255,136,0.3)';"
                        onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,255,136,0.2)';">
                        📦 OMBORGA QABUL QILISH
                    </button>
                `;
            } else {
                actionButton = `
                    <div style="width:100%; margin-top:12px; background:rgba(0,255,136,0.08); border:1px solid rgba(0,255,136,0.2); color:#00ff88; padding:8px 12px; border-radius:12px; font-size:0.7rem; font-weight:800; text-align:center; display:flex; align-items:center; justify-content:center; gap:6px;">
                        <span>✓</span> OMBORGA QABUL QILINGAN
                    </div>
                `;
            }

            const cardColor = isPending ? '#fabb18' : '#00ff88';
            const cardBg = isPending 
                ? 'linear-gradient(135deg, rgba(250,187,24,0.06), rgba(250,187,24,0.01))'
                : 'linear-gradient(135deg, rgba(0,255,136,0.06), rgba(0,255,136,0.01))';
            const cardBorder = isPending ? '1px solid rgba(250,187,24,0.25)' : '1px solid rgba(0,255,136,0.25)';
            const statusText = isPending ? 'QABUL KUTILMOQDA' : 'OMBORDA';

            return `
                <div class="elite-prod-card" style="border-left: 4px solid ${cardColor}; border: ${cardBorder}; background: ${cardBg}; margin-bottom:15px; position:relative; box-shadow:0 8px 25px rgba(0,0,0,0.2); padding: 16px; border-radius: 18px; transition: all 0.3s ease;"
                    onmouseenter="this.style.transform='translateY(-2px)'"
                    onmouseleave="this.style.transform='translateY(0)'">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <span style="font-size:0.75rem; font-weight:900; background:rgba(255,255,255,0.04); color:#fff; padding:4px 10px; border-radius:8px;">ARAVA #${item.cart}</span>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <div style="width:6px; height:6px; border-radius:50%; background:${cardColor}; box-shadow:0 0 8px ${cardColor};"></div>
                            <span style="font-size:0.6rem; color:${cardColor}; font-weight:800; letter-spacing:0.5px; text-transform:uppercase;">${statusText}</span>
                        </div>
                    </div>
                    <div style="font-size:1.15rem; font-weight:900; color:#fff; margin-bottom:4px;">${item.model}</div>
                    <div style="font-size:0.8rem; color:${cardColor}; font-weight:800; margin-bottom:10px;">
                        📦 ${item.boxes} KOMPLEKT <span style="font-size: 0.7rem; color: rgba(255,255,255,0.4); font-weight: 500;">(${item.qty} dona)</span>
                    </div>
                    <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 12px; font-size: 0.7rem; display: flex; flex-direction: column; gap: 4px; border: 1px solid rgba(255,255,255,0.04);">
                        <div style="display:flex; justify-content:space-between;"><span style="color:rgba(255,255,255,0.4);">Stanokchi:</span><strong style="color:#fff;">${item.stanokchi}</strong></div>
                        <div style="display:flex; justify-content:space-between;"><span style="color:rgba(255,255,255,0.4);">Rassom:</span><strong style="color:#fff;">${item.painter}</strong></div>
                        <div style="display:flex; justify-content:space-between;"><span style="color:rgba(255,255,255,0.4);">Qadoqlovchi:</span><strong style="color:#fff;">Qadoqlovchi 1</strong></div>
                    </div>
                    <div style="border-top:1px solid rgba(255,255,255,0.05); padding-top:8px; margin-top:10px; display:flex; justify-content:space-between; font-size:0.6rem; color:rgba(255,255,255,0.3); font-weight:700;">
                        <span>🏁 Yakunlandi: ${item.time}</span>
                        <span>Bugun ishlab chiqarildi ✅</span>
                    </div>
                    ${actionButton}
                </div>
            `;
        }).join('');
    }

    window.receiveCartToWarehouse = async (id, cartNum, boxes) => {
        try {
            const { error } = await supabase
                .from('clapak_production')
                .update({ stage: 'finished', status: 'DONE_WAREHOUSE', last_update: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            window.showPremiumToast("Omborga Qabul Qilindi", `Arava #${cartNum} (${boxes} komplekt) omborga muvaffaqiyatli qabul qilindi.`, true);
            
            // Reload finished showroom and production pipeline
            await refreshAutoProduction();
            if (typeof window.loadAutoFinishedGoods === 'function') {
                window.loadAutoFinishedGoods();
            }
        } catch (e) {
            console.error("Error receiving cart to warehouse:", e);
            alert("Xatolik yuz berdi: " + e.message);
        }
    };

    setInterval(() => {
        let changed = false;
        window.pipelineData.sushilka.forEach(item => {
            if (item.remainingTime > 0) {
                item.remainingTime--;
                changed = true;
            }
        });
        if (changed) renderSushilka();
    }, 1000);

    // --- ROMIX DASHBOARD STATS (PANEL) ---
    async function loadRomixDashboardStats() {
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Employee Stats
        const { data: emps } = await supabase.from('employees').select('id');
        const { data: att } = await supabase.from('attendance').select('status').eq('date', todayStr);

        const total = emps ? emps.length : 0;
        let arrived = 0, late = 0;
        if (att) {
            arrived = att.length;
            late = att.filter(a => a.status === 'Kech qoldi').length;
        }

        document.getElementById('stat-total-emp').textContent = total;
        document.getElementById('stat-arrived').textContent = arrived;
        document.getElementById('stat-late').textContent = late;
        document.getElementById('stat-absent').textContent = Math.max(0, total - arrived);

        // 2. Warehouse Stats
        const { data: prods } = await supabase.from('warehouse_products').select('current_stock');
        const totalStock = prods ? prods.reduce((sum, p) => sum + p.current_stock, 0) : 0;
        document.querySelector('#section-dashboard .balance-lg').innerHTML = `${totalStock.toLocaleString()} <small style="font-size: 0.8rem;">kg / dona</small>`;

        // 3. Recent Inventory
        const { data: txs } = await supabase.from('warehouse_transactions')
            .select('*, warehouse_products(name, unit)')
            .order('created_at', { ascending: false }).limit(3);

        const recentList = document.getElementById('recent-inventory-list');
        if (recentList && txs) {
            recentList.innerHTML = txs.map(tx => `
                <div style="display:flex; justify-content:space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 5px 0;">
                    <span>${tx.warehouse_products?.name || 'Mahsulot'}</span>
                    <b style="color:${tx.type === 'IN' ? '#00ff88' : '#ff4d4f'}">${tx.type === 'IN' ? '+' : '-'}${tx.quantity} ${tx.warehouse_products?.unit || ''}</b>
                </div>
            `).join('');
        }
    }

    let currentCalMonth = new Date().getMonth();
    let currentCalYear = new Date().getFullYear();
    let selectedWorkerId = null;
    let allEmployees = [];

    // --- ROMIX HR DATA (ELITE COMMAND) ---
    async function loadRomixHRData() {
        const { data: emps, error } = await supabase.from('employees').select('*').order('full_name', { ascending: true });
        if (error) {
            console.error("HR Load Error:", error);
            return;
        }
        allEmployees = emps;

        renderStaffList(allEmployees);
        initHRPills();
        initStaffSearch();
        initMobileFilters(); // AKFA Mobile Engine
        initMobileSearch();  // AKFA Mobile Engine
        initStaffModal(); // New induction system

        if (emps && emps.length > 0) {
            selectedWorkerId = emps[0].id;
            // Only auto-update desktop card, don't open mobile drawer automatically
            if (window.innerWidth > 1024) {
                updateStaffProfileCard(emps[0]);
            }
        }

        // AKFA Elite HR v2.1
        renderModernCalendar(currentCalMonth, currentCalYear);

        const prevBtn = document.getElementById('cal-prev');
        const nextBtn = document.getElementById('cal-next');
        const todayBtn = document.getElementById('cal-today');
        const toggleCalBtn = document.getElementById('toggleCalendarBtn');
        const calContainer = document.getElementById('collapsible-cal-container');

        if (toggleCalBtn && calContainer) {
            toggleCalBtn.onclick = () => {
                const isHidden = calContainer.style.display === 'none';
                calContainer.style.display = isHidden ? 'block' : 'none';
                toggleCalBtn.textContent = isHidden ? '✖ Yopish' : '📅 Taqvimni ochish';
            };
        }

        // Update Today's Big Display
        const now = new Date();
        const days = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
        const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
        const bigDate = document.getElementById('today-big-display');
        const bigDay = document.getElementById('today-day-name');
        if (bigDate) bigDate.textContent = `${now.getDate()} ${months[now.getMonth()]}`;
        if (bigDay) bigDay.textContent = `${days[now.getDay()]}, ${now.getFullYear()}`;

        if (prevBtn && !prevBtn.dataset.navInit) {
            prevBtn.dataset.navInit = "true";
            prevBtn.onclick = () => {
                currentCalMonth--;
                if (currentCalMonth < 0) { currentCalMonth = 11; currentCalYear--; }
                renderModernCalendar(currentCalMonth, currentCalYear);
            };
            nextBtn.onclick = () => {
                currentCalMonth++;
                if (currentCalMonth > 11) { currentCalMonth = 0; currentCalYear++; }
                renderModernCalendar(currentCalMonth, currentCalYear);
            };
            if (todayBtn) {
                todayBtn.onclick = () => {
                    const now = new Date();
                    currentCalMonth = now.getMonth();
                    currentCalYear = now.getFullYear();
                    renderModernCalendar(currentCalMonth, currentCalYear);
                };
            }
        }

        setupStaffActions();
    }

    async function checkPendingRequests() {
        const { data: reqs } = await supabase.from('attendance')
            .select('*, employees(full_name)')
            .eq('status', 'Tasdiqlash kutilmoqda');

        const panel = document.getElementById('hr-notif-panel');
        const list = document.getElementById('pending-requests-list');
        const dot = document.getElementById('global-notif-dot');

        if (reqs && reqs.length > 0) {
            panel.style.display = 'block';
            if (dot) dot.style.display = 'block';
            list.innerHTML = '';
            reqs.forEach(req => {
                const card = document.createElement('div');
                card.className = 'request-card';
                card.innerHTML = `
                    <div>
                        <div style="font-weight:700; font-size:0.85rem;">${req.employees?.full_name || 'Xodim'}</div>
                        <div style="font-size:0.7rem; opacity:0.6;">Sana: ${req.date}</div>
                    </div>
                    <div>
                        <button class="approve-btn" onclick="window.processLeave('${req.id}', true)">✓</button>
                        <button class="reject-btn" onclick="window.processLeave('${req.id}', false)">✖</button>
                    </div>
                `;
                list.appendChild(card);
            });
        } else {
            panel.style.display = 'none';
            if (dot) dot.style.display = 'none';
        }
    }

    // Setup robust history logging backed by localStorage
    window.AKFA_HISTORY = JSON.parse(localStorage.getItem('AKFA_HISTORY') || '[]');

    window.renderHistoryUI = () => {
        const tbody = document.getElementById('audit-trail-table');
        if (!tbody) return;
        tbody.innerHTML = '';
        window.AKFA_HISTORY.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${log.timeStr}</td><td><span style="background:rgba(0,124,82,0.1); color:#007c52; padding:4px 10px; border-radius:30px; font-size:0.75rem;">RAHBAR</span></td><td>${log.actionText}</td><td><span style="color:#00ff88; font-size:0.8rem; font-weight:700;">✓ Bajarildi</span></td>`;
            tbody.appendChild(tr);
        });
    };

    window.logToHistory = async (actionText) => {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}`;

        window.AKFA_HISTORY.unshift({ timeStr, actionText });
        if (window.AKFA_HISTORY.length > 50) window.AKFA_HISTORY.length = 50;
        localStorage.setItem('AKFA_HISTORY', JSON.stringify(window.AKFA_HISTORY));
        window.renderHistoryUI();

        try { await supabase.from('audit_logs').insert({ action: actionText, user: 'Rahbar', created_at: new Date() }); } catch (err) { }
    };

    // Call immediately on load to populate existing history
    window.renderHistoryUI();

    window.deleteHrEvent = async (id) => {
        if (confirm('Haqiqatan ham bu amalni bekor qilmoqchimisiz (tarixdan o\'chirmoqchimisiz)?')) {
            const { error } = await supabase.from('attendance').delete().eq('id', id);
            if (error) { alert("Xatolik: " + error.message); return; }
            window.logToHistory(`Rahbar amalni bekor qildi (ID: ${id})`);
            document.getElementById('hrActionModalOverlay').style.display = 'none';
            loadRomixHRData();
        }
    };

    window.editHrEvent = async (id, currentStatus) => {
        const newVal = prompt("Yangi ma'lumotlarni yoki miqdorni kiriting:", currentStatus);
        if (newVal !== null) {
            const { error } = await supabase.from('attendance').update({ status: newVal }).eq('id', id);
            if (error) { alert("Xatolik: " + error.message); return; }
            window.logToHistory(`Rahbar amalni tahrirladi (P/N: ${id.substring(0, 6)})`);
            loadRomixHRData();
        }
    };

    window.processLeave = async (id, approve) => {
        const newStatus = approve ? 'Ruxsat berildi' : 'Rad etildi';
        const { error } = await supabase.from('attendance').update({ status: newStatus }).eq('id', id);
        if (!error) {
            alert(`So'rov ${newStatus.toLowerCase()} (ID: ${id})`);
            window.logToHistory(`Dam olish so'rovi ${newStatus.toLowerCase()}`);
            checkPendingRequests();
            loadRomixHRData();
        }
    };

    function setupStaffActions() {
        const btnBonus = document.getElementById('btn-bonus');
        const btnRaise = document.getElementById('btn-raise');
        const btnLeave = document.getElementById('btn-leave');

        const modal = document.getElementById('hrActionModalOverlay');
        const title = document.getElementById('hrActionModalTitle');
        const desc = document.getElementById('hrActionModalDesc');
        const icon = document.getElementById('hrActionModalIcon');
        const container = document.getElementById('hrActionInputContainer');
        const saveBtn = document.getElementById('hrActionSaveBtn');
        const closeBtn = document.getElementById('hrActionCloseBtn');

        if (closeBtn && !closeBtn.dataset.init) {
            closeBtn.dataset.init = "true";
            closeBtn.onclick = () => { modal.style.display = 'none'; };
        }

        function openActionModal(actionType) {
            if (!selectedWorkerId) { alert("Xodim tanlanmagan!"); return; }
            modal.style.display = 'flex';
            container.innerHTML = '';

            // Re-fetch the button in case it was modified, though not strictly required.
            const currentSaveBtn = document.getElementById('hrActionSaveBtn');

            if (actionType === 'bonus') {
                icon.textContent = '💰';
                title.textContent = 'Premya Belgilash';
                desc.textContent = "Xodimga beriladigan mukofot miqdorini kiriting.";
                currentSaveBtn.style.background = 'linear-gradient(135deg, #FFD700, #DAA520)';
                currentSaveBtn.style.boxShadow = '0 4px 15px rgba(218, 165, 32, 0.4)';
                currentSaveBtn.style.color = '#000';

                container.innerHTML = `
                    <label style="font-size:0.8rem; color:var(--adm-text-sec); font-weight:600; margin-left:5px;">Miqdor (UZS)</label>
                    <input type="number" id="hrActionAmount" class="form-input-v2" placeholder="Masalan: 500000" style="font-size:1.1rem; padding:15px; border-radius:14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); color:#fff; width:100%; box-sizing:border-box;">
                `;

                currentSaveBtn.onclick = async () => {
                    const val = document.getElementById('hrActionAmount').value;
                    if (val) {
                        currentSaveBtn.innerHTML = "Saqlanmoqda...";
                        const today = new Date().toISOString().split('T')[0];
                        const { error } = await supabase.from('attendance').insert({ employee_id: selectedWorkerId, date: today, status: `Premya: ${val} so'm` });
                        if (error) { alert("Xatolik saqlashda: " + error.message); return; }
                        window.logToHistory(`Xodimga premya belgilandi: ${val} so'm`);
                        alert(`${val} so'm premya muvaffaqiyatli belgilandi.`);
                        modal.style.display = 'none';
                        loadRomixHRData();
                    }
                };
            } else if (actionType === 'raise') {
                icon.textContent = '📈';
                title.textContent = "Oylikni O'zgartirish";
                desc.textContent = "Xodimning doimiy maoshini yangilang.";
                currentSaveBtn.style.background = 'linear-gradient(135deg, #00d2ff, #3a7bd5)';
                currentSaveBtn.style.boxShadow = '0 4px 15px rgba(0, 122, 255, 0.4)';
                currentSaveBtn.style.color = '#fff';

                container.innerHTML = `
                    <label style="font-size:0.8rem; color:var(--adm-text-sec); font-weight:600; margin-left:5px;">Yangi maosh miqdori</label>
                    <input type="number" id="hrActionSalary" class="form-input-v2" placeholder="Yangi oylikni kiriting" style="font-size:1.1rem; padding:15px; border-radius:14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); color:#fff; width:100%; box-sizing:border-box;">
                `;

                currentSaveBtn.onclick = async () => {
                    const val = document.getElementById('hrActionSalary').value;
                    if (val) {
                        currentSaveBtn.innerHTML = "Saqlanmoqda...";
                        const today = new Date().toISOString().split('T')[0];
                        await supabase.from('employees').update({ salary_info: val }).eq('id', selectedWorkerId);
                        const { error } = await supabase.from('attendance').insert({ employee_id: selectedWorkerId, date: today, status: `Oylik oshirildi: ${val}` });
                        if (error) { alert("Xatolik saqlashda: " + error.message); return; }
                        window.logToHistory(`Xodimning oyligi o'zgartirildi: ${val}`);
                        alert("Oylik muvaffaqiyatli yangilandi.");
                        modal.style.display = 'none';
                        loadRomixHRData();
                    }
                };
            } else if (actionType === 'leave') {
                icon.textContent = '🏝️';
                title.textContent = "Dam Olish (Otpusk)";
                desc.textContent = "Xodimga qaysi sanalar orasida dam berishni belgilang.";
                currentSaveBtn.style.background = 'linear-gradient(135deg, #00ff88, #00cc6a)';
                currentSaveBtn.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.4)';
                currentSaveBtn.style.color = '#000';

                const today = new Date().toISOString().split('T')[0];
                container.innerHTML = `
                    <div style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label style="font-size:0.8rem; color:var(--adm-text-sec); font-weight:600; margin-left:5px;">Boshlanish</label>
                            <input type="date" id="hrActionStart" value="${today}" style="font-size:1rem; padding:14px; border-radius:14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); color:#fff; width:100%; box-sizing:border-box; margin-top:5px; color-scheme:dark;">
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:0.8rem; color:var(--adm-text-sec); font-weight:600; margin-left:5px;">Tugash</label>
                            <input type="date" id="hrActionEnd" value="${today}" style="font-size:1rem; padding:14px; border-radius:14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); color:#fff; width:100%; box-sizing:border-box; margin-top:5px; color-scheme:dark;">
                        </div>
                    </div>
                `;

                currentSaveBtn.onclick = async () => {
                    const start = document.getElementById('hrActionStart').value;
                    const end = document.getElementById('hrActionEnd').value;
                    if (start && end) {
                        currentSaveBtn.innerHTML = "Yuborilmoqda...";

                        let currentDate = new Date(start);
                        const endDate = new Date(end);
                        const insertPromises = [];

                        while (currentDate <= endDate) {
                            const dStr = currentDate.toISOString().split('T')[0];
                            insertPromises.push(
                                supabase.from('attendance').insert({
                                    employee_id: selectedWorkerId,
                                    date: dStr,
                                    status: `Ruxsat so'raldi: ${start} dan ${end}`,
                                })
                            );
                            currentDate.setDate(currentDate.getDate() + 1);
                        }

                        try {
                            const { error: batchErr } = await Promise.all(insertPromises);
                            if (batchErr) { alert("Xatolik: " + batchErr.message); }
                        } catch (err) {
                            alert("Kutilmagan xatolik: " + err.message);
                            console.error('Leave insert issue', err);
                        }

                        window.logToHistory(`Dam olishga ruxsat so'rovi yuborildi: ${start} dan ${end} gacha`);
                        alert("Ruxsat berish so'rovi yuborildi. Rahbar tasdiqlashi kutilmoqda.");
                        modal.style.display = 'none';
                        checkPendingRequests();
                        loadRomixHRData();
                    }
                };
            }
            currentSaveBtn.innerHTML = "Tasdiqlash";
        }

        if (btnBonus && !btnBonus.dataset.initModal) {
            btnBonus.dataset.initModal = "true";
            btnBonus.onclick = () => openActionModal('bonus');
            btnRaise.onclick = () => openActionModal('raise');
            btnLeave.onclick = () => openActionModal('leave');
        }
    }

    // Check for requests every 30s
    setInterval(checkPendingRequests, 30000);
    setTimeout(checkPendingRequests, 2000);

    let editingStaffId = null;

    function initStaffModal() {
        const overlay = document.getElementById('staffModalOverlay');
        const openBtn = document.getElementById('openAddStaffModal');
        const openBtnMobile = document.getElementById('openAddStaffModalMobile');
        const closeBtn = document.getElementById('closeStaffModal');
        const saveBtn = document.getElementById('saveStaffBtn');
        const deleteStaffBtn = document.getElementById('deleteStaffBtn');

        const resetForm = () => {
            editingStaffId = null;
            document.getElementById('staffModalTitle').textContent = "Yangi Ishchi Qo'shish";
            document.getElementById('staffFullname').value = '';
            document.getElementById('staffRole').value = '';
            document.getElementById('staffPhone').value = '+998';
            document.getElementById('staffSalary').value = '';
            document.getElementById('staffJoinedYear').value = '';
            if (deleteStaffBtn) deleteStaffBtn.style.display = 'none';
        };

        if (openBtn) openBtn.onclick = () => { overlay.style.display = 'flex'; resetForm(); };
        if (openBtnMobile) openBtnMobile.onclick = () => { overlay.style.display = 'flex'; resetForm(); };

        if (closeBtn) closeBtn.onclick = () => overlay.style.display = 'none';

        if (saveBtn) {
            saveBtn.onclick = async () => {
                const full_name = document.getElementById('staffFullname').value.trim();
                const department = document.getElementById('staffDept').value;
                const role = document.getElementById('staffRole').value.trim();
                const phone = document.getElementById('staffPhone').value.trim();
                const salary = document.getElementById('staffSalary').value.trim();
                const birth_year = document.getElementById('staffBirthYear').value.trim();
                const joined_year = document.getElementById('staffJoinedYear').value.trim();

                if (!full_name || !role || !salary) {
                    alert("Iltimos, barcha asosiy maydonlarni to'ldiring!");
                    return;
                }

                saveBtn.textContent = "Saqlanmoqda...";
                const staffData = {
                    full_name,
                    role,
                    phone,
                    salary_info: salary.includes("so'm") ? salary : salary + " so'm",
                    birth_year: birth_year || null,
                    status: 'Ishlamoqda'
                };

                let result;
                if (editingStaffId) {
                    result = await supabase.from('employees').update(staffData).eq('id', editingStaffId);
                } else {
                    result = await supabase.from('employees').insert([staffData]);
                }

                saveBtn.textContent = "Xodimni Saqlash";
                if (!result.error) {
                    overlay.style.display = 'none';
                    loadRomixHRData();
                    alert(editingStaffId ? "Ma'lumotlar yangilandi!" : "Yangi xodim qo'shildi!");
                } else {
                    alert("Xatolik: " + result.error.message);
                }
            };
        }

        if (deleteStaffBtn) {
            deleteStaffBtn.onclick = async () => {
                if (editingStaffId && confirm("Haqiqatdan ham ushbu xodimni o'chirmoqchimisiz?")) {
                    const { error } = await supabase.from('employees').delete().eq('id', editingStaffId);
                    if (!error) {
                        overlay.style.display = 'none';
                        loadRomixHRData();
                        alert("Xodim o'chirildi.");
                    } else {
                        alert("Xatolik: " + error.message);
                    }
                }
            };
        }
    }

    function openEditStaffModal(emp) {
        const overlay = document.getElementById('staffModalOverlay');
        editingStaffId = emp.id;
        document.getElementById('staffModalTitle').textContent = "Ma'lumotlarni Tahrirlash";
        document.getElementById('staffFullname').value = emp.full_name;
        document.getElementById('staffDept').value = emp.department || 'Ustalar';
        document.getElementById('staffRole').value = emp.role || '';
        document.getElementById('staffPhone').value = emp.phone || '+998';
        const salaryVal = emp.salary_info ? emp.salary_info.toString().replace(/[^0-9]/g, '') : '';
        document.getElementById('staffSalary').value = salaryVal;
        const yearVal = emp.experience ? emp.experience.toString().replace(/[^0-9]/g, '') : '';
        document.getElementById('staffJoinedYear').value = yearVal;
        document.getElementById('staffBirthYear').value = emp.birth_year || '';

        const delBtn = document.getElementById('deleteStaffBtn');
        if (delBtn) delBtn.style.display = 'block';
        overlay.style.display = 'flex';
    }

    function setupStaffActions() {
        const btnEdit = document.getElementById('btn-edit-staff');
        const btnDelete = document.getElementById('btn-delete-staff');

        if (btnEdit) {
            btnEdit.onclick = () => {
                const emp = allEmployees.find(e => e.id === selectedWorkerId);
                if (emp) openEditStaffModal(emp);
                else alert("Xodim tanlanmagan!");
            };
        }

        if (btnDelete) {
            btnDelete.onclick = async () => {
                if (selectedWorkerId && confirm("Xodimni o'chirishni tasdiqlaysizmi?")) {
                    const { error } = await supabase.from('employees').delete().eq('id', selectedWorkerId);
                    if (!error) {
                        loadRomixHRData();
                        alert("O'chirildi.");
                    } else {
                        alert("Xatolik: " + error.message);
                    }
                }
            };
        }
    }

    function initHRPills() {
        const pills = document.querySelectorAll('.pill-btn');
        pills.forEach(pill => {
            if (pill.dataset.init) return;
            pill.dataset.init = "true";

            pill.onclick = () => {
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const cat = pill.textContent.trim().toLowerCase();

                let filtered = allEmployees;
                if (cat !== 'barchasi') {
                    let deptVal = pill.textContent.trim();
                    if (deptVal === 'Ustalar') {
                        filtered = allEmployees.filter(e =>
                            (e.department && (e.department.toLowerCase().includes('usta') || e.department.toLowerCase().includes('ishlab'))) ||
                            (e.role && e.role.toLowerCase().includes('usta'))
                        );
                    } else if (deptVal === 'Ombor') {
                        filtered = allEmployees.filter(e =>
                            (e.department && e.department.toLowerCase().includes('ombor')) ||
                            (e.role && e.role.toLowerCase().includes('ombor'))
                        );
                    } else if (deptVal === 'Ofis') {
                        filtered = allEmployees.filter(e =>
                            (e.department && e.department.toLowerCase().includes('ofis')) ||
                            (e.role && e.role.toLowerCase().includes('manager'))
                        );
                    } else if (deptVal === 'Xo\'jalik') {
                        filtered = allEmployees.filter(e =>
                            (e.department && e.department.toLowerCase().includes('xojalik'))
                        );
                    }
                }

                renderStaffList(filtered);

                if (filtered.length > 0 && window.innerWidth > 1024) {
                    selectedWorkerId = filtered[0].id;
                    updateStaffProfileCard(filtered[0]);
                }
            };
        });
    }

    function initStaffSearch() {
        const input = document.getElementById('staffSearchInput');
        if (!input || input.dataset.init) return;
        input.dataset.init = "true";
        input.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = allEmployees.filter(emp => emp.full_name.toLowerCase().includes(val) || (emp.role && emp.role.toLowerCase().includes(val)));
            renderStaffList(filtered);
        });
    }

    function initMobileFilters() {
        const chips = document.querySelectorAll('.filter-chips .chip');
        chips.forEach(chip => {
            if (chip.dataset.init) return;
            chip.dataset.init = "true";
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const dept = chip.dataset.dept;

                let filtered = allEmployees;
                if (dept !== 'all') {
                    filtered = allEmployees.filter(e => e.department === dept);
                }
                renderStaffList(filtered);

                // No auto-opening of drawer on mobile during filtering
                if (filtered.length > 0 && window.innerWidth > 1024) {
                    updateStaffProfileCard(filtered[0]);
                }
            });
        });
    }

    function initMobileSearch() {
        const input = document.getElementById('staffMobileSearch');
        if (!input || input.dataset.init) return;
        input.dataset.init = "true";
        input.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = allEmployees.filter(emp =>
                emp.full_name.toLowerCase().includes(val) ||
                (emp.role && emp.role.toLowerCase().includes(val)) ||
                (emp.department && emp.department.toLowerCase().includes(val))
            );
            renderStaffList(filtered);
        });
    }

    function renderStaffList(staff) {
        const container = document.getElementById('staff-list-container');
        const mobileContainer = document.getElementById('mobileStaffList');
        if (!container) return;

        if (!staff.length) {
            container.innerHTML = '<tr><td colspan="7" style="text-align:center; opacity:0.3; padding:40px;">Xodimlar topilmadi</td></tr>';
            if (mobileContainer) mobileContainer.innerHTML = '<div style="text-align:center; opacity:0.3; padding:40px; color:var(--adm-text-sec);">Xodimlar topilmadi</div>';
            return;
        }

        container.innerHTML = '';
        if (mobileContainer) mobileContainer.innerHTML = '';

        staff.forEach(emp => {
            // --- Desktop Rendering ---
            const tr = document.createElement('tr');
            tr.className = `table-row-staff ${emp.id === selectedWorkerId ? 'active' : ''}`;
            tr.style.cursor = 'pointer';
            tr.style.transition = '0.2s';

            const initials = emp.full_name.split(' ').map(n => n?.[0]).join('').substring(0, 2).toUpperCase() || '?';
            const salary = emp.salary_info || '---';
            const avatarHtml = emp.avatar_url
                ? `<img src="${emp.avatar_url}" style="width:32px; height:32px; border-radius:10px; object-fit:cover;">`
                : `<div style="width:32px; height:32px; border-radius:10px; background:linear-gradient(135deg, #00d2ff, #007aff); display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:700; color:#fff;">${initials}</div>`;

            tr.innerHTML = `
                <td style="padding:15px 24px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        ${avatarHtml}
                        <div style="font-weight:600; color:var(--adm-text); overflow:hidden; text-overflow:ellipsis;">${emp.full_name}</div>
                    </div>
                </td>
                <td style="font-size:0.85rem; color:var(--adm-text-sec); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${emp.role || '---'}</td>
                <td style="font-size:0.85rem; font-weight:700; color:var(--adm-accent); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${salary}</td>
                <td style="font-size:0.85rem; color:var(--adm-text-sec); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:0.8;">${emp.department || 'Bo\'limsiz'}</td>
                <td style="font-size:0.85rem; color:var(--adm-text-sec); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${emp.experience || 'Yangi'}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="width:8px; height:8px; border-radius:50%; background:#007c52; box-shadow:0 0 8px rgba(0,124,82,0.3);"></span>
                        <span style="font-size:0.75rem; color:#007c52; font-weight:700;">Faol</span>
                    </div>
                </td>
                <td style="text-align:right; padding-right:24px; display:flex; gap:10px; justify-content:flex-end;">
                    <button class="icon-small-btn view-staff-btn" data-id="${emp.id}" style="background:rgba(0,210,255,0.1); border:1px solid rgba(0,210,255,0.2); color:var(--accent-sec); width:32px; height:32px; cursor:pointer; border-radius:8px;" title="Profilni ko'rish">👁️</button>
                    <button class="icon-small-btn" style="background:var(--adm-bg); border:1px solid var(--adm-border); color:var(--adm-text); width:32px; height:32px; cursor:pointer; border-radius:8px;">⋮</button>
                </td>
            `;

            tr.onclick = () => {
                document.querySelectorAll('.table-row-staff').forEach(r => {
                    r.style.background = '';
                    r.classList.remove('active');
                });
                tr.style.background = 'rgba(0,210,255,0.08)';
                tr.classList.add('active');
                selectedWorkerId = emp.id;
                updateStaffProfileCard(emp);
                const detailPanel = document.querySelector('.hr-detail-panel');
                if (detailPanel && window.innerWidth > 1024) detailPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };

            container.appendChild(tr);

            // Eye Icon click handler
            const viewBtn = tr.querySelector('.view-staff-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Don't trigger the TR click twice
                    selectedWorkerId = emp.id;
                    updateStaffProfileCard(emp);
                    // Smooth scroll to profile on mobile/small screens
                    const detailPanel = document.querySelector('.hr-detail-panel');
                    if (detailPanel) detailPanel.scrollIntoView({ behavior: 'smooth' });
                });
            }

            // --- Mobile Rendering (Elite Cards) ---
            if (mobileContainer) {
                const card = document.createElement('div');
                card.className = 'staff-card-v2';
                card.innerHTML = `
                    <div class="sc-header">
                        <div class="sc-avatar">${initials}</div>
                        <div class="sc-info">
                            <div class="sc-name">${emp.full_name}</div>
                            <div class="sc-role">${emp.role || 'Bolimsiz'}</div>
                        </div>
                        <div class="sc-status present"></div>
                    </div>
                    <div class="sc-body">
                        <div class="sc-stat">
                            <span>Telefon</span>
                            <b>${emp.phone || '+998 ---'}</b>
                        </div>
                        <div class="sc-stat">
                            <span>Bo'lim</span>
                            <b>${emp.department || '---'}</b>
                        </div>
                    </div>
                    <div class="sc-actions">
                        <a href="tel:${emp.phone}" class="sc-btn call" style="text-decoration:none;">📞 Qo'ng'iroq</a>
                        <button class="sc-btn profile-trigger">⚙️ Profil</button>
                    </div>
                `;

                const btn = card.querySelector('.profile-trigger');
                if (btn) {
                    btn.addEventListener('click', () => {
                        updateStaffProfileCard(emp);
                    });
                }

                mobileContainer.appendChild(card);
            }
        });
    }

    function updateStaffProfileCard(emp) {
        if (!emp) return;
        selectedWorkerId = emp.id;
        const img = document.getElementById('selected-staff-img');
        const name = document.getElementById('selected-staff-name');
        const role = document.getElementById('selected-staff-role');
        const salary = document.getElementById('st-salary-badge');

        if (img) {
            img.src = emp.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.full_name)}&background=00ff88&color=000&size=200`;
        }
        if (name) name.textContent = emp.full_name;
        if (role) role.textContent = emp.role;
        if (salary) salary.textContent = emp.salary_info || '---';

        // Additional info details
        const phoneEl = document.getElementById('st-phone');
        const deptEl = document.getElementById('st-dept');
        const expEl = document.getElementById('st-exp');
        if (phoneEl) phoneEl.textContent = emp.phone || '+998-- --- -- --';
        if (deptEl) deptEl.textContent = emp.department || 'Bo\'limsiz';
        if (expEl) expEl.textContent = emp.experience || 'Yangi xodim';

        // KPI and Tracking
        const kpi = (85 + Math.floor(Math.random() * 15));
        const kpiVal = document.getElementById('st-kpi-val');
        const kpiBar = document.getElementById('kpi-bar');
        const workedHours = document.getElementById('worked-hours');
        if (kpiVal) kpiVal.textContent = kpi + "%";
        if (kpiBar) kpiBar.style.width = kpi + "%";
        if (workedHours) workedHours.textContent = "08:30";

        const timeIn = document.getElementById('st-time-in');
        const timeOut = document.getElementById('st-time-out');
        if (timeIn) timeIn.textContent = "08:12";
        if (timeOut) timeOut.textContent = "--:--";

        renderModernCalendar(currentCalMonth, currentCalYear);

        // --- 🛑 MOBILE DRAWER LOGIC (Refined) ---
        if (window.innerWidth <= 1024) {
            const rightContent = document.querySelector('.hr-right-content');
            if (rightContent) {
                rightContent.classList.add('mobile-drawer-active');
            }
        }
    }

    async function renderModernCalendar(month, year) {
        const calGrid = document.getElementById('calendar-grid-v2');
        if (!calGrid) return;

        let monthAtt = [];
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        if (selectedWorkerId) {
            const startStr = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
            const endStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${daysInMonth}`;
            const { data } = await supabase.from('attendance')
                .select('id, date, status')
                .eq('employee_id', selectedWorkerId)
                .gte('date', startStr)
                .lte('date', endStr);
            monthAtt = data || [];
        }

        const monthHeader = document.getElementById('current-month-name');
        const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
        if (monthHeader) monthHeader.textContent = monthNames[month] + " " + year;

        // Clear and completely rebuild labels to prevent duplication race condition
        calGrid.innerHTML = '';
        const days = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
        days.forEach(d => {
            const l = document.createElement('div');
            l.className = 'cal-day-label';
            l.textContent = d;
            calGrid.appendChild(l);
        });

        const firstDay = new Date(year, month, 1).getDay();
        const adjustedFirstDay = (firstDay === 0) ? 6 : firstDay - 1;
        const today = new Date();

        // Add padding
        for (let i = 0; i < adjustedFirstDay; i++) {
            const div = document.createElement('div');
            div.className = 'cal-day-num disabled';
            calGrid.appendChild(div);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const div = document.createElement('div');
            div.className = 'cal-day-num';
            div.textContent = d;

            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            const dayRecords = monthAtt.filter(a => a.date && a.date.startsWith(dateStr));

            let displayStatusHTML = 'Baza ma\'lumoti yo\'q';

            if (dayRecords.length > 0) {
                const hasLate = dayRecords.some(r => r.status.includes('Kech'));
                const hasPresent = dayRecords.some(r => r.status.includes('Vaqtida') || r.status.includes('Keldi'));
                const isAbsent = dayRecords.some(r => r.status.includes('Kelmagan'));
                const isLeave = dayRecords.some(r => r.status.includes('Ruxsat') || r.status.includes('Dam') || r.status.includes('Tasdiqlash kutilmoqda'));
                const isLeftEarly = dayRecords.some(r => r.status.includes('erta ketdi') || r.status.includes('shundan yuborildi') || r.status.includes('Ish vaqtida ketdi'));
                const isSpecial = dayRecords.some(r => r.status.includes('Premya') || r.status.includes('Oylik'));

                if (isAbsent) {
                    div.style.background = 'rgba(255, 77, 79, 0.15)';
                    div.style.borderBottom = '3px solid #ff4d4f';
                    div.style.color = '#ff4d4f';
                } else if (isLeftEarly) {
                    div.style.background = 'rgba(255, 184, 0, 0.15)';
                    div.style.borderBottom = '3px solid #ffb800';
                    div.style.color = '#ffb800';
                } else if (isLeave) {
                    div.style.background = 'rgba(128, 0, 32, 0.3)';
                    div.style.borderBottom = '3px solid #BA68C8';
                    div.style.color = '#BA68C8';
                } else if (hasPresent) {
                    div.style.background = 'rgba(0, 210, 255, 0.1)';
                    div.style.borderBottom = '3px solid #00d2ff';
                    div.style.color = '#00d2ff';
                } else if (isSpecial) {
                    div.style.borderBottom = '3px solid #ffb800';
                } else if (hasLate) {
                    div.classList.add('has-late');
                } else {
                    div.classList.add('has-att');
                }

                displayStatusHTML = dayRecords.map(r => {
                    let icon = '';
                    let color = 'var(--adm-text)';
                    let glow = 'rgba(0,0,0,0.05)';
                    let s = r.status;

                    if (s.includes('Premya')) { color = '#FFB800'; glow = 'rgba(255,184,0,0.1)'; }
                    else if (s.includes('Oylik')) { color = '#007aff'; glow = 'rgba(0,122,255,0.1)'; }
                    else if (s.includes('Ruxsat') || s.includes('Dam')) { color = '#BA68C8'; glow = 'rgba(186,104,200,0.1)'; }
                    else if (s.includes('Kech')) { color = '#ff4d4f'; glow = 'rgba(255,77,79,0.1)'; }
                    else if (s.includes('Vaqtida') || s.includes('Keldi')) { color = '#007c52'; glow = 'rgba(0,124,82,0.1)'; }

                    return `
                        <div class="premium-event-card" style="background:var(--adm-bg); border:1px solid var(--adm-border); padding:16px; border-radius:18px; margin-bottom:12px; position:relative; overflow:hidden;">
                            <div style="position:absolute; top:0; left:0; width:4px; height:100%; background:${color}; box-shadow:0 0 10px ${glow};"></div>
                            <div style="display:flex; justify-content:space-between; align-items:start; color:var(--adm-text);">
                                <div style="display:flex; gap:12px; align-items:center;">
                                    <div style="width:36px; height:36px; border-radius:10px; background:${glow}; display:flex; align-items:center; justify-content:center; font-size:1.1rem;">${icon}</div>
                                    <div style="font-weight:600; color:var(--adm-text); font-size:0.92rem; line-height:1.3;">${s}</div>
                                </div>
                            </div>
                            <div style="display:flex; gap:10px; margin-top:14px; border-top:1px solid var(--adm-border); padding-top:10px;">
                                <button onclick="window.editHrEvent('${r.id}', '${s}')" style="flex:1; background:var(--adm-bg); color:var(--adm-text-sec); border:1px solid var(--adm-border); padding:8px; border-radius:10px; cursor:pointer; font-size:0.75rem; transition:0.3s; font-weight:600;">Tahrirlash</button>
                                <button onclick="window.deleteHrEvent('${r.id}')" style="flex:1; background:rgba(255,77,79,0.05); color:#ff4d4f; border:1px solid rgba(255,77,79,0.1); padding:8px; border-radius:10px; cursor:pointer; font-size:0.75rem; transition:0.3s; font-weight:600;">O'chirish</button>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            if (year === today.getFullYear() && month === today.getMonth() && d === today.getDate()) {
                div.classList.add('today');
            }

            div.onclick = () => {
                document.querySelectorAll('.cal-day-num').forEach(c => c.classList.remove('active'));
                div.classList.add('active');
                showDayDetails(d, month, year, dayRecords, daysInMonth, monthNames);
            };

            if (year === today.getFullYear() && month === today.getMonth() && d === today.getDate()) {
                div.classList.add('today');
                div.classList.add('active');
                // Auto-load today's details
                showDayDetails(d, month, year, dayRecords, daysInMonth, monthNames);
            }

            calGrid.appendChild(div);
        }
    }

    function showDayDetails(d, month, year, dayRecords, daysInMonth, monthNames) {
        // PAYROLL / TIME TRACKER CALCULATION
        let workedHours = 0;
        let isPresent = dayRecords.some(r => r.status.includes('Vaqtida') || r.status.includes('Keldi'));
        let isLate = dayRecords.some(r => r.status.includes('Kech'));
        let isLeaving = dayRecords.some(r => r.status.includes('Ruxsat') || r.status.includes('Dam') || r.status.includes('Tasdiqlash'));

        if (isPresent) workedHours = 10;
        else if (isLate) workedHours = 8.5; // Mock for late
        if (isLeaving) workedHours = 0;

        let salaryText = '0';
        if (typeof allEmployees !== 'undefined' && selectedWorkerId) {
            const emp = allEmployees.find(e => e.id === selectedWorkerId);
            if (emp) salaryText = emp.salary_info || '0';
        }
        const monthlySalary = parseInt(String(salaryText).replace(/\D/g, '')) || 0;

        // Calculate Working days in month (assuming Sunday is off)
        let workingDaysCount = 0;
        for (let i = 1; i <= daysInMonth; i++) {
            if (new Date(year, month, i).getDay() !== 0) workingDaysCount++;
        }

        const dailyRate = workingDaysCount > 0 ? (monthlySalary / workingDaysCount) : 0;
        const hourlyRate = dailyRate / 10; // Default 10 hours workday (08:00 - 18:00)
        const earnedToday = Math.round(workedHours * hourlyRate);

        // Update Top Card Stats for the selected day
        const headHours = document.getElementById('worked-hours');
        const headIn = document.getElementById('st-time-in');
        const headOut = document.getElementById('st-time-out');
        if (headHours) headHours.textContent = workedHours > 0 ? (workedHours + ":00") : "00:00";
        if (headIn) headIn.textContent = isPresent ? "08:00" : "--:--";
        if (headOut) headOut.textContent = isPresent ? "18:00" : "--:--";

        // Update Big Display on the left
        const bigDate = document.getElementById('today-big-display');
        const bigDay = document.getElementById('today-day-name');
        const dateObj = new Date(year, month, d);
        const dayNames = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
        const monthNamesFull = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
        if (bigDate) bigDate.textContent = `${d} ${monthNamesFull[month]}`;
        if (bigDay) bigDay.textContent = `${dayNames[dateObj.getDay()]}, ${year}`;

        const displayStatusHTML = dayRecords.length === 0 ?
            `<div style="text-align:center; padding:30px; color:rgba(255,255,255,0.15); font-size:0.8rem; font-weight:500; border:1px dashed rgba(255,255,255,0.05); border-radius:15px; margin-top:10px;">Baza ma'lumoti topilmadi</div>` :
            dayRecords.map(r => {
                let color = '#fff';
                let glow = 'rgba(255,255,255,0.1)';
                let s = r.status;

                if (s.includes('Premya')) { color = '#FFD700'; glow = 'rgba(255,215,0,0.2)'; }
                else if (s.includes('Oylik')) { color = '#00d2ff'; glow = 'rgba(0,210,255,0.2)'; }
                else if (s.includes('Ruxsat') || s.includes('Dam')) { color = '#BA68C8'; glow = 'rgba(186,104,200,0.2)'; }
                else if (s.includes('Kech')) { color = '#ff4d4f'; glow = 'rgba(255,77,79,0.2)'; }
                else if (s.includes('Vaqtida') || s.includes('Keldi')) { color = '#00ff88'; glow = 'rgba(0,255,136,0.2)'; }

                return `
                    <div class="premium-event-card" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:16px; border-radius:18px; margin-bottom:10px; position:relative; overflow:hidden;">
                        <div style="position:absolute; top:0; left:0; width:4px; height:100%; background:${color}; box-shadow:0 0 15px ${glow};"></div>
                        <div style="display:flex; justify-content:space-between; align-items:start;">
                            <div style="font-weight:600; color:#fff; font-size:0.9rem; line-height:1.4;">${s}</div>
                        </div>
                        <div style="display:flex; gap:8px; margin-top:14px;">
                            <button onclick="window.editHrEvent('${r.id}', '${s}')" style="flex:1; background:rgba(255,255,255,0.03); color:rgba(255,255,255,0.4); border:1px solid rgba(255,255,255,0.06); padding:8px; border-radius:10px; cursor:pointer; font-size:0.7rem; transition:0.3s; font-weight:700;">Tahrirlash</button>
                            <button onclick="window.deleteHrEvent('${r.id}')" style="flex:1; background:rgba(255,77,79,0.03); color:#ff4d4f; border:1px solid rgba(255,77,79,0.08); padding:8px; border-radius:10px; cursor:pointer; font-size:0.7rem; transition:0.3s; font-weight:700;">O'chirish</button>
                        </div>
                    </div>
                `;
            }).join('');

        const details = document.getElementById('daily-att-details');
        if (details) {
            details.innerHTML = `
                <div style="width:100%;">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:12px; margin-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.06);">
                        <div style="font-size:1rem; font-weight:800; color:#fff;">${d} ${monthNames[month]} ${year}</div>
                        <div style="background:rgba(0,210,255,0.1); color:#00d2ff; padding:4px 8px; border-radius:8px; font-size:0.65rem; font-weight:700;">TANLANGAN KUN</div>
                    </div>

                    <!-- PAYROLL CARD -->
                    <div style="margin-bottom:18px; background:linear-gradient(135deg, rgba(0,210,255,0.1), rgba(0,0,0,0.3)); border:1px solid rgba(0,210,255,0.15); border-radius:18px; padding:15px; box-shadow:0 8px 32px rgba(0,0,0,0.1);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <div style="font-size:0.75rem; color:rgba(255,255,255,0.5); font-weight:500;">Ish vaqti</div>
                            <div style="font-size:0.85rem; color:#fff; font-weight:700;">${workedHours} soat</div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <div style="font-size:0.75rem; color:rgba(255,255,255,0.5); font-weight:500;">Stavka</div>
                            <div style="font-size:0.8rem; color:rgba(255,255,255,0.7);">${Math.round(dailyRate).toLocaleString()} UZS</div>
                        </div>
                        <div style="height:1px; background:rgba(255,255,255,0.05); margin-bottom:12px;"></div>
                        <div style="font-size:1.4rem; font-weight:900; color:#00ff88; text-shadow:0 0 15px rgba(0,255,136,0.3);">
                            +${earnedToday.toLocaleString()} <span style="font-size:0.7rem; font-weight:500; color:rgba(255,255,255,0.4);">so'm ishladi</span>
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; width:100%;">
                        ${displayStatusHTML}
                    </div>
                </div>
            `;
        }
    }

    // --- 🏦 HR ACTION LOGIC (Premya, Oylik, Edit, Delete, Hisobot) ---
    // --- 🏦 HR ACTION LOGIC (Premium Modals v4.8) ---
    const btnBonus = document.getElementById('btn-bonus');
    const btnRaise = document.getElementById('btn-raise');
    const btnEdit = document.getElementById('btn-edit-staff');
    const btnDelete = document.getElementById('btn-delete-staff');
    const btnReport = document.getElementById('btn-hisobot-staff');
    const hrModal = document.getElementById('hrActionModalOverlay');
    const reportModal = document.getElementById('reportModalOverlay');

    if (btnBonus) btnBonus.onclick = () => openHRAction('Premya');
    if (btnRaise) btnRaise.onclick = () => openHRAction('Oylik');
    if (btnEdit) btnEdit.onclick = () => openEditStaff();
    if (btnDelete) btnDelete.onclick = () => deleteWorker();
    if (btnReport) btnReport.onclick = () => { if (reportModal) reportModal.style.display = 'flex'; };

    let selectedReportDays = 30; // Default

    window.selectReportPeriod = (days, btn) => {
        selectedReportDays = days;
        document.querySelectorAll('.report-cycle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    };

    const genPdfBtn = document.getElementById('genPdfBtn');
    const genXlsBtn = document.getElementById('genXlsBtn');
    if (genPdfBtn) genPdfBtn.onclick = () => generateEmployeeReport(selectedReportDays, 'pdf');
    if (genXlsBtn) genXlsBtn.onclick = () => generateEmployeeReport(selectedReportDays, 'excel');

    function openHRAction(type) {
        if (!selectedWorkerId) { alert('Avval xodimni tanlang!'); return; }
        const icon = document.getElementById('hrActionModalIcon');
        const title = document.getElementById('hrActionModalTitle');
        const input = document.getElementById('hrActionValue');

        if (icon) icon.textContent = type === 'Premya' ? '💰' : '📈';
        if (title) title.textContent = type === 'Premya' ? 'Premya tayinlash' : 'Oylikni yangilash';
        if (input) {
            input.placeholder = type === 'Premya' ? 'Summani kiriting (UZS)' : 'Yangi stavkani kiriting';
            input.value = '';
            input.className = 'form-input-v2';
        }

        if (hrModal) {
            hrModal.style.display = 'flex';
            const saveBtn = document.getElementById('hrActionSaveBtn');
            if (saveBtn) saveBtn.onclick = () => saveHRAction(type);

            const closeBtn = document.getElementById('hrActionCloseBtn');
            if (closeBtn) closeBtn.onclick = () => hrModal.style.display = 'none';
        }
    }

    async function saveHRAction(type) {
        const inputEl = document.getElementById('hrActionValue');
        const val = inputEl ? inputEl.value.trim() : '';
        if (!val) { alert('Summani kiriting!'); return; }

        const saveBtn = document.getElementById('hrActionSaveBtn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Muvaffaqiyatli... ✅';
        saveBtn.style.background = '#00ff88';
        saveBtn.style.color = '#000';

        try {
            if (type === 'Premya') {
                const todayStr = new Date().toISOString().split('T')[0];
                await supabase.from('attendance').insert([{
                    employee_id: selectedWorkerId,
                    date: todayStr,
                    status: `Premya: ${val.toLocaleString()} UZS`
                }]);
            } else if (type === 'Oylik') {
                await supabase.from('employees').update({ salary_info: val.toLocaleString() + " UZS" }).eq('id', selectedWorkerId);
            }

            setTimeout(() => {
                if (hrModal) hrModal.style.display = 'none';
                saveBtn.textContent = originalText;
                saveBtn.style.background = '';
                saveBtn.style.color = '';
                fetchStaff();
            }, 1000);
        } catch (err) {
            console.error(err);
            alert('Xatolik yuz berdi.');
            saveBtn.textContent = originalText;
        }
    }

    async function generateEmployeeReport(daysLimit, format) {
        const worker = allEmployees.find(e => e.id === selectedWorkerId);
        if (!worker) return;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysLimit);
        const startStr = startDate.toISOString().split('T')[0];

        const { data: attendance } = await supabase.from('attendance')
            .select('*')
            .eq('employee_id', selectedWorkerId)
            .gte('date', startStr)
            .order('date', { ascending: true });

        if (!attendance || attendance.length === 0) {
            alert("Ushbu davr uchun ma'lumot topilmadi.");
            return;
        }

        if (format === 'pdf') {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.setFontSize(22);
            doc.setTextColor(0, 124, 82);
            doc.text("AKFA ROMIX ENTERPRISE", 105, 20, { align: "center" });
            doc.setFontSize(14);
            doc.setTextColor(100, 100, 100);
            doc.text(`Xodimlarning Rasmiy Hisoboti`, 105, 30, { align: "center" });

            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(`Xodim: ${worker.full_name}`, 20, 50);
            doc.text(`Lavozimi: ${worker.role || '---'}`, 20, 58);
            doc.text(`Hisobot davri: ${startStr} - ${new Date().toISOString().split('T')[0]}`, 20, 66);
            doc.text(`Joriy oylik stavka: ${worker.salary_info || '---'}`, 20, 74);

            const tableData = attendance.map(a => [a.date, a.status]);
            doc.autoTable({
                startY: 85,
                head: [['SANA', 'HOLAT VA AMALLAR']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [0, 124, 82], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 10, cellPadding: 5 }
            });

            doc.save(`AKFA_Hisobot_${worker.full_name.replace(/ /g, '_')}.pdf`);
        } else {
            const ws = XLSX.utils.json_to_sheet(attendance.map(a => ({
                "SANASI": a.date,
                "F.I.O": worker.full_name,
                "STATUS / AMAL": a.status
            })));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Xodim_Hisoboti");
            XLSX.writeFile(wb, `AKFA_Hisobot_${worker.full_name.replace(/ /g, '_')}.xlsx`);
        }

        if (reportModal) reportModal.style.display = 'none';
    }

    async function deleteWorker() {
        if (!selectedWorkerId) return;
        if (confirm('Xodimni butkul o\'chirmoqchimisiz?')) {
            await supabase.from('employees').delete().eq('id', selectedWorkerId);
            selectedWorkerId = null;
            fetchStaff();
        }
    }

    window.closeHrModal = () => { if (hrModal) hrModal.style.display = 'none'; };

    // Pulse animation for the chart bars
    const chartBars = document.querySelectorAll('.v2-bar');
    chartBars.forEach((bar, index) => {
        const height = bar.style.height;
        bar.style.height = '0';
        setTimeout(() => {
            bar.style.height = height;
        }, index * 100);
    });

    // ========================================================
    // ======== BUHGALTERIYA MODULE (Full Accounting) =========
    // ========================================================

    // --- Data Storage Keys ---
    const BUH_KEYS = {
        employees: 'buh_employees_v1',
        transactions: 'buh_transactions_v1',
        utilities: 'buh_utilities_v1',
        energySettings: 'buh_energy_settings_v1',
        recipes: 'buh_recipes_v1',
        sales: 'buh_sales_v1'
    };

    function buhFormatMoney(n) {
        if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        return n.toLocaleString();
    }

    // --- Inner Tab Switching ---
    const buhTabBtns = document.querySelectorAll('.buh-tab-btn[data-buh-tab]');
    const buhTabContents = document.querySelectorAll('.buh-tab-content');
    buhTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-buh-tab');
            buhTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            buhTabContents.forEach(c => {
                c.classList.remove('active');
                if (c.id === tab) c.classList.add('active');
            });
        });
    });

    // --- Supabase Schema Verification and Sync Status ---
    let buhUseSupabase = false;
    
    // SQL Script representing the Supabase Schema
    const BUH_SQL_SCRIPT = `-- Existing table update (safely runs if table already exists)
ALTER TABLE buh_transactions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'UZS';
ALTER TABLE buh_employees ADD COLUMN IF NOT EXISTS price_serisi NUMERIC DEFAULT 25600;
ALTER TABLE buh_employees ADD COLUMN IF NOT EXISTS price_redlayn NUMERIC DEFAULT 33000;
ALTER TABLE buh_employees ADD COLUMN IF NOT EXISTS price_kombo NUMERIC DEFAULT 50000;

-- 1. Xodimlar
CREATE TABLE IF NOT EXISTS buh_employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    salary NUMERIC DEFAULT 0,
    position TEXT DEFAULT 'Ishchi',
    price_serisi NUMERIC DEFAULT 25600,
    price_redlayn NUMERIC DEFAULT 33000,
    price_kombo NUMERIC DEFAULT 50000,
    work_days INTEGER DEFAULT 26,
    works_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Ombor Tranzaksiyalari
CREATE TABLE IF NOT EXISTS buh_transactions (
    id TEXT PRIMARY KEY,
    material TEXT NOT NULL,
    type TEXT NOT NULL,
    qty INTEGER DEFAULT 0,
    price NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'UZS',
    date TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Kommunal Xarajatlar
CREATE TABLE IF NOT EXISTS buh_utilities (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    date TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Retseptlar
CREATE TABLE IF NOT EXISTS buh_recipes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    qty INTEGER DEFAULT 0,
    price NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Sotuvlar
CREATE TABLE IF NOT EXISTS buh_sales (
    id TEXT PRIMARY KEY,
    buyer TEXT NOT NULL,
    product TEXT NOT NULL,
    qty INTEGER DEFAULT 0,
    sale_price NUMERIC DEFAULT 0,
    tan_narxi NUMERIC DEFAULT 0,
    total_revenue NUMERIC DEFAULT 0,
    total_cost NUMERIC DEFAULT 0,
    profit NUMERIC DEFAULT 0,
    date TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);`;

    // Initialize Connection Checks
    async function checkBuhSupabaseConnection() {
        try {
            // Check connection by performing a test select on buh_employees
            const { error } = await supabase.from('buh_employees').select('id').limit(1);
            if (error && error.code === 'PGRST116') {
                buhUseSupabase = true;
            } else if (error) {
                console.warn('Supabase buh_employees table not found or error:', error);
                buhUseSupabase = false;
            } else {
                buhUseSupabase = true;
            }
        } catch (e) {
            console.warn('Supabase Buhgalteriya connection error, falling back to local storage:', e);
            buhUseSupabase = false;
        }
        updateBuhDbStatusUI();
    }

    function updateBuhDbStatusUI() {
        const badge = document.getElementById('buh-db-status');
        const dot = document.getElementById('buh-db-dot');
        if (!badge || !dot) return;

        if (buhUseSupabase) {
            badge.style.background = 'rgba(0, 255, 136, 0.1)';
            badge.style.borderColor = 'rgba(0, 255, 136, 0.25)';
            badge.style.color = '#00ff88';
            badge.innerHTML = `<span style="width: 8px; height: 8px; border-radius: 50%; background: #00ff88; display: inline-block; box-shadow: 0 0 8px #00ff88;" id="buh-db-dot"></span> SUPABASE SYNCED`;
        } else {
            badge.style.background = 'rgba(250, 187, 24, 0.1)';
            badge.style.borderColor = 'rgba(250, 187, 24, 0.25)';
            badge.style.color = '#fabb18';
            badge.innerHTML = `<span style="width: 8px; height: 8px; border-radius: 50%; background: #fabb18; display: inline-block; box-shadow: 0 0 8px #fabb18;" id="buh-db-dot"></span> LOKAL REJIM (localStorage)`;
        }
    }

    // Modal Helpers
    window.openBuhDbSetupModal = () => {
        const modal = document.getElementById('buh-db-modal');
        const pre = document.getElementById('buh-sql-code');
        if (pre) pre.textContent = BUH_SQL_SCRIPT;
        if (modal) modal.style.display = 'flex';
    };

    window.closeBuhDbSetupModal = () => {
        const modal = document.getElementById('buh-db-modal');
        if (modal) modal.style.display = 'none';
    };

    window.copyBuhSqlScript = () => {
        navigator.clipboard.writeText(BUH_SQL_SCRIPT)
            .then(() => window.showPremiumToast('Nusxalandi', 'SQL skript clipboardga saqlandi.'))
            .catch(() => window.showPremiumToast('Xatolik', 'Nusxalashda xatolik yuz berdi.', false));
    };

    // --- Hybrid Storage Manager (DB) ---
    const DB = {
        async select(supabaseTable, localKey) {
            if (buhUseSupabase) {
                try {
                    const { data, error } = await supabase.from(supabaseTable).select('*').order('id', { ascending: false });
                    if (!error && data) {
                        localStorage.setItem(localKey, JSON.stringify(data));
                        return data;
                    }
                    console.warn(`Supabase select error on ${supabaseTable}:`, error);
                } catch (e) {
                    console.warn(`Supabase select exception on ${supabaseTable}:`, e);
                }
            }
            try { return JSON.parse(localStorage.getItem(localKey)) || []; } catch { return []; }
        },

        async insert(supabaseTable, localKey, record) {
            let localList = [];
            try { localList = JSON.parse(localStorage.getItem(localKey)) || []; } catch {}
            localList.unshift(record); // Use unshift so newest is first locally
            localStorage.setItem(localKey, JSON.stringify(localList));

            if (buhUseSupabase) {
                try {
                    const pgRecord = { ...record };
                    if (supabaseTable === 'buh_employees') {
                        pgRecord.work_days = record.workDays || 26;
                        pgRecord.works_completed = record.worksCompleted || 0;
                        delete pgRecord.workDays;
                        delete pgRecord.worksCompleted;
                    }
                    if (supabaseTable === 'buh_sales') {
                        pgRecord.total_revenue = record.totalRevenue;
                        pgRecord.total_cost = record.totalCost;
                        pgRecord.sale_price = record.salePrice;
                        pgRecord.tan_narxi = record.tanNarxi;
                        delete pgRecord.totalRevenue;
                        delete pgRecord.totalCost;
                        delete pgRecord.salePrice;
                        delete pgRecord.tanNarxi;
                    }
                    
                    // Sync clapak_inventory stock quantity when transaction is added
                    if (supabaseTable === 'buh_transactions') {
                        try {
                            const { data: existing } = await supabase.from('clapak_inventory').select('*').eq('product_name', record.material).limit(1);
                            if (existing && existing.length > 0) {
                                const currentQty = parseInt(existing[0].stock_quantity) || 0;
                                const newQty = record.type === 'kirim' ? (currentQty + record.qty) : Math.max(0, currentQty - record.qty);
                                await supabase.from('clapak_inventory').update({ stock_quantity: newQty }).eq('id', existing[0].id);
                            } else if (record.type === 'kirim') {
                                await supabase.from('clapak_inventory').insert([{
                                    product_name: record.material,
                                    category: 'Xomashyo',
                                    stock_quantity: record.qty,
                                    price: record.price,
                                    unit: 'dona',
                                    description: `Buhgalteriya Kirimi | Currency: ${record.currency || 'UZS'}`
                                }]);
                            }
                        } catch (invErr) {
                            console.error('Failed to sync clapak_inventory:', invErr);
                        }
                    }

                    const { error } = await supabase.from(supabaseTable).insert([pgRecord]);
                    if (error) console.warn(`Supabase insert failed on ${supabaseTable}:`, error);
                } catch (e) {
                    console.warn(`Supabase insert exception on ${supabaseTable}:`, e);
                }
            }
            return record;
        },

        async delete(supabaseTable, localKey, id) {
            let localList = [];
            try { localList = JSON.parse(localStorage.getItem(localKey)) || []; } catch {}
            const recordToDelete = localList.find(x => x.id === id);
            localList = localList.filter(x => x.id !== id);
            localStorage.setItem(localKey, JSON.stringify(localList));

            if (buhUseSupabase) {
                try {
                    // Revert clapak_inventory stock level when transaction is deleted
                    if (supabaseTable === 'buh_transactions' && recordToDelete) {
                        try {
                            const { data: existing } = await supabase.from('clapak_inventory').select('*').eq('product_name', recordToDelete.material).limit(1);
                            if (existing && existing.length > 0) {
                                const currentQty = parseInt(existing[0].stock_quantity) || 0;
                                const newQty = recordToDelete.type === 'kirim' ? Math.max(0, currentQty - recordToDelete.qty) : (currentQty + recordToDelete.qty);
                                await supabase.from('clapak_inventory').update({ stock_quantity: newQty }).eq('id', existing[0].id);
                            }
                        } catch (invErr) {
                            console.error('Failed to revert clapak_inventory stock level:', invErr);
                        }
                    }

                    const { error } = await supabase.from(supabaseTable).delete().eq('id', id);
                    if (error) console.warn(`Supabase delete failed on ${supabaseTable}:`, error);
                } catch (e) {
                    console.warn(`Supabase delete exception on ${supabaseTable}:`, e);
                }
            }
        }
    };

    function getUsdRate() {
        return parseFloat(localStorage.getItem('buh_usd_rate')) || 12800;
    }

    window.saveBuhUsdRate = () => {
        const rate = parseFloat(document.getElementById('buh-usd-rate')?.value) || 12800;
        localStorage.setItem('buh_usd_rate', rate.toString());
        renderBuhOmbor();
        renderBuhSales();
        updateBuhKPIs();
        window.showPremiumToast('Kurs Yangilandi', `1 USD = ${rate.toLocaleString()} UZS qilib belgilandi.`);
    };

    // ========================
    // MAIN LOAD FUNCTION
    // ========================
    async function loadBuhgalteriya() {
        const rateInput = document.getElementById('buh-usd-rate');
        if (rateInput) rateInput.value = getUsdRate();

        const typeSelect = document.getElementById('buh-emp-type');
        if (typeSelect && !typeSelect.dataset.listenerAdded) {
            typeSelect.dataset.listenerAdded = 'true';
            typeSelect.addEventListener('change', (e) => {
                const type = e.target.value;
                const salaryGroup = document.getElementById('buh-salary-group');
                const serisiGroup = document.getElementById('buh-price-serisi-group');
                const redlaynGroup = document.getElementById('buh-price-redlayn-group');
                const komboGroup = document.getElementById('buh-price-kombo-group');
                
                if (type === 'zdelniy') {
                    if (salaryGroup) salaryGroup.style.display = 'none';
                    if (serisiGroup) serisiGroup.style.display = 'flex';
                    if (redlaynGroup) redlaynGroup.style.display = 'flex';
                    if (komboGroup) komboGroup.style.display = 'flex';
                } else {
                    if (salaryGroup) salaryGroup.style.display = 'flex';
                    if (serisiGroup) serisiGroup.style.display = 'none';
                    if (redlaynGroup) redlaynGroup.style.display = 'none';
                    if (komboGroup) komboGroup.style.display = 'none';
                }
            });
        }

        await checkBuhSupabaseConnection();
        await renderBuhEmployees();
        await renderBuhOmbor();
        await renderBuhHarajatlar();
        await renderBuhSales();
        await updateBuhKPIs();
    }
    window.loadBuhgalteriya = loadBuhgalteriya;

    // ========================
    // BLOK 1: XODIMLAR
    // ========================
    window.addBuhEmployee = async () => {
        const name = document.getElementById('buh-emp-name')?.value.trim();
        const type = document.getElementById('buh-emp-type')?.value;
        const position = document.getElementById('buh-emp-position')?.value.trim() || 'Ishchi';
        
        if (!name) {
            window.showPremiumToast('Xatolik', 'Ism kiritilishi shart!', false);
            return;
        }

        let salary = 0;
        let priceSerisi = 25600;
        let priceRedlayn = 33000;
        let priceKombo = 50000;

        if (type === 'oklad') {
            salary = parseInt(document.getElementById('buh-emp-salary')?.value) || 0;
            if (salary <= 0) {
                window.showPremiumToast('Xatolik', 'Maosh kiritilishi shart!', false);
                return;
            }
        } else {
            priceSerisi = parseInt(document.getElementById('buh-emp-price-serisi')?.value) || 25600;
            priceRedlayn = parseInt(document.getElementById('buh-emp-price-redlayn')?.value) || 33000;
            priceKombo = parseInt(document.getElementById('buh-emp-price-kombo')?.value) || 50000;
        }

        await DB.insert('buh_employees', BUH_KEYS.employees, { 
            id: Date.now().toString(), 
            name, 
            type, 
            salary, 
            position, 
            price_serisi: priceSerisi,
            price_redlayn: priceRedlayn,
            price_kombo: priceKombo,
            workDays: 26, 
            worksCompleted: 0 
        });

        document.getElementById('buh-emp-name').value = '';
        const salInput = document.getElementById('buh-emp-salary');
        if (salInput) salInput.value = '';
        document.getElementById('buh-emp-position').value = '';
        
        const serInput = document.getElementById('buh-emp-price-serisi');
        if (serInput) serInput.value = '25600';
        const redInput = document.getElementById('buh-emp-price-redlayn');
        if (redInput) redInput.value = '33000';
        const komInput = document.getElementById('buh-emp-price-kombo');
        if (komInput) komInput.value = '50000';

        await renderBuhEmployees();
        await updateBuhKPIs();
        window.showPremiumToast('Xodim Qo\'shildi', `${name} muvaffaqiyatli ro'yxatga olindi.`);
    };

    async function renderBuhEmployees() {
        const emps = await DB.select('buh_employees', BUH_KEYS.employees);
        const normalizedEmps = emps.map(e => ({
            id: e.id,
            name: e.name,
            type: e.type,
            salary: parseFloat(e.salary) || 0,
            position: e.position || 'Ishchi',
            price_serisi: parseFloat(e.price_serisi) || 25600,
            price_redlayn: parseFloat(e.price_redlayn) || 33000,
            price_kombo: parseFloat(e.price_kombo) || 50000,
            workDays: e.work_days !== undefined ? e.work_days : (e.workDays || 26),
            worksCompleted: e.works_completed !== undefined ? e.works_completed : (e.worksCompleted || 0)
        }));

        const okladEmps = normalizedEmps.filter(e => e.type === 'oklad');
        const zdelEmps = normalizedEmps.filter(e => e.type === 'zdelniy');

        // Stats
        const okladCountEl = document.getElementById('buh-oklad-count');
        const zdelCountEl = document.getElementById('buh-zdel-count');
        const totalEmpEl = document.getElementById('buh-total-emp');
        if (okladCountEl) okladCountEl.textContent = okladEmps.length;
        if (zdelCountEl) zdelCountEl.textContent = zdelEmps.length;
        if (totalEmpEl) totalEmpEl.textContent = normalizedEmps.length;

        // Oklad table
        let okladTotal = 0;
        const okladTable = document.getElementById('buh-oklad-table');
        if (okladTable) {
            okladTable.innerHTML = okladEmps.length === 0
                ? '<tr><td colspan="5" style="text-align:center; color:rgba(255,255,255,0.2); padding:30px;">Oklad xodimlar yo\'q</td></tr>'
                : okladEmps.map(e => {
                    okladTotal += e.salary;
                    return `<tr>
                        <td style="font-weight:700; color:#fff;">${e.name}</td>
                        <td>${e.position}</td>
                        <td style="color:#00d2ff; font-weight:700;">${e.workDays} kun</td>
                        <td style="font-weight:800; color:#00ff88;">${e.salary.toLocaleString()} UZS</td>
                        <td style="text-align:right;"><button class="buh-btn-danger" onclick="window.deleteBuhEmployee('${e.id}')" style="padding: 4px 8px;">🗑️</button></td>
                    </tr>`;
                }).join('');
        }
        const okladTotalEl = document.getElementById('buh-oklad-total');
        if (okladTotalEl) okladTotalEl.textContent = okladTotal.toLocaleString() + ' UZS';

        // Zdelniy table
        let zdelTotal = 0;
        const zdelTable = document.getElementById('buh-zdel-table');
        if (zdelTable) {
            zdelTable.innerHTML = zdelEmps.length === 0
                ? '<tr><td colspan="5" style="text-align:center; color:rgba(255,255,255,0.2); padding:30px;">Zdelniy xodimlar yo\'q</td></tr>'
                : zdelEmps.map(e => {
                    const works = e.worksCompleted || 0;
                    const earned = works * e.salary;
                    zdelTotal += earned;
                    return `<tr>
                        <td style="font-weight:700; color:#fff;">${e.name}</td>
                        <td>${e.position}</td>
                        <td style="color:#fabb18; font-weight:700;">${works} dona × ${e.salary.toLocaleString()}</td>
                        <td style="font-weight:800; color:#fabb18;">${earned.toLocaleString()} UZS</td>
                        <td style="text-align:right;"><button class="buh-btn-danger" onclick="window.deleteBuhEmployee('${e.id}')" style="padding: 4px 8px;">🗑️</button></td>
                    </tr>`;
                }).join('');
        }
        // Update zdelniy total display
        const zdelTotalEl = document.getElementById('buh-zdel-total');
        if (zdelTotalEl) zdelTotalEl.textContent = zdelTotal.toLocaleString() + ' UZS';

        // --- Kraska Zdelniy (Piece-Rate) Calculations ---
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);

        let kraskaLogs = [];
        if (buhUseSupabase) {
            try {
                const { data, error } = await supabase
                    .from('clapak_kraska_logs')
                    .select('*')
                    .gte('created_at', startOfMonth.toISOString());
                if (!error && data) {
                    kraskaLogs = data;
                    localStorage.setItem('clapak_kraska_logs_local', JSON.stringify(data));
                }
            } catch (e) {
                console.warn('Error loading clapak_kraska_logs from Supabase:', e);
            }
        }
        if (kraskaLogs.length === 0) {
            try {
                kraskaLogs = JSON.parse(localStorage.getItem('clapak_kraska_logs_local')) || [];
            } catch {
                kraskaLogs = [];
            }
        }

        // Group by worker and calculate with custom rates
        const paintersMap = new Map();
        kraskaLogs.forEach(log => {
            const workerName = log.worker_name || 'Noma\'lum';
            const workerId = log.worker_id || 'K1';
            const paintType = log.paint_type || 'Serisi';
            const qty = parseInt(log.quantity) || 36;
            
            // Find custom rates for this worker
            const emp = normalizedEmps.find(e => e.name.toLowerCase() === workerName.toLowerCase() || e.id === workerId);
            const rateSerisi = emp ? emp.price_serisi : 25600;
            const rateRedlayn = emp ? emp.price_redlayn : 33000;
            const rateKombo = emp ? emp.price_kombo : 50000;
            
            let price = 0;
            if (paintType === 'Serisi') price = rateSerisi;
            else if (paintType === 'Redlayn') price = rateRedlayn;
            else if (paintType === 'Kombo') price = rateKombo;

            if (!paintersMap.has(workerName)) {
                paintersMap.set(workerName, {
                    name: workerName,
                    id: workerId,
                    serisiCount: 0,
                    redlaynCount: 0,
                    komboCount: 0,
                    totalCarts: 0,
                    totalQuantity: 0,
                    totalEarned: 0,
                    rateSerisi,
                    rateRedlayn,
                    rateKombo
                });
            }
            
            const stats = paintersMap.get(workerName);
            stats.totalCarts++;
            stats.totalQuantity += qty;
            stats.totalEarned += price;
            
            if (paintType === 'Serisi') stats.serisiCount++;
            else if (paintType === 'Redlayn') stats.redlaynCount++;
            else if (paintType === 'Kombo') stats.komboCount++;
        });

        // Render Kraska table
        let kraskaTotal = 0;
        const kraskaTable = document.getElementById('buh-kraska-table');
        if (kraskaTable) {
            if (paintersMap.size === 0) {
                kraskaTable.innerHTML = '<tr><td colspan="7" style="text-align:center; color:rgba(255,255,255,0.2); padding:30px;">Bo\'yalgan aravachalar topilmadi (Bu oyda hali ish bajarilmagan) 🎨</td></tr>';
            } else {
                let rowsHtml = '';
                paintersMap.forEach(p => {
                    kraskaTotal += p.totalEarned;
                    rowsHtml += `<tr>
                        <td style="font-weight:700; color:#fff;">${p.name} <small style="color:rgba(255,255,255,0.35); margin-left:4px;">(ID: ${p.id})</small></td>
                        <td style="color:#00ff88; font-weight:700;">${p.serisiCount} arava <small style="color:rgba(255,255,255,0.4); display:block; font-size:0.7rem;">(×${p.rateSerisi.toLocaleString()} UZS)</small></td>
                        <td style="color:#00d2ff; font-weight:700;">${p.redlaynCount} arava <small style="color:rgba(255,255,255,0.4); display:block; font-size:0.7rem;">(×${p.rateRedlayn.toLocaleString()} UZS)</small></td>
                        <td style="color:#ba00ff; font-weight:700;">${p.komboCount} arava <small style="color:rgba(255,255,255,0.4); display:block; font-size:0.7rem;">(×${p.rateKombo.toLocaleString()} UZS)</small></td>
                        <td style="font-weight:800; color:#fff;">${p.totalCarts} ta</td>
                        <td style="color:rgba(255,255,255,0.65);">${p.totalQuantity} dona</td>
                        <td style="font-weight:900; color:#ba00ff; font-family:\'Outfit\';">${p.totalEarned.toLocaleString()} UZS</td>
                    </tr>`;
                });
                kraskaTable.innerHTML = rowsHtml;
            }
        }
        
        const kraskaTotalEl = document.getElementById('buh-kraska-total');
        if (kraskaTotalEl) kraskaTotalEl.textContent = kraskaTotal.toLocaleString() + ' UZS';

        // Update maosh fond KPI
        const maoshFondEl = document.getElementById('buh-maosh-fond');
        if (maoshFondEl) {
            const total = okladTotal + zdelTotal + kraskaTotal;
            maoshFondEl.innerHTML = `${buhFormatMoney(total)} <small>UZS</small>`;
        }
    }

    window.deleteBuhEmployee = async (id) => {
        if (confirm("Haqiqatdan ham ushbu xodimni o'chirmoqchimisiz?")) {
            await DB.delete('buh_employees', BUH_KEYS.employees, id);
            await renderBuhEmployees();
            await updateBuhKPIs();
            window.showPremiumToast("Xodim O'chirildi", "Xodim buxgalteriya ro'yxatidan olib tashlandi.", true);
        }
    };

    // ========================
    // BLOK 2: OMBOR
    // ========================
    window.addBuhTransaction = async () => {
        const material = document.getElementById('buh-trx-material')?.value.trim();
        const type = document.getElementById('buh-trx-type')?.value;
        const qty = parseInt(document.getElementById('buh-trx-qty')?.value) || 0;
        const price = parseInt(document.getElementById('buh-trx-price')?.value) || 0;
        const currency = document.getElementById('buh-trx-currency')?.value || 'UZS';
        if (!material || qty <= 0) {
            window.showPremiumToast('Xatolik', 'Material va miqdorni kiriting!', false);
            return;
        }
        await DB.insert('buh_transactions', BUH_KEYS.transactions, {
            id: Date.now().toString(),
            material, type, qty, price,
            total: qty * price,
            currency,
            date: new Date().toLocaleDateString('uz-UZ')
        });
        document.getElementById('buh-trx-material').value = '';
        document.getElementById('buh-trx-qty').value = '';
        document.getElementById('buh-trx-price').value = '';
        await renderBuhOmbor();
        await updateBuhKPIs();
        window.showPremiumToast('Tranzaksiya', `${type === 'kirim' ? '📥 Kirim' : '📤 Chiqim'}: ${material}`);
    };

    window.deleteBuhTrx = async (id) => {
        await DB.delete('buh_transactions', BUH_KEYS.transactions, id);
        await renderBuhOmbor();
        await updateBuhKPIs();
    };

    async function renderBuhOmbor() {
        const rate = getUsdRate();
        let inventoryItems = [];
        try {
            const { data } = await supabase.from('clapak_inventory').select('*').order('created_at', { ascending: false });
            if (data) inventoryItems = data;
        } catch (e) { console.error('Buh Ombor fetch error:', e); }

        let totalValueUZS = 0;
        let totalValueUSD = 0;
        const omborTable = document.getElementById('buh-ombor-table');
        if (omborTable) {
            omborTable.innerHTML = inventoryItems.length === 0
                ? '<tr><td colspan="6" style="text-align:center; color:rgba(255,255,255,0.2); padding:30px;">Ombor bo\'sh</td></tr>'
                : inventoryItems.map(item => {
                    const descFull = item.description || '';
                    const cur = descFull.includes('Currency: UZS') ? 'UZS' : 'USD';
                    const price = item.price || 0;
                    const qty = item.stock_quantity || 0;
                    const itemVal = qty * price;
                    
                    let valUZS = 0;
                    let valUSD = 0;
                    if (cur === 'USD') {
                        valUSD = itemVal;
                        valUZS = itemVal * rate;
                    } else {
                        valUZS = itemVal;
                        valUSD = itemVal / rate;
                    }
                    
                    totalValueUZS += valUZS;
                    totalValueUSD += valUSD;

                    const statusColor = qty < 5 ? '#ff4d4f' : (qty < 20 ? '#fabb18' : '#00ff88');
                    const statusText = qty < 5 ? 'KAM' : (qty < 20 ? 'O\'RTA' : 'YETARLI');
                    
                    const priceDisplay = cur === 'USD' ? `$${price.toLocaleString()}` : `${price.toLocaleString()} UZS`;
                    const valDisplay = cur === 'USD' 
                        ? `<span style="color:#00ff88;">$${valUSD.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:2})}</span> <small style="color:rgba(255,255,255,0.3); font-size:0.7rem; display:block;">(${Math.round(valUZS).toLocaleString()} UZS)</small>` 
                        : `<span style="color:#00d2ff;">${valUZS.toLocaleString()} UZS</span> <small style="color:rgba(255,255,255,0.3); font-size:0.7rem; display:block;">($${valUSD.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:2})})</small>`;

                    return `<tr>
                        <td style="font-weight:700; color:#fff;">${item.product_name}</td>
                        <td>${item.category || 'Xomashyo'}</td>
                        <td style="font-weight:800;">${qty.toLocaleString() || 0} ${item.unit || ''}</td>
                        <td>${priceDisplay}</td>
                        <td style="font-weight:800;">${valDisplay}</td>
                        <td><span style="color:${statusColor}; font-size:0.75rem; font-weight:800;">● ${statusText}</span></td>
                    </tr>`;
                }).join('');
        }

        const omborValueEl = document.getElementById('buh-ombor-value');
        if (omborValueEl) {
            omborValueEl.innerHTML = `${Math.round(totalValueUZS).toLocaleString()} UZS <span style="font-size:0.75rem; color:rgba(255,255,255,0.4); font-weight:600; margin-left:6px;">($${totalValueUSD.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})})</span>`;
        }

        // Transactions
        const trxs = await DB.select('buh_transactions', BUH_KEYS.transactions);
        let kirimTotalUZS = 0, kirimTotalUSD = 0;
        let chiqimTotalUZS = 0, chiqimTotalUSD = 0;
        
        trxs.forEach(t => {
            const cur = t.currency || 'UZS';
            const total = parseFloat(t.total) || 0;
            if (t.type === 'kirim') {
                if (cur === 'USD') {
                    kirimTotalUSD += total;
                    kirimTotalUZS += total * rate;
                } else {
                    kirimTotalUZS += total;
                    kirimTotalUSD += total / rate;
                }
            } else {
                if (cur === 'USD') {
                    chiqimTotalUSD += total;
                    chiqimTotalUZS += total * rate;
                } else {
                    chiqimTotalUZS += total;
                    chiqimTotalUSD += total / rate;
                }
            }
        });

        const kirimEl = document.getElementById('buh-ombor-kirim');
        const chiqimEl = document.getElementById('buh-ombor-chiqim');
        if (kirimEl) {
            kirimEl.innerHTML = `${Math.round(kirimTotalUZS).toLocaleString()} UZS <span style="font-size:0.7rem; color:rgba(255,255,255,0.4); font-weight:600; margin-left:4px;">($${kirimTotalUSD.toLocaleString(undefined, {maximumFractionDigits:1})})</span>`;
        }
        if (chiqimEl) {
            chiqimEl.innerHTML = `${Math.round(chiqimTotalUZS).toLocaleString()} UZS <span style="font-size:0.7rem; color:rgba(255,255,255,0.4); font-weight:600; margin-left:4px;">($${chiqimTotalUSD.toLocaleString(undefined, {maximumFractionDigits:1})})</span>`;
        }

        const trxTable = document.getElementById('buh-trx-table');
        if (trxTable) {
            trxTable.innerHTML = trxs.length === 0
                ? '<tr><td colspan="6" style="text-align:center; color:rgba(255,255,255,0.2); padding:30px;">Tranzaksiya yo\'q</td></tr>'
                : trxs.slice(0, 20).map(t => {
                    const isKirim = t.type === 'kirim';
                    const cur = t.currency || 'UZS';
                    const total = parseFloat(t.total) || 0;
                    
                    let displayAmt = '';
                    if (cur === 'USD') {
                        displayAmt = `<span style="color:${isKirim ? '#00ff88' : '#ff4d4f'}; font-weight:800;">${isKirim ? '+' : '-'}$${total.toLocaleString()}</span> <small style="color:rgba(255,255,255,0.3); font-size:0.65rem;">(${(total * rate).toLocaleString()} UZS)</small>`;
                    } else {
                        displayAmt = `<span style="color:${isKirim ? '#00ff88' : '#ff4d4f'}; font-weight:800;">${isKirim ? '+' : '-'}${total.toLocaleString()} UZS</span> <small style="color:rgba(255,255,255,0.3); font-size:0.65rem;">($${(total / rate).toLocaleString(undefined, {maximumFractionDigits:1})})</small>`;
                    }
                    
                    return `<tr>
                        <td style="font-size:0.8rem;">${t.date}</td>
                        <td style="font-weight:700; color:#fff;">${t.material}</td>
                        <td><span style="color:${isKirim ? '#00ff88' : '#ff4d4f'}; font-weight:800; font-size:0.75rem;">${isKirim ? '📥 KIRIM' : '📤 CHIQIM'}</span></td>
                        <td>${(parseInt(t.qty) || 0).toLocaleString()}</td>
                        <td style="font-weight:800;">${displayAmt}</td>
                        <td><button class="buh-btn-danger" onclick="window.deleteBuhTrx('${t.id}')">🗑️</button></td>
                    </tr>`;
                }).join('');
        }
    }

    // ========================
    // BLOK 3: HARAJATLAR
    // ========================
    function getEnergySettings() {
        try {
            return JSON.parse(localStorage.getItem(BUH_KEYS.energySettings)) || { kwPerHour: 15, kwhPrice: 680 };
        } catch { return { kwPerHour: 15, kwhPrice: 680 }; }
    }

    window.saveBuhEnergySettings = async () => {
        const kwPerHour = parseInt(document.getElementById('buh-kw-per-hour')?.value) || 15;
        const kwhPrice = parseInt(document.getElementById('buh-kwh-price')?.value) || 680;
        localStorage.setItem(BUH_KEYS.energySettings, JSON.stringify({ kwPerHour, kwhPrice }));
        await renderBuhHarajatlar();
        await updateBuhKPIs();
        window.showPremiumToast('Sozlamalar Saqlandi', `Stanok: ${kwPerHour} kW/soat, Narx: ${kwhPrice} UZS/kWh`);
    };

    window.addBuhUtility = async () => {
        const type = document.getElementById('buh-utility-type')?.value;
        const amount = parseInt(document.getElementById('buh-utility-amount')?.value) || 0;
        if (amount <= 0) {
            window.showPremiumToast('Xatolik', 'Summani kiriting!', false);
            return;
        }
        await DB.insert('buh_utilities', BUH_KEYS.utilities, {
            id: Date.now().toString(),
            type,
            amount,
            date: new Date().toLocaleDateString('uz-UZ')
        });
        document.getElementById('buh-utility-amount').value = '';
        await renderBuhHarajatlar();
        await updateBuhKPIs();
        window.showPremiumToast('Harajat Qo\'shildi', `${type}: ${amount.toLocaleString()} UZS`);
    };

    window.deleteBuhUtility = async (id) => {
        await DB.delete('buh_utilities', BUH_KEYS.utilities, id);
        await renderBuhHarajatlar();
        await updateBuhKPIs();
    };

    async function renderBuhHarajatlar() {
        const settings = getEnergySettings();
        const kwInput = document.getElementById('buh-kw-per-hour');
        const kwhInput = document.getElementById('buh-kwh-price');
        if (kwInput) kwInput.value = settings.kwPerHour;
        if (kwhInput) kwhInput.value = settings.kwhPrice;

        let stanokHours = 0;
        if (window.pipelineData) {
            const allItems = [
                ...window.pipelineData.sovutish,
                ...window.pipelineData.kraska,
                ...window.pipelineData.sushilka,
                ...window.pipelineData.finished
            ];
            stanokHours = allItems.length * 2;
        }
        const storedHours = parseInt(localStorage.getItem('buh_stanok_monthly_hours')) || 0;
        if (storedHours > stanokHours) stanokHours = storedHours;
        if (stanokHours === 0) stanokHours = 240;

        const totalKw = stanokHours * settings.kwPerHour;
        const elektrCost = totalKw * settings.kwhPrice;

        const hoursEl = document.getElementById('buh-stanok-hours');
        const elektrEl = document.getElementById('buh-elektr-cost');
        if (hoursEl) hoursEl.textContent = stanokHours + ' soat';
        if (elektrEl) elektrEl.textContent = buhFormatMoney(elektrCost) + ' UZS';

        const breakdownEl = document.getElementById('buh-energy-breakdown');
        if (breakdownEl) {
            breakdownEl.innerHTML = `
                <div>⏱️ Stanok ishlash: <b style="color:#fabb18;">${stanokHours} soat</b></div>
                <div>⚡ Stanok quvvati: <b style="color:#fff;">${settings.kwPerHour} kW/soat</b></div>
                <div>📊 Jami sarflangan: <b style="color:#00d2ff;">${totalKw.toLocaleString()} kWh</b></div>
                <div>💵 1 kWh narxi: <b style="color:#fff;">${settings.kwhPrice.toLocaleString()} UZS</b></div>
                <div style="margin-top:6px; padding-top:6px; border-top: 1px solid rgba(255,255,255,0.06); font-family:'Outfit'">💰 Jami xarajat: <b style="color:#ff4d4f; font-size: 1rem;">${elektrCost.toLocaleString()} UZS</b></div>
            `;
        }

        const utils = await DB.select('buh_utilities', BUH_KEYS.utilities);
        let utilTotal = 0;
        const utilListEl = document.getElementById('buh-utility-list');
        if (utilListEl) {
            utilListEl.innerHTML = utils.length === 0
                ? '<div style="text-align:center; color:rgba(255,255,255,0.2); padding:25px; font-size:0.85rem;">Kamunal harajat qo\'shilmagan</div>'
                : utils.map(u => {
                    const amt = parseFloat(u.amount) || 0;
                    utilTotal += amt;
                    const icons = { 'Elektr Energiya': '⚡', 'Suv': '💧', 'Gaz': '🔥', 'Ijara': '🏢', 'Internet': '🌐', 'Boshqa': '📋' };
                    return `<div class="buh-cost-item">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:1.2rem;">${icons[u.type] || '📋'}</span>
                            <div style="text-align:left;">
                                <div style="font-weight:700; color:#fff; font-size:0.85rem;">${u.type}</div>
                                <div style="font-size:0.65rem; color:rgba(255,255,255,0.3);">${u.date}</div>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-weight:800; color:#ff4d4f; font-family:'Outfit';">${amt.toLocaleString()} UZS</span>
                            <button class="buh-btn-danger" onclick="window.deleteBuhUtility('${u.id}')" style="padding:4px 8px;">✕</button>
                        </div>
                    </div>`;
                }).join('');
        }

        const utilTotalEl = document.getElementById('buh-utility-total');
        if (utilTotalEl) utilTotalEl.textContent = utilTotal.toLocaleString() + ' UZS';

        const expElektrEl = document.getElementById('buh-expense-elektr');
        const expKamunalEl = document.getElementById('buh-expense-kamunal');
        const expTotalEl = document.getElementById('buh-expense-total');
        if (expElektrEl) expElektrEl.textContent = buhFormatMoney(elektrCost) + ' UZS';
        if (expKamunalEl) expKamunalEl.textContent = buhFormatMoney(utilTotal) + ' UZS';
        if (expTotalEl) expTotalEl.textContent = buhFormatMoney(elektrCost + utilTotal) + ' UZS';
    }

    // ========================
    // BLOK 4: SOTUV & FOYDA
    // ========================
    window.addBuhRecipeItem = async () => {
        const name = document.getElementById('buh-recipe-name')?.value.trim();
        const qty = parseInt(document.getElementById('buh-recipe-qty')?.value) || 0;
        const price = parseInt(document.getElementById('buh-recipe-price')?.value) || 0;
        if (!name || price <= 0) {
            window.showPremiumToast('Xatolik', 'Material nomi va narxini kiriting!', false);
            return;
        }
        await DB.insert('buh_recipes', BUH_KEYS.recipes, { id: Date.now().toString(), name, qty, price });
        document.getElementById('buh-recipe-name').value = '';
        document.getElementById('buh-recipe-qty').value = '';
        document.getElementById('buh-recipe-price').value = '';
        await renderRecipeList();
        window.showPremiumToast('Material Qo\'shildi', `${name} reseptga qo'shildi.`);
    };

    window.deleteBuhRecipe = async (id) => {
        await DB.delete('buh_recipes', BUH_KEYS.recipes, id);
        await renderRecipeList();
    };

    async function renderRecipeList() {
        const recipes = await DB.select('buh_recipes', BUH_KEYS.recipes);
        const listEl = document.getElementById('buh-recipe-list');
        if (listEl) {
            listEl.innerHTML = recipes.length === 0
                ? '<div style="color:rgba(255,255,255,0.2); font-size:0.8rem; padding:10px 0;">Reseptga material qo\'shilmagan</div>'
                : recipes.map(r => `
                    <div class="buh-recipe-item">
                        <span style="color:#fff; font-weight:600; font-size:0.82rem; text-align:left;">${r.name}</span>
                        <span style="color:rgba(255,255,255,0.5); font-size:0.8rem;">${r.qty} gr/dona</span>
                        <span style="color:#00d2ff; font-weight:700; font-size:0.8rem; font-family:'Outfit';">${(parseFloat(r.price) || 0).toLocaleString()} UZS</span>
                        <button class="buh-btn-danger" onclick="window.deleteBuhRecipe('${r.id}')" style="padding:4px 8px;">✕</button>
                    </div>
                `).join('');
        }
    }

    window.calculateTanNarxi = async () => {
        const recipes = await DB.select('buh_recipes', BUH_KEYS.recipes);
        const materialCost = recipes.reduce((sum, r) => sum + (parseFloat(r.price) || 0), 0);
        const laborCost = parseInt(document.getElementById('buh-labor-per-unit')?.value) || 0;
        const energyCost = parseInt(document.getElementById('buh-energy-per-unit')?.value) || 0;
        const packagingCost = parseInt(document.getElementById('buh-packaging-per-unit')?.value) || 0;
        const totalCost = materialCost + laborCost + energyCost + packagingCost;

        const matEl = document.getElementById('buh-cost-material');
        const labEl = document.getElementById('buh-cost-labor');
        const enEl = document.getElementById('buh-cost-energy');
        const packEl = document.getElementById('buh-cost-packaging');
        const totalEl = document.getElementById('buh-cost-total');

        if (matEl) matEl.textContent = materialCost.toLocaleString();
        if (labEl) labEl.textContent = laborCost.toLocaleString();
        if (enEl) enEl.textContent = energyCost.toLocaleString();
        if (packEl) packEl.textContent = packagingCost.toLocaleString();
        if (totalEl) totalEl.textContent = totalCost.toLocaleString();

        localStorage.setItem('buh_tan_narxi', totalCost.toString());
        window.showPremiumToast('Tan Narxi Hisoblandi', `1 komplekt = ${totalCost.toLocaleString()} UZS`);
    };

    window.addBuhSale = async () => {
        const buyer = document.getElementById('buh-sale-buyer')?.value.trim();
        const product = document.getElementById('buh-sale-product')?.value.trim();
        const qty = parseInt(document.getElementById('buh-sale-qty')?.value) || 0;
        const salePrice = parseInt(document.getElementById('buh-sale-price')?.value) || 0;
        if (!buyer || !product || qty <= 0 || salePrice <= 0) {
            window.showPremiumToast('Xatolik', 'Barcha maydonlarni to\'ldiring!', false);
            return;
        }
        const tanNarxi = parseInt(localStorage.getItem('buh_tan_narxi')) || 0;
        const totalRevenue = qty * salePrice;
        const totalCost = qty * tanNarxi;
        const profit = totalRevenue - totalCost;

        await DB.insert('buh_sales', BUH_KEYS.sales, {
            id: Date.now().toString(),
            buyer, product, qty, salePrice, tanNarxi,
            totalRevenue, totalCost, profit,
            date: new Date().toLocaleDateString('uz-UZ')
        });
        document.getElementById('buh-sale-buyer').value = '';
        document.getElementById('buh-sale-product').value = '';
        document.getElementById('buh-sale-qty').value = '';
        document.getElementById('buh-sale-price').value = '';
        await renderBuhSales();
        await updateBuhKPIs();
        window.showPremiumToast('Sotuv Qo\'shildi', `${product} → ${buyer}: ${buhFormatMoney(profit)} UZS foyda`);
    };

    window.deleteBuhSale = async (id) => {
        await DB.delete('buh_sales', BUH_KEYS.sales, id);
        await renderBuhSales();
        await updateBuhKPIs();
    };

    async function renderBuhSales() {
        await renderRecipeList();
        const sales = await DB.select('buh_sales', BUH_KEYS.sales);
        const normalizedSales = sales.map(s => ({
            id: s.id,
            buyer: s.buyer,
            product: s.product,
            qty: parseInt(s.qty) || 0,
            salePrice: parseFloat(s.sale_price) || parseFloat(s.salePrice) || 0,
            tanNarxi: parseFloat(s.tan_narxi) || parseFloat(s.tanNarxi) || 0,
            totalRevenue: parseFloat(s.total_revenue) || parseFloat(s.totalRevenue) || 0,
            totalCost: parseFloat(s.total_cost) || parseFloat(s.totalCost) || 0,
            profit: parseFloat(s.profit) || 0,
            date: s.date
        }));

        let totalRevenue = 0, totalCost = 0, totalProfit = 0;

        const salesTable = document.getElementById('buh-sales-table');
        if (salesTable) {
            salesTable.innerHTML = normalizedSales.length === 0
                ? '<tr><td colspan="8" style="text-align:center; color:rgba(255,255,255,0.2); padding:30px;">Sotuv yozuvi yo\'q</td></tr>'
                : normalizedSales.map(s => {
                    totalRevenue += s.totalRevenue;
                    totalCost += s.totalCost;
                    totalProfit += s.profit;
                    const profitColor = s.profit >= 0 ? '#00ff88' : '#ff4d4f';
                    return `<tr>
                        <td style="font-size:0.8rem;">${s.date}</td>
                        <td style="font-weight:700; color:#fff;">${s.buyer}</td>
                        <td>${s.product}</td>
                        <td style="font-weight:700;">${s.qty} komp.</td>
                        <td style="color:#00d2ff; font-weight:700; font-family:'Outfit'">${s.salePrice.toLocaleString()}</td>
                        <td style="color:#fabb18; font-weight:700; font-family:'Outfit'">${s.tanNarxi.toLocaleString()}</td>
                        <td style="color:${profitColor}; font-weight:900; font-family:'Outfit'">${s.profit >= 0 ? '+' : ''}${s.profit.toLocaleString()}</td>
                        <td><button class="buh-btn-danger" onclick="window.deleteBuhSale('${s.id}')">🗑️</button></td>
                    </tr>`;
                }).join('');
        }

        const profitEl = document.getElementById('buh-sales-profit');
        const revEl = document.getElementById('buh-sales-total-revenue');
        const costEl = document.getElementById('buh-sales-total-cost');
        if (profitEl) {
            profitEl.textContent = buhFormatMoney(totalProfit) + ' UZS';
            profitEl.style.color = totalProfit >= 0 ? '#00ff88' : '#ff4d4f';
        }
        if (revEl) revEl.textContent = buhFormatMoney(totalRevenue) + ' UZS';
        if (costEl) costEl.textContent = buhFormatMoney(totalCost) + ' UZS';
    }

    // ========================
    // KPI UPDATER
    // ========================
    async function updateBuhKPIs() {
        const rate = getUsdRate();
        const sales = await DB.select('buh_sales', BUH_KEYS.sales);
        const normalizedSales = sales.map(s => ({
            totalRevenue: parseFloat(s.total_revenue) || parseFloat(s.totalRevenue) || 0
        }));

        const emps = await DB.select('buh_employees', BUH_KEYS.employees);
        const normalizedEmps = emps.map(e => ({
            id: e.id,
            name: e.name,
            type: e.type,
            salary: parseFloat(e.salary) || 0,
            price_serisi: parseFloat(e.price_serisi) || 25600,
            price_redlayn: parseFloat(e.price_redlayn) || 33000,
            price_kombo: parseFloat(e.price_kombo) || 50000,
            workDays: e.work_days !== undefined ? e.work_days : (e.workDays || 26),
            worksCompleted: e.works_completed !== undefined ? e.works_completed : (e.worksCompleted || 0)
        }));

        const utils = await DB.select('buh_utilities', BUH_KEYS.utilities);
        const trxs = await DB.select('buh_transactions', BUH_KEYS.transactions);

        const totalKirim = normalizedSales.reduce((sum, s) => sum + s.totalRevenue, 0);

        // Fetch clapak_kraska_logs to sum Kraska salaries
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);
        let kraskaLogs = [];
        if (buhUseSupabase) {
            try {
                const { data } = await supabase
                    .from('clapak_kraska_logs')
                    .select('*')
                    .gte('created_at', startOfMonth.toISOString());
                if (data) kraskaLogs = data;
            } catch (e) {}
        }
        if (kraskaLogs.length === 0) {
            try {
                kraskaLogs = JSON.parse(localStorage.getItem('clapak_kraska_logs_local')) || [];
            } catch {}
        }
        
        const kraskaTotal = kraskaLogs.reduce((sum, log) => {
            const workerName = log.worker_name || 'Noma\'lum';
            const workerId = log.worker_id || 'K1';
            const paintType = log.paint_type || 'Serisi';
            
            const emp = normalizedEmps.find(e => e.name.toLowerCase() === workerName.toLowerCase() || e.id === workerId);
            const rateSerisi = emp ? emp.price_serisi : 25600;
            const rateRedlayn = emp ? emp.price_redlayn : 33000;
            const rateKombo = emp ? emp.price_kombo : 50000;
            
            let price = 0;
            if (paintType === 'Serisi') price = rateSerisi;
            else if (paintType === 'Redlayn') price = rateRedlayn;
            else if (paintType === 'Kombo') price = rateKombo;
            
            return sum + price;
        }, 0);

        const okladTotal = normalizedEmps.filter(e => e.type === 'oklad').reduce((sum, e) => sum + e.salary, 0);
        const zdelTotal = normalizedEmps.filter(e => e.type === 'zdelniy').reduce((sum, e) => sum + (e.worksCompleted || 0) * e.salary, 0);
        const maoshTotal = okladTotal + zdelTotal + kraskaTotal;
        const utilTotal = utils.reduce((sum, u) => sum + (parseFloat(u.amount) || 0), 0);
        
        const settings = getEnergySettings();
        let stanokHours = 240;
        if (window.pipelineData) {
            const count = [...window.pipelineData.sovutish, ...window.pipelineData.kraska, ...window.pipelineData.sushilka, ...window.pipelineData.finished].length;
            if (count * 2 > stanokHours) stanokHours = count * 2;
        }
        const elektrCost = stanokHours * settings.kwPerHour * settings.kwhPrice;
        
        // Sum transaction outflows considering currency conversion
        const omborChiqim = trxs.filter(t => t.type === 'chiqim').reduce((sum, t) => {
            const cur = t.currency || 'UZS';
            const tot = parseFloat(t.total) || 0;
            return sum + (cur === 'USD' ? tot * rate : tot);
        }, 0);
        
        const totalChiqim = maoshTotal + utilTotal + elektrCost + omborChiqim;
        const sofFoyda = totalKirim - totalChiqim;

        const kirimEl = document.getElementById('buh-total-kirim');
        const chiqimEl = document.getElementById('buh-total-chiqim');
        const foydaEl = document.getElementById('buh-sof-foyda');

        if (kirimEl) {
            kirimEl.innerHTML = `${buhFormatMoney(totalKirim)} <small>UZS</small> <span style="font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:600; display:block; margin-top:2px;">($${buhFormatMoney(totalKirim / rate)})</span>`;
        }
        if (chiqimEl) {
            chiqimEl.innerHTML = `${buhFormatMoney(totalChiqim)} <small>UZS</small> <span style="font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:600; display:block; margin-top:2px;">($${buhFormatMoney(totalChiqim / rate)})</span>`;
        }
        if (foydaEl) {
            foydaEl.innerHTML = `${buhFormatMoney(sofFoyda)} <small>UZS</small> <span style="font-size:0.65rem; color:${sofFoyda >= 0 ? 'rgba(0,210,255,0.6)' : 'rgba(255,77,79,0.6)'}; font-weight:600; display:block; margin-top:2px;">($${buhFormatMoney(sofFoyda / rate)})</span>`;
            foydaEl.style.color = sofFoyda >= 0 ? '#00d2ff' : '#ff4d4f';
        }
    }
});

    window.applyParallaxShowroom = () => {
        // Disabled dynamically applied 3D transformations, tilt, and scaling 
        // to keep product cards fully stable during user interaction.
    };

    // ==========================================
    // SOTUV ZAKAZ (ORDER) & PDF GENERATION LOGIC
    // ==========================================

    window.updateNewModelCost = () => {
        const rawInput = document.getElementById('newModelRaw');
        const accInput = document.getElementById('newModelAcc');
        const packAccInput = document.getElementById('newModelPackAcc');
        const markupInput = document.getElementById('newModelMarkup');

        if (!rawInput || !accInput || !packAccInput || !markupInput) return;

        const rawVal = parseFloat(rawInput.value) || 0;
        const accVal = parseFloat(accInput.value) || 0;
        const packAccVal = parseFloat(packAccInput.value) || 0;
        const markupVal = parseFloat(markupInput.value) || 0;

        const inventory = window.cachedInventory || [];
        const usdRate = (typeof getUsdRate === 'function') ? getUsdRate() : 12800;

        const getPriceInUzs = (item, defaultPrice) => {
            if (!item || !item.price) return defaultPrice;
            let price = parseFloat(item.price);
            const desc = (item.description || '');
            const isUZS = desc.includes('Currency: UZS');
            if (!isUZS) {
                price = price * usdRate;
            }
            return price;
        };

        // Find items in cached inventory
        const xomItem = inventory.find(item => {
            const name = (item.product_name || '').toLowerCase();
            return name.includes('xom') || name.includes('granula') || name.includes('profil') || name.includes('plastik');
        });
        const zajimItem = inventory.find(item => {
            const name = (item.product_name || '').toLowerCase();
            return name.includes('zajim') || name.includes('clip') || name.includes('qisqich');
        });
        const paketItem = inventory.find(item => {
            const name = (item.product_name || '').toLowerCase();
            return name.includes('paket') || name.includes('qadoq');
        });
        const etiketkaItem = inventory.find(item => {
            const name = (item.product_name || '').toLowerCase();
            return name.includes('etiketka') || name.includes('sticker') || name.includes('label');
        });
        const reklamaItem = inventory.find(item => {
            const name = (item.product_name || '').toLowerCase();
            return name.includes('reklama') || name.includes('promo') || name.includes('kartochka');
        });

        const xomashyoPrice = getPriceInUzs(xomItem, 25000);
        const zajimnikPrice = getPriceInUzs(zajimItem, 1500);
        const paketPrice = getPriceInUzs(paketItem, 2000);
        const etiketkaPrice = getPriceInUzs(etiketkaItem, 500);
        const reklamaPrice = getPriceInUzs(reklamaItem, 1000);

        // Calculate Costs (1 set = 4 units)
        const costXomashyo = 4 * rawVal * xomashyoPrice;
        const costZajimnik = 4 * accVal * zajimnikPrice;
        const costQadoq = (packAccVal * paketPrice) + etiketkaPrice + reklamaPrice;
        
        const jamiCost = costXomashyo + costZajimnik + costQadoq;
        const jamiSale = jamiCost + markupVal;

        // Cache the calculated values to window
        window.calculatedNewModelCostPrice = Math.round(jamiCost);
        window.calculatedNewModelSalePrice = Math.round(jamiSale);

        // Update display nodes safely
        const setHtml = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setHtml('costXomashyoDisplay', `${Math.round(costXomashyo).toLocaleString()} UZS`);
        setHtml('costZajimnikDisplay', `${Math.round(costZajimnik).toLocaleString()} UZS`);
        setHtml('costQadoqDisplay', `${Math.round(costQadoq).toLocaleString()} UZS`);
        setHtml('totalModelCostDisplay', `${Math.round(jamiCost).toLocaleString()} UZS`);
        setHtml('totalModelSaleDisplay', `${Math.round(jamiSale).toLocaleString()} UZS`);
    };

    window.openModelModal = () => {
        const modal = document.getElementById('modelModal');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('modelForm').reset();
            window.updateNewModelCost(); // Calculate dynamic costs instantly!
        }
    };

    window.saveModelProduct = async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('btnSaveModel');
        btn.innerHTML = '⏳ Saqlanmoqda...';
        btn.disabled = true;

        const name = document.getElementById('newModelName').value.trim();
        const design = document.getElementById('newModelDesign').value;
        const markup = parseInt(document.getElementById('newModelMarkup').value) || 0;
        const raw = parseFloat(document.getElementById('newModelRaw').value) || 0.6;
        const acc = parseInt(document.getElementById('newModelAcc').value) || 0;
        const packAcc = parseInt(document.getElementById('newModelPackAcc').value) || 0;

        const exists = window.clapakProducts.some(p => p.model.toLowerCase() === name.toLowerCase() || p.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            alert("Bunday model nomi katalogda allaqachon mavjud!");
            btn.innerHTML = '💾 Modelni Saqlash va Ro\'yxatga Qo\'shish';
            btn.disabled = false;
            return;
        }

        // Run cost calculations one last time to ensure consistency
        window.updateNewModelCost();
        const finalCost = window.calculatedNewModelCostPrice || 0;
        const finalSale = window.calculatedNewModelSalePrice || 0;

        // Add to window.clapakProducts with exact recipe specs
        const newProduct = {
            id: 'prod-' + name.toLowerCase().replace(/[^a-z0-9]/g, ''),
            name: name,
            model: name,
            price: finalSale, // dynamic sale price
            costPrice: finalCost,
            markup: markup,
            design: design,
            boxes: 0,
            priceConfirmed: true,
            rawPerUnit: raw,
            accPerUnit: acc,
            packAccPerSet: packAcc,
            promoPerSet: 1
        };

        window.clapakProducts.push(newProduct);
        localStorage.setItem('clapak_products_v4', JSON.stringify(window.clapakProducts));

        // Show Toast
        window.showPremiumToast(
            "Yangi Model Qo'shildi",
            `"${name}" modeli muvaffaqiyatli saqlandi. Sotuv narxi: ${finalSale.toLocaleString()} UZS (Tan narxi: ${finalCost.toLocaleString()} UZS)`,
            true
        );

        document.getElementById('modelModal').style.display = 'none';

        // Refresh dynamic UI selectors
        if (typeof window.loadAutoSales === 'function') {
            window.loadAutoSales();
        }

        btn.innerHTML = '💾 Modelni Saqlash va Ro\'yxatga Qo\'shish';
        btn.disabled = false;
    };

    window.openZakazModal = () => {
        const modal = document.getElementById('zakazModal');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('zakazForm').reset();
            
            // Populate select options dynamically from window.clapakProducts
            const selectEl = document.getElementById('zakazModel');
            if (selectEl) {
                selectEl.innerHTML = window.clapakProducts.map(p => `
                    <option value="${p.model}" style="background:#070f19; color:#fff;">${p.name} (${p.design === 'malibu' ? 'Sport Carbon' : 'Silver Multi'})</option>
                `).join('');
            }
            
            window.toggleZakazFields();
            window.calcZakazMaterials();
            
            // Set default date to today + 5 days for deadline
            const d = new Date();
            d.setDate(d.getDate() + 5);
            document.getElementById('zakazDeadline').value = d.toISOString().split('T')[0];
        }
    };

    window.toggleZakazFields = () => {
        const isOmbor = document.getElementById('zakazIsOmbor').checked;
        const clientGroup = document.getElementById('zakazClientGroup');
        const nameInput = document.getElementById('zakazClientName');
        const phoneInput = document.getElementById('zakazClientPhone');

        if (isOmbor) {
            clientGroup.style.opacity = '0.3';
            nameInput.disabled = true;
            phoneInput.disabled = true;
            nameInput.value = 'Ombor uchun Zaxira';
            phoneInput.value = '+998 00 000 00 00';
        } else {
            clientGroup.style.opacity = '1';
            nameInput.disabled = false;
            phoneInput.disabled = false;
            nameInput.value = '';
            phoneInput.value = '';
        }
    };

    window.calcZakazMaterials = () => {
        const qty = parseInt(document.getElementById('zakazQty').value) || 0;
        const modelName = document.getElementById('zakazModel').value;
        
        // Find selected model in products
        const modelInfo = window.clapakProducts.find(p => p.model === modelName) || {
            rawPerUnit: 0.6,
            accPerUnit: 1,
            packAccPerSet: 1
        };

        const rawPerUnit = modelInfo.rawPerUnit !== undefined ? parseFloat(modelInfo.rawPerUnit) : 0.6;
        const accPerUnit = modelInfo.accPerUnit !== undefined ? parseFloat(modelInfo.accPerUnit) : 1;
        const packAccPerSet = modelInfo.packAccPerSet !== undefined ? parseFloat(modelInfo.packAccPerSet) : 1;

        const rawKg = (qty * rawPerUnit).toFixed(1);
        const boxes = Math.floor(qty / 4);
        const accs = qty * accPerUnit + boxes * packAccPerSet;

        document.getElementById('zakazRawCalc').textContent = `${rawKg} kg`;
        document.getElementById('zakazAccCalc').textContent = `${accs} dona (${qty} un. + ${boxes * packAccPerSet} set)`;
    };

    window.submitZakaz = async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('btnSaveZakaz');
        btn.innerHTML = '⏳ Saqlanmoqda...';
        btn.disabled = true;

        const isOmbor = document.getElementById('zakazIsOmbor').checked;
        const clientName = document.getElementById('zakazClientName').value;
        const phone = document.getElementById('zakazClientPhone').value;
        const model = document.getElementById('zakazModel').value;
        const qty = parseInt(document.getElementById('zakazQty').value) || 0;
        const deadline = document.getElementById('zakazDeadline').value;

        // Fetch selected model recipe
        const modelInfo = window.clapakProducts.find(p => p.model === model) || {
            rawPerUnit: 0.6,
            accPerUnit: 1,
            packAccPerSet: 1,
            promoPerSet: 1
        };
        
        const rawPerUnit = modelInfo.rawPerUnit !== undefined ? parseFloat(modelInfo.rawPerUnit) : 0.6;
        const accPerUnit = modelInfo.accPerUnit !== undefined ? parseFloat(modelInfo.accPerUnit) : 1;
        const packAccPerSet = modelInfo.packAccPerSet !== undefined ? parseFloat(modelInfo.packAccPerSet) : 1;
        const promoPerSet = modelInfo.promoPerSet !== undefined ? parseFloat(modelInfo.promoPerSet) : 1;

        const rawKg = (qty * rawPerUnit).toFixed(1);
        const boxes = Math.floor(qty / 4);
        const accsNeeded = qty * accPerUnit + boxes * packAccPerSet;
        const promoNeeded = boxes * promoPerSet;

        // Prices for PDF calculation
        const pricePerUnit = modelInfo.price || (model.includes('MALIBU') ? 120000 : 95000);
        const totalSum = qty * pricePerUnit;

        // Create Order Payload for Supabase clapak_production
        // We'll store the client details as JSON in the operator column to keep schema simple
        const orderDetails = {
            isOmbor: isOmbor,
            clientName: clientName,
            phone: phone,
            deadline: deadline,
            rawNeeded: rawKg,
            accsNeeded: accsNeeded,
            promoNeeded: promoNeeded,
            rawPerUnit: rawPerUnit,
            accPerUnit: accPerUnit,
            packAccPerSet: packAccPerSet,
            promoPerSet: promoPerSet
        };

        const payload = {
            model: model,
            quantity: qty,
            status: 'zakaz', // Crucial to show up in Stage 1
            stage: 'zakaz-1',
            operator: JSON.stringify(orderDetails)
        };

        try {
            const { data, error } = await supabase.from('clapak_production').insert([payload]).select();
            if (error) throw error;

            const orderId = data && data[0] ? data[0].id : Math.floor(Math.random() * 10000);

            // Populate hidden PDF template safely
            try {
                const pdfId = document.getElementById('pdfOrderId');
                if (pdfId) pdfId.textContent = orderId;
                
                const pdfDt = document.getElementById('pdfDate');
                if (pdfDt) pdfDt.textContent = new Date().toLocaleDateString('uz-UZ');
                
                const pdfName = document.getElementById('pdfClientName');
                if (pdfName) pdfName.textContent = clientName;
                
                const pdfPhone = document.getElementById('pdfClientPhone');
                if (pdfPhone) pdfPhone.textContent = phone;
                
                const pdfDl = document.getElementById('pdfDeadline');
                if (pdfDl) pdfDl.textContent = deadline;
                
                const pdfModel = document.getElementById('pdfModelName');
                if (pdfModel) pdfModel.textContent = model;
                
                const pdfQty = document.getElementById('pdfQuantity');
                if (pdfQty) pdfQty.textContent = qty;
                
                const pdfPrc = document.getElementById('pdfPrice');
                if (pdfPrc) pdfPrc.textContent = pricePerUnit.toLocaleString();
                
                const pdfTot = document.getElementById('pdfTotal');
                if (pdfTot) pdfTot.textContent = totalSum.toLocaleString();
                
                const pdfTotFin = document.getElementById('pdfTotalFinal');
                if (pdfTotFin) pdfTotFin.textContent = totalSum.toLocaleString() + " UZS";
                
                const pdfSign = document.getElementById('pdfSignClient');
                if (pdfSign) pdfSign.textContent = isOmbor ? "(Ombor Zaxirasi)" : clientName;

                // Generate PDF using html2pdf safely
                const element = document.getElementById('pdfContractTemplate');
                if (element && typeof html2pdf === 'function') {
                    element.style.display = 'block'; // Make visible for render
                    
                    const opt = {
                        margin:       [0.5, 0.5],
                        filename:     `Shartnoma_${clientName.replace(/\s+/g, '_')}_${orderId}.pdf`,
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { scale: 2, useCORS: true },
                        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                    };

                    await html2pdf().set(opt).from(element).save();
                    element.style.display = 'none'; // Hide again
                } else {
                    console.warn("html2pdf library is not loaded. PDF contract download skipped.");
                }
            } catch (pdfErr) {
                console.error("PDF generation failed, but order was saved in DB:", pdfErr);
                alert("Zakaz bazada muvaffaqiyatli saqlandi, lekin shartnoma PDF faylini yuklashda xatolik yuz berdi: " + pdfErr.message);
            }
            
            // Show Premium Toast
            const toast = document.getElementById('premium-toast');
            if (toast) {
                document.getElementById('toast-title').textContent = 'Zakaz Qabul Qilindi!';
                document.getElementById('toast-message').textContent = 'Shartnoma tayyorlandi va bazaga saqlandi.';
                toast.style.transform = 'translateY(0)';
                toast.style.opacity = '1';
                setTimeout(() => {
                    toast.style.transform = 'translateY(-100px)';
                    toast.style.opacity = '0';
                }, 4000);
            }

            document.getElementById('zakazModal').style.display = 'none';
            
            // Auto refresh showroom UI
            if (typeof window.loadAutoSales === 'function') {
                window.loadAutoSales();
            }

        } catch (err) {
            console.error(err);
            alert("Xatolik yuz berdi: " + err.message);
        } finally {
            btn.innerHTML = '<span>📄</span> Saqlash va Shartnoma Olish';
            btn.disabled = false;
        }
    };
