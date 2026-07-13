        import { supabase } from '@/core/supabase.js';

        // Setup user details from localStorage
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (user) {
            document.getElementById('userName').textContent = (user.full_name || user.username || 'RAHBAR').toUpperCase();
        }

        // oynakCache — xotiradagi joriy ro'yxat nusxasi. MUHIM: bu yerda "jadval bo'sh bo'lsa
        // soxta namunaviy ma'lumot bilan avtomatik to'ldirish" YO'Q — Tozalash tugmasi bilan
        // ziddiyatga kirmasligi uchun (haqiqiy bo'sh holat "bo'sh" bo'lib qolishi kerak).
        let oynakCache = [];

        async function fetchOynakData() {
            try {
                const { data, error } = await supabase.from('romix_oynak').select('*').order('created_at', { ascending: false });
                if (error) throw error;
                oynakCache = data || [];
                localStorage.setItem('romix_oynak_local', JSON.stringify(oynakCache));
            } catch (e) {
                console.warn('Oynak fetch xatosi, localStorage fallback:', e);
                try { oynakCache = JSON.parse(localStorage.getItem('romix_oynak_local')) || []; } catch { oynakCache = []; }
            }
        }

        function renderOynak(searchQuery = '') {
            const grid = document.getElementById('oynakGrid');

            let filtered = oynakCache;
            if (searchQuery) {
                const q = searchQuery.toLowerCase().trim();
                filtered = filtered.filter(o =>
                    (o.product_name || '').toLowerCase().includes(q) ||
                    (o.brand || '').toLowerCase().includes(q) ||
                    (o.size || '').toLowerCase().includes(q)
                );
            }

            let totalQty = 0, totalVal = 0;
            filtered.forEach(o => {
                const qty = Number(o.stock_quantity) || 0;
                totalQty += qty;
                totalVal += qty * (Number(o.price) || 0);
            });

            document.getElementById('statTotalTypes').textContent = filtered.length;
            document.getElementById('statTotalQty').textContent = totalQty.toLocaleString('uz-UZ');
            document.getElementById('statTotalVal').textContent = totalVal.toLocaleString('uz-UZ') + ' so\'m';

            grid.innerHTML = '';
            if (filtered.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:50px; color:#888; font-weight:600;">Oynak topilmadi.</div>';
                return;
            }

            filtered.forEach(o => {
                const card = document.createElement('div');
                card.className = 'qoldiq-card';
                card.innerHTML = `
                    <div class="card-visual">
                        🪟
                        ${o.size ? `<span class="badge-length">${o.size}</span>` : ''}
                    </div>
                    <h4 class="card-title">${o.product_name || o.brand || "Noma'lum"}</h4>
                    <div style="margin-bottom: 12px; display:flex; gap:6px; flex-wrap:wrap;">
                        <span class="spec-chip">🏷️ ${o.brand || "Noma'lum"}</span>
                        <span class="spec-chip">💰 ${(Number(o.price) || 0).toLocaleString('uz-UZ')} so'm/${o.unit || 'dona'}</span>
                    </div>
                    <div class="card-footer">
                        <span class="qty-val">${(Number(o.stock_quantity) || 0).toLocaleString('uz-UZ')} ${o.unit || 'dona'}</span>
                        <div class="card-actions">
                            <button class="action-btn delete delete-btn" data-id="${o.id}" title="O'chirish" style="color:#ff4d4f;">🗑️</button>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });

            document.querySelectorAll('.delete-btn').forEach(b => {
                b.onclick = async () => {
                    if (!confirm("Ushbu oynakni o'chirmoqchimisiz?")) return;
                    const id = b.dataset.id;
                    const { error } = await supabase.from('romix_oynak').delete().eq('id', id);
                    if (error) { alert("O'chirishda xato: " + error.message); return; }
                    oynakCache = oynakCache.filter(x => x.id !== id);
                    localStorage.setItem('romix_oynak_local', JSON.stringify(oynakCache));
                    renderOynak(document.getElementById('oynakSearch').value);
                };
            });
        }

        // Search trigger
        document.getElementById('oynakSearch').oninput = () => {
            renderOynak(document.getElementById('oynakSearch').value);
        };

        // Modal Controls
        const modal = document.getElementById('oynakModal');
        document.getElementById('openOynakModal').onclick = () => modal.classList.remove('hidden');
        document.getElementById('closeOynakModal').onclick = () => modal.classList.add('hidden');

        // Save New Oynak
        document.getElementById('saveOynakBtn').onclick = async () => {
            const brand = document.getElementById('okBrand').value.trim();
            const name = document.getElementById('okName').value.trim();
            const size = document.getElementById('okSize').value.trim();
            const unit = document.getElementById('okUnit').value;
            const qty = parseFloat(document.getElementById('okQty').value) || 0;
            const price = parseFloat(document.getElementById('okPrice').value) || 0;

            if (!brand || qty <= 0) {
                return alert("Turi/Brend va miqdorni to'g'ri kiriting!");
            }

            const newItem = {
                id: 'OYNAK-' + Date.now(),
                brand: brand,
                product_name: name || brand,
                size: size,
                unit: unit || 'dona',
                stock_quantity: qty,
                price: price
            };

            const btn = document.getElementById('saveOynakBtn');
            btn.disabled = true;
            btn.textContent = 'Saqlanmoqda...';
            const { data, error } = await supabase.from('romix_oynak').insert([newItem]).select();
            btn.disabled = false;
            btn.textContent = "Qo'shish";

            if (error) {
                alert("Saqlashda xato: " + error.message);
                return;
            }

            oynakCache.unshift((data && data[0]) || newItem);
            localStorage.setItem('romix_oynak_local', JSON.stringify(oynakCache));
            modal.classList.add('hidden');
            renderOynak();

            document.getElementById('okBrand').value = '';
            document.getElementById('okName').value = '';
            document.getElementById('okSize').value = '';
            document.getElementById('okQty').value = '';
            document.getElementById('okPrice').value = '';
        };

        // Run on start
        (async () => {
            await fetchOynakData();
            renderOynak();
        })();
