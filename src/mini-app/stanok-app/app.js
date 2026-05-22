const supabaseUrl = 'https://dzsswblbpnjuluyqvewt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const BOT_TOKEN = '8876482426:AAFIMJCPYrxi-xVQwVDtURhl_BcDDSg6htA';

// --- State ---
let currentUser = null;
let isShiftActive = false;
let shiftStartTime = null;
let currentCount = 0;
let timerInterval = null;

// --- DOM Elements ---
const screens = {
    login: document.getElementById('login-screen'),
    dashboard: document.getElementById('dashboard-screen')
};

const tg = window.Telegram.WebApp;
tg.expand();

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    // Check local storage for session
    const saved = localStorage.getItem('op_session');
    if (saved) {
        currentUser = JSON.parse(saved);
        showScreen('dashboard');
        initDashboard();
    }
});

// --- Auth ---
document.getElementById('login-btn').addEventListener('click', async () => {
    const id = document.getElementById('login-id').value;
    const pass = document.getElementById('login-pass').value;

    // Manual check for now (Can be linked to clapak_staff table)
    if ((id === '7007' && pass === '1234') || (id === '8008' && pass === '1234')) {
        currentUser = {
            id: id,
            name: id === '7007' ? 'Jaloliddin R.' : 'Sardorbek M.',
            machine: 'ST-1'
        };
        localStorage.setItem('op_session', JSON.stringify(currentUser));
        showScreen('dashboard');
        initDashboard();
        notifyBot(`🚀 Operator ${currentUser.name} tizimga kirdi.`);
    } else {
        alert('Login yoki parol xato!');
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('op_session');
    location.reload();
});

// --- Dashboard Logic ---
function initDashboard() {
    document.getElementById('op-name').textContent = currentUser.name;
    document.getElementById('op-avatar').textContent = currentUser.name[0];

    // Selectors
    document.querySelectorAll('.option').forEach(opt => {
        opt.onclick = () => {
            document.querySelectorAll('.option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
        };
    });

    document.querySelectorAll('.model-item').forEach(opt => {
        opt.onclick = () => {
            document.querySelectorAll('.model-item').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
        };
    });

    // Counter
    document.querySelectorAll('.count-btn[data-add]').forEach(btn => {
        btn.onclick = () => {
            if (!isShiftActive) {
                alert('Avval smenani boshlang!');
                return;
            }
            const add = parseInt(btn.getAttribute('data-add'));
            currentCount += add;
            updateUI();
            saveToSupabase();
        };
    });

    document.getElementById('count-reset').onclick = () => {
        if (confirm('Hisoblagichni nollashni xohlaysizmi?')) {
            currentCount = 0;
            updateUI();
        }
    };

    // Shift Toggle
    const toggleBtn = document.getElementById('shift-toggle-btn');
    toggleBtn.onclick = () => {
        if (!isShiftActive) {
            startShift();
        } else {
            stopShift();
        }
    };
}

function startShift() {
    isShiftActive = true;
    shiftStartTime = new Date();
    const toggleBtn = document.getElementById('shift-toggle-btn');
    toggleBtn.textContent = 'SMENANI YAKUNLASH';
    toggleBtn.className = 'action-btn stop';

    document.getElementById('shift-status').className = 'status-widget active';
    document.getElementById('status-text').textContent = 'STANOK ISHLAMOQDA';

    timerInterval = setInterval(updateTimer, 1000);

    const machine = document.querySelector('.option.active').getAttribute('data-val');
    const model = document.querySelector('.model-item.active').getAttribute('data-val');

    notifyBot(`✅ Smena boshlandi!\n👤 Operator: ${currentUser.name}\n⚙️ Stanok: ${machine}\n📦 Model: ${model}\n⏰ Vaqt: ${shiftStartTime.toLocaleTimeString()}`);
    showToast('Smena boshlandi! Kuch-quvvat tilingiz!');
}

function stopShift() {
    if (!confirm('Smenani yakunlashni tasdiqlaysizmi?')) return;

    isShiftActive = false;
    clearInterval(timerInterval);

    const toggleBtn = document.getElementById('shift-toggle-btn');
    toggleBtn.textContent = 'SMENANI BOSHLASH';
    toggleBtn.className = 'action-btn start';

    document.getElementById('shift-status').className = 'status-widget inactive';
    document.getElementById('status-text').textContent = 'SMENA YAKUNLANDI';

    notifyBot(`🏁 Smena yakunlandi!\n👤 Operator: ${currentUser.name}\n📊 Natija: ${currentCount} dona\n⏱ Ish vaqti: ${document.getElementById('shift-timer').textContent}`);
    showToast('Smena yakunlandi. Rahmat!');
}

function updateTimer() {
    const now = new Date();
    const diff = now - shiftStartTime;
    const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
    document.getElementById('shift-timer').textContent = `${h}:${m}:${s}`;
}

function updateUI() {
    document.getElementById('count-val').textContent = currentCount;
}

async function saveToSupabase() {
    // Here we would update the clapak_production table
    console.log("Saving to Supabase:", currentCount);
}

function showScreen(id) {
    Object.values(screens).forEach(s => s.style.display = 'none');
    screens[id].style.display = 'flex';
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show';
    setTimeout(() => t.className = 'toast', 3000);
}

async function notifyBot(text) {
    try {
        // Telegram ichida ochilganda foydalanuvchi ID-sini olamiz
        let chatId = tg.initDataUnsafe?.user?.id;

        // Agar brauzerda test qilinayotgan bo'lsa va chatId yo'q bo'lsa
        if (!chatId) {
            console.warn("Telegram WebApp ma'lumotlari topilmadi. Brauzerda test rejimida.");
            // Bu yerda siz o'z Chat ID-ingizni qo'lda kiritib test qilishingiz mumkin
            chatId = localStorage.getItem('test_chat_id') || '689230554';
        }

        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });

        const result = await response.json();
        if (!result.ok) {
            console.error("Bot Error Response:", result);
            if (result.description.includes("chat not found")) {
                alert("Bot xabar yubora olmadi. Iltimos, Telegram botga kirib /start tugmasini bosing!");
            }
        } else {
            console.log("Bot Message Sent ✅");
        }
    } catch (e) {
        console.error("Bot Connection Error:", e);
    }
}
