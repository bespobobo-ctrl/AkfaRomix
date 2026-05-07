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
    let selectedWorkerId = null;
    let allEmployees = [];

    // --- ROMIX HR DATA (ELITE COMMAND) ---
    async function loadRomixHRData() {
        const { data: emps, error } = await supabase.from('employees').select('*').order('full_name', { ascending: true });
        if (error) {
            console.error("HR Load Error:", error);
            return;
        }
        allEmployees = emps;

        renderStaffList(allEmployees);
        initHRPills();
        initStaffSearch();

        if (emps && emps.length > 0) {
            selectedWorkerId = emps[0].id;
            updateStaffProfileCard(emps[0]);
        }

        renderModernCalendar(currentCalMonth, currentCalYear);

        const prevBtn = document.getElementById('cal-prev');
        const nextBtn = document.getElementById('cal-next');
        if (prevBtn && !prevBtn.dataset.navInit) {
            prevBtn.dataset.navInit = "true";
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

    async function checkPendingRequests() {
        const { data: reqs } = await supabase.from('attendance')
            .select('*, employees(full_name)')
            .eq('status', 'Tasdiqlash kutilmoqda');

        const panel = document.getElementById('hr-notif-panel');
        const list = document.getElementById('pending-requests-list');
        const dot = document.getElementById('global-notif-dot');

        if (reqs && reqs.length > 0) {
            panel.style.display = 'block';
            if (dot) dot.style.display = 'block';
            list.innerHTML = '';
            reqs.forEach(req => {
                const card = document.createElement('div');
                card.className = 'request-card';
                card.innerHTML = `
                    <div>
                        <div style="font-weight:700; font-size:0.85rem;">${req.employees?.full_name || 'Xodim'}</div>
                        <div style="font-size:0.7rem; opacity:0.6;">Sana: ${req.date}</div>
                    </div>
                    <div>
                        <button class="approve-btn" onclick="window.processLeave('${req.id}', true)">✓</button>
                        <button class="reject-btn" onclick="window.processLeave('${req.id}', false)">✖</button>
                    </div>
                `;
                list.appendChild(card);
            });
        } else {
            panel.style.display = 'none';
            if (dot) dot.style.display = 'none';
        }
    }

    // Setup robust history logging backed by localStorage
    window.AKFA_HISTORY = JSON.parse(localStorage.getItem('AKFA_HISTORY') || '[]');

    window.renderHistoryUI = () => {
        const tbody = document.getElementById('audit-trail-table');
        if (!tbody) return;
        tbody.innerHTML = '';
        window.AKFA_HISTORY.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${log.timeStr}</td><td><span style="background:rgba(0,124,82,0.1); color:#007c52; padding:4px 10px; border-radius:30px; font-size:0.75rem;">RAHBAR</span></td><td>${log.actionText}</td><td><span style="color:#00ff88; font-size:0.8rem; font-weight:700;">✓ Bajarildi</span></td>`;
            tbody.appendChild(tr);
        });
    };

    window.logToHistory = async (actionText) => {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}`;

        window.AKFA_HISTORY.unshift({ timeStr, actionText });
        if (window.AKFA_HISTORY.length > 50) window.AKFA_HISTORY.length = 50;
        localStorage.setItem('AKFA_HISTORY', JSON.stringify(window.AKFA_HISTORY));
        window.renderHistoryUI();

        try { await supabase.from('audit_logs').insert({ action: actionText, user: 'Rahbar', created_at: new Date() }); } catch (err) { }
    };

    // Call immediately on load to populate existing history
    window.renderHistoryUI();

    window.processLeave = async (id, approve) => {
        const newStatus = approve ? 'Ruxsat berildi' : 'Rad etildi';
        const { error } = await supabase.from('attendance').update({ status: newStatus }).eq('id', id);
        if (!error) {
            alert(`So'rov ${newStatus.toLowerCase()} (ID: ${id})`);
            window.logToHistory(`Dam olish so'rovi ${newStatus.toLowerCase()}`);
            checkPendingRequests();
            loadRomixHRData();
        }
    };

    function setupStaffActions() {
        const btnBonus = document.getElementById('btn-bonus');
        const btnRaise = document.getElementById('btn-raise');
        const btnLeave = document.getElementById('btn-leave');

        const modal = document.getElementById('hrActionModalOverlay');
        const title = document.getElementById('hrActionModalTitle');
        const desc = document.getElementById('hrActionModalDesc');
        const icon = document.getElementById('hrActionModalIcon');
        const container = document.getElementById('hrActionInputContainer');
        const saveBtn = document.getElementById('hrActionSaveBtn');
        const closeBtn = document.getElementById('hrActionCloseBtn');

        if (closeBtn && !closeBtn.dataset.init) {
            closeBtn.dataset.init = "true";
            closeBtn.onclick = () => { modal.style.display = 'none'; };
        }

        function openActionModal(actionType) {
            if (!selectedWorkerId) { alert("Xodim tanlanmagan!"); return; }
            modal.style.display = 'flex';
            container.innerHTML = '';

            // Re-fetch the button in case it was modified, though not strictly required.
            const currentSaveBtn = document.getElementById('hrActionSaveBtn');

            if (actionType === 'bonus') {
                icon.textContent = '💰';
                title.textContent = 'Premya Belgilash';
                desc.textContent = "Xodimga beriladigan mukofot miqdorini kiriting.";
                currentSaveBtn.style.background = 'linear-gradient(135deg, #FFD700, #DAA520)';
                currentSaveBtn.style.boxShadow = '0 4px 15px rgba(218, 165, 32, 0.4)';
                currentSaveBtn.style.color = '#000';

                container.innerHTML = `
                    <label style="font-size:0.8rem; color:var(--adm-text-sec); font-weight:600; margin-left:5px;">Miqdor (UZS)</label>
                    <input type="number" id="hrActionAmount" class="form-input-v2" placeholder="Masalan: 500000" style="font-size:1.1rem; padding:15px; border-radius:14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); color:#fff; width:100%; box-sizing:border-box;">
                `;

                currentSaveBtn.onclick = async () => {
                    const val = document.getElementById('hrActionAmount').value;
                    if (val) {
                        currentSaveBtn.innerHTML = "Saqlanmoqda...";
                        const today = new Date().toISOString().split('T')[0];
                        const { error } = await supabase.from('attendance').insert({ employee_id: selectedWorkerId, date: today, status: 'Premya', notes: `Miqdor: ${val} so'm` });
                        if (error) console.error("Insert error:", error);
                        window.logToHistory(`Xodimga premya belgilandi: ${val} so'm`);
                        alert(`${val} so'm premya muvaffaqiyatli belgilandi.`);
                        modal.style.display = 'none';
                        loadRomixHRData();
                    }
                };
            } else if (actionType === 'raise') {
                icon.textContent = '📈';
                title.textContent = "Oylikni O'zgartirish";
                desc.textContent = "Xodimning doimiy maoshini yangilang.";
                currentSaveBtn.style.background = 'linear-gradient(135deg, #00d2ff, #3a7bd5)';
                currentSaveBtn.style.boxShadow = '0 4px 15px rgba(0, 122, 255, 0.4)';
                currentSaveBtn.style.color = '#fff';

                container.innerHTML = `
                    <label style="font-size:0.8rem; color:var(--adm-text-sec); font-weight:600; margin-left:5px;">Yangi maosh miqdori</label>
                    <input type="number" id="hrActionSalary" class="form-input-v2" placeholder="Yangi oylikni kiriting" style="font-size:1.1rem; padding:15px; border-radius:14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); color:#fff; width:100%; box-sizing:border-box;">
                `;

                currentSaveBtn.onclick = async () => {
                    const val = document.getElementById('hrActionSalary').value;
                    if (val) {
                        currentSaveBtn.innerHTML = "Saqlanmoqda...";
                        const today = new Date().toISOString().split('T')[0];
                        await supabase.from('employees').update({ salary_info: val }).eq('id', selectedWorkerId);
                        const { error } = await supabase.from('attendance').insert({ employee_id: selectedWorkerId, date: today, status: 'Oylik oshirildi', notes: `Yangi maosh: ${val}` });
                        if (error) console.error("Insert error:", error);
                        window.logToHistory(`Xodimning oyligi o'zgartirildi: ${val}`);
                        alert("Oylik muvaffaqiyatli yangilandi.");
                        modal.style.display = 'none';
                        loadRomixHRData();
                    }
                };
            } else if (actionType === 'leave') {
                icon.textContent = '🏝️';
                title.textContent = "Dam Olish (Otpusk)";
                desc.textContent = "Xodimga qaysi sanalar orasida dam berishni belgilang.";
                currentSaveBtn.style.background = 'linear-gradient(135deg, #00ff88, #00cc6a)';
                currentSaveBtn.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.4)';
                currentSaveBtn.style.color = '#000';

                const today = new Date().toISOString().split('T')[0];
                container.innerHTML = `
                    <div style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label style="font-size:0.8rem; color:var(--adm-text-sec); font-weight:600; margin-left:5px;">Boshlanish</label>
                            <input type="date" id="hrActionStart" value="${today}" style="font-size:1rem; padding:14px; border-radius:14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); color:#fff; width:100%; box-sizing:border-box; margin-top:5px; color-scheme:dark;">
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:0.8rem; color:var(--adm-text-sec); font-weight:600; margin-left:5px;">Tugash</label>
                            <input type="date" id="hrActionEnd" value="${today}" style="font-size:1rem; padding:14px; border-radius:14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); color:#fff; width:100%; box-sizing:border-box; margin-top:5px; color-scheme:dark;">
                        </div>
                    </div>
                `;

                currentSaveBtn.onclick = async () => {
                    const start = document.getElementById('hrActionStart').value;
                    const end = document.getElementById('hrActionEnd').value;
                    if (start && end) {
                        currentSaveBtn.innerHTML = "Yuborilmoqda...";

                        let currentDate = new Date(start);
                        const endDate = new Date(end);
                        const insertPromises = [];

                        while (currentDate <= endDate) {
                            const dStr = currentDate.toISOString().split('T')[0];
                            insertPromises.push(
                                supabase.from('attendance').insert({
                                    employee_id: selectedWorkerId,
                                    date: dStr,
                                    status: 'Ruxsat so\'raldi',
                                    notes: `Muddat: ${start} dan ${end} gacha`
                                })
                            );
                            currentDate.setDate(currentDate.getDate() + 1);
                        }

                        try {
                            await Promise.all(insertPromises);
                        } catch (err) {
                            console.error('Leave insert issue', err);
                        }

                        window.logToHistory(`Dam olishga ruxsat so'rovi yuborildi: ${start} dan ${end} gacha`);
                        alert("Ruxsat berish so'rovi yuborildi. Rahbar tasdiqlashi kutilmoqda.");
                        modal.style.display = 'none';
                        checkPendingRequests();
                        loadRomixHRData();
                    }
                };
            }
            currentSaveBtn.innerHTML = "Tasdiqlash";
        }

        if (btnBonus && !btnBonus.dataset.initModal) {
            btnBonus.dataset.initModal = "true";
            btnBonus.onclick = () => openActionModal('bonus');
            btnRaise.onclick = () => openActionModal('raise');
            btnLeave.onclick = () => openActionModal('leave');
        }
    }

    // Check for requests every 30s
    setInterval(checkPendingRequests, 30000);
    setTimeout(checkPendingRequests, 2000);

    function initHRPills() {
        const pills = document.querySelectorAll('.pill-btn');
        pills.forEach(pill => {
            if (pill.dataset.init) return;
            pill.dataset.init = "true";

            pill.onclick = () => {
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const cat = pill.textContent.trim().toLowerCase();

                let filtered = allEmployees;
                if (cat === 'ustalar') {
                    filtered = allEmployees.filter(e => e.role.toLowerCase().includes('usta') || e.role.toLowerCase().includes('brigada') || e.role.toLowerCase().includes('operator'));
                } else if (cat === 'ofis') {
                    filtered = allEmployees.filter(e => e.role.toLowerCase().includes('ofis') || e.role.toLowerCase().includes('bugalter') || e.role.toLowerCase().includes('menejer') || e.role.toLowerCase().includes('admin'));
                } else if (cat === 'xo\'jalik') {
                    filtered = allEmployees.filter(e => e.role.toLowerCase().includes('xo\'jalik') || e.role.toLowerCase().includes('tozalik') || e.role.toLowerCase().includes('oshxona') || e.role.toLowerCase().includes('qorovul'));
                }
                renderStaffList(filtered);
            };
        });
    }

    function initStaffSearch() {
        const input = document.getElementById('staffSearchInput');
        if (!input || input.dataset.init) return;
        input.dataset.init = "true";
        input.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = allEmployees.filter(emp => emp.full_name.toLowerCase().includes(val) || emp.role.toLowerCase().includes(val));
            renderStaffList(filtered);
        });
    }

    function renderStaffList(staff) {
        const container = document.getElementById('staff-list-container');
        if (!container) return;

        if (!staff.length) {
            container.innerHTML = '<div style="text-align:center; opacity:0.3; padding:40px; font-size:0.8rem;">Xodimlar topilmadi</div>';
            return;
        }

        container.innerHTML = '';
        staff.forEach(emp => {
            const div = document.createElement('div');
            div.className = `staff-row-v2 ${emp.id === selectedWorkerId ? 'active' : ''}`;

            const initials = emp.full_name.split(' ').map(n => n?.[0]).join('').substring(0, 2).toUpperCase() || '?';
            const salary = emp.salary_info || '---';

            div.innerHTML = `
                <div class="staff-avatar-mini">${initials}</div>
                <div style="flex:1;">
                    <div style="font-weight:600; color:#fff; font-size:0.9rem;">${emp.full_name}</div>
                    <div style="font-size:0.7rem; color:rgba(255,255,255,0.4); margin-top:2px;">
                        ${emp.role || 'Xodim'} • <span style="color:var(--adm-accent); font-weight:700;">${salary}</span>
                    </div>
                </div>
                <div style="width:8px; height:8px; border-radius:50%; background:#00ff88; box-shadow:0 0 8px #00ff88;"></div>
            `;

            div.onclick = () => {
                document.querySelectorAll('.staff-row-v2').forEach(r => r.classList.remove('active'));
                div.classList.add('active');
                selectedWorkerId = emp.id;
                updateStaffProfileCard(emp);
            };

            container.appendChild(div);
        });
    }

    function updateStaffProfileCard(emp) {
        if (!emp) return;
        const img = document.getElementById('selected-staff-img');
        const name = document.getElementById('selected-staff-name');
        const role = document.getElementById('selected-staff-role');
        const salary = document.getElementById('st-salary-badge');

        if (img) img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.full_name)}&background=00ff88&color=000&size=200`;
        if (name) name.textContent = emp.full_name;
        if (role) role.textContent = emp.role;
        if (salary) salary.textContent = emp.salary_info || '---';

        // Additional info details
        document.getElementById('st-phone').textContent = emp.phone || '+998-- --- -- --';
        document.getElementById('st-dept').textContent = emp.department || 'Bo\'limsiz';
        document.getElementById('st-exp').textContent = emp.experience || 'Yangi xodim';

        // KPI and Tracking
        const kpi = (85 + Math.floor(Math.random() * 15));
        document.getElementById('st-kpi-val').textContent = kpi + "%";
        document.getElementById('kpi-bar').style.width = kpi + "%";
        document.getElementById('worked-hours').textContent = "08:30";
        document.getElementById('st-time-in').textContent = "08:12";
        document.getElementById('st-time-out').textContent = "--:--";

        renderModernCalendar(currentCalMonth, currentCalYear);
    }

    async function renderModernCalendar(month, year) {
        const calGrid = document.getElementById('calendar-grid-v2');
        if (!calGrid) return;

        let monthAtt = [];
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        if (selectedWorkerId) {
            const startStr = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
            const endStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${daysInMonth}`;
            const { data } = await supabase.from('attendance')
                .select('date, status, notes')
                .eq('employee_id', selectedWorkerId)
                .gte('date', startStr)
                .lte('date', endStr);
            monthAtt = data || [];
        }

        const monthHeader = document.getElementById('current-month-name');
        const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
        if (monthHeader) monthHeader.textContent = monthNames[month] + " " + year;

        // Clear and completely rebuild labels to prevent duplication race condition
        calGrid.innerHTML = '';
        const days = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
        days.forEach(d => {
            const l = document.createElement('div');
            l.className = 'cal-day-label';
            l.textContent = d;
            calGrid.appendChild(l);
        });

        const firstDay = new Date(year, month, 1).getDay();
        const adjustedFirstDay = (firstDay === 0) ? 6 : firstDay - 1;
        const today = new Date();

        // Add padding
        for (let i = 0; i < adjustedFirstDay; i++) {
            const div = document.createElement('div');
            div.className = 'cal-day-num disabled';
            calGrid.appendChild(div);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const div = document.createElement('div');
            div.className = 'cal-day-num';
            div.textContent = d;

            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            const dayRecords = monthAtt.filter(a => a.date && a.date.startsWith(dateStr));

            let displayStatusHTML = 'Baza ma\'lumoti yo\'q';

            if (dayRecords.length > 0) {
                const hasLate = dayRecords.some(r => r.status.includes('Kech'));
                const hasPresent = dayRecords.some(r => r.status.includes('Vaqtida') || r.status.includes('Keldi'));
                const isAbsent = dayRecords.some(r => r.status.includes('Kelmagan'));
                const isLeave = dayRecords.some(r => r.status.includes('Ruxsat') || r.status.includes('Dam') || r.status.includes('Tasdiqlash kutilmoqda'));
                const isLeftEarly = dayRecords.some(r => r.status.includes('erta ketdi') || r.status.includes('shundan yuborildi') || r.status.includes('Ish vaqtida ketdi'));
                const isSpecial = dayRecords.some(r => r.status.includes('Premya') || r.status.includes('Oylik'));

                if (isAbsent) {
                    div.style.background = 'rgba(255, 77, 79, 0.15)';
                    div.style.borderBottom = '3px solid #ff4d4f';
                    div.style.color = '#ff4d4f';
                } else if (isLeftEarly) {
                    div.style.background = 'rgba(255, 184, 0, 0.15)';
                    div.style.borderBottom = '3px solid #ffb800';
                    div.style.color = '#ffb800';
                } else if (isLeave) {
                    div.style.background = 'rgba(128, 0, 32, 0.3)';
                    div.style.borderBottom = '3px solid #BA68C8';
                    div.style.color = '#BA68C8';
                } else if (hasPresent) {
                    div.style.background = 'rgba(0, 210, 255, 0.1)';
                    div.style.borderBottom = '3px solid #00d2ff';
                    div.style.color = '#00d2ff';
                } else if (isSpecial) {
                    div.style.borderBottom = '3px solid #ffb800';
                } else if (hasLate) {
                    div.classList.add('has-late');
                } else {
                    div.classList.add('has-att');
                }

                displayStatusHTML = dayRecords.map(r => {
                    let icon = '📆';
                    let color = '#fff';
                    let bg = 'rgba(255,255,255,0.05)';
                    let s = r.status;

                    if (s.includes('Premya')) { icon = '💰'; color = '#FFD700'; bg = 'rgba(255,215,0,0.1)'; }
                    else if (s.includes('Oylik')) { icon = '📈'; color = '#00d2ff'; bg = 'rgba(0,210,255,0.1)'; }
                    else if (s.includes('Ruxsat') || s.includes('Tasdiqlash kutilmoqda') || s.includes('Dam')) { icon = '🏝️'; color = '#BA68C8'; bg = 'rgba(186,104,200,0.1)'; }
                    else if (s === 'Vaqtida keldi' || s.includes('Keldi')) { icon = '🟢'; color = '#00d2ff'; bg = 'rgba(0,210,255,0.1)'; }
                    else if (s === 'Kech qoldi' || s.includes('Kech')) { icon = '🔴'; color = '#ff4d4f'; bg = 'rgba(255,77,79,0.1)'; }

                    let notesHtml = r.notes ? `<div style="font-size:0.75rem; color:rgba(255,255,255,0.6); margin-top:6px; line-height:1.4;">📝 ${r.notes}</div>` : '';

                    return `
                        <div style="background:${bg}; border-left: 3px solid ${color}; padding:14px; border-radius:0 12px 12px 0; margin-bottom:12px; font-family:'Inter', sans-serif;">
                            <div style="font-weight:700; color:${color}; font-size:0.95rem; display:flex; align-items:center; gap:8px;">
                                <span>${icon}</span> ${s}
                            </div>
                            ${notesHtml}
                        </div>
                    `;
                }).join('');
            }

            if (year === today.getFullYear() && month === today.getMonth() && d === today.getDate()) {
                div.classList.add('today');
            }

            div.onclick = () => {
                document.querySelectorAll('.cal-day-num').forEach(c => c.classList.remove('active'));
                div.classList.add('active');

                // PAYROLL / TIME TRACKER CALCULATION
                let workedHours = 0;
                let isPresent = dayRecords.some(r => r.status.includes('Vaqtida') || r.status.includes('Keldi'));
                let isLate = dayRecords.some(r => r.status.includes('Kech'));
                let isLeaving = dayRecords.some(r => r.status.includes('Ruxsat') || r.status.includes('Dam') || r.status.includes('Tasdiqlash'));

                if (isPresent) workedHours = 10;
                else if (isLate) workedHours = 8.5; // Mock for late
                if (isLeaving) workedHours = 0;

                let salaryText = '0';
                if (window.romixStaffData && selectedWorkerId) {
                    const emp = window.romixStaffData.find(e => e.id === selectedWorkerId);
                    if (emp) salaryText = emp.salary_info || '0';
                }
                const monthlySalary = parseInt(salaryText.replace(/\\D/g, '')) || 0;

                // Calculate Working days in month (assuming Sunday is off)
                let workingDaysCount = 0;
                for (let i = 1; i <= daysInMonth; i++) {
                    if (new Date(year, month, i).getDay() !== 0) workingDaysCount++;
                }

                const dailyRate = workingDaysCount > 0 ? (monthlySalary / workingDaysCount) : 0;
                const hourlyRate = dailyRate / 10; // Default 10 hours workday (08:00 - 18:00)
                const earnedToday = Math.round(workedHours * hourlyRate);

                const details = document.getElementById('daily-att-details');
                if (details) {
                    details.innerHTML = `
                        <div style="width:100%;">
                            <div style="font-size:1.15rem; font-weight:800; color:#fff; text-align:center; padding-bottom:15px; margin-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.06);">
                                ${d} ${monthNames[month]}
                            </div>

                            <!-- PAYROLL CARD -->
                            <div style="margin-bottom:15px; background:linear-gradient(135deg, rgba(0,210,255,0.1), rgba(0,0,0,0.2)); border:1px solid rgba(0,210,255,0.15); border-radius:12px; padding:15px;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <div style="font-size:0.8rem; color:rgba(255,255,255,0.6); font-weight:600;">🕒 Ishlandi: <span style="color:#fff;">${workedHours} soat</span></div>
                                </div>
                                <div style="margin-top:8px; font-size:0.75rem; color:rgba(255,255,255,0.4);">💰 Kunlik stavka: ${Math.round(dailyRate).toLocaleString()} UZS</div>
                                <div style="margin-top:10px; font-size:1.3rem; font-weight:800; color:#00d2ff; text-shadow: 0 0 10px rgba(0,210,255,0.3);">
                                    +${earnedToday.toLocaleString()} so'm
                                </div>
                            </div>

                            <div style="display:flex; flex-direction:column; width:100%;">
                                ${displayStatusHTML === 'Baza ma\'lumoti yo\'q' ?
                            `<div style="text-align:center; padding:30px; color:rgba(255,255,255,0.25); font-size:0.85rem; font-weight:500;">Baza ma'lumoti yo'q</div>`
                            : displayStatusHTML}
                            </div>
                        </div>
                    `;
                }
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
