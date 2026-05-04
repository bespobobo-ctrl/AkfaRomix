import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
        window.location.href = '/';
    }

    // Elements
    const inventoryTable = document.getElementById('inventoryTable');
    const historyTable = document.getElementById('historyTable');
    const sections = document.querySelectorAll('.warehouse-section');
    const navButtons = document.querySelectorAll('.nav-icon, .tab-btn');

    const kirimModal = document.getElementById('kirimModal');
    const editModal = document.getElementById('editProductModal');
    const mainApp = document.getElementById('mainApp');
    const printArea = document.getElementById('printArea');
    const saveKirimBtn = document.getElementById('saveKirimBtn');

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
        const { data, error } = await supabase.from('warehouse_products').select('*').order('created_at', { ascending: false });
        if (error) return;

        inventoryTable.innerHTML = '';
        data.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${p.image_url || 'https://via.placeholder.com/45'}" style="width:45px; height:45px; border-radius:8px; object-fit:cover;">
                        <div>
                            <strong>${p.name}</strong><br>
                            <small style="color:#888;">SKU: ${p.sku || '---'}</small>
                        </div>
                    </div>
                </td>
                <td>${p.category || 'Ombor'}</td>
                <td style="font-weight:700;">${p.current_stock}</td>
                <td>${p.unit || '---'}</td>
                <td style="color:#007c52; font-weight:600;">${p.price ? p.price.toLocaleString() : '0'}</td>
                <td><span class="stock-badge ${p.current_stock < 10 ? 'low' : 'high'}">${p.current_stock < 10 ? 'Kam qolgan' : 'Yetarli'}</span></td>
                <td>
                    <button class="edit-btn action-icon" data-id="${p.id}">✏️</button>
                    <button class="delete-btn action-icon" data-id="${p.id}" style="color:red;">🗑️</button>
                </td>
            `;
            inventoryTable.appendChild(tr);
        });

        document.querySelectorAll('.delete-btn').forEach(b => {
            b.onclick = async () => {
                if (confirm('Ushbu mahsulotni o\'chirmoqchimisiz?')) {
                    await supabase.from('warehouse_products').delete().eq('id', b.dataset.id);
                    loadInventory();
                }
            };
        });

        document.querySelectorAll('.edit-btn').forEach(b => {
            b.onclick = () => {
                const p = data.find(x => x.id === b.dataset.id);
                if (p) {
                    window.editingProdId = p.id;
                    document.getElementById('eName').value = p.name;
                    document.getElementById('eQty').value = p.current_stock;
                    document.getElementById('ePrice').value = p.price;
                    editModal.classList.remove('hidden');
                }
            };
        });
    }

    // --- History Logic ---
    async function loadHistory() {
        historyTable.innerHTML = '<tr><td colspan="5" style="text-align:center;">Yuklanmoqda...</td></tr>';
        const { data, error } = await supabase
            .from('warehouse_transactions')
            .select(`*, warehouse_products(name, unit)`)
            .order('created_at', { ascending: false });

        if (error) return;
        historyTable.innerHTML = '';
        data.forEach(tx => {
            const date = new Date(tx.created_at).toLocaleString();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><small>${date}</small><br><strong>#${tx.id.slice(0, 8)}</strong></td>
                <td>${tx.warehouse_products?.name || 'O\'chirilgan mahsulot'}</td>
                <td><span style="color:${tx.type === 'IN' ? '#007c52' : '#ff4d4f'}; font-weight:700;">${tx.type === 'IN' ? 'KIRIM' : 'CHIQIM'}</span></td>
                <td>${tx.quantity} ${tx.warehouse_products?.unit || ''}</td>
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

    function showInvoice(tx) {
        // Simple mock of invoice data from note if JSON is too complex
        // In real app, we would store metadata as JSON
        document.getElementById('invNumber').textContent = `No. ${tx.id.slice(0, 8).toUpperCase()}`;
        document.getElementById('invDate').textContent = new Date(tx.created_at).toLocaleDateString();
        document.getElementById('invProdName').textContent = tx.warehouse_products?.name || "Mahsulot";
        document.getElementById('invQty').textContent = tx.quantity;
        document.getElementById('invUnit').textContent = tx.warehouse_products?.unit || "";

        // QR
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=TXID-${tx.id}`;
        document.getElementById('invQR').innerHTML = `<img src="${qrUrl}" style="width:130px;">`;

        mainApp.classList.add('hidden');
        printArea.classList.remove('hidden');
    }

    // --- Save Actions ---
    saveKirimBtn.onclick = async () => {
        const name = document.getElementById('kName').value.trim();
        const cat = document.getElementById('kCategory').value;
        const qty = parseFloat(document.getElementById('kQty').value);
        const price = parseFloat(document.getElementById('kPrice').value) || 0;
        const supplier = document.getElementById('kSupplier').value.trim();

        if (!name || isNaN(qty)) return alert('Ma\'lumotlarni to\'ldiring!');

        // 1. Manage Product
        const { data: existing } = await supabase.from('warehouse_products').select('*').eq('name', name).maybeSingle();
        let product;
        if (existing) {
            const { data } = await supabase.from('warehouse_products').update({ current_stock: existing.current_stock + qty, price }).eq('id', existing.id).select().single();
            product = data;
        } else {
            const { data } = await supabase.from('warehouse_products').insert([{ name, category: cat, current_stock: qty, price, unit: document.getElementById('kUnit').value }]).select().single();
            product = data;
        }

        // 2. Log Transaction
        const { data: tx } = await supabase.from('warehouse_transactions').insert([{
            product_id: product.id,
            type: 'IN',
            quantity: qty,
            note: `Taminotchi: ${supplier}`
        }]).select('*, warehouse_products(name, unit)').single();

        if (tx) showInvoice(tx);
    };

    document.getElementById('saveEditBtn').onclick = async () => {
        const name = document.getElementById('eName').value;
        const qty = parseFloat(document.getElementById('eQty').value);
        const price = parseFloat(document.getElementById('ePrice').value);
        await supabase.from('warehouse_products').update({ name, current_stock: qty, price }).eq('id', window.editingProdId);
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
            const { data: prod } = await supabase.from('warehouse_products').select('current_stock').eq('id', m.product_id).single();
            if (prod) {
                // Subtract
                await supabase.from('warehouse_products').update({
                    current_stock: prod.current_stock - m.qty
                }).eq('id', m.product_id);

                // Add to transactions as 'OUT'
                await supabase.from('warehouse_transactions').insert([{
                    product_id: m.product_id,
                    type: 'OUT',
                    quantity: m.qty,
                    note: `Sotuv Bo'limi (Buyurtma/Guruh: ${req.worker_group})`
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
    document.getElementById('openKirimModal').onclick = () => kirimModal.classList.remove('hidden');
    document.getElementById('closeKirimModal').onclick = () => kirimModal.classList.add('hidden');
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
