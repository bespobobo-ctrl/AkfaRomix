// 💎 ROMIX HR - Core Engine v4.1 (Ultra Stable)
import { supabase } from './supabase.js';

let employeesData = [];
let todayAtt = [];
let currentEmp = null;
let currentEditId = null;
let activeDept = 'all';
let tempPhotoData = null;

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

    document.getElementById('saveWorkerBtn').onclick = saveWorker;

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
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: staff } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
    const { data: att } = await supabase.from('attendance').select('*').eq('date', todayStr);
    employeesData = staff || [];
    todayAtt = att || [];
    renderStaffList(employeesData);
    updateGlobalStats();
}

function updateGlobalStats() {
    document.getElementById('totalEmployeesCount').textContent = employeesData.length;
    document.getElementById('todayArrivedCount').textContent = todayAtt.length;
    let totalPayroll = 0;
    employeesData.forEach(e => totalPayroll += parseInt(e.salary_info || 0));
    document.getElementById('payrollTotal').innerHTML = `${totalPayroll.toLocaleString()} <small>UZS</small>`;
}

function renderStaffList(listData) {
    const tableBody = document.getElementById('employeeTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    listData.forEach(emp => {
        const tr = document.createElement('tr');
        tr.className = 'staff-row';
        tr.innerHTML = `
            <td>
                <div class="t-user-cell">
                    <img src="${emp.avatar_url || 'https://via.placeholder.com/150'}" class="t-avatar">
                    <div>
                        <div style="font-weight:900; color:#fff;">${emp.full_name}</div>
                        <div style="font-size:0.7rem; color:var(--text-s);">ID: ${emp.id.substring(0, 8).toUpperCase()}</div>
                    </div>
                </div>
            </td>
            <td>${emp.role || 'Xodim'}</td>
            <td>${emp.department || 'Ofis'}</td>
            <td>${emp.phone || '---'}</td>
            <td><span class="t-status-pill">ISHDA</span></td>
            <td style="text-align:right;">
                <button class="eye-btn" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff; width:35px; height:35px; border-radius:10px; cursor:pointer;" onclick="event.stopPropagation(); window.showEmployeeDetail('${emp.id}')">
                    <i data-lucide="eye" style="width:16px; height:16px;"></i>
                </button>
            </td>
        `;
        tr.onclick = () => window.showEmployeeDetail(emp.id);
        tableBody.appendChild(tr);
    });
    lucide.createIcons();
}

window.showEmployeeDetail = function (id) {
    const emp = employeesData.find(e => e.id === id);
    if (!emp) return;
    currentEmp = emp;

    document.getElementById('detailModalOverlay').style.display = 'flex';
    document.getElementById('profileDetail').style.display = 'flex';

    document.getElementById('dt-photo').src = emp.avatar_url;
    document.getElementById('dt-name').textContent = emp.full_name;
    document.getElementById('dt-role').textContent = emp.role || 'Xodim';
    document.getElementById('dt-phone').textContent = emp.phone || '---';
    document.getElementById('dt-dept').textContent = emp.department || 'Ofis';
    document.getElementById('dt-experience').textContent = (emp.joined_year ? (2026 - emp.joined_year) + " yil" : "Yangi xodim");
    document.getElementById('dt-sum').textContent = (parseInt(emp.salary_info || 0) / 1000000).toFixed(1) + 'M';
    document.getElementById('dt-qr').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ROMIX-${emp.id}`;

    gsap.fromTo("#profileDetail", { scale: 0.95, opacity: 0, y: 30 }, { scale: 1, opacity: 1, y: 0, duration: 0.5 });
    lucide.createIcons();
};

function closeDetailModal() {
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
        role: role,
        department: dept,
        salary_info: salary || '0',
        phone: phone || '',
        birth_year: birthYear || null,
        joined_year: joinedYear || null,
        avatar_url: tempPhotoData || (currentEditId ? currentEmp.avatar_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1a7b7c&color=fff`)
    };

    let res;
    if (currentEditId) {
        res = await supabase.from('employees').update(payload).eq('id', currentEditId).select();
    } else {
        res = await supabase.from('employees').insert([payload]).select();
    }

    if (!res.error) {
        btn.textContent = 'TAYYOR!';
        setTimeout(async () => {
            document.getElementById('addWorkerModalOverlay').style.display = 'none';
            await loadInitialData();
            clearModal();
            btn.textContent = 'SAQLASH';
            btn.disabled = false;
        }, 1000);
    } else {
        alert("Xatolik: " + res.error.message);
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

function prepareBadge() {
    if (!currentEmp) return;
    const emp = currentEmp;
    const parts = (emp.full_name || '').split(' ');
    document.getElementById('badgeModalOverlay').style.display = 'flex';
    document.getElementById('badgePreviewPhoto').src = emp.avatar_url;
    document.getElementById('badgePreviewSideName').textContent = (parts[0] || '').toUpperCase();
    document.getElementById('badgePreviewFullName').textContent = (emp.full_name || '').toUpperCase();
    document.getElementById('badgePreviewRole').textContent = (emp.department || 'OFIS').toUpperCase() + " XODIMI";
    document.getElementById('badgePreviewID').textContent = 'ROMIX-' + emp.id.substring(0, 8).toUpperCase();
    document.getElementById('badgePreviewQR').src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=ROMIX-STAFF-${emp.id}`;
}

function closeBadgeModal() {
    document.getElementById('badgeModalOverlay').style.display = 'none';
}

function handlePremya() {
    const val = prompt(`${currentEmp.full_name} uchun premya miqdorini kiriting:`);
    if (val) alert(`${val} UZS muvaffaqiyatli saqlandi!`);
}

function handleOylik() {
    alert(`Xodim: ${currentEmp.full_name}\nAsosiy oylik: ${parseInt(currentEmp.salary_info || 0).toLocaleString()} UZS`);
}

function handleDelete() {
    if (confirm(`${currentEmp.full_name}ni o'chirishni tasdiqlaysizmi?`)) {
        supabase.from('employees').delete().eq('id', currentEmp.id).then(() => {
            closeDetailModal();
            loadInitialData();
        });
    }
}

function handleReport() {
    alert("Hisobot tayyorlanmoqda...");
}

function filterAndRender() {
    let filtered = employeesData;
    if (activeDept !== 'all') {
        filtered = employeesData.filter(e => e.department === activeDept);
    }
    renderStaffList(filtered);
}
