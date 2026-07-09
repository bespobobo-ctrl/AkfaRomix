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

    // Elements
    const inventoryTable = document.getElementById('inventoryTable');
    const historyTable = document.getElementById('historyTable');
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
            inventoryTable.innerHTML = '<div style="text-align:center; color:red; padding:40px; font-weight:700;">Hujjatlar yuklanishida xatolik yuz berdi!</div>';
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
                            <div class="card-actions">
                                <button class="card-action-btn edit-btn" data-id="${p.id}" title="Tahrirlash">✏️</button>
                                <button class="card-action-btn delete-btn delete-accent" data-id="${p.id}" title="O'chirish" style="color:#ff4d4f;">🗑️</button>
                            </div>
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
                    await supabase.from('romix_inventory').delete().eq('id', b.dataset.id);
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
                        await supabase.from('romix_staff').delete().eq('id', id);
                    } catch (err) {
                        console.warn("Delete staff from db failed:", err);
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
            await supabase.from('romix_staff').insert([{
                full_name: name,
                role: role,
                salary: salary,
                photo_url: photoUrl
            }]);
        } catch (dbError) {
            console.warn("Database insert failed, saved locally", dbError);
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

    async function loadHistory() {
        historyTable.innerHTML = '<tr><td colspan="5" style="text-align:center;">Yuklanmoqda...</td></tr>';
        const { data, error } = await supabase
            .from('romix_transactions')
            .select(`*, romix_inventory(product_name, unit)`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("History loading error:", error);
            historyTable.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Tarixni yuklashda xatolik!</td></tr>';
            return;
        }
        _histCache = data || [];

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

        historyTable.innerHTML = '';
        if (rows.length === 0) {
            historyTable.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--adm-text-sec);">Filtrga mos yozuv topilmadi</td></tr>';
            return;
        }
        rows.forEach(tx => {
            const date = new Date(tx.created_at).toLocaleString();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><small>${date}</small><br><strong>#${tx.id.slice(0, 8)}</strong></td>
                <td>${tx.romix_inventory?.product_name || 'O\'chirilgan mahsulot'}</td>
                <td><span style="color:${tx.type === 'IN' ? '#007c52' : '#ff4d4f'}; font-weight:700;">${tx.type === 'IN' ? 'KIRIM' : 'CHIQIM'}</span></td>
                <td>${tx.quantity} ${tx.romix_inventory?.unit || ''}</td>
                <td>
                    <button class="view-inv-btn" data-tx='${JSON.stringify(tx)}' style="background:#eee; border:none; padding:5px 12px; border-radius:10px; cursor:pointer;">👁️ Ko'rish</button>
                </td>
            `;
            historyTable.appendChild(tr);
        });

        document.querySelectorAll('.view-inv-btn').forEach(b => {
            b.onclick = () => {
                const tx = JSON.parse(b.dataset.tx);
                showInvoice(tx);
            };
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

    function showInvoice(tx, directProduct = null) {
        const prod = directProduct || tx.romix_inventory || { product_name: "Mahsulot", unit: "" };

        document.getElementById('invNumber').textContent = `No. ${tx.id ? tx.id.slice(0, 8).toUpperCase() : 'NEW'}`;
        document.getElementById('invDate').textContent = new Date(tx.created_at || Date.now()).toLocaleDateString();
        document.getElementById('invProdName').textContent = prod.product_name || "Mahsulot";
        document.getElementById('invQty').textContent = tx.quantity;
        document.getElementById('invUnit').textContent = prod.unit || "";

        // Show supplier info
        if (document.getElementById('invSupplier')) {
            document.getElementById('invSupplier').textContent = tx.supplier_name || "---";
            document.getElementById('invPhone').textContent = tx.supplier_phone || "";
        }

        if (document.getElementById('invSubInfo')) {
            document.getElementById('invSubInfo').textContent = tx.note || "";
        }

        // QR
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=ROMIX-TXID-${tx.id || 'NEW'}`;
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
            grid.innerHTML = '<div style="text-align:center; color:#ef4444; padding:20px; grid-column:1/-1;">Xatolik: buyurtmalarni yuklab bo\'lmadi (production_deadline_tracking/ombor_confirmation_flow SQL ustunlari mavjudligini tekshiring)</div>';
            console.warn('loadOrdersConfirmation fetch failed:', err);
            return;
        }

        if (orders.length === 0) {
            grid.innerHTML = '<div style="text-align:center; color:var(--adm-text-sec); padding:30px; grid-column:1/-1;">Hozircha tasdiq kutayotgan buyurtma yo\'q (kamida 50% avans to\'langan buyurtmalar shu yerda chiqadi)</div>';
            return;
        }

        let profileStock = [];
        try {
            const { data } = await supabase.from('romix_inventory').select('id, product_name, stock_quantity, unit');
            profileStock = data || [];
        } catch (err) { console.warn('profile stock fetch failed:', err); }
        const accStock = await omGetAccessories();

        const findProfileStock = (name) => profileStock.find(p => (p.product_name || '').toLowerCase() === (name || '').toLowerCase());
        const findAccStock = (name) => accStock.find(a => (a.name || '').toLowerCase() === (name || '').toLowerCase());

        grid.innerHTML = orders.map(o => {
            const est = o.material_estimate || {};
            const profiles = est.profiles || [];
            const accessories = est.accessories || [];
            let allSufficient = true;

            const profRows = profiles.map(p => {
                const stock = findProfileStock(p.material_name);
                const have = stock ? Number(stock.stock_quantity) || 0 : 0;
                const ok = have >= p.meters;
                if (!ok) allSufficient = false;
                return `<div style="display:flex; justify-content:space-between; font-size:0.78rem; padding:4px 0;">
                    <span>📏 ${p.material_name}</span>
                    <span style="color:${ok ? '#00ff88' : '#ef4444'}; font-weight:700;">${p.meters}m kerak / ${have.toFixed(1)}m bor ${ok ? '✅' : '❌'}</span>
                </div>`;
            }).join('');
            const accRows = accessories.map(a => {
                const stock = findAccStock(a.name);
                const have = stock ? Number(stock.qty) || 0 : 0;
                const ok = have >= a.qty;
                if (!ok) allSufficient = false;
                return `<div style="display:flex; justify-content:space-between; font-size:0.78rem; padding:4px 0;">
                    <span>🔩 ${a.name}</span>
                    <span style="color:${ok ? '#00ff88' : '#ef4444'}; font-weight:700;">${a.qty} kerak / ${have} bor ${ok ? '✅' : '❌'}</span>
                </div>`;
            }).join('');

            return `<div style="background:var(--adm-surface); border:1px solid var(--adm-border); border-top:3px solid ${allSufficient ? '#00ff88' : '#ef4444'}; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:8px; box-shadow:var(--adm-shadow);">
                <div style="font-weight:700; color:var(--adm-text); font-size:0.95rem;">${o.customer_name || 'Noma\'lum'}</div>
                <div style="font-size:0.76rem; color:var(--adm-text-sec);">${o.customer_phone ? '📞 ' + o.customer_phone + ' — ' : ''}${o.prod_type || ''} — Muddat: ${o.production_deadline ? new Date(o.production_deadline).toLocaleDateString('uz-UZ') : '—'}</div>
                <div style="border-top:1px dashed var(--adm-border); padding-top:8px;">
                    ${profRows || '<div style="color:var(--adm-text-sec); font-size:0.76rem;">Profil kerak emas</div>'}
                    ${accRows}
                </div>
                <button class="ombor-confirm-btn" data-id="${o.id}" ${allSufficient ? '' : 'disabled'} style="margin-top:8px; background:${allSufficient ? '#00ff88' : 'rgba(255,255,255,0.08)'}; color:${allSufficient ? '#000' : 'var(--adm-text-sec)'}; border:none; padding:10px; border-radius:10px; font-weight:700; cursor:${allSufficient ? 'pointer' : 'not-allowed'};">${allSufficient ? '✅ Tasdiqlash va Ishlab Chiqarishga O\'tkazish' : '❌ Yetarli emas'}</button>
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
            for (const p of profiles) {
                const { data: stock } = await supabase.from('romix_inventory').select('id, stock_quantity').eq('product_name', p.material_name).maybeSingle();
                if (stock) {
                    await supabase.from('romix_inventory').update({ stock_quantity: (Number(stock.stock_quantity) || 0) - p.meters }).eq('id', stock.id);
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
    window._ojSearchTerm = '';

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

        tabsEl.querySelectorAll('.om-brand-chip').forEach(chip => {
            chip.onclick = () => {
                window._ojActiveCategory = chip.dataset.ojCat;
                window._ojSearchTerm = '';
                const search = document.getElementById('ojSearchInput');
                if (search) search.value = '';
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

        renderOmborJami();
    }

    function renderOmborJami() {
        const cat = window._ojActiveCategory;
        const data = window._ojData && window._ojData[cat];
        const statRow = document.getElementById('ojStatRow');
        const brandFilterEl = document.getElementById('ojBrandFilter');
        const tableWrap = document.getElementById('ojItemsTableWrap');
        const titleEl = document.getElementById('ojCategoryTitle');
        if (!data || !statRow || !brandFilterEl || !tableWrap) return;

        document.querySelectorAll('#ojCategoryTabs .om-brand-chip').forEach(c => {
            c.classList.toggle('active', c.dataset.ojCat === cat);
        });
        if (titleEl) titleEl.textContent = _OJ_CATEGORY_META[cat].title;

        const totalQty = data.groups.reduce((s, g) => s + g.qty, 0);
        statRow.innerHTML = `
            <div class="om-stat-card"><div class="lbl">📦 Jami Miqdor</div><div class="val">${totalQty.toLocaleString('uz-UZ')}</div></div>
            <div class="om-stat-card"><div class="lbl">🏷️ Turlar Soni</div><div class="val">${data.groups.length}</div></div>
        `;

        const activeBrand = window._ojActiveBrand[cat] || 'barchasi';
        brandFilterEl.innerHTML = `
            <div class="om-brand-chip ${activeBrand === 'barchasi' ? 'active' : ''}" onclick="window._ojSelectBrand('barchasi')">
                <span class="chip-name">🗂️ Barchasi</span><span class="chip-meta">${data.groups.length} xil</span>
            </div>
            ${data.groups.map(g => `<div class="om-brand-chip ${activeBrand === g.name ? 'active' : ''}" onclick="window._ojSelectBrand('${g.name.replace(/'/g, "\\'")}')">
                <span class="chip-name">${g.name}</span><span class="chip-meta">${g.qty.toLocaleString('uz-UZ')} ${g.unit || ''}</span>
            </div>`).join('')}
        `;

        let items;
        if (activeBrand === 'barchasi') {
            items = data.items;
        } else {
            const grp = data.groups.find(g => g.name === activeBrand);
            items = grp ? grp.items : [];
        }
        const q = window._ojSearchTerm;
        if (q) {
            items = items.filter(it => (it.product_name || it.name || '').toLowerCase().includes(q));
        }

        if (cat === 'profil') {
            const rows = items.length ? items.map(p => {
                const meta = p.metadata || {};
                const qty = Number(p.stock_quantity) || 0;
                return `<tr>
                    <td>${p.product_name || "Noma'lum"}</td>
                    <td>${meta.brend || '-'}</td>
                    <td>${meta.seriya || '-'}</td>
                    <td style="text-align:right;">${meta.uzunligi || '-'}</td>
                    <td>${meta.shakli || '-'}</td>
                    <td>${meta.rangi || '-'}</td>
                    <td style="text-align:right; font-weight:700; color:#00d2ff;">${qty.toLocaleString('uz-UZ')} ${p.unit || ''}</td>
                </tr>`;
            }).join('') : `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--adm-text-sec);">Mahsulot topilmadi</td></tr>`;
            tableWrap.innerHTML = `<table class="v2-table"><thead><tr>
                <th>Mahsulot</th><th>Brend</th><th>Seriya</th><th style="text-align:right;">Uzunligi (mm)</th><th>Shakli</th><th>Rangi</th>
                <th style="text-align:right;">Miqdor</th>
            </tr></thead><tbody>${rows}</tbody></table>`;
        } else if (cat === 'aksesuvar') {
            const rows = items.length ? items.map(a => {
                const qty = Number(a.qty) || 0;
                return `<tr>
                    <td>${a.name || "Noma'lum"}</td>
                    <td>${a.category || '-'}</td>
                    <td style="text-align:right; font-weight:700; color:#00d2ff;">${qty.toLocaleString('uz-UZ')} ${a.unit || ''}</td>
                </tr>`;
            }).join('') : `<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--adm-text-sec);">Mahsulot topilmadi</td></tr>`;
            tableWrap.innerHTML = `<table class="v2-table"><thead><tr>
                <th>Mahsulot</th><th>Kategoriya</th><th style="text-align:right;">Miqdor</th>
            </tr></thead><tbody>${rows}</tbody></table>`;
        } else if (cat === 'qoldiq') {
            const rows = items.length ? items.map(qi => {
                const qty = Number(qi.stock_quantity) || 0;
                const len = Number(qi.length) || 0;
                return `<tr>
                    <td>${qi.product_name || "Noma'lum"}</td>
                    <td>${qi.brand || '-'}</td>
                    <td style="text-align:right;">${len.toLocaleString('uz-UZ')}</td>
                    <td style="text-align:right; font-weight:700; color:#00d2ff;">${qty.toLocaleString('uz-UZ')} dona</td>
                </tr>`;
            }).join('') : `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--adm-text-sec);">Mahsulot topilmadi</td></tr>`;
            tableWrap.innerHTML = `<table class="v2-table"><thead><tr>
                <th>Mahsulot</th><th>Brend</th><th style="text-align:right;">Uzunligi (mm)</th><th style="text-align:right;">Miqdor</th>
            </tr></thead><tbody>${rows}</tbody></table>`;
        } else if (cat === 'oynak') {
            const rows = items.length ? items.map(o => {
                const qty = Number(o.stock_quantity) || 0;
                return `<tr>
                    <td>${o.product_name || "Noma'lum"}</td>
                    <td>${o.brand || '-'}</td>
                    <td>${o.size || '-'}</td>
                    <td style="text-align:right; font-weight:700; color:#00d2ff;">${qty.toLocaleString('uz-UZ')} ${o.unit || 'dona'}</td>
                </tr>`;
            }).join('') : `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--adm-text-sec);">Mahsulot topilmadi</td></tr>`;
            tableWrap.innerHTML = `<table class="v2-table"><thead><tr>
                <th>Mahsulot</th><th>Brend</th><th>O'lcham</th><th style="text-align:right;">Miqdor</th>
            </tr></thead><tbody>${rows}</tbody></table>`;
        }
    }

    window._ojSelectBrand = (brand) => {
        window._ojActiveBrand[window._ojActiveCategory] = brand;
        renderOmborJami();
    };

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

    loadOmborUmumiy();
});
