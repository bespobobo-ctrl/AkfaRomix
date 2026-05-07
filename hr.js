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
            gsap.to(".id-badge", {
                scale: 0.8, opacity: 0, duration: 0.3, stagger: 0.1, onComplete: () => {
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

    // 🎫 MANUAL BADGE PREVIEW
    document.getElementById('genBadgeBtn').addEventListener('click', () => {
        if (currentEmp) prepareBadge(currentEmp);
        else alert("Iltimos, xodimni tanlang!");
    });

    // 🏗️ DATA INITIALIZATION
    await loadInitialData();
    initHomeDashboard();

    // 🔄 PROFESSIONAL SYNC HEARTBEAT (Every 60s)
    setInterval(loadInitialData, 60000);
});

function initHomeDashboard() {
    const homeCtx = document.getElementById('homeTotalChart');
    if (!homeCtx) return;
    new Chart(homeCtx, {
        type: 'line',
        data: {
            labels: ['Yan', 'Feb', 'Mar', 'Apr', 'May', 'Iyun'],
            datasets: [{
                label: 'Oylik Fond O\'sishi',
                data: [45, 52, 48, 70, 75, 85],
                borderColor: '#00ff88',
                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { display: false }, x: { display: false } }
        }
    });
}

async function loadInitialData() {
    const todayStr = new Date().toISOString().split('T')[0];
    const list = document.getElementById('employeeList');

    // Skeleton placeholder
    list.innerHTML = Array(3).fill(0).map(() => `<div class="skeleton" style="height:80px; margin-bottom:10px;"></div>`).join('');

    const { data: staff, error: e1 } = await supabase
        .from('employees').select('*').order('created_at', { ascending: false });

    const { data: att, error: e2 } = await supabase
        .from('attendance').select('*').eq('date', todayStr);

    if (!e1) employeesData = staff || [];
    if (!e2) todayAtt = att || [];

    updateGlobalStats();
    renderStaffList(employeesData);
}

function filterAndRender() {
    let filtered = employeesData;
    if (activeDept !== 'all') {
        filtered = employeesData.filter(e => {
            const d = (e.department || '').toLowerCase();
            const r = (e.role || '').toLowerCase();
            const target = activeDept.toLowerCase();

            if (target === 'ustalar') {
                return d.includes('usta') || d.includes('ishlab') || r.includes('usta');
            } else if (target === 'ombor') {
                return d.includes('ombor') || r.includes('ombor');
            } else if (target === 'ofis') {
                return d.includes('ofis') || r.includes('manager');
            }
            return d === target;
        });
    }
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
        const isArrived = todayAtt.some(a => a.employee_id === emp.id);
        const item = document.createElement('div');
        item.className = 'staff-card';
        if (currentEmp && currentEmp.id === emp.id) item.classList.add('active');
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';

        item.innerHTML = `
            <div style="position:relative;">
                <img src="${emp.avatar_url}" class="avatar-img">
                <div class="status-dot" style="background: ${isArrived ? 'var(--accent)' : '#ff4444'}; box-shadow: 0 0 10px ${isArrived ? 'var(--accent)' : '#ff4444'}"></div>
            </div>
            <div class="staff-info">
                <h4>${emp.full_name}</h4>
                <p>${emp.role || 'HR'}</p>
            </div>
            <div style="margin-left:auto; opacity:0.3; font-size:0.8rem;">
                <i data-lucide="chevron-right" size="16"></i>
            </div>
        `;

        item.onclick = () => {
            document.querySelectorAll('.staff-card').forEach(r => r.classList.remove('active'));
            item.classList.add('active');
            showEmployeeDetail(emp);
        };

        list.appendChild(item);
    });

    lucide.createIcons();

    // 🎭 STAGGER ANIMATION
    gsap.to(".staff-card", {
        opacity: 1,
        x: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out"
    });
}

function showEmployeeDetail(emp) {
    currentEmp = emp;
    const homeView = document.getElementById('homeView');
    const profileView = document.getElementById('profileDetail');

    if (homeView.style.display !== 'none') {
        gsap.to(homeView, {
            opacity: 0, scale: 0.95, duration: 0.4, onComplete: () => {
                homeView.style.display = 'none';
                profileView.style.display = 'flex';
                gsap.fromTo(profileView, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" });
            }
        });
    } else {
        // Smooth refresh if profile already open
        gsap.fromTo(profileView, { opacity: 0.8 }, { opacity: 1, duration: 0.3 });
    }

    document.getElementById('dt-photo').src = emp.avatar_url;
    document.getElementById('dt-name').textContent = emp.full_name;
    document.getElementById('dt-role').textContent = emp.role || 'Xodim';
    document.getElementById('dt-phone').textContent = emp.phone || '---';
    document.getElementById('dt-dept').textContent = emp.department || 'Bo\'limsiz';
    document.getElementById('dt-salary').textContent = formatCurrency(emp.salary_info);
    document.getElementById('dt-experience').textContent = emp.experience || 'YANGI';

    initActivityChart();
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
        role: role,
        salary_info: salary || '0',
        phone: phone || '',
        birth_year: birthYear || null,
        avatar_url: avatar,
        status: 'Ishlamoqda'
    }]).select();

    if (!error && data && data.length > 0) {
        btn.textContent = 'MUVAFFAQIYATLI!';
        const newEmp = data[0];
        // Manually patch names for badge
        newEmp.first_name = fname;
        newEmp.last_name = lname;

        setTimeout(async () => {
            document.getElementById('addWorkerModalOverlay').style.display = 'none';
            await loadInitialData();
            clearModal();
            prepareBadge(newEmp);
            btn.textContent = 'TASDIQLASH VA SAQLASH';
            btn.disabled = false;
        }, 800);
    } else {
        alert("Xatolik: " + (error ? error.message : "Ma'lumot qaytmadi"));
        btn.textContent = 'TASDIQLASH VA SAQLASH';
        btn.disabled = false;
    }
}

function prepareBadge(emp) {
    const badgeModal = document.getElementById('badgeModalOverlay');

    // Safety: ensure first/last names exist
    if (!emp.first_name || !emp.last_name) {
        const parts = emp.full_name.split(' ');
        emp.first_name = parts[0] || '';
        emp.last_name = parts.slice(1).join(' ') || '';
    }

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
    gsap.fromTo(".id-badge",
        { scale: 0.5, opacity: 0, y: 50 },
        { scale: 1, opacity: 1, y: 0, duration: 0.8, stagger: 0.2, ease: "back.out(1.7)" }
    );
}

window.downloadBadge = () => {
    const badge = document.getElementById('badgePrintArea');
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'YUKLANMOQDA...';

    html2canvas(badge, { scale: 3, useCORS: true, backgroundColor: null }).then(canvas => {
        const link = document.createElement('a');
        link.download = `AKFA-Badge-${document.getElementById('badgePreviewSurname').textContent}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        btn.textContent = originalText;
    });
};

window.printBadgeReal = () => {
    const badgeHtml = document.getElementById('badgePrintArea').innerHTML;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
        <html>
            <head>
                <title>Print Badge</title>
                <style>
                    body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fff; }
                    .badge-presentation { display: flex; gap: 40px; transform: scale(1.2); }
                    .id-badge { width: 260px; height: 410px; background: #fff; border-radius: 12px; position: relative; overflow: hidden; border: 1px solid #ddd; display: flex; flex-direction: column; font-family: sans-serif; }
                    .badge-lanyard { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); width: 30px; height: 60px; background: #1a7b7c; border-radius: 4px; }
                    .badge-header { margin-top: 65px; padding: 0 15px; display: flex; justify-content: space-between; }
                    .logo-box { font-weight: 800; font-size: 1.1rem; color: #1a7b7c; }
                    .badge-photo-container { flex: 1; display: flex; justify-content: center; align-items: flex-end; }
                    .badge-photo { width: 90%; height: 200px; object-fit: cover; border-radius: 8px; border: 3px solid #fff; }
                    .badge-bottom-box { background: #4ab3b4; height: 80px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #fff; }
                    .badge-surname { font-size: 1.8rem; font-weight: 900; }
                    .badge-qr-container { flex: 1; display: flex; justify-content: center; align-items: center; }
                    .badge-qr-large { width: 140px; height: 140px; border: 6px solid #1a7b7c; }
                    .badge-very-bottom-text { background: #1a7b7c; color: #8fd5d5; font-size: 0.5rem; text-align: center; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="badge-presentation">${badgeHtml}</div>
                <script>
                    setTimeout(() => { window.print(); window.close(); }, 500);
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
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
