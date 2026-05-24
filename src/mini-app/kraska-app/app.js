const supabaseUrl = 'https://dzsswblbpnjuluyqvewt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const BOT_TOKEN = '8876482426:AAFIMJCPYrxi-xVQwVDtURhl_BcDDSg6htA';

// --- State ---
let currentUser = null;
let activeCart = null;
let paintStartTime = null;
let timerInterval = null;
let brakCount = 0;
let pollingInterval = null;

const tg = window.Telegram.WebApp;
if (tg) {
    tg.expand();
    tg.setHeaderColor('#0d121a');
}

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
        if ((id.toLowerCase() === 'kraska1' && pass === '123') || (id.toLowerCase() === 'kraska2' && pass === '123')) {
            currentUser = {
                id: id.toLowerCase() === 'kraska1' ? 'K1' : 'K2',
                username: id,
                role: 'kraska',
                name: id.toLowerCase() === 'kraska1' ? 'Rassom 1' : 'Rassom 2'
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
        location.href = '../stanok-app/index.html';
    }
};

// --- Dashboard flow ---
function initDashboard() {
    document.getElementById('active-operator').textContent = currentUser.name;
    
    // Fetch cooling carts immediately and set interval
    fetchCoolingCarts();
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(fetchCoolingCarts, 5000);
}

async function fetchCoolingCarts() {
    try {
        const { data, error } = await supabaseClient
            .from('clapak_production')
            .select('*')
            .eq('status', 'DONE')
            .like('stage', 'sovutish-%')
            .order('last_update', { ascending: false });

        if (error) throw error;

        renderCoolingCarts(data || []);
    } catch (e) {
        console.error('Error fetching cooling carts:', e);
    }
}

function renderCoolingCarts(carts) {
    const list = document.getElementById('cooling-carts-list');
    if (!list) return;

    if (carts.length === 0) {
        list.innerHTML = `<div class="empty-state">SOVUTISH XONASI BO'SH... ❄️</div>`;
        return;
    }

    list.innerHTML = carts.map(c => {
        const cartNum = c.stage.split('-')[1] || '0';
        const formattedTime = c.end_time 
            ? new Date(c.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '--:--';
        return `
            <div class="cart-card-item">
                <div class="cart-card-info">
                    <span class="cart-card-tag">ARAVA #${cartNum}</span>
                    <span class="cart-card-model">${c.model}</span>
                    <span class="cart-card-qty">🔢 Miqdor: <strong>${c.quantity} dona</strong></span>
                    <span class="cart-card-qty" style="font-size: 0.65rem;">🕒 Kelgan vaqti: ${formattedTime}</span>
                </div>
                <button onclick="window.startPainting('${c.id}')" class="btn-card-action">BO'YASHGA OLISH ➜</button>
            </div>
        `;
    }).join('');
}

// --- Painting Mode ---
window.startPainting = async (cartId) => {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }

    const { data: cart, error } = await supabaseClient
        .from('clapak_production')
        .select('*')
        .eq('id', cartId)
        .maybeSingle();

    if (error || !cart) {
        alert('Aravacha ma\'lumoti yuklanmadi!');
        initDashboard();
        return;
    }

    activeCart = cart;
    brakCount = 0;
    paintStartTime = new Date();

    const cartNum = activeCart.stage.split('-')[1] || '0';
    document.getElementById('paint-cart-title').textContent = `ARAVA #${cartNum}`;
    document.getElementById('paint-model-title').textContent = activeCart.model;
    document.getElementById('paint-qty-val').innerHTML = `${activeCart.quantity} <small style="font-size: 1rem; color: rgba(255,255,255,0.4);">dona karkas</small>`;
    document.getElementById('brak-count-val').textContent = '0';

    // Update Stage in Supabase to kraska-X
    try {
        await supabaseClient
            .from('clapak_production')
            .update({
                stage: 'kraska-' + cartNum,
                last_update: paintStartTime.toISOString()
            })
            .eq('id', activeCart.id);
            
        // Notify Bot
        notifyBot(`🎨 <b>BO'YASH BOSHLANDI</b>\n\n👤 Rassom: ${currentUser.name}\n📟 Arava: ARAVA #${cartNum}\n📦 Model: ${activeCart.model}\n⏰ Boshlangan vaqt: ${paintStartTime.toLocaleTimeString()}`);
    } catch (e) {
        console.error('Error updating stage to kraska:', e);
    }

    showScreen('painting-screen');
    
    // Start Paint Timer
    document.getElementById('paint-timer').textContent = '00:00';
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updatePaintTimer, 1000);
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

    // Populate Passport Modal
    document.getElementById('pass-cart-num').textContent = `ARAVA #${cartNum}`;
    document.getElementById('pass-model').textContent = activeCart.model;
    document.getElementById('pass-qty').textContent = `${activeCart.quantity} dona`;
    document.getElementById('pass-brak').textContent = `${brakCount} dona`;
    document.getElementById('pass-duration').textContent = durationStr;
    document.getElementById('pass-time').textContent = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('pass-id').textContent = '#' + passportId;

    document.getElementById('passport-modal').style.display = 'flex';
};

document.getElementById('sushilka-transmit-btn').onclick = async () => {
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
        const newQuantity = Math.max(0, (activeCart.quantity || 36) - brakCount);

        // Update database: stage -> sushilka-X, update brak, quantity, save end_time
        const { error } = await supabaseClient
            .from('clapak_production')
            .update({
                stage: 'sushilka-' + cartNum,
                quantity: newQuantity, // Subtract defects from active quantity!
                brak: totalBrak,
                last_update: endTime.toISOString()
            })
            .eq('id', activeCart.id);

        if (error) throw error;

        // Send beautiful Telegram Bot passport notification
        await notifyBot(
            `🎫 <b>ARAVA PASPORTI (SUSHILKAGA YO'LLANDI)</b>\n\n` +
            `📟 <b>Arava raqami:</b> ARAVA #${cartNum}\n` +
            `📦 <b>Mahsulot modeli:</b> ${activeCart.model}\n` +
            `✅ <b>Tayyor karkas:</b> ${newQuantity} dona (Brak chegirildi)\n` +
            `🚨 <b>Bo'yashdagi nuqson (brak):</b> ${brakCount} dona (Jami: ${totalBrak} ta)\n` +
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
