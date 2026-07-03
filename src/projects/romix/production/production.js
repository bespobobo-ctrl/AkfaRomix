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
    async function loadProductionPipeline() {
        let orders = [];
        try {
            const { data, error } = await supabase.from('sales_orders').select('*').eq('status', 'Jarayonda').order('created_at', { ascending: false });
            if (error) throw error;
            orders = data || [];
        } catch (err) {
            console.warn("loadProductionPipeline fetch failed:", err);
        }

        const cols = {
            new: document.getElementById('pipelineColNew'),
            kesish: document.getElementById('pipelineColKesish'),
            payvandlash: document.getElementById('pipelineColPayvand'),
            yigish_qadoqlash: document.getElementById('pipelineColYigish')
        };
        Object.values(cols).forEach(c => { if (c) c.innerHTML = ''; });

        const emptyMsg = '<div style="text-align:center; color:var(--adm-text-sec); font-size:0.78rem; padding:16px 0;">Bo\'sh</div>';
        // tayyor_omborda bosqichidagilar bu boardda ko'rsatilmaydi (ular Tayyor Mahsulotga o'tgan)
        const buckets = {
            new: orders.filter(o => !o.production_stage),
            kesish: orders.filter(o => o.production_stage === 'kesish'),
            payvandlash: orders.filter(o => o.production_stage === 'payvandlash'),
            yigish_qadoqlash: orders.filter(o => o.production_stage === 'yigish_qadoqlash')
        };

        function card(o, actionHtml) {
            return `<div style="background:var(--adm-surface); border:1px solid var(--adm-border); border-radius:14px; padding:12px; display:flex; flex-direction:column; gap:8px; box-shadow:var(--adm-shadow);">
                <div style="font-weight:700; color:var(--adm-text); font-size:0.82rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${o.customer_name || 'Noma\'lum'}</div>
                <div style="font-size:0.72rem; color:var(--adm-text-sec);">${o.prod_type || ''}</div>
                <div style="font-size:0.7rem; color:var(--adm-text-sec);">Guruh: <strong style="color:#00d2ff;">${o.worker_group || '—'}</strong></div>
                ${actionHtml}
            </div>`;
        }

        if (cols.new) {
            cols.new.innerHTML = buckets.new.length === 0 ? emptyMsg : buckets.new.map(o => card(o,
                `<button class="pipeline-advance-btn" data-id="${o.id}" data-next="kesish" style="background:#ffaa00; color:#000; border:none; padding:8px; border-radius:8px; font-weight:700; font-size:0.74rem; cursor:pointer;">✅ Qabul Qilish</button>`
            )).join('');
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
    }

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
});
