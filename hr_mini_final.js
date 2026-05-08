import { supabase, checkAuth } from './supabase.js?v=mini';

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
    const todayStr = new Date().toISOString().split('T')[0];

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

    const checkTime = new Date(att.check_in);
    const mins = checkTime.getHours() * 60 + checkTime.getMinutes();

    if (mins <= 480) return { text: 'VAQTIDA', color: '#00ff88', glow: 'rgba(0, 255, 136, 0.3)' }; // 08:00
    if (mins <= 495) return { text: 'KECHIKISH', color: '#ffec3d', glow: 'rgba(255, 236, 61, 0.2)' }; // 08:15
    if (mins <= 510) return { text: 'KECH QOLDI', color: '#ff7875', glow: 'rgba(255, 120, 117, 0.2)' }; // 08:30
    return { text: 'JUDA KECH', color: '#820014', glow: 'rgba(130, 0, 20, 0.3)' }; // > 08:30
}

function renderMiniStaff(staff, attendance) {
    const container = document.getElementById('miniStaffList');
    if (!staff.length) {
        container.innerHTML = '<p style="text-align:center; padding:20px; color:rgba(255,255,255,0.3)">Xodimlar yo\'q</p>';
        return;
    }

    container.innerHTML = staff.map(emp => {
        const attRec = attendance.find(a => a.id === emp.id);
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
window.miniShowAction = function (emp) {
    currentEmp = emp;
    const overlay = document.createElement('div');
    overlay.className = 'mini-modal-overlay';
    overlay.id = 'miniActionSheet';
    overlay.style.display = 'flex';

    overlay.innerHTML = `
        <div class="mini-modal" id="miniModalContent">
            <div style="width:40px; height:5px; background:rgba(255,255,255,0.1); border-radius:10px; margin:0 auto 25px auto;"></div>
            <div style="text-align:center; margin-bottom:30px;">
                <img src="${emp.avatar_url}" style="width:80px; height:80px; border-radius:25px; margin-bottom:15px; border:2px solid var(--accent);">
                <h2 style="font-size:1.5rem; font-weight:900;">${emp.full_name}</h2>
                <p style="color:var(--text-s); font-size:0.8rem; margin-top:5px;">DAVOMATNI BELGILANG</p>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr; gap:15px;">
                <button onclick="window.miniProcessAttendance('in')" style="height:70px; background:var(--accent); color:#000; border:none; border-radius:24px; font-weight:900; font-size:1.1rem; display:flex; align-items:center; justify-content:center; gap:12px;">
                    <i data-lucide="log-in"></i> ISHGA KELDI
                </button>
                <button onclick="window.miniProcessAttendance('out')" style="height:70px; background:rgba(255,77,79,0.1); color:#ff4d4f; border:1px solid rgba(255,77,79,0.2); border-radius:24px; font-weight:900; font-size:1.1rem; display:flex; align-items:center; justify-content:center; gap:12px;">
                    <i data-lucide="log-out"></i> ISHdan KETDI
                </button>
                <button onclick="window.miniCloseAction()" style="height:60px; background:none; border:none; color:var(--text-s); font-weight:700;">BEKOR QILISH</button>
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
    const todayStr = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    const payload = {
        id: emp.id,
        date: todayStr
    };

    if (type === 'in') {
        payload.check_in = nowIso;
        payload.status = 'ISHDA';
    } else {
        payload.check_out = nowIso;
        payload.status = 'KETGAN';
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
