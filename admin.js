import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('AKFA Rahbar Paneli v2 Logic Loaded');
    let editingUserId = null;

    // Auth Check
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || user.role !== 'admin') {
        window.location.href = '/';
    }

    // Update Rahbar Profile Info
    const adminNameDisplay = document.getElementById('adminName');
    const adminAvatar = document.getElementById('adminAvatar');
    const displayName = user.username.toLowerCase() === 'admin' ? 'RAHBAR' : user.username.toUpperCase();
    if (adminNameDisplay) adminNameDisplay.textContent = displayName;
    if (adminAvatar) adminAvatar.src = `https://ui-avatars.com/api/?name=${displayName}&background=007c52&color=fff&size=100`;

    // Theme Toggle Logic
    const themeBtn = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeBtn) themeBtn.textContent = '☀️';
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            let theme = 'light';
            if (document.body.classList.contains('dark-mode')) {
                theme = 'dark';
                themeBtn.textContent = '☀️';
            } else {
                themeBtn.textContent = '🌙';
            }
            localStorage.setItem('theme', theme);
        });
    }

    // Logout
    const logoutBtn = document.getElementById('sidebarLogout');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem('currentUser');
            window.location.href = '/';
        };
    }

    // --- SECTION SWITCHING LOGIC ---
    const navIcons = document.querySelectorAll('.nav-icon[data-section]');
    const sections = document.querySelectorAll('.admin-section');

    navIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const target = icon.getAttribute('data-section');
            navIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');

            sections.forEach(sec => {
                sec.classList.remove('active');
                if (sec.id === `section-${target}`) sec.classList.add('active');
            });

            // Show/Hide Top Nav based on section
            const topNav = document.querySelector('.nav-links-v2');
            if (target === 'dashboard') {
                topNav.style.display = 'flex';
            } else {
                topNav.style.display = 'none';
            }

            if (target === 'users') loadSystemUsers();
        });
    });

    // --- ROMIX SUB-SECTION SWITCHING (TOP NAV) ---
    const topNavLinks = document.querySelectorAll('.nav-link-item[data-tab]');
    const romixSubSections = document.querySelectorAll('.romix-sub-section');

    topNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = link.getAttribute('data-tab');

            topNavLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            romixSubSections.forEach(sec => {
                sec.classList.remove('active');
                if (sec.id === `section-${tab}`) sec.classList.add('active');
            });

            if (tab === 'logins') loadSystemUsers();
            if (tab === 'xodimlar') loadRomixHRData();
            if (tab === 'dashboard') loadRomixDashboardStats();
        });
    });

    // --- ROMIX DASHBOARD STATS (PANEL) ---
    async function loadRomixDashboardStats() {
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Employee Stats
        const { data: emps } = await supabase.from('employees').select('id');
        const { data: att } = await supabase.from('attendance').select('status').eq('date', todayStr);

        const total = emps ? emps.length : 0;
        let arrived = 0, late = 0;
        if (att) {
            arrived = att.length;
            late = att.filter(a => a.status === 'Kech qoldi').length;
        }

        document.getElementById('stat-total-emp').textContent = total;
        document.getElementById('stat-arrived').textContent = arrived;
        document.getElementById('stat-late').textContent = late;
        document.getElementById('stat-absent').textContent = Math.max(0, total - arrived);

        // 2. Warehouse Stats
        const { data: prods } = await supabase.from('warehouse_products').select('current_stock');
        const totalStock = prods ? prods.reduce((sum, p) => sum + p.current_stock, 0) : 0;
        document.querySelector('#section-dashboard .balance-lg').innerHTML = `${totalStock.toLocaleString()} <small style="font-size: 0.8rem;">kg / dona</small>`;

        // 3. Recent Inventory
        const { data: txs } = await supabase.from('warehouse_transactions')
            .select('*, warehouse_products(name, unit)')
            .order('created_at', { ascending: false }).limit(3);

        const recentList = document.getElementById('recent-inventory-list');
        if (recentList && txs) {
            recentList.innerHTML = txs.map(tx => `
                <div style="display:flex; justify-content:space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 5px 0;">
                    <span>${tx.warehouse_products?.name || 'Mahsulot'}</span>
                    <b style="color:${tx.type === 'IN' ? '#00ff88' : '#ff4d4f'}">${tx.type === 'IN' ? '+' : '-'}${tx.quantity} ${tx.warehouse_products?.unit || ''}</b>
                </div>
            `).join('');
        }
    }

    let currentCalMonth = new Date().getMonth();
    let currentCalYear = new Date().getFullYear();

    // --- ROMIX HR DATA (MODERN) ---
    let selectedWorkerId = null;

    // --- ROMIX HR DATA (MODERN) ---
    async function loadRomixHRData() {
        const { data: emps, error } = await supabase.from('employees').select('*').order('full_name', { ascending: true });
        if (error) return;

        const listContainer = document.getElementById('staff-list-container');
        if (listContainer) {
            listContainer.innerHTML = emps.map(emp => `
                <div class="bento-card staff-list-row" style="cursor:pointer; display:flex; align-items:center; gap:15px; padding:12px; border: 1px solid var(--adm-border);" data-id="${emp.id}">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(emp.full_name)}&background=random" style="width:40px; height:40px; border-radius:10px;">
                    <div style="flex:1;">
                        <div style="font-weight:700; font-size:0.9rem;">${emp.full_name}</div>
                        <div style="font-size:0.75rem; color:var(--adm-text-sec);">${emp.role}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:600; font-size:0.8rem; color:var(--adm-accent);">${emp.salary_info || '---'}</div>
                        <div style="font-size:0.65rem; color:${emp.status === 'Ishlamoqda' ? '#00ff88' : '#ff4d4f'};">${emp.status}</div>
                    </div>
                </div>
            `).join('');

            listContainer.querySelectorAll('.staff-list-row').forEach(row => {
                row.onclick = () => {
                    const emp = emps.find(x => x.id === row.dataset.id);
                    if (emp) {
                        selectedWorkerId = emp.id;
                        updateStaffProfileCard(emp);
                    }
                    document.querySelectorAll('.staff-list-row').forEach(r => r.style.borderColor = 'var(--adm-border)');
                    row.style.borderColor = 'var(--adm-accent)';
                };
            });
        }

        if (emps && emps.length > 0) {
            selectedWorkerId = emps[0].id;
            updateStaffProfileCard(emps[0]);
        }

        renderModernCalendar(currentCalMonth, currentCalYear);

        // Attach Nav Events (once)
        const prevBtn = document.getElementById('cal-prev');
        const nextBtn = document.getElementById('cal-next');
        if (prevBtn && !prevBtn.dataset.init) {
            prevBtn.dataset.init = "true";
            prevBtn.onclick = () => {
                currentCalMonth--;
                if (currentCalMonth < 0) { currentCalMonth = 11; currentCalYear--; }
                renderModernCalendar(currentCalMonth, currentCalYear);
            };
            nextBtn.onclick = () => {
                currentCalMonth++;
                if (currentCalMonth > 11) { currentCalMonth = 0; currentCalYear++; }
                renderModernCalendar(currentCalMonth, currentCalYear);
            };
        }

        setupStaffActions();
    }

    function setupStaffActions() {
        const btnBonus = document.getElementById('btn-bonus');
        const btnRaise = document.getElementById('btn-raise');
        const btnLeave = document.getElementById('btn-leave');

        if (btnBonus && !btnBonus.dataset.init) {
            btnBonus.dataset.init = "true";
            btnBonus.onclick = async () => {
                if (!selectedWorkerId) return;
                const amount = prompt("Premya miqdorini kiriting (masalan: 500,000):");
                if (amount) {
                    alert(`Xodimga ${amount} premya belgilandi.`);
                    // Logic to store bonus could go here
                }
            };
            btnRaise.onclick = async () => {
                if (!selectedWorkerId) return;
                const newSalary = prompt("Yangi oylik miqdorini kiriting:");
                if (newSalary) {
                    const { error } = await supabase.from('employees').update({ salary_info: newSalary }).eq('id', selectedWorkerId);
                    if (!error) {
                        alert("Oylik muvaffaqiyatli o'zgartirildi.");
                        loadRomixHRData();
                    }
                }
            };
            btnLeave.onclick = async () => {
                if (!selectedWorkerId) return;
                const { data: reqs } = await supabase.from('attendance')
                    .select('*')
                    .eq('employee_id', selectedWorkerId)
                    .eq('status', 'Tasdiqlash kutilmoqda');

                if (reqs && reqs.length > 0) {
                    const choice = confirm("Xodim dam olish uchun ruxsat so'ragan. Tasdiqlaysizmi?\n\n'OK' - Ruxsat berish, 'Cancel' - Rad etish");
                    const newStatus = choice ? 'Ruxsat berildi' : 'Ruxsat berilmadi';
                    await supabase.from('attendance').update({ status: newStatus }).eq('id', reqs[0].id);
                    alert(`Javob yuborildi: ${newStatus}`);
                } else {
                    const choice = confirm("Xodimga dam olish (otpusk) bermoqchimisiz?");
                    if (choice) {
                        await supabase.from('employees').update({ status: 'Dam olmoqda' }).eq('id', selectedWorkerId);
                        alert("Xodim 'Dam olmoqda' holatiga o'tkazildi.");
                    }
                }
                loadRomixHRData();
            };
        }
    }

    function updateStaffProfileCard(emp) {
        document.getElementById('selected-staff-name').textContent = emp.full_name;
        document.getElementById('selected-staff-role').textContent = emp.role;
        document.getElementById('selected-staff-img').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.full_name)}&background=007c52&color=fff&size=200`;
        const salaryEl = document.getElementById('st-salary');
        if (salaryEl) salaryEl.textContent = emp.salary_info || '---';

        const joined = new Date(emp.created_at || new Date());
        const diff = Math.floor((new Date() - joined) / (1000 * 60 * 60 * 24));
        document.getElementById('st-exp').textContent = diff;
        document.getElementById('st-kpi').textContent = 85 + Math.floor(Math.random() * 14) + '%';
    }

    function renderModernCalendar(month, year) {
        const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
        const monthHeader = document.getElementById('current-month-name');
        if (monthHeader) monthHeader.textContent = monthNames[month] + " " + year;

        const calGrid = document.querySelector('.cal-grid');
        if (!calGrid) return;

        const labels = Array.from(calGrid.querySelectorAll('.cal-day-label'));
        calGrid.innerHTML = '';
        labels.forEach(l => calGrid.appendChild(l));

        const firstDay = new Date(year, month, 1).getDay();
        const offset = (firstDay === 0 ? 7 : firstDay) - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthLastDay = new Date(year, month, 0).getDate();

        for (let i = offset; i > 0; i--) {
            const div = document.createElement('div');
            div.className = 'cal-day-num disabled';
            div.textContent = prevMonthLastDay - i + 1;
            calGrid.appendChild(div);
        }

        const today = new Date().getDate();
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();

        for (let d = 1; d <= daysInMonth; d++) {
            const div = document.createElement('div');
            div.className = 'cal-day-num';
            if (d === today && month === thisMonth && year === thisYear) div.classList.add('active');

            div.textContent = d;
            div.onclick = () => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                document.querySelectorAll('.cal-day-num').forEach(x => x.classList.remove('active'));
                div.classList.add('active');
                showDailyAttendance(dateStr);
            };
            calGrid.appendChild(div);
        }
    }

    // Initial Load
    loadRomixDashboardStats();

    // --- SYSTEM USERS MANAGEMENT ---
    const sysUsersTable = document.getElementById('sysUsersTable');
    const userModalOverlay = document.getElementById('userModalOverlay');

    async function loadSystemUsers() {
        if (!sysUsersTable) return;
        sysUsersTable.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Yuklanmoqda...</td></tr>';

        // Use system_users table from Supabase
        const { data, error } = await supabase.from('system_users').select('*').order('created_at', { ascending: false });

        if (error) {
            console.error("Users load error:", error);
            sysUsersTable.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Xatolik: system_users jadvali topilmadi.</td></tr>';
            return;
        }

        sysUsersTable.innerHTML = '';
        data.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=random" style="width:30px; height:30px; border-radius:50%;">
                        <strong>${user.full_name}</strong>
                    </div>
                </td>
                <td><span class="status-badge" style="background:rgba(0,124,82,0.1); color:#007c52; padding:4px 10px; border-radius:30px;">${user.role === 'admin' ? 'RAHBAR' : user.role.toUpperCase()}</span></td>
                <td><code style="background:rgba(0,0,0,0.05); padding:2px 5px; border-radius:4px;">${user.username}</code> / ***</td>
                <td>Online</td>
                <td>
                    <button class="text-btn edit-user" data-id="${user.id}" style="margin-right:15px; border:none; background:none; cursor:pointer;">✏️</button>
                    <button class="text-btn delete-user" data-id="${user.id}" style="color:#ff4d4f; border:none; background:none; cursor:pointer;">🗑️</button>
                </td>
            `;
            sysUsersTable.appendChild(tr);
        });

        // Add Listeners
        document.querySelectorAll('.edit-user').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const u = data.find(x => x.id === id);
                if (u) {
                    editingUserId = u.id;
                    document.getElementById('modalUserTitle').textContent = "Foydalanuvchini Tahrirlash";
                    document.getElementById('sysFullname').value = u.full_name;
                    document.getElementById('sysUsername').value = u.username;
                    document.getElementById('sysPassword').value = u.password;
                    document.getElementById('sysRole').value = u.role;
                    userModalOverlay.style.display = 'flex';
                }
            };
        });

        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.onclick = async () => {
                const id = btn.getAttribute('data-id');
                if (confirm('Ushbu foydalanuvchini o\'chirmoqchimisiz?')) {
                    const { error } = await supabase.from('system_users').delete().eq('id', id);
                    if (!error) loadSystemUsers();
                }
            };
        });
    }

    const openAddUserModal = document.getElementById('openAddUserModal');
    if (openAddUserModal) {
        openAddUserModal.onclick = () => {
            editingUserId = null;
            document.getElementById('modalUserTitle').textContent = "Yangi Foydalanuvchi";
            document.getElementById('sysFullname').value = '';
            document.getElementById('sysUsername').value = '';
            document.getElementById('sysPassword').value = '';
            userModalOverlay.style.display = 'flex';
        };
    }

    const closeUserModal = document.getElementById('closeUserModal');
    if (closeUserModal) {
        closeUserModal.onclick = () => {
            userModalOverlay.style.display = 'none';
        };
    }

    const saveUserBtn = document.getElementById('saveUserBtn');
    if (saveUserBtn) {
        saveUserBtn.onclick = async () => {
            const full_name = document.getElementById('sysFullname').value.trim();
            const username = document.getElementById('sysUsername').value.trim();
            const password = document.getElementById('sysPassword').value.trim();
            const role = document.getElementById('sysRole').value;

            if (!username || !password || !full_name) {
                alert('Barcha maydonlarni to\'ldiring!');
                return;
            }

            saveUserBtn.textContent = 'Saqlanmoqda...';
            const userData = { full_name, username, password, role };

            let result;
            if (editingUserId) {
                result = await supabase.from('system_users').update(userData).eq('id', editingUserId);
            } else {
                result = await supabase.from('system_users').insert([userData]);
            }

            saveUserBtn.textContent = 'Saqlash';

            if (!result.error) {
                userModalOverlay.style.display = 'none';
                loadSystemUsers();
            } else {
                alert("Xatolik: " + result.error.message);
            }
        };
    }

    // Pulse animation for the chart bars
    const chartBars = document.querySelectorAll('.v2-bar');
    chartBars.forEach((bar, index) => {
        const height = bar.style.height;
        bar.style.height = '0';
        setTimeout(() => {
            bar.style.height = height;
        }, index * 100);
    });
});
