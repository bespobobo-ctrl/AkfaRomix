const supabaseUrl = 'https://dzsswblbpnjuluyqvewt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const BOT_TOKEN = '8876482426:AAFIMJCPYrxi-xVQwVDtURhl_BcDDSg6htA';

// --- State ---
let currentUser = null;
let isShiftActive = false;
let shiftStartTime = null;
let countReady = 0;
let countBrak = 0;
let goalAmount = 500;
let timerInterval = null;
let currentShiftId = null; // Track current session in Supabase

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
    if (id.toLowerCase() === 'qadoqlovchi 1' && pass === '1234') {
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

    // 3. Fallback database query
    try {
        const { data: user } = await supabaseClient
            .from('system_users')
            .select('*')
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
}

// --- Shift Logic ---
function startShift() {
    isShiftActive = true;
    shiftStartTime = new Date();
    goalAmount = parseInt(document.getElementById('goal-input').value) || 500;

    const machine = document.querySelector('#machine-selector .active').dataset.val;
    const model = document.querySelector('#model-selector .active').dataset.val;

    document.getElementById('active-machine').textContent = machine;
    document.getElementById('active-model').textContent = model;

    countReady = 0;
    countBrak = 0;

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
        const { data: res, error } = await supabaseClient
            .from('clapak_production')
            .upsert([data], { onConflict: 'id' })
            .select();

        if (res && res[0]) currentShiftId = res[0].id;
        if (error) console.error("Supabase Error:", error);
    } catch (e) { console.error("Sync Error", e); }
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
    const rawUsed = (countReady * 0.38 + countBrak * 0.40).toFixed(1);

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
document.getElementById('add-1').onclick = () => { if (isShiftActive) { countReady += 1; updateDashboardUI(); pulseEffect('count-val'); } };
document.getElementById('add-10').onclick = () => { if (isShiftActive) { countReady += 10; updateDashboardUI(); pulseEffect('count-val'); } };
document.getElementById('add-brak').onclick = () => { if (isShiftActive) { countBrak += 1; updateDashboardUI(); showToast('Nuqson qayd etildi ⚠️'); } };

function updateDashboardUI() {
    document.getElementById('count-val').textContent = countReady;
    const remaining = goalAmount - countReady;
    const remEl = document.getElementById('remaining-val');

    if (remaining <= 0) {
        remEl.textContent = `+${Math.abs(remaining)}`;
        remEl.style.color = 'var(--emerald)';
    } else {
        remEl.textContent = remaining;
        remEl.style.color = '#fff';
    }

    // Progress Ring Calculation
    const ring = document.getElementById('progress-bar');
    const dash = 282.7;
    const progress = Math.min(countReady / goalAmount, 1);
    const offset = dash - (dash * progress);
    ring.style.strokeDashoffset = offset;
    ring.style.stroke = remaining <= 0 ? 'var(--emerald)' : 'var(--cyan)';

    // Optional: Periodic Sync to Supabase during shift
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
        const cartNumber = document.getElementById('cart-selector').value || '1';
        const endTime = new Date();
        const durationMin = Math.floor((endTime - shiftStartTime) / 60000);
        const machine = document.getElementById('active-machine').textContent;
        const energyRate = machine === 'ST-1' ? 14.5 : 12.8;
        const energyUsed = parseFloat(((energyRate * durationMin) / 60).toFixed(2));
        const rawUsed = parseFloat((countReady * 0.38 + countBrak * 0.40).toFixed(1));
        const model = document.getElementById('active-model').textContent;

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
            stage: 'sovutish-' + cartNumber
        };

        const { error } = await supabaseClient
            .from('clapak_production')
            .upsert([reportData]);

        if (error) throw error;

        // Send Telegram notification with cart details
        await notifyBot(`📊 <b>ISHLAB CHIQARISH HISOBOTI</b>\n\n👤 Operator: ${currentUser.name}\n⚙️ Stanok: ${machine}\n📦 Model: ${model}\n✅ Tayyor: ${countReady}\n❌ Brak (Nuqson): ${countBrak}\n⚡ Elektr sarfi: ${energyUsed} kWh\n🏗 Xom-ashyo: ${rawUsed} kg\n📟 Arava raqami: ${cartNumber}-arava`);

        showToast(`Partiya #${cartNumber}-aravada sovutish bo'limiga o'tkazildi! ✅`);
        setTimeout(() => location.reload(), 2000);
    } catch (e) {
        alert('Xatolik yuz berdi: ' + e.message);
        btn.textContent = 'QAYTA YUBORISH';
        btn.disabled = false;
    }
};
