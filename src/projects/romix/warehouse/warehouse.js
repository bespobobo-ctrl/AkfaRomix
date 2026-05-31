import { supabase } from '@/core/supabase.js';
import { LayoutService } from '@/components/LayoutService.js';
import { authService } from '@/services/auth/authService.js';
import { ROLES } from '@/constants';

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

        if (tabId === 'inventory') loadInventory();
        if (tabId === 'staff') loadStaff();
        if (tabId === 'history') loadHistory();
    }

    navButtons.forEach(btn => {
        btn.onclick = () => {
            const tab = btn.getAttribute('data-tab');
            if (tab) switchTab(tab);
        };
    });

    // --- Inventory Logic ---
    async function loadInventory() {
        const { data, error } = await supabase.from('romix_inventory').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error("Inventory error:", error);
            inventoryTable.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:red; padding:40px; font-weight:700;">Hujjatlar yuklanishida xatolik yuz berdi!</div>';
            return;
        }

        // Calculate Stats
        const totalItems = data.length;
        const lowStock = data.filter(p => p.stock_quantity < 10).length;
        const totalValue = data.reduce((acc, p) => acc + (p.price * p.stock_quantity), 0);

        document.getElementById('statTotalItems').textContent = totalItems;
        document.getElementById('statLowStock').textContent = lowStock;
        document.getElementById('statTodayIn').textContent = `$${totalValue.toLocaleString()}`;

        inventoryTable.innerHTML = '';
        if (data.length === 0) {
            inventoryTable.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px; color:#888; font-weight:600; font-size:1.1rem;">Hozircha omborda mahsulotlar mavjud emas.</div>';
            return;
        }

        data.forEach(p => {
            const metadata = p.metadata || {};
            
            // Defensive parsing of specs
            const uzunligi = metadata.uzunligi || p.description?.match(/(\d+)mm/)?.[1] || '---';
            const shakli = metadata.shakli || p.description?.split('|')?.[1]?.trim() || '---';
            const rangi = metadata.rangi || p.description?.split('|')?.[2]?.split('(')?.[0]?.trim() || '---';
            const rangTuri = metadata.rangTuri || p.description?.match(/\(([^)]+)\)/)?.[1] || '---';

            // Brand Logo Visual
            let brandName = metadata.brend || '';
            if (!brandName) {
                const brandsList = ['AKFA', 'RETPEN', 'Ekopen', 'ALTA PLAST', 'ALUBEST', 'ALUTEX', 'CRA'];
                for (let b of brandsList) {
                    if (p.product_name.toUpperCase().includes(b.toUpperCase())) {
                        brandName = b;
                        break;
                    }
                }
            }

            let brandBadgeHtml = '';
            if (brandName) {
                let logoSvg = '';
                if (brandName.toUpperCase().includes('AKFA')) {
                    logoSvg = `<svg viewBox="0 0 120 40" class="brand-logo-svg" style="height: 12px; width: 40px; margin-top:2px;"><text x="0" y="28" font-family="'Outfit', sans-serif" font-weight="900" font-size="28" fill="#FF3333">akfa</text></svg>`;
                } else if (brandName.toUpperCase().includes('RETPEN')) {
                    logoSvg = `<svg viewBox="0 0 120 40" class="brand-logo-svg" style="height: 12px; width: 45px; margin-top:2px;"><text x="0" y="28" font-family="'Outfit', sans-serif" font-weight="800" font-size="22" fill="#00D2FF">RETPEN</text></svg>`;
                } else if (brandName.toUpperCase().includes('EKOPEN')) {
                    logoSvg = `<svg viewBox="0 0 120 40" class="brand-logo-svg" style="height: 12px; width: 45px; margin-top:2px;"><text x="0" y="28" font-family="'Outfit', sans-serif" font-weight="800" font-size="22" fill="#FF8800">Ekopen</text></svg>`;
                } else {
                    logoSvg = `<span style="color:#ffffff; font-weight:700; font-size:0.65rem;">${brandName}</span>`;
                }
                brandBadgeHtml = `<span class="badge-pill brand-badge-pill" style="display:flex; align-items:center;">${logoSvg}</span>`;
            }

            // Color Swatch Matching
            let swatchColor = '';
            if (rangi) {
                const rUpper = rangi.toUpperCase();
                if (rUpper.includes('OQ')) swatchColor = '#FFFFFF';
                else if (rUpper.includes('QORA')) swatchColor = '#111111';
                else if (rUpper.includes('DUB') || rUpper.includes('TILLA')) swatchColor = '#CD7F32';
                else if (rUpper.includes('MOCHA')) swatchColor = '#4B3621';
            }
            
            let colorSwatchHtml = '';
            if (swatchColor) {
                colorSwatchHtml = `<div class="color-swatch" style="background:${swatchColor}; width:12px; height:12px; display:inline-block; border-radius:50%; border:1px solid rgba(255,255,255,0.3); margin-right:4px;"></div>`;
            }

            // Category visual image or SVG placeholder
            let mediaHtml = '';
            if (p.image_url) {
                mediaHtml = `<img src="${p.image_url}" class="card-visual-img">`;
            } else {
                let svgIcon = '';
                const catLower = (p.category || '').toLowerCase();
                const nameLower = (p.product_name || '').toLowerCase();
                
                if (catLower.includes('shtapik') || nameLower.includes('shtapik')) {
                    svgIcon = `<svg viewBox="0 0 100 100" class="card-visual-svg" style="stroke:rgba(255,255,255,0.3);"><path d="M 35,30 L 65,30 L 65,70 L 45,70 L 35,55 Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M 43,40 L 57,40 L 57,60" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="2,2"/></svg>`;
                } else if (catLower.includes('tokcha') || nameLower.includes('tokcha')) {
                    svgIcon = `<svg viewBox="0 0 100 100" class="card-visual-svg" style="stroke:rgba(255,255,255,0.3);"><path d="M 20,42 L 80,42 L 80,48 L 70,58 L 20,58 Z" fill="none" stroke="currentColor" stroke-width="3"/><line x1="35" y1="42" x2="35" y2="58" stroke="currentColor" stroke-width="2"/><line x1="50" y1="42" x2="50" y2="58" stroke="currentColor" stroke-width="2"/><line x1="65" y1="42" x2="65" y2="58" stroke="currentColor" stroke-width="2"/></svg>`;
                } else if (catLower.includes('lambri') || nameLower.includes('lambri')) {
                    svgIcon = `<svg viewBox="0 0 100 100" class="card-visual-svg" style="stroke:rgba(255,255,255,0.3);"><path d="M 15,35 L 70,35 L 75,45 L 85,45 L 85,55 L 75,55 L 70,65 L 15,65 Z" fill="none" stroke="currentColor" stroke-width="3"/><line x1="30" y1="35" x2="30" y2="65" stroke="currentColor" stroke-width="2" stroke-dasharray="2,2"/><line x1="50" y1="35" x2="50" y2="65" stroke="currentColor" stroke-width="2" stroke-dasharray="2,2"/></svg>`;
                } else {
                    svgIcon = `<svg viewBox="0 0 100 100" class="card-visual-svg" style="stroke:rgba(255,255,255,0.3);"><rect x="25" y="25" width="50" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="3"/><rect x="35" y="35" width="30" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3,1"/><line x1="25" y1="50" x2="75" y2="50" stroke="currentColor" stroke-width="2"/><line x1="50" y1="25" x2="50" y2="75" stroke="currentColor" stroke-width="2"/></svg>`;
                }
                mediaHtml = svgIcon;
            }

            const card = document.createElement('div');
            card.className = `premium-product-card ${p.stock_quantity < 10 ? 'low-stock' : ''}`;
            card.innerHTML = `
                <div class="card-visual-container">
                    ${mediaHtml}
                    <span class="stock-badge-floating ${p.stock_quantity < 10 ? 'low' : 'high'}">
                        ${p.stock_quantity < 10 ? '⚠️ Kam zaxira' : '✅ Yetarli'}
                    </span>
                </div>
                <div class="card-content">
                    <div class="card-badge-row">
                        <span class="badge-pill category-badge">${p.category || 'Profil'}</span>
                        ${brandBadgeHtml}
                    </div>
                    <h4 class="product-title">${p.product_name}</h4>
                    
                    <div class="specs-grid">
                        <div class="spec-chip">
                            <span class="spec-label">Uzunligi</span>
                            <span class="spec-val">${uzunligi === '---' ? '---' : uzunligi + ' mm'}</span>
                        </div>
                        <div class="spec-chip">
                            <span class="spec-label">Shakli</span>
                            <span class="spec-val">${shakli}</span>
                        </div>
                        <div class="spec-chip">
                            <span class="spec-label">Rangi</span>
                            <span class="spec-val" style="display:flex; align-items:center;">
                                ${colorSwatchHtml} ${rangi}
                            </span>
                        </div>
                        <div class="spec-chip">
                            <span class="spec-label">Yuzasi</span>
                            <span class="spec-val">${rangTuri}</span>
                        </div>
                    </div>
                    
                    <div class="card-footer-metrics">
                        <div class="metric-block">
                            <span class="metric-label">Mavjud</span>
                            <div class="metric-val-wrapper">
                                <span class="metric-number">${p.stock_quantity}</span>
                                <span class="metric-unit">${p.unit || 'dona'}</span>
                            </div>
                        </div>
                        <div class="metric-block" style="text-align:right;">
                            <span class="metric-label">Narxi</span>
                            <span class="metric-price">${p.price ? '$' + p.price.toLocaleString() : '---'}</span>
                        </div>
                    </div>
                    
                    <div class="card-actions-row">
                        <button class="action-btn-glass edit-btn" data-id="${p.id}">
                            ✏️ <span>Tahrirlash</span>
                        </button>
                        <button class="action-btn-glass delete-btn delete-accent" data-id="${p.id}">
                            🗑️ <span>O'chirish</span>
                        </button>
                    </div>
                </div>
            `;
            inventoryTable.appendChild(card);
        });

        // Rebind Edit/Delete listeners
        document.querySelectorAll('.delete-btn').forEach(b => {
            b.onclick = async () => {
                if (confirm('Ushbu mahsulotni o\'chirmoqchimisiz?')) {
                    await supabase.from('romix_inventory').delete().eq('id', b.dataset.id);
                    loadInventory();
                }
            };
        });

        document.querySelectorAll('.edit-btn').forEach(b => {
            b.onclick = () => {
                const p = data.find(x => x.id === b.dataset.id);
                if (p) {
                    window.editingProdId = p.id;
                    document.getElementById('eName').value = p.product_name;
                    document.getElementById('eQty').value = p.stock_quantity;
                    document.getElementById('ePrice').value = p.price;
                    editModal.classList.remove('hidden');
                }
            };
        });
    }

    // --- Search Feature ---
    const inventorySearch = document.getElementById('inventorySearch');
    if (inventorySearch) {
        inventorySearch.oninput = () => {
            const query = inventorySearch.value.toLowerCase().trim();
            const rows = inventoryTable.querySelectorAll('.premium-product-card');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(query)) {
                    row.style.display = "";
                } else {
                    row.style.display = "none";
                }
            });
        };
    }

    // --- Staff Logic ---
    async function loadStaff() {
        const staffGrid = document.getElementById('staffGrid');
        staffGrid.innerHTML = '<div style="color:#888; padding:20px;">Yuklanmoqda...</div>';

        const { data, error } = await supabase.from('romix_staff').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error(error);
            staffGrid.innerHTML = '<div style="color:red; padding:20px;">Xatolik yuz berdi. Supabase\'da romix_staff jadvali ochilganini tekshiring.</div>';
            return;
        }

        staffGrid.innerHTML = '';
        if (data.length === 0) {
            staffGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:#888;">Hozircha xodimlar yo\'q.</div>';
        }

        data.forEach(s => {
            const card = document.createElement('div');
            card.className = 'bento-item staff-card';
            card.innerHTML = `
                <div class="staff-avatar-wrapper">
                    <img src="${s.photo_url || 'https://via.placeholder.com/150'}" class="staff-avatar">
                    <div class="qr-overlay">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=ROMIX-STAFF-${s.id}" style="width:80px; border-radius:8px;">
                    </div>
                </div>
                <h3 style="margin:0; font-weight:700;">${s.full_name}</h3>
                <span class="premium-id">ID: ${s.id.slice(0, 8).toUpperCase()}</span>
                <p style="color:var(--adm-text-sec); font-size:0.9rem; margin:10px 0 20px 0; font-weight:500;">${s.role}</p>
                
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
                    await supabase.from('romix_staff').delete().eq('id', b.dataset.id);
                    loadStaff();
                }
            };
        });
    }

    saveStaffBtn.onclick = async () => {
        const name = document.getElementById('sName').value.trim();
        const role = document.getElementById('sRole').value;
        const photoFile = document.getElementById('sPhoto').files[0];

        if (!name) return alert('Ismni kiriting!');

        let photoUrl = '';
        if (photoFile) {
            const fileName = `romix_staff/${Date.now()}_${photoFile.name}`;
            const { data, error } = await supabase.storage.from('avatars').upload(fileName, photoFile);
            if (!error) {
                const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(fileName);
                photoUrl = publicData.publicUrl;
            } else {
                console.error("Upload error:", error);
            }
        }

        const { error } = await supabase.from('romix_staff').insert([{
            full_name: name,
            role: role,
            photo_url: photoUrl
        }]);

        if (error) alert('Xatolik: ' + error.message);
        else {
            staffModal.classList.add('hidden');
            loadStaff();
        }
    };

    // --- History Logic ---
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
        historyTable.innerHTML = '';
        data.forEach(tx => {
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

    function showInvoice(tx, directProduct = null) {
        const prod = directProduct || tx.romix_inventory || { product_name: "Mahsulot", unit: "" };

        document.getElementById('invNumber').textContent = `No. ${tx.id ? tx.id.slice(0, 8).toUpperCase() : 'NEW'}`;
        document.getElementById('invDate').textContent = new Date(tx.created_at || Date.now()).toLocaleDateString();
        document.getElementById('invProdName').textContent = prod.product_name || "Mahsulot";
        document.getElementById('invQty').textContent = tx.quantity;
        document.getElementById('invUnit').textContent = prod.unit || "";

        // Show supplier and price info
        if (document.getElementById('invSupplier')) {
            document.getElementById('invSupplier').textContent = tx.supplier_name || "---";
            document.getElementById('invPhone').textContent = tx.supplier_phone || "";
            document.getElementById('invPrice').textContent = tx.price ? `$${tx.price.toLocaleString()}` : "---";
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
            const price = parseFloat(document.getElementById('kPrice').value) || 0;
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
        const name = document.getElementById('eName').value;
        const qty = parseFloat(document.getElementById('eQty').value);
        const price = parseFloat(document.getElementById('ePrice').value);
        await supabase.from('romix_inventory').update({ product_name: name, stock_quantity: qty, price }).eq('id', window.editingProdId);
        editModal.classList.add('hidden');
        loadInventory();
    };

    // QR Scanning Logic
    const qrScanModal = document.getElementById('qrScanModal');
    const reqResultArea = document.getElementById('reqResultArea');
    const reqMatList = document.getElementById('reqMatList');

    document.getElementById('openScanModal').onclick = () => {
        document.getElementById('qrReqId').value = '';
        reqResultArea.classList.add('hidden');
        qrScanModal.classList.remove('hidden');
    };
    document.getElementById('closeScanModal').onclick = () => qrScanModal.classList.add('hidden');

    document.getElementById('searchReqBtn').onclick = async () => {
        let sid = document.getElementById('qrReqId').value.trim();
        if (!sid) return alert("Kodni kiriting!");

        // Remove 'REQ-' if entered
        if (sid.startsWith('REQ-')) sid = sid.substring(4);

        const { data: req, error } = await supabase.from('material_requests').select('*').eq('id', sid).maybeSingle();
        if (error || !req) return alert("Bunday ruxsatnoma topilmadi! Qaytadan tekshiring.");
        if (req.status === 'Tasdiqlandi') return alert("Diqqat! Bu ruxsatnomaga oldin material berilgan (Status: Tasdiqlandi).");

        document.getElementById('reqGroupName').textContent = `Maxsus Guruh: ${req.worker_group}`;
        reqMatList.innerHTML = '';
        window.currentReqData = req; // save for approval

        req.materials_json.forEach(m => {
            const li = document.createElement('li');
            li.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
            li.style.padding = "5px 0";
            li.innerHTML = `✅ ${m.name} <br> <b style="color:#00ff88;">+${m.qty} ${m.unit}</b> chiquvchi`;
            reqMatList.appendChild(li);
        });

        reqResultArea.classList.remove('hidden');
    };

    document.getElementById('approveReqBtn').onclick = async () => {
        const req = window.currentReqData;
        if (!req) return;

        // Loop and subtract qty
        for (let m of req.materials_json) {
            // Get current stock
            const { data: prod } = await supabase.from('romix_inventory').select('stock_quantity').eq('id', m.product_id).maybeSingle();
            if (prod) {
                // Subtract
                await supabase.from('romix_inventory').update({
                    stock_quantity: (parseFloat(prod.stock_quantity) || 0) - m.qty
                }).eq('id', m.product_id);

                // Add to transactions as 'OUT'
                await supabase.from('romix_transactions').insert([{
                    product_id: m.product_id,
                    type: 'OUT',
                    quantity: m.qty,
                    note: `Romix Sotuv (Buyurtma/Guruh: ${req.worker_group})`
                }]);
            }
        }

        // Change request status
        await supabase.from('material_requests').update({ status: 'Tasdiqlandi' }).eq('id', req.id);

        alert(`✅ Ruxsatnoma tasdiqlandi. Barcha mahsulotlar Ombordan muvaffaqiyatli chiqim qilingan!`);
        qrScanModal.classList.add('hidden');
        loadInventory(); // reload
    };

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
                unit: 'dona',
                price: 0,
                stock_quantity: existing ? (parseFloat(existing.stock_quantity) || 0) + soni : soni,
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

            // Log Transaction
            const txData = {
                product_id: product.id,
                type: 'IN',
                quantity: soni,
                note: `Profil Kirim - ${desc}`
            };

            const { data: tx, error: txError } = await supabase.from('romix_transactions').insert([txData]).select().single();

            // Build virtual transaction for invoice view
            const virtualTx = {
                ...(tx || { id: 'NEW-' + Date.now(), created_at: new Date().toISOString() }),
                quantity: soni,
                supplier_name: 'Romix Ichki',
                supplier_phone: '---',
                price: 0,
                note: desc
            };

            showInvoice(virtualTx, product);
            profilKirimModal.classList.add('hidden');
            if (window.resetProfilKirimForm) window.resetProfilKirimForm();
            loadInventory();
        } catch (err) {
            console.error("Profil Kirim Error:", err);
            alert("Xatolik yuz berdi: " + err.message);
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

    loadInventory();
});
