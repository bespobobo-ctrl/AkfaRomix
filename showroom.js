import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || (user.role !== 'showroom' && user.role !== 'admin')) {
        window.location.href = '/';
    }

    document.getElementById('userName').textContent = user.full_name || "Showroom Menejeri";

    const inModal = document.getElementById('inModal');
    const editModal = document.getElementById('editModal');
    const outModal = document.getElementById('outModal');
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
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="background:#f97316; width:40px; height:40px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.2rem; color:#fff;">
                            ${p.category === 'Eshik' ? '🚪' : '🪟'}
                        </div>
                        <div>
                            <strong>${p.name}</strong><br>
                            <small style="color:#888;">ID: ${p.id.slice(0, 6).toUpperCase()}</small>
                        </div>
                    </div>
                </td>
                <td><strong class="showroom-accent">${p.category}</strong><br><small>${p.color || '-'}</small></td>
                <td>${p.dimensions || 'Standart'}</td>
                <td>
                    <span class="stock-badge ${p.current_stock > 0 ? 'stock-ok' : 'stock-low'}">
                        ${p.current_stock > 0 ? p.current_stock + ' dona mavjud' : 'Sotilgan / Yo\'q'}
                    </span>
                </td>
                <td style="font-weight:700;">${Number(p.price || 0).toLocaleString()} UZS</td>
                <td>
                    <button class="action-icon edit-btn" data-id="${p.id}" style="font-size:1.1rem; border:none; background:transparent; cursor:pointer;" title="Tahrirlash">✏️</button>
                    <button class="action-icon del-btn" data-id="${p.id}" style="font-size:1.1rem; border:none; background:transparent; cursor:pointer; color:#ef4444;" title="O'chirish">🗑️</button>
                </td>
            `;
            inventoryTable.appendChild(tr);
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
});
