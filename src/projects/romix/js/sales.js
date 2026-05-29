import { supabase } from '@/core/supabase.js';

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
    const oModel = document.getElementById('oModel');
    const aMatSel = document.getElementById('aMatSel');
    const reqMatList = document.getElementById('reqMatList');

    const mainApp = document.getElementById('mainApp');
    const printArea = document.getElementById('printArea');

    // Values
    const PRODUCTION_COST = 1000000;
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

    // Load available materials from warehouse
    async function loadModels() {
        const { data } = await supabase.from('warehouse_products').select('id, name, price, unit').eq('category', 'Profil');
        oModel.innerHTML = '';
        if (data && data.length) {
            data.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `${p.name} (${p.price || 0} so'm / ${p.unit})`;
                opt.dataset.price = p.price || 0;
                opt.dataset.name = p.name;
                oModel.appendChild(opt);
            });
            calculateTotal();
        } else {
            oModel.innerHTML = '<option value="">Maxsulot topilmadi</option>';
        }
    }

    // Load warehouse materials for the BOM Request
    async function loadWarehouseMaterials() {
        const { data } = await supabase.from('warehouse_products').select('id, name, unit');
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
        const { data, error } = await supabase.from('sales_orders').select('*').order('created_at', { ascending: false });
        if (error) return;

        // Clear views
        const table = document.getElementById('ordersTable');
        const procTable = document.getElementById('processOrdersTable');
        const compTable = document.getElementById('completedOrdersTable');

        if (table) table.innerHTML = '';
        if (procTable) procTable.innerHTML = '';
        if (compTable) compTable.innerHTML = '';

        let totalSum = 0;
        let count = 0;

        data.forEach(o => {
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
                    <td>${o.model_name}<br><small style="color:#888;">B: ${o.height}m / Uz: ${o.width}m</small></td>
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
                    await supabase.from('sales_orders').delete().eq('id', b.dataset.id);
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
                                <tr>
                                    <td>01.</td>
                                    <td>
                                        <b style="color:#222;">${o.prod_type || 'Mahsulot'} - ${o.model_name}</b><br>
                                        <small style="color:#777;">O'lchamlari: Balandlik: ${o.height}m / Uzunlik: ${o.width}m</small>
                                    </td>
                                    <td>${Number((o.total_price || 0) / (o.quantity || 1)).toLocaleString()}</td>
                                    <td>${o.quantity || 1} ta</td>
                                    <td style="color:#45c4b0;">${Number(o.total_price).toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div class="inv-footer-row">
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

                // --- Auto Calculate BOM based on Formula ---
                const qty = parseInt(o.quantity) || 1;
                const perimeter = ((parseFloat(o.width) * 2) + (parseFloat(o.height) * 2)) * qty;
                const area = parseFloat(o.sq_meter);

                // Get all materials to match
                const { data: whMats } = await supabase.from('warehouse_products').select('id, name, unit');
                if (whMats) {
                    // Try to find matching profile
                    const prof = whMats.find(m => m.name.toLowerCase().includes(o.model_name.toLowerCase()) || o.model_name.toLowerCase().includes(m.name.toLowerCase()) || m.name.toLowerCase().includes('profil'));
                    if (prof) window.reqMaterials.push({ product_id: prof.id, name: prof.name, qty: (perimeter * 1.1).toFixed(1), unit: prof.unit });

                    // Try to find rezinka
                    const rez = whMats.find(m => m.name.toLowerCase().includes('rezin'));
                    if (rez) window.reqMaterials.push({ product_id: rez.id, name: rez.name, qty: (perimeter * 2).toFixed(1), unit: rez.unit });

                    // Try to find oyna
                    const oyna = whMats.find(m => m.name.toLowerCase().includes('oyna') || m.name.toLowerCase().includes('shisha'));
                    if (oyna) window.reqMaterials.push({ product_id: oyna.id, name: oyna.name, qty: (area).toFixed(2), unit: oyna.unit });
                }

                renderReqMaterials();
                assignModal.classList.remove('hidden');
            };
        });

        document.querySelectorAll('.complete-btn').forEach(b => {
            b.onclick = async () => {
                if (confirm("Haqiqatdan bu ish to'liq topshirildimi?")) {
                    await supabase.from('sales_orders').update({ status: 'Tayyor / Yetkazildi' }).eq('id', b.dataset.id);
                    loadOrders();
                }
            };
        });
    }

    function calculateTotal() {
        const h = parseFloat(document.getElementById('oHeight')?.value) || 0;
        const w = parseFloat(document.getElementById('oWidth')?.value) || 0;
        const q = parseInt(document.getElementById('oQty')?.value) || 1;
        const wantsInstall = !!document.getElementById('oInstall')?.checked;
        const so = oModel.options[oModel.selectedIndex];

        let mP = so ? parseFloat(so.dataset.price) || 0 : 0;
        const area = (h * w) * q;
        const tM = area * mP;
        const iC = wantsInstall ? (area * INSTALLATION_PRICE_PER_SQM) : 0;
        const finalT = tM + (PRODUCTION_COST * q) + iC;

        if (document.getElementById('cArea')) document.getElementById('cArea').textContent = area.toFixed(2) + ' kv.m';
        if (document.getElementById('cMaterial')) document.getElementById('cMaterial').textContent = tM.toLocaleString() + " so'm";
        if (document.getElementById('cInstall')) document.getElementById('cInstall').textContent = iC.toLocaleString() + " so'm";
        if (document.getElementById('cTotal')) document.getElementById('cTotal').textContent = finalT.toLocaleString() + " so'm";
        return { area, installCost: iC, finalTotal: finalT, quantity: q };
    }

    document.querySelectorAll('.calc-trigger').forEach(el => el.addEventListener('input', calculateTotal));
    oModel.addEventListener('change', calculateTotal);

    // Save New
    document.getElementById('saveOrderBtn').onclick = async () => {
        const calcObj = calculateTotal();
        const selectedOpt = oModel.options[oModel.selectedIndex];
        const res = await supabase.from('sales_orders').insert([{
            customer_name: document.getElementById('oCustomer').value.trim(),
            customer_phone: document.getElementById('oPhone').value.trim(),
            tg_user: document.getElementById('oTg').value.trim(),
            prod_type: document.getElementById('oType').value,
            model_name: selectedOpt ? selectedOpt.dataset.name : 'Unknown',
            width: document.getElementById('oWidth').value,
            height: document.getElementById('oHeight').value,
            quantity: calcObj.quantity,
            sq_meter: calcObj.area,
            production_cost: PRODUCTION_COST * calcObj.quantity,
            installation_cost: calcObj.installCost,
            total_price: calcObj.finalTotal,
            payment_type: document.getElementById('oPayment').value,
            deadline_date: document.getElementById('oDeadline').value,
            status: 'Kutilmoqda'
        }]).select().single();
        if (res.error) console.error(res.error);

        orderModal.classList.add('hidden');
        loadOrders();
    };

    // Edits
    document.getElementById('saveEditOrderBtn').onclick = async () => {
        await supabase.from('sales_orders').update({
            customer_name: document.getElementById('eCustomer').value,
            customer_phone: document.getElementById('ePhone').value,
            status: document.getElementById('eStatus').value
        }).eq('id', window.editingOrderId);
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
        await supabase.from('sales_orders').update({
            worker_group: grp,
            status: 'Jarayonda'
        }).eq('id', oId);

        // 2. Insert to material_requests
        const { data: reqData, error } = await supabase.from('material_requests').insert([{
            order_id: oId,
            worker_group: grp,
            materials_json: window.reqMaterials,
            status: 'Kutilmoqda'
        }]).select().single();

        assignModal.classList.add('hidden');
        loadOrders();

        if (!error && reqData) {
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
        } else {
            alert("Bazaga yoza olmadim (baza yo'q bo'lishi mumkin). Hozircha faqat buyurtma o'zgartirildi!");
            console.error(error);
        }
    };

    // Close buttons
    const cOrder = document.getElementById('closeOrderModal');
    if (cOrder) cOrder.onclick = () => orderModal.classList.add('hidden');
    const cEdit = document.getElementById('closeEditOrderModal');
    if (cEdit) cEdit.onclick = () => editModal.classList.add('hidden');
    const cAss = document.getElementById('closeAssignModal');
    if (cAss) cAss.onclick = () => assignModal.classList.add('hidden');

    document.getElementById('openOrderModal').onclick = () => {
        document.getElementById('oDeadline').value = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        orderModal.classList.remove('hidden');
    };

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

    loadModels();
    loadWarehouseMaterials();
    loadOrders();
});
