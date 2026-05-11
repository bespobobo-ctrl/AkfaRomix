import { supabase, checkAuth } from '../core/supabase.js';

let employees = [];
let html5QrScanner = null;
let currentEmp = null;

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    const user = checkAuth(['hr', 'admin']);
    if (!user) return;

    lucide.createIcons();
    await loadMiniData();

    // UI Setup
    document.getElementById('miniLogout').onclick = () => {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    };
});

async function loadMiniData() {
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

    // Fetch Employees
    const { data: staff } = await supabase.from('employees').select('*').order('full_name');
    employees = staff || [];

    // Fetch Attendance
    const { data: att } = await supabase.from('attendance').select('*').eq('date', todayStr);

    renderMiniStaff(employees, att || []);
    updateMiniStats(employees, att || []);
}

function updateMiniStats(staff, att) {
    const total = staff.length;
    // 🧠 SMART LATE COUNTER: Arrived after 08:00
    const lateCount = att.filter(a => {
        if (!a.check_in) return false;
        const time = new Date(a.check_in).getHours() * 60 + new Date(a.check_in).getMinutes();
        return time > 480; // 480 mins = 08:00
    }).length;

    document.getElementById('activeStaffCount').innerText = att.filter(a => a.status === 'ISHDA').length;
    document.getElementById('todayArrived').innerText = lateCount;
}

function getSmartStatus(att) {
    if (!att) return { text: 'KELMAGAN', color: '#ff4d4f', glow: 'rgba(255, 77, 79, 0.2)' };
    if (att.status === 'KETGAN') return { text: 'KETGAN', color: '#8a8f98', glow: 'transparent' };
    if (att.status === 'RUHSAT') return { text: 'RUHSAT', color: '#ffa940', glow: 'rgba(255, 169, 64, 0.2)' };

    if (!att.check_in) return { text: 'KELMAGAN', color: '#ff4d4f', glow: 'rgba(255, 77, 79, 0.2)' };

    return { text: 'ISHDA', color: '#00ff88', glow: 'rgba(0, 255, 136, 0.3)' };
}

function renderMiniStaff(staff, attendance) {
    const container = document.getElementById('miniStaffList');
    if (!staff.length) {
        container.innerHTML = '<p style="text-align:center; padding:20px; color:rgba(255,255,255,0.3)">Xodimlar yo\'q</p>';
        return;
    }

    container.innerHTML = staff.map(emp => {
        const attRec = attendance.find(a => a.employee_id === emp.id);
        const status = getSmartStatus(attRec);

        return `
            <div class="staff-mini-card" onclick="window.miniShowProfile('${emp.id}')">
                <div style="position:relative">
                    <img src="${emp.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(emp.full_name)}" class="avatar-mini">
                    <div style="position:absolute; bottom:0; right:0; width:12px; height:12px; border-radius:50%; background:${status.color}; border:2px solid #05080c; box-shadow:0 0 5px ${status.color}"></div>
                </div>
                <div class="info-mini">
                    <h4>${emp.full_name}</h4>
                    <p>${emp.role || 'Xodim'} • <span style="color:${status.color}; font-weight:900; font-size:0.65rem;">${status.text}</span></p>
                </div>
                <i data-lucide="chevron-right" style="margin-left:auto; width:16px; color:rgba(255,255,255,0.3)"></i>
            </div>
        `;
    }).join('');
    lucide.createIcons();
}

// 📷 MINI SCANNER ENGINE
window.openMiniScanner = function () {
    document.getElementById('scannerView').style.display = 'flex';
    if (html5QrScanner) html5QrScanner.stop();

    html5QrScanner = new Html5Qrcode("mobileReader");
    html5QrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onMiniScanSuccess
    ).catch(err => alert("Kamera xatosi: " + err));

    gsap.from("#scannerView", { opacity: 0, y: 50, duration: 0.4 });
};

window.closeMiniScanner = function () {
    if (html5QrScanner) {
        html5QrScanner.stop().then(() => {
            html5QrScanner = null;
            document.getElementById('scannerView').style.display = 'none';
        });
    } else {
        document.getElementById('scannerView').style.display = 'none';
    }
};

async function onMiniScanSuccess(text) {
    if (!text.startsWith('ROMIX-STAFF-')) return;

    const id = text.split('ROMIX-STAFF-')[1];
    const emp = employees.find(e => e.id === id);
    if (!emp) { alert("Xodim topilmadi"); return; }

    window.closeMiniScanner();
    window.miniShowAction(emp);
}

// 🎭 MINI UI ACTIONS (Bottom Sheet Style)
window.miniShowAction = async function (emp) {
    currentEmp = emp;
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

    // 🧠 SMART TIME DETECTION
    const hours = now.getHours();
    const mins = now.getMinutes();
    const totalMins = hours * 60 + mins;

    let smartRecommendation = '';
    // 07:45 (465) - 09:00 (540)
    if (totalMins >= 465 && totalMins <= 540) smartRecommendation = 'in';
    // 12:20 (740) - 13:00 (780)
    else if (totalMins >= 740 && totalMins <= 780) smartRecommendation = 'lunch_out';
    // 13:01 (781) - 14:00 (840)
    else if (totalMins > 780 && totalMins <= 840) smartRecommendation = 'lunch_in';
    // 17:45 (1065) - 18:45 (1125)
    else if (totalMins >= 1065 && totalMins <= 1125) smartRecommendation = 'out';

    // Joriy davomatni tekshirish
    const { data: att } = await supabase.from('attendance')
        .select('*')
        .eq('employee_id', emp.id)
        .eq('date', todayStr)
        .maybeSingle();

    const overlay = document.createElement('div');
    overlay.className = 'mini-modal-overlay';
    overlay.id = 'miniActionSheet';
    overlay.style.display = 'flex';

    let buttons = '';

    const btnStyle = (type) => {
        const isRec = smartRecommendation === type;
        return `height:70px; border-radius:24px; font-weight:900; font-size:1.1rem; display:flex; align-items:center; justify-content:center; gap:12px; width:100%; border:none; transition:0.3s; ${isRec ? 'transform: scale(1.05); outline: 3px solid var(--accent); outline-offset: 4px;' : 'opacity:0.8;'}`;
    };

    if (!att || !att.check_in) {
        buttons = `
            <button onclick="window.miniProcessAttendance('in')" style="${btnStyle('in')} background:var(--accent); color:#000;">
                <i data-lucide="log-in"></i> ISHGA KELDI ${smartRecommendation === 'in' ? '✨' : ''}
            </button>
        `;
    } else {
        // Tushlik holati
        const showLunchOut = !att.lunch_start;
        const showLunchIn = att.lunch_start && !att.lunch_end;
        const showWorkOut = att.status === 'ISHDA' || (att.lunch_end);

        if (showLunchOut) {
            buttons += `
                <button onclick="window.miniProcessAttendance('lunch_out')" style="${btnStyle('lunch_out')} background:#ffa940; color:#000;">
                    <i data-lucide="coffee"></i> TUSHLIKKA KETDI ${smartRecommendation === 'lunch_out' ? '✨' : ''}
                </button>
            `;
        }

        if (showLunchIn) {
            buttons += `
                <button onclick="window.miniProcessAttendance('lunch_in')" style="${btnStyle('lunch_in')} background:var(--accent); color:#000;">
                    <i data-lucide="utensils"></i> TUSHLIKDAN QAYTDI ${smartRecommendation === 'lunch_in' ? '✨' : ''}
                </button>
            `;
        }

        if (showWorkOut) {
            buttons += `
                <button onclick="window.miniProcessAttendance('out')" style="${btnStyle('out')} background:rgba(255,77,79,0.1); color:#ff4d4f; border:1px solid rgba(255,77,79,0.2); margin-top:15px;">
                    <i data-lucide="log-out"></i> ISHDAN KETDI ${smartRecommendation === 'out' ? '✨' : ''}
                </button>
            `;
        }
    }

    overlay.innerHTML = `
        <div class="mini-modal" id="miniModalContent">
            <div style="width:40px; height:5px; background:rgba(255,255,255,0.1); border-radius:10px; margin:0 auto 25px auto;"></div>
            
            ${smartRecommendation ? `
                <div style="background:rgba(0,255,136,0.1); padding:10px; border-radius:15px; margin-bottom:20px; text-align:center; border:1px dashed var(--accent);">
                    <span style="color:var(--accent); font-size:0.75rem; font-weight:900; letter-spacing:1px;">🚀 SMART TAVSIYA ANIQLANDI!</span>
                </div>
            ` : ''}

            <div style="text-align:center; margin-bottom:30px;">
                <img src="${emp.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(emp.full_name)}" style="width:80px; height:80px; border-radius:25px; margin-bottom:15px; border:2px solid var(--accent);">
                <h2 style="font-size:1.5rem; font-weight:900;">${emp.full_name}</h2>
                <p style="color:var(--text-s); font-size:0.8rem; margin-top:5px;">DAVOMATNI TANLANG</p>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:12px;">
                ${buttons}
                <button onclick="window.miniCloseAction()" style="height:60px; background:none; border:none; color:var(--text-s); font-weight:700; margin-top:10px;">BEKOR QILISH</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    lucide.createIcons();
    gsap.to("#miniModalContent", { y: 0, duration: 0.5, ease: "power4.out" });
};

window.miniCloseAction = function () {
    gsap.to("#miniModalContent", {
        y: "100%", duration: 0.4, onComplete: () => {
            document.getElementById('miniActionSheet').remove();
        }
    });
};

window.miniProcessAttendance = async function (type) {
    const emp = currentEmp;
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const nowIso = now.toISOString();

    // Avvalgi yozuvni tekshirish
    const { data: existing } = await supabase.from('attendance')
        .select('id')
        .eq('employee_id', emp.id)
        .eq('date', todayStr)
        .maybeSingle();

    let payload = {
        employee_id: emp.id,
        date: todayStr
    };

    if (existing) payload.id = existing.id;

    if (type === 'in') {
        payload.check_in = nowIso;
        payload.status = 'ISHDA';
    } else if (type === 'out') {
        payload.check_out = nowIso;
        payload.status = 'KETGAN';
    } else if (type === 'lunch_out') {
        payload.lunch_start = nowIso;
    } else if (type === 'lunch_in') {
        payload.lunch_end = nowIso;
    }

    const { error } = await supabase.from('attendance').upsert(payload);

    if (!error) {
        window.miniCloseAction();
        await loadMiniData();
    } else {
        alert("Xatolik: " + error.message);
    }
};

window.miniShowProfile = function (id) {
    const emp = employees.find(e => e.id === id);
    if (emp) alert(`${emp.full_name}\n${emp.role}\n${emp.phone}`);
};
