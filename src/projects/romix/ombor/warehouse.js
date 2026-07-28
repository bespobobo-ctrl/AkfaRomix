import { supabase } from '@/core/supabase.js';
import { LayoutService } from '@/components/LayoutService.js';
import { authService } from '@/services/auth/authService.js';
import { ROLES } from '@/constants';
import windowProfile from '../../../assets/images/window_profile.png';

const defaultEmployees = [
    { id: "emp-1", full_name: "Sharifi Miad", first_name: "Sharifi", last_name: "Miad", role: "Ofis", salary_info: "7000000", salary: 7000000, department: "Ofis", dept: "Ofis", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-2", full_name: "Mullajonov Xurshid", first_name: "Mullajonov", last_name: "Xurshid", role: "Brigadir", salary_info: "12000000", salary: 12000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-3", full_name: "Atbaev Temirxon", first_name: "Atbaev", last_name: "Temirxon", role: "Zamershik", salary_info: "6000000", salary: 6000000, department: "Sotuv", dept: "Sotuv", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-4", full_name: "Abdullaev Axror", first_name: "Abdullaev", last_name: "Axror", role: "Omborchi", salary_info: "8000000", salary: 8000000, department: "Ombor", dept: "Ombor", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-5", full_name: "Nematov Ziyovuddin", first_name: "Nematov", last_name: "Ziyovuddin", role: "Ishchi", salary_info: "7000000", salary: 7000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-6", full_name: "Shorasul", first_name: "Shorasul", last_name: "", role: "Ustanovshik", salary_info: "8000000", salary: 8000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-7", full_name: "Ulugbek", first_name: "Ulugbek", last_name: "", role: "Sborshik", salary_info: "6000000", salary: 6000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-8", full_name: "Usanov Shuxrat", first_name: "Usanov", last_name: "Shuxrat", role: "Qorovul", salary_info: "2500000", salary: 2500000, department: "Xo'jalik", dept: "Xo'jalik", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-9", full_name: "Akramov Zaynabiddin", first_name: "Akramov", last_name: "Zaynabiddin", role: "Qorovul", salary_info: "2500000", salary: 2500000, department: "Xo'jalik", dept: "Xo'jalik", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-10", full_name: "Najmiddinov Azimxon", first_name: "Najmiddinov", last_name: "Azimxon", role: "Ishchi", salary_info: "0", salary: 0, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-11", full_name: "Najmiddinov Akobir", first_name: "Najmiddinov", last_name: "Akobir", role: "Ishchi", salary_info: "6000000", salary: 6000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-12", full_name: "Rasulov Lutfullo", first_name: "Rasulov", last_name: "Lutfullo", role: "Ishchi", salary_info: "0", salary: 0, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-13", full_name: "Kodirov Shoxrux", first_name: "Kodirov", last_name: "Shoxrux", role: "Menejer", salary_info: "11000000", salary: 11000000, department: "Sotuv", dept: "Sotuv", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-14", full_name: "Ergashev Otabek", first_name: "Ergashev", last_name: "Otabek", role: "Hisobchi", salary_info: "9000000", salary: 9000000, department: "Ofis", dept: "Ofis", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-15", full_name: "Aitbaev Nurlan", first_name: "Aitbaev", last_name: "Nurlan", role: "Zamershik", salary_info: "8500000", salary: 8500000, department: "Sotuv", dept: "Sotuv", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-16", full_name: "Rajapov Xasan", first_name: "Rajapov", last_name: "Xasan", role: "Usta", salary_info: "12000000", salary: 12000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-17", full_name: "Xakimov Mels (Olloyor)", first_name: "Xakimov", last_name: "Mels", role: "Usta", salary_info: "8000000", salary: 8000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-18", full_name: "Eshtoev Jaxongir", first_name: "Eshtoev", last_name: "Jaxongir", role: "Usta", salary_info: "12000000", salary: 12000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-19", full_name: "Otabek Ustanovshik", first_name: "Otabek", last_name: "Ustanovshik", role: "Usta", salary_info: "8500000", salary: 8500000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-20", full_name: "Mirazizov Sunnat", first_name: "Mirazizov", last_name: "Sunnat", role: "Brigadir", salary_info: "9000000", salary: 9000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-21", full_name: "Muminkulov Jasur", first_name: "Muminkulov", last_name: "Jasur", role: "Ishchi", salary_info: "10000000", salary: 10000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-22", full_name: "Shavkatov Jaxongir", first_name: "Shavkatov", last_name: "Jaxongir", role: "Ustanovshik brigadir", salary_info: "8000000", salary: 8000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" }
];

document.addEventListener('DOMContentLoaded', async () => {
    const user = authService.getCurrentUser();
    if (!user || (user.role !== ROLES.MANAGER && user.role !== ROLES.ADMIN)) {
        authService.logout();
        return;
    }

    LayoutService.init('OMBOR');

    if (user.role === ROLES.MANAGER || user.username === 'ombor') {
        const kirimBtn = document.getElementById('openKirimModal');
        const profKirimBtn = document.getElementById('openProfilKirimModal');
        if (kirimBtn) kirimBtn.classList.add('hidden');
        if (profKirimBtn) profKirimBtn.classList.add('hidden');
    }

    // Elements
    const inventoryTable = document.getElementById('inventoryTable');
    const historyGrid = document.getElementById('historyGrid');
    const sections = document.querySelectorAll('.warehouse-section');
    const navButtons = document.querySelectorAll('.nav-icon, .tab-btn');

    const kirimModal = document.getElementById('kirimModal');
    const profilKirimModal = document.getElementById('profilKirimModal');
    const openProfilKirimModal = document.getElementById('openProfilKirimModal');
    const closeProfilKirim = document.getElementById('closeProfilKirim');
    const editModal = document.getElementById('editProductModal');
    const staffModal = document.getElementById('staffModal');
    const mainApp = document.getElementById('mainApp');
    const printArea = document.getElementById('printArea');
    const saveKirimBtn = document.getElementById('saveKirimBtn');
    const saveStaffBtn = document.getElementById('saveStaffBtn');

    // UI Setup
    document.getElementById('userName').textContent = user.full_name || user.username.toUpperCase();
    document.getElementById('invAdm').textContent = user.full_name || user.username.toUpperCase();

    // --- Tab Switching ---
    function switchTab(tabId) {
        sections.forEach(s => s.classList.add('hidden'));
        const target = document.getElementById(`${tabId}-view`);
        if (target) target.classList.remove('hidden');

        document.querySelectorAll('.nav-icon, .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll(`[data-tab="${tabId}"]`).forEach(b => b.classList.add('active'));

        if (tabId === 'umumiy') loadOmborUmumiy();
        if (tabId === 'inventory') { loadInventory(); loadOmborJami(); }
        if (tabId === 'staff') loadStaff();
        if (tabId === 'history') loadHistory();
        if (tabId === 'settings') loadSettings();
        if (tabId === 'orders') loadOrdersConfirmation();
        if (tabId === 'requests') { if (typeof window.loadRequests === 'function') window.loadRequests(); }
    }

    navButtons.forEach(btn => {
        btn.onclick = () => {
            const tab = btn.getAttribute('data-tab');
            if (tab) switchTab(tab);
        };
    });

    // "inventory" HTML'da boshidanoq active/ko'rinadigan qilib belgilangan, lekin
    // ma'lumot faqat switchTab() chaqirilganda (ya'ni tugma bosilganda) yuklanardi —
    // shuning uchun sahifa yangi ochilganda "--" bo'sh holatda qolib ketardi, foydalanuvchi
    // boshqa bo'limga o'tib qaytmaguncha. Endi shu bo'lim uchun ham darhol yuklanadi.
    loadInventory();
    loadOmborJami();

    // --- Inventory Logic ---
    // Global filter states
    window.activeBrand = 'AKFA';
    window.activeCategory = 'Barchasi';
    window.seriesColorFilters = {};
    window.expandedSeries = {};
    window.cachedInventoryData = [];

    // Settings Config for Brands & Categories
    const defaultBrands = [
        { name: 'AKFA', visible: true },
        { name: 'RETPEN', visible: true },
        { name: 'Ekopen', visible: true },
        { name: 'ALTA PLAST', visible: true },
        { name: 'ALUBEST', visible: true },
        { name: 'ALUTEX', visible: true },
        { name: 'CRA', visible: true }
    ];

    const defaultCategories = [
        { name: 'Barchasi', visible: true },
        { name: 'Plastik', visible: true },
        { name: 'Alyuminiy', visible: true },
        { name: 'Tokcha', visible: true },
        { name: 'Shtapik', visible: true },
        { name: 'Lambri', visible: true }
    ];

    // Parse & Normalize Brands
    let storedBrands = localStorage.getItem('romix_brands_config');
    if (storedBrands) {
        try {
            let parsed = JSON.parse(storedBrands);
            if (Array.isArray(parsed)) {
                window.brandsConfig = parsed.map(b => typeof b === 'string' ? { name: b, visible: true } : b);
            } else {
                window.brandsConfig = defaultBrands;
            }
        } catch(e) {
            window.brandsConfig = defaultBrands;
        }
    } else {
        window.brandsConfig = defaultBrands;
    }

    // Parse & Normalize Categories
    let storedCats = localStorage.getItem('romix_categories_config');
    if (storedCats) {
        try {
            let parsed = JSON.parse(storedCats);
            if (Array.isArray(parsed)) {
                window.categoriesConfig = parsed.map(c => typeof c === 'string' ? { name: c, visible: true } : c);
            } else {
                window.categoriesConfig = defaultCategories;
            }
        } catch(e) {
            window.categoriesConfig = defaultCategories;
        }
    } else {
        window.categoriesConfig = defaultCategories;
    }

    // Helper: Map brand logos
    function getBrandLogoSvg(brandName, isActive) {
        if (brandName.toUpperCase() === 'AKFA') {
            return `<svg viewBox="0 0 120 40" class="brand-logo-svg" style="height: 18px; width: 60px;"><text x="0" y="30" font-family="'Outfit', sans-serif" font-weight="900" font-size="30" fill="${isActive ? '#ffffff' : '#FF3333'}">akfa</text></svg>`;
        } else if (brandName.toUpperCase() === 'RETPEN') {
            return `<svg viewBox="0 0 120 40" class="brand-logo-svg" style="height: 18px; width: 65px;"><text x="0" y="30" font-family="'Outfit', sans-serif" font-weight="800" font-size="24" fill="${isActive ? '#ffffff' : '#00D2FF'}">RETPEN</text></svg>`;
        } else if (brandName.toUpperCase() === 'EKOPEN') {
            return `<svg viewBox="0 0 120 40" class="brand-logo-svg" style="height: 18px; width: 65px;"><text x="0" y="30" font-family="'Outfit', sans-serif" font-weight="800" font-size="24" fill="${isActive ? '#ffffff' : '#FF8800'}">Ekopen</text></svg>`;
        } else if (brandName.toUpperCase() === 'ALTA PLAST') {
            return `<span style="color:${isActive ? '#ffffff' : '#e2e8f0'}; font-weight:700; font-size:0.85rem; letter-spacing:0.5px;">ALTA PLAST</span>`;
        } else if (brandName.toUpperCase() === 'ALUBEST') {
            return `<span style="color:${isActive ? '#ffffff' : '#007AFF'}; font-weight:800; font-size:0.9rem; letter-spacing:0.5px;">ALUBEST</span>`;
        } else if (brandName.toUpperCase() === 'ALUTEX') {
            return `<span style="color:${isActive ? '#ffffff' : '#00E5FF'}; font-weight:800; font-size:0.9rem; letter-spacing:0.5px;">ALUTEX</span>`;
        } else if (brandName.toUpperCase() === 'CRA') {
            return `<span style="color:${isActive ? '#ffffff' : '#FF4D4F'}; font-weight:900; font-size:0.95rem; letter-spacing:0.5px;">CRA</span>`;
        }
        return `<span style="color:#ffffff; font-weight:700; font-size:0.85rem;">${brandName}</span>`;
    }

    async function loadInventory() {
        const { data, error } = await supabase.from('romix_inventory').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error("Inventory error:", error);
            if (inventoryTable) inventoryTable.innerHTML = '<div style="text-align:center; color:red; padding:40px; font-weight:700;">Hujjatlar yuklanishida xatolik yuz berdi!</div>';
            return;
        }

        window.cachedInventoryData = data;

        // Calculate Stats
        const totalItems = data.length;
        const lowStock = data.filter(p => p.stock_quantity < 10).length;
        const totalQty = data.reduce((acc, p) => acc + (Number(p.stock_quantity) || 0), 0);

        document.getElementById('statTotalItems').textContent = totalItems;
        document.getElementById('statLowStock').textContent = lowStock;
        document.getElementById('statTodayIn').textContent = totalQty.toLocaleString('uz-UZ');

        renderBrandSelector();
        renderCategoryTabs();
        renderCatalogGrid();
    }

    function renderBrandSelector() {
        const row = document.getElementById('brandSelectorRow');
        if (!row) return;
        
        row.innerHTML = '';
        
        // Only display visible brands
        const visibleBrands = window.brandsConfig.filter(b => b.visible).map(b => b.name);
        
        // Ensure activeBrand is a valid visible brand
        if (visibleBrands.length > 0 && !visibleBrands.some(b => b.toUpperCase() === window.activeBrand.toUpperCase())) {
            window.activeBrand = visibleBrands[0];
        }
        
        visibleBrands.forEach(b => {
            const card = document.createElement('div');
            const isActive = window.activeBrand.toUpperCase() === b.toUpperCase();
            
            let activeClass = '';
            if (isActive) {
                const brandLower = b.toLowerCase();
                if (brandLower.includes('akfa')) activeClass = 'active-akfa';
                else if (brandLower.includes('retpen')) activeClass = 'active-retpen';
                else if (brandLower.includes('ekopen')) activeClass = 'active-ekopen';
                else if (brandLower.includes('alta')) activeClass = 'active-altaplast';
                else if (brandLower.includes('alubest')) activeClass = 'active-alubest';
                else if (brandLower.includes('alutex')) activeClass = 'active-alutex';
                else if (brandLower.includes('cra')) activeClass = 'active-cra';
                else activeClass = 'active-generic';
            }
            
            card.className = `brand-card ${activeClass}`;
            card.innerHTML = getBrandLogoSvg(b, isActive);
            card.onclick = () => {
                window.activeBrand = b;
                renderBrandSelector();
                renderCatalogGrid();
            };
            row.appendChild(card);
        });
    }

    function renderCategoryTabs() {
        const row = document.getElementById('categoryTabsRow');
        if (!row) return;
        
        row.innerHTML = '';
        
        // Only display visible categories
        const visibleCategories = window.categoriesConfig.filter(c => c.visible);
        const visibleCatNames = visibleCategories.map(c => c.name);
        
        // Ensure activeCategory is set to a valid visible category
        if (visibleCatNames.length > 0 && !visibleCatNames.includes(window.activeCategory)) {
            window.activeCategory = visibleCatNames[0];
        }
        
        visibleCategories.forEach(c => {
            const tab = document.createElement('div');
            const isActive = window.activeCategory === c.name;
            tab.className = `category-tab ${isActive ? 'active' : ''}`;
            tab.textContent = c.name === 'Plastik' ? 'Plast (PVC)' : c.name === 'Alyuminiy' ? 'Alumin' : c.name;
            tab.onclick = () => {
                window.activeCategory = c.name;
                renderCategoryTabs();
                renderCatalogGrid();
            };
            row.appendChild(tab);
        });
    }

    window.renderCatalogGrid = function(searchQuery = '') {
        const container = document.getElementById('inventoryTable');
        if (!container) return;

        let filtered = window.cachedInventoryData;

        // 1. Filter by Search Query
        if (searchQuery) {
            const q = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(p => {
                const name = (p.product_name || '').toLowerCase();
                const desc = (p.description || '').toLowerCase();
                const cat = (p.category || '').toLowerCase();
                return name.includes(q) || desc.includes(q) || cat.includes(q);
            });
        }

        // 2. Filter by Active Brand
        filtered = filtered.filter(p => {
            const metadata = p.metadata || {};
            let brand = metadata.brend || '';
            if (!brand) {
                const brands = window.brandsConfig.map(b => b.name);
                for (let b of brands) {
                    if ((p.product_name || '').toUpperCase().includes(b.toUpperCase())) {
                        brand = b;
                        break;
                    }
                }
            }
            return brand.toUpperCase().includes(window.activeBrand.toUpperCase());
        });

        // 3. Filter by Active Category
        if (window.activeCategory !== 'Barchasi') {
            filtered = filtered.filter(p => {
                const cat = (p.category || '').toLowerCase();
                const name = (p.product_name || '').toLowerCase();
                const activeLower = window.activeCategory.toLowerCase();
                
                if (activeLower === 'plastik') {
                    // PVC matches Plastik or name contains Plastik
                    return cat.includes('plastik') || name.includes('plastik') || cat.includes('pvc') || (p.metadata?.brend || '').toLowerCase().includes('plastik');
                } else if (activeLower === 'alyuminiy') {
                    // Aluminum matches Alyuminiy or Termo
                    return cat.includes('alyuminiy') || name.includes('alyuminiy') || cat.includes('termo') || (p.metadata?.brend || '').toLowerCase().includes('alyuminiy');
                }
                return cat.includes(activeLower) || name.includes(activeLower);
            });
        }

        container.innerHTML = '';
        if (filtered.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:50px; color:#888; font-weight:600; font-size:1.1rem; width:100%;">Filtrlangan mahsulotlar topilmadi.</div>';
            return;
        }

        // 4. Group remaining products by Series
        const groups = {};
        filtered.forEach(p => {
            const metadata = p.metadata || {};
            let seriesName = metadata.seriya || '';
            if (!seriesName) {
                // Try parsing series from name e.g. "6000 QVT"
                const match = p.product_name.match(/(\d+\s*[A-Z]+)/i);
                seriesName = match ? match[1] : 'Boshqalar';
            }
            if (!groups[seriesName]) groups[seriesName] = [];
            groups[seriesName].push(p);
        });

        // Render Series accordion cards
        Object.keys(groups).forEach(series => {
            const items = groups[series];
            const activeColor = window.seriesColorFilters[series] || 'Barchasi';
            const isOpen = window.expandedSeries[series] === true; // Collapse by default

            // Filter items within this series by Color
            let seriesFilteredItems = items;
            if (activeColor !== 'Barchasi') {
                seriesFilteredItems = items.filter(p => {
                    const rangi = p.metadata?.rangi || p.description?.split('|')?.[2]?.split('(')?.[0]?.trim() || '';
                    return rangi.toUpperCase() === activeColor.toUpperCase();
                });
            }

            // Get unique colors in this series for swatch chips
            const colorsSet = new Set(['Barchasi']);
            items.forEach(p => {
                const rangi = p.metadata?.rangi || p.description?.split('|')?.[2]?.split('(')?.[0]?.trim() || '';
                if (rangi) colorsSet.add(rangi);
            });
            const uniqueColors = Array.from(colorsSet);

            const accordion = document.createElement('div');
            accordion.className = `series-accordion-card ${isOpen ? 'open' : ''}`;
            
            // Header HTML
            accordion.innerHTML = `
                <div class="series-card-header">
                    <div class="series-header-left">
                        <span class="series-title">${series}</span>
                        <span class="series-items-count">${seriesFilteredItems.length} mahsulot</span>
                    </div>
                    <div class="series-chevron-btn">▼</div>
                </div>
                <div class="series-card-body">
                    <!-- Color Swatches Chips row -->
                    <div class="color-chips-container"></div>
                    <!-- Catalog Products Grid -->
                    <div class="catalog-products-grid"></div>
                </div>
            `;

            // Expand/Collapse binding
            const header = accordion.querySelector('.series-card-header');
            header.onclick = () => {
                const isCurrentlyOpen = accordion.classList.toggle('open');
                window.expandedSeries[series] = isCurrentlyOpen;
            };

            // Render Color chips
            const chipsContainer = accordion.querySelector('.color-chips-container');
            uniqueColors.forEach(col => {
                const chip = document.createElement('div');
                const isChipActive = activeColor.toUpperCase() === col.toUpperCase();
                chip.className = `color-chip ${isChipActive ? 'active' : ''}`;
                
                // Draw small swatch circle for visual premium styling
                let swatchCircle = '';
                if (col !== 'Barchasi') {
                    let cHex = '#FFFFFF';
                    const cUpper = col.toUpperCase();
                    if (cUpper.includes('QORA')) cHex = '#111111';
                    else if (cUpper.includes('DUB') || cUpper.includes('TILLA')) cHex = '#CD7F32';
                    else if (cUpper.includes('MOCHA')) cHex = '#4B3621';
                    swatchCircle = `<div style="width:10px; height:10px; border-radius:50%; background:${cHex}; border:1px solid rgba(255,255,255,0.3);"></div>`;
                }
                
                chip.innerHTML = `${swatchCircle} <span>${col}</span>`;
                chip.onclick = (e) => {
                    e.stopPropagation(); // prevent collapsing accordion
                    window.seriesColorFilters[series] = col;
                    window.renderCatalogGrid(searchQuery);
                };
                chipsContainer.appendChild(chip);
            });

            // Render List Items
            const listContainer = accordion.querySelector('.catalog-products-grid');
            if (seriesFilteredItems.length === 0) {
                listContainer.innerHTML = '<div style="padding:15px; color:#888; font-size:0.85rem; text-align:center; grid-column: 1/-1;">Ushbu rangda mahsulot topilmadi.</div>';
            } else {
                seriesFilteredItems.forEach(p => {
                    const row = document.createElement('div');
                    row.className = 'catalog-item-card';
                    
                    // Clean product name to match mockup beautifully
                    let displayName = p.product_name;
                    displayName = displayName.replace(window.activeBrand, '').replace(series, '').trim();
                    if (displayName.startsWith('Profil')) displayName = displayName.substring(6).trim();
                    if (!displayName) displayName = p.product_name; // fallback

                    const metadata = p.metadata || {};
                    const uzunligi = metadata.uzunligi || p.description?.match(/(\d+)mm/)?.[1] || '---';
                    const shakli = metadata.shakli || p.description?.split('|')?.[1]?.trim() || '---';
                    const rangi = metadata.rangi || p.description?.split('|')?.[2]?.split('(')?.[0]?.trim() || '---';
                    const rangTuri = metadata.rangTuri || p.description?.match(/\(([^)]+)\)/)?.[1] || '---';

                    // Quantity status
                    const isLowStock = p.stock_quantity < 10;
                    const qtyClass = isLowStock ? 'qty-low' : 'qty-normal';

                    const isAdmin = user && user.role === 'admin';
                    const actionsHtml = isAdmin ? `
                            <div class="card-actions">
                                <button class="card-action-btn edit-btn" data-id="${p.id}" title="Tahrirlash">✏️</button>
                                <button class="card-action-btn delete-btn delete-accent" data-id="${p.id}" title="O'chirish" style="color:#ff4d4f;">🗑️</button>
                            </div>
                    ` : '';

                    row.innerHTML = `
                        <div class="card-visual-container" style="height: 130px; overflow: hidden; border-radius: 14px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.05); margin-bottom: 8px; display: flex; align-items: center; justify-content: center; position: relative;">
                            <img src="${windowProfile}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s;" class="card-visual-img" />
                            <div class="card-badge-shape" style="position: absolute; top: 10px; left: 10px; margin: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.1);">${shakli !== '---' ? shakli : 'Profil'}</div>
                        </div>
                        <div class="card-details">
                            <h4 class="card-product-name">${displayName}</h4>
                            <div class="card-specs-row">
                                ${uzunligi !== '---' ? `<span class="spec-chip">📏 ${uzunligi} mm</span>` : ''}
                                ${rangi !== '---' ? `<span class="spec-chip">🎨 ${rangi}</span>` : ''}
                                ${rangTuri !== '---' && rangTuri !== '---' ? `<span class="spec-chip tint-chip">${rangTuri}</span>` : ''}
                            </div>
                        </div>
                        <div class="card-footer-row">
                            <div class="qty-status-block">
                                <span class="qty-label">Zaxira:</span>
                                <span class="qty-val ${qtyClass}">${p.stock_quantity} ${p.unit || 'dona'}</span>
                            </div>
                            ${actionsHtml}
                        </div>
                    `;
                    listContainer.appendChild(row);
                });
            }

            container.appendChild(accordion);
        });

        // Rebind Edit/Delete listeners to dynamically generated lists
        document.querySelectorAll('.delete-btn').forEach(b => {
            b.onclick = async (e) => {
                e.stopPropagation();
                if (confirm('Ushbu mahsulotni o\'chirmoqchimisiz?')) {
                    const { error } = await supabase.from('romix_inventory').delete().eq('id', b.dataset.id);
                    if (error) {
                        alert("Xatolik: mahsulot bazadan o'chmadi — " + (error.message || "sabab noma'lum") + ". (Ehtimol RLS ruxsati yoki boshqa jadvalda bog'liq yozuv bor.)");
                        return;
                    }
                    loadInventory();
                }
            };
        });

        document.querySelectorAll('.edit-btn').forEach(b => {
            b.onclick = (e) => {
                e.stopPropagation();
                const p = window.cachedInventoryData.find(x => x.id === b.dataset.id);
                if (p) {
                    window.editingProdId = p.id;
                    document.getElementById('eName').value = p.product_name;
                    document.getElementById('eQty').value = p.stock_quantity;
                    editModal.classList.remove('hidden');
                }
            };
        });
    };

    // --- Search Feature ---
    const inventorySearch = document.getElementById('inventorySearch');
    if (inventorySearch) {
        inventorySearch.oninput = () => {
            const query = inventorySearch.value.toLowerCase().trim();
            window.renderCatalogGrid(query);
        };
    }

    // --- Staff Logic ---
    async function loadStaff() {
        const staffGrid = document.getElementById('staffGrid');
        staffGrid.innerHTML = '<div style="color:#888; padding:20px;">Yuklanmoqda...</div>';

        let data = [];
        let dbError = null;
        try {
            const res = await supabase.from('romix_staff').select('*').order('created_at', { ascending: false });
            if (res.error) throw res.error;
            data = res.data;
        } catch (error) {
            console.warn("Supabase staff query failed, falling back to local storage", error);
            dbError = error;
            const localRaw = localStorage.getItem('romix_employees_local');
            if (localRaw && JSON.parse(localRaw).length > 0) {
                data = JSON.parse(localRaw);
            } else {
                data = defaultEmployees;
                localStorage.setItem('romix_employees_local', JSON.stringify(data));
            }
        }

        staffGrid.innerHTML = '';
        if (data.length === 0) {
            staffGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:#888;">Hozircha xodimlar yo\'q.</div>';
        }

        data.forEach(s => {
            const card = document.createElement('div');
            const displayId = s.id ? (s.id.startsWith('romix-') ? s.id.slice(6, 14).toUpperCase() : s.id.slice(0, 8).toUpperCase()) : 'TEMP';
            const salaryVal = s.salary || s.salary_info || 0;
            card.className = 'bento-item staff-card';
            card.innerHTML = `
                <div class="staff-avatar-wrapper">
                    <img src="${s.photo_url || s.avatar_url || 'https://via.placeholder.com/150'}" class="staff-avatar">
                    <div class="qr-overlay">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=ROMIX-STAFF-${s.id}" style="width:80px; border-radius:8px;">
                    </div>
                </div>
                <h3 style="margin:0; font-weight:700;">${s.full_name}</h3>
                <span class="premium-id">ID: ${displayId}</span>
                <p style="color:var(--adm-text-sec); font-size:0.9rem; margin:8px 0 6px 0; font-weight:500;">${s.role}</p>
                ${salaryVal ? `<p style="color:#00ff88; font-weight:800; font-size:0.95rem; margin:0 0 15px 0;">Oylik: ${parseFloat(salaryVal).toLocaleString()} so'm</p>` : ''}
                
                <div class="auto-layout-row" style="justify-content:center;">
                    <button class="action-icon delete-staff-btn" data-id="${s.id}" 
                        style="color:#ff4d4f; background:rgba(255,77,79,0.1); border:none; padding:8px 15px; border-radius:12px; cursor:pointer; font-weight:600;">🗑️ O'chirish</button>
                </div>
            `;
            staffGrid.appendChild(card);
        });

        document.getElementById('statStaffCount').textContent = data.length;

        document.querySelectorAll('.delete-staff-btn').forEach(b => {
            b.onclick = async () => {
                if (confirm('Ushbu xodimni o\'chirmoqchimisiz?')) {
                    const id = b.dataset.id;
                    try {
                        const { error } = await supabase.from('romix_staff').delete().eq('id', id);
                        if (error) throw error;
                    } catch (err) {
                        console.warn("Delete staff from db failed:", err);
                        alert("Xatolik: xodim bazadan o'chmadi — " + (err.message || "sabab noma'lum") + ". Qayta urinib ko'ring.");
                        return;
                    }
                    let localStaff = JSON.parse(localStorage.getItem('romix_employees_local') || '[]');
                    localStaff = localStaff.filter(x => x.id !== id);
                    localStorage.setItem('romix_employees_local', JSON.stringify(localStaff));
                    loadStaff();
                }
            };
        });
    }

    saveStaffBtn.onclick = async () => {
        const name = document.getElementById('sName').value.trim();
        const role = document.getElementById('sRole').value;
        const salary = parseFloat(document.getElementById('sSalary').value) || 0;
        const photoFile = document.getElementById('sPhoto').files[0];

        if (!name) return alert('Ismni kiriting!');

        let photoUrl = '';
        if (photoFile) {
            try {
                const fileName = `romix_staff/${Date.now()}_${photoFile.name}`;
                const { data, error } = await supabase.storage.from('avatars').upload(fileName, photoFile);
                if (!error) {
                    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(fileName);
                    photoUrl = publicData.publicUrl;
                }
            } catch (err) {
                console.error("Storage upload failed, using placeholder", err);
            }
        }

        const newId = 'romix-' + Date.now();
        const newStaff = {
            id: newId,
            full_name: name,
            role: role,
            salary: salary,
            salary_info: salary.toString(),
            photo_url: photoUrl,
            avatar_url: photoUrl,
            department: "Ustalar",
            dept: "Ustalar",
            created_at: new Date().toISOString()
        };

        // Attempt db save
        try {
            const { error } = await supabase.from('romix_staff').insert([{
                full_name: name,
                role: role,
                salary: salary,
                photo_url: photoUrl
            }]);
            if (error) throw error;
        } catch (dbError) {
            console.warn("Database insert failed", dbError);
            alert("Xatolik: xodim bazaga saqlanmadi — " + (dbError.message || "sabab noma'lum") + ". Qayta urinib ko'ring.");
            return;
        }

        // Always save to local fallback for robust WMS offline use
        const localStaff = JSON.parse(localStorage.getItem('romix_employees_local') || '[]');
        localStaff.unshift(newStaff);
        localStorage.setItem('romix_employees_local', JSON.stringify(localStaff));

        staffModal.classList.add('hidden');
        loadStaff();

        // Reset inputs
        document.getElementById('sName').value = '';
        document.getElementById('sSalary').value = '';
        document.getElementById('sPhoto').value = '';
    };

    // --- History Logic ---
    let _histCache = [];
    let _histActiveType = 'barchasi';

    function _groupTransactionsIntoDocuments(rows) {
        const docs = [];
        const sorted = [...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        sorted.forEach(tx => {
            const txTime = new Date(tx.created_at).getTime();
            let foundDoc = docs.find(doc => {
                if (doc.type !== tx.type) return false;
                // Chegarani hujjatning BIRINCHI emas, OXIRGI a'zosi vaqtidan hisoblaymiz —
                // shunda ketma-ket (har biri oldingisidan 3s ichida) kiritilgan uzun partiya
                // umumiy oralig'i 3s'dan katta bo'lsa ham noto'g'ri bo'lib ketmaydi.
                const timeDiff = Math.abs(doc._lastTime - txTime);
                if (timeDiff > 3000) return false;

                const orderIdMatchTx = tx.note ? tx.note.match(/#([a-fA-F0-9-]{8,})/i) : null;
                const orderIdMatchDoc = doc.note ? doc.note.match(/#([a-fA-F0-9-]{8,})/i) : null;

                if (orderIdMatchTx && orderIdMatchDoc) {
                    return orderIdMatchTx[1] === orderIdMatchDoc[1];
                }
                if (orderIdMatchTx || orderIdMatchDoc) return false;
                return true;
            });

            if (foundDoc) {
                foundDoc.items.push(tx);
                foundDoc._lastTime = txTime;
            } else {
                docs.push({
                    id: tx.id,
                    created_at: tx.created_at,
                    type: tx.type,
                    note: tx.note || '',
                    items: [tx],
                    _lastTime: txTime
                });
            }
        });
        return docs;
    }

    async function loadHistory() {
        if (historyGrid) historyGrid.innerHTML = '<div style="text-align:center; color:var(--adm-text-sec); padding:20px; grid-column:1/-1;">Yuklanmoqda...</div>';
        const { data, error } = await supabase
            .from('romix_transactions')
            .select(`*, romix_inventory(product_name, unit)`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("History loading error:", error);
            if (historyGrid) historyGrid.innerHTML = '<div style="text-align:center; color:red; padding:20px; grid-column:1/-1;">Tarixni yuklashda xatolik!</div>';
            return;
        }

        // Aksessuar kirim/chiqim (Dona/Spiska/Rasmdan-AI, Buxgalteriya tomonidan) romix_transactions'ga
        // yozilmaydi — chunki product_id ustuni faqat romix_inventory'ga (profil) FK bilan bog'langan,
        // aksessuarlar esa romix_accessories'da saqlanadi. Shu sabab bu harakatlar bu tarixda ko'rinmay
        // qolardi — romix_accessories_history'dan o'qib, xuddi shu shakldagi psevdo-tranzaksiya qo'shamiz.
        let accTx = [];
        try {
            const { data: histData, error: histErr } = await supabase.from('romix_accessories_history').select('*').order('created_at', { ascending: false });
            if (histErr) throw histErr;
            accTx = (histData || []).reduce((acc, log) => {
                const actionText = log.action || '';
                let type = null;
                if (actionText.includes('Chiqim')) type = 'OUT';
                else if (actionText.includes('Kirim')) type = 'IN';
                if (!type) return acc;
                const m = (log.details || '').match(/^"(.+?)"\s*mahsulotidan\s*([\d.,\s]+)\s*(\S+)/);
                const productName = m ? m[1] : (log.details || 'Aksessuar');
                const qty = m ? parseFloat(m[2].replace(/[,\s]/g, '')) || 0 : 0;
                const unit = m ? m[3] : 'dona';
                acc.push({
                    id: log.id,
                    created_at: log.created_at,
                    type,
                    quantity: qty,
                    note: `${actionText} - ${log.operator || 'Buxgalteriya'}`,
                    romix_inventory: { product_name: productName, unit }
                });
                return acc;
            }, []);
        } catch (histE) {
            console.warn('Ombor accessories history load error:', histE);
        }

        _histCache = [...(data || []), ...accTx];

        document.querySelectorAll('#histTypeFilter .om-brand-chip').forEach(chip => {
            chip.onclick = () => {
                _histActiveType = chip.dataset.histType;
                document.querySelectorAll('#histTypeFilter .om-brand-chip').forEach(c => c.classList.toggle('active', c === chip));
                renderHistoryTable();
            };
        });
        const searchInput = document.getElementById('histSearchInput');
        if (searchInput) searchInput.oninput = renderHistoryTable;
        const dateFrom = document.getElementById('histDateFrom');
        const dateTo = document.getElementById('histDateTo');
        if (dateFrom) dateFrom.onchange = renderHistoryTable;
        if (dateTo) dateTo.onchange = renderHistoryTable;
        const resetBtn = document.getElementById('histFilterResetBtn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                _histActiveType = 'barchasi';
                if (searchInput) searchInput.value = '';
                if (dateFrom) dateFrom.value = '';
                if (dateTo) dateTo.value = '';
                document.querySelectorAll('#histTypeFilter .om-brand-chip').forEach(c => c.classList.toggle('active', c.dataset.histType === 'barchasi'));
                renderHistoryTable();
            };
        }

        renderHistoryTable();
    }

    function renderHistoryTable() {
        if (!historyGrid) return;
        let rows = _histCache;

        if (_histActiveType !== 'barchasi') {
            rows = rows.filter(tx => tx.type === _histActiveType);
        }
        const q = (document.getElementById('histSearchInput')?.value || '').toLowerCase().trim();
        if (q) {
            rows = rows.filter(tx => (tx.romix_inventory?.product_name || "o'chirilgan mahsulot").toLowerCase().includes(q));
        }
        const dateFromVal = document.getElementById('histDateFrom')?.value;
        const dateToVal = document.getElementById('histDateTo')?.value;
        if (dateFromVal) {
            const from = new Date(dateFromVal + 'T00:00:00');
            rows = rows.filter(tx => new Date(tx.created_at) >= from);
        }
        if (dateToVal) {
            const to = new Date(dateToVal + 'T23:59:59');
            rows = rows.filter(tx => new Date(tx.created_at) <= to);
        }

        historyGrid.innerHTML = '';
        if (rows.length === 0) {
            historyGrid.innerHTML = '<div style="text-align:center; padding:20px; color:var(--adm-text-sec); grid-column:1/-1;">Filtrga mos yozuv topilmadi</div>';
            return;
        }

        const docs = _groupTransactionsIntoDocuments(rows);
        const byDay = {};
        docs.forEach(doc => {
            const dayKey = new Date(doc.created_at).toISOString().slice(0, 10);
            if (!byDay[dayKey]) byDay[dayKey] = [];
            byDay[dayKey].push(doc);
        });

        Object.keys(byDay).sort((a, b) => b.localeCompare(a)).forEach(dayKey => {
            const dayDocs = byDay[dayKey];
            const dayDate = new Date(dayKey);
            const dayLabel = dayDate.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

            let dayDocCount = dayDocs.length;
            let dayItemCount = 0;
            const dayUnitMap = {};
            dayDocs.forEach(doc => {
                doc.items.forEach(tx => {
                    const qty = Number(tx.quantity) || 0;
                    const unit = tx.romix_inventory?.unit || 'dona';
                    dayItemCount += 1;
                    dayUnitMap[unit] = (dayUnitMap[unit] || 0) + qty;
                });
            });
            const dayUnitStr = Object.entries(dayUnitMap).map(([u, v]) => `${v.toLocaleString('uz-UZ')} ${u}`).join(' • ');

            let accentColor = '#00d2ff';
            let accentRgba = 'rgba(0, 210, 255, 0.04)';
            let accentBorder = 'rgba(0, 210, 255, 0.15)';
            if (_histActiveType === 'IN') {
                accentColor = '#00ff88';
                accentRgba = 'rgba(0, 255, 136, 0.04)';
                accentBorder = 'rgba(0, 255, 136, 0.15)';
            } else if (_histActiveType === 'OUT') {
                accentColor = '#ff4d4f';
                accentRgba = 'rgba(255, 77, 79, 0.04)';
                accentBorder = 'rgba(255, 77, 79, 0.15)';
            }

            const hasIn = dayDocs.some(d => d.type === 'IN');
            const hasOut = dayDocs.some(d => d.type === 'OUT');
            let pdfButtonsHtml = '';
            if (hasIn) {
                pdfButtonsHtml += `<button onclick="window.downloadDailyReportPdf('IN', '${dayKey}')" class="btn-glass" style="padding: 6px 12px; border-radius: 10px; font-size: 0.78rem; font-weight: 700; cursor: pointer; border-color: rgba(16, 185, 129, 0.2); color: #10b981; background: rgba(16, 185, 129, 0.08); display: inline-flex; align-items: center; gap: 6px; height: auto; line-height: 1;">📥 Kirim PDF</button>`;
            }
            if (hasOut) {
                pdfButtonsHtml += `<button onclick="window.downloadDailyReportPdf('OUT', '${dayKey}')" class="btn-glass" style="padding: 6px 12px; border-radius: 10px; font-size: 0.78rem; font-weight: 700; cursor: pointer; border-color: rgba(239, 68, 68, 0.2); color: #ff4d4f; background: rgba(239, 68, 68, 0.08); display: inline-flex; align-items: center; gap: 6px; height: auto; margin-left: 6px; line-height: 1;">📤 Chiqim PDF</button>`;
            }

            const banner = document.createElement('div');
            banner.style.cssText = 'grid-column: 1 / -1; margin-top: 20px; margin-bottom: 8px;';
            banner.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; background:${accentRgba}; border:1px solid ${accentBorder}; border-left:5px solid ${accentColor}; border-radius:18px; padding:14px 20px;">
                    <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
                        <span style="font-size:1.5rem;">📅</span>
                        <div>
                            <div style="font-size:0.88rem; font-weight:800; color:#fff; margin-bottom:2px;">${dayLabel}</div>
                            <div style="font-size:0.74rem; color:rgba(255,255,255,0.5);">${dayDocCount} ta hujjat • ${dayItemCount} ta pozitsiya • Jami: <strong style="color:${accentColor};">${dayUnitStr || '—'}</strong></div>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                        ${pdfButtonsHtml}
                    </div>
                </div>
            `;
            historyGrid.appendChild(banner);

            dayDocs.forEach(doc => {
                const docTime = new Date(doc.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
                const isKirim = doc.type === 'IN';
                const docColor = isKirim ? '#00ff88' : '#ff4d4f';
                const isSingle = doc.items.length === 1;
                
                let titleText = '';
                let itemsPreview = '';
                if (isSingle) {
                    const tx = doc.items[0];
                    titleText = tx.romix_inventory?.product_name || "O'chirilgan mahsulot";
                    itemsPreview = `<strong style="color:#fff;">${tx.quantity} ${tx.romix_inventory?.unit || ''}</strong>`;
                } else {
                    titleText = `${isKirim ? '📦 Guruhli Kirim' : '📦 Guruhli Chiqim'} (${doc.items.length} xil)`;
                    const prev = doc.items.slice(0, 2).map(tx => `• ${(tx.romix_inventory?.product_name || 'Mahsulot').slice(0, 20)}: ${tx.quantity} ${tx.romix_inventory?.unit || ''}`);
                    if (doc.items.length > 2) prev.push(`+ yana ${doc.items.length - 2} ta...`);
                    itemsPreview = `<div style="font-size:0.74rem; color:rgba(255,255,255,0.45); display:flex; flex-direction:column; gap:2px;">${prev.join('<br>')}</div>`;
                }

                const card = document.createElement('div');
                card.className = 'buh-tx-card';
                card.style.cssText = `background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-left:4px solid ${docColor}; border-radius:16px; padding:16px; cursor:pointer; transition:all 0.25s; display:flex; flex-direction:column; gap:10px; box-shadow:0 4px 15px rgba(0,0,0,0.15);`;
                
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.72rem; color:rgba(255,255,255,0.4); font-weight:700;">#${doc.id.slice(0, 8).toUpperCase()}</span>
                        <span style="font-size:0.72rem; color:rgba(255,255,255,0.4);">🕐 ${docTime}</span>
                    </div>
                    <div style="font-weight:800; color:#fff; font-size:0.95rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${titleText.replace(/"/g, '&quot;')}">${titleText}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed rgba(255,255,255,0.06); padding-top:10px; margin-top:4px;">
                        <div>
                            <span style="font-size:0.7rem; color:rgba(255,255,255,0.45); display:block; text-transform:uppercase; margin-bottom:2px;">Miqdori</span>
                            ${itemsPreview}
                        </div>
                        <button class="view-doc-card-btn" style="background:${docColor}22; border:none; color:${docColor}; padding:6px 12px; border-radius:10px; cursor:pointer; font-weight:700; font-size:0.78rem;">👁️ Ko'rish</button>
                    </div>
                    ${doc.note && isSingle ? `<div style="font-size:0.72rem; color:rgba(255,255,255,0.35); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; background:rgba(0,0,0,0.15); padding:4px 8px; border-radius:6px;">📝 ${doc.note.replace(/"/g, '&quot;')}</div>` : ''}
                `;
                
                const openFn = () => showInvoice(doc);
                card.onclick = openFn;
                const btn = card.querySelector('.view-doc-card-btn');
                btn.onclick = (e) => { e.stopPropagation(); openFn(); };

                historyGrid.appendChild(card);
            });
        });
    }

    // ============================================================
    // ==== HUJJATLAR TARIXI — "Buyurtma Shartnomalari" rejimi   ====
    // Har bir tasdiqlangan buyurtma uchun ombordan chiqarilgan   ====
    // profil/aksesuvar/qoldiq/oynak + ikki tomonlama (Omborchi + ====
    // Ishlab Chiqaruvchi) tasdiqnomani istalgan vaqt qayta chiqarish ====
    // ============================================================
    let _histOrdersCache = [];

    document.querySelectorAll('#histModeFilter .om-brand-chip').forEach(chip => {
        chip.onclick = () => {
            document.querySelectorAll('#histModeFilter .om-brand-chip').forEach(c => c.classList.toggle('active', c === chip));
            const mode = chip.dataset.histMode;
            document.getElementById('histTxSection').classList.toggle('hidden', mode !== 'tx');
            document.getElementById('histOrdersSection').classList.toggle('hidden', mode !== 'orders');
            if (mode === 'orders' && _histOrdersCache.length === 0) loadOrderDocuments();
        };
    });

    async function loadOrderDocuments() {
        const tbody = document.getElementById('histOrdersTable');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Yuklanmoqda...</td></tr>';
        const { data, error } = await supabase.from('sales_orders').select('*')
            .not('ombor_confirmed_at', 'is', null)
            .order('ombor_confirmed_at', { ascending: false });
        if (error) {
            console.error('Order documents fetch error:', error);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Yuklashda xatolik!</td></tr>';
            return;
        }
        _histOrdersCache = data || [];

        const searchInput = document.getElementById('histOrdersSearchInput');
        if (searchInput) searchInput.oninput = renderOrderDocumentsTable;
        renderOrderDocumentsTable();
    }

    function renderOrderDocumentsTable() {
        const tbody = document.getElementById('histOrdersTable');
        if (!tbody) return;
        const q = (document.getElementById('histOrdersSearchInput')?.value || '').toLowerCase().trim();
        let rows = _histOrdersCache;
        if (q) {
            rows = rows.filter(o => (o.customer_name || '').toLowerCase().includes(q) || (o.customer_phone || '').toLowerCase().includes(q));
        }

        tbody.innerHTML = '';
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--adm-text-sec);">Tasdiqlangan buyurtma topilmadi</td></tr>';
            return;
        }
        rows.forEach(o => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><small>${new Date(o.ombor_confirmed_at).toLocaleString('uz-UZ')}</small></td>
                <td>${o.customer_name || "Noma'lum"}</td>
                <td>${o.customer_phone || '---'}</td>
                <td>${o.prod_type || '---'}</td>
                <td>${o.ombor_confirmed_by || '---'}</td>
                <td><button class="view-order-doc-btn" data-id="${o.id}" style="background:#eee; border:none; padding:5px 12px; border-radius:10px; cursor:pointer;">📄 Hujjatni qayta chiqarish</button></td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.view-order-doc-btn').forEach(b => {
            b.onclick = () => {
                const order = _histOrdersCache.find(o => o.id === b.dataset.id);
                if (!order) return;
                // ombor_confirmed_materials yangi ustun — shu funksiya joriy etilishidan oldin
                // tasdiqlangan buyurtmalarda bo'sh bo'ladi, o'sha holda material_estimate'ga
                // qaytamiz (faqat profil/aksesuvar; qoldiq/oynak tarixi eski buyurtmalarda yo'q).
                const m = order.ombor_confirmed_materials || order.material_estimate || {};
                generateOrderConfirmationPdf(order, m.profiles || [], m.accessories || [], m.qoldiqPicks || [], m.oynakPicks || [], order.ombor_confirmed_by);
            };
        });
    }

    function showInvoice(docOrTx, directProduct = null) {
        let docObj;
        if (docOrTx && docOrTx.items) {
            docObj = docOrTx;
        } else {
            const tx = docOrTx;
            tx.romix_inventory = directProduct || tx.romix_inventory;
            docObj = {
                id: tx.id,
                created_at: tx.created_at,
                type: tx.type,
                items: [tx]
            };
        }

        const isKirim = docObj.type === 'IN';
        document.getElementById('invNumber').textContent = `No. ${docObj.id ? docObj.id.slice(0, 8).toUpperCase() : 'NEW'}`;
        document.getElementById('invDate').textContent = new Date(docObj.created_at || Date.now()).toLocaleDateString();

        const titleEl = document.querySelector('#printArea h1');
        if (titleEl) {
            titleEl.textContent = isKirim ? 'Kirim Hujjati' : 'Chiqim Hujjati';
        }

        const tbody = document.getElementById('invoiceTableBody');
        if (tbody) {
            tbody.innerHTML = '';
            docObj.items.forEach(tx => {
                const prod = tx.romix_inventory || { product_name: "Mahsulot", unit: "" };
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding:20px 15px; border-bottom:1px solid #eee;">
                        <strong>${prod.product_name || "Mahsulot"}</strong><br>
                        <small style="color:#888;">${tx.note || ""}</small>
                    </td>
                    <td style="padding:20px 15px; border-bottom:1px solid #eee; text-align:center; font-weight:700;">
                        ${tx.quantity}
                    </td>
                    <td style="padding:20px 15px; border-bottom:1px solid #eee; text-align:center;">
                        ${prod.unit || ""}
                    </td>
                    <td style="padding:20px 15px; border-bottom:1px solid #eee; text-align:right; font-weight:700; color:#007c52;">
                        —
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        const firstTx = docObj.items[0] || {};
        if (document.getElementById('invSupplier')) {
            document.getElementById('invSupplier').textContent = firstTx.supplier_name || "---";
            document.getElementById('invPhone').textContent = firstTx.supplier_phone || "";
        }

        if (document.getElementById('invSubInfo')) {
            document.getElementById('invSubInfo').textContent = firstTx.note || "";
        }

        // QR
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=ROMIX-TXID-${docObj.id || 'NEW'}`;
        document.getElementById('invQR').innerHTML = `<img src="${qrUrl}" style="width:130px;">`;

        mainApp.classList.add('hidden');
        printArea.classList.remove('hidden');
    }

    // --- Save Actions ---
    saveKirimBtn.onclick = async () => {
        saveKirimBtn.disabled = true;
        saveKirimBtn.textContent = 'Saqlanmoqda...';

        try {
            const name = document.getElementById('kName').value.trim();
            const cat = document.getElementById('kCategory').value;
            const qty = parseFloat(document.getElementById('kQty').value);
            const price = 0; // Narxni Buxgalteriya belgilaydi, Ombor kirim qilishda narx kiritmaydi
            const supplier = document.getElementById('kSupplier').value.trim();
            const phone = document.getElementById('kPhone').value.trim();
            const unit = document.getElementById('kUnit').value;
            const gross = parseFloat(document.getElementById('kGross').value) || 0;
            const net = parseFloat(document.getElementById('kNet').value) || 0;
            const desc = document.getElementById('kDesc').value;

            if (!name || isNaN(qty)) {
                alert('Ma\'lumotlarni to\'ldiring!');
                return;
            }

            // 1. Manage Product (using romix_inventory)
            const { data: existing } = await supabase.from('romix_inventory').select('*').eq('product_name', name).maybeSingle();
            let product;

            const payload = {
                product_name: name,
                category: cat,
                description: desc,
                unit: unit,
                gross_weight: gross,
                net_weight: net,
                supplier_name: supplier,
                supplier_phone: phone,
                price: price,
                stock_quantity: existing ? (parseFloat(existing.stock_quantity) || 0) + qty : qty
            };

            if (existing) {
                const { data, error } = await supabase.from('romix_inventory').update(payload).eq('id', existing.id).select().single();
                if (error) throw error;
                product = data;
            } else {
                const { data, error } = await supabase.from('romix_inventory').insert([payload]).select().single();
                if (error) throw error;
                product = data;
            }

            // 2. Log Transaction
            const txData = {
                product_id: product.id,
                type: 'IN',
                quantity: qty,
                note: `Romix Ombori - Taminotchi: ${supplier} | Brutto/Netto: ${gross}/${net}`
            };

            const { data: tx, error: txError } = await supabase.from('romix_transactions').insert([txData]).select().single();

            // Build virtual transaction for invoice view
            const virtualTx = {
                ...(tx || { id: 'NEW-' + Date.now(), created_at: new Date().toISOString() }),
                quantity: qty,
                supplier_name: supplier,
                supplier_phone: phone,
                price: price,
                note: payload.description
            };

            showInvoice(virtualTx, product);
            kirimModal.classList.add('hidden');
            loadInventory();
            loadOmborJami();

        } catch (err) {
            console.error("Kirim Error:", err);
            alert("Xatolik yuz berdi: " + err.message);
        } finally {
            saveKirimBtn.disabled = false;
            saveKirimBtn.textContent = 'Tasdiqlash va Hujjat tayyorlash';
        }
    };

    document.getElementById('saveEditBtn').onclick = async () => {
        const name = document.getElementById('eName').value.trim();
        const qty = parseFloat(document.getElementById('eQty').value);
        if (!name) return alert("Nomi bo'sh bo'lmasligi kerak!");
        if (isNaN(qty) || qty < 0) return alert("Iltimos, to'g'ri miqdor kiriting (0 dan kichik bo'lmasligi kerak)!");
        await supabase.from('romix_inventory').update({ product_name: name, stock_quantity: qty }).eq('id', window.editingProdId);
        editModal.classList.add('hidden');
        loadInventory();
    };

    // "Skayner (QR) Qabul" (material_requests orqali) olib tashlandi — chiqim endi FAQAT
    // "Olingan Buyurtmalar" > confirmOrderMaterials() orqali, buyurtmaga bog'liq holda bo'ladi.

    // Generic
    const openKirimModalBtn = document.getElementById('openKirimModal');
    if (openKirimModalBtn) openKirimModalBtn.onclick = () => kirimModal.classList.remove('hidden');
    document.getElementById('closeKirimModal').onclick = () => kirimModal.classList.add('hidden');
    
    if (openProfilKirimModal) openProfilKirimModal.onclick = () => {
        if (window.resetProfilKirimForm) window.resetProfilKirimForm();
        profilKirimModal.classList.remove('hidden');
    };
    if (closeProfilKirim) closeProfilKirim.onclick = () => {
        if (window.resetProfilKirimForm) window.resetProfilKirimForm();
        profilKirimModal.classList.add('hidden');
    };

    document.getElementById('saveProfilBtn').onclick = async () => {
        const uzunligi = document.getElementById('pkUzunligi').value.trim();
        const soni = parseFloat(document.getElementById('pkSoni').value) || 0;
        const profil = document.getElementById('pkProfil').value;
        const brend = document.getElementById('pkBrend').value;
        const seriya = document.getElementById('pkSeriya').value;
        const shakli = document.getElementById('pkShakli').value;
        const rangTuri = document.getElementById('pkRangTuri').value;
        const rangi = document.getElementById('pkRangi').value;

        if(!uzunligi || soni <= 0 || !profil || !brend || !seriya || !shakli || !rangTuri || !rangi) {
            alert("Barcha maydonlarni to'g'ri to'ldiring!");
            return;
        }

        const saveProfilBtn = document.getElementById('saveProfilBtn');
        if (saveProfilBtn.disabled) return;
        saveProfilBtn.disabled = true;
        const saveProfilBtnOrigText = saveProfilBtn.textContent;
        saveProfilBtn.textContent = 'Saqlanmoqda...';

        // --- Pachka → Metr hisoblash ---
        const METR_PER_PACHKA = 48;
        const pachkaSoni = soni; // foydalanuvchi pachka sonini kiritadi
        const jamiMetr = pachkaSoni * METR_PER_PACHKA; // jami metr

        const name = `${profil} ${brend} ${seriya}`;
        const desc = `${uzunligi}mm | ${shakli} | ${rangi} (${rangTuri})`;

        const metadata = {
            uzunligi,
            profil,
            brend,
            seriya,
            shakli,
            rangTuri,
            rangi
        };

        try {
            // Check if product exists in romix_inventory
            const { data: existing } = await supabase.from('romix_inventory').select('*').eq('product_name', name).eq('description', desc).maybeSingle();
            let product;

            const payload = {
                product_name: name,
                category: 'Profil',
                description: desc,
                unit: 'metr',
                price: 0,
                stock_quantity: existing ? (parseFloat(existing.stock_quantity) || 0) + jamiMetr : jamiMetr,
                metadata: metadata
            };

            if (existing) {
                const { data, error } = await supabase.from('romix_inventory').update(payload).eq('id', existing.id).select().single();
                if (error) throw error;
                product = data;
            } else {
                const { data, error } = await supabase.from('romix_inventory').insert([payload]).select().single();
                if (error) throw error;
                product = data;
            }

            // Log Transaction (metr da yoziladi)
            const txData = {
                product_id: product.id,
                type: 'IN',
                quantity: jamiMetr,
                note: `Profil Kirim - ${pachkaSoni} pachka × ${METR_PER_PACHKA} = ${jamiMetr} metr | ${desc}`
            };

            const { data: tx, error: txError } = await supabase.from('romix_transactions').insert([txData]).select().single();

            // Build virtual transaction for invoice view
            const virtualTx = {
                ...(tx || { id: 'NEW-' + Date.now(), created_at: new Date().toISOString() }),
                quantity: jamiMetr,
                supplier_name: 'Romix Ichki',
                supplier_phone: '---',
                price: 0,
                note: `${pachkaSoni} pachka × ${METR_PER_PACHKA} metr = ${jamiMetr} metr | ${desc}`
            };

            showInvoice(virtualTx, product);
            profilKirimModal.classList.add('hidden');
            if (window.resetProfilKirimForm) window.resetProfilKirimForm();
            loadInventory();
            loadOmborJami();
        } catch (err) {
            console.error("Profil Kirim Error:", err);
            alert("Xatolik yuz berdi: " + err.message);
        } finally {
            saveProfilBtn.disabled = false;
            saveProfilBtn.textContent = saveProfilBtnOrigText;
        }
    };

    document.getElementById('openStaffModal').onclick = () => staffModal.classList.remove('hidden');
    document.getElementById('closeStaffModal').onclick = () => staffModal.classList.add('hidden');
    document.getElementById('closeEditModal').onclick = () => editModal.classList.add('hidden');
    document.getElementById('closePrintBtn').onclick = () => location.reload();

    document.getElementById('themeToggle').onclick = () => {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    };
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');

    document.getElementById('logoutBtn').onclick = () => { localStorage.removeItem('currentUser'); window.location.href = '/'; };

    // Collapsible Settings Cards (Brendlar & Kategoriyalar)
    const brandSettingsHeader = document.getElementById('brandSettingsHeader');
    const brandSettingsCard = document.getElementById('brandSettingsCard');
    if (brandSettingsHeader && brandSettingsCard) {
        brandSettingsHeader.onclick = () => {
            brandSettingsCard.classList.toggle('open');
        };
    }

    const catSettingsHeader = document.getElementById('catSettingsHeader');
    const catSettingsCard = document.getElementById('catSettingsCard');
    if (catSettingsHeader && catSettingsCard) {
        catSettingsHeader.onclick = () => {
            catSettingsCard.classList.toggle('open');
        };
    }

    function loadSettings() {
        const brandsList = document.getElementById('brandsSettingsList');
        const categoriesList = document.getElementById('categoriesSettingsList');
        
        if (!brandsList || !categoriesList) return;
        
        // 1. Render Brands
        brandsList.innerHTML = '';
        window.brandsConfig.forEach((b, idx) => {
            const row = document.createElement('div');
            row.className = 'settings-item-row';
            row.innerHTML = `
                <span class="settings-item-name">${b.name}</span>
                <div class="settings-item-actions">
                    <button class="settings-toggle-btn ${b.visible ? 'visible-active' : 'visible-inactive'}">
                        ${b.visible ? '👁️ Ko\'rinadigan' : '🕶️ Yashirin'}
                    </button>
                    <button class="card-action-btn delete-brand-btn delete-accent" style="color:#ff4d4f;">🗑️</button>
                </div>
            `;
            
            // Toggle visibility
            row.querySelector('.settings-toggle-btn').onclick = () => {
                b.visible = !b.visible;
                localStorage.setItem('romix_brands_config', JSON.stringify(window.brandsConfig));
                loadSettings();
                renderBrandSelector();
                renderCatalogGrid();
            };
            
            // Delete brand
            row.querySelector('.delete-brand-btn').onclick = () => {
                if (confirm(`"${b.name}" brendini o'chirmoqchimisiz?`)) {
                    window.brandsConfig.splice(idx, 1);
                    localStorage.setItem('romix_brands_config', JSON.stringify(window.brandsConfig));
                    loadSettings();
                    renderBrandSelector();
                    renderCatalogGrid();
                }
            };
            
            brandsList.appendChild(row);
        });

        // 2. Render Categories
        categoriesList.innerHTML = '';
        window.categoriesConfig.forEach((c, idx) => {
            const row = document.createElement('div');
            row.className = 'settings-item-row';
            const isAll = c.name === 'Barchasi';
            
            row.innerHTML = `
                <span class="settings-item-name">${c.name === 'Plastik' ? 'Plast (PVC)' : c.name === 'Alyuminiy' ? 'Alumin' : c.name}</span>
                <div class="settings-item-actions">
                    ${isAll ? '' : `
                        <button class="settings-toggle-btn ${c.visible ? 'visible-active' : 'visible-inactive'}">
                            ${c.visible ? '👁️ Ko\'rinadigan' : '🕶️ Yashirin'}
                        </button>
                        <button class="card-action-btn delete-cat-btn delete-accent" style="color:#ff4d4f;">🗑️</button>
                    `}
                </div>
            `;
            
            if (!isAll) {
                // Toggle visibility
                row.querySelector('.settings-toggle-btn').onclick = () => {
                    c.visible = !c.visible;
                    localStorage.setItem('romix_categories_config', JSON.stringify(window.categoriesConfig));
                    loadSettings();
                    renderCategoryTabs();
                    renderCatalogGrid();
                };
                
                // Delete category
                row.querySelector('.delete-cat-btn').onclick = () => {
                    if (confirm(`"${c.name}" kategoriyasini o'chirmoqchimisiz?`)) {
                        window.categoriesConfig.splice(idx, 1);
                        localStorage.setItem('romix_categories_config', JSON.stringify(window.categoriesConfig));
                        loadSettings();
                        renderCategoryTabs();
                        renderCatalogGrid();
                    }
                };
            }
            
            categoriesList.appendChild(row);
        });
    }

    // Add new Brand
    const addBrandBtn = document.getElementById('addBrandBtn');
    if (addBrandBtn) {
        addBrandBtn.onclick = () => {
            const input = document.getElementById('newBrandName');
            const val = input.value.trim();
            if (!val) return alert('Brend nomini kiriting!');
            
            if (window.brandsConfig.some(b => b.name.toUpperCase() === val.toUpperCase())) {
                return alert('Ushbu brend allaqachon mavjud!');
            }
            
            window.brandsConfig.push({ name: val, visible: true });
            localStorage.setItem('romix_brands_config', JSON.stringify(window.brandsConfig));
            input.value = '';
            loadSettings();
            renderBrandSelector();
            renderCatalogGrid();
        };
    }

    // Add new Category
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.onclick = () => {
            const input = document.getElementById('newCategoryName');
            const val = input.value.trim();
            if (!val) return alert('Kategoriya nomini kiriting!');
            
            if (window.categoriesConfig.some(c => c.name.toUpperCase() === val.toUpperCase())) {
                return alert('Ushbu kategoriya allaqachon mavjud!');
            }
            
            window.categoriesConfig.push({ name: val, visible: true });
            localStorage.setItem('romix_categories_config', JSON.stringify(window.categoriesConfig));
            input.value = '';
            loadSettings();
            renderCategoryTabs();
            renderCatalogGrid();
        };
    }

    // ========================================================
    // ======== OLINGAN BUYURTMALAR (Ombor tasdiqlash oqimi) ===
    // Sotuv olgan (kamida 50% avans to'langan) buyurtmalarni
    // ko'rsatadi — profil/aksessuar yetarli bo'lsa, ombordan
    // ajratib/minus qilib, Ishlab Chiqarishga o'tkazadi.
    // ========================================================
    async function loadOrdersConfirmation() {
        const grid = document.getElementById('omborOrdersGrid');
        if (!grid) return;
        grid.innerHTML = '<div style="text-align:center; color:var(--adm-text-sec); padding:20px; grid-column:1/-1;">Yuklanmoqda...</div>';

        let orders = [];
        try {
            const { data, error } = await supabase.from('sales_orders').select('*').eq('status', 'Kutilmoqda').is('ombor_confirmed_at', null).order('production_deadline', { ascending: true });
            if (error) throw error;
            orders = (data || []).filter(o => {
                const total = Number(o.total_price) || 0;
                const paid = Number(o.paid_amount) || 0;
                return total > 0 && (paid / total) >= 0.5;
            });
        } catch (err) {
            grid.innerHTML = '<div style="text-align:center; color:#ef4444; padding:20px; grid-column:1/-1;">Xatolik: buyurtmalarni yuklab bo\'lmadi</div>';
            console.warn('loadOrdersConfirmation fetch failed:', err);
            return;
        }

        if (orders.length === 0) {
            grid.innerHTML = '<div style="text-align:center; color:var(--adm-text-sec); padding:30px; grid-column:1/-1;">Hozircha tasdiq kutayotgan buyurtma yo\'q (kamida 50% avans to\'langan buyurtmalar shu yerda chiqadi)</div>';
            return;
        }

        let profileStock = [];
        try {
            const { data } = await supabase.from('romix_inventory').select('id, product_name, stock_quantity, unit, metadata');
            profileStock = data || [];
        } catch (err) { console.warn('profile stock fetch failed:', err); }
        const accStock = await omGetAccessories();

        // ID bo'yicha aniq qidirish; yo'q bo'lsa nom bo'yicha fallback
        const findProfileStock = (p) => {
            if (p.product_id) {
                const byId = profileStock.find(s => String(s.id) === String(p.product_id));
                if (byId) return byId;
            }
            // fallback: nom bo'yicha qidirish
            return profileStock.find(s => (s.product_name || '').toLowerCase().trim() === (p.material_name || '').toLowerCase().trim());
        };
        const findAccStock = (name) => accStock.find(a => (a.name || '').toLowerCase() === (name || '').toLowerCase());

        grid.innerHTML = orders.map(o => {
            const est = o.material_estimate || {};
            const profiles = est.profiles || [];
            const accessories = est.accessories || [];
            let allSufficient = true;
            const shortages = [];

            const profRows = profiles.map(p => {
                const stock = findProfileStock(p);
                const meta = stock?.metadata || {};
                const stockName = stock ? (stock.product_name || p.material_name) : p.material_name;
                const have = stock ? Number(stock.stock_quantity) || 0 : 0;
                const need = Number(p.meters) || 0;
                const ok = have >= need;
                if (!ok) { allSufficient = false; shortages.push(`${stockName}: ${need}m kerak, ${have.toFixed(1)}m bor`); }
                return `<div style="display:flex; justify-content:space-between; font-size:0.78rem; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
                    <span style="color:var(--adm-text);">📏 ${stockName}</span>
                    <span style="color:${ok ? '#00ff88' : '#ef4444'}; font-weight:700;">${need.toFixed(1)}m / ${have.toFixed(1)}m bor ${ok ? '✅' : '❌ YETMAYDI'}</span>
                </div>`;
            }).join('');

            const accRows = accessories.map(a => {
                const stock = findAccStock(a.name);
                const have = stock ? Number(stock.qty) || 0 : 0;
                const ok = have >= a.qty;
                if (!ok) { allSufficient = false; shortages.push(`${a.name}: ${a.qty} kerak, ${have} bor`); }
                return `<div style="display:flex; justify-content:space-between; font-size:0.78rem; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
                    <span style="color:var(--adm-text);">🔩 ${a.name}</span>
                    <span style="color:${ok ? '#00ff88' : '#ef4444'}; font-weight:700;">${a.qty} kerak / ${have} bor ${ok ? '✅' : '❌ YETMAYDI'}</span>
                </div>`;
            }).join('');

            const nothingNeeded = profiles.length === 0 && accessories.length === 0;
            if (nothingNeeded) allSufficient = true;

            const shortageBlock = !allSufficient ? `
                <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3); border-radius:10px; padding:10px; margin-top:6px;">
                    <div style="font-size:0.72rem; font-weight:700; color:#ef4444; margin-bottom:6px;">⚠️ Yetishmayotgan materiallar:</div>
                    ${shortages.map(s => `<div style="font-size:0.72rem; color:#fca5a5; padding:2px 0;">• ${s}</div>`).join('')}
                </div>` : '';

            const totalPaid = Number(o.paid_amount) || 0;
            const totalPrice = Number(o.total_price) || 0;
            const advPercent = totalPrice > 0 ? Math.round((totalPaid / totalPrice) * 100) : 0;

            return `<div style="background:var(--adm-surface); border:1px solid var(--adm-border); border-top:3px solid ${allSufficient ? '#00ff88' : '#ef4444'}; border-radius:16px; padding:18px; display:flex; flex-direction:column; gap:8px; box-shadow:var(--adm-shadow);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <div style="font-weight:800; color:var(--adm-text); font-size:1rem;">${o.customer_name || "Noma'lum"}</div>
                        <div style="font-size:0.74rem; color:var(--adm-text-sec); margin-top:2px;">${o.customer_phone ? '📞 ' + o.customer_phone : ''}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:0.72rem; color:var(--adm-text-sec);">Muddat: <b style="color:#ffb800;">${o.production_deadline ? new Date(o.production_deadline).toLocaleDateString('uz-UZ') : '—'}</b></div>
                        <div style="font-size:0.72rem; color:#00d2ff;">Avans: ${advPercent}%</div>
                    </div>
                </div>
                <div style="border-top:1px dashed var(--adm-border); padding-top:8px; display:flex; flex-direction:column; gap:2px;">
                    ${profRows || '<div style="color:var(--adm-text-sec); font-size:0.76rem;">Profil kerak emas</div>'}
                    ${accRows}
                    ${nothingNeeded ? '<div style="font-size:0.76rem; color:#00d2ff;">ℹ️ Faqat qoldiq profil / oynak biriktirish kerak</div>' : ''}
                </div>
                ${shortageBlock}
                <button class="ombor-confirm-btn" data-id="${o.id}" ${allSufficient ? '' : 'disabled'}
                    style="margin-top:8px; background:${allSufficient ? 'linear-gradient(135deg,#00ff88,#00d2ff)' : 'rgba(255,255,255,0.06)'};
                    color:${allSufficient ? '#000' : 'var(--adm-text-sec)'};
                    border:none; padding:12px; border-radius:12px; font-weight:800; cursor:${allSufficient ? 'pointer' : 'not-allowed'};
                    font-size:0.88rem; letter-spacing:0.3px;">
                    ${allSufficient ? '✅ Materiallarni Tayyorlab Ishlab Chiqarishga O\'tkazish' : '🔒 Materiallar yetarli emas — kirim qiling'}
                </button>
            </div>`;
        }).join('');

        document.querySelectorAll('.ombor-confirm-btn').forEach(btn => {
            if (btn.disabled) return;
            btn.onclick = () => openOrderConfirmModal(btn.dataset.id);
        });
    }

    // Buyurtmani tasdiqlash oynasi: Profil/Aksesuvar avtomatik ko'rsatiladi (o'zgartirib bo'lmaydi),
    // Qoldiq Profillar/Oynak esa ombor xodimi tanlab, ixtiyoriy ravishda shu buyurtmaga biriktiradi —
    // shu tanlovlar orqaligina ular ayriladi (chiqim doim buyurtmaga bog'liq bo'lishi uchun).
    window._ordConfirmQoldiqPicks = [];
    window._ordConfirmOynakPicks = [];

    function _ordRenderPickList(containerId, picks, onRemove) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (!picks.length) { el.innerHTML = '<div style="font-size:0.74rem; color:var(--adm-text-sec);">Hech narsa qo\'shilmagan</div>'; return; }
        el.innerHTML = picks.map((p, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.04); border-radius:8px; padding:6px 10px; margin-bottom:4px; font-size:0.78rem;">
                <span>${p.label}</span>
                <span style="display:flex; align-items:center; gap:8px;">
                    <b style="color:#00ff88;">${p.qty}</b>
                    <button data-idx="${idx}" class="ord-pick-remove" style="background:none; border:none; color:#ff4d4f; cursor:pointer;">🗑️</button>
                </span>
            </div>`).join('');
        el.querySelectorAll('.ord-pick-remove').forEach(b => {
            b.onclick = () => { picks.splice(Number(b.dataset.idx), 1); onRemove(); };
        });
    }

    async function openOrderConfirmModal(orderId) {
        const modal = document.getElementById('ordConfirmModal');
        if (!modal) return;

        const { data: order } = await supabase.from('sales_orders').select('*').eq('id', orderId).maybeSingle();
        if (!order) return alert('Buyurtma topilmadi!');

        window._ordConfirmOrderId = orderId;
        window._ordConfirmQoldiqPicks = [];
        window._ordConfirmOynakPicks = [];

        document.getElementById('ordConfirmCustomer').textContent = `${order.customer_name || 'Noma\'lum'}${order.customer_phone ? ' — 📞 ' + order.customer_phone : ''} — ${order.prod_type || ''}`;

        const est = order.material_estimate || {};
        const profiles = est.profiles || [];
        const accessories = est.accessories || [];
        const autoListEl = document.getElementById('ordConfirmAutoList');
        const rows = [
            ...profiles.map(p => `<div style="font-size:0.78rem; padding:3px 0;">📏 ${p.material_name}: <b>${p.meters}m</b></div>`),
            ...accessories.map(a => `<div style="font-size:0.78rem; padding:3px 0;">🔩 ${a.name}: <b>${a.qty} dona</b></div>`)
        ];
        autoListEl.innerHTML = rows.length ? rows.join('') : '<div style="font-size:0.78rem; color:var(--adm-text-sec);">Profil/aksesuvar ehtiyoji yo\'q</div>';

        const qoldiqItems = await omGetQoldiq();
        const qoldiqSelect = document.getElementById('ordConfirmQoldiqSelect');
        qoldiqSelect.innerHTML = qoldiqItems.length
            ? qoldiqItems.map(q => `<option value="${q.id}">${q.product_name} — ${q.length}mm (${q.stock_quantity} dona bor)</option>`).join('')
            : '<option value="">Qoldiq yo\'q</option>';

        const oynakItems = await omGetOynak();
        const oynakSelect = document.getElementById('ordConfirmOynakSelect');
        oynakSelect.innerHTML = oynakItems.length
            ? oynakItems.map(o => `<option value="${o.id}">${o.brand} ${o.product_name} — ${o.size || ''} (${o.stock_quantity} ${o.unit} bor)</option>`).join('')
            : '<option value="">Oynak yo\'q</option>';

        const renderQoldiqPicks = () => _ordRenderPickList('ordConfirmQoldiqList', window._ordConfirmQoldiqPicks, renderQoldiqPicks);
        const renderOynakPicks = () => _ordRenderPickList('ordConfirmOynakList', window._ordConfirmOynakPicks, renderOynakPicks);
        renderQoldiqPicks();
        renderOynakPicks();

        document.getElementById('ordConfirmQoldiqAddBtn').onclick = () => {
            const id = qoldiqSelect.value;
            const qty = parseInt(document.getElementById('ordConfirmQoldiqQty').value) || 0;
            const item = qoldiqItems.find(q => q.id === id);
            if (!item || qty <= 0) return;
            if (qty > Number(item.stock_quantity)) return alert("Omborda yetarli qoldiq yo'q!");
            window._ordConfirmQoldiqPicks.push({ id: item.id, label: `${item.product_name} (${item.length}mm)`, qty, maxQty: Number(item.stock_quantity) });
            renderQoldiqPicks();
        };
        document.getElementById('ordConfirmOynakAddBtn').onclick = () => {
            const id = oynakSelect.value;
            const qty = parseInt(document.getElementById('ordConfirmOynakQty').value) || 0;
            const item = oynakItems.find(o => o.id === id);
            if (!item || qty <= 0) return;
            if (qty > Number(item.stock_quantity)) return alert("Omborda yetarli oynak yo'q!");
            window._ordConfirmOynakPicks.push({ id: item.id, label: `${item.brand} ${item.product_name}`, qty, maxQty: Number(item.stock_quantity) });
            renderOynakPicks();
        };

        document.getElementById('ordConfirmCancelBtn').onclick = () => modal.classList.add('hidden');
        document.getElementById('ordConfirmSubmitBtn').onclick = () => confirmOrderMaterials(orderId);

        modal.classList.remove('hidden');
    }

    async function confirmOrderMaterials(orderId) {
        const modal = document.getElementById('ordConfirmModal');
        const qoldiqPicks = window._ordConfirmQoldiqPicks || [];
        const oynakPicks = window._ordConfirmOynakPicks || [];
        try {
            const { data: order } = await supabase.from('sales_orders').select('*').eq('id', orderId).maybeSingle();
            if (!order) return alert('Buyurtma topilmadi!');
            const est = order.material_estimate || {};
            const profiles = est.profiles || [];
            const accessories = est.accessories || [];

            // Qayta tekshirish (real vaqtda, boshqa buyurtma bir vaqtda tasdiqlangan bo'lishi mumkin)
            for (const p of profiles) {
                const { data: stock } = await supabase.from('romix_inventory').select('id, stock_quantity').eq('product_name', p.material_name).maybeSingle();
                const have = stock ? Number(stock.stock_quantity) || 0 : 0;
                if (have < p.meters) {
                    alert(`"${p.material_name}" yetarli emas (${have}m bor, ${p.meters}m kerak). Avval kirim qiling.`);
                    if (modal) modal.classList.add('hidden');
                    loadOrdersConfirmation();
                    return;
                }
            }
            let accInventory = await omGetAccessories();
            for (const a of accessories) {
                const item = accInventory.find(x => (x.name || '').toLowerCase() === a.name.toLowerCase());
                const have = item ? Number(item.qty) || 0 : 0;
                if (have < a.qty) {
                    alert(`"${a.name}" yetarli emas (${have} bor, ${a.qty} kerak). Avval kirim qiling.`);
                    if (modal) modal.classList.add('hidden');
                    loadOrdersConfirmation();
                    return;
                }
            }

            // Hammasi yetarli — endi haqiqatan ombordan ayiramiz
            // Profil: product_id bo'yicha aniq qidiruv, yo'q bo'lsa nom bo'yicha
            for (const p of profiles) {
                let stock = null;
                if (p.product_id) {
                    const { data } = await supabase.from('romix_inventory').select('id, stock_quantity').eq('id', p.product_id).maybeSingle();
                    stock = data;
                }
                if (!stock) {
                    // fallback: nom bo'yicha
                    const { data } = await supabase.from('romix_inventory').select('id, stock_quantity').ilike('product_name', p.material_name).maybeSingle();
                    stock = data;
                }
                if (stock) {
                    const newQty = Math.max(0, (Number(stock.stock_quantity) || 0) - p.meters);
                    await supabase.from('romix_inventory').update({ stock_quantity: newQty }).eq('id', stock.id);
                    await supabase.from('romix_transactions').insert([{ product_id: stock.id, type: 'OUT', quantity: p.meters, note: `Buyurtma uchun ajratildi: ${order.customer_name} (#${orderId.slice(0, 8)})` }]);
                }
            }
            accessories.forEach(a => {
                const item = accInventory.find(x => (x.name || '').toLowerCase() === a.name.toLowerCase());
                if (item) item.qty = (Number(item.qty) || 0) - a.qty;
            });
            for (const item of accInventory) {
                await supabase.from('romix_accessories').update({ qty: item.qty }).eq('id', item.id);
            }
            localStorage.setItem('romix_accessories_inventory', JSON.stringify(accInventory));

            const curUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const operatorName = curUser.full_name || curUser.username || 'Ombor';
            if (accessories.length > 0) {
                for (const a of accessories) {
                    await supabase.from('romix_accessories_history').insert([{
                        id: 'HIST-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                        timestamp: new Date().toLocaleDateString('uz-UZ') + ' ' + new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
                        action: 'Buyurtma Chiqim 📤',
                        details: `"${a.name}" dan ${a.qty} dona buyurtma uchun ajratildi (${order.customer_name}).`,
                        operator: operatorName.toUpperCase()
                    }]);
                }
            }

            // Qoldiq Profillar — ombor xodimi qo'lda biriktirgan miqdorlarni ayiramiz
            for (const pick of qoldiqPicks) {
                const { data: q } = await supabase.from('romix_qoldiq_profillar').select('stock_quantity').eq('id', pick.id).maybeSingle();
                const have = q ? Number(q.stock_quantity) || 0 : 0;
                const newQty = Math.max(0, have - pick.qty);
                if (newQty === 0) {
                    await supabase.from('romix_qoldiq_profillar').delete().eq('id', pick.id);
                } else {
                    await supabase.from('romix_qoldiq_profillar').update({ stock_quantity: newQty }).eq('id', pick.id);
                }
            }

            // Oynak — xuddi shunday, qo'lda biriktirilgan miqdorni ayiramiz
            for (const pick of oynakPicks) {
                const { data: o } = await supabase.from('romix_oynak').select('stock_quantity').eq('id', pick.id).maybeSingle();
                const have = o ? Number(o.stock_quantity) || 0 : 0;
                const newQty = Math.max(0, have - pick.qty);
                await supabase.from('romix_oynak').update({ stock_quantity: newQty }).eq('id', pick.id);
            }

            const confirmPatch = {
                status: 'Jarayonda',
                ombor_confirmed_at: new Date().toISOString(),
                ombor_confirmed_by: operatorName,
                ombor_confirmed_materials: { profiles, accessories, qoldiqPicks, oynakPicks }
            };
            // MUHIM: agar ustun mavjud bo'lmasa, Supabase/PostgREST XATO QAYTARMAYDI — shunchaki
            // `data: null` bilan hech narsa yozmasdan "muvaffaqiyatli" javob beradi. Shu sabab xatoni
            // emas, balki `.select()` orqali qaytgan `data`ning bo'shligini tekshiramiz.
            const { data: confirmData, error: confirmErr } = await supabase.from('sales_orders').update(confirmPatch).eq('id', orderId).select();
            if (confirmErr || !confirmData || confirmData.length === 0) {
                // ombor_confirmed_materials ustuni hali yaratilmagan bo'lishi mumkin (SQL migratsiya
                // ishga tushirilmagan) — asosiy tasdiqlash oqimi buzilmasin deb shu maydonsiz qayta urinamiz.
                console.warn('sales_orders update with ombor_confirmed_materials failed, retrying without it:', confirmErr);
                delete confirmPatch.ombor_confirmed_materials;
                const { data: retryData, error: retryErr } = await supabase.from('sales_orders').update(confirmPatch).eq('id', orderId).select();
                if (retryErr || !retryData || retryData.length === 0) {
                    throw new Error("Buyurtma holatini yangilab bo'lmadi: " + (retryErr?.message || "noma'lum xatolik"));
                }
            }

            generateOrderConfirmationPdf(order, profiles, accessories, qoldiqPicks, oynakPicks, operatorName);

            window._ordConfirmQoldiqPicks = [];
            window._ordConfirmOynakPicks = [];
            if (modal) modal.classList.add('hidden');

            window.showPremiumToast ? window.showPremiumToast('Tasdiqlandi', "Buyurtma Ishlab Chiqarishga o'tkazildi.", true) : alert("Buyurtma tasdiqlandi va Ishlab Chiqarishga o'tkazildi!");
            loadOrdersConfirmation();
        } catch (err) {
            alert('Xatolik: ' + err.message);
            console.error('confirmOrderMaterials failed:', err);
        }
    }

    function generateOrderConfirmationPdf(order, profiles, accessories, qoldiqPicks, oynakPicks, operatorName) {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            console.warn('jsPDF yuklanmagan, PDF chiqarilmadi');
            return;
        }
        qoldiqPicks = qoldiqPicks || [];
        oynakPicks = oynakPicks || [];
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pageW = 210;
        const navy = [22, 33, 62];
        const cyan = [0, 200, 180];
        const lightGray = [244, 246, 250];
        const textDark = [30, 34, 45];

        // --- Sarlavha (header) ---
        doc.setFillColor(...navy);
        doc.rect(0, 0, pageW, 30, 'F');
        doc.setFillColor(...cyan);
        doc.rect(0, 30, pageW, 1.4, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('AKFA ROMIX', 15, 14);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(180, 220, 255);
        doc.text('OMBOR TASDIQNOMASI — Buyurtma uchun ajratilgan mahsulotlar', 15, 22);
        doc.setFontSize(9);
        doc.setTextColor(200, 200, 200);
        doc.text(`№ ${String(order.id || '').slice(0, 8).toUpperCase()}`, pageW - 15, 14, { align: 'right' });
        doc.text(new Date().toLocaleDateString('uz-UZ'), pageW - 15, 22, { align: 'right' });

        // --- Ma'lumot bloki (2x2: Buyurtmachi/Telefon, Sana/Turi) ---
        let y = 40;
        doc.setFillColor(...lightGray);
        doc.roundedRect(15, y, pageW - 30, 34, 2, 2, 'F');
        doc.setTextColor(...textDark);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('BUYURTMACHI', 20, y + 8);
        doc.text('TELEFON RAQAMI', 110, y + 8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(order.customer_name || '---', 20, y + 15);
        doc.text(order.customer_phone || '---', 110, y + 15);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('BUYURTMA SANASI', 20, y + 23.5);
        doc.text('BUYURTMA TURI', 110, y + 23.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.text(order.created_at ? new Date(order.created_at).toLocaleDateString('uz-UZ') : '---', 20, y + 30);
        doc.text(order.prod_type || '---', 110, y + 30);

        // --- Mahsulotlar jadvali ---
        y += 44;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...textDark);
        doc.text("Ombordan Ajratilgan Mahsulotlar", 15, y);
        y += 6;

        const rows = [
            ...profiles.map(p => ['📏 Profil', p.material_name, `${p.meters} metr`]),
            ...accessories.map(a => ['🔩 Aksesuvar', a.name, `${a.qty} dona`]),
            ...qoldiqPicks.map(q => ['✂️ Qoldiq', q.label, `${q.qty} dona`]),
            ...oynakPicks.map(o => ['🪟 Oynak', o.label, `${o.qty} dona`])
        ];

        const colX = [15, 60, 155];
        const colW = [45, 95, 40];
        const rowH = 8;

        doc.setFillColor(...navy);
        doc.rect(15, y, pageW - 30, rowH, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text('TURI', colX[0] + 2, y + 5.5);
        doc.text('NOMI', colX[1] + 2, y + 5.5);
        doc.text('MIQDORI', colX[2] + 2, y + 5.5);
        y += rowH;

        if (rows.length === 0) {
            doc.setTextColor(...textDark);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text("Ajratilgan mahsulot yo'q", 20, y + 6);
            y += rowH;
        } else {
            rows.forEach((r, idx) => {
                if (y > 255) { doc.addPage(); y = 20; }
                if (idx % 2 === 0) { doc.setFillColor(...lightGray); doc.rect(15, y, pageW - 30, rowH, 'F'); }
                doc.setTextColor(...textDark);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9.5);
                doc.text(String(r[0]), colX[0] + 2, y + 5.5);
                doc.text(String(r[1]).slice(0, 42), colX[1] + 2, y + 5.5);
                doc.setFont('helvetica', 'bold');
                doc.text(String(r[2]), colX[2] + 2, y + 5.5);
                doc.setDrawColor(225, 227, 232);
                doc.line(15, y + rowH, pageW - 15, y + rowH);
                y += rowH;
            });
        }

        // --- Imzo bloklari (pastda) ---
        let sigY = Math.max(y + 20, 235);
        if (sigY > 265) { doc.addPage(); sigY = 40; }
        const boxW = (pageW - 30 - 10) / 2;
        [
            { x: 15, label: 'OMBORCHI', name: operatorName || '' },
            { x: 15 + boxW + 10, label: 'ISHLAB CHIQARUVCHI', name: '' }
        ].forEach(sig => {
            doc.setDrawColor(...navy);
            doc.setLineWidth(0.4);
            doc.roundedRect(sig.x, sigY, boxW, 34, 2, 2);
            doc.setFillColor(...navy);
            doc.rect(sig.x, sigY, boxW, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.text(sig.label, sig.x + boxW / 2, sigY + 5.5, { align: 'center' });
            doc.setTextColor(...textDark);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text('F.I.Sh:', sig.x + 4, sigY + 16);
            doc.text(sig.name, sig.x + 22, sigY + 16);
            doc.setDrawColor(180, 183, 190);
            doc.line(sig.x + 4, sigY + 25, sig.x + boxW - 4, sigY + 25);
            doc.setFontSize(7.5);
            doc.setTextColor(120, 124, 135);
            doc.text('Imzo', sig.x + 4, sigY + 29);
            doc.text('Sana: ____ / ____ / ______', sig.x + boxW - 4, sigY + 29, { align: 'right' });
        });

        doc.setFontSize(7.5);
        doc.setTextColor(150, 150, 150);
        doc.text('AKFA Romix — avtomatik tizim tomonidan yaratilgan hujjat', 15, 290);

        doc.save(`Tasdiqnoma_${(order.customer_name || 'order').replace(/\s+/g, '_')}.pdf`);
    }

    // ============================================================
    // ==== UMUMIY — Ombor CRM ko'rinishi (faqat miqdor, kirim/chiqim, ====
    // ==== Profil/Aksesuvar/Qoldiq/Oynak bo'yicha brend-filtr)   ====
    // ============================================================
    function omMonthKey() { return new Date().toISOString().slice(0, 7); }

    // Aksesuvar/Qoldiq/Oynak — avval faqat localStorage'da edi, endi Supabase'da (markazlashgan).
    // Har biri birinchi o'qishda: Supabase jadvali bo'sh VA localStorage'da eski ma'lumot bo'lsa,
    // bir martalik avtomatik ko'chiriladi (haqiqiy ombor kompyuterida qolgan ma'lumot yo'qolmasligi uchun).
    let _omMigrationChecked = { accessories: false, qoldiq: false, oynak: false };

    async function _omMigrateOnce(key, table, localKey, mapFn) {
        if (_omMigrationChecked[key]) return;
        _omMigrationChecked[key] = true;
        try {
            const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
            if (error) throw error;
            if (count > 0) return;
            const local = JSON.parse(localStorage.getItem(localKey) || '[]');
            if (!local.length) return;
            const rows = local.map(mapFn);
            const { error: insErr } = await supabase.from(table).insert(rows);
            if (insErr) throw insErr;
            console.log(`✅ ${table}: ${rows.length} ta yozuv localStorage'dan Supabase'ga ko'chirildi.`);
        } catch (e) {
            console.warn(`Ombor migratsiya xatosi (${table}):`, e);
        }
    }

    async function omGetAccessories() {
        await _omMigrateOnce('accessories', 'romix_accessories', 'romix_accessories_inventory', (a, i) => ({
            id: a.id || ('ACC-' + Date.now() + '-' + i), name: a.name, category: a.category,
            qty: Number(a.qty) || 0, unit: a.unit, spec: a.spec || '', price: Number(a.price) || 0
        }));
        try {
            const { data, error } = await supabase.from('romix_accessories').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (e) { console.warn('Aksesuvar fetch error:', e); return []; }
    }

    async function omGetQoldiq() {
        await _omMigrateOnce('qoldiq', 'romix_qoldiq_profillar', 'romix_qoldiq_inventory', (q, i) => ({
            id: q.id || ('QLD-' + Date.now() + '-' + i), product_name: q.product_name, brand: q.brand,
            series: q.series, color: q.color, profile_type: q.profile_type,
            length: Number(q.length) || 0, stock_quantity: Number(q.stock_quantity) || 0
        }));
        try {
            const { data, error } = await supabase.from('romix_qoldiq_profillar').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (e) { console.warn('Qoldiq fetch error:', e); return []; }
    }

    async function omGetOynak() {
        await _omMigrateOnce('oynak', 'romix_oynak', 'romix_oynak_inventory', (o, i) => ({
            id: 'OYNAK-' + Date.now() + '-' + i, brand: o.brand, product_name: o.product_name || o.brand,
            size: o.size || '', stock_quantity: Number(o.stock_quantity) || 0, unit: o.unit || 'dona', price: Number(o.price) || 0
        }));
        try {
            const { data, error } = await supabase.from('romix_oynak').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (e) { console.warn('Oynak fetch error:', e); return []; }
    }

    // Ombor (warehouse) rolida narx/qiymat ko'rsatilmaydi — faqat miqdor (metr/dona).
    // Shu sabab guruhlar miqdor bo'yicha saralanadi (eng ko'p zaxira birinchi).
    function omGroupProfilByName(items) {
        const groups = {};
        items.forEach(p => {
            const meta = p.metadata || {};
            const key = meta.brend ? `${meta.brend}${meta.seriya ? ' ' + meta.seriya : ''}` : (p.product_name || "Noma'lum");
            if (!groups[key]) groups[key] = { name: key, qty: 0, unit: p.unit || '', items: [] };
            groups[key].qty += Number(p.stock_quantity) || 0;
            if (!groups[key].unit) groups[key].unit = p.unit || '';
            groups[key].items.push(p);
        });
        return Object.values(groups).sort((a, b) => b.qty - a.qty);
    }
    function omGroupAccessoriesByCategory(items) {
        const groups = {};
        items.forEach(a => {
            const key = a.category || 'Boshqa';
            if (!groups[key]) groups[key] = { name: key, qty: 0, unit: a.unit || '', items: [] };
            groups[key].qty += Number(a.qty) || 0;
            if (!groups[key].unit) groups[key].unit = a.unit || '';
            groups[key].items.push(a);
        });
        return Object.values(groups).sort((a, b) => b.qty - a.qty);
    }
    function omGroupQoldiqByBrand(items) {
        const groups = {};
        items.forEach(q => {
            const key = q.brand || q.product_name || "Noma'lum";
            if (!groups[key]) groups[key] = { name: key, qty: 0, unit: 'dona', items: [] };
            groups[key].qty += Number(q.stock_quantity) || 0;
            groups[key].items.push(q);
        });
        return Object.values(groups).sort((a, b) => b.qty - a.qty);
    }
    function omGroupOynakByBrand(items) {
        const groups = {};
        items.forEach(o => {
            const key = o.brand || "Noma'lum";
            if (!groups[key]) groups[key] = { name: key, qty: 0, unit: o.unit || 'dona', items: [] };
            groups[key].qty += Number(o.stock_quantity) || 0;
            groups[key].items.push(o);
        });
        return Object.values(groups).sort((a, b) => b.qty - a.qty);
    }
    function omSafeKey(str) { return (str || '').replace(/[^a-zA-Z0-9]/g, '_'); }

    // ============================================================
    // ==== OMBOR JAMI — Premium 4 bo'limli ko'rinish             ====
    // (Profil / Aksesuvar / Qoldiq Profil / Oynak — brend/kategoriya ====
    //  chip-filtri bilan, mm/brend/kategoriya/miqdor batafsil)   ====
    // ============================================================
    const _OJ_CATEGORY_META = {
        profil: { icon: '📦', label: 'Profil', title: '📦 Profil — Brend/Seriya Bo\'yicha' },
        aksesuvar: { icon: '🔩', label: 'Aksesuvar', title: '🔩 Aksesuvar — Kategoriya Bo\'yicha' },
        qoldiq: { icon: '✂️', label: 'Qoldiq Profil', title: '✂️ Qoldiq Profil — Brend Bo\'yicha' },
        oynak: { icon: '🪟', label: 'Oynak', title: '🪟 Oynak — Brend Bo\'yicha' }
    };
    window._ojData = null;
    window._ojActiveCategory = 'profil';
    window._ojActiveBrand = { profil: 'barchasi', aksesuvar: 'barchasi', qoldiq: 'barchasi', oynak: 'barchasi' };
    window._ojActiveSeries = { profil: 'barchasi', aksesuvar: 'barchasi', qoldiq: 'barchasi', oynak: 'barchasi' };
    window._ojSearchTerm = '';
    window._ojActivePart = 'barchasi';

    function detectProfileElement(p) {
        if (!p) return 'Boshqalar';
        const metaEl = p.metadata?.element;
        if (metaEl) {
            const lower = metaEl.toLowerCase().trim();
            if (lower.includes('kosa') || lower.includes('ramka') || lower.includes('rama')) return 'Kosa';
            if (lower.includes('qanot') || lower.includes('stvorka') || lower.includes('eshab')) return 'Qanot';
            if (lower.includes('o\'rta') || lower.includes('impost') || lower.includes('orta')) return 'O\'rta';
            if (lower.includes('shtapik')) return 'Shtapik';
            return 'Boshqalar';
        }
        const name = (p.product_name || p.name || '').toLowerCase();
        if (name.includes('kosa') || name.includes('ramka') || name.includes('rama')) return 'Kosa';
        if (name.includes('qanot') || name.includes('stvorka')) return 'Qanot';
        if (name.includes('o\'rta') || name.includes('impost') || name.includes('orta')) return 'O\'rta';
        if (name.includes('shtapik')) return 'Shtapik';

        const desc = (p.description || '').toLowerCase();
        if (desc.includes('kosa') || desc.includes('ramka') || desc.includes('rama')) return 'Kosa';
        if (desc.includes('qanot') || desc.includes('stvorka')) return 'Qanot';
        if (desc.includes('o\'rta') || desc.includes('impost') || desc.includes('orta')) return 'O\'rta';
        if (desc.includes('shtapik')) return 'Shtapik';

        return 'Boshqalar';
    }

    window._ojSetProfilePart = function(part) {
        window._ojActivePart = part;
        renderOmborJami();
    };

    window._ojHoverPart = function(part, isHover) {
        const activePart = window._ojActivePart || 'barchasi';
        if (part === activePart) return;

        let color = 'rgba(255,255,255,0.15)';
        let strokeWOuter = 1.5;
        let strokeWInner = 1;
        let dash = '3,3';
        
        if (isHover) {
            if (part === 'Kosa') { color = '#007aff'; strokeWOuter = 4; strokeWInner = 1.5; dash = 'none'; }
            else if (part === 'Qanot') { color = '#ff9500'; strokeWOuter = 3; strokeWInner = 1.5; dash = 'none'; }
            else if (part === 'O\'rta') { color = '#af52de'; strokeWOuter = 3; strokeWInner = 1.5; dash = 'none'; }
            else if (part === 'Shtapik') { color = '#ffcc00'; strokeWOuter = 2; strokeWInner = 1; dash = 'none'; }
        } else {
            if (part === 'Kosa') { color = 'rgba(255,255,255,0.15)'; strokeWOuter = 2; strokeWInner = 1; dash = '3,3'; }
            else if (part === 'Qanot') { color = 'rgba(255,255,255,0.15)'; strokeWOuter = 1.5; strokeWInner = 1; dash = '3,3'; }
            else if (part === 'O\'rta') { color = 'rgba(255,255,255,0.15)'; strokeWOuter = 1.5; strokeWInner = 1; dash = '4,4'; }
            else if (part === 'Shtapik') { color = 'rgba(255,255,255,0.08)'; strokeWOuter = 1; strokeWInner = 0.5; dash = 'none'; }
        }

        if (part === 'Kosa') {
            const outer = document.getElementById('cad-kosa-outer');
            const inner = document.getElementById('cad-kosa-inner');
            const steel = document.getElementById('cad-kosa-steel');
            if (outer) { outer.setAttribute('stroke', color); outer.setAttribute('stroke-width', strokeWOuter); }
            if (inner) { inner.setAttribute('stroke', isHover ? color : 'rgba(255,255,255,0.08)'); inner.setAttribute('stroke-dasharray', dash); }
            if (steel) steel.setAttribute('stroke', isHover ? color : 'rgba(255,255,255,0.1)');
        } else if (part === 'Qanot') {
            const outer = document.getElementById('cad-qanot-outer');
            const inner = document.getElementById('cad-qanot-inner');
            const steel = document.getElementById('cad-qanot-steel');
            if (outer) { outer.setAttribute('stroke', color); outer.setAttribute('stroke-width', strokeWOuter); }
            if (inner) { inner.setAttribute('stroke', isHover ? color : 'rgba(255,255,255,0.08)'); inner.setAttribute('stroke-dasharray', dash); }
            if (steel) steel.setAttribute('stroke', isHover ? color : 'rgba(255,255,255,0.1)');
        } else if (part === 'O\'rta') {
            const outer = document.getElementById('cad-orta-outer');
            const inner = document.getElementById('cad-orta-inner');
            const steel = document.getElementById('cad-orta-steel');
            if (outer) { outer.setAttribute('stroke', color); outer.setAttribute('stroke-width', strokeWOuter); }
            if (inner) { inner.setAttribute('stroke', isHover ? color : 'rgba(255,255,255,0.08)'); inner.setAttribute('stroke-dasharray', dash); }
            if (steel) steel.setAttribute('stroke', isHover ? color : 'rgba(255,255,255,0.1)');
        } else if (part === 'Shtapik') {
            const left = document.getElementById('cad-shtapik-l');
            const right = document.getElementById('cad-shtapik-r');
            if (left) { left.setAttribute('stroke', color); left.setAttribute('stroke-width', strokeWOuter); }
            if (right) { right.setAttribute('stroke', color); right.setAttribute('stroke-width', strokeWOuter); }
        }
    };

    function safeReplaceString(source, target) {
        if (!source || !target) return source;
        try {
            const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return source.replace(new RegExp(escaped, 'gi'), '');
        } catch (e) {
            return source;
        }
    }

    // --- MAHSULOT HAQIDA TO'LIQ MA'LUMOT VA TARIX MODALI ---
    window.openProductDetailModal = async function(prodId, cat) {
        cat = cat || window._ojActiveCategory || 'profil';
        
        let p = null;
        let foundCat = cat;
        if (window._ojData) {
            for (const cKey of ['profil', 'aksesuvar', 'qoldiq', 'oynak']) {
                if (window._ojData[cKey] && window._ojData[cKey].items) {
                    p = window._ojData[cKey].items.find(x => String(x.id) === String(prodId));
                    if (p) { foundCat = cKey; break; }
                }
            }
        }

        if (!p && prodId && typeof supabase !== 'undefined') {
            try {
                let tbl = 'romix_inventory';
                if (cat === 'aksesuvar') tbl = 'romix_accessories';
                else if (cat === 'qoldiq') tbl = 'romix_qoldiq_profillar';
                else if (cat === 'oynak') tbl = 'romix_oynak';
                
                const { data } = await supabase.from(tbl).select('*').eq('id', prodId).maybeSingle();
                if (data) p = data;
            } catch (e) {
                console.warn('Direct fetch fallback error:', e);
            }
        }

        const modal = document.getElementById('prodDetailModal');
        if (!modal) {
            console.error("prodDetailModal not found in DOM!");
            return;
        }

        if (!p) {
            console.warn("Product not found for ID:", prodId);
            p = { id: prodId, product_name: "Mahsulot #" + String(prodId).slice(0,8) };
        }
        cat = foundCat;

        window._activeDetailProd = p;
        window._activeDetailCat = cat;

        const badge = document.getElementById('pdCategoryBadge');
        const nameInput = document.getElementById('pdNameInput');
        const brandEl = document.getElementById('pdBrand');
        const stockEl = document.getElementById('pdStock');
        const idEl = document.getElementById('pdId');
        const firstInEl = document.getElementById('pdFirstIn');
        const lastInEl = document.getElementById('pdLastIn');
        const lastOutEl = document.getElementById('pdLastOut');
        const historyList = document.getElementById('pdHistoryList');

        const meta = p.metadata || {};
        const prodName = p.product_name || p.name || "Noma'lum";
        const brand = meta.brend || p.brand || p.category || '-';
        const series = meta.seriya || p.series || p.size || '';
        const sizeVal = meta.uzunligi || p.length || p.size || '';
        const qty = Number(p.stock_quantity ?? p.qty) || 0;
        const unit = p.unit || 'dona';

        if (badge) badge.textContent = `${cat.toUpperCase()} — MAHSULOT TAFSILOTLARI`;
        if (nameInput) nameInput.value = prodName;
        if (document.getElementById('pdSeriesInput')) document.getElementById('pdSeriesInput').value = series;
        if (document.getElementById('pdSizeInput')) document.getElementById('pdSizeInput').value = sizeVal;
        if (brandEl) brandEl.textContent = brand;
        if (stockEl) stockEl.textContent = `${qty.toLocaleString('uz-UZ')} ${unit}`;
        if (idEl) idEl.textContent = p.id ? `#${String(p.id).slice(0, 12).toUpperCase()}` : '—';

        if (firstInEl) firstInEl.textContent = 'Yuklanmoqda...';
        if (lastInEl) lastInEl.textContent = 'Yuklanmoqda...';
        if (lastOutEl) lastOutEl.textContent = 'Yuklanmoqda...';
        if (historyList) historyList.innerHTML = '<div style="text-align:center; padding:20px; color:rgba(255,255,255,0.4); font-size:0.85rem;">Harakatlar tarixi yuklanmoqda...</div>';

        // FORCE MODAL DISPLAY FLEX
        modal.style.setProperty('display', 'flex', 'important');

        try {
            let query = supabase.from('romix_transactions').select('*').order('created_at', { ascending: false });
            
            // Check if prodId is valid UUID before querying inventory_id
            const isUuid = typeof prodId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prodId);
            
            if (isUuid) {
                query = query.or(`inventory_id.eq.${prodId},material_name.ilike.%${prodName}%`);
            } else if (prodName) {
                query = query.ilike('material_name', `%${prodName}%`);
            }

            const { data: txs, error } = await query.limit(50);
            if (error) throw error;

            if (!txs || txs.length === 0) {
                if (firstInEl) firstInEl.textContent = 'Mavjud emas';
                if (lastInEl) lastInEl.textContent = 'Mavjud emas';
                if (lastOutEl) lastOutEl.textContent = 'Hali ishlatilmagan';
                if (historyList) historyList.innerHTML = '<div style="text-align:center; padding:20px; color:rgba(255,255,255,0.3); font-size:0.85rem;">Ushbu mahsulot bo\'yicha birorta kirim/chiqim amali topilmadi.</div>';
                return;
            }

            const inTxs = txs.filter(t => t.type === 'IN').sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            const outTxs = txs.filter(t => t.type === 'OUT').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            if (inTxs.length > 0) {
                const firstInDate = new Date(inTxs[0].created_at);
                const lastInDate = new Date(inTxs[inTxs.length - 1].created_at);
                if (firstInEl) firstInEl.textContent = firstInDate.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                if (lastInEl) lastInEl.textContent = lastInDate.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            } else {
                if (firstInEl) firstInEl.textContent = 'Mavjud emas';
                if (lastInEl) lastInEl.textContent = 'Mavjud emas';
            }

            if (outTxs.length > 0) {
                const lastOutDate = new Date(outTxs[0].created_at);
                if (lastOutEl) lastOutEl.textContent = lastOutDate.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            } else {
                if (lastOutEl) lastOutEl.textContent = 'Hali ishlatilmagan';
            }

            let historyHtml = txs.map(t => {
                const isIN = t.type === 'IN';
                const dateStr = new Date(t.created_at).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                const typeLabel = isIN ? '📥 Kirim' : '📤 Chiqim';
                const typeColor = isIN ? '#00ff88' : '#ff4d4f';
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.83rem;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-weight:800; color:${typeColor}; background:${typeColor}15; padding:2px 8px; border-radius:6px; border:1px solid ${typeColor}30;">${typeLabel}</span>
                            <span style="color:#fff; font-weight:700;">${Number(t.quantity || 0).toLocaleString('uz-UZ')} ${unit}</span>
                        </div>
                        <div style="text-align:right;">
                            <span style="color:rgba(255,255,255,0.5); font-size:0.75rem; display:block;">${dateStr}</span>
                            <span style="color:rgba(255,255,255,0.3); font-size:0.7rem;">${t.performer_name || 'Tizim'}</span>
                        </div>
                    </div>
                `;
            }).join('');

            if (historyList) historyList.innerHTML = historyHtml;

        } catch (err) {
            console.warn('Product details history fetch error:', err);
            if (firstInEl) firstInEl.textContent = '—';
            if (lastInEl) lastInEl.textContent = '—';
            if (lastOutEl) lastOutEl.textContent = '—';
            if (historyList) historyList.innerHTML = '<div style="text-align:center; padding:20px; color:rgba(255,255,255,0.4); font-size:0.85rem;">Harakatlar tarixi topilmadi.</div>';
        }
    };

    window.saveProductName = async function() {
        const p = window._activeDetailProd;
        const cat = window._activeDetailCat || 'profil';
        const nameInput = document.getElementById('pdNameInput');
        const seriesInput = document.getElementById('pdSeriesInput');
        const sizeInput = document.getElementById('pdSizeInput');
        const saveBtn = document.getElementById('pdSaveNameBtn');

        if (!p || !nameInput) {
            alert("Mahsulot tanlanmagan!");
            return;
        }

        const newName = nameInput.value.trim();
        const newSeries = seriesInput ? seriesInput.value.trim() : '';
        const newSize = sizeInput ? sizeInput.value.trim() : '';

        if (!newName) {
            alert("Mahsulot nomi bo'sh bo'lishi mumkin emas!");
            return;
        }

        if (saveBtn) {
            saveBtn.textContent = "⏳ Saqlanmoqda...";
            saveBtn.disabled = true;
        }

        try {
            let table = 'romix_inventory';
            const updateObj = {};

            if (cat === 'aksesuvar') {
                table = 'romix_accessories';
                updateObj.name = newName;
                if (newSeries) updateObj.category = newSeries;
            } else if (cat === 'qoldiq') {
                table = 'romix_qoldiq_profillar';
                updateObj.product_name = newName;
                if (newSeries) updateObj.series = newSeries;
                if (newSize) {
                    const parsed = parseFloat(newSize.replace(/[^\d.]/g, ''));
                    if (!isNaN(parsed)) updateObj.length = parsed;
                }
            } else if (cat === 'oynak') {
                table = 'romix_oynak';
                updateObj.product_name = newName;
                if (newSize) updateObj.size = newSize;
            } else {
                table = 'romix_inventory';
                updateObj.product_name = newName;
                const newMeta = { ...(p.metadata || {}) };
                newMeta.seriya = newSeries;
                newMeta.uzunligi = newSize;
                updateObj.metadata = newMeta;
            }

            // Supabase network request with 5s timeout safety
            if (p.id && typeof supabase !== 'undefined') {
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout — saqlash 5 soniyada javob bermadi")), 5000)
                );
                const { error } = await Promise.race([
                    supabase.from(table).update(updateObj).eq('id', p.id),
                    timeoutPromise
                ]);
                if (error) throw error;
            }

            // Update local memory objects (p)
            p.product_name = newName;
            p.name = newName;
            if (!p.metadata) p.metadata = {};
            p.metadata.seriya = newSeries;
            p.metadata.uzunligi = newSize;
            if (cat === 'qoldiq') { p.series = newSeries; p.length = newSize; }
            if (cat === 'oynak') { p.size = newSize; }

            // Also update item inside window._ojData[cat].items array
            if (window._ojData && window._ojData[cat] && window._ojData[cat].items) {
                const itemIndex = window._ojData[cat].items.findIndex(it => String(it.id) === String(p.id));
                if (itemIndex !== -1) {
                    const targetItem = window._ojData[cat].items[itemIndex];
                    targetItem.product_name = newName;
                    targetItem.name = newName;
                    if (!targetItem.metadata) targetItem.metadata = {};
                    targetItem.metadata.seriya = newSeries;
                    targetItem.metadata.uzunligi = newSize;
                    if (cat === 'qoldiq') { targetItem.series = newSeries; targetItem.length = newSize; }
                    if (cat === 'oynak') { targetItem.size = newSize; }
                }
            }

            // Re-render main warehouse UI
            if (typeof renderOmborJami === 'function') renderOmborJami();
            if (typeof populateBrandOptions === 'function') populateBrandOptions();

            const m = document.getElementById('prodDetailModal');
            if (m) m.style.setProperty('display', 'none', 'important');

            alert("✅ Mahsulot ma'lumotlari (nomi, seriyasi, o'lchami) muvaffaqiyatli saqlandi!");

        } catch (err) {
            console.error('Saqlash xatosi:', err);
            alert("Xatolik: " + (err.message || "Saqlab bo'lmadi"));
        } finally {
            if (saveBtn) {
                saveBtn.textContent = "💾 Ma'lumotlarni Saqlash";
                saveBtn.disabled = false;
            }
        }
    };

    // Global Event Delegation for Product Card / Table Row Click
    document.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.oj-profile-card, tr[data-prod-id]');
        if (!itemEl) return;
        if (e.target.closest('.oj-delete-btn, .oj-delete-qoldiq-btn, .oj-delete-oynak-btn, input')) return;

        const prodId = itemEl.dataset.prodId;
        const cat = itemEl.dataset.cat || window._ojActiveCategory || 'profil';
        if (prodId && typeof window.openProductDetailModal === 'function') {
            window.openProductDetailModal(prodId, cat);
        }
    });

    // Immediate and DOMContentLoaded bindings for prodDetailModal
    function setupProdDetailModalEvents() {
        const closeBtn = document.getElementById('closeProdDetailModal');
        if (closeBtn) {
            closeBtn.onclick = () => {
                const m = document.getElementById('prodDetailModal');
                if (m) m.style.setProperty('display', 'none', 'important');
            };
        }
        const saveBtn = document.getElementById('pdSaveNameBtn');
        if (saveBtn) {
            saveBtn.onclick = () => window.saveProductName();
        }
        const m = document.getElementById('prodDetailModal');
        if (m) {
            m.onclick = (e) => {
                if (e.target === m) {
                    m.style.setProperty('display', 'none', 'important');
                }
            };
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupProdDetailModalEvents);
    } else {
        setupProdDetailModalEvents();
    }

    let tsBrand = null;
    let tsSeries = null;

    window._ojSelectBrand = function(brandVal) {
        const cat = window._ojActiveCategory;
        window._ojActiveBrand[cat] = brandVal;
        window._ojActiveSeries[cat] = 'barchasi';
        if (tsBrand) tsBrand.setValue(brandVal, true);
        populateBrandChips();
        updateSeriesOptions();
        renderOmborJami();
    };

    function populateBrandChips() {
        const chipsRow = document.getElementById('ojBrandChipsRow');
        if (!chipsRow) return;

        const cat = window._ojActiveCategory;
        const data = window._ojData && window._ojData[cat];
        if (!data || !data.items) {
            chipsRow.innerHTML = '';
            return;
        }

        const brandCounts = {};
        let totalItemsCount = data.items.length;

        data.items.forEach(it => {
            let b = '';
            if (cat === 'profil') b = it.metadata?.brend || it.brand;
            else if (cat === 'aksesuvar') b = it.category;
            else if (cat === 'qoldiq' || cat === 'oynak') b = it.brand;
            
            if (b) {
                brandCounts[b] = (brandCounts[b] || 0) + 1;
            } else {
                brandCounts["Noma'lum"] = (brandCounts["Noma'lum"] || 0) + 1;
            }
        });

        const activeBrand = window._ojActiveBrand[cat] || 'barchasi';
        let chipsHtml = `
            <div class="brand-chip-v3 ${activeBrand === 'barchasi' ? 'active' : ''}" onclick="window._ojSelectBrand('barchasi')">
                <span>🗂️ Barchasi</span>
                <span class="brand-badge-count">${totalItemsCount}</span>
            </div>
        `;

        Object.keys(brandCounts).sort().forEach(b => {
            const isActive = activeBrand === b;
            let icon = '🏢';
            const bLower = b.toLowerCase();
            if (bLower.includes('plastik')) icon = '🧊';
            else if (bLower.includes('alyuminiy')) icon = '⚡';
            else if (bLower.includes('termo')) icon = '🔥';
            else if (bLower.includes('retpen')) icon = '🛡️';
            else if (bLower.includes('ekopen')) icon = '🌱';
            else if (cat === 'aksesuvar') icon = '🔩';
            else if (cat === 'oynak') icon = '🪟';

            chipsHtml += `
                <div class="brand-chip-v3 ${isActive ? 'active' : ''}" onclick="window._ojSelectBrand('${b.replace(/'/g, "\\'")}')">
                    <span>${icon} ${b}</span>
                    <span class="brand-badge-count">${brandCounts[b]}</span>
                </div>
            `;
        });

        chipsRow.innerHTML = chipsHtml;
    }

    function populateBrandOptions() {
        populateBrandChips();
        const cat = window._ojActiveCategory;
        const data = window._ojData && window._ojData[cat];
        if (!data) return;

        const labelEl = document.getElementById('ojBrandFilterLabel');
        let uniqueBrands = new Set();

        if (cat === 'profil') {
            if (labelEl) labelEl.textContent = "🏢 Brendni Tanlang";
            data.items.forEach(p => {
                const b = p.metadata?.brend || p.brand;
                if (b) uniqueBrands.add(b);
            });
        } else if (cat === 'aksesuvar') {
            if (labelEl) labelEl.textContent = "🔩 Kategoriyani Tanlang";
            data.items.forEach(a => {
                if (a.category) uniqueBrands.add(a.category);
            });
        } else if (cat === 'qoldiq') {
            if (labelEl) labelEl.textContent = "🏢 Brendni Tanlang";
            data.items.forEach(qi => {
                if (qi.brand) uniqueBrands.add(qi.brand);
            });
        } else if (cat === 'oynak') {
            if (labelEl) labelEl.textContent = "🏢 Brendni Tanlang";
            data.items.forEach(o => {
                if (o.brand) uniqueBrands.add(o.brand);
            });
        }

        if (tsBrand) {
            tsBrand.clearOptions();
            tsBrand.clear();
            let options = [{ value: 'barchasi', text: '🗂️ Barchasi' }];
            uniqueBrands.forEach(b => {
                options.push({ value: b, text: b });
            });
            tsBrand.addOption(options);
            tsBrand.setValue(window._ojActiveBrand[cat] || 'barchasi', true);
        }
    }

    function updateSeriesOptions() {
        const cat = window._ojActiveCategory;
        const brand = window._ojActiveBrand[cat] || 'barchasi';
        const data = window._ojData && window._ojData[cat];
        if (!data) return;

        const container = document.getElementById('ojSeriesFilterContainer');
        const labelEl = document.getElementById('ojSeriesFilterLabel');

        if (cat === 'aksesuvar') {
            if (container) container.style.display = 'none';
            return;
        }

        if (container) container.style.display = 'flex';

        let options = [{ value: 'barchasi', text: '🗂️ Barchasi' }];
        let uniqueVals = new Set();

        let items = data.items || [];
        if (brand !== 'barchasi') {
            if (cat === 'profil') {
                items = items.filter(it => (it.metadata?.brend || it.brand) === brand);
            } else if (cat === 'qoldiq') {
                items = items.filter(it => it.brand === brand);
            } else if (cat === 'oynak') {
                items = items.filter(it => it.brand === brand);
            }
        }

        items.forEach(it => {
            let val = '';
            if (cat === 'profil') {
                val = it.metadata?.seriya || it.series;
            } else if (cat === 'qoldiq') {
                val = it.series;
            } else if (cat === 'oynak') {
                val = it.size;
            }
            if (val) uniqueVals.add(val);
        });

        if (cat === 'oynak') {
            if (labelEl) labelEl.innerHTML = "🪟 O'lcham:";
        } else {
            if (labelEl) labelEl.innerHTML = "🏷️ Seriya:";
        }

        const chipsRow = document.getElementById('ojSeriesChipsRow');
        if (chipsRow) {
            const activeSeries = window._ojActiveSeries[cat] || 'barchasi';
            let chipsHtml = `
                <div class="brand-chip-v3 ${activeSeries === 'barchasi' ? 'active' : ''}" style="padding: 4px 12px; font-size: 0.74rem;" onclick="window._ojSelectSeries('barchasi')">
                    Barchasi
                </div>
            `;
            uniqueVals.forEach(v => {
                const isActive = activeSeries === v;
                chipsHtml += `
                    <div class="brand-chip-v3 ${isActive ? 'active' : ''}" style="padding: 4px 12px; font-size: 0.74rem;" onclick="window._ojSelectSeries('${v.replace(/'/g, "\\'")}')">
                        ${v}
                    </div>
                `;
            });
            chipsRow.innerHTML = chipsHtml;
        }
        
        if (tsSeries) {
            tsSeries.clearOptions();
            tsSeries.clear();
            uniqueVals.forEach(v => {
                options.push({ value: v, text: v });
            });
            tsSeries.addOption(options);
            tsSeries.setValue(window._ojActiveSeries[cat] || 'barchasi', true);
        }
    }

    window._ojSelectSeries = function(seriesVal) {
        const cat = window._ojActiveCategory;
        window._ojActiveSeries[cat] = seriesVal;
        if (tsSeries) tsSeries.setValue(seriesVal, true);
        updateSeriesOptions();
        renderOmborJami();
    };

    async function loadOmborJami() {
        const tabsEl = document.getElementById('ojCategoryTabs');
        if (!tabsEl) return;

        let profilItems = [];
        try {
            const { data } = await supabase.from('romix_inventory').select('*');
            profilItems = data || [];
        } catch (e) { console.warn('Ombor Jami profil fetch error:', e); }
        const accessories = await omGetAccessories();
        const qoldiqItems = await omGetQoldiq();
        const oynakItems = await omGetOynak();

        window._ojData = {
            profil: { items: profilItems, groups: omGroupProfilByName(profilItems) },
            aksesuvar: { items: accessories, groups: omGroupAccessoriesByCategory(accessories) },
            qoldiq: { items: qoldiqItems, groups: omGroupQoldiqByBrand(qoldiqItems) },
            oynak: { items: oynakItems, groups: omGroupOynakByBrand(oynakItems) }
        };

        const stockFilterRow = document.getElementById('ojStockStatusFilter');
        if (stockFilterRow) {
            stockFilterRow.querySelectorAll('.status-chip').forEach(btn => {
                btn.onclick = () => {
                    stockFilterRow.querySelectorAll('.status-chip').forEach(c => {
                        c.classList.remove('active');
                        c.style.background = 'transparent';
                        c.style.color = 'rgba(255, 255, 255, 0.6)';
                    });
                    btn.classList.add('active');
                    btn.style.background = 'rgba(0, 210, 255, 0.2)';
                    btn.style.color = '#00d2ff';
                    window._ojStockStatus = btn.dataset.status;
                    renderOmborJami();
                };
            });
        }

        const viewToggleGroup = document.getElementById('ojViewModeToggle');
        if (viewToggleGroup) {
            viewToggleGroup.querySelectorAll('.view-btn').forEach(btn => {
                btn.onclick = () => {
                    viewToggleGroup.querySelectorAll('.view-btn').forEach(b => {
                        b.classList.remove('active');
                        b.style.background = 'transparent';
                        b.style.color = 'rgba(255, 255, 255, 0.6)';
                    });
                    btn.classList.add('active');
                    btn.style.background = 'rgba(0, 210, 255, 0.2)';
                    btn.style.color = '#00d2ff';
                    window._ojViewMode = btn.dataset.view;
                    renderOmborJami();
                };
            });
        }

        if (window.TomSelect && !tsBrand) {
            tsBrand = new window.TomSelect('#ojBrandSelect', {
                create: false,
                sortField: { field: 'text', direction: 'asc' },
                onChange: (val) => {
                    window._ojActiveBrand[window._ojActiveCategory] = val;
                    populateBrandChips();
                    updateSeriesOptions();
                    renderOmborJami();
                }
            });
        }
        if (window.TomSelect && !tsSeries) {
            tsSeries = new window.TomSelect('#ojSeriesSelect', {
                create: false,
                sortField: { field: 'text', direction: 'asc' },
                onChange: (val) => {
                    window._ojActiveSeries[window._ojActiveCategory] = val;
                    updateSeriesOptions();
                    renderOmborJami();
                }
            });
        }

        tabsEl.querySelectorAll('.category-tab').forEach(chip => {
            chip.onclick = () => {
                window._ojActiveCategory = chip.dataset.ojCat;
                window._ojSearchTerm = '';
                const search = document.getElementById('ojSearchInput');
                if (search) search.value = '';
                
                populateBrandOptions();
                updateSeriesOptions();
                renderOmborJami();
            };
        });
        const searchInput = document.getElementById('ojSearchInput');
        if (searchInput) {
            searchInput.oninput = () => {
                window._ojSearchTerm = searchInput.value.toLowerCase().trim();
                renderOmborJami();
            };
        }

        populateBrandOptions();
        updateSeriesOptions();
        renderOmborJami();
    }

    function renderOmborJami() {
        const cat = window._ojActiveCategory;
        const data = window._ojData && window._ojData[cat];
        const statRow = document.getElementById('ojStatRow');
        const tableWrap = document.getElementById('ojItemsTableWrap');
        const titleEl = document.getElementById('ojCategoryTitle');
        if (!data || !statRow || !tableWrap) return;

        document.querySelectorAll('#ojCategoryTabs .category-tab').forEach(c => {
            c.classList.toggle('active', c.dataset.ojCat === cat);
        });
        if (titleEl) titleEl.textContent = _OJ_CATEGORY_META[cat].title;

        const activeBrand = window._ojActiveBrand[cat] || 'barchasi';
        const activeSeries = window._ojActiveSeries[cat] || 'barchasi';
        const stockStatus = window._ojStockStatus || 'all';

        let items = data.items || [];
        if (activeBrand !== 'barchasi') {
            if (cat === 'profil') {
                items = items.filter(it => (it.metadata?.brend || it.brand) === activeBrand);
            } else if (cat === 'aksesuvar') {
                items = items.filter(it => it.category === activeBrand);
            } else if (cat === 'qoldiq') {
                items = items.filter(it => it.brand === activeBrand);
            } else if (cat === 'oynak') {
                items = items.filter(it => it.brand === activeBrand);
            }
        }
        if (activeSeries !== 'barchasi') {
            if (cat === 'profil') {
                items = items.filter(it => (it.metadata?.seriya || it.series) === activeSeries);
            } else if (cat === 'qoldiq') {
                items = items.filter(it => it.series === activeSeries);
            } else if (cat === 'oynak') {
                items = items.filter(it => it.size === activeSeries);
            }
        }
        if (stockStatus === 'low') {
            items = items.filter(it => (Number(it.stock_quantity ?? it.qty) || 0) < 5);
        } else if (stockStatus === 'instock') {
            items = items.filter(it => (Number(it.stock_quantity ?? it.qty) || 0) >= 5);
        }

        const q = window._ojSearchTerm;
        if (q) {
            items = items.filter(it => (it.product_name || it.name || '').toLowerCase().includes(q));
        }

        const totalQty = items.reduce((s, it) => s + (Number(it.stock_quantity ?? it.qty) || 0), 0);
        statRow.innerHTML = `
            <div class="om-stat-card"><div class="lbl">📦 Jami Miqdor</div><div class="val">${totalQty.toLocaleString('uz-UZ')}</div></div>
            <div class="om-stat-card"><div class="lbl">🏷️ Turlar Soni</div><div class="val">${items.length}</div></div>
        `;

        const isAdmin = user && user.role === 'admin';

        if (cat === 'profil') {
            tableWrap.style.background = 'none';
            tableWrap.style.border = 'none';
            tableWrap.style.borderRadius = '0';
            tableWrap.style.overflowX = 'visible';

            // Filter profiles by the active visual part
            if (window._ojActivePart && window._ojActivePart !== 'barchasi') {
                items = items.filter(it => detectProfileElement(it) === window._ojActivePart);
            }

            const activePart = window._ojActivePart || 'barchasi';
            const kActive = activePart === 'Kosa';
            const qActive = activePart === 'Qanot';
            const oActive = activePart === 'O\'rta';
            const sActive = activePart === 'Shtapik';
            const allActive = activePart === 'barchasi';
            const bActive = activePart === 'Boshqalar';

            const blueprintHtml = `
                <div style="display: grid; grid-template-columns: 1.2fr 2fr; gap: 24px; background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.06); border-radius: 24px; padding: 24px; margin-bottom: 24px; align-items: center; box-shadow: 0 8px 32px rgba(0,0,0,0.2); backdrop-filter: blur(10px); width: 100%; box-sizing: border-box;">
                    <!-- Left: Interactive Vector Blueprint -->
                    <div style="background: rgba(0,0,0,0.3); border-radius: 20px; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.04); position: relative; min-height: 220px; box-sizing: border-box;">
                        <span style="font-size: 0.65rem; color: rgba(255,255,255,0.3); font-weight: 800; letter-spacing: 1px; text-transform: uppercase; position: absolute; top: 12px; left: 15px;">2D CAD Chizma</span>
                        
                        <svg viewBox="0 0 240 240" style="width: 170px; height: 170px; filter: drop-shadow(0 0 15px rgba(0,210,255,0.08));">
                            <defs>
                                <pattern id="cad-grid" width="12" height="12" patternUnits="userSpaceOnUse">
                                    <path d="M 12 0 L 0 0 0 12" fill="none" stroke="rgba(255, 255, 255, 0.04)" stroke-width="0.5"/>
                                </pattern>
                                <pattern id="hatch-steel" width="5" height="5" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                                    <line x1="0" y1="0" x2="0" y2="5" stroke="rgba(255,255,255,0.15)" stroke-width="0.8" />
                                </pattern>
                            </defs>
                            
                            <rect width="100%" height="100%" fill="url(#cad-grid)" />

                            <!-- Group 1: Kosa (Frame) -->
                            <g class="cad-group" onclick="window._ojSetProfilePart('Kosa')"
                               onmouseover="window._ojHoverPart('Kosa', true)" onmouseout="window._ojHoverPart('Kosa', false)">
                                <!-- Outer Frame Boundary -->
                                <rect id="cad-kosa-outer" x="15" y="15" width="210" height="210" rx="8" fill="none" 
                                    stroke="${kActive ? '#007aff' : 'rgba(255,255,255,0.15)'}" stroke-width="${kActive ? 4 : 2}" style="transition: all 0.3s; cursor: pointer;" />
                                <!-- Inner Chamber Wall -->
                                <rect id="cad-kosa-inner" x="22" y="22" width="196" height="196" rx="6" fill="none" 
                                    stroke="${kActive ? '#007aff' : 'rgba(255,255,255,0.08)'}" stroke-width="1" stroke-dasharray="${kActive ? 'none' : '3,3'}" style="transition: all 0.3s; cursor: pointer;" />
                                <!-- Steel Reinforcement Hatching Box -->
                                <rect id="cad-kosa-steel" x="25" y="25" width="15" height="15" fill="url(#hatch-steel)" 
                                    stroke="${kActive ? '#007aff' : 'rgba(255,255,255,0.1)'}" stroke-width="0.8" style="transition: all 0.3s; cursor: pointer;" />
                                <rect x="200" y="25" width="15" height="15" fill="url(#hatch-steel)" 
                                    stroke="${kActive ? '#007aff' : 'rgba(255,255,255,0.1)'}" stroke-width="0.8" style="transition: all 0.3s; cursor: pointer;" />
                                <rect x="25" y="200" width="15" height="15" fill="url(#hatch-steel)" 
                                    stroke="${kActive ? '#007aff' : 'rgba(255,255,255,0.1)'}" stroke-width="0.8" style="transition: all 0.3s; cursor: pointer;" />
                                <rect x="200" y="200" width="15" height="15" fill="url(#hatch-steel)" 
                                    stroke="${kActive ? '#007aff' : 'rgba(255,255,255,0.1)'}" stroke-width="0.8" style="transition: all 0.3s; cursor: pointer;" />
                            </g>

                            <!-- Group 2: O'rta (Impost) -->
                            <g class="cad-group" onclick="window._ojSetProfilePart('O\'rta')"
                               onmouseover="window._ojHoverPart('O\'rta', true)" onmouseout="window._ojHoverPart('O\'rta', false)">
                                <!-- Impost Column Boundary -->
                                <rect id="cad-orta-outer" x="113" y="15" width="14" height="210" fill="none" 
                                    stroke="${oActive ? '#af52de' : 'rgba(255,255,255,0.15)'}" stroke-width="${oActive ? 3 : 1.5}" style="transition: all 0.3s; cursor: pointer;" />
                                <!-- Impost Inner Chamber Wall -->
                                <line id="cad-orta-inner" x1="120" y1="20" x2="120" y2="220" 
                                    stroke="${oActive ? '#af52de' : 'rgba(255,255,255,0.08)'}" stroke-width="1" stroke-dasharray="${oActive ? 'none' : '4,4'}" style="transition: all 0.3s; cursor: pointer;" />
                                <!-- Impost Steel Reinforcement Box -->
                                <rect id="cad-orta-steel" x="116" y="100" width="8" height="40" fill="url(#hatch-steel)" 
                                    stroke="${oActive ? '#af52de' : 'rgba(255,255,255,0.1)'}" stroke-width="0.8" style="transition: all 0.3s; cursor: pointer;" />
                            </g>

                            <!-- Group 3: Qanot (Sash) -->
                            <g class="cad-group" onclick="window._ojSetProfilePart('Qanot')"
                               onmouseover="window._ojHoverPart('Qanot', true)" onmouseout="window._ojHoverPart('Qanot', false)">
                                <!-- Left Sash Leaf Outer Boundary -->
                                <rect id="cad-qanot-outer" x="30" y="30" width="80" height="180" rx="6" fill="none" 
                                    stroke="${qActive ? '#ff9500' : 'rgba(255,255,255,0.15)'}" stroke-width="${qActive ? 3 : 1.5}" style="transition: all 0.3s; cursor: pointer;" />
                                <!-- Left Sash Inner Chambers -->
                                <rect id="cad-qanot-inner" x="36" y="36" width="68" height="168" rx="4" fill="none" 
                                    stroke="${qActive ? '#ff9500' : 'rgba(255,255,255,0.08)'}" stroke-width="1" stroke-dasharray="${qActive ? 'none' : '3,3'}" style="transition: all 0.3s; cursor: pointer;" />
                                <!-- Left Sash Steel Reinforcement -->
                                <rect id="cad-qanot-steel" x="42" y="90" width="22" height="60" fill="url(#hatch-steel)" 
                                    stroke="${qActive ? '#ff9500' : 'rgba(255,255,255,0.1)'}" stroke-width="0.8" style="transition: all 0.3s; cursor: pointer;" />
                            </g>

                            <!-- Group 4: Shtapik (Glass Bead) -->
                            <g class="cad-group" onclick="window._ojSetProfilePart('Shtapik')"
                               onmouseover="window._ojHoverPart('Shtapik', true)" onmouseout="window._ojHoverPart('Shtapik', false)">
                                <!-- Left Glass Bead profile -->
                                <path id="cad-shtapik-l" d="M 85,40 L 98,40 L 98,200 L 85,200 Z" fill="none" 
                                    stroke="${sActive ? '#ffcc00' : 'rgba(255,255,255,0.08)'}" stroke-width="${sActive ? 2 : 1}" style="transition: all 0.3s; cursor: pointer;" />
                                <!-- Right Glass Bead profile -->
                                <path id="cad-shtapik-r" d="M 132,30 L 145,30 L 145,210 L 132,210 Z" fill="none" 
                                    stroke="${sActive ? '#ffcc00' : 'rgba(255,255,255,0.08)'}" stroke-width="${sActive ? 2 : 1}" style="transition: all 0.3s; cursor: pointer;" />
                                <!-- Gasket Seals details -->
                                <line x1="84" y1="40" x2="84" y2="200" stroke="#000" stroke-width="1.5" />
                                <line x1="131" y1="30" x2="131" y2="210" stroke="#000" stroke-width="1.5" />
                            </g>

                            <!-- Glass Pane details (Static, decorative, gives CAD sense) -->
                            <!-- Left Glass Panes (Double Unit) -->
                            <rect x="52" y="50" width="4" height="140" fill="rgba(0,210,255,0.1)" stroke="rgba(0,210,255,0.3)" stroke-width="0.5" />
                            <rect x="62" y="50" width="4" height="140" fill="rgba(0,210,255,0.1)" stroke="rgba(0,210,255,0.3)" stroke-width="0.5" />
                            <!-- Right Glass Panes (Double Unit) -->
                            <rect x="156" y="40" width="4" height="160" fill="rgba(0,210,255,0.1)" stroke="rgba(0,210,255,0.3)" stroke-width="0.5" />
                            <rect x="166" y="40" width="4" height="160" fill="rgba(0,210,255,0.1)" stroke="rgba(0,210,255,0.3)" stroke-width="0.5" />
                        </svg>
                        
                        <div style="font-size: 0.7rem; color: rgba(255,255,255,0.4); margin-top: 10px; font-weight: 500; text-align: center;">Chizmadan elementni bosing ☝️</div>
                    </div>

                    <!-- Right: Bento Filter Grid -->
                    <div style="display: flex; flex-direction: column; gap: 10px; justify-content: center; box-sizing: border-box;">
                        <h4 style="margin: 0 0 5px 0; color: #fff; font-weight: 800; font-size: 1.05rem;">Profil Qismlari bo'yicha saralash</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; box-sizing: border-box;">
                            <!-- All Parts Card -->
                            <div onclick="window._ojSetProfilePart('barchasi')" style="background: ${allActive ? 'rgba(52, 199, 89, 0.08)' : 'rgba(255,255,255,0.01)'}; border: 1px solid ${allActive ? '#34c759' : 'rgba(255,255,255,0.05)'}; border-radius: 16px; padding: 12px; cursor: pointer; transition: all 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.04)'" onmouseleave="this.style.background='${allActive ? 'rgba(52, 199, 89, 0.08)' : 'rgba(255,255,255,0.01)'}'">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                                    <span style="font-size: 1.15rem; color: #34c759;">📋</span>
                                    <span style="font-weight: 700; color: #fff; font-size: 0.85rem;">Barchasi</span>
                                </div>
                                <span style="font-size: 0.68rem; color: rgba(255,255,255,0.45);">Barcha profillar to'plami</span>
                            </div>

                            <!-- Frame Card -->
                            <div onclick="window._ojSetProfilePart('Kosa')" style="background: ${kActive ? 'rgba(0, 122, 255, 0.08)' : 'rgba(255,255,255,0.01)'}; border: 1px solid ${kActive ? '#007aff' : 'rgba(255,255,255,0.05)'}; border-radius: 16px; padding: 12px; cursor: pointer; transition: all 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.04)'" onmouseleave="this.style.background='${kActive ? 'rgba(0, 122, 255, 0.08)' : 'rgba(255,255,255,0.01)'}'">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                                    <span style="font-size: 1.15rem; color: #007aff;">🔲</span>
                                    <span style="font-weight: 700; color: #fff; font-size: 0.85rem;">Kosa / Ramka</span>
                                </div>
                                <span style="font-size: 0.68rem; color: rgba(255,255,255,0.45);">Ramani qamrab turuvchi qism</span>
                            </div>

                            <!-- Sash Card -->
                            <div onclick="window._ojSetProfilePart('Qanot')" style="background: ${qActive ? 'rgba(255, 149, 0, 0.08)' : 'rgba(255,255,255,0.01)'}; border: 1px solid ${qActive ? '#ff9500' : 'rgba(255,255,255,0.05)'}; border-radius: 16px; padding: 12px; cursor: pointer; transition: all 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.04)'" onmouseleave="this.style.background='${qActive ? 'rgba(255, 149, 0, 0.08)' : 'rgba(255,255,255,0.01)'}'">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                                    <span style="font-size: 1.15rem; color: #ff9500;">🚪</span>
                                    <span style="font-weight: 700; color: #fff; font-size: 0.85rem;">Qanot / Stvorka</span>
                                </div>
                                <span style="font-size: 0.68rem; color: rgba(255,255,255,0.45);">Ochilib-yopiluvchi bargi</span>
                            </div>

                            <!-- Mullion Card -->
                            <div onclick="window._ojSetProfilePart('O\'rta')" style="background: ${oActive ? 'rgba(175, 82, 222, 0.08)' : 'rgba(255,255,255,0.01)'}; border: 1px solid ${oActive ? '#af52de' : 'rgba(255,255,255,0.05)'}; border-radius: 16px; padding: 12px; cursor: pointer; transition: all 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.04)'" onmouseleave="this.style.background='${oActive ? 'rgba(175, 82, 222, 0.08)' : 'rgba(255,255,255,0.01)'}'">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                                    <span style="font-size: 1.15rem; color: #af52de;">➖</span>
                                    <span style="font-weight: 700; color: #fff; font-size: 0.85rem;">O'rta / Impost</span>
                                </div>
                                <span style="font-size: 0.68rem; color: rgba(255,255,255,0.45);">Divider / Bo'luvchi profil</span>
                            </div>

                            <!-- Shtapik Card -->
                            <div onclick="window._ojSetProfilePart('Shtapik')" style="background: ${sActive ? 'rgba(255, 204, 0, 0.08)' : 'rgba(255,255,255,0.01)'}; border: 1px solid ${sActive ? '#ffcc00' : 'rgba(255,255,255,0.05)'}; border-radius: 16px; padding: 12px; cursor: pointer; transition: all 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.04)'" onmouseleave="this.style.background='${sActive ? 'rgba(255, 204, 0, 0.08)' : 'rgba(255,255,255,0.01)'}'">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                                    <span style="font-size: 1.15rem; color: #ffcc00;">🥢</span>
                                    <span style="font-weight: 700; color: #fff; font-size: 0.85rem;">Shtapik / Bead</span>
                                </div>
                                <span style="font-size: 0.68rem; color: rgba(255,255,255,0.45);">Oynani mahkamlovchi chiziq</span>
                            </div>

                            <!-- Others Card -->
                            <div onclick="window._ojSetProfilePart('Boshqalar')" style="background: ${bActive ? 'rgba(142, 142, 147, 0.08)' : 'rgba(255,255,255,0.01)'}; border: 1px solid ${bActive ? '#8e8e93' : 'rgba(255,255,255,0.05)'}; border-radius: 16px; padding: 12px; cursor: pointer; transition: all 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.04)'" onmouseleave="this.style.background='${bActive ? 'rgba(142, 142, 147, 0.08)' : 'rgba(255,255,255,0.01)'}'">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                                    <span style="font-size: 1.15rem; color: #8e8e93;">⚙️</span>
                                    <span style="font-weight: 700; color: #fff; font-size: 0.85rem;">Boshqalar</span>
                                </div>
                                <span style="font-size: 0.68rem; color: rgba(255,255,255,0.45);">Dekor, ulagich va boshqalar</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            let cardsHtml = '';
            if (items.length === 0) {
                cardsHtml = `<div style="grid-column: 1 / -1; text-align: center; padding: 50px; color: rgba(255,255,255,0.3); font-weight: 700; background: rgba(255,255,255,0.01); border: 1px dashed rgba(255,255,255,0.08); border-radius: 20px;">Ushbu bo'limda mahsulotlar topilmadi.</div>`;
            } else {
                items.forEach(p => {
                    const meta = p.metadata || {};
                    const qty = Number(p.stock_quantity) || 0;
                    const pPart = detectProfileElement(p);

                    let partColor = '#8e8e93';
                    let partLabel = 'Boshqa';
                    if (pPart === 'Kosa') { partColor = '#007aff'; partLabel = 'Kosa'; }
                    else if (pPart === 'Qanot') { partColor = '#ff9500'; partLabel = 'Qanot'; }
                    else if (pPart === 'O\'rta') { partColor = '#af52de'; partLabel = 'O\'rta'; }
                    else if (pPart === 'Shtapik') { partColor = '#ffcc00'; partLabel = 'Shtapik'; }

                    const qtyColor = qty < 10 ? '#ff4d4f' : '#00ff88';

                    let displayName = p.product_name || "Noma'lum";
                    const b = meta.brend || '';
                    const s = meta.seriya || '';
                    if (b) displayName = safeReplaceString(displayName, b);
                    if (s) displayName = safeReplaceString(displayName, s);
                    displayName = displayName.replace(/·/g, '').replace(/\s+/g, ' ').trim();
                    if (!displayName) displayName = p.product_name;

                    cardsHtml += `
                        <div class="oj-profile-card" data-prod-id="${p.id}" data-cat="profil" style="background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.06); border-radius: 18px; padding: 16px; display: flex; flex-direction: column; gap: 12px; transition: all 0.3s; position: relative; overflow: hidden; box-sizing: border-box; cursor: pointer;" onclick="window.openProductDetailModal('${p.id}', 'profil')" onmouseenter="this.style.transform='translateY(-4px)'; this.style.borderColor='${partColor}'; this.style.boxShadow='0 8px 24px ${partColor}11';" onmouseleave="this.style.transform='translateY(0)'; this.style.borderColor='rgba(255,255,255,0.06)'; this.style.boxShadow='none';">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 0.68rem; font-weight: 800; text-transform: uppercase; padding: 3px 8px; border-radius: 6px; background: ${partColor}18; color: ${partColor}; border: 1px solid ${partColor}33;">
                                    ${partLabel}
                                </span>
                                <span style="font-size: 0.68rem; color: rgba(255,255,255,0.3); font-family: monospace;">#${p.id.slice(0, 8).toUpperCase()}</span>
                            </div>

                            <div>
                                <h4 style="margin: 0 0 4px 0; font-size: 0.95rem; font-weight: 800; color: #fff; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.product_name}">${displayName}</h4>
                                <span style="font-size: 0.76rem; color: rgba(255,255,255,0.4); font-weight: 600; display: block;">${meta.brend || '-'} • ${meta.seriya || '-'}</span>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-top: 1px dashed rgba(255,255,255,0.06); padding-top: 10px;">
                                <div>
                                    <span style="font-size: 0.62rem; color: rgba(255,255,255,0.35); text-transform: uppercase; display: block; margin-bottom: 2px;">Uzunligi</span>
                                    <span style="font-size: 0.78rem; color: #fff; font-weight: 700;">📏 ${meta.uzunligi || '-'} mm</span>
                                </div>
                                <div>
                                    <span style="font-size: 0.62rem; color: rgba(255,255,255,0.35); text-transform: uppercase; display: block; margin-bottom: 2px;">Shakli</span>
                                    <span style="font-size: 0.78rem; color: #fff; font-weight: 700;">💠 ${meta.shakli || '-'}</span>
                                </div>
                                <div>
                                    <span style="font-size: 0.62rem; color: rgba(255,255,255,0.35); text-transform: uppercase; display: block; margin-bottom: 2px;">Rangi</span>
                                    <span style="font-size: 0.78rem; color: #fff; font-weight: 700;">🎨 ${meta.rangi || '-'}</span>
                                </div>
                                <div>
                                    <span style="font-size: 0.62rem; color: rgba(255,255,255,0.35); text-transform: uppercase; display: block; margin-bottom: 2px;">Rang turi</span>
                                    <span style="font-size: 0.74rem; color: ${partColor}; font-weight: 700;">✨ ${meta.rangTuri || '-'}</span>
                                </div>
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed rgba(255,255,255,0.06); padding-top: 12px; margin-top: 4px;">
                                <div>
                                    <span style="font-size: 0.62rem; color: rgba(255,255,255,0.45); display: block; text-transform: uppercase; margin-bottom: 2px;">Zaxira qoldig'i</span>
                                    <span style="font-size: 1.05rem; font-weight: 900; color: ${qtyColor};">${qty.toLocaleString('uz-UZ')} ${p.unit || ''}</span>
                                </div>
                                
                                ${isAdmin ? `
                                <div style="display: flex; gap: 6px;">
                                    <button class="oj-edit-btn" data-id="${p.id}" onclick="event.stopPropagation()" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.85rem; transition: 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.1)'" onmouseleave="this.style.background='rgba(255,255,255,0.03)'" title="Tahrirlash">✏️</button>
                                    <button class="oj-delete-btn" data-id="${p.id}" onclick="event.stopPropagation()" style="background: rgba(255,77,79,0.05); border: 1px solid rgba(255,77,79,0.15); border-radius: 10px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.85rem; color: #ff4d4f; transition: 0.2s;" onmouseenter="this.style.background='rgba(255,77,79,0.15)'" onmouseleave="this.style.background='rgba(255,77,79,0.05)'" title="O'chirish">🗑️</button>
                                </div>` : ''}
                            </div>
                        </div>
                    `;
                });
            }

            const isTableView = window._ojViewMode === 'table';
            if (isTableView) {
                const tableRows = items.length ? items.map(p => {
                    const meta = p.metadata || {};
                    const qty = Number(p.stock_quantity) || 0;
                    const qtyColor = qty < 10 ? '#ff4d4f' : '#00ff88';
                    return `<tr data-prod-id="${p.id}" data-cat="profil" style="cursor:pointer;" onclick="window.openProductDetailModal('${p.id}', 'profil')">
                        <td><strong>${p.product_name || "Noma'lum"}</strong></td>
                        <td><span style="font-size:0.7rem; font-weight:800; text-transform:uppercase; padding:3px 8px; border-radius:6px; background:rgba(0,210,255,0.1); color:#00d2ff; border:1px solid rgba(0,210,255,0.2);">${meta.brend || '-'}</span></td>
                        <td>${meta.seriya || '-'}</td>
                        <td>${meta.uzunligi ? meta.uzunligi + ' mm' : '-'}</td>
                        <td style="text-align:right; font-weight:900; color:${qtyColor}">${qty.toLocaleString('uz-UZ')} ${p.unit || ''}</td>
                        ${isAdmin ? `
                        <td>
                            <div style="display:flex; gap:6px; justify-content:center;">
                                <button class="oj-edit-btn" data-id="${p.id}" onclick="event.stopPropagation()" style="background:none; border:none; cursor:pointer;" title="Tahrirlash">✏️</button>
                                <button class="oj-delete-btn" data-id="${p.id}" onclick="event.stopPropagation()" style="background:none; border:none; cursor:pointer; color:#ff4d4f;" title="O'chirish">🗑️</button>
                            </div>
                        </td>` : ''}
                    </tr>`;
                }).join('') : `<tr><td colspan="${isAdmin ? 6 : 5}" style="text-align:center; padding:20px; color:rgba(255,255,255,0.4);">Mahsulot topilmadi</td></tr>`;

                tableWrap.style.background = 'rgba(0,0,0,0.2)';
                tableWrap.style.border = '1px solid rgba(255,255,255,0.08)';
                tableWrap.style.borderRadius = '16px';
                tableWrap.style.overflowX = 'auto';

                tableWrap.innerHTML = `
                    ${blueprintHtml}
                    <table class="v2-table" style="margin: 0; width: 100%;">
                        <thead>
                            <tr>
                                <th>Mahsulot</th><th>Brend</th><th>Seriya</th><th>Uzunligi</th><th style="text-align:right;">Zaxira Qoldiq</th>
                                ${isAdmin ? '<th style="text-align:center;">Harakat</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                `;
            } else {
                tableWrap.style.background = 'none';
                tableWrap.style.border = 'none';
                tableWrap.style.borderRadius = '0';
                tableWrap.style.overflowX = 'visible';

                tableWrap.innerHTML = `
                    ${blueprintHtml}
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; width: 100%;">
                        ${cardsHtml}
                    </div>
                `;
            }
        } else if (cat === 'aksesuvar') {
            const isTableView = window._ojViewMode === 'table';
            if (isTableView) {
                const rows = items.length ? items.map(a => {
                    const qty = Number(a.qty) || 0;
                    return `<tr data-prod-id="${a.id}" data-cat="aksesuvar" style="cursor:pointer;" onclick="window.openProductDetailModal('${a.id}', 'aksesuvar')">
                        <td><strong>${a.name || "Noma'lum"}</strong></td>
                        <td><span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; padding:3px 8px; border-radius:6px; background:rgba(0,210,255,0.1); color:#00d2ff; border:1px solid rgba(0,210,255,0.2);">${a.category || '-'}</span></td>
                        <td style="text-align:right; font-weight:900; color:#00ff88;">${qty.toLocaleString('uz-UZ')} ${a.unit || 'dona'}</td>
                        ${isAdmin ? `
                        <td>
                            <div style="display:flex; gap:6px; justify-content:center;">
                                <button class="oj-edit-btn" data-id="${a.id}" onclick="event.stopPropagation()" style="background:none; border:none; cursor:pointer;" title="Tahrirlash">✏️</button>
                                <button class="oj-delete-btn" data-id="${a.id}" onclick="event.stopPropagation()" style="background:none; border:none; cursor:pointer; color:#ff4d4f;" title="O'chirish">🗑️</button>
                            </div>
                        </td>` : ''}
                    </tr>`;
                }).join('') : `<tr><td colspan="${isAdmin ? 4 : 3}" style="text-align:center; padding:20px; color:var(--adm-text-sec);">Mahsulot topilmadi</td></tr>`;

                tableWrap.style.background = 'rgba(0,0,0,0.2)';
                tableWrap.style.border = '1px solid rgba(255,255,255,0.08)';
                tableWrap.style.borderRadius = '16px';
                tableWrap.style.overflowX = 'auto';

                tableWrap.innerHTML = `<table class="v2-table" style="margin:0; width:100%;"><thead><tr>
                    <th>Mahsulot Nomi</th><th>Kategoriya</th><th style="text-align:right;">Miqdor / Zaxira</th>
                    ${isAdmin ? '<th style="text-align:center;">Harakat</th>' : ''}
                </tr></thead><tbody>${rows}</tbody></table>`;
            } else {
                const cardsHtml = items.length ? items.map(a => {
                    const qty = Number(a.qty) || 0;
                    return `
                        <div class="oj-profile-card" data-prod-id="${a.id}" data-cat="aksesuvar" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 20px; cursor: pointer; transition: all 0.25s ease; position: relative;" onmouseenter="this.style.borderColor='#00d2ff'; this.style.transform='translateY(-3px)';" onmouseleave="this.style.borderColor='rgba(255,255,255,0.08)'; this.style.transform='translateY(0)';">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                                <span style="font-size:2rem; background:rgba(0,210,255,0.1); padding:8px 12px; border-radius:14px; border:1px solid rgba(0,210,255,0.2);">🔩</span>
                                <span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; padding:4px 10px; border-radius:8px; background:rgba(0,210,255,0.1); color:#00d2ff; border:1px solid rgba(0,210,255,0.2);">${a.category || 'Aksessuar'}</span>
                            </div>
                            <h4 style="font-size:1.1rem; font-weight:800; color:#fff; margin:0 0 12px 0;">${a.name || "Noma'lum Aksessuar"}</h4>
                            <div style="display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid rgba(255,255,255,0.06); padding-top:12px; margin-top:12px;">
                                <div>
                                    <span style="font-size:0.7rem; color:rgba(255,255,255,0.5); text-transform:uppercase; font-weight:700; display:block;">📊 Miqdor</span>
                                    <span style="font-size:1.15rem; font-weight:900; color:#00ff88;">${qty.toLocaleString('uz-UZ')} ${a.unit || 'dona'}</span>
                                </div>
                                ${isAdmin ? `
                                <div style="display:flex; gap:6px;">
                                    <button class="oj-edit-btn" data-id="${a.id}" onclick="event.stopPropagation()" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; width:34px; height:34px; cursor:pointer;" title="Tahrirlash">✏️</button>
                                    <button class="oj-delete-btn" data-id="${a.id}" onclick="event.stopPropagation()" style="background:rgba(255,77,79,0.05); border:1px solid rgba(255,77,79,0.15); border-radius:10px; width:34px; height:34px; cursor:pointer; color:#ff4d4f;" title="O'chirish">🗑️</button>
                                </div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('') : `<div style="grid-column:1/-1; text-align:center; padding:40px; color:rgba(255,255,255,0.4);">Aksessuar topilmadi</div>`;

                tableWrap.style.background = 'none';
                tableWrap.style.border = 'none';
                tableWrap.innerHTML = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:20px; width:100%;">${cardsHtml}</div>`;
            }

        } else if (cat === 'qoldiq') {
            const isTableView = window._ojViewMode === 'table';
            if (isTableView) {
                const rows = items.length ? items.map(qi => {
                    const qty = Number(qi.stock_quantity) || 0;
                    const len = Number(qi.length) || 0;
                    return `<tr data-prod-id="${qi.id}" data-cat="qoldiq" style="cursor:pointer;" onclick="window.openProductDetailModal('${qi.id}', 'qoldiq')">
                        <td><strong>${qi.product_name || "Noma'lum"}</strong></td>
                        <td><span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; padding:3px 8px; border-radius:6px; background:rgba(255,149,0,0.1); color:#ff9500; border:1px solid rgba(255,149,0,0.2);">${qi.brand || '-'}</span></td>
                        <td>${qi.series || '-'}</td>
                        <td style="text-align:right; font-weight:700; color:#00d2ff;">${len.toLocaleString('uz-UZ')} mm</td>
                        <td style="text-align:right; font-weight:900; color:#00ff88;">${qty.toLocaleString('uz-UZ')} dona</td>
                        ${isAdmin ? `
                        <td>
                            <div style="display:flex; gap:6px; justify-content:center;">
                                <button class="oj-delete-qoldiq-btn" data-id="${qi.id}" onclick="event.stopPropagation()" style="background:none; border:none; cursor:pointer; color:#ff4d4f;" title="O'chirish">🗑️</button>
                            </div>
                        </td>` : ''}
                    </tr>`;
                }).join('') : `<tr><td colspan="${isAdmin ? 6 : 5}" style="text-align:center; padding:20px; color:var(--adm-text-sec);">Qoldiq profil topilmadi</td></tr>`;

                tableWrap.style.background = 'rgba(0,0,0,0.2)';
                tableWrap.style.border = '1px solid rgba(255,255,255,0.08)';
                tableWrap.style.borderRadius = '16px';
                tableWrap.style.overflowX = 'auto';

                tableWrap.innerHTML = `<table class="v2-table" style="margin:0; width:100%;"><thead><tr>
                    <th>Mahsulot Nomi</th><th>Brend</th><th>Seriya</th><th style="text-align:right;">Uzunligi (mm)</th><th style="text-align:right;">Miqdor</th>
                    ${isAdmin ? '<th style="text-align:center;">Harakat</th>' : ''}
                </tr></thead><tbody>${rows}</tbody></table>`;
            } else {
                const cardsHtml = items.length ? items.map(qi => {
                    const qty = Number(qi.stock_quantity) || 0;
                    const len = Number(qi.length) || 0;
                    return `
                        <div class="oj-profile-card" data-prod-id="${qi.id}" data-cat="qoldiq" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 20px; cursor: pointer; transition: all 0.25s ease;" onmouseenter="this.style.borderColor='#ff9500'; this.style.transform='translateY(-3px)';" onmouseleave="this.style.borderColor='rgba(255,255,255,0.08)'; this.style.transform='translateY(0)';">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                                <span style="font-size:2rem; background:rgba(255,149,0,0.1); padding:8px 12px; border-radius:14px; border:1px solid rgba(255,149,0,0.2);">✂️</span>
                                <span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; padding:4px 10px; border-radius:8px; background:rgba(255,149,0,0.1); color:#ff9500; border:1px solid rgba(255,149,0,0.2);">${qi.brand || 'Qoldiq'}</span>
                            </div>
                            <h4 style="font-size:1.1rem; font-weight:800; color:#fff; margin:0 0 8px 0;">${qi.product_name || "Noma'lum Qoldiq"}</h4>
                            <div style="font-size:0.83rem; color:rgba(255,255,255,0.6); margin-bottom:12px;">📏 Uzunligi: <strong style="color:#00d2ff;">${len.toLocaleString('uz-UZ')} mm</strong> (${qi.series || ''})</div>
                            <div style="display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid rgba(255,255,255,0.06); padding-top:12px;">
                                <div>
                                    <span style="font-size:0.7rem; color:rgba(255,255,255,0.5); text-transform:uppercase; font-weight:700; display:block;">📦 Qoldiq Soni</span>
                                    <span style="font-size:1.15rem; font-weight:900; color:#00ff88;">${qty.toLocaleString('uz-UZ')} dona</span>
                                </div>
                                ${isAdmin ? `
                                <button class="oj-delete-qoldiq-btn" data-id="${qi.id}" onclick="event.stopPropagation()" style="background:rgba(255,77,79,0.05); border:1px solid rgba(255,77,79,0.15); border-radius:10px; width:34px; height:34px; cursor:pointer; color:#ff4d4f;" title="O'chirish">🗑️</button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('') : `<div style="grid-column:1/-1; text-align:center; padding:40px; color:rgba(255,255,255,0.4);">Qoldiq profil topilmadi</div>`;

                tableWrap.style.background = 'none';
                tableWrap.style.border = 'none';
                tableWrap.innerHTML = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:20px; width:100%;">${cardsHtml}</div>`;
            }

        } else if (cat === 'oynak') {
            const isTableView = window._ojViewMode === 'table';
            if (isTableView) {
                const rows = items.length ? items.map(o => {
                    const qty = Number(o.stock_quantity) || 0;
                    return `<tr data-prod-id="${o.id}" data-cat="oynak" style="cursor:pointer;" onclick="window.openProductDetailModal('${o.id}', 'oynak')">
                        <td><strong>${o.product_name || "Noma'lum"}</strong></td>
                        <td><span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; padding:3px 8px; border-radius:6px; background:rgba(175,82,222,0.1); color:#af52de; border:1px solid rgba(175,82,222,0.2);">${o.brand || '-'}</span></td>
                        <td>${o.size || '-'}</td>
                        <td style="text-align:right; font-weight:900; color:#00ff88;">${qty.toLocaleString('uz-UZ')} ${o.unit || 'dona'}</td>
                        ${isAdmin ? `
                        <td>
                            <div style="display:flex; gap:6px; justify-content:center;">
                                <button class="oj-delete-oynak-btn" data-id="${o.id}" onclick="event.stopPropagation()" style="background:none; border:none; cursor:pointer; color:#ff4d4f;" title="O'chirish">🗑️</button>
                            </div>
                        </td>` : ''}
                    </tr>`;
                }).join('') : `<tr><td colspan="${isAdmin ? 5 : 4}" style="text-align:center; padding:20px; color:var(--adm-text-sec);">Oynak topilmadi</td></tr>`;

                tableWrap.style.background = 'rgba(0,0,0,0.2)';
                tableWrap.style.border = '1px solid rgba(255,255,255,0.08)';
                tableWrap.style.borderRadius = '16px';
                tableWrap.style.overflowX = 'auto';

                tableWrap.innerHTML = `<table class="v2-table" style="margin:0; width:100%;"><thead><tr>
                    <th>Mahsulot Nomi</th><th>Brend</th><th>O'lcham</th><th style="text-align:right;">Miqdor</th>
                    ${isAdmin ? '<th style="text-align:center;">Harakat</th>' : ''}
                </tr></thead><tbody>${rows}</tbody></table>`;
            } else {
                const cardsHtml = items.length ? items.map(o => {
                    const qty = Number(o.stock_quantity) || 0;
                    return `
                        <div class="oj-profile-card" data-prod-id="${o.id}" data-cat="oynak" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 20px; cursor: pointer; transition: all 0.25s ease;" onmouseenter="this.style.borderColor='#af52de'; this.style.transform='translateY(-3px)';" onmouseleave="this.style.borderColor='rgba(255,255,255,0.08)'; this.style.transform='translateY(0)';">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                                <span style="font-size:2rem; background:rgba(175,82,222,0.1); padding:8px 12px; border-radius:14px; border:1px solid rgba(175,82,222,0.2);">🪟</span>
                                <span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; padding:4px 10px; border-radius:8px; background:rgba(175,82,222,0.1); color:#af52de; border:1px solid rgba(175,82,222,0.2);">${o.brand || 'Oynak'}</span>
                            </div>
                            <h4 style="font-size:1.1rem; font-weight:800; color:#fff; margin:0 0 8px 0;">${o.product_name || "Noma'lum Oynak"}</h4>
                            <div style="font-size:0.83rem; color:rgba(255,255,255,0.6); margin-bottom:12px;">📏 O'lchami: <strong style="color:#00d2ff;">${o.size || '-'}</strong></div>
                            <div style="display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid rgba(255,255,255,0.06); padding-top:12px;">
                                <div>
                                    <span style="font-size:0.7rem; color:rgba(255,255,255,0.5); text-transform:uppercase; font-weight:700; display:block;">📦 Zaxira Miqdori</span>
                                    <span style="font-size:1.15rem; font-weight:900; color:#00ff88;">${qty.toLocaleString('uz-UZ')} ${o.unit || 'dona'}</span>
                                </div>
                                ${isAdmin ? `
                                <button class="oj-delete-oynak-btn" data-id="${o.id}" onclick="event.stopPropagation()" style="background:rgba(255,77,79,0.05); border:1px solid rgba(255,77,79,0.15); border-radius:10px; width:34px; height:34px; cursor:pointer; color:#ff4d4f;" title="O'chirish">🗑️</button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('') : `<div style="grid-column:1/-1; text-align:center; padding:40px; color:rgba(255,255,255,0.4);">Oynak topilmadi</div>`;

                tableWrap.style.background = 'none';
                tableWrap.style.border = 'none';
                tableWrap.innerHTML = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:20px; width:100%;">${cardsHtml}</div>`;
            }
        }

        if (isAdmin) {
            // Edit button binding -> open Product Detail Modal
            document.querySelectorAll('.oj-edit-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const prodId = btn.dataset.id;
                    if (prodId && typeof window.openProductDetailModal === 'function') {
                        window.openProductDetailModal(prodId, window._ojActiveCategory || 'profil');
                    }
                };
            });

            // Delete inventory binding
            document.querySelectorAll('.oj-delete-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    if (confirm("Ushbu mahsulotni o'chirmoqchimisiz?")) {
                        await supabase.from('romix_inventory').delete().eq('id', btn.dataset.id);
                        loadOmborJami();
                    }
                };
            });

            // Delete qoldiq binding
            document.querySelectorAll('.oj-delete-qoldiq-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    if (confirm("Ushbu qoldiq profilni o'chirmoqchimisiz?")) {
                        await supabase.from('romix_qoldiq_profillar').delete().eq('id', btn.dataset.id);
                        loadOmborJami();
                    }
                };
            });

            // Delete oynak binding
            document.querySelectorAll('.oj-delete-oynak-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    if (confirm("Ushbu oynakni o'chirmoqchimisiz?")) {
                        await supabase.from('romix_oynak').delete().eq('id', btn.dataset.id);
                        loadOmborJami();
                    }
                };
            });
        }
    }





    // "Ombor Jami" — professional Excel/PDF hisobot eksporti. Faqat miqdor (narxsiz).
    // window._ojData allaqachon barcha 4 toifani o'z ichiga oladi (loadOmborJami() orqali).
    function _ojRound(n) { return Math.round((Number(n) || 0) * 100) / 100; }

    function _ojBuildCategoryRows(cat) {
        const data = window._ojData && window._ojData[cat];
        if (!data) return { headers: [], rows: [] };
        if (cat === 'profil') {
            return {
                headers: ['Mahsulot', 'Brend', 'Seriya', "Uzunligi (mm)", 'Shakli', 'Rangi', 'Miqdor', 'Birlik'],
                rows: data.items.map(p => {
                    const meta = p.metadata || {};
                    return [p.product_name || "Noma'lum", meta.brend || '-', meta.seriya || '-', meta.uzunligi || '-', meta.shakli || '-', meta.rangi || '-', _ojRound(p.stock_quantity), p.unit || ''];
                })
            };
        } else if (cat === 'aksesuvar') {
            return {
                headers: ['Mahsulot', 'Kategoriya', 'Miqdor', 'Birlik'],
                rows: data.items.map(a => [a.name || "Noma'lum", a.category || '-', _ojRound(a.qty), a.unit || ''])
            };
        } else if (cat === 'qoldiq') {
            return {
                headers: ['Mahsulot', 'Brend', "Uzunligi (mm)", 'Miqdor'],
                rows: data.items.map(q => [q.product_name || "Noma'lum", q.brand || '-', _ojRound(q.length), _ojRound(q.stock_quantity)])
            };
        } else if (cat === 'oynak') {
            return {
                headers: ['Mahsulot', 'Brend', "O'lcham", 'Miqdor', 'Birlik'],
                rows: data.items.map(o => [o.product_name || "Noma'lum", o.brand || '-', o.size || '-', _ojRound(o.stock_quantity), o.unit || 'dona'])
            };
        }
        return { headers: [], rows: [] };
    }

    const _OJ_EXPORT_CATS = [
        { key: 'profil', label: 'Profil' },
        { key: 'aksesuvar', label: 'Aksesuvar' },
        { key: 'qoldiq', label: 'Qoldiq Profillar' },
        { key: 'oynak', label: 'Oynak' }
    ];

    function exportOmborJamiExcel() {
        if (typeof XLSX === 'undefined') { alert('Excel kutubxonasi yuklanmagan.'); return; }
        if (!window._ojData) { alert("Ma'lumot hali yuklanmagan."); return; }
        const wb = XLSX.utils.book_new();

        const summaryRows = _OJ_EXPORT_CATS.map(c => {
            const d = window._ojData[c.key];
            const totalQty = d ? _ojRound(d.groups.reduce((s, g) => s + g.qty, 0)) : 0;
            return { "Bo'lim": c.label, "Turlar Soni": d ? d.groups.length : 0, "Jami Miqdor": totalQty };
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Umumiy");

        _OJ_EXPORT_CATS.forEach(c => {
            const { headers, rows } = _ojBuildCategoryRows(c.key);
            if (!rows.length) return;
            const sheetData = rows.map(r => {
                const obj = {};
                headers.forEach((h, i) => { obj[h] = r[i]; });
                return obj;
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetData), c.label.slice(0, 31));
        });

        XLSX.writeFile(wb, `AKFA_Romix_Ombor_Hisoboti_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    function exportOmborJamiPdf() {
        if (!window.jspdf || !window.jspdf.jsPDF) { alert('PDF kutubxonasi yuklanmagan.'); return; }
        if (!window._ojData) { alert("Ma'lumot hali yuklanmagan."); return; }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pageW = 210;
        const navy = [22, 33, 62];
        const cyan = [0, 200, 180];

        doc.setFillColor(...navy);
        doc.rect(0, 0, pageW, 26, 'F');
        doc.setFillColor(...cyan);
        doc.rect(0, 26, pageW, 1.2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(17);
        doc.text('AKFA ROMIX', 15, 12);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(180, 220, 255);
        doc.text('OMBOR HISOBOTI — Korxona Ombor Nazorati (faqat miqdor)', 15, 19);
        doc.setFontSize(9);
        doc.setTextColor(200, 200, 200);
        doc.text(new Date().toLocaleDateString('uz-UZ'), pageW - 15, 12, { align: 'right' });

        let y = 36;
        _OJ_EXPORT_CATS.forEach(c => {
            const { headers, rows } = _ojBuildCategoryRows(c.key);
            if (!rows.length) return;
            if (y > 260) { doc.addPage(); y = 20; }
            doc.setTextColor(...navy);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12.5);
            doc.text(`${c.label} (${rows.length} xil)`, 15, y);
            y += 4;
            doc.autoTable({
                startY: y,
                head: [headers],
                body: rows,
                theme: 'grid',
                margin: { left: 15, right: 15 },
                headStyles: { fillColor: navy, fontSize: 8.5 },
                bodyStyles: { fontSize: 8.5 },
                didDrawPage: () => {}
            });
            y = doc.lastAutoTable.finalY + 12;
        });

        doc.save(`AKFA_Romix_Ombor_Hisoboti_${new Date().toISOString().slice(0, 10)}.pdf`);
    }

    document.getElementById('ojExportExcelBtn')?.addEventListener('click', exportOmborJamiExcel);
    document.getElementById('ojExportPdfBtn')?.addEventListener('click', exportOmborJamiPdf);

    window._omUmumiyData = null;
    window._omActiveFilter = 'barchasi';
    window._omActiveBrandByFilter = {};

    async function loadOmborUmumiy() {
        const totalValEl = document.getElementById('omUmumiyTotalValue');
        const kirimEl = document.getElementById('omUmumiyKirim');
        const chiqimEl = document.getElementById('omUmumiyChiqim');
        if (!totalValEl) return;

        const monthKey = omMonthKey();
        let profilItems = [], omborTx = [];
        try {
            const { data } = await supabase.from('romix_inventory').select('*');
            profilItems = data || [];
        } catch (e) { console.warn('Umumiy profil fetch error:', e); }
        try {
            const { data } = await supabase.from('romix_transactions').select('*').gte('created_at', monthKey + '-01').order('created_at', { ascending: false });
            omborTx = data || [];
        } catch (e) { console.warn('Umumiy tranzaksiya fetch error:', e); }

        const accessories = await omGetAccessories();
        const qoldiqItems = await omGetQoldiq();
        const oynakItems = await omGetOynak();

        const profilGroups = omGroupProfilByName(profilItems);
        const accGroups = omGroupAccessoriesByCategory(accessories);
        const qoldiqGroups = omGroupQoldiqByBrand(qoldiqItems);
        const oynakGroups = omGroupOynakByBrand(oynakItems);
        const totalTypes = profilGroups.length + accGroups.length + qoldiqGroups.length + oynakGroups.length;

        const kirimQty = omborTx.filter(t => t.type === 'IN' && (t.note || '').includes('Buxgalteriya')).reduce((s, t) => s + (Number(t.quantity) || 0), 0);
        const chiqimQty = omborTx.filter(t => t.type === 'OUT' && (t.note || '').startsWith('Buyurtma uchun ajratildi')).reduce((s, t) => s + (Number(t.quantity) || 0), 0);

        totalValEl.textContent = totalTypes.toLocaleString('uz-UZ') + ' xil';
        kirimEl.textContent = kirimQty.toLocaleString('uz-UZ');
        chiqimEl.textContent = chiqimQty.toLocaleString('uz-UZ');

        window._omUmumiyData = {
            profil: { qty: profilItems.reduce((s, p) => s + (Number(p.stock_quantity) || 0), 0), groups: profilGroups },
            aksesuvar: { qty: accessories.reduce((s, a) => s + (Number(a.qty) || 0), 0), groups: accGroups },
            qoldiq: { qty: qoldiqItems.reduce((s, q) => s + (Number(q.stock_quantity) || 0), 0), groups: qoldiqGroups },
            oynak: { qty: oynakItems.reduce((s, o) => s + (Number(o.stock_quantity) || 0), 0), groups: oynakGroups }
        };

        document.querySelectorAll('#omFilterPills .om-brand-chip').forEach(chip => {
            chip.onclick = () => { window._omActiveFilter = chip.dataset.omFilter; renderOmborUmumiyFilter(); };
        });
        renderOmborUmumiyFilter();
    }

    function renderOmborUmumiyFilter() {
        const filter = window._omActiveFilter || 'barchasi';
        const content = document.getElementById('omFilterContent');
        const d = window._omUmumiyData;
        if (!content || !d) return;

        document.querySelectorAll('#omFilterPills .om-brand-chip').forEach(c => {
            c.classList.toggle('active', c.dataset.omFilter === filter);
        });

        if (filter === 'barchasi') {
            const cards = [
                { key: 'profil', icon: '📦', label: 'Profil Ombori', ...d.profil },
                { key: 'aksesuvar', icon: '🔩', label: 'Aksesuvar', ...d.aksesuvar },
                { key: 'qoldiq', icon: '✂️', label: 'Qoldiq Profillar', ...d.qoldiq },
                { key: 'oynak', icon: '🪟', label: 'Oynak', ...d.oynak }
            ];
            content.innerHTML = `<div class="om-group-grid">${cards.map(c => `
                <div class="om-group-card" onclick="window._omActiveFilter='${c.key}'; window.renderOmborUmumiyFilter();">
                    <div class="g-name">${c.icon} ${c.label}</div>
                    <div class="g-qty">${c.qty.toLocaleString('uz-UZ')} dona/birlik</div>
                    <div class="g-value">${c.groups.length} xil turi</div>
                </div>`).join('')}</div>`;
            return;
        }

        const section = d[filter];
        if (!section) { content.innerHTML = ''; return; }
        const activeBrand = window._omActiveBrandByFilter[filter] || 'barchasi';
        const brandChipsHtml = `<div class="om-brand-filter-row" style="margin-bottom:16px;">
            <div class="om-brand-chip ${activeBrand === 'barchasi' ? 'active' : ''}" onclick="window._omSelectBrand('${filter}','barchasi')">
                <span class="chip-name">🗂️ Barchasi</span><span class="chip-meta">${section.groups.length} xil</span>
            </div>
            ${section.groups.map(g => `<div class="om-brand-chip ${activeBrand === g.name ? 'active' : ''}" onclick="window._omSelectBrand('${filter}','${g.name.replace(/'/g, "\\'")}')">
                <span class="chip-name">${g.name}</span><span class="chip-meta">${g.qty.toLocaleString('uz-UZ')} ${g.unit || ''}</span>
            </div>`).join('')}
        </div>`;

        let rowsHtml;
        if (activeBrand === 'barchasi') {
            rowsHtml = section.groups.length ? section.groups.map(g => `<tr>
                    <td>${g.name}</td>
                    <td style="text-align:right; font-weight:700; color:#00d2ff;">${g.qty.toLocaleString('uz-UZ')} ${g.unit || ''}</td>
                    <td style="text-align:right;">${g.variants || g.items.length} xil</td>
                </tr>`).join('') : `<tr><td colspan="3" style="text-align:center; color:var(--adm-text-sec); padding:16px;">Mahsulot topilmadi</td></tr>`;
        } else {
            const group = section.groups.find(g => g.name === activeBrand);
            const items = group ? group.items : [];
            rowsHtml = items.length ? items.map(it => {
                const qty = Number(it.stock_quantity ?? it.qty) || 0;
                return `<tr>
                    <td>${it.product_name || it.name || "Noma'lum"}</td>
                    <td style="text-align:right; font-weight:700; color:#00d2ff;">${qty.toLocaleString('uz-UZ')} ${it.unit || ''}</td>
                </tr>`;
            }).join('') : `<tr><td colspan="2" style="text-align:center; color:var(--adm-text-sec); padding:16px;">Mahsulot topilmadi</td></tr>`;
        }

        content.innerHTML = `${brandChipsHtml}
            <div style="overflow-x:auto;"><table class="v2-table"><thead><tr>
                <th>${activeBrand === 'barchasi' ? 'Nomi' : 'Mahsulot'}</th>
                <th style="text-align:right;">Miqdor</th>
                ${activeBrand === 'barchasi' ? '<th style="text-align:right;">Variantlar</th>' : ''}
            </tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
    }

    window._omSelectBrand = (filter, brand) => {
        window._omActiveBrandByFilter[filter] = brand;
        renderOmborUmumiyFilter();
    };
    window.renderOmborUmumiyFilter = renderOmborUmumiyFilter;

    window.downloadDailyReportPdf = function(type, dayKey = null) {
        const dateVal = dayKey || document.getElementById('histDateFrom').value || new Date().toISOString().slice(0, 10);
        const targetDate = new Date(dateVal);
        
        const filteredTx = _histCache.filter(tx => {
            const txDate = new Date(tx.created_at);
            return tx.type === type && 
                   txDate.getFullYear() === targetDate.getFullYear() &&
                   txDate.getMonth() === targetDate.getMonth() &&
                   txDate.getDate() === targetDate.getDate();
        });
        
        if (filteredTx.length === 0) {
            alert(`Ushbu sanada (${dateVal}) hech qanday ${type === 'IN' ? 'kirim' : 'chiqim'} amallari topilmadi!`);
            return;
        }
        
        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert("jsPDF kutubxonasi yuklanmagan!");
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pageW = 210;
        
        // Colors
        const textDark = [30, 34, 45];
        const redColor = [204, 0, 0];
        
        let y = 15;
        
        // Header Logo & Meta
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(...redColor);
        doc.text('AKFA', 15, y);
        doc.setTextColor(...textDark);
        doc.text(' ROMIX', doc.getTextWidth('AKFA') + 15, y);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 100, 100);
        doc.text('Ombor xo\'jaligi boshqaruvi', 15, y + 5);
        
        const dateStr = targetDate.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const formattedDateForDocId = dateStr.replace(/\./g, '_');
        const docId = `${type === 'OUT' ? 'CHQ' : 'KRM'}-${targetDate.getFullYear()}/${String(targetDate.getMonth()+1).padStart(2,'0')}-${String(targetDate.getDate()).padStart(3,'0')}`;
        
        doc.setFontSize(8.5);
        doc.setTextColor(...textDark);
        doc.text(`Hujjat No: ${docId}`, pageW - 15, y, { align: 'right' });
        doc.text(`Sana: ${dateStr}`, pageW - 15, y + 4, { align: 'right' });
        doc.setTextColor(...redColor);
        doc.text('www.akfagroup.com', pageW - 15, y + 8, { align: 'right' });
        
        y += 12;
        
        // Red decorative line
        doc.setDrawColor(...redColor);
        doc.setLineWidth(0.6);
        doc.line(15, y, pageW - 15, y);
        
        y += 10;
        
        // Main Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...textDark);
        const titleText = type === 'OUT' ? 'CHIQIM MA\'LUMOTNOMASI' : 'KIRIM MA\'LUMOTNOMASI';
        doc.text(titleText, pageW / 2, y, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(100, 100, 100);
        const subtitleText = type === 'OUT' ? 'Ombordan chiqarilgan mahsulotlar to\'g\'risida' : 'Omborga qabul qilingan mahsulotlar to\'g\'risida';
        doc.text(subtitleText, pageW / 2, y + 4.5, { align: 'center' });
        
        y += 12;
        
        // Metadata Table layout (Korxona, Bo'lim, Chiqim turi, Sana)
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.rect(15, y, pageW - 30, 16);
        doc.line(pageW / 2, y, pageW / 2, y + 16);
        doc.line(15, y + 8, pageW - 15, y + 8);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(80, 80, 80);
        
        // Row 1
        doc.text('Korxona:', 18, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...textDark);
        doc.text('AKFA Romix Ombori', 35, y + 5);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(type === 'OUT' ? 'Chiqim turi:' : 'Kirim turi:', pageW / 2 + 3, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...textDark);
        doc.text(type === 'OUT' ? 'Ombordan chiqim' : 'Omborga kirim', pageW / 2 + 25, y + 5);
        
        // Row 2
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text('Bo\'lim:', 18, y + 13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...textDark);
        doc.text('Ombor xo\'jaligi', 35, y + 13);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text('Sana:', pageW / 2 + 3, y + 13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...textDark);
        doc.text(`${dateStr}-yil`, pageW / 2 + 25, y + 13);
        
        y += 24;
        
        // Build rows
        const tableData = filteredTx.map((tx, idx) => {
            const prodName = tx.romix_inventory?.product_name || 'O\'chirilgan mahsulot';
            const unit = tx.romix_inventory?.unit || 'dona';
            const qty = tx.quantity || 0;
            
            let statusText = type === 'OUT' ? 'Chiqarildi ✓' : 'Qabul qilindi ✓';
            if (tx.note) {
                const match = tx.note.match(/ajratildi:\s*([^(#]+)/i);
                if (match && match[1]) {
                    statusText = `${type === 'OUT' ? 'Chiqarildi' : 'Kiritildi'} ✓ (${match[1].trim()})`;
                } else if (tx.note.includes('Taminotchi')) {
                    const suppMatch = tx.note.match(/Taminotchi:\s*([^|]+)/i);
                    if (suppMatch && suppMatch[1]) {
                        statusText = `Kirim ✓ (${suppMatch[1].trim()})`;
                    }
                }
            }
            
            return [
                idx + 1,
                prodName,
                unit,
                qty,
                statusText
            ];
        });
        
        doc.autoTable({
            startY: y,
            head: [['No', 'MAHSULOT NOMI', 'O\'LCHOV BIRLIGI', 'MIQDORI', 'HOLATI / IZOH']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [15, 23, 42],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8.5,
                halign: 'center'
            },
            bodyStyles: {
                fontSize: 8,
                textColor: textDark,
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center' },
                1: { cellWidth: 90, halign: 'left' },
                2: { cellWidth: 25, halign: 'center' },
                3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
                4: { cellWidth: 33, halign: 'left' }
            },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 4) {
                    data.cell.styles.textColor = [34, 139, 34];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });
        
        const finalY = doc.lastAutoTable.finalY + 8;
        
        const unitGroups = {};
        filteredTx.forEach(tx => {
            const unit = tx.romix_inventory?.unit || 'dona';
            unitGroups[unit] = (unitGroups[unit] || 0) + tx.quantity;
        });
        const totalParts = [];
        Object.entries(unitGroups).forEach(([unit, sum]) => {
            totalParts.push(`${sum} ${unit}`);
        });
        const totalStr = `JAMI PO... ${totalParts.join(' • ')}`;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...textDark);
        doc.text(totalStr, 15, finalY);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`Izoh: Ushbu hisobot avtomatik tarzda tizimdan yuklab olindi.`, 15, finalY + 5);
        
        const sigY = finalY + 22;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textDark);
        doc.text('Ombor mudiri: _______________________', 15, sigY);
        doc.text('Qabul qildi: _______________________', pageW - 85, sigY);
        
        const filename = `AKFA_Romix_${type === 'OUT' ? 'Chiqim' : 'Kirim'}_Malumotnoma_${formattedDateForDocId}.pdf`;
        doc.save(filename);
    };

    loadOmborUmumiy();
});


// ═══════════════════════════════════════════════════════════
// 💬 OMBOR MUROJAATLARI (REQUESTS & NOTIFICATIONS SYSTEM)
// ═══════════════════════════════════════════════════════════
window._activeReqFilter = 'all';

window.loadRequests = async function() {
    const grid = document.getElementById('requestsGrid');
    if (!grid) return;

    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:30px; color:rgba(255,255,255,0.4);">Murojaatlar yuklanmoqda...</div>';

    let requests = [];
    try {
        const { data, error } = await supabase.from('profile_requests').select('*').order('created_at', { ascending: false });
        if (!error && data) {
            requests = data.map(r => {
                const reqObj = r.requested_data || {};
                return {
                    id: r.id,
                    type: reqObj.type || '⚡ Material Yetishmovchiligi',
                    priority: reqObj.priority || 'medium',
                    title: reqObj.title || 'Murojaat #' + String(r.id).slice(0, 8),
                    description: reqObj.description || 'Izoh mavjud emas',
                    sender: reqObj.sender || 'Sex Usta / Omborchi',
                    status: r.status || 'pending',
                    created_at: r.created_at
                };
            });
        }
    } catch (e) {
        console.warn("Supabase profile_requests fetch fallback:", e);
    }

    // Local Storage fallback merge
    try {
        const localReqs = JSON.parse(localStorage.getItem('romix_ombor_requests') || '[]');
        if (localReqs.length) {
            const existingIds = new Set(requests.map(r => String(r.id)));
            localReqs.forEach(lr => {
                if (!existingIds.has(String(lr.id))) {
                    requests.push(lr);
                }
            });
        }
    } catch (e) {}

    // Default initial seed data if totally empty
    if (requests.length === 0) {
        requests = [
            {
                id: 'req-sample-1',
                type: '⚡ Material Yetishmovchiligi',
                priority: 'high',
                title: 'Sex #1: 6000 Penta oq profil yetishmayapti',
                description: 'Ertangi 40 ta rom tayyorlash uchun kamida 24 dona profil zarur.',
                sender: 'Xurshid Mullajonov (Brigadir)',
                status: 'pending',
                created_at: new Date(Date.now() - 3600000).toISOString()
            },
            {
                id: 'req-sample-2',
                type: '📦 Yangi Material So\'rovi',
                priority: 'medium',
                title: 'Aksessuarlar: Zamok va ilmoqlar zaxirasini to\'ldirish',
                description: 'Omborda burchak birikmalari kam qoldi.',
                sender: 'Axror Abdullaev (Omborchi)',
                status: 'in_progress',
                created_at: new Date(Date.now() - 86400000).toISOString()
            }
        ];
        try { localStorage.setItem('romix_ombor_requests', JSON.stringify(requests)); } catch (e) {}
    }

    // Filter tabs setup
    document.querySelectorAll('[data-req-filter]').forEach(chip => {
        chip.onclick = () => {
            document.querySelectorAll('[data-req-filter]').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            window._activeReqFilter = chip.dataset.reqFilter;
            window.renderRequestsList(requests);
        };
    });

    window._cachedRequests = requests;
    window.renderRequestsList(requests);
};

window.renderRequestsList = function(requests) {
    requests = requests || window._cachedRequests || [];
    const grid = document.getElementById('requestsGrid');
    if (!grid) return;

    const activeFilter = window._activeReqFilter || 'all';
    let filtered = requests;
    if (activeFilter !== 'all') {
        filtered = requests.filter(r => r.status === activeFilter);
    }

    // Stats update
    const totalCount = requests.length;
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const progressCount = requests.filter(r => r.status === 'in_progress').length;
    const resolvedCount = requests.filter(r => r.status === 'resolved').length;

    if (document.getElementById('reqTotalCount')) document.getElementById('reqTotalCount').textContent = totalCount;
    if (document.getElementById('reqPendingCount')) document.getElementById('reqPendingCount').textContent = pendingCount;
    if (document.getElementById('reqProgressCount')) document.getElementById('reqProgressCount').textContent = progressCount;
    if (document.getElementById('reqResolvedCount')) document.getElementById('reqResolvedCount').textContent = resolvedCount;

    if (!filtered.length) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:rgba(255,255,255,0.4); font-size:0.9rem;">Ushbu toifada birorta murojaat topilmadi.</div>';
        return;
    }

    grid.innerHTML = filtered.map(r => {
        const dateStr = new Date(r.created_at).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        let statusBadge = `<span style="background:rgba(255,77,79,0.15); color:#ff4d4f; border:1px solid rgba(255,77,79,0.3); padding:4px 10px; border-radius:8px; font-weight:800; font-size:0.75rem;">🔴 Kutilmoqda</span>`;
        if (r.status === 'in_progress') {
            statusBadge = `<span style="background:rgba(245,158,11,0.15); color:#f59e0b; border:1px solid rgba(245,158,11,0.3); padding:4px 10px; border-radius:8px; font-weight:800; font-size:0.75rem;">🟡 Jarayonda</span>`;
        } else if (r.status === 'resolved') {
            statusBadge = `<span style="background:rgba(0,255,136,0.15); color:#00ff88; border:1px solid rgba(0,255,136,0.3); padding:4px 10px; border-radius:8px; font-weight:800; font-size:0.75rem;">🟢 Bajarildi</span>`;
        } else if (r.status === 'rejected') {
            statusBadge = `<span style="background:rgba(142,142,147,0.15); color:#8e8e93; border:1px solid rgba(142,142,147,0.3); padding:4px 10px; border-radius:8px; font-weight:800; font-size:0.75rem;">❌ Rad etildi</span>`;
        }

        let priorityBadge = `<span style="color:#00d2ff;">🔵 Oddiy</span>`;
        if (r.priority === 'high') priorityBadge = `<span style="color:#ff4d4f; font-weight:800;">🔴 Shoshilinch</span>`;
        else if (r.priority === 'medium') priorityBadge = `<span style="color:#f59e0b; font-weight:800;">🟡 O'rta</span>`;

        return `
            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:20px; padding:20px; display:flex; flex-direction:column; justify-content:space-between; gap:12px; transition:0.2s;" onmouseenter="this.style.borderColor='rgba(0,210,255,0.4)'" onmouseleave="this.style.borderColor='rgba(255,255,255,0.08)'">
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        ${statusBadge}
                        ${priorityBadge}
                    </div>
                    <div style="font-size:0.75rem; color:#00d2ff; font-weight:800; margin-bottom:4px;">${r.type}</div>
                    <h4 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0 0 6px 0;">${r.title}</h4>
                    <p style="font-size:0.83rem; color:rgba(255,255,255,0.65); margin:0 0 12px 0; line-height:1.4;">${r.description}</p>
                </div>

                <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:12px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:rgba(255,255,255,0.45); margin-bottom:12px;">
                        <span>👤 ${r.sender}</span>
                        <span>🕒 ${dateStr}</span>
                    </div>

                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        ${r.status !== 'resolved' ? `<button onclick="window.updateRequestStatus('${r.id}', 'resolved')" style="flex:1; background:rgba(0,255,136,0.1); border:1px solid rgba(0,255,136,0.3); color:#00ff88; padding:7px; border-radius:10px; font-weight:800; font-size:0.75rem; cursor:pointer;">✅ Bajarildi</button>` : ''}
                        ${r.status === 'pending' ? `<button onclick="window.updateRequestStatus('${r.id}', 'in_progress')" style="flex:1; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); color:#f59e0b; padding:7px; border-radius:10px; font-weight:800; font-size:0.75rem; cursor:pointer;">🟡 Jarayonga</button>` : ''}
                        <button onclick="window.deleteRequestItem('${r.id}')" style="background:rgba(255,77,79,0.08); border:1px solid rgba(255,77,79,0.2); color:#ff4d4f; padding:7px 10px; border-radius:10px; font-weight:700; font-size:0.75rem; cursor:pointer;" title="O'chirish">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

window.saveNewRequest = async function() {
    const type = document.getElementById('reqTypeInput')?.value;
    const priority = document.getElementById('reqPriorityInput')?.value;
    const title = document.getElementById('reqTitleInput')?.value.trim();
    const desc = document.getElementById('reqDescInput')?.value.trim();

    if (!title) {
        alert("Murojaat sarlavhasini kiriting!");
        return;
    }

    const user = authService.getCurrentUser() || {};
    const senderName = user.full_name || user.username || 'Ombor Mudiri';

    const newReq = {
        id: 'req-' + Date.now(),
        type,
        priority,
        title,
        description: desc || 'Tafsilot yozilmagan',
        sender: senderName,
        status: 'pending',
        created_at: new Date().toISOString()
    };

    // Try Supabase insert
    try {
        await supabase.from('profile_requests').insert({
            employee_id: user.id || 'ombor-user',
            requested_data: newReq,
            status: 'pending'
        });
    } catch (e) {
        console.warn("Supabase request insert fallback:", e);
    }

    // Local Storage backup
    try {
        const localReqs = JSON.parse(localStorage.getItem('romix_ombor_requests') || '[]');
        localReqs.unshift(newReq);
        localStorage.setItem('romix_ombor_requests', JSON.stringify(localReqs));
    } catch (e) {}

    const modal = document.getElementById('createRequestModal');
    if (modal) modal.style.setProperty('display', 'none', 'important');

    if (document.getElementById('reqTitleInput')) document.getElementById('reqTitleInput').value = '';
    if (document.getElementById('reqDescInput')) document.getElementById('reqDescInput').value = '';

    alert("✅ Murojaat muvaffaqiyatli yuborildi!");
    window.loadRequests();
};

window.updateRequestStatus = async function(id, newStatus) {
    try {
        await supabase.from('profile_requests').update({ status: newStatus }).eq('id', id);
    } catch (e) {}

    try {
        const localReqs = JSON.parse(localStorage.getItem('romix_ombor_requests') || '[]');
        const found = localReqs.find(r => String(r.id) === String(id));
        if (found) {
            found.status = newStatus;
            localStorage.setItem('romix_ombor_requests', JSON.stringify(localReqs));
        }
    } catch (e) {}

    window.loadRequests();
};

window.deleteRequestItem = async function(id) {
    if (!confirm("Ushbu murojaatni o'chirmoqchimisiz?")) return;

    try {
        await supabase.from('profile_requests').delete().eq('id', id);
    } catch (e) {}

    try {
        let localReqs = JSON.parse(localStorage.getItem('romix_ombor_requests') || '[]');
        localReqs = localReqs.filter(r => String(r.id) !== String(id));
        localStorage.setItem('romix_ombor_requests', JSON.stringify(localReqs));
    } catch (e) {}

    window.loadRequests();
};


// ═══════════════════════════════════════════════════════════
// 🤖 ROMIX AI ASSISTANT (WAREHOUSE AI ENGINE)
// ═══════════════════════════════════════════════════════════
window.toggleRomixAiDrawer = function() {
    const drawer = document.getElementById('romixAiDrawer');
    if (!drawer) return;
    const isHidden = drawer.style.display === 'none' || !drawer.style.display;
    drawer.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) {
        const input = document.getElementById('aiInputText');
        if (input) input.focus();
    }
};

window.sendAiQuickPrompt = function(promptText) {
    const input = document.getElementById('aiInputText');
    if (input) input.value = promptText;
    window.submitAiMessage();
};

window.submitAiMessage = async function() {
    const input = document.getElementById('aiInputText');
    const history = document.getElementById('aiChatHistory');
    if (!input || !history) return;

    const text = input.value.trim();
    if (!text) return;

    // User message bubble
    const userBubble = document.createElement('div');
    userBubble.style.cssText = 'background:rgba(0,210,255,0.18); border:1px solid rgba(0,210,255,0.3); border-radius:14px; padding:10px 14px; color:#fff; align-self:flex-end; max-width:85%; font-weight:600; line-height:1.4;';
    userBubble.textContent = text;
    history.appendChild(userBubble);

    input.value = '';

    // Typing indicator
    const typingBubble = document.createElement('div');
    typingBubble.id = 'aiTypingBubble';
    typingBubble.style.cssText = 'background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:14px; padding:10px 14px; color:rgba(255,255,255,0.6); align-self:flex-start; font-size:0.8rem; font-style:italic;';
    typingBubble.textContent = "🤖 Romix AI o'ylamoqda...";
    history.appendChild(typingBubble);
    history.scrollTop = history.scrollHeight;

    let responseHtml = "⚠️ Xatolik yuz berdi.";
    try {
        const res = await fetch('/api/ombor-ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'chat', text, chatId: 'ombor_user' })
        });
        const data = await res.json();
        if (data.ok && data.text) {
            // Simple markdown parser
            let txt = data.text;
            txt = txt.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
            txt = txt.replace(/\\*(.*?)\\*/g, '<em>$1</em>');
            txt = txt.replace(/\\n/g, '<br>');
            responseHtml = txt;
        } else if (data.error) {
            responseHtml = "⚠️ Xato: " + data.error;
        }
    } catch (e) {
        responseHtml = "⚠️ Tarmoq xatosi yoki serverga ulanib bo'lmadi.";
    }

    const typing = document.getElementById('aiTypingBubble');
    if (typing) typing.remove();

    const aiBubble = document.createElement('div');
    aiBubble.style.cssText = 'background:rgba(0,210,255,0.08); border:1px solid rgba(0,210,255,0.25); border-radius:14px; padding:12px 14px; color:#fff; align-self:flex-start; max-width:88%; line-height:1.5; font-size:0.85rem;';
    aiBubble.innerHTML = responseHtml;
    history.appendChild(aiBubble);
    history.scrollTop = history.scrollHeight;
    
    // Auto-refresh requests grid just in case a new request was added
    if (window.loadRequests) {
        window.loadRequests();
    }
};

window.askRomixAi = function(query) {
    // Deprecated: Now we use submitAiMessage directly via API
    return "Tizim yangilandi. Iltimos qayta urinib ko'ring.";
};
