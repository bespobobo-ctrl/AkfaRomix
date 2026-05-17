import { supabase, checkAuth } from '../core/supabase.js';

let employees = [];
let html5QrScanner = null;
let currentEmp = null;

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // 🔐 ALLOW HR, ADMIN, AND EMPLOYEE
    const user = checkAuth(['hr', 'admin', 'employee']);
    if (!user) return;

    lucide.createIcons();
    await loadMiniData(user);

    // UI Setup
    document.getElementById('miniLogout').onclick = () => {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    };

    // Hide HR-only sections for employees
    if (user.role === 'employee') {
        const staffNav = document.getElementById('nav-staff');
        if (staffNav) staffNav.style.display = 'none';

        const barchasiLink = document.querySelector('.section-title a');
        if (barchasiLink) barchasiLink.style.display = 'none';
    }
});

async function loadMiniData(user) {
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

    // Fetch Employees
    let query = supabase.from('employees').select('*');

    // 🧠 IF ROLE IS EMPLOYEE, ONLY FETCH SELF
    if (user.role === 'employee') {
        query = query.eq('id', user.id);
    } else {
        query = query.order('full_name');
    }

    const { data: staff } = await query;
    employees = staff || [];

    // Fetch Attendance
    let attQuery = supabase.from('attendance').select('*').eq('date', todayStr);
    if (user.role === 'employee') {
        attQuery = attQuery.eq('employee_id', user.id);
    }

    const { data: att } = await attQuery;

    renderMiniStaff(employees, att || [], user.role);
    updateMiniStats(employees, att || [], user.role);
}

function updateMiniStats(staff, att, role) {
    if (role === 'employee') {
        const myAtt = att[0];
        document.getElementById('activeStaffCount').innerText = myAtt ? (myAtt.status === 'ISHDA' ? 'HA' : 'YO\'Q') : 'YO\'Q';
        document.getElementById('activeStaffCount').previousElementSibling.innerText = 'ISHDA';

        document.getElementById('todayArrived').innerText = myAtt && myAtt.check_in ? new Date(myAtt.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
        document.getElementById('todayArrived').previousElementSibling.innerText = 'KELGAN VAQT';
        return;
    }

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

function renderMiniStaff(staff, attendance, role) {
    const container = document.getElementById('miniStaffList');
    if (!staff.length) {
        container.innerHTML = '<p style="text-align:center; padding:20px; color:rgba(255,255,255,0.3)">Xodimlar yo\'q</p>';
        return;
    }

    if (role === 'employee') {
        const emp = staff[0];
        const attRec = attendance[0];
        const status = getSmartStatus(attRec);

        container.innerHTML = `
            <div class="staff-mini-card" style="flex-direction:column; padding:30px; gap:20px; text-align:center;" onclick="window.miniShowAction(employees[0])">
                <div style="position:relative; margin: 0 auto;">
                    <img src="${emp.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(emp.full_name)}" style="width:100px; height:100px; border-radius:30px; border:3px solid var(--accent);">
                    <div style="position:absolute; bottom:5px; right:5px; width:20px; height:20px; border-radius:50%; background:${status.color}; border:3px solid #05080c; box-shadow:0 0 10px ${status.color}"></div>
                </div>
                <div>
                    <h2 style="font-size:1.4rem; font-weight:900;">${emp.full_name}</h2>
                    <p style="color:var(--text-s); font-weight:700;">${emp.role || 'Xodim'}</p>
                </div>
                <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:20px; border:1px dashed var(--border); width:100%;">
                    <span style="font-size:0.7rem; color:var(--text-s); font-weight:800; letter-spacing:1px;">MENING STATUSIM</span>
                    <div style="color:${status.color}; font-size:1.2rem; font-weight:900; margin-top:5px;">${status.text}</div>
                </div>
                <button class="primary-btn" style="width:100%; height:60px; border-radius:20px; background:var(--accent); color:#000; font-weight:900; border:none;">
                    DAVOMATNI QAYD ETISH
                </button>
            </div>
        `;
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

    // 🧠 SMART STATE & TIME ANALYSIS
    const { data: att } = await supabase.from('attendance')
        .select('*')
        .eq('employee_id', emp.id)
        .eq('date', todayStr)
        .maybeSingle();

    const hours = now.getHours();
    const mins = now.getMinutes();
    const totalMins = hours * 60 + mins;

    let smartRecommendation = '';

    // Status Logic
    const hasCheckedIn = att && att.check_in;
    const hasLunchStarted = att && att.lunch_start;
    const hasLunchEnded = att && att.lunch_end;
    const hasCheckedOut = att && att.check_out;

    if (!hasCheckedIn) {
        smartRecommendation = 'in';
    } else if (hasCheckedIn && !hasLunchStarted) {
        // Suggest Lunch if it's afternoon, otherwise stay at Work
        if (totalMins >= 720) smartRecommendation = 'lunch_out';
        else smartRecommendation = 'none';
    } else if (hasLunchStarted && !hasLunchEnded) {
        smartRecommendation = 'lunch_in';
    } else if (hasCheckedIn && (hasLunchEnded || !hasLunchStarted) && !hasCheckedOut) {
        if (totalMins >= 1020) smartRecommendation = 'out'; // After 17:00
        else smartRecommendation = 'none';
    }

    const overlay = document.createElement('div');
    overlay.className = 'mini-modal-overlay';
    overlay.id = 'miniActionSheet';
    overlay.style.display = 'flex';

    const btnStyle = (type, color, isAccent = false) => `
        height:75px; 
        border-radius:22px; 
        font-weight:900; 
        font-size:1.1rem; 
        display:flex; 
        align-items:center; 
        justify-content:center; 
        gap:15px; 
        width:100%; 
        border:none; 
        transition:0.4s cubic-bezier(0.4, 0, 0.2, 1);
        background:${color};
        color: ${color.includes('rgba') || color.includes('#00') ? '#fff' : '#000'};
        ${smartRecommendation === type ? 'box-shadow: 0 0 25px ' + color + '55; transform:scale(1.02); border: 2px solid #fff;' : 'opacity:0.9; grayscale(1);'}
    `;

    let buttons = '';

    // 🟢 ARRIVAL
    if (!hasCheckedIn) {
        buttons += `
            <button onclick="window.miniProcessAttendance('in')" style="${btnStyle('in', 'var(--accent)')}">
                <i data-lucide="log-in" size="24"></i> ISHGA KELDI ${smartRecommendation === 'in' ? '✨' : ''}
            </button>
        `;
    }

    // 🟠 LUNCH SYSTEM
    if (hasCheckedIn && !hasLunchStarted && !hasCheckedOut) {
        buttons += `
            <button onclick="window.miniProcessAttendance('lunch_out')" style="${btnStyle('lunch_out', '#ffa940')}">
                <i data-lucide="coffee" size="24"></i> TUSHLIKKA KETDI ${smartRecommendation === 'lunch_out' ? '✨' : ''}
            </button>
        `;
    }

    if (hasLunchStarted && !hasLunchEnded && !hasCheckedOut) {
        buttons += `
            <button onclick="window.miniProcessAttendance('lunch_in')" style="${btnStyle('lunch_in', '#00d2ff')}">
                <i data-lucide="arrow-right-circle" size="24"></i> TUSHLIKDAN QAYTDI ${smartRecommendation === 'lunch_in' ? '✨' : ''}
            </button>
        `;
    }

    // 🔴 DEPARTURE
    if (hasCheckedIn && !hasCheckedOut && (hasLunchEnded || !hasLunchStarted)) {
        buttons += `
            <button onclick="window.miniProcessAttendance('out')" style="${btnStyle('out', '#ff4d4f')} ${buttons ? 'margin-top:10px;' : ''}">
                <i data-lucide="log-out" size="24"></i> ISHCHI KETDI ${smartRecommendation === 'out' ? '✨' : ''}
            </button>
        `;
    }

    if (hasCheckedOut) {
        buttons = `
            <div style="padding:25px; background:rgba(255,255,255,0.03); border-radius:20px; text-align:center; border:1px solid var(--border);">
                <i data-lucide="check-circle" size="48" style="color:var(--accent); margin-bottom:15px;"></i>
                <h3 style="font-size:1.1rem; font-weight:900;">BUGUNGI ISH YAKUNLANDI</h3>
                <p style="color:var(--text-s); font-size:0.8rem; margin-top:5px;">Xayrli dam oling!</p>
            </div>
        `;
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
