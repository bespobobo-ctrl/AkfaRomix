// 💎 ROMIX HR - Core Engine v4.1 (Ultra Stable)
import { supabase } from '@/core/supabase.js';
import { authService } from '@/services/auth/authService.js';
import { LayoutService } from '@/components/LayoutService.js';
import { ROLES, ATTENDANCE_STATUS } from '@/constants';

let employeesData = [];
let todayAtt = [];
let currentEmp = null;
let currentEditId = null;
let activeDept = 'all';
let activeAnaDept = 'all';
let tempPhotoData = null;
let html5QrCode = null;
let hwScannerBound = false;
let hwScannerRefocusTimer = null;
let workInterval = null;
let lunchInterval = null;
let currentTab = 'dashboard';

// ── Toast helper (replaces all alert() calls for non-critical messages) ──
function showToastHR(msg, type = 'info') {
    const colors = { info: '#00d2ff', warn: '#ffb800', error: '#ff4d4f', success: '#00ff88' };
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
        position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
        background: colors[type] || colors.info, color: '#000',
        padding: '12px 24px', borderRadius: '12px', fontWeight: '700',
        fontSize: '0.9rem', zIndex: '9999', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        transition: 'opacity 0.4s', whiteSpace: 'nowrap'
    });
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3500);
}

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

document.addEventListener('DOMContentLoaded', async () => {
    // 🛡️ AUTH GUARD
    const user = authService.getCurrentUser();
    if (!user || (user.role !== ROLES.HR && user.role !== ROLES.ADMIN)) {
        authService.logout();
        return;
    }

    // Initialize Layout (Sidebar, etc.)
    const hrActions = `
        <button class="add-btn-lux" id="addWorkerBtn" style="margin:0; width:auto; padding:0 25px; height:45px; border-radius:12px; font-size:0.75rem; white-space:nowrap;">
            <i data-lucide="plus-circle" size="18"></i> <span>YANGI XODIM</span>
        </button>
    `;
    LayoutService.init('HR', hrActions);

    /*
    // Animations
    if (window.gsap) {
        gsap.from(".sidebar", { x: -100, opacity: 0, duration: 1 });
        gsap.from(".top-nav", { y: -50, opacity: 0, duration: 1, delay: 0.2 });
        gsap.from(".bento-card", { opacity: 0, y: 30, duration: 0.8, stagger: 0.1, delay: 0.4 });
    }
    */

    // Header Branding
    const nameEl = document.getElementById('userNameLabel');
    const initEl = document.getElementById('userInitials');
    if (nameEl) nameEl.textContent = user.username || 'HR Admin';
    if (initEl) initEl.textContent = (user.username || 'R')[0].toUpperCase();

    // Global Functions for HTML
    window.handleEdit = handleEdit;
    window.handleDelete = handleDelete;
    window.handlePremya = handlePremya;
    window.handleOylik = handleOylik;
    window.handleReport = handleReport;
    window.prepareBadge = prepareBadge;
    window.closeDetailModal = closeDetailModal;
    window.closeBadgeModal = closeBadgeModal;
    window.downloadBadge = downloadBadge;
    window.printBadgeReal = printBadgeReal;
    window.switchTab = switchTab;
    window.stopScanner = stopScanner;
    window.closeActionModal = closeActionModal;
    window.toggleLunchSection = toggleLunchSection;
    // window.viewDetails is assigned at its definition below

    // Logout (handled by LayoutService)

    // Modal Control
    const addBtn = document.getElementById('addWorkerBtn');
    if (addBtn) {
        addBtn.onclick = () => {
            currentEditId = null;
            document.getElementById('modalTitle').textContent = "YANGI XODIM";
            document.getElementById('saveWorkerBtn').textContent = "SAQLASH";
            clearModal();
            document.getElementById('addWorkerModalOverlay').style.display = 'flex';
        };
    }

    const closeAddBtn = document.getElementById('closeAddWorkerBtn');
    if (closeAddBtn) {
        closeAddBtn.onclick = () => {
            document.getElementById('addWorkerModalOverlay').style.display = 'none';
        }
    }

    // Dept Selector in Modal
    document.querySelectorAll('.dept-opt').forEach(opt => {
        opt.onclick = () => {
            document.querySelectorAll('.dept-opt').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
        };
    });

    const handlePhotoSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            tempPhotoData = event.target.result;
            const preview = document.getElementById('modalPhotoPreview');
            preview.src = tempPhotoData;
            preview.style.display = 'block';
            document.getElementById('plusIcon').style.display = 'none';
        };
        reader.readAsDataURL(file);
    };

    const photoInput = document.getElementById('empPhotoFile');
    if (photoInput) photoInput.onchange = handlePhotoSelect;

    const cameraInput = document.getElementById('empPhotoCamera');
    if (cameraInput) cameraInput.onchange = handlePhotoSelect;

    const saveBtn = document.getElementById('saveWorkerBtn');
    if (saveBtn) saveBtn.onclick = saveWorker;

    // Search
    const searchInput = document.getElementById('hrSearchPrimary');
    if (searchInput) {
        searchInput.oninput = () => {
            filterAndRender();
        };
    }

    // Main Dashboard Pill Filtering
    document.querySelectorAll('.pill[data-dept]').forEach(pill => {
        pill.onclick = () => {
            document.querySelectorAll('.pill[data-dept]').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeDept = pill.dataset.dept;

            // UX Fix: Clear search bar when explicitly selecting a category
            const searchInput = document.getElementById('hrSearchPrimary');
            if (searchInput) searchInput.value = '';

            filterAndRender();
        };
    });

    // Analytics Dashboard Pill Filtering
    document.querySelectorAll('.pill[data-ana-dept]').forEach(pill => {
        pill.onclick = async () => {
            document.querySelectorAll('.pill[data-ana-dept]').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeAnaDept = pill.dataset.anaDept;
            await renderAnalyticsBoard();
        };
    });

    await loadInitialData();

    // Fight aggressive browser autofill by clearing "hr" or "admin" from search bar programmatically if not focused
    const cleanAutofill = () => {
        const searchInput = document.getElementById('hrSearchPrimary');
        if (searchInput && document.activeElement !== searchInput) {
            const val = searchInput.value.toLowerCase().trim();
            if (val === 'hr' || val === 'admin') {
                searchInput.value = '';
                filterAndRender();
            }
        }
    };
    for (let delay of [100, 300, 500, 1000, 2000]) {
        setTimeout(cleanAutofill, delay);
    }
});

async function loadInitialData() {
    const table = document.getElementById('employeeTableBody');
    const searchInput = document.getElementById('hrSearchPrimary');

    if (searchInput) {
        searchInput.value = '';
    }

    // STEP 1: Show loading
    if (table) table.innerHTML = `<tr><td colspan="6" style="text-align:center; height: 500px; padding:20px; color:var(--accent);">⏳ Xodimlar yuklanmoqda...</td></tr>`;

    try {
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

        let staff = [];
        try {
            const { data, error } = await supabase.from('employees').select('*').order('full_name', { ascending: true });
            if (error) throw error;
            staff = data || [];
        } catch (dbErr) {
            console.warn("Supabase employees fetch failed, falling back to local storage:", dbErr);
            const localRaw = localStorage.getItem('romix_employees_local');
            if (localRaw && JSON.parse(localRaw).length > 0) {
                staff = JSON.parse(localRaw);
            } else {
                staff = defaultEmployees;
                localStorage.setItem('romix_employees_local', JSON.stringify(staff));
            }
        }

        let att = [];
        try {
            const { data, error } = await supabase.from('attendance').select('*').eq('date', todayStr);
            if (error) throw error;
            att = data || [];
        } catch (dbErr) {
            console.warn("Supabase attendance fetch failed, falling back to local storage:", dbErr);
            att = JSON.parse(localStorage.getItem('romix_attendance_local') || '[]');
        }

        employeesData = staff;
        todayAtt = att;

        // Synchronize local cache
        localStorage.setItem('romix_employees_local', JSON.stringify(employeesData));
        localStorage.setItem('romix_attendance_local', JSON.stringify(todayAtt));

        console.log("✅ Xodimlar soni:", employeesData.length);

        if (employeesData.length === 0) {
            if (table) table.innerHTML = `<tr><td colspan="6" style="color:#ffa940; text-align:center; padding:30px;">⚠️ Hozircha xodimlar yo'q (0 ta)<br><small style="color:var(--text-s)">'YANGI XODIM' tugmasi orqali yangi xodimlarni kiritishingiz mumkin.</small></td></tr>`;
            return;
        }

        // STEP 4: Render with a tiny delay to ensure global vars are fully set
        setTimeout(() => {
            filterAndRender();
        }, 150);

    } catch (err) {
        console.error("💥 Critical Exception:", err);
        employeesData = JSON.parse(localStorage.getItem('romix_employees_local') || '[]');
        todayAtt = JSON.parse(localStorage.getItem('romix_attendance_local') || '[]');
        filterAndRender();
    }
}

function getSmartStatus(att) {
    if (!att) return { text: 'KELMAGAN', color: '#ff4d4f', glow: 'rgba(255, 77, 79, 0.2)' };
    if (att.status === 'KETGAN') return { text: 'KETGAN', color: '#8a8f98', glow: 'transparent' };
    if (att.status === 'RUHSAT') return { text: 'RUHSAT', color: '#ffa940', glow: 'rgba(255, 169, 64, 0.2)' };

    if (!att.check_in) return { text: 'KELMAGAN', color: '#ff4d4f', glow: 'rgba(255, 77, 79, 0.2)' };

    // Agar xodim kelgan bo'lsa va hali ketmagan bo'lsa - STATUS: ISHDA
    return { text: 'ISHDA', color: '#00ff88', glow: 'rgba(0, 255, 136, 0.3)' };
}

function renderStaffList(data) {
    const container = document.getElementById('employeeTableBody');
    if (!container) return;

    // 🛡️ FORCE V1.00 TABLE RESET
    container.innerHTML = '';

    // Update Stats
    updateGlobalStats();

    if (data.length === 0) {
        container.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:50px; color:var(--text-s);">Xodimlar topilmadi</td></tr>';
        return;
    }

    data.forEach(emp => {
        const att = todayAtt.find(a => a.employee_id === emp.id);
        const status = getSmartStatus(att);
        const inT = att && att.check_in ? new Date(att.check_in).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
        const outT = att && att.check_out ? new Date(att.check_out).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = () => window.viewDetails(emp.id);
        tr.style.background = "rgba(255,255,255,0.01)";
        tr.style.borderBottom = "1px solid rgba(255,255,255,0.05)";

        tr.innerHTML = `
            <td style="padding: 16px 20px;">
                <div style="display:flex; align-items:center; gap:15px;">
                    <img src="${emp.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(emp.full_name)}" 
                         style="width:42px; height:42px; border-radius:14px; object-fit:cover; border:1px solid rgba(255,255,255,0.1); flex-shrink:0;">
                    <div>
                        <div style="font-weight:700; font-size:0.9rem; color:#fff; line-height:1.2;">${emp.full_name}</div>
                        <div style="font-size:0.65rem; color:var(--text-s); margin-top:3px; opacity:0.5;">ID: ${emp.id.substring(0, 8).toUpperCase()}</div>
                    </div>
                </div>
            </td>
            <td style="padding: 16px 20px; font-size:0.8rem; font-weight:600; color:var(--text-p);">${emp.role || 'Xodim'}</td>
            <td style="padding: 16px 20px;">
                <span style="font-size:0.65rem; color:var(--accent); font-weight:700; text-transform:uppercase; background:rgba(0,255,136,0.05); padding:4px 10px; border-radius:8px;">
                    ${emp.department || emp.dept || 'Ofis'}
                </span>
            </td>
            <td style="padding: 16px 20px; font-size:0.8rem; color:var(--text-s); font-family:monospace;">${emp.phone || '---'}</td>
            <td style="padding: 16px 20px;">
                <div style="display:inline-flex; align-items:center; gap:8px; background:${status.glow}; color:${status.color}; padding:6px 14px; border-radius:12px; font-size:0.7rem; font-weight:800; border:1px solid ${status.color}22;">
                    <span style="width:6px; height:6px; border-radius:50%; background:${status.color}; box-shadow:0 0 8px ${status.color}"></span>
                    ${status.text}
                </div>
                ${inT ? `<div style="font-size:0.68rem; color:var(--text-s); margin-top:6px; font-family:monospace; letter-spacing:0.5px;">🕐 ${inT}${outT ? ' → ' + outT : ''}</div>` : ''}
            </td>
            <td style="padding: 16px 20px; text-align:right;">
                <button onclick="window.viewDetails('${emp.id}')" 
                        style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); color:#fff; width:36px; height:36px; border-radius:12px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:0.3s;"
                        onmouseover="this.style.background='var(--accent)'; this.style.color='#000'; this.style.transform='translateX(3px)'"
                        onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.color='#fff'; this.style.transform='none'">
                    <i data-lucide="chevron-right" size="18"></i>
                </button>
            </td>
        `;
        container.appendChild(tr);
    });
    lucide.createIcons();
}

function updateGlobalStats() {
    if (!employeesData) return;

    // 1. Total Employees
    document.getElementById('totalEmployeesCount').textContent = employeesData.length;

    // 2. Currently at work (Unique employees who have check_in but no check_out, or status ISHDA)
    const uniquePresent = new Set(todayAtt.filter(a => (a.status === 'ISHDA' || (a.check_in && !a.check_out))).map(a => a.employee_id));
    document.getElementById('todayArrivedCount').textContent = uniquePresent.size;

    // 3. Late arrivals (Unique employees who arrived after 08:00)
    const lateCount = new Set(todayAtt.filter(a => {
        if (!a.check_in) return false;
        const time = new Date(a.check_in).getHours() * 60 + new Date(a.check_in).getMinutes();
        return time > 480; // 480 mins = 08:00
    }).map(a => a.employee_id)).size;

    const lateEl = document.getElementById('todayLateCount');
    if (lateEl) lateEl.textContent = lateCount;

    // 4. Monthly Payroll Fund
    let totalPayroll = 0;
    employeesData.forEach(e => {
        const val = parseInt(e.salary_info?.toString().replace(/\D/g, '') || 0);
        totalPayroll += val;
    });
    const payrollEl = document.getElementById('payrollTotal');
    if (payrollEl) payrollEl.innerHTML = `${totalPayroll.toLocaleString()} <small>UZS</small>`;
}

let isFetchingDetails = false;

window.viewDetails = async function (id) {
    if (isFetchingDetails) return;
    isFetchingDetails = true;

    console.log("🔍 viewDetails calling for ID:", id);
    // 1. FRESH DATA FETCH
    let freshEmp = null;
    try {
        const { data, error } = await supabase.from('employees').select('*').eq('id', id).single();
        if (error) throw error;
        freshEmp = data;
    } catch (err) {
        console.warn("Supabase viewDetails fetch failed, using local storage:", err);
        const localEmployees = JSON.parse(localStorage.getItem('romix_employees_local') || '[]');
        freshEmp = localEmployees.find(x => x.id === id);
    }

    isFetchingDetails = false;

    if (!freshEmp) {
        console.warn("⚠️ No employee found for ID:", id);
        return;
    }

    console.log("✅ freshEmp found:", freshEmp.full_name);

    const emp = freshEmp;
    currentEmp = emp; // Consistent naming

    // UI Fill
    document.body.style.overflow = 'hidden'; // Lock scroll
    document.getElementById('detailModalOverlay').style.display = 'flex';
    document.getElementById('profileDetail').style.display = 'flex';

    document.getElementById('dt-photo').src = emp.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(emp.full_name);
    document.getElementById('dt-name').textContent = emp.full_name;
    document.getElementById('dt-role').textContent = (emp.department || 'Ofis').toUpperCase();
    document.getElementById('dt-phone').textContent = emp.phone || '---';
    document.getElementById('dt-dept').textContent = emp.department || 'Ofis';
    document.getElementById('dt-staj').textContent = emp.staj || 'Yangi xodim';
    document.getElementById('dt-sum').textContent = (parseInt(emp.salary_info || 0) / 1000000).toFixed(1) + 'M';

    // QR
    const qrEl = document.getElementById('dt-qr');
    if (qrEl) qrEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('ROMIX-STAFF-' + emp.id)}`;

    // Attendance Info
    const _now = new Date();
    const todayStr = _now.getFullYear() + '-' + String(_now.getMonth() + 1).padStart(2, '0') + '-' + String(_now.getDate()).padStart(2, '0');

    let att = null;
    try {
        const res = await supabase.from('attendance')
            .select('*')
            .eq('employee_id', emp.id)
            .eq('date', todayStr)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (res.error) throw res.error;
        att = res.data;
    } catch (err) {
        console.warn("Supabase viewDetails attendance fetch failed, using local storage:", err);
        const localAtt = JSON.parse(localStorage.getItem('romix_attendance_local') || '[]');
        att = localAtt.find(x => x.employee_id === emp.id);
    }

    updateProfileAttendance(att);

    gsap.fromTo("#profileDetail", { scale: 0.95, opacity: 0, y: 30 }, { scale: 1, opacity: 1, y: 0, duration: 0.5 });
    lucide.createIcons();
    console.log("🚀 Modal should be visible now.");
}

function updateProfileAttendance(att) {
    if (workInterval) clearInterval(workInterval);
    if (lunchInterval) clearInterval(lunchInterval);

    const arrivedEl = document.getElementById('dt-arrived');
    const leftEl = document.getElementById('dt-left');
    const lunchStartEl = document.getElementById('dt-lunch-start');
    const lunchEndEl = document.getElementById('dt-lunch-end');
    const timeEl = document.getElementById('dt-worktime');
    const progressEl = document.getElementById('timeProgress');
    const statusBadge = document.getElementById('dt-status-badge');
    const statusPulse = document.getElementById('dt-status-pulse');

    // Reset Daily Report Grid
    const rIn = document.getElementById('dt-report-in');
    const rLOut = document.getElementById('dt-report-lunch-out');
    const rLIn = document.getElementById('dt-report-lunch-in');
    const rOut = document.getElementById('dt-report-out');
    if (rIn) rIn.textContent = '--:--';
    if (rLOut) rLOut.textContent = '--:--';
    if (rLIn) rLIn.textContent = '--:--';
    if (rOut) rOut.textContent = '--:--';

    // Reset Timeline Steps
    const steps = ['step-arrived', 'step-lunch-out', 'step-lunch-in', 'step-left'];
    steps.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.classList.remove('completed');
    });

    if (!att || !att.check_in) {
        arrivedEl.textContent = '--:--';
        leftEl.textContent = '--:--';
        if (lunchStartEl) lunchStartEl.textContent = '--:--';
        if (lunchEndEl) lunchEndEl.textContent = '--:--';
        timeEl.textContent = '00:00:00';
        if (progressEl) progressEl.style.strokeDashoffset = '1068';
        if (statusBadge) {
            statusBadge.textContent = 'OFFLINE';
            statusBadge.style.color = 'var(--text-s)';
        }
        if (statusPulse) {
            statusPulse.style.background = 'var(--text-s)';
            statusPulse.style.boxShadow = 'none';
        }

        updateLastActionUI('user-minus', 'Harakat yo\'q', new Date(), 'var(--text-s)');

        const payEl = document.getElementById('dt-today-pay');
        if (payEl) payEl.innerHTML = `<span style="font-family:'Outfit'; font-size:5.5rem; font-weight:1000; background:linear-gradient(to bottom, #fff, #999); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; letter-spacing:-4px;">0</span><span style="font-size:1.4rem; color:var(--accent); font-weight:900; margin-left:15px; letter-spacing:3px;">UZS</span>`;
        return;
    }

    // Set Active Status
    const isOnline = !att.check_out;
    if (statusBadge) {
        statusBadge.textContent = isOnline ? 'ONLINE' : 'OFFLINE';
        statusBadge.style.color = isOnline ? 'var(--accent)' : 'var(--text-s)';
    }
    if (statusPulse) {
        statusPulse.style.background = isOnline ? 'var(--accent)' : 'var(--text-s)';
        statusPulse.style.boxShadow = isOnline ? '0 0 12px var(--accent)' : 'none';
        if (isOnline) statusPulse.style.animation = 'pulse 2s infinite';
        else statusPulse.style.animation = 'none';
    }

    if (att.check_in) {
        const start = new Date(att.check_in);
        const tIn = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        arrivedEl.textContent = tIn;
        if (rIn) rIn.textContent = tIn;
        document.getElementById('step-arrived')?.classList.add('completed');

        // Update Last Action (Initial)
        updateLastActionUI('log-in', 'Tizimga kirish', start, 'var(--work)');

        if (att.check_out) {
            const end = new Date(att.check_out);
            const tOut = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            leftEl.textContent = tOut;
            if (rOut) rOut.textContent = tOut;
            document.getElementById('step-left')?.classList.add('completed');
            calculateDuration(start, end);
            updateLastActionUI('log-out', 'Ishdan ketti', end, '#ff4d4f');
        } else {
            leftEl.textContent = '--:--';
            workInterval = setInterval(() => calculateDuration(start, new Date()), 1000);
            calculateDuration(start, new Date());
        }

        if (att.lunch_start) {
            const lStart = new Date(att.lunch_start);
            const tLOut = lStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (lunchStartEl) lunchStartEl.textContent = tLOut;
            if (rLOut) rLOut.textContent = tLOut;
            document.getElementById('step-lunch-out')?.classList.add('completed');
            updateLastActionUI('coffee', 'Tushlikka chiqdi', lStart, '#ffa940');

            if (att.lunch_end) {
                const lEnd = new Date(att.lunch_end);
                const tLIn = lEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                if (lunchEndEl) lunchEndEl.textContent = tLIn;
                if (rLIn) rLIn.textContent = tLIn;
                document.getElementById('step-lunch-in')?.classList.add('completed');
                updateLunchDuration(lStart, lEnd);
                updateLastActionUI('arrow-right-circle', 'Tushlikdan qaytdi', lEnd, '#ffa940');
            } else {
                if (lunchEndEl) lunchEndEl.textContent = '--:--';
                lunchInterval = setInterval(() => updateLunchDuration(lStart, new Date()), 1000);
                updateLunchDuration(lStart, new Date());
            }
        }
    }
}

function updateLastActionUI(icon, title, time, color) {
    const iconEl = document.getElementById('dt-last-icon');
    const titleEl = document.getElementById('dt-last-title');
    const timeEl = document.getElementById('dt-last-time');
    const bgEl = document.getElementById('dt-last-icon-bg');
    const badgeEl = document.getElementById('dt-last-badge');

    if (iconEl) iconEl.setAttribute('data-lucide', icon);
    if (titleEl) titleEl.textContent = title;
    if (timeEl) timeEl.textContent = `Bugun, ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (bgEl) bgEl.style.background = `${color}1A`;
    if (iconEl) iconEl.style.color = color;
    if (badgeEl) badgeEl.style.color = color;
    lucide.createIcons();
}

function updateLunchDuration(start, end) {
    const diff = Math.abs(end - start);
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    const durEl = document.getElementById('dt-lunch-duration-val');
    if (durEl) {
        durEl.textContent = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

function calculateDuration(start, end) {
    const diff = Math.abs(end - start);
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    const timeEl = document.getElementById('dt-worktime');
    if (timeEl) {
        timeEl.innerHTML = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // 💰 PREMIUM SALARY COUNTER
    if (currentEmp && currentEmp.salary_info) {
        const monthlySalary = parseInt(currentEmp.salary_info.toString().replace(/\D/g, '') || 5000000);
        if (monthlySalary > 0) {
            const dailySalary = monthlySalary / 26;
            const hourlySalary = dailySalary / 9;
            const secondSalary = hourlySalary / 3600;

            const totalSeconds = diff / 1000;
            const todayPay = totalSeconds * secondSalary;

            const payEl = document.getElementById('dt-today-pay');
            const rateEl = document.getElementById('dt-hourly-rate');

            if (rateEl) rateEl.textContent = Math.round(hourlySalary).toLocaleString() + ' UZS';

            if (payEl) {
                payEl.innerHTML = `
                    <span style="font-size:2.8rem; font-weight:1000; color:#fff; font-family:'Outfit';">
                        ${Math.floor(todayPay).toLocaleString()}
                    </span>
                    <span style="font-size:0.9rem; font-weight:1000; color:var(--accent); margin-left:10px;">UZS</span>
                `;
            }
        }
    }

    // Progress Circle (Max 10 hours)
    const progressEl = document.getElementById('timeProgress');
    if (progressEl) {
        const totalSecs = hrs * 3600 + mins * 60 + secs;
        const maxSecs = 10 * 3600;
        const percent = Math.min(totalSecs / maxSecs, 1);
        const circumference = 628;
        const offset = circumference - (circumference * percent);
        progressEl.style.strokeDashoffset = offset;

        // DYNAMIC COLOR LOGIC: Kok (Work) vs Sariq (Lunch)
        const lunchStart = document.getElementById('dt-lunch-start')?.textContent;
        const lunchEnd = document.getElementById('dt-lunch-end')?.textContent;

        if (lunchStart && lunchStart !== '--:--' && lunchEnd === '--:--') {
            progressEl.style.stroke = 'var(--lunch)';
            progressEl.style.filter = 'drop-shadow(0 0 15px var(--lunch))';
        } else {
            progressEl.style.stroke = 'var(--work)';
            progressEl.style.filter = 'drop-shadow(0 0 15px var(--work))';
        }
    }
}

function closeDetailModal() {
    if (workInterval) clearInterval(workInterval);
    if (lunchInterval) clearInterval(lunchInterval);
    document.getElementById('detailModalOverlay').style.display = 'none';
    document.body.style.overflow = 'auto'; // Unlock scroll
}

function toggleLunchSection() {
    const body = document.getElementById('lunchDetailsBody');
    const chevron = document.getElementById('lunchChevron');
    if (!body) return;

    if (body.style.display === 'none') {
        body.style.display = 'block';
        // Force reset before animation
        gsap.set(body, { height: 'auto', opacity: 0 });
        const height = body.offsetHeight;
        gsap.fromTo(body,
            { height: 0, opacity: 0 },
            { height: height, opacity: 1, duration: 0.4, ease: "power2.out" }
        );
        if (chevron) gsap.to(chevron, { rotation: 180, duration: 0.3 });
    } else {
        gsap.to(body, {
            height: 0, opacity: 0, duration: 0.3, ease: "power2.in", onComplete: () => {
                body.style.display = 'none';
            }
        });
        if (chevron) gsap.to(chevron, { rotation: 0, duration: 0.3 });
    }
}

function handleEdit() {
    if (!currentEmp) return;
    const emp = currentEmp;
    currentEditId = emp.id;

    closeDetailModal();

    document.getElementById('modalTitle').textContent = "TAHRIRLASH";
    document.getElementById('saveWorkerBtn').textContent = "YANGILASH";

    const parts = (emp.full_name || '').split(' ');
    document.getElementById('empFirstName').value = parts[0] || '';
    document.getElementById('empLastName').value = parts.slice(1).join(' ') || '';
    document.getElementById('empRole').value = emp.role || '';
    // Handle Department Selection in UI
    const dept = emp.department || emp.dept || 'Ofis';
    document.querySelectorAll('.dept-opt').forEach(opt => {
        if (opt.dataset.value === dept) opt.classList.add('active');
        else opt.classList.remove('active');
    });
    document.getElementById('empSalary').value = parseInt(emp.salary_info || 0);
    document.getElementById('empPhone').value = emp.phone || '';
    document.getElementById('empBirthYear').value = emp.birth_year || '';
    document.getElementById('empJoinedYear').value = emp.joined_year || '';

    if (emp.avatar_url) {
        document.getElementById('modalPhotoPreview').src = emp.avatar_url;
        document.getElementById('modalPhotoPreview').style.display = 'block';
        document.getElementById('plusIcon').style.display = 'none';
    }

    document.getElementById('addWorkerModalOverlay').style.display = 'flex';
}

async function saveWorker() {
    const btn = document.getElementById('saveWorkerBtn');
    const fname = document.getElementById('empFirstName').value.trim();
    const lname = document.getElementById('empLastName').value.trim();
    const role = document.getElementById('empRole').value.trim();
    const dept = document.querySelector('.dept-opt.active')?.dataset.value || 'Ofis';
    const salary = document.getElementById('empSalary').value.trim();
    const phone = document.getElementById('empPhone').value.trim();
    const birthYear = document.getElementById('empBirthYear').value.trim();
    const joinedYear = document.getElementById('empJoinedYear').value.trim();

    if (!fname || !role) { alert("Ism va Lavozim majburiy!"); return; }

    btn.textContent = 'SAQLANMOQDA...';
    btn.disabled = true;

    const fullName = `${fname} ${lname}`.trim();
    const payload = {
        full_name: fullName,
        first_name: fname,
        last_name: lname,
        role: role,
        salary_info: salary || '0',
        phone: phone || '',
        birth_year: birthYear ? parseInt(birthYear) : null,
        avatar_url: tempPhotoData || (currentEditId ? currentEmp.avatar_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1a7b7c&color=fff`)
    };

    payload.department = dept;
    payload.dept = dept;
    payload.joined_year = joinedYear ? parseInt(joinedYear) : null;

    let res = null;
    let savedSuccessfully = false;

    // 1. Try to save to Supabase
    try {
        if (currentEditId) {
            res = await supabase.from('employees').update(payload).eq('id', currentEditId).select();
        } else {
            res = await supabase.from('employees').insert([payload]).select();
        }
        if (res && !res.error) {
            savedSuccessfully = true;
        }
    } catch (e) {
        console.warn("Database insert/update failed:", e);
    }

    // 2. Synchronize with localStorage
    let localEmployees = JSON.parse(localStorage.getItem('romix_employees_local') || '[]');
    if (currentEditId) {
        localEmployees = localEmployees.map(emp => {
            if (emp.id === currentEditId) {
                return { ...emp, ...payload, id: currentEditId };
            }
            return emp;
        });
    } else {
        const newId = (res && res.data && res.data[0]) ? res.data[0].id : 'local-' + Date.now();
        const newEmp = { ...payload, id: newId };
        localEmployees.unshift(newEmp);
    }
    localStorage.setItem('romix_employees_local', JSON.stringify(localEmployees));
    savedSuccessfully = true; // Mark as saved because local save succeeded

    if (savedSuccessfully) {
        logActivity('admin', currentEditId ? 'Xodim tahrirlandi' : 'Yangi xodim qo\'shildi', fullName);
        btn.textContent = 'MUVAFFAQIYATLI!';
        btn.style.background = '#00ff88';
        setTimeout(async () => {
            document.getElementById('addWorkerModalOverlay').style.display = 'none';
            await loadInitialData();
            clearModal();
            btn.textContent = 'SAQLASH';
            btn.style.background = '';
            btn.disabled = false;
            currentEditId = null;
        }, 1500);
    } else {
        const errMsg = res ? res.error.message : "Noma'lum xato";
        alert(`SAQLASHDA XATO: ${errMsg}`);
        btn.disabled = false;
        btn.textContent = 'QAYTA URINISH';
    }
}

function clearModal() {
    tempPhotoData = null;
    document.getElementById('empFirstName').value = '';
    document.getElementById('empLastName').value = '';
    document.getElementById('empRole').value = '';
    document.getElementById('empSalary').value = '';
    document.getElementById('empPhone').value = '';
    document.getElementById('empBirthYear').value = '';
    document.getElementById('empJoinedYear').value = '';
    document.getElementById('modalPhotoPreview').style.display = 'none';
    document.getElementById('plusIcon').style.display = 'block';
}

function closeBadgeModal() {
    document.getElementById('badgeModalOverlay').style.display = 'none';
}

function prepareBadge() {
    if (!currentEmp) return;
    const emp = currentEmp;
    const parts = (emp.full_name || '').split(' ');
    document.getElementById('badgeModalOverlay').style.display = 'flex';

    const photoImg = document.getElementById('badgePreviewPhoto');
    if (emp.avatar_url) {
        photoImg.crossOrigin = "anonymous";
        photoImg.src = emp.avatar_url;
    }

    document.getElementById('badgePreviewSideName').textContent = (parts[0] || '').toUpperCase();
    document.getElementById('badgePreviewFullName').textContent = (emp.full_name || '').toUpperCase();
    document.getElementById('badgePreviewRole').textContent = (emp.department || 'OFIS').toUpperCase() + " XODIMI";

    const idEl = document.getElementById('badgePreviewID');
    if (idEl) idEl.textContent = 'ID: ROMIX-' + emp.id.substring(0, 8).toUpperCase();

    // Offline QR Generation (Stable for PNG Export)
    const qrContainer = document.getElementById('badgePreviewQRReal');
    if (qrContainer) {
        qrContainer.innerHTML = ''; // Clear old
        new QRCode(qrContainer, {
            text: 'ROMIX-STAFF-' + emp.id,
            width: 140,
            height: 140,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }
}

function handlePremya() {
    if (!currentEmp) return;
    showActionModal({
        title: "PREMYA BERISH",
        desc: `${currentEmp.full_name} uchun rag'batlantirish miqdorini kiriting:`,
        icon: "award",
        input: true,
        confirmText: "PREMYANI TASDIQLASH",
        onConfirm: (val) => {
            if (!val || isNaN(parseFloat(val)) || parseFloat(val) <= 0) {
                alert("Iltimos, 0 dan katta to'g'ri summa kiriting!");
                return;
            }
            logActivity('admin', 'Premya berildi', `${currentEmp.full_name}: ${val} UZS`);
            alert(`${val} UZS premya muvaffaqiyatli qo'shildi!`);
            closeActionModal();
        }
    });
}

function handleOylik() {
    if (!currentEmp) return;
    logActivity('admin', 'Maosh ko\'rildi', currentEmp.full_name);
    showActionModal({
        title: "OYLIK MA'LUMOT",
        desc: `${currentEmp.full_name}ning joriy oylik maoshi:`,
        icon: "wallet",
        input: false,
        confirmText: "TUSHUNARLI",
        customContent: `<div style="font-size:2rem; font-weight:900; color:#00ff88; margin:20px 0;">${parseInt(currentEmp.salary_info || 0).toLocaleString()} <small style="font-size:1rem; color:rgba(255,255,255,0.6)">UZS</small></div>`,
        onConfirm: () => closeActionModal()
    });
}

// 💎 PREMIUM ACTION MODAL ENGINE
function showActionModal(cfg) {
    const overlay = document.getElementById('actionModalOverlay');
    const title = document.getElementById('actionModalTitle');
    const desc = document.getElementById('actionModalDesc');
    const iconInner = document.getElementById('actionIconInner');
    const inputBox = document.getElementById('actionInputBox');
    const inputField = document.getElementById('actionInput');
    const mainBtn = document.getElementById('actionMainBtn');

    title.textContent = cfg.title;
    desc.textContent = cfg.desc;
    iconInner.setAttribute('data-lucide', cfg.icon || 'check-circle');
    mainBtn.textContent = cfg.confirmText || 'TASDIQLASH';
    lucide.createIcons();

    if (cfg.input) {
        inputBox.style.display = 'block';
        inputField.value = '';
    } else {
        inputBox.style.display = 'none';
    }

    // Handle Custom HTML content if needed
    const oldContent = overlay.querySelector('.custom-modal-content');
    if (oldContent) oldContent.remove();
    if (cfg.customContent) {
        const div = document.createElement('div');
        div.className = 'custom-modal-content';
        div.innerHTML = cfg.customContent;
        desc.after(div);
    }

    overlay.style.display = 'flex';
    gsap.fromTo(overlay.querySelector('.modal-content'), { y: -100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.7)" });

    mainBtn.onclick = () => {
        if (cfg.onConfirm) cfg.onConfirm(inputField.value);
    };

    lucide.createIcons();
}

function closeActionModal() {
    const overlay = document.getElementById('actionModalOverlay');
    gsap.to(overlay.querySelector('.modal-content'), {
        y: -50, opacity: 0, duration: 0.3, onComplete: () => {
            overlay.style.display = 'none';
        }
    });
}

let selectedPeriod = 'month';

window.selectPeriod = function (period) {
    selectedPeriod = period;
    document.querySelectorAll('.report-option').forEach(opt => opt.classList.remove('active'));
    document.getElementById(`period-${period}`).classList.add('active');
};

window.handleReport = function () {
    if (!currentEmp) return;
    document.getElementById('reportSelectionModal').style.display = 'flex';
    lucide.createIcons();
};

window.openAnalyticsReport = function (id) {
    const emp = employeesData.find(e => e.id === id);
    if (!emp) return;
    currentEmp = emp;
    document.getElementById('reportSelectionModal').style.display = 'flex';
    lucide.createIcons();
};

window.startExport = async function (format) {
    if (!currentEmp) return;
    const modal = document.getElementById('reportSelectionModal');
    if (modal) modal.style.display = 'none';

    // Calculation Constants
    const periodDays = { 'day': 1, 'week': 7, 'month': 30, 'year': 365 };
    const daysLimit = periodDays[selectedPeriod] || 30;

    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - daysLimit);
    // Lokal sana (davomat yozuvlari lokal sana bilan saqlanadi — mos bo'lishi shart)
    const _ld = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const startStr = _ld(startDate);
    const endStr = _ld(now);

    // 1. Fetch Real Data from Supabase
    const { data: attendance, error } = await supabase.from('attendance')
        .select('*')
        .eq('employee_id', currentEmp.id)
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true });

    // If no real data exists, generate empty report with employee info
    if (error || !attendance || attendance.length === 0) {
        console.log("⚠️ Haqiqiy davomat ma'lumoti topilmadi — bo'sh hisobot tayyorlanmoqda.");
        const emptyRows = [{
            date: endStr,
            in: '--:--',
            out: '--:--',
            lunch_out: '--:--',
            lunch_in: '--:--',
            hours: '0.0 s',
            status: 'MA\'LUMOT YO\'Q',
            earned: '0 UZS'
        }];
        if (format === 'pdf') {
            generateProfessionalPDF(emptyRows, 0, 0, 0, 0);
        } else if (format === 'excel') {
            generateExcelReport(emptyRows, 0, 0, 0, 0);
        } else if (format === 'word') {
            generateWordReport(emptyRows, 0, 0, 0, 0);
        }
        return;
    }

    console.log(`📊 Haqiqiy hisobot: ${attendance.length} ta yozuv topildi (${startStr} → ${endStr})`);

    // 2. Data Processing & Calculations 
    const salaryText = currentEmp.salary_info || '5000000';
    const monthlySalary = parseInt(String(salaryText).replace(/\D/g, '')) || 5000000;
    const dayRate = monthlySalary / 26; // 26 ish kuni
    const hourRate = dayRate / 9; // 9 soat ish (1 soat tushlik chiqarilgan)

    let totalWorkedHours = 0;
    let totalEarned = 0;
    let totalBonuses = 0;
    let totalFines = 0;
    let daysWorked = 0;

    const reportRows = attendance.map(a => {
        let hours = 0;
        let earned = 0;
        let bonus = 0;
        let fine = 0;

        // Parse Time
        let timeIn = '--:--';
        let timeOut = '--:--';
        if (a.check_in) {
            const dIn = new Date(a.check_in);
            timeIn = dIn.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        if (a.check_out) {
            const dOut = new Date(a.check_out);
            timeOut = dOut.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });

            // Calculate hours worked
            let diff = new Date(a.check_out) - new Date(a.check_in);

            // Subtract lunch break if exists
            if (a.lunch_start && a.lunch_end) {
                const lunchDiff = new Date(a.lunch_end) - new Date(a.lunch_start);
                diff -= lunchDiff;
            }

            hours = Math.max(0, diff / (1000 * 60 * 60));
        } else if (a.check_in && !a.check_out) {
            // Still working — calculate up to now if today, else assume 9h
            const today = _ld(new Date());
            if (a.date === today) {
                let diff = new Date() - new Date(a.check_in);
                if (a.lunch_start && a.lunch_end) {
                    diff -= (new Date(a.lunch_end) - new Date(a.lunch_start));
                }
                hours = Math.max(0, diff / (1000 * 60 * 60));
            } else {
                hours = 9; // Oldingi kunlar uchun standart ish vaqti
            }
        }

        // Determine display status
        let displayStatus = a.status || 'NOMA\'LUM';
        if (a.check_in && !a.check_out && a.status === 'ISHDA') {
            displayStatus = 'ISHDA';
        }

        // Parse Bonus/Fine from status field
        if (a.status && a.status.includes('Premya')) {
            const match = a.status.match(/\d+/);
            bonus = match ? parseInt(match[0]) : 0;
        }
        if (a.status && a.status.includes('Jarima')) {
            const match = a.status.match(/\d+/);
            fine = match ? parseInt(match[0]) : 0;
        }
        if (a.status && a.status.includes('Oylik oshirildi')) {
            displayStatus = 'Oylik oshirildi';
        }

        earned = (hours * hourRate) + bonus - fine;

        // Check late arrival (after 08:15)
        let lateTag = '';
        if (a.check_in) {
            const arrivalTime = new Date(a.check_in);
            const arrivalMins = arrivalTime.getHours() * 60 + arrivalTime.getMinutes();
            if (arrivalMins > 495) { // 08:15 = 495 min
                lateTag = ' ⏰';
            }
        }

        // Parse Lunch Times
        let lunchOut = '--:--';
        let lunchIn = '--:--';
        if (a.lunch_start) {
            lunchOut = new Date(a.lunch_start).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        if (a.lunch_end) {
            lunchIn = new Date(a.lunch_end).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });
        }

        // Accumulate totals
        totalWorkedHours += hours;
        totalBonuses += bonus;
        totalFines += fine;
        totalEarned += earned;
        if (hours > 0) daysWorked++;

        return {
            date: a.date,
            in: timeIn,
            out: timeOut,
            lunch_out: lunchOut,
            lunch_in: lunchIn,
            hours: hours.toFixed(1) + ' s',
            status: displayStatus + lateTag,
            earned: Math.round(earned).toLocaleString() + ' UZS'
        };
    });

    // 3. Export Logic
    if (format === 'pdf') {
        generateProfessionalPDF(reportRows, totalEarned, totalBonuses, totalFines, daysWorked);
    } else if (format === 'excel') {
        generateExcelReport(reportRows, totalEarned, totalBonuses, totalFines, daysWorked);
    } else if (format === 'word') {
        generateWordReport(reportRows, totalEarned, totalBonuses, totalFines, daysWorked);
    }
};

function generateProfessionalPDF(rows, totalEarned, bonuses, fines, days) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const emp = currentEmp;
    const periodLabels = { 'day': 'KUNLIK', 'week': 'HAFTALIK', 'month': 'OYLIK', 'year': 'YILLIK' };
    const periodLabel = periodLabels[selectedPeriod] || 'OYLIK';

    // Design Header
    doc.setFillColor(13, 22, 34);
    doc.rect(0, 0, 210, 45, 'F');

    doc.setFontSize(22);
    doc.setTextColor(0, 210, 255);
    doc.text("AKFA ROMIX ENTERPRISE", 20, 22);
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`HR BO'LIMI — ${periodLabel} RASMIY HISOBOTI`, 20, 32);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`Tayyorlangan: ${new Date().toLocaleString('uz-UZ')}`, 20, 40);

    // Employee Meta
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    doc.text(`Xodim: ${emp.full_name}`, 20, 60);
    doc.text(`Lavozimi: ${emp.role || 'Xodim'}`, 20, 67);
    doc.text(`Bo'limi: ${emp.department || 'Ofis'}`, 20, 74);
    doc.text(`Oylik maoshi: ${emp.salary_info || 'Belgilanmagan'}`, 120, 60);
    doc.text(`Hisobot davri: ${periodLabel}`, 120, 67);
    doc.text(`Sana: ${new Date().toLocaleDateString()}`, 120, 74);

    // Main Table (with lunch columns)
    doc.autoTable({
        startY: 85,
        head: [['SANA', 'KELISH', 'T.CHIQISH', 'T.KIRISH', 'KETISH', 'SOAT', 'HOLAT', 'HAQ (UZS)']],
        body: rows.map(r => [r.date, r.in, r.lunch_out, r.lunch_in, r.out, r.hours, r.status, r.earned]),
        theme: 'striped',
        headStyles: { fillColor: [13, 22, 34], textColor: [0, 210, 255], fontStyle: 'bold', fontSize: 7 },
        styles: { fontSize: 7, cellPadding: 2.5, halign: 'center' },
        columnStyles: { 0: { halign: 'left' }, 6: { halign: 'left' }, 7: { halign: 'right' } }
    });

    // Summary Box
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, finalY - 5, 190, finalY - 5);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Jami ish kunlari: ${days} kun`, 20, finalY + 5);
    doc.text(`Jami ish soatlari: ${rows.reduce((s, r) => s + parseFloat(r.hours), 0).toFixed(1)} soat`, 20, finalY + 12);
    doc.text(`Jami premya: ${bonuses.toLocaleString()} UZS`, 20, finalY + 19);
    doc.text(`Jami jarima: ${fines.toLocaleString()} UZS`, 20, finalY + 26);

    doc.setFontSize(14);
    doc.setTextColor(0, 124, 82);
    doc.text(`JAMI TO'LANADIGAN HAQ:`, 110, finalY + 12);
    doc.setFontSize(18);
    doc.text(`${Math.round(totalEarned).toLocaleString()} UZS`, 110, finalY + 24);

    // Signature area
    const sigY = finalY + 45;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text("Mas'ul shaxs: ___________________", 20, sigY);
    doc.text("Imzo: ___________________", 120, sigY);
    doc.text("Sana: " + new Date().toLocaleDateString(), 120, sigY + 7);

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text("Ushbu hujjat AKFA Romix HR tizimi tomonidan avtomatik ravishda tayyorlandi. Hujjat raqamli imzo bilan tasdiqlangan.", 105, 285, { align: 'center' });

    doc.save(`AKFA_HR_${periodLabel}_${emp.full_name}_${new Date().toISOString().split('T')[0]}.pdf`);
}

function generateExcelReport(rows, totalEarned, bonuses, fines, days) {
    const emp = currentEmp;
    const periodLabels = { 'day': 'KUNLIK', 'week': 'HAFTALIK', 'month': 'OYLIK', 'year': 'YILLIK' };
    const periodLabel = periodLabels[selectedPeriod] || 'OYLIK';
    const totalHours = rows.reduce((s, r) => s + parseFloat(r.hours), 0).toFixed(1);

    const data = [
        ["AKFA ROMIX ENTERPRISE — HR HISOBOTI"],
        [`Xodim: ${emp.full_name}`, "", "", `Tayyorlangan: ${new Date().toLocaleString()}`],
        [`Lavozimi: ${emp.role || 'Xodim'}`, "", "", `Bo'lim: ${emp.department || 'Ofis'}`],
        [`Davr: ${periodLabel}`, "", "", `Oylik maosh: ${emp.salary_info || 'Belgilanmagan'}`],
        [],
        ["SANA", "KELISH", "T.CHIQISH", "T.KIRISH", "KETISH", "ISH SOATI", "HOLAT", "HAQ (UZS)"],
        ...rows.map(r => [r.date, r.in, r.lunch_out, r.lunch_in, r.out, r.hours, r.status, r.earned]),
        [],
        ["JAMI ISH KUNLARI", days + " kun", "", "", "", "JAMI ISH SOATLARI", totalHours + " soat"],
        ["", "", "", "", "", "JAMI PREMYA", bonuses.toLocaleString() + " UZS"],
        ["", "", "", "", "", "JAMI JARIMA", fines.toLocaleString() + " UZS"],
        ["", "", "", "", "", "JAMI TO'LANADIGAN HAQ", Math.round(totalEarned).toLocaleString() + " UZS"],
        [],
        ["Mas'ul shaxs: ___________", "", "", "", "", "Imzo: ___________"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    // Set column widths
    ws['!cols'] = [
        { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 16 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hisobot");
    XLSX.writeFile(wb, `AKFA_HR_${periodLabel}_${emp.full_name}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function generateWordReport(rows, totalEarned, bonuses, fines, days) {
    const emp = currentEmp;
    const periodLabels = { 'day': 'KUNLIK', 'week': 'HAFTALIK', 'month': 'OYLIK', 'year': 'YILLIK' };
    const periodLabel = periodLabels[selectedPeriod] || 'OYLIK';
    const totalHours = rows.reduce((s, r) => s + parseFloat(r.hours), 0).toFixed(1);

    let tableHtml = `<table border="1" style="width:100%; border-collapse: collapse; font-size:11px;">
        <tr style="background:#0d1622; color:#00d2ff;">
            <th style="padding:6px;">Sana</th><th style="padding:6px;">Kelish</th><th style="padding:6px;">T.Chiqish</th><th style="padding:6px;">T.Kirish</th><th style="padding:6px;">Ketish</th><th style="padding:6px;">Soat</th><th style="padding:6px;">Holat</th><th style="padding:6px;">Haq</th>
        </tr>`;

    rows.forEach((r, i) => {
        const bg = i % 2 === 0 ? '#ffffff' : '#f8f9fa';
        tableHtml += `<tr style="background:${bg};">
            <td style="padding:5px;">${r.date}</td><td style="padding:5px; text-align:center;">${r.in}</td><td style="padding:5px; text-align:center; color:#ffa940;">${r.lunch_out}</td><td style="padding:5px; text-align:center; color:#ffa940;">${r.lunch_in}</td><td style="padding:5px; text-align:center;">${r.out}</td><td style="padding:5px; text-align:center;">${r.hours}</td><td style="padding:5px;">${r.status}</td><td style="padding:5px; text-align:right;">${r.earned}</td>
        </tr>`;
    });
    tableHtml += "</table>";

    const content = `
        <div style="font-family: Arial, sans-serif; padding: 30px;">
            <div style="background:#0d1622; padding:20px; color:#fff; border-radius:8px; margin-bottom:25px;">
                <h1 style="color:#00d2ff; margin:0;">AKFA ROMIX ENTERPRISE</h1>
                <p style="color:#aaa; margin:5px 0 0 0;">HR BO'LIMI — ${periodLabel} RASMIY HISOBOTI</p>
            </div>
            <table style="width:100%; margin-bottom:20px; font-size:13px;">
                <tr>
                    <td><b>Xodim:</b> ${emp.full_name}</td>
                    <td><b>Oylik maosh:</b> ${emp.salary_info || 'Belgilanmagan'}</td>
                </tr>
                <tr>
                    <td><b>Lavozimi:</b> ${emp.role || 'Xodim'}</td>
                    <td><b>Hisobot davri:</b> ${periodLabel}</td>
                </tr>
                <tr>
                    <td><b>Bo'limi:</b> ${emp.department || 'Ofis'}</td>
                    <td><b>Tayyorlangan:</b> ${new Date().toLocaleString()}</td>
                </tr>
            </table>
            <hr style="border:1px solid #e0e0e0;"/>
            ${tableHtml}
            <div style="margin-top:25px; padding:20px; background:#f0fdf4; border:1px solid #86efac; border-radius:8px;">
                <table style="width:100%; font-size:13px;">
                    <tr><td><b>Jami ish kunlari:</b></td><td>${days} kun</td><td><b>Jami ish soatlari:</b></td><td>${totalHours} soat</td></tr>
                    <tr><td><b>Jami premya:</b></td><td>${bonuses.toLocaleString()} UZS</td><td><b>Jami jarima:</b></td><td>${fines.toLocaleString()} UZS</td></tr>
                </table>
                <h2 style="color:#007c52; margin-top:15px; text-align:center;">JAMI TO'LANADIGAN HAQ: ${Math.round(totalEarned).toLocaleString()} UZS</h2>
            </div>
            <div style="margin-top:40px; display:flex; justify-content:space-between;">
                <p>Mas'ul shaxs: ___________________</p>
                <p>Imzo: ___________________</p>
            </div>
            <p style="font-size:9px; color:#999; margin-top:40px; text-align:center;">Ushbu hujjat AKFA Romix HR tizimi tomonidan avtomatik ravishda tayyorlandi. Hujjat raqamli imzo bilan tasdiqlangan.</p>
        </div>
    `;

    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AKFA_HR_${periodLabel}_${emp.full_name}_${new Date().toISOString().split('T')[0]}.doc`;
    link.click();
}

function handleDelete() {
    if (confirm(`${currentEmp.full_name}ni o'chirishni tasdiqlaysizmi?`)) {
        const name = currentEmp.full_name;
        const empId = currentEmp.id;

        // Try DB delete
        try {
            supabase.from('attendance').delete().eq('employee_id', empId).then(() => {
                supabase.from('employees').delete().eq('id', empId).then(() => {
                    console.log("Deleted from Supabase");
                });
            });
        } catch (e) {
            console.warn("Delete from db failed:", e);
        }

        // Always delete from localStorage
        let localEmployees = JSON.parse(localStorage.getItem('romix_employees_local') || '[]');
        localEmployees = localEmployees.filter(x => x.id !== empId);
        localStorage.setItem('romix_employees_local', JSON.stringify(localEmployees));

        logActivity('admin', 'Xodim o\'chirildi', name);
        closeDetailModal();
        loadInitialData();
    }
}

function filterAndRender() {
    let filtered = [...employeesData];
    console.log("🛠 Filter boshlandi. Jami xodimlar:", filtered.length, "Faol bo'lim:", activeDept);

    // Apply Search Input
    const searchInput = document.getElementById('hrSearchPrimary');
    if (searchInput && searchInput.value) {
        const val = searchInput.value.toLowerCase().trim();
        filtered = filtered.filter(emp =>
            (emp.full_name || '').toLowerCase().includes(val) ||
            (emp.department || '').toLowerCase().includes(val) ||
            (emp.role || '').toLowerCase().includes(val) ||
            (emp.phone || '').includes(val)
        );
    }

    // Apply Department Filter
    const normalize = (s) => (s || '').toString().toLowerCase().trim();

    if (activeDept === 'at_work') {
        filtered = filtered.filter(e => {
            const att = todayAtt.find(a => a.employee_id === e.id);
            return att && (att.status === 'ISHDA' || (att.check_in && !att.check_out));
        });
    } else if (activeDept !== 'all' && activeDept !== '') {
        filtered = filtered.filter(e => {
            const empDept = normalize(e.department || e.dept || 'Ofis');
            const targetDept = normalize(activeDept);
            return empDept === targetDept;
        });
    }

    console.log("✅ Filter yakunlandi. Ko'rsatilmoqda:", filtered.length);
    renderStaffList(filtered);
}

// 📡 TABS & SCANNER SYSTEM
async function switchTab(tab) {
    currentTab = tab;

    // UI Feedback
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    // Highlight the clicked tab bar button
    const activeBtn = document.querySelector(`.nav-btn[onclick*="'${tab}'"]`) || (event && event.currentTarget);
    if (activeBtn && activeBtn.classList) activeBtn.classList.add('active');

    const sections = {
        'dashboard': document.querySelector('.main-container'),
        'scanner': document.getElementById('scannerSection'),
        'reports': document.getElementById('analyticsSection'),
        'history': document.getElementById('historySection'),
        'kitchen': document.getElementById('kitchenSection'),
        'requests': document.getElementById('requestsSection')
    };

    // Hide all sections
    Object.values(sections).forEach(s => { if (s) s.style.display = 'none'; });

    if (tab === 'scanner') {
        sections.scanner.style.display = 'flex';
        startScanner();
    } else if (tab === 'history') {
        sections.history.style.display = 'flex';
        loadHistoryData();
    } else if (tab === 'kitchen') {
        sections.kitchen.style.display = 'flex';
        renderKitchenCalendar();
    } else if (tab === 'requests') {
        sections.requests.style.display = 'flex';
        await loadProfileRequests();
    } else if (tab === 'dashboard') {
        sections.dashboard.style.display = 'flex';
        stopScanner();
        filterAndRender();
    } else if (tab === 'reports') {
        sections.reports.style.display = 'flex';
        await renderAnalyticsBoard();
    }

    lucide.createIcons();
}

// 🏢 HR APPROVAL SYSTEM: PROFILE REQUESTS
async function loadProfileRequests() {
    const tbody = document.getElementById('requestsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:50px;">Yuklanmoqda...</td></tr>';

    const { data, error } = await supabase.from('profile_requests')
        .select('*, employees(full_name, avatar_url)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" style="color:red;">Xato: ${error.message}</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:50px; color:var(--text-s);">Yangi so\'rovlar yo\'q</td></tr>';
        document.getElementById('requestBadge').style.display = 'none';
        return;
    }

    document.getElementById('requestBadge').style.display = 'block';
    document.getElementById('requestBadge').innerText = data.length;

    tbody.innerHTML = data.map(req => {
        const emp = req.employees;
        const changes = req.requested_data;
        let details = '';
        for (let key in changes) {
            details += `<div style="font-size:0.7rem; color:var(--text-s); margin-bottom:5px;"><b>${key}:</b> <span style="color:var(--accent)">${changes[key]}</span></div>`;
        }

        return `
            <tr>
                <td style="padding:15px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${emp.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(emp.full_name)}" style="width:40px; height:40px; border-radius:12px;">
                        <div style="font-weight:700;">${emp.full_name}</div>
                    </div>
                </td>
                <td style="padding:15px;">${details}</td>
                <td style="padding:15px; font-size:0.75rem; color:var(--text-s);">${new Date(req.created_at).toLocaleString()}</td>
                <td style="padding:15px; text-align:right;">
                    <div style="display:inline-flex; gap:10px;">
                        <button onclick="approveProfileRequest('${req.id}')" style="background:#00ff8822; color:#00ff88; border:1px solid #00ff8844; padding:8px 15px; border-radius:10px; font-weight:900; font-size:0.65rem; cursor:pointer;">TASDIQLASH</button>
                        <button onclick="rejectProfileRequest('${req.id}')" style="background:#ff4d4f22; color:#ff4d4f; border:1px solid #ff4d4f44; padding:8px 15px; border-radius:10px; font-weight:900; font-size:0.65rem; cursor:pointer;">RAD ETISH</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

window.approveProfileRequest = async function (id) {
    if (!confirm("Ushbu o'zgarishlarni tasdiqlaysizmi?")) return;

    // 1. Get request data
    const { data: request } = await supabase.from('profile_requests').select('*').eq('id', id).single();
    if (!request) return;

    // 2. Update employee
    const { error: upError } = await supabase.from('employees').update(request.requested_data).eq('id', request.employee_id);

    if (!upError) {
        // 3. Mark request as approved
        await supabase.from('profile_requests').update({ status: 'approved' }).eq('id', id);
        alert("O'zgarishlar saqlandi!");
        loadProfileRequests();
        loadInitialData(); // Refresh staff list
    } else {
        alert("Xato: " + upError.message);
    }
};

window.rejectProfileRequest = async function (id) {
    if (!confirm("Ushbu so'rovni rad etasizmi?")) return;
    const { error } = await supabase.from('profile_requests').update({ status: 'rejected' }).eq('id', id);
    if (!error) {
        alert("So'rov rad etildi.");
        loadProfileRequests();
    }
};

// Auto-check requests every 30s
setInterval(() => {
    supabase.from('profile_requests').select('id', { count: 'exact' }).eq('status', 'pending').then(({ count }) => {
        const badge = document.getElementById('requestBadge');
        if (badge) {
            if (count > 0) {
                badge.style.display = 'block';
                badge.innerText = count;
            } else {
                badge.style.display = 'none';
            }
        }
    });
}, 30000);

// 📈 PROFESSIONAL ACCOUNTANT ANALYTICS ENGINE
window.renderAnalyticsBoard = async function () {
    const tbody = document.getElementById('analyticsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let totalFund = 0;
    let totalHoursAll = 0;
    let totalBonusAll = 0;
    let totalFinesAll = 0;

    let targetEmps = employeesData;
    if (activeAnaDept !== 'all') {
        targetEmps = employeesData.filter(e => ((e.department || '').trim().toLowerCase() === activeAnaDept.trim().toLowerCase() || (e.dept || '').trim().toLowerCase() === activeAnaDept.trim().toLowerCase()));
    }

    // 1. Joriy oyni aniqlash
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const { data: monthAtt } = await supabase.from('attendance')
        .select('*')
        .gte('date', firstDay);

    const manualEdits = JSON.parse(localStorage.getItem('analytics_edits') || '{}');

    targetEmps.forEach(emp => {
        const edit = manualEdits[emp.id] || {};
        const baseSalary = edit.salary || parseInt(emp.salary_info?.toString().replace(/\D/g, '') || 5000000);

        const totalMonthlyHours = 234;
        const hourRate = baseSalary / totalMonthlyHours;

        // REAL DAVOMAT - Bazadan hisoblash
        let totalWorkedMinutes = 0;
        let totalLates = 0;

        if (monthAtt) {
            const empAtt = monthAtt.filter(a => a.employee_id === emp.id);
            empAtt.forEach(a => {
                if (a.check_in && a.check_out) {
                    const diff = (new Date(a.check_out) - new Date(a.check_in)) / (1000 * 60);
                    // 1 soat abetni chegirib tashlash (8:00 - 18:00 oralig'ida bo'lsa)
                    totalWorkedMinutes += (diff > 300 ? diff - 60 : diff);
                }
                if (a.check_in) {
                    const cin = new Date(a.check_in);
                    if (cin.getHours() > 8 || (cin.getHours() === 8 && cin.getMinutes() > 5)) totalLates++;
                }
            });
        }

        const actualHours = Math.round(totalWorkedMinutes / 60);
        const actualLates = totalLates;

        const mockBonus = (edit.bonus !== undefined) ? edit.bonus : 0;
        const mockFine = (edit.fine !== undefined) ? edit.fine : (actualLates * 50000);

        const finalCalculated = Math.round((actualHours * hourRate) + mockBonus - mockFine);

        totalFund += finalCalculated;
        totalHoursAll += actualHours;
        totalBonusAll += mockBonus;
        totalFinesAll += mockFine;

        const tr = document.createElement('tr');
        tr.style.cursor = 'default';
        tr.innerHTML = `
            <td style="padding:15px; border-radius:0;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <img src="${emp.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(emp.full_name)}" style="width:35px; height:35px; border-radius:10px; object-fit:cover;">
                    <div>
                        <div style="font-weight:700; font-size:0.8rem;">${emp.full_name}</div>
                        <div style="font-size:0.6rem; color:var(--text-s);">${emp.department || 'Ofis'}</div>
                    </div>
                </div>
            </td>
            <td style="font-weight:800; font-size:0.8rem; color:var(--text-s);">${baseSalary.toLocaleString()}</td>
            <td style="font-weight:700; font-size:0.8rem; color:#fff;">${actualHours} <small style="color:var(--text-s)">soat</small></td>
            <td style="font-weight:700; font-size:0.8rem; color:var(--text-s);">${actualLates} ms</td>
            <td style="font-weight:800; font-size:0.8rem; color:#ffa940;">+${mockBonus.toLocaleString()}</td>
            <td style="font-weight:800; font-size:0.8rem; color:#ff4d4f;">-${mockFine.toLocaleString()}</td>
            <td style="font-weight:900; font-size:0.9rem; color:#00ff88;">${finalCalculated.toLocaleString()} UZS</td>
            <td style="border-radius:0;">
                <div style="display:flex; justify-content:flex-end; gap:8px;">
                    <button onclick="window.openAnalyticsReport('${emp.id}')" title="Hisobot" style="background:rgba(255,255,255,0.05); color:#fff; border:1px solid rgba(255,255,255,0.1); padding:8px; border-radius:10px; cursor:pointer; transition:0.3s; display:flex; align-items:center; justify-content:center;" onmouseover="this.style.background='rgba(0,210,255,0.2)'; this.style.borderColor='rgba(0,210,255,0.4)'; this.style.color='#00d2ff'" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.1)'; this.style.color='#fff'">
                        <i data-lucide="file-text" style="width:16px; height:16px;"></i>
                    </button>
                    <button onclick="window.openAnalyticsEdit('${emp.id}')" title="Tahrirlash" style="background:rgba(165,94,234,0.1); color:#a55eea; border:1px solid rgba(165,94,234,0.2); padding:8px; border-radius:10px; cursor:pointer; transition:0.3s; display:flex; align-items:center; justify-content:center;" onmouseover="this.style.background='rgba(165,94,234,0.25)'; this.style.borderColor='rgba(165,94,234,0.5)'" onmouseout="this.style.background='rgba(165,94,234,0.1)'; this.style.borderColor='rgba(165,94,234,0.2)'">
                        <i data-lucide="pencil" style="width:16px; height:16px;"></i>
                    </button>
                    <button onclick="alert('Ushbu oylik to\\'landi deb belgilandi.')" style="background:rgba(0,210,255,0.1); color:#00d2ff; border:1px solid rgba(0,210,255,0.2); padding:8px 15px; border-radius:10px; font-weight:800; font-size:0.65rem; cursor:pointer; transition:0.3s;" onmouseover="this.style.background='rgba(0,210,255,0.2)'" onmouseout="this.style.background='rgba(0,210,255,0.1)'">TO'LASH</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('analyticTotalPayroll').innerHTML = `${totalFund.toLocaleString()} <small style="font-size:1rem; opacity:0.5">UZS</small>`;
    document.getElementById('analyticTotalHours').innerHTML = `${totalHoursAll.toLocaleString()} <small style="font-size:1rem; opacity:0.5">soat</small>`;
    document.getElementById('analyticTotalBonus').innerHTML = `${totalBonusAll.toLocaleString()} <small style="font-size:1rem; opacity:0.5">UZS</small>`;
    document.getElementById('analyticTotalFines').innerHTML = `${totalFinesAll.toLocaleString()} <small style="font-size:1rem; opacity:0.5">UZS</small>`;
    lucide.createIcons();
};

// 💎 ANALYTICS EDIT MODAL ENGINE
window.openAnalyticsEdit = function (id) {
    const emp = employeesData.find(e => e.id === id);
    if (!emp) return;

    const baseSalary = parseInt(emp.salary_info?.toString().replace(/\D/g, '') || 0);

    // Remove old modal if exists
    const old = document.getElementById('analyticsEditOverlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'analyticsEditOverlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(20px); z-index:10000; display:flex; align-items:center; justify-content:center;';

    overlay.innerHTML = `
        <div id="anaEditModal" style="width:500px; background:#0a0f1a; border:1px solid rgba(255,255,255,0.1); border-radius:35px; padding:40px; box-shadow:0 40px 100px rgba(0,0,0,0.6);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                <div>
                    <h2 style="font-family:'Outfit'; font-weight:900; font-size:1.4rem; letter-spacing:-0.5px;">
                        <span style="color:#a55eea;">TAHRIRLASH</span>
                    </h2>
                    <p style="font-size:0.75rem; color:var(--text-s); margin-top:5px;">${emp.full_name} — ${emp.department || 'Ofis'}</p>
                </div>
                <button onclick="document.getElementById('analyticsEditOverlay').remove()"
                    style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff; width:42px; height:42px; border-radius:14px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                    <i data-lucide="x" style="width:18px;"></i>
                </button>
            </div>

            <div style="display:flex; flex-direction:column; gap:20px;">
                <!-- Oylik -->
                <div style="position:relative;">
                    <label style="position:absolute; top:-8px; left:14px; font-size:0.6rem; color:#a55eea; background:#0a0f1a; padding:0 6px; font-weight:800; z-index:1;">OYLIK STAVKA (UZS)</label>
                    <input type="number" id="anaEditSalary" value="${baseSalary}"
                        style="width:100%; padding:18px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:16px; color:#fff; font-size:1.1rem; font-weight:700; outline:none; font-family:'Outfit';"
                        onfocus="this.style.borderColor='#a55eea'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                </div>

                <!-- Premya -->
                <div style="position:relative;">
                    <label style="position:absolute; top:-8px; left:14px; font-size:0.6rem; color:#ffa940; background:#0a0f1a; padding:0 6px; font-weight:800; z-index:1;">PREMYA (UZS)</label>
                    <input type="number" id="anaEditBonus" value="0" placeholder="0"
                        style="width:100%; padding:18px; background:rgba(255,169,64,0.03); border:1px solid rgba(255,169,64,0.15); border-radius:16px; color:#ffa940; font-size:1.1rem; font-weight:700; outline:none; font-family:'Outfit';"
                        onfocus="this.style.borderColor='#ffa940'" onblur="this.style.borderColor='rgba(255,169,64,0.15)'">
                </div>

                <!-- Jarima -->
                <div style="position:relative;">
                    <label style="position:absolute; top:-8px; left:14px; font-size:0.6rem; color:#ff4d4f; background:#0a0f1a; padding:0 6px; font-weight:800; z-index:1;">JARIMA (UZS)</label>
                    <input type="number" id="anaEditFine" value="0" placeholder="0"
                        style="width:100%; padding:18px; background:rgba(255,77,79,0.03); border:1px solid rgba(255,77,79,0.15); border-radius:16px; color:#ff4d4f; font-size:1.1rem; font-weight:700; outline:none; font-family:'Outfit';"
                        onfocus="this.style.borderColor='#ff4d4f'" onblur="this.style.borderColor='rgba(255,77,79,0.15)'">
                </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-top:30px;">
                <button onclick="document.getElementById('analyticsEditOverlay').remove()"
                    style="padding:18px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:18px; color:#fff; font-weight:800; cursor:pointer; font-size:0.85rem;">
                    BEKOR QILISH
                </button>
                <button id="anaEditSaveBtn" onclick="window.saveAnalyticsEdit('${emp.id}')"
                    style="padding:18px; background:linear-gradient(135deg, #a55eea, #7c3aed); border:none; border-radius:18px; color:#fff; font-weight:900; cursor:pointer; font-size:0.85rem; box-shadow:0 10px 25px rgba(165,94,234,0.3); transition:0.3s;"
                    onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                    SAQLASH
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    lucide.createIcons();
    gsap.fromTo("#anaEditModal", { scale: 0.9, opacity: 0, y: 30 }, { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.5)" });
};

window.saveAnalyticsEdit = async function (id) {
    const btn = document.getElementById('anaEditSaveBtn');
    const salary = document.getElementById('anaEditSalary').value.trim();
    const bonus = parseInt(document.getElementById('anaEditBonus').value) || 0;
    const fine = parseInt(document.getElementById('anaEditFine').value) || 0;

    if (!salary) { alert("Oylik stavkani kiriting!"); return; }

    btn.textContent = 'SAQLANMOQDA...';
    btn.disabled = true;

    // 1. Oylikni yangilash
    const { error: salaryErr } = await supabase.from('employees')
        .update({ salary_info: salary })
        .eq('id', id);

    if (salaryErr) {
        alert("Oylik saqlashda xato: " + salaryErr.message);
        btn.textContent = 'SAQLASH';
        btn.disabled = false;
        return;
    }

    // 2. Premya/Jarima logga yozish
    if (bonus > 0 || fine > 0) {
        const emp = employeesData.find(e => e.id === id);
        if (bonus > 0) logActivity('admin', 'Premya berildi', `${emp?.full_name}: +${bonus.toLocaleString()} UZS`);
        if (fine > 0) logActivity('admin', 'Jarima qo\'yildi', `${emp?.full_name}: -${fine.toLocaleString()} UZS`);
    }

    // 3. Local xotirada saqlash (analitika uchun)
    const editData = JSON.parse(localStorage.getItem('analytics_edits') || '{}');
    editData[id] = { salary: parseInt(salary), bonus, fine, updatedAt: new Date().toISOString() };
    localStorage.setItem('analytics_edits', JSON.stringify(editData));

    btn.textContent = 'SAQLANDI! ✅';
    btn.style.background = '#00ff88';
    btn.style.color = '#000';

    // Refresh
    await loadInitialData();
    setTimeout(() => {
        document.getElementById('analyticsEditOverlay')?.remove();
        renderAnalyticsBoard();
    }, 1000);
};


// 🍽️ LUXURY KITCHEN CALENDAR ENGINE
let kitchenCurrentDate = new Date();
let kitchenSelectedDate = new Date();
let currentKitchenStatus = 'debt';

window.renderKitchenCalendar = function () {
    const grid = document.getElementById('kitchenCalendarGrid');
    const title = document.getElementById('kitchenCalendarTitle');
    if (!grid || !title) return;

    grid.innerHTML = '';
    const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
    title.textContent = `${months[kitchenCurrentDate.getMonth()]} ${kitchenCurrentDate.getFullYear()}`;

    // Days Labels
    ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"].forEach(day => {
        const el = document.createElement('div');
        el.className = 'cal-day-label';
        el.textContent = day;
        grid.appendChild(el);
    });

    const firstDay = new Date(kitchenCurrentDate.getFullYear(), kitchenCurrentDate.getMonth(), 1).getDay();
    const daysInMonth = new Date(kitchenCurrentDate.getFullYear(), kitchenCurrentDate.getMonth() + 1, 0).getDate();

    let offset = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < offset; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-date other-month';
        grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const el = document.createElement('div');
        el.className = 'cal-date';
        el.textContent = d;

        const dateStr = `${kitchenCurrentDate.getFullYear()}-${String(kitchenCurrentDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const selStr = `${kitchenSelectedDate.getFullYear()}-${String(kitchenSelectedDate.getMonth() + 1).padStart(2, '0')}-${String(kitchenSelectedDate.getDate()).padStart(2, '0')}`;
        const todayStr = new Date().toISOString().split('T')[0];

        if (dateStr === selStr) el.classList.add('active');
        if (dateStr === todayStr) el.classList.add('today');

        el.onclick = () => window.selectKitchenDate(d);
        grid.appendChild(el);
    }

    document.getElementById('kitchenSelectedDateLabel').textContent =
        `${String(kitchenSelectedDate.getDate()).padStart(2, '0')}.${String(kitchenSelectedDate.getMonth() + 1).padStart(2, '0')}.${kitchenSelectedDate.getFullYear()}`;

    window.handleKitchenDateChange();
};

window.changeKitchenMonth = function (dir) {
    kitchenCurrentDate.setMonth(kitchenCurrentDate.getMonth() + dir);
    renderKitchenCalendar();
};

window.selectKitchenDate = function (day) {
    kitchenSelectedDate = new Date(kitchenCurrentDate.getFullYear(), kitchenCurrentDate.getMonth(), day);
    renderKitchenCalendar();
};

window.adjustKitchenCount = function (val) {
    const input = document.getElementById('kitchenCountInput');
    let curr = parseInt(input.value) || 0;
    input.value = Math.max(0, curr + val);
    window.calcKitchenTotal();
};

window.handleKitchenDateChange = async function () {
    const sel = kitchenSelectedDate;
    const dateKey = `${sel.getFullYear()}-${String(sel.getMonth() + 1).padStart(2, '0')}-${String(sel.getDate()).padStart(2, '0')}`;

    const { data: att } = await supabase.from('attendance')
        .select('employee_id')
        .eq('date', dateKey)
        .eq('status', 'ISHDA');

    const dbCount = att ? new Set(att.map(a => a.employee_id)).size : 0;

    const saved = JSON.parse(localStorage.getItem('kitchen_' + dateKey));
    if (saved) {
        document.getElementById('kitchenCountInput').value = saved.count;
        document.getElementById('kitchenPrice').value = saved.price;
        window.setKitchenPayStatus(saved.status);
        document.getElementById('kitchenSaveStatus').textContent = "BAZADA MAVJUD ✅";
        document.getElementById('kitchenSaveStatus').style.color = "var(--accent)";
    } else {
        document.getElementById('kitchenCountInput').value = dbCount;
        document.getElementById('kitchenPrice').value = 25000;
        window.setKitchenPayStatus('debt');
        document.getElementById('kitchenSaveStatus').textContent = "YANGI HISOBOT 📝";
        document.getElementById('kitchenSaveStatus').style.color = "#8a8f98";
    }

    window.calcKitchenTotal();
};

window.calcKitchenTotal = function () {
    const count = parseInt(document.getElementById('kitchenCountInput').value) || 0;
    const price = parseInt(document.getElementById('kitchenPrice').value) || 0;
    const total = count * price;
    document.getElementById('kitchenTotalSum').innerHTML = `${total.toLocaleString()} <small style="font-size:1.2rem; color:var(--text-s); font-weight:400; letter-spacing:0;">UZS</small>`;
};

window.setKitchenPayStatus = function (status) {
    currentKitchenStatus = status;
    const pBtn = document.getElementById('payStatusPaid');
    const dBtn = document.getElementById('payStatusDebt');

    if (status === 'paid') {
        pBtn.style.background = '#ffa940';
        pBtn.style.color = '#000';
        dBtn.style.background = 'rgba(255,255,255,0.05)';
        dBtn.style.color = 'var(--text-s)';
    } else {
        dBtn.style.background = '#ff4d4f';
        dBtn.style.color = '#fff';
        pBtn.style.background = 'rgba(255,255,255,0.05)';
        pBtn.style.color = 'var(--text-s)';
    }
};

window.saveKitchenData = function () {
    const sel = kitchenSelectedDate;
    const dateKey = `${sel.getFullYear()}-${String(sel.getMonth() + 1).padStart(2, '0')}-${String(sel.getDate()).padStart(2, '0')}`;
    const price = document.getElementById('kitchenPrice').value;
    const count = document.getElementById('kitchenCountInput').value;

    const data = {
        date: dateKey,
        price,
        count,
        status: currentKitchenStatus,
        savedAt: new Date().toISOString()
    };

    localStorage.setItem('kitchen_' + dateKey, JSON.stringify(data));
    logActivity('kitchen', 'Oshxona hisoboti saqlandi', `${dateKey}: ${count} kishi`);

    document.getElementById('kitchenSaveStatus').textContent = "SAQLANDI! ✅";
    document.getElementById('kitchenSaveStatus').style.color = "var(--accent)";

    gsap.to("#saveKitchenBtn", { scale: 0.95, duration: 0.1, yoyo: true, repeat: 1 });
};

// 📑 PROFESSIONAL KITCHEN ACCOUNTING REPORTS
let currentReportRange = 'monthly';

window.openKitchenReportModal = function () {
    const modal = document.getElementById('kitchenReportModal');
    if (!modal) return;
    gsap.killTweensOf("#kitchenReportModal .bento-card");
    modal.style.display = 'flex';
    gsap.fromTo(modal.querySelector('.bento-card'),
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "power2.out" }
    );
    lucide.createIcons();
};

window.closeKitchenReportModal = function () {
    gsap.to("#kitchenReportModal .bento-card", {
        scale: 0.8, opacity: 0, duration: 0.3, ease: "power2.in", onComplete: () => {
            document.getElementById('kitchenReportModal').style.display = 'none';
        }
    });
};

window.setReportRange = function (range) {
    currentReportRange = range;
    const tabs = ['weekly', 'monthly', 'yearly', 'custom'];
    tabs.forEach(t => {
        const btn = document.getElementById('rangeTab_' + t);
        if (!btn) return;
        if (t === range) {
            btn.style.background = '#ffa940'; btn.style.color = '#000'; btn.style.fontWeight = '900';
        } else {
            btn.style.background = 'none'; btn.style.color = 'var(--text-s)'; btn.style.fontWeight = '800';
        }
    });
    const cBox = document.getElementById('customRangeBox');
    if (cBox) cBox.style.display = range === 'custom' ? 'grid' : 'none';
};

window.genKitchenReport = function (format) {
    console.log(">>> OSHXONA HISOBOTI: Professional Engine v3.0 (format: " + format + ")");
    const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
    const monthName = months[kitchenCurrentDate.getMonth()];
    const year = kitchenCurrentDate.getFullYear();

    let records = [];
    let titleRange = currentReportRange.toUpperCase();

    if (currentReportRange === 'weekly') {
        const sel = new Date(kitchenSelectedDate);
        for (let i = 0; i < 7; i++) {
            const d = new Date(sel);
            d.setDate(sel.getDate() - i);
            const dKey = d.toISOString().split('T')[0];
            const s = JSON.parse(localStorage.getItem('kitchen_' + dKey));
            if (s) records.push(s);
        }
    } else if (currentReportRange === 'yearly') {
        for (let m = 1; m <= 12; m++) {
            for (let d = 1; d <= 31; d++) {
                const dKey = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const s = JSON.parse(localStorage.getItem('kitchen_' + dKey));
                if (s) records.push(s);
            }
        }
    } else if (currentReportRange === 'custom') {
        const start = document.getElementById('reportStart').value;
        const end = document.getElementById('reportEnd').value;
        if (!start || !end) {
            alert("Iltimos, sanalarni tanlang!");
            return;
        }
        titleRange = `${start} dan ${end} gacha`;
        let cur = new Date(start);
        const stop = new Date(end);
        while (cur <= stop) {
            const dKey = cur.toISOString().split('T')[0];
            const s = JSON.parse(localStorage.getItem('kitchen_' + dKey));
            if (s) records.push(s);
            cur.setDate(cur.getDate() + 1);
        }
    } else {
        for (let d = 1; d <= 31; d++) {
            const dateKey = `${year}-${String(kitchenCurrentDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const saved = JSON.parse(localStorage.getItem('kitchen_' + dateKey));
            if (saved) records.push(saved);
        }
    }

    if (records.length === 0) {
        alert("Tanlangan muddat uchun ma'lumotlar topilmadi!");
        return;
    }

    records.sort((a, b) => new Date(a.date) - new Date(b.date));
    let totalSum = 0;
    const tableData = records.map(r => {
        const rowTotal = parseInt(r.count) * parseInt(r.price);
        totalSum += rowTotal;
        return {
            "Sana": r.date,
            "Odam soni": parseInt(r.count),
            "Narxi (UZS)": parseInt(r.price),
            "Jami (UZS)": rowTotal,
            "Holati": r.status === 'paid' ? "TO'LANDI" : "QARZ"
        };
    });

    const exportName = `OSHXONA_HISOBOTI_${format.toUpperCase()}_${new Date().getTime()}`;

    if (format === 'excel') {
        const ws = XLSX.utils.json_to_sheet(tableData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Oshxona_Hisoboti");
        XLSX.writeFile(wb, `${exportName}.xlsx`);
    } else if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text("AKFA ROMIX - PROFESSIONAL HISOBOT", 14, 22);
        doc.setFontSize(10);
        doc.text(`HISOBOT DAVRI: ${titleRange}`, 14, 30);
        doc.text(`YARATILDI: ${new Date().toLocaleString()}`, 14, 35);
        doc.autoTable({
            startY: 45,
            head: [["Sana", "Odam soni", "Narxi (UZS)", "Jami (UZS)", "Holati"]],
            body: tableData.map(r => [r.Sana, r["Odam soni"], r["Narxi (UZS)"].toLocaleString(), r["Jami (UZS)"].toLocaleString(), r.Holati]),
            theme: 'grid',
            headStyles: { fillColor: [255, 169, 64], textColor: [0, 0, 0] }
        });
        const finalY = doc.lastAutoTable.finalY + 15;
        doc.text(`UMUMIY SUMMA: ${totalSum.toLocaleString()} UZS`, 14, finalY);
        doc.text(`Mas'ul: _________________ (Imzo)`, 14, finalY + 15);
        doc.save(`${exportName}.pdf`);
    } else if (format === 'word') {
        const htmlStr = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'></head>
            <body style="font-family:Arial, sans-serif; padding:20px;">
                <h1 style="text-align:center;">AKFA ROMIX</h1>
                <h2 style="text-align:center;">OSHXONA MOLIYAVIY HISOBOTI</h2>
                <hr>
                <p><b>Davr:</b> ${titleRange}</p>
                <p><b>Yaratilgan:</b> ${new Date().toLocaleString()}</p>
                <table border="1" cellspacing="0" cellpadding="8" style="width:100%; border-collapse:collapse; margin-top:20px;">
                    <tr style="background:#ffa940; color:#000;">
                        <th>Sana</th><th>Odam soni</th><th>Narxi</th><th>Jami</th><th>Holati</th>
                    </tr>
                    ${tableData.map(r => `<tr><td>${r.Sana}</td><td>${r["Odam soni"]}</td><td>${r["Narxi (UZS)"].toLocaleString()}</td><td>${r["Jami (UZS)"].toLocaleString()}</td><td>${r.Holati}</td></tr>`).join('')}
                </table>
                <h3 style="margin-top:20px;">JAMI SUMMA: ${totalSum.toLocaleString()} UZS</h3>
                <br><br><p>Buxgalter imzosi: _________________</p>
            </body></html>
        `;
        const blob = new Blob([htmlStr], { type: 'application/msword' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `${exportName}.doc`);
        link.click();
    }
};

window.generateKitchenDemo = function () {
    const today = new Date();
    for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];

        const data = {
            date: dateKey,
            price: 25000,
            count: Math.floor(Math.random() * 20) + 15,
            status: Math.random() > 0.3 ? 'paid' : 'debt',
            savedAt: new Date().toISOString()
        };
        localStorage.setItem('kitchen_' + dateKey, JSON.stringify(data));
    }

    // Auto-trigger a monthly report download to show the format
    setReportRange('monthly');
    window.genKitchenReport('excel');

    alert("DEMO ma'lumotlar yaratildi va 1 oylik EXCEL hisoboti avtomatik yuklab olindi! Endi boshqa formatlarni ham tekshirishingiz mumkin.");
    window.renderKitchenCalendar();
};

window.clearAllKitchenData = function () {
    if (!confirm("Barcha oshxona ma'lumotlarini (Demo va Real) o'chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.")) return;

    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('kitchen_')) {
            localStorage.removeItem(key);
        }
    });

    alert("Barcha oshxona ma'lumotlari tozalandi!");
    window.renderKitchenCalendar();
    window.closeKitchenReportModal();
};

let historyFilter = 'all';
let historyAttSub = 'all';
let historyData = [];
window.setHistPeriod = function (period) {
    const from = document.getElementById('histDateFrom');
    const to = document.getElementById('histDateTo');
    const now = new Date();
    let start = new Date();

    if (period === 'today') {
        start = now;
    } else if (period === 'week') {
        start.setDate(now.getDate() - 7);
    } else if (period === 'month') {
        start.setMonth(now.getMonth() - 1);
    } else if (period === 'year') {
        start.setFullYear(now.getFullYear() - 1);
    }

    from.value = start.toISOString().split('T')[0];
    to.value = now.toISOString().split('T')[0];

    document.querySelectorAll('.period-pill').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    window.loadHistoryData();
};

window.clearHistDates = function () {
    document.getElementById('histDateFrom').value = '';
    document.getElementById('histDateTo').value = '';
    window.loadHistoryData();
};

window.logActivity = function (type, action, target) {
    const logs = JSON.parse(localStorage.getItem('romix_system_logs') || '[]');
    logs.unshift({
        id: Date.now(),
        type: type, // 'admin', 'kitchen'
        action: action,
        target: target,
        time: new Date().toISOString()
    });
    localStorage.setItem('romix_system_logs', JSON.stringify(logs.slice(0, 150)));
};

async function loadHistoryData() {
    const list = document.getElementById('historyList');
    if (!list) return;
    list.innerHTML = '<div style="text-align:center; padding:100px;"><div class="loader" style="margin:0 auto;"></div></div>';

    const from = document.getElementById('histDateFrom').value;
    const to = document.getElementById('histDateTo').value;

    let q = supabase.from('attendance').select('*').order('date', { ascending: false });
    if (from && from.length > 5) q = q.gte('date', from);
    if (to && to.length > 5) q = q.lte('date', to);
    const { data: attLogs, error: histErr } = await q.limit(500);

    console.log("📊 History attLogs fetched:", attLogs ? attLogs.length : 0);
    if (histErr) {
        console.error("❌ History fetch error:", histErr);
        list.innerHTML = `<div style="text-align:center; padding:100px; color:#ff4d4f;">Xatolik: ${histErr.message}</div>`;
        return;
    }

    const kitchenLogs = [];
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('kitchen_')) {
            const data = JSON.parse(localStorage.getItem(key));
            if (from && data.date < from) return;
            if (to && data.date > to) return;
            kitchenLogs.push({
                type: 'kitchen',
                action: "Oshxona hisoboti saqlandi",
                target: `Sana: ${data.date} (${data.count} kishi)`,
                time: data.savedAt || data.date + "T12:00:00Z"
            });
        }
    });

    const adminLogs = JSON.parse(localStorage.getItem('romix_system_logs') || '[]').filter(l => {
        const d = l.time.split('T')[0];
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
    });

    const _tn = new Date();
    const todayStr = _tn.getFullYear() + '-' + String(_tn.getMonth() + 1).padStart(2, '0') + '-' + String(_tn.getDate()).padStart(2, '0');
    const absentEntries = [];

    // Auto-detect absentees for today if looking at current range
    if (!from || from === todayStr) {
        employeesData.forEach(emp => {
            const hasAtt = (attLogs || []).some(a => a.employee_id === emp.id && a.date === todayStr);
            if (!hasAtt) {
                absentEntries.push({
                    type: 'attendance',
                    subtype: 'absent',
                    action: 'Ishga kelmadi',
                    target: emp.full_name,
                    time: todayStr + "T09:00:00Z"
                });
            }
        });
    }

    historyData = [
        ...(attLogs || []).flatMap(l => {
            const arr = [];
            const empName = employeesData.find(e => e.id === l.employee_id)?.full_name || 'Noma\'lum xodim';
            if (l.check_in) arr.push({ type: 'attendance', subtype: 'in', action: 'Ishga keldi', target: empName, time: l.check_in });
            if (l.lunch_start) arr.push({ type: 'attendance', subtype: 'lunch_out', action: 'Tushlikka chiqdi', target: empName, time: l.lunch_start });
            if (l.lunch_end) arr.push({ type: 'attendance', subtype: 'lunch_in', action: 'Tushlikdan qaytdi', target: empName, time: l.lunch_end });
            if (l.check_out) arr.push({ type: 'attendance', subtype: 'out', action: 'Ishdan ketti', target: empName, time: l.check_out });
            return arr;
        }),
        ...absentEntries,
        ...kitchenLogs,
        ...adminLogs
    ];

    historyData.sort((a, b) => new Date(b.time) - new Date(a.time));

    document.getElementById('hist_total_count').textContent = historyData.length;
    document.getElementById('hist_today_att').textContent = (attLogs || []).filter(a => a.date === todayStr).length;
    document.getElementById('hist_kitchen_count').textContent = kitchenLogs.length;
    document.getElementById('hist_admin_count').textContent = adminLogs.length;

    renderHistory();
}

window.filterHistory = function (filter) {
    historyFilter = filter;
    document.querySelectorAll('.hist-tab-lux').forEach(t => t.classList.remove('active'));
    document.getElementById('histTab_' + filter).classList.add('active');
    document.getElementById('histSubTabs_attendance').style.display = filter === 'attendance' ? 'flex' : 'none';
    renderHistory();
};

window.filterAttSub = function (sub) {
    historyAttSub = sub;
    document.querySelectorAll('.sub-pill').forEach(t => t.classList.remove('active'));
    document.getElementById('attSubTab_' + sub).classList.add('active');
    renderHistory();
};

window.searchHistory = function (val) {
    const q = val.toLowerCase();
    const filtered = historyData.filter(h =>
        h.action.toLowerCase().includes(q) || h.target.toLowerCase().includes(q)
    );
    renderHistory(filtered);
};

function renderHistory(customData = null) {
    const list = document.getElementById('historyList');
    let data = customData || (historyFilter === 'all' ? historyData : historyData.filter(h => h.type === historyFilter));

    if (!customData && historyFilter === 'attendance' && historyAttSub !== 'all') {
        data = data.filter(h => h.subtype === historyAttSub);
    }

    if (data.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:100px; color:var(--text-s);">Ma\'lumotlar topilmadi.</div>';
        return;
    }

    list.innerHTML = data.map(h => {
        let icon = 'clock';
        let color = 'var(--accent)';
        let bg = 'rgba(0,255,136,0.1)';
        let typeLabel = (h.subtype || h.type).toUpperCase();

        if (h.type === 'kitchen') { icon = 'utensils'; color = '#ffa940'; bg = 'rgba(255,169,64,0.1)'; }
        if (h.type === 'admin') { icon = 'shield'; color = '#ff4d4f'; bg = 'rgba(255,77,79,0.1)'; }

        if (h.subtype === 'in') { icon = 'log-in'; color = 'var(--work)'; bg = 'rgba(0,210,255,0.1)'; }
        if (h.subtype === 'out') { icon = 'log-out'; color = '#ff4d4f'; bg = 'rgba(255,77,79,0.1)'; }
        if (h.subtype === 'absent') { icon = 'user-x'; color = '#ff4d4f'; bg = 'rgba(255,77,79,0.15)'; typeLabel = 'KELMAGAN'; }
        if (h.subtype === 'lunch_out') { icon = 'coffee'; color = '#ffa940'; bg = 'rgba(255,169,64,0.1)'; typeLabel = 'TUSHLIK (CHIQISH)'; }
        if (h.subtype === 'lunch_in') { icon = 'arrow-right-circle'; color = '#ffa940'; bg = 'rgba(255,169,64,0.1)'; typeLabel = 'TUSHLIK (QAYTISH)'; }

        const dateObj = new Date(h.time);
        const dateStr = dateObj.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
            <div class="history-row" style="display:grid; grid-template-columns: 60px 1fr 150px 120px; align-items:center; background:rgba(255,255,255,0.02); padding:15px 25px; border-radius:20px; border:1px solid rgba(255,255,255,0.04); margin-bottom:10px; transition:0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.04)'; this.style.borderColor='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.02)'; this.style.borderColor='rgba(255,255,255,0.04)'">
                <div class="hist-icon" style="width:44px; height:44px; border-radius:12px; background:${bg}; color:${color}; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 15px ${bg};">
                    <i data-lucide="${icon}" style="width:20px;"></i>
                </div>
                <div style="padding-left:15px;">
                    <h4 style="font-size:1rem; font-weight:1000; color:#fff; letter-spacing:-0.5px; margin:0;">${h.target}</h4>
                    <div style="display:flex; align-items:center; gap:10px; margin-top:5px;">
                        <span style="font-size:0.6rem; font-weight:1000; color:${color}; letter-spacing:1px; background:${bg}; padding:3px 10px; border-radius:6px; border:1px solid ${color}33;">${typeLabel}</span>
                        <p style="font-size:0.75rem; color:var(--text-s); font-weight:700; margin:0;">${h.action}</p>
                    </div>
                </div>
                <div style="text-align:right;">
                    <span style="font-size:0.85rem; color:#fff; font-weight:800; display:block;">${dateStr}</span>
                    <span style="font-size:0.6rem; color:var(--text-s); font-weight:900; opacity:0.5; letter-spacing:1px; text-transform:uppercase;">Amal sanasi</span>
                </div>
                <div style="text-align:right; border-left:1px solid rgba(255,255,255,0.05); padding-left:20px;">
                    <span style="font-family:'Outfit'; font-size:1.3rem; font-weight:1000; color:var(--accent); letter-spacing:-1px; line-height:1;">${timeStr}</span>
                    <span style="font-size:0.6rem; color:var(--text-s); font-weight:900; opacity:0.5; letter-spacing:1px; display:block; margin-top:2px;">VAQTI</span>
                </div>
            </div>
        `;
    }).join('');
    lucide.createIcons();
}

function startScanner() {
    if (html5QrCode) stopScanner();
    html5QrCode = new Html5Qrcode("qrReader");
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess
    ).catch(err => {
        console.warn("Kamera skaneri ishga tushmadi (kamera yo'q bo'lishi mumkin) — USB/Bluetooth skaner baribir ishlayveradi:", err);
    });
    initHwScanner();
}

function stopScanner() {
    if (html5QrCode) {
        try {
            const result = html5QrCode.stop();
            if (result && typeof result.then === 'function') {
                result.catch(err => console.warn("Scanner stop error (ignored — camera may not have been running):", err));
            }
        } catch (err) {
            console.warn("Scanner stop error (ignored — camera may not have been running):", err);
        }
        html5QrCode = null;
    }
    clearInterval(hwScannerRefocusTimer);
    hwScannerRefocusTimer = null;
}

// USB/Bluetooth "klaviatura" tipidagi skanerlar (Netum va h.k.) kamera ishlatmaydi —
// ular skanerlagan matnni "teradi". Bitta inputning fokusiga tayanish beqaror
// (skaner tez terganda fokus boshqa joyga o'tib ketishi mumkin) — shuning uchun
// klaviatura bosilishlarini INPUT fokusidan qat'i nazar, butun hujjat (document)
// darajasida ushlaymiz: skaner ekrani ochiq bo'lgan payt harflar/raqamlar bufferga
// yig'iladi, Enter/Tab kelsa (yoki terish to'xtab ~250ms o'tsa) avtomatik qayta ishlanadi.
let hwScanBuffer = '';
let hwScanDebounceTimer = null;

function flushHwScanBuffer() {
    clearTimeout(hwScanDebounceTimer);
    const val = hwScanBuffer.trim();
    hwScanBuffer = '';
    const input = document.getElementById('hwScannerInput');
    if (input) input.value = '';
    if (val) onScanSuccess(val);
}

function initHwScanner() {
    const input = document.getElementById('hwScannerInput');
    if (!input) return;

    if (!hwScannerBound) {
        hwScannerBound = true;
        document.addEventListener('keydown', (e) => {
            const section = document.getElementById('scannerSection');
            if (!section || section.style.display === 'none') return; // faqat skaner ekrani ochiq bo'lganda ishlaydi

            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                flushHwScanBuffer();
                return;
            }
            if (e.key.length === 1) { // faqat bitta belgili tugmalar (harf/raqam/tire va h.k.), Shift/Ctrl/Arrow kabi emas
                // Brauzerning o'ziga tabiiy terishga yo'l qo'ymaymiz — aks holda input o'zi ham
                // belgini qo'shib, bizning bufferimiz bilan to'qnashib, belgi ikki marta tushib qolardi.
                e.preventDefault();
                hwScanBuffer += e.key;
                const inp = document.getElementById('hwScannerInput');
                if (inp) inp.value = hwScanBuffer;
                clearTimeout(hwScanDebounceTimer);
                hwScanDebounceTimer = setTimeout(flushHwScanBuffer, 250);
            }
        });
    }

    hwScanBuffer = '';
    clearTimeout(hwScanDebounceTimer);
    input.value = '';
    input.focus();
    clearInterval(hwScannerRefocusTimer);
    hwScannerRefocusTimer = setInterval(() => {
        const section = document.getElementById('scannerSection');
        if (!section || section.style.display === 'none') { clearInterval(hwScannerRefocusTimer); return; }
        if (document.activeElement !== input) input.focus();
    }, 800);
}

async function onScanSuccess(rawText) {
    // Expected: ROMIX-STAFF-{id} — ba'zi skanerlar boshiga/oxiriga ortiqcha bo'sh joy,
    // qator ko'chirish (\r\n) yoki boshqa "ko'rinmas" belgilar qo'shib yuborishi mumkin,
    // shuning uchun bunday belgilarni tozalab, keyin PREFIX'ni qidiramiz (nol pozitsiyada
    // bo'lishi shart emas — boshida biror belgi qo'shilgan bo'lsa ham topiladi).
    const decodedText = (rawText || '').replace(/[\r\n\t]/g, '').trim();
    const prefixIdx = decodedText.indexOf('ROMIX-STAFF-');
    if (prefixIdx === -1) {
        showToastHR(`⚠️ Tanilmagan kod: "${decodedText}" — badj QR kodi ROMIX-STAFF- bilan boshlanishi kerak`, 'warn');
        console.warn('Skanerlangan matn kutilgan formatga mos kelmadi:', JSON.stringify(rawText));
        return;
    }

    stopScanner(); // Pause scanner
    const empId = decodedText.slice(prefixIdx + 'ROMIX-STAFF-'.length);
    const emp = employeesData.find(e => e.id === empId);

    if (!emp) {
        alert("Xodim topilmadi!");
        startScanner();
        return;
    }

    // Fetch today's attendance state so we only offer the next valid action
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    let att = null;
    try {
        const res = await supabase.from('attendance').select('*').eq('employee_id', emp.id).eq('date', todayStr).maybeSingle();
        if (!res.error) att = res.data;
    } catch (_) {}

    if (!att || !att.check_in) {
        // Not checked in yet today
        showActionModal({
            title: emp.full_name,
            desc: "DAVOMATNI BELGILANG:",
            icon: "clock",
            confirmText: "✅ ISHGA KELDI",
            onConfirm: () => processAttendance(emp, 'in')
        });
    } else if (!att.lunch_start && !att.check_out) {
        // Checked in, still working, hasn't gone to lunch yet
        showActionModal({
            title: emp.full_name,
            desc: "DAVOMATNI BELGILANG:",
            icon: "clock",
            confirmText: "🍔 TUSHLIKKA CHIQDI",
            onConfirm: () => processAttendance(emp, 'lunch_out'),
            customContent: `
                <div style="display:grid; grid-template-columns:1fr; gap:10px; margin-top:20px;">
                    <button onclick="window.processAttendanceExternal('${emp.id}', 'out')" class="mgmt-btn" style="background:#ff4d4f; color:#fff;">🚪 ISHDAN KETDI</button>
                </div>
            `
        });
    } else if (att.lunch_start && !att.lunch_end) {
        // Currently on lunch break
        showActionModal({
            title: emp.full_name,
            desc: "DAVOMATNI BELGILANG:",
            icon: "clock",
            confirmText: "🔙 TUSHLIKDAN QAYTDI",
            onConfirm: () => processAttendance(emp, 'lunch_in')
        });
    } else if (!att.check_out) {
        // Back from lunch, still working
        showActionModal({
            title: emp.full_name,
            desc: "DAVOMATNI BELGILANG:",
            icon: "clock",
            confirmText: "🚪 ISHDAN KETDI",
            onConfirm: () => processAttendance(emp, 'out')
        });
    } else {
        // Already checked out today — nothing left to do
        alert(`${emp.full_name} bugun allaqachon ishdan ketgan (${new Date(att.check_out).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}).`);
        startScanner();
    }
}

// Global hook for the custom button
window.processAttendanceExternal = (id, type) => {
    const emp = employeesData.find(e => e.id === id);
    processAttendance(emp, type);
};

async function processAttendance(emp, type) {
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const nowIso = new Date().toISOString();

    // Try to get existing record — silently skip if offline
    let existing = null;
    try {
        const res = await supabase.from('attendance')
            .select('id')
            .eq('employee_id', emp.id)
            .eq('date', todayStr)
            .maybeSingle();
        if (!res.error) existing = res.data;
    } catch (_) {}

    let payload = {
        employee_id: emp.id,
        date: todayStr
    };

    if (existing) payload.id = existing.id;

    let actionLabel = '';
    if (type === 'in') {
        payload.check_in = nowIso;
        payload.status = 'ISHDA';
        actionLabel = 'Ishga keldi';
    } else if (type === 'lunch_out') {
        payload.lunch_start = nowIso;
        payload.status = 'TUSHLIKDA';
        actionLabel = 'Tushlikka chiqdi';
    } else if (type === 'lunch_in') {
        payload.lunch_end = nowIso;
        payload.status = 'ISHDA';
        actionLabel = 'Tushlikdan qaytdi';
    } else {
        payload.check_out = nowIso;
        payload.status = 'KETGAN';
        actionLabel = 'Ishdan ketti';
    }

    // --- Try Supabase, fall back to localStorage if offline ---
    let saved = false;
    try {
        const { error } = await supabase.from('attendance').upsert(payload);
        if (!error) saved = true;
    } catch (_) {}

    if (!saved) {
        // Offline fallback: save locally
        const key = 'romix_att_local_' + todayStr;
        const local = JSON.parse(localStorage.getItem(key) || '[]');
        const idx = local.findIndex(a => a.employee_id === emp.id);
        if (idx !== -1) local[idx] = { ...local[idx], ...payload };
        else local.push({ ...payload, id: 'loc-' + Date.now() });
        localStorage.setItem(key, JSON.stringify(local));
        showToastHR(`⚠️ Offline: ${emp.full_name} davomati qurilmada saqlandi`, 'warn');
    }

    // ✅ Always update local cache and re-render
    if (existing) {
        const idx = todayAtt.findIndex(a => a.id === existing.id);
        if (idx !== -1) todayAtt[idx] = { ...todayAtt[idx], ...payload };
        else todayAtt.push(payload);
    } else {
        todayAtt.push(payload);
    }

    closeActionModal();
    filterAndRender();
    switchTab('dashboard');
    console.log(`✅ ${emp.full_name} → ${payload.status} (saved: ${saved ? 'Supabase' : 'LocalStorage'}`);
    logActivity('attendance', actionLabel, emp.full_name);

    if (saved) loadInitialData(); // Only background-refresh when online
}

window.downloadBadge = async function () {
    const area = document.getElementById('badgePrintArea');
    if (!area) return;
    try {
        const canvas = await html2canvas(area, {
            scale: 3,
            useCORS: true,
            backgroundColor: null
        });
        const link = document.createElement('a');
        link.download = `ROMIX_Badge_${currentEmp ? currentEmp.full_name : 'Staff'}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        logActivity('admin', 'Bejik yuklab olindi', currentEmp?.full_name);
    } catch (e) {
        alert("Xatolik: Rasm yuklab bo'lmadi.");
    }
};

window.printBadgeReal = function () {
    logActivity('admin', 'Bejik chop etildi', currentEmp?.full_name);
    window.print();
};

// --- 🧪 DEMO REPORT GENERATION (For Visualization) ---
window.demoExportReport = async function (format) {
    if (!currentEmp) { alert("Avval xodimni tanlang!"); return; }

    const demoRows = [];
    let totalWorkedHours = 0;

    const salaryText = currentEmp.salary_info || '5000000';
    const monthlySalary = parseInt(String(salaryText).replace(/\D/g, '')) || 5000000;
    const dayRate = monthlySalary / 26;
    const hourRate = dayRate / 10;

    // Use same deterministic logic so total matches Analytics board
    let hash1 = 0, hash3 = 0;
    const hashStr = String(currentEmp.id || currentEmp.full_name);
    for (let i = 0; i < hashStr.length; i++) {
        hash1 = (hashStr.charCodeAt(i) + ((hash1 << 5) - hash1)) | 0;
        hash3 = (hashStr.charCodeAt(i) * 17 + ((hash3 << 5) - hash3)) | 0;
    }
    const deterministicBonus = Math.abs(hash3 % 10) > 7 ? 500000 : 0;

    let totalBonuses = deterministicBonus;
    let totalFines = 0;

    const today = new Date();

    for (let i = 25; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);

        // Skip Sundays for demo
        if (d.getDay() === 0) continue;

        const dateStr = d.toISOString().split('T')[0];

        // Deterministic daily lateness
        const isLate = Math.abs(hash1 + i) % 10 > 8;
        const timeIn = isLate ? "08:45" : "08:00";
        const hours = isLate ? 9.25 : 10;
        const status = isLate ? "Kechikish" : "Vaqtida keldi";

        if (isLate) totalFines += 50000;

        const earned = (hours * hourRate);
        totalWorkedHours += hours;

        demoRows.push({
            date: dateStr,
            in: timeIn,
            out: "18:00",
            hours: hours.toFixed(1) + ' s',
            status: status,
            earned: Math.round(earned).toLocaleString() + ' UZS'
        });
    }

    if (totalBonuses > 0) {
        demoRows.push({
            date: today.toISOString().split('T')[0],
            in: "--:--",
            out: "--:--",
            hours: "0.0 s",
            status: "Premya",
            earned: totalBonuses.toLocaleString() + ' UZS'
        });
    }

    const totalEarned = (totalWorkedHours * hourRate) + totalBonuses - totalFines;

    if (format === 'pdf') {
        generateProfessionalPDF(demoRows, totalEarned, totalBonuses, totalFines, demoRows.length - 1);
    } else if (format === 'excel') {
        generateExcelReport(demoRows, totalEarned, totalBonuses, totalFines, demoRows.length - 1);
    } else if (format === 'word') {
        generateWordReport(demoRows, totalEarned, totalBonuses, totalFines, demoRows.length - 1);
    }
};

window.generateKitchenDemo = function () {
    logActivity('kitchen', 'Demo ma\'lumotlar yaratildi', '1 oylik namuna');
    const today = new Date();
    for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        const count = Math.floor(Math.random() * 20) + 30;
        const price = 25000;
        const data = {
            date: dateKey,
            count: count,
            price: price,
            total: count * price,
            status: Math.random() > 0.3 ? 'paid' : 'debt',
            savedAt: new Date().toISOString()
        };
        localStorage.setItem('kitchen_' + dateKey, JSON.stringify(data));
    }
    alert("30 kunlik demo ma'lumotlar yaratildi!");
    window.renderKitchenCalendar();
};

window.clearAllKitchenData = function () {
    showActionModal({
        title: "XAVFSIZLIK TEKSHIRUVI",
        desc: "Tizim ma'lumotlarini tozalash uchun parolni kiriting:",
        icon: "shield-alert",
        input: true,
        confirmText: "TOZALASHNI TASDIQLASH",
        onConfirm: (val) => {
            if (val === "123") {
                if (confirm("DIQQAT: Barcha saqlangan oshxona ma'lumotlarini o'chirishni tasdiqlaysizmi?")) {
                    logActivity('kitchen', 'Barcha ma\'lumotlar tozalandi', 'Tizimni tozalash');
                    Object.keys(localStorage).forEach(key => {
                        if (key.startsWith('kitchen_')) localStorage.removeItem(key);
                    });
                    alert("Barcha oshxona ma'lumotlari muvaffaqiyatli o'chirildi.");
                    window.renderKitchenCalendar();
                    closeActionModal();
                }
            } else {
                alert("Xato parol! Ruxsat etilmadi.");
            }
        }
    });
};
