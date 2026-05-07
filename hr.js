import { supabase } from './supabase.js';

let employeesData = [];
let todayAtt = [];
let currentEmp = null;
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth Check
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || (user.role !== 'hr' && user.role !== 'admin')) {
        window.location.href = '/';
        return;
    }

    // Set UI User Info
    if (document.getElementById('userNameLabel')) {
        document.getElementById('userNameLabel').textContent = user.username ? user.username.toUpperCase() : 'HR ADMIN';
    }

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = '/';
    });

    // Tab Switching
    const tabEmployees = document.getElementById('tabEmployees');
    const tabAttendance = document.getElementById('tabAttendance');
    const secEmployees = document.getElementById('employeesSection');
    const secAttendance = document.getElementById('attendanceSection');

    tabEmployees.addEventListener('click', () => {
        tabEmployees.classList.add('active');
        tabAttendance.classList.remove('active');
        secEmployees.classList.add('active');
        secAttendance.classList.remove('active');
    });

    tabAttendance.addEventListener('click', () => {
        tabAttendance.classList.add('active');
        tabEmployees.classList.remove('active');
        secAttendance.classList.add('active');
        secEmployees.classList.remove('active');
        loadDailyAttendance(new Date().toISOString().split('T')[0]);
    });

    // Initial Load
    await loadInitialData();

    // Search Logic
    document.getElementById('hrSearchInput').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const filtered = employeesData.filter(emp =>
            emp.full_name.toLowerCase().includes(val) ||
            (emp.role && emp.role.toLowerCase().includes(val))
        );
        renderStaffList(filtered);
    });

    // Modal Add/Edit
    const modal = document.getElementById('addWorkerModalOverlay');
    document.getElementById('addWorkerBtn').addEventListener('click', () => {
        document.getElementById('modalHeader').innerHTML = "Yangi Xodim <span style='color:var(--accent-glow);'>Qo'shish</span>";
        clearModal();
        modal.classList.add('active');
    });

    document.getElementById('closeAddWorkerBtn').addEventListener('click', () => {
        modal.classList.remove('active');
    });

    document.getElementById('saveWorkerBtn').addEventListener('click', saveWorker);

    // Calendar Nav
    document.getElementById('prevMonth').addEventListener('click', () => {
        calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
        renderCalendar();
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
        calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
        renderCalendar();
    });
});

async function loadInitialData() {
    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch Employees
    const { data: staff, error: e1 } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
    // Fetch Today Attendance
    const { data: att, error: e2 } = await supabase.from('attendance').select('*').eq('date', todayStr);

    if (!e1 && !e2) {
        employeesData = staff;
        todayAtt = att;
        updateGlobalStats();
        renderStaffList(employeesData);
        if (employeesData.length > 0) showEmployeeDetail(employeesData[0]);
    }
}

function updateGlobalStats() {
    document.getElementById('totalEmployeesCount').textContent = employeesData.length;

    const present = todayAtt.filter(a => a.status === 'Vaqtida keldi').length;
    const late = todayAtt.filter(a => a.status === 'Kechikib keldi').length;

    document.getElementById('todayArrivedCount').textContent = present;
    document.getElementById('todayLateCount').textContent = late;

    // Payroll
    let total = 0;
    employeesData.forEach(e => {
        total += parseInt(e.salary_info.toString().replace(/[^0-9]/g, '')) || 0;
    });
    document.getElementById('payrollTotal').innerHTML = `${total.toLocaleString()} <small>sum</small>`;
}

function renderStaffList(data) {
    const list = document.getElementById('employeeList');
    list.innerHTML = '';

    data.forEach(emp => {
        const card = document.createElement('div');
        card.className = 'staff-row';
        if (currentEmp && currentEmp.id === emp.id) card.classList.add('active');

        const initials = emp.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        card.innerHTML = `
            <div style="width:40px; height:40px; border-radius:10px; background:rgba(0,255,136,0.1); color:var(--accent-glow); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.9rem;">${initials}</div>
            <div style="flex:1;">
                <h4 style="font-size:0.9rem; font-weight:700;">${emp.full_name}</h4>
                <p style="font-size:0.7rem; color:var(--text-dim);">${emp.role || 'Xodim'}</p>
            </div>
            <i data-lucide="chevron-right" size="14" style="opacity:0.3;"></i>
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

// Desktop Pro Logic v2026
async function showEmployeeDetail(emp) {
    currentEmp = emp;

    // Smooth Transitions using GSAP
    gsap.to('#profileDetail', {
        opacity: 0, x: 20, duration: 0.2, onComplete: () => {
            document.getElementById('dt-name').textContent = emp.full_name;
            document.getElementById('dt-role').textContent = emp.role || '---';
            document.getElementById('dt-phone').textContent = emp.phone || '+998 -- --- -- --';
            document.getElementById('dt-dept').textContent = emp.department || '---';
            document.getElementById('dt-salary').textContent = (parseInt(emp.salary_info) || 0).toLocaleString();

            // Photo Handle
            const photoEl = document.getElementById('dt-photo');
            if (emp.photo) {
                photoEl.src = emp.photo;
            } else {
                photoEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.full_name)}&background=05080c&color=00ff88&size=200`;
            }

            // Stats Mix
            document.getElementById('dt-kpi').textContent = (85 + Math.floor(Math.random() * 10)) + '%';
            document.getElementById('dt-attendance').textContent = '94%';

            gsap.to('#profileDetail', { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' });
        }
    });
}

async function renderCalendar() {
    if (!currentEmp) return;
    const grid = document.getElementById('profCalendar');
    grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; opacity:0.3;">Yuklanmoqda...</p>';

    const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
    document.getElementById('profCalendarTitle').textContent = `${monthNames[calMonth]} ${calYear}`;

    const start = new Date(calYear, calMonth, 1).toISOString().split('T')[0];
    const end = new Date(calYear, calMonth + 1, 0).toISOString().split('T')[0];

    const { data: monthAtt } = await supabase.from('attendance').select('*').eq('employee_id', currentEmp.id).gte('date', start).lte('date', end);

    grid.innerHTML = '';
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const record = monthAtt ? monthAtt.find(x => x.date === dateStr) : null;

        const dayDiv = document.createElement('div');
        dayDiv.className = 'cal-day';
        if (record) dayDiv.classList.add('present');
        dayDiv.textContent = i;
        grid.appendChild(dayDiv);
    }
}

async function loadDailyAttendance(date) {
    const list = document.getElementById('attendanceList');
    list.innerHTML = '<tr><td colspan="6" style="text-align:center;">Yuklanmoqda...</td></tr>';

    const { data, error } = await supabase.from('attendance').select('*, employees(full_name)').eq('date', date);
    list.innerHTML = '';
    if (data) {
        data.forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${a.employees ? a.employees.full_name : '---'}</td>
                <td>${a.employee_id.substring(0, 6)}</td>
                <td>${a.check_in}</td>
                <td>${a.check_out || '--:--'}</td>
                <td>---</td>
                <td><span class="status-badge ${a.status === 'Vaqtida keldi' ? 'present' : 'late'}">${a.status}</span></td>
            `;
            list.appendChild(tr);
        });
    }
}

async function saveWorker() {
    const btn = document.getElementById('saveWorkerBtn');
    const fname = document.getElementById('empFirstName').value.trim();
    const lname = document.getElementById('empLastName').value.trim();
    const dept = document.getElementById('empDept').value;
    const role = document.getElementById('empRole').value.trim();
    const salary = document.getElementById('empSalary').value;
    const joinedYear = document.getElementById('empJoinedYear').value;
    const photoPreview = document.getElementById('photoPreview');

    if (!fname || !role) {
        alert("Ism va Lavozim majburiy!");
        return;
    }

    btn.textContent = 'Saqlanmoqda...';
    btn.disabled = true;

    // Convert preview image to Base64 if exists
    let photoData = null;
    if (photoPreview.src && photoPreview.style.display === 'block') {
        photoData = photoPreview.src;
    }

    const { error } = await supabase.from('employees').insert([{
        full_name: `${fname} ${lname}`,
        role: role,
        department: dept,
        salary_info: salary,
        experience: joinedYear ? `${joinedYear}-yildan beri` : "Yangi",
        photo: photoData,
        status: 'Ishlamoqda'
    }]);

    if (!error) {
        document.getElementById('addWorkerModalOverlay').style.display = 'none';
        await loadInitialData();
        clearModal();
    } else {
        alert("Xatolik: " + error.message);
    }
    btn.textContent = 'SAQLASH VA QO\'SHISH';
    btn.disabled = false;
}

function clearModal() {
    document.getElementById('empFirstName').value = '';
    document.getElementById('empLastName').value = '';
    document.getElementById('empRole').value = '';
    document.getElementById('empSalary').value = '';
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('photoPreview').src = '';
}
