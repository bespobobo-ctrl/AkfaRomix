// ═══════════════════════════════════════════════════════════════
//  📦 QADOQLASH BO'LIMI — APP LOGIC
// ═══════════════════════════════════════════════════════════════

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://dzsswblbpnjuluyqvewt.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN_OPERATOR || "8876482426:AAFIMJCPYrxi-xVQwVDtURhl_BcDDSg6htA";

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
        if (id.toUpperCase().replace(/\s+/g, '') === 'Q1' && pass.replace(/\s+/g, '') === '123') {
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

let isFetchingCarts = false;

// --- Logout ---
window.qLogout = () => {
    if (confirm('Tizimdan chiqishni tasdiqlaysizmi?')) {
        localStorage.removeItem('qadoqlash_session');
        clearTimeout(pollingInterval);
        location.href = '../stanok-app/index.html';
    }
};

// --- Dashboard ---
function initDashboard() {
    document.getElementById('user-name').textContent = currentUser.name;
    loadSushilkaCarts();
}

async function loadSushilkaCarts() {
    if (isFetchingCarts) return;
    isFetchingCarts = true;
    try {
        const today = new Date().toISOString().split('T')[0];
        const startOfDay = today + 'T00:00:00.000Z';
        const endOfDay = today + 'T23:59:59.999Z';

        // Get carts in all intermediate stages (ready for packaging) or currently being packaged
        const { data: carts, error } = await supabaseClient
            .from('clapak_production')
            .select('id, stage, model, quantity, start_time, end_time, status, last_update, operator, brak')
            .or('stage.like.sovutish-%,stage.like.sushilka-%,stage.like.packaging-%,stage.like.cooling-%,stage.like.halqa-%,stage.like.ready_timer-%')
            .not('status', 'eq', 'DONE_WAREHOUSE')
            .order('end_time', { ascending: true });

        if (error) throw error;

        // Perform auto-transitions on load/poll for expired timers
        let hasChanges = false;
        if (carts) {
            for (const c of carts) {
                const stageParts = c.stage ? c.stage.split('-') : [];
                const cartNum = stageParts[1];
                if (c.stage.startsWith('cooling-') && cartNum) {
                    const elapsedMin = c.last_update ? Math.floor((Date.now() - new Date(c.last_update).getTime()) / 60000) : 0;
                    if (elapsedMin >= 60) {
                        await supabaseClient.from('clapak_production')
                            .update({ stage: 'halqa-' + cartNum, last_update: new Date().toISOString() })
                            .eq('id', c.id);
                        hasChanges = true;
                    }
                } else if (c.stage.startsWith('ready_timer-') && cartNum) {
                    const elapsedMin = c.last_update ? Math.floor((Date.now() - new Date(c.last_update).getTime()) / 60000) : 0;
                    if (elapsedMin >= 60) {
                        await supabaseClient.from('clapak_production')
                            .update({ stage: 'packaging-' + cartNum + '-0', status: 'PACKAGING', last_update: new Date().toISOString() })
                            .eq('id', c.id);
                        hasChanges = true;
                    }
                }
            }
        }

        if (hasChanges) {
            isFetchingCarts = false;
            loadSushilkaCarts();
            return;
        }

        // Get packaged items for today stats
        const { data: packed } = await supabaseClient
            .from('clapak_production')
            .select('stage, quantity')
            .or('stage.eq.finished,stage.eq.warehouse_pending,stage.like.packaging-%,stage.like.warehouse_pending-%')
            .gte('last_update', startOfDay)
            .lte('last_update', endOfDay);

        let totalPackedBoxes = 0;
        (packed || []).forEach(item => {
            if (item.stage === 'finished' || item.stage.startsWith('warehouse_pending')) {
                totalPackedBoxes += Math.floor((item.quantity || 0) / 4);
            } else if (item.stage.startsWith('packaging-')) {
                const parts = item.stage.split('-');
                const boxes = parseInt(parts[2] || '0');
                totalPackedBoxes += boxes;
            }
        });
        packedToday = totalPackedBoxes * 4;

        renderCarts(carts || []);
        updateStats(carts || []);
    } catch (e) {
        console.error('Load error:', e);
    } finally {
        isFetchingCarts = false;
        if (currentUser) {
            pollingInterval = setTimeout(loadSushilkaCarts, 10000);
        }
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
        var stageParts = c.stage ? c.stage.split('-') : [];
        var cartNum = stageParts[1] || '?';
        var packedBoxes = parseInt(stageParts[2] || '0');
        var model = c.model || "Noma'lum";
        var qty = c.quantity || 0;
        var remainingQty = Math.max(0, qty - (packedBoxes * 4));
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

        // Determine rendering and actions based on stages
        var elapsedMin = c.last_update ? Math.floor((Date.now() - new Date(c.last_update).getTime()) / 60000) : 0;
        var isPackaging = c.stage && c.stage.startsWith('packaging');

        var statusClass = 'waiting';
        var statusText = 'KUTILMOQDA';
        var timeDetailLabel = 'Sushilkada:';
        var timeDetailVal = duration;
        var buttonHtml = '';

        if (c.stage.startsWith('sushilka-')) {
            const leftMin = Math.max(0, 240 - elapsedMin);
            statusClass = 'waiting';
            statusText = 'QURITILMOQDA ☀️';
            timeDetailLabel = 'Quritilmoqda:';
            timeDetailVal = leftMin + ' daqiqa qoldi';
            buttonHtml = '<button class="btn-pack" disabled>⏳ QURITILMOQDA (' + leftMin + ' min qoldi)...</button>';
        } else if (c.stage.startsWith('cooling-')) {
            const leftMin = Math.max(0, 60 - elapsedMin);
            statusClass = 'waiting';
            statusText = 'SOVUTILMOQDA ❄️';
            timeDetailLabel = 'Sovutilmoqda:';
            timeDetailVal = leftMin + ' daqiqa qoldi';
            buttonHtml = '<button class="btn-pack" disabled>⏳ SOVUTILMOQDA (' + leftMin + ' min qoldi)...</button>';
        } else if (c.stage.startsWith('halqa-')) {
            statusClass = 'ready';
            statusText = 'HALQA QO\'YISH ⚙️';
            timeDetailLabel = 'Holati:';
            timeDetailVal = 'Halqa qo\'yish kutilmoqda';
            buttonHtml = '<button class="btn-pack" style="background: linear-gradient(135deg, #ba00ff, #7f00ff); color: #fff; font-weight:900;" onclick="window.confirmHalqa(\'' + c.id + '\', ' + cartNum + ', \'' + model.replace(/'/g, "\\'") + '\')">⚙️ TEMIR HALQALAR QO\'YILDI</button>';
        } else if (c.stage.startsWith('ready_timer-')) {
            const leftMin = Math.max(0, 60 - elapsedMin);
            statusClass = 'waiting';
            statusText = 'TAYYORLANMOQDA ⏳';
            timeDetailLabel = 'Tayyorlanmoqda:';
            timeDetailVal = leftMin + ' daqiqa qoldi';
            buttonHtml = '<button class="btn-pack" disabled>⏳ TAYYORLANMOQDA (' + leftMin + ' min qoldi)...</button>';
        } else if (isPackaging) {
            statusClass = 'ready';
            statusText = 'FAOL QADOQLANMOQDA';
            timeDetailLabel = 'Qadoqlandi:';
            timeDetailVal = packedBoxes + ' quti';
            buttonHtml = '<button class="btn-pack" style="background: linear-gradient(135deg, #00e676, #00b359);" ' +
                'onclick="window.addKomplekt(\'' + c.id + '\', ' + cartNum + ', \'' + model.replace(/'/g, "\\'") + '\', ' + remainingQty + ', ' + packedBoxes + ', \'' + (c.last_update || '') + '\')">' +
                '📦 +1 KOMPLEKT QADOQLANDI (4 dona)' +
                '</button>';
        } else {
            statusClass = 'waiting';
            statusText = 'KUTILMOQDA';
            buttonHtml = '<button class="btn-pack" disabled>⏳ KUTILMOQDA...</button>';
        }

        html += '<div class="cart-item ' + statusClass + '" ' + (isPackaging ? 'style="border: 2px solid var(--accent);"' : '') + '>' +
            '<div class="cart-header">' +
                '<div class="cart-name">🛒 ARAVA #' + cartNum + ' — ' + model + '</div>' +
                '<span class="cart-badge ' + statusClass + '">' + statusText + '</span>' +
            '</div>' +
            '<div class="cart-details">' +
                '<div class="cart-detail">Miqdor qoldi: <span>' + remainingQty + ' ta</span></div>' +
                '<div class="cart-detail">Brak: <span style="color:var(--danger);">' + brak + ' ta</span></div>' +
                '<div class="cart-detail">Operator: <span>' + operator + '</span></div>' +
                '<div class="cart-detail">' + timeDetailLabel + ' <span style="color:var(--warning);">' + timeDetailVal + '</span></div>' +
            '</div>' +
            buttonHtml +
            '</div>';
    });

    container.innerHTML = html;
}

window.confirmHalqa = async function(id, cartNum, model) {
    if (!confirm('Arava #' + cartNum + ' uchun temir halqalar qo\'yilganini tasdiqlaysizmi?\n\nKeyin 60 daqiqalik tayyor bo\'lish taymeri boshlanadi.')) return;

    try {
        const { error } = await supabaseClient
            .from('clapak_production')
            .update({
                stage: 'ready_timer-' + cartNum,
                last_update: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        showToast('Arava #' + cartNum + ' halqalari tasdiqlandi. 60 daqiqalik tayyor bo\'lish bosqichi boshlandi! ⏳');
        
        notifyBot(
            `⚙️ <b>TEMIR HALQALAR QO'YILDI</b>\n\n` +
            `🛒 Arava: #${cartNum}\n` +
            `📦 Model: ${model}\n` +
            `👤 Operator: ${currentUser.name}\n` +
            `⏱ <b>Tayyor bo'lish jarayoni boshlandi.</b> (60 daqiqa)`
        ).then();

        loadSushilkaCarts();

    } catch (e) {
        alert('Xatolik: ' + e.message);
    }
};

function updateStats(carts) {
    document.getElementById('stat-waiting').textContent = carts.length;
    document.getElementById('stat-packed').textContent = packedToday;
    var komplekt = Math.floor(packedToday / 4);
    document.getElementById('stat-komplekt').textContent = komplekt;
}



window.addKomplekt = async function(id, cartNum, model, remainingQty, packedBoxes, startTimeStr) {
    // Prevent packing more than available
    if (remainingQty < 4 && remainingQty > 0) {
        if(!confirm(`Aravada faqat ${remainingQty} ta qoldi. Shuni bitta chala quti qilib yopib, aravani tugatasizmi?`)) return;
    } else if (remainingQty <= 0) {
        alert('Aravada mahsulot qolmadi!');
        return;
    }

    const qtyToPack = Math.min(4, remainingQty);
    const newRemaining = remainingQty - qtyToPack;
    const newPacked = (packedBoxes || 0) + 1;
    const now = new Date();
    
    // Check if cart is empty after this pack
    const isFinished = newRemaining <= 0;
    const newStage = isFinished ? 'warehouse_pending' : `packaging-${cartNum}-${newPacked}`;
    const newStatus = isFinished ? 'DONE_PACKAGING' : 'PACKAGING';

    try {
        var { error } = await supabaseClient
            .from('clapak_production')
            .update({
                stage: newStage,
                status: newStatus,
                last_update: now.toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        // Log the time taken for this komplekt
        const timeDiffStr = startTimeStr ? Math.floor((now - new Date(startTimeStr)) / 1000) + ' soniya' : '';
        showToast(`+1 Komplekt qadoqlandi! ${timeDiffStr ? '(' + timeDiffStr + ')' : ''}`);
        
        if (isFinished) {
            alert(`Arava #${cartNum} to'liq qadoqlanib bo'ldi va tayyor mahsulot omboriga yuborildi!`);
            
            // Log to finished products locally for UI
            finishedProducts.unshift({
                model: model,
                qty: (newPacked * 4) + newRemaining, // Original qty approx
                komplekt: newPacked,
                qoldiq: 0,
                cart: cartNum,
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            renderFinished();
            packedToday += (newPacked * 4);
            
            notifyBot('📦 <b>ARAVA QADOQLANIB BO\'LDI</b>\n\n' +
                '👤 ' + currentUser.name + '\n' +
                '🛒 Arava: #' + cartNum + '\n' +
                '📦 Model: ' + model + '\n' +
                '📊 Jami qutilar: ' + newPacked + ' ta');
        }

        loadSushilkaCarts();

    } catch (e) {
        alert('Xatolik: ' + e.message);
    }
};



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
