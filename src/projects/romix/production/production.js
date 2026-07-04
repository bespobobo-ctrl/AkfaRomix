import { supabase, checkAuth, logout } from '@/core/supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    checkAuth(['admin', 'ishlab_chiqarish']);

    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user && document.getElementById('userName')) {
        document.getElementById('userName').textContent = user.full_name;
    }

    document.getElementById('logoutBtn')?.addEventListener('click', logout);

    // Tab switching
    document.querySelectorAll('.tab-btn, .nav-icon[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.nav-icon[data-tab]').forEach(b => b.classList.remove('active'));
            const tab = btn.dataset.tab;
            document.querySelectorAll(`.tab-btn[data-tab="${tab}"]`).forEach(b => b.classList.add('active'));
            document.querySelectorAll(`.nav-icon[data-tab="${tab}"]`).forEach(b => b.classList.add('active'));

            document.querySelectorAll('.warehouse-section').forEach(s => s.classList.add('hidden'));
            const view = document.getElementById(`${tab}-view`);
            if (view) view.classList.remove('hidden');

            if (tab === 'pipeline') loadProductionPipeline();
            if (tab === 'brigades') loadBrigadesTab();
        });
    });

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            themeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
            localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.textContent = '☀️';
        }
    }

    // Globals
    let warehouseProducts = [];
    let currentMats = [];
    let currentAccs = [];
    let recipes = [];
    let currentViewingId = null;

    // Modal open/close
    const addModal = document.getElementById('addRecipeModal');
    document.getElementById('openAddRecipe').onclick = () => addModal.style.display = 'flex';
    document.getElementById('closeAddRecipe').onclick = () => addModal.style.display = 'none';

    // Load Data
    async function loadData() {
        const { data: wp } = await supabase.from('warehouse_products').select('*');
        if (wp) warehouseProducts = wp;

        populateSelect('selMat', warehouseProducts);
        populateSelect('selAcc', warehouseProducts);

        await loadRecipes();
    }

    async function loadRecipes() {
        const { data, error } = await supabase.from('production_recipes').select('*').order('created_at', { ascending: false });
        if (data) {
            recipes = data;
            renderTable();
            updateKPIs();
        }
    }

    function populateSelect(id, list) {
        const sel = document.getElementById(id);
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Tanlang --</option>';
        list.forEach(i => {
            sel.innerHTML += `<option value="${i.id}" data-cost="${i.cost_price || 0}" data-unit="${i.unit}" data-name="${i.name}">${i.name} (${i.unit}) - ${Number(i.cost_price || 0).toLocaleString()} UZS</option>`;
        });
    }

    function updateKPIs() {
        document.getElementById('kpiTotal').textContent = recipes.length;
        document.getElementById('kpiEshik').textContent = recipes.filter(r => r.type === 'Eshik').length;
        document.getElementById('kpiRom').textContent = recipes.filter(r => r.type === 'Rom').length;
        const avg = recipes.length ? Math.round(recipes.reduce((a, b) => a + Number(b.total_cost), 0) / recipes.length) : 0;
        document.getElementById('kpiAvg').textContent = avg.toLocaleString() + ' UZS';
    }

    function renderTable() {
        const tb = document.getElementById('recipeTable');
        tb.innerHTML = '';
        recipes.forEach(r => {
            const matSum = (r.materials_json || []).reduce((a, m) => a + (m.qty * m.cost), 0);
            const accSum = (r.accessories_json || []).reduce((a, m) => a + (m.qty * m.cost), 0);
            const badgeClass = r.type === 'Eshik' ? 'eshik' : r.type === 'Rom' ? 'rom' : 'fasad';
            const accentColor = r.type === 'Eshik' ? '#8b5cf6' : (r.type === 'Rom' ? '#00d2ff' : '#ffaa00');
            const card = document.createElement('div');
            card.style.cssText = `border-top:3px solid ${accentColor}; border-radius:16px; background:var(--adm-surface); border:1px solid var(--adm-border); border-top:3px solid ${accentColor}; padding:16px; display:flex; flex-direction:column; gap:9px; box-shadow:var(--adm-shadow);`;
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                    <div style="font-weight:700; color:var(--adm-text); font-size:0.92rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${r.name}</div>
                    <span class="recipe-badge ${badgeClass}" style="white-space:nowrap;">${r.type}</span>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.75rem; color:var(--adm-text-sec); border-top:1px dashed var(--adm-border); padding-top:9px;">
                    <div>Materiallar: <strong style="color:var(--adm-text);">${matSum.toLocaleString()}</strong> <span style="opacity:0.6;">(${(r.materials_json || []).length} xil)</span></div>
                    <div>Aksessuar: <strong style="color:var(--adm-text);">${accSum.toLocaleString()}</strong> <span style="opacity:0.6;">(${(r.accessories_json || []).length} xil)</span></div>
                    <div>Stanok: <strong style="color:var(--adm-text);">${Number(r.machine_cost).toLocaleString()}</strong></div>
                    <div>Korxona: <strong style="color:var(--adm-text);">${Number(r.overhead_cost).toLocaleString()}</strong></div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed var(--adm-border); padding-top:9px; margin-top:2px;">
                    <strong class="cost-green" style="font-size:0.95rem;">${Number(r.total_cost).toLocaleString()} UZS</strong>
                    <div>
                        <button class="view-recipe" data-id="${r.id}" style="background:none; border:none; font-size:1.05rem; cursor:pointer;" title="Ko'rish">👁️</button>
                        <button class="del-recipe" data-id="${r.id}" style="background:none; border:none; font-size:1.05rem; cursor:pointer; color:red;" title="O'chirish">🗑️</button>
                    </div>
                </div>
            `;
            tb.appendChild(card);
        });

        // Bind view buttons
        document.querySelectorAll('.view-recipe').forEach(btn => {
            btn.onclick = () => {
                const r = recipes.find(x => x.id === btn.dataset.id);
                if (r) openRecipe(r);
            };
        });

        document.querySelectorAll('.del-recipe').forEach(btn => {
            btn.onclick = async () => {
                if (confirm("O'chirib tashlaysizmi?")) {
                    await supabase.from('production_recipes').delete().eq('id', btn.dataset.id);
                    loadRecipes();
                }
            };
        });
    }

    // ============================================================
    // ZAKAZLAR JARAYONI — Sotuv guruhga tayinlagan buyurtmalar shu yerda
    // 3 bosqichdan (Kesish -> Payvandlash -> Yig'ish/Qadoqlash) o'tadi,
    // so'ng Tayyor Mahsulotga (showroom) o'tkaziladi.
    // ============================================================

    // Jonli teskari sanoq: har soniya barcha ".countdown-live" belgilarini yangilaydi
    function tickCountdowns() {
        document.querySelectorAll('.countdown-live').forEach(el => {
            const target = new Date(el.dataset.target);
            target.setHours(23, 59, 59, 999); // muddat kunining oxirigacha
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
    setInterval(tickCountdowns, 1000);

    async function loadProductionPipeline() {
        let orders = [];
        let reqStatusByOrder = {};
        try {
            const { data, error } = await supabase.from('sales_orders').select('*').in('status', ['Kutilmoqda', 'Jarayonda']).order('created_at', { ascending: false });
            if (error) throw error;
            orders = data || [];
        } catch (err) {
            console.warn("loadProductionPipeline fetch failed:", err);
        }

        try {
            const { data, error } = await supabase.from('material_requests').select('order_id, status');
            if (error) throw error;
            (data || []).forEach(r => { reqStatusByOrder[r.order_id] = r.status; });
        } catch (err) {
            console.warn("loadProductionPipeline material_requests fetch failed:", err);
        }

        const cols = {
            awaiting: document.getElementById('pipelineColAwaiting'),
            new: document.getElementById('pipelineColNew'),
            kesish: document.getElementById('pipelineColKesish'),
            payvandlash: document.getElementById('pipelineColPayvand'),
            yigish_qadoqlash: document.getElementById('pipelineColYigish')
        };
        Object.values(cols).forEach(c => { if (c) c.innerHTML = ''; });

        const emptyMsg = '<div style="text-align:center; color:var(--adm-text-sec); font-size:0.78rem; padding:16px 0;">Bo\'sh</div>';
        // tayyor_omborda bosqichidagilar bu boardda ko'rsatilmaydi (ular Tayyor Mahsulotga o'tgan)
        const buckets = {
            awaiting: orders.filter(o => o.status === 'Kutilmoqda'),
            new: orders.filter(o => o.status === 'Jarayonda' && !o.production_stage),
            kesish: orders.filter(o => o.production_stage === 'kesish'),
            payvandlash: orders.filter(o => o.production_stage === 'payvandlash'),
            yigish_qadoqlash: orders.filter(o => o.production_stage === 'yigish_qadoqlash')
        };

        // Qat'iy muddat nazorati: jonli teskari sanoq (har soniya yangilanadi, window.tickCountdowns orqali)
        function deadlineBadge(o) {
            const targetDate = o.production_target_date || o.production_deadline;
            if (!targetDate) return '';
            return `<div class="countdown-live" data-target="${targetDate}" style="font-size:0.7rem; font-weight:700;"></div>`;
        }

        function card(o, actionHtml) {
            return `<div style="background:var(--adm-surface); border:1px solid var(--adm-border); border-radius:14px; padding:12px; display:flex; flex-direction:column; gap:8px; box-shadow:var(--adm-shadow);">
                <div style="font-weight:700; color:var(--adm-text); font-size:0.82rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${o.customer_name || 'Noma\'lum'}</div>
                <div style="font-size:0.72rem; color:var(--adm-text-sec);">${o.prod_type || ''}</div>
                <div style="font-size:0.7rem; color:var(--adm-text-sec);">Guruh: <strong style="color:#00d2ff;">${o.worker_group || '—'}</strong></div>
                ${deadlineBadge(o)}
                ${actionHtml}
            </div>`;
        }

        if (cols.awaiting) {
            cols.awaiting.innerHTML = buckets.awaiting.length === 0 ? emptyMsg : buckets.awaiting.map(o => card(o,
                `<div style="text-align:center; background:rgba(139,92,246,0.08); color:#8b5cf6; padding:8px; border-radius:8px; font-weight:600; font-size:0.7rem;">Sotuv guruh/material belgilashini kutmoqda</div>`
            )).join('');
        }
        if (cols.new) {
            cols.new.innerHTML = buckets.new.length === 0 ? emptyMsg : buckets.new.map(o => {
                const reqStatus = reqStatusByOrder[o.id];
                const approved = reqStatus === 'Tasdiqlandi';
                const actionHtml = approved
                    ? `<button class="accept-order-btn" data-id="${o.id}" data-deadline="${o.production_deadline || ''}" style="background:#ffaa00; color:#000; border:none; padding:8px; border-radius:8px; font-weight:700; font-size:0.74rem; cursor:pointer;">✅ Qabul Qilish</button>`
                    : `<div style="text-align:center; background:rgba(239,68,68,0.08); color:#ef4444; padding:8px; border-radius:8px; font-weight:600; font-size:0.7rem;">⏳ Ombor tasdiqlashini kutmoqda</div>`;
                return card(o, actionHtml);
            }).join('');
        }
        if (cols.kesish) {
            cols.kesish.innerHTML = buckets.kesish.length === 0 ? emptyMsg : buckets.kesish.map(o => card(o,
                `<button class="pipeline-advance-btn" data-id="${o.id}" data-next="payvandlash" style="background:#ef4444; color:#fff; border:none; padding:8px; border-radius:8px; font-weight:700; font-size:0.74rem; cursor:pointer;">Keyingi bosqich →</button>`
            )).join('');
        }
        if (cols.payvandlash) {
            cols.payvandlash.innerHTML = buckets.payvandlash.length === 0 ? emptyMsg : buckets.payvandlash.map(o => card(o,
                `<button class="pipeline-advance-btn" data-id="${o.id}" data-next="yigish_qadoqlash" style="background:#f97316; color:#fff; border:none; padding:8px; border-radius:8px; font-weight:700; font-size:0.74rem; cursor:pointer;">Keyingi bosqich →</button>`
            )).join('');
        }
        if (cols.yigish_qadoqlash) {
            cols.yigish_qadoqlash.innerHTML = buckets.yigish_qadoqlash.length === 0 ? emptyMsg : buckets.yigish_qadoqlash.map(o => card(o,
                `<button class="pipeline-advance-btn" data-id="${o.id}" data-next="tayyor_omborda" style="background:#00d2ff; color:#000; border:none; padding:8px; border-radius:8px; font-weight:700; font-size:0.74rem; cursor:pointer;">✅ Tayyor, Omborga O'tkazish</button>`
            )).join('');
        }

        tickCountdowns(); // darhol bo'yash, 1 soniya kutmasdan

        document.querySelectorAll('.pipeline-advance-btn').forEach(btn => {
            btn.onclick = async () => {
                const id = btn.dataset.id;
                const next = btn.dataset.next;
                try {
                    const { error } = await supabase.from('sales_orders').update({ production_stage: next }).eq('id', id);
                    if (error) throw error;
                } catch (err) {
                    alert("Bosqichni yangilashda xatolik: bazada 'production_stage' ustuni mavjudligini tekshiring.");
                    console.warn("pipeline-advance failed:", err);
                    return;
                }
                loadProductionPipeline();
            };
        });

        // Qabul Qilish: ishlab chiqarish o'zi "chiqish sanasi"ni belgilaydi (standart = sotuv muddati)
        document.querySelectorAll('.accept-order-btn').forEach(btn => {
            btn.onclick = async () => {
                const id = btn.dataset.id;
                const defaultDate = btn.dataset.deadline || '';
                let targetDate = prompt("Bu buyurtma qachon tayyor bo'lishini belgilang (chiqish sanasi, YYYY-MM-DD):", defaultDate);
                if (targetDate === null) return; // bekor qilindi
                targetDate = targetDate.trim();
                if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
                    if (!targetDate && defaultDate) {
                        targetDate = defaultDate;
                    } else {
                        alert("Sana formati noto'g'ri. YYYY-MM-DD ko'rinishida kiriting (masalan 2026-07-10).");
                        return;
                    }
                }
                try {
                    const { error } = await supabase.from('sales_orders').update({
                        production_stage: 'kesish',
                        production_target_date: targetDate,
                        production_accepted_at: new Date().toISOString()
                    }).eq('id', id);
                    if (error) throw error;
                } catch (err) {
                    alert("Qabul qilishda xatolik: bazada 'production_target_date'/'production_accepted_at' ustunlari mavjudligini tekshiring.");
                    console.warn("accept-order failed:", err);
                    return;
                }
                loadProductionPipeline();
            };
        });
    }

    // ============================================================
    // BRIGADALAR — brigada tarkibi (a'zolar) va o'rnatish sifatini baholash
    // ============================================================
    let currentBrigadeIdForMember = null;
    let currentRatingOrderId = null;
    let currentRatingBrigadeId = null;

    async function loadBrigadesTab() {
        await Promise.all([renderBrigadesGrid(), renderRatingQueue()]);
    }

    async function renderBrigadesGrid() {
        const grid = document.getElementById('brigadesGrid');
        if (!grid) return;

        let brigades = [];
        try {
            const { data, error } = await supabase.from('romix_brigades').select('*').order('name');
            if (error) throw error;
            brigades = data || [];
        } catch (err) {
            grid.innerHTML = '<div style="color:var(--adm-text-sec); grid-column:1/-1;">Brigadalar topilmadi. \'romix_brigades\' jadvali mavjudligini tekshiring.</div>';
            console.warn("renderBrigadesGrid fetch failed:", err);
            return;
        }

        if (brigades.length === 0) {
            grid.innerHTML = '<div style="color:var(--adm-text-sec); grid-column:1/-1;">Hozircha brigada yo\'q. "+ Brigada Qo\'shish" tugmasini bosing.</div>';
            return;
        }

        let membersByBrigade = {};
        try {
            const { data, error } = await supabase.from('romix_brigade_members').select('*, employees(full_name)').in('brigade_id', brigades.map(b => b.id));
            if (error) throw error;
            (data || []).forEach(m => {
                if (!membersByBrigade[m.brigade_id]) membersByBrigade[m.brigade_id] = [];
                membersByBrigade[m.brigade_id].push(m);
            });
        } catch (err) {
            console.warn("renderBrigadesGrid members fetch failed:", err);
        }

        grid.innerHTML = brigades.map(b => {
            const members = membersByBrigade[b.id] || [];
            const membersHtml = members.length
                ? members.map(m => `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:6px 10px; border-radius:8px; font-size:0.78rem; margin-bottom:4px;">
                    <span>${m.employees ? m.employees.full_name : "Noma'lum"}</span>
                    <button class="rm-brigade-member" data-id="${m.id}" style="background:none; border:none; color:#ef4444; cursor:pointer;">✕</button>
                </div>`).join('')
                : '<div style="font-size:0.75rem; color:var(--adm-text-sec);">A\'zo yo\'q</div>';
            return `<div style="background:var(--adm-surface); border:1px solid var(--adm-border); border-top:3px solid #8b5cf6; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:8px; box-shadow:var(--adm-shadow);">
                <div style="font-weight:700; color:var(--adm-text); font-size:0.92rem;">${b.name}</div>
                <div style="border-top:1px dashed var(--adm-border); padding-top:8px;">${membersHtml}</div>
                <button class="add-brigade-member-btn" data-id="${b.id}" data-name="${b.name}" style="background:rgba(139,92,246,0.1); color:#8b5cf6; border:none; padding:8px; border-radius:8px; font-weight:600; font-size:0.74rem; cursor:pointer;">+ A'zo Qo'shish</button>
            </div>`;
        }).join('');

        document.querySelectorAll('.add-brigade-member-btn').forEach(btn => {
            btn.onclick = async () => {
                currentBrigadeIdForMember = btn.dataset.id;
                document.getElementById('addMemberBrigadeName').textContent = `Brigada: ${btn.dataset.name}`;
                let emps = [];
                try {
                    const { data, error } = await supabase.from('employees').select('id, full_name').order('full_name');
                    if (error) throw error;
                    emps = data || [];
                } catch (err) { console.warn("employees fetch failed:", err); }
                const sel = document.getElementById('newMemberEmp');
                sel.innerHTML = emps.map(e => `<option value="${e.id}">${e.full_name}</option>`).join('');
                document.getElementById('addMemberModal').classList.remove('hidden');
            };
        });

        document.querySelectorAll('.rm-brigade-member').forEach(btn => {
            btn.onclick = async () => {
                if (!confirm("A'zoni brigadadan chiqarasizmi?")) return;
                await supabase.from('romix_brigade_members').delete().eq('id', btn.dataset.id);
                renderBrigadesGrid();
            };
        });
    }

    async function renderRatingQueue() {
        const grid = document.getElementById('ratingQueueGrid');
        if (!grid) return;

        let orders = [];
        try {
            const { data, error } = await supabase.from('sales_orders').select('*').eq('install_status', 'Bajarildi');
            if (error) throw error;
            orders = data || [];
        } catch (err) {
            grid.innerHTML = '<div style="color:var(--adm-text-sec); grid-column:1/-1;">Yuklashda xatolik.</div>';
            console.warn("renderRatingQueue fetch failed:", err);
            return;
        }

        let ratedOrderIds = new Set();
        try {
            const { data, error } = await supabase.from('romix_brigade_ratings').select('order_id');
            if (error) throw error;
            (data || []).forEach(r => ratedOrderIds.add(r.order_id));
        } catch (err) {
            console.warn("renderRatingQueue ratings fetch failed:", err);
        }

        const pending = orders.filter(o => !ratedOrderIds.has(o.id));

        if (pending.length === 0) {
            grid.innerHTML = '<div style="text-align:center; color:var(--adm-text-sec); padding:20px; grid-column:1/-1;">Baholash kutilayotgan buyurtma yo\'q</div>';
            return;
        }

        let brigadesByName = {};
        try {
            const { data, error } = await supabase.from('romix_brigades').select('*');
            if (error) throw error;
            (data || []).forEach(b => { brigadesByName[b.name] = b; });
        } catch (err) { console.warn("brigades fetch for rating failed:", err); }

        grid.innerHTML = pending.map(o => `<div style="background:var(--adm-surface); border:1px solid var(--adm-border); border-top:3px solid #ffaa00; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:6px; box-shadow:var(--adm-shadow);">
            <div style="font-weight:700; color:var(--adm-text); font-size:0.9rem;">${o.customer_name || "Noma'lum"}</div>
            <div style="font-size:0.75rem; color:var(--adm-text-sec);">Brigada: <strong style="color:#00d2ff;">${o.install_group || '—'}</strong></div>
            <button class="rate-brigade-btn" data-order-id="${o.id}" data-group="${(o.install_group || '').replace(/"/g, '')}" style="background:#ffaa00; color:#000; border:none; padding:8px; border-radius:8px; font-weight:700; font-size:0.74rem; cursor:pointer; margin-top:6px;">⭐ Baholash</button>
        </div>`).join('');

        document.querySelectorAll('.rate-brigade-btn').forEach(btn => {
            btn.onclick = async () => {
                currentRatingOrderId = btn.dataset.orderId;
                const groupName = btn.dataset.group;
                const brigade = brigadesByName[groupName];
                currentRatingBrigadeId = brigade ? brigade.id : null;
                document.getElementById('rateOrderInfo').textContent = `Brigada: ${groupName}`;
                document.getElementById('rateQuality').value = '5';
                document.getElementById('rateTimeliness').value = '5';
                document.getElementById('rateService').value = '5';
                document.getElementById('rateNote').value = '';
                document.getElementById('rateBrigadeModal').classList.remove('hidden');
            };
        });
    }

    document.getElementById('openAddBrigadeBtn').onclick = () => {
        document.getElementById('newBrigadeName').value = '';
        document.getElementById('addBrigadeModal').classList.remove('hidden');
    };
    document.getElementById('closeAddBrigadeModal').onclick = () => document.getElementById('addBrigadeModal').classList.add('hidden');
    document.getElementById('saveBrigadeBtn').onclick = async () => {
        const name = document.getElementById('newBrigadeName').value.trim();
        if (!name) return alert("Brigada nomini kiriting!");
        const saveBtn = document.getElementById('saveBrigadeBtn');
        if (saveBtn.disabled) return;
        saveBtn.disabled = true;
        try {
            const { error } = await supabase.from('romix_brigades').insert([{ name }]);
            if (error) throw error;
        } catch (err) {
            alert("Xatolik: bazada 'romix_brigades' jadvali mavjudligini tekshiring.");
            console.warn("add brigade failed:", err);
            saveBtn.disabled = false;
            return;
        }
        saveBtn.disabled = false;
        document.getElementById('addBrigadeModal').classList.add('hidden');
        renderBrigadesGrid();
    };

    document.getElementById('closeAddMemberModal').onclick = () => document.getElementById('addMemberModal').classList.add('hidden');
    document.getElementById('saveMemberBtn').onclick = async () => {
        const empId = document.getElementById('newMemberEmp').value;
        if (!empId || !currentBrigadeIdForMember) return;
        const saveBtn = document.getElementById('saveMemberBtn');
        if (saveBtn.disabled) return;
        saveBtn.disabled = true;
        try {
            const { data: existing } = await supabase.from('romix_brigade_members').select('id').eq('brigade_id', currentBrigadeIdForMember).eq('employee_id', empId).maybeSingle();
            if (existing) {
                alert("Bu xodim allaqachon shu brigadaga a'zo!");
                saveBtn.disabled = false;
                return;
            }
            const { error } = await supabase.from('romix_brigade_members').insert([{ brigade_id: currentBrigadeIdForMember, employee_id: empId }]);
            if (error) throw error;
        } catch (err) {
            alert("Xatolik: " + err.message);
            saveBtn.disabled = false;
            return;
        }
        saveBtn.disabled = false;
        document.getElementById('addMemberModal').classList.add('hidden');
        renderBrigadesGrid();
    };

    document.getElementById('closeRateBrigadeModal').onclick = () => document.getElementById('rateBrigadeModal').classList.add('hidden');
    document.getElementById('saveRatingBtn').onclick = async () => {
        const quality = parseInt(document.getElementById('rateQuality').value);
        const timeliness = parseInt(document.getElementById('rateTimeliness').value);
        const service = parseInt(document.getElementById('rateService').value);
        const note = document.getElementById('rateNote').value.trim();
        const saveBtn = document.getElementById('saveRatingBtn');
        if (saveBtn.disabled) return;
        saveBtn.disabled = true;
        try {
            const { error } = await supabase.from('romix_brigade_ratings').insert([{
                order_id: currentRatingOrderId,
                brigade_id: currentRatingBrigadeId,
                quality_score: quality,
                timeliness_score: timeliness,
                service_score: service,
                note
            }]);
            if (error) throw error;
        } catch (err) {
            alert("Baholashda xatolik: bazada 'romix_brigade_ratings' jadvali mavjudligini tekshiring.");
            console.warn("save rating failed:", err);
            saveBtn.disabled = false;
            return;
        }
        saveBtn.disabled = false;
        document.getElementById('rateBrigadeModal').classList.add('hidden');
        renderRatingQueue();
    };

    // Builder Logic
    document.getElementById('addMatBtn').onclick = () => {
        const sel = document.getElementById('selMat');
        const qty = parseFloat(document.getElementById('qMat').value);
        if (!sel.value || !qty) return alert("Material yoki miqdorni to'g'ri kiriting");
        const opt = sel.options[sel.selectedIndex];
        currentMats.push({
            id: sel.value,
            name: opt.dataset.name,
            qty: qty,
            unit: opt.dataset.unit,
            cost: parseFloat(opt.dataset.cost)
        });
        document.getElementById('qMat').value = '';
        renderBuilder();
    };

    document.getElementById('addAccBtn').onclick = () => {
        const sel = document.getElementById('selAcc');
        const qty = parseFloat(document.getElementById('qAcc').value);
        if (!sel.value || !qty) return alert("Aksessuar yoki miqdorni to'g'ri kiriting");
        const opt = sel.options[sel.selectedIndex];
        currentAccs.push({
            id: sel.value,
            name: opt.dataset.name,
            qty: qty,
            unit: opt.dataset.unit,
            cost: parseFloat(opt.dataset.cost)
        });
        document.getElementById('qAcc').value = '';
        renderBuilder();
    };

    function renderBuilder() {
        const mc = document.getElementById('matsContainer');
        mc.innerHTML = '';
        let mSum = 0;
        currentMats.forEach((m, idx) => {
            const sum = m.qty * m.cost;
            mSum += sum;
            mc.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,210,255,0.08); padding:8px 12px; border-radius:10px; margin-bottom:6px; font-size:0.9rem;">
                <span style="color:var(--adm-text);">${m.name}</span>
                <span style="color:#00d2ff;">${m.qty} ${m.unit}</span>
                <span style="color:var(--adm-text);">${sum.toLocaleString()} UZS</span>
                <button onclick="window.delMat(${idx})" style="background:none; border:none; color:#ff4757; cursor:pointer; font-weight:bold;">✕</button>
            </div>`;
        });

        const ac = document.getElementById('accsContainer');
        ac.innerHTML = '';
        let aSum = 0;
        currentAccs.forEach((m, idx) => {
            const sum = m.qty * m.cost;
            aSum += sum;
            ac.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(139,92,246,0.08); padding:8px 12px; border-radius:10px; margin-bottom:6px; font-size:0.9rem;">
                <span style="color:var(--adm-text);">${m.name}</span>
                <span style="color:#8b5cf6;">${m.qty} ${m.unit}</span>
                <span style="color:var(--adm-text);">${sum.toLocaleString()} UZS</span>
                <button onclick="window.delAcc(${idx})" style="background:none; border:none; color:#ff4757; cursor:pointer; font-weight:bold;">✕</button>
            </div>`;
        });

        const cMac = parseFloat(document.getElementById('cMachine').value) || 0;
        const cOvh = parseFloat(document.getElementById('cOverhead').value) || 0;
        const extra = cMac + cOvh;
        const total = mSum + aSum + extra;

        document.getElementById('sumMats').textContent = mSum.toLocaleString() + " UZS";
        document.getElementById('sumAccs').textContent = aSum.toLocaleString() + " UZS";
        document.getElementById('sumExtra').textContent = extra.toLocaleString() + " UZS";
        document.getElementById('sumTotal').textContent = total.toLocaleString() + " UZS";
    }

    window.delMat = (idx) => { currentMats.splice(idx, 1); renderBuilder(); };
    window.delAcc = (idx) => { currentAccs.splice(idx, 1); renderBuilder(); };

    document.querySelectorAll('.calc-btn').forEach(b => b.addEventListener('input', renderBuilder));

    document.getElementById('saveRecipeBtn').onclick = async () => {
        try {
            const name = document.getElementById('rName').value.trim();
            const type = document.getElementById('rType').value;
            const spec = document.getElementById('rSpec').value.trim();
            const mCost = parseFloat(document.getElementById('cMachine').value) || 0;
            const oCost = parseFloat(document.getElementById('cOverhead').value) || 0;

            let sum = 0;
            currentMats.forEach(m => sum += (m.qty * m.cost));
            currentAccs.forEach(m => sum += (m.qty * m.cost));
            const totalCost = sum + mCost + oCost;

            if (!name) return alert("Mahsulot nomini yozing!");
            const finalName = spec ? `${name} (${spec})` : name;

            const res = await supabase.from('production_recipes').insert([{
                name: finalName,
                type: type,
                materials_json: currentMats,
                accessories_json: currentAccs,
                machine_cost: mCost,
                overhead_cost: oCost,
                total_cost: totalCost
            }]);

            if (res.error) {
                console.error(res.error);
                alert("Xatolik! SQL xatosi: " + res.error.message);
            } else {
                alert("Shablon muvaffaqiyatli saqlandi!");
                currentMats = [];
                currentAccs = [];
                document.getElementById('rName').value = '';
                document.getElementById('rSpec').value = '';
                renderBuilder();
                addModal.style.display = 'none';
                loadRecipes();
            }
        } catch (err) {
            console.error("System Error:", err);
            alert("Tizimda xatolik yuz berdi: " + err.message);
        }
    };

    // View Details
    function openRecipe(r) {
        currentViewingId = r.id;
        document.getElementById('vrName').textContent = r.name;
        document.getElementById('vrTotal').textContent = Number(r.total_cost).toLocaleString() + " UZS";

        let html = '';
        if (r.materials_json?.length) {
            html += '<h4 style="color:#00d2ff; margin-bottom:5px;">📦 Materiallar</h4><ul style="margin:0 0 15px 15px; padding:0;">';
            r.materials_json.forEach(m => html += `<li>${m.name} — <b>${m.qty} ${m.unit}</b> = ${(m.qty * m.cost).toLocaleString()} UZS</li>`);
            html += '</ul>';
        }
        if (r.accessories_json?.length) {
            html += '<h4 style="color:#8b5cf6; margin-bottom:5px;">🔩 Aksessuarlar</h4><ul style="margin:0 0 15px 15px; padding:0;">';
            r.accessories_json.forEach(m => html += `<li>${m.name} — <b>${m.qty} ${m.unit}</b> = ${(m.qty * m.cost).toLocaleString()} UZS</li>`);
            html += '</ul>';
        }
        html += `<h4 style="color:#f59e0b; margin-bottom:5px;">⚙️ Qo'shimcha Xarajatlar</h4>
        <p style="margin:0;">Stanok: ${Number(r.machine_cost).toLocaleString()} UZS | Korxona: ${Number(r.overhead_cost).toLocaleString()} UZS</p>`;

        document.getElementById('vrContent').innerHTML = html;
        document.getElementById('viewRecipeModal').style.display = 'flex';
    }

    document.getElementById('closeVrBtn').onclick = () => document.getElementById('viewRecipeModal').style.display = 'none';
    document.getElementById('delRecipeBtn').onclick = async () => {
        if (confirm("O'chirib tashlaysizmi?")) {
            await supabase.from('production_recipes').delete().eq('id', currentViewingId);
            document.getElementById('viewRecipeModal').style.display = 'none';
            loadRecipes();
        }
    };

    loadData();
    loadProductionPipeline(); // "Zakazlar Jarayoni" endi standart ko'rinish, shuning uchun sahifa ochilishida darhol yuklanadi
});
