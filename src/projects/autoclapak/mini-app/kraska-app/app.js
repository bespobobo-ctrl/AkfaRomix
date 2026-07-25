const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY sozlanmagan — .env faylini tekshiring.");
}
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN_OPERATOR || "8876482426:AAFIMJCPYrxi-xVQwVDtURhl_BcDDSg6htA";

// --- State ---
let currentUser = null;
let activeCart = null;
let paintStartTime = null;
let timerInterval = null;
let brakCount = 0;
let pollingInterval = null;
let confirmedQty = 80; // Track confirmed quantity of cart (default 80)
let selectedPaintType = 'Serisi'; // Track selected paint type

const tg = window.Telegram.WebApp;
if (tg) {
    tg.expand();
    tg.setHeaderColor('#0d121a');
}

window.toggleSizeCategory = (key, headerEl, contentEl) => {
    if (!contentEl) return;
    const isCollapsed = contentEl.classList.toggle('collapsed');
    if (headerEl) headerEl.classList.toggle('collapsed', isCollapsed);
    localStorage.setItem(`cat_collapse_${key}`, isCollapsed ? 'true' : 'false');
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('kraska_session');
    if (saved) {
        currentUser = JSON.parse(saved);
        showScreen('dashboard-screen');
        initDashboard();
    } else {
        showScreen('login-screen');
    }
});

// --- Auth ---
document.getElementById('login-btn').onclick = async () => {
    const btn = document.getElementById('login-btn');
    const id = document.getElementById('login-id').value.trim();
    const pass = document.getElementById('login-pass').value.trim();

    if (!id || !pass) {
        alert('Iltimos, login va parolni kiriting!');
        return;
    }

    btn.textContent = 'KIRISH TEKSHIRILMOQDA...';
    btn.disabled = true;

    try {
        // 1. Try Supabase system_users first
        const { data: user, error } = await supabaseClient
            .from('system_users')
            .select('*')
            .eq('username', id)
            .eq('password', pass)
            .maybeSingle();

        if (user && (user.role === 'kraska' || user.role === 'admin')) {
            currentUser = {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.full_name
            };
            localStorage.setItem('kraska_session', JSON.stringify(currentUser));
            showScreen('dashboard-screen');
            initDashboard();
            return;
        }

        // 2. Hardcoded fallback
        if ((id.toLowerCase() === 'kraska1' && pass === '123') || (id.toLowerCase() === 'kraska2' && pass === '123') || (id.toLowerCase() === 'kraska3' && pass === '123')) {
            currentUser = {
                id: id.toLowerCase() === 'kraska1' ? 'K1' : id.toLowerCase() === 'kraska2' ? 'K2' : 'K3',
                username: id,
                role: 'kraska',
                name: id.toLowerCase() === 'kraska1' ? 'Rassom 1' : id.toLowerCase() === 'kraska2' ? 'Rassom 2' : 'Rassom 3'
            };
            localStorage.setItem('kraska_session', JSON.stringify(currentUser));
            showScreen('dashboard-screen');
            initDashboard();
            return;
        }

        alert('Login yoki parol xato, yoki kirishga ruxsatingiz yo\'q!');
    } catch (e) {
        alert('Xatolik: ' + e.message);
    } finally {
        btn.textContent = 'KIRISHNI TASDIQLASH';
        btn.disabled = false;
    }
};

window.logout = () => {
    if (confirm('Tizimdan chiqishni tasdiqlaysizmi?')) {
        localStorage.removeItem('kraska_session');
        clearTimeout(pollingInterval);
        location.href = '../stanok-app/index.html';
    }
};

let isFetchingCarts = false;
let activeDashboardTab = 'raw-warehouse';
window.currentRawStock = [];
window.currentRoomStock = [];

// --- Dashboard flow ---
function initDashboard() {
    document.getElementById('active-operator').textContent = currentUser.name;
    
    // Set default tab UI
    document.getElementById('tab-raw-warehouse').classList.toggle('active', activeDashboardTab === 'raw-warehouse');
    document.getElementById('tab-room-stock').classList.toggle('active', activeDashboardTab === 'room-stock');
    if (document.getElementById('tab-my-sushilka')) {
        document.getElementById('tab-my-sushilka').classList.toggle('active', activeDashboardTab === 'my-sushilka');
    }

    // Fetch cooling carts immediately
    fetchCoolingCarts();
}

window.switchDashboardTab = (tab) => {
    activeDashboardTab = tab;
    document.getElementById('tab-raw-warehouse').classList.toggle('active', tab === 'raw-warehouse');
    document.getElementById('tab-room-stock').classList.toggle('active', tab === 'room-stock');
    if (document.getElementById('tab-my-sushilka')) {
        document.getElementById('tab-my-sushilka').classList.toggle('active', tab === 'my-sushilka');
    }
    
    const bannerTitle = document.getElementById('dashboard-banner-title');
    if (bannerTitle) {
        if (tab === 'raw-warehouse') {
            bannerTitle.innerHTML = `<h2>BO'YASH NAVBATIDAGI MODELLAR</h2><p>Bo'yash xonasiga olib o'tish uchun navbatdagi modelni tanlang</p>`;
        } else if (tab === 'room-stock') {
            bannerTitle.innerHTML = `<h2>BIZNING XONA ZAXIRALARI (PARTIYA)</h2><p>Aravaga yuklab bo'yashni boshlash uchun modelni tanlang</p>`;
        } else if (tab === 'my-sushilka') {
            bannerTitle.innerHTML = `<h2>SUSHILKADAGI ARAVALARIM</h2><p>Siz yuborgan faol aravachalar holati</p>`;
        }
    }
    
    if (tab === 'raw-warehouse') {
        renderCoolingCarts(window.currentRawStock);
    } else if (tab === 'room-stock') {
        renderCoolingCarts(window.currentRoomStock);
    } else if (tab === 'my-sushilka') {
        renderMySushilkaCarts();
    }
};

async function fetchCoolingCarts() {
    if (isFetchingCarts) return;
    isFetchingCarts = true;
    try {
        // Fetch raw warehouse products
        const { data: rawData, error: rawError } = await supabaseClient
            .from('clapak_production')
            .select('id, model, quantity, stage, last_update, status')
            .eq('status', 'DONE')
            .eq('stage', 'kraska_queue')
            .order('start_time', { ascending: true });

        if (rawError) throw rawError;

        // Fetch room stock products
        const roomStage = currentUser.username.toLowerCase() + '_room';
        const { data: roomData, error: roomError } = await supabaseClient
            .from('clapak_production')
            .select('id, model, quantity, stage, last_update, status')
            .eq('status', 'DONE')
            .eq('stage', roomStage)
            .order('last_update', { ascending: false });

        if (roomError) throw roomError;

        // Fetch all active production carts for notifications and tab display
        const { data: activeCarts, error: activeCartsError } = await supabaseClient
            .from('clapak_production')
            .select('id, model, quantity, stage, last_update, status, operator, brak')
            .or('stage.like.sushilka-%,stage.like.cooling-%,stage.like.sovutish-%,stage.like.halqa-%,stage.like.ready_timer-%,stage.like.packaging-%')
            .not('status', 'eq', 'DONE_WAREHOUSE')
            .order('last_update', { ascending: false });

        if (!activeCartsError && activeCarts) {
            checkDryingCarts(activeCarts);
            
            // Filter carts belonging to the current painter
            window.myActiveCarts = activeCarts.filter(c => {
                const painter = c.operator && c.operator.includes(' | ') ? c.operator.split(' | ')[1] : '';
                return painter === currentUser.name;
            });
        } else {
            window.myActiveCarts = [];
        }

        // Group raw by model
        const rawGrouped = {};
        (rawData || []).forEach(item => {
            const m = item.model;
            if (!rawGrouped[m]) rawGrouped[m] = { model: m, quantity: 0 };
            rawGrouped[m].quantity += (item.quantity || 0);
        });

        // Group room by model
        const roomGrouped = {};
        (roomData || []).forEach(item => {
            const m = item.model;
            if (!roomGrouped[m]) roomGrouped[m] = { model: m, quantity: 0 };
            roomGrouped[m].quantity += (item.quantity || 0);
        });

        window.currentRawStock = Object.values(rawGrouped);
        window.currentRoomStock = Object.values(roomGrouped);

        if (activeDashboardTab === 'raw-warehouse') {
            renderCoolingCarts(window.currentRawStock);
        } else if (activeDashboardTab === 'room-stock') {
            renderCoolingCarts(window.currentRoomStock);
        } else if (activeDashboardTab === 'my-sushilka') {
            renderMySushilkaCarts();
        }
    } catch (e) {
        console.error('Error fetching cooling/room carts:', e);
    } finally {
        isFetchingCarts = false;
        if (currentUser) {
            pollingInterval = setTimeout(fetchCoolingCarts, 5000);
        }
    }
}

function checkDryingCarts(carts) {
    const alertsContainer = document.getElementById('drying-alerts-container');
    const alertsList = document.getElementById('drying-alerts-list');
    if (!alertsContainer || !alertsList) return;

    const driedCarts = (carts || []).filter(c => {
        if (!c.stage || !c.stage.startsWith('sushilka-')) return false;
        const painter = c.operator && c.operator.includes(' | ') ? c.operator.split(' | ')[1] : '';
        if (painter !== currentUser.name) return false;
        
        const elapsedMin = c.last_update ? Math.floor((Date.now() - new Date(c.last_update).getTime()) / 60000) : 0;
        return elapsedMin >= 240;
    });

    if (driedCarts.length > 0) {
        alertsContainer.style.display = 'flex';
        alertsList.innerHTML = driedCarts.map(c => {
            const cartNum = c.stage.split('-')[1] || '?';
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(250,187,24,0.2);">
                    <div>
                        <div style="font-weight: 800; color: #fff; font-size: 0.95rem;">Arava #${cartNum} - ${c.model}</div>
                        <div style="font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-top: 2px;">Miqdor: ${c.quantity} dona</div>
                    </div>
                    <button onclick="window.confirmDry('${c.id}', '${cartNum}')" style="background: #fabb18; color: #000; border: none; padding: 10px 16px; border-radius: 10px; font-weight: 900; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 10px rgba(250,187,24,0.2);">QURIGANI TASDIQLASH ✓</button>
                </div>
            `;
        }).join('');
    } else {
        alertsContainer.style.display = 'none';
    }
}

function renderMySushilkaCarts() {
    const list = document.getElementById('cooling-carts-list');
    if (!list) return;

    const myCarts = window.myActiveCarts || [];

    if (myCarts.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 2.2rem; margin-bottom: 15px;">☀️</div>
                <div style="font-weight: 800; color: #fff;">SUSHILKADA ARAVALARINGIZ YO'Q</div>
                <p style="margin-top: 5px; font-size: 0.75rem; color: rgba(255,255,255,0.3);">
                    Siz yuborgan faol aravachalar (quritish, sovutish, halqa qo'yish yoki qadoqlashda) bu yerda ko'rinadi.
                </p>
            </div>`;
        return;
    }

    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '15px';

    const html = myCarts.map(c => {
        const stageParts = c.stage ? c.stage.split('-') : [];
        const stageName = stageParts[0];
        const cartNum = stageParts[1] || '?';
        const elapsedMin = c.last_update ? Math.floor((Date.now() - new Date(c.last_update).getTime()) / 60000) : 0;

        let statusText = 'Noma\'lum';
        let badgeStyle = 'background: rgba(255,255,255,0.1); color: #fff;';
        let detailText = '';
        let showConfirmBtn = false;
        let borderLeftColor = '#fff';

        if (stageName === 'sushilka') {
            const leftMin = Math.max(0, 240 - elapsedMin);
            borderLeftColor = 'var(--amber)';
            if (leftMin > 0) {
                statusText = 'QURITILMOQDA ☀️';
                badgeStyle = 'background: rgba(250, 187, 24, 0.15); color: #fabb18; border: 1px solid rgba(250,187,24,0.35);';
                detailText = `⏳ 240 daqiqadan <strong>${leftMin} daqiqa</strong> qoldi`;
            } else {
                statusText = 'QURIDI (TASDIQLASH KUTILYAPTI) 🔔';
                badgeStyle = 'background: rgba(250, 187, 24, 0.25); color: #fabb18; border: 1px solid #fabb18; font-weight:900; animation: clapak-pulse 1s infinite;';
                detailText = `✅ Qurib bo'lgan. Tasdiqlashingiz kutilmoqda.`;
                showConfirmBtn = true;
            }
        } else if (stageName === 'cooling') {
            const leftMin = Math.max(0, 60 - elapsedMin);
            borderLeftColor = 'var(--cyan)';
            statusText = 'SOVUTILMOQDA ❄️';
            badgeStyle = 'background: rgba(0, 242, 255, 0.15); color: #00f2ff; border: 1px solid rgba(0,242,255,0.35);';
            detailText = `⏳ 60 daqiqadan <strong>${leftMin} daqiqa</strong> qoldi`;
        } else if (stageName === 'halqa') {
            borderLeftColor = 'var(--purple)';
            statusText = 'HALQA QO\'YISH ⚙️';
            badgeStyle = 'background: rgba(186, 0, 255, 0.15); color: #ba00ff; border: 1px solid rgba(186,0,255,0.35);';
            detailText = `⚙️ Qadoqlashda temir halqalar qo'yilishi kutilmoqda`;
        } else if (stageName === 'ready_timer') {
            const leftMin = Math.max(0, 60 - elapsedMin);
            borderLeftColor = 'var(--emerald)';
            statusText = 'FINAL TAYYORLASH ⏳';
            badgeStyle = 'background: rgba(0, 255, 136, 0.15); color: #00ff88; border: 1px solid rgba(0,255,136,0.35);';
            detailText = `⏳ 60 daqiqadan <strong>${leftMin} daqiqa</strong> qoldi`;
        } else if (stageName === 'packaging') {
            const packedBoxes = parseInt(stageParts[2] || '0');
            const remainingQty = Math.max(0, c.quantity - (packedBoxes * 4));
            borderLeftColor = '#00e676';
            statusText = 'QADOQLANMOQDA 📦';
            badgeStyle = 'background: rgba(0, 230, 118, 0.15); color: #00e676; border: 1px solid rgba(0,230,118,0.35);';
            detailText = `📦 Qadoqlandi: <strong>${packedBoxes} komplekt (quti)</strong> (Aravada qoldi: ${remainingQty} dona)`;
        }

        const confirmBtnHtml = showConfirmBtn 
            ? `<button onclick="window.confirmDry('${c.id}', '${cartNum}')" class="btn-card-action" style="background: #fabb18; color: #000; box-shadow: 0 5px 15px rgba(250,187,24,0.3); font-weight:900; padding: 10px 14px; font-size: 0.7rem; border-radius: 12px; margin-left: 10px;">TASDIQLASH</button>`
            : '';

        return `
            <div class="cart-card-item" style="border-left: 4px solid ${borderLeftColor}; padding: 15px; border-radius: 20px;">
                <div class="cart-card-info" style="flex: 1;">
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 5px;">
                        <span class="cart-card-tag" style="margin: 0; padding: 4px 10px; font-size: 0.65rem; ${badgeStyle}">${statusText}</span>
                        <span style="font-size: 0.65rem; color: rgba(255,255,255,0.25); font-family: monospace;">#${c.id.substring(0, 8)}</span>
                    </div>
                    <span class="cart-card-model" style="font-size: 1.05rem; font-weight: 800;">ARAVA #${cartNum} — ${c.model}</span>
                    <span class="cart-card-qty" style="margin-top: 4px; font-size: 0.75rem;">🔢 Jami miqdor: <strong>${c.quantity} dona</strong></span>
                    <span class="cart-card-qty" style="color: rgba(255, 255, 255, 0.6); margin-top: 5px; font-size: 0.75rem; display: flex; align-items: center; gap: 4px;">
                        ${detailText}
                    </span>
                </div>
                ${confirmBtnHtml}
            </div>
        `;
    }).join('');

    list.innerHTML = html;
}

window.confirmDry = async (id, cartNum) => {
    if (!confirm(`Arava #${cartNum} qurigani va sovutishga chiqarilishini tasdiqlaysizmi?`)) return;
    try {
        const { error } = await supabaseClient
            .from('clapak_production')
            .update({
                stage: 'cooling-' + cartNum,
                last_update: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        showToast(`Arava #${cartNum} sovutishga chiqarildi! ❄️`);
        
        notifyBot(
            `☀️ <b>MAHSULOT QURIDI (TASDIQLANDI)</b>\n\n` +
            `📟 Arava: ARAVA #${cartNum}\n` +
            `👤 Tasdiqlovchi rassom: ${currentUser.name}\n` +
            `❄️ <b>Qadoqlash bo'limida sovutish boshlandi.</b> (60 daqiqa)`
        ).then();

        fetchCoolingCarts();
    } catch (e) {
        alert('Xatolik: ' + e.message);
    }
};

window.openAllocateModal = (model, totalQty) => {
    document.getElementById('allocate-model-display').textContent = model;
    const qtyInput = document.getElementById('allocate-qty-input');
    qtyInput.value = Math.min(100, totalQty);
    qtyInput.max = totalQty;
    qtyInput.min = 1;
    
    document.getElementById('allocate-modal').style.display = 'flex';
    
    document.getElementById('allocate-confirm-btn').onclick = async () => {
        const qtyToBring = parseInt(qtyInput.value) || 100;
        if (qtyToBring <= 0 || qtyToBring > totalQty) {
            alert(`Xatolik: Iltimos, 1 va ${totalQty} oralig'ida to'g'ri miqdor kiriting!`);
            return;
        }
        
        document.getElementById('allocate-confirm-btn').disabled = true;
        document.getElementById('allocate-confirm-btn').textContent = 'OLIB KELINMOQDA...';
        
        try {
            // Fetch raw records of this model (FIFO)
            const { data: records, error: fetchErr } = await supabaseClient
                .from('clapak_production')
                .select('*')
                .eq('model', model)
                .eq('status', 'DONE')
                .eq('stage', 'kraska_queue')
                .order('start_time', { ascending: true });

            if (fetchErr || !records || records.length === 0) {
                throw new Error("Omborda mahsulot qolmagan!");
            }

            let remainingToAllocate = qtyToBring;
            const recordsToUpdate = [];
            const recordsToDelete = [];
            let lastOperator = 'Stanok Operator';

            for (const r of records) {
                const qty = r.quantity || 0;
                if (qty <= remainingToAllocate) {
                    recordsToDelete.push(r.id);
                    remainingToAllocate -= qty;
                } else {
                    recordsToUpdate.push({ id: r.id, quantity: qty - remainingToAllocate });
                    remainingToAllocate = 0;
                    break;
                }
                if (remainingToAllocate <= 0) break;
            }

            if (records.length > 0) {
                lastOperator = records[0].operator || 'Stanok Operator';
            }

            // Perform Supabase changes
            if (recordsToDelete.length > 0) {
                const { error: delErr } = await supabaseClient
                    .from('clapak_production')
                    .delete()
                    .in('id', recordsToDelete);
                if (delErr) throw delErr;
            }

            for (const item of recordsToUpdate) {
                const { error: updErr } = await supabaseClient
                    .from('clapak_production')
                    .update({ quantity: item.quantity })
                    .eq('id', item.id);
                if (updErr) throw updErr;
            }

            // Insert/Upsert into Room Stock: stage = currentUser.username + '_room'
            const roomStage = currentUser.username.toLowerCase() + '_room';
            const { data: existingRoomRecord } = await supabaseClient
                .from('clapak_production')
                .select('*')
                .eq('model', model)
                .eq('stage', roomStage)
                .eq('status', 'DONE')
                .maybeSingle();

            if (existingRoomRecord) {
                // Update
                const newRoomQty = (existingRoomRecord.quantity || 0) + qtyToBring;
                const { error: roomUpdErr } = await supabaseClient
                    .from('clapak_production')
                    .update({ quantity: newRoomQty, last_update: new Date().toISOString() })
                    .eq('id', existingRoomRecord.id);
                if (roomUpdErr) throw roomUpdErr;
            } else {
                // Insert new
                const newRoomRecord = {
                    model: model,
                    quantity: qtyToBring,
                    stage: roomStage,
                    status: 'DONE',
                    start_time: new Date().toISOString(),
                    last_update: new Date().toISOString(),
                    operator: lastOperator
                };
                const { error: roomInsErr } = await supabaseClient
                    .from('clapak_production')
                    .insert([newRoomRecord]);
                if (roomInsErr) throw roomInsErr;
            }

            document.getElementById('allocate-modal').style.display = 'none';
            showToast(`Muvaffaqiyatli: ${qtyToBring} dona xonaga olib kelindi! 🚚`);
            
            // Switch view to room stock to let user see their batch!
            activeDashboardTab = 'room-stock';
            document.getElementById('tab-raw-warehouse').classList.remove('active');
            document.getElementById('tab-room-stock').classList.add('active');
            const bannerTitle = document.getElementById('dashboard-banner-title');
            if (bannerTitle) {
                bannerTitle.innerHTML = `<h2>BIZNING XONA ZAXIRALARI (PARTIYA)</h2><p>Aravaga yuklab bo'yashni boshlash uchun modelni tanlang</p>`;
            }

            // Trigger immediate refresh
            isFetchingCarts = false;
            fetchCoolingCarts();
        } catch (e) {
            console.error('Error allocating to room stock:', e);
            alert("Xatolik: " + e.message);
        } finally {
            document.getElementById('allocate-confirm-btn').disabled = false;
            document.getElementById('allocate-confirm-btn').textContent = '🚚 XONAGA OLISH';
        }
    };
};

function renderCoolingCarts(models) {
    const list = document.getElementById('cooling-carts-list');
    if (!list) return;

    if (models.length === 0) {
        if (activeDashboardTab === 'raw-warehouse') {
            list.innerHTML = `<div class="empty-state">XOM MAHSULOT OMBORI BO'SH... 📦</div>`;
        } else {
            list.innerHTML = `<div class="empty-state">BIZNING XONA HOSILASI BO'SH... ❄️<br><small style="color:rgba(255,255,255,0.3)">Xom ombor tabidan xonaga mahsulot olib keling.</small></div>`;
        }
        return;
    }

    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '15px';

    // Group models by size prefix dynamically
    const groupedBySize = {};

    models.forEach(m => {
        if (!m) return;
        const match = (m.model && typeof m.model === 'string') ? m.model.match(/^(\d+)/) : null;
        const size = match ? match[1] : 'Boshqa';
        if (!groupedBySize[size]) {
            groupedBySize[size] = [];
        }
        groupedBySize[size].push(m);
    });

    function getProductWeightGrams(modelName) {
        if (!modelName || typeof modelName !== 'string') return 380;
        const match = modelName.match(/^(\d+)\s+(.+)$/i);
        if (match) {
            const size = match[1];
            const name = match[2].toLowerCase().replace(/\s+/g, '');
            
            const weights = {
                '15': { lasetti: 491, maybach: 500, ravon: 375, cobalt: 476, tosca: 389 },
                '12': { mercedes: 254, mers: 254, maybach: 254 },
                '14': { lasetti: 391, maybach: 420, ravon: 409, cobalt: 468, tosca: 352, espero: 510, malibu: 416, infinity: 345, mercedes: 427, mers: 427 },
                '13': { lasetti: 300, maybach: 356, ravon: 333, tosca: 310, espero: 417, malibu: 323, infinity: 249, mercedes: 319, mers: 319, matiz: 314, spyder: 306, spider: 306 }
            };
            
            if (weights[size]) {
                for (const key in weights[size]) {
                    if (name.includes(key)) {
                        return weights[size][key];
                    }
                }
            }
        }
        return 380; // default fallback 380g
    }

    let html = '';
    const sizesOrder = Object.keys(groupedBySize).sort((a, b) => {
        if (a === 'Boshqa') return 1;
        if (b === 'Boshqa') return -1;
        return parseInt(b) - parseInt(a);
    });
    sizesOrder.forEach(size => {
        const prodsInSize = groupedBySize[size] || [];
        if (prodsInSize.length === 0) return;

        const collapseKey = `kraska_raw_size_${size}`;
        const isCollapsed = localStorage.getItem(`cat_collapse_${collapseKey}`) === 'true';
        const headerClass = isCollapsed ? 'category-header-raw collapsed' : 'category-header-raw';
        const contentClass = isCollapsed ? 'category-content collapsed' : 'category-content';

        html += `
            <div class="${headerClass}" onclick="window.toggleSizeCategory('${collapseKey}', this, document.getElementById('${collapseKey}'))">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 1.1rem; font-weight: 800; color: #ba00ff; letter-spacing: 0.5px;">
                        ${size === 'Boshqa' ? 'Boshqa Razmerlar' : size + '-Razmer'}
                    </span>
                    <span style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.4); font-weight: 600;">(Turlari: ${prodsInSize.length} xil)</span>
                </div>
                <span class="chevron">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </span>
            </div>
            <div id="${collapseKey}" class="${contentClass}">
                <div style="display: grid; grid-template-columns: 1fr; gap: 16px; width: 100%;">
        `;

        html += prodsInSize.map(m => {
            const weightGrams = getProductWeightGrams(m.model);
            const isRaw = activeDashboardTab === 'raw-warehouse';
            const tagText = isRaw ? 'OMBORDAGI MODEL' : 'XONADAGI ZAXIRA';
            const tagStyle = isRaw ? 'background:rgba(186,0,255,0.1); color:#ba00ff;' : 'background:rgba(0,242,255,0.1); color:#00f2ff;';
            const btnText = isRaw ? 'XONAGA OLISH ➜' : 'BO\'YASHGA OLISH ➜';
            const btnOnClick = isRaw 
                ? `window.openAllocateModal('${m.model.replace(/'/g, "\\'")}', ${m.quantity})`
                : `window.startPainting('${m.model.replace(/'/g, "\\'")}', ${m.quantity})`;
            
            return `
                <div class="cart-card-item" style="${isRaw ? '' : 'border-color: rgba(0, 242, 255, 0.25);'}">
                    <div class="cart-card-info">
                        <span class="cart-card-tag" style="${tagStyle}">${tagText}</span>
                        <span class="cart-card-model">${m.model}</span>
                        <span class="cart-card-qty">🔢 Jami miqdor: <strong>${m.quantity} dona</strong></span>
                        <span class="cart-card-qty" style="color: #fabb18; font-weight: 700; margin-top: 2px;">⚖️ Og'irligi (1 dona): ${weightGrams} gram</span>
                    </div>
                    <button onclick="${btnOnClick}" class="btn-card-action" style="${isRaw ? '' : 'background: linear-gradient(135deg, var(--cyan), #0072ff); box-shadow: 0 5px 15px rgba(0, 242, 255, 0.25); color: #000;'}">${btnText}</button>
                </div>
            `;
        }).join('');

        html += `</div></div>`;
    });

    list.innerHTML = html;
}

// --- Painting Mode ---
window.startPainting = async (model, totalQty) => {
    if (pollingInterval) {
        clearTimeout(pollingInterval);
        pollingInterval = null;
    }

    const roomStage = currentUser.username.toLowerCase() + '_room';
    
    // Fetch room stock record to confirm exact current quantity
    let roomRecord = null;
    try {
        const { data } = await supabaseClient
            .from('clapak_production')
            .select('*')
            .eq('model', model)
            .eq('stage', roomStage)
            .eq('status', 'DONE')
            .maybeSingle();
        roomRecord = data;
    } catch (e) {
        console.error("Error fetching room record:", e);
    }

    if (!roomRecord || (roomRecord.quantity || 0) <= 0) {
        alert("Xatolik: Xonangizda ushbu modeldagi mahsulot qolmagan!");
        isFetchingCarts = false;
        fetchCoolingCarts();
        return;
    }

    const currentRoomQty = roomRecord.quantity;

    // Show the confirmation modal
    const startModal = document.getElementById('start-paint-modal');
    if (startModal) {
        const qtyInput = document.getElementById('start-qty-input');
        qtyInput.value = Math.min(80, currentRoomQty);
        qtyInput.max = currentRoomQty;

        // Fetch occupied trolleys to determine which ones are available
        let occupiedCarts = new Set();
        try {
            const { data: activeProds } = await supabaseClient
                .from('clapak_production')
                .select('stage')
                .or('stage.like.kraska-%,stage.like.sushilka-%');
            
            if (activeProds) {
                activeProds.forEach(p => {
                    const num = p.stage.split('-')[1];
                    if (num) occupiedCarts.add(parseInt(num));
                });
            }
        } catch (e) {
            console.error("Error fetching active carts:", e);
        }

        // Populate cart selector
        const cartSelect = document.getElementById('start-cart-selector');
        let optionsHtml = '';
        let firstAvailable = null;
        for (let i = 1; i <= 20; i++) {
            const isOccupied = occupiedCarts.has(i);
            if (!isOccupied && firstAvailable === null) {
                firstAvailable = i;
            }
            optionsHtml += `<option value="${i}" ${isOccupied ? 'disabled style="color:rgba(255,255,255,0.2);"' : ''}>${i}-arava ${isOccupied ? '(BAND 🚫)' : '(BO\'SH ✅)'}</option>`;
        }
        cartSelect.innerHTML = optionsHtml;
        if (firstAvailable !== null) {
            cartSelect.value = firstAvailable;
        }

        startModal.style.display = 'flex';

        document.getElementById('start-paint-confirm-btn').onclick = async () => {
            confirmedQty = parseInt(qtyInput.value) || 80;
            selectedPaintType = document.getElementById('start-paint-type').value || 'Serisi';
            const cartNum = cartSelect.value || '1';

            if (confirmedQty > currentRoomQty) {
                alert(`Xatolik: Xonangizda bu modeldan jami ${currentRoomQty} dona mahsulot bor!`);
                return;
            }

            document.getElementById('start-paint-confirm-btn').disabled = true;
            document.getElementById('start-paint-confirm-btn').textContent = 'BO\'YASH BOSHLANMOQDA...';

            startModal.style.display = 'none';
            brakCount = 0;
            paintStartTime = new Date();

            document.getElementById('paint-cart-title').textContent = `ARAVA #${cartNum}`;
            document.getElementById('paint-model-title').textContent = model;
            document.getElementById('paint-qty-val').innerHTML = `${confirmedQty} <small style="font-size: 1rem; color: rgba(255,255,255,0.4);">dona karkas</small>`;
            document.getElementById('brak-count-val').textContent = '0';

            // Pre-fill passport dropdown
            const passportSelect = document.getElementById('paint-type-select');
            if (passportSelect) passportSelect.value = selectedPaintType;

            // Deduct quantity from Room Stock record
            try {
                if (currentRoomQty === confirmedQty) {
                    // Delete the room stock record since it's fully empty
                    const { error: delErr } = await supabaseClient
                        .from('clapak_production')
                        .delete()
                        .eq('id', roomRecord.id);
                    if (delErr) throw delErr;
                } else {
                    // Update room stock with deducted quantity
                    const { error: updErr } = await supabaseClient
                        .from('clapak_production')
                        .update({
                            quantity: currentRoomQty - confirmedQty,
                            last_update: new Date().toISOString()
                        })
                        .eq('id', roomRecord.id);
                    if (updErr) throw updErr;
                }

                const stanokOperator = roomRecord.operator || 'Stanok Operator';
                const operatorString = `${stanokOperator} | ${currentUser.name}`;

                // Create a NEW record for the trolley in kraska
                const newRecord = {
                    model: model,
                    quantity: confirmedQty,
                    stage: 'kraska-' + cartNum,
                    status: 'DONE',
                    start_time: paintStartTime.toISOString(),
                    last_update: paintStartTime.toISOString(),
                    operator: operatorString
                };

                const { data: insertRes, error: insertError } = await supabaseClient
                    .from('clapak_production')
                    .insert([newRecord])
                    .select();

                if (insertError) throw insertError;
                activeCart = insertRes[0];

                // Notify Bot
                notifyBot(`🎨 <b>BO'YASH BOSHLANDI</b>\n\n👤 Rassom: ${currentUser.name}\n📟 Arava: ARAVA #${cartNum}\n📦 Model: ${model}\n⚡ Kraska turi: ${selectedPaintType}\n✅ Tasdiqlangan miqdor: ${confirmedQty} dona\n⏰ Boshlangan vaqt: ${paintStartTime.toLocaleTimeString()}`);
            } catch (e) {
                console.error('Error starting paint flow from room stock:', e);
                alert("Xatolik: " + e.message);
                initDashboard();
                return;
            } finally {
                document.getElementById('start-paint-confirm-btn').disabled = false;
                document.getElementById('start-paint-confirm-btn').textContent = '⚡ BO\'YASHNI BOSHLASH';
            }

            showScreen('painting-screen');
            
            // Start Paint Timer
            document.getElementById('paint-timer').textContent = '00:00';
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(updatePaintTimer, 1000);
        };
    }
};

function updatePaintTimer() {
    const diff = new Date() - paintStartTime;
    const m = Math.floor(diff / 60000).toString().padStart(2, '0');
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
    document.getElementById('paint-timer').textContent = `${m}:${s}`;
}

// --- Defect Counter ---
document.getElementById('brak-plus').onclick = () => {
    brakCount++;
    document.getElementById('brak-count-val').textContent = brakCount;
    pulseEffect('brak-count-val');
};

document.getElementById('brak-minus').onclick = () => {
    if (brakCount > 0) {
        brakCount--;
        document.getElementById('brak-count-val').textContent = brakCount;
        pulseEffect('brak-count-val');
    }
};

// --- Finish Painting & Passport ---
document.getElementById('finish-paint-btn').onclick = () => {
    if (timerInterval) clearInterval(timerInterval);
    const endTime = new Date();
    const diffMs = endTime - paintStartTime;
    const m = Math.floor(diffMs / 60000);
    const s = Math.floor((diffMs % 60000) / 1000);
    const durationStr = `${m} daqiqa ${s} soniya`;

    const cartNum = activeCart.stage.split('-')[1] || '0';
    const passportId = 'PAS-' + Math.random().toString(36).substr(2, 5).toUpperCase();

    // Reset defect count in passport modal
    brakCount = 0;

    // Set paint type selector to the pre-selected one
    const selectEl = document.getElementById('paint-type-select');
    if (selectEl) selectEl.value = selectedPaintType;

    // Helper functions to increment/decrement brak count right inside the passport modal!
    window.incrementPassBrak = () => {
        if (brakCount < confirmedQty) {
            brakCount++;
            updatePassportBrakUI();
        }
    };

    window.decrementPassBrak = () => {
        if (brakCount > 0) {
            brakCount--;
            updatePassportBrakUI();
        }
    };

    function updatePassportBrakUI() {
        document.getElementById('pass-brak-input').textContent = brakCount;
        // Keep pass-qty showing confirmedQty (e.g. 80)
        document.getElementById('pass-qty').textContent = `${confirmedQty} dona`;
        pulseEffect('pass-brak-input');
    }

    // Populate Passport Modal
    document.getElementById('pass-cart-num').textContent = `ARAVA #${cartNum}`;
    document.getElementById('pass-model').textContent = activeCart.model;
    document.getElementById('pass-qty').textContent = `${confirmedQty} dona`;
    document.getElementById('pass-brak-input').textContent = '0';
    document.getElementById('pass-duration').textContent = durationStr;
    document.getElementById('pass-time').textContent = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('pass-id').textContent = '#' + passportId;

    document.getElementById('passport-modal').style.display = 'flex';
};

document.getElementById('sushilka-transmit-btn').onclick = async () => {
    if (!confirm('Ushbu aravani sushilka (quritish) bo\'limiga yuborishni tasdiqlaysizmi?')) return;

    const btn = document.getElementById('sushilka-transmit-btn');
    btn.textContent = 'YUBORILMOQDA... 🚀';
    btn.disabled = true;

    try {
        const cartNum = activeCart.stage.split('-')[1] || '0';
        const endTime = new Date();
        const durationStr = document.getElementById('pass-duration').textContent;
        const passportId = document.getElementById('pass-id').textContent;

        // Sum the painting defects to the existing defects (brak)
        const totalBrak = (activeCart.brak || 0) + brakCount;

        // Update database: stage -> sushilka-X, update brak, quantity remains confirmedQty (e.g. 80)
        const { error } = await supabaseClient
            .from('clapak_production')
            .update({
                stage: 'sushilka-' + cartNum,
                quantity: confirmedQty, // Keep full 80 pieces on the cart entering sushilka!
                brak: totalBrak,
                last_update: endTime.toISOString()
            })
            .eq('id', activeCart.id);

        if (error) throw error;

        // Deduct brakCount from the Room Stock!
        if (brakCount > 0) {
            const roomStage = currentUser.username.toLowerCase() + '_room';
            try {
                const { data: roomRecord, error: roomFetchErr } = await supabaseClient
                    .from('clapak_production')
                    .select('*')
                    .eq('model', activeCart.model)
                    .eq('stage', roomStage)
                    .eq('status', 'DONE')
                    .maybeSingle();

                if (!roomFetchErr && roomRecord) {
                    const currentRoomQty = roomRecord.quantity || 0;
                    const newRoomQty = Math.max(0, currentRoomQty - brakCount);
                    
                    if (newRoomQty === 0) {
                        await supabaseClient
                            .from('clapak_production')
                            .delete()
                            .eq('id', roomRecord.id);
                    } else {
                        await supabaseClient
                            .from('clapak_production')
                            .update({ quantity: newRoomQty, last_update: new Date().toISOString() })
                            .eq('id', roomRecord.id);
                    }
                }
            } catch (roomErr) {
                console.error("Error updating room stock for defects:", roomErr);
            }
        }

        // Insert into clapak_kraska_logs for piece-rate salary calculation
        const paintType = document.getElementById('paint-type-select').value;
        let price = 0;
        if (paintType === 'Serisi') price = 25600;
        else if (paintType === 'Redlayn') price = 33000;
        else if (paintType === 'Kombo') price = 50000;

        const logRecord = {
            id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            cart_id: activeCart.id,
            worker_id: currentUser.id,
            worker_name: currentUser.name,
            paint_type: paintType,
            quantity: confirmedQty, // Log the full quantity completed
            price: price,
            created_at: endTime.toISOString()
        };

        // Save locally
        try {
            let localLogs = JSON.parse(localStorage.getItem('clapak_kraska_logs_local')) || [];
            localLogs.push(logRecord);
            localStorage.setItem('clapak_kraska_logs_local', JSON.stringify(localLogs));
        } catch (e) {
            console.error("Local log save error:", e);
        }

        const { error: logError } = await supabaseClient
            .from('clapak_kraska_logs')
            .insert({
                cart_id: logRecord.cart_id,
                worker_id: logRecord.worker_id,
                worker_name: logRecord.worker_name,
                paint_type: logRecord.paint_type,
                quantity: logRecord.quantity,
                price: logRecord.price
            });

        if (logError) throw logError;

        // Send beautiful Telegram Bot passport notification
        await notifyBot(
            `🎫 <b>ARAVA PASPORTI (SUSHILKAGA YO'LLANDI)</b>\n\n` +
            `📟 <b>Arava raqami:</b> ARAVA #${cartNum}\n` +
            `📦 <b>Mahsulot modeli:</b> ${activeCart.model}\n` +
            `🎨 <b>Bo'yoq turi:</b> ${paintType} (${price.toLocaleString()} so'm)\n` +
            `✅ <b>Tayyor karkas:</b> ${confirmedQty} dona\n` +
            `🚨 <b>Bo'yashdagi nuqson (brak):</b> ${brakCount} dona (Zaxiradan ayrildi)\n` +
            `⏱ <b>Bo'yalish davomiyligi:</b> ${durationStr}\n` +
            `👤 <b>Ijrochi rassom:</b> ${currentUser.name}\n` +
            `⏰ <b>Yo'llangan vaqt:</b> ${endTime.toLocaleTimeString()}\n` +
            `🎫 <b>Pasport ID:</b> ${passportId}`
        );

        showToast('Arava sushilka bo\'limiga yo\'llandi! ✅');
        
        setTimeout(() => {
            document.getElementById('passport-modal').style.display = 'none';
            showScreen('dashboard-screen');
            initDashboard();
        }, 2000);
    } catch (e) {
        alert('Xatolik: ' + e.message);
        btn.textContent = 'QAYTA YUBORISH';
        btn.disabled = false;
    }
};

// --- Presentation Helpers ---
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'flex';
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show';
    setTimeout(() => t.className = 'toast', 2000);
}

function pulseEffect(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.transform = 'scale(1.2)';
    setTimeout(() => el.style.transform = 'scale(1)', 100);
}

async function notifyBot(text) {
    try {
        const chatId = tg.initDataUnsafe?.user?.id || localStorage.getItem('test_chat_id') || '689230554';
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
        });
    } catch (e) { console.error("Bot Error", e); }
}
