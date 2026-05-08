// 💎 ROMIX HR - Core Engine v4.1 (Ultra Stable)
import { supabase } from './supabase.js';

let employeesData = [];
let todayAtt = [];
let currentEmp = null;
let currentEditId = null;
let activeDept = 'all';
let tempPhotoData = null;
let html5QrCode = null;
let workInterval = null;
let currentTab = 'dashboard';

document.addEventListener('DOMContentLoaded', async () => {
    // 🛡️ AUTH GUARD
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || (user.role !== 'hr' && user.role !== 'admin')) {
        window.location.href = '/';
        return;
    }

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
    window.closeActionModal = closeActionModal;
    window.switchTab = switchTab;
    window.stopScanner = stopScanner;
    window.closeActionModal = closeActionModal;
    window.viewDetails = showEmployeeDetail;

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem('currentUser');
            window.location.href = '/';
        };
    }

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

    // photo logic
    const photoInput = document.getElementById('empPhotoFile');
    if (photoInput) {
        photoInput.onchange = (e) => {
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
    }

    const saveBtn = document.getElementById('saveWorkerBtn');
    if (saveBtn) saveBtn.onclick = saveWorker;

    // Search
    const searchInput = document.getElementById('hrSearchInput');
    if (searchInput) {
        searchInput.oninput = (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = employeesData.filter(emp => emp.full_name.toLowerCase().includes(val));
            renderStaffList(filtered);
        };
    }

    // Pill Filtering
    document.querySelectorAll('.pill').forEach(pill => {
        pill.onclick = () => {
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeDept = pill.dataset.dept;
            filterAndRender();
        };
    });

    await loadInitialData();
});

async function loadInitialData() {
    const table = document.getElementById('employeeTableBody');

    // STEP 1: Show loading
    if (table) table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--accent);">⏳ Bazaga ulanilmoqda...</td></tr>`;

    try {
        const todayStr = new Date().toISOString().split('T')[0];

        // STEP 2: Fetch employees
        if (table) table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--accent);">⏳ Xodimlar yuklanmoqda...</td></tr>`;

        const { data: staff, error: staffError } = await supabase.from('employees').select('*').order('full_name', { ascending: true });

        if (staffError) {
            console.error("Staff Fetch Error:", staffError);
            if (table) table.innerHTML = `<tr><td colspan="6" style="color:#ff4d4f; text-align:center; padding:30px; font-size:0.9rem;">❌ XATOLIK: ${staffError.message}<br><small style="color:var(--text-s)">Supabase URL: ${supabase.supabaseUrl || 'noaniq'}</small></td></tr>`;
            return;
        }

        // STEP 3: Fetch attendance
        const { data: att, error: attError } = await supabase.from('attendance').select('*').eq('date', todayStr);
        if (attError) {
            console.error("Attendance Fetch Error:", attError);
        }

        employeesData = staff || [];
        todayAtt = att || [];

        console.log("✅ Xodimlar soni:", employeesData.length);

        if (employeesData.length === 0) {
            if (table) table.innerHTML = `<tr><td colspan="6" style="color:#ffa940; text-align:center; padding:30px;">⚠️ Bazada xodimlar topilmadi (0 ta)<br><small style="color:var(--text-s)">Bazaga ulanish muvaffaqiyatli, lekin 'employees' jadvali bo'sh.</small></td></tr>`;
            return;
        }

        // STEP 4: Render
        renderStaffList(employeesData);
        updateGlobalStats();

    } catch (err) {
        console.error("💥 Critical Exception:", err);
        if (table) table.innerHTML = `<tr><td colspan="6" style="color:#ff4d4f; text-align:center; padding:30px;">💥 JIDDIY XATO: ${err.message}<br><small style="color:var(--text-s)">Stack: ${err.stack?.substring(0, 200)}</small></td></tr>`;
    }
}

function updateStatsHeader(staff, attendance) {
    const total = staff.length;
    const todayStr = new Date().toISOString().split('T')[0];

    const present = attendance.filter(a => a.status === 'ISHDA').length;

    // 🧠 SMART LATE COUNTER: Arrived after 08:00
    const lateCount = attendance.filter(a => {
        if (!a.check_in) return false;
        const time = new Date(a.check_in).getHours() * 60 + new Date(a.check_in).getMinutes();
        return time > 480; // 480 mins = 08:00
    }).length;

    document.getElementById('totalEmployeesCount').innerText = total || 0;
    document.getElementById('todayArrivedCount').innerText = present || 0;
    document.getElementById('todayLateCount').innerText = lateCount || 0;

    // Monthly Fund (Simulation)
    const fund = staff.reduce((acc, curr) => {
        const val = parseInt(curr.salary_info?.toString().replace(/\D/g, '') || 0);
        return acc + (isNaN(val) ? 0 : val);
    }, 0);
    document.getElementById('payrollTotal').innerText = (fund || 0).toLocaleString() + " UZS";
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

function renderStaffList(data) {
    const container = document.getElementById('employeeTableBody');
    if (!container) return;
    container.innerHTML = '';

    // Update Headers (using cached data)
    updateStatsHeader(employeesData, todayAtt);

    data.forEach(emp => {
        const att = todayAtt.find(a => a.employee_id === emp.id);
        const status = getSmartStatus(att);

        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid rgba(255,255,255,0.03)";
        tr.innerHTML = `
            <td style="padding: 15px 20px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="position:relative;">
                        <img src="${emp.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(emp.full_name)}" 
                             style="width:40px; height:40px; border-radius:12px; object-fit:cover; border:1px solid rgba(255,255,255,0.1);">
                        <div style="position:absolute; bottom:-2px; right:-2px; width:10px; height:10px; border-radius:50%; background:${status.color}; border:2px solid #05080c;"></div>
                    </div>
                    <div>
                        <div style="font-weight:700; font-size:0.85rem; color:#fff;">${emp.full_name}</div>
                        <div style="font-size:0.65rem; color:var(--text-s); font-family:monospace;">ID: ${emp.id.substring(0, 8).toUpperCase()}</div>
                    </div>
                </div>
            </td>
            <td style="padding: 15px 20px; font-size:0.8rem; font-weight:600; color:var(--text-s);">${emp.role || 'Xodim'}</td>
            <td style="padding: 15px 20px;">
                <span style="font-size:0.7rem; font-weight:800; background:rgba(255,255,255,0.03); padding:4px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.05); color:var(--text-s); text-transform:uppercase;">
                    ${emp.department || emp.dept || 'Ofis'}
                </span>
            </td>
            <td style="padding: 15px 20px; font-size:0.8rem; font-weight:600; color:var(--text-s); font-family:monospace;">${emp.phone || '---'}</td>
            <td style="padding: 15px 20px;">
                <span style="display:inline-flex; align-items:center; gap:8px; background:${status.glow}; color:${status.color}; padding:6px 14px; border-radius:12px; font-size:0.65rem; font-weight:900; letter-spacing:0.5px; border:1px solid ${status.color}33;">
                    <span style="width:5px; height:5px; border-radius:50%; background:${status.color};"></span>
                    ${status.text}
                </span>
            </td>
            <td style="padding: 15px 20px; text-align:right;">
                <button onclick="window.viewDetails('${emp.id}')" 
                        style="width:35px; height:35px; border-radius:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); color:var(--text-s); cursor:pointer; transition:0.3s; display:inline-flex; align-items:center; justify-content:center;"
                        onmouseover="this.style.background='var(--accent)'; this.style.color='#000'; this.style.borderColor='var(--accent)'"
                        onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.color='var(--text-s)'; this.style.borderColor='rgba(255,255,255,0.08)'">
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
    document.getElementById('totalEmployeesCount').textContent = employeesData.length;
    document.getElementById('todayArrivedCount').textContent = todayAtt.length;
    let totalPayroll = 0;
    employeesData.forEach(e => totalPayroll += parseInt(e.salary_info || 0));
    document.getElementById('payrollTotal').innerHTML = `${totalPayroll.toLocaleString()} <small>UZS</small>`;
}

async function showEmployeeDetail(id) {
    const emp = employeesData.find(e => e.id === id);
    if (!emp) return;
    currentEmp = emp;

    document.getElementById('detailModalOverlay').style.display = 'flex';
    document.getElementById('profileDetail').style.display = 'flex';

    document.getElementById('dt-photo').src = emp.avatar_url;
    document.getElementById('dt-name').textContent = emp.full_name;
    document.getElementById('dt-role').textContent = emp.role || 'Xodim';
    document.getElementById('dt-phone').textContent = emp.phone || '---';
    document.getElementById('dt-dept').textContent = emp.department || emp.dept || 'Ofis';
    document.getElementById('dt-experience').textContent = (emp.joined_year ? (2026 - emp.joined_year) + " yil" : "---");
    document.getElementById('dt-sum').textContent = (parseInt(emp.salary_info || 0) / 1000000).toFixed(1) + 'M';

    // QR
    const qrEl = document.getElementById('dt-qr');
    if (qrEl) qrEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('ROMIX-STAFF-' + emp.id)}`;

    // Attendance Info
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: att } = await supabase.from('attendance').select('*').eq('id', emp.id).eq('date', todayStr).maybeSingle();

    updateProfileAttendance(att);

    gsap.fromTo("#profileDetail", { scale: 0.95, opacity: 0, y: 30 }, { scale: 1, opacity: 1, y: 0, duration: 0.5 });
    lucide.createIcons();
};

function updateProfileAttendance(att) {
    if (workInterval) clearInterval(workInterval);

    const arrivedEl = document.getElementById('dt-arrived');
    const leftEl = document.getElementById('dt-left');
    const timeEl = document.getElementById('dt-worktime');
    const progressEl = document.getElementById('timeProgress');

    if (!att || !att.check_in) {
        arrivedEl.textContent = '--:--';
        leftEl.textContent = '--:--';
        timeEl.textContent = '00:00';
        if (progressEl) progressEl.style.strokeDashoffset = '597';
        return;
    }

    const start = new Date(att.check_in);
    arrivedEl.textContent = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (att.check_out) {
        const end = new Date(att.check_out);
        leftEl.textContent = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        calculateDuration(start, end);
    } else {
        leftEl.textContent = '--:--';
        workInterval = setInterval(() => calculateDuration(start, new Date()), 1000);
        calculateDuration(start, new Date());
    }
}

function calculateDuration(start, end) {
    const diff = Math.abs(end - start);
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    const timeStr = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    document.getElementById('dt-worktime').textContent = timeStr;

    // Progress Circle (Max 8 hours)
    const progressEl = document.getElementById('timeProgress');
    if (progressEl) {
        const totalSecs = hrs * 3600 + mins * 60 + secs;
        const maxSecs = 8 * 3600;
        const percent = Math.min(totalSecs / maxSecs, 1);
        const offset = 597 - (597 * percent);
        progressEl.style.strokeDashoffset = offset;
    }
}

function closeDetailModal() {
    if (workInterval) clearInterval(workInterval);
    document.getElementById('detailModalOverlay').style.display = 'none';
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
    document.getElementById('empDept').value = emp.department || 'Ofis';
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
    const dept = document.getElementById('empDept').value;
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
        birth_year: birthYear || null,
        avatar_url: tempPhotoData || (currentEditId ? currentEmp.avatar_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1a7b7c&color=fff`)
    };

    // 🛡️ Safe checks for columns that might be missing
    const firstRow = employeesData[0] || {};
    if ('department' in firstRow) payload.department = dept;
    if ('dept' in firstRow) payload.dept = dept;
    if ('joined_year' in firstRow) payload.joined_year = joinedYear;

    let res;
    try {
        if (currentEditId) {
            res = await supabase.from('employees').update(payload).eq('id', currentEditId).select();
        } else {
            res = await supabase.from('employees').insert([payload]).select();
        }
    } catch (e) {
        console.error("Critical Exception:", e);
    }

    if (res && !res.error) {
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
        alert(`SAQLASHDA XATO: ${errMsg}\n\nEslatma: 'department' va 'joined_year' bazada yo'qligi sababli hozircha faqat asosiy ma'lumotlar saqlanadi.`);
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
            alert(`${val} UZS premya muvaffaqiyatli qo'shildi!`);
            closeActionModal();
        }
    });
}

function handleOylik() {
    if (!currentEmp) return;
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

window.startExport = async function (format) {
    if (!currentEmp) return;
    const modal = document.getElementById('reportSelectionModal');
    modal.style.display = 'none';

    // Show processing status
    alert(`${format.toUpperCase()} hisobot tayyorlanmoqda...`);

    if (format === 'pdf') {
        await generateProfessionalPDF();
    } else if (format === 'excel') {
        generateExcelReport();
    } else {
        alert("Hozirda faqat PDF va EXCEL mavjud. Word yaqin orada qo'shiladi.");
    }
};

async function generateProfessionalPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const emp = currentEmp;
    const accent = [0, 210, 255]; // Blue-ish

    // 🎨 DESIGN - Header Blobs (Visual Simulation)
    doc.setFillColor(255, 204, 153, 0.2); // Soft orange like the image
    doc.circle(200, 20, 40, 'F');
    doc.circle(10, 280, 50, 'F');

    // 🏢 BRANDING
    doc.setFont("Outfit", "bold");
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text("ROMIX HR REPORT", 20, 30);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("\"Modern Workforce, Elite Management.\"", 20, 38);

    // 📋 EMPLOYEE INFO
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 50, 190, 50);

    doc.setFontSize(11);
    doc.setTextColor(150, 150, 150);
    doc.text("Report For:", 20, 65);

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(emp.full_name.toUpperCase(), 20, 75);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Role: ${emp.role || 'Xodim'}`, 20, 82);
    doc.text(`Dept: ${emp.department || 'Ofis'}`, 20, 87);
    doc.text(`Period: ${selectedPeriod.toUpperCase()} (2026)`, 20, 92);

    // 📅 TABLE DATA (Attendance Simulation)
    const tableData = [
        ["2026-05-01", "Vaqtida", "08:15", "18:05", "9.8h"],
        ["2026-05-02", "Kechikish", "09:30", "18:30", "9.0h"],
        ["2026-05-03", "Vaqtida", "08:20", "18:00", "9.6h"],
        ["2026-05-04", "Vaqtida", "08:10", "18:15", "10.0h"],
        ["2026-05-05", "Yo'q", "---", "---", "0.0h"],
    ];

    doc.autoTable({
        startY: 110,
        head: [['Sana', 'Status', 'Kelish', 'Ketish', 'Ish Soati']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [13, 22, 34], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { font: 'Inter', fontSize: 9 },
        margin: { left: 20, right: 20 }
    });

    // 💰 SUMMARY
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(12);
    doc.text("Summary:", 140, finalY);

    doc.setFontSize(18);
    doc.setTextColor(0, 210, 255);
    doc.text(`Score: 92%`, 140, finalY + 10);

    // 🛡️ FOOTER
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    const footerText = "ROMIX HR Portal | Automated Corporate Reporting System 2026";
    doc.text(footerText, 105, 285, { align: 'center' });

    doc.save(`ROMIX_Report_${emp.full_name}_${selectedPeriod}.pdf`);
}

function generateExcelReport() {
    const emp = currentEmp;
    const data = [
        ["ROMIX HR REPORT", "", "", ""],
        ["Employee:", emp.full_name, "", ""],
        ["Period:", selectedPeriod.toUpperCase(), "", ""],
        ["", "", "", ""],
        ["Date", "Status", "Arrival", "Leave"],
        ["2026-05-01", "Vaqtida", "08:15", "18:05"],
        ["2026-05-02", "Kechikish", "09:30", "18:30"],
        ["2026-05-03", "Vaqtida", "08:20", "18:00"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `ROMIX_Report_${emp.full_name}.xlsx`);
}

function handleDelete() {
    if (confirm(`${currentEmp.full_name}ni o'chirishni tasdiqlaysizmi?`)) {
        supabase.from('employees').delete().eq('id', currentEmp.id).then(() => {
            closeDetailModal();
            loadInitialData();
        });
    }
}

function filterAndRender() {
    let filtered = employeesData;
    if (activeDept !== 'all') {
        filtered = employeesData.filter(e => (e.department === activeDept || e.dept === activeDept));
    }
    renderStaffList(filtered);
}

// 📡 TABS & SCANNER SYSTEM
function switchTab(tab) {
    currentTab = tab;

    // UI Feedback
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const sections = {
        'dashboard': document.querySelector('.main-container'),
        'scanner': document.getElementById('scannerSection'),
        'reports': document.getElementById('reportSelectionModal') // Special case
    };

    if (tab === 'scanner') {
        document.getElementById('scannerSection').style.display = 'flex';
        startScanner();
    } else {
        stopScanner();
        document.getElementById('scannerSection').style.display = 'none';
    }

    if (tab === 'reports') handleReport();
}

function startScanner() {
    if (html5QrCode) stopScanner();
    html5QrCode = new Html5Qrcode("qrReader");
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess
    );
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode = null;
        }).catch(err => console.error("Scanner stop error:", err));
    }
}

async function onScanSuccess(decodedText) {
    // Expected: ROMIX-STAFF-{id}
    if (!decodedText.startsWith('ROMIX-STAFF-')) return;

    stopScanner(); // Pause scanner
    const empId = decodedText.split('ROMIX-STAFF-')[1];
    const emp = employeesData.find(e => e.id === empId);

    if (!emp) {
        alert("Xodim topilmadi!");
        startScanner();
        return;
    }

    showActionModal({
        title: emp.full_name,
        desc: "DAVOMATNI BELGILANG:",
        icon: "clock",
        confirmText: "ISHGA KELDI",
        onConfirm: () => processAttendance(emp, 'in'),
        customContent: `
            <div style="display:grid; grid-template-columns:1fr; gap:10px; margin-top:20px;">
                <button onclick="window.processAttendanceExternal('${emp.id}', 'out')" class="mgmt-btn" style="background:#ff4d4f; color:#fff;">ISHdan KETDI</button>
            </div>
        `
    });
}

// Global hook for the custom button
window.processAttendanceExternal = (id, type) => {
    const emp = employeesData.find(e => e.id === id);
    processAttendance(emp, type);
};

async function processAttendance(emp, type) {
    const todayStr = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    let payload = {
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
        closeActionModal();
        alert(`Muvaffaqiyatli: ${emp.full_name} - ${type === 'in' ? 'Kash keldi' : 'Ishdan ketti'}`);
        await loadInitialData(); // Refresh counts
        switchTab('dashboard');
    } else {
        alert("Xatolik: " + error.message);
    }
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
    } catch (e) {
        alert("Xatolik: Rasm yuklab bo'lmadi.");
    }
};

window.printBadgeReal = function () {
    window.print();
};
