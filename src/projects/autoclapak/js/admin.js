import { supabase } from '@/core/supabase.js';
import { authService } from '@/services/auth/authService.js';
import { LayoutService } from '@/components/LayoutService.js';
import { ROLES } from '@/constants';
import malibuCalpak from '../../../assets/images/malibu_calpak.png';
import gentraCalpak from '../../../assets/images/gentra_calpak.png';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('AKFA Rahbar Paneli v2 Logic Loaded');

    // ========================================================
    // ======== BUXGALTER ROLI — FAQAT BUHGALTER BO'LIMI ========
    // "buxgalter" roli bilan kirilganda boshqa hech qanday bo'lim
    // (Panel, Ombor, Sotuv, Ishlab chiqarish, Tayyor mahsulot,
    // Xodimlar, Sozlamalar, boshqa biznes hublar) ko'rinmasin —
    // faqat Buhgalter tabi ochiladi va boshqa yo'l yo'q.
    // ========================================================
    const __curUserForGate = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (__curUserForGate.role === 'buxgalter' && document.getElementById('section-buhgalter')) {
        // Chap tomondagi biznes-hub almashtirgichini (Romix/Rassrochka/Oynek/AutoClapak) butunlay yashirish
        document.querySelectorAll('.sidebar-slim .nav-icon[data-section]').forEach(icon => {
            icon.style.display = 'none';
        });
        // Yuqori navigatsiyada faqat "Buhgalter" tabini qoldirish
        document.querySelectorAll('.nav-link-item[data-tab]').forEach(link => {
            if (link.getAttribute('data-tab') !== 'buhgalter') link.style.display = 'none';
        });
        // Darhol Buhgalter bo'limini ko'rsatish
        document.querySelectorAll('.romix-sub-section, .admin-section').forEach(sec => sec.classList.remove('active'));
        document.querySelectorAll('.nav-link-item[data-tab]').forEach(l => l.classList.remove('active'));
        const buhLink = document.querySelector('.nav-link-item[data-tab="buhgalter"]');
        if (buhLink) buhLink.classList.add('active');
        document.getElementById('section-buhgalter').classList.add('active');
    }

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
        if (document.getElementById('section-dashboard') && document.getElementById('stat-total-emp')) {
            loadRomixDashboardStats();
        }
        if (document.getElementById('section-buhgalter')) {
            loadRomixBuhgalter();
        }
    }, 200);
    let editingUserId = null;

    // Auth Check
    const user = authService.getCurrentUser();
    console.log('Current User for Admin Dashboard:', user);

    if (!user || (user.role !== 'admin' && user.role !== 'ac_manager' && user.role !== 'buxgalter')) {
        console.warn('Auth Failed: User is not an admin, ac_manager or buxgalter', user);
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

        /* Collapsible Section Styles */
        .category-header {
            width: 100%; 
            padding: 14px 22px; 
            margin-top: 15px; 
            margin-bottom: 10px; 
            display: flex; 
            align-items: center; 
            justify-content: space-between;
            background: rgba(0, 210, 255, 0.03);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 16px;
            border: 1px solid rgba(0, 210, 255, 0.18);
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            user-select: none;
        }
        .category-header:hover {
            background: rgba(0, 210, 255, 0.1);
            border-color: rgba(0, 210, 255, 0.45);
            box-shadow: 0 6px 20px rgba(0, 210, 255, 0.25);
            transform: translateY(-2px) scale(1.002);
        }
        .category-header.collapsed {
            background: rgba(255, 255, 255, 0.02);
            border-color: rgba(255, 255, 255, 0.06);
            box-shadow: none;
        }
        .category-header .chevron {
            color: #00d2ff;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.3s ease;
            transform-origin: center;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .category-header.collapsed .chevron {
            transform: rotate(-90deg);
            color: rgba(255, 255, 255, 0.3);
        }
        .category-content {
            max-height: 5000px;
            opacity: 1;
            overflow: hidden;
            transition: max-height 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, margin 0.3s ease;
            margin-bottom: 20px;
        }
        .category-content.collapsed {
            max-height: 0 !important;
            opacity: 0 !important;
            margin-bottom: 0 !important;
            pointer-events: none;
        }

        /* Collapsible Section Styles for Raw Warehouse */
        .category-header-raw {
            width: 100%; 
            padding: 14px 22px; 
            margin-top: 15px; 
            margin-bottom: 10px; 
            display: flex; 
            align-items: center; 
            justify-content: space-between;
            background: rgba(186, 0, 255, 0.03);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 16px;
            border: 1px solid rgba(186, 0, 255, 0.18);
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            user-select: none;
        }
        .category-header-raw:hover {
            background: rgba(186, 0, 255, 0.1);
            border-color: rgba(186, 0, 255, 0.45);
            box-shadow: 0 6px 20px rgba(186, 0, 255, 0.25);
            transform: translateY(-2px) scale(1.002);
        }
        .category-header-raw.collapsed {
            background: rgba(255, 255, 255, 0.02);
            border-color: rgba(255, 255, 255, 0.06);
            box-shadow: none;
        }
        .category-header-raw .chevron {
            color: #ba00ff;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.3s ease;
            transform-origin: center;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .category-header-raw.collapsed .chevron {
            transform: rotate(-90deg);
            color: rgba(255, 255, 255, 0.3);
        }

        /* Showroom Tab Selector Styles */
        .showroom-tab-btn {
            background: transparent;
            border: 1px solid transparent;
            color: rgba(255, 255, 255, 0.55);
            padding: 8px 16px;
            font-size: 0.75rem;
            font-weight: 800;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: 'Outfit', sans-serif;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .showroom-tab-btn:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.04);
        }
        .showroom-tab-btn.active {
            color: #00d2ff;
            background: rgba(0, 210, 255, 0.08);
            border-color: rgba(0, 210, 255, 0.25);
            box-shadow: 0 0 15px rgba(0, 210, 255, 0.15);
        }

        /* Raw Warehouse Tab Selector Styles */
        .raw-tab-btn {
            background: transparent;
            border: 1px solid transparent;
            color: rgba(255, 255, 255, 0.55);
            padding: 6px 12px;
            font-size: 0.7rem;
            font-weight: 800;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: 'Inter', sans-serif;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .raw-tab-btn:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.04);
        }
        .raw-tab-btn.active {
            color: #ba00ff;
            background: rgba(186, 0, 255, 0.08);
            border-color: rgba(186, 0, 255, 0.25);
            box-shadow: 0 0 15px rgba(186, 0, 255, 0.15);
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
                window.location.href = '/src/projects/autoclapak/pages/admin_dashboard.html';
            } else {
                localStorage.setItem('activeRomixSection', sectionId);
                window.location.href = '/src/projects/romix/romix_dashboard.html';
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
                    window.location.href = '/src/projects/autoclapak/pages/admin_dashboard.html';
                } else {
                    // For Romix sections (dashboard, rassrochka, oynak)
                    localStorage.setItem('activeRomixSection', `section-${target}`);
                    window.location.href = '/src/projects/romix/romix_dashboard.html';
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
            if (tab === 'buhgalter') loadRomixBuhgalter();
        });
    });

    // ========================================================
    // ======== ROMIX BUHGALTER MODULE (Premium Finance) =======
    // ========================================================
    const ROMIX_BUH_KEYS = {
        production: 'romix_production_log_v1',
        expenses: 'romix_expenses_v1',
        debts: 'romix_debts_v1',
        payments: 'romix_payment_log_v1',
        utilityReadings: 'romix_utility_readings_v1',
        accessories: 'romix_accessories_inventory',
        qoldiqProfillar: 'romix_qoldiq_inventory',
        oynak: 'romix_oynak_inventory'
    };

    function _buhToday() { return new Date().toISOString().slice(0, 10); }
    function _buhFmt(n) { return Math.round(Number(n) || 0).toLocaleString('uz-UZ') + ' UZS'; }
    function _buhPeriodStart(period) {
        const now = new Date();
        if (period === 'week') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    function _buhSetText(id, val) { const el = document.getElementById(id); if (el) el.textContent = _buhFmt(val); }

    async function romixBuhSelect(table, localKey) {
        try {
            const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
            if (!error && data) {
                localStorage.setItem(localKey, JSON.stringify(data));
                return data;
            }
        } catch (e) { /* jadval hali yaratilmagan yoki offline */ }
        try { return JSON.parse(localStorage.getItem(localKey)) || []; } catch { return []; }
    }
    async function romixBuhInsert(table, localKey, record) {
        let localList = [];
        try { localList = JSON.parse(localStorage.getItem(localKey)) || []; } catch {}
        localList.unshift(record);
        localStorage.setItem(localKey, JSON.stringify(localList));
        try {
            const { error } = await supabase.from(table).insert([record]);
            if (error) console.warn(`Romix Buh insert failed on ${table}:`, error);
        } catch (e) { console.warn(`Romix Buh insert exception on ${table}:`, e); }
        return record;
    }
    async function romixBuhUpdate(table, localKey, id, patch) {
        let localList = [];
        try { localList = JSON.parse(localStorage.getItem(localKey)) || []; } catch {}
        localList = localList.map(x => x.id === id ? { ...x, ...patch } : x);
        localStorage.setItem(localKey, JSON.stringify(localList));
        try {
            const { error } = await supabase.from(table).update(patch).eq('id', id);
            if (error) console.warn(`Romix Buh update failed on ${table}:`, error);
        } catch (e) { console.warn(`Romix Buh update exception on ${table}:`, e); }
    }
    async function romixBuhDelete(table, localKey, id) {
        let localList = [];
        try { localList = JSON.parse(localStorage.getItem(localKey)) || []; } catch {}
        localList = localList.filter(x => x.id !== id);
        localStorage.setItem(localKey, JSON.stringify(localList));
        try {
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) console.warn(`Romix Buh delete failed on ${table}:`, error);
        } catch (e) { console.warn(`Romix Buh delete exception on ${table}:`, e); }
    }

    let _romixBuhPillsBound = false;
    let _romixBuhFormsBound = false;

    function bindRomixBuhPillTabs() {
        if (_romixBuhPillsBound) return;
        _romixBuhPillsBound = true;
        document.querySelectorAll('#buhPillTabs .pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#buhPillTabs .pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const target = btn.getAttribute('data-buh-panel');
                document.querySelectorAll('.buh-tab-panel').forEach(p => p.classList.toggle('active', p.id === target));
            });
        });
        document.querySelectorAll('#buhSotuvPeriodTabs .pill').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#buhSotuvPeriodTabs .pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderBuhKunlikSotuv(btn.getAttribute('data-sotuv-period'));
            });
        });
    }

    function bindRomixBuhForms() {
        if (_romixBuhFormsBound) return;
        _romixBuhFormsBound = true;

        const empSearch = document.getElementById('buh-xodimlar-search');
        if (empSearch) empSearch.addEventListener('input', () => {
            const q = empSearch.value.trim().toLowerCase();
            document.querySelectorAll('#buh-xodimlar-grid .buh-emp-card').forEach(card => {
                card.style.display = (!q || (card.dataset.search || '').includes(q)) ? '' : 'none';
            });
        });

        const omborSearch = document.getElementById('buh-ombor-search');
        if (omborSearch) omborSearch.addEventListener('input', () => {
            const q = omborSearch.value.trim().toLowerCase();
            document.querySelectorAll('#buh-ombor-grid .buh-ombor-card').forEach(card => {
                card.style.display = (!q || (card.dataset.search || '').includes(q)) ? '' : 'none';
            });
        });

        const prodDateEl = document.getElementById('buh-prod-date');
        if (prodDateEl) prodDateEl.value = _buhToday();
        const expDateEl = document.getElementById('buh-exp-date');
        if (expDateEl) expDateEl.value = _buhToday();

        const prodForm = document.getElementById('buh-production-form');
        if (prodForm) prodForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = prodForm.querySelector('button[type="submit"]');
            if (submitBtn && submitBtn.disabled) return;
            const date = document.getElementById('buh-prod-date').value || _buhToday();
            const model = document.getElementById('buh-prod-model').value.trim();
            const qty = parseInt(document.getElementById('buh-prod-qty').value) || 0;
            const note = document.getElementById('buh-prod-note').value.trim();
            if (!model || qty <= 0) return;
            if (submitBtn) submitBtn.disabled = true;
            const record = { id: 'PRD-' + Date.now(), date, model_name: model, quantity: qty, note, created_at: new Date().toISOString() };
            await romixBuhInsert('romix_production_log', ROMIX_BUH_KEYS.production, record);
            prodForm.reset();
            document.getElementById('buh-prod-date').value = _buhToday();
            await renderRomixBuhIshlabChiqarish();
            await renderBuhOverview();
            if (submitBtn) submitBtn.disabled = false;
            window.showPremiumToast('Saqlandi', "Ishlab chiqarish yozuvi qo'shildi.", true);
        });

        const expForm = document.getElementById('buh-expense-form');
        if (expForm) expForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = expForm.querySelector('button[type="submit"]');
            if (submitBtn && submitBtn.disabled) return;
            const date = document.getElementById('buh-exp-date').value || _buhToday();
            const category = document.getElementById('buh-exp-category').value;
            const amount = parseFloat(document.getElementById('buh-exp-amount').value) || 0;
            const note = document.getElementById('buh-exp-note').value.trim();
            if (amount <= 0) return;
            if (submitBtn) submitBtn.disabled = true;
            const record = { id: 'EXP-' + Date.now(), date, category, amount, note, created_at: new Date().toISOString() };
            await romixBuhInsert('romix_expenses', ROMIX_BUH_KEYS.expenses, record);
            expForm.reset();
            document.getElementById('buh-exp-date').value = _buhToday();
            await renderRomixBuhHarajatlar();
            await updateBuhHeroKPIs();
            if (submitBtn) submitBtn.disabled = false;
            window.showPremiumToast('Saqlandi', "Xarajat qo'shildi.", true);
        });

        const debtForm = document.getElementById('buh-debt-form');
        if (debtForm) debtForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = debtForm.querySelector('button[type="submit"]');
            if (submitBtn && submitBtn.disabled) return;
            const creditor = document.getElementById('buh-debt-creditor').value.trim();
            const amount = parseFloat(document.getElementById('buh-debt-amount').value) || 0;
            const due = document.getElementById('buh-debt-due').value;
            const note = document.getElementById('buh-debt-note').value.trim();
            if (!creditor || amount <= 0) return;
            if (submitBtn) submitBtn.disabled = true;
            const record = { id: 'DBT-' + Date.now(), creditor, amount, paid_amount: 0, due_date: due, note, date: _buhToday(), created_at: new Date().toISOString() };
            await romixBuhInsert('romix_debts', ROMIX_BUH_KEYS.debts, record);
            debtForm.reset();
            await renderBuhTashqiQarz();
            await updateBuhHeroKPIs();
            if (submitBtn) submitBtn.disabled = false;
            window.showPremiumToast('Saqlandi', "Qarz yozuvi qo'shildi.", true);
        });
    }

    async function renderBuhXodimlar() {
        const statsEl = document.getElementById('buh-xodimlar-stats');
        const gridEl = document.getElementById('buh-xodimlar-grid');
        if (!statsEl && !gridEl) return;

        const todayStr = _buhToday();
        let emps = [], att = [];
        try {
            const { data: eData } = await supabase.from('employees').select('id, full_name, role, salary_info');
            emps = eData || [];
            const { data: aData } = await supabase.from('attendance').select('status, check_in, check_out, employee_id').eq('date', todayStr);
            att = aData || [];
        } catch (e) { console.warn('Buh Xodimlar fetch error:', e); }

        // --- Brigadalar KPI: reyting jadvali + har bir xodimning brigada orqali KPI belgisi ---
        let brigadeKpi = {}; // brigade_id -> { name, avg, count }
        let empBrigadeName = {}; // employee_id -> brigade_id
        try {
            const { data: brigades } = await supabase.from('romix_brigades').select('*');
            const { data: members } = await supabase.from('romix_brigade_members').select('*');
            const { data: ratings } = await supabase.from('romix_brigade_ratings').select('*');
            (brigades || []).forEach(b => { brigadeKpi[b.id] = { name: b.name, sum: 0, count: 0 }; });
            (ratings || []).forEach(r => {
                if (!brigadeKpi[r.brigade_id]) return;
                const avgScore = ((Number(r.quality_score) || 0) + (Number(r.timeliness_score) || 0) + (Number(r.service_score) || 0)) / 3;
                brigadeKpi[r.brigade_id].sum += avgScore;
                brigadeKpi[r.brigade_id].count += 1;
            });
            (members || []).forEach(m => { empBrigadeName[m.employee_id] = m.brigade_id; });
        } catch (e) { console.warn('Buh Xodimlar brigade KPI fetch error:', e); }

        const leaderboardEl = document.getElementById('buh-brigade-leaderboard');
        if (leaderboardEl) {
            const ranked = Object.values(brigadeKpi).filter(b => b.count > 0).map(b => ({ ...b, avg: b.sum / b.count })).sort((a, b) => b.avg - a.avg);
            leaderboardEl.innerHTML = ranked.length === 0 ? '' : `
                <div style="background:rgba(255,170,0,0.04); border:1px solid rgba(255,170,0,0.15); border-radius:16px; padding:16px;">
                    <h3 style="font-size:0.85rem; font-weight:700; color:#ffaa00; margin-bottom:12px;">🏆 Brigadalar Reytingi (O'rnatish sifati bo'yicha)</h3>
                    <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:10px;">
                        ${ranked.map((b, i) => `<div style="background:rgba(255,255,255,0.03); border-radius:12px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.8rem; font-weight:600; color:#fff;">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '👷'} ${b.name}</span>
                            <span style="font-size:0.85rem; font-weight:800; color:#ffaa00;">⭐ ${b.avg.toFixed(1)} <small style="color:rgba(255,255,255,0.4); font-weight:600;">(${b.count})</small></span>
                        </div>`).join('')}
                    </div>
                </div>
            `;
        }

        const attByEmp = {};
        att.forEach(a => { attByEmp[a.employee_id] = a; });

        const totalEmp = emps.length;
        const presentToday = att.filter(a => a.check_in).length;
        const monthlyPayrollFund = emps.reduce((s, e) => s + (parseFloat((e.salary_info || '').toString().replace(/[^0-9]/g, '')) || 0), 0);

        if (statsEl) {
            statsEl.innerHTML = `
                <div class="buh-mini-stat"><span class="buh-mini-label">Jami Xodimlar</span><span class="buh-mini-value">${totalEmp}</span></div>
                <div class="buh-mini-stat"><span class="buh-mini-label">Bugun Ishda</span><span class="buh-mini-value" style="color:#00ff88;">${presentToday}</span></div>
                <div class="buh-mini-stat"><span class="buh-mini-label">Bugungi Jonli Ish Haqi</span><span class="buh-mini-value" style="color:#ffaa00;" id="buh-xodimlar-live-total">0 UZS</span></div>
                <div class="buh-mini-stat"><span class="buh-mini-label">Oylik Maosh Fondi</span><span class="buh-mini-value" style="color:#ba00ff;">${_buhFmt(monthlyPayrollFund)}</span></div>
            `;
        }

        // --- HR bilan bir xil formula: kunlik stavka = oylik/26, soatlik = kunlik/8, sekundlik = soatlik/3600 ---
        // (admin.js dagi loadRomixDashboardStats'ning jonli ish haqi hisoblagichi bilan 100% bir xil)
        const activeWorkers = [];
        emps.forEach(e => {
            const a = attByEmp[e.id];
            if (!a || !a.check_in) return;
            const sal = parseFloat((e.salary_info || '').toString().replace(/[^0-9]/g, '')) || 0;
            const perSecondRate = (sal / 26) / 8 / 3600;
            const checkInParts = a.check_in.split(':');
            const checkInDate = new Date();
            checkInDate.setHours(parseInt(checkInParts[0]) || 0, parseInt(checkInParts[1]) || 0, parseInt(checkInParts[2]) || 0, 0);
            let checkOutDate = null;
            if (a.check_out) {
                const p = a.check_out.split(':');
                checkOutDate = new Date();
                checkOutDate.setHours(parseInt(p[0]) || 0, parseInt(p[1]) || 0, parseInt(p[2]) || 0, 0);
            }
            activeWorkers.push({ id: e.id, checkIn: a.check_in, checkOut: a.check_out, checkInDate, checkOutDate, perSecondRate });
        });

        if (gridEl) {
            if (emps.length === 0) {
                gridEl.innerHTML = '<div style="text-align:center; color:rgba(255,255,255,0.3); padding:20px; grid-column:1/-1;">Xodimlar topilmadi</div>';
            } else {
                gridEl.innerHTML = emps.map(e => {
                    const a = attByEmp[e.id];
                    const isWorking = !!(a && a.check_in && !a.check_out);
                    const hasLeft = !!(a && a.check_in && a.check_out);
                    const statusColor = isWorking ? '#00ff88' : (hasLeft ? '#ff4d4f' : 'rgba(255,255,255,0.15)');
                    const statusHtml = isWorking
                        ? `<span style="background:rgba(0,255,136,0.1); color:#00ff88; padding:3px 10px; border-radius:12px; font-size:0.68rem; font-weight:700; display:inline-flex; align-items:center; gap:5px;"><span class="pulse-dot" style="width:6px; height:6px; color:#00ff88;"></span>Ishlamoqda (${a.check_in})</span>`
                        : (hasLeft
                            ? `<span style="background:rgba(255,77,79,0.1); color:#ff4d4f; padding:3px 10px; border-radius:12px; font-size:0.68rem; font-weight:700;">Ketdi: ${a.check_out}</span>`
                            : `<span style="background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.35); padding:3px 10px; border-radius:12px; font-size:0.68rem; font-weight:700;">Kelmagan</span>`);
                    const salary = parseFloat((e.salary_info || '').toString().replace(/[^0-9]/g, '')) || 0;
                    const initials = (e.full_name || '?').split(' ').map(n => n?.[0]).join('').slice(0, 2).toUpperCase();
                    const searchKey = `${e.full_name || ''} ${e.role || ''}`.toLowerCase();
                    const empBrigadeId = empBrigadeName[e.id];
                    const empKpi = empBrigadeId ? brigadeKpi[empBrigadeId] : null;
                    const kpiHtml = (empKpi && empKpi.count > 0)
                        ? `<span style="background:rgba(255,170,0,0.1); color:#ffaa00; padding:3px 10px; border-radius:12px; font-size:0.68rem; font-weight:700;">⭐ KPI: ${(empKpi.sum / empKpi.count).toFixed(1)} (${empKpi.count})</span>`
                        : '';
                    return `<div class="buh-emp-card" data-search="${searchKey.replace(/"/g, '')}" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-top:3px solid ${statusColor}; border-radius:18px; padding:16px; display:flex; flex-direction:column; gap:10px; transition:all 0.25s;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="width:44px; height:44px; border-radius:14px; background:linear-gradient(135deg,#00d2ff,#007aff); display:flex; align-items:center; justify-content:center; font-weight:800; color:#fff; font-size:0.85rem; flex-shrink:0;">${initials}</div>
                            <div style="min-width:0; flex:1;">
                                <div style="font-weight:700; color:#fff; font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${e.full_name}</div>
                                <div style="font-size:0.7rem; color:rgba(255,255,255,0.4); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${e.role || 'Lavozimsiz'}</div>
                            </div>
                        </div>
                        ${kpiHtml ? `<div>${kpiHtml}</div>` : ''}
                        <div style="border-top:1px dashed rgba(255,255,255,0.06); padding-top:10px;">${statusHtml}</div>
                        <div style="background:rgba(255,170,0,0.05); border:1px solid rgba(255,170,0,0.15); border-radius:12px; padding:9px 12px; display:flex; flex-direction:column; gap:2px;">
                            <span style="font-size:0.6rem; color:rgba(255,255,255,0.4); font-weight:700; text-transform:uppercase; letter-spacing:0.4px;">Bugungi Jonli Ish Haqi</span>
                            <span id="buh-live-wage-${e.id}" style="font-size:1.05rem; font-weight:800; color:#ffaa00; font-family:monospace;">${isWorking ? '0.00 UZS' : '—'}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:rgba(255,255,255,0.45);">
                            <span>Oylik Maosh</span><strong style="color:#ba00ff; font-family:monospace;">${_buhFmt(salary)}</strong>
                        </div>
                    </div>`;
                }).join('');
            }
        }

        if (window.romixBuhPayrollInterval) clearInterval(window.romixBuhPayrollInterval);
        window.romixBuhPayrollInterval = setInterval(() => {
            let totalEarnedToday = 0;
            const now = new Date();
            activeWorkers.forEach(w => {
                const seconds = Math.max(0, ((w.checkOutDate || now) - w.checkInDate) / 1000);
                const earned = seconds * w.perSecondRate;
                totalEarnedToday += earned;
                const cell = document.getElementById(`buh-live-wage-${w.id}`);
                if (cell) cell.textContent = earned.toLocaleString('uz-UZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' UZS';
            });
            const totalEl = document.getElementById('buh-xodimlar-live-total');
            if (totalEl) totalEl.textContent = totalEarnedToday.toLocaleString('uz-UZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' UZS';
        }, 1000);

        return { totalEmp, monthlyPayrollFund };
    }

    // Aksesuar/Qoldiq/Oynak — endi Supabase'da (avval faqat brauzer localStorage'da edi).
    // Birinchi o'qishda: Supabase jadvali bo'sh VA localStorage'da eski ma'lumot bo'lsa,
    // bir martalik avtomatik ko'chiriladi (haqiqiy ombor kompyuteridagi ma'lumot yo'qolmasin).
    let _buhOmborMigrationChecked = { accessories: false, qoldiq: false, oynak: false };
    async function _buhOmborMigrateOnce(key, table, localKey, mapFn) {
        if (_buhOmborMigrationChecked[key]) return;
        _buhOmborMigrationChecked[key] = true;
        try {
            const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
            if (error) throw error;
            if (count > 0) return;
            const local = JSON.parse(localStorage.getItem(localKey) || '[]');
            if (!local.length) return;
            const rows = local.map(mapFn);
            const { error: insErr } = await supabase.from(table).insert(rows);
            if (insErr) throw insErr;
        } catch (e) { console.warn(`Buh ombor migratsiya xatosi (${table}):`, e); }
    }

    async function _buhGetAccessories() {
        await _buhOmborMigrateOnce('accessories', 'romix_accessories', ROMIX_BUH_KEYS.accessories, (a, i) => ({
            id: a.id || ('ACC-' + Date.now() + '-' + i), name: a.name, category: a.category,
            qty: Number(a.qty) || 0, unit: a.unit, spec: a.spec || '', price: Number(a.price) || 0
        }));
        return await romixBuhSelect('romix_accessories', ROMIX_BUH_KEYS.accessories);
    }
    async function _buhUpdateAccessoryPrice(id, price) {
        await romixBuhUpdate('romix_accessories', ROMIX_BUH_KEYS.accessories, id, { price });
    }
    async function renderRomixBuhOmbor() {
        const statsEl = document.getElementById('buh-ombor-stats');
        const gridEl = document.getElementById('buh-ombor-grid');
        if (!statsEl && !gridEl) return;

        let items = [];
        try {
            const { data } = await supabase.from('romix_inventory').select('*').order('product_name', { ascending: true });
            items = data || [];
        } catch (e) { console.warn('Buh Ombor fetch error:', e); }
        const accessories = await _buhGetAccessories();

        const totalItems = items.length;
        const lowStock = items.filter(p => (Number(p.stock_quantity) || 0) < 10).length;
        const totalValue = items.reduce((s, p) => s + ((Number(p.price) || 0) * (Number(p.stock_quantity) || 0)), 0);
        const accValue = accessories.reduce((s, a) => s + ((Number(a.price) || 0) * (Number(a.qty) || 0)), 0);

        if (statsEl) {
            statsEl.innerHTML = `
                <div class="buh-mini-stat"><span class="buh-mini-label">Mahsulot Turlari</span><span class="buh-mini-value">${totalItems}</span></div>
                <div class="buh-mini-stat"><span class="buh-mini-label">Kam Qolgan (&lt;10)</span><span class="buh-mini-value" style="color:#ff4d4f;">${lowStock}</span></div>
                <div class="buh-mini-stat"><span class="buh-mini-label">Jami Qiymat</span><span class="buh-mini-value" style="color:#00ff88;">${_buhFmt(totalValue)}</span></div>
                <div class="buh-mini-stat"><span class="buh-mini-label">Aksesuar Qiymati</span><span class="buh-mini-value" style="color:#BA68C8;">${_buhFmt(accValue)}</span></div>
            `;
        }

        if (gridEl) {
            const invCardsHtml = items.map(p => {
                const qty = Number(p.stock_quantity) || 0;
                const val = (Number(p.price) || 0) * qty;
                const isLow = qty < 10;
                const accentColor = isLow ? '#ff4d4f' : '#00baff';
                const nameEsc = (p.product_name || '').replace(/'/g, "\\'");
                const unitEsc = (p.unit || '').replace(/'/g, "\\'");
                const lowBadge = isLow ? `<span style="background:rgba(255,77,79,0.1); color:#ff4d4f; padding:2px 8px; border-radius:10px; font-size:0.62rem; font-weight:700; margin-left:6px;">⚠️ Kam qolgan</span>` : '';
                return `<div class="buh-ombor-card" data-search="${(p.product_name || '').toLowerCase().replace(/"/g, '')}" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-top:3px solid ${accentColor}; border-radius:18px; padding:16px; display:flex; flex-direction:column; gap:10px; transition:all 0.25s;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:44px; height:44px; border-radius:14px; background:linear-gradient(135deg,#00baff,#0072ff); display:flex; align-items:center; justify-content:center; font-size:1.15rem; flex-shrink:0;">📦</div>
                        <div style="min-width:0; flex:1;">
                            <div style="font-weight:700; color:#fff; font-size:0.88rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${p.product_name || ''}">${p.product_name || 'Noma\'lum'}</div>
                            <div style="font-size:0.7rem; color:${isLow ? '#ff4d4f' : 'rgba(255,255,255,0.4)'}; font-weight:${isLow ? '700' : '500'}; margin-top:2px;">${qty} ${p.unit || ''}${lowBadge}</div>
                        </div>
                    </div>
                    <div style="border-top:1px dashed rgba(255,255,255,0.06); padding-top:10px; display:flex; justify-content:space-between; font-size:0.76rem; color:rgba(255,255,255,0.5);">
                        <span>Narx (birlik)</span><strong style="color:#00ff88; font-family:monospace;">${_buhFmt(p.price)}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.76rem; color:rgba(255,255,255,0.5);">
                        <span>Jami qiymat</span><strong style="color:#00d2ff; font-family:monospace;">${_buhFmt(val)}</strong>
                    </div>
                    <button onclick="window.openRomixPriceModal('inventory', '${p.id}', '${nameEsc}', ${p.price || 0}, ${qty}, '${unitEsc}')"
                        style="display:flex; align-items:center; justify-content:center; gap:6px; background:rgba(0,186,255,0.1); border:1px solid rgba(0,186,255,0.25); color:#00baff; padding:9px; border-radius:10px; font-size:0.76rem; font-weight:700; cursor:pointer; transition:all 0.2s; width:100%; margin-top:2px;"
                        onmouseenter="this.style.background='rgba(0,186,255,0.2)'; this.style.transform='translateY(-1px)';"
                        onmouseleave="this.style.background='rgba(0,186,255,0.1)'; this.style.transform='translateY(0)';">
                        💲 Narx belgilash
                    </button>
                </div>`;
            }).join('');

            const accCardsHtml = accessories.map((a) => {
                const qty = Number(a.qty) || 0;
                const price = Number(a.price) || 0;
                const val = price * qty;
                const hasNoPrice = price <= 0;
                const accentColor = hasNoPrice ? '#ffaa00' : '#BA68C8';
                const nameEsc = (a.name || '').replace(/'/g, "\\'");
                const unitEsc = (a.unit || '').replace(/'/g, "\\'");
                const noPriceBadge = hasNoPrice ? `<span style="background:rgba(255,170,0,0.1); color:#ffaa00; padding:2px 8px; border-radius:10px; font-size:0.62rem; font-weight:700; margin-left:6px;">⚠️ Narx yo'q</span>` : '';
                return `<div class="buh-ombor-card" data-search="${(a.name || '').toLowerCase().replace(/"/g, '')}" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-top:3px solid ${accentColor}; border-radius:18px; padding:16px; display:flex; flex-direction:column; gap:10px; transition:all 0.25s;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:44px; height:44px; border-radius:14px; background:linear-gradient(135deg,#BA68C8,#7B1FA2); display:flex; align-items:center; justify-content:center; font-size:1.15rem; flex-shrink:0;">🔩</div>
                        <div style="min-width:0; flex:1;">
                            <div style="font-weight:700; color:#fff; font-size:0.88rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${a.name || ''}">${a.name || 'Noma\'lum'} <span style="font-size:0.6rem; color:rgba(255,255,255,0.3); font-weight:500;">(Aksesuar)</span></div>
                            <div style="font-size:0.7rem; color:rgba(255,255,255,0.4); margin-top:2px;">${qty} ${a.unit || ''}${noPriceBadge}</div>
                        </div>
                    </div>
                    <div style="border-top:1px dashed rgba(255,255,255,0.06); padding-top:10px; display:flex; justify-content:space-between; font-size:0.76rem; color:rgba(255,255,255,0.5);">
                        <span>Narx (birlik)</span><strong style="color:#00ff88; font-family:monospace;">${_buhFmt(price)}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.76rem; color:rgba(255,255,255,0.5);">
                        <span>Jami qiymat</span><strong style="color:#00d2ff; font-family:monospace;">${_buhFmt(val)}</strong>
                    </div>
                    <button onclick="window.openRomixPriceModal('accessory', '${a.id}', '${nameEsc}', ${price}, ${qty}, '${unitEsc}')"
                        style="display:flex; align-items:center; justify-content:center; gap:6px; background:rgba(186,104,200,0.1); border:1px solid rgba(186,104,200,0.25); color:#BA68C8; padding:9px; border-radius:10px; font-size:0.76rem; font-weight:700; cursor:pointer; transition:all 0.2s; width:100%; margin-top:2px;"
                        onmouseenter="this.style.background='rgba(186,104,200,0.2)'; this.style.transform='translateY(-1px)';"
                        onmouseleave="this.style.background='rgba(186,104,200,0.1)'; this.style.transform='translateY(0)';">
                        💲 Narx belgilash
                    </button>
                </div>`;
            }).join('');

            const combinedHtml = invCardsHtml + accCardsHtml;
            gridEl.innerHTML = combinedHtml || '<div style="text-align:center; color:rgba(255,255,255,0.3); padding:20px; grid-column:1/-1;">Ombor bo\'sh</div>';
        }
        return { totalValue, accValue };
    }

    window.openRomixPriceModal = (source, id, name, currentPrice, qty, unit) => {
        window._romixPriceModalState = { source: source || 'inventory', id, qty: Number(qty) || 0, unit: unit || '' };
        const modal = document.getElementById('romix-price-modal');
        const nameEl = document.getElementById('romix-price-modal-product');
        const input = document.getElementById('romix-price-modal-input');
        if (nameEl) nameEl.textContent = name;
        if (input) input.value = currentPrice || 0;
        window.updateRomixPricePreview();
        if (modal) modal.style.display = 'flex';
        setTimeout(() => input && input.focus(), 50);
    };

    window.closeRomixPriceModal = () => {
        const modal = document.getElementById('romix-price-modal');
        if (modal) modal.style.display = 'none';
        window._romixPriceModalState = null;
    };

    window.updateRomixPricePreview = () => {
        const input = document.getElementById('romix-price-modal-input');
        const preview = document.getElementById('romix-price-modal-preview');
        const state = window._romixPriceModalState;
        if (!input || !preview || !state) return;
        const price = parseFloat(input.value) || 0;
        const total = price * state.qty;
        preview.textContent = `Jami qiymat: ${_buhFmt(total)} (${state.qty} ${state.unit} zaxira uchun)`;
    };

    window.saveRomixPriceModal = async () => {
        const state = window._romixPriceModalState;
        const input = document.getElementById('romix-price-modal-input');
        if (!state || !input) return;
        const val = parseFloat(input.value);
        if (isNaN(val) || val < 0) { alert("Iltimos, to'g'ri narx kiriting."); return; }

        if (state.source === 'accessory') {
            await _buhUpdateAccessoryPrice(state.id, val);
            window.showPremiumToast('Muvaffaqiyatli', 'Aksesuar narxi yangilandi.', true);
            window.closeRomixPriceModal();
            await renderRomixBuhOmbor();
            await renderBuhOverview();
            return;
        }

        try {
            const { error } = await supabase.from('romix_inventory').update({ price: val }).eq('id', state.id);
            if (error) throw error;
            window.showPremiumToast('Muvaffaqiyatli', 'Tan narx yangilandi.', true);
            window.closeRomixPriceModal();
            await renderRomixBuhOmbor();
            await renderBuhOverview();
        } catch (err) {
            alert('Xatolik: ' + err.message);
        }
    };

    // ========================================================
    // ======== BUXGALTERIYA: OMBORGA KIRIM QILISH ============
    // (Ombor bo'limi endi faqat CHIQIM qiladi — kirimni
    // Buxgalteriya nazorat qiladi, romix_inventory/romix_transactions
    // jadvallariga yozadi — Ombor sahifasidagi mantiq bilan bir xil)
    // ========================================================
    window.openBuhKirimModal = () => {
        const modal = document.getElementById('buh-kirim-modal');
        if (modal) modal.style.display = 'flex';
    };
    window.closeBuhKirimModal = () => {
        const modal = document.getElementById('buh-kirim-modal');
        if (modal) modal.style.display = 'none';
    };
    window.saveBuhKirim = async () => {
        const name = document.getElementById('buhKName').value.trim();
        const cat = document.getElementById('buhKCategory').value;
        const qty = parseFloat(document.getElementById('buhKQty').value);
        const price = parseFloat(document.getElementById('buhKPrice').value) || 0;
        const supplier = document.getElementById('buhKSupplier').value.trim();
        const phone = document.getElementById('buhKPhone').value.trim();
        const unit = document.getElementById('buhKUnit').value;
        const gross = parseFloat(document.getElementById('buhKGross').value) || 0;
        const net = parseFloat(document.getElementById('buhKNet').value) || 0;
        const desc = document.getElementById('buhKDesc').value;

        if (!name || isNaN(qty)) { alert('Ma\'lumotlarni to\'ldiring!'); return; }

        try {
            const { data: existing } = await supabase.from('romix_inventory').select('*').eq('product_name', name).maybeSingle();
            const payload = {
                product_name: name, category: cat, description: desc, unit: unit,
                gross_weight: gross, net_weight: net, supplier_name: supplier, supplier_phone: phone, price: price,
                stock_quantity: existing ? (parseFloat(existing.stock_quantity) || 0) + qty : qty
            };
            let product;
            if (existing) {
                const { data, error } = await supabase.from('romix_inventory').update(payload).eq('id', existing.id).select().single();
                if (error) throw error;
                product = data;
            } else {
                const { data, error } = await supabase.from('romix_inventory').insert([payload]).select().single();
                if (error) throw error;
                product = data;
            }
            await supabase.from('romix_transactions').insert([{
                product_id: product.id, type: 'IN', quantity: qty,
                note: `Buxgalteriya Kirim - Taminotchi: ${supplier} | Brutto/Netto: ${gross}/${net}`
            }]);
            window.showPremiumToast('Muvaffaqiyatli', `${name} — ${qty} ${unit} kirim qilindi.`, true);
            window.closeBuhKirimModal();
            ['buhKName','buhKDesc','buhKSupplier','buhKPhone','buhKQty','buhKPrice','buhKGross','buhKNet'].forEach(id => {
                const el = document.getElementById(id); if (el) el.value = '';
            });
            await renderRomixBuhOmbor();
        } catch (err) {
            alert('Xatolik: ' + err.message);
        }
    };

    window.openBuhProfilKirimModal = () => {
        const modal = document.getElementById('buh-profil-kirim-modal');
        if (modal) modal.style.display = 'flex';
    };
    window.closeBuhProfilKirimModal = () => {
        const modal = document.getElementById('buh-profil-kirim-modal');
        if (modal) modal.style.display = 'none';
    };
    window.updateBuhMetrCalc = () => {
        const soni = parseFloat(document.getElementById('buhPkSoni').value) || 0;
        const el = document.getElementById('buhMetrCalcValue');
        if (el) el.textContent = (soni * 48).toString();
    };
    window.saveBuhProfilKirim = async () => {
        const uzunligi = document.getElementById('buhPkUzunligi').value.trim();
        const soni = parseFloat(document.getElementById('buhPkSoni').value) || 0;
        const profil = document.getElementById('buhPkProfil').value;
        const brend = document.getElementById('buhPkBrend').value;
        const seriya = document.getElementById('buhPkSeriya').value;
        const shakli = document.getElementById('buhPkShakli').value;
        const rangTuri = document.getElementById('buhPkRangTuri').value;
        const rangi = document.getElementById('buhPkRangi').value;

        if (!uzunligi || soni <= 0 || !profil || !brend || !seriya || !shakli || !rangTuri || !rangi) {
            alert("Barcha maydonlarni to'g'ri to'ldiring!");
            return;
        }

        const METR_PER_PACHKA = 48;
        const jamiMetr = soni * METR_PER_PACHKA;
        const name = `${profil} ${brend} ${seriya}`;
        const desc = `${uzunligi}mm | ${shakli} | ${rangi} (${rangTuri})`;
        const metadata = { uzunligi, profil, brend, seriya, shakli, rangTuri, rangi };

        try {
            const { data: existing } = await supabase.from('romix_inventory').select('*').eq('product_name', name).eq('description', desc).maybeSingle();
            const payload = {
                product_name: name, category: 'Profil', description: desc, unit: 'metr', price: 0,
                stock_quantity: existing ? (parseFloat(existing.stock_quantity) || 0) + jamiMetr : jamiMetr,
                metadata: metadata
            };
            let product;
            if (existing) {
                const { data, error } = await supabase.from('romix_inventory').update(payload).eq('id', existing.id).select().single();
                if (error) throw error;
                product = data;
            } else {
                const { data, error } = await supabase.from('romix_inventory').insert([payload]).select().single();
                if (error) throw error;
                product = data;
            }
            await supabase.from('romix_transactions').insert([{
                product_id: product.id, type: 'IN', quantity: jamiMetr,
                note: `Buxgalteriya Profil Kirim - ${soni} pachka × ${METR_PER_PACHKA} = ${jamiMetr} metr | ${desc}`
            }]);
            window.showPremiumToast('Muvaffaqiyatli', `${name} — ${jamiMetr} metr kirim qilindi.`, true);
            window.closeBuhProfilKirimModal();
            ['buhPkUzunligi','buhPkSoni'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            ['buhPkProfil','buhPkBrend','buhPkSeriya','buhPkShakli','buhPkRangTuri','buhPkRangi'].forEach(id => { const el = document.getElementById(id); if (el) el.selectedIndex = 0; });
            const mc = document.getElementById('buhMetrCalcValue'); if (mc) mc.textContent = '0';
            await renderRomixBuhOmbor();
        } catch (err) {
            alert('Xatolik: ' + err.message);
        }
    };

    // ========================================================
    // ======== BUXGALTERIYA: AKSESSUAR KIRIMI (localStorage) ==
    // Aksessuar ombori (romix_ombor_aksesuvar.html) alohida
    // localStorage tizimi ishlatadi (romix_inventory'dan farqli).
    // Bir xil origin bo'lgani uchun shu yerdan yozilgan yozuv
    // o'sha sahifada ham to'g'ridan-to'g'ri ko'rinadi.
    // ========================================================
    window.openBuhAccKirimModal = () => {
        const modal = document.getElementById('buh-acc-kirim-modal');
        if (modal) modal.style.display = 'flex';
    };
    window.closeBuhAccKirimModal = () => {
        const modal = document.getElementById('buh-acc-kirim-modal');
        if (modal) modal.style.display = 'none';
    };
    window.saveBuhAccKirim = async () => {
        const name = document.getElementById('buhAccName').value.trim();
        const categorySelect = document.getElementById('buhAccCategory').value;
        const customCategory = document.getElementById('buhAccCustomCategory').value.trim();
        const spec = document.getElementById('buhAccSpec').value.trim();
        const unit = document.getElementById('buhAccUnit').value;
        const qty = parseInt(document.getElementById('buhAccQty').value);
        const finalCategory = categorySelect === 'Boshqa...' ? customCategory : categorySelect;

        if (!name || !finalCategory || isNaN(qty) || qty <= 0) {
            alert("Iltimos, barcha maydonlarni to'g'ri to'ldiring!");
            return;
        }

        const inventory = await _buhGetAccessories();
        const matched = inventory.find(item => (item.name || '').toLowerCase() === name.toLowerCase());
        if (matched) {
            await romixBuhUpdate('romix_accessories', ROMIX_BUH_KEYS.accessories, matched.id, {
                qty: (Number(matched.qty) || 0) + qty, spec, category: finalCategory
            });
        } else {
            await romixBuhInsert('romix_accessories', ROMIX_BUH_KEYS.accessories, {
                id: 'ACC-' + Date.now(), name, category: finalCategory, qty, unit, spec, price: 0
            });
        }

        // Tarix jurnaliga yozish (romix_ombor_aksesuvar.html'dagi addHistoryLog bilan bir xil shakl)
        const curUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const operator = (curUser.full_name || curUser.username || 'BUXGALTERIYA').toUpperCase();
        const now = new Date();
        const timeStr = now.toLocaleDateString('uz-UZ') + ' ' + now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
        await romixBuhInsert('romix_accessories_history', 'romix_accessories_history_log', {
            id: 'HIST-' + Date.now(),
            timestamp: timeStr,
            action: 'Dona Kirim 📥',
            details: `"${name}" mahsulotidan ${qty.toLocaleString()} ${unit} Dona Kirim qilindi (Buxgalteriya). Kategoriya: ${finalCategory}. Xususiyati: ${spec}.`,
            operator: operator
        });

        window.showPremiumToast('Muvaffaqiyatli', `${name} — ${qty} ${unit} kirim qilindi.`, true);
        window.closeBuhAccKirimModal();
        ['buhAccName','buhAccSpec','buhAccQty','buhAccCustomCategory'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        document.getElementById('buhAccCategory').selectedIndex = 0;
        document.getElementById('buhAccUnit').selectedIndex = 0;
        document.getElementById('buhAccCustomCategoryGroup').style.display = 'none';
    };

    // ========================================================
    // ======== BUXGALTERIYA: SPISKA KIRIM (guruhli) ===========
    // Bir nechta aksessuar tovarni vaqtinchalik ro'yxatga
    // qo'shib, birdaniga romix_accessories (Supabase)ga yozadi.
    // ========================================================
    let buhSpiskaTempItems = [];

    window.openBuhSpiskaModal = () => {
        buhSpiskaTempItems = [];
        window.renderBuhSpiskaTempList();
        const modal = document.getElementById('buh-spiska-modal');
        if (modal) modal.style.display = 'flex';
    };
    window.closeBuhSpiskaModal = () => {
        buhSpiskaTempItems = [];
        const modal = document.getElementById('buh-spiska-modal');
        if (modal) modal.style.display = 'none';
    };
    window.addBuhSpiskaTempItem = () => {
        const name = document.getElementById('buhSpiskaName').value.trim();
        const categorySelect = document.getElementById('buhSpiskaCategory').value;
        const customCategory = document.getElementById('buhSpiskaCustomCategory').value.trim();
        const spec = document.getElementById('buhSpiskaSpec').value.trim();
        const unit = document.getElementById('buhSpiskaUnit').value;
        const qty = parseInt(document.getElementById('buhSpiskaQty').value);
        const finalCategory = categorySelect === 'Boshqa...' ? customCategory : categorySelect;

        if (!name || !finalCategory || isNaN(qty) || qty <= 0) {
            alert("Iltimos, barcha maydonlarni to'g'ri to'ldiring!");
            return;
        }

        const existingIdx = buhSpiskaTempItems.findIndex(item => item.name.toLowerCase() === name.toLowerCase());
        if (existingIdx > -1) {
            buhSpiskaTempItems[existingIdx].qty += qty;
            buhSpiskaTempItems[existingIdx].spec = spec;
            buhSpiskaTempItems[existingIdx].category = finalCategory;
        } else {
            buhSpiskaTempItems.push({ name, category: finalCategory, qty, unit, spec });
        }

        ['buhSpiskaName','buhSpiskaSpec','buhSpiskaQty'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        document.getElementById('buhSpiskaName').focus();
        window.renderBuhSpiskaTempList();
    };
    window.removeBuhSpiskaTempItem = (idx) => {
        buhSpiskaTempItems.splice(idx, 1);
        window.renderBuhSpiskaTempList();
    };
    window.renderBuhSpiskaTempList = () => {
        const tbody = document.getElementById('buhSpiskaTempTableBody');
        if (!tbody) return;
        let totalQty = 0;
        if (buhSpiskaTempItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:rgba(255,255,255,0.3); font-size:0.8rem;">Ro\'yxat bo\'sh. Tovar qo\'shing...</td></tr>';
        } else {
            tbody.innerHTML = buhSpiskaTempItems.map((item, idx) => {
                totalQty += item.qty;
                return `<tr style="border-top:1px solid rgba(255,255,255,0.05);">
                    <td style="padding:8px; color:#fff; font-weight:600;">${item.name}</td>
                    <td style="padding:8px; color:rgba(255,255,255,0.5); font-size:0.75rem;">${item.category}</td>
                    <td style="padding:8px; text-align:right; color:#00ff88; font-weight:700;">${item.qty.toLocaleString()} ${item.unit}</td>
                    <td style="padding:8px; text-align:right;"><button onclick="window.removeBuhSpiskaTempItem(${idx})" style="background:none; border:none; color:#ff4d4f; cursor:pointer; font-size:0.85rem;">🗑️</button></td>
                </tr>`;
            }).join('');
        }
        document.getElementById('buhSpiskaTempCount').textContent = `${buhSpiskaTempItems.length} ta tovar`;
        document.getElementById('buhSpiskaTempTotalQty').textContent = `${totalQty.toLocaleString()} dona`;
    };
    window.commitBuhSpiskaDeposit = async () => {
        if (buhSpiskaTempItems.length === 0) {
            alert("Iltimos, tasdiqlashdan oldin hech bo'lmaganda bitta mahsulot qo'shing!");
            return;
        }
        const inventory = await _buhGetAccessories();
        const curUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const operator = (curUser.full_name || curUser.username || 'BUXGALTERIYA').toUpperCase();

        for (const item of buhSpiskaTempItems) {
            const matched = inventory.find(inv => (inv.name || '').toLowerCase() === item.name.toLowerCase());
            if (matched) {
                await romixBuhUpdate('romix_accessories', ROMIX_BUH_KEYS.accessories, matched.id, {
                    qty: (Number(matched.qty) || 0) + item.qty, spec: item.spec, category: item.category
                });
                matched.qty = (Number(matched.qty) || 0) + item.qty;
            } else {
                const newItem = { id: 'ACC-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), name: item.name, category: item.category, qty: item.qty, unit: item.unit, spec: item.spec, price: 0 };
                await romixBuhInsert('romix_accessories', ROMIX_BUH_KEYS.accessories, newItem);
                inventory.push(newItem);
            }
            const now = new Date();
            const timeStr = now.toLocaleDateString('uz-UZ') + ' ' + now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
            await romixBuhInsert('romix_accessories_history', 'romix_accessories_history_log', {
                id: 'HIST-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                timestamp: timeStr,
                action: 'Spiska Kirim 📜',
                details: `"${item.name}" mahsulotidan ${item.qty.toLocaleString()} ${item.unit} Spiska orqali guruhli kirim qilindi (Buxgalteriya). Kategoriya: ${item.category}.`,
                operator: operator
            });
        }

        window.showPremiumToast('Muvaffaqiyatli', `${buhSpiskaTempItems.length} ta tovar kirim qilindi.`, true);
        window.closeBuhSpiskaModal();
    };

    // ========================================================
    // ======== BUXGALTERIYA: RASMDAN KIRIM (AI, Gemini Vision) ==
    // Spiska hujjati rasmi /api/spiska-vision'ga yuboriladi,
    // AI aniqlagan mahsulotlar ro'yxati ko'rib chiqiladi/tahrirlanadi,
    // tasdiqlangach turi bo'yicha romix_inventory (profil) yoki
    // romix_accessories (aksessuar, Supabase)ga yoziladi.
    // ========================================================
    window.openBuhVisionModal = () => {
        window.__buhVisionImageData = null;
        window.__buhVisionItems = [];
        const fileInput = document.getElementById('buhVisionFileInput');
        if (fileInput) fileInput.value = '';
        document.getElementById('buhVisionPreviewWrap').style.display = 'none';
        document.getElementById('buhVisionPlaceholder').style.display = 'block';
        const analyzeBtn = document.getElementById('buhVisionAnalyzeBtn');
        analyzeBtn.disabled = true;
        analyzeBtn.style.opacity = '0.5';
        document.getElementById('buhVisionError').style.display = 'none';
        document.getElementById('buhVisionLoading').style.display = 'none';
        document.getElementById('buhVisionUploadStep').style.display = 'block';
        document.getElementById('buhVisionReviewStep').style.display = 'none';
        const modal = document.getElementById('buh-vision-modal');
        if (modal) modal.style.display = 'flex';
    };
    window.closeBuhVisionModal = () => {
        const modal = document.getElementById('buh-vision-modal');
        if (modal) modal.style.display = 'none';
    };
    window.resetBuhVisionModal = () => {
        document.getElementById('buhVisionReviewStep').style.display = 'none';
        document.getElementById('buhVisionUploadStep').style.display = 'block';
        document.getElementById('buhVisionError').style.display = 'none';
        window.__buhVisionItems = [];
    };
    window.handleBuhVisionFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Vercel serverless funksiyalarida so'rov tanasi ~4.5MB bilan chegaralangan
                // (base64 ~33% kattalashadi) — shu sabab MAX_BASE64_BYTES'dan oshmaguncha
                // eng yuqori sifat/o'lchamni saqlashga harakat qilamiz (skanerlash sifati uchun).
                const MAX_DIM = 2600;
                const MAX_BASE64_BYTES = 3.6 * 1024 * 1024;
                let width = img.width, height = img.height;
                if (width > MAX_DIM || height > MAX_DIM) {
                    const scale = MAX_DIM / Math.max(width, height);
                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);

                let quality = 0.95;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);
                while (dataUrl.length > MAX_BASE64_BYTES && quality > 0.5) {
                    quality -= 0.1;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }
                window.__buhVisionImageData = { image: dataUrl.split(',')[1], mimeType: 'image/jpeg' };
                document.getElementById('buhVisionPreviewImg').src = dataUrl;
                document.getElementById('buhVisionPreviewWrap').style.display = 'block';
                document.getElementById('buhVisionPlaceholder').style.display = 'none';
                const analyzeBtn = document.getElementById('buhVisionAnalyzeBtn');
                analyzeBtn.disabled = false;
                analyzeBtn.style.opacity = '1';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };
    window.analyzeBuhVisionImage = async () => {
        if (!window.__buhVisionImageData) return;
        const loadingEl = document.getElementById('buhVisionLoading');
        const errorEl = document.getElementById('buhVisionError');
        const analyzeBtn = document.getElementById('buhVisionAnalyzeBtn');
        loadingEl.style.display = 'block';
        errorEl.style.display = 'none';
        analyzeBtn.disabled = true;
        try {
            const resp = await fetch('/api/spiska-vision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.__buhVisionImageData)
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || 'Xatolik yuz berdi');
            if (!data.items || data.items.length === 0) throw new Error("Rasmda hech qanday mahsulot aniqlanmadi. Aniqroq/yorug' rasm bilan qayta urinib ko'ring.");
            window.__buhVisionItems = data.items;
            window.renderBuhVisionResults();
            document.getElementById('buhVisionUploadStep').style.display = 'none';
            document.getElementById('buhVisionReviewStep').style.display = 'block';
        } catch (err) {
            errorEl.textContent = '❌ ' + err.message;
            errorEl.style.display = 'block';
        } finally {
            loadingEl.style.display = 'none';
            analyzeBtn.disabled = false;
        }
    };
    const BUH_VISION_CATEGORIES = ['Zamoklar', 'Ruchkalar', 'Qistirmalar', 'Biriktiruvchilar', "Boshqa..."];
    const BUH_VISION_UNITS = ['dona', 'kg', 'litr', 'metr', 'pachka'];
    window.renderBuhVisionResults = () => {
        const tbody = document.getElementById('buhVisionResultsBody');
        const items = window.__buhVisionItems || [];
        tbody.innerHTML = items.map((it, idx) => {
            const isAcc = it.type === 'aksessuar';
            return `<tr style="border-top:1px solid rgba(255,255,255,0.05);">
                <td style="padding:6px;"><input type="text" value="${(it.name || '').replace(/"/g, '&quot;')}" oninput="window.updateBuhVisionItem(${idx},'name',this.value)" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:5px 8px; border-radius:6px; font-size:0.76rem; box-sizing:border-box;"></td>
                <td style="padding:6px;">
                    <select onchange="window.updateBuhVisionItem(${idx},'type',this.value)" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:5px; border-radius:6px; font-size:0.76rem;">
                        <option value="profil" ${!isAcc ? 'selected' : ''}>Profil</option>
                        <option value="aksessuar" ${isAcc ? 'selected' : ''}>Aksessuar</option>
                    </select>
                </td>
                <td style="padding:6px;">
                    ${isAcc ? `<select onchange="window.updateBuhVisionItem(${idx},'category',this.value)" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:5px; border-radius:6px; font-size:0.76rem;">
                        ${BUH_VISION_CATEGORIES.map(c => `<option value="${c}" ${it.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>` : '<span style="color:rgba(255,255,255,0.3); font-size:0.72rem;">—</span>'}
                </td>
                <td style="padding:6px;">
                    <select onchange="window.updateBuhVisionItem(${idx},'unit',this.value)" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:5px; border-radius:6px; font-size:0.76rem;">
                        ${BUH_VISION_UNITS.map(u => `<option value="${u}" ${it.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
                    </select>
                </td>
                <td style="padding:6px;"><input type="number" value="${it.qty}" min="0" oninput="window.updateBuhVisionItem(${idx},'qty',this.value)" style="width:70px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:#00ff88; font-weight:700; padding:5px 8px; border-radius:6px; font-size:0.76rem; text-align:right;"></td>
                <td style="padding:6px;">
                    ${!isAcc ? `<input type="number" value="${it.lengthMm || ''}" min="0" placeholder="mm" oninput="window.updateBuhVisionItem(${idx},'lengthMm',this.value)" title="Har bir dona/pachka uzunligi (mm) — to'ldirilsa, jami metr avtomatik hisoblanadi" style="width:70px; background:rgba(0,210,255,0.06); border:1px solid rgba(0,210,255,0.25); color:#00d2ff; font-weight:700; padding:5px 8px; border-radius:6px; font-size:0.76rem; text-align:right;">` : '<span style="color:rgba(255,255,255,0.3); font-size:0.72rem;">—</span>'}
                </td>
                <td style="padding:6px;"><input type="text" value="${(it.spec || '').replace(/"/g, '&quot;')}" oninput="window.updateBuhVisionItem(${idx},'spec',this.value)" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:5px 8px; border-radius:6px; font-size:0.76rem; box-sizing:border-box;"></td>
                <td style="padding:6px;"><input type="number" value="${it.price || ''}" min="0" placeholder="narx" oninput="window.updateBuhVisionItem(${idx},'price',this.value)" title="Bir birlik/dona narxi (so'm)" style="width:90px; background:rgba(0,255,136,0.06); border:1px solid rgba(0,255,136,0.25); color:#00ff88; font-weight:700; padding:5px 8px; border-radius:6px; font-size:0.76rem; text-align:right;"></td>
                <td style="padding:6px; text-align:center;"><button onclick="window.removeBuhVisionItem(${idx})" style="background:none; border:none; color:#ff4d4f; cursor:pointer; font-size:0.85rem;">🗑️</button></td>
            </tr>`;
        }).join('') || '<tr><td colspan="9" style="text-align:center; padding:20px; color:rgba(255,255,255,0.3);">Ro\'yxat bo\'sh</td></tr>';
    };
    window.updateBuhVisionItem = (idx, field, value) => {
        if (!window.__buhVisionItems || !window.__buhVisionItems[idx]) return;
        if (field === 'qty' || field === 'lengthMm' || field === 'price') value = parseFloat(value) || 0;
        window.__buhVisionItems[idx][field] = value;
        if (field === 'type') window.renderBuhVisionResults();
    };
    window.removeBuhVisionItem = (idx) => {
        window.__buhVisionItems.splice(idx, 1);
        window.renderBuhVisionResults();
    };
    window.confirmBuhVisionKirim = async () => {
        const items = (window.__buhVisionItems || []).filter(it => it.name && it.qty > 0);
        if (items.length === 0) {
            alert("Tasdiqlash uchun hech bo'lmaganda bitta to'g'ri mahsulot bo'lishi kerak!");
            return;
        }
        const profilItems = items.filter(it => it.type === 'profil');
        const accItems = items.filter(it => it.type === 'aksessuar');

        for (const it of profilItems) {
            try {
                // Uzunligi (mm) kiritilgan bo'lsa: jami metr = miqdor (dona/pachka) x uzunligi(mm) / 1000
                const useLength = Number(it.lengthMm) > 0;
                const finalQty = useLength ? (it.qty * Number(it.lengthMm) / 1000) : it.qty;
                const finalUnit = useLength ? 'metr' : it.unit;
                const desc = useLength
                    ? `${it.spec ? it.spec + ' | ' : ''}${it.qty} ${it.unit} x ${it.lengthMm}mm`
                    : (it.spec || '');

                const { data: existing } = await supabase.from('romix_inventory').select('*').eq('product_name', it.name).maybeSingle();
                const payload = {
                    product_name: it.name, category: 'Profil', description: desc, unit: finalUnit,
                    price: it.price > 0 ? it.price : (existing ? (existing.price || 0) : 0),
                    stock_quantity: existing ? (parseFloat(existing.stock_quantity) || 0) + finalQty : finalQty
                };
                let product;
                if (existing) {
                    const { data, error } = await supabase.from('romix_inventory').update(payload).eq('id', existing.id).select().single();
                    if (error) throw error;
                    product = data;
                } else {
                    const { data, error } = await supabase.from('romix_inventory').insert([payload]).select().single();
                    if (error) throw error;
                    product = data;
                }
                await supabase.from('romix_transactions').insert([{
                    product_id: product.id, type: 'IN', quantity: finalQty,
                    note: `Rasmdan Kirim (AI) - Buxgalteriya${desc ? ' | ' + desc : ''}`
                }]);
            } catch (err) {
                console.error('Vision kirim (profil) xatolik:', it.name, err);
            }
        }

        if (accItems.length > 0) {
            const inventory = await _buhGetAccessories();
            const curUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const operator = (curUser.full_name || curUser.username || 'BUXGALTERIYA').toUpperCase();
            for (const it of accItems) {
                const finalCategory = it.category && it.category !== '' ? it.category : "Boshqa...";
                const matched = inventory.find(inv => (inv.name || '').toLowerCase() === it.name.toLowerCase());
                if (matched) {
                    const patch = { qty: (Number(matched.qty) || 0) + it.qty, spec: it.spec, category: finalCategory };
                    if (it.price > 0) patch.price = it.price;
                    await romixBuhUpdate('romix_accessories', ROMIX_BUH_KEYS.accessories, matched.id, patch);
                    matched.qty = patch.qty;
                } else {
                    const newItem = { id: 'ACC-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), name: it.name, category: finalCategory, qty: it.qty, unit: it.unit, spec: it.spec, price: it.price || 0 };
                    await romixBuhInsert('romix_accessories', ROMIX_BUH_KEYS.accessories, newItem);
                    inventory.push(newItem);
                }
                const now = new Date();
                const timeStr = now.toLocaleDateString('uz-UZ') + ' ' + now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
                await romixBuhInsert('romix_accessories_history', 'romix_accessories_history_log', {
                    id: 'HIST-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                    timestamp: timeStr,
                    action: 'Rasmdan Kirim (AI) 📷',
                    details: `"${it.name}" mahsulotidan ${it.qty.toLocaleString()} ${it.unit} rasm orqali (AI) kirim qilindi. Kategoriya: ${finalCategory}.`,
                    operator: operator
                });
            }
        }

        window.showPremiumToast('Muvaffaqiyatli', `${items.length} ta mahsulot kirim qilindi (${profilItems.length} profil, ${accItems.length} aksessuar).`, true);
        window.closeBuhVisionModal();
        await renderRomixBuhOmbor();
    };

    async function renderBuhTayyorMahsulot() {
        const statsEl = document.getElementById('buh-tayyor-stats');
        const tableEl = document.getElementById('buh-tayyor-table');
        if (!statsEl && !tableEl) return;

        let items = [];
        try {
            const { data } = await supabase.from('showroom_products').select('*').order('name', { ascending: true });
            items = data || [];
        } catch (e) { console.warn('Buh Tayyor Mahsulot fetch error:', e); }

        const totalTypes = items.length;
        const totalQty = items.reduce((s, p) => s + (Number(p.current_stock) || 0), 0);
        const totalValue = items.reduce((s, p) => s + ((Number(p.price) || 0) * (Number(p.current_stock) || 0)), 0);

        if (statsEl) {
            statsEl.innerHTML = `
                <div class="buh-mini-stat"><span class="buh-mini-label">Mahsulot Turlari</span><span class="buh-mini-value">${totalTypes}</span></div>
                <div class="buh-mini-stat"><span class="buh-mini-label">Jami Dona</span><span class="buh-mini-value">${totalQty}</span></div>
                <div class="buh-mini-stat"><span class="buh-mini-label">Jami Qiymat</span><span class="buh-mini-value" style="color:#00ff88;">${_buhFmt(totalValue)}</span></div>
            `;
        }

        if (tableEl) {
            if (items.length === 0) {
                tableEl.innerHTML = '<tr><td colspan="4" style="text-align:center; color:rgba(255,255,255,0.3); padding:20px;">Tayyor mahsulot topilmadi</td></tr>';
            } else {
                tableEl.innerHTML = items.map(p => {
                    const val = (Number(p.price) || 0) * (Number(p.current_stock) || 0);
                    return `<tr><td>${p.name}</td><td style="text-align:right;">${p.current_stock || 0}</td><td style="text-align:right;">${_buhFmt(p.price)}</td><td style="text-align:right;">${_buhFmt(val)}</td></tr>`;
                }).join('');
            }
        }
        return { totalValue, totalQty };
    }

    let _buhSotuvChart = null;
    // Zakazning ish-jarayon bosqichini aniqlaydi: Zakaz qabul qilindi → Ishlab chiqarishda → Tayyor/Yetkazildi
    // (Sotuv bo'limi: buyurtma olinadi (Kutilmoqda) → guruhga biriktirilib omborga so'rov beriladi (Jarayonda) → tugaydi)
    function _buhOrderStageInfo(status) {
        if (status && (status.includes('Tayyor') || status.includes('Yetkazildi'))) {
            return { label: 'Tayyor / Yetkazildi', icon: '✅', color: '#00ff88' };
        }
        if (status === 'Jarayonda') {
            return { label: 'Ishlab chiqarishda', icon: '⚙️', color: '#00d2ff' };
        }
        return { label: 'Zakaz qabul qilindi', icon: '📝', color: '#ffaa00' };
    }

    // Bir buyurtmadan qolayotgan taxminiy foyda va to'lov holatini hisoblaydi.
    // Eslatma: sales_orders'da alohida 'profit' ustuni saqlanmaydi (faqat total_price/production_cost/
    // installation_cost bor), shuning uchun foyda = total_price - (production_cost + installation_cost)
    // sifatida taxminiy hisoblanadi. To'lov: "Naqd"/"Karta" buyurtmalar darhol to'langan deb olinadi;
    // "Qarz" buyurtmalarda haqiqiy holat paid_amount ustuniga (mavjud bo'lsa) qaraladi.
    function _buhOrderPaymentInfo(o) {
        const total = Number(o.total_price) || 0;
        const isDebtOrder = o.payment_type === 'Qarz';
        const paidAmount = isDebtOrder ? (Number(o.paid_amount) || 0) : total;
        const remaining = Math.max(0, total - paidAmount);
        const fullyPaid = remaining <= 0;
        return { total, isDebtOrder, paidAmount, remaining, fullyPaid, paymentDate: o.payment_date || null };
    }
    function _buhOrderProfit(o) {
        const total = Number(o.total_price) || 0;
        const cost = (Number(o.production_cost) || 0) + (Number(o.installation_cost) || 0);
        return total - cost;
    }

    window.payRomixSalesOrder = async (orderId) => {
        let order = null;
        try {
            const { data } = await supabase.from('sales_orders').select('*').eq('id', orderId).single();
            order = data;
        } catch (e) { console.warn('Buh: order fetch for payment failed', e); }
        if (!order) return;
        const info = _buhOrderPaymentInfo(order);
        const val = parseFloat(prompt(`"${order.customer_name}" buyurtmasi uchun to'lov summasini kiriting (qoldiq: ${info.remaining.toLocaleString()} UZS):`, info.remaining));
        if (!val || val <= 0) return;
        if (val > info.remaining) return alert(`Qoldiqdan ortiq summa kiritdingiz! Qoldiq: ${info.remaining.toLocaleString()} UZS`);
        const newPaid = info.paidAmount + val;
        try {
            const { error } = await supabase.from('sales_orders').update({ paid_amount: newPaid, payment_date: new Date().toISOString() }).eq('id', orderId);
            if (error) throw error;
        } catch (e) {
            alert("To'lovni saqlashda xatolik: bazada 'paid_amount'/'payment_date' ustunlari mavjudligini tekshiring (⚙️ Jadval Sozlash).");
            return;
        }
        await renderBuhKunlikSotuv(window._buhSotuvActivePeriod || 'today');
        window.showPremiumToast('To\'lov Qayd Etildi', `${val.toLocaleString()} UZS to'lov sifatida saqlandi.`, true);
    };

    async function renderBuhKunlikSotuv(period) {
        period = period || 'today';
        window._buhSotuvActivePeriod = period;
        const statsEl = document.getElementById('buh-sotuv-stats');
        const gridEl = document.getElementById('buh-sotuv-orders-grid');
        if (!statsEl && !gridEl) return;

        let orders = [];
        try {
            const { data } = await supabase.from('sales_orders').select('*').order('created_at', { ascending: false });
            orders = data || [];
        } catch (e) { console.warn('Buh Kunlik Sotuv fetch error:', e); }

        const from = _buhPeriodStart(period);
        const inPeriod = orders.filter(o => o.created_at && new Date(o.created_at) >= from);
        const totalRevenue = inPeriod.reduce((s, o) => s + (Number(o.total_price) || 0), 0);
        const totalProfit = inPeriod.reduce((s, o) => s + _buhOrderProfit(o), 0);
        const unpaidRemaining = inPeriod.reduce((s, o) => s + _buhOrderPaymentInfo(o).remaining, 0);

        if (statsEl) {
            statsEl.innerHTML = `
                <div class="buh-mini-stat"><span class="buh-mini-label">Buyurtmalar</span><span class="buh-mini-value">${inPeriod.length}</span></div>
                <div class="buh-mini-stat"><span class="buh-mini-label">Jami Savdo</span><span class="buh-mini-value" style="color:#00ff88;">${_buhFmt(totalRevenue)}</span></div>
                <div class="buh-mini-stat"><span class="buh-mini-label">Jami Foyda (taxminiy)</span><span class="buh-mini-value" style="color:#00d2ff;">${_buhFmt(totalProfit)}</span></div>
                <div class="buh-mini-stat"><span class="buh-mini-label">To'lanmagan Qarz</span><span class="buh-mini-value" style="color:#fabb18;">${_buhFmt(unpaidRemaining)}</span></div>
            `;
        }

        const byDate = {};
        orders.forEach(o => {
            if (!o.created_at) return;
            const d = o.created_at.slice(0, 10);
            if (!byDate[d]) byDate[d] = { count: 0, total: 0, debt: 0 };
            byDate[d].count++;
            byDate[d].total += Number(o.total_price) || 0;
            if (o.payment_type === 'Qarz') byDate[d].debt += Number(o.total_price) || 0;
        });

        if (gridEl) {
            if (inPeriod.length === 0) {
                gridEl.innerHTML = '<div style="text-align:center; color:rgba(255,255,255,0.3); padding:20px; grid-column:1/-1;">Bu davrda buyurtma topilmadi</div>';
            } else {
                gridEl.innerHTML = inPeriod.slice(0, 60).map(o => {
                    const pay = _buhOrderPaymentInfo(o);
                    const profit = _buhOrderProfit(o);
                    const stage = _buhOrderStageInfo(o.status);
                    const statusColor = stage.color;
                    const orderDateStr = o.created_at ? new Date(o.created_at).toLocaleDateString('uz-UZ') : '—';
                    const deadlineStr = o.deadline_date ? new Date(o.deadline_date).toLocaleDateString('uz-UZ') : '—';
                    const isOverdue = o.deadline_date && stage.label !== 'Tayyor / Yetkazildi' && new Date(o.deadline_date) < new Date();
                    const payBadge = pay.fullyPaid
                        ? `<span style="background:rgba(0,255,136,0.1); color:#00ff88; padding:3px 10px; border-radius:12px; font-size:0.68rem; font-weight:700;">✓ To'langan</span>`
                        : (pay.paidAmount > 0
                            ? `<span style="background:rgba(255,170,0,0.1); color:#ffaa00; padding:3px 10px; border-radius:12px; font-size:0.68rem; font-weight:700;">Qisman to'langan</span>`
                            : `<span style="background:rgba(255,77,79,0.1); color:#ff4d4f; padding:3px 10px; border-radius:12px; font-size:0.68rem; font-weight:700;">Qarzga (to'lanmagan)</span>`);
                    const payDateHtml = pay.paymentDate
                        ? `<div style="font-size:0.65rem; color:rgba(255,255,255,0.35); margin-top:2px;">To'lov sanasi: ${new Date(pay.paymentDate).toLocaleDateString('uz-UZ')}</div>`
                        : (pay.isDebtOrder ? `<div style="font-size:0.65rem; color:rgba(255,255,255,0.35); margin-top:2px;">To'lov hali amalga oshirilmagan</div>` : '');
                    const payBtn = !pay.fullyPaid
                        ? `<button onclick="window.payRomixSalesOrder('${o.id}')" style="background:rgba(0,255,136,0.12); border:1px solid rgba(0,255,136,0.25); color:#00ff88; padding:6px 12px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer; width:100%; margin-top:8px;">💳 To'lov Qilish</button>`
                        : '';
                    return `
                    <div style="border-top:3px solid ${statusColor}; border-radius:16px; background:rgba(255,255,255,0.015); border-left:1px solid rgba(255,255,255,0.03); border-right:1px solid rgba(255,255,255,0.03); border-bottom:1px solid rgba(255,255,255,0.03); padding:14px 16px; display:flex; flex-direction:column; gap:8px; transition:all 0.25s;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                            <div style="min-width:0;">
                                <div style="font-weight:700; color:#fff; font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${o.customer_name || 'Noma\'lum mijoz'}</div>
                                <div style="font-size:0.68rem; color:rgba(255,255,255,0.4); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${o.prod_type || 'Mahsulot'} • ${o.quantity || 1} ta</div>
                            </div>
                            <span style="font-size:0.62rem; color:${statusColor}; background:${statusColor}22; padding:3px 9px; border-radius:12px; font-weight:700; white-space:nowrap; display:inline-flex; align-items:center; gap:4px;">${stage.icon} ${stage.label}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:rgba(255,255,255,0.45); background:rgba(255,255,255,0.02); border-radius:10px; padding:8px 10px;">
                            <span>📅 Zakaz sanasi: <strong style="color:rgba(255,255,255,0.7);">${orderDateStr}</strong></span>
                            <span style="${isOverdue ? 'color:#ff4d4f; font-weight:700;' : ''}">⏳ Va'da muddati: <strong style="color:${isOverdue ? '#ff4d4f' : 'rgba(255,255,255,0.7)'};">${deadlineStr}${isOverdue ? ' ⚠️' : ''}</strong></span>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:rgba(255,255,255,0.5); border-top:1px dashed rgba(255,255,255,0.06); padding-top:8px;">
                            <span>Jami narx</span><strong style="color:#00ff88; font-family:monospace;">${_buhFmt(pay.total)}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:rgba(255,255,255,0.5);">
                            <span>Foyda (taxminiy)</span><strong style="color:${profit >= 0 ? '#00d2ff' : '#ff4d4f'}; font-family:monospace;">${_buhFmt(profit)}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
                            ${payBadge}
                        </div>
                        ${payDateHtml}
                        ${payBtn}
                    </div>`;
                }).join('');
            }
        }

        const chartCanvas = document.getElementById('buh-sotuv-chart');
        if (chartCanvas && typeof Chart !== 'undefined') {
            const last7 = [];
            const now = new Date();
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
                const key = d.toISOString().slice(0, 10);
                last7.push({ label: key.slice(5), total: (byDate[key] && byDate[key].total) || 0 });
            }
            if (_buhSotuvChart) _buhSotuvChart.destroy();
            _buhSotuvChart = new Chart(chartCanvas, {
                type: 'bar',
                data: { labels: last7.map(d => d.label), datasets: [{ label: 'Savdo', data: last7.map(d => d.total), backgroundColor: 'rgba(0,255,136,0.55)', borderRadius: 6 }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: 'rgba(255,255,255,0.5)' }, grid: { display: false } },
                        y: { ticks: { color: 'rgba(255,255,255,0.5)' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                    }
                }
            });
        }
        return { totalRevenue, byDate };
    }

    let _buhProdChart = null;
    async function renderRomixBuhIshlabChiqarish() {
        const statsEl = document.getElementById('buh-ishlab-chiqarish-stats');
        const tableEl = document.getElementById('buh-ishlab-chiqarish-table');
        if (!statsEl && !tableEl) return;

        const logs = await romixBuhSelect('romix_production_log', ROMIX_BUH_KEYS.production);
        const todayStr = _buhToday();
        const monthKey = todayStr.slice(0, 7);
        const todayQty = logs.filter(l => l.date === todayStr).reduce((s, l) => s + (Number(l.quantity) || 0), 0);
        const monthQty = logs.filter(l => (l.date || '').startsWith(monthKey)).reduce((s, l) => s + (Number(l.quantity) || 0), 0);

        if (statsEl) {
            statsEl.innerHTML = `
                <div class="buh-mini-stat"><span class="buh-mini-label">Bugun Ishlab Chiqarilgan</span><span class="buh-mini-value" style="color:#00ff88;">${todayQty} dona</span></div>
                <div class="buh-mini-stat"><span class="buh-mini-label">Shu Oy Ishlab Chiqarilgan</span><span class="buh-mini-value" style="color:#00d2ff;">${monthQty} dona</span></div>
            `;
        }

        if (tableEl) {
            if (logs.length === 0) {
                tableEl.innerHTML = '<tr><td colspan="5" style="text-align:center; color:rgba(255,255,255,0.3); padding:20px;">Hozircha yozuv yo\'q</td></tr>';
            } else {
                tableEl.innerHTML = logs.slice(0, 60).map(l => `
                    <tr>
                        <td>${l.date}</td><td>${l.model_name}</td><td style="text-align:right;">${l.quantity}</td><td>${l.note || '-'}</td>
                        <td><button class="buh-row-action-btn" style="background:rgba(255,77,79,0.15); color:#ff4d4f;" onclick="window.deleteRomixProductionLog('${l.id}')">O'chirish</button></td>
                    </tr>`).join('');
            }
        }

        const chartCanvas = document.getElementById('buh-ishlab-chiqarish-chart');
        if (chartCanvas && typeof Chart !== 'undefined') {
            const byDate = {};
            logs.forEach(l => { byDate[l.date] = (byDate[l.date] || 0) + (Number(l.quantity) || 0); });
            const last7 = [];
            const now = new Date();
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
                const key = d.toISOString().slice(0, 10);
                last7.push({ label: key.slice(5), qty: byDate[key] || 0 });
            }
            if (_buhProdChart) _buhProdChart.destroy();
            _buhProdChart = new Chart(chartCanvas, {
                type: 'line',
                data: { labels: last7.map(d => d.label), datasets: [{ label: 'Ishlab chiqarilgan (dona)', data: last7.map(d => d.qty), borderColor: '#00d2ff', backgroundColor: 'rgba(0,210,255,0.15)', tension: 0.35, fill: true, pointRadius: 3 }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: 'rgba(255,255,255,0.5)' }, grid: { display: false } },
                        y: { ticks: { color: 'rgba(255,255,255,0.5)' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                    }
                }
            });
        }
        return { todayQty, monthQty };
    }

    window.deleteRomixProductionLog = async (id) => {
        if (!confirm("Ushbu yozuvni o'chirmoqchimisiz?")) return;
        await romixBuhDelete('romix_production_log', ROMIX_BUH_KEYS.production, id);
        await renderRomixBuhIshlabChiqarish();
        await renderBuhOverview();
    };

    async function renderRomixBuhHarajatlar() {
        const statsEl = document.getElementById('buh-harajat-stats');
        const tableEl = document.getElementById('buh-harajat-table');
        if (!statsEl && !tableEl) return;

        const list = await romixBuhSelect('romix_expenses', ROMIX_BUH_KEYS.expenses);
        const todayStr = _buhToday();
        const monthKey = todayStr.slice(0, 7);
        const todayTotal = list.filter(e => e.date === todayStr).reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const monthTotal = list.filter(e => (e.date || '').startsWith(monthKey)).reduce((s, e) => s + (Number(e.amount) || 0), 0);

        if (statsEl) {
            statsEl.innerHTML = `
                <div class="buh-mini-stat"><span class="buh-mini-label">Bugungi Xarajat</span><span class="buh-mini-value" style="color:#ff4d4f;">${_buhFmt(todayTotal)}</span></div>
                <div class="buh-mini-stat"><span class="buh-mini-label">Shu Oylik Xarajat</span><span class="buh-mini-value" style="color:#ff4d4f;">${_buhFmt(monthTotal)}</span></div>
            `;
        }

        if (tableEl) {
            if (list.length === 0) {
                tableEl.innerHTML = '<tr><td colspan="5" style="text-align:center; color:rgba(255,255,255,0.3); padding:20px;">Hozircha xarajat yo\'q</td></tr>';
            } else {
                tableEl.innerHTML = list.slice(0, 60).map(e => `
                    <tr>
                        <td>${e.date}</td><td>${e.category}</td><td style="text-align:right; color:#ff4d4f;">-${_buhFmt(e.amount)}</td><td>${e.note || '-'}</td>
                        <td><button class="buh-row-action-btn" style="background:rgba(255,77,79,0.15); color:#ff4d4f;" onclick="window.deleteRomixExpense('${e.id}')">O'chirish</button></td>
                    </tr>`).join('');
            }
        }
        return { todayTotal, monthTotal };
    }

    window.deleteRomixExpense = async (id) => {
        if (!confirm("Ushbu xarajatni o'chirmoqchimisiz?")) return;
        await romixBuhDelete('romix_expenses', ROMIX_BUH_KEYS.expenses, id);
        await renderRomixBuhHarajatlar();
        await updateBuhHeroKPIs();
        await renderBuhOverview();
    };

    async function renderBuhTashqiQarz() {
        const statsEl = document.getElementById('buh-qarz-stats');
        const tableEl = document.getElementById('buh-qarz-table');
        if (!statsEl && !tableEl) return;

        const list = await romixBuhSelect('romix_debts', ROMIX_BUH_KEYS.debts);
        const totalRemaining = list.reduce((s, d) => s + Math.max(0, (Number(d.amount) || 0) - (Number(d.paid_amount) || 0)), 0);
        const openCount = list.filter(d => ((Number(d.amount) || 0) - (Number(d.paid_amount) || 0)) > 0).length;

        if (statsEl) {
            statsEl.innerHTML = `
                <div class="buh-mini-stat"><span class="buh-mini-label">Ochiq Qarzlar</span><span class="buh-mini-value">${openCount}</span></div>
                <div class="buh-mini-stat"><span class="buh-mini-label">Jami Qoldiq Qarz</span><span class="buh-mini-value" style="color:#fabb18;">${_buhFmt(totalRemaining)}</span></div>
            `;
        }

        if (tableEl) {
            if (list.length === 0) {
                tableEl.innerHTML = '<tr><td colspan="6" style="text-align:center; color:rgba(255,255,255,0.3); padding:20px;">Tashqi qarz mavjud emas</td></tr>';
            } else {
                tableEl.innerHTML = list.map(d => {
                    const remaining = Math.max(0, (Number(d.amount) || 0) - (Number(d.paid_amount) || 0));
                    const payBtn = remaining > 0 ? `<button class="buh-row-action-btn" style="background:rgba(0,255,136,0.15); color:#00ff88;" onclick="window.payRomixDebt('${d.id}')">To'lov</button>` : '';
                    return `<tr>
                        <td>${d.creditor}</td>
                        <td style="text-align:right;">${_buhFmt(d.amount)}</td>
                        <td style="text-align:right; color:#00ff88;">${_buhFmt(d.paid_amount)}</td>
                        <td style="text-align:right; color:${remaining > 0 ? '#ff4d4f' : '#00ff88'}; font-weight:700;">${_buhFmt(remaining)}</td>
                        <td>${d.due_date || '-'}</td>
                        <td>${payBtn}<button class="buh-row-action-btn" style="background:rgba(255,77,79,0.15); color:#ff4d4f;" onclick="window.deleteRomixDebt('${d.id}')">O'chirish</button></td>
                    </tr>`;
                }).join('');
            }
        }
        return { totalRemaining };
    }

    window.payRomixDebt = async (id) => {
        const list = await romixBuhSelect('romix_debts', ROMIX_BUH_KEYS.debts);
        const debt = list.find(d => d.id === id);
        if (!debt) { alert("Qarz yozuvi topilmadi. Sahifani yangilab ko'ring."); return; }
        const remaining = Math.max(0, (Number(debt.amount) || 0) - (Number(debt.paid_amount) || 0));
        const val = parseFloat(prompt(`"${debt.creditor}" uchun to'lov summasini kiriting (qoldiq: ${remaining.toLocaleString()} UZS):`, remaining));
        if (!val || val <= 0) return;
        if (val > remaining) return alert(`Qoldiqdan ortiq summa kiritdingiz! Qoldiq: ${remaining.toLocaleString()} UZS`);
        const note = prompt("Izoh (ixtiyoriy):", "") || "";
        const newPaid = (Number(debt.paid_amount) || 0) + val;
        await romixBuhUpdate('romix_debts', ROMIX_BUH_KEYS.debts, id, { paid_amount: newPaid });
        const paymentRecord = {
            id: 'PAY-' + Date.now(),
            debt_id: debt.id,
            creditor: debt.creditor,
            amount: val,
            note,
            date: _buhToday(),
            created_at: new Date().toISOString()
        };
        await romixBuhInsert('romix_payment_log', ROMIX_BUH_KEYS.payments, paymentRecord);
        await renderBuhTashqiQarz();
        await updateBuhHeroKPIs();
        await renderBuhOverview();
    };

    window.deleteRomixDebt = async (id) => {
        if (!confirm("Ushbu qarz yozuvini o'chirmoqchimisiz?")) return;
        await romixBuhDelete('romix_debts', ROMIX_BUH_KEYS.debts, id);
        await renderBuhTashqiQarz();
        await updateBuhHeroKPIs();
    };

    async function renderBuhOverview() {
        await renderBuhUmumiyCards();
    }

    // ============================================================
    // ==== BUXGALTERIYA: UMUMIY — TO'LIQ MOLIYAVIY KO'RINISH ====
    // (Ombor/Profil/Aksesuar qiymati, oylik kirim/harajat/to'lovlar/
    //  xodimlar/zakazlar — har biri bosilganda tafsilot ochiladi)
    // ============================================================
    function _buhMonthKey() { return _buhToday().slice(0, 7); }

    function _buhInventoryTableRows(items, qtyKey) {
        qtyKey = qtyKey || 'stock_quantity';
        if (!items.length) return `<tr><td colspan="4" style="text-align:center; color:rgba(255,255,255,0.3); padding:14px;">Mahsulot topilmadi</td></tr>`;
        return items.slice()
            .sort((a, b) => ((Number(b.price) || 0) * (Number(b[qtyKey]) || 0)) - ((Number(a.price) || 0) * (Number(a[qtyKey]) || 0)))
            .map(p => {
                const qty = Number(p[qtyKey]) || 0;
                const val = (Number(p.price) || 0) * qty;
                return `<tr><td>${p.product_name || p.name}</td><td style="text-align:right;">${qty} ${p.unit || ''}</td><td style="text-align:right;">${_buhFmt(p.price)}</td><td style="text-align:right;">${_buhFmt(val)}</td></tr>`;
            }).join('');
    }

    // Qoldiq profillar — kesimdan qolgan alohida zaxira (endi Supabase'da, romix_qoldiq_profillar)
    async function _buhGetQoldiqProfillar() {
        await _buhOmborMigrateOnce('qoldiq', 'romix_qoldiq_profillar', ROMIX_BUH_KEYS.qoldiqProfillar, (q, i) => ({
            id: q.id || ('QLD-' + Date.now() + '-' + i), product_name: q.product_name, brand: q.brand,
            series: q.series, color: q.color, profile_type: q.profile_type,
            length: Number(q.length) || 0, stock_quantity: Number(q.stock_quantity) || 0
        }));
        return await romixBuhSelect('romix_qoldiq_profillar', ROMIX_BUH_KEYS.qoldiqProfillar);
    }
    function _buhQoldiqValue(items) {
        return items.reduce((s, q) => s + ((Number(q.length) || 0) * (Number(q.stock_quantity) || 0) * 25), 0);
    }
    function _buhQoldiqTableRows(items) {
        if (!items.length) return `<tr><td colspan="4" style="text-align:center; color:rgba(255,255,255,0.3); padding:14px;">Qoldiq profil topilmadi</td></tr>`;
        return items.slice()
            .sort((a, b) => ((Number(b.length) || 0) * (Number(b.stock_quantity) || 0)) - ((Number(a.length) || 0) * (Number(a.stock_quantity) || 0)))
            .map(q => {
                const qty = Number(q.stock_quantity) || 0;
                const len = Number(q.length) || 0;
                const val = len * qty * 25;
                return `<tr><td>${q.product_name || "Noma'lum"}</td><td style="text-align:right;">${len} mm</td><td style="text-align:right;">${qty} dona</td><td style="text-align:right;">${_buhFmt(val)}</td></tr>`;
            }).join('');
    }

    // Oynak (oyna/shisha) — endi Supabase'da (romix_oynak), hali maxsus sahifasi yo'q (shu yerdan boshqariladi)
    async function _buhGetOynak() {
        await _buhOmborMigrateOnce('oynak', 'romix_oynak', ROMIX_BUH_KEYS.oynak, (o, i) => ({
            id: 'OYNAK-' + Date.now() + '-' + i, brand: o.brand, product_name: o.product_name || o.brand,
            size: o.size || '', stock_quantity: Number(o.stock_quantity) || 0, unit: o.unit || 'dona', price: Number(o.price) || 0
        }));
        return await romixBuhSelect('romix_oynak', ROMIX_BUH_KEYS.oynak);
    }
    async function _buhAddOynak(item) {
        await romixBuhInsert('romix_oynak', ROMIX_BUH_KEYS.oynak, item);
    }
    async function _buhDeleteOynak(id) {
        await romixBuhDelete('romix_oynak', ROMIX_BUH_KEYS.oynak, id);
    }
    function _buhOynakValue(items) {
        return items.reduce((s, o) => s + ((Number(o.price) || 0) * (Number(o.stock_quantity) || 0)), 0);
    }

    // Profillarni brend/seriya bo'yicha guruhlash (rang/o'lcham variantlari bitta qatorga jamlanadi)
    // Brend (metadata.brend+seriya bo'lsa, aks holda product_name) bo'yicha guruhlash;
    // har bir guruh o'z ichida o'lcham/rang variantlarini (items) saqlaydi
    function _buhGroupProfilByName(items) {
        const groups = {};
        items.forEach(p => {
            const meta = p.metadata || {};
            const key = meta.brend ? `${meta.brend}${meta.seriya ? ' ' + meta.seriya : ''}` : (p.product_name || "Noma'lum");
            if (!groups[key]) groups[key] = { name: key, qty: 0, value: 0, unit: p.unit || '', items: [] };
            groups[key].qty += Number(p.stock_quantity) || 0;
            groups[key].value += (Number(p.price) || 0) * (Number(p.stock_quantity) || 0);
            if (!groups[key].unit) groups[key].unit = p.unit || '';
            groups[key].items.push(p);
        });
        return Object.values(groups).map(g => ({ ...g, variants: g.items.length })).sort((a, b) => b.value - a.value);
    }

    function _buhProfilSizeLabel(p) {
        const meta = p.metadata || {};
        if (meta.uzunligi || meta.shakli || meta.rangi) {
            return [meta.uzunligi ? `${meta.uzunligi}mm` : null, meta.shakli, meta.rangi ? `${meta.rangi}${meta.rangTuri ? ' (' + meta.rangTuri + ')' : ''}` : null].filter(Boolean).join(' | ');
        }
        return p.description || '-';
    }

    function _buhCompactFmt(n) {
        n = Number(n) || 0;
        if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'mlrd';
        if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'mln';
        if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'ming';
        return n.toLocaleString('uz-UZ');
    }
    function _buhSafeKey(str) {
        return (str || '').replace(/[^a-zA-Z0-9]/g, '_');
    }

    const _BUH_EXPENSE_CATEGORIES = ["Xo'jalik Harajat", 'Oziq-ovqat Harajat', 'Kommunal - Svet', 'Kommunal - Suv', 'Kommunal - Gaz', 'Avto Harajat', 'Ofis Harajat', 'Ijara', 'Transport', 'Maosh', 'Boshqa'];
    // Kommunal - Svet/Suv/Gaz alohida "ko'rsatkich" mexanizmi orqali kiritiladi (Kommunal panelida), shuning uchun umumiy formada ko'rinmaydi
    const _BUH_GENERIC_FORM_CATEGORIES = _BUH_EXPENSE_CATEGORIES.filter(c => !c.startsWith('Kommunal - '));
    function _buhExpenseCatIcon(cat) {
        const map = {
            "Xo'jalik Harajat": '🧹', 'Oziq-ovqat Harajat': '🍽️', 'Kommunal - Svet': '💡', 'Kommunal - Suv': '🚰', 'Kommunal - Gaz': '🔥',
            'Avto Harajat': '🚗', 'Ofis Harajat': '🖥️', 'Ijara': '🏠', 'Transport': '🚚', 'Maosh': '👥', 'Boshqa': '📦'
        };
        return map[cat] || '📦';
    }

    // Harajat panellari — bir nechta kategoriya bitta panelga jamlanadi (masalan Kommunal - Svet/Suv/Gaz)
    const _BUH_EXPENSE_PANELS = [
        { key: 'xojalik', label: "Xo'jalik Harajat", icon: '🧹', categories: ["Xo'jalik Harajat"] },
        { key: 'oziqovqat', label: 'Oziq-ovqat Harajat', icon: '🍽️', categories: ['Oziq-ovqat Harajat'] },
        { key: 'kommunal', label: 'Kommunal Harajat', icon: '💡', categories: ['Kommunal - Svet', 'Kommunal - Suv', 'Kommunal - Gaz'] },
        { key: 'avto', label: 'Avto Xarajat Bo\'limi', icon: '🚗', categories: ['Avto Harajat'] },
        { key: 'ofis', label: 'Ofis Harajat', icon: '🖥️', categories: ['Ofis Harajat'] },
        { key: 'ijara', label: 'Ijara', icon: '🏠', categories: ['Ijara'] },
        { key: 'transport', label: 'Transport', icon: '🚚', categories: ['Transport'] },
        { key: 'maosh', label: 'Maosh', icon: '👥', categories: ['Maosh'] },
        { key: 'boshqa', label: 'Boshqa', icon: '📦', categories: ['Boshqa'] }
    ];

    // Aksesuvarlarni kategoriya bo'yicha guruhlash (Zamoklar, Ruchkalar, Qistirmalar va h.k.)
    function _buhGroupAccessoriesByCategory(items) {
        const groups = {};
        items.forEach(a => {
            const key = a.category || 'Boshqa';
            if (!groups[key]) groups[key] = { name: key, qty: 0, value: 0, unit: a.unit || '', items: [] };
            groups[key].qty += Number(a.qty) || 0;
            groups[key].value += (Number(a.price) || 0) * (Number(a.qty) || 0);
            if (!groups[key].unit) groups[key].unit = a.unit || '';
            groups[key].items.push(a);
        });
        return Object.values(groups).map(g => ({ ...g, variants: g.items.length })).sort((a, b) => b.value - a.value);
    }

    // Qoldiq profillarni brend bo'yicha guruhlash
    function _buhGroupQoldiqByBrand(items) {
        const groups = {};
        items.forEach(q => {
            const key = q.brand || q.product_name || "Noma'lum";
            const val = (Number(q.length) || 0) * (Number(q.stock_quantity) || 0) * 25;
            if (!groups[key]) groups[key] = { name: key, qty: 0, value: 0, unit: 'dona', items: [] };
            groups[key].qty += Number(q.stock_quantity) || 0;
            groups[key].value += val;
            groups[key].items.push(q);
        });
        return Object.values(groups).map(g => ({ ...g, variants: g.items.length })).sort((a, b) => b.value - a.value);
    }

    // Oynak elementlarini turi/brend bo'yicha guruhlash (faqat chip badge uchun, jadval baribir tekis qoladi)
    function _buhGroupOynakByBrand(items) {
        const groups = {};
        items.forEach(o => {
            const key = o.brand || "Noma'lum";
            if (!groups[key]) groups[key] = { name: key, qty: 0, value: 0, unit: o.unit || 'dona', items: [] };
            groups[key].qty += Number(o.stock_quantity) || 0;
            groups[key].value += (Number(o.price) || 0) * (Number(o.stock_quantity) || 0);
            groups[key].items.push(o);
        });
        return Object.values(groups).map(g => ({ ...g, variants: g.items.length })).sort((a, b) => b.value - a.value);
    }

    // Ombor bo'limlari filtri (Barchasi/Profil/Aksesuvar/Qoldiq) — Umumiy > Ombor Qiymati tafsilotida
    function _buhQtyBreakdown(items, qtyKey, unitKey) {
        const byUnit = {};
        items.forEach(it => {
            const u = (it[unitKey] || 'dona').toString().trim() || 'dona';
            byUnit[u] = (byUnit[u] || 0) + (Number(it[qtyKey]) || 0);
        });
        const parts = Object.entries(byUnit).map(([u, q]) => `${q.toLocaleString('uz-UZ', { maximumFractionDigits: 2 })} ${u}`);
        return parts.length ? parts.join(', ') : '0';
    }

    // Umumiy shakl: { title, value, qtyText, columns: [ustun nomlari], alignRight: [bool...], rows: [[katak,...], ...] }
    function _buhOmborFilterDataset(filter) {
        const d = window._buhUmumiyData;
        if (!d) return { title: 'Ombor', value: 0, qtyText: '0', columns: [], alignRight: [], rows: [] };

        if (filter === 'profil') {
            const searchTerm = (window._buhProfilSearchTerm || '').trim().toLowerCase();
            const allGrouped = _buhGroupProfilByName(d.profilItems);
            const brandFilter = window._buhProfilBrandFilter || 'barchasi';

            if (brandFilter === 'barchasi') {
                let grouped = allGrouped;
                if (searchTerm) grouped = grouped.filter(g => g.name.toLowerCase().includes(searchTerm));
                const value = grouped.reduce((s, g) => s + g.value, 0);
                return {
                    title: '📦 Profil (barcha brendlar)', value,
                    qtyText: _buhQtyBreakdown(grouped.flatMap(g => g.items), 'stock_quantity', 'unit'),
                    columns: ['Brend / Seriya', 'Jami Miqdor', "O'rtacha Narx", 'Jami Qiymat', 'Variantlar'], alignRight: [false, true, true, true, true],
                    rows: grouped.map(g => [g.name, `${g.qty.toLocaleString('uz-UZ')} ${g.unit}`, _buhFmt(g.qty > 0 ? g.value / g.qty : 0), _buhFmt(g.value), g.variants]),
                    profilBrands: allGrouped, profilActiveBrand: 'barchasi'
                };
            }

            const activeGroup = allGrouped.find(g => _buhSafeKey(g.name) === brandFilter);
            let items = activeGroup ? activeGroup.items : [];
            if (searchTerm) items = items.filter(p => (_buhProfilSizeLabel(p) || '').toLowerCase().includes(searchTerm) || (p.product_name || '').toLowerCase().includes(searchTerm));
            const sortedItems = items.slice().sort((a, b) => ((Number(b.price) || 0) * (Number(b.stock_quantity) || 0)) - ((Number(a.price) || 0) * (Number(a.stock_quantity) || 0)));
            const value = sortedItems.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.stock_quantity) || 0), 0);
            return {
                title: `📦 ${activeGroup ? activeGroup.name : brandFilter}`, value,
                qtyText: _buhQtyBreakdown(sortedItems, 'stock_quantity', 'unit'),
                columns: ["O'lcham / Variant", 'Miqdor', 'Narx', 'Qiymat'], alignRight: [false, true, true, true],
                rows: sortedItems.map(p => [_buhProfilSizeLabel(p), `${(Number(p.stock_quantity) || 0).toLocaleString('uz-UZ')} ${p.unit || ''}`, _buhFmt(p.price), _buhFmt((Number(p.price) || 0) * (Number(p.stock_quantity) || 0))]),
                profilBrands: allGrouped, profilActiveBrand: brandFilter
            };
        }
        if (filter === 'aksesuvar') {
            const searchTerm = (window._buhAccSearchTerm || '').trim().toLowerCase();
            const allGrouped = _buhGroupAccessoriesByCategory(d.accessories);
            const catFilter = window._buhAccCategoryFilter || 'barchasi';

            if (catFilter === 'barchasi') {
                let grouped = allGrouped;
                if (searchTerm) grouped = grouped.filter(g => g.name.toLowerCase().includes(searchTerm));
                const value = grouped.reduce((s, g) => s + g.value, 0);
                return {
                    title: '🔩 Aksesuvar (barcha kategoriyalar)', value,
                    qtyText: _buhQtyBreakdown(grouped.flatMap(g => g.items), 'qty', 'unit'),
                    columns: ['Kategoriya', 'Jami Miqdor', "O'rtacha Narx", 'Jami Qiymat', 'Mahsulotlar'], alignRight: [false, true, true, true, true],
                    rows: grouped.map(g => [g.name, `${g.qty.toLocaleString('uz-UZ')} ${g.unit}`, _buhFmt(g.qty > 0 ? g.value / g.qty : 0), _buhFmt(g.value), g.variants]),
                    accCategories: allGrouped, accActiveCategory: 'barchasi'
                };
            }

            const activeGroup = allGrouped.find(g => _buhSafeKey(g.name) === catFilter);
            let items = activeGroup ? activeGroup.items : [];
            if (searchTerm) items = items.filter(a => (a.name || '').toLowerCase().includes(searchTerm) || (a.spec || '').toLowerCase().includes(searchTerm));
            const sortedItems = items.slice().sort((a, b) => ((Number(b.price) || 0) * (Number(b.qty) || 0)) - ((Number(a.price) || 0) * (Number(a.qty) || 0)));
            const value = sortedItems.reduce((s, a) => s + (Number(a.price) || 0) * (Number(a.qty) || 0), 0);
            return {
                title: `🔩 ${activeGroup ? activeGroup.name : catFilter}`, value,
                qtyText: _buhQtyBreakdown(sortedItems, 'qty', 'unit'),
                columns: ['Nomi', 'Xususiyati', 'Miqdor', 'Narx', 'Qiymat'], alignRight: [false, false, true, true, true],
                rows: sortedItems.map(a => [a.name || "Noma'lum", a.spec || '-', `${(Number(a.qty) || 0).toLocaleString('uz-UZ')} ${a.unit || ''}`, _buhFmt(a.price), _buhFmt((Number(a.price) || 0) * (Number(a.qty) || 0))]),
                accCategories: allGrouped, accActiveCategory: catFilter
            };
        }
        if (filter === 'qoldiq') {
            const searchTerm = (window._buhQoldiqSearchTerm || '').trim().toLowerCase();
            const allGrouped = _buhGroupQoldiqByBrand(d.qoldiqItems);
            const brandFilter = window._buhQoldiqBrandFilter || 'barchasi';

            if (brandFilter === 'barchasi') {
                let grouped = allGrouped;
                if (searchTerm) grouped = grouped.filter(g => g.name.toLowerCase().includes(searchTerm));
                const value = grouped.reduce((s, g) => s + g.value, 0);
                const allItems = grouped.flatMap(g => g.items);
                const totalDona = allItems.reduce((s, q) => s + (Number(q.stock_quantity) || 0), 0);
                const totalMetr = allItems.reduce((s, q) => s + ((Number(q.length) || 0) * (Number(q.stock_quantity) || 0)), 0) / 1000;
                return {
                    title: '✂️ Qoldiq Profillar (barcha brendlar)', value, qtyText: `${totalDona.toLocaleString('uz-UZ')} dona (${totalMetr.toFixed(1)} metr)`,
                    columns: ['Brend', 'Jami Soni', "O'rtacha Uzunlik", 'Jami Qiymat', 'Turlari'], alignRight: [false, true, true, true, true],
                    rows: grouped.map(g => {
                        const avgLen = g.qty > 0 ? g.items.reduce((s, q) => s + (Number(q.length) || 0) * (Number(q.stock_quantity) || 0), 0) / g.qty : 0;
                        return [g.name, `${g.qty.toLocaleString('uz-UZ')} dona`, `${avgLen.toFixed(0)} mm`, _buhFmt(g.value), g.variants];
                    }),
                    qoldiqBrands: allGrouped, qoldiqActiveBrand: 'barchasi'
                };
            }

            const activeGroup = allGrouped.find(g => _buhSafeKey(g.name) === brandFilter);
            let items = activeGroup ? activeGroup.items : [];
            if (searchTerm) items = items.filter(q => (q.product_name || '').toLowerCase().includes(searchTerm) || (q.series || '').toLowerCase().includes(searchTerm) || (q.color || '').toLowerCase().includes(searchTerm));
            const sortedItems = items.slice().sort((a, b) => ((Number(b.length) || 0) * (Number(b.stock_quantity) || 0)) - ((Number(a.length) || 0) * (Number(a.stock_quantity) || 0)));
            const value = sortedItems.reduce((s, q) => s + (Number(q.length) || 0) * (Number(q.stock_quantity) || 0) * 25, 0);
            const totalDona = sortedItems.reduce((s, q) => s + (Number(q.stock_quantity) || 0), 0);
            const totalMetr = sortedItems.reduce((s, q) => s + ((Number(q.length) || 0) * (Number(q.stock_quantity) || 0)), 0) / 1000;
            return {
                title: `✂️ ${activeGroup ? activeGroup.name : brandFilter}`, value, qtyText: `${totalDona.toLocaleString('uz-UZ')} dona (${totalMetr.toFixed(1)} metr)`,
                columns: ['Nomi', 'Seriya/Rang', 'Uzunligi', 'Soni', 'Qiymat'], alignRight: [false, false, true, true, true],
                rows: sortedItems.map(q => [q.product_name || "Noma'lum", [q.series, q.color].filter(Boolean).join(' / ') || '-', `${q.length || 0} mm`, `${(Number(q.stock_quantity) || 0).toLocaleString('uz-UZ')} dona`, _buhFmt((Number(q.length) || 0) * (Number(q.stock_quantity) || 0) * 25)]),
                qoldiqBrands: allGrouped, qoldiqActiveBrand: brandFilter
            };
        }
        if (filter === 'oynak') {
            const searchTerm = (window._buhOynakSearchTerm || '').trim().toLowerCase();
            const brandFilter = window._buhOynakBrandFilter || 'barchasi';
            const brands = _buhGroupOynakByBrand(d.oynakItems);

            let indexed = d.oynakItems.map((o, idx) => ({ o, idx }));
            if (brandFilter !== 'barchasi') indexed = indexed.filter(({ o }) => _buhSafeKey(o.brand || "Noma'lum") === brandFilter);
            if (searchTerm) indexed = indexed.filter(({ o }) => (o.product_name || '').toLowerCase().includes(searchTerm) || (o.size || '').toLowerCase().includes(searchTerm));

            const value = indexed.reduce((s, { o }) => s + (Number(o.price) || 0) * (Number(o.stock_quantity) || 0), 0);
            return {
                title: brandFilter === 'barchasi' ? '🪟 Oynak (barcha turlar)' : `🪟 Oynak — ${indexed[0] ? (indexed[0].o.brand || "Noma'lum") : brandFilter}`,
                value, qtyText: _buhQtyBreakdown(indexed.map(({ o }) => o), 'stock_quantity', 'unit'),
                columns: ['Turi/Brend', 'Nomi', "O'lcham", 'Soni', 'Narx', 'Qiymat'], alignRight: [false, false, false, true, true, true],
                rows: indexed.map(({ o }) => [o.brand || "Noma'lum", o.product_name || "Noma'lum", o.size || '-', `${(Number(o.stock_quantity) || 0).toLocaleString('uz-UZ')} ${o.unit || 'dona'}`, _buhFmt(o.price), _buhFmt((Number(o.price) || 0) * (Number(o.stock_quantity) || 0))]),
                rowIds: indexed.map(({ o }) => o.id),
                oynakBrands: brands, oynakActiveBrand: brandFilter, isOynak: true
            };
        }
        if (filter === 'chiqim') {
            const txs = d.chiqimTx;
            const value = txs.reduce((s, t) => s + (Number(t.quantity) || 0) * (Number(t.price || (t.romix_inventory && t.romix_inventory.price)) || 0), 0);
            const qtyText = _buhQtyBreakdown(txs.map(t => ({ q: t.quantity, u: (t.romix_inventory && t.romix_inventory.unit) || '' })), 'q', 'u');
            return {
                title: '📤 Ombor Chiqim (shu oy, 50% avans + Ombor tasdig\'idan keyin)', value, qtyText,
                columns: ['Sana', 'Mahsulot', 'Miqdor', 'Narx', 'Qiymat', 'Izoh'], alignRight: [false, false, true, true, true, false],
                rows: txs.map(t => {
                    const unitPrice = Number(t.price || (t.romix_inventory && t.romix_inventory.price)) || 0;
                    const qty = Number(t.quantity) || 0;
                    return [
                        t.created_at ? new Date(t.created_at).toLocaleDateString('uz-UZ') : '-',
                        (t.romix_inventory && t.romix_inventory.product_name) || "O'chirilgan mahsulot",
                        `${qty.toLocaleString('uz-UZ')} ${(t.romix_inventory && t.romix_inventory.unit) || ''}`,
                        _buhFmt(unitPrice), _buhFmt(qty * unitPrice), t.note || '-'
                    ];
                })
            };
        }
        if (filter === 'kirim') {
            const invRows = d.kirimTx.map(t => ({
                dateLabel: t.created_at ? new Date(t.created_at).toLocaleDateString('uz-UZ') : '-',
                product_name: (t.romix_inventory && t.romix_inventory.product_name) || "O'chirilgan mahsulot",
                qty: Number(t.quantity) || 0, unit: (t.romix_inventory && t.romix_inventory.unit) || '',
                price: Number(t.price || (t.romix_inventory && t.romix_inventory.price)) || 0, note: t.note || '-'
            }));
            const merged = [...invRows, ...d.kirimAccessoryLog];
            const value = merged.reduce((s, r) => s + (r.qty * r.price), 0);
            const qtyText = _buhQtyBreakdown(merged.map(r => ({ q: r.qty, u: r.unit })), 'q', 'u');
            return {
                title: "📥 Ombor Kirim (shu oy, Buxgalteriya orqali kiritilgan)", value, qtyText,
                columns: ['Sana', 'Mahsulot', 'Miqdor', 'Narx', 'Qiymat', 'Izoh'], alignRight: [false, false, true, true, true, false],
                rows: merged.map(r => [r.dateLabel, r.product_name, `${r.qty.toLocaleString('uz-UZ')} ${r.unit}`, _buhFmt(r.price), _buhFmt(r.qty * r.price), r.note])
            };
        }
        // barchasi
        const qoldiqDona = d.qoldiqItems.reduce((s, q) => s + (Number(q.stock_quantity) || 0), 0);
        const rows = [
            ...d.profilItems.map(p => ['Profil', p.product_name || "Noma'lum", `${(Number(p.stock_quantity) || 0).toLocaleString('uz-UZ')} ${p.unit || ''}`, _buhFmt(p.price), _buhFmt((Number(p.price) || 0) * (Number(p.stock_quantity) || 0))]),
            ...d.accessories.map(a => ['Aksesuvar', a.name || "Noma'lum", `${(Number(a.qty) || 0).toLocaleString('uz-UZ')} ${a.unit || ''}`, _buhFmt(a.price), _buhFmt((Number(a.price) || 0) * (Number(a.qty) || 0))]),
            ...d.qoldiqItems.map(q => ['Qoldiq Profil', q.product_name || "Noma'lum", `${(Number(q.stock_quantity) || 0).toLocaleString('uz-UZ')} dona (${q.length || 0} mm)`, _buhFmt(25), _buhFmt((Number(q.length) || 0) * (Number(q.stock_quantity) || 0) * 25)]),
            ...d.oynakItems.map(o => ['Oynak', o.product_name || "Noma'lum", `${(Number(o.stock_quantity) || 0).toLocaleString('uz-UZ')} ${o.unit || 'dona'}`, _buhFmt(o.price), _buhFmt((Number(o.price) || 0) * (Number(o.stock_quantity) || 0))])
        ];
        return {
            title: '🏬 Barcha Ombor', value: d.omborTotal,
            qtyText: `Profil: ${_buhQtyBreakdown(d.profilItems, 'stock_quantity', 'unit')} | Aksesuvar: ${_buhQtyBreakdown(d.accessories, 'qty', 'unit')} | Qoldiq: ${qoldiqDona.toLocaleString('uz-UZ')} dona | Oynak: ${_buhQtyBreakdown(d.oynakItems, 'stock_quantity', 'unit')}`,
            columns: ["Bo'lim", 'Nomi', 'Miqdor', 'Tan Narxi', 'Qiymat'], alignRight: [false, false, true, true, true],
            rows
        };
    }

    window._buhRenderOmborFilterView = (filter) => {
        filter = filter || window._buhOmborActiveFilter || 'barchasi';
        window._buhOmborActiveFilter = filter;
        document.querySelectorAll('#buhOmborFilterPills .buh-brand-chip').forEach(p => p.classList.toggle('active', p.dataset.omborFilter === filter));

        const data = _buhOmborFilterDataset(filter);

        const subfilterEl = document.getElementById('buh-profil-subfilter');
        if (subfilterEl) {
            if (filter === 'profil') {
                const brands = data.profilBrands || [];
                const activeBrand = data.profilActiveBrand || 'barchasi';
                const totalValue = brands.reduce((s, b) => s + b.value, 0);
                const chipsHtml = `<div class="buh-brand-filter-row">
                    <div class="buh-brand-chip ${activeBrand === 'barchasi' ? 'active' : ''}" onclick="window._buhSelectProfilBrand('barchasi')">
                        <span class="chip-name">🗂️ Barchasi</span>
                        <span class="chip-meta">${brands.length} brend · ${_buhCompactFmt(totalValue)}</span>
                    </div>
                    ${brands.map(b => {
                        const key = _buhSafeKey(b.name);
                        return `<div class="buh-brand-chip ${activeBrand === key ? 'active' : ''}" onclick="window._buhSelectProfilBrand('${key}')" title="${b.name.replace(/"/g, '&quot;')}">
                            <span class="chip-name">${b.name}</span>
                            <span class="chip-meta">${b.qty.toLocaleString('uz-UZ')} ${b.unit} · ${_buhCompactFmt(b.value)}</span>
                        </div>`;
                    }).join('')}
                </div>`;
                const wasFocused = document.activeElement && document.activeElement.id === 'buhProfilSearch';
                const selStart = wasFocused ? document.activeElement.selectionStart : null;
                subfilterEl.innerHTML = `${chipsHtml}<input type="text" id="buhProfilSearch" class="buh-input" placeholder="🔍 ${activeBrand === 'barchasi' ? 'Brend yoki seriya' : "O'lcham yoki variant"} bo'yicha qidirish..." style="width:100%; margin-top:12px;" value="${(window._buhProfilSearchTerm || '').replace(/"/g, '&quot;')}" oninput="window._buhOnProfilSearchInput(this.value)">`;
                if (wasFocused) {
                    const inp = document.getElementById('buhProfilSearch');
                    inp.focus();
                    if (selStart !== null) inp.setSelectionRange(selStart, selStart);
                }
            } else {
                subfilterEl.innerHTML = '';
            }
        }

        const accSubfilterEl = document.getElementById('buh-aksesuvar-subfilter');
        if (accSubfilterEl) {
            if (filter === 'aksesuvar') {
                const cats = data.accCategories || [];
                const activeCat = data.accActiveCategory || 'barchasi';
                const totalValue = cats.reduce((s, c) => s + c.value, 0);
                const chipsHtml = `<div class="buh-brand-filter-row">
                    <div class="buh-brand-chip ${activeCat === 'barchasi' ? 'active' : ''}" onclick="window._buhSelectAccCategory('barchasi')">
                        <span class="chip-name">🗂️ Barchasi</span>
                        <span class="chip-meta">${cats.length} kategoriya · ${_buhCompactFmt(totalValue)}</span>
                    </div>
                    ${cats.map(c => {
                        const key = _buhSafeKey(c.name);
                        return `<div class="buh-brand-chip ${activeCat === key ? 'active' : ''}" onclick="window._buhSelectAccCategory('${key}')" title="${c.name.replace(/"/g, '&quot;')}">
                            <span class="chip-name">${c.name}</span>
                            <span class="chip-meta">${c.qty.toLocaleString('uz-UZ')} ${c.unit} · ${_buhCompactFmt(c.value)}</span>
                        </div>`;
                    }).join('')}
                </div>`;
                const wasFocused = document.activeElement && document.activeElement.id === 'buhAccSearch';
                const selStart = wasFocused ? document.activeElement.selectionStart : null;
                accSubfilterEl.innerHTML = `${chipsHtml}<input type="text" id="buhAccSearch" class="buh-input" placeholder="🔍 ${activeCat === 'barchasi' ? 'Kategoriya' : 'Nomi yoki xususiyati'} bo'yicha qidirish..." style="width:100%; margin-top:12px;" value="${(window._buhAccSearchTerm || '').replace(/"/g, '&quot;')}" oninput="window._buhOnAccSearchInput(this.value)">`;
                if (wasFocused) {
                    const inp = document.getElementById('buhAccSearch');
                    inp.focus();
                    if (selStart !== null) inp.setSelectionRange(selStart, selStart);
                }
            } else {
                accSubfilterEl.innerHTML = '';
            }
        }

        const qoldiqSubfilterEl = document.getElementById('buh-qoldiq-subfilter');
        if (qoldiqSubfilterEl) {
            if (filter === 'qoldiq') {
                const brands = data.qoldiqBrands || [];
                const activeBrand = data.qoldiqActiveBrand || 'barchasi';
                const totalValue = brands.reduce((s, b) => s + b.value, 0);
                const chipsHtml = `<div class="buh-brand-filter-row">
                    <div class="buh-brand-chip ${activeBrand === 'barchasi' ? 'active' : ''}" onclick="window._buhSelectQoldiqBrand('barchasi')">
                        <span class="chip-name">🗂️ Barchasi</span>
                        <span class="chip-meta">${brands.length} brend · ${_buhCompactFmt(totalValue)}</span>
                    </div>
                    ${brands.map(b => {
                        const key = _buhSafeKey(b.name);
                        return `<div class="buh-brand-chip ${activeBrand === key ? 'active' : ''}" onclick="window._buhSelectQoldiqBrand('${key}')" title="${b.name.replace(/"/g, '&quot;')}">
                            <span class="chip-name">${b.name}</span>
                            <span class="chip-meta">${b.qty.toLocaleString('uz-UZ')} dona · ${_buhCompactFmt(b.value)}</span>
                        </div>`;
                    }).join('')}
                </div>`;
                const wasFocused = document.activeElement && document.activeElement.id === 'buhQoldiqSearch';
                const selStart = wasFocused ? document.activeElement.selectionStart : null;
                qoldiqSubfilterEl.innerHTML = `${chipsHtml}<input type="text" id="buhQoldiqSearch" class="buh-input" placeholder="🔍 ${activeBrand === 'barchasi' ? 'Brend' : 'Nomi, seriya yoki rang'} bo'yicha qidirish..." style="width:100%; margin-top:12px;" value="${(window._buhQoldiqSearchTerm || '').replace(/"/g, '&quot;')}" oninput="window._buhOnQoldiqSearchInput(this.value)">`;
                if (wasFocused) {
                    const inp = document.getElementById('buhQoldiqSearch');
                    inp.focus();
                    if (selStart !== null) inp.setSelectionRange(selStart, selStart);
                }
            } else {
                qoldiqSubfilterEl.innerHTML = '';
            }
        }

        const oynakSubfilterEl = document.getElementById('buh-oynak-subfilter');
        if (oynakSubfilterEl) {
            if (filter === 'oynak') {
                const brands = data.oynakBrands || [];
                const activeBrand = data.oynakActiveBrand || 'barchasi';
                const totalValue = brands.reduce((s, b) => s + b.value, 0);
                const chipsHtml = `<div class="buh-brand-filter-row">
                    <div class="buh-brand-chip ${activeBrand === 'barchasi' ? 'active' : ''}" onclick="window._buhSelectOynakBrand('barchasi')">
                        <span class="chip-name">🗂️ Barchasi</span>
                        <span class="chip-meta">${brands.length} turi · ${_buhCompactFmt(totalValue)}</span>
                    </div>
                    ${brands.map(b => {
                        const key = _buhSafeKey(b.name);
                        return `<div class="buh-brand-chip ${activeBrand === key ? 'active' : ''}" onclick="window._buhSelectOynakBrand('${key}')" title="${b.name.replace(/"/g, '&quot;')}">
                            <span class="chip-name">${b.name}</span>
                            <span class="chip-meta">${b.qty.toLocaleString('uz-UZ')} dona · ${_buhCompactFmt(b.value)}</span>
                        </div>`;
                    }).join('')}
                </div>`;
                const wasFocused = document.activeElement && document.activeElement.id === 'buhOynakSearch';
                const selStart = wasFocused ? document.activeElement.selectionStart : null;
                oynakSubfilterEl.innerHTML = brands.length ? `${chipsHtml}<input type="text" id="buhOynakSearch" class="buh-input" placeholder="🔍 ${activeBrand === 'barchasi' ? 'Turi/brend' : 'Nomi yoki o\'lchami'} bo'yicha qidirish..." style="width:100%; margin-top:12px;" value="${(window._buhOynakSearchTerm || '').replace(/"/g, '&quot;')}" oninput="window._buhOnOynakSearchInput(this.value)">` : '';
                if (wasFocused) {
                    const inp = document.getElementById('buhOynakSearch');
                    if (inp) { inp.focus(); if (selStart !== null) inp.setSelectionRange(selStart, selStart); }
                }
            } else {
                oynakSubfilterEl.innerHTML = '';
            }
        }

        const statsEl = document.getElementById('buh-ombor-filter-stats');
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="buh-mini-stat"><span class="buh-mini-label">${data.title}</span><span class="buh-mini-value" style="color:#00d2ff;">${_buhFmt(data.value)}</span></div>
                <div class="buh-mini-stat"><span class="buh-mini-label">Miqdori</span><span class="buh-mini-value" style="font-size:0.8rem; color:var(--adm-text);">${data.qtyText}</span></div>
                <div class="buh-mini-stat"><span class="buh-mini-label">Yozuvlar Soni</span><span class="buh-mini-value">${data.rows.length}</span></div>
            `;
        }
        const formEl = document.getElementById('buh-oynak-add-form');
        if (formEl) {
            formEl.innerHTML = filter === 'oynak' ? `
                <form onsubmit="window.addBuhOynakItem(event)" class="buh-form-row" style="margin-bottom:14px;">
                    <div class="buh-form-group"><label>Turi / Brend</label><input type="text" id="buhOynakBrand" class="buh-input" placeholder="Masalan: Ikki Qavatli Shisha-Paket" required></div>
                    <div class="buh-form-group"><label>Nomi</label><input type="text" id="buhOynakName" class="buh-input" placeholder="Masalan: Tinted Bronza 4mm"></div>
                    <div class="buh-form-group"><label>O'lcham</label><input type="text" id="buhOynakSize" class="buh-input" placeholder="Masalan: 1200x1500mm"></div>
                    <div class="buh-form-group"><label>Soni</label><input type="number" id="buhOynakQty" class="buh-input" min="0" step="1" required></div>
                    <div class="buh-form-group"><label>Narxi (birlik)</label><input type="number" id="buhOynakPrice" class="buh-input" min="0" required></div>
                    <button type="submit" class="buh-save-btn">➕ Qo'shish</button>
                </form>` : '';
        }

        const tableEl = document.getElementById('buh-ombor-filter-table');
        if (tableEl) {
            const extraCol = data.isOynak ? ['Amal'] : [];
            const headHtml = [...data.columns, ...extraCol].map((c, i) => `<th ${data.alignRight[i] ? 'style="text-align:right;"' : ''}>${c}</th>`).join('');
            const rowsHtml = data.rows.length
                ? data.rows.map((r, idx) => `<tr>${r.map((cell, i) => `<td ${data.alignRight[i] ? 'style="text-align:right;"' : ''}>${cell}</td>`).join('')}${data.isOynak ? `<td><button class="buh-row-action-btn" style="background:rgba(255,77,79,0.15); color:#ff4d4f;" onclick="window.deleteBuhOynakItem('${data.rowIds ? data.rowIds[idx] : ''}')">O'chirish</button></td>` : ''}</tr>`).join('')
                : `<tr><td colspan="${data.columns.length + extraCol.length}" style="text-align:center; color:rgba(255,255,255,0.3); padding:14px;">Ma'lumot topilmadi</td></tr>`;
            tableEl.innerHTML = `<div style="overflow-x:auto;"><table class="v2-table"><thead><tr>${headHtml}</tr></thead>
                <tbody>${rowsHtml}</tbody></table></div>`;
        }
    };

    function _buhRefreshOmborCardTotal() {
        const d = window._buhUmumiyData;
        if (!d) return;
        d.omborTotal = (d.profilValue || 0) + (d.accValue || 0) + (d.qoldiqValue || 0) + (d.oynakValue || 0);
        const cardEl = document.querySelector('#buh-umumiy-cards .buh-umumiy-card[data-key="ombor"] .buh-mini-value');
        if (cardEl) cardEl.textContent = _buhFmt(d.omborTotal);
    }

    window.addBuhOynakItem = async (e) => {
        e.preventDefault();
        const brand = document.getElementById('buhOynakBrand').value.trim();
        const name = document.getElementById('buhOynakName').value.trim();
        const size = document.getElementById('buhOynakSize').value.trim();
        const qty = parseFloat(document.getElementById('buhOynakQty').value) || 0;
        const price = parseFloat(document.getElementById('buhOynakPrice').value) || 0;
        if (!brand || qty <= 0) return;
        await _buhAddOynak({
            id: 'OYNAK-' + Date.now(), brand, product_name: name || brand, size,
            stock_quantity: qty, unit: 'dona', price
        });
        const list = await _buhGetOynak();
        window._buhUmumiyData.oynakItems = list;
        window._buhUmumiyData.oynakValue = _buhOynakValue(list);
        _buhRefreshOmborCardTotal();
        window._buhRenderOmborFilterView('oynak');
        window.showPremiumToast && window.showPremiumToast('Saqlandi', `${brand} qo'shildi.`, true);
    };

    window.deleteBuhOynakItem = async (id) => {
        if (!id || !confirm("Ushbu oynak yozuvini o'chirmoqchimisiz?")) return;
        await _buhDeleteOynak(id);
        const list = await _buhGetOynak();
        window._buhUmumiyData.oynakItems = list;
        window._buhUmumiyData.oynakValue = _buhOynakValue(list);
        _buhRefreshOmborCardTotal();
        window._buhRenderOmborFilterView('oynak');
    };

    window._buhToggleExpenseCategoryMenu = (e) => {
        if (e) e.stopPropagation();
        const menu = document.getElementById('buhUmExpCategoryMenu');
        const btn = document.getElementById('buhUmExpCategoryBtn');
        if (!menu) return;
        const willOpen = menu.style.display === 'none';
        menu.style.display = willOpen ? 'block' : 'none';
        if (btn) btn.classList.toggle('open', willOpen);
    };

    // Menyudan tashqariga bosilganda kategoriya dropdown'ini yopish
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('buhUmExpCategoryMenu');
        const btn = document.getElementById('buhUmExpCategoryBtn');
        if (!menu || menu.style.display === 'none') return;
        if (!menu.contains(e.target) && e.target !== btn && !(btn && btn.contains(e.target))) {
            menu.style.display = 'none';
            if (btn) btn.classList.remove('open');
        }
    });

    window._buhSelectExpenseCategory = (cat) => {
        const input = document.getElementById('buhUmExpCategory');
        if (input) input.value = cat;
        const label = document.getElementById('buhUmExpCategoryBtnLabel');
        if (label) label.textContent = `${_buhExpenseCatIcon(cat)} ${cat}`;
        document.querySelectorAll('#buhUmExpCategoryMenu .buh-cat-dropdown-item').forEach(item => {
            item.classList.toggle('active', item.dataset.cat === cat);
        });
        const menu = document.getElementById('buhUmExpCategoryMenu');
        const btn = document.getElementById('buhUmExpCategoryBtn');
        if (menu) menu.style.display = 'none';
        if (btn) btn.classList.remove('open');
    };

    window.addBuhUmumiyExpense = async (e) => {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn && submitBtn.disabled) return;
        const date = document.getElementById('buhUmExpDate').value || _buhToday();
        const category = document.getElementById('buhUmExpCategory').value;
        const note = document.getElementById('buhUmExpNote').value.trim();
        const amount = parseFloat(document.getElementById('buhUmExpAmount').value) || 0;
        if (amount <= 0) return;

        if (submitBtn) submitBtn.disabled = true;
        const record = { id: 'EXP-' + Date.now(), date, category, amount, note, created_at: new Date().toISOString() };
        await romixBuhInsert('romix_expenses', ROMIX_BUH_KEYS.expenses, record);
        await renderRomixBuhHarajatlar();
        await updateBuhHeroKPIs();
        await renderBuhOverview();
        if (submitBtn) submitBtn.disabled = false;
        window.showPremiumToast && window.showPremiumToast('Saqlandi', `${category} — ${_buhFmt(amount)} xarajat qo'shildi.`, true);
    };

    window._buhSelectHarajatPanel = (panelKey) => {
        window._buhHarajatPanelFilter = panelKey;
        window._buhRenderHarajatPanel(panelKey);
    };

    window._buhRenderHarajatPanel = (panelKey) => {
        panelKey = panelKey || window._buhHarajatPanelFilter || 'barchasi';
        window._buhHarajatPanelFilter = panelKey;
        const d = window._buhUmumiyData;
        const contentEl = document.getElementById('buh-harajat-panel-content');
        if (!d || !contentEl) return;

        document.querySelectorAll('#buhHarajatPanelPills .buh-brand-chip').forEach(c => {
            c.classList.toggle('active', c.dataset.harajatPanel === panelKey);
        });

        if (panelKey === 'kommunal') {
            window._buhRenderKommunalPanel();
            return;
        }

        if (panelKey === 'barchasi') {
            const cards = _BUH_EXPENSE_PANELS.map(p => {
                const total = d.monthExpenses.filter(e => p.categories.includes(e.category || 'Boshqa')).reduce((s, e) => s + (Number(e.amount) || 0), 0);
                return { p, total };
            }).filter(x => x.total > 0);
            const pct = t => d.monthlyExpenseTotal > 0 ? (t / d.monthlyExpenseTotal) * 100 : 0;
            contentEl.innerHTML = cards.length ? `<div class="buh-expense-grid">${cards.map(({ p, total }) => `
                <div class="buh-expense-card" style="cursor:pointer;" onclick="window._buhSelectHarajatPanel('${p.key}')">
                    <div class="buh-expense-top">
                        <span class="cat-icon">${p.icon}</span>
                        <div class="cat-info"><div class="cat-name">${p.label}</div><div class="cat-pct">${pct(total).toFixed(0)}% jami harajatdan</div></div>
                    </div>
                    <div class="cat-sum">-${_buhFmt(total)}</div>
                    <div class="buh-expense-bar"><div class="fill" style="width:${pct(total)}%;"></div></div>
                </div>`).join('')}</div>`
                : `<div style="text-align:center; color:rgba(255,255,255,0.3); padding:20px;">Shu oy harajat yo'q</div>`;
            return;
        }

        const panel = _BUH_EXPENSE_PANELS.find(p => p.key === panelKey);
        if (!panel) { contentEl.innerHTML = ''; return; }
        const entries = d.monthExpenses.filter(e => panel.categories.includes(e.category || 'Boshqa')).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const total = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);

        const subStatsHtml = `<div class="buh-mini-row" style="margin-bottom:14px;">
            <div class="buh-mini-stat"><span class="buh-mini-label">Jami (shu oy)</span><span class="buh-mini-value" style="color:#ff4d4f;">-${_buhFmt(total)}</span></div>
            <div class="buh-mini-stat"><span class="buh-mini-label">Yozuvlar Soni</span><span class="buh-mini-value">${entries.length}</span></div>
        </div>`;

        const rowsHtml = entries.length ? entries.map(e => `<tr>
                <td>${e.date || '-'}</td>
                <td style="text-align:right; color:#ff4d4f;">-${_buhFmt(e.amount)}</td>
                <td>${e.note || '-'}</td>
                <td><button class="buh-row-action-btn" style="background:rgba(255,77,79,0.15); color:#ff4d4f;" onclick="window.deleteRomixExpense('${e.id}')">O'chirish</button></td>
            </tr>`).join('') : `<tr><td colspan="4" style="text-align:center; color:rgba(255,255,255,0.3); padding:14px;">Shu oy "${panel.label}" bo'yicha xarajat yo'q</td></tr>`;

        contentEl.innerHTML = `${subStatsHtml}
            <div style="overflow-x:auto;"><table class="v2-table"><thead><tr><th>Sana</th><th style="text-align:right;">Summa</th><th>Izoh</th><th></th></tr></thead>
            <tbody>${rowsHtml}</tbody></table></div>`;
    };

    const _BUH_UTILITY_TYPES = [
        { cat: 'Kommunal - Svet', label: 'Svet (Elektr-energiya)', icon: '💡', needsAvto: true },
        { cat: 'Kommunal - Suv', label: 'Suv', icon: '🚰', needsAvto: false },
        { cat: 'Kommunal - Gaz', label: 'Gaz', icon: '🔥', needsAvto: false }
    ];
    function _buhUtilSafeKey(cat) { return cat.replace(/[^a-zA-Z0-9]/g, '_'); }
    function _buhCurrentMonthKey() { return _buhToday().slice(0, 7); }
    function _buhUtilReadingId(cat, monthKey) { return 'UTILREAD-' + _buhUtilSafeKey(cat) + '-' + monthKey; }

    window._buhRenderKommunalPanel = async () => {
        const d = window._buhUmumiyData;
        const contentEl = document.getElementById('buh-harajat-panel-content');
        if (!d || !contentEl) return;
        if (window._buhHarajatPanelFilter !== 'kommunal') return;
        contentEl.innerHTML = `<div style="text-align:center; padding:20px; color:rgba(255,255,255,0.3);">Yuklanmoqda...</div>`;

        const monthKey = _buhCurrentMonthKey();
        const readings = await romixBuhSelect('romix_utility_readings', ROMIX_BUH_KEYS.utilityReadings);
        if (window._buhHarajatPanelFilter !== 'kommunal') return;

        const cardsHtml = _BUH_UTILITY_TYPES.map(u => {
            const r = readings.find(x => x.category === u.cat && x.month_key === monthKey);
            const safeKey = _buhUtilSafeKey(u.cat);
            let status, badgeText, bodyHtml;
            if (!r || r.meter_start === null || r.meter_start === undefined) {
                status = 'pending'; badgeText = 'Kutilmoqda';
                bodyHtml = `<p class="buh-util-hint">Bu oy uchun hali "oy boshi" ko'rsatkichi kiritilmagan.</p>
                    <div class="buh-util-input-row">
                        <div class="buh-form-group" style="flex:1; margin:0;"><label>Oy Boshi Ko'rsatkichi (so'm)</label><input type="number" id="buhUtilStart_${safeKey}" class="buh-input" min="0" step="0.01"></div>
                        <button class="buh-save-btn" onclick="window._buhSaveUtilStart('${u.cat}')">💾 Saqlash</button>
                    </div>
                    <p class="buh-util-hint" style="margin-top:8px;">💡 Hisobingizda (litsevoy/schyot) ko'rsatilgan joriy summani (so'm) kiriting — kelgusi oyning boshi shu bilan solishtiriladi.</p>`;
            } else if (r.meter_end === null || r.meter_end === undefined) {
                status = 'progress'; badgeText = 'Jarayonda';
                bodyHtml = `<p class="buh-util-hint">Oy boshi ko'rsatkichi: <b style="color:var(--adm-text);">${_buhFmt(r.meter_start)}</b> (saqlangan). Oy oxirida ko'rsatkichni kiriting.</p>
                    <div class="buh-util-input-row">
                        <div class="buh-form-group" style="flex:1; min-width:130px; margin:0;"><label>Oy Oxiri Ko'rsatkichi (so'm)</label><input type="number" id="buhUtilEnd_${safeKey}" class="buh-input" min="0" step="0.01"></div>
                        ${u.needsAvto ? `<div class="buh-form-group" style="flex:1; min-width:130px; margin:0;"><label>AvtoClapak Sarfi (so'm)</label><input type="number" id="buhUtilAvto_${safeKey}" class="buh-input" min="0" step="0.01"></div>` : ''}
                        <button class="buh-save-btn" onclick="window._buhFinalizeUtilEnd('${u.cat}')">✅ Yakunlash</button>
                    </div>
                    ${u.needsAvto ? `<p class="buh-util-hint" style="margin-top:8px;">💡 Oy oxirida hisobda ko'rsatilgan yangi summani va AvtoClapak shu oy sarflagan summani (so'm) kiriting — Romix ulushi (oxiri − boshi − AvtoClapak) avtomatik hisoblanadi.</p>` : ''}`;
            } else {
                status = 'done'; badgeText = 'Yakunlandi';
                const usage = Math.max(0, (Number(r.meter_end) || 0) - (Number(r.meter_start) || 0));
                const finalAmount = u.needsAvto ? Math.max(0, usage - (Number(r.avto_sarfi) || 0)) : usage;
                bodyHtml = `<div class="buh-mini-row" style="margin:2px 0 12px;">
                        <div class="buh-mini-stat"><span class="buh-mini-label">Oy Boshi</span><span class="buh-mini-value">${_buhFmt(r.meter_start)}</span></div>
                        <div class="buh-mini-stat"><span class="buh-mini-label">Oy Oxiri</span><span class="buh-mini-value">${_buhFmt(r.meter_end)}</span></div>
                        ${u.needsAvto ? `<div class="buh-mini-stat"><span class="buh-mini-label">AvtoClapak</span><span class="buh-mini-value">${_buhFmt(r.avto_sarfi || 0)}</span></div>` : ''}
                    </div>
                    <div class="buh-util-final">
                        <span>Bu oy uchun xarajat</span>
                        <b>${_buhFmt(finalAmount)}</b>
                    </div>
                    <button class="buh-row-action-btn buh-util-reset-btn" onclick="window._buhResetUtilReading('${u.cat}')">↺ Qayta kiritish</button>`;
            }
            return `<div class="buh-util-card status-${status}">
                <div class="buh-util-head">
                    <span class="buh-util-icon">${u.icon}</span>
                    <span class="buh-util-title">${u.label}</span>
                    <span class="buh-util-badge ${status}">${badgeText}</span>
                </div>
                ${bodyHtml}
            </div>`;
        }).join('');

        const entries = d.monthExpenses.filter(e => _BUH_UTILITY_TYPES.some(u => u.cat === e.category)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const rowsHtml = entries.length ? entries.map(e => `<tr>
                <td>${e.date || '-'}</td>
                <td>${_buhExpenseCatIcon(e.category)} ${(e.category || '').replace('Kommunal - ', '')}</td>
                <td style="text-align:right; color:#ff4d4f;">-${_buhFmt(e.amount)}</td>
                <td>${e.note || '-'}</td>
                <td><button class="buh-row-action-btn" style="background:rgba(255,77,79,0.15); color:#ff4d4f;" onclick="window.deleteRomixExpense('${e.id}')">O'chirish</button></td>
            </tr>`).join('') : `<tr><td colspan="5" style="text-align:center; color:rgba(255,255,255,0.3); padding:14px;">Shu oy Kommunal harajat yo'q</td></tr>`;

        contentEl.innerHTML = `<div class="buh-util-grid">${cardsHtml}</div>
            <h5 class="buh-section-subtitle">📜 Tarix</h5>
            <div style="overflow-x:auto;"><table class="v2-table"><thead><tr><th>Sana</th><th>Turi</th><th style="text-align:right;">Summa</th><th>Izoh</th><th></th></tr></thead>
            <tbody>${rowsHtml}</tbody></table></div>`;
    };

    window._buhSaveUtilStart = async (cat) => {
        const safeKey = _buhUtilSafeKey(cat);
        const input = document.getElementById('buhUtilStart_' + safeKey);
        const val = parseFloat(input && input.value);
        if (isNaN(val) || val < 0) { window.showPremiumToast && window.showPremiumToast('Xato', "Oy boshi ko'rsatkichini kiriting.", false); return; }
        const monthKey = _buhCurrentMonthKey();
        const record = { id: _buhUtilReadingId(cat, monthKey), category: cat, month_key: monthKey, meter_start: val, meter_end: null, avto_sarfi: null, expense_id: null, created_at: new Date().toISOString() };
        await romixBuhInsert('romix_utility_readings', ROMIX_BUH_KEYS.utilityReadings, record);
        window.showPremiumToast && window.showPremiumToast('Saqlandi', "Oy boshi ko'rsatkichi saqlandi.", true);
        await window._buhRenderKommunalPanel();
    };

    window._buhFinalizeUtilEnd = async (cat) => {
        const safeKey = _buhUtilSafeKey(cat);
        const endInput = document.getElementById('buhUtilEnd_' + safeKey);
        const end = parseFloat(endInput && endInput.value);
        if (isNaN(end) || end < 0) { window.showPremiumToast && window.showPremiumToast('Xato', "Oy oxiri ko'rsatkichini kiriting.", false); return; }
        const isSvet = cat === 'Kommunal - Svet';
        let avto = 0;
        if (isSvet) {
            const avtoInput = document.getElementById('buhUtilAvto_' + safeKey);
            avto = parseFloat(avtoInput && avtoInput.value) || 0;
        }
        const monthKey = _buhCurrentMonthKey();
        const readings = await romixBuhSelect('romix_utility_readings', ROMIX_BUH_KEYS.utilityReadings);
        const existing = readings.find(r => r.category === cat && r.month_key === monthKey);
        if (!existing) return;
        const usage = Math.max(0, end - (Number(existing.meter_start) || 0));
        const finalAmount = isSvet ? Math.max(0, usage - avto) : usage;

        const note = isSvet
            ? `Oy boshi: ${_buhFmt(existing.meter_start)} | Oy oxiri: ${_buhFmt(end)} | Jami: ${_buhFmt(usage)} | AvtoClapak sarfi: ${_buhFmt(avto)} | Romix ulushi: ${_buhFmt(finalAmount)}`
            : `Oy boshi ko'rsatkichi: ${_buhFmt(existing.meter_start)} | Oy oxiri ko'rsatkichi: ${_buhFmt(end)} | Xarajat: ${_buhFmt(usage)}`;
        const expenseRecord = { id: 'EXP-' + Date.now(), date: _buhToday(), category: cat, amount: finalAmount, note, created_at: new Date().toISOString() };
        await romixBuhInsert('romix_expenses', ROMIX_BUH_KEYS.expenses, expenseRecord);
        await romixBuhUpdate('romix_utility_readings', ROMIX_BUH_KEYS.utilityReadings, existing.id, { meter_end: end, avto_sarfi: avto, expense_id: expenseRecord.id });

        await renderRomixBuhHarajatlar();
        await updateBuhHeroKPIs();
        await renderBuhOverview();
        window.showPremiumToast && window.showPremiumToast('Yakunlandi', `${cat} — ${_buhFmt(finalAmount)} xarajat sifatida qo'shildi.`, true);
    };

    window._buhResetUtilReading = async (cat) => {
        if (!confirm("Bu oy uchun ko'rsatkichlarni qayta kiritmoqchimisiz? Avval hisoblangan xarajat yozuvi o'chirilmaydi, faqat ko'rsatkich formasi tozalanadi.")) return;
        const monthKey = _buhCurrentMonthKey();
        await romixBuhDelete('romix_utility_readings', ROMIX_BUH_KEYS.utilityReadings, _buhUtilReadingId(cat, monthKey));
        await window._buhRenderKommunalPanel();
    };

    window._buhSelectProfilBrand = (brandKey) => {
        window._buhProfilBrandFilter = brandKey;
        window._buhProfilSearchTerm = '';
        window._buhRenderOmborFilterView('profil');
    };

    window._buhOnProfilSearchInput = (val) => {
        window._buhProfilSearchTerm = val;
        window._buhRenderOmborFilterView('profil');
    };

    window._buhSelectAccCategory = (catKey) => {
        window._buhAccCategoryFilter = catKey;
        window._buhAccSearchTerm = '';
        window._buhRenderOmborFilterView('aksesuvar');
    };

    window._buhOnAccSearchInput = (val) => {
        window._buhAccSearchTerm = val;
        window._buhRenderOmborFilterView('aksesuvar');
    };

    window._buhSelectQoldiqBrand = (brandKey) => {
        window._buhQoldiqBrandFilter = brandKey;
        window._buhQoldiqSearchTerm = '';
        window._buhRenderOmborFilterView('qoldiq');
    };

    window._buhOnQoldiqSearchInput = (val) => {
        window._buhQoldiqSearchTerm = val;
        window._buhRenderOmborFilterView('qoldiq');
    };

    window._buhSelectOynakBrand = (brandKey) => {
        window._buhOynakBrandFilter = brandKey;
        window._buhOynakSearchTerm = '';
        window._buhRenderOmborFilterView('oynak');
    };

    window._buhOnOynakSearchInput = (val) => {
        window._buhOynakSearchTerm = val;
        window._buhRenderOmborFilterView('oynak');
    };

    window._buhInitOmborFilter = () => {
        document.querySelectorAll('#buhOmborFilterPills .buh-brand-chip').forEach(p => {
            p.onclick = () => window._buhRenderOmborFilterView(p.dataset.omborFilter);
        });
        window._buhRenderOmborFilterView(window._buhOmborActiveFilter || 'barchasi');
    };

    window.exportBuhOmborSection = (format) => {
        const filter = window._buhOmborActiveFilter || 'barchasi';
        const data = _buhOmborFilterDataset(filter);
        if (!data.rows.length) { alert("Eksport qilish uchun ma'lumot topilmadi."); return; }
        const fileBase = `AKFA_Ombor_${filter}_${_buhToday()}`;

        if (format === 'excel') {
            if (typeof XLSX === 'undefined') { alert('Excel kutubxonasi yuklanmagan.'); return; }
            const sheetData = data.rows.map(r => {
                const row = {};
                data.columns.forEach((c, i) => { row[c] = r[i]; });
                return row;
            });
            const ws = XLSX.utils.json_to_sheet(sheetData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Ombor Hisoboti");
            XLSX.writeFile(wb, `${fileBase}.xlsx`);
        } else if (format === 'pdf') {
            if (!window.jspdf || !window.jspdf.jsPDF) { alert('PDF kutubxonasi yuklanmagan.'); return; }
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text(`AKFA Romix — ${data.title} Hisoboti`, 14, 18);
            doc.setFontSize(10);
            doc.text(`Jami Qiymat: ${_buhFmt(data.value)}`, 14, 26);
            doc.text(`Miqdori: ${data.qtyText}`, 14, 32);
            doc.text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, 14, 38);
            doc.autoTable({ startY: 44, head: [data.columns], body: data.rows, theme: 'grid', headStyles: { fillColor: [0, 186, 255] } });
            doc.save(`${fileBase}.pdf`);
        }
    };

    async function _buhComputeUmumiyData() {
        const monthKey = _buhMonthKey();

        // Bir-biriga bog'liq bo'lmagan barcha so'rovlarni PARALLEL yuboramiz —
        // ketma-ket (await...await...) yuklash "Umumiy" panelini bir necha
        // soniya kutdirar edi, endi eng sekin so'rov vaqticha cheklanadi.
        const [profilItems, omborTx, orders, expenses, payments, employees, attendanceRaw] = await Promise.all([
            (async () => {
                try { const { data } = await supabase.from('romix_inventory').select('*'); return data || []; }
                catch (e) { console.warn('Buh Umumiy ombor fetch error:', e); return []; }
            })(),
            (async () => {
                try {
                    const { data } = await supabase.from('romix_transactions').select('*, romix_inventory(product_name, unit, price)')
                        .gte('created_at', monthKey + '-01').order('created_at', { ascending: false });
                    return data || [];
                } catch (e) { console.warn('Buh Umumiy ombor tranzaksiyalari fetch error:', e); return []; }
            })(),
            (async () => {
                try { const { data } = await supabase.from('sales_orders').select('*'); return data || []; }
                catch (e) { console.warn('Buh Umumiy orders fetch error:', e); return []; }
            })(),
            romixBuhSelect('romix_expenses', ROMIX_BUH_KEYS.expenses),
            romixBuhSelect('romix_payment_log', ROMIX_BUH_KEYS.payments),
            (async () => {
                try { const { data } = await supabase.from('employees').select('id, full_name, role, salary_info'); return data || []; }
                catch (e) { console.warn('Buh Umumiy xodimlar fetch error:', e); return []; }
            })(),
            (async () => {
                try { const { data } = await supabase.from('attendance').select('employee_id, date, check_in, check_out'); return data || []; }
                catch (e) { console.warn('Buh Umumiy davomat fetch error:', e); return []; }
            })()
        ]);

        const profilValue = profilItems.reduce((s, p) => s + ((Number(p.price) || 0) * (Number(p.stock_quantity) || 0)), 0);

        const accessories = await _buhGetAccessories();
        const accValue = accessories.reduce((s, a) => s + ((Number(a.price) || 0) * (Number(a.qty) || 0)), 0);

        const qoldiqItems = await _buhGetQoldiqProfillar();
        const qoldiqValue = _buhQoldiqValue(qoldiqItems);

        const oynakItems = await _buhGetOynak();
        const oynakValue = _buhOynakValue(oynakItems);

        const omborTotal = profilValue + accValue + qoldiqValue + oynakValue;

        // Kirim — faqat Buxgalteriya Ombor panelidan (qo'lda/Profil Kirim/Rasmdan Kirim AI) kiritilgan, narx qo'yiladigan yozuvlar
        const kirimTx = omborTx.filter(t => t.type === 'IN' && (t.note || '').includes('Buxgalteriya'));
        // Chiqim — faqat 50% avans to'langan va Ombor bo'limi tasdiqlagan buyurtmalar uchun ajratilgan chiqim (confirmOrderMaterials oqimi)
        const chiqimTx = omborTx.filter(t => t.type === 'OUT' && (t.note || '').startsWith("Buyurtma uchun ajratildi"));

        // Aksesuvar Kirim — Buxgalteriya orqali (romix_accessories_history, faqat "(Buxgalteriya)" belgili, shu oy)
        let kirimAccessoryLog = [];
        try {
            const logs = await romixBuhSelect('romix_accessories_history', 'romix_accessories_history_log');
            kirimAccessoryLog = logs.filter(l => {
                if (!/kirim/i.test(l.action || '')) return false;
                if (!(l.details || '').includes('(Buxgalteriya)')) return false;
                const datePart = (l.timestamp || '').split(' ')[0];
                const parts = datePart.split('.');
                if (parts.length !== 3) return false;
                return `${parts[2]}-${parts[1]}` === monthKey;
            }).map(l => {
                const nameMatch = (l.details || '').match(/^"([^"]+)"/);
                const qtyMatch = (l.details || '').match(/mahsulotidan\s+([\d.,\s]+)\s+(\S+)/);
                const name = nameMatch ? nameMatch[1] : "Noma'lum";
                const qty = qtyMatch ? parseFloat(qtyMatch[1].replace(/[,\s]/g, '')) || 0 : 0;
                const unit = qtyMatch ? qtyMatch[2] : '';
                const acc = accessories.find(a => (a.name || '').toLowerCase() === name.toLowerCase());
                return { dateLabel: (l.timestamp || '').split(' ')[0], product_name: name, qty, unit, price: acc ? (Number(acc.price) || 0) : 0, note: l.details };
            });
        } catch (e) { console.warn('Buh Umumiy aksesuvar tarixi fetch error:', e); }

        const monthOrders = orders.filter(o => (o.created_at || '').startsWith(monthKey));
        const monthlyIncome = monthOrders.reduce((s, o) => s + (Number(o.total_price) || 0), 0);
        const monthlyCollected = monthOrders.reduce((s, o) => s + _buhOrderPaymentInfo(o).paidAmount, 0);
        const installedUnpaid = orders.filter(o => o.install_status === 'Bajarildi' && _buhOrderPaymentInfo(o).remaining > 0);
        const installedUnpaidTotal = installedUnpaid.reduce((s, o) => s + _buhOrderPaymentInfo(o).remaining, 0);
        const notInstalledUnpaid = orders.filter(o => o.install_status !== 'Bajarildi' && _buhOrderPaymentInfo(o).remaining > 0);
        const notInstalledUnpaidTotal = notInstalledUnpaid.reduce((s, o) => s + _buhOrderPaymentInfo(o).remaining, 0);

        const monthExpenses = expenses.filter(e => (e.date || '').startsWith(monthKey));
        const monthlyExpenseTotal = monthExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const expenseByCategory = {};
        monthExpenses.forEach(e => {
            const cat = e.category || 'Boshqa';
            expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (Number(e.amount) || 0);
        });

        const monthPayments = payments.filter(p => (p.date || '').startsWith(monthKey));
        const monthlyPaymentsTotal = monthPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const paymentsByCreditor = {};
        monthPayments.forEach(p => {
            const c = p.creditor || "Noma'lum";
            if (!paymentsByCreditor[c]) paymentsByCreditor[c] = { total: 0, list: [] };
            paymentsByCreditor[c].total += (Number(p.amount) || 0);
            paymentsByCreditor[c].list.push(p);
        });

        const attendance = attendanceRaw.filter(a => (a.date || '').startsWith(monthKey));
        const monthlyPayrollFund = employees.reduce((s, e) => s + (parseFloat((e.salary_info || '').toString().replace(/[^0-9]/g, '')) || 0), 0);

        const attByEmp = {};
        attendance.forEach(a => { if (!attByEmp[a.employee_id]) attByEmp[a.employee_id] = []; attByEmp[a.employee_id].push(a); });
        const employeeMonthlyEarnings = employees.map(e => {
            const sal = parseFloat((e.salary_info || '').toString().replace(/[^0-9]/g, '')) || 0;
            const hourlyRate = sal / 26 / 8;
            const days = attByEmp[e.id] || [];
            let earned = 0, workedDays = 0;
            days.forEach(a => {
                if (!a.check_in || !a.check_out) return;
                const ip = a.check_in.split(':').map(Number);
                const op = a.check_out.split(':').map(Number);
                const inSec = (ip[0] || 0) * 3600 + (ip[1] || 0) * 60 + (ip[2] || 0);
                const outSec = (op[0] || 0) * 3600 + (op[1] || 0) * 60 + (op[2] || 0);
                const hours = Math.max(0, (outSec - inSec) / 3600);
                earned += hours * hourlyRate;
                workedDays++;
            });
            return { id: e.id, name: e.full_name, role: e.role, salary: sal, workedDays, earned };
        }).sort((a, b) => b.earned - a.earned);

        return {
            monthKey, profilItems, profilValue, accValue, accessories, qoldiqItems, qoldiqValue, oynakItems, oynakValue, omborTotal, kirimTx, chiqimTx, kirimAccessoryLog,
            monthlyIncome, monthOrders, monthOrdersCount: monthOrders.length, monthlyCollected,
            monthlyExpenseTotal, expenseByCategory, monthExpenses,
            monthlyPaymentsTotal, paymentsByCreditor,
            monthlyPayrollFund, employeeMonthlyEarnings,
            installedUnpaid, installedUnpaidTotal, notInstalledUnpaid, notInstalledUnpaidTotal
        };
    }

    function _buhUmumiyCard(key, icon, label, valueHtml, color) {
        return `<div class="buh-mini-stat buh-umumiy-card" data-key="${key}" onclick="window.toggleBuhUmumiyDrill('${key}')" style="cursor:pointer;">
            <span class="buh-mini-label">${icon} ${label}</span>
            <span class="buh-mini-value" style="color:${color};">${valueHtml}</span>
        </div>`;
    }

    window.toggleBuhUmumiyDrill = (key) => {
        const panel = document.getElementById('buh-umumiy-drill-panel');
        if (!panel) return;
        if (window._buhUmumiyActiveKey === key) {
            window._buhUmumiyActiveKey = null;
            panel.style.display = 'none';
            panel.innerHTML = '';
        } else {
            window._buhUmumiyActiveKey = key;
            panel.innerHTML = (window._buhUmumiyDrills && window._buhUmumiyDrills[key]) || '';
            panel.style.display = 'block';
            if (key === 'ombor') window._buhInitOmborFilter();
            if (key === 'harajat') window._buhRenderHarajatPanel(window._buhHarajatPanelFilter || 'barchasi');
        }
        document.querySelectorAll('#buh-umumiy-cards .buh-umumiy-card').forEach(c => {
            c.classList.toggle('active', c.dataset.key === window._buhUmumiyActiveKey);
        });
    };

    window.toggleBuhPaymentCreditor = (safeKey) => {
        const row = document.getElementById(`buh-pay-cred-${safeKey}`);
        if (row) row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
    };

    async function renderBuhUmumiyCards() {
        const cardsEl = document.getElementById('buh-umumiy-cards');
        const panel = document.getElementById('buh-umumiy-drill-panel');
        if (!cardsEl) return;

        const d = await _buhComputeUmumiyData();
        window._buhUmumiyData = d;
        window._buhUmumiyDrills = {};

        window._buhUmumiyDrills['ombor'] = `
            <div class="buh-brand-filter-row" id="buhOmborFilterPills" style="margin-bottom:16px;">
                <div class="buh-brand-chip active" data-ombor-filter="barchasi"><span class="chip-name">🗂️ Barchasi</span></div>
                <div class="buh-brand-chip" data-ombor-filter="profil"><span class="chip-name">📦 Profil</span></div>
                <div class="buh-brand-chip" data-ombor-filter="aksesuvar"><span class="chip-name">🔩 Aksesuvar</span></div>
                <div class="buh-brand-chip" data-ombor-filter="qoldiq"><span class="chip-name">✂️ Qoldiq Profillar</span></div>
                <div class="buh-brand-chip" data-ombor-filter="oynak"><span class="chip-name">🪟 Oynak</span></div>
                <div class="buh-brand-chip" data-ombor-filter="kirim"><span class="chip-name">📥 Ombor Kirim</span></div>
                <div class="buh-brand-chip" data-ombor-filter="chiqim"><span class="chip-name">📤 Ombor Chiqim</span></div>
            </div>
            <div id="buh-profil-subfilter" style="margin-bottom:14px;"></div>
            <div id="buh-aksesuvar-subfilter" style="margin-bottom:14px;"></div>
            <div id="buh-qoldiq-subfilter" style="margin-bottom:14px;"></div>
            <div id="buh-oynak-subfilter" style="margin-bottom:14px;"></div>
            <div style="display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
                <div class="buh-mini-row" id="buh-ombor-filter-stats" style="margin:0; flex:1; min-width:260px;"></div>
                <div style="display:flex; gap:8px;">
                    <button onclick="window.exportBuhOmborSection('excel')" class="buh-export-btn" style="background:#1D6F42;">📊 Excel</button>
                    <button onclick="window.exportBuhOmborSection('pdf')" class="buh-export-btn" style="background:#c0392b;">📄 PDF</button>
                </div>
            </div>
            <div id="buh-oynak-add-form"></div>
            <div id="buh-ombor-filter-table"></div>`;

        const incomeCards = d.monthOrders.length
            ? d.monthOrders.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(o => {
                const pay = _buhOrderPaymentInfo(o);
                const cost = (Number(o.production_cost) || 0) + (Number(o.installation_cost) || 0);
                const profit = pay.total - cost;
                const margin = pay.total > 0 ? (profit / pay.total) * 100 : 0;
                const profitColor = profit >= 0 ? '#00ff88' : '#ff4d4f';
                const payBadge = pay.fullyPaid
                    ? `<span class="buh-income-badge paid">✓ To'liq to'langan</span>`
                    : (pay.paidAmount > 0 ? `<span class="buh-income-badge partial">◐ Qisman to'langan</span>` : `<span class="buh-income-badge unpaid">✕ To'lanmagan</span>`);
                const dateStr = o.created_at ? new Date(o.created_at).toLocaleDateString('uz-UZ') : '-';
                const paidPct = pay.total > 0 ? Math.min(100, (pay.paidAmount / pay.total) * 100) : 0;
                return `<div class="buh-income-card">
                    <div class="buh-income-top">
                        <div class="buh-income-cust">
                            <div class="name">${o.customer_name || "Noma'lum"}</div>
                            <div class="meta">${o.prod_type || 'Mahsulot'} • ${dateStr}</div>
                        </div>
                        ${payBadge}
                    </div>
                    <div class="buh-income-money-grid">
                        <div class="m-item"><span class="m-label">Buyurtma Qiymati</span><span class="m-value" style="color:var(--adm-text);">${_buhFmt(pay.total)}</span></div>
                        <div class="m-item"><span class="m-label">Tan Narx (Ombordan)</span><span class="m-value" style="color:#ffaa00;">${_buhFmt(cost)}</span></div>
                        <div class="m-item"><span class="m-label">Foyda</span><span class="m-value" style="color:${profitColor};">${_buhFmt(profit)} <small>(${margin.toFixed(0)}%)</small></span></div>
                    </div>
                    <div class="buh-income-pay-bar"><div class="fill" style="width:${paidPct}%; background:${pay.fullyPaid ? '#00ff88' : '#ffaa00'};"></div></div>
                    <div class="buh-income-pay-row">
                        <span>Olingan: <b style="color:#00ff88;">${_buhFmt(pay.paidAmount)}</b></span>
                        <span>Qolgan: <b style="color:${pay.remaining > 0 ? '#ff4d4f' : 'var(--adm-text-sec)'};">${_buhFmt(pay.remaining)}</b></span>
                    </div>
                </div>`;
            }).join('')
            : `<div style="text-align:center; color:rgba(255,255,255,0.3); padding:20px; grid-column:1/-1;">Shu oy buyurtma yo'q</div>`;
        window._buhUmumiyDrills['kirim'] = `<h4 style="color:var(--adm-text); margin-bottom:14px;">📈 Shu Oy Buyurtmalardan Tushgan To'lovlar (${d.monthOrders.length} buyurtma)</h4>
            <div class="buh-income-grid">${incomeCards}</div>`;

        window._buhUmumiyDrills['harajat'] = `
            <div class="buh-brand-filter-row" id="buhHarajatPanelPills" style="margin-bottom:16px;">
                <div class="buh-brand-chip active" data-harajat-panel="barchasi" onclick="window._buhSelectHarajatPanel('barchasi')">
                    <span class="chip-name">🗂️ Barchasi</span><span class="chip-meta">${_buhFmt(d.monthlyExpenseTotal)}</span>
                </div>
                ${_BUH_EXPENSE_PANELS.map(p => {
                    const total = d.monthExpenses.filter(e => p.categories.includes(e.category || 'Boshqa')).reduce((s, e) => s + (Number(e.amount) || 0), 0);
                    return `<div class="buh-brand-chip" data-harajat-panel="${p.key}" onclick="window._buhSelectHarajatPanel('${p.key}')">
                        <span class="chip-name">${p.icon} ${p.label}</span><span class="chip-meta">${_buhFmt(total)}</span>
                    </div>`;
                }).join('')}
            </div>
            <div id="buh-harajat-panel-content" style="margin-bottom:20px;"></div>
            <div class="hr-card" style="background:rgba(255,255,255,0.015); padding:18px;">
            <h4 style="color:var(--adm-text); margin-bottom:12px;">➕ Yangi Harajat Kiritish</h4>
            <form onsubmit="window.addBuhUmumiyExpense(event)">
                <div class="buh-form-row">
                <div class="buh-form-group" style="position:relative;">
                    <label>Kategoriya</label>
                    <button type="button" class="buh-cat-dropdown-btn" id="buhUmExpCategoryBtn" onclick="window._buhToggleExpenseCategoryMenu(event)">
                        <span id="buhUmExpCategoryBtnLabel">${_buhExpenseCatIcon(_BUH_GENERIC_FORM_CATEGORIES[0])} ${_BUH_GENERIC_FORM_CATEGORIES[0]}</span>
                        <span class="dd-arrow">▾</span>
                    </button>
                    <div class="buh-cat-dropdown-menu" id="buhUmExpCategoryMenu" style="display:none;">
                        ${_BUH_GENERIC_FORM_CATEGORIES.map((c, i) => `<div class="buh-cat-dropdown-item ${i === 0 ? 'active' : ''}" data-cat="${c.replace(/"/g, '&quot;')}" onclick="window._buhSelectExpenseCategory('${c.replace(/'/g, "\\'")}')">
                            <span class="ico">${_buhExpenseCatIcon(c)}</span><span>${c}</span>
                        </div>`).join('')}
                    </div>
                    <input type="hidden" id="buhUmExpCategory" value="${_BUH_GENERIC_FORM_CATEGORIES[0]}">
                </div>
                <div class="buh-form-group"><label>Sana</label><input type="date" id="buhUmExpDate" class="buh-input" value="${_buhToday()}" required></div>
                <div class="buh-form-group" id="buhUmExpAmountGroup"><label>Summa (UZS)</label><input type="number" id="buhUmExpAmount" class="buh-input" min="0" required></div>
                <div class="buh-form-group"><label>Izoh</label><input type="text" id="buhUmExpNote" class="buh-input" placeholder="Nimaga ketgani (ixtiyoriy)"></div>
                <button type="submit" class="buh-save-btn">💾 Saqlash</button>
                </div>
            </form>
            <p style="font-size:0.68rem; color:var(--adm-text-sec); margin-top:8px;">💡 Kommunal (Svet/Suv/Gaz) harajatlari bu yerdan emas — yuqorida "Kommunal Harajat" panelini ochib, har bir turini bosib, oy boshi/oxiri ko'rsatkichini kiritish orqali qo'shiladi.</p>
            </div>`;

        const creditorEntries = Object.entries(d.paymentsByCreditor).sort((a, b) => b[1].total - a[1].total);
        const paymentsRows = creditorEntries.length ? creditorEntries.map(([creditor, info]) => {
            const safeKey = creditor.replace(/[^a-zA-Z0-9]/g, '_');
            const historyRows = info.list.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(p =>
                `<tr><td style="padding-left:24px; color:rgba(255,255,255,0.5);">${p.date}</td><td style="color:rgba(255,255,255,0.5);">${p.note || '-'}</td><td style="text-align:right; color:#00ff88;">${_buhFmt(p.amount)}</td></tr>`).join('');
            return `<tr style="cursor:pointer;" onclick="window.toggleBuhPaymentCreditor('${safeKey}')"><td>▸ ${creditor}</td><td></td><td style="text-align:right; font-weight:700;">${_buhFmt(info.total)}</td></tr>
                <tr id="buh-pay-cred-${safeKey}" style="display:none; background:rgba(255,255,255,0.02);"><td colspan="3" style="padding:0;"><table class="v2-table" style="width:100%;"><tbody>${historyRows}</tbody></table></td></tr>`;
        }).join('') : `<tr><td colspan="3" style="text-align:center; color:rgba(255,255,255,0.3); padding:14px;">Shu oy to'lov qilinmagan</td></tr>`;
        window._buhUmumiyDrills['tolovlar'] = `<h4 style="color:var(--adm-text); margin-bottom:10px;">🧾 Shu Oy To'lovlar — Kimga Qancha (bosib tarixni ko'ring)</h4>
            <div style="overflow-x:auto;"><table class="v2-table"><thead><tr><th>Kreditor</th><th></th><th style="text-align:right;">Jami</th></tr></thead>
            <tbody>${paymentsRows}</tbody></table></div>`;

        const empRows = d.employeeMonthlyEarnings.length ? d.employeeMonthlyEarnings.map(e =>
            `<tr><td>${e.name}</td><td>${e.role || '-'}</td><td style="text-align:right;">${e.workedDays}</td><td style="text-align:right; color:#ffaa00;">${_buhFmt(e.earned)}</td><td style="text-align:right; color:#ba00ff;">${_buhFmt(e.salary)}</td></tr>`).join('')
            : `<tr><td colspan="5" style="text-align:center; color:rgba(255,255,255,0.3); padding:14px;">Xodim topilmadi</td></tr>`;
        window._buhUmumiyDrills['xodimlar'] = `<h4 style="color:var(--adm-text); margin-bottom:10px;">👥 Shu Oy Xodimlar — Kim Qancha Ishlagani</h4>
            <div style="overflow-x:auto;"><table class="v2-table"><thead><tr><th>Ism</th><th>Lavozim</th><th style="text-align:right;">Ish Kunlari</th><th style="text-align:right;">Hisoblangan Ish Haqi</th><th style="text-align:right;">Oylik Maosh</th></tr></thead>
            <tbody>${empRows}</tbody></table></div>`;

        const installedRows = d.installedUnpaid.length ? d.installedUnpaid.slice()
            .sort((a, b) => _buhOrderPaymentInfo(b).remaining - _buhOrderPaymentInfo(a).remaining).map(o => {
                const pay = _buhOrderPaymentInfo(o);
                return `<tr><td>${o.customer_name || "Noma'lum"}</td><td style="text-align:right;">${_buhFmt(pay.total)}</td><td style="text-align:right; color:#00ff88;">${_buhFmt(pay.paidAmount)}</td><td style="text-align:right; color:#ff4d4f; font-weight:700;">${_buhFmt(pay.remaining)}</td></tr>`;
            }).join('') : `<tr><td colspan="4" style="text-align:center; color:rgba(255,255,255,0.3); padding:14px;">Hammasi to'liq to'langan</td></tr>`;
        window._buhUmumiyDrills['zakaz'] = `<h4 style="color:var(--adm-text); margin-bottom:10px;">🛒 Shu Oy Buyurtmalar: ${d.monthOrdersCount} ta — ${_buhFmt(d.monthlyIncome)}</h4>
            <div class="buh-mini-row" style="margin-bottom:16px;">
                <div class="buh-mini-stat"><span class="buh-mini-label">Shu Oy Yig'ilgan</span><span class="buh-mini-value" style="color:#00ff88;">${_buhFmt(d.monthlyCollected)}</span></div>
                <div class="buh-mini-stat"><span class="buh-mini-label">Hali Ishlanmagan Qoldiq</span><span class="buh-mini-value" style="color:#ffaa00;">${_buhFmt(d.notInstalledUnpaidTotal)}</span></div>
                <div class="buh-mini-stat"><span class="buh-mini-label">O'tgan Mijozlardan Kutilmoqda</span><span class="buh-mini-value" style="color:#ff4d4f;">${_buhFmt(d.installedUnpaidTotal)}</span></div>
            </div>
            <h4 style="color:var(--adm-text); margin-bottom:10px;">⏳ O'rnatilgan, Lekin To'liq To'lanmagan Mijozlar</h4>
            <div style="overflow-x:auto;"><table class="v2-table"><thead><tr><th>Mijoz</th><th style="text-align:right;">Jami</th><th style="text-align:right;">To'langan</th><th style="text-align:right;">Qoldiq</th></tr></thead>
            <tbody>${installedRows}</tbody></table></div>`;

        cardsEl.innerHTML = [
            _buhUmumiyCard('ombor', '🏬', 'Ombor Qiymati', _buhFmt(d.omborTotal), '#00baff'),
            _buhUmumiyCard('kirim', '📈', 'Oylik Kirim (Olingan To\'lov)', _buhFmt(d.monthlyCollected), '#00ff88'),
            _buhUmumiyCard('harajat', '📉', 'Oylik Harajat', _buhFmt(d.monthlyExpenseTotal), '#ff4d4f'),
            _buhUmumiyCard('tolovlar', '🧾', "To'lovlar (shu oy)", _buhFmt(d.monthlyPaymentsTotal), '#fabb18'),
            _buhUmumiyCard('xodimlar', '👥', 'Xodimlar Oyligi', _buhFmt(d.monthlyPayrollFund), '#ba00ff'),
            _buhUmumiyCard('zakaz', '🛒', 'Buyurtmalar (shu oy)', `${d.monthOrdersCount} ta — ${_buhFmt(d.monthlyIncome)}`, '#00ff88')
        ].join('');

        if (panel && window._buhUmumiyActiveKey) {
            panel.innerHTML = window._buhUmumiyDrills[window._buhUmumiyActiveKey] || '';
            if (window._buhUmumiyActiveKey === 'ombor') window._buhInitOmborFilter();
            if (window._buhUmumiyActiveKey === 'harajat') window._buhRenderHarajatPanel(window._buhHarajatPanelFilter || 'barchasi');
        }
    }

    async function updateBuhHeroKPIs() {
        let orders = [];
        try {
            const { data } = await supabase.from('sales_orders').select('total_price, created_at');
            orders = data || [];
        } catch (e) { /* offline */ }

        const monthKey = _buhToday().slice(0, 7);
        const monthlySales = orders.filter(o => (o.created_at || '').startsWith(monthKey)).reduce((s, o) => s + (Number(o.total_price) || 0), 0);

        const expenses = await romixBuhSelect('romix_expenses', ROMIX_BUH_KEYS.expenses);
        const monthlyExpense = expenses.filter(e => (e.date || '').startsWith(monthKey)).reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const netProfit = monthlySales - monthlyExpense;

        const debts = await romixBuhSelect('romix_debts', ROMIX_BUH_KEYS.debts);
        const totalDebt = debts.reduce((s, d) => s + Math.max(0, (Number(d.amount) || 0) - (Number(d.paid_amount) || 0)), 0);

        _buhSetText('buh-hero-savdo', monthlySales);
        _buhSetText('buh-hero-xarajat', monthlyExpense);
        _buhSetText('buh-hero-foyda', netProfit);
        const foydaEl = document.getElementById('buh-hero-foyda');
        if (foydaEl) foydaEl.style.color = netProfit >= 0 ? '#00d2ff' : '#ff4d4f';
        _buhSetText('buh-hero-qarz', totalDebt);
    }

    const ROMIX_BUH_SQL_SCRIPT = `-- Romix Buhgalter uchun yangi jadvallar
CREATE TABLE IF NOT EXISTS romix_production_log (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    model_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS romix_expenses (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS romix_debts (
    id TEXT PRIMARY KEY,
    creditor TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    due_date TEXT,
    note TEXT,
    date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Sotuv buyurtmalarida to'lov holatini kuzatish uchun (Buhgalteriya > Kunlik Sotuv)
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;

-- Tashqi qarz to'lovlari tarixi (Buhgalteriya > Umumiy > To'lovlar)
CREATE TABLE IF NOT EXISTS romix_payment_log (
    id TEXT PRIMARY KEY,
    debt_id TEXT,
    creditor TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    note TEXT,
    date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Kommunal (Svet/Suv/Gaz) oy boshi/oxiri ko'rsatkichlari (Buhgalteriya > Umumiy > Harajat > Kommunal)
CREATE TABLE IF NOT EXISTS romix_utility_readings (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    month_key TEXT NOT NULL,
    meter_start NUMERIC,
    meter_end NUMERIC,
    avto_sarfi NUMERIC,
    expense_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Aksesuvar / Qoldiq Profillar / Oynak (avval faqat localStorage'da edi, endi markazlashgan)
CREATE TABLE IF NOT EXISTS romix_accessories (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT, qty NUMERIC DEFAULT 0,
    unit TEXT, spec TEXT, price NUMERIC DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS romix_accessories_history (
    id TEXT PRIMARY KEY, timestamp TEXT, action TEXT, details TEXT, operator TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS romix_qoldiq_profillar (
    id TEXT PRIMARY KEY, product_name TEXT, brand TEXT, series TEXT, color TEXT,
    profile_type TEXT, length NUMERIC DEFAULT 0, stock_quantity NUMERIC DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS romix_oynak (
    id TEXT PRIMARY KEY, brand TEXT, product_name TEXT, size TEXT,
    stock_quantity NUMERIC DEFAULT 0, unit TEXT, price NUMERIC DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now()
);`;

    window.openRomixBuhDbSetupModal = () => {
        const ta = document.getElementById('romix-buh-sql-text');
        if (ta) ta.value = ROMIX_BUH_SQL_SCRIPT;
        const modal = document.getElementById('romix-buh-db-modal');
        if (modal) modal.style.display = 'flex';
    };
    window.closeRomixBuhDbSetupModal = () => {
        const modal = document.getElementById('romix-buh-db-modal');
        if (modal) modal.style.display = 'none';
    };
    window.copyRomixBuhSql = () => {
        const ta = document.getElementById('romix-buh-sql-text');
        if (!ta) return;
        ta.select();
        document.execCommand('copy');
        window.showPremiumToast('Nusxalandi', 'SQL skript buferga nusxalandi.', true);
    };

    async function loadRomixBuhgalter() {
        bindRomixBuhPillTabs();
        bindRomixBuhForms();

        // "Umumiy" paneli sahifada birinchi (eng yuqori) ko'rinadi, shuning uchun uning
        // ma'lumotlari ham birinchi bo'lib yuklanadi — qolgan bo'limlar ortidan navbatda
        // kutib, foydalanuvchini bir necha soniya bekorga kutdirmasin.
        const steps = [
            ['updateBuhHeroKPIs', updateBuhHeroKPIs],
            ['renderBuhOverview', renderBuhOverview],
            ['renderBuhXodimlar', renderBuhXodimlar],
            ['renderBuhKunlikSotuv', () => renderBuhKunlikSotuv('today')],
            ['renderRomixBuhIshlabChiqarish', renderRomixBuhIshlabChiqarish],
            ['renderBuhTayyorMahsulot', renderBuhTayyorMahsulot],
            ['renderRomixBuhHarajatlar', renderRomixBuhHarajatlar],
            ['renderRomixBuhOmbor', renderRomixBuhOmbor],
            ['renderBuhTashqiQarz', renderBuhTashqiQarz]
        ];
        for (const [name, fn] of steps) {
            try {
                await fn();
            } catch (e) {
                console.error(`[DEBUG loadRomixBuhgalter] ${name} threw:`, e);
            }
        }
    }

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
    const defaultCatalog = [
        { id: 'prod-15-lasetti', name: '15 Lasetti', model: '15 Lasetti', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.491, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-15-maybach', name: '15 Maybach', model: '15 Maybach', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.500, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-15-ravon', name: '15 Ravon', model: '15 Ravon', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.375, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-15-cobalt', name: '15 Cobalt', model: '15 Cobalt', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.476, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-15-tosca', name: '15 Tosca', model: '15 Tosca', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.389, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-12-mers', name: '12 Mers', model: '12 Mers', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.254, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-12-maybach', name: '12 Maybach', model: '12 Maybach', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.254, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-14-lasetti', name: '14 Lasetti', model: '14 Lasetti', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.391, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-14-maybach', name: '14 Maybach', model: '14 Maybach', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.420, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-14-ravon', name: '14 Ravon', model: '14 Ravon', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.409, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-14-cobalt', name: '14 Cobalt', model: '14 Cobalt', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.468, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-14-tosca', name: '14 Tosca', model: '14 Tosca', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.352, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-14-espero', name: '14 Espero', model: '14 Espero', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.510, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-14-malibu', name: '14 Malibu', model: '14 Malibu', price: 280000, design: 'malibu', boxes: 0, rawPerUnit: 0.416, accPerUnit: 2, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-14-infinity', name: '14 Infinity', model: '14 Infinity', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.345, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-14-mers', name: '14 Mers', model: '14 Mers', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.427, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-13-lasetti', name: '13 Lasetti', model: '13 Lasetti', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.300, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-13-maybach', name: '13 Maybach', model: '13 Maybach', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.356, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-13-ravon', name: '13 Ravon', model: '13 Ravon', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.333, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-13-tosca', name: '13 Tosca', model: '13 Tosca', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.310, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-13-espero', name: '13 Espero', model: '13 Espero', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.417, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-13-malibu', name: '13 Malibu', model: '13 Malibu', price: 280000, design: 'malibu', boxes: 0, rawPerUnit: 0.323, accPerUnit: 2, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-13-infinity', name: '13 Infinity', model: '13 Infinity', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.249, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-13-mers', name: '13 Mers', model: '13 Mers', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.319, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-13-matiz', name: '13 Matiz', model: '13 Matiz', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.314, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 },
        { id: 'prod-13-spyder', name: '13 Spyder', model: '13 Spyder', price: 150000, design: 'gentra', boxes: 0, rawPerUnit: 0.306, accPerUnit: 1, packAccPerSet: 1, promoPerSet: 1 }
    ];

    let stored = localStorage.getItem('clapak_products_v4');
    let parsed = stored ? JSON.parse(stored) : [];
    
    defaultCatalog.forEach(d => {
        if (!parsed.some(p => p.model === d.model)) {
            parsed.push(d);
        }
    });

    window.clapakProducts = parsed;
    localStorage.setItem('clapak_products_v4', JSON.stringify(window.clapakProducts));

    // FIX DUPLICATE IDs IN CORRUPTED LOCAL STORAGE
    const uniqueIds = new Set();
    window.clapakProducts.forEach(p => {
        if (uniqueIds.has(p.id)) {
            p.id = p.id + '-' + Date.now() + Math.floor(Math.random() * 1000);
        }
        uniqueIds.add(p.id);
    });

    window.toggleSizeCategory = (key, headerEl, contentEl) => {
        if (!contentEl) return;
        const isCollapsed = contentEl.classList.toggle('collapsed');
        if (headerEl) headerEl.classList.toggle('collapsed', isCollapsed);
        localStorage.setItem(`cat_collapse_${key}`, isCollapsed ? 'true' : 'false');
    };

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

    window.renderAutoFinishedGoods = () => {
        // Map live session finishes grouped by model
        const liveFinishedMap = new Map();
        window.pipelineData.finished.forEach(item => {
            if (item.stage === 'finished' || item.stage.startsWith('finished')) {
                let model = item.model || 'Gentra';
                if (!/^\d+/.test(model)) {
                    if (model.includes('Gentra')) model = 'Gentra';
                    if (model.includes('Malibu')) model = 'Malibu-2';
                    if (model.includes('Cobalt')) model = 'Cobalt';
                }
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

        // Group clapak products by size prefix dynamically
        const groupedBySize = {};
        if (window.clapakProducts) {
            window.clapakProducts.forEach(p => {
                if (!p) return;
                const match = (p.model && typeof p.model === 'string') ? p.model.match(/^(\d+)/) : null;
                const size = match ? match[1] : 'Boshqa';
                if (!groupedBySize[size]) {
                    groupedBySize[size] = [];
                }
                groupedBySize[size].push(p);
            });
        }

        const sizesOrder = Object.keys(groupedBySize).sort((a, b) => {
            if (a === 'Boshqa') return 1;
            if (b === 'Boshqa') return -1;
            return parseInt(b) - parseInt(a);
        });

        // Render tabs
        const tabsContainer = document.getElementById('showroom-tabs-container');
        if (tabsContainer) {
            const activeTab = localStorage.getItem('active_showroom_tab') || 'all';
            window.activeShowroomTab = activeTab;

            let tabsHtml = `<button onclick="window.setShowroomTab('all')" class="showroom-tab-btn ${activeTab === 'all' ? 'active' : ''}">Barchasi</button>`;
            sizesOrder.forEach(size => {
                tabsHtml += `<button onclick="window.setShowroomTab('${size}')" class="showroom-tab-btn ${activeTab === size ? 'active' : ''}">${size}-Razmer</button>`;
            });
            tabsContainer.innerHTML = tabsHtml;
        }

        const showroomGrid = document.getElementById('fg-showroom-grid');
        if (showroomGrid) {
            // Remove vertical accordion wrappers, reset grid layout
            showroomGrid.removeAttribute('style');
            showroomGrid.style.display = 'grid';
            showroomGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(220px, 1fr))';
            showroomGrid.style.gap = '20px';
            showroomGrid.style.width = '100%';

            const activeTab = window.activeShowroomTab || 'all';

            // Filter products to display based on active tab
            let prodsToRender = [];
            if (activeTab === 'all') {
                // Flatten all groups in sorted size order
                sizesOrder.forEach(size => {
                    prodsToRender = prodsToRender.concat(groupedBySize[size] || []);
                });
            } else {
                prodsToRender = groupedBySize[activeTab] || [];
            }

            // Calculate totalBoxes and totalValuation for ALL products, not just filtered ones
            if (window.clapakProducts) {
                window.clapakProducts.forEach(p => {
                    if (!p) return;
                    const liveBoxes = liveFinishedMap.get(p.model) || 0;
                    const currentBoxes = (p.boxes || 0) + liveBoxes;
                    totalBoxes += currentBoxes;
                    totalValuation += currentBoxes * (p.price || 0);
                });
            }

            if (prodsToRender.length === 0) {
                showroomGrid.innerHTML = `<div style="text-align: center; color: rgba(255,255,255,0.3); padding: 40px; grid-column: 1/-1;">Tanlangan razmerda mahsulotlar mavjud emas.</div>`;
            } else {
                let html = prodsToRender.map(p => {
                    const liveBoxes = liveFinishedMap.get(p.model) || 0;
                    const currentBoxes = (p.boxes || 0) + liveBoxes;
                    const currentUnits = currentBoxes * 4;
                    const totalValue = currentBoxes * (p.price || 0);

                    const imageSrc = p.design === 'malibu' 
                        ? malibuCalpak 
                        : gentraCalpak;

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
                showroomGrid.innerHTML = html;
            }
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

    window.setShowroomTab = (tab) => {
        localStorage.setItem('active_showroom_tab', tab);
        window.activeShowroomTab = tab;
        window.renderAutoFinishedGoods();
    };

    window.loadAutoFinishedGoods = async () => {
        // Fetch latest today's production from Supabase to ensure data is synchronized in real-time
        await refreshAutoProduction();
        window.renderAutoFinishedGoods();
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
                ? malibuCalpak 
                : gentraCalpak;
        }

        localStorage.setItem('clapak_products_v4', JSON.stringify(window.clapakProducts));
        window.closeEditProductModal();
        window.loadAutoFinishedGoods();
        window.showPremiumToast("Tovar Yangilandi", `"${name}" tovar sozlamalari saqlandi.`, true);
    };

    window.sendModalProductToSales = () => {
        if (!window.editingProductId) return;

        const name = document.getElementById('modal-prod-name').value.trim();
        const price = parseInt(document.getElementById('modal-prod-price').value);

        if (!name || isNaN(price) || price <= 0) {
            window.showPremiumToast("Xatolik", "Iltimos, barcha maydonlarni to'g'ri to'ldiring!", false);
            return;
        }

        const p = window.clapakProducts.find(x => x.id === window.editingProductId);
        if (p) {
            p.name = name;
            p.price = price;
            p.priceConfirmed = true;
            p.image = p.design === 'malibu' 
                ? malibuCalpak 
                : gentraCalpak;
        }

        localStorage.setItem('clapak_products_v4', JSON.stringify(window.clapakProducts));
        
        // Immediately sync to Sales Department!
        window.sendToSalesDepartment();

        window.closeEditProductModal();
        window.loadAutoFinishedGoods();
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
        const rawKg = (rawPerUnit * 80).toFixed(1); // 1 cart = 80 pieces
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
        const rawKg = rawPerUnit * 80;
        const totalRawCost = rawKg * rawPricePerKg;
        const totalPaintCost = paintPricePerUnit * 80;
        
        // Update Breakdown UI Elements
        document.getElementById('cost-val-raw').textContent = totalRawCost.toLocaleString() + ' UZS';
        document.getElementById('cost-val-stanok').textContent = stanokPrice.toLocaleString() + ' UZS';
        document.getElementById('cost-val-paint').textContent = totalPaintCost.toLocaleString() + ' UZS';
        
        // Calculate Totals
        const totalCartCost = totalRawCost + totalPaintCost + stanokPrice;
        document.getElementById('cost-val-total-cart').textContent = totalCartCost.toLocaleString() + ' UZS';
        
        // 80 pieces = 20 komplekt (sets)
        const costPerKomplekt = totalCartCost / 20; 
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
        
        const rawKg = (p.rawPerUnit || 0.6) * 80;
        const totalCartCost = (rawKg * rawPricePerKg) + (paintPricePerUnit * 80) + stanokPrice;
        const finalSalePrice = Math.round((totalCartCost / 20) + profitPerKomplekt);
        
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
                if (!/^\d+/.test(model)) {
                    if (model.includes('Gentra')) model = 'Gentra';
                    if (model.includes('Malibu')) model = 'Malibu-2';
                    if (model.includes('Cobalt')) model = 'Cobalt';
                }
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
                        ? malibuCalpak 
                        : gentraCalpak;

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
                .or(`status.eq.zakaz,stage.neq.finished,last_update.gte.${startOfDay},start_time.gte.${startOfDay}`);

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
                window.pipelineData.kraskaRooms = [];
                window.pipelineData.kraskaQueue = [];
                window.pipelineData.sushilka = [];
                window.pipelineData.packaging = 0;
                window.pipelineData.finished = [];

                production.forEach(p => {
                    const stagePart = p.stage ? p.stage.split('-')[0] : null;
                    const cartNum = p.stage && p.stage.includes('-') ? p.stage.split('-')[1] : null;

                    let orderCreatedAt = p.created_at || p.last_update || '';
                    try {
                        if (p.operator && p.operator.startsWith('{')) {
                            const parsed = JSON.parse(p.operator);
                            if (parsed.createdAt) orderCreatedAt = parsed.createdAt;
                        }
                    } catch(e) {}

                    const item = {
                        id: p.id,
                        model: p.model,
                        qty: p.quantity || 36,
                        cart: cartNum || '',
                        operator: p.operator || 'Noma\'lum',
                        startTime: p.start_time || p.last_update || '',
                        createdAt: orderCreatedAt,
                        time: p.end_time 
                            ? new Date(p.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : (p.last_update ? new Date(p.last_update).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--')
                    };

                    if (p.status === 'zakaz' || stagePart === 'zakaz') {
                        window.pipelineData.zakazlar.push(item);
                    } else if (stagePart === 'sovutish' || stagePart === 'xom_ombor') {
                        window.pipelineData.sovutish.push(item);
                    } else if (stagePart === 'kraska') {
                        window.pipelineData.kraska.push(item);
                    } else if (stagePart === 'kraska_queue') {
                        window.pipelineData.kraskaQueue.push(item);
                    } else if (stagePart && stagePart.endsWith('_room')) {
                        window.pipelineData.kraskaRooms.push({
                            id: p.id,
                            model: p.model,
                            qty: p.quantity || 0,
                            stage: p.stage,
                            operator: p.operator || 'Noma\'lum'
                        });
                    } else if (stagePart === 'sushilka' || stagePart === 'cooling' || stagePart === 'halqa' || stagePart === 'ready_timer') {
                        item.subStage = stagePart;
                        const elapsedSecs = p.last_update 
                            ? Math.floor((new Date() - new Date(p.last_update)) / 1000) 
                            : 0;
                        
                        if (stagePart === 'sushilka') {
                            item.remainingTime = Math.max(0, 240 * 60 - elapsedSecs);
                        } else if (stagePart === 'cooling') {
                            if (elapsedSecs >= 60 * 60) {
                                // auto transition in DB to halqa
                                item.subStage = 'halqa';
                                item.remainingTime = 0;
                                p.stage = item.cart ? `halqa-${item.cart}` : 'halqa';
                                supabase.from('clapak_production').update({ stage: p.stage, last_update: new Date().toISOString() }).eq('id', p.id).then();
                            } else {
                                item.remainingTime = Math.max(0, 60 * 60 - elapsedSecs);
                            }
                        } else if (stagePart === 'ready_timer') {
                            if (elapsedSecs >= 60 * 60) {
                                // auto transition in DB to packaging
                                p.stage = item.cart ? `packaging-${item.cart}-0` : 'packaging';
                                supabase.from('clapak_production').update({ stage: p.stage, status: 'PACKAGING', last_update: new Date().toISOString() }).eq('id', p.id).then();
                                return; // Skip pushing to sushilka pipeline as it goes to packaging
                            } else {
                                item.remainingTime = Math.max(0, 60 * 60 - elapsedSecs);
                            }
                        } else {
                            item.remainingTime = 0;
                        }
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
            let accPerUnit = 1;
            let packAccPerSet = 1;
            let promoPerSet = 1;
            let orderCreatedAt = z.createdAt;

            try {
                if (z.operator && z.operator.startsWith('{')) {
                    const parsed = JSON.parse(z.operator);
                    clientInfo = parsed.isOmbor ? 'Ombor Zaxirasi' : (parsed.clientName || clientInfo);
                    deadlineInfo = parsed.deadline || deadlineInfo;
                    
                    if (parsed.rawNeeded !== undefined) rawNeeded = parsed.rawNeeded;
                    if (parsed.accPerUnit !== undefined) accPerUnit = parseFloat(parsed.accPerUnit);
                    if (parsed.packAccPerSet !== undefined) packAccPerSet = parseFloat(parsed.packAccPerSet);
                    if (parsed.promoPerSet !== undefined) promoPerSet = parseFloat(parsed.promoPerSet);
                    if (parsed.createdAt !== undefined) orderCreatedAt = parsed.createdAt;
                }
            } catch(e) {}

            const ringsNeeded = Math.round(z.qty * accPerUnit);
            const packetsNeeded = Math.round(Math.floor(z.qty / 4) * packAccPerSet);
            const promoNeeded = Math.round(Math.floor(z.qty / 4) * promoPerSet);

            let createdTimeStr = '--:--';
            if (orderCreatedAt) {
                const d = new Date(orderCreatedAt);
                const day = d.getDate().toString().padStart(2, '0');
                const month = (d.getMonth() + 1).toString().padStart(2, '0');
                const hours = d.getHours().toString().padStart(2, '0');
                const minutes = d.getMinutes().toString().padStart(2, '0');
                createdTimeStr = `${day}.${month} ${hours}:${minutes}`;
            }

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
                        <div style="display:flex; flex-direction:column; gap:4px; font-size:0.75rem; color:rgba(255,255,255,0.4); margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                            <div style="display:flex; justify-content:space-between;">
                                <span>Ochilgan vaqt:</span>
                                <strong style="color:#00ff88;">${createdTimeStr}</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between;">
                                <span>Miqdor / Muddat:</span>
                                <strong style="color:#fff;">${z.qty} dona / ${deadlineInfo}</strong>
                            </div>
                        </div>
                        
                        <!-- 📦 MATERIALLAR SARFI -->
                        <div style="background:rgba(255,255,255,0.02); padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.05); margin-bottom:15px; font-size:0.7rem; display:flex; flex-direction:column; gap:4px;">
                            <div style="font-weight:700; color:rgba(255,255,255,0.6); margin-bottom:2px; text-transform:uppercase; font-size:0.6rem; letter-spacing:0.5px;">📦 Kerakli materiallar sarfi:</div>
                            <div style="display:flex; justify-content:space-between;">
                                <span>⚡ Xom-ashyo:</span>
                                <strong style="color:#ba00ff;">${rawNeeded} kg</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between;">
                                <span>⭕ Halqalar (orqasiga):</span>
                                <strong style="color:#00d2ff;">${ringsNeeded} dona</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between;">
                                <span>📦 Qadoqlash paketi:</span>
                                <strong style="color:#fabb18;">${packetsNeeded} dona</strong>
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
                                <option value="ST-1">ST-1 (BS400-III)</option>
                                <option value="ST-2">ST-2 (BS500-III)</option>
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
                    <span class="model-tag">${m.id === 'ST-1' ? 'ST-1 (BS400-III)' : 'ST-2 (BS500-III)'}</span>
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
        const qty = 80;
        window.pipelineData.sovutish.push({ id: Date.now().toString(), model: model, qty: qty, cart: '' });
        renderSovutish();
        updatePipelineStats();
    };

    function renderSovutish() {
        const list = document.getElementById('sovutish-list');
        if (!list) return;

        // Calculate total warehouse quantity and sets
        const totalQty = window.pipelineData.sovutish.reduce((sum, item) => sum + (item.qty || 0), 0);
        const totalSets = Math.floor(totalQty / 4);

        // Make the permanent Raw Warehouse Card HTML
        const roomCardHtml = `
            <div class="elite-prod-card" style="border-left: 4px solid #00f2ff; margin-bottom: 20px; background: linear-gradient(135deg, rgba(0,242,255,0.04), rgba(0,186,255,0.01)); cursor: pointer;" onclick="window.showXomOmborDetails()">
                <div class="card-header-v3">
                    <span class="model-tag" style="color:#00f2ff; background:rgba(0,242,255,0.05); font-weight:800; font-size:0.6rem; letter-spacing:0.5px;">ZAXIRA HOLATI</span>
                    <div class="status-pill-v3" style="color:#00f2ff; font-weight:800; font-size:0.7rem;">
                        <div class="pulse-dot" style="background:#00f2ff; box-shadow:0 0 10px #00f2ff;"></div> ${totalQty > 0 ? 'MAHSULOT BOR' : 'BO\'SH'}
                    </div>
                </div>
                <div class="prod-model-v3" style="font-size:1.25rem; font-weight:900; color:#fff; letter-spacing:-0.5px; margin: 10px 0;">XOM MAHSULOT OMBORI</div>
                <div class="progress-container-v3" style="margin-bottom:15px;">
                    <div class="track-info" style="display:flex; justify-content:space-between; font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:700; margin-bottom:6px;">
                        <span>JAMI KARKAS</span>
                        <span style="color:#00f2ff; font-weight:800;">${totalQty} dona (${totalSets} set)</span>
                    </div>
                </div>
                <button class="action-btn-v3" style="border-color:#00f2ff; color:#00f2ff; width:100%;" 
                    onclick="event.stopPropagation(); window.showXomOmborDetails()">OMBORNI KO'RISH ➜</button>
            </div>
        `;

        list.innerHTML = roomCardHtml;
        
        // Also update details modal if it's currently open
        const modal = document.getElementById('xomOmborDetailsModal');
        if (modal && modal.style.display === 'flex') {
            renderXomOmborDetailsModal();
        }
    }

    window.showXomOmborDetails = () => {
        const modal = document.getElementById('xomOmborDetailsModal');
        if (!modal) return;
        modal.style.display = 'flex';
        renderXomOmborDetailsModal();
    };

    window.setRawWarehouseTab = (tab) => {
        localStorage.setItem('active_raw_warehouse_tab', tab);
        window.activeRawWarehouseTab = tab;
        renderXomOmborDetailsModal();
    };

    function renderXomOmborDetailsModal() {
        const grid = document.getElementById('xom-ombor-grid');
        if (!grid) return;

        // Group window.pipelineData.sovutish by model
        const grouped = {};
        
        // Initialize grouped with 0 for all master products
        if (window.clapakProducts && Array.isArray(window.clapakProducts)) {
            window.clapakProducts.forEach(p => {
                if (p && p.model) {
                    grouped[p.model] = { model: p.model, qty: 0, count: 0 };
                }
            });
        }

        window.pipelineData.sovutish.forEach(item => {
            const m = item.model;
            if (!grouped[m]) {
                grouped[m] = { model: m, qty: 0, count: 0 };
            }
            grouped[m].qty += (item.qty || 0);
            grouped[m].count += 1;
        });

        const listItems = Object.values(grouped);
        const totalQty = listItems.reduce((sum, x) => sum + x.qty, 0);
        const totalSets = Math.floor(totalQty / 4);

        // Update stats
        const qtyEl = document.getElementById('xom-cd-total-qty');
        if (qtyEl) qtyEl.textContent = `${totalQty} dona`;
        const setsEl = document.getElementById('xom-cd-total-sets');
        if (setsEl) setsEl.textContent = `${totalSets} komplekt`;

        const tabsContainer = document.getElementById('raw-warehouse-tabs-container');

        if (listItems.length === 0) {
            grid.removeAttribute('style');
            grid.innerHTML = `<div style="text-align:center; color:rgba(255,255,255,0.3); padding:40px;">Xom mahsulot omborida karkaslar mavjud emas.</div>`;
            if (tabsContainer) tabsContainer.innerHTML = '';
            return;
        }

        // Group listItems by size prefix dynamically
        const groupedBySize = {};

        listItems.forEach(item => {
            if (!item) return;
            const match = (item.model && typeof item.model === 'string') ? item.model.match(/^(\d+)/) : null;
            const size = match ? match[1] : 'Boshqa';
            if (!groupedBySize[size]) {
                groupedBySize[size] = [];
            }
            groupedBySize[size].push(item);
        });

        function getProductWeightGrams(modelName) {
            if (!modelName || typeof modelName !== 'string') return 380;
            // Find in window.clapakProducts
            const prod = window.clapakProducts ? window.clapakProducts.find(p => p && p.model === modelName) : null;
            if (prod && prod.rawPerUnit) {
                return Math.round(prod.rawPerUnit * 1000);
            }
            // Hardcoded weights fallback from user sheet
            const match = modelName.match(/^(\d+)\s+(.+)$/i);
            if (match) {
                const size = match[1];
                const name = match[2].toLowerCase().replace(/\s+/g, '');
                
                const weights = {
                    '15': { lasetti: 491, maybach: 500, ravon: 375, cobalt: 476, tosca: 389 },
                    '12': { mercedes: 254, mers: 254, maybach: 254 },
                    '14': { lasetti: 391, maybach: 420, ravon: 409, cobalt: 468, tosca: 352, espero: 510, malibu: 416, infinity: 345, mercedes: 427, mers: 427 },
                    '13': { lasetti: 300, maybach: 356, ravon: 333, tosca: 310, espero: 417, malibu: 323, infinity: 249, mercedes: 319, mers: 319, matiz: 314, spyder: 306, spider: 306 }
                };
                
                if (weights[size]) {
                    for (const key in weights[size]) {
                        if (name.includes(key)) {
                            return weights[size][key];
                        }
                    }
                }
            }
            return 380; // default 380g
        }

        const sizesOrder = Object.keys(groupedBySize).sort((a, b) => {
            if (a === 'Boshqa') return 1;
            if (b === 'Boshqa') return -1;
            return parseInt(b) - parseInt(a);
        });

        // Render tabs
        if (tabsContainer) {
            const activeTab = localStorage.getItem('active_raw_warehouse_tab') || 'all';
            window.activeRawWarehouseTab = activeTab;

            let tabsHtml = `<button onclick="window.setRawWarehouseTab('all')" class="raw-tab-btn ${activeTab === 'all' ? 'active' : ''}">Barchasi</button>`;
            sizesOrder.forEach(size => {
                tabsHtml += `<button onclick="window.setRawWarehouseTab('${size}')" class="raw-tab-btn ${activeTab === size ? 'active' : ''}">${size}-Razmer</button>`;
            });
            tabsContainer.innerHTML = tabsHtml;
        }

        // Setup grid container layout
        grid.removeAttribute('style');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        grid.style.gap = '16px';
        grid.style.marginHeight = '20px';
        grid.style.maxHeight = '480px';
        grid.style.overflowY = 'auto';
        grid.style.paddingRight = '5px';
        grid.style.fontFamily = "'Inter', sans-serif";

        const activeTab = window.activeRawWarehouseTab || 'all';

        // Filter items based on active tab
        let prodsToRender = [];
        if (activeTab === 'all') {
            sizesOrder.forEach(size => {
                prodsToRender = prodsToRender.concat(groupedBySize[size] || []);
            });
        } else {
            prodsToRender = groupedBySize[activeTab] || [];
        }

        if (prodsToRender.length === 0) {
            grid.innerHTML = `<div style="text-align:center; color:rgba(255,255,255,0.3); padding:40px; grid-column:1/-1;">Tanlangan razmerda mahsulotlar mavjud emas.</div>`;
            return;
        }

        grid.innerHTML = prodsToRender.map(item => {
            const weightGrams = getProductWeightGrams(item.model);
            const totalWeightKg = ((weightGrams * item.qty) / 1000).toFixed(2);
            const isZero = item.qty === 0;

            const cardBg = isZero 
                ? 'rgba(255, 255, 255, 0.015)' 
                : 'linear-gradient(135deg, rgba(0, 242, 255, 0.06), rgba(186, 0, 255, 0.02))';
            const cardBorder = isZero
                ? '1px solid rgba(255, 255, 255, 0.05)'
                : '1px solid rgba(0, 242, 255, 0.25)';
            const badgeStyle = isZero
                ? 'background:rgba(255, 255, 255, 0.04); color:rgba(255, 255, 255, 0.3);'
                : 'background:rgba(0, 242, 255, 0.1); color:#00f2ff;';
            const qtyColor = isZero
                ? 'rgba(255, 255, 255, 0.25)'
                : '#00ff88';

            return `
                <div style="background:${cardBg}; border:${cardBorder}; padding:20px; border-radius:18px; display:flex; flex-direction:column; justify-content:space-between; min-height:140px; transition: all 0.3s ease;">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <span style="font-size:0.75rem; font-weight:800; ${badgeStyle} padding:4px 10px; border-radius:8px;">MODEL</span>
                            <span style="font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:600;">Partiyalar: ${item.count} ta</span>
                        </div>
                        <div style="font-size:1.25rem; font-weight:900; color:${isZero ? 'rgba(255, 255, 255, 0.5)' : '#fff'}; margin-bottom:6px;">${item.model}</div>
                        <div style="font-size:0.75rem; color:rgba(255,255,255,0.5); font-weight:600; display:flex; justify-content:space-between;">
                            <span>Og'irligi (1 dona):</span>
                            <strong style="color: ${isZero ? 'rgba(255, 255, 255, 0.3)' : '#fabb18'};">${weightGrams} gram</strong>
                        </div>
                        <div style="font-size:0.75rem; color:rgba(255,255,255,0.5); font-weight:600; display:flex; justify-content:space-between; margin-top:2px;">
                            <span>Umumiy og'irligi:</span>
                            <strong style="color: ${isZero ? 'rgba(255, 255, 255, 0.3)' : '#ba00ff'};">${totalWeightKg} kg</strong>
                        </div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:baseline; border-top:1px dashed rgba(255,255,255,0.08); padding-top:10px; margin-top:10px;">
                        <span style="font-size:0.7rem; color:rgba(255,255,255,0.4);">JAMI MIQDOR:</span>
                        <strong style="font-size:1.2rem; color:${qtyColor}; font-weight:900;">${item.qty} dona <span style="font-size:0.75rem; color:rgba(255,255,255,0.4); font-weight:600;">(${Math.floor(item.qty / 4)} set)</span></strong>
                    </div>
                    ${isZero ? '' : `
                    <button class="action-btn-v3" style="margin-top: 12px; border-color: #ba00ff; color: #ba00ff; font-size: 0.75rem; padding: 8px; border-radius: 10px; cursor: pointer; width: 100%;" 
                        onmouseover="this.style.background='#ba00ff';this.style.color='#000'" 
                        onmouseout="this.style.background='transparent';this.style.color='#ba00ff'"
                        onclick="window.promptSendToKraskaQueue('${item.model}', ${item.qty})">
                        Bo'yashga yuborish ➔
                    </button>
                    `}
                </div>
            `;
        }).join('');
    }

    window.promptSendToKraskaQueue = (model, maxQty) => {
        const modal = document.getElementById('sendToQueueModal');
        if (!modal) return;
        
        document.getElementById('sq-modal-title').textContent = `Bo'yashga yuborish: ${model}`;
        document.getElementById('sq-modal-subtitle').textContent = `Maksimal miqdor: ${maxQty} dona`;
        
        const input = document.getElementById('sq-quantity-input');
        input.value = maxQty;
        input.max = maxQty;
        
        const confirmBtn = document.getElementById('sq-confirm-btn');
        confirmBtn.onclick = async () => {
            const qty = parseInt(input.value);
            if (isNaN(qty) || qty <= 0 || qty > maxQty) {
                alert(`Iltimos, 1 dan ${maxQty} gacha bo'lgan to'g'ri son kiriting!`);
                return;
            }
            
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Yuborilmoqda...';
            
            try {
                // Fetch all raw warehouse records for this model (sovutish or xom_ombor stages)
                const startOfDay = `${new Date().toISOString().split('T')[0]}T00:00:00.000Z`;
                const { data: records, error: fetchErr } = await supabase
                    .from('clapak_production')
                    .select('*')
                    .eq('model', model)
                    .or('stage.like.sovutish%,stage.eq.xom_ombor')
                    .order('start_time', { ascending: true });
                
                if (fetchErr) throw fetchErr;
                
                let remainingToDeduct = qty;
                const updates = [];
                const deletes = [];
                
                for (const rec of records) {
                    if (remainingToDeduct <= 0) break;
                    const recQty = rec.quantity || 0;
                    if (recQty <= remainingToDeduct) {
                        deletes.push(rec.id);
                        remainingToDeduct -= recQty;
                    } else {
                        updates.push({ id: rec.id, quantity: recQty - remainingToDeduct });
                        remainingToDeduct = 0;
                    }
                }
                
                // Execute DB modifications
                if (deletes.length > 0) {
                    const { error: delErr } = await supabase
                        .from('clapak_production')
                        .delete()
                        .in('id', deletes);
                    if (delErr) throw delErr;
                }
                
                for (const upd of updates) {
                    const { error: updErr } = await supabase
                        .from('clapak_production')
                        .update({ quantity: upd.quantity, last_update: new Date().toISOString() })
                        .eq('id', upd.id);
                    if (updErr) throw updErr;
                }
                
                // Insert into kraska_queue stage
                const { error: insErr } = await supabase
                    .from('clapak_production')
                    .insert([{
                        model: model,
                        quantity: qty,
                        stage: 'kraska_queue',
                        status: 'DONE',
                        start_time: new Date().toISOString(),
                        last_update: new Date().toISOString(),
                        operator: 'Rahbar'
                    }]);
                    
                if (insErr) throw insErr;
                
                modal.style.display = 'none';
                
                // Refresh dashboard immediately
                await refreshAutoProduction();
                
                // If Raw Warehouse Modal is open, refresh its contents
                const xomModal = document.getElementById('xomOmborDetailsModal');
                if (xomModal && xomModal.style.display === 'flex') {
                    renderXomOmborDetailsModal();
                }
            } catch (err) {
                console.error("Error sending to painting queue:", err);
                alert("Navbatga yuborishda xatolik yuz berdi: " + err.message);
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Yuborish ➔';
            }
        };
        
        modal.style.display = 'flex';
    };

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

    // ========== STANOK TEXNIK SPETSIFIKATSIYALARI ==========
    const MACHINE_SPECS = {
        'ST-1': {
            brand: 'BORCHE',
            manufacturer: 'Borch Machinery Co., Ltd',
            machineModel: 'BS400-III',
            machineCode: 'GB/T25156-2010',
            type: 'Plastics Injection Moulding Machine',
            clampingForce: '4000 KN',
            shotWeight: '1890 g / 66.8 oz',
            generalPower: '69.5 kW',
            voltage: '380V',
            frequency: '50 Hz',
            serialNumber: '2207U095',
            productionDate: '2021.11',
            location: 'Guangzhou, China'
        },
        'ST-2': {
            brand: 'BORCHE',
            manufacturer: 'Borch Machinery Co., Ltd',
            machineModel: 'BS500-III',
            machineCode: 'GB/T25156-2010',
            type: 'Plastics Injection Moulding Machine',
            clampingForce: '5000 KN',
            shotWeight: '2267 g / 80.1 oz',
            generalPower: '83.7 kW',
            voltage: '380V',
            frequency: '50 Hz',
            serialNumber: '2208U069',
            productionDate: '2021.11',
            location: 'Guangzhou, China'
        }
    };

    function renderMachineSpecs(machineId) {
        const container = document.getElementById('md-tech-specs');
        if (!container) return;
        const spec = MACHINE_SPECS[machineId];
        if (!spec) { container.innerHTML = ''; return; }

        container.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:18px;">
                <div style="font-size:1.8rem;">🏭</div>
                <div>
                    <div style="font-size:1.3rem; font-weight:900; color:#fff; letter-spacing:-0.5px;">${spec.brand}</div>
                    <div style="font-size:0.65rem; color:rgba(255,255,255,0.35); font-weight:600;">${spec.manufacturer}</div>
                </div>
                <div style="margin-left:auto; background:rgba(0,186,255,0.08); border:1px solid rgba(0,186,255,0.2); padding:5px 12px; border-radius:10px;">
                    <span style="font-size:0.75rem; font-weight:900; color:#00baff; letter-spacing:0.5px;">${spec.machineModel}</span>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                ${[
                    ['⚡', 'Siqish Kuchi', spec.clampingForce, '#fabb18'],
                    ['💉', 'Shot Weight', spec.shotWeight, '#ba00ff'],
                    ['🔌', 'Umumiy Quvvat', spec.generalPower, '#00ff88'],
                    ['⚡', 'Kuchlanish', spec.voltage + ' / ' + spec.frequency, '#00baff'],
                    ['🔢', 'Seriya Raqami', spec.serialNumber, 'rgba(255,255,255,0.7)'],
                    ['📅', 'Ishlab Chiqarilgan', spec.productionDate, 'rgba(255,255,255,0.7)']
                ].map(([icon, label, value, color]) => `
                    <div style="display:flex; align-items:center; gap:10px; padding:10px 14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:14px;">
                        <span style="font-size:1rem;">${icon}</span>
                        <div>
                            <div style="font-size:0.55rem; font-weight:800; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:1px;">${label}</div>
                            <div style="font-size:0.85rem; font-weight:800; color:${color};">${value}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top:12px; padding:10px 14px; background:rgba(255,255,255,0.015); border:1px solid rgba(255,255,255,0.04); border-radius:12px; display:flex; align-items:center; gap:8px;">
                <span style="font-size:0.8rem;">📍</span>
                <span style="font-size:0.65rem; color:rgba(255,255,255,0.3); font-weight:600;">${spec.type} • ${spec.location}</span>
            </div>
        `;
    }

    window.showMachineDetails = async (machineId) => {
        const modal = document.getElementById('machineDetailsModal');
        if (!modal) return;
        document.getElementById('md-title').textContent = machineId === 'ST-1' ? 'ST-1 (BS400-III)' : 'ST-2 (BS500-III)';
        renderMachineSpecs(machineId);
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

        const productionRows = data ? data.filter(row => row.status !== 'REFUEL') : [];

        if (productionRows && productionRows.length > 0) {
            startTime = new Date(productionRows[0].start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            operator = productionRows[0].operator;

            productionRows.forEach(row => {
                totalQty += (row.quantity || 0);
                totalBrak += (row.brak || 0);
                totalEnergy += (row.energy || 0);
                totalRaw += (row.raw_material || 0);
            });

            const firstStart = new Date(productionRows[0].start_time);
            const lastData = productionRows[productionRows.length - 1];
            const lastTime = lastData.status === 'ACTIVE' ? new Date() : new Date(lastData.end_time || lastData.last_update || lastData.start_time);
            const diffMs = lastTime - firstStart;
            const diffH = Math.floor(diffMs / 3600000);
            const diffM = Math.floor((diffMs % 3600000) / 60000);
            durationStr = `${diffH} soat ${diffM} daqiqa ishladi`;
        }

        // --- Refuel Tracking Calculations ---
        let qtySinceRefuel = 0;
        let rawSinceRefuel = 0;
        let lastRefuelQty = 0;
        let lastRefuelTimeStr = '--:--';
        let refuelRemaining = 0;

        const { data: allMachineData } = await supabase
            .from('clapak_production')
            .select('status, raw_material, quantity, start_time, operator')
            .eq('machine', machineId)
            .order('start_time', { ascending: false });

        if (allMachineData) {
            let totalRefuel = 0;
            let totalUsed = 0;
            const refuelsOnly = [];

            allMachineData.forEach(r => {
                if (r.status === 'REFUEL') {
                    totalRefuel += (r.raw_material || 0);
                    refuelsOnly.push(r);
                } else {
                    totalUsed += (r.raw_material || 0);
                }
            });

            refuelRemaining = Math.max(0, parseFloat((totalRefuel - totalUsed).toFixed(1)));

            if (refuelsOnly.length > 0) {
                const latestRefuel = refuelsOnly[0];
                lastRefuelQty = latestRefuel.raw_material || 0;
                const refuelTime = latestRefuel.start_time;
                lastRefuelTimeStr = new Date(refuelTime).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

                // Calculate produced and used ONLY since the last refuel (for the last refuel stats UI)
                allMachineData.forEach(r => {
                    if (r.status !== 'REFUEL' && new Date(r.start_time) >= new Date(refuelTime)) {
                        // We need quantity which isn't in our allMachineData select above, let's just use raw_material for now
                        // Wait, we need to select 'quantity' as well in allMachineData
                        qtySinceRefuel += (r.quantity || 0);
                        rawSinceRefuel += (r.raw_material || 0);
                    }
                });
            }

            // Store refuel history for UI
            window.currentMachineRefuels = refuelsOnly;
        }

        window.currentMachineProduction = productionRows || [];

        // Dynamic rendering of last 3 produced products
        const lastProductsContainer = document.getElementById('md-last-products');
        if (lastProductsContainer) {
            if (productionRows && productionRows.length > 0) {
                const sortedProd = [...productionRows].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
                const top3 = sortedProd.slice(0, 3);
                
                lastProductsContainer.innerHTML = top3.map(row => {
                    const startTimeStr = row.start_time ? new Date(row.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
                    let createdTimeStr = '--:--';
                    if (row.created_at) {
                        const d = new Date(row.created_at);
                        createdTimeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
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
                                <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:4px;">
                                    <span style="font-size:0.7rem; color:rgba(255,255,255,0.4); font-weight:600;">🔢 Miqdor: <strong style="color:rgba(255,255,255,0.7);">${qty} dona</strong></span>
                                    <span style="font-size:0.7rem; color:rgba(255,255,255,0.4); font-weight:600;">⚖️ Xom-ashyo: <strong style="color:rgba(255,255,255,0.7);">${raw} kg</strong></span>
                                    ${brak > 0 ? `<span style="font-size:0.7rem; color:#ff4d4f; font-weight:600;">🚨 Brak: <strong>${brak} dona</strong></span>` : ''}
                                </div>
                                <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; font-size:0.68rem; color:rgba(255,255,255,0.35);">
                                    <span>📅 Ochilgan: <strong style="color:#00ff88;">${createdTimeStr}</strong></span>
                                    <span>⏱ Stanok: <strong style="color:#00baff;">${startTimeStr}</strong></span>
                                </div>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px; flex-shrink:0;">
                                <div style="text-align:right;">
                                    <div style="font-size:0.7rem; color:${statusColor}; font-weight:700;">${startTimeStr}</div>
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
            energyRate: MACHINE_SPECS[machineId] ? MACHINE_SPECS[machineId].generalPower : (machineId === 'ST-1' ? "69.5 kW" : "83.7 kW"),
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

        safeSet('md-refuel-qty', lastRefuelQty > 0 ? `${lastRefuelQty} kg` : '-- kg');
        safeSet('md-refuel-time', lastRefuelTimeStr);
        safeSet('md-refuel-prod-qty', lastRefuelQty > 0 ? `${qtySinceRefuel} dona` : '-- dona');
        safeSet('md-refuel-prod-raw', lastRefuelQty > 0 ? `${rawSinceRefuel.toFixed(1)} kg sarflandi` : '-- kg sarflandi');
        safeSet('md-refuel-rem', `${refuelRemaining} kg`);

        // Render refuel history
        const refuelHistoryContainer = document.getElementById('md-refuel-history');
        if (refuelHistoryContainer) {
            if (window.currentMachineRefuels && window.currentMachineRefuels.length > 0) {
                refuelHistoryContainer.innerHTML = window.currentMachineRefuels.map((r, i) => {
                    const rTime = new Date(r.start_time).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                    const isLast = i === window.currentMachineRefuels.length - 1;
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.03); border-radius:10px; margin-bottom:${isLast ? '0' : '6px'};">
                            <div>
                                <div style="font-size:0.85rem; font-weight:800; color:#fff;">${r.raw_material} kg</div>
                                <div style="font-size:0.6rem; color:rgba(255,255,255,0.4);">${rTime} | ${r.operator || 'Admin'}</div>
                            </div>
                            <div style="font-size:0.7rem; color:#00ff88; font-weight:700;">+ YUKLANDI</div>
                        </div>
                    `;
                }).join('');
            } else {
                refuelHistoryContainer.innerHTML = `<div style="text-align:center; padding:10px; color:rgba(255,255,255,0.3); font-size:0.75rem;">Zapravka tarixi yo'q</div>`;
            }
        }

        // Define showProductDetail handler
        window.showProductDetail = (productId) => {
            const prod = (window.currentMachineProduction || []).find(p => p.id.toString() === productId.toString());
            if (!prod) {
                alert("Mahsulot ma'lumoti topilmadi!");
                return;
            }

            const modal = document.getElementById('mdProductDetailModal');
            if (!modal) return;

            const setElText = (id, text) => {
                const el = document.getElementById(id);
                if (el) el.textContent = text;
            };

            setElText('pd-model-name', prod.model || 'Noma\'lum Mahsulot');
            
            const isReady = prod.status !== 'ACTIVE';
            const statusEl = document.getElementById('pd-status');
            if (statusEl) {
                statusEl.textContent = isReady ? 'TAYYOR' : 'SOVUTILMOQDA';
                statusEl.style.color = isReady ? '#00ff88' : '#00baff';
            }
            const badgeEl = document.getElementById('pd-status-badge');
            if (badgeEl) {
                badgeEl.style.background = isReady ? 'rgba(0,255,136,0.1)' : 'rgba(0,186,255,0.1)';
                badgeEl.style.borderColor = isReady ? 'rgba(0,255,136,0.2)' : 'rgba(0,186,255,0.2)';
            }
            const dotEl = document.getElementById('pd-status-dot');
            if (dotEl) {
                dotEl.style.background = isReady ? '#00ff88' : '#00baff';
                dotEl.style.boxShadow = isReady ? '0 0 8px #00ff88' : '0 0 8px #00baff';
            }

            setElText('pd-qty', (prod.quantity || 0).toLocaleString());
            setElText('pd-raw', (prod.raw_material || 0).toLocaleString() + ' kg');
            setElText('pd-brak', (prod.brak || 0).toLocaleString());
            setElText('pd-energy', (prod.energy || 0).toFixed(1) + ' kWh');

            setElText('pd-machine', prod.machine === 'ST-1' ? 'ST-1 (BS400-III)' : 'ST-2 (BS500-III)');
            setElText('pd-operator', prod.operator || 'Noma\'lum');
            
            const startTimeStr = prod.start_time ? new Date(prod.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--';
            setElText('pd-start-time', startTimeStr);
            
            let endTimeStr = '--:--';
            if (prod.end_time) {
                endTimeStr = new Date(prod.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            } else if (prod.last_update) {
                endTimeStr = new Date(prod.last_update).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
            setElText('pd-end-time', endTimeStr);

            let createdTimeStr = '--:--';
            if (prod.created_at) {
                const d = new Date(prod.created_at);
                const day = d.getDate().toString().padStart(2, '0');
                const month = (d.getMonth() + 1).toString().padStart(2, '0');
                const hours = d.getHours().toString().padStart(2, '0');
                const minutes = d.getMinutes().toString().padStart(2, '0');
                createdTimeStr = `${day}.${month} ${hours}:${minutes}`;
            }
            setElText('pd-created-at', createdTimeStr);

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
                const currentId = document.getElementById('md-title').textContent.includes('ST-2') || document.getElementById('md-title').textContent.includes('№2') ? 'ST-2' : 'ST-1';
                updateMachineModalData(currentId, window.currentFilterDate);
            }
        });
    }

    const mdRefuelBtn = document.getElementById('md-refuel-btn');
    if (mdRefuelBtn) {
        mdRefuelBtn.onclick = () => {
            const currentId = document.getElementById('md-title').textContent.includes('ST-2') || document.getElementById('md-title').textContent.includes('№2') ? 'ST-2' : 'ST-1';
            
            const refuelModal = document.getElementById('adminRefuelModal');
            if (refuelModal) {
                document.getElementById('adminRefuelModalTitle').textContent = `${currentId} Stanogini Zapravka Qilish`;
                document.getElementById('adminRefuelQtyInput').value = 100;
                refuelModal.style.display = 'flex';
                
                const confirmBtn = document.getElementById('adminRefuelConfirmBtn');
                confirmBtn.onclick = async () => {
                    const qtyInput = document.getElementById('adminRefuelQtyInput');
                    const qtyVal = parseFloat(qtyInput.value);
                    if (isNaN(qtyVal) || qtyVal <= 0) {
                        alert("Iltimos, to'g'ri miqdor kiriting!");
                        return;
                    }

                    confirmBtn.disabled = true;
                    const originalHTML = confirmBtn.innerHTML;
                    confirmBtn.innerHTML = '<span>⚡</span> SAQLANMOQDA...';

                    try {
                        const refuelData = {
                            operator: 'Admin',
                            machine: currentId,
                            model: 'REFUEL',
                            quantity: 0,
                            brak: 0,
                            raw_material: qtyVal,
                            energy: 0,
                            start_time: new Date().toISOString(),
                            status: 'REFUEL',
                            stage: 'STANOK'
                        };

                        const { error } = await supabase
                            .from('clapak_production')
                            .insert([refuelData]);

                        if (error) throw error;

                        // Send Telegram Notification
                        try {
                            const BOT_TOKEN = "8876482426:AAFIMJCPYrxi-xVQwVDtURhl_BcDDSg6htA";
                            const chatId = "689230554";
                            const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
                            const text = `⛽ <b>STANOK ZAPRAVKA QILINDI (ADMIN)</b>\n\n👤 Operator: Admin\n⚙️ Stanok: ${currentId}\n🏗 Miqdor: ${qtyVal} kg\n⏰ Vaqt: ${new Date().toLocaleTimeString()}`;
                            await fetch(url, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
                            });
                        } catch (botErr) {
                            console.error("Bot Notification Error:", botErr);
                        }

                        alert('Zapravka muvaffaqiyatli saqlandi! ⛽');
                        refuelModal.style.display = 'none';
                        
                        // Refresh modal stats
                        const filterDate = window.currentFilterDate || new Date().toISOString().split('T')[0];
                        updateMachineModalData(currentId, filterDate);
                    } catch (e) {
                        alert('Zapravka saqlashda xatolik: ' + e.message);
                    } finally {
                        confirmBtn.disabled = false;
                        confirmBtn.innerHTML = originalHTML;
                    }
                };
            }
        };
    }

    const adminRefuelModal = document.getElementById('adminRefuelModal');
    if (adminRefuelModal) {
        adminRefuelModal.onclick = (e) => {
            if (e.target === adminRefuelModal) adminRefuelModal.style.display = 'none';
        };
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

        const activeCartsCount = window.pipelineData.kraska.length;
        const totalRoomQty = (window.pipelineData.kraskaRooms || []).reduce((sum, r) => sum + (r.qty || 0), 0);
        const isActive = activeCartsCount > 0 || totalRoomQty > 0;

        const permanentCardHtml = `
            <div class="elite-prod-card" style="border-left: 4px solid #ba00ff; margin-bottom: 20px; background: linear-gradient(135deg, rgba(186,0,255,0.04), rgba(186,0,255,0.01)); cursor: pointer;" onclick="window.showKraskaDetails()">
                <div class="card-header-v3">
                    <span class="model-tag" style="color:#ba00ff; background:rgba(186,0,255,0.05); font-weight:800; font-size:0.6rem; letter-spacing:0.5px;">TIZIM HOLATI</span>
                    <div class="status-pill-v3" style="color:#ba00ff; font-weight:800; font-size:0.7rem;">
                        <div class="pulse-dot" style="background:#ba00ff; box-shadow:0 0 10px #ba00ff; ${isActive ? '' : 'animation:none; opacity:0.4;'}"></div> ${isActive ? 'FAOL' : 'NAVATCHI'}
                    </div>
                </div>
                <div class="prod-model-v3" style="font-size:1.25rem; font-weight:900; color:#fff; letter-spacing:-0.5px; margin: 10px 0;">KRASKA BO'LIMI</div>
                <div class="progress-container-v3" style="margin-bottom:15px;">
                    <div class="track-info" style="display:flex; justify-content:space-between; font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:700; margin-bottom:6px;">
                        <span>XONALARDA JAMI</span>
                        <span style="color:#ba00ff; font-weight:800;">${totalRoomQty} dona</span>
                    </div>
                </div>
                <button class="action-btn-v3" style="border-color:#ba00ff; color:#ba00ff; width:100%;" 
                    onclick="event.stopPropagation(); window.showKraskaDetails()">BATAFSIL MA'LUMOT ➜</button>
            </div>
        `;

        const activeCartsHtml = window.pipelineData.kraska.map(item => `
            <div class="elite-prod-card" style="border-left: 4px solid #ba00ff; margin-top: 15px;">
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

        list.innerHTML = permanentCardHtml + activeCartsHtml;

        // Also update details modal if it's currently open
        const modal = document.getElementById('kraskaDetailsModal');
        const modalBody = document.getElementById('kraska-modal-body');
        if (modal && modal.style.display === 'flex' && modalBody && modalBody.style.display === 'block') {
            renderKraskaDetailsModal();
        }
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

    let kraskaLogsCache = null;
    let kraskaProdsCache = new Map();
    window.activeKraskaPeriod = 'daily';

    window.showKraskaDetails = async () => {
        const modal = document.getElementById('kraskaDetailsModal');
        if (!modal) return;
        modal.style.display = 'flex';
        
        const loader = document.getElementById('kraska-modal-loader');
        const body = document.getElementById('kraska-modal-body');
        loader.style.display = 'flex';
        body.style.display = 'none';

        try {
            const startOfYear = new Date(new Date().getFullYear(), 0, 1);
            const { data: logs, error: logsError } = await supabase
                .from('clapak_kraska_logs')
                .select('*')
                .gte('created_at', startOfYear.toISOString())
                .order('created_at', { ascending: false });

            if (logsError) throw logsError;
            kraskaLogsCache = logs || [];

            // Fetch models for the unique cart_ids
            const missingCartIds = [...new Set(kraskaLogsCache.map(l => l.cart_id).filter(Boolean))]
                .filter(id => !kraskaProdsCache.has(id));

            if (missingCartIds.length > 0) {
                const { data: prods, error: prodsError } = await supabase
                    .from('clapak_production')
                    .select('id, model, brak')
                    .in('id', missingCartIds);

                if (!prodsError && prods) {
                    prods.forEach(p => {
                        kraskaProdsCache.set(p.id, { model: p.model, brak: p.brak || 0 });
                    });
                }
            }

            window.activeKraskaPeriod = 'daily';
            
            // Set styles of daily period button as active immediately
            const dailyBtn = document.getElementById('kraska-period-daily');
            if (dailyBtn) {
                dailyBtn.style.background = '#ba00ff';
                dailyBtn.style.color = '#000';
            }
            const periods = ['weekly', 'monthly', 'yearly'];
            periods.forEach(p => {
                const btn = document.getElementById(`kraska-period-${p}`);
                if (btn) {
                    btn.style.background = 'transparent';
                    btn.style.color = 'rgba(255,255,255,0.5)';
                }
            });

            renderKraskaDetailsModal();

            loader.style.display = 'none';
            body.style.display = 'block';
        } catch (err) {
            console.error("Error loading kraska details:", err);
            loader.innerHTML = `
                <div style="text-align:center; color:#ff4d4f; padding:40px;">
                    <div style="font-size:2rem; margin-bottom:10px;">⚠️</div>
                    <div>Ma'lumotlarni yuklashda xatolik yuz berdi.</div>
                    <button onclick="window.showKraskaDetails()" style="margin-top:15px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:8px 16px; border-radius:10px; cursor:pointer;">Qayta urinish</button>
                </div>
            `;
        }
    };

    window.switchKraskaPeriod = (period) => {
        window.activeKraskaPeriod = period;
        
        // Update active tab buttons styles
        const periods = ['daily', 'weekly', 'monthly', 'yearly'];
        periods.forEach(p => {
            const btn = document.getElementById(`kraska-period-${p}`);
            if (btn) {
                if (p === period) {
                    btn.style.background = '#ba00ff';
                    btn.style.color = '#000';
                } else {
                    btn.style.background = 'transparent';
                    btn.style.color = 'rgba(255,255,255,0.5)';
                }
            }
        });

        renderKraskaDetailsModal();
    };

    function renderKraskaDetailsModal() {
        // 1. Calculate general stats
        const totalRoomQty = (window.pipelineData.kraskaRooms || []).reduce((sum, r) => sum + (r.qty || 0), 0);
        const activeCartsCount = window.pipelineData.kraska.length;
        
        const logs = kraskaLogsCache || [];
        const totalPainted = logs.reduce((sum, l) => sum + (parseInt(l.quantity) || 0), 0);

        document.getElementById('kd-rooms-qty').textContent = `${totalRoomQty} dona`;
        document.getElementById('kd-painted-qty').textContent = `${totalPainted} dona`;
        document.getElementById('kd-active-carts').textContent = `${activeCartsCount} ta arava`;

        // 1.5. Render waiting queue (FIFO) from window.pipelineData.kraskaQueue
        const queueContainer = document.getElementById('kd-queue-container');
        if (queueContainer) {
            const waitingQueue = [...(window.pipelineData.kraskaQueue || [])].sort((a, b) => {
                const tA = a.startTime ? new Date(a.startTime).getTime() : 0;
                const tB = b.startTime ? new Date(b.startTime).getTime() : 0;
                return tA - tB;
            });

            if (waitingQueue.length === 0) {
                queueContainer.innerHTML = `<div style="color:rgba(255,255,255,0.3); font-size:0.8rem; font-style:italic; width:100%; text-align:center; padding:10px 0;">Navbatda kutilayotgan modellar mavjud emas</div>`;
            } else {
                queueContainer.innerHTML = waitingQueue.map((item, idx) => `
                    <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
                        <div style="background:rgba(186,0,255,0.06); border:1px solid rgba(186,0,255,0.25); padding:10px 16px; border-radius:14px; position:relative; box-shadow:0 4px 15px rgba(186,0,255,0.02); display:flex; flex-direction:column; gap:4px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:15px; margin-bottom: 2px;">
                                <span style="font-size:0.6rem; background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.4); padding:2px 6px; border-radius:4px; font-weight:800;">#${idx + 1} NAVBAT</span>
                                <span style="font-size:0.6rem; color:#ba00ff; font-weight:800;">⏰ ${item.time}</span>
                            </div>
                            <div style="font-weight:800; color:#fff; font-size:0.9rem;">${item.model}</div>
                            <div style="font-size:0.7rem; color:rgba(255,255,255,0.5); font-weight:600;">
                                ${item.qty} dona ${item.cart ? `• Arava #${item.cart}` : ''}
                            </div>
                        </div>
                        ${idx < waitingQueue.length - 1 ? `<span style="color:rgba(255,255,255,0.15); font-size:1.5rem; font-weight:300; pointer-events:none; padding:0 2px;">➔</span>` : ''}
                    </div>
                `).join('');
            }
        }

        // 2. Render room stocks allocation
        const room1List = document.getElementById('kd-room1-list');
        const room2List = document.getElementById('kd-room2-list');
        const room3List = document.getElementById('kd-room3-list');

        const room1Items = (window.pipelineData.kraskaRooms || []).filter(r => r.stage === 'kraska1_room');
        const room2Items = (window.pipelineData.kraskaRooms || []).filter(r => r.stage === 'kraska2_room');
        const room3Items = (window.pipelineData.kraskaRooms || []).filter(r => r.stage === 'kraska3_room');

        const room1Total = room1Items.reduce((sum, r) => sum + r.qty, 0);
        const room2Total = room2Items.reduce((sum, r) => sum + r.qty, 0);
        const room3Total = room3Items.reduce((sum, r) => sum + r.qty, 0);

        document.getElementById('kd-room1-total').textContent = `${room1Total} dona`;
        document.getElementById('kd-room2-total').textContent = `${room2Total} dona`;
        document.getElementById('kd-room3-total').textContent = `${room3Total} dona`;

        const renderRoomList = (el, items) => {
            if (!el) return;
            if (items.length === 0) {
                el.innerHTML = `<div style="color:rgba(255,255,255,0.25); font-size:0.75rem; font-style:italic; padding:10px 0; text-align:center;">Zaxira mavjud emas</div>`;
                return;
            }
            el.innerHTML = items.map(item => `
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; background:rgba(255,255,255,0.02); padding:8px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.03);">
                    <span style="color:rgba(255,255,255,0.8); font-weight:600;">${item.model}</span>
                    <span style="color:#ba00ff; font-weight:800;">${item.qty} dona</span>
                </div>
            `).join('');
        };

        renderRoomList(room1List, room1Items);
        renderRoomList(room2List, room2Items);
        renderRoomList(room3List, room3Items);

        // 3. Filter logs based on period
        const now = new Date();
        let startDate = new Date();

        if (window.activeKraskaPeriod === 'daily') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (window.activeKraskaPeriod === 'weekly') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            startDate = new Date(now.setDate(diff));
            startDate.setHours(0,0,0,0);
        } else if (window.activeKraskaPeriod === 'monthly') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (window.activeKraskaPeriod === 'yearly') {
            startDate = new Date(now.getFullYear(), 0, 1);
        }

        const filteredLogs = logs.filter(l => new Date(l.created_at) >= startDate);

        // 4. Render aggregated table
        const aggTableBody = document.getElementById('kd-agg-table-body');
        if (aggTableBody) {
            // Aggregate by painter (worker_name) + model + paint_type
            const aggMap = new Map();
            filteredLogs.forEach(l => {
                const prodData = kraskaProdsCache.get(l.cart_id) || { model: 'Matiz R13', brak: 0 };
                const modelName = prodData.model;
                const key = `${l.worker_name || 'Noma\'lum'}|${modelName}|${l.paint_type || 'Serisi'}`;
                
                if (!aggMap.has(key)) {
                    aggMap.set(key, {
                        worker: l.worker_name || 'Noma\'lum',
                        model: modelName,
                        paintType: l.paint_type || 'Serisi',
                        qty: 0
                    });
                }
                aggMap.get(key).qty += (parseInt(l.quantity) || 0);
            });

            const aggList = [...aggMap.values()].sort((a, b) => b.qty - a.qty);

            if (aggList.length === 0) {
                aggTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align:center; padding:30px; color:rgba(255,255,255,0.3); font-style:italic;">
                            Ushbu davrda ma'lumotlar mavjud emas
                        </td>
                    </tr>
                `;
            } else {
                aggTableBody.innerHTML = aggList.map(a => `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.02);">
                        <td style="padding:10px 8px; font-weight:600; color:#fff;">${a.worker}</td>
                        <td style="padding:10px 8px; color:rgba(255,255,255,0.8);">${a.model}</td>
                        <td style="padding:10px 8px;">
                            <span style="font-size:0.7rem; background:${a.paintType === 'Kombo' ? 'rgba(186,0,255,0.1)' : (a.paintType === 'Redlayn' ? 'rgba(255,77,79,0.1)' : 'rgba(0,242,255,0.1)')}; color:${a.paintType === 'Kombo' ? '#ba00ff' : (a.paintType === 'Redlayn' ? '#ff4d4f' : '#00f2ff')}; padding:2px 8px; border-radius:6px; font-weight:700;">
                                ${a.paintType}
                            </span>
                        </td>
                        <td style="padding:10px 8px; text-align:right; font-weight:800; color:#ba00ff;">${a.qty} dona</td>
                    </tr>
                `).join('');
            }
        }

        // 5. Render detailed logs list
        const logsList = document.getElementById('kd-logs-list');
        if (logsList) {
            if (filteredLogs.length === 0) {
                logsList.innerHTML = `<div style="text-align:center; padding:30px; color:rgba(255,255,255,0.3); font-style:italic;">Ushbu davrda ma'lumotlar mavjud emas</div>`;
            } else {
                logsList.innerHTML = filteredLogs.slice(0, 50).map(l => {
                    const prodData = kraskaProdsCache.get(l.cart_id) || { model: 'Matiz R13', brak: 0 };
                    const modelName = prodData.model;
                    const brakCount = prodData.brak;
                    const dateStr = new Date(l.created_at).toLocaleString('uz', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    let brakHtml = '';
                    if (brakCount > 0) {
                        brakHtml = `<div style="font-size:0.65rem; color:#ff4d4f; font-weight:700; margin-top:2px;">Brak: ${brakCount} dona</div>`;
                    }

                    return `
                        <div style="background:rgba(255,255,255,0.015); border:1px solid rgba(255,255,255,0.03); padding:10px 14px; border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <div style="font-weight:700; color:#fff; font-size:0.8rem;">${l.worker_name || 'Rassom'}</div>
                                <div style="font-size:0.7rem; color:rgba(255,255,255,0.4); margin-top:2px;">
                                    ${modelName} • <span style="color:${l.paint_type === 'Kombo' ? '#ba00ff' : (l.paint_type === 'Redlayn' ? '#ff4d4f' : '#00f2ff')}">${l.paint_type || 'Serisi'}</span>
                                </div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-weight:800; color:#ba00ff; font-size:0.85rem;">+${l.quantity} dona</div>
                                ${brakHtml}
                                <div style="font-size:0.6rem; color:rgba(255,255,255,0.3); margin-top:2px;">${dateStr}</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
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
                    id: item.id,
                    subStage: item.subStage
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
                
                let stageText = 'QURITISH';
                let timeLabel = 'Vaqt qoldi';
                let stageColor = '#fabb18'; // orange
                let bgGradient = 'rgba(250,187,24,0.06)';
                let borderStyle = 'rgba(250,187,24,0.35)';
                let totalDuration = 240 * 60;
                
                if (c.subStage === 'cooling') {
                    stageText = 'SOVUTISH ❄️';
                    stageColor = '#00f2ff'; // cyan
                    bgGradient = 'rgba(0,242,255,0.06)';
                    borderStyle = 'rgba(0,242,255,0.35)';
                    totalDuration = 60 * 60;
                } else if (c.subStage === 'halqa') {
                    stageText = 'HALQA QO\'YISH ⚙️';
                    stageColor = '#ba00ff'; // purple
                    bgGradient = 'rgba(186,0,255,0.06)';
                    borderStyle = 'rgba(186,0,255,0.35)';
                    timeLabel = 'Kutilmoqda';
                    totalDuration = 0;
                } else if (c.subStage === 'ready_timer') {
                    stageText = 'FINAL TAYYORLASH ⏳';
                    stageColor = '#00ff88'; // green
                    bgGradient = 'rgba(0,255,136,0.06)';
                    borderStyle = 'rgba(0,255,136,0.35)';
                    totalDuration = 60 * 60;
                }
                
                const timeText = totalDuration > 0 
                    ? `${mins}:${secs.toString().padStart(2, '0')}`
                    : (c.subStage === 'halqa' ? 'Tasdiqlash kutilmoqda' : 'Tayyor');

                const progressPerc = totalDuration > 0 
                    ? Math.round(((totalDuration - c.remainingTime) / totalDuration) * 100)
                    : 100;

                return `
                    <div style="background:linear-gradient(135deg, ${bgGradient}, rgba(186,0,255,0.02)); border:1px solid ${borderStyle}; padding:16px; border-radius:18px; position:relative; box-shadow:0 8px 25px rgba(250,187,24,0.05); transition:all 0.3s; display:flex; flex-direction:column; justify-content:space-between; min-height:175px; cursor:pointer;"
                        onclick="window.showSushilkaPassport('${c.id}')"
                        onmouseenter="this.style.borderColor='${stageColor}'; this.style.transform='translateY(-2px)'"
                        onmouseleave="this.style.borderColor='${borderStyle}'; this.style.transform='translateY(0)'">
                        <div>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                                <span style="font-size:0.75rem; font-weight:900; background:rgba(250,187,24,0.1); color:${stageColor}; padding:4px 10px; border-radius:8px;">ARAVA #${c.num}</span>
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <div style="width:6px; height:6px; border-radius:50%; background:${stageColor}; box-shadow:0 0 8px ${stageColor}; animation:clapak-pulse 1s infinite;"></div>
                                    <span style="font-size:0.6rem; color:${stageColor}; font-weight:800; letter-spacing:0.5px;">${stageText}</span>
                                </div>
                            </div>
                            <div style="font-size:1.15rem; font-weight:900; color:#fff; margin-bottom:4px;">${c.model}</div>
                            <div style="font-size:0.7rem; color:rgba(255,255,255,0.4); font-weight:600; margin-bottom:8px;">${timeLabel}: <strong style="color:${stageColor};">${timeText}</strong></div>
                        </div>
                        <div>
                            <div style="margin-bottom: 8px;">
                                <div style="width:100%; height:4px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden;">
                                    <div style="width:${progressPerc}%; height:100%; background:${stageColor};"></div>
                                </div>
                            </div>
                            <div style="border-top:1px solid rgba(255,255,255,0.05); padding-top:8px; display:flex; justify-content:space-between; font-size:0.6rem; color:rgba(255,255,255,0.3); font-weight:700;">
                                <span>👤 ${c.operator ? c.operator.split(' | ')[0].split(' ')[0] : 'Noma\'lum'}</span>
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
        document.getElementById('pass-show-machine').textContent = c.machine === 'ST-1' ? 'ST-1 (BS400-III)' : 'ST-2 (BS500-III)';
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
        if (btn) {
            let btnLabel = 'QADOQLASHGA YUBORISH ➜';
            if (c.stage.startsWith('sushilka-') || c.stage.startsWith('cooling-') || c.stage.startsWith('halqa-') || c.stage.startsWith('ready_timer-')) {
                btnLabel = 'MAJBURIY QADOQLASHGA ➜';
            }
            btn.textContent = btnLabel;
            btn.disabled = false;

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
                    btn.textContent = btnLabel;
                    btn.disabled = false;
                }
            };
        }

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
            await supabase.from('clapak_production')
                .update({ stage: 'finished', status: 'DONE', last_update: new Date().toISOString() })
                .eq('stage', 'packaging');
        } catch (e) {
            console.error("Error finalizing packaging in DB:", e);
        }

        window.showPremiumToast("Omborga Jo'natildi", `${boxes} ta box tayyor mahsulot omboriga muvaffaqiyatli qabul qilindi.`, true);
    };

    function updatePipelineStats() {
        const activeCarts = window.pipelineData.kraska.length + window.pipelineData.sushilka.length;
        const acEl = document.getElementById('active-carts-count');
        if (acEl) acEl.textContent = activeCarts;

        const totalDona = window.pipelineData.finished.reduce((sum, x) => sum + (x.qty || 0), 0);
        const totalBoxes = window.pipelineData.finished.filter(x => x.stage === 'finished' || x.stage.startsWith('finished')).reduce((sum, x) => sum + x.boxes, 0);

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
                if (item.remainingTime === 0) {
                    if (item.subStage === 'cooling') {
                        const dbStage = item.cart ? `halqa-${item.cart}` : 'halqa';
                        supabase.from('clapak_production').update({ stage: dbStage, last_update: new Date().toISOString() }).eq('id', item.id).then(() => {
                            refreshAutoProduction();
                        });
                    } else if (item.subStage === 'ready_timer') {
                        const dbStage = item.cart ? `packaging-${item.cart}-0` : 'packaging';
                        supabase.from('clapak_production').update({ stage: dbStage, status: 'PACKAGING', last_update: new Date().toISOString() }).eq('id', item.id).then(() => {
                            refreshAutoProduction();
                        });
                    }
                }
            }
        });
        if (changed) renderSushilka();
    }, 1000);

    // --- ROMIX DASHBOARD STATS (PANEL) ---
    // --- ROMIX DASHBOARD STATS (PANEL) ---
    async function loadRomixDashboardStats() {
        const todayStr = new Date().toISOString().split('T')[0];

        // Aksesuvar/Qoldiq endi Supabase'da — bir martalik migratsiya _buhGetAccessories()/
        // _buhGetQoldiqProfillar() ichida avtomatik amalga oshadi (pastda, statistika hisoblashda).

        const plastLocalKey = 'romix_db_romix_inventory';
        if (!localStorage.getItem(plastLocalKey)) {
            const defaultPlast = [
                { id: "p1", product_name: "AKFA Plastik 6000 QVT Oq", brand: "AKFA", series: "6000 QVT", color: "Oq", price: 150000, stock_quantity: 450, unit: "kg", created_at: new Date().toISOString() },
                { id: "p2", product_name: "AKFA Plastik 6000 TRIO Mocha", brand: "AKFA", series: "6000 TRIO", color: "Mocha", price: 180000, stock_quantity: 320, unit: "kg", created_at: new Date().toISOString() },
                { id: "p3", product_name: "Ekopen Plastik 5800 TRIO Oq", brand: "Ekopen", series: "5800 TRIO", color: "Oq", price: 140000, stock_quantity: 600, unit: "kg", created_at: new Date().toISOString() },
                { id: "p4", product_name: "AKFA Alyuminiy 5200 QVT Qora", brand: "AKFA", series: "5200 QVT", color: "Qora", price: 220000, stock_quantity: 210, unit: "kg", created_at: new Date().toISOString() }
            ];
            localStorage.setItem(plastLocalKey, JSON.stringify(defaultPlast));
        }
        const transLocalKey = 'romix_db_romix_transactions';
        if (!localStorage.getItem(transLocalKey)) {
            const defaultTrans = [
                { id: "t1", product_id: "p1", type: "IN", quantity: 150, operator: "Admin", created_at: new Date(Date.now() - 2*3600*1000).toISOString() },
                { id: "t2", product_id: "p3", type: "OUT", quantity: 80, operator: "Sotuv", created_at: new Date(Date.now() - 5*3600*1000).toISOString() },
                { id: "t3", product_id: "p4", type: "IN", quantity: 45, operator: "Admin", created_at: new Date(Date.now() - 24*3600*1000).toISOString() }
            ];
            localStorage.setItem(transLocalKey, JSON.stringify(defaultTrans));
        }

        // 1. Employee Stats
        let emps = [];
        let att = [];
        try {
            const { data: eData } = await supabase.from('employees').select('id, full_name, role, salary_info');
            const { data: aData } = await supabase.from('attendance').select('status, check_in, check_out, employee_id').eq('date', todayStr);
            
            let finalEmps = eData;
            if (!finalEmps || finalEmps.length === 0) {
                const localEmps = localStorage.getItem('romix_db_employees');
                if (localEmps) finalEmps = JSON.parse(localEmps);
            }
            if (finalEmps) emps = finalEmps;

            let finalAtt = aData;
            if (!finalAtt || finalAtt.length === 0) {
                const dbAtt = localStorage.getItem('romix_db_attendance');
                if (dbAtt) {
                    const parsed = JSON.parse(dbAtt);
                    finalAtt = parsed.filter(a => a.date === todayStr);
                }
            }
            if (!finalAtt || finalAtt.length === 0) {
                const localAtt = localStorage.getItem('romix_attendance_local');
                if (localAtt) finalAtt = JSON.parse(localAtt);
            }
            if (finalAtt) att = finalAtt;
        } catch (err) {
            console.error("Dashboard HR Load Error:", err);
        }

        const total = emps.length;
        let arrived = 0, late = 0;
        if (att) {
            arrived = att.length;
            late = att.filter(a => a.status === 'Kech qoldi' || (a.status && a.status.toLowerCase().includes('kechik'))).length;
        }

        const totalEmpEl = document.getElementById('stat-total-emp');
        const arrivedEl = document.getElementById('stat-arrived');
        const lateEl = document.getElementById('stat-late');
        const absentEl = document.getElementById('stat-absent');

        if (totalEmpEl) totalEmpEl.textContent = total;
        if (arrivedEl) arrivedEl.textContent = arrived;
        if (lateEl) lateEl.textContent = late;
        if (absentEl) absentEl.textContent = Math.max(0, total - arrived);

        // Circular progress ring calculation
        const attendancePct = total > 0 ? Math.round((arrived / total) * 100) : 0;
        const ringEl = document.getElementById('attendance-progress-ring');
        const ringTextEl = document.getElementById('attendance-percent-text');
        if (ringEl) {
            const offset = 251.2 - (251.2 * attendancePct) / 100;
            ringEl.style.strokeDashoffset = offset;
        }
        if (ringTextEl) {
            ringTextEl.textContent = attendancePct + '%';
        }

        // 2. Warehouse Stats Aggregation
        let plastStock = 0, plastVal = 0, accStock = 0, accVal = 0, qoldiqStock = 0, qoldiqVal = 0, qoldiqLength = 0;
        try {
            const { data: plastData } = await supabase.from('romix_inventory').select('stock_quantity, price');
            let finalPlastData = plastData;
            if (!finalPlastData || finalPlastData.length === 0) {
                const localPlast = localStorage.getItem('romix_db_romix_inventory');
                if (localPlast) finalPlastData = JSON.parse(localPlast);
            }
            if (finalPlastData) {
                finalPlastData.forEach(p => {
                    const qty = parseFloat(p.stock_quantity) || 0;
                    const pr = parseFloat(p.price) || 0;
                    plastStock += qty;
                    plastVal += qty * pr;
                });
            }
        } catch (err) { console.error("Plast stock fetch issue:", err); }

        try {
            const accData = await _buhGetAccessories();
            accData.forEach(a => {
                const qty = parseInt(a.qty) || 0;
                accStock += qty;
                const price = Number(a.price) || 0;
                if (price > 0) {
                    accVal += qty * price;
                } else {
                    const nameLower = (a.name || '').toLowerCase();
                    let estPrice = 30000;
                    if (nameLower.includes('dovodchik')) estPrice = 120000;
                    else if (nameLower.includes('qulf') || nameLower.includes('zamok')) estPrice = 65000;
                    else if (nameLower.includes('ruchka')) estPrice = 45000;
                    else if (nameLower.includes('petlya')) estPrice = 15000;
                    else if (nameLower.includes('setka')) estPrice = 40000;
                    else if (nameLower.includes('rezina') || nameLower.includes('zichlagich')) estPrice = 8000;
                    accVal += qty * estPrice;
                }
            });
        } catch (err) { console.error("Accessories stock calculation issue:", err); }

        try {
            const qoldiqData = await _buhGetQoldiqProfillar();
            qoldiqData.forEach(q => {
                const qty = parseInt(q.stock_quantity) || 0;
                const len = parseFloat(q.length) || 0;
                qoldiqStock += qty;
                qoldiqLength += len * qty;
                qoldiqVal += len * qty * 25;
            });
        } catch (err) { console.error("Remnants stock calculation issue:", err); }

        const grandStock = plastStock + accStock + qoldiqStock;
        const grandVal = plastVal + accVal + qoldiqVal;

        const valEl = document.getElementById('stat-total-warehouse-val');
        const stockEl = document.getElementById('stat-total-warehouse-stock');
        if (valEl) valEl.textContent = grandVal.toLocaleString() + ' UZS';
        if (stockEl) stockEl.textContent = grandStock.toLocaleString() + ' dona / kg / m';

        // Redesigned mini breakdown values
        const miniPlast = document.getElementById('dashboard-mini-plast-val');
        const miniAcc = document.getElementById('dashboard-mini-acc-val');
        const miniQoldiq = document.getElementById('dashboard-mini-qoldiq-val');
        if (miniPlast) miniPlast.textContent = plastVal.toLocaleString() + ' UZS';
        if (miniAcc) miniAcc.textContent = accVal.toLocaleString() + ' UZS';
        if (miniQoldiq) miniQoldiq.textContent = qoldiqVal.toLocaleString() + ' UZS';

        // Capacity radial ring
        const capacityPct = Math.min(100, Math.round((grandStock / 20000) * 100)) || 78;
        const capacityPercentEl = document.getElementById('warehouse-capacity-percent');
        const capacityRingEl = document.getElementById('warehouse-capacity-ring');
        if (capacityPercentEl) capacityPercentEl.textContent = capacityPct + '%';
        if (capacityRingEl) {
            const offset = 251.2 - (251.2 * capacityPct) / 100;
            capacityRingEl.style.strokeDashoffset = offset;
        }

        const dbPlastVal = document.getElementById('dashboard-plast-val');
        const dbPlastStock = document.getElementById('dashboard-plast-stock');
        const dbAccVal = document.getElementById('dashboard-acc-val');
        const dbAccStock = document.getElementById('dashboard-acc-stock');
        const dbQoldiqVal = document.getElementById('dashboard-qoldiq-val');
        const dbQoldiqStock = document.getElementById('dashboard-qoldiq-stock');

        if (dbPlastVal) dbPlastVal.textContent = plastVal.toLocaleString() + ' UZS';
        if (dbPlastStock) dbPlastStock.textContent = plastStock.toLocaleString() + ' kg / dona';
        if (dbAccVal) dbAccVal.textContent = accVal.toLocaleString() + ' UZS';
        if (dbAccStock) dbAccStock.textContent = accStock.toLocaleString() + ' dona';
        if (dbQoldiqVal) dbQoldiqVal.textContent = qoldiqVal.toLocaleString() + ' UZS';
        if (dbQoldiqStock) dbQoldiqStock.textContent = qoldiqStock.toLocaleString() + ` ta (${(qoldiqLength / 1000).toFixed(1)} metr)`;

        // 3. Orders Live Feed
        let orders = [];
        try {
            const { data: oData } = await supabase.from('sales_orders').select('*').order('created_at', { ascending: false });
            if (oData && oData.length > 0) {
                orders = oData;
                localStorage.setItem('romix_orders_local', JSON.stringify(orders));
            } else {
                const localRaw = localStorage.getItem('romix_orders_local');
                if (localRaw) orders = JSON.parse(localRaw);
            }
        } catch (err) { console.warn("Orders load failed", err); }

        const pendingOrders = orders.filter(o => o.status === 'Kutilmoqda');
        const readyOrders = orders.filter(o => o.status === 'Tayyor / Yetkazildi' || o.status === 'Tayyor / O\'rnatildi' || o.status === 'Tayyor');
        const newCountEl = document.getElementById('badge-new-orders-count');
        const readyCountEl = document.getElementById('badge-ready-orders-count');
        const ordersListEl = document.getElementById('dashboard-orders-list');

        if (newCountEl) newCountEl.textContent = pendingOrders.length;
        if (readyCountEl) readyCountEl.textContent = readyOrders.length;

        if (ordersListEl) {
            if (orders.length === 0) {
                ordersListEl.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.25); font-size: 0.75rem; margin: auto; grid-column: span 2;">Buyurtmalar topilmadi</div>';
            } else {
                ordersListEl.innerHTML = orders.slice(0, 3).map(o => {
                    let statusColor = '#ffaa00';
                    let statusBg = 'rgba(255,170,0,0.1)';
                    if (o.status === 'Jarayonda') {
                        statusColor = '#00d2ff';
                        statusBg = 'rgba(0,210,255,0.1)';
                    } else if (o.status.includes('Tayyor') || o.status.includes('o\'rnatildi') || o.status.includes('Yetkazildi')) {
                        statusColor = '#00ff88';
                        statusBg = 'rgba(0,255,136,0.1)';
                    }

                    // Elegant SVG Profile window icon
                    const productSvg = `
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="${statusColor}" stroke-width="1.8" style="filter: drop-shadow(0 0 5px ${statusColor}30);">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"/>
                            <line x1="12" y1="3" x2="12" y2="21" stroke-dasharray="2 2"/>
                            <line x1="3" y1="11" x2="21" y2="11"/>
                        </svg>
                    `;

                    return `
                        <div class="premium-product-card glow-card" style="border-top: 3px solid ${statusColor}; border-radius: 16px; background: rgba(255, 255, 255, 0.015); border-left: 1px solid rgba(255,255,255,0.03); border-right: 1px solid rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.03); padding: 12px 14px; position: relative; transition: all 0.25s; display: flex; flex-direction: column; justify-content: space-between; min-height: 160px;" onmouseenter="this.style.transform='translateY(-3px)'; this.style.background='rgba(255,255,255,0.03)';" onmouseleave="this.style.transform='translateY(0)'; this.style.background='rgba(255,255,255,0.015)';">
                            <div>
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                    <span style="font-family: monospace; font-size: 0.65rem; color: rgba(255,255,255,0.4); font-weight: 700;">#${o.id.toUpperCase()}</span>
                                    <span style="font-size: 0.6rem; color: ${statusColor}; background: ${statusBg}; padding: 2px 6px; border-radius: 12px; font-weight: 700;">${o.status}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; margin: 10px 0;">
                                    ${productSvg}
                                    <div style="flex-grow: 1; overflow: hidden;">
                                        <div style="font-weight: 700; color: #fff; font-size: 0.76rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${o.prod_type}">${o.prod_type || 'Mahsulot'}</div>
                                        <div style="font-size: 0.65rem; color: rgba(255,255,255,0.4); margin-top: 2px;">Soni: ${o.quantity || 1} ta</div>
                                    </div>
                                </div>
                                <div style="font-size: 0.72rem; color: rgba(255,255,255,0.5); font-weight: 600; display: flex; align-items: center; gap: 4px; margin-top: 8px; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 8px;">
                                    <span>👤</span> <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;">${o.customer_name}</span>
                                </div>
                            </div>
                            <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 2px;">
                                <div style="font-size: 0.58rem; color: rgba(255,255,255,0.3); font-weight: 700; text-transform: uppercase;">SUMMASI</div>
                                <div style="font-weight: 900; color: #00ff88; font-size: 0.95rem; font-family: monospace;">${Number(o.total_price || 0).toLocaleString()} UZS</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // 4. Live Payroll ticking logic
        let activeWorkers = [];
        let employeesMap = {};
        emps.forEach(emp => {
            employeesMap[emp.id] = emp;
        });

        // Parse checked-in employees
        att.forEach(a => {
            const emp = employeesMap[a.employee_id];
            if (emp && a.check_in) {
                const sal = emp.salary_info ? parseFloat(emp.salary_info.toString().replace(/[^0-9]/g, '')) || 0 : 0;
                const dailyRate = sal / 26;
                const hourlyRate = dailyRate / 8;
                const perSecondRate = hourlyRate / 3600;

                const checkInParts = a.check_in.split(':');
                const checkInDate = new Date();
                checkInDate.setHours(parseInt(checkInParts[0]) || 0, parseInt(checkInParts[1]) || 0, parseInt(checkInParts[2]) || 0, 0);

                let checkOutDate = null;
                if (a.check_out) {
                    const checkOutParts = a.check_out.split(':');
                    checkOutDate = new Date();
                    checkOutDate.setHours(parseInt(checkOutParts[0]) || 0, parseInt(checkOutParts[1]) || 0, parseInt(checkOutParts[2]) || 0, 0);
                }

                activeWorkers.push({
                    id: emp.id,
                    name: emp.full_name,
                    role: emp.role,
                    checkIn: a.check_in,
                    checkOut: a.check_out,
                    checkInDate: checkInDate,
                    checkOutDate: checkOutDate,
                    perSecondRate: perSecondRate
                });
            }
        });

        if (window.romixPayrollInterval) {
            clearInterval(window.romixPayrollInterval);
        }

        window.romixPayrollInterval = setInterval(() => {
            let totalEarnedToday = 0;
            const listEl = document.getElementById('dashboard-payroll-list');
            const totalPayrollEl = document.getElementById('stat-total-payroll');

            const now = new Date();
            const rowsHTML = activeWorkers.map(w => {
                let seconds = 0;
                if (w.checkOutDate) {
                    seconds = (w.checkOutDate - w.checkInDate) / 1000;
                } else {
                    seconds = (now - w.checkInDate) / 1000;
                }
                seconds = Math.max(0, seconds);
                
                const currentEarned = seconds * w.perSecondRate;
                totalEarnedToday += currentEarned;

                const hrs = Math.floor(seconds / 3600);
                const mins = Math.floor((seconds % 3600) / 60);
                const secs = Math.floor(seconds % 60);
                const durationText = `${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
                
                const statusBadge = w.checkOut 
                    ? `<span style="background: rgba(255, 77, 79, 0.1); color: #ff4d4f; padding: 2px 8px; border-radius: 12px; font-size: 0.62rem; font-weight: 700;">Ketdi: ${w.checkOut}</span>`
                    : `<span style="background: rgba(0, 255, 136, 0.1); color: #00ff88; padding: 2px 8px; border-radius: 12px; font-size: 0.62rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><span class="pulse-dot" style="color: #00ff88; width: 6px; height: 6px;"></span>Ishlamoqda</span>`;

                return `
                    <div class="premium-list-item" style="border-left: 3.5px solid ${w.checkOut ? '#ff4d4f' : '#00ff88'};">
                        <div>
                            <div style="font-weight: 700; color: #fff; font-size: 0.8rem;">${w.name}</div>
                            <div style="font-size: 0.65rem; color: rgba(255,255,255,0.4); margin-top: 2px;">Keldi: ${w.checkIn} | ⏳ ${durationText}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 800; color: #ffaa00; font-size: 0.85rem; font-family: monospace;">${currentEarned.toFixed(2)} UZS</div>
                            <div style="margin-top: 3px;">${statusBadge}</div>
                        </div>
                    </div>
                `;
            }).join('');

            if (listEl) {
                if (activeWorkers.length === 0) {
                    listEl.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.25); font-size: 0.75rem; margin: auto; grid-column: span 2; padding: 20px 0;">Bugun ishga kelgan xodimlar mavjud emas</div>';
                } else {
                    listEl.innerHTML = rowsHTML;
                }
            }

            if (totalPayrollEl) {
                totalPayrollEl.textContent = totalEarnedToday.toLocaleString('uz-UZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' UZS';
            }
        }, 1000);
    }
    window.openWarehouseBreakdownModal = function() {
        const modal = document.getElementById('warehouseBreakdownModal');
        if (modal) modal.style.display = 'flex';
    };
    window.closeWarehouseBreakdownModal = function() {
        const modal = document.getElementById('warehouseBreakdownModal');
        if (modal) modal.style.display = 'none';
    };

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
            if (panel) panel.style.display = 'none';
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
                    if (val && parseFloat(val) > 0) {
                        currentSaveBtn.innerHTML = "Saqlanmoqda...";
                        const today = new Date().toISOString().split('T')[0];
                        const { error } = await supabase.from('attendance').insert({ employee_id: selectedWorkerId, date: today, status: `Premya: ${val} so'm` });
                        if (error) { alert("Xatolik saqlashda: " + error.message); return; }
                        window.logToHistory(`Xodimga premya belgilandi: ${val} so'm`);
                        alert(`${val} so'm premya muvaffaqiyatli belgilandi.`);
                        modal.style.display = 'none';
                        loadRomixHRData();
                    } else {
                        alert("Iltimos, 0 dan katta to'g'ri miqdor kiriting!");
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
                    if (val && parseFloat(val) > 0) {
                        currentSaveBtn.innerHTML = "Saqlanmoqda...";
                        const today = new Date().toISOString().split('T')[0];
                        await supabase.from('employees').update({ salary_info: val }).eq('id', selectedWorkerId);
                        const { error } = await supabase.from('attendance').insert({ employee_id: selectedWorkerId, date: today, status: `Oylik oshirildi: ${val}` });
                        if (error) { alert("Xatolik saqlashda: " + error.message); return; }
                        window.logToHistory(`Xodimning oyligi o'zgartirildi: ${val}`);
                        alert("Oylik muvaffaqiyatli yangilandi.");
                        modal.style.display = 'none';
                        loadRomixHRData();
                    } else {
                        alert("Iltimos, 0 dan katta to'g'ri oylik miqdorini kiriting!");
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
                    if (start && end && new Date(end) < new Date(start)) {
                        alert("Tugash sanasi boshlanish sanasidan oldin bo'lishi mumkin emas!");
                        return;
                    }
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
                    department,
                    role,
                    phone,
                    salary_info: salary.includes("so'm") ? salary : salary + " so'm",
                    experience: joined_year ? `Ishga kirgan yili: ${joined_year}` : 'Yangi',
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
                    } else if (deptVal === 'Sotuv') {
                        filtered = allEmployees.filter(e =>
                            (e.department && e.department.toLowerCase().includes('sotuv')) ||
                            (e.role && e.role.toLowerCase().includes('sotuv'))
                        );
                    } else if (deptVal === 'HR') {
                        filtered = allEmployees.filter(e =>
                            (e.department && e.department.toLowerCase().includes('hr')) ||
                            (e.role && e.role.toLowerCase().includes('hr'))
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
        if (!val || isNaN(parseFloat(val)) || parseFloat(val) <= 0) { alert("Iltimos, 0 dan katta to'g'ri summa kiriting!"); return; }

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
        await renderBuhIshlabChiqarish();
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

    async function renderBuhIshlabChiqarish() {
        const tableBody = document.getElementById('buh-ishlab-chiqarish-table');
        if (!tableBody) return;
        
        if (!window.clapakProducts || window.clapakProducts.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:rgba(255,255,255,0.2); padding:30px;">Mahsulotlar topilmadi</td></tr>';
            return;
        }

        const getProductSizeLocal = (name) => {
            const startMatch = name.match(/^(\d+)/);
            if (startMatch) return startMatch[1];
            const rMatch = name.match(/R(\d+)/i);
            if (rMatch) return rMatch[1];
            const anyNumMatch = name.match(/\b(1[2-9]|2[0-2])\b/);
            if (anyNumMatch) return anyNumMatch[1];
            return "Boshqa";
        };

        // Populate filter dropdown if it has only Barchasi
        const filterEl = document.getElementById('buh-ishlab-chiqarish-size-filter');
        if (filterEl && filterEl.children.length === 1) {
            const uniqueSizes = [...new Set(window.clapakProducts.map(p => getProductSizeLocal(p.name)))].sort((a, b) => {
                if (a === 'Boshqa') return 1;
                if (b === 'Boshqa') return -1;
                return parseInt(a) - parseInt(b);
            });
            
            filterEl.innerHTML = `
                <option value="all" style="background:#070f19; color:#fff;">Barchasi</option>
                ${uniqueSizes.map(sz => `<option value="${sz}" style="background:#070f19; color:#fff;">${sz}-lik</option>`).join('')}
            `;
        }

        const selectedSize = filterEl ? filterEl.value : 'all';
        const filteredProducts = selectedSize === 'all'
            ? window.clapakProducts
            : window.clapakProducts.filter(p => getProductSizeLocal(p.name) === selectedSize);
        
        tableBody.innerHTML = filteredProducts.map(p => {
            const rawGrams = p.rawPerUnit !== undefined ? (parseFloat(p.rawPerUnit) * 1000).toFixed(0) : 600;
            return `<tr>
                <td style="font-weight:700; color:#fff;">${p.name}</td>
                <td style="text-transform: uppercase; font-size: 0.75rem; font-weight: 800; color: ${p.design === 'malibu' ? '#ffaa00' : '#00d2ff'};">${p.design === 'malibu' ? 'Sport Carbon' : 'Silver Multi'}</td>
                <td style="font-weight:700; color: #ba00ff; font-family: 'Outfit';">${rawGrams} g</td>
                <td>
                    <input type="number" class="buh-input buh-raw-weight-input" data-product-id="${p.id}" value="${rawGrams}" style="width: 100px; padding: 6px 10px; margin: 0; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; text-align: center; color: #fff;">
                </td>
                <td>
                    <button class="buh-btn-primary" onclick="window.saveProductRawWeight('${p.id}')" style="padding: 6px 12px; font-size: 0.75rem; border-radius: 8px;">Saqlash</button>
                </td>
            </tr>`;
        }).join('');
    }

    window.filterBuhIshlabChiqarish = () => {
        renderBuhIshlabChiqarish();
    };

    window.saveProductRawWeight = (productId) => {
        const inputEl = document.querySelector(`.buh-raw-weight-input[data-product-id="${productId}"]`);
        if (!inputEl) return;
        const newWeightGrams = parseFloat(inputEl.value);
        if (isNaN(newWeightGrams) || newWeightGrams <= 0) {
            alert("Iltimos, noldan katta og'irlik kiriting!");
            return;
        }
        
        const p = window.clapakProducts.find(x => x.id === productId);
        if (p) {
            const oldWeight = p.rawPerUnit;
            p.rawPerUnit = newWeightGrams / 1000;
            localStorage.setItem('clapak_products_v4', JSON.stringify(window.clapakProducts));
            
            window.showPremiumToast(
                "Sarf Yangilandi",
                `"${p.name}" uchun 1 dona sarfi ${(oldWeight * 1000).toFixed(0)} g dan ${newWeightGrams.toFixed(0)} g ga o'zgartirildi.`,
                true
            );
            
            renderBuhIshlabChiqarish();
        }
    };

    window.saveAllProductRawWeights = () => {
        const inputs = document.querySelectorAll('.buh-raw-weight-input');
        let updatedCount = 0;
        inputs.forEach(inputEl => {
            const productId = inputEl.getAttribute('data-product-id');
            const newWeightGrams = parseFloat(inputEl.value);
            if (!isNaN(newWeightGrams) && newWeightGrams > 0) {
                const p = window.clapakProducts.find(x => x.id === productId);
                if (p && parseFloat((p.rawPerUnit * 1000).toFixed(0)) !== newWeightGrams) {
                    p.rawPerUnit = newWeightGrams / 1000;
                    updatedCount++;
                }
            }
        });
        
        if (updatedCount > 0) {
            localStorage.setItem('clapak_products_v4', JSON.stringify(window.clapakProducts));
            window.showPremiumToast(
                "Barcha Sarflar Yangilandi",
                `${updatedCount} ta mahsulot xom-ashyo sarfi muvaffaqiyatli saqlandi.`,
                true
            );
            renderBuhIshlabChiqarish();
        } else {
            window.showPremiumToast("O'zgarish Yo'q", "Hech qanday o'zgarish kiritilmadi.", false);
        }
    };
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

    const getProductSize = (name) => {
        const startMatch = name.match(/^(\d+)/);
        if (startMatch) return startMatch[1];
        const rMatch = name.match(/R(\d+)/i);
        if (rMatch) return rMatch[1];
        const anyNumMatch = name.match(/\b(1[2-9]|2[0-2])\b/);
        if (anyNumMatch) return anyNumMatch[1];
        return "Boshqa";
    };

    const getProductBaseName = (name, size) => {
        let base = name;
        if (size !== 'Boshqa') {
            base = base.replace(new RegExp('^' + size + '\\s*'), '');
            base = base.replace(new RegExp('\\s*R' + size + '\\b', 'i'), '');
            base = base.replace(new RegExp('\\s*' + size + '\\b'), '');
        }
        return base.trim();
    };

    window.onZakazSizeChange = () => {
        const sizeEl = document.getElementById('zakazSize');
        const selectEl = document.getElementById('zakazModel');
        if (!sizeEl || !selectEl) return;
        
        const selectedSize = sizeEl.value;
        let filtered = window.clapakProducts;
        if (selectedSize !== 'all') {
            filtered = window.clapakProducts.filter(p => getProductSize(p.name) === selectedSize);
        }
        
        selectEl.innerHTML = filtered.map(p => {
            const size = getProductSize(p.name);
            const baseName = selectedSize !== 'all' ? getProductBaseName(p.name, size) : p.name;
            return `
                <option value="${p.model}" style="background:#070f19; color:#fff;">${baseName} (${p.design === 'malibu' ? 'Sport Carbon' : 'Silver Multi'})</option>
            `;
        }).join('');
        
        window.calcZakazMaterials();
    };

    window.openZakazModal = () => {
        const modal = document.getElementById('zakazModal');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('zakazForm').reset();
            
            // Populate size dropdown
            const sizeEl = document.getElementById('zakazSize');
            if (sizeEl) {
                const uniqueSizes = [...new Set(window.clapakProducts.map(p => getProductSize(p.name)))].sort((a, b) => {
                    if (a === 'Boshqa') return 1;
                    if (b === 'Boshqa') return -1;
                    return parseInt(a) - parseInt(b);
                });
                
                sizeEl.innerHTML = `
                    <option value="all" style="background:#070f19; color:#fff;">Barchasi</option>
                    ${uniqueSizes.map(sz => `<option value="${sz}" style="background:#070f19; color:#fff;">${sz}-lik</option>`).join('')}
                `;
            }
            
            window.onZakazSizeChange();
            window.toggleZakazFields();
            
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
            promoPerSet: promoPerSet,
            createdAt: new Date().toISOString()
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
                const shortId = typeof orderId === 'string' && orderId.length > 8 ? orderId.substring(0, 8).toUpperCase() : orderId;
                
                const pdfId = document.getElementById('pdfOrderId');
                if (pdfId) pdfId.textContent = shortId;
                
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
                        margin:       [0.4, 0.4],
                        filename:     `Shartnoma_${clientName.replace(/\s+/g, '_')}_${shortId}.pdf`,
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

    window.loadSystemUsers = async function() {
        const tbody = document.getElementById('sysUsersTable');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; opacity:0.5; padding:20px; color:#fff;">Yuklanmoqda...</td></tr>';
        
        let users = [];
        try {
            const { data, error } = await supabase.from('system_users').select('*').order('username', { ascending: true });
            if (!error && data && data.length > 0) {
                users = data;
            }
        } catch (err) {
            console.warn("Error loading system users from Supabase:", err);
        }
        
        if (users.length === 0) {
            const localRaw = localStorage.getItem('system_users_local');
            if (localRaw) {
                users = JSON.parse(localRaw);
            } else {
                users = [
                    { id: "c019b7cb-1b30-48b0-a526-d87c3535cc89", username: "admin", password: "123", full_name: "Super Admin", role: "admin" },
                    { id: "41842320-5831-4556-aaf9-a00b6c82133d", username: "hr", password: "123", full_name: "Kadirlar Bo'limi", role: "hr" },
                    { id: "550b6df7-52fa-4b43-9285-383d55b6cb86", username: "ombor", password: "123", full_name: "Ali", role: "manager" },
                    { id: "26bce1d4-3e98-4703-abf8-754cd686ed86", username: "sotuv", password: "123", full_name: "Jasur", role: "sotuv" },
                    { id: "401046f5-7668-47c5-8099-cb9c81d0d6ca", username: "123", password: "123", full_name: "botir", role: "ishlab_chiqarish" }
                ];
                localStorage.setItem('system_users_local', JSON.stringify(users));
            }
        }
        
        tbody.innerHTML = '';
        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:15px 24px; color:#fff; font-weight:600;">${u.full_name}</td>
                <td><span style="background:rgba(0,210,255,0.1); color:#00d2ff; padding:4px 10px; border-radius:30px; font-size:0.75rem; font-weight:700;">${u.role.toUpperCase()}</span></td>
                <td style="font-family:monospace; color:rgba(255,255,255,0.6); font-size:0.85rem;"><code>${u.username}</code> / <code>${u.password}</code></td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="width:8px; height:8px; border-radius:50%; background:#00ff88; box-shadow:0 0 8px #00ff88;"></span>
                        <span style="font-size:0.75rem; color:#00ff88; font-weight:700;">Faol</span>
                    </div>
                </td>
                <td>
                    <button onclick="window.deleteSystemUser('${u.id}')" style="background:rgba(255,77,79,0.1); border:1px solid rgba(255,77,79,0.2); color:#ff4d4f; padding:4px 8px; border-radius:6px; cursor:pointer;" title="O'chirish">🗑️ O'chirish</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    };

    window.deleteSystemUser = async function(id) {
        if (!confirm("Haqiqatdan ham ushbu loginni o'chirmoqchimisiz?")) return;
        
        try {
            await supabase.from('system_users').delete().eq('id', id);
        } catch (e) {
            console.warn("Could not delete from Supabase, removing locally", e);
        }
        
        let localUsers = JSON.parse(localStorage.getItem('system_users_local') || '[]');
        localUsers = localUsers.filter(u => u.id !== id);
        localStorage.setItem('system_users_local', JSON.stringify(localUsers));
        
        alert("O'chirildi!");
        window.loadSystemUsers();
    };

    // Attach click listener for openAddUserModal
    setTimeout(() => {
        const addUserBtn = document.getElementById('openAddUserModal');
        if (addUserBtn) {
            addUserBtn.onclick = async () => {
                const fname = prompt("Foydalanuvchi to'liq ismini kiriting:");
                if (!fname) return;
                const username = prompt("Login (username) kiriting:");
                if (!username) return;
                const password = prompt("Parol kiriting:");
                if (!username) return; // password was verified but checking username just in case
                if (!password) return;
                const role = prompt("Rolni kiriting (admin, hr, manager, sotuv, ishlab_chiqarish):", "sotuv");
                if (!role) return;
                
                const payload = {
                    username,
                    password,
                    full_name: fname,
                    role
                };
                
                let saved = false;
                try {
                    const { error } = await supabase.from('system_users').insert([payload]);
                    if (!error) saved = true;
                } catch(e) {}
                
                let localUsers = JSON.parse(localStorage.getItem('system_users_local') || '[]');
                payload.id = 'local-' + Date.now();
                localUsers.push(payload);
                localStorage.setItem('system_users_local', JSON.stringify(localUsers));
                saved = true;
                
                if (saved) {
                    alert("Yaratildi!");
                    window.loadSystemUsers();
                }
            };
        }
    }, 1000);
