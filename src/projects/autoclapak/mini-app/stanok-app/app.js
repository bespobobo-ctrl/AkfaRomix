const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY sozlanmagan — .env faylini tekshiring.");
}
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN_OPERATOR || "8876482426:AAFIMJCPYrxi-xVQwVDtURhl_BcDDSg6htA";

// --- State ---
let currentUser = null;
let isShiftActive = false;
let shiftStartTime = null;
let countReady = 0;
let countBrak = 0;
let totalProducedSoFar = 0; // Total calpaks produced in the entire shift
let goalAmount = 500;
let timerInterval = null;
let currentShiftId = null; // Track current session in Supabase
let isModalOpen = false; // Flag to prevent multiple dialog triggers
let selectedOrderId = null; // Track selected active order
let selectedOrderModel = ''; // Track original selected order model name

const tg = window.Telegram.WebApp;
tg.expand();

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('stanok_session');
    if (saved) {
        currentUser = JSON.parse(saved);
        showScreen('setup-screen');
        initSetup();
    } else {
        showScreen('login-screen');
    }
});

// --- Auth ---
document.getElementById('login-btn').onclick = async () => {
    const id = document.getElementById('login-id').value.trim();
    const pass = document.getElementById('login-pass').value.trim();

    if (!id || !pass) {
        alert('Iltimos, login va parolni kiriting!');
        return;
    }

    // 1. Check Stanok operators
    if ((id === '7007' && pass === '1234') || (id === '8008' && pass === '1234')) {
        currentUser = {
            id: id,
            name: id === '7007' ? 'Jaloliddin R.' : 'Sardorbek M.'
        };
        localStorage.setItem('stanok_session', JSON.stringify(currentUser));
        showScreen('setup-screen');
        initSetup();
        return;
    }

    // 2. Check Kraska operators and redirect
    if ((id.toLowerCase() === 'kraska1' && pass === '123') || (id.toLowerCase() === 'kraska2' && pass === '123')) {
        const kraskaUser = {
            id: id.toLowerCase() === 'kraska1' ? 'K1' : 'K2',
            username: id,
            role: 'kraska',
            name: id.toLowerCase() === 'kraska1' ? 'Rassom 1' : 'Rassom 2'
        };
        localStorage.setItem('kraska_session', JSON.stringify(kraskaUser));
        location.href = '../kraska-app/index.html';
        return;
    }

    // 3. Check Qadoqlovchi operators and redirect
    if (id.toUpperCase().replace(/\s+/g, '') === 'Q1' && pass.replace(/\s+/g, '') === '123') {
        const qadoqUser = {
            id: 'Q1',
            username: 'Qadoqlovchi 1',
            role: 'qadoqlash',
            name: 'Qadoqlovchi 1'
        };
        localStorage.setItem('qadoqlash_session', JSON.stringify(qadoqUser));
        location.href = '../qadoqlash-app/index.html';
        return;
    }
    // 4. Check AC Manager and redirect
    if (id.toUpperCase().replace(/\s+/g, '') === 'AC1' && pass.replace(/\s+/g, '') === '123') {
        const acUser = { id: 'AC1', username: 'AC1', name: 'Ishlab Chiqarish Boshlig\'i', role: 'ac_manager' };
        localStorage.setItem('currentUser', JSON.stringify(acUser));
        location.href = '/src/projects/autoclapak/pages/admin_dashboard.html';
        return;
    }

    // 5. Fallback database query
    try {
        const { data: user } = await supabaseClient
            .from('system_users')
            .select('id, username, role, full_name')
            .eq('username', id)
            .eq('password', pass)
            .maybeSingle();

        if (user) {
            if (user.role === 'kraska' || user.role === 'kraskaci') {
                const kraskaUser = {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    name: user.full_name
                };
                localStorage.setItem('kraska_session', JSON.stringify(kraskaUser));
                location.href = '../kraska-app/index.html';
                return;
            } else if (user.role === 'admin' || user.role === 'ishlab_chiqarish') {
                currentUser = {
                    id: user.id,
                    name: user.full_name
                };
                localStorage.setItem('stanok_session', JSON.stringify(currentUser));
                showScreen('setup-screen');
                initSetup();
                return;
            }
        }
    } catch (e) {
        console.error("DB Auth error:", e);
    }

    alert('Avtorizatsiya xatosi!');
};

window.logout = () => {
    localStorage.removeItem('stanok_session');
    location.reload();
};

// --- Setup Mode ---
function initSetup() {
    document.querySelectorAll('.bento-item').forEach(opt => {
        opt.onclick = () => {
            opt.parentElement.querySelectorAll('.bento-item').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
        };
    });
    document.getElementById('start-shift-btn').onclick = startShift;

    const setupZapravkaBtn = document.getElementById('setup-zapravka-btn');
    if (setupZapravkaBtn) {
        setupZapravkaBtn.onclick = () => {
            document.getElementById('zapravka-qty-input').value = 100; // Reset default
            document.getElementById('zapravka-modal').style.display = 'flex';
        };
    }

    // Load active orders for operator
    loadActiveOrders();
}

async function loadActiveOrders() {
    const listContainer = document.getElementById('stanok-orders-list');
    if (!listContainer) return;

    try {
        const { data, error } = await supabaseClient
            .from('clapak_production')
            .select('*')
            .or('status.eq.zakaz,stage.eq.zakaz-1')
            .order('id', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            listContainer.innerHTML = `
                <div style="font-size:0.8rem; text-align:center; color:rgba(255,255,255,0.3); padding:15px;">
                    Hozircha navbatdagi buyurtmalar yo'q.
                </div>
            `;
            return;
        }

        listContainer.innerHTML = data.map(z => {
            let clientName = "Mijoz";
            let deadline = "Noma'lum";
            try {
                if (z.operator && z.operator.startsWith('{')) {
                    const parsed = JSON.parse(z.operator);
                    clientName = parsed.isOmbor ? 'Ombor Zaxirasi' : (parsed.clientName || clientName);
                    deadline = parsed.deadline || deadline;
                }
            } catch(e) {}

            return `
                <div class="order-item-card" data-order-id="${z.id}" data-model="${z.model}" data-qty="${z.quantity}" 
                    style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px; cursor:pointer; display:flex; flex-direction:column; gap:6px; transition:all 0.2s;"
                    onclick="window.selectStanokOrder(this, '${z.id}', '${z.model.replace(/'/g, "\\'")}', ${z.quantity}, '${clientName.replace(/'/g, "\\'")}')">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.7rem; font-weight:800; background:rgba(255,170,0,0.15); color:#ffaa00; padding:2px 8px; border-radius:6px; text-transform:uppercase;">${clientName}</span>
                        <span style="font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:700;">Muddat: ${deadline}</span>
                    </div>
                    <div style="font-size:0.9rem; font-weight:900; color:#fff;">${z.model}</div>
                    <div style="font-size:0.75rem; color:rgba(255,255,255,0.5);">Miqdor (Reja): <strong style="color:#00ff88;">${z.quantity} dona</strong></div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Error loading active orders for operator:", err);
        listContainer.innerHTML = `<div style="font-size:0.8rem; text-align:center; color:#ff4d4f; padding:10px;">Yuklashda xatolik yuz berdi.</div>`;
    }
}

window.selectStanokOrder = (element, orderId, model, qty, clientName) => {
    document.querySelectorAll('.order-item-card').forEach(card => {
        card.style.background = 'rgba(255,255,255,0.03)';
        card.style.borderColor = 'rgba(255,255,255,0.08)';
    });

    element.style.background = 'rgba(255,170,0,0.08)';
    element.style.borderColor = '#ffaa00';

    selectedOrderId = orderId;
    selectedOrderModel = model;

    let matchedModel = 'GENTRA';
    const lowerModel = model.toLowerCase();
    if (lowerModel.includes('malibu')) matchedModel = 'MALIBU-2';
    else if (lowerModel.includes('cobalt')) matchedModel = 'COBALT';

    const bentoItem = document.querySelector(`#model-selector .bento-item[data-val="${matchedModel}"]`);
    if (bentoItem) {
        bentoItem.parentElement.querySelectorAll('.bento-item').forEach(o => o.classList.remove('active'));
        bentoItem.classList.add('active');
    }

    const goalInput = document.getElementById('goal-input');
    if (goalInput) {
        goalInput.value = qty;
    }

    const summaryCard = document.getElementById('selected-order-summary');
    if (summaryCard) {
        document.getElementById('summary-model').textContent = model;
        document.getElementById('summary-client').textContent = clientName || "Mijoz";
        document.getElementById('summary-qty').textContent = `${qty.toLocaleString()} dona`;
        summaryCard.style.display = 'flex';
    }
};

async function getRemainingRefuel(machineId) {
    try {
        const { data: allData, error: rErr } = await supabaseClient
            .from('clapak_production')
            .select('status, raw_material')
            .eq('machine', machineId);

        if (rErr) throw rErr;
        if (!allData || allData.length === 0) return 0;

        let totalRefuel = 0;
        let totalUsed = 0;

        allData.forEach(r => {
            if (r.status === 'REFUEL') {
                totalRefuel += (r.raw_material || 0);
            } else {
                totalUsed += (r.raw_material || 0);
            }
        });

        return Math.max(0, parseFloat((totalRefuel - totalUsed).toFixed(1)));
    } catch (e) {
        console.error("Error fetching remaining refuel:", e);
        return 0;
    }
}

// --- Shift Logic ---
async function startShift() {
    if (!selectedOrderId) {
        alert("Iltimos, ishlab chiqarishni boshlash uchun navbatdagi buyurtmalardan (zakazlardan) birini tanlang!");
        return;
    }

    const machine = document.querySelector('#machine-selector .active').dataset.val;

    // Check remaining refuel
    const startBtn = document.getElementById('start-shift-btn');
    const originalText = startBtn.textContent;
    startBtn.textContent = 'TEKSHIRILMOQDA...';
    startBtn.disabled = true;

    try {
        const remaining = await getRemainingRefuel(machine);
        if (remaining <= 0) {
            alert(`Diqqat! ${machine} stanogida xom-ashyo (zapravka) qolmagan yoki yuklanmagan! Iltimos, ishga tushirishdan oldin xom-ashyo yuklang (zapravka qiling).`);
            return;
        }
    } catch (err) {
        console.error("Zapravkani tekshirishda xatolik:", err);
    } finally {
        startBtn.textContent = originalText;
        startBtn.disabled = false;
    }

    isShiftActive = true;
    shiftStartTime = new Date();
    goalAmount = parseInt(document.getElementById('goal-input').value) || 500;

    const model = selectedOrderModel || document.querySelector('#model-selector .active').dataset.val;

    document.getElementById('active-machine').textContent = machine;
    document.getElementById('active-model').textContent = model;

    countReady = 0;
    countBrak = 0;
    totalProducedSoFar = 0; // Reset overall tally on new shift start
    isModalOpen = false;

    updateDashboardUI();
    showScreen('dashboard-screen');
    timerInterval = setInterval(updateTimer, 1000);

    notifyBot(`⚡ <b>TIZIM ISHGA TUSHIRILDI</b>\n\n👤 Operator: ${currentUser.name}\n⚙️ Stanok: ${machine}\n📦 Reja: ${goalAmount} dona\n⏰ Vaqt: ${shiftStartTime.toLocaleTimeString()}`);

    // Save to Supabase
    saveShiftToSupabase({
        operator: currentUser.name,
        machine: machine,
        model: model,
        quantity: 0,
        brak: 0,
        start_time: shiftStartTime.toISOString(),
        status: 'ACTIVE'
    });

    showToast('Tizim onlayn. Ishlab chiqarish boshlandi.');
}

async function saveShiftToSupabase(data) {
    try {
        let res, error;
        if (selectedOrderId) {
            data.stage = 'STANOK';
            const result = await supabaseClient
                .from('clapak_production')
                .update(data)
                .eq('id', selectedOrderId)
                .select();
            res = result.data;
            error = result.error;
            selectedOrderId = null; // Reset selection
        } else {
            const result = await supabaseClient
                .from('clapak_production')
                .upsert([data], { onConflict: 'id' })
                .select();
            res = result.data;
            error = result.error;
        }

        if (res && res[0]) currentShiftId = res[0].id;
        if (error) console.error("Supabase Error:", error);
    } catch (e) { console.error("Sync Error", e); }
}

function getModelWeight(modelName) {
    if (!modelName) return 0.38;
    const name = modelName.toUpperCase();
    let size = null;
    if (name.includes('15')) size = 15;
    else if (name.includes('12')) size = 12;
    else if (name.includes('14')) size = 14;
    else if (name.includes('13')) size = 13;
    
    if (!size) size = 14; // Default to size 14 if size not specified
    
    if (size === 15) {
        if (name.includes('LASETTI')) return 0.491;
        if (name.includes('MAYBACH')) return 0.500;
        if (name.includes('RAVON')) return 0.375;
        if (name.includes('COBALT')) return 0.476;
        if (name.includes('TOSCA') || name.includes('TOSKA')) return 0.389;
        return 0.491;
    }
    if (size === 12) {
        if (name.includes('MERS') || name.includes('MERCEDES')) return 0.254;
        if (name.includes('MAYBACH')) return 0.254;
        return 0.254;
    }
    if (size === 14) {
        if (name.includes('LASETTI')) return 0.391;
        if (name.includes('MAYBACH')) return 0.420;
        if (name.includes('RAVON')) return 0.409;
        if (name.includes('COBALT')) return 0.468;
        if (name.includes('TOSCA') || name.includes('TOSKA')) return 0.352;
        if (name.includes('ESPERO')) return 0.510;
        if (name.includes('MALIBU')) return 0.416;
        if (name.includes('INFINITY')) return 0.345;
        if (name.includes('MERS') || name.includes('MERCEDES')) return 0.427;
        return 0.416;
    }
    if (size === 13) {
        if (name.includes('LASETTI')) return 0.300;
        if (name.includes('MAYBACH')) return 0.356;
        if (name.includes('RAVON')) return 0.333;
        if (name.includes('TOSCA') || name.includes('TOSKA')) return 0.310;
        if (name.includes('ESPERO')) return 0.417;
        if (name.includes('MALIBU')) return 0.323;
        if (name.includes('INFINITY')) return 0.249;
        if (name.includes('MERS') || name.includes('MERCEDES')) return 0.319;
        if (name.includes('MATIZ')) return 0.314;
        if (name.includes('SPYDER') || name.includes('SPAYDER')) return 0.306;
        return 0.300;
    }
    return 0.38;
}

function stopShift() {
    if (!confirm('Tizimni to\'xtatish va hisobotni yakunlashni tasdiqlaysizmi?')) return;

    isShiftActive = false;
    clearInterval(timerInterval);
    const endTime = new Date();
    const durationMin = Math.floor((endTime - shiftStartTime) / 60000);

    const machine = document.getElementById('active-machine').textContent;
    const model = document.getElementById('active-model').textContent;

    // Industrial Stats
    const energyRate = machine === 'ST-1' ? 14.5 : 12.8;
    const energyUsed = ((energyRate * durationMin) / 60).toFixed(2);
    const rawUsed = (countReady * getModelWeight(model) + countBrak * 0.40).toFixed(1);

    document.getElementById('rep-op').textContent = currentUser.name;
    document.getElementById('rep-time').textContent = `${durationMin} minut`;
    document.getElementById('rep-model').textContent = model;
    document.getElementById('rep-total').textContent = countReady;
    document.getElementById('rep-brak').textContent = countBrak;
    document.getElementById('rep-raw').textContent = `${rawUsed} kg`;
    document.getElementById('rep-energy').textContent = `${energyUsed} kWh`;

    document.getElementById('report-modal').style.display = 'flex';
}

document.getElementById('stop-shift-btn').onclick = stopShift;

// --- Counters ---
document.getElementById('add-1').onclick = () => { 
    if (isShiftActive) { 
        countReady += 1; 
        totalProducedSoFar += 1; 
        updateDashboardUI(); 
        pulseEffect('count-val'); 
    } 
};
document.getElementById('add-10').onclick = () => { 
    if (isShiftActive) { 
        countReady += 10; 
        totalProducedSoFar += 10; 
        updateDashboardUI(); 
        pulseEffect('count-val'); 
    } 
};
document.getElementById('add-brak').onclick = () => { 
    if (isShiftActive) { 
        countBrak += 1; 
        updateDashboardUI(); 
        showToast('Nuqson qayd etildi ⚠️'); 
    } 
};

function updateDashboardUI() {
    document.getElementById('count-val').innerHTML = `${countReady} <small style="font-size: 0.9rem; opacity: 0.5; display: block; margin-top: 5px; line-height: 1.3;">Joriy miqdor<br>Smena jami: ${totalProducedSoFar} / ${goalAmount}</small>`;
    
    const remaining = goalAmount - totalProducedSoFar;
    const remEl = document.getElementById('remaining-val');

    if (remaining <= 0) {
        remEl.textContent = `+${Math.abs(remaining)}`;
        remEl.style.color = 'var(--emerald)';
    } else {
        remEl.textContent = remaining;
        remEl.style.color = '#fff';
    }

    // Progress Ring Calculation (overall goal based)
    const ring = document.getElementById('progress-bar');
    const dash = 282.7;
    const progress = Math.min(totalProducedSoFar / goalAmount, 1);
    const offset = dash - (dash * progress);
    ring.style.strokeDashoffset = offset;
    ring.style.stroke = remaining <= 0 ? 'var(--emerald)' : 'var(--cyan)';

    debouncedSync();
}

let syncTimeout = null;
function debouncedSync() {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
        if (!currentShiftId) return;
        await supabaseClient.from('clapak_production').update({
            quantity: countReady,
            brak: countBrak,
            last_update: new Date().toISOString()
        }).eq('id', currentShiftId);
    }, 5000); // Sync every 5 seconds of inactivity
}

function updateTimer() {
    const diff = new Date() - shiftStartTime;
    const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
    document.getElementById('shift-timer').textContent = `${h}:${m}:${s}`;
}

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
    el.style.transform = 'scale(1.1)';
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

// --- Report Actions ---
window.printReport = () => {
    window.print();
};

document.getElementById('final-transmit-btn').onclick = async () => {
    const btn = document.getElementById('final-transmit-btn');
    btn.textContent = 'YUBORILMOQDA...';
    btn.disabled = true;

    try {
        const endTime = new Date();
        const durationMin = Math.floor((endTime - shiftStartTime) / 60000);
        const machine = document.getElementById('active-machine').textContent;
        const energyRate = machine === 'ST-1' ? 14.5 : 12.8;
        const energyUsed = parseFloat(((energyRate * durationMin) / 60).toFixed(2));
        const model = document.getElementById('active-model').textContent;
        const rawUsed = parseFloat((countReady * getModelWeight(model) + countBrak * 0.40).toFixed(1));

        const reportData = {
            id: currentShiftId,
            operator: currentUser.name,
            machine: machine,
            model: model,
            quantity: countReady,
            brak: countBrak,
            raw_material: rawUsed,
            energy: energyUsed,
            end_time: endTime.toISOString(),
            status: 'DONE',
            stage: 'xom_ombor'
        };

        const { error } = await supabaseClient
            .from('clapak_production')
            .upsert([reportData]);

        if (error) throw error;

        // Send Telegram notification
        await notifyBot(`📊 <b>ISHLAB CHIQARISH HISOBOTI</b>\n\n👤 Operator: ${currentUser.name}\n⚙️ Stanok: ${machine}\n📦 Model: ${model}\n✅ Tayyor: ${countReady}\n❌ Brak (Nuqson): ${countBrak}\n⚡ Elektr sarfi: ${energyUsed} kWh\n🏗 Xom-ashyo: ${rawUsed} kg\n📦 Bo'lim: Xom Mahsulot Ombori`);

        showToast(`Partiya Xom mahsulot omboriga o'tkazildi! ✅`);
        setTimeout(() => location.reload(), 2000);
    } catch (e) {
        alert('Xatolik yuz berdi: ' + e.message);
        btn.textContent = 'QAYTA YUBORISH';
        btn.disabled = false;
    }
};

// --- Refueling (Zapravka) Logic ---
const btnZapravka = document.getElementById('btn-zapravka');
if (btnZapravka) {
    btnZapravka.onclick = () => {
        document.getElementById('zapravka-qty-input').value = 100; // Reset default
        document.getElementById('zapravka-modal').style.display = 'flex';
    };
}

const confirmZapravkaBtn = document.getElementById('confirm-zapravka-btn');
if (confirmZapravkaBtn) {
    confirmZapravkaBtn.onclick = async () => {
        const qtyInput = document.getElementById('zapravka-qty-input');
        const qtyVal = parseFloat(qtyInput.value);
        if (isNaN(qtyVal) || qtyVal <= 0) {
            alert('Iltimos, to\'g\'ri miqdor kiriting!');
            return;
        }

        confirmZapravkaBtn.textContent = 'SAQLANMOQDA...';
        confirmZapravkaBtn.disabled = true;

        try {
            const machine = isShiftActive ? document.getElementById('active-machine').textContent : (document.querySelector('#machine-selector .active')?.dataset?.val || 'ST-1');
            const opName = currentUser ? currentUser.name : 'Noma\'lum';
            const refuelData = {
                operator: opName,
                machine: machine,
                model: 'REFUEL',
                quantity: 0,
                brak: 0,
                raw_material: qtyVal,
                energy: 0,
                start_time: new Date().toISOString(),
                status: 'REFUEL',
                stage: 'STANOK'
            };

            const { error } = await supabaseClient
                .from('clapak_production')
                .insert([refuelData]);

            if (error) throw error;

            // Send Telegram Notification
            await notifyBot(`⛽ <b>STANOK ZAPRAVKA QILINDI</b>\n\n👤 Operator: ${opName}\n⚙️ Stanok: ${machine}\n🏗 Miqdor: ${qtyVal} kg\n⏰ Vaqt: ${new Date().toLocaleTimeString()}`);

            document.getElementById('zapravka-modal').style.display = 'none';
            showToast('Zapravka muvaffaqiyatli saqlandi! ⛽');
        } catch (e) {
            alert('Zapravka saqlashda xatolik: ' + e.message);
        } finally {
            confirmZapravkaBtn.textContent = 'YUKLASH ⚡';
            confirmZapravkaBtn.disabled = false;
        }
    };
}
