import { supabase } from './supabase.js';

let employeesData = [];
let todayAtt = [];
let currentEmp = null;
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth Check - Professional Guard
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || (user.role !== 'hr' && user.role !== 'admin')) {
        window.location.href = '/';
        return;
    }

    // Header Greeting
    if (document.getElementById('userNameLabel')) {
        document.getElementById('userNameLabel').textContent = user.username ? user.username : 'HR Manager';
    }

    // Logout Action
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = '/';
    });

    // Modal Control (Nixtio Style)
    const modal = document.getElementById('addWorkerModalOverlay');
    document.getElementById('addWorkerBtn').addEventListener('click', () => {
        modal.style.display = 'flex';
        gsap.from('.modal-nixtio', { y: 100, opacity: 0, duration: 0.5, ease: 'power4.out' });
    });

    document.getElementById('closeAddWorkerBtn').addEventListener('click', () => {
        gsap.to('.modal-nixtio', { y: 50, opacity: 0, duration: 0.3, onComplete: () => modal.style.display = 'none' });
    });

    document.getElementById('saveWorkerBtn').addEventListener('click', saveWorker);

    // Search Logic
    document.getElementById('hrSearchInput').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const filtered = employeesData.filter(emp =>
            emp.full_name.toLowerCase().includes(val) ||
            (emp.role && emp.role.toLowerCase().includes(val))
        );
        renderStaffList(filtered);
    });

    // Calendar Navigation
    document.getElementById('prevMonth').addEventListener('click', () => {
        calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
        renderCalendar();
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
        calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
        renderCalendar();
    });

    // Load Data
    await loadInitialData();
});

async function loadInitialData() {
    const todayStr = new Date().toISOString().split('T')[0];

    const { data: staff, error: e1 } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
    const { data: att, error: e2 } = await supabase.from('attendance').select('*').eq('date', todayStr);

    if (!e1 && !e2) {
        employeesData = staff || [];
        todayAtt = att || [];
        updateGlobalStats();
        renderStaffList(employeesData);
        loadDailyAttendance(todayStr);
        if (employeesData.length > 0) showEmployeeDetail(employeesData[0]);
    }
}

function updateGlobalStats() {
    document.getElementById('totalEmployeesCount').textContent = employeesData.length;
    const presentCount = todayAtt.filter(a => a.status === 'Vaqtida keldi').length;
    document.getElementById('todayArrivedCount').textContent = presentCount;

    const percent = employeesData.length > 0 ? Math.round((presentCount / employeesData.length) * 100) : 0;
    document.getElementById('attendancePercent').textContent = percent + '%';
}

function renderStaffList(data) {
    const list = document.getElementById('employeeList');
    list.innerHTML = '';

    if (data.length === 0) {
        list.innerHTML = '<p style="padding:20px; opacity:0.3;">Xodimlar topilmadi</p>';
        return;
    }

    data.forEach(emp => {
        const card = document.createElement('div');
        card.style = `
            flex: 0 0 160px; padding: 25px; background: #fff; border-radius: 25px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.03); cursor: pointer; text-align: center;
            border: 2px solid transparent; transition: 0.3s;
        `;
        if (currentEmp && currentEmp.id === emp.id) card.style.borderColor = 'var(--accent-primary)';

        const initials = emp.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const photo = emp.photo ? emp.photo : `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.full_name)}&background=f1f5f9&color=00d2ff&size=100`;

        card.innerHTML = `
            <img src="${photo}" style="width:60px; height:60px; border-radius:20px; object-fit:cover; margin-bottom:15px;">
            <h4 style="font-size:0.9rem; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${emp.full_name}</h4>
            <p style="font-size:0.7rem; color:var(--text-dim);">${emp.role || 'Xodim'}</p>
        `;

        card.onclick = () => {
            currentEmp = emp;
            renderStaffList(data); // Re-render to show active border
            showEmployeeDetail(emp);
        };
        list.appendChild(card);
    });
}

async function showEmployeeDetail(emp) {
    currentEmp = emp;

    // Transition Detail View
    gsap.to('.profile-pane, .analytics-pane', {
        opacity: 0, duration: 0.2, onComplete: () => {
            document.getElementById('dt-name').textContent = emp.full_name;
            document.getElementById('dt-role').textContent = emp.role || '---';
            document.getElementById('dt-photo').src = emp.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.full_name)}&background=00d2ff&color=fff&size=200`;

            // Stats
            document.getElementById('dt-salary').textContent = (parseInt(emp.salary_info) || 0).toLocaleString();
            document.getElementById('dt-kpi').textContent = (80 + Math.floor(Math.random() * 20)) + '%';

            gsap.to('.profile-pane, .analytics-pane', { opacity: 1, duration: 0.4, ease: 'power2.out' });
            renderCalendar();
        }
    });
}

async function renderCalendar() {
    if (!currentEmp) return;
    const grid = document.getElementById('profCalendar');
    grid.innerHTML = '<p style="padding:20px; opacity:0.3;">Yuklanmoqda...</p>';

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
        const dayDate = new Date(calYear, calMonth, i);
        const dayNamesShort = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];

        const dayDiv = document.createElement('div');
        dayDiv.className = `cal-day-box ${record ? 'active' : ''}`;
        if (new Date().toISOString().split('T')[0] === dateStr) dayDiv.style.border = '2px solid var(--accent-deep)';

        dayDiv.innerHTML = `
            <div class="cal-day-name">${dayNamesShort[dayDate.getDay()]}</div>
            <div class="cal-day-num">${i}</div>
        `;
        grid.appendChild(dayDiv);
    }
}

async function loadDailyAttendance(date) {
    const list = document.getElementById('attendanceList');
    list.innerHTML = '<p style="opacity:0.3;">Loglar yuklanmoqda...</p>';

    const { data } = await supabase.from('attendance').select('*, employees(full_name)').eq('date', date);
    list.innerHTML = '';
    if (data && data.length > 0) {
        data.forEach(a => {
            const card = document.createElement('div');
            card.className = 'task-card';
            card.innerHTML = `
                <div class="check-circle" style="background:${a.status === 'Vaqtida keldi' ? 'var(--accent-primary)' : '#ffb800'}; border:none;">
                    <i data-lucide="check" size="14" style="color:#fff"></i>
                </div>
                <div style="flex:1;">
                    <p style="font-weight:600; font-size:0.9rem;">${a.employees ? a.employees.full_name : 'Xodim'}</p>
                    <p style="font-size:0.7rem; opacity:0.6;">${a.status} • ${a.check_in}</p>
                </div>
            `;
            list.appendChild(card);
        });
        if (window.lucide) lucide.createIcons();
    } else {
        list.innerHTML = '<p style="opacity:0.5; font-size:0.8rem;">Bugun hali hech kim kelmadi.</p>';
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

    if (!fname || !role) {
        alert("Ma'lumotlarni to'liq kiriting!");
        return;
    }

    btn.textContent = 'Saqlanmoqda...';
    btn.disabled = true;

    const { error } = await supabase.from('employees').insert([{
        full_name: `${fname} ${lname}`,
        role: role,
        department: dept,
        salary_info: salary,
        experience: joinedYear ? `${joinedYear}-yildan beri` : "Yangi",
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
    document.getElementById('empFirstName').value = '';
    document.getElementById('empLastName').value = '';
    document.getElementById('empRole').value = '';
    document.getElementById('empSalary').value = '';
    document.getElementById('empJoinedYear').value = '';
}
