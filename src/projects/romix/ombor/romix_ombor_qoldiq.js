        import { supabase } from '@/core/supabase.js';

        // Setup user details from localStorage
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (user) {
            document.getElementById('userName').textContent = (user.full_name || user.username || 'RAHBAR').toUpperCase();
        }

        // Default seed (faqat Supabase jadvali butunlay bo'sh bo'lganda, birinchi marta ishlatiladi)
        const defaultQoldiq = [
            { id: "q1", product_name: "AKFA Plastik 6000 QVT Oq", brand: "AKFA Plastik", series: "6000 QVT", color: "Oq", profile_type: "Profil Frame", length: 1500, stock_quantity: 8 },
            { id: "q2", product_name: "AKFA Plastik 6000 TRIO Mocha", brand: "AKFA Plastik", series: "6000 TRIO", color: "Mocha", profile_type: "Profil Frame", length: 2200, stock_quantity: 4 },
            { id: "q3", product_name: "Ekopen Plastik 5800 TRIO Oq", brand: "Ekopen Plastik", series: "5800 TRIO", color: "Oq", profile_type: "Shtapik", length: 950, stock_quantity: 15 },
            { id: "q4", product_name: "AKFA Alyuminiy 5200 QVT Qora", brand: "AKFA Alyuminiy", series: "5200 QVT", color: "Qora", profile_type: "Tokcha", length: 3100, stock_quantity: 3 }
        ];

        // Qoldiq Profillar endi Supabase'da (romix_qoldiq_profillar) — localStorage faqat
        // bir martalik migratsiya manbasi. `qoldiqCache` — xotiradagi joriy ro'yxat nusxasi.
        let qoldiqCache = [];

        async function fetchQoldiqData() {
            try {
                const { count, error: cErr } = await supabase.from('romix_qoldiq_profillar').select('id', { count: 'exact', head: true });
                if (cErr) throw cErr;
                if (count === 0) {
                    const local = JSON.parse(localStorage.getItem('romix_qoldiq_inventory')) || defaultQoldiq;
                    const rows = local.map((q, i) => ({
                        id: q.id || ('QLD-' + Date.now() + '-' + i), product_name: q.product_name, brand: q.brand,
                        series: q.series, color: q.color, profile_type: q.profile_type,
                        length: Number(q.length) || 0, stock_quantity: Number(q.stock_quantity) || 0
                    }));
                    if (rows.length) await supabase.from('romix_qoldiq_profillar').insert(rows);
                }
                const { data, error } = await supabase.from('romix_qoldiq_profillar').select('*').order('created_at', { ascending: false });
                if (error) throw error;
                qoldiqCache = data || [];
            } catch (e) {
                console.warn('Qoldiq Supabase fetch xatosi, localStorage fallback:', e);
                qoldiqCache = JSON.parse(localStorage.getItem('romix_qoldiq_inventory')) || defaultQoldiq;
            }
        }

        // MUHIM: bu yerda "Supabase'da bor-u mahalliy massivda yo'q qatorlarni o'chirish" (prune)
        // ATAYIN QILINMAYDI — agar bu sahifa eski holatda ochiq turgan bo'lsa (masalan, shu orada
        // boshqa joyda biror qoldiq o'chirilgan bo'lsa), bunday "prune" o'sha o'chirilgan qatorni
        // xato ravishda qayta tiklab qo'yardi. O'chirish faqat aniq (targeted) DELETE orqali bo'ladi.
        async function syncQoldiqToSupabase() {
            try {
                localStorage.setItem('romix_qoldiq_inventory', JSON.stringify(qoldiqCache));
                const rows = qoldiqCache.map(q => ({
                    id: q.id, product_name: q.product_name, brand: q.brand, series: q.series, color: q.color,
                    profile_type: q.profile_type, length: Number(q.length) || 0, stock_quantity: Number(q.stock_quantity) || 0
                }));
                if (rows.length) await supabase.from('romix_qoldiq_profillar').upsert(rows);
            } catch (e) {
                console.warn('Qoldiq Supabase sync xatosi:', e);
            }
        }
        async function deleteQoldiqFromSupabase(id) {
            try {
                const { error } = await supabase.from('romix_qoldiq_profillar').delete().eq('id', id);
                if (error) console.warn('Qoldiq o\'chirishda xatolik:', error);
            } catch (e) {
                console.warn('Qoldiq o\'chirishda xatolik:', e);
            }
        }

        // State filters
        window.activeBrand = 'AKFA';
        window.activeCategory = 'Barchasi';

        const brands = ['AKFA', 'RETPEN', 'Ekopen'];
        const categories = ['Barchasi', 'Profil Frame', 'Sash', 'Shtapik', 'Tokcha', 'Lambri'];

        // Render Brands
        function renderBrands() {
            const row = document.getElementById('brandSelectorRow');
            row.innerHTML = '';
            brands.forEach(b => {
                const card = document.createElement('div');
                const isActive = window.activeBrand.toUpperCase() === b.toUpperCase();
                card.className = `brand-card ${isActive ? 'active-generic' : ''}`;
                card.innerHTML = `<span style="font-weight:700; font-size:0.95rem; color:${isActive ? '#4fc3f7' : '#aaa'}">${b.toUpperCase()}</span>`;
                card.onclick = () => {
                    window.activeBrand = b;
                    renderBrands();
                    loadQoldiqData();
                };
                row.appendChild(card);
            });
        }

        // Render Categories
        function renderCategories() {
            const row = document.getElementById('categoryTabsRow');
            row.innerHTML = '';
            categories.forEach(c => {
                const tab = document.createElement('div');
                const isActive = window.activeCategory === c;
                tab.className = `category-tab ${isActive ? 'active' : ''}`;
                tab.textContent = c;
                tab.onclick = () => {
                    window.activeCategory = c;
                    renderCategories();
                    loadQoldiqData();
                };
                row.appendChild(tab);
            });
        }

        // Load & Filter Data
        function loadQoldiqData(searchQuery = '') {
            const grid = document.getElementById('qoldiqGrid');

            // Filter data (xotiradagi qoldiqCache'dan — Supabase'dan faqat fetchQoldiqData() orqali yangilanadi)
            let filtered = qoldiqCache;

            // 1. Brand Filter
            filtered = filtered.filter(p => p.brand.toUpperCase().includes(window.activeBrand.toUpperCase()));

            // 2. Category Filter
            if (window.activeCategory !== 'Barchasi') {
                filtered = filtered.filter(p => p.profile_type === window.activeCategory);
            }

            // 3. Search Filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase().trim();
                filtered = filtered.filter(p => 
                    p.product_name.toLowerCase().includes(q) || 
                    p.series.toLowerCase().includes(q) || 
                    p.color.toLowerCase().includes(q)
                );
            }

            // Calculate Stats
            let totalItems = 0;
            let totalMm = 0;
            let maxLen = 0;

            filtered.forEach(p => {
                totalItems += p.stock_quantity;
                totalMm += p.length * p.stock_quantity;
                if (p.length > maxLen && p.stock_quantity > 0) {
                    maxLen = p.length;
                }
            });

            document.getElementById('statTotalItems').textContent = totalItems;
            document.getElementById('statTotalMeters').textContent = (totalMm / 1000).toFixed(1);
            document.getElementById('statLongestPiece').textContent = maxLen;

            // Render cards
            grid.innerHTML = '';
            if (filtered.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:50px; color:#888; font-weight:600;">Qoldiqlar topilmadi.</div>';
                return;
            }

            filtered.forEach(p => {
                const card = document.createElement('div');
                card.className = 'qoldiq-card';
                card.innerHTML = `
                    <div class="card-visual">
                        📐
                        <span class="badge-length">${p.length} mm</span>
                    </div>
                    <h4 class="card-title">${p.product_name}</h4>
                    <div style="margin-bottom: 12px; display:flex; gap:6px; flex-wrap:wrap;">
                        <span class="spec-chip">🎨 Rangi: ${p.color}</span>
                        <span class="spec-chip">🏷️ Seriya: ${p.series}</span>
                    </div>
                    <div class="card-footer">
                        <span class="qty-val">${p.stock_quantity} dona</span>
                        <div class="card-actions">
                            <button class="action-btn delete delete-btn" data-id="${p.id}" title="O'chirish" style="color:#ff4d4f;">🗑️</button>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });

            // Bind Actions
            document.querySelectorAll('.delete-btn').forEach(b => {
                b.onclick = () => {
                    if (confirm("Ushbu qoldiqni o'chirmoqchimisiz?")) {
                        const id = b.dataset.id;
                        qoldiqCache = qoldiqCache.filter(x => x.id !== id);
                        localStorage.setItem('romix_qoldiq_inventory', JSON.stringify(qoldiqCache));
                        deleteQoldiqFromSupabase(id);
                        loadQoldiqData(document.getElementById('qoldiqSearch').value);
                    }
                };
            });
        }

        // Search trigger
        document.getElementById('qoldiqSearch').oninput = () => {
            loadQoldiqData(document.getElementById('qoldiqSearch').value);
        };

        // Modal Controls
        const modal = document.getElementById('qoldiqModal');
        document.getElementById('openQoldiqModal').onclick = () => modal.classList.remove('hidden');
        document.getElementById('closeQoldiqModal').onclick = () => modal.classList.add('hidden');

        // Save New Qoldiq
        document.getElementById('saveQoldiqBtn').onclick = () => {
            const brand = document.getElementById('qkBrend').value;
            const profile = document.getElementById('qkProfil').value;
            const series = document.getElementById('qkSeriya').value;
            const color = document.getElementById('qkRangi').value;
            const length = parseInt(document.getElementById('qkUzunlik').value) || 0;
            const qty = parseInt(document.getElementById('qkSoni').value) || 0;

            if (length <= 0 || qty <= 0) {
                return alert("Uzunlik va dona sonini to'g'ri kiriting!");
            }

            const newId = 'QLD-' + Date.now();
            const prodName = `${brand} ${series} ${color}`;

            const newItem = {
                id: newId,
                product_name: prodName,
                brand: brand,
                series: series,
                color: color,
                profile_type: profile,
                length: length,
                stock_quantity: qty
            };

            // Check if exact remnant profile (brand, series, color, length, profile_type) already exists, if so merge quantity
            const existing = qoldiqCache.find(x =>
                x.brand === brand &&
                x.series === series &&
                x.color === color &&
                x.length === length &&
                x.profile_type === profile
            );

            if (existing) {
                existing.stock_quantity += qty;
            } else {
                qoldiqCache.unshift(newItem);
            }

            syncQoldiqToSupabase();
            modal.classList.add('hidden');
            loadQoldiqData();

            // Clear inputs
            document.getElementById('qkUzunlik').value = '';
            document.getElementById('qkSoni').value = '';
        };

        // Run on start
        (async () => {
            renderBrands();
            renderCategories();
            await fetchQoldiqData();
            loadQoldiqData();
        })();
