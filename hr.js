import { supabase } from './supabase.js';

let employeesData = [];
let todayAtt = [];
let currentEmp = null;
let activeDept = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    // === AUTH GUARD ===
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || (user.role !== 'hr' && user.role !== 'admin')) {
        window.location.href = '/';
        return;
    }

    // Header Name
    const nameEl = document.getElementById('userNameLabel');
    const initEl = document.getElementById('userInitials');
    if (nameEl) nameEl.textContent = user.username || 'HR Admin';
    if (initEl) initEl.textContent = (user.username || 'A')[0].toUpperCase();

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = '/';
    });

    // === MODAL CONTROL ===
    const modal = document.getElementById('addWorkerModalOverlay');

    document.getElementById('addWorkerBtn').addEventListener('click', () => {
        clearModal();
        modal.style.display = 'flex';
        gsap.from('.modal-box', { y: 60, opacity: 0, duration: 0.5, ease: 'power4.out' });
    });

    document.getElementById('closeAddWorkerBtn').addEventListener('click', () => {
        gsap.to('.modal-box', {
            y: 40, opacity: 0, duration: 0.3,
            onComplete: () => modal.style.display = 'none'
        });
    });

    document.getElementById('saveWorkerBtn').addEventListener('click', saveWorker);

    // === SEARCH ===
    document.getElementById('hrSearchInput').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const filtered = employeesData.filter(emp =>
            emp.full_name.toLowerCase().includes(val) ||
            (emp.role && emp.role.toLowerCase().includes(val)) ||
            (emp.department && emp.department.toLowerCase().includes(val))
        );
        renderStaffList(filtered);
    });

    // === DEPARTMENT TABS ===
    document.querySelectorAll('.dept-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.dept-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeDept = tab.dataset.dept;
            filterAndRender();
        });
    });

    // === LOAD DATA ===
    await loadInitialData();
});

function filterAndRender() {
    if (activeDept === 'all') {
        renderStaffList(employeesData);
    } else {
        const filtered = employeesData.filter(e => e.department === activeDept);
        renderStaffList(filtered);
    }
}

async function loadInitialData() {
    const todayStr = new Date().toISOString().split('T')[0];

    const { data: staff, error: e1 } = await supabase
        .from('employees').select('*').order('created_at', { ascending: false });

    const { data: att, error: e2 } = await supabase
        .from('attendance').select('*').eq('date', todayStr);

    if (!e1) employeesData = staff || [];
    if (!e2) todayAtt = att || [];

    updateGlobalStats();
    filterAndRender();
    if (employeesData.length > 0) showEmployeeDetail(employeesData[0]);
}

function updateGlobalStats() {
    document.getElementById('totalEmployeesCount').textContent = employeesData.length;

    const present = todayAtt.filter(a => a.status === 'Vaqtida keldi').length;
    const late = todayAtt.filter(a => a.status === 'Kechikib keldi').length;

    document.getElementById('todayArrivedCount').textContent = present + late;
    document.getElementById('todayLateCount').textContent = late;

    // Payroll
    let totalPayroll = 0;
    employeesData.forEach(e => {
        const sal = parseInt(String(e.salary_info || '0').replace(/[^0-9]/g, '')) || 0;
        totalPayroll += sal;
    });
    document.getElementById('payrollTotal').innerHTML = `${totalPayroll.toLocaleString()} <small>sum</small>`;
}

function renderStaffList(data) {
    const list = document.getElementById('employeeList');
    list.innerHTML = '';

    if (!data || data.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:40px 0; color:var(--text-dim);">Xodim topilmadi</p>';
        return;
    }

    data.forEach(emp => {
        const card = document.createElement('div');
        card.className = 'staff-row';
        if (currentEmp && currentEmp.id === emp.id) card.classList.add('active');

        const initials = emp.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const photoSrc = emp.photo
            ? emp.photo
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.full_name)}&background=0a0f16&color=00ff88&size=80`;

        card.innerHTML = `
            <img src="${photoSrc}" class="staff-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="staff-initials" style="display:none;">${initials}</div>
            <div style="flex:1; min-width:0;">
                <div style="font-weight:700; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${emp.full_name}</div>
                <div style="font-size:0.7rem; color:var(--text-dim);">${emp.role || 'Xodim'} • ${emp.department || ''}</div>
            </div>
            <i data-lucide="chevron-right" size="16" style="color:var(--text-dim); flex-shrink:0;"></i>
        `;

        card.onclick = () => {
            document.querySelectorAll('.staff-row').forEach(r => r.classList.remove('active'));
            card.classList.add('active');
            showEmployeeDetail(emp);
        };

        list.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
}

function showEmployeeDetail(emp) {
    currentEmp = emp;

    // Animate out then in
    const panel = document.getElementById('profileDetail');
    gsap.to(panel, {
        opacity: 0, x: 15, duration: 0.15,
        onComplete: () => {
            // Name & Role
            document.getElementById('dt-name').textContent = emp.full_name;
            document.getElementById('dt-role').textContent = emp.role || '—';
            document.getElementById('dt-dept').textContent = emp.department || '—';
            document.getElementById('dt-phone').textContent = emp.phone || '—';
            document.getElementById('dt-exp').textContent = emp.experience || '—';

            // Photo
            const photoEl = document.getElementById('dt-photo');
            if (emp.photo) {
                photoEl.src = emp.photo;
            } else {
                photoEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.full_name)}&background=0a0f16&color=00ff88&size=200`;
            }

            // Stats
            const salary = parseInt(String(emp.salary_info || '0').replace(/[^0-9]/g, '')) || 0;
            document.getElementById('dt-salary').textContent = salary.toLocaleString();
            document.getElementById('dt-kpi').textContent = (80 + Math.floor(Math.random() * 18)) + '%';
            document.getElementById('dt-attendance').textContent = '94%';

            gsap.to(panel, { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' });
        }
    });
}

// === SAVE WORKER ===
async function saveWorker() {
    const btn = document.getElementById('saveWorkerBtn');
    const fname = document.getElementById('empFirstName').value.trim();
    const lname = document.getElementById('empLastName').value.trim();
    const dept = document.getElementById('empDept').value;
    const role = document.getElementById('empRole').value.trim();
    const salary = document.getElementById('empSalary').value.trim();
    const joinedYear = document.getElementById('empJoinedYear').value.trim();
    const phone = document.getElementById('empPhone').value.trim();
    const birthYear = document.getElementById('empBirthYear').value.trim();

    if (!fname || !role) {
        alert("Ism va Lavozim majburiy!");
        return;
    }

    btn.textContent = 'Saqlanmoqda...';
    btn.disabled = true;

    const { error } = await supabase.from('employees').insert([{
        full_name: `${fname} ${lname}`.trim(),
        role: role,
        department: dept,
        salary_info: salary || '0',
        phone: phone || '',
        birth_year: birthYear || null,
        experience: joinedYear ? `${joinedYear}-yildan beri` : 'Yangi',
        status: 'Ishlamoqda'
    }]);

    if (!error) {
        document.getElementById('addWorkerModalOverlay').style.display = 'none';
        await loadInitialData();
        clearModal();
    } else {
        alert("Xatolik: " + error.message);
    }

    btn.textContent = 'Tizimga Qo\'shish';
    btn.disabled = false;
}

function clearModal() {
    ['empFirstName', 'empLastName', 'empRole', 'empSalary', 'empJoinedYear', 'empPhone', 'empBirthYear'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const dept = document.getElementById('empDept');
    if (dept) dept.selectedIndex = 0;
}
