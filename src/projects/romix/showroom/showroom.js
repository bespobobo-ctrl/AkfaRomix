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

        /* 
        User SQL: 
        CREATE TABLE IF NOT EXISTS showroom_products ( id UUID DEFAULT gen_random_uuid() PRIMARY KEY, name TEXT NOT NULL, category TEXT, dimensions TEXT, color TEXT, current_stock INTEGER DEFAULT 0, price DECIMAL(12,2), image_url TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) );
        */

        await supabase.from('showroom_products').insert([{
            name, category, dimensions, color, current_stock: qty, price
        }]);

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

        const today = new Date(); today.setHours(0, 0, 0, 0);

        grid.innerHTML = orders.map(o => {
            const isInstalled = o.install_status === 'Bajarildi';
            const isAssigned = !!o.install_group;
            const isOverdue = isAssigned && !isInstalled && o.install_deadline && new Date(o.install_deadline) < today;
            const accentColor = isInstalled ? '#00ff88' : (isOverdue ? '#ef4444' : (isAssigned ? '#00d2ff' : '#f97316'));

            let bodyHtml = '';
            if (!isAssigned) {
                bodyHtml = `<button class="install-assign-btn" data-id="${o.id}" data-name="${(o.customer_name || '').replace(/"/g, '')}" style="width:100%; background:#00d2ff; color:#000; border:none; padding:9px; border-radius:10px; font-weight:700; font-size:0.78rem; cursor:pointer; margin-top:6px;">🚚 O'rnatishga Yuborish</button>`;
            } else {
                const deadlineStr = o.install_deadline ? new Date(o.install_deadline).toLocaleDateString('uz-UZ') : '—';
                bodyHtml = `
                    <div style="font-size:0.75rem; color:var(--adm-text-sec); border-top:1px dashed var(--adm-border); padding-top:8px; margin-top:6px;">Brigada: <strong style="color:#00d2ff;">${o.install_group}</strong></div>
                    <div style="font-size:0.75rem; ${isOverdue ? 'color:#ef4444; font-weight:700;' : 'color:var(--adm-text-sec);'}">⏳ Muddat: <strong>${deadlineStr}</strong>${isOverdue ? ' ⚠️ Muddati o\'tgan!' : ''}</div>
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

        document.querySelectorAll('.install-assign-btn').forEach(btn => {
            btn.onclick = () => {
                currentInstallOrderId = btn.dataset.id;
                document.getElementById('installOrderInfo').textContent = `Mijoz: ${btn.dataset.name}`;
                document.getElementById('installGroup').value = 'Brigada 1 (Alijon)';
                document.getElementById('installDeadline').value = '';
                installModal.classList.remove('hidden');
            };
        });

        document.querySelectorAll('.install-complete-btn').forEach(btn => {
            btn.onclick = async () => {
                if (!confirm("Ushbu buyurtma o'rnatilib bo'ldimi?")) return;
                try {
                    const { error } = await supabase.from('sales_orders').update({
                        install_status: 'Bajarildi',
                        status: 'Tayyor / Yetkazildi'
                    }).eq('id', btn.dataset.id);
                    if (error) throw error;
                } catch (err) {
                    alert("Xatolik: " + err.message);
                    return;
                }
                loadIncomingProduction();
            };
        });
    }

    document.getElementById('closeInstallModal').onclick = () => installModal.classList.add('hidden');

    document.getElementById('saveInstallBtn').onclick = async () => {
        const grp = document.getElementById('installGroup').value;
        const deadline = document.getElementById('installDeadline').value;
        if (!deadline) return alert("O'rnatish muddatini tanlang!");
        try {
            const { error } = await supabase.from('sales_orders').update({
                install_group: grp,
                install_deadline: deadline,
                install_status: 'Tayinlangan'
            }).eq('id', currentInstallOrderId);
            if (error) throw error;
        } catch (err) {
            alert("Biriktirishda xatolik: bazada 'install_group'/'install_deadline'/'install_status' ustunlari mavjudligini tekshiring.");
            console.warn("install assign failed:", err);
            return;
        }
        installModal.classList.add('hidden');
        loadIncomingProduction();
    };

    // Edit
    document.getElementById('saveEditBtn').onclick = async () => {
        await supabase.from('showroom_products').update({
            current_stock: document.getElementById('eQty').value,
            price: document.getElementById('ePrice').value
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
