import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('AKFA HR Premium 2026 Loaded');

    // --- 📱 TELEGRAM WEB APP INIT ---
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    if (tg) {
        tg.expand();
        tg.setHeaderColor('#05080d');
    }

    // --- 🕒 DATA CACHE & STATE ---
    let allStaff = [];
    let todayAtt = [];
    const systemDate = document.getElementById('systemDate');
    const hrName = document.getElementById('hrName');

    // Set Current Date in Uzbek
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    if (systemDate) systemDate.textContent = now.toLocaleDateString('uz-UZ', options);

    // --- 🔐 AUTH CHECK ---
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user && (user.role === 'admin' || user.role === 'hr')) {
        if (hrName) hrName.textContent = `Salom, ${user.username || 'HR'}`;
    }

    // --- 📥 LOAD HR DATA ---
    async function loadHRData() {
        showLoading(true);

        const { data: staff, error: e1 } = await supabase.from('employees').select('*');
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: att, error: e2 } = await supabase.from('attendance')
            .select('*')
            .eq('date', todayStr);

        if (!e1 && !e2) {
            allStaff = staff || [];
            todayAtt = att || [];
            updateStats();
            renderStaffFeed(allStaff);
        }

        showLoading(false);
    }

    function updateStats() {
        const totalCount = document.getElementById('totalStaffCount');
        const presentCount = document.getElementById('presentStaffCount');
        const lateCount = document.getElementById('lateStaffCount');

        if (totalCount) totalCount.textContent = allStaff.length;

        const presentToday = todayAtt.filter(a => a.status === 'Vaqtida keldi').length;
        const lateToday = todayAtt.filter(a => a.status === 'Kechikib keldi').length;

        if (presentCount) presentCount.textContent = presentToday;
        if (lateCount) lateCount.textContent = lateToday;
    }

    function renderStaffFeed(staff) {
        const feed = document.getElementById('staffFeed');
        if (!feed) return;

        feed.innerHTML = '';
        if (staff.length === 0) {
            feed.innerHTML = `
                <div style="text-align:center; padding:50px; opacity:0.3;">
                    <i data-lucide="info" style="margin-bottom:10px;"></i>
                    <p>Ma'lumot topilmadi</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        staff.forEach((emp, index) => {
            const card = document.createElement('div');
            card.className = 'staff-card';
            card.style.opacity = '0'; // For GSAP

            const initials = emp.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const attRecord = todayAtt.find(a => a.employee_id === emp.id);
            const isPresent = attRecord && (attRecord.status.includes('Keldi') || attRecord.status.includes('Vaqtida'));

            card.innerHTML = `
                <div class="staff-photo">${initials}</div>
                <div class="staff-meta">
                    <h4>${emp.full_name}</h4>
                    <p>${emp.role || 'Xodim'} • ${emp.department || 'Bo\'lim'}</p>
                </div>
                <div class="status-badge ${isPresent ? '' : 'offline'}"></div>
            `;

            card.onclick = () => {
                // Future: Detailed Profile Sheet
                if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
            };

            feed.appendChild(card);
        });

        // ✨ GSAP Entrance for Feed
        gsap.to('.staff-card', {
            opacity: 1,
            y: 0,
            stagger: 0.05,
            duration: 0.6,
            ease: 'power2.out',
            startAt: { y: 20 }
        });
    }

    function showLoading(show) {
        // Simple opacity fade for content
        gsap.to('#portal-content', { opacity: show ? 0.5 : 1, duration: 0.3 });
    }

    // --- 🗺️ BOTTOM NAVIGATION LOGIC ---
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            if (window.Telegram && window.Telegram.WebApp.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
            }
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        };
    });

    // --- 📁 CATEGORY FILTERS ---
    const pills = document.querySelectorAll('.cat-pill');
    pills.forEach(pill => {
        pill.onclick = () => {
            if (window.Telegram && window.Telegram.WebApp.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.selectionChanged();
            }
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const cat = pill.textContent.trim();

            if (cat === 'Barchasi') {
                renderStaffFeed(allStaff);
            } else {
                const filtered = allStaff.filter(e => e.department === cat);
                renderStaffFeed(filtered);
            }
        };
    });

    // --- 🔍 SEARCH LOGIC ---
    const searchInput = document.getElementById('hrSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = allStaff.filter(emp =>
                emp.full_name.toLowerCase().includes(val) ||
                (emp.role && emp.role.toLowerCase().includes(val))
            );
            renderStaffFeed(filtered);
        });
    }

    // --- 📥 ADD STAFF SUBMIT ---
    const submitBtn = document.getElementById('submitAddStaff');
    if (submitBtn) {
        submitBtn.onclick = async () => {
            const full_name = document.getElementById('addStaffName').value.trim();
            const department = document.getElementById('addStaffDept').value;
            const role = document.getElementById('addStaffRole').value.trim();

            if (!full_name || !role) {
                if (tg && tg.showAlert) tg.showAlert("Iltimos barcha maydonlarni to'ldiring!");
                return;
            }

            submitBtn.disabled = true;

            const { error } = await supabase.from('employees').insert([{
                full_name,
                department,
                role,
                salary_info: '---',
                experience: 'Yangi',
            }]);

            if (!error) {
                if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                // Close modal using globally defined logic in HTML
                const modal = document.getElementById('staffModal');
                const sheet = modal.querySelector('.sheet');
                gsap.to(sheet, { y: '100%', duration: 0.4 });
                gsap.to(modal, {
                    opacity: 0, duration: 0.3, onComplete: () => {
                        modal.style.display = 'none';
                        loadHRData();
                        document.getElementById('addStaffName').value = '';
                        document.getElementById('addStaffRole').value = '';
                        submitBtn.disabled = false;
                    }
                });
            } else {
                alert("Xatolik: " + error.message);
                submitBtn.disabled = false;
            }
        };
    }

    await loadHRData();
});
