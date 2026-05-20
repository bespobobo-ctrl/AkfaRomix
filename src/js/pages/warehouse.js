import { supabase } from '@/core/supabase.js';
import { inventoryService } from '@/services/inventoryService.js';
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
        const { data, error } = await supabase.from('clapak_inventory').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error("Inventory error:", error);
            inventoryTable.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Jadval topilmadi yoki xatolik!</td></tr>';
            return;
        }

        inventoryTable.innerHTML = '';
        data.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${p.image_url || 'https://via.placeholder.com/45'}" style="width:45px; height:45px; border-radius:8px; object-fit:cover;">
                        <div>
                            <strong>${p.product_name}</strong><br>
                            <small style="color:#888;">${p.description || '---'}</small>
                        </div>
                    </div>
                </td>
                <td>${p.category || 'Auto Clapak'}</td>
                <td style="font-weight:700;">${p.stock_quantity} ${p.unit || ''}</td>
                <td>${p.unit || '---'}</td>
                <td style="color:#007c52; font-weight:600;">${p.price ? p.price.toLocaleString() : '0'}</td>
                <td><span class="stock-badge ${p.stock_quantity < 10 ? 'low' : 'high'}">${p.stock_quantity < 10 ? 'Kam qolgan' : 'Yetarli'}</span></td>
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
                    await supabase.from('clapak_inventory').delete().eq('id', b.dataset.id);
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

    // --- Staff Logic ---
    async function loadStaff() {
        const staffGrid = document.getElementById('staffGrid');
        staffGrid.innerHTML = '<div style="color:#888; padding:20px;">Yuklanmoqda...</div>';

        const { data, error } = await supabase.from('clapak_staff').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error(error);
            staffGrid.innerHTML = '<div style="color:red; padding:20px;">Xatolik yuz berdi. clapak_staff jadvali ochilganini tekshiring.</div>';
            return;
        }

        staffGrid.innerHTML = '';
        if (data.length === 0) {
            staffGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:#888;">Hozircha xodimlar yo\'q.</div>';
        }

        data.forEach(s => {
            const card = document.createElement('div');
            card.className = 'bento-card';
            card.style.padding = '20px';
            card.style.textAlign = 'center';
            card.innerHTML = `
                <img src="${s.photo_url || 'https://via.placeholder.com/150'}" style="width:120px; height:120px; border-radius:50%; object-fit:cover; border:3px solid #007c52; margin-bottom:15px; margin-left:auto; margin-right:auto;">
                <h3 style="margin:0;">${s.full_name}</h3>
                <p style="color:var(--adm-text-sec); font-size:0.9rem; margin:5px 0 15px 0;">${s.role}</p>
                <div style="background:#fff; padding:10px; border-radius:10px; display:inline-block; margin-bottom:15px;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=STAFF-${s.id}" style="width:80px; height:80px;">
                </div>
                <div style="display:flex; gap:10px; justify-content:center;">
                    <button class="action-icon delete-staff-btn" data-id="${s.id}" style="color:red; background:none; border:none; cursor:pointer; font-size:1.2rem;">🗑️</button>
                </div>
            `;
            staffGrid.appendChild(card);
        });

        document.querySelectorAll('.delete-staff-btn').forEach(b => {
            b.onclick = async () => {
                if (confirm('Ushbu xodimni o\'chirmoqchimisiz?')) {
                    await supabase.from('clapak_staff').delete().eq('id', b.dataset.id);
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
            const fileName = `staff/${Date.now()}_${photoFile.name}`;
            const { data, error } = await supabase.storage.from('avatars').upload(fileName, photoFile);
            if (!error) {
                const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(fileName);
                photoUrl = publicData.publicUrl;
            } else {
                console.error("Upload error:", error);
            }
        }

        const { error } = await supabase.from('clapak_staff').insert([{
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
        const phone = document.getElementById('kPhone').value.trim();
        const unit = document.getElementById('kUnit').value;
        const gross = parseFloat(document.getElementById('kGross').value) || 0;
        const net = parseFloat(document.getElementById('kNet').value) || 0;
        const desc = document.getElementById('kDesc').value;

        if (!name || isNaN(qty)) return alert('Ma\'lumotlarni to\'ldiring!');

        // 1. Manage Product (using clapak_inventory for Auto Clapak module)
        const { data: existing } = await supabase.from('clapak_inventory').select('*').eq('product_name', name).maybeSingle();
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
            stock_quantity: existing ? existing.stock_quantity + qty : qty
        };

        if (existing) {
            const { data } = await supabase.from('clapak_inventory').update(payload).eq('id', existing.id).select().single();
            product = data;
        } else {
            const { data } = await supabase.from('clapak_inventory').insert([payload]).select().single();
            product = data;
        }

        // 2. Log Transaction (Using a unified transaction log or specific to clapak)
        const { data: tx } = await supabase.from('warehouse_transactions').insert([{
            product_id: product.id,
            type: 'IN',
            quantity: qty,
            note: `Auto Clapak - Taminotchi: ${supplier} (${phone}) | Brutto/Netto: ${gross}/${net}`
        }]).select('*, warehouse_products(name, unit)').single();

        // Note: warehouse_transactions might reference warehouse_products table. 
        // If they are separate, we might need a separate transaction table or handle the reference.

        if (tx) showInvoice(tx);
        else {
            alert("Kirim muvaffaqiyatli saqlandi! (Hujjat generatsiya qilinmadi, jadval bog'liqligi sabab)");
            kirimModal.classList.add('hidden');
            loadInventory();
        }
    };

    document.getElementById('saveEditBtn').onclick = async () => {
        const name = document.getElementById('eName').value;
        const qty = parseFloat(document.getElementById('eQty').value);
        const price = parseFloat(document.getElementById('ePrice').value);
        await supabase.from('clapak_inventory').update({ product_name: name, stock_quantity: qty, price }).eq('id', window.editingProdId);
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
