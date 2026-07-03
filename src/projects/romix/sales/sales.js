import { supabase } from '@/core/supabase.js';
import { createViewer } from './window3d.js';
import { generateCuttingPdf } from './cuttingPdf.js';
import { createDesigner } from './designer2d.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || (user.role !== 'sotuv' && user.role !== 'admin')) {
        window.location.href = '/';
    }

    document.getElementById('userName').textContent = user.full_name || "Sotuv Menejeri";

    // Modals
    const orderModal = document.getElementById('orderModal');
    const assignModal = document.getElementById('assignModal');
    const editModal = document.getElementById('editOrderModal');
    const aMatSel = document.getElementById('aMatSel');
    const reqMatList = document.getElementById('reqMatList');

    const mainApp = document.getElementById('mainApp');
    const printArea = document.getElementById('printArea');

    // Values
    const PRODUCTION_COST = 1000000; // base production markup per window/door
    const INSTALLATION_PRICE_PER_SQM = 250000;

    // Tabs
    const sections = document.querySelectorAll('.sales-section');
    const navButtons = document.querySelectorAll('.nav-icon');

    function switchTab(tabId) {
        if (tabId === 'logoutBtn') return;
        sections.forEach(s => s.classList.add('hidden'));
        document.getElementById(`${tabId}-view`)?.classList.remove('hidden');
        navButtons.forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
        if (tabId === 'dashboard' || tabId === 'orders') loadOrders();
    }

    navButtons.forEach(btn => {
        btn.onclick = () => {
            const tab = btn.getAttribute('data-tab');
            if (tab) switchTab(tab);
        };
    });

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

    // Sync material prices from romix_inventory to AVAILABLE_MATERIALS
    async function syncMaterialPrices() {
        try {
            const { data, error } = await supabase.from('romix_inventory').select('product_name, price');
            if (error) throw error;
            if (data && data.length > 0) {
                for (const cat in AVAILABLE_MATERIALS) {
                    AVAILABLE_MATERIALS[cat].forEach(mat => {
                        const dbMatch = data.find(dbMat => 
                            dbMat.product_name.toLowerCase().trim() === mat.name.toLowerCase().trim() ||
                            dbMat.product_name.toLowerCase().includes(mat.name.toLowerCase()) ||
                            mat.name.toLowerCase().includes(dbMat.product_name.toLowerCase())
                        );
                        if (dbMatch && dbMatch.price !== undefined) {
                            mat.price = parseFloat(dbMatch.price) || 0;
                        }
                    });
                }
                if (typeof updateConstructorFields === 'function') {
                    updateConstructorFields();
                }
            }
        } catch (err) {
            console.warn("Failed to sync material prices from romix_inventory:", err);
        }
    }

    let orderItems = [];

    // Load warehouse materials for the BOM Request
    async function loadWarehouseMaterials() {
        let data = [];
        try {
            const res = await supabase.from('romix_inventory').select('id, product_name, unit');
            if (res.error) throw res.error;
            data = (res.data || []).map(p => ({ id: p.id, name: p.product_name, unit: p.unit }));
        } catch (err) {
            console.warn("Supabase loadWarehouseMaterials failed, using local default materials:", err);
            data = [
                { id: "prof-60", name: "Akfa 60 Series Profil", unit: "m" },
                { id: "prof-70", name: "Akfa 70 Series Profil", unit: "m" },
                { id: "prof-thermo", name: "Thermo 65 Insulation Profil", unit: "m" },
                { id: "prof-eng", name: "Engelberg 76 Premium Profil", unit: "m" },
                { id: "rez-1", name: "Kauchuk Zichlagich (Rezinka)", unit: "m" },
                { id: "oyna-1", name: "Oddiy Oyna (Glass)", unit: "kv.m" },
                { id: "oyna-2", name: "Ikki Qavatli Shisha-Paket", unit: "kv.m" }
            ];
        }
        if (aMatSel) {
            aMatSel.innerHTML = '';
            if (data) {
                data.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = `${p.name} (${p.unit})`;
                    opt.dataset.unit = p.unit;
                    opt.dataset.name = p.name;
                    aMatSel.appendChild(opt);
                });
            }
        }
    }

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

        // Populate Materials select
        itemMaterialSel.innerHTML = '';
        materials.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = `${m.name} (${m.price.toLocaleString()} so'm / ${m.unit})`;
            opt.dataset.name = m.name;
            opt.dataset.price = m.price;
            opt.dataset.unit = m.unit;
            itemMaterialSel.appendChild(opt);
        });

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
                H: parseInt(itemHeightInput.value) || 2000
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
        // Ko'rinish: rom → 2D dizayner, eshik → 3D, boshqa → bo'sh
        if (designerWrap) designerWrap.style.display = isRom ? 'block' : 'none';
        if (preview3dWrap) preview3dWrap.style.display = isRom ? 'none' : 'block';
        if (canvas3d) canvas3d.style.display = isEshik ? 'block' : 'none';
        if (empty3d) empty3d.style.display = isEshik ? 'none' : 'flex';

        if (isRom) {
            const d = ensureDesigner();
            if (d) d.setSize(parseInt(itemWidthInput.value) || 1500, parseInt(itemHeightInput.value) || 2000);
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

        // 10% avto harajatlar
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

        return { totalArea, totalMaterials, totalInstall, grandTotal, expenses, profit };
    }

    const installCheck = document.getElementById('oInstall');
    if (installCheck) {
        installCheck.addEventListener('change', calculateTotal);
    }
    const profitInput = document.getElementById('oProfitPercent');
    if (profitInput) {
        profitInput.addEventListener('input', calculateTotal);
    }

    window.reqMaterials = [];
    document.getElementById('addMatBtn').onclick = () => {
        const sel = aMatSel.options[aMatSel.selectedIndex];
        const qty = parseFloat(document.getElementById('aMatQty').value);
        if (!sel || !qty || qty <= 0) return alert('Material va to\'g\'ri miqdorni kiriting!');

        window.reqMaterials.push({
            product_id: sel.value,
            name: sel.dataset.name,
            qty: qty,
            unit: sel.dataset.unit
        });

        renderReqMaterials();
        document.getElementById('aMatQty').value = '';
    };

    window.removeReqMaterial = (index) => {
        window.reqMaterials.splice(index, 1);
        renderReqMaterials();
    };

    function renderReqMaterials() {
        reqMatList.innerHTML = '';
        window.reqMaterials.forEach((m, idx) => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.padding = '5px 0';
            li.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            li.innerHTML = `
                <span>${m.name}</span>
                <span><strong>${m.qty}</strong> ${m.unit} <button onclick="removeReqMaterial(${idx})" style="background:transparent; border:none; color:red; cursor:pointer;" title="Olib tashlash">✖</button></span>
            `;
            reqMatList.appendChild(li);
        });
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

        // Clear views
        const table = document.getElementById('ordersTable');
        const procTable = document.getElementById('processOrdersTable');
        const compTable = document.getElementById('completedOrdersTable');

        if (table) table.innerHTML = '';
        if (procTable) procTable.innerHTML = '';
        if (compTable) compTable.innerHTML = '';

        let totalSum = 0;
        let count = 0;

        orders.forEach(o => {
            totalSum += parseFloat(o.total_price || 0);
            count++;

            // Shared status HTML
            let statusHtml = '';
            if (o.status === 'Kutilmoqda') statusHtml = '<span class="status-pill status-pending">Kutilmoqda</span>';
            else if (o.status === 'Jarayonda') statusHtml = '<span class="status-pill status-active">Jarayonda (Ishlab. chiqishda)</span>';
            else statusHtml = '<span class="status-pill status-delivered">Tayyor / O\'rnatildi</span>';

            // --- Dashboard View (All Orders) ---
            if (table) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${o.customer_name}</strong><br><small style="color:#888;">${o.customer_phone}</small></td>
                    <td>${o.prod_type}<br><small style="color:#888;">${o.model_name.length > 50 ? o.model_name.slice(0, 48) + '...' : o.model_name}</small></td>
                    <td>${new Date(o.deadline_date).toLocaleDateString()}</td>
                    <td style="font-weight:600;">${Number(o.total_price).toLocaleString()} UZS</td>
                    <td>${statusHtml}</td>
                    <td>
                        <button class="action-icon view-ord-btn" data-order='${JSON.stringify(o)}' style="font-size:1.1rem; border:none; background:transparent; cursor:pointer;" title="Shartnomani ko'rish">👁️</button>
                        <button class="action-icon edit-btn" data-order='${JSON.stringify(o)}' style="font-size:1.1rem; border:none; background:transparent; cursor:pointer; margin: 0 5px;" title="Tahrirlash">✏️</button>
                        <button class="action-icon del-btn" data-id="${o.id}" style="font-size:1.1rem; border:none; background:transparent; cursor:pointer; color:red;" title="O'chirish">🗑️</button>
                    </td>
                `;
                table.appendChild(tr);
            }

            // --- Installation / Production Board ---
            if (o.status !== 'Tayyor / Yetkazildi') {
                if (procTable) {
                    const otr = document.createElement('tr');
                    otr.innerHTML = `
                        <td><strong>#${o.id.slice(0, 6).toUpperCase()}</strong><br><small>${o.customer_name}</small></td>
                        <td>${statusHtml}</td>
                        <td style="color:#00d2ff; font-weight:600;">${o.worker_group || "Tayinlanmagan"}</td>
                        <td>
                            <button class="assign-btn" data-id="${o.id}" data-order='${JSON.stringify(o)}' style="background:#00d2ff; color:#000; border:none; padding:8px 15px; border-radius:10px; font-weight:600; cursor:pointer;">${o.worker_group ? "O'zgartirish" : "Guruh Tayinlash"}</button>
                            ${o.worker_group ? `<button class="complete-btn" data-id="${o.id}" style="background:#00ff88; color:#000; border:none; padding:8px 15px; border-radius:10px; font-weight:600; cursor:pointer; margin-left:5px;">✓ Bitirish</button>` : ''}
                        </td>
                    `;
                    procTable.appendChild(otr);
                }
            } else {
                // Completed
                if (compTable) {
                    const ctr = document.createElement('tr');
                    ctr.innerHTML = `
                        <td><strong>#${o.id.slice(0, 6).toUpperCase()}</strong><br><small>${o.customer_name}</small></td>
                        <td style="font-weight:600;">${Number(o.total_price).toLocaleString()} UZS</td>
                        <td style="color:#888;">${new Date().toLocaleDateString()}</td>
                        <td style="font-weight:600; color:#00ff88;">${o.worker_group || "Noma'lum"}</td>
                    `;
                    compTable.appendChild(ctr);
                }
            }
        });

        if (document.getElementById('kpiTotal')) document.getElementById('kpiTotal').textContent = totalSum.toLocaleString();
        if (document.getElementById('kpiCount')) document.getElementById('kpiCount').textContent = count;

        bindActionButtons();
    }

    function bindActionButtons() {
        document.querySelectorAll('.del-btn').forEach(b => {
            b.onclick = async () => {
                if (confirm("Uchirasizmi?")) {
                    const id = b.dataset.id;
                    try {
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
                document.getElementById('eCustomer').value = o.customer_name;
                document.getElementById('ePhone').value = o.customer_phone;
                document.getElementById('eStatus').value = o.status;
                editModal.classList.remove('hidden');
            };
        });

        document.querySelectorAll('.view-ord-btn').forEach(b => {
            b.onclick = () => {
                const o = JSON.parse(b.dataset.order);
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
                        </div>
                        <div class="inv-box">
                            <h3>Payment Method:</h3>
                            <p>${isDebt ? 'Muddatli To\'lov (Qarz)' : o.payment_type || 'Naqd'}</p>
                            <div class="amount-badge ${isDebt ? 'debt' : ''}">Total: ${Number(o.total_price).toLocaleString()} UZS</div>
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
                                    <span>Avto Harajatlar (10%):</span>
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
        });

        document.querySelectorAll('.assign-btn').forEach(b => {
            b.onclick = async () => {
                const o = JSON.parse(b.dataset.order);
                window.assignOrderId = o.id;
                window.reqMaterials = []; // reset bom

                // --- Auto Calculate BOM based on Formula (Aggregate all basket items) ---
                let totalPerimeter = 0;
                let totalArea = 0;
                let mainModel = '';

                try {
                    const parsedItems = JSON.parse(o.model_name);
                    parsedItems.forEach(it => {
                        if (it.type === 'rom' || it.type === 'rom_fortochka' || it.type === 'eshik') {
                            const perimeter = ((it.width * 2) + (it.height * 2)) * it.quantity;
                            totalPerimeter += perimeter;
                            totalArea += (it.width * it.height * it.quantity);
                            if (!mainModel) mainModel = it.materialName;
                        }
                    });
                } catch(e) {
                    const qty = parseInt(o.quantity) || 1;
                    totalPerimeter = ((parseFloat(o.width) * 2) + (parseFloat(o.height) * 2)) * qty;
                    totalArea = parseFloat(o.sq_meter);
                    mainModel = o.model_name;
                }

                // Get all materials to match
                let whMats = [];
                try {
                    const res = await supabase.from('romix_inventory').select('id, product_name, unit');
                    if (res.error) throw res.error;
                    whMats = (res.data || []).map(p => ({ id: p.id, name: p.product_name, unit: p.unit }));
                } catch(err) {
                    console.warn("Supabase warehouse fetch for BOM failed, using local fallback:", err);
                    whMats = [
                        { id: "prof-60", name: "Akfa 60 Series Profil", unit: "m" },
                        { id: "prof-70", name: "Akfa 70 Series Profil", unit: "m" },
                        { id: "prof-thermo", name: "Thermo 65 Insulation Profil", unit: "m" },
                        { id: "prof-eng", name: "Engelberg 76 Premium Profil", unit: "m" },
                        { id: "rez-1", name: "Kauchuk Zichlagich (Rezinka)", unit: "m" },
                        { id: "oyna-1", name: "Oddiy Oyna (Glass)", unit: "kv.m" },
                        { id: "oyna-2", name: "Ikki Qavatli Shisha-Paket", unit: "kv.m" }
                    ];
                }

                if (whMats && whMats.length) {
                    // Try to find matching profile
                    const prof = whMats.find(m => m.name.toLowerCase().includes(mainModel.toLowerCase()) || mainModel.toLowerCase().includes(m.name.toLowerCase()) || m.name.toLowerCase().includes('profil'));
                    if (prof && totalPerimeter > 0) window.reqMaterials.push({ product_id: prof.id, name: prof.name, qty: (totalPerimeter * 1.1).toFixed(1), unit: prof.unit });

                    // Try to find rezinka
                    const rez = whMats.find(m => m.name.toLowerCase().includes('rezin'));
                    if (rez && totalPerimeter > 0) window.reqMaterials.push({ product_id: rez.id, name: rez.name, qty: (totalPerimeter * 2).toFixed(1), unit: rez.unit });

                    // Try to find oyna
                    const oyna = whMats.find(m => m.name.toLowerCase().includes('oyna') || m.name.toLowerCase().includes('shisha'));
                    if (oyna && totalArea > 0) window.reqMaterials.push({ product_id: oyna.id, name: oyna.name, qty: (totalArea).toFixed(2), unit: oyna.unit });
                }

                renderReqMaterials();
                assignModal.classList.remove('hidden');
            };
        });

        document.querySelectorAll('.complete-btn').forEach(b => {
            b.onclick = async () => {
                if (confirm("Haqiqatdan bu ish to'liq topshirildimi?")) {
                    const id = b.dataset.id;
                    try {
                        const { error } = await supabase.from('sales_orders').update({ status: 'Tayyor / Yetkazildi' }).eq('id', id);
                        if (error) throw error;
                    } catch (err) {
                        console.warn("Supabase complete order failed, applying to local storage:", err);
                    }
                    const localRaw = localStorage.getItem('romix_orders_local');
                    if (localRaw) {
                        const localOrders = JSON.parse(localRaw);
                        const ord = localOrders.find(x => x.id === id);
                        if (ord) {
                            ord.status = 'Tayyor / Yetkazildi';
                            localStorage.setItem('romix_orders_local', JSON.stringify(localOrders));
                        }
                    }
                    loadOrders();
                }
            };
        });
    }

    // Save New
    document.getElementById('saveOrderBtn').onclick = async () => {
        if (orderItems.length === 0) return alert("Savatga kamida bitta mahsulot qo'shing!");

        const calcObj = calculateTotal();
        const typesSummary = Array.from(new Set(orderItems.map(it => it.typeName))).join(', ');
        
        // Compile all item names as string for list preview, and save JSON
        const itemsSummary = orderItems.map(it => `${it.materialName} (${it.quantity} ta)`).join(' + ');

        const newOrder = {
            customer_name: document.getElementById('oCustomer').value.trim() || 'Noma\'lum Mijoz',
            customer_phone: document.getElementById('oPhone').value.trim() || '---',
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
            status: 'Kutilmoqda',
            created_at: new Date().toISOString()
        };

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

        orderModal.classList.add('hidden');
        loadOrders();
    };

    // Edits
    document.getElementById('saveEditOrderBtn').onclick = async () => {
        const id = window.editingOrderId;
        const customer_name = document.getElementById('eCustomer').value;
        const customer_phone = document.getElementById('ePhone').value;
        const status = document.getElementById('eStatus').value;

        try {
            const { error } = await supabase.from('sales_orders').update({
                customer_name,
                customer_phone,
                status
            }).eq('id', id);
            if (error) throw error;
        } catch (err) {
            console.warn("Supabase update order failed, applying to local storage:", err);
        }

        const localRaw = localStorage.getItem('romix_orders_local');
        if (localRaw) {
            const localOrders = JSON.parse(localRaw);
            const ord = localOrders.find(x => x.id === id);
            if (ord) {
                ord.customer_name = customer_name;
                ord.customer_phone = customer_phone;
                ord.status = status;
                localStorage.setItem('romix_orders_local', JSON.stringify(localOrders));
            }
        }

        editModal.classList.add('hidden');
        loadOrders();
    };

    // Assignments & Print Material Requisition
    document.getElementById('saveAssignBtn').onclick = async () => {
        const grp = document.getElementById('aGroup').value;
        const oId = window.assignOrderId;

        if (window.reqMaterials.length === 0) {
            return alert("Ombordan olinishi kerak bo'lgan xom-ashyolarni kiritmadingiz!");
        }

        // 1. Update order
        try {
            const { error } = await supabase.from('sales_orders').update({
                worker_group: grp,
                status: 'Jarayonda'
            }).eq('id', oId);
            if (error) throw error;
        } catch (err) {
            console.warn("Supabase assign group failed, applying to local storage:", err);
        }

        const localRaw = localStorage.getItem('romix_orders_local');
        if (localRaw) {
            const localOrders = JSON.parse(localRaw);
            const ord = localOrders.find(x => x.id === oId);
            if (ord) {
                ord.worker_group = grp;
                ord.status = 'Jarayonda';
                localStorage.setItem('romix_orders_local', JSON.stringify(localOrders));
            }
        }

        // 2. Insert to material_requests
        let reqData = null;
        try {
            const res = await supabase.from('material_requests').insert([{
                order_id: oId,
                worker_group: grp,
                materials_json: window.reqMaterials,
                status: 'Kutilmoqda'
            }]).select().single();
            if (res.error) throw res.error;
            reqData = res.data;
        } catch (err) {
            console.warn("Supabase material request failed, using local mock:", err);
            reqData = {
                id: 'req-' + Date.now().toString().slice(-6),
                order_id: oId,
                worker_group: grp,
                materials_json: window.reqMaterials,
                status: 'Kutilmoqda'
            };
        }

        assignModal.classList.add('hidden');
        loadOrders();

        if (reqData) {
            // Print the slip for the warehouse
            const rId = reqData.id.slice(0, 8).toUpperCase();
            const createdDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

            let matHtmlRows = '';
            window.reqMaterials.forEach((m, idx) => {
                matHtmlRows += `
                    <tr>
                        <td style="text-align:center;">${(idx + 1).toString().padStart(2, '0')}.</td>
                        <td><b style="color:#222;">${m.name}</b></td>
                        <td style="text-align:center; font-weight:bold;">${m.qty}</td>
                        <td style="color:#45c4b0; font-weight:700;">${m.unit}</td>
                    </tr>
                `;
            });

            document.getElementById('invPaperContent').innerHTML = `
                <div class="inv-header" style="background: #3b82f6;">
                    <div class="inv-top">
                        <div>
                            <h1 class="inv-title">Requisition.</h1>
                            <div class="inv-id">REQ-${rId}</div>
                        </div>
                        <div class="inv-date-box">
                            <div style="font-size:0.9rem; opacity:0.8; text-transform:uppercase; letter-spacing:1px;">Req Date:</div>
                            <div style="font-size:1.1rem; font-weight:600;">${createdDate}</div>
                        </div>
                    </div>
                </div>

                <div class="inv-cards-row">
                    <div class="inv-box" style="border-top: 4px solid #3b82f6;">
                        <h3 style="color:#3b82f6">Target Group:</h3>
                        <p style="font-size:1.4rem; color:#222; font-weight:800; margin-top:10px;">${grp}</p>
                        <p>Authorized personnel only.</p>
                    </div>
                    <div class="inv-box">
                        <h3 style="color:#3b82f6">Transfer Status:</h3>
                        <div class="amount-badge" style="background:#f59e0b; font-size:1rem;">Pending Verification</div>
                        <p style="margin-top:10px; font-size:0.85rem;">Scan QR to trigger auto-deduction.</p>
                    </div>
                </div>

                <div class="qr-absolute">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${reqData.id}" style="width:120px; height:120px;">
                </div>

                <div class="inv-body">
                    <h2 style="margin-top:0; color:#444; font-size:1.3rem;">Requested Materials / BOM</h2>
                    <table class="inv-table">
                        <thead>
                            <tr>
                                <th style="width:10%; background:#3b82f6; text-align:center;">No.</th>
                                <th style="width:60%;">Material Name</th>
                                <th style="text-align:center;">Quantity</th>
                                <th style="background:#555;">Unit</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${matHtmlRows}
                        </tbody>
                    </table>

                    <div class="inv-footer-row">
                        <div class="terms-box" style="background:#3b82f6;">
                            <h4>Warehouse Instructions:</h4>
                            <p>Ushbu ruxsatnoma orqali ko'rsatilgan miqdordagi xom-ashyolar ombordan chiqarib beriladi. Ombor menejeri QR kodni skayner qilgandan keyingina bazadan avtomatik hisobdan yechiladi.</p>
                        </div>
                        <div class="sign-box">
                            <div class="sign-line"></div>
                            <div style="font-size:0.85rem; font-weight:600;">Guruh Bashlig'i Imzosi (Olib ketuvchi)</div>
                            <div style="margin-top:40px;" class="sign-line"></div>
                            <div style="font-size:0.85rem; font-weight:600;">Omborchi Imzosi (Beruvchi)</div>
                        </div>
                    </div>
                </div>
            `;

            mainApp.classList.add('hidden');
            printArea.classList.remove('hidden');
        }
    };

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
    const cAss = document.getElementById('closeAssignModal');
    if (cAss) cAss.onclick = () => assignModal.classList.add('hidden');

    document.getElementById('openOrderModal').onclick = () => {
        // Reset basket on each new order
        orderItems = [];
        renderBasket();
        calculateTotal();
        document.getElementById('oDeadline').value = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        orderModal.classList.remove('hidden');
        // 3D preview modal ochilгач o'lchamни oladi
        setTimeout(() => { try { window.update3DPreview(); } catch (e) {} }, 60);
    };

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

    syncMaterialPrices();
    loadWarehouseMaterials();
    loadOrders();
});
