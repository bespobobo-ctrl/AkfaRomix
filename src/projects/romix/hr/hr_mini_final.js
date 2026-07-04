import { supabase, checkAuth } from '@/core/supabase.js';

let employees = [];
let html5QrScanner = null;
let currentEmp = null;

const defaultEmployees = [
    { id: "emp-1", full_name: "Sharifi Miad", first_name: "Sharifi", last_name: "Miad", role: "Ofis", salary_info: "7000000", salary: 7000000, department: "Ofis", dept: "Ofis", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-2", full_name: "Mullajonov Xurshid", first_name: "Mullajonov", last_name: "Xurshid", role: "Brigadir", salary_info: "12000000", salary: 12000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-3", full_name: "Atbaev Temirxon", first_name: "Atbaev", last_name: "Temirxon", role: "Zamershik", salary_info: "6000000", salary: 6000000, department: "Sotuv", dept: "Sotuv", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-4", full_name: "Abdullaev Axror", first_name: "Abdullaev", last_name: "Axror", role: "Omborchi", salary_info: "8000000", salary: 8000000, department: "Ombor", dept: "Ombor", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-5", full_name: "Nematov Ziyovuddin", first_name: "Nematov", last_name: "Ziyovuddin", role: "Ishchi", salary_info: "7000000", salary: 7000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-6", full_name: "Shorasul", first_name: "Shorasul", last_name: "", role: "Ustanovshik", salary_info: "8000000", salary: 8000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-7", full_name: "Ulugbek", first_name: "Ulugbek", last_name: "", role: "Sborshik", salary_info: "6000000", salary: 6000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-8", full_name: "Usanov Shuxrat", first_name: "Usanov", last_name: "Shuxrat", role: "Qorovul", salary_info: "2500000", salary: 2500000, department: "Xo'jalik", dept: "Xo'jalik", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-9", full_name: "Akramov Zaynabiddin", first_name: "Akramov", last_name: "Zaynabiddin", role: "Qorovul", salary_info: "2500000", salary: 2500000, department: "Xo'jalik", dept: "Xo'jalik", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-10", full_name: "Najmiddinov Azimxon", first_name: "Najmiddinov", last_name: "Azimxon", role: "Ishchi", salary_info: "0", salary: 0, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-11", full_name: "Najmiddinov Akobir", first_name: "Najmiddinov", last_name: "Akobir", role: "Ishchi", salary_info: "6000000", salary: 6000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-12", full_name: "Rasulov Lutfullo", first_name: "Rasulov", last_name: "Lutfullo", role: "Ishchi", salary_info: "0", salary: 0, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-13", full_name: "Kodirov Shoxrux", first_name: "Kodirov", last_name: "Shoxrux", role: "Menejer", salary_info: "11000000", salary: 11000000, department: "Sotuv", dept: "Sotuv", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-14", full_name: "Ergashev Otabek", first_name: "Ergashev", last_name: "Otabek", role: "Hisobchi", salary_info: "9000000", salary: 9000000, department: "Ofis", dept: "Ofis", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-15", full_name: "Aitbaev Nurlan", first_name: "Aitbaev", last_name: "Nurlan", role: "Zamershik", salary_info: "8500000", salary: 8500000, department: "Sotuv", dept: "Sotuv", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-16", full_name: "Rajapov Xasan", first_name: "Rajapov", last_name: "Xasan", role: "Usta", salary_info: "12000000", salary: 12000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-17", full_name: "Xakimov Mels (Olloyor)", first_name: "Xakimov", last_name: "Mels", role: "Usta", salary_info: "8000000", salary: 8000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-18", full_name: "Eshtoev Jaxongir", first_name: "Eshtoev", last_name: "Jaxongir", role: "Usta", salary_info: "12000000", salary: 12000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-19", full_name: "Otabek Ustanovshik", first_name: "Otabek", last_name: "Ustanovshik", role: "Usta", salary_info: "8500000", salary: 8500000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-20", full_name: "Mirazizov Sunnat", first_name: "Mirazizov", last_name: "Sunnat", role: "Brigadir", salary_info: "9000000", salary: 9000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-21", full_name: "Muminkulov Jasur", first_name: "Muminkulov", last_name: "Jasur", role: "Ishchi", salary_info: "10000000", salary: 10000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" },
    { id: "emp-22", full_name: "Shavkatov Jaxongir", first_name: "Shavkatov", last_name: "Jaxongir", role: "Ustanovshik brigadir", salary_info: "8000000", salary: 8000000, department: "Ustalar", dept: "Ustalar", phone: "", avatar_url: "", photo_url: "" }
];

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
    let staff = [];
    try {
        let query = supabase.from('employees').select('*');
        if (user.role === 'employee') {
            query = query.eq('id', user.id);
        } else {
            query = query.order('full_name');
        }
        const res = await query;
        if (res.error) throw res.error;
        staff = res.data || [];
    } catch(err) {
        console.warn("Supabase loadMiniData fetch failed, using local storage:", err);
        const localRaw = localStorage.getItem('romix_employees_local');
        if (localRaw) {
            staff = JSON.parse(localRaw);
        } else {
            staff = defaultEmployees;
            localStorage.setItem('romix_employees_local', JSON.stringify(staff));
        }
        if (user.role === 'employee') {
            staff = staff.filter(x => x.id === user.id);
            if (staff.length === 0) {
                staff = [{ id: user.id, full_name: user.full_name || 'Xodim', role: 'employee', avatar_url: '' }];
            }
        }
    }
    employees = staff;

    // Fetch Attendance (Current Month)
    const monthStart = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';
    let att = [];
    try {
        let attQuery = supabase.from('attendance')
            .select('*')
            .eq('employee_id', user.role === 'employee' ? user.id : 'all') // Just a placeholder if not employee
            .gte('date', monthStart);

        if (user.role !== 'employee') {
            // For HR, just fetch today's attendance for list
            attQuery = supabase.from('attendance').select('*').eq('date', todayStr);
        }

        const res = await attQuery;
        if (res.error) throw res.error;
        att = res.data || [];
    } catch(err) {
        console.warn("Supabase attendance fetch in loadMiniData failed, using local storage:", err);
        const localAtt = JSON.parse(localStorage.getItem('romix_attendance_local') || '[]');
        if (user.role === 'employee') {
            att = localAtt.filter(x => x.employee_id === user.id && x.date >= monthStart);
        } else {
            att = localAtt.filter(x => x.date === todayStr);
        }
    }

    renderMiniStaff(employees, att, user.role);
    updateMiniStats(employees, att, user.role);
}

function updateMiniStats(staff, att, role) {
    if (role === 'employee') {
        const emp = staff[0];

        // 📊 Calculate monthly hours
        let totalMinutes = 0;
        att.forEach(record => {
            if (record.check_in && record.check_out) {
                const start = new Date(record.check_in);
                const end = new Date(record.check_out);
                let diff = (end - start) / (1000 * 60); // minutes

                // Subtract lunch if exists
                if (record.lunch_start && record.lunch_end) {
                    const lStart = new Date(record.lunch_start);
                    const lEnd = new Date(record.lunch_end);
                    diff -= (lEnd - lStart) / (1000 * 60);
                }
                totalMinutes += diff;
            }
        });

        const totalHours = Math.floor(totalMinutes / 60);
        const hourlyRate = (emp.salary || 0) / 234; // 234 hours base
        const currentSalary = Math.floor(totalHours * hourlyRate);

        document.getElementById('activeStaffCount').innerText = totalHours + ' soat';
        document.getElementById('activeStaffCount').previousElementSibling.innerText = 'ISH VAQTI (OY)';

        document.getElementById('todayArrived').innerText = new Intl.NumberFormat('uz-UZ').format(currentSalary) + ' so\'m';
        document.getElementById('todayArrived').previousElementSibling.innerText = 'HISOBLANGAN OYLIK';
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

        // 🕒 Format Times
        const fTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

        // 🛑 HIDE HR SPECIFIC UI
        const nav = document.querySelector('.bottom-nav');
        if (nav) nav.style.display = 'none';
        document.querySelector('.app-container').style.paddingBottom = '20px';

        container.innerHTML = `
            <!-- 👤 PREMIUM PROFILE CARD -->
            <div class="staff-mini-card" style="flex-direction:column; padding:35px 25px; gap:20px; text-align:center; background:linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%); border-radius:40px;">
                <div style="position:relative; margin: 0 auto;">
                    <div style="width:110px; height:110px; border-radius:38px; padding:3px; background:linear-gradient(45deg, var(--accent), #00d2ff);">
                        <img src="${emp.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(emp.full_name)}" style="width:100%; height:100%; border-radius:35px; object-fit:cover; border:4px solid #05080c;">
                    </div>
                </div>
                <div>
                    <h2 style="font-size:1.6rem; font-weight:900; letter-spacing:1px; margin-bottom:5px;">${emp.full_name}</h2>
                    <div style="display:inline-flex; align-items:center; gap:8px; padding:6px 16px; background:rgba(0,255,136,0.1); border-radius:20px; border:1px solid rgba(0,255,136,0.2);">
                        <div style="width:8px; height:8px; border-radius:50%; background:var(--accent); box-shadow:0 0 10px var(--accent);"></div>
                        <span style="color:var(--accent); font-size:0.75rem; font-weight:800; letter-spacing:1px; text-transform:uppercase;">${emp.role || 'Ishchi'}</span>
                    </div>
                </div>
            </div>

            <!-- 📊 MONTHLY PERFORMANCE BENTO -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin: 20px 0;">
                <div class="stat-card-mini" style="background:linear-gradient(135deg, rgba(0,255,136,0.1) 0%, transparent 100%); border:1px solid rgba(0,255,136,0.2); border-radius:30px; padding:25px;">
                    <span style="font-size:0.6rem; letter-spacing:1.5px; opacity:0.6;">OYLIK VAKTI</span>
                    <b style="font-size:1.4rem; color:var(--accent); display:block; margin-top:5px;">${document.getElementById('activeStaffCount').innerText}</b>
                </div>
                <div class="stat-card-mini" style="background:linear-gradient(135deg, rgba(0,210,255,0.1) 0%, transparent 100%); border:1px solid rgba(0,210,255,0.2); border-radius:30px; padding:25px;">
                    <span style="font-size:0.6rem; letter-spacing:1.5px; opacity:0.6;">HISOB OYLIK</span>
                    <b style="font-size:1.4rem; color:#00d2ff; display:block; margin-top:5px;">${document.getElementById('todayArrived').innerText}</b>
                </div>
            </div>

            <!-- 🆔 MY PERSONAL QR -->
            <div style="background:var(--card); border:1px solid var(--border); border-radius:35px; padding:35px; text-align:center; backdrop-filter:var(--glass);">
                <span style="display:block; font-size:0.7rem; color:var(--text-s); font-weight:800; margin-bottom:20px; letter-spacing:2px; text-transform:uppercase;">Shaxsiy QR Identifier</span>
                <div id="personalQR" style="background:#fff; padding:18px; border-radius:28px; display:inline-block; margin:0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3);"></div>
                <p style="margin-top:20px; font-size:0.7rem; color:var(--text-s); line-height:1.5;">Ushbu kod orqali tizimga kirishingiz <br> va davomatingizni tasdiqlashingiz mumkin</p>
            </div>

            <div style="margin-top:25px;">
                <button onclick="window.openProfileEdit()" style="width:100%; height:75px; border-radius:25px; background:rgba(255,255,255,0.05); color:#fff; border:1px solid rgba(255,255,255,0.1); font-weight:800; font-size:1rem; display:flex; align-items:center; justify-content:center; gap:12px; transition:0.3s; cursor:pointer;">
                    <i data-lucide="user-cog" style="width:20px;"></i> PROFILNI TAHRIRLASH
                </button>
                <button onclick="document.getElementById('miniLogout').click()" style="width:100%; height:60px; margin-top:15px; background:none; border:none; color:#ff4d4f; font-weight:700; font-size:0.85rem; opacity:0.6;">TIZIMDAN CHIQISH</button>
            </div>
        `;

        // Generate QR code (Matching the login ID)
        setTimeout(() => {
            new QRCode(document.getElementById("personalQR"), {
                text: "ROMIX-STAFF-" + emp.id,
                width: 150,
                height: 150,
                colorDark: "#000000",
                colorLight: "#ffffff"
            });
        }, 100);
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
    if (!emp) return;

    // Create the overlay sheet dynamically
    const overlay = document.createElement('div');
    overlay.className = 'mini-modal-overlay';
    overlay.id = 'miniProfileSheet';
    overlay.style.display = 'flex';

    overlay.innerHTML = `
        <div class="mini-modal" id="miniProfileContent" style="max-height:85vh; overflow-y:auto; border-radius:40px 40px 0 0; background:#0e121a; border-top:2px solid var(--border); padding-bottom:50px;">
            <div style="width:45px; height:6px; background:rgba(255,255,255,0.1); border-radius:10px; margin:0 auto 30px auto;"></div>
            
            <div style="text-align:center; margin-bottom:25px;">
                <div style="position:relative; display:inline-block; margin: 0 auto 15px auto;">
                    <div style="width:100px; height:100px; border-radius:32px; padding:3px; background:linear-gradient(45deg, var(--accent), #00d2ff);">
                        <img src="${emp.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(emp.full_name)}" style="width:100%; height:100%; border-radius:29px; object-fit:cover; border:3px solid #0e121a;">
                    </div>
                </div>
                <h2 style="font-size:1.5rem; font-weight:900; letter-spacing:0.5px; color:#fff;">${emp.full_name}</h2>
                <span style="display:inline-block; margin-top:8px; font-size:0.7rem; color:var(--accent); background:rgba(0, 255, 136, 0.1); border:1px solid rgba(0, 255, 136, 0.2); padding:5px 15px; border-radius:12px; font-weight:800; text-transform:uppercase; letter-spacing:1px;">${emp.role || 'Xodim'}</span>
            </div>

            <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:30px; padding: 0 10px;">
                <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); padding:16px 20px; border-radius:20px; border:1px solid var(--border);">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <i data-lucide="phone" style="color:var(--text-s); width:16px;"></i>
                        <span style="font-size:0.7rem; color:var(--text-s); font-weight:800; letter-spacing:1px;">TELEFON:</span>
                    </div>
                    <b style="font-size:0.95rem; color:#fff; font-weight:700;">${emp.phone || '---'}</b>
                </div>

                <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); padding:16px 20px; border-radius:20px; border:1px solid var(--border);">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <i data-lucide="building" style="color:var(--text-s); width:16px;"></i>
                        <span style="font-size:0.7rem; color:var(--text-s); font-weight:800; letter-spacing:1px;">BO'LIM:</span>
                    </div>
                    <b style="font-size:0.95rem; color:#00d2ff; font-weight:800;">${(emp.department || 'Ofis').toUpperCase()}</b>
                </div>

                <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); padding:16px 20px; border-radius:20px; border:1px solid var(--border);">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <i data-lucide="calendar" style="color:var(--text-s); width:16px;"></i>
                        <span style="font-size:0.7rem; color:var(--text-s); font-weight:800; letter-spacing:1px;">STAJ:</span>
                    </div>
                    <b style="font-size:0.95rem; color:#fff; font-weight:700;">${emp.staj || 'Yangi xodim'}</b>
                </div>

                <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); padding:16px 20px; border-radius:20px; border:1px solid var(--border);">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <i data-lucide="wallet" style="color:var(--text-s); width:16px;"></i>
                        <span style="font-size:0.7rem; color:var(--text-s); font-weight:800; letter-spacing:1px;">MAOSH STAVKASI:</span>
                    </div>
                    <b style="font-size:0.95rem; color:var(--accent); font-weight:900;">${emp.salary_info || '---'} UZS</b>
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:10px; padding: 0 10px;">
                <button onclick="window.miniCloseProfile()" style="height:65px; border-radius:20px; background:rgba(255,255,255,0.05); color:#fff; border:1px solid rgba(255,255,255,0.08); font-weight:800; font-size:0.95rem; display:flex; align-items:center; justify-content:center; gap:10px; cursor:pointer; width:100%;">
                    YOPISH
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    lucide.createIcons();
    gsap.to("#miniProfileContent", { y: 0, duration: 0.5, ease: "power4.out" });
};

window.miniCloseProfile = function () {
    gsap.to("#miniProfileContent", {
        y: "100%", duration: 0.4, onComplete: () => {
            document.getElementById('miniProfileSheet').remove();
        }
    });
};

// 📝 PREMIUM PROFILE EDIT ENGINE
window.openProfileEdit = function () {
    const emp = employees[0];
    const overlay = document.createElement('div');
    overlay.className = 'mini-modal-overlay';
    overlay.id = 'profileEditModal';
    overlay.style.display = 'flex';

    overlay.innerHTML = `
        <div class="mini-modal" id="profileEditContent" style="max-height:85vh; overflow-y:auto; border-radius:40px 40px 0 0; background:#0a0e14; border-top:2px solid var(--border);">
            <div style="width:45px; height:6px; background:rgba(255,255,255,0.1); border-radius:10px; margin:0 auto 30px auto;"></div>
            
            <div style="text-align:center; margin-bottom:35px;">
                <h2 style="font-size:1.6rem; font-weight:900; letter-spacing:1px;">PROFIL SOZLAMALARI</h2>
                <p style="color:var(--text-s); font-size:0.8rem; margin-top:5px;">Ma'lumotlarni yangilash so'rovini yuboring</p>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:20px; padding:0 10px 40px 10px;">
                <div class="input-group-premium">
                    <label style="color:var(--text-s); font-size:0.65rem; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; margin-left:15px; margin-bottom:8px; display:block;">To'liq ism (F.I.SH)</label>
                    <input type="text" id="editFullName" class="auth-input" value="${emp.full_name}" style="height:65px; width:100%; border-radius:22px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:0 25px; color:#fff; font-size:1rem;">
                </div>

                <div class="input-group-premium">
                    <label style="color:var(--text-s); font-size:0.65rem; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; margin-left:15px; margin-bottom:8px; display:block;">Asosiy telefon</label>
                    <input type="tel" id="editPhone" class="auth-input" value="${emp.phone || ''}" style="height:65px; width:100%; border-radius:22px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:0 25px; color:#fff; font-size:1rem;">
                </div>

                <div class="input-group-premium">
                    <label style="color:var(--text-s); font-size:0.65rem; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; margin-left:15px; margin-bottom:8px; display:block;">Yashash manzili</label>
                    <input type="text" id="editAddress" class="auth-input" value="${emp.address || ''}" style="height:65px; width:100%; border-radius:22px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:0 25px; color:#fff; font-size:1rem;">
                </div>

                <div class="input-group-premium">
                    <label style="color:var(--text-s); font-size:0.65rem; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; margin-left:15px; margin-bottom:8px; display:block;">PROFIL RASMI</label>
                    <div style="display:flex; flex-direction:column; gap:15px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:20px; border-radius:30px; text-align:center;">
                        <img id="tempAvatarPreview" src="${emp.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(emp.full_name)}" style="width:100px; height:100px; border-radius:30px; object-fit:cover; border:3px solid var(--accent); margin: 0 auto;">
                        
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; width:100%;">
                            <label for="avatarUpload" style="padding:15px; background:rgba(255,255,255,0.05); border-radius:18px; font-size:0.7rem; font-weight:800; cursor:pointer; color:#fff; border:1px solid rgba(255,255,255,0.1); display:flex; flex-direction:column; align-items:center; gap:5px;">
                                <i data-lucide="image" style="width:18px;"></i> GALEREYA
                            </label>
                            <input type="file" id="avatarUpload" accept="image/*" style="display:none;" onchange="window.handleAvatarUpload(this)">

                            <label for="cameraUpload" style="padding:15px; background:rgba(0,255,136,0.1); border-radius:18px; font-size:0.7rem; font-weight:800; cursor:pointer; color:var(--accent); border:1px solid rgba(0,255,136,0.2); display:flex; flex-direction:column; align-items:center; gap:5px;">
                                <i data-lucide="camera" style="width:18px;"></i> KAMERA
                            </label>
                            <input type="file" id="cameraUpload" accept="image/*" capture="user" style="display:none;" onchange="window.handleAvatarUpload(this)">
                        </div>
                        
                        <p id="uploadStatus" style="font-size:0.65rem; color:var(--text-s); font-weight:600;">O'zingizga mos usulni tanlang</p>
                        <input type="hidden" id="editAvatar" value="${emp.avatar_url || ''}">
                    </div>
                </div>

                <div style="background:rgba(0,210,255,0.05); padding:20px; border-radius:25px; border:1px dashed rgba(0,210,255,0.3); margin-top:10px;">
                    <p style="color:#00d2ff; font-size:0.75rem; font-weight:700; line-height:1.5; text-align:center;">
                         ⚠️ Eslatma: O'zgarishlar HR bo'limi tomonidan tasdiqlanganidan so'ng kuchga kiradi.
                    </p>
                </div>

                <button onclick="window.submitProfileRequest()" id="saveBtn" style="height:75px; border-radius:25px; background:var(--accent); color:#000; font-weight:900; border:none; margin-top:10px; font-size:1.1rem; box-shadow:0 15px 30px rgba(0,255,136,0.2);">
                    YUBORISH
                </button>
                <button onclick="window.closeProfileEdit()" style="background:none; border:none; color:var(--text-s); font-weight:700; padding:15px; font-size:0.9rem;">BEKOR QILISH</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    gsap.to("#profileEditContent", { y: 0, duration: 0.6, ease: "power4.out" });
};

// 📸 AVATAR UPLOAD LOGIC
window.handleAvatarUpload = async function (input) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        alert("Rasm hajmi 2MB dan katta bo'lmasligi kerak!");
        return;
    }

    const statusEl = document.getElementById('uploadStatus');
    const previewImg = document.getElementById('tempAvatarPreview');
    const hiddenInput = document.getElementById('editAvatar');

    statusEl.innerText = "YUKLANMOQDA...";
    statusEl.style.color = "var(--accent)";

    // 🚀 Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

    if (error) {
        console.error("Yuklashda xatolik:", error);
        statusEl.innerText = "XATOLIK YUZ BERDI!";
        statusEl.style.color = "#ff4d4f";
        alert("Rasm yuklashda xatolik: " + error.message);
    } else {
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        hiddenInput.value = publicUrl;
        previewImg.src = publicUrl;
        statusEl.innerText = "TAYYOR!";
        statusEl.style.color = "var(--accent)";
    }
};


window.closeProfileEdit = function () {
    gsap.to("#profileEditContent", {
        y: "100%", duration: 0.4, onComplete: () => {
            document.getElementById('profileEditModal').remove();
        }
    });
};

window.submitProfileRequest = async function () {
    const btn = document.getElementById('saveBtn');
    btn.innerText = 'YUBORILMOQDA...';
    btn.disabled = true;

    const emp = employees[0];
    const requestedData = {
        full_name: document.getElementById('editFullName').value,
        phone: document.getElementById('editPhone').value,
        address: document.getElementById('editAddress').value,
        avatar_url: document.getElementById('editAvatar').value
    };

    const { error } = await supabase.from('profile_requests').insert({
        employee_id: emp.id,
        requested_data: requestedData,
        status: 'pending'
    });

    if (!error) {
        alert("So'rov yuborildi! HR tasdiqlashini kuting.");
        window.closeProfileEdit();
    } else {
        alert("Xatolik: " + error.message);
        btn.innerText = 'HR-GA SO\'ROV YUBORISH';
        btn.disabled = false;
    }
};
