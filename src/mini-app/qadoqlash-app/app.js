// ═══════════════════════════════════════════════════════════════
//  📦 QADOQLASH BO'LIMI — APP LOGIC
// ═══════════════════════════════════════════════════════════════

const supabaseUrl = 'https://dzsswblbpnjuluyqvewt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const BOT_TOKEN = '8876482426:AAFIMJCPYrxi-xVQwVDtURhl_BcDDSg6htA';

// --- State ---
let currentUser = null;
let pollingInterval = null;
let packedToday = 0;
let finishedProducts = [];

const tg = window.Telegram.WebApp;
if (tg) {
    tg.expand();
    tg.setHeaderColor('#0a0f18');
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('qadoqlash_session');
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

    btn.textContent = 'TEKSHIRILMOQDA...';
    btn.disabled = true;

    try {
        // 1. Hardcoded Qadoqlovchi credentials
        if (id.toUpperCase() === 'Q1' && pass === '123') {
            currentUser = {
                id: 'Q1',
                username: 'Qadoqlovchi 1',
                role: 'qadoqlash',
                name: 'Qadoqlovchi 1'
            };
            localStorage.setItem('qadoqlash_session', JSON.stringify(currentUser));
            showScreen('dashboard-screen');
            initDashboard();
            return;
        }

        // 2. Database fallback
        const { data: user } = await supabaseClient
            .from('system_users')
            .select('*')
            .eq('username', id)
            .eq('password', pass)
            .maybeSingle();

        if (user && (user.role === 'qadoqlash' || user.role === 'admin')) {
            currentUser = {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.full_name || user.username
            };
            localStorage.setItem('qadoqlash_session', JSON.stringify(currentUser));
            showScreen('dashboard-screen');
            initDashboard();
            return;
        }

        alert('Login yoki parol xato!');
    } catch (e) {
        alert('Xatolik: ' + e.message);
    } finally {
        btn.textContent = 'KIRISHNI TASDIQLASH';
        btn.disabled = false;
    }
};

// --- Logout ---
window.qLogout = () => {
    if (confirm('Tizimdan chiqishni tasdiqlaysizmi?')) {
        localStorage.removeItem('qadoqlash_session');
        clearInterval(pollingInterval);
        location.href = '../stanok-app/index.html';
    }
};

// --- Dashboard ---
function initDashboard() {
    document.getElementById('user-name').textContent = currentUser.name;
    loadSushilkaCarts();
    // Poll every 10 seconds for new carts
    pollingInterval = setInterval(loadSushilkaCarts, 10000);
}

async function loadSushilkaCarts() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const startOfDay = today + 'T00:00:00.000Z';
        const endOfDay = today + 'T23:59:59.999Z';

        // Get carts in sushilka/sovutish stage (ready for packaging)
        const { data: carts, error } = await supabaseClient
            .from('clapak_production')
            .select('*')
            .or('stage.like.sovutish-%,stage.like.sushilka-%')
            .eq('status', 'DONE')
            .gte('start_time', startOfDay)
            .lte('start_time', endOfDay)
            .order('end_time', { ascending: true });

        if (error) throw error;

        // Get packaged items for today stats
        const { data: packed } = await supabaseClient
            .from('clapak_production')
            .select('quantity')
            .or('stage.eq.packaging,stage.eq.finished')
            .gte('start_time', startOfDay)
            .lte('start_time', endOfDay);

        packedToday = (packed || []).reduce((sum, x) => sum + (x.quantity || 0), 0);

        renderCarts(carts || []);
        updateStats(carts || []);
    } catch (e) {
        console.error('Load error:', e);
    }
}

function renderCarts(carts) {
    var container = document.getElementById('cart-list');

    if (!carts || carts.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="emoji">📭</div><p>Hozircha sushilkada tayyor arava yo&#39;q</p></div>';
        return;
    }

    var html = '';
    carts.forEach(function(c) {
        var cartNum = c.stage ? c.stage.split('-')[1] || '?' : '?';
        var model = c.model || "Noma'lum";
        var qty = c.quantity || 0;
        var brak = c.brak || 0;
        var operator = c.operator ? c.operator.split(' | ')[0] : "Noma'lum";

        var sushilkaTime = c.last_update
            ? new Date(c.last_update).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '--:--';

        // Calculate time in sushilka
        var duration = '';
        if (c.last_update) {
            var diffMs = Date.now() - new Date(c.last_update).getTime();
            var mins = Math.floor(diffMs / 60000);
            var h = Math.floor(mins / 60);
            var m = mins % 60;
            duration = h > 0 ? h + ' soat ' + m + ' daq' : m + ' daqiqa';
        }

        // Cart is "ready" if it's been in sushilka for >30 min
        var diffMin = c.last_update ? Math.floor((Date.now() - new Date(c.last_update).getTime()) / 60000) : 0;
        var isReady = diffMin >= 30;
        var statusClass = isReady ? 'ready' : 'waiting';
        var statusText = isReady ? 'TAYYOR' : 'KUTILMOQDA';

        html += '<div class="cart-item ' + statusClass + '">' +
            '<div class="cart-header">' +
                '<div class="cart-name">🛒 ARAVA #' + cartNum + ' — ' + model + '</div>' +
                '<span class="cart-badge ' + statusClass + '">' + statusText + '</span>' +
            '</div>' +
            '<div class="cart-details">' +
                '<div class="cart-detail">Miqdor: <span>' + qty + ' ta</span></div>' +
                '<div class="cart-detail">Brak: <span style="color:var(--danger);">' + brak + ' ta</span></div>' +
                '<div class="cart-detail">Operator: <span>' + operator + '</span></div>' +
                '<div class="cart-detail">Sushilkada: <span style="color:var(--warning);">' + duration + '</span></div>' +
                '<div class="cart-detail">Kirgan vaqt: <span>' + sushilkaTime + '</span></div>' +
            '</div>' +
            '<button class="btn-pack" onclick="window.packCart(\'' + c.id + '\', ' + cartNum + ', \'' + model + '\', ' + qty + ')" ' +
            (isReady ? '' : 'disabled') + '>' +
            (isReady ? '📦 QADOQLASHNI BOSHLASH' : '⏳ QURITILMOQDA...') +
            '</button>' +
        '</div>';
    });

    container.innerHTML = html;
}

function updateStats(carts) {
    document.getElementById('stat-waiting').textContent = carts.length;
    document.getElementById('stat-packed').textContent = packedToday;
    var komplekt = Math.floor(packedToday / 4);
    document.getElementById('stat-komplekt').textContent = komplekt;
}

// --- Pack Cart ---
window.packCart = async function(id, cartNum, model, qty) {
    if (!confirm('Arava #' + cartNum + ' ni qadoqlashni boshlaysizmi?\n\nModel: ' + model + '\nMiqdor: ' + qty + ' ta')) return;

    try {
        // 1. Move to packaging stage
        var { error } = await supabaseClient
            .from('clapak_production')
            .update({
                stage: 'packaging-' + cartNum,
                status: 'PACKAGING'
            })
            .eq('id', id);

        if (error) throw error;

        showToast('Arava #' + cartNum + ' qadoqlashga olindi ✅');

        // 2. Simulate packaging process (in real life this would be a separate step)
        // After a short delay, mark as finished
        setTimeout(async function() {
            await finishPacking(id, cartNum, model, qty);
        }, 1500);

    } catch (e) {
        alert('Xatolik: ' + e.message);
    }
};

async function finishPacking(id, cartNum, model, qty) {
    try {
        // 1. Mark production as finished
        var { error } = await supabaseClient
            .from('clapak_production')
            .update({
                stage: 'finished',
                status: 'DONE'
            })
            .eq('id', id);

        if (error) throw error;

        // 2. Add to finished products list
        var komplekt = Math.floor(qty / 4);
        var qoldiq = qty % 4;

        finishedProducts.unshift({
            model: model,
            qty: qty,
            komplekt: komplekt,
            qoldiq: qoldiq,
            cart: cartNum,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        renderFinished();
        packedToday += qty;
        updateStats([]);

        // Reload carts list (arava disappears from sushilka)
        loadSushilkaCarts();

        showToast('Arava #' + cartNum + ' qadoqlandi! ' + komplekt + ' komplekt tayyor ✅');

        // 3. Notify bot
        notifyBot('📦 <b>QADOQLASH TUGADI</b>\n\n' +
            '👤 ' + currentUser.name + '\n' +
            '🛒 Arava: #' + cartNum + '\n' +
            '📦 Model: ' + model + '\n' +
            '✅ Miqdor: ' + qty + ' ta\n' +
            '📊 Komplekt: ' + komplekt + ' ta\n' +
            '⏰ Vaqt: ' + new Date().toLocaleTimeString());

    } catch (e) {
        alert('Xatolik: ' + e.message);
    }
}

function renderFinished() {
    var container = document.getElementById('finished-list');

    if (finishedProducts.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="emoji">📦</div><p>Hali tayyor mahsulot yo&#39;q</p></div>';
        return;
    }

    var html = '';
    finishedProducts.forEach(function(f) {
        html += '<div class="finished-item">' +
            '<div>' +
                '<div class="fi-model">' + f.model + '</div>' +
                '<div class="fi-time">Arava #' + f.cart + ' · ' + f.time + '</div>' +
            '</div>' +
            '<div style="text-align:right;">' +
                '<div class="fi-qty">' + f.komplekt + ' komplekt</div>' +
                '<div class="fi-time">' + f.qty + ' dona' + (f.qoldiq > 0 ? ' (+' + f.qoldiq + ' qoldiq)' : '') + '</div>' +
            '</div>' +
        '</div>';
    });

    container.innerHTML = html;
}

// --- Helpers ---
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function(s) { s.style.display = 'none'; });
    document.getElementById(id).style.display = 'flex';
}

function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show';
    setTimeout(function() { t.className = 'toast'; }, 3000);
}

async function notifyBot(text) {
    try {
        var chatId = (tg.initDataUnsafe && tg.initDataUnsafe.user) ? tg.initDataUnsafe.user.id : '689230554';
        var url = 'https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage';
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
        });
    } catch (e) { console.error('Bot Error', e); }
}
