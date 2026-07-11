import { supabase } from '@/core/supabase.js';
import { createViewer } from './window3d.js';
import { generateCuttingPdf } from './cuttingPdf.js';
import { createDesigner } from './designer2d.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || !['sotuv', 'admin', 'sotuvchi'].includes(user.role)) {
        window.location.href = '/';
    }
    // "sotuvchi" — Sozlamalarda qo'shilgan yordamchi sotuv xodimi: faqat buyurtma olish oynasini ko'radi,
    // analitika/harakat grafigi/to'lovlar tarixi/sotuvchilar boshqaruviga kirmaydi.
    const isLimitedAgent = user.role === 'sotuvchi';

    document.getElementById('userName').textContent = user.full_name || "Sotuv Menejeri";

    // Modals
    const orderModal = document.getElementById('orderModal');
    const editModal = document.getElementById('editOrderModal');

    const mainApp = document.getElementById('mainApp');
    const printArea = document.getElementById('printArea');

    // Values
    const PRODUCTION_COST = 1000000; // base production markup per window/door
    const INSTALLATION_PRICE_PER_SQM = 0; // mijoz xonadonida o'rnatib berish — biznes qoidasi bo'yicha bepul (0 so'm)

    // Umumiy tushum kartochkasi bosilganda ochiladigan tafsilot uchun — loadOrders() to'ldiradi
    let allOrders = [];

    // Tabs
    const sections = document.querySelectorAll('.sales-section');
    const navButtons = document.querySelectorAll('.nav-icon');

    function switchTab(tabId) {
        if (tabId === 'logoutBtn') return;
        sections.forEach(s => s.classList.add('hidden'));
        document.getElementById(`${tabId}-view`)?.classList.remove('hidden');
        navButtons.forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
        if (tabId === 'dashboard' || tabId === 'orders' || tabId === 'payments') loadOrders();
        if (tabId === 'settings') {
            document.getElementById('settingsUserName').textContent = user?.full_name || '---';
            document.getElementById('settingsUserLogin').textContent = user?.username || '---';
            document.getElementById('settingsUserRole').textContent = (user?.role || '---').toUpperCase();
            if (!isLimitedAgent) {
                document.getElementById('salesAgentsSection').classList.remove('hidden');
                loadSalesAgents();
            }
        }
    }

    navButtons.forEach(btn => {
        btn.onclick = () => {
            const tab = btn.getAttribute('data-tab');
            if (tab) switchTab(tab);
        };
    });

    // "sotuvchi" — faqat buyurtma olish oynasi ko'rinadi: boshqa tablar/analitika/ro'yxat berkitiladi,
    // buyurtma yaratish oynasi darhol ochiladi.
    if (isLimitedAgent) {
        document.querySelectorAll('.nav-icon[data-tab]').forEach(el => {
            if (el.getAttribute('data-tab') !== 'dashboard') el.style.display = 'none';
        });
        const kpiRow = document.getElementById('dashboardKpiRow');
        const ordersList = document.getElementById('dashboardOrdersList');
        if (kpiRow) kpiRow.style.display = 'none';
        if (ordersList) ordersList.style.display = 'none';
    }

    // Multi-item Order Constructor Settings
    const AVAILABLE_MATERIALS = {
        rom: [
            { id: "prof-60", name: "Akfa 60 Series Profil", price: 120000, unit: "m" },
            { id: "prof-70", name: "Akfa 70 Series Profil", price: 150000, unit: "m" },
            { id: "prof-thermo", name: "Thermo 65 Insulation Profil", price: 210000, unit: "m" },
            { id: "prof-eng", name: "Engelberg 76 Premium Profil", price: 280000, unit: "m" }
        ],
        rom_fortochka: [
            { id: "prof-60-f", name: "Akfa 60 (Fortochka Bilan)", price: 135000, unit: "m" },
            { id: "prof-70-f", name: "Akfa 70 (Fortochka Bilan)", price: 165000, unit: "m" },
            { id: "prof-thermo-f", name: "Thermo 65 (Fortochka Bilan)", price: 230000, unit: "m" }
        ],
        eshik: [
            { id: "prof-60-d", name: "Akfa 60 Door Profil", price: 130000, unit: "m" },
            { id: "prof-70-d", name: "Akfa 70 Door Profil", price: 160000, unit: "m" },
            { id: "prof-thermo-d", name: "Thermo 65 Door Profil", price: 220000, unit: "m" },
            { id: "prof-wood", name: "MDF / Eko-Wood Profil", price: 180000, unit: "m" }
        ],
        padakonnik: [
            { id: "pad-plast", name: "Plastik Oddiy Padakonnik", price: 45000, unit: "m" },
            { id: "pad-akfa", name: "Akfa Premium Padakonnik", price: 80000, unit: "m" },
            { id: "pad-marmar", name: "Marmar Sun'iy Padakonnik", price: 150000, unit: "m" }
        ],
        aksesuar_rom: [
            { id: "acc-w-lock", name: "Rom Qulfi (Zamok)", price: 25000, unit: "dona" },
            { id: "acc-w-handle", name: "Rom Ruchkasi", price: 15000, unit: "dona" },
            { id: "acc-w-mesh", name: "Pashshaga qarshi setka", price: 40000, unit: "dona" },
            { id: "acc-w-hinge", name: "Rom Petlyasi", price: 8000, unit: "dona" }
        ],
        aksesuar_eshik: [
            { id: "acc-d-lock", name: "Eshik Qulfi (Zamok)", price: 65000, unit: "dona" },
            { id: "acc-d-handle", name: "Eshik Ruchkasi (Premium)", price: 45000, unit: "dona" },
            { id: "acc-d-closer", name: "Eshik Yopgichi (Dovodchik)", price: 120000, unit: "dona" },
            { id: "acc-d-hinge", name: "Eshik Petlyasi (Kuchaytirilgan)", price: 15000, unit: "dona" }
        ]
    };

    // =====================================================================
    // OMBOR MATERIALLARI: Supabase-dan real vaqtda yuklash
    // 3 bosqichli kaskad filtr: Brend → Qalinligi/Seriya → Rangi
    // =====================================================================
    let _tsFilterBrand = null;
    let _tsFilterSeries = null;
    let _tsFilterColor = null;

    async function loadOmborMaterials() {
        try {
            const { data, error } = await supabase
                .from('romix_inventory')
                .select('id, product_name, price, stock_quantity, unit, metadata')
                .gt('stock_quantity', 0)
                .order('product_name', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) {
                console.warn('Omborda mavjud profil topilmadi.');
                return;
            }

            // Har bir ombor mahsulotini qulay formatga keltirish
            const omborProfillar = data.map(p => {
                const meta = p.metadata || {};
                const brend  = (meta.brend  || '').trim();
                const seriya = (meta.seriya || '').trim();
                const rangi  = (meta.rangi  || '').trim();
                const uzunlik = meta.uzunligi ? `${meta.uzunligi}mm` : '';
                const qty  = Math.round(Number(p.stock_quantity) || 0);
                const unit = p.unit || 'm';
                const price = parseFloat(p.price) || 0;

                // Ko'rsatma nomi: "AKFA 60 — Oq [Omborda: 72 m]"
                let displayName = [brend, seriya, uzunlik].filter(Boolean).join(' ');
                if (rangi) displayName += ` — ${rangi}`;
                displayName = displayName || p.product_name;

                return {
                    id: `ombor-${p.id}`,
                    name: displayName,
                    fullName: p.product_name,
                    price, unit, stock: qty,
                    brend, seriya, rangi,
                    label: `${displayName} [Omborda: ${qty.toLocaleString('uz-UZ')} ${unit}]`
                };
            });

            window._omborProfillar = omborProfillar;

            // Profil type-lari uchun bir xil ro'yxat (rom, rom_fortochka, eshik)
            AVAILABLE_MATERIALS.rom = omborProfillar;
            AVAILABLE_MATERIALS.rom_fortochka = omborProfillar;
            AVAILABLE_MATERIALS.eshik = omborProfillar;

            // --- 3 ta kaskad Tom Select filtrlarini ishga tushirish ---
            if (window.TomSelect && document.getElementById('pfBrand')) {
                const initTs = (id) => {
                    const el = document.getElementById(id);
                    if (!el) return null;
                    if (el.tomselect) el.tomselect.destroy();
                    return new window.TomSelect(el, {
                        create: false, sortField: { field: 'text', direction: 'asc' }
                    });
                };

                _tsFilterBrand  = initTs('pfBrand');
                _tsFilterSeries = initTs('pfSeries');
                _tsFilterColor  = initTs('pfColor');

                // Yordamchi: unikal qiymatlar to'plami
                const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();

                function fillBrandOptions(profillar) {
                    if (!_tsFilterBrand) return;
                    _tsFilterBrand.clearOptions();
                    _tsFilterBrand.addOption([{ value: '', text: 'Barchasi' }]);
                    uniq(profillar.map(p => p.brend)).forEach(b => {
                        _tsFilterBrand.addOption({ value: b, text: b });
                    });
                    _tsFilterBrand.setValue('', true);
                }

                function fillSeriesOptions(profillar, brand) {
                    if (!_tsFilterSeries) return;
                    const filtered = brand ? profillar.filter(p => p.brend === brand) : profillar;
                    _tsFilterSeries.clearOptions();
                    _tsFilterSeries.addOption([{ value: '', text: 'Barchasi' }]);
                    uniq(filtered.map(p => p.seriya)).forEach(s => {
                        _tsFilterSeries.addOption({ value: s, text: s });
                    });
                    _tsFilterSeries.setValue('', true);
                }

                function fillColorOptions(profillar, brand, series) {
                    if (!_tsFilterColor) return;
                    let filtered = profillar;
                    if (brand)  filtered = filtered.filter(p => p.brend  === brand);
                    if (series) filtered = filtered.filter(p => p.seriya === series);
                    _tsFilterColor.clearOptions();
                    _tsFilterColor.addOption([{ value: '', text: 'Barchasi' }]);
                    uniq(filtered.map(p => p.rangi)).forEach(r => {
                        _tsFilterColor.addOption({ value: r, text: r });
                    });
                    _tsFilterColor.setValue('', true);
                }

                function applyFiltersToMaterial() {
                    const brand  = _tsFilterBrand?.getValue()  || '';
                    const series = _tsFilterSeries?.getValue() || '';
                    const color  = _tsFilterColor?.getValue()  || '';

                    const type = document.getElementById('itemType')?.value;
                    let pool = AVAILABLE_MATERIALS[type] || omborProfillar;

                    if (brand)  pool = pool.filter(p => p.brend  === brand);
                    if (series) pool = pool.filter(p => p.seriya === series);
                    if (color)  pool = pool.filter(p => p.rangi  === color);

                    // itemMaterial-ni qayta to'ldirish
                    const sel = document.getElementById('itemMaterial');
                    if (!sel) return;
                    sel.innerHTML = '';
                    if (pool.length === 0) {
                        const opt = document.createElement('option');
                        opt.value = '';
                        opt.textContent = '⚠️ Mos profil topilmadi';
                        sel.appendChild(opt);
                    } else {
                        pool.forEach(m => {
                            const opt = document.createElement('option');
                            opt.value = m.id;
                            opt.textContent = m.label || m.name;
                            opt.dataset.name  = m.name || m.fullName || '';
                            opt.dataset.price = m.price || 0;
                            opt.dataset.unit  = m.unit  || 'm';
                            opt.dataset.stock = m.stock ?? '';
                            sel.appendChild(opt);
                        });
                    }
                }

                // Kaskad hodisalari
                if (_tsFilterBrand) {
                    _tsFilterBrand.on('change', (brand) => {
                        fillSeriesOptions(omborProfillar, brand);
                        fillColorOptions(omborProfillar, brand, '');
                        applyFiltersToMaterial();
                    });
                }
                if (_tsFilterSeries) {
                    _tsFilterSeries.on('change', (series) => {
                        const brand = _tsFilterBrand?.getValue() || '';
                        fillColorOptions(omborProfillar, brand, series);
                        applyFiltersToMaterial();
                    });
                }
                if (_tsFilterColor) {
                    _tsFilterColor.on('change', () => applyFiltersToMaterial());
                }

                // Boshlang'ich to'ldirish
                fillBrandOptions(omborProfillar);
                fillSeriesOptions(omborProfillar, '');
                fillColorOptions(omborProfillar, '', '');
                applyFiltersToMaterial();

                // Profil turi o'zgarganda filtrlarni qayta ko'rsatish/yashirish
                const filterRow = document.getElementById('profilFilterRow');
                document.getElementById('itemType')?.addEventListener('change', (e) => {
                    const isProfile = ['rom','rom_fortochka','eshik'].includes(e.target.value);
                    if (filterRow) filterRow.style.display = isProfile ? 'grid' : 'none';
                    applyFiltersToMaterial();
                });

                window._applyProfilFilters = applyFiltersToMaterial;
            } else {
                // Tom Select mavjud bo'lmasa oddiy to'ldirish
                if (typeof updateConstructorFields === 'function') updateConstructorFields();
            }

        } catch (err) {
            console.warn('loadOmborMaterials xatoligi:', err);
        }
    }

    let orderItems = [];

    // Eslatma: eski "material_requests" (Skayner QR Qabul) avtomatik yaratish tizimi olib
    // tashlandi — endi yagona chiqim yo'li Ombor > "Olingan Buyurtmalar" > confirmOrderMaterials(),
    // material_estimate (computeMaterialEstimate) asosida ishlaydi.

    // Dynamic Constructor Input Fields Toggling
    const itemTypeSel = document.getElementById('itemType');
    const itemMaterialSel = document.getElementById('itemMaterial');
    const itemHeightInput = document.getElementById('itemHeight');
    const itemWidthInput = document.getElementById('itemWidth');
    const dimLabel = document.getElementById('dimLabel');
    const materialLabel = document.getElementById('materialLabel');

    function updateConstructorFields() {
        const type = itemTypeSel.value;
        const materials = AVAILABLE_MATERIALS[type] || [];

        // Ombordagi real profillarni ko'rsatish
        itemMaterialSel.innerHTML = '';
        if (materials.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '⚠️ Omborda profil mavjud emas';
            itemMaterialSel.appendChild(opt);
        } else {
            materials.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                // Agar ombor maʼlumotlari bo'lsa, label ishlatiladi (zaxira bilan)
                opt.textContent = m.label ||
                    `${m.name} — ${(m.price || 0).toLocaleString()} so'm/${m.unit}`;
                opt.dataset.name = m.name || m.fullName || '';
                opt.dataset.price = m.price || 0;
                opt.dataset.unit = m.unit || 'm';
                opt.dataset.stock = m.stock ?? '';
                itemMaterialSel.appendChild(opt);
            });
        }

        const dimWrapper = document.getElementById('dimWrapper');
        const dimX = document.getElementById('dimX');

        if (type === 'rom' || type === 'rom_fortochka' || type === 'eshik') {
            // Full dimension: Width x Height (mm)
            dimWrapper.style.display = 'block';
            itemHeightInput.style.display = '';
            if (dimX) dimX.style.display = '';
            itemWidthInput.style.display = '';
            dimLabel.textContent = "O'lcham (Eni x Bo'yi) mm";
            materialLabel.textContent = "Profil (Material)";

        } else if (type === 'padakonnik') {
            // Width only (length in mm)
            dimWrapper.style.display = 'block';
            itemHeightInput.style.display = 'none';
            if (dimX) dimX.style.display = 'none';
            itemWidthInput.style.display = '';
            itemWidthInput.value = "1500";
            dimLabel.textContent = "Uzunligi (mm)";
            materialLabel.textContent = "Padakonnik turi";

        } else {
            // Accessories — no dimensions needed
            dimWrapper.style.display = 'none';
            materialLabel.textContent = type === 'aksesuar_rom' ? "Rom Aksesuari" : "Eshik Aksesuari";
        }
    }

    if (itemTypeSel) {
        itemTypeSel.addEventListener('change', updateConstructorFields);
        updateConstructorFields(); // initial setup
    }

    // ── 3D Preview (Rom / Eshik) ──
    let _viewer = null;
    const canvas3d = document.getElementById('preview3dCanvas');
    const empty3d = document.getElementById('preview3dEmpty');
    const preview3dWrap = document.getElementById('preview3dWrap');
    const designerWrap = document.getElementById('designer2dWrap');
    const designerHost = document.getElementById('designer2dHost');
    let _designer = null;
    function ensureDesigner() {
        if (!_designer && designerHost) {
            _designer = createDesigner(designerHost, {
                W: parseInt(itemWidthInput.value) || 1500,
                H: parseInt(itemHeightInput.value) || 2000,
                onChange: () => {
                    if (window.update3DPreview) window.update3DPreview();
                }
            });
        }
        return _designer;
    }
    const impostWrap = document.getElementById('impostWrapper');
    const stvorkaWrap = document.getElementById('stvorkaWrapper');
    const openTypeWrap = document.getElementById('openTypeWrapper');
    const vDivInp = document.getElementById('itemVDiv');
    const hDivInp = document.getElementById('itemHDiv');
    const stvInp = document.getElementById('itemStvorka');
    const openTypeInp = document.getElementById('itemOpenType');
    const archInp = document.getElementById('itemArch');
    const archWrap = document.getElementById('archWrapper');

    function ensureViewer() {
        if (!_viewer && canvas3d) {
            try { _viewer = createViewer(canvas3d); } catch (e) { console.warn('3D init xato:', e); }
        }
        return _viewer;
    }

    const toggle3dOpenBtn = document.getElementById('toggle3dOpenBtn');
    let is3dOpen = false;
    if (toggle3dOpenBtn) {
        toggle3dOpenBtn.addEventListener('click', () => {
            is3dOpen = !is3dOpen;
            toggle3dOpenBtn.innerHTML = is3dOpen ? '🚪 Tavaqalarni Yopish' : '🚪 Tavaqalarni Ochish';
            toggle3dOpenBtn.style.background = is3dOpen ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 210, 255, 0.1)';
            toggle3dOpenBtn.style.borderColor = is3dOpen ? '#ef4444' : 'rgba(0, 210, 255, 0.4)';
            toggle3dOpenBtn.style.color = is3dOpen ? '#ef4444' : '#00d2ff';
            const v = ensureViewer();
            if (v && v.setOpenState) {
                v.setOpenState(is3dOpen);
            }
        });
    }

    const reset3dCameraBtn = document.getElementById('reset3dCameraBtn');
    if (reset3dCameraBtn) {
        reset3dCameraBtn.addEventListener('click', () => {
            const v = ensureViewer();
            if (v && v.resetCamera) v.resetCamera();
        });
    }

    const color3dBtns = document.querySelectorAll('.color3d-btn');
    color3dBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            color3dBtns.forEach(b => {
                b.style.border = '1px solid rgba(255,255,255,0.3)';
                b.classList.remove('active');
            });
            btn.style.border = '2px solid #00d2ff';
            btn.classList.add('active');
            
            const colorKey = btn.dataset.color;
            const v = ensureViewer();
            if (v && v.setProfileColor) v.setProfileColor(colorKey);
        });
    });

    window.update3DPreview = function update3D() {
        const type = itemTypeSel ? itemTypeSel.value : 'rom';
        const isRom = ['rom', 'rom_fortochka', 'eshik'].includes(type);
        const isEshik = false;
        const stv = parseInt(stvInp && stvInp.value) || 0;
        // Sodda maydonlar (impost/stvorka/ochilish) — faqat eshik; romда dizayner boshqaradi
        if (impostWrap) impostWrap.style.display = isEshik ? '' : 'none';
        if (stvorkaWrap) stvorkaWrap.style.display = isEshik ? '' : 'none';
        if (openTypeWrap) openTypeWrap.style.display = (isEshik && stv > 0) ? '' : 'none';
        if (archWrap) archWrap.style.display = isRom ? '' : 'none';
        // Ko'rinish: rom → 2D dizayner + 3D, eshik/boshqalar → 3D
        if (designerWrap) designerWrap.style.display = isRom ? 'block' : 'none';
        if (preview3dWrap) preview3dWrap.style.display = (isRom || isEshik) ? 'block' : 'none';
        if (canvas3d) canvas3d.style.display = (isRom || isEshik) ? 'block' : 'none';
        if (empty3d) empty3d.style.display = (isRom || isEshik) ? 'none' : 'flex';

        if (isRom) {
            const d = ensureDesigner();
            if (d) d.setSize(parseInt(itemWidthInput.value) || 1500, parseInt(itemHeightInput.value) || 2000);
            
            const v = ensureViewer();
            if (v) {
                v.resize();
                const designModel = d ? d.getModel() : null;
                v.update({
                    type,
                    width: (parseInt(itemWidthInput.value) || 1500) / 1000,
                    height: (parseInt(itemHeightInput.value) || 2000) / 1000,
                    design: designModel,
                    arch: document.getElementById('itemArch')?.checked || false
                });
            }
            return;
        }
        if (isEshik) {
            const v = ensureViewer();
            if (!v) return;
            v.resize();
            v.update({
                type,
                width: parseFloat(itemWidthInput.value) || 1.5,
                height: parseFloat(itemHeightInput.value) || 2.0,
                vDiv: parseInt(vDivInp && vDivInp.value) || 0,
                hDiv: parseInt(hDivInp && hDivInp.value) || 0,
                stvorka: stv,
                openType: openTypeInp ? openTypeInp.value : 'kasement_chap',
                arch: false
            });
        }
    };

    if (itemTypeSel) itemTypeSel.addEventListener('change', window.update3DPreview);
    [itemHeightInput, itemWidthInput, vDivInp, hDivInp, stvInp].forEach(el => {
        if (el) el.addEventListener('input', window.update3DPreview);
    });
    if (openTypeInp) openTypeInp.addEventListener('change', window.update3DPreview);
    if (archInp) archInp.addEventListener('change', window.update3DPreview);

    // Add Item to Basket
    const addItemBtn = document.getElementById('addItemBtn');
    if (addItemBtn) {
        addItemBtn.onclick = () => {
            const type = itemTypeSel.value;
            const matOpt = itemMaterialSel.options[itemMaterialSel.selectedIndex];
            if (!matOpt) return alert('Material tanlang!');

            const hMM = parseInt(itemHeightInput.value) || 0;
            const wMM = parseInt(itemWidthInput.value) || 0;
            const h = hMM / 1000; // metrga aylantirish (hisob uchun)
            const w = wMM / 1000;
            const qty = parseInt(document.getElementById('itemQty').value) || 1;

            if (qty <= 0) return alert('Miqdorni to\'g\'ri kiriting!');

            let sizeText = '';
            let calcVal = 0; // area or length
            let itemPrice = parseFloat(matOpt.dataset.price) || 0;
            let subtotal = 0;

            if (type === 'rom' || type === 'rom_fortochka' || type === 'eshik') {
                if (hMM <= 0 || wMM <= 0) return alert('Eni va bo\'yini kiriting!');
                sizeText = `${wMM} x ${hMM} mm`;
                calcVal = h * w * qty; // total area in sq.m
                subtotal = (calcVal * itemPrice) + (PRODUCTION_COST * qty); // material cost + base assembly fee
            } else if (type === 'padakonnik') {
                if (wMM <= 0) return alert('Uzunlikni kiriting!');
                sizeText = `${wMM} mm`;
                calcVal = w * qty; // total length
                subtotal = calcVal * itemPrice;
            } else {
                sizeText = '---';
                calcVal = qty; // piece count
                subtotal = qty * itemPrice;
            }

            const item = {
                type: type,
                typeName: type === 'rom' ? 'Rom' : type === 'rom_fortochka' ? 'Rom (Fortochkali)' : type === 'eshik' ? 'Eshik' : type === 'padakonnik' ? 'Padakonnik' : 'Aksesuar',
                materialId: matOpt.value,
                materialName: matOpt.dataset.name,
                profPricePerM: itemPrice,
                height: h,
                width: w,
                quantity: qty,
                vDiv: parseInt(document.getElementById('itemVDiv')?.value) || 0,
                hDiv: parseInt(document.getElementById('itemHDiv')?.value) || 0,
                stvorka: parseInt(document.getElementById('itemStvorka')?.value) || 0,
                openType: document.getElementById('itemOpenType')?.value || 'kasement_chap',
                arch: document.getElementById('itemArch')?.checked || false,
                design: (['rom', 'rom_fortochka', 'eshik'].includes(type) && _designer) ? _designer.getModel() : null,
                calcVal: calcVal,
                subtotal: subtotal,
                unit: matOpt.dataset.unit
            };

            orderItems.push(item);
            renderBasket();
            calculateTotal();

            // Reset item qty
            document.getElementById('itemQty').value = '1';

            // 2D dizaynerni bo'sh holatga qaytarish — element savatga qo'shilgach,
            // eski chizma qolib ketmasdan, keyingi elementni yangidan chizish uchun
            if (['rom', 'rom_fortochka', 'eshik'].includes(type) && _designer) {
                _designer.reset(parseInt(itemWidthInput.value) || 1500, parseInt(itemHeightInput.value) || 2000);
            }
            is3dOpen = false;
            if (toggle3dOpenBtn) {
                toggle3dOpenBtn.innerHTML = '🚪 Tavaqalarni Ochish';
                toggle3dOpenBtn.style.background = 'rgba(0, 210, 255, 0.1)';
                toggle3dOpenBtn.style.borderColor = 'rgba(0, 210, 255, 0.4)';
                toggle3dOpenBtn.style.color = '#00d2ff';
            }
            const vTemp = ensureViewer();
            if (vTemp && vTemp.setOpenState) vTemp.setOpenState(false);
        };
    }

    window.removeBasketItem = (index) => {
        orderItems.splice(index, 1);
        renderBasket();
        calculateTotal();
    };

    function renderBasket() {
        const body = document.getElementById('basketTableBody');
        if (!body) return;
        body.innerHTML = '';

        if (orderItems.length === 0) {
            body.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--adm-text-sec); font-size:0.85rem;">Savat bo'sh. Element qo'shing.</td></tr>`;
            return;
        }

        orderItems.forEach((it, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="status-pill" style="background:rgba(255,255,255,0.05); color:#fff;">${it.typeName}</span></td>
                <td><strong>${it.materialName}</strong></td>
                <td>${it.sizeText || (it.height > 0 ? `${it.height}x${it.width}` : (it.width > 0 ? `${it.width}m` : '---'))}</td>
                <td>${it.quantity} ta</td>
                <td>${it.calcVal.toFixed(2)} ${it.unit}</td>
                <td style="font-weight:600; color:#00ff88;">${it.subtotal.toLocaleString()} so'm</td>
                <td><button onclick="removeBasketItem(${idx})" style="background:transparent; border:none; color:#ff4d4f; font-weight:bold; cursor:pointer;">✖</button></td>
            `;
            body.appendChild(tr);
        });
    }

    // Buyurtma elementlaridan (2D dizayner o'lchamlari asosida) taxminiy profil metri
    // va aksessuar ro'yxatini avtomatik hisoblaydi — Sotuv qo'lda BOM kiritmaydi,
    // Ombor shu hisobga qarab tasdiqlaydi/ombordan ajratadi.
    function computeMaterialEstimate(items) {
        // profilesById: key = product_id (real romix_inventory id), value = {name, meters}
        const profilesById = {};
        const accessoriesByName = {};
        (items || []).forEach(it => {
            if (it.type === 'rom' || it.type === 'rom_fortochka' || it.type === 'eshik') {
                // Rama perimetri + impostlar (taxminiy, 10% zaxira bilan)
                const perimeter = 2 * (it.width + it.height);
                const impostLen = (it.vDiv || 0) * it.height + (it.hDiv || 0) * it.width;
                const perUnit = (perimeter + impostLen) * 1.10;
                const meters = perUnit * it.quantity;
                const key = it.materialId || it.materialName;
                if (!profilesById[key]) {
                    profilesById[key] = {
                        material_name: it.materialName,
                        // romix_inventory real id ("ombor-" prefiksi olib tashlanadi)
                        product_id: it.materialId ? it.materialId.replace('ombor-', '') : null,
                        meters: 0
                    };
                }
                profilesById[key].meters += meters;
            } else if (it.type === 'padakonnik') {
                const meters = it.width * it.quantity;
                const key = it.materialId || it.materialName;
                if (!profilesById[key]) {
                    profilesById[key] = {
                        material_name: it.materialName,
                        product_id: it.materialId ? it.materialId.replace('ombor-', '') : null,
                        meters: 0
                    };
                }
                profilesById[key].meters += meters;
            } else if (it.type === 'aksesuar_rom' || it.type === 'aksesuar_eshik') {
                accessoriesByName[it.materialName] = (accessoriesByName[it.materialName] || 0) + it.quantity;
            }
        });
        return {
            profiles: Object.values(profilesById).map(p => ({
                ...p,
                meters: Math.round(p.meters * 100) / 100
            })),
            accessories: Object.entries(accessoriesByName).map(([name, qty]) => ({ name, qty }))
        };
    }

    // Summa maydonlari (Avans) uchun — 1000000 o'rniga "1 000 000" ko'rinishida bo'shliq bilan ajratib ko'rsatish
    function formatMoneyInput(el) {
        const cursorFromEnd = el.value.length - el.selectionStart;
        const digits = el.value.replace(/\D/g, '');
        const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        el.value = formatted;
        const pos = Math.max(0, formatted.length - cursorFromEnd);
        el.setSelectionRange(pos, pos);
    }
    function parseMoneyInput(el) {
        return parseFloat((el?.value || '').replace(/\s/g, '')) || 0;
    }

    function calculateTotal() {
        let totalArea = 0;
        let totalMaterials = 0; // Tan narxi (materiallar narxi)
        let totalInstall = 0;
        const wantsInstall = !!document.getElementById('oInstall')?.checked;

        orderItems.forEach(it => {
            totalMaterials += it.subtotal;
            if (it.type === 'rom' || it.type === 'rom_fortochka' || it.type === 'eshik') {
                totalArea += (it.height * it.width * it.quantity);
            }
        });

        // Ishxona harajatlari — tan narxning 10%i (matnda foiz ko'rsatilmaydi, lekin hisobga qo'shiladi)
        const expenses = totalMaterials * 0.10;

        // Foyda foizi
        const profitPercent = parseFloat(document.getElementById('oProfitPercent')?.value) || 0;
        const profit = totalMaterials * (profitPercent / 100);

        if (wantsInstall) {
            totalInstall = totalArea * INSTALLATION_PRICE_PER_SQM;
        }

        const grandTotal = totalMaterials + expenses + profit + totalInstall;

        if (document.getElementById('cArea')) document.getElementById('cArea').textContent = totalArea.toFixed(2) + ' kv.m';
        if (document.getElementById('cMaterial')) document.getElementById('cMaterial').textContent = totalMaterials.toLocaleString() + " so'm";
        if (document.getElementById('cExpenses')) document.getElementById('cExpenses').textContent = expenses.toLocaleString() + " so'm";
        if (document.getElementById('cProfit')) document.getElementById('cProfit').textContent = profit.toLocaleString() + " so'm";
        if (document.getElementById('cInstall')) document.getElementById('cInstall').textContent = totalInstall.toLocaleString() + " so'm";
        if (document.getElementById('cTotal')) document.getElementById('cTotal').textContent = grandTotal.toLocaleString() + " so'm";

        window.updateAdvancePercent && window.updateAdvancePercent(grandTotal);

        return { totalArea, totalMaterials, totalInstall, grandTotal, expenses, profit };
    }

    // Avans foizini jonli ko'rsatish (50% chegarasi — Ishlab Chiqarishga o'tkazish uchun)
    window.updateAdvancePercent = (knownGrandTotal) => {
        const advInput = document.getElementById('oAdvance');
        const hint = document.getElementById('oAdvancePercentHint');
        if (!advInput || !hint) return;
        const grandTotal = knownGrandTotal !== undefined ? knownGrandTotal : calculateTotal().grandTotal;
        const advance = parseMoneyInput(advInput);
        const percent = grandTotal > 0 ? Math.round((advance / grandTotal) * 100) : 0;
        const ok = percent >= 50;
        hint.style.color = ok ? '#00ff88' : '#ef4444';
        hint.textContent = ok
            ? `✅ Jami summaning ${percent}% — Ishlab Chiqarishga o'tkaziladi`
            : `⚠️ Jami summaning ${percent}% — 50% dan kam, buyurtma Ishlab Chiqarishga o'tmaydi (keyinroq to'ldirib qo'yish mumkin)`;
    };

    const installCheck = document.getElementById('oInstall');
    if (installCheck) {
        installCheck.addEventListener('change', calculateTotal);
    }
    const profitInput = document.getElementById('oProfitPercent');
    if (profitInput) {
        profitInput.addEventListener('input', calculateTotal);
    }
    const oAdvanceInput = document.getElementById('oAdvance');
    if (oAdvanceInput) {
        oAdvanceInput.addEventListener('input', () => {
            formatMoneyInput(oAdvanceInput);
            window.updateAdvancePercent();
        });
    }
    const eAdvanceInput = document.getElementById('eAdvance');
    if (eAdvanceInput) {
        eAdvanceInput.addEventListener('input', () => formatMoneyInput(eAdvanceInput));
    }

    async function loadOrders() {
        let orders = [];
        try {
            const { data, error } = await supabase.from('sales_orders').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            orders = data || [];
            localStorage.setItem('romix_orders_local', JSON.stringify(orders));
        } catch (err) {
            console.warn("Supabase loadOrders fetch failed, using local storage:", err);
            const localRaw = localStorage.getItem('romix_orders_local');
            if (localRaw) {
                orders = JSON.parse(localRaw);
            } else {
                orders = [
                    {
                        id: "ord-1",
                        customer_name: "Toshpo'latov Sanjar",
                        customer_phone: "+998 90 123 45 67",
                        tg_user: "@sanjar_t",
                        prod_type: "Rom, Aksesuar",
                        model_name: "Akfa 70 Series Profil + Rom Ruchkasi",
                        width: 1.5,
                        height: 2.0,
                        quantity: 4,
                        sq_meter: 12.0,
                        production_cost: 4000000,
                        installation_cost: 3000000,
                        total_price: 7000000,
                        payment_type: "Naqd",
                        deadline_date: new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0],
                        status: "Kutilmoqda",
                        worker_group: "",
                        created_at: new Date(Date.now() - 1*24*60*60*1000).toISOString()
                    },
                    {
                        id: "ord-2",
                        customer_name: "Mirzaev Otabek",
                        customer_phone: "+998 99 888 77 66",
                        tg_user: "@otabek_m",
                        prod_type: "Eshik",
                        model_name: "Thermo 65 Insulation Profil",
                        width: 0.9,
                        height: 2.1,
                        quantity: 2,
                        sq_meter: 3.78,
                        production_cost: 2000000,
                        installation_cost: 945000,
                        total_price: 2945000,
                        payment_type: "Karta",
                        deadline_date: new Date(Date.now() + 2*24*60*60*1000).toISOString().split('T')[0],
                        status: "Jarayonda",
                        worker_group: "Brigada 1 (Alijon)",
                        created_at: new Date(Date.now() - 3*24*60*60*1000).toISOString()
                    },
                    {
                        id: "ord-3",
                        customer_name: "Karimov Sherzod",
                        customer_phone: "+998 93 456 12 34",
                        tg_user: "@sherzod_k",
                        prod_type: "Rom",
                        model_name: "Akfa 60 Series Profil",
                        width: 1.2,
                        height: 1.5,
                        quantity: 1,
                        sq_meter: 1.8,
                        production_cost: 1000000,
                        installation_cost: 450000,
                        total_price: 1450000,
                        payment_type: "Naqd",
                        deadline_date: new Date(Date.now() - 2*24*60*60*1000).toISOString().split('T')[0],
                        status: "Tayyor / Yetkazildi",
                        worker_group: "Brigada 2 (Sardor)",
                        created_at: new Date(Date.now() - 10*24*60*60*1000).toISOString()
                    }
                ];
                localStorage.setItem('romix_orders_local', JSON.stringify(orders));
            }
        }

        // Ishlab chiqarish bosqichi bo'yicha aniq holat matni (Sotuv'ga ko'rinadigan)
        const STAGE_LABELS = {
            kesish: { text: "✂️ Kesilmoqda", color: '#00d2ff' },
            payvandlash: { text: "🔥 Payvandlanmoqda", color: '#00d2ff' },
            yigish_qadoqlash: { text: "📦 Yig'ish/Qadoqlanmoqda", color: '#00d2ff' },
            tayyor_omborda: { text: "🏬 Tayyor (Omborda)", color: '#00ff88' }
        };
        function stageStatusHtml(o) {
            if (o.status === 'Tayyor / Yetkazildi') return null; // fallback to base pill
            if (o.production_stage && STAGE_LABELS[o.production_stage]) {
                const s = STAGE_LABELS[o.production_stage];
                return `<span style="background:${s.color}1a; color:${s.color}; padding:3px 10px; border-radius:12px; font-size:0.66rem; font-weight:700; white-space:nowrap;">${s.text}</span>`;
            }
            if (o.ombor_confirmed_at) {
                return `<span style="background:rgba(0,210,255,0.1); color:#00d2ff; padding:3px 10px; border-radius:12px; font-size:0.66rem; font-weight:700; white-space:nowrap;">✅ Ishlab chiqarish qabul qilishi kutilmoqda</span>`;
            }
            const total = Number(o.total_price) || 0;
            const paid = Number(o.paid_amount) || 0;
            const percent = total > 0 ? Math.round((paid / total) * 100) : 0;
            if (percent >= 50) {
                return `<span style="background:rgba(239,68,68,0.1); color:#ef4444; padding:3px 10px; border-radius:12px; font-size:0.66rem; font-weight:700; white-space:nowrap;">⏳ Ombor tayyorlashini kutmoqda</span>`;
            }
            return null;
        }
        // Buyurtma tayyor bo'lish muddati bo'yicha qattiq nazorat belgisi
        function deadlineBadgeHtml(o) {
            if (!o.production_deadline || o.status === 'Tayyor / Yetkazildi') return '';
            return `<div class="countdown-live" data-target="${o.production_deadline}" style="font-size:0.72rem; font-weight:700; margin-top:2px;"></div>`;
        }

        // Avans (50% chegarasi) holati — Ishlab Chiqarishga o'tish uchun kerak
        function advanceBadgeHtml(o) {
            const total = Number(o.total_price) || 0;
            const paid = Number(o.paid_amount) || 0;
            const percent = total > 0 ? Math.round((paid / total) * 100) : 0;
            const ok = percent >= 50;
            const color = ok ? '#00ff88' : (paid > 0 ? '#ffaa00' : '#ef4444');
            const whoWhen = o.advance_received_by
                ? ` — ${o.advance_received_by}${o.payment_date ? ' (' + new Date(o.payment_date).toLocaleDateString('uz-UZ') + ')' : ''}`
                : '';
            return `<div style="font-size:0.72rem; color:${color}; font-weight:700;" title="Avans: ${paid.toLocaleString()} so'm${whoWhen}">
                💰 Avans: ${paid.toLocaleString()} so'm (${percent}%)${ok ? ' ✅' : ' ⚠️'}${whoWhen}
            </div>`;
        }

        // Jonli teskari sanoq: har soniya barcha ".countdown-live" belgilarini yangilaydi
        function tickCountdowns() {
            document.querySelectorAll('.countdown-live').forEach(el => {
                const target = new Date(el.dataset.target);
                target.setHours(23, 59, 59, 999); // muddat kunining oxirigacha
                const diffMs = target.getTime() - Date.now();
                const overdue = diffMs < 0;
                const absMs = Math.abs(diffMs);
                const days = Math.floor(absMs / 86400000);
                const hours = Math.floor((absMs % 86400000) / 3600000);
                const mins = Math.floor((absMs % 3600000) / 60000);
                const secs = Math.floor((absMs % 60000) / 1000);
                const pad = (n) => String(n).padStart(2, '0');
                let color;
                if (overdue) color = '#ef4444';
                else if (days === 0 && hours < 6) color = '#ef4444';
                else if (days <= 2) color = '#ffaa00';
                else color = '#00ff88';
                el.style.color = color;
                el.textContent = overdue
                    ? `⚠️ Muddati o'tdi! ${days}k ${pad(hours)}:${pad(mins)}:${pad(secs)} oldin`
                    : `⏰ ${days}k ${pad(hours)}:${pad(mins)}:${pad(secs)} qoldi`;
            });
        }
        if (!window.__romixCountdownStarted) {
            window.__romixCountdownStarted = true;
            setInterval(tickCountdowns, 1000);
        }

        // Clear views
        const table = document.getElementById('ordersTable');
        if (table) table.innerHTML = '';

        let totalSum = 0;
        let count = 0;

        orders.forEach(o => {
            totalSum += parseFloat(o.total_price || 0);
            count++;

            // Shared status: premium accent rangi + belgi (Buxgalteriya'dagi zakaz bosqichlari bilan bir xil)
            let statusColor = '#ffaa00', statusHtml = '';
            if (o.status === 'Kutilmoqda') {
                statusColor = '#ffaa00';
                statusHtml = `<span class="status-pill status-pending" style="background:rgba(255,170,0,0.1); color:#ffaa00; padding:3px 10px; border-radius:12px; font-size:0.66rem; font-weight:700; white-space:nowrap;">📝 Kutilmoqda</span>`;
            } else if (o.status === 'Jarayonda') {
                statusColor = '#00d2ff';
                statusHtml = `<span class="status-pill status-active" style="background:rgba(0,210,255,0.1); color:#00d2ff; padding:3px 10px; border-radius:12px; font-size:0.66rem; font-weight:700; white-space:nowrap;">⚙️ Ishlab chiqarishda</span>`;
            } else {
                statusColor = '#00ff88';
                statusHtml = `<span class="status-pill status-delivered" style="background:rgba(0,255,136,0.1); color:#00ff88; padding:3px 10px; border-radius:12px; font-size:0.66rem; font-weight:700; white-space:nowrap;">✅ Tayyor / O'rnatildi</span>`;
            }
            const refinedStageHtml = stageStatusHtml(o);
            if (refinedStageHtml) statusHtml = refinedStageHtml;
            const deadlineBadge = deadlineBadgeHtml(o);

            // --- Dashboard View (All Orders) — premium kartochka ---
            if (table) {
                const card = document.createElement('div');
                card.style.cssText = `border-top:3px solid ${statusColor}; border-radius:16px; background:var(--adm-surface); border:1px solid var(--adm-border); border-top:3px solid ${statusColor}; padding:16px; display:flex; flex-direction:column; gap:9px; box-shadow:var(--adm-shadow); transition:transform 0.2s;`;
                const modelShort = o.model_name && o.model_name.length > 50 ? o.model_name.slice(0, 48) + '...' : (o.model_name || '');
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                        <div style="min-width:0;">
                            <div style="font-weight:700; color:var(--adm-text); font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${o.customer_name}</div>
                            <div style="font-size:0.72rem; color:var(--adm-text-sec); margin-top:2px;">${o.customer_phone || ''}${o.customer_address ? ` <span title="${o.customer_address.replace(/"/g, '&quot;')}">📍</span>` : ''}</div>
                        </div>
                        ${statusHtml}
                    </div>
                    <div style="font-size:0.78rem; color:var(--adm-text-sec); border-top:1px dashed var(--adm-border); padding-top:8px;">
                        <div style="font-weight:600; color:var(--adm-text); margin-bottom:2px;">${o.prod_type || ''}</div>
                        <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${(o.model_name || '').replace(/"/g, '')}">${modelShort}</div>
                    </div>
                    <div style="font-size:0.75rem; color:var(--adm-text-sec);">⏳ Muddat: <strong style="color:var(--adm-text);">${new Date(o.deadline_date).toLocaleDateString()}</strong></div>
                    ${deadlineBadge}
                    ${o.status !== 'Tayyor / Yetkazildi' ? advanceBadgeHtml(o) : ''}
                    <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed var(--adm-border); padding-top:9px; margin-top:2px;">
                        <strong style="color:#00ff88; font-family:monospace; font-size:0.95rem;">${Number(o.total_price).toLocaleString()} UZS</strong>
                        <div>
                            <button class="action-icon view-ord-btn" data-order='${JSON.stringify(o).replace(/'/g, '&#39;')}' style="font-size:1.05rem; border:none; background:transparent; cursor:pointer;" title="Shartnomani ko'rish">👁️</button>
                            <button class="action-icon edit-btn" data-order='${JSON.stringify(o).replace(/'/g, '&#39;')}' style="font-size:1.05rem; border:none; background:transparent; cursor:pointer; margin: 0 4px;" title="Tahrirlash">✏️</button>
                            <button class="action-icon del-btn" data-id="${o.id}" style="font-size:1.05rem; border:none; background:transparent; cursor:pointer; color:red;" title="O'chirish">🗑️</button>
                        </div>
                    </div>
                `;
                card.style.cursor = 'pointer';
                card.onclick = (e) => { if (e.target.closest('button')) return; openOrderDetail(o); };
                table.appendChild(card);
            }
        });

        allOrders = orders;
        updatePeriodKpis();
        if (!ordersSummaryModal.classList.contains('hidden')) renderOrdersSummary();
        renderKanbanBoard();
        renderPaymentsView();

        tickCountdowns(); // darhol bo'yash, 1 soniya kutmasdan
        bindActionButtons();
    }

    // ═══════════ Buyurtma Harakat Grafigi — "Ishlab Chiqarish va O'rnatish" Kanban taxtasi ═══════════
    // Sotuv/Ombor/Ishlab Chiqarish/Showroom'dagi haqiqiy maydonlardan (status/paid_amount/ombor_confirmed_at/
    // production_stage/install_group/install_status) buyurtmaning joriy bosqichini aniqlaydi — DB'da alohida
    // "bosqich" ustuni yo'q, bularning barchasi mavjud maydonlar kombinatsiyasidan hisoblanadi.
    const KANBAN_STAGES = [
        { key: 'yangi', label: '🆕 Yangi Zakaz', color: '#94a3b8' },
        { key: 'avans_kutmoqda', label: '⏳ Avans Kutayotgan', color: '#ffaa00' },
        { key: 'ombor_tasdiqlamagan', label: '📦 Ombor Tasdiqlamagan', color: '#ef4444' },
        { key: 'navbatida', label: '🗂️ Ishlab Chiqarish Navbatida', color: '#a855f7' },
        { key: 'ishlab_chiqarilmoqda', label: '🏭 Ishlab Chiqarilmoqda', color: '#00d2ff' },
        { key: 'tayyor', label: '✅ Buyurtma Tayyor', color: '#22c55e' },
        { key: 'ornatilishda', label: "🚚 O'rnatilish Jarayonida", color: '#6366f1' },
        { key: 'bajarilgan', label: '🏁 Bajarilgan', color: '#00ff88' }
    ];

    function getJourneyStage(o) {
        if (o.status === 'Tayyor / Yetkazildi') return 'bajarilgan';
        if (o.production_stage === 'tayyor_omborda') {
            return (o.install_group && o.install_status !== 'Bajarildi') ? 'ornatilishda' : 'tayyor';
        }
        if (['kesish', 'payvandlash', 'yigish_qadoqlash'].includes(o.production_stage)) return 'ishlab_chiqarilmoqda';
        if (o.status === 'Jarayonda') return 'navbatida'; // ombor tasdiqladi, ishlab chiqarish qabul qilishini kutmoqda
        const total = Number(o.total_price) || 0;
        const paid = Number(o.paid_amount) || 0;
        if (total > 0 && paid / total >= 0.5) return 'ombor_tasdiqlamagan'; // avans yetarli, ombor tasdig'ini kutmoqda
        if (paid > 0) return 'avans_kutmoqda';
        return 'yangi';
    }

    function renderKanbanBoard() {
        const board = document.getElementById('kanbanBoard');
        if (!board) return;
        board.innerHTML = '';
        KANBAN_STAGES.forEach(stage => {
            const stageOrders = allOrders.filter(o => getJourneyStage(o) === stage.key);
            const col = document.createElement('div');
            col.style.cssText = 'width:100%; display:flex; flex-direction:column; gap:10px;';
            const cardsHtml = stageOrders.length
                ? stageOrders.map(o => {
                    const total = Number(o.total_price) || 0;
                    const paid = Number(o.paid_amount) || 0;
                    const percent = total > 0 ? Math.round((paid / total) * 100) : 0;
                    const omborBadge = o.ombor_confirmed_at
                        ? `<div style="font-size:0.66rem; color:#00ff88;">✅ Ombor tasdiqladi — ${new Date(o.ombor_confirmed_at).toLocaleDateString('uz-UZ')}</div>`
                        : '';
                    const installBadge = o.install_group
                        ? `<div style="font-size:0.66rem; color:#6366f1;">🚚 Brigada: ${o.install_group}</div>`
                        : '';
                    return `
                        <div class="kanban-card" data-id="${o.id}" style="border-top:3px solid ${stage.color}; border-radius:14px; background:var(--adm-surface); border:1px solid var(--adm-border); border-top:3px solid ${stage.color}; padding:12px; display:flex; flex-direction:column; gap:6px; box-shadow:var(--adm-shadow); cursor:pointer;">
                            <div style="font-weight:700; color:var(--adm-text); font-size:0.82rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${o.customer_name}</div>
                            <div style="font-size:0.7rem; color:var(--adm-text-sec);">${o.prod_type || ''}</div>
                            <div style="font-size:0.7rem; color:var(--adm-text-sec);">💰 ${paid.toLocaleString()} / ${total.toLocaleString()} so'm (${percent}%)</div>
                            ${omborBadge}
                            ${installBadge}
                            <div style="font-size:0.68rem; color:var(--adm-text-sec); border-top:1px dashed var(--adm-border); padding-top:5px;">⏳ Muddat: ${o.production_deadline ? new Date(o.production_deadline).toLocaleDateString('uz-UZ') : '---'}</div>
                        </div>
                    `;
                }).join('')
                : `<div style="grid-column:1/-1; text-align:center; color:var(--adm-text-sec); font-size:0.75rem; padding:14px 0;">Bo'sh</div>`;
            col.innerHTML = `
                <div style="background:${stage.color}1a; border-radius:12px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:${stage.color}; font-size:0.78rem;">${stage.label}</strong>
                    <span style="background:${stage.color}; color:#000; border-radius:10px; padding:2px 9px; font-size:0.72rem; font-weight:800;">${stageOrders.length}</span>
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px;">${cardsHtml}</div>
            `;
            col.querySelectorAll('.kanban-card').forEach(cardEl => {
                cardEl.onclick = () => {
                    const o = allOrders.find(x => x.id === cardEl.dataset.id);
                    if (o) openOrderDetail(o);
                };
            });
            board.appendChild(col);
        });
    }

    // ═══════════ Kunlik/Haftalik/Oylik kartochkalar — bosilganda ochiladigan tafsilot (bosqich/to'lov tarixi bilan) ═══════════
    const ordersSummaryModal = document.getElementById('ordersSummaryModal');
    const orderDetailModal = document.getElementById('orderDetailModal');
    let currentSummaryPeriod = 'today';
    let currentSummaryStage = 'all';
    const PERIOD_LABELS = { today: 'Bugun', week: 'Bu hafta', month: 'Bu oy', all: 'Barchasi' };

    const STAGE_META = {
        yangi: { label: '🆕 Yangi buyurtma', color: '#ffaa00' },
        ishlab_chiqarishda: { label: '🏭 Ishlab chiqarishda', color: '#00d2ff' },
        ornatilishda: { label: "🚚 O'rnatilishda", color: '#a855f7' },
        bajarilgan: { label: '✅ Bajarilgan', color: '#00ff88' }
    };
    // Sotuv'dagi haqiqiy bosqichlar 3 status (Kutilmoqda/Jarayonda/Tayyor)+production_stage'ga qurilgan —
    // bu yerda foydalanuvchi so'ragan 4 bosqichli ko'rinishga moslaymiz (tayyor_omborda = O'rnatilishda kutmoqda/jarayonida).
    function getOrderStageKey(o) {
        if (o.status === 'Tayyor / Yetkazildi') return 'bajarilgan';
        if (o.status === 'Jarayonda') return o.production_stage === 'tayyor_omborda' ? 'ornatilishda' : 'ishlab_chiqarishda';
        return 'yangi';
    }

    function isInPeriod(dateStr, period) {
        if (period === 'all') return true;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const now = new Date();
        if (period === 'today') {
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
        }
        if (period === 'week') {
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 6);
            weekAgo.setHours(0, 0, 0, 0);
            return d >= weekAgo && d <= now;
        }
        if (period === 'month') {
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }
        return true;
    }

    // Bosh paneldagi Bugun/Bu hafta/Bu oy/Jami kartochkalari — buyurtma qabul qilingan sanasi (created_at) bo'yicha
    function updatePeriodKpis() {
        ['today', 'week', 'month', 'all'].forEach(period => {
            let sum = 0, cnt = 0;
            allOrders.forEach(o => {
                if (isInPeriod(o.created_at, period)) { sum += parseFloat(o.total_price || 0); cnt++; }
            });
            document.querySelectorAll(`.kpiPeriodSum[data-period="${period}"]`).forEach(el => el.textContent = sum.toLocaleString());
            document.querySelectorAll(`.kpiPeriodCount[data-period="${period}"]`).forEach(el => el.textContent = cnt + " ta buyurtma");
        });
    }

    function renderOrdersSummary() {
        document.getElementById('summaryTitle').textContent = `Buyurtmalar Tafsiloti — ${PERIOD_LABELS[currentSummaryPeriod]}`;
        document.querySelectorAll('.summary-period-btn').forEach(b => {
            const active = b.dataset.period === currentSummaryPeriod;
            b.style.background = active ? '#00d2ff' : 'transparent';
            b.style.color = active ? '#000' : 'var(--adm-text-sec)';
        });

        const periodOrders = allOrders.filter(o => isInPeriod(o.created_at, currentSummaryPeriod));

        // Bosqich bo'yicha guruhlash — filtr chip'lari (soni bilan)
        const buckets = { yangi: { count: 0 }, ishlab_chiqarishda: { count: 0 }, ornatilishda: { count: 0 }, bajarilgan: { count: 0 } };
        periodOrders.forEach(o => { buckets[getOrderStageKey(o)].count++; });

        const stageTabs = document.getElementById('summaryStageTabs');
        let chipsHtml = `<button class="summary-stage-chip" data-stage="all" style="border:none; background:${currentSummaryStage === 'all' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)'}; color:var(--adm-text); padding:9px 14px; border-radius:12px; font-size:0.76rem; font-weight:700; cursor:pointer;">Barchasi (${periodOrders.length})</button>`;
        Object.keys(STAGE_META).forEach(key => {
            const meta = STAGE_META[key];
            const active = currentSummaryStage === key;
            chipsHtml += `<button class="summary-stage-chip" data-stage="${key}" style="border:none; background:${active ? meta.color + '2a' : 'rgba(255,255,255,0.05)'}; color:${meta.color}; padding:9px 14px; border-radius:12px; font-size:0.76rem; font-weight:700; cursor:pointer; ${active ? `box-shadow: inset 0 0 0 1.5px ${meta.color};` : ''}">${meta.label} (${buckets[key].count})</button>`;
        });
        stageTabs.innerHTML = chipsHtml;
        stageTabs.querySelectorAll('.summary-stage-chip').forEach(b => {
            b.onclick = () => { currentSummaryStage = b.dataset.stage; renderOrdersSummary(); };
        });

        // Tanlangan davrda qabul qilingan / bajarilgan summalar
        let periodReceived = 0, periodCompleted = 0;
        periodOrders.forEach(o => {
            periodReceived += parseFloat(o.total_price || 0);
            if (o.status === 'Tayyor / Yetkazildi') periodCompleted += parseFloat(o.total_price || 0);
        });
        document.getElementById('summaryPeriodReceived').textContent = periodReceived.toLocaleString() + " so'm";
        document.getElementById('summaryPeriodCompleted').textContent = periodCompleted.toLocaleString() + " so'm";

        const filtered = currentSummaryStage === 'all' ? periodOrders : periodOrders.filter(o => getOrderStageKey(o) === currentSummaryStage);

        const grid = document.getElementById('summaryOrdersGrid');
        grid.innerHTML = '';
        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--adm-text-sec);">Bu holatda buyurtma yo'q</div>`;
            return;
        }
        filtered.forEach(o => {
            const meta = STAGE_META[getOrderStageKey(o)];
            const total = Number(o.total_price) || 0;
            const paid = Number(o.paid_amount) || 0;
            const remaining = Math.max(0, total - paid);
            const card = document.createElement('div');
            card.style.cssText = `border-top:3px solid ${meta.color}; border-radius:16px; background:var(--adm-surface); border:1px solid var(--adm-border); border-top:3px solid ${meta.color}; padding:14px; display:flex; flex-direction:column; gap:7px; box-shadow:var(--adm-shadow); cursor:pointer;`;
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                    <div style="min-width:0;">
                        <div style="font-weight:700; color:var(--adm-text); font-size:0.88rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${o.customer_name}</div>
                        <div style="font-size:0.72rem; color:var(--adm-text-sec); margin-top:2px;">${o.prod_type || ''}</div>
                    </div>
                    <span style="background:${meta.color}1a; color:${meta.color}; padding:3px 10px; border-radius:12px; font-size:0.64rem; font-weight:700; white-space:nowrap;">${meta.label}</span>
                </div>
                <div style="font-size:0.74rem; color:var(--adm-text-sec); border-top:1px dashed var(--adm-border); padding-top:7px;">
                    💰 Shartnoma: <strong style="color:var(--adm-text);">${total.toLocaleString()} so'm</strong>
                </div>
                <div style="font-size:0.72rem;">To'langan: <strong style="color:#00ff88;">${paid.toLocaleString()}</strong> — Qoldiq: <strong style="color:${remaining > 0 ? '#ef4444' : '#00ff88'};">${remaining.toLocaleString()}</strong></div>
                <div style="font-size:0.68rem; color:var(--adm-text-sec);">Qabul qildi: <strong style="color:var(--adm-text);">${o.created_by || "Noma'lum"}</strong> — 👁️ to'lov tarixi uchun bosing</div>
            `;
            card.onclick = () => openOrderDetail(o);
            grid.appendChild(card);
        });
    }

    // Eski buyurtmalarda (payment_history ustuni qo'shilishidan oldin yaratilgan/yozib bo'lmagan) birinchi
    // to'lov tarixda bo'lmasligi mumkin — bu farqni advance_received_by/payment_date orqali tiklaymiz,
    // aks holda birinchi to'lov "kim/qachon" ma'lumotisiz umuman ko'rinmay qolardi. Xronologik tartibda qaytaradi.
    function getBackfilledPaymentHistory(o) {
        const paid = Number(o.paid_amount) || 0;
        const history = Array.isArray(o.payment_history) ? [...o.payment_history] : [];
        const historySum = history.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const missing = paid - historySum;
        if (missing > 0) {
            history.unshift({ amount: missing, by: o.advance_received_by || "Noma'lum", at: o.payment_date || o.created_at });
        }
        return history;
    }

    // ═══════════ To'lovlar Tarixi — buyurtma bo'yicha umumiy/to'langan/qoldiq, holat filtri, joyida to'lov qabul qilish ═══════════
    const PAYMENT_STATUS_META = {
        yopilgan: { label: "✅ To'liq To'langan", color: '#00ff88' },
        avans: { label: '💰 Avans Olindi (Qisman)', color: '#ffaa00' },
        kutilmoqda: { label: "⏳ Hali To'lov Kutilmoqda", color: '#ef4444' }
    };
    function getPaymentStatus(o) {
        const total = Number(o.total_price) || 0;
        const paid = Number(o.paid_amount) || 0;
        if (total > 0 && paid >= total) return 'yopilgan';
        if (paid > 0) return 'avans';
        return 'kutilmoqda';
    }
    let currentPaymentsFilter = 'all';

    function renderPaymentsView() {
        const tabs = document.getElementById('paymentsFilterTabs');
        const grid = document.getElementById('paymentsOrdersGrid');
        if (!tabs || !grid) return;

        const buckets = { yopilgan: 0, avans: 0, kutilmoqda: 0 };
        allOrders.forEach(o => buckets[getPaymentStatus(o)]++);

        let chipsHtml = `<button class="payments-filter-chip" data-filter="all" style="border:none; background:${currentPaymentsFilter === 'all' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)'}; color:var(--adm-text); padding:9px 14px; border-radius:12px; font-size:0.78rem; font-weight:700; cursor:pointer;">Barchasi (${allOrders.length})</button>`;
        Object.keys(PAYMENT_STATUS_META).forEach(key => {
            const meta = PAYMENT_STATUS_META[key];
            const active = currentPaymentsFilter === key;
            chipsHtml += `<button class="payments-filter-chip" data-filter="${key}" style="border:none; background:${active ? meta.color + '2a' : 'rgba(255,255,255,0.05)'}; color:${meta.color}; padding:9px 14px; border-radius:12px; font-size:0.78rem; font-weight:700; cursor:pointer; ${active ? `box-shadow: inset 0 0 0 1.5px ${meta.color};` : ''}">${meta.label} (${buckets[key]})</button>`;
        });
        tabs.innerHTML = chipsHtml;
        tabs.querySelectorAll('.payments-filter-chip').forEach(b => {
            b.onclick = () => { currentPaymentsFilter = b.dataset.filter; renderPaymentsView(); };
        });

        const filtered = currentPaymentsFilter === 'all' ? allOrders : allOrders.filter(o => getPaymentStatus(o) === currentPaymentsFilter);

        let collected = 0, pending = 0;
        filtered.forEach(o => {
            const total = Number(o.total_price) || 0;
            const paid = Number(o.paid_amount) || 0;
            collected += paid;
            pending += Math.max(0, total - paid);
        });
        document.getElementById('paymentsCollectedTotal').textContent = collected.toLocaleString() + " so'm";
        document.getElementById('paymentsPendingTotal').textContent = pending.toLocaleString() + " so'm";

        grid.innerHTML = '';
        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--adm-text-sec);">Bu holatda buyurtma yo'q</div>`;
            return;
        }
        filtered.forEach(o => {
            const status = getPaymentStatus(o);
            const meta = PAYMENT_STATUS_META[status];
            const total = Number(o.total_price) || 0;
            const paid = Number(o.paid_amount) || 0;
            const remaining = Math.max(0, total - paid);
            const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
            const card = document.createElement('div');
            card.style.cssText = `border-top:3px solid ${meta.color}; border-radius:16px; background:var(--adm-surface); border:1px solid var(--adm-border); border-top:3px solid ${meta.color}; padding:14px; display:flex; flex-direction:column; gap:8px; box-shadow:var(--adm-shadow);`;
            card.innerHTML = `
                <div class="payments-card-info" style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; cursor:pointer;">
                    <div style="min-width:0;">
                        <div style="font-weight:700; color:var(--adm-text); font-size:0.85rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${o.customer_name}</div>
                        <div style="font-size:0.7rem; color:var(--adm-text-sec);">${o.prod_type || ''}</div>
                    </div>
                    <span style="background:${meta.color}1a; color:${meta.color}; padding:3px 10px; border-radius:12px; font-size:0.62rem; font-weight:700; white-space:nowrap;">${meta.label}</span>
                </div>
                <div style="width:100%; height:8px; background:rgba(255,255,255,0.08); border-radius:6px; overflow:hidden;">
                    <div style="width:${percent}%; height:100%; background:linear-gradient(90deg,#00d2ff,#00ff88);"></div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.74rem;">
                    <span style="color:var(--adm-text-sec);">Umumiy: <strong style="color:var(--adm-text);">${total.toLocaleString()}</strong></span>
                    <span style="color:var(--adm-text-sec);">To'langan: <strong style="color:#00ff88;">${paid.toLocaleString()}</strong></span>
                </div>
                <div style="font-size:0.74rem; color:${remaining > 0 ? '#ef4444' : '#00ff88'};">Qoldiq: <strong>${remaining.toLocaleString()} so'm</strong></div>
                ${remaining > 0 ? `<button class="add-payment-btn" style="background:#00ff88; color:#000; border:none; padding:9px; border-radius:10px; font-weight:700; font-size:0.78rem; cursor:pointer; margin-top:4px;">+ To'lov Qabul Qilish</button>` : ''}
            `;
            card.querySelector('.payments-card-info').onclick = () => openOrderDetail(o);
            const addBtn = card.querySelector('.add-payment-btn');
            if (addBtn) addBtn.onclick = () => openAddPayment(o);
            grid.appendChild(card);
        });
    }

    function openAddPayment(o) {
        window.addPaymentOrder = o;
        const total = Number(o.total_price) || 0;
        const paid = Number(o.paid_amount) || 0;
        document.getElementById('apOrderInfo').innerHTML = `<strong style="color:var(--adm-text);">${o.customer_name}</strong><br>Umumiy: ${total.toLocaleString()} so'm — To'langan: ${paid.toLocaleString()} so'm — Qoldiq: <strong style="color:#ef4444;">${(total - paid).toLocaleString()} so'm</strong>`;
        document.getElementById('apAmount').value = '';
        document.getElementById('apNote').value = '';
        document.getElementById('addPaymentModal').classList.remove('hidden');
    }
    const apAmountInput = document.getElementById('apAmount');
    if (apAmountInput) apAmountInput.addEventListener('input', () => formatMoneyInput(apAmountInput));
    const closeAddPaymentBtn = document.getElementById('closeAddPaymentModal');
    if (closeAddPaymentBtn) closeAddPaymentBtn.onclick = () => document.getElementById('addPaymentModal').classList.add('hidden');
    const saveAddPaymentBtn = document.getElementById('saveAddPaymentBtn');
    if (saveAddPaymentBtn) {
        saveAddPaymentBtn.onclick = async () => {
            const o = window.addPaymentOrder;
            if (!o) return;
            const amount = parseMoneyInput(document.getElementById('apAmount'));
            if (amount <= 0) return alert("To'g'ri summa kiriting!");
            const note = document.getElementById('apNote').value.trim();
            const receivedBy = user?.full_name || user?.username || 'Sotuv';
            const receivedAt = new Date().toISOString();
            const newPaid = (Number(o.paid_amount) || 0) + amount;
            const prevHistory = Array.isArray(o.payment_history) ? o.payment_history : [];
            const updatePayload = {
                paid_amount: newPaid,
                payment_date: receivedAt,
                advance_received_by: receivedBy,
                payment_history: [...prevHistory, { amount, by: receivedBy, at: receivedAt, note }]
            };
            try {
                const { error } = await supabase.from('sales_orders').update(updatePayload).eq('id', o.id);
                if (error) throw error;
            } catch (err) {
                console.warn('addPayment update failed:', err);
            }
            const localRaw = localStorage.getItem('romix_orders_local');
            if (localRaw) {
                const localOrders = JSON.parse(localRaw);
                const ord = localOrders.find(x => x.id === o.id);
                if (ord) {
                    Object.assign(ord, updatePayload);
                    localStorage.setItem('romix_orders_local', JSON.stringify(localOrders));
                }
            }
            document.getElementById('addPaymentModal').classList.add('hidden');
            loadOrders();
        };
    }

    // Buyurtma tafsiloti: shartnoma summasi, progress-bar va to'lovlar tarixi (premium ko'rinish)
    function openOrderDetail(o) {
        const total = Number(o.total_price) || 0;
        const paid = Number(o.paid_amount) || 0;
        const remaining = Math.max(0, total - paid);
        const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
        const history = getBackfilledPaymentHistory(o).reverse(); // eng oxirgi to'lov tepada ko'rinadi

        const timelineHtml = history.length
            ? history.map(p => `
                <div style="padding:10px 0; border-bottom:1px dashed var(--adm-border);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-weight:700; color:var(--adm-text); font-size:0.85rem;">${p.by || "Noma'lum"}</div>
                            <div style="font-size:0.7rem; color:var(--adm-text-sec);">${p.at ? new Date(p.at).toLocaleString('uz-UZ') : '---'}</div>
                        </div>
                        <strong style="color:#00ff88; font-family:monospace;">+${Number(p.amount || 0).toLocaleString()} so'm</strong>
                    </div>
                    ${p.note ? `<div style="font-size:0.74rem; color:var(--adm-text-sec); margin-top:5px; font-style:italic;">💬 ${p.note}</div>` : ''}
                </div>
            `).join('')
            : `<div style="text-align:center; padding:20px; color:var(--adm-text-sec); font-size:0.8rem;">Hali to'lov qabul qilinmagan</div>`;

        // Buyurtma tarkibi — nechta va qanday mahsulot olingani (model_name'ga yozilgan JSON savatdan)
        let items = [];
        try { items = JSON.parse(o.model_name) || []; } catch (e) { items = []; }
        // Item.width/height 'metr'da saqlanadi (hisob-kitob uchun), ko'rinishda mm'ga qaytarib beramiz —
        // aks holda 1500x2000mm o'rniga chalkash "1.5x2mm" ko'rinar edi.
        const itemsHtml = items.length
            ? items.map(it => {
                const wMM = Math.round((Number(it.width) || 0) * 1000);
                const hMM = Math.round((Number(it.height) || 0) * 1000);
                let sizeText = '';
                if (['rom', 'rom_fortochka', 'eshik'].includes(it.type) && wMM > 0 && hMM > 0) {
                    sizeText = ` (${wMM} x ${hMM} mm)`;
                } else if (it.type === 'padakonnik' && wMM > 0) {
                    sizeText = ` (${wMM} mm)`;
                }
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px dashed var(--adm-border); font-size:0.78rem;">
                        <span style="color:var(--adm-text);">${it.typeName || it.type || ''} — ${it.materialName || ''}${sizeText}</span>
                        <strong style="color:var(--adm-text-sec); white-space:nowrap; margin-left:10px;">${it.quantity || 1} ta</strong>
                    </div>
                `;
            }).join('')
            : `<div style="font-size:0.78rem; color:var(--adm-text-sec);">${o.model_name || o.prod_type || "Ma'lumot yo'q"}</div>`;
        const totalQty = items.length ? items.reduce((s, it) => s + (Number(it.quantity) || 0), 0) : (Number(o.quantity) || 1);

        // Muddat vs bajarilgan sana — vaqtida (A'LO) yoki kechikkan (QONIQARSIZ)
        let deliveryBadge;
        if (o.status === 'Tayyor / Yetkazildi' && o.completed_at) {
            const deadline = o.production_deadline ? new Date(o.production_deadline) : null;
            if (deadline) deadline.setHours(23, 59, 59, 999);
            const completedAt = new Date(o.completed_at);
            const onTime = !deadline || completedAt <= deadline;
            deliveryBadge = onTime
                ? `<div style="background:rgba(0,255,136,0.1); color:#00ff88; padding:10px 14px; border-radius:12px; font-size:0.8rem; font-weight:700; margin-top:8px;">✅ A'LO — vaqtida topshirildi (${completedAt.toLocaleDateString('uz-UZ')})</div>`
                : `<div style="background:rgba(239,68,68,0.1); color:#ef4444; padding:10px 14px; border-radius:12px; font-size:0.8rem; font-weight:700; margin-top:8px;">⚠️ QONIQARSIZ — muddatdan kechikib topshirildi (${completedAt.toLocaleDateString('uz-UZ')})</div>`;
        } else if (o.production_deadline) {
            const deadline = new Date(o.production_deadline);
            deadline.setHours(23, 59, 59, 999);
            const overdue = Date.now() > deadline.getTime();
            deliveryBadge = overdue
                ? `<div style="background:rgba(239,68,68,0.1); color:#ef4444; padding:10px 14px; border-radius:12px; font-size:0.8rem; font-weight:700; margin-top:8px;">⚠️ Muddati o'tgan, hali bajarilmagan</div>`
                : `<div style="background:rgba(255,170,0,0.1); color:#ffaa00; padding:10px 14px; border-radius:12px; font-size:0.8rem; font-weight:700; margin-top:8px;">⏳ Hali bajarilmagan — muddat: ${deadline.toLocaleDateString('uz-UZ')}</div>`;
        } else {
            deliveryBadge = '';
        }

        document.getElementById('orderDetailContent').innerHTML = `
            <div style="display:flex; align-items:center; gap:15px; margin-bottom:16px;">
                <span style="font-size:1.8rem;">📄</span>
                <div>
                    <h2 style="color:var(--adm-text); margin:0;">${o.customer_name}</h2>
                    <div style="font-size:0.78rem; color:var(--adm-text-sec);">${o.customer_phone || ''}${o.prod_type ? ' — ' + o.prod_type : ''}</div>
                </div>
            </div>

            <div style="font-size:0.78rem; color:var(--adm-text-sec); margin-bottom:4px;">
                📋 Qabul qildi: <strong style="color:var(--adm-text);">${o.created_by || "Noma'lum"}</strong> — ${o.created_at ? new Date(o.created_at).toLocaleString('uz-UZ') : '---'}
            </div>
            ${deliveryBadge}

            <h3 style="font-size:0.9rem; color:var(--adm-text); margin:16px 0 6px;">📦 Buyurtma tarkibi (${totalQty} ta)</h3>
            <div>${itemsHtml}</div>

            <div style="background:rgba(0,210,255,0.05); border:1px solid rgba(0,210,255,0.15); border-radius:16px; padding:18px; margin:16px 0;">
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--adm-text-sec); margin-bottom:10px;">
                    <span>Shartnoma summasi</span>
                    <strong style="color:var(--adm-text); font-size:0.95rem;">${total.toLocaleString()} so'm</strong>
                </div>
                <div style="width:100%; height:12px; background:rgba(255,255,255,0.08); border-radius:8px; overflow:hidden; margin-bottom:10px;">
                    <div style="width:${percent}%; height:100%; background:linear-gradient(90deg,#00d2ff,#00ff88); border-radius:8px; transition:width 0.4s;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.82rem;">
                    <span style="color:#00ff88;">To'langan: <strong>${paid.toLocaleString()} so'm (${percent}%)</strong></span>
                    <span style="color:${remaining > 0 ? '#ef4444' : '#00ff88'};">Qoldiq: <strong>${remaining.toLocaleString()} so'm</strong></span>
                </div>
            </div>

            <h3 style="font-size:0.95rem; color:var(--adm-text); margin-bottom:8px;">💳 To'lovlar Tarixi</h3>
            <div style="margin-bottom:16px;">${timelineHtml}</div>

            <div style="display:flex; gap:10px;">
                <button id="detailViewContractBtn" style="flex:1; background:#00d2ff; color:#000; border:none; padding:12px; border-radius:12px; font-weight:700; cursor:pointer;">📄 Shartnomani Ko'rish</button>
                <button id="detailCuttingPdfBtn" style="flex:1; background:rgba(255,255,255,0.1); color:var(--adm-text); border:none; padding:12px; border-radius:12px; font-weight:700; cursor:pointer;">✂️ Kesim PDF</button>
            </div>
        `;
        document.getElementById('detailViewContractBtn').onclick = () => showContractInvoice(o);
        document.getElementById('detailCuttingPdfBtn').onclick = () => showCuttingPdfForOrder(o);
        orderDetailModal.classList.remove('hidden');
    }

    document.querySelectorAll('.period-kpi-card').forEach(card => {
        card.onclick = () => {
            currentSummaryPeriod = card.dataset.period;
            currentSummaryStage = 'all';
            ordersSummaryModal.classList.remove('hidden');
            renderOrdersSummary();
        };
    });
    document.querySelectorAll('.summary-period-btn').forEach(btn => {
        btn.onclick = () => { currentSummaryPeriod = btn.dataset.period; renderOrdersSummary(); };
    });
    if (document.getElementById('closeOrdersSummaryBtn')) {
        document.getElementById('closeOrdersSummaryBtn').onclick = () => ordersSummaryModal.classList.add('hidden');
    }
    if (document.getElementById('closeOrderDetailBtn')) {
        document.getElementById('closeOrderDetailBtn').onclick = () => orderDetailModal.classList.add('hidden');
    }

    function bindActionButtons() {
        document.querySelectorAll('.del-btn').forEach(b => {
            b.onclick = async () => {
                if (confirm("Uchirasizmi?")) {
                    const id = b.dataset.id;
                    try {
                        await supabase.from('material_requests').delete().eq('order_id', id);
                        const { error } = await supabase.from('sales_orders').delete().eq('id', id);
                        if (error) throw error;
                    } catch(err) {
                        console.warn("Supabase delete order failed, applying to local storage:", err);
                    }
                    const localRaw = localStorage.getItem('romix_orders_local');
                    if (localRaw) {
                        let localOrders = JSON.parse(localRaw);
                        localOrders = localOrders.filter(x => x.id !== id);
                        localStorage.setItem('romix_orders_local', JSON.stringify(localOrders));
                    }
                    loadOrders();
                }
            };
        });

        document.querySelectorAll('.edit-btn').forEach(b => {
            b.onclick = () => {
                const o = JSON.parse(b.dataset.order);
                window.editingOrderId = o.id;
                window.editingOrderOriginalPaid = Number(o.paid_amount) || 0;
                window.editingOrderPaymentHistory = Array.isArray(o.payment_history) ? o.payment_history : [];
                document.getElementById('eCustomer').value = o.customer_name;
                document.getElementById('ePhone').value = o.customer_phone;
                document.getElementById('eAddress').value = o.customer_address || '';
                document.getElementById('eProdDeadline').value = o.production_deadline || '';
                document.getElementById('eStatus').value = o.status;
                document.getElementById('eAdvance').value = o.paid_amount ? o.paid_amount.toLocaleString().replace(/,/g, ' ') : '';
                document.getElementById('ePaymentNote').value = '';
                const ePercentHint = document.getElementById('eAdvancePercentHint');
                const eTotal = Number(o.total_price) || 0;
                const ePercent = eTotal > 0 ? Math.round(((Number(o.paid_amount) || 0) / eTotal) * 100) : 0;
                ePercentHint.style.color = ePercent >= 50 ? '#00ff88' : '#ef4444';
                ePercentHint.textContent = `Jami: ${eTotal.toLocaleString()} so'm — hozircha ${ePercent}%${ePercent >= 50 ? ' ✅' : ' (50% dan kam)'}`;
                editModal.classList.remove('hidden');
            };
        });

        document.querySelectorAll('.view-ord-btn').forEach(b => {
            b.onclick = () => showContractInvoice(JSON.parse(b.dataset.order));
        });
    }

    // Shartnoma/Invoice ko'rinishi — buyurtmalar ro'yxatidagi 👁️ tugmasi va buyurtma tafsiloti oynasidan chaqiriladi
    function showContractInvoice(o) {
                const isDebt = o.payment_type === 'Qarz';
                const createdDate = new Date(o.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                const dDate = new Date(o.deadline_date).toLocaleDateString('en-GB');

                // Cost breakdowns for invoice summary
                let baseCost = 0;
                let itemsListHtml = '';
                try {
                    const parsedItems = JSON.parse(o.model_name);
                    parsedItems.forEach((it, idx) => {
                        baseCost += (it.subtotal || 0);
                        const dimText = it.height > 0 ? `B: ${it.height}m x E: ${it.width}m` : (it.width > 0 ? `U: ${it.width}m` : '---');
                        itemsListHtml += `
                            <tr>
                                <td>${(idx + 1).toString().padStart(2, '0')}.</td>
                                <td>
                                    <b style="color:#222;">${it.typeName} — ${it.materialName}</b><br>
                                    <small style="color:#777;">O'lchami: ${dimText}</small>
                                </td>
                                <td>${(it.subtotal / it.quantity).toLocaleString()}</td>
                                <td>${it.quantity} ta</td>
                                <td style="color:#45c4b0;">${it.subtotal.toLocaleString()}</td>
                            </tr>
                        `;
                    });
                } catch(e) {
                    baseCost = Number(o.production_cost || 0);
                    itemsListHtml = `
                        <tr>
                            <td>01.</td>
                            <td>
                                <b style="color:#222;">${o.prod_type || 'Mahsulot'} — ${o.model_name}</b><br>
                                <small style="color:#777;">O'lchamlari: Balandlik: ${o.height || '---'}m / Uzunlik: ${o.width || '---'}m</small>
                            </td>
                            <td>${Number((o.total_price || 0) / (o.quantity || 1)).toLocaleString()}</td>
                            <td>${o.quantity || 1} ta</td>
                            <td style="color:#45c4b0;">${Number(o.total_price).toLocaleString()}</td>
                        </tr>
                    `;
                }

                const autoExpenses = Math.round(baseCost * 0.10);
                const installCost = Number(o.installation_cost || 0);
                const profitCost = Math.max(0, Number(o.total_price) - baseCost - autoExpenses - installCost);

                document.getElementById('invPaperContent').innerHTML = `
                    <div class="inv-header">
                        <div class="inv-top">
                            <div>
                                <h1 class="inv-title">Invoice.</h1>
                                <div class="inv-id">No. ${o.id.slice(0, 8).toUpperCase()}</div>
                            </div>
                            <div class="inv-date-box">
                                <div style="font-size:0.9rem; opacity:0.8; text-transform:uppercase; letter-spacing:1px;">Invoice Date:</div>
                                <div style="font-size:1.1rem; font-weight:600;">${createdDate}</div>
                            </div>
                        </div>
                    </div>

                    <div class="inv-cards-row">
                        <div class="inv-box">
                            <h3>Invoice To:</h3>
                            <p style="font-size:1.1rem; color:#45c4b0; font-weight:700;">${o.customer_name}</p>
                            <p><b>Phone:</b> ${o.customer_phone}</p>
                            <p><b>Telegram:</b> ${o.tg_user || '---'}</p>
                            <p><b>Manzil:</b> ${o.customer_address ? o.customer_address.replace(/(https?:\/\/\S+)/g, '<a href="$1" target="_blank" style="color:#00d2ff;">🗺️ Xaritada</a>') : '---'}</p>
                        </div>
                        <div class="inv-box">
                            <h3>Payment Method:</h3>
                            <p>${isDebt ? 'Muddatli To\'lov (Qarz)' : o.payment_type || 'Naqd'}</p>
                            <div class="amount-badge ${isDebt ? 'debt' : ''}">Total: ${Number(o.total_price).toLocaleString()} UZS</div>
                            <p style="margin-top:8px;"><b>⏰ Tayyor bo'lish muddati:</b> ${o.production_deadline ? new Date(o.production_deadline).toLocaleDateString('uz-UZ') : '---'}</p>
                        </div>
                    </div>

                    <div class="qr-absolute">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=ORD-${o.id.slice(0, 8)}" style="width:100px; height:100px;">
                    </div>

                    <div class="inv-body">
                        <table class="inv-table">
                            <thead>
                                <tr>
                                    <th style="width:5%;">No.</th>
                                    <th style="width:45%;">Product Description</th>
                                    <th>Price / unit</th>
                                    <th>Qty</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsListHtml}
                            </tbody>
                        </table>

                        <!-- Cost Summary Breakdown -->
                        <div style="display:flex; justify-content:flex-end; margin-top:20px; font-size:0.85rem; line-height:1.6; color:#333;">
                            <div style="width:280px; background:#f8fafc; padding:15px; border-radius:12px; border:1px solid #e2e8f0;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                    <span>Tan Narxi (Tan Narx):</span>
                                    <strong>${baseCost.toLocaleString()} UZS</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                    <span>Ishxona Harajatlari:</span>
                                    <strong>${autoExpenses.toLocaleString()} UZS</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px; color:#10b981;">
                                    <span>Menejer Ustamasi (Foyda):</span>
                                    <strong>${profitCost.toLocaleString()} UZS</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                                    <span>O'rnatib Berish Xizmati:</span>
                                    <strong>${installCost.toLocaleString()} UZS</strong>
                                </div>
                                <hr style="border:none; border-top:1px solid #cbd5e1; margin:8px 0;">
                                <div style="display:flex; justify-content:space-between; font-size:1.1rem; font-weight:800; color:#0f172a;">
                                    <span>Jami Summa:</span>
                                    <span>${Number(o.total_price).toLocaleString()} UZS</span>
                                </div>
                            </div>
                        </div>

                        <div class="inv-footer-row" style="margin-top:25px;">
                            <div class="terms-box ${isDebt ? 'debt-terms' : ''}">
                                <h4>Terms & Conditions:</h4>
                                <p>${isDebt ?
                        `Ushbu sarlavha ostida keltirilgan summa mijoz tomonidan <b>${dDate}</b> sanasigacha to'liq qoplanishi shart. To'lov kechiktirilganda jarima qo'llanilishi mumkin.` :
                        'Barcha mahsulotlar zavod kafolatiga ega. Mahsulotni qabul qilib olayotganda sifatini tekshiring.'}
                                </p>
                            </div>
                            <div class="sign-box">
                                ${isDebt ? `
                                    <div class="sign-line"></div>
                                    <div style="font-size:0.85rem; font-weight:600;">Mijoz Imzosi (Qabul Qildi)</div>
                                    <div style="margin-top:30px;" class="sign-line"></div>
                                    <div style="font-size:0.85rem; font-weight:600;">Menejer Imzosi</div>
                                ` : `
                                    <div class="sign-line"></div>
                                    <div style="font-size:0.85rem; font-weight:600;">Tasdiqlandi (Menejer)</div>
                                `}
                            </div>
                        </div>
                    </div>
                `;
        mainApp.classList.add('hidden');
        printArea.classList.remove('hidden');
    }

    // Kesim PDF — saqlangan buyurtmadagi rom/eshik elementlari uchun (model_name JSON'dan)
    function showCuttingPdfForOrder(o) {
        let items = [];
        try { items = JSON.parse(o.model_name) || []; } catch (e) { items = []; }
        const romlar = items.filter(it => ['rom', 'rom_fortochka', 'eshik'].includes(it.type));
        if (romlar.length === 0) { alert("Bu buyurtmada kesim PDF uchun rom yoki eshik elementi yo'q."); return; }
        generateCuttingPdf({ customer: o.customer_name || '', phone: o.customer_phone || '', items });
    }

    // Save New
    document.getElementById('saveOrderBtn').onclick = async () => {
        if (orderItems.length === 0) return alert("Savatga kamida bitta mahsulot qo'shing!");
        if (!document.getElementById('oProdDeadline').value) return alert("Buyurtma tayyor bo'lish muddatini kiriting! Bu ishlab chiqarish bo'limi uchun majburiy.");

        const saveBtn = document.getElementById('saveOrderBtn');
        if (saveBtn.disabled) return;
        saveBtn.disabled = true;
        const saveBtnOrigText = saveBtn.textContent;
        saveBtn.textContent = 'Saqlanmoqda...';

        const calcObj = calculateTotal();
        const typesSummary = Array.from(new Set(orderItems.map(it => it.typeName))).join(', ');
        
        // Compile all item names as string for list preview, and save JSON
        const itemsSummary = orderItems.map(it => `${it.materialName} (${it.quantity} ta)`).join(' + ');

        const newOrder = {
            customer_name: document.getElementById('oCustomer').value.trim() || 'Noma\'lum Mijoz',
            customer_phone: document.getElementById('oPhone').value.trim() || '---',
            customer_address: document.getElementById('oAddress').value.trim(),
            tg_user: document.getElementById('oTg').value.trim(),
            prod_type: typesSummary,
            model_name: JSON.stringify(orderItems), // store full JSON list in model_name for detail billing
            width: orderItems[0]?.width || 0, // save first item as fallback legacy
            height: orderItems[0]?.height || 0,
            quantity: orderItems.reduce((acc, it) => acc + it.quantity, 0),
            sq_meter: calcObj.totalArea,
            production_cost: orderItems.reduce((acc, it) => acc + (it.type === 'rom' || it.type === 'rom_fortochka' || it.type === 'eshik' ? PRODUCTION_COST * it.quantity : 0), 0),
            installation_cost: calcObj.totalInstall,
            total_price: calcObj.grandTotal,
            payment_type: document.getElementById('oPayment').value,
            deadline_date: document.getElementById('oDeadline').value || new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
            production_deadline: document.getElementById('oProdDeadline').value,
            material_estimate: computeMaterialEstimate(orderItems),
            status: 'Kutilmoqda',
            created_by: user?.full_name || user?.username || 'Sotuv',
            created_at: new Date().toISOString()
        };

        // Avans (boshlang'ich to'lov) — 50% dan kam bo'lsa ham saqlanadi, keyinroq to'ldirish mumkin
        const advanceAmount = parseMoneyInput(document.getElementById('oAdvance'));
        if (advanceAmount > 0) {
            const receivedBy = user?.full_name || user?.username || 'Sotuv';
            const receivedAt = new Date().toISOString();
            const note = document.getElementById('oPaymentNote').value.trim();
            newOrder.paid_amount = advanceAmount;
            newOrder.payment_date = receivedAt;
            newOrder.advance_received_by = receivedBy;
            newOrder.payment_history = [{ amount: advanceAmount, by: receivedBy, at: receivedAt, note }];
        }

        try {
            const res = await supabase.from('sales_orders').insert([newOrder]).select().single();
            if (res.error) throw res.error;
        } catch(err) {
            console.warn("Supabase insert order failed, writing to local storage:", err);
            const localRaw = localStorage.getItem('romix_orders_local');
            const localOrders = localRaw ? JSON.parse(localRaw) : [];
            const offlineOrder = { ...newOrder, id: 'loc-' + Date.now() };
            localOrders.unshift(offlineOrder);
            localStorage.setItem('romix_orders_local', JSON.stringify(localOrders));
        }

        saveBtn.disabled = false;
        saveBtn.textContent = saveBtnOrigText;
        orderModal.classList.add('hidden');
        loadOrders();
    };

    // Edits
    document.getElementById('saveEditOrderBtn').onclick = async () => {
        const id = window.editingOrderId;
        const customer_name = document.getElementById('eCustomer').value;
        const customer_phone = document.getElementById('ePhone').value;
        const customer_address = document.getElementById('eAddress').value;
        const production_deadline = document.getElementById('eProdDeadline').value || null;
        const status = document.getElementById('eStatus').value;
        const paid_amount = parseMoneyInput(document.getElementById('eAdvance'));

        const updatePayload = {
            customer_name,
            customer_phone,
            customer_address,
            production_deadline,
            status,
            paid_amount
        };
        // Avans summasi o'zgargan bo'lsagina qabul qilgan xodim/sana yangilanadi + to'lovlar tarixiga yangi yozuv qo'shiladi
        const prevPaid = window.editingOrderOriginalPaid || 0;
        if (paid_amount !== prevPaid && paid_amount > 0) {
            const receivedBy = user?.full_name || user?.username || 'Sotuv';
            const receivedAt = new Date().toISOString();
            const note = document.getElementById('ePaymentNote').value.trim();
            updatePayload.payment_date = receivedAt;
            updatePayload.advance_received_by = receivedBy;
            const delta = paid_amount - prevPaid;
            if (delta > 0) {
                const prevHistory = window.editingOrderPaymentHistory || [];
                updatePayload.payment_history = [...prevHistory, { amount: delta, by: receivedBy, at: receivedAt, note }];
            }
        }

        try {
            const { error } = await supabase.from('sales_orders').update(updatePayload).eq('id', id);
            if (error) throw error;
        } catch (err) {
            console.warn("Supabase update order failed, applying to local storage:", err);
        }

        const localRaw = localStorage.getItem('romix_orders_local');
        if (localRaw) {
            const localOrders = JSON.parse(localRaw);
            const ord = localOrders.find(x => x.id === id);
            if (ord) {
                Object.assign(ord, updatePayload);
                localStorage.setItem('romix_orders_local', JSON.stringify(localOrders));
            }
        }

        editModal.classList.add('hidden');
        loadOrders();
    };

    // ═══════════ Sozlamalar — Sotuvchilar (yordamchi login/parol) boshqaruvi ═══════════
    async function loadSalesAgents() {
        const list = document.getElementById('salesAgentsList');
        if (!list) return;
        list.innerHTML = '<div style="text-align:center; color:var(--adm-text-sec); padding:14px;">Yuklanmoqda...</div>';

        // Supabase'dan o'qiladi + shu brauzerda saqlanib, hali sinxronlanmagan yozuvlar ham (mavjud bo'lsa)
        // ko'rsatiladi — aks holda ular ro'yxatdan "yo'qolib qolgandek" ko'rinardi, holbuki ular boshqa
        // qurilmadan LOGIN QILA OLMAYDI (chunki kirish faqat Supabase'dagi jadvalni tekshiradi).
        let synced = [];
        let dbReachable = true;
        try {
            const { data, error } = await supabase.from('system_users').select('*').eq('role', 'sotuvchi').order('full_name', { ascending: true });
            if (error) throw error;
            synced = data || [];
        } catch (err) {
            dbReachable = false;
            console.warn('loadSalesAgents Supabase failed:', err);
        }
        const local = JSON.parse(localStorage.getItem('system_users_local') || '[]').filter(u => u.role === 'sotuvchi');
        const unsynced = local.filter(l => !synced.some(s => s.username === l.username));
        const agents = [...synced.map(a => ({ ...a, _synced: true })), ...unsynced.map(a => ({ ...a, _synced: false }))];

        if (agents.length === 0) {
            list.innerHTML = `<div style="text-align:center; color:var(--adm-text-sec); padding:14px; font-size:0.82rem;">Hali sotuvchi qo'shilmagan</div>`;
            return;
        }
        const warnBanner = !dbReachable
            ? `<div style="background:rgba(239,68,68,0.1); color:#ef4444; padding:10px 14px; border-radius:10px; font-size:0.76rem; font-weight:600; margin-bottom:10px;">⚠️ Bazaga ulanib bo'lmadi — pastdagi ro'yxat eski/lokal ma'lumot bo'lishi mumkin.</div>`
            : '';
        list.innerHTML = warnBanner + agents.map(a => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--adm-surface); border:1px solid var(--adm-border); border-radius:12px; padding:12px 16px;">
                <div>
                    <div style="font-weight:700; color:var(--adm-text); font-size:0.85rem;">${a.full_name}${a._synced ? '' : ' <span style="color:#ef4444; font-weight:700; font-size:0.68rem;">⚠️ sinxron emas — boshqa qurilmadan kira olmaydi</span>'}</div>
                    <div style="font-size:0.72rem; color:var(--adm-text-sec); margin-top:2px;">${a.phone || '---'} — login: <code>${a.username}</code> / <code>${a.password}</code></div>
                </div>
                <button class="del-sales-agent-btn" data-id="${a.id}" style="background:rgba(255,77,79,0.1); border:1px solid rgba(255,77,79,0.2); color:#ff4d4f; padding:6px 10px; border-radius:8px; cursor:pointer; font-size:0.78rem;">🗑️</button>
            </div>
        `).join('');
        list.querySelectorAll('.del-sales-agent-btn').forEach(b => {
            b.onclick = async () => {
                if (!confirm("Ushbu sotuvchini o'chirmoqchimisiz?")) return;
                const id = b.dataset.id;
                try { await supabase.from('system_users').delete().eq('id', id); } catch (e) { console.warn('delete sales agent failed:', e); }
                const local = JSON.parse(localStorage.getItem('system_users_local') || '[]');
                localStorage.setItem('system_users_local', JSON.stringify(local.filter(u => u.id !== id)));
                loadSalesAgents();
            };
        });
    }

    const addSalesAgentModal = document.getElementById('addSalesAgentModal');
    const openAddSalesAgentBtn = document.getElementById('openAddSalesAgentModal');
    if (openAddSalesAgentBtn) {
        openAddSalesAgentBtn.onclick = () => {
            ['saName', 'saPhone', 'saUsername', 'saPassword'].forEach(id => document.getElementById(id).value = '');
            addSalesAgentModal.classList.remove('hidden');
        };
    }
    const closeAddSalesAgentBtn = document.getElementById('closeAddSalesAgentModal');
    if (closeAddSalesAgentBtn) closeAddSalesAgentBtn.onclick = () => addSalesAgentModal.classList.add('hidden');

    const saveSalesAgentBtn = document.getElementById('saveSalesAgentBtn');
    if (saveSalesAgentBtn) {
        saveSalesAgentBtn.onclick = async () => {
            const full_name = document.getElementById('saName').value.trim();
            const phone = document.getElementById('saPhone').value.trim();
            const username = document.getElementById('saUsername').value.trim();
            const password = document.getElementById('saPassword').value.trim();
            if (!full_name || !username || !password) return alert("Ism, login va parolni to'ldiring!");

            const payload = { full_name, phone, username, password, role: 'sotuvchi' };
            let saved = false;
            try {
                const { error } = await supabase.from('system_users').insert([payload]);
                if (error) throw error;
                saved = true;
            } catch (err) {
                console.warn('Supabase insert sales agent failed, saving locally:', err);
                const local = JSON.parse(localStorage.getItem('system_users_local') || '[]');
                local.push({ ...payload, id: 'local-' + Date.now() });
                localStorage.setItem('system_users_local', JSON.stringify(local));
            }

            addSalesAgentModal.classList.add('hidden');
            loadSalesAgents();
            if (saved) {
                alert(`✅ Sotuvchi qo'shildi va bazaga saqlandi! Login: ${username} / Parol: ${password}`);
            } else {
                alert(`⚠️ DIQQAT: Bazaga saqlab bo'lmadi (internet yo'q yoki database/system_users_phone.sql hali RUN qilinmagan) — "${username}" faqat shu qurilmada saqlandi va HOZIRCHA boshqa joydan LOGIN QILA OLMAYDI. Internetni/SQL'ni tekshirib, sahifani yangilab qayta urinib ko'ring.`);
            }
        };
    }

    // Assignments & Print Material Requisition

    // Close buttons
    const cOrder = document.getElementById('closeOrderModal');
    if (cOrder) cOrder.onclick = () => {
        orderItems = [];
        renderBasket();
        calculateTotal();
        orderModal.classList.add('hidden');
    };
    const cEdit = document.getElementById('closeEditOrderModal');
    if (cEdit) cEdit.onclick = () => editModal.classList.add('hidden');

    document.getElementById('openOrderModal').onclick = () => {
        // Reset basket on each new order
        orderItems = [];
        renderBasket();
        calculateTotal();
        document.getElementById('oDeadline').value = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        document.getElementById('oProdDeadline').value = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        document.getElementById('oAdvance').value = '';
        document.getElementById('oPaymentNote').value = '';
        window.updateAdvancePercent();
        orderModal.classList.remove('hidden');
        // 3D preview modal ochilгач o'lchamни oladi
        setTimeout(() => { try { window.update3DPreview(); } catch (e) {} }, 60);
    };

    // Joriy joylashuvni olish (telefon GPS orqali manzilni avtomatik to'ldirish)
    const oGetLocationBtn = document.getElementById('oGetLocationBtn');
    if (oGetLocationBtn) {
        oGetLocationBtn.onclick = () => {
            const addressInput = document.getElementById('oAddress');
            const statusEl = document.getElementById('oLocationStatus');
            if (!navigator.geolocation) {
                statusEl.textContent = '❌ Bu qurilma/brauzer joylashuvni qo\'llab-quvvatlamaydi';
                return;
            }
            statusEl.textContent = '📍 Joylashuv aniqlanmoqda...';
            oGetLocationBtn.disabled = true;
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;
                const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
                let humanAddress = '';
                try {
                    const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
                        headers: { 'Accept-Language': 'uz,ru,en' }
                    });
                    const data = await resp.json();
                    humanAddress = data && data.display_name ? data.display_name : '';
                } catch (e) {
                    console.warn('Reverse geocoding failed, using coordinates link only:', e);
                }
                addressInput.value = humanAddress ? `${humanAddress} (${mapsLink})` : mapsLink;
                statusEl.textContent = '✅ Joylashuv qo\'shildi';
                oGetLocationBtn.disabled = false;
            }, (err) => {
                statusEl.textContent = '❌ Joylashuvni olib bo\'lmadi: ' + (err.message || 'ruxsat berilmadi');
                oGetLocationBtn.disabled = false;
            }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
        };
    }

    // Kesim optimizatsiya PDF — joriy savatdan
    const cuttingBtn = document.getElementById('cuttingPdfBtn');
    if (cuttingBtn) {
        cuttingBtn.onclick = () => {
            const romlar = orderItems.filter(it => ['rom', 'rom_fortochka', 'eshik'].includes(it.type));
            if (romlar.length === 0) { alert("Kesim PDF uchun savatga rom yoki eshik qo'shing."); return; }
            generateCuttingPdf({
                customer: document.getElementById('oCustomer')?.value || '',
                phone: document.getElementById('oPhone')?.value || '',
                items: orderItems
            });
        };
    }

    document.getElementById('closePrintBtn').onclick = () => {
        location.reload();
    };

    // Theme & defaults
    const isD = localStorage.getItem('theme') === 'dark';
    if (isD) document.body.classList.add('dark-mode');
    document.getElementById('themeToggle').onclick = () => {
        const d = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', d ? 'dark' : 'light');
    };
    document.getElementById('logoutBtn').onclick = () => { localStorage.removeItem('currentUser'); window.location.href = '/'; };

    loadOmborMaterials();
    loadOrders();

    // Yordamchi sotuvchi kirishi bilan darhol buyurtma olish oynasi ochiladi (yagona ko'radigan oynasi)
    if (isLimitedAgent) document.getElementById('openOrderModal').click();
});
