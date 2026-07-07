import { supabase } from '@/core/supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || (user.role !== 'showroom' && user.role !== 'admin')) {
        window.location.href = '/';
    }

    document.getElementById('userName').textContent = user.full_name || "Showroom Menejeri";

    const inModal = document.getElementById('inModal');
    const editModal = document.getElementById('editModal');
    const outModal = document.getElementById('outModal');
    const installModal = document.getElementById('installModal');
    const inventoryTable = document.getElementById('inventoryTable');
    const mainApp = document.getElementById('mainApp');
    const printArea = document.getElementById('printArea');
    document.getElementById('closePrintBtn')?.addEventListener('click', () => location.reload());

    let allProducts = [];

    async function loadInventory() {
        const { data, error } = await supabase.from('showroom_products').select('*').order('created_at', { ascending: false });
        if (error) return;

        allProducts = data || [];
        renderTable(allProducts);
        updateKPIs(allProducts);
        populateOutSelect(allProducts);
    }

    function updateKPIs(data) {
        let doors = 0, windows = 0, totalVal = 0;
        data.forEach(p => {
            if (p.current_stock > 0) {
                if (p.category === 'Eshik') doors += p.current_stock;
                if (p.category === 'Rom') windows += p.current_stock;
                totalVal += p.current_stock * (parseFloat(p.price) || 0);
            }
        });
        document.getElementById('kpiDoors').textContent = doors;
        document.getElementById('kpiWindows').textContent = windows;
        document.getElementById('kpiTotalVal').textContent = totalVal.toLocaleString();
    }

    function renderTable(data) {
        inventoryTable.innerHTML = '';
        data.forEach(p => {
            const inStock = p.current_stock > 0;
            const accentColor = inStock ? '#f97316' : '#ef4444';
            const card = document.createElement('div');
            card.style.cssText = `border-top:3px solid ${accentColor}; border-radius:16px; background:var(--adm-surface); border:1px solid var(--adm-border); border-top:3px solid ${accentColor}; padding:16px; display:flex; flex-direction:column; gap:10px; box-shadow:var(--adm-shadow);`;
            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="background:${accentColor}; width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.25rem; color:#fff; flex-shrink:0;">
                        ${p.category === 'Eshik' ? '🚪' : '🪟'}
                    </div>
                    <div style="min-width:0;">
                        <div style="font-weight:700; color:var(--adm-text); font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.name}</div>
                        <div style="font-size:0.7rem; color:var(--adm-text-sec); margin-top:2px;">ID: ${p.id.slice(0, 6).toUpperCase()}</div>
                    </div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:var(--adm-text-sec); border-top:1px dashed var(--adm-border); padding-top:9px;">
                    <span class="showroom-accent" style="font-weight:700;">${p.category}</span><span>${p.color || '-'}</span>
                </div>
                <div style="font-size:0.76rem; color:var(--adm-text-sec);">O'lcham: <strong style="color:var(--adm-text);">${p.dimensions || 'Standart'}</strong></div>
                <span class="stock-badge ${inStock ? 'stock-ok' : 'stock-low'}" style="align-self:flex-start;">
                    ${inStock ? p.current_stock + ' dona mavjud' : 'Sotilgan / Yo\'q'}
                </span>
                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed var(--adm-border); padding-top:9px; margin-top:2px;">
                    <strong style="font-size:0.95rem; color:var(--adm-text);">${Number(p.price || 0).toLocaleString()} UZS</strong>
                    <div>
                        <button class="action-icon edit-btn" data-id="${p.id}" style="font-size:1.05rem; border:none; background:transparent; cursor:pointer;" title="Tahrirlash">✏️</button>
                        <button class="action-icon del-btn" data-id="${p.id}" style="font-size:1.05rem; border:none; background:transparent; cursor:pointer; color:#ef4444;" title="O'chirish">🗑️</button>
                    </div>
                </div>
            `;
            inventoryTable.appendChild(card);
        });

        document.querySelectorAll('.edit-btn').forEach(b => {
            b.onclick = () => {
                const p = allProducts.find(x => x.id === b.dataset.id);
                if (p) {
                    window.editingProdId = p.id;
                    document.getElementById('eQty').value = p.current_stock;
                    document.getElementById('ePrice').value = p.price;
                    editModal.classList.remove('hidden');
                }
            };
        });

        document.querySelectorAll('.del-btn').forEach(b => {
            b.onclick = async () => {
                if (confirm("Ushbu tayyor mahsulotni ro'yxatdan butunlay o'chirasizmi?")) {
                    await supabase.from('showroom_products').delete().eq('id', b.dataset.id);
                    loadInventory();
                }
            };
        });
    }

    function populateOutSelect(data) {
        const sel = document.getElementById('outProduct');
        sel.innerHTML = '<option value="">-- Tanlang --</option>';
        data.filter(p => p.current_stock > 0).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.name} - ${p.color} (${p.current_stock} dona mavjud)`;
            opt.dataset.stock = p.current_stock;
            sel.appendChild(opt);
        });
    }

    // Modal Triggers
    document.getElementById('openInModalBtn').onclick = () => inModal.classList.remove('hidden');
    document.getElementById('closeInModal').onclick = () => inModal.classList.add('hidden');

    document.getElementById('openOutModalBtn').onclick = () => outModal.classList.remove('hidden');
    document.getElementById('closeOutModal').onclick = () => outModal.classList.add('hidden');

    document.getElementById('closeEditModal').onclick = () => editModal.classList.add('hidden');

    // Add Stock
    document.getElementById('saveInBtn').onclick = async () => {
        const name = document.getElementById('mName').value;
        const category = document.getElementById('mCategory').value;
        const dimensions = document.getElementById('mSizes').value;
        const color = document.getElementById('mColor').value;
        const qty = parseInt(document.getElementById('mQty').value) || 0;
        const price = parseFloat(document.getElementById('mPrice').value) || 0;

        if (!name) return alert("Nomi yozilishi shart!");

        const saveInBtn = document.getElementById('saveInBtn');
        if (saveInBtn.disabled) return;
        saveInBtn.disabled = true;
        const saveInBtnOrigText = saveInBtn.textContent;
        saveInBtn.textContent = 'Saqlanmoqda...';

        /*
        User SQL:
        CREATE TABLE IF NOT EXISTS showroom_products ( id UUID DEFAULT gen_random_uuid() PRIMARY KEY, name TEXT NOT NULL, category TEXT, dimensions TEXT, color TEXT, current_stock INTEGER DEFAULT 0, price DECIMAL(12,2), image_url TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) );
        */

        await supabase.from('showroom_products').insert([{
            name, category, dimensions, color, current_stock: qty, price
        }]);

        saveInBtn.disabled = false;
        saveInBtn.textContent = saveInBtnOrigText;
        inModal.classList.add('hidden');
        loadInventory();

        // Reset
        document.getElementById('mName').value = '';
        document.getElementById('mSizes').value = '';
        document.getElementById('mColor').value = '';
        document.getElementById('mPrice').value = '';
    };

    // Remove stock / Sale
    document.getElementById('saveOutBtn').onclick = async () => {
        const sel = document.getElementById('outProduct');
        const pId = sel.value;
        const outQty = parseInt(document.getElementById('outQty').value) || 0;

        if (!pId || outQty <= 0) return alert("To'g'ri tanlang!");

        const currentStock = parseInt(sel.options[sel.selectedIndex].dataset.stock);
        if (outQty > currentStock) return alert("Bazada buncha mahsulot yo'q!");

        await supabase.from('showroom_products').update({
            current_stock: currentStock - outQty
        }).eq('id', pId);

        outModal.classList.add('hidden');
        loadInventory();
    };

    // ============================================================
    // ISHLAB CHIQARISHDAN KELGAN BUYURTMALAR — o'rnatishga brigada
    // biriktirish, muddat belgilash va bajarilganini qayd etish
    // ============================================================
    let currentInstallOrderId = null;
    let romixBrigades = [];
    let installMaterialOptions = [];
    window.installMaterials = [];

    async function loadBrigadesAndMaterialOptions() {
        try {
            const { data, error } = await supabase.from('romix_brigades').select('*').order('name');
            if (error) throw error;
            romixBrigades = data || [];
        } catch (err) {
            console.warn("loadBrigades failed (romix_brigades jadvali mavjudligini tekshiring):", err);
            romixBrigades = [];
        }
        const sel = document.getElementById('installGroup');
        if (sel) {
            sel.innerHTML = romixBrigades.length
                ? romixBrigades.map(b => `<option value="${b.name}">${b.name}</option>`).join('')
                : '<option value="">Brigada topilmadi</option>';
        }

        try {
            const { data, error } = await supabase.from('romix_inventory').select('id, product_name, unit').order('product_name');
            if (error) throw error;
            installMaterialOptions = data || [];
        } catch (err) {
            console.warn("loadInstallMaterialOptions failed:", err);
            installMaterialOptions = [];
        }
        const matSel = document.getElementById('installMatSel');
        if (matSel) {
            matSel.innerHTML = installMaterialOptions.map(p => `<option value="${p.id}" data-name="${p.product_name}" data-unit="${p.unit}">${p.product_name} (${p.unit})</option>`).join('');
        }
    }

    function renderInstallMatList() {
        const list = document.getElementById('installMatList');
        if (!list) return;
        if (window.installMaterials.length === 0) {
            list.innerHTML = '<div style="font-size:0.72rem; color:var(--adm-text-sec);">Hozircha material qo\'shilmagan</div>';
            return;
        }
        list.innerHTML = window.installMaterials.map((m, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:6px 10px; border-radius:8px; font-size:0.75rem;">
                <span>${m.product_name} — <strong>${m.qty} ${m.unit}</strong></span>
                <button type="button" class="rm-install-mat" data-idx="${idx}" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:0.9rem;">✕</button>
            </div>
        `).join('');
        document.querySelectorAll('.rm-install-mat').forEach(btn => {
            btn.onclick = () => {
                window.installMaterials.splice(parseInt(btn.dataset.idx), 1);
                renderInstallMatList();
            };
        });
    }

    document.getElementById('addInstallMatBtn').onclick = () => {
        const sel = document.getElementById('installMatSel');
        const qtyInput = document.getElementById('installMatQty');
        const qty = parseFloat(qtyInput.value);
        if (!sel.value || !qty || qty <= 0) return alert("Material va to'g'ri miqdorni tanlang!");
        const opt = sel.options[sel.selectedIndex];
        window.installMaterials.push({
            product_id: sel.value,
            product_name: opt.dataset.name,
            unit: opt.dataset.unit,
            qty: qty
        });
        qtyInput.value = '';
        renderInstallMatList();
    };

    // Jonli teskari sanoq: o'rnatish muddati uchun (sales.js dagi bir xil naqsh)
    function tickInstallCountdowns() {
        document.querySelectorAll('.countdown-live').forEach(el => {
            if (!el.dataset.target) return;
            const target = new Date(el.dataset.target);
            target.setHours(23, 59, 59, 999);
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
    if (!window.__romixShowroomCountdownStarted) {
        window.__romixShowroomCountdownStarted = true;
        setInterval(tickInstallCountdowns, 1000);
    }

    async function loadIncomingProduction() {
        const grid = document.getElementById('incomingProductionGrid');
        if (!grid) return;

        let orders = [];
        try {
            const { data, error } = await supabase.from('sales_orders').select('*').eq('production_stage', 'tayyor_omborda').order('created_at', { ascending: false });
            if (error) throw error;
            orders = data || [];
        } catch (err) {
            console.warn("loadIncomingProduction fetch failed:", err);
        }

        if (orders.length === 0) {
            grid.innerHTML = '<div style="text-align:center; color:var(--adm-text-sec); padding:20px; grid-column:1/-1;">Hozircha ishlab chiqarishdan kelgan buyurtma yo\'q</div>';
            return;
        }

        let matsByOrder = {};
        try {
            const { data, error } = await supabase.from('romix_installation_materials').select('*').in('order_id', orders.map(o => o.id));
            if (error) throw error;
            (data || []).forEach(m => {
                if (!matsByOrder[m.order_id]) matsByOrder[m.order_id] = [];
                matsByOrder[m.order_id].push(m);
            });
        } catch (err) {
            console.warn("loadIncomingProduction installation_materials fetch failed:", err);
        }

        const today = new Date(); today.setHours(0, 0, 0, 0);

        grid.innerHTML = orders.map(o => {
            const isInstalled = o.install_status === 'Bajarildi';
            const isAssigned = !!o.install_group;
            const isOverdue = isAssigned && !isInstalled && o.install_deadline && new Date(o.install_deadline) < today;
            const accentColor = isInstalled ? '#00ff88' : (isOverdue ? '#ef4444' : (isAssigned ? '#00d2ff' : '#f97316'));
            const mats = matsByOrder[o.id] || [];
            const matsHtml = mats.length
                ? `<div style="font-size:0.7rem; color:var(--adm-text-sec); border-top:1px dashed var(--adm-border); padding-top:6px; margin-top:4px;">📦 ${mats.map(m => `${m.product_name} (${m.qty} ${m.unit})`).join(', ')}</div>`
                : '';

            let bodyHtml = '';
            if (!isAssigned) {
                bodyHtml = `<button class="install-assign-btn" data-id="${o.id}" data-name="${(o.customer_name || '').replace(/"/g, '')}" style="width:100%; background:#00d2ff; color:#000; border:none; padding:9px; border-radius:10px; font-weight:700; font-size:0.78rem; cursor:pointer; margin-top:6px;">🚚 O'rnatishga Yuborish</button>`;
            } else {
                const deadlineStr = o.install_deadline ? new Date(o.install_deadline).toLocaleDateString('uz-UZ') : '—';
                const deadlineHtml = isInstalled
                    ? `<div style="font-size:0.72rem; color:var(--adm-text-sec);">⏳ Muddat edi: <strong>${deadlineStr}</strong></div>`
                    : `<div class="countdown-live" data-target="${o.install_deadline}" style="font-size:0.72rem; font-weight:700;"></div>`;
                bodyHtml = `
                    <div style="font-size:0.75rem; color:var(--adm-text-sec); border-top:1px dashed var(--adm-border); padding-top:8px; margin-top:6px;">Brigada: <strong style="color:#00d2ff;">${o.install_group}</strong></div>
                    ${deadlineHtml}
                    ${matsHtml}
                    <button class="install-contract-btn" data-id="${o.id}" style="width:100%; background:rgba(255,255,255,0.08); color:var(--adm-text); border:1px solid var(--adm-border); padding:8px; border-radius:10px; font-weight:600; font-size:0.74rem; cursor:pointer; margin-top:4px;">📄 Shartnoma / Dalolatnoma</button>
                    ${isInstalled
                        ? `<span style="display:inline-block; margin-top:6px; background:rgba(0,255,136,0.1); color:#00ff88; padding:4px 10px; border-radius:12px; font-size:0.7rem; font-weight:700;">✓ O'rnatildi</span>`
                        : `<button class="install-complete-btn" data-id="${o.id}" style="width:100%; background:#00ff88; color:#000; border:none; padding:9px; border-radius:10px; font-weight:700; font-size:0.78rem; cursor:pointer; margin-top:6px;">✓ O'rnatildi Deb Belgilash</button>`
                    }
                `;
            }

            return `<div style="background:var(--adm-surface); border:1px solid var(--adm-border); border-top:3px solid ${accentColor}; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:4px; box-shadow:var(--adm-shadow);">
                <div style="font-weight:700; color:var(--adm-text); font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${o.customer_name || 'Noma\'lum'}</div>
                <div style="font-size:0.72rem; color:var(--adm-text-sec);">${o.prod_type || ''} • ${o.quantity || 1} ta</div>
                ${bodyHtml}
            </div>`;
        }).join('');

        tickInstallCountdowns(); // darhol bo'yash, 1 soniya kutmasdan

        document.querySelectorAll('.install-assign-btn').forEach(btn => {
            btn.onclick = async () => {
                currentInstallOrderId = btn.dataset.id;
                document.getElementById('installOrderInfo').textContent = `Mijoz: ${btn.dataset.name}`;
                await loadBrigadesAndMaterialOptions();
                document.getElementById('installDeadline').value = '';
                window.installMaterials = [];
                renderInstallMatList();
                installModal.classList.remove('hidden');
            };
        });

        document.querySelectorAll('.install-complete-btn').forEach(btn => {
            btn.onclick = async () => {
                if (!confirm("Ushbu buyurtma o'rnatilib bo'ldimi?")) return;
                try {
                    const { error } = await supabase.from('sales_orders').update({
                        install_status: 'Bajarildi',
                        status: 'Tayyor / Yetkazildi',
                        completed_at: new Date().toISOString()
                    }).eq('id', btn.dataset.id);
                    if (error) throw error;
                } catch (err) {
                    alert("Xatolik: " + err.message);
                    return;
                }
                loadIncomingProduction();
            };
        });

        document.querySelectorAll('.install-contract-btn').forEach(btn => {
            btn.onclick = () => {
                const o = orders.find(x => x.id === btn.dataset.id);
                if (o) showInstallationContract(o, matsByOrder[o.id] || []);
            };
        });
    }

    // ============================================================
    // O'RNATISH DALOLATNOMASI — 2 tomonlama premium shartnoma (chop etish uchun)
    // ============================================================
    function showInstallationContract(o, mats) {
        const createdDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const deadlineStr = o.install_deadline ? new Date(o.install_deadline).toLocaleDateString('en-GB') : '---';
        const totalPrice = Number(o.total_price) || 0;
        const paidAmount = Number(o.paid_amount) || 0;
        const isFullyPaid = o.payment_type !== 'Qarz' || paidAmount >= totalPrice;
        const remaining = isFullyPaid ? 0 : Math.max(0, totalPrice - paidAmount);

        const matsRows = mats.length
            ? mats.map((m, idx) => `
                <tr>
                    <td>${(idx + 1).toString().padStart(2, '0')}.</td>
                    <td><b style="color:#222;">${m.product_name}</b></td>
                    <td>${m.qty} ${m.unit}</td>
                </tr>
            `).join('')
            : `<tr><td colspan="3" style="text-align:center; color:#999;">Aksesuar ro'yxati kiritilmagan</td></tr>`;

        document.getElementById('invPaperContent').innerHTML = `
            <div class="inv-header">
                <div class="inv-top">
                    <div>
                        <h1 class="inv-title">O'rnatish<br>Dalolatnomasi</h1>
                        <div class="inv-id">Shartnoma No. ${o.id.slice(0, 8).toUpperCase()}</div>
                    </div>
                    <div class="inv-date-box">
                        <div style="font-size:0.9rem; opacity:0.85; text-transform:uppercase; letter-spacing:1px;">Sana:</div>
                        <div style="font-size:1.1rem; font-weight:600;">${createdDate}</div>
                    </div>
                </div>
            </div>

            <div class="inv-cards-row">
                <div class="inv-box">
                    <h3>1-Tomon (Buyurtmachi):</h3>
                    <p style="font-size:1.1rem; color:#f97316; font-weight:700;">${o.customer_name || "Noma'lum"}</p>
                    <p><b>Telefon:</b> ${o.customer_phone || '---'}</p>
                    <p><b>Manzil:</b> ${o.customer_address || '---'}</p>
                </div>
                <div class="inv-box">
                    <h3>2-Tomon (Ijrochi Brigada):</h3>
                    <p style="font-size:1.1rem; color:#f97316; font-weight:700;">AKFA Romix</p>
                    <p><b>Brigada:</b> ${o.install_group || '---'}</p>
                    <p><b>O'rnatish muddati:</b> ${deadlineStr}</p>
                </div>
            </div>

            <div class="qr-absolute">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=INSTALL-${o.id.slice(0, 8)}" style="width:100px; height:100px;">
            </div>

            <div class="inv-body">
                <h3 style="color:#222; font-size:1.05rem; margin-bottom:12px;">Mahsulot: ${o.prod_type || 'Mahsulot'} — ${o.quantity || 1} dona</h3>

                <table class="inv-table">
                    <thead>
                        <tr>
                            <th style="width:8%;">No.</th>
                            <th>O'rnatish uchun aksesuar / material</th>
                            <th>Miqdor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${matsRows}
                    </tbody>
                </table>

                <div style="display:flex; justify-content:flex-end; margin-top:20px; font-size:0.85rem; line-height:1.6; color:#333;">
                    <div style="width:300px; background:#f8fafc; padding:15px; border-radius:12px; border:1px solid #e2e8f0;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                            <span>Jami Buyurtma Summasi:</span>
                            <strong>${totalPrice.toLocaleString()} UZS</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                            <span>To'langan:</span>
                            <strong style="color:#10b981;">${paidAmount.toLocaleString()} UZS</strong>
                        </div>
                        <hr style="border:none; border-top:1px solid #cbd5e1; margin:8px 0;">
                        <div style="display:flex; justify-content:space-between; font-size:1.15rem; font-weight:800; color:${remaining > 0 ? '#ef4444' : '#0f172a'};">
                            <span>O'rnatishda olinadigan qoldiq:</span>
                            <span>${remaining.toLocaleString()} UZS</span>
                        </div>
                    </div>
                </div>

                <div class="inv-footer-row">
                    <div class="terms-box ${remaining > 0 ? 'debt-terms' : ''}" style="${remaining > 0 ? 'background:#fff; color:#ef4444; border:2px dashed #ef4444;' : ''}">
                        <h4>Shartlar:</h4>
                        <p>${remaining > 0
                ? `Brigada o'rnatishni yakunlagandan so'ng, mijozdan <b>${remaining.toLocaleString()} UZS</b> qoldiq summani naqd yoki karta orqali qabul qilib olishi shart. Ikkala tomon ushbu dalolatnomani imzolash orqali o'rnatish ishlari sifati va miqdori bo'yicha kelishuvga erishdi.`
                : `To'lov to'liq amalga oshirilgan. Ikkala tomon ushbu dalolatnomani imzolash orqali o'rnatish ishlari sifati va miqdori bo'yicha kelishuvga erishdi.`}
                        </p>
                    </div>
                    <div class="sign-box-row">
                        <div class="sign-box">
                            <div class="sign-line"></div>
                            <div style="font-size:0.85rem; font-weight:600;">Buyurtmachi Imzosi</div>
                        </div>
                        <div class="sign-box">
                            <div class="sign-line"></div>
                            <div style="font-size:0.85rem; font-weight:600;">Brigada Imzosi</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        mainApp.classList.add('hidden');
        printArea.classList.remove('hidden');
    }

    document.getElementById('closeInstallModal').onclick = () => installModal.classList.add('hidden');

    document.getElementById('saveInstallBtn').onclick = async () => {
        const grp = document.getElementById('installGroup').value;
        const deadline = document.getElementById('installDeadline').value;
        if (!grp) return alert("Brigadani tanlang!");
        if (!deadline) return alert("O'rnatish muddatini tanlang!");

        const saveInstallBtn = document.getElementById('saveInstallBtn');
        if (saveInstallBtn.disabled) return;
        saveInstallBtn.disabled = true;
        const saveInstallBtnOrigText = saveInstallBtn.textContent;
        saveInstallBtn.textContent = 'Tekshirilmoqda...';

        try {
            // Pre-check stock sufficiency for every installation material row BEFORE deducting anything
            const stockMap = {};
            const shortages = [];
            for (const m of window.installMaterials) {
                const { data: prod } = await supabase.from('romix_inventory').select('stock_quantity').eq('id', m.product_id).maybeSingle();
                const current = prod ? (parseFloat(prod.stock_quantity) || 0) : 0;
                stockMap[m.product_id] = current;
                if (current < m.qty) {
                    shortages.push(`${m.product_name}: kerak ${m.qty} ${m.unit}, omborda bor-yo'g'i ${current} ${m.unit}`);
                }
            }
            if (shortages.length > 0) {
                alert(`❌ Omborda yetarli mahsulot yo'q:\n\n${shortages.join('\n')}`);
                return;
            }

            const { error } = await supabase.from('sales_orders').update({
                install_group: grp,
                install_deadline: deadline,
                install_status: 'Tayinlangan'
            }).eq('id', currentInstallOrderId);
            if (error) throw error;

            for (const m of window.installMaterials) {
                await supabase.from('romix_inventory').update({ stock_quantity: stockMap[m.product_id] - m.qty }).eq('id', m.product_id);
                await supabase.from('romix_transactions').insert([{
                    product_id: m.product_id,
                    type: 'OUT',
                    quantity: m.qty,
                    note: `O'rnatish uchun (Brigada: ${grp})`
                }]);
                await supabase.from('romix_installation_materials').insert([{
                    order_id: currentInstallOrderId,
                    product_id: m.product_id,
                    product_name: m.product_name,
                    qty: m.qty,
                    unit: m.unit
                }]);
            }
        } catch (err) {
            alert("Biriktirishda xatolik: bazada 'install_group'/'install_deadline'/'install_status'/'romix_brigades'/'romix_installation_materials' ustunlari/jadvallari mavjudligini tekshiring.");
            console.warn("install assign failed:", err);
            return;
        } finally {
            saveInstallBtn.disabled = false;
            saveInstallBtn.textContent = saveInstallBtnOrigText;
        }
        installModal.classList.add('hidden');
        loadIncomingProduction();
    };

    // Edit
    document.getElementById('saveEditBtn').onclick = async () => {
        const qty = parseInt(document.getElementById('eQty').value);
        const price = parseFloat(document.getElementById('ePrice').value);
        if (isNaN(qty) || qty < 0) return alert("Iltimos, to'g'ri miqdor kiriting (0 dan kichik bo'lmasligi kerak)!");
        if (isNaN(price) || price < 0) return alert("Iltimos, to'g'ri narx kiriting (0 dan kichik bo'lmasligi kerak)!");
        await supabase.from('showroom_products').update({
            current_stock: qty,
            price: price
        }).eq('id', window.editingProdId);
        editModal.classList.add('hidden');
        loadInventory();
    };

    // Filter
    const catF = document.getElementById('catFilter');
    const searchInp = document.getElementById('searchInput');

    function applyFilters() {
        const srt = searchInp.value.toLowerCase();
        const cat = catF.value;
        let filtered = allProducts.filter(p => {
            const mName = p.name.toLowerCase().includes(srt) || (p.dimensions && p.dimensions.toLowerCase().includes(srt));
            const mCat = cat === 'All' ? true : p.category === cat;
            return mName && mCat;
        });
        renderTable(filtered);
    }
    catF.addEventListener('change', applyFilters);
    searchInp.addEventListener('input', applyFilters);

    // Theme Toggle
    const themeBtn = document.getElementById('themeToggle');
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeBtn.textContent = '☀️';
        } else {
            document.body.classList.remove('dark-mode');
            themeBtn.textContent = '🌙';
        }
    };

    themeBtn.onclick = () => {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeBtn.textContent = isDark ? '☀️' : '🌙';
    };

    if (localStorage.getItem('theme') === 'dark') applyTheme('dark');

    // Logout
    document.getElementById('logoutBtn').onclick = () => {
        localStorage.removeItem('currentUser');
        window.location.href = '/';
    };

    loadInventory();
    loadIncomingProduction();
});
