import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('AKFA HR Portal v1.0 Loaded');

    // --- 📱 TELEGRAM WEB APP INIT ---
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    if (tg) {
        tg.expand();
        tg.setHeaderColor('#0d121b');
    }

    // --- 🕒 DATA CACHE & STATE ---
    let allStaff = [];
    let todayAtt = [];
    const systemTime = document.getElementById('systemTime');
    const hrAvatar = document.getElementById('hrAvatar');
    const hrName = document.getElementById('hrName');

    // Set Current Date
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    if (systemTime) systemTime.textContent = now.toLocaleDateString('uz-UZ', options);

    // --- 🔐 AUTH CHECK ---
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || (user.role !== 'admin' && user.role !== 'hr')) {
        // Not redirected for now for testing, but should be in production
        console.warn('Auth issue: Not an HR/Admin');
    } else {
        if (hrName) hrName.textContent = `Salom, ${user.full_name || 'HR'}`;
        if (hrAvatar && user.full_name) hrAvatar.textContent = user.full_name[0].toUpperCase();
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

        if (totalCount) totalCount.textContent = allStaff.length;

        const presentToday = todayAtt.filter(a => a.status.includes('Keldi') || a.status.includes('Vaqtida')).length;
        if (presentCount) presentCount.textContent = presentToday;
    }

    function renderStaffFeed(staff) {
        const feed = document.getElementById('staffFeed');
        if (!feed) return;

        feed.innerHTML = '';
        if (staff.length === 0) {
            feed.innerHTML = '<div style="text-align:center; padding:30px; opacity:0.3;">Ma\'lumot topilmadi</div>';
            return;
        }

        staff.forEach(emp => {
            const div = document.createElement('div');
            div.className = 'staff-row';

            const initials = emp.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const attRecord = todayAtt.find(a => a.employee_id === emp.id);
            const isPresent = attRecord && (attRecord.status.includes('Keldi') || attRecord.status.includes('Vaqtida'));

            div.innerHTML = `
                <div class="staff-avatar">${initials}</div>
                <div class="staff-info">
                    <h4>${emp.full_name}</h4>
                    <p>${emp.role || 'Xodim'}</p>
                </div>
                <div class="presence-tag ${isPresent ? 'tag-present' : 'tag-absent'}">
                    ${isPresent ? 'Kelgan' : 'Kelmagan'}
                </div>
            `;

            div.onclick = () => {
                // Future: Open individual staff manager modal
            };

            feed.appendChild(div);
        });
    }

    function showLoading(show) {
        // Future: Subtle top-loading bar
    }

    // --- 🗺️ BOTTOM NAVIGATION LOGIC ---
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const section = item.querySelector('.nav-label').textContent.toLowerCase();
            console.log('Switching to:', section);
            // Logic for switching screens would go here
        };
    });

    // --- 🔘 FILTER LOGIC ---
    const filters = document.querySelectorAll('.quick-action');
    filters.forEach(f => {
        f.onclick = () => {
            filters.forEach(x => x.classList.remove('active'));
            f.classList.add('active');
            const cat = f.textContent.trim();

            if (cat === 'Barchasi') {
                renderStaffFeed(allStaff);
            } else {
                const filtered = allStaff.filter(e => e.department === cat);
                renderStaffFeed(filtered);
            }
        };
    });

    // --- 🔍 SMART SEARCH LOGIC ---
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

    // --- 📥 STAFF MODAL (Bottom Sheet) ---
    const fab = document.getElementById('fabAddStaff');
    const modal = document.getElementById('staffModal');
    const submitBtn = document.getElementById('submitAddStaff');

    if (fab && modal) {
        fab.onclick = () => {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.style.display = 'none', 400);
            }
        };
    }

    if (submitBtn) {
        submitBtn.onclick = async () => {
            const full_name = document.getElementById('addStaffName').value.trim();
            const department = document.getElementById('addStaffDept').value;
            const role = document.getElementById('addStaffRole').value.trim();

            if (!full_name || !role) {
                alert("Iltimos barcha maydonlarni to'ldiring!");
                return;
            }

            submitBtn.textContent = "Saqlanmoqda...";
            submitBtn.disabled = true;

            const { error } = await supabase.from('employees').insert([{
                full_name,
                department,
                role,
                salary_info: '---', // Default for new admin adding
                experience: 'Yangi'
            }]);

            submitBtn.textContent = "Xodimni Saqlash";
            submitBtn.disabled = false;

            if (!error) {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                    loadHRData();
                    // Clear inputs
                    document.getElementById('addStaffName').value = '';
                    document.getElementById('addStaffRole').value = '';
                }, 400);
            } else {
                alert("Xatolik: " + error.message);
            }
        };
    }

    await loadHRData();
});
