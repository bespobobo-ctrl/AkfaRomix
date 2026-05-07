import { supabase } from './supabase.js';

let employeesData = [];
let todayAtt = [];
let currentEmp = null;
let activeDept = 'all';
let tempPhotoData = null;
let activityChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 🛡️ AUTH GUARD
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || (user.role !== 'hr' && user.role !== 'admin')) {
        window.location.href = '/';
        return;
    }

    // Header Info
    const nameEl = document.getElementById('userNameLabel');
    const initEl = document.getElementById('userInitials');
    if (nameEl) nameEl.textContent = user.username || 'HR Admin';
    if (initEl) initEl.textContent = (user.username || 'A')[0].toUpperCase();

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = '/';
    });

    // 🍱 MODAL CONTROL (GSAP NIxtio Style)
    const modal = document.getElementById('addWorkerModalOverlay');
    document.getElementById('addWorkerBtn').addEventListener('click', () => {
        clearModal();
        modal.style.display = 'flex';
        gsap.fromTo(".modal-content",
            { scale: 0.8, opacity: 0, y: 40 },
            { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: "power4.out" }
        );
    });

    document.getElementById('closeAddWorkerBtn').addEventListener('click', () => {
        gsap.to(".modal-content", {
            scale: 0.9, opacity: 0, y: 20, duration: 0.3,
            onComplete: () => modal.style.display = 'none'
        });
    });

    // 🎫 BADGE MODAL
    const closeBadgeBtn = document.getElementById('closeBadgeBtn');
    if (closeBadgeBtn) {
        closeBadgeBtn.onclick = () => {
            gsap.to(".badge-lux-card", {
                scale: 0.8, opacity: 0, duration: 0.3, onComplete: () => {
                    document.getElementById('badgeModalOverlay').style.display = 'none';
                }
            });
        };
    }

    // 📸 ADVANCED PHOTO HANDLER (Nixtio Image Engine)
    const photoInput = document.getElementById('empPhotoFile');
    if (photoInput) {
        photoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validate format
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                alert("Iltimos, faqat JPG yoki PNG formatidagi rasm yuklang!");
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    // Create virtual canvas for resizing
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const size = 300; // Perfect for badges
                    canvas.width = size;
                    canvas.height = size;

                    // Square Crop Logic
                    const min = Math.min(img.width, img.height);
                    const sx = (img.width - min) / 2;
                    const sy = (img.height - min) / 2;

                    ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);

                    // Optimize quality
                    tempPhotoData = canvas.toDataURL('image/jpeg', 0.85);

                    const preview = document.getElementById('modalPhotoPreview');
                    if (preview) {
                        preview.src = tempPhotoData;
                        preview.style.display = 'block';
                        gsap.from(preview, { scale: 0.5, opacity: 0, duration: 0.5, ease: "back.out(1.7)" });
                        document.getElementById('plusIcon').style.display = 'none';
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    document.getElementById('saveWorkerBtn').addEventListener('click', saveWorker);

    // 🔍 SEARCH SYSTEM
    document.getElementById('hrSearchInput').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const filtered = employeesData.filter(emp =>
            emp.full_name.toLowerCase().includes(val) ||
            (emp.role && emp.role.toLowerCase().includes(val))
        );
        renderStaffList(filtered);
    });

    // 💊 DEPARTMENT TABS
    document.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeDept = pill.dataset.dept;
            filterAndRender();
        });
    });

    // 🏗️ DATA INITIALIZATION
    await loadInitialData();
});

async function loadInitialData() {
    const todayStr = new Date().toISOString().split('T')[0];

    const { data: staff, error: e1 } = await supabase
        .from('employees').select('*').order('created_at', { ascending: false });

    const { data: att, error: e2 } = await supabase
        .from('attendance').select('*').eq('date', todayStr);

    if (!e1) employeesData = staff || [];
    if (!e2) todayAtt = att || [];

    updateGlobalStats();
    renderStaffList(employeesData);
    if (employeesData.length > 0) showEmployeeDetail(employeesData[0]);
}

function filterAndRender() {
    const filtered = activeDept === 'all'
        ? employeesData
        : employeesData.filter(e => e.department === activeDept || (e.role && e.role.includes(activeDept)));
    renderStaffList(filtered);
}

function updateGlobalStats() {
    const total = employeesData.length;
    animateCounter('totalEmployeesCount', total);

    const present = todayAtt.filter(a => a.status === 'Vaqtida keldi').length;
    const late = todayAtt.filter(a => a.status === 'Kechikib keldi').length;

    animateCounter('todayArrivedCount', present + late);
    animateCounter('todayLateCount', late);

    let totalPayroll = 0;
    employeesData.forEach(e => {
        const sal = parseInt(String(e.salary_info || '0').replace(/[^0-9]/g, '')) || 0;
        totalPayroll += sal;
    });
    document.getElementById('payrollTotal').innerHTML = `${totalPayroll.toLocaleString()} <small style="font-size:0.7rem">UZS</small>`;
}

function animateCounter(id, target) {
    const obj = { val: 0 };
    const el = document.getElementById(id);
    if (!el) return;
    gsap.to(obj, {
        val: target,
        duration: 1.5,
        ease: "power3.out",
        onUpdate: () => { el.textContent = Math.floor(obj.val); }
    });
}

function renderStaffList(data) {
    const list = document.getElementById('employeeList');
    list.innerHTML = '';

    if (!data || data.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:40px 0; color:var(--text-s); font-size:0.8rem;">Xodim topilmadi</p>';
        return;
    }

    data.forEach(emp => {
        const item = document.createElement('div');
        item.className = 'staff-item';
        if (currentEmp && currentEmp.id === emp.id) item.classList.add('active');

        const initials = emp.full_name.split(' ').map(n => n?.[0]).join('').substring(0, 2).toUpperCase();
        const photoSrc = emp.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.full_name)}&background=0f172a&color=00ff88&size=100`;

        item.innerHTML = `
            <img src="${photoSrc}" class="staff-img" onerror="this.src='https://ui-avatars.com/api/?name=${initials}&background=0f172a&color=00ff88&size=100'">
            <div style="flex:1; min-width:0;">
                <div style="font-weight:800; font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${emp.full_name}</div>
                <div style="font-size:0.7rem; color:var(--text-s); font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">${emp.role || 'Xodim'}</div>
            </div>
        `;

        item.onclick = () => {
            document.querySelectorAll('.staff-item').forEach(r => r.classList.remove('active'));
            item.classList.add('active');
            showEmployeeDetail(emp);
        };

        list.appendChild(item);
    });
}

function showEmployeeDetail(emp) {
    currentEmp = emp;
    const panel = document.getElementById('profileDetail');

    gsap.to(panel, {
        opacity: 0, scale: 0.98, duration: 0.2, onComplete: () => {
            document.getElementById('dt-name').textContent = emp.full_name;
            document.getElementById('dt-role').textContent = (emp.role || 'Xodim').toUpperCase();
            document.getElementById('dt-dept').textContent = emp.department || 'Ofis';
            document.getElementById('dt-phone').textContent = emp.phone || '—';
            document.getElementById('dt-exp').textContent = emp.experience || 'Yangi';

            const photoEl = document.getElementById('dt-photo');
            photoEl.src = emp.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.full_name)}&background=0f172a&color=00ff88&size=300`;

            const salary = parseInt(String(emp.salary_info || '0').replace(/[^0-9]/g, '')) || 0;
            document.getElementById('dt-salary').textContent = salary.toLocaleString();
            document.getElementById('dt-kpi').textContent = (85 + Math.floor(Math.random() * 12)) + '%';
            document.getElementById('dt-attendance').textContent = '96%';

            initActivityChart();
            gsap.to(panel, { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" });
        }
    });
}

function initActivityChart() {
    const ctx = document.getElementById('detailActivityChart').getContext('2d');
    if (activityChart) activityChart.destroy();

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const accentColor = '#00ff88';

    activityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
            datasets: [{
                label: 'Ish soati',
                data: [8, 8.5, 7.8, 9, 8.2, 0, 0],
                backgroundColor: accentColor,
                borderRadius: 10,
                barThickness: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { display: false, beginAtZero: true },
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: isLight ? '#64748b' : 'rgba(255,255,255,0.4)', font: { weight: '800', size: 10 } }
                }
            }
        }
    });
}

async function saveWorker() {
    const btn = document.getElementById('saveWorkerBtn');
    const fname = document.getElementById('empFirstName').value.trim();
    const lname = document.getElementById('empLastName').value.trim();
    const role = document.getElementById('empRole').value.trim();
    const dept = document.getElementById('empDept').value;
    const salary = document.getElementById('empSalary').value.trim();
    const joinedYear = document.getElementById('empJoinedYear').value.trim();
    const phone = document.getElementById('empPhone').value.trim();
    const birthYear = document.getElementById('empBirthYear').value.trim();

    if (!fname || !role) { alert("Ism va Lavozim majburiy!"); return; }

    btn.textContent = 'PROSESSING...';
    btn.disabled = true;

    const fullName = `${fname} ${lname}`.trim();
    const avatar = tempPhotoData || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0d1622&color=00ff88&size=300`;

    const { data, error } = await supabase.from('employees').insert([{
        full_name: fullName,
        first_name: fname,
        last_name: lname,
        role: role,
        salary_info: salary || '0',
        phone: phone || '',
        birth_year: birthYear || null,
        experience: joinedYear ? `${joinedYear}-yildan beri` : 'Yangi',
        avatar_url: avatar,
        status: 'Ishlamoqda'
        // No department column in DB as per previous check, so we store it in role or experience if needed, or omit
    }]).select();

    if (!error) {
        btn.textContent = 'MUVAFFAQIYATLI!';
        setTimeout(async () => {
            document.getElementById('addWorkerModalOverlay').style.display = 'none';
            await loadInitialData();
            clearModal();
            prepareBadge(data[0]);
            btn.textContent = 'TASDIQLASH VA SAQLASH';
            btn.disabled = false;
        }, 1000);
    } else {
        alert("SQL Error: " + error.message);
        btn.textContent = 'XATOLIK!';
        btn.disabled = false;
    }
}

function prepareBadge(emp) {
    const badgeModal = document.getElementById('badgeModalOverlay');
    document.getElementById('badgePreviewPhoto').src = emp.avatar_url;
    document.getElementById('badgePreviewSurname').textContent = (emp.last_name || '').toUpperCase();
    document.getElementById('badgePreviewName').textContent = (emp.first_name || '').toUpperCase();
    document.getElementById('badgePreviewRole').textContent = (emp.role || '').toUpperCase();

    if (emp.birth_year) {
        const age = new Date().getFullYear() - parseInt(emp.birth_year);
        document.getElementById('badgePreviewAge').textContent = `${age} YOSH`;
    }

    const workerId = emp.id.substring(0, 8).toUpperCase();
    document.getElementById('badgePreviewID').textContent = `AKFA-${workerId}`;
    document.getElementById('badgePreviewQR').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=AKFA-STAFF-${emp.id}`;

    badgeModal.style.display = 'flex';
    gsap.fromTo(".badge-lux-card",
        { scale: 0.5, opacity: 0, rotateY: 90 },
        { scale: 1, opacity: 1, rotateY: 0, duration: 1.2, ease: "elastic.out(1, 0.75)" }
    );
}

window.printBadge = () => {
    const badge = document.getElementById('badgePrintArea');
    const btn = event.target;
    btn.textContent = 'EKSPORT QILINMOQDA...';

    html2canvas(badge, { scale: 3, useCORS: true, backgroundColor: null }).then(canvas => {
        const link = document.createElement('a');
        link.download = `AKFA-Badge-${document.getElementById('badgePreviewSurname').textContent}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        btn.textContent = 'YUKLAB OLISH (PNG)';
    });
};

function clearModal() {
    ['empFirstName', 'empLastName', 'empRole', 'empSalary', 'empJoinedYear', 'empPhone', 'empBirthYear'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    tempPhotoData = null;
    document.getElementById('modalPhotoPreview').style.display = 'none';
    document.getElementById('plusIcon').style.display = 'block';
}
