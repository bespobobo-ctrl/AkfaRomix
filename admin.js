import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('AKFA Rahbar Paneli v2 Logic Loaded');
    let editingUserId = null;

    // Auth Check
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || user.role !== 'admin') {
        window.location.href = '/';
    }

    // Initialize Telegram WebApp if available
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    if (tg) {
        tg.expand();
        // Set header color for premium look
        tg.setHeaderColor('#0d1622');
    }

    // Update Rahbar Profile Info
    const adminNameDisplay = document.getElementById('adminName');
    const adminAvatar = document.getElementById('adminAvatar');
    const displayName = user.username.toLowerCase() === 'admin' ? 'RAHBAR' : user.username.toUpperCase();
    if (adminNameDisplay) adminNameDisplay.textContent = displayName;
    if (adminAvatar) adminAvatar.src = `https://ui-avatars.com/api/?name=${displayName}&background=007c52&color=fff&size=100`;

    // Global switchSection refinement for mobile state
    window.switchSection = (sectionId) => {
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(sectionId);
        if (target) target.classList.add('active');

        // Sidebar link active state
        document.querySelectorAll('.nav-link-v2').forEach(l => {
            l.classList.toggle('active', l.getAttribute('onclick')?.includes(sectionId));
        });

        // Mobile Nav active state
        document.querySelectorAll('.m-nav-item').forEach(mi => {
            mi.classList.toggle('active', mi.getAttribute('onclick')?.includes(sectionId));
        });
    };

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
            if (tab === 'xodimlar') loadEmployees();
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
        initMobileFilters(); // AKFA Mobile Engine
        initMobileSearch();  // AKFA Mobile Engine
        initStaffModal(); // New induction system

        if (emps && emps.length > 0) {
            selectedWorkerId = emps[0].id;
            // Only auto-update desktop card, don't open mobile drawer automatically
            if (window.innerWidth > 1024) {
                updateStaffProfileCard(emps[0]);
            }
        }

        // AKFA Elite HR v2.1
        renderModernCalendar(currentCalMonth, currentCalYear);

        const prevBtn = document.getElementById('cal-prev');
        const nextBtn = document.getElementById('cal-next');
        const todayBtn = document.getElementById('cal-today');
        const toggleCalBtn = document.getElementById('toggleCalendarBtn');
        const calContainer = document.getElementById('collapsible-cal-container');

        if (toggleCalBtn && calContainer) {
            toggleCalBtn.onclick = () => {
                const isHidden = calContainer.style.display === 'none';
                calContainer.style.display = isHidden ? 'block' : 'none';
                toggleCalBtn.textContent = isHidden ? '✖ Yopish' : '📅 Taqvimni ochish';
            };
        }

        // Update Today's Big Display
        const now = new Date();
        const days = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
        const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
        const bigDate = document.getElementById('today-big-display');
        const bigDay = document.getElementById('today-day-name');
        if (bigDate) bigDate.textContent = `${now.getDate()} ${months[now.getMonth()]}`;
        if (bigDay) bigDay.textContent = `${days[now.getDay()]}, ${now.getFullYear()}`;

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
            if (todayBtn) {
                todayBtn.onclick = () => {
                    const now = new Date();
                    currentCalMonth = now.getMonth();
                    currentCalYear = now.getFullYear();
                    renderModernCalendar(currentCalMonth, currentCalYear);
                };
            }
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

    window.deleteHrEvent = async (id) => {
        if (confirm('Haqiqatan ham bu amalni bekor qilmoqchimisiz (tarixdan o\'chirmoqchimisiz)?')) {
            const { error } = await supabase.from('attendance').delete().eq('id', id);
            if (error) { alert("Xatolik: " + error.message); return; }
            window.logToHistory(`Rahbar amalni bekor qildi (ID: ${id})`);
            document.getElementById('hrActionModalOverlay').style.display = 'none';
            loadRomixHRData();
        }
    };

    window.editHrEvent = async (id, currentStatus) => {
        const newVal = prompt("Yangi ma'lumotlarni yoki miqdorni kiriting:", currentStatus);
        if (newVal !== null) {
            const { error } = await supabase.from('attendance').update({ status: newVal }).eq('id', id);
            if (error) { alert("Xatolik: " + error.message); return; }
            window.logToHistory(`Rahbar amalni tahrirladi (P/N: ${id.substring(0, 6)})`);
            loadRomixHRData();
        }
    };

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
                        const { error } = await supabase.from('attendance').insert({ employee_id: selectedWorkerId, date: today, status: `Premya: ${val} so'm` });
                        if (error) { alert("Xatolik saqlashda: " + error.message); return; }
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
                        const { error } = await supabase.from('attendance').insert({ employee_id: selectedWorkerId, date: today, status: `Oylik oshirildi: ${val}` });
                        if (error) { alert("Xatolik saqlashda: " + error.message); return; }
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
                                    status: `Ruxsat so'raldi: ${start} dan ${end}`,
                                })
                            );
                            currentDate.setDate(currentDate.getDate() + 1);
                        }

                        try {
                            const { error: batchErr } = await Promise.all(insertPromises);
                            if (batchErr) { alert("Xatolik: " + batchErr.message); }
                        } catch (err) {
                            alert("Kutilmagan xatolik: " + err.message);
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

    let editingStaffId = null;

    function initStaffModal() {
        const overlay = document.getElementById('staffModalOverlay');
        const openBtn = document.getElementById('openAddStaffModal');
        const openBtnMobile = document.getElementById('openAddStaffModalMobile');
        const closeBtn = document.getElementById('closeStaffModal');
        const saveBtn = document.getElementById('saveStaffBtn');
        const deleteStaffBtn = document.getElementById('deleteStaffBtn');

        const resetForm = () => {
            editingStaffId = null;
            document.getElementById('staffModalTitle').textContent = "Yangi Ishchi Qo'shish";
            document.getElementById('staffFullname').value = '';
            document.getElementById('staffRole').value = '';
            document.getElementById('staffPhone').value = '+998';
            document.getElementById('staffSalary').value = '';
            document.getElementById('staffJoinedYear').value = '';
            if (deleteStaffBtn) deleteStaffBtn.style.display = 'none';
        };

        if (openBtn) openBtn.onclick = () => { overlay.style.display = 'flex'; resetForm(); };
        if (openBtnMobile) openBtnMobile.onclick = () => { overlay.style.display = 'flex'; resetForm(); };

        if (closeBtn) closeBtn.onclick = () => overlay.style.display = 'none';

        if (saveBtn) {
            saveBtn.onclick = async () => {
                const full_name = document.getElementById('staffFullname').value.trim();
                const department = document.getElementById('staffDept').value;
                const role = document.getElementById('staffRole').value.trim();
                const phone = document.getElementById('staffPhone').value.trim();
                const salary = document.getElementById('staffSalary').value.trim();
                const birth_year = document.getElementById('staffBirthYear').value.trim();
                const joined_year = document.getElementById('staffJoinedYear').value.trim();

                if (!full_name || !role || !salary) {
                    alert("Iltimos, barcha asosiy maydonlarni to'ldiring!");
                    return;
                }

                saveBtn.textContent = "Saqlanmoqda...";
                const staffData = {
                    full_name,
                    role,
                    phone,
                    salary_info: salary.includes("so'm") ? salary : salary + " so'm",
                    birth_year: birth_year || null,
                    status: 'Ishlamoqda'
                };

                let result;
                if (editingStaffId) {
                    result = await supabase.from('employees').update(staffData).eq('id', editingStaffId);
                } else {
                    result = await supabase.from('employees').insert([staffData]);
                }

                saveBtn.textContent = "Xodimni Saqlash";
                if (!result.error) {
                    overlay.style.display = 'none';
                    loadRomixHRData();
                    alert(editingStaffId ? "Ma'lumotlar yangilandi!" : "Yangi xodim qo'shildi!");
                } else {
                    alert("Xatolik: " + result.error.message);
                }
            };
        }

        if (deleteStaffBtn) {
            deleteStaffBtn.onclick = async () => {
                if (editingStaffId && confirm("Haqiqatdan ham ushbu xodimni o'chirmoqchimisiz?")) {
                    const { error } = await supabase.from('employees').delete().eq('id', editingStaffId);
                    if (!error) {
                        overlay.style.display = 'none';
                        loadRomixHRData();
                        alert("Xodim o'chirildi.");
                    } else {
                        alert("Xatolik: " + error.message);
                    }
                }
            };
        }
    }

    function openEditStaffModal(emp) {
        const overlay = document.getElementById('staffModalOverlay');
        editingStaffId = emp.id;
        document.getElementById('staffModalTitle').textContent = "Ma'lumotlarni Tahrirlash";
        document.getElementById('staffFullname').value = emp.full_name;
        document.getElementById('staffDept').value = emp.department || 'Ustalar';
        document.getElementById('staffRole').value = emp.role || '';
        document.getElementById('staffPhone').value = emp.phone || '+998';
        const salaryVal = emp.salary_info ? emp.salary_info.toString().replace(/[^0-9]/g, '') : '';
        document.getElementById('staffSalary').value = salaryVal;
        const yearVal = emp.experience ? emp.experience.toString().replace(/[^0-9]/g, '') : '';
        document.getElementById('staffJoinedYear').value = yearVal;
        document.getElementById('staffBirthYear').value = emp.birth_year || '';

        const delBtn = document.getElementById('deleteStaffBtn');
        if (delBtn) delBtn.style.display = 'block';
        overlay.style.display = 'flex';
    }

    function setupStaffActions() {
        const btnEdit = document.getElementById('btn-edit-staff');
        const btnDelete = document.getElementById('btn-delete-staff');

        if (btnEdit) {
            btnEdit.onclick = () => {
                const emp = allEmployees.find(e => e.id === selectedWorkerId);
                if (emp) openEditStaffModal(emp);
                else alert("Xodim tanlanmagan!");
            };
        }

        if (btnDelete) {
            btnDelete.onclick = async () => {
                if (selectedWorkerId && confirm("Xodimni o'chirishni tasdiqlaysizmi?")) {
                    const { error } = await supabase.from('employees').delete().eq('id', selectedWorkerId);
                    if (!error) {
                        loadRomixHRData();
                        alert("O'chirildi.");
                    } else {
                        alert("Xatolik: " + error.message);
                    }
                }
            };
        }
    }

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
                if (cat !== 'barchasi') {
                    // Match pill name to actual department field
                    let deptVal = pill.textContent.trim();
                    if (deptVal === 'Ustalar') {
                        filtered = allEmployees.filter(e => e.department === 'Ustalar' || e.department === 'Usta');
                    } else {
                        filtered = allEmployees.filter(e => e.department === deptVal);
                    }
                }

                renderStaffList(filtered);

                if (filtered.length > 0 && window.innerWidth > 1024) {
                    selectedWorkerId = filtered[0].id;
                    updateStaffProfileCard(filtered[0]);
                }
            };
        });
    }

    function initStaffSearch() {
        const input = document.getElementById('staffSearchInput');
        if (!input || input.dataset.init) return;
        input.dataset.init = "true";
        input.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = allEmployees.filter(emp => emp.full_name.toLowerCase().includes(val) || (emp.role && emp.role.toLowerCase().includes(val)));
            renderStaffList(filtered);
        });
    }

    function initMobileFilters() {
        const chips = document.querySelectorAll('.filter-chips .chip');
        chips.forEach(chip => {
            if (chip.dataset.init) return;
            chip.dataset.init = "true";
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const dept = chip.dataset.dept;

                let filtered = allEmployees;
                if (dept !== 'all') {
                    filtered = allEmployees.filter(e => e.department === dept);
                }
                renderStaffList(filtered);

                // No auto-opening of drawer on mobile during filtering
                if (filtered.length > 0 && window.innerWidth > 1024) {
                    updateStaffProfileCard(filtered[0]);
                }
            });
        });
    }

    function initMobileSearch() {
        const input = document.getElementById('staffMobileSearch');
        if (!input || input.dataset.init) return;
        input.dataset.init = "true";
        input.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = allEmployees.filter(emp =>
                emp.full_name.toLowerCase().includes(val) ||
                (emp.role && emp.role.toLowerCase().includes(val)) ||
                (emp.department && emp.department.toLowerCase().includes(val))
            );
            renderStaffList(filtered);
        });
    }

    function renderStaffList(staff) {
        const container = document.getElementById('staff-list-container');
        const mobileContainer = document.getElementById('mobileStaffList');
        if (!container) return;

        if (!staff.length) {
            container.innerHTML = '<tr><td colspan="7" style="text-align:center; opacity:0.3; padding:40px;">Xodimlar topilmadi</td></tr>';
            if (mobileContainer) mobileContainer.innerHTML = '<div style="text-align:center; opacity:0.3; padding:40px; color:var(--adm-text-sec);">Xodimlar topilmadi</div>';
            return;
        }

        container.innerHTML = '';
        if (mobileContainer) mobileContainer.innerHTML = '';

        staff.forEach(emp => {
            // --- Desktop Rendering ---
            const tr = document.createElement('tr');
            tr.className = `table-row-staff ${emp.id === selectedWorkerId ? 'active' : ''}`;
            tr.style.cursor = 'pointer';
            tr.style.transition = '0.2s';

            const initials = emp.full_name.split(' ').map(n => n?.[0]).join('').substring(0, 2).toUpperCase() || '?';
            const salary = emp.salary_info || '---';
            const avatarHtml = emp.avatar_url
                ? `<img src="${emp.avatar_url}" style="width:32px; height:32px; border-radius:10px; object-fit:cover;">`
                : `<div style="width:32px; height:32px; border-radius:10px; background:linear-gradient(135deg, #00d2ff, #007aff); display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:700; color:#fff;">${initials}</div>`;

            tr.innerHTML = `
                <td style="padding:15px 24px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        ${avatarHtml}
                        <div style="font-weight:600; color:var(--adm-text); overflow:hidden; text-overflow:ellipsis;">${emp.full_name}</div>
                    </div>
                </td>
                <td style="font-size:0.85rem; color:var(--adm-text-sec); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${emp.role || '---'}</td>
                <td style="font-size:0.85rem; font-weight:700; color:var(--adm-accent); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${salary}</td>
                <td style="font-size:0.85rem; color:var(--adm-text-sec); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:0.8;">${emp.department || 'Bo\'limsiz'}</td>
                <td style="font-size:0.85rem; color:var(--adm-text-sec); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${emp.experience || 'Yangi'}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="width:8px; height:8px; border-radius:50%; background:#007c52; box-shadow:0 0 8px rgba(0,124,82,0.3);"></span>
                        <span style="font-size:0.75rem; color:#007c52; font-weight:700;">Faol</span>
                    </div>
                </td>
                <td style="text-align:right; padding-right:24px; display:flex; gap:10px; justify-content:flex-end;">
                    <button class="icon-small-btn view-staff-btn" data-id="${emp.id}" style="background:rgba(0,210,255,0.1); border:1px solid rgba(0,210,255,0.2); color:var(--accent-sec); width:32px; height:32px; cursor:pointer; border-radius:8px;" title="Profilni ko'rish">👁️</button>
                    <button class="icon-small-btn" style="background:var(--adm-bg); border:1px solid var(--adm-border); color:var(--adm-text); width:32px; height:32px; cursor:pointer; border-radius:8px;">⋮</button>
                </td>
            `;

            tr.onclick = () => {
                document.querySelectorAll('.table-row-staff').forEach(r => {
                    r.style.background = '';
                    r.classList.remove('active');
                });
                tr.style.background = 'rgba(0,210,255,0.08)';
                tr.classList.add('active');
                selectedWorkerId = emp.id;
                updateStaffProfileCard(emp);
                const detailPanel = document.querySelector('.hr-detail-panel');
                if (detailPanel && window.innerWidth > 1024) detailPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };

            container.appendChild(tr);

            // Eye Icon click handler
            const viewBtn = tr.querySelector('.view-staff-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Don't trigger the TR click twice
                    selectedWorkerId = emp.id;
                    updateStaffProfileCard(emp);
                    // Smooth scroll to profile on mobile/small screens
                    const detailPanel = document.querySelector('.hr-detail-panel');
                    if (detailPanel) detailPanel.scrollIntoView({ behavior: 'smooth' });
                });
            }

            // --- Mobile Rendering (Elite Cards) ---
            if (mobileContainer) {
                const card = document.createElement('div');
                card.className = 'staff-card-v2';
                card.innerHTML = `
                    <div class="sc-header">
                        <div class="sc-avatar">${initials}</div>
                        <div class="sc-info">
                            <div class="sc-name">${emp.full_name}</div>
                            <div class="sc-role">${emp.role || 'Bolimsiz'}</div>
                        </div>
                        <div class="sc-status present"></div>
                    </div>
                    <div class="sc-body">
                        <div class="sc-stat">
                            <span>Telefon</span>
                            <b>${emp.phone || '+998 ---'}</b>
                        </div>
                        <div class="sc-stat">
                            <span>Bo'lim</span>
                            <b>${emp.department || '---'}</b>
                        </div>
                    </div>
                    <div class="sc-actions">
                        <a href="tel:${emp.phone}" class="sc-btn call" style="text-decoration:none;">📞 Qo'ng'iroq</a>
                        <button class="sc-btn profile-trigger">⚙️ Profil</button>
                    </div>
                `;

                const btn = card.querySelector('.profile-trigger');
                if (btn) {
                    btn.addEventListener('click', () => {
                        updateStaffProfileCard(emp);
                    });
                }

                mobileContainer.appendChild(card);
            }
        });
    }

    function updateStaffProfileCard(emp) {
        if (!emp) return;
        selectedWorkerId = emp.id;
        const img = document.getElementById('selected-staff-img');
        const name = document.getElementById('selected-staff-name');
        const role = document.getElementById('selected-staff-role');
        const salary = document.getElementById('st-salary-badge');

        if (img) {
            img.src = emp.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.full_name)}&background=00ff88&color=000&size=200`;
        }
        if (name) name.textContent = emp.full_name;
        if (role) role.textContent = emp.role;
        if (salary) salary.textContent = emp.salary_info || '---';

        // Additional info details
        const phoneEl = document.getElementById('st-phone');
        const deptEl = document.getElementById('st-dept');
        const expEl = document.getElementById('st-exp');
        if (phoneEl) phoneEl.textContent = emp.phone || '+998-- --- -- --';
        if (deptEl) deptEl.textContent = emp.department || 'Bo\'limsiz';
        if (expEl) expEl.textContent = emp.experience || 'Yangi xodim';

        // KPI and Tracking
        const kpi = (85 + Math.floor(Math.random() * 15));
        const kpiVal = document.getElementById('st-kpi-val');
        const kpiBar = document.getElementById('kpi-bar');
        const workedHours = document.getElementById('worked-hours');
        if (kpiVal) kpiVal.textContent = kpi + "%";
        if (kpiBar) kpiBar.style.width = kpi + "%";
        if (workedHours) workedHours.textContent = "08:30";

        const timeIn = document.getElementById('st-time-in');
        const timeOut = document.getElementById('st-time-out');
        if (timeIn) timeIn.textContent = "08:12";
        if (timeOut) timeOut.textContent = "--:--";

        renderModernCalendar(currentCalMonth, currentCalYear);

        // --- 🛑 MOBILE DRAWER LOGIC (Refined) ---
        if (window.innerWidth <= 1024) {
            const rightContent = document.querySelector('.hr-right-content');
            if (rightContent) {
                rightContent.classList.add('mobile-drawer-active');
            }
        }
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
                .select('id, date, status')
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
                    let icon = '';
                    let color = 'var(--adm-text)';
                    let glow = 'rgba(0,0,0,0.05)';
                    let s = r.status;

                    if (s.includes('Premya')) { color = '#FFB800'; glow = 'rgba(255,184,0,0.1)'; }
                    else if (s.includes('Oylik')) { color = '#007aff'; glow = 'rgba(0,122,255,0.1)'; }
                    else if (s.includes('Ruxsat') || s.includes('Dam')) { color = '#BA68C8'; glow = 'rgba(186,104,200,0.1)'; }
                    else if (s.includes('Kech')) { color = '#ff4d4f'; glow = 'rgba(255,77,79,0.1)'; }
                    else if (s.includes('Vaqtida') || s.includes('Keldi')) { color = '#007c52'; glow = 'rgba(0,124,82,0.1)'; }

                    return `
                        <div class="premium-event-card" style="background:var(--adm-bg); border:1px solid var(--adm-border); padding:16px; border-radius:18px; margin-bottom:12px; position:relative; overflow:hidden;">
                            <div style="position:absolute; top:0; left:0; width:4px; height:100%; background:${color}; box-shadow:0 0 10px ${glow};"></div>
                            <div style="display:flex; justify-content:space-between; align-items:start; color:var(--adm-text);">
                                <div style="display:flex; gap:12px; align-items:center;">
                                    <div style="width:36px; height:36px; border-radius:10px; background:${glow}; display:flex; align-items:center; justify-content:center; font-size:1.1rem;">${icon}</div>
                                    <div style="font-weight:600; color:var(--adm-text); font-size:0.92rem; line-height:1.3;">${s}</div>
                                </div>
                            </div>
                            <div style="display:flex; gap:10px; margin-top:14px; border-top:1px solid var(--adm-border); padding-top:10px;">
                                <button onclick="window.editHrEvent('${r.id}', '${s}')" style="flex:1; background:var(--adm-bg); color:var(--adm-text-sec); border:1px solid var(--adm-border); padding:8px; border-radius:10px; cursor:pointer; font-size:0.75rem; transition:0.3s; font-weight:600;">Tahrirlash</button>
                                <button onclick="window.deleteHrEvent('${r.id}')" style="flex:1; background:rgba(255,77,79,0.05); color:#ff4d4f; border:1px solid rgba(255,77,79,0.1); padding:8px; border-radius:10px; cursor:pointer; font-size:0.75rem; transition:0.3s; font-weight:600;">O'chirish</button>
                            </div>
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
                showDayDetails(d, month, year, dayRecords, daysInMonth, monthNames);
            };

            if (year === today.getFullYear() && month === today.getMonth() && d === today.getDate()) {
                div.classList.add('today');
                div.classList.add('active');
                // Auto-load today's details
                showDayDetails(d, month, year, dayRecords, daysInMonth, monthNames);
            }

            calGrid.appendChild(div);
        }
    }

    function showDayDetails(d, month, year, dayRecords, daysInMonth, monthNames) {
        // PAYROLL / TIME TRACKER CALCULATION
        let workedHours = 0;
        let isPresent = dayRecords.some(r => r.status.includes('Vaqtida') || r.status.includes('Keldi'));
        let isLate = dayRecords.some(r => r.status.includes('Kech'));
        let isLeaving = dayRecords.some(r => r.status.includes('Ruxsat') || r.status.includes('Dam') || r.status.includes('Tasdiqlash'));

        if (isPresent) workedHours = 10;
        else if (isLate) workedHours = 8.5; // Mock for late
        if (isLeaving) workedHours = 0;

        let salaryText = '0';
        if (typeof allEmployees !== 'undefined' && selectedWorkerId) {
            const emp = allEmployees.find(e => e.id === selectedWorkerId);
            if (emp) salaryText = emp.salary_info || '0';
        }
        const monthlySalary = parseInt(String(salaryText).replace(/\D/g, '')) || 0;

        // Calculate Working days in month (assuming Sunday is off)
        let workingDaysCount = 0;
        for (let i = 1; i <= daysInMonth; i++) {
            if (new Date(year, month, i).getDay() !== 0) workingDaysCount++;
        }

        const dailyRate = workingDaysCount > 0 ? (monthlySalary / workingDaysCount) : 0;
        const hourlyRate = dailyRate / 10; // Default 10 hours workday (08:00 - 18:00)
        const earnedToday = Math.round(workedHours * hourlyRate);

        // Update Top Card Stats for the selected day
        const headHours = document.getElementById('worked-hours');
        const headIn = document.getElementById('st-time-in');
        const headOut = document.getElementById('st-time-out');
        if (headHours) headHours.textContent = workedHours > 0 ? (workedHours + ":00") : "00:00";
        if (headIn) headIn.textContent = isPresent ? "08:00" : "--:--";
        if (headOut) headOut.textContent = isPresent ? "18:00" : "--:--";

        // Update Big Display on the left
        const bigDate = document.getElementById('today-big-display');
        const bigDay = document.getElementById('today-day-name');
        const dateObj = new Date(year, month, d);
        const dayNames = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
        const monthNamesFull = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
        if (bigDate) bigDate.textContent = `${d} ${monthNamesFull[month]}`;
        if (bigDay) bigDay.textContent = `${dayNames[dateObj.getDay()]}, ${year}`;

        const displayStatusHTML = dayRecords.length === 0 ?
            `<div style="text-align:center; padding:30px; color:rgba(255,255,255,0.15); font-size:0.8rem; font-weight:500; border:1px dashed rgba(255,255,255,0.05); border-radius:15px; margin-top:10px;">Baza ma'lumoti topilmadi</div>` :
            dayRecords.map(r => {
                let color = '#fff';
                let glow = 'rgba(255,255,255,0.1)';
                let s = r.status;

                if (s.includes('Premya')) { color = '#FFD700'; glow = 'rgba(255,215,0,0.2)'; }
                else if (s.includes('Oylik')) { color = '#00d2ff'; glow = 'rgba(0,210,255,0.2)'; }
                else if (s.includes('Ruxsat') || s.includes('Dam')) { color = '#BA68C8'; glow = 'rgba(186,104,200,0.2)'; }
                else if (s.includes('Kech')) { color = '#ff4d4f'; glow = 'rgba(255,77,79,0.2)'; }
                else if (s.includes('Vaqtida') || s.includes('Keldi')) { color = '#00ff88'; glow = 'rgba(0,255,136,0.2)'; }

                return `
                    <div class="premium-event-card" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:16px; border-radius:18px; margin-bottom:10px; position:relative; overflow:hidden;">
                        <div style="position:absolute; top:0; left:0; width:4px; height:100%; background:${color}; box-shadow:0 0 15px ${glow};"></div>
                        <div style="display:flex; justify-content:space-between; align-items:start;">
                            <div style="font-weight:600; color:#fff; font-size:0.9rem; line-height:1.4;">${s}</div>
                        </div>
                        <div style="display:flex; gap:8px; margin-top:14px;">
                            <button onclick="window.editHrEvent('${r.id}', '${s}')" style="flex:1; background:rgba(255,255,255,0.03); color:rgba(255,255,255,0.4); border:1px solid rgba(255,255,255,0.06); padding:8px; border-radius:10px; cursor:pointer; font-size:0.7rem; transition:0.3s; font-weight:700;">Tahrirlash</button>
                            <button onclick="window.deleteHrEvent('${r.id}')" style="flex:1; background:rgba(255,77,79,0.03); color:#ff4d4f; border:1px solid rgba(255,77,79,0.08); padding:8px; border-radius:10px; cursor:pointer; font-size:0.7rem; transition:0.3s; font-weight:700;">O'chirish</button>
                        </div>
                    </div>
                `;
            }).join('');

        const details = document.getElementById('daily-att-details');
        if (details) {
            details.innerHTML = `
                <div style="width:100%;">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:12px; margin-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.06);">
                        <div style="font-size:1rem; font-weight:800; color:#fff;">${d} ${monthNames[month]} ${year}</div>
                        <div style="background:rgba(0,210,255,0.1); color:#00d2ff; padding:4px 8px; border-radius:8px; font-size:0.65rem; font-weight:700;">TANLANGAN KUN</div>
                    </div>

                    <!-- PAYROLL CARD -->
                    <div style="margin-bottom:18px; background:linear-gradient(135deg, rgba(0,210,255,0.1), rgba(0,0,0,0.3)); border:1px solid rgba(0,210,255,0.15); border-radius:18px; padding:15px; box-shadow:0 8px 32px rgba(0,0,0,0.1);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <div style="font-size:0.75rem; color:rgba(255,255,255,0.5); font-weight:500;">Ish vaqti</div>
                            <div style="font-size:0.85rem; color:#fff; font-weight:700;">${workedHours} soat</div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <div style="font-size:0.75rem; color:rgba(255,255,255,0.5); font-weight:500;">Stavka</div>
                            <div style="font-size:0.8rem; color:rgba(255,255,255,0.7);">${Math.round(dailyRate).toLocaleString()} UZS</div>
                        </div>
                        <div style="height:1px; background:rgba(255,255,255,0.05); margin-bottom:12px;"></div>
                        <div style="font-size:1.4rem; font-weight:900; color:#00ff88; text-shadow:0 0 15px rgba(0,255,136,0.3);">
                            +${earnedToday.toLocaleString()} <span style="font-size:0.7rem; font-weight:500; color:rgba(255,255,255,0.4);">so'm ishladi</span>
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; width:100%;">
                        ${displayStatusHTML}
                    </div>
                </div>
            `;
        }
    }

    // --- 🏦 HR ACTION LOGIC (Premya, Oylik, Edit, Delete, Hisobot) ---
    // --- 🏦 HR ACTION LOGIC (Premium Modals v4.8) ---
    const btnBonus = document.getElementById('btn-bonus');
    const btnRaise = document.getElementById('btn-raise');
    const btnEdit = document.getElementById('btn-edit-staff');
    const btnDelete = document.getElementById('btn-delete-staff');
    const btnReport = document.getElementById('btn-hisobot-staff');
    const hrModal = document.getElementById('hrActionModalOverlay');
    const reportModal = document.getElementById('reportModalOverlay');

    if (btnBonus) btnBonus.onclick = () => openHRAction('Premya');
    if (btnRaise) btnRaise.onclick = () => openHRAction('Oylik');
    if (btnEdit) btnEdit.onclick = () => openEditStaff();
    if (btnDelete) btnDelete.onclick = () => deleteWorker();
    if (btnReport) btnReport.onclick = () => { if (reportModal) reportModal.style.display = 'flex'; };

    let selectedReportDays = 30; // Default

    window.selectReportPeriod = (days, btn) => {
        selectedReportDays = days;
        document.querySelectorAll('.report-cycle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    };

    const genPdfBtn = document.getElementById('genPdfBtn');
    const genXlsBtn = document.getElementById('genXlsBtn');
    if (genPdfBtn) genPdfBtn.onclick = () => generateEmployeeReport(selectedReportDays, 'pdf');
    if (genXlsBtn) genXlsBtn.onclick = () => generateEmployeeReport(selectedReportDays, 'excel');

    function openHRAction(type) {
        if (!selectedWorkerId) { alert('Avval xodimni tanlang!'); return; }
        const icon = document.getElementById('hrActionModalIcon');
        const title = document.getElementById('hrActionModalTitle');
        const input = document.getElementById('hrActionValue');

        if (icon) icon.textContent = type === 'Premya' ? '💰' : '📈';
        if (title) title.textContent = type === 'Premya' ? 'Premya tayinlash' : 'Oylikni yangilash';
        if (input) {
            input.placeholder = type === 'Premya' ? 'Summani kiriting (UZS)' : 'Yangi stavkani kiriting';
            input.value = '';
            input.className = 'form-input-v2';
        }

        if (hrModal) {
            hrModal.style.display = 'flex';
            const saveBtn = document.getElementById('hrActionSaveBtn');
            if (saveBtn) saveBtn.onclick = () => saveHRAction(type);

            const closeBtn = document.getElementById('hrActionCloseBtn');
            if (closeBtn) closeBtn.onclick = () => hrModal.style.display = 'none';
        }
    }

    async function saveHRAction(type) {
        const inputEl = document.getElementById('hrActionValue');
        const val = inputEl ? inputEl.value.trim() : '';
        if (!val) { alert('Summani kiriting!'); return; }

        const saveBtn = document.getElementById('hrActionSaveBtn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Muvaffaqiyatli... ✅';
        saveBtn.style.background = '#00ff88';
        saveBtn.style.color = '#000';

        try {
            if (type === 'Premya') {
                const todayStr = new Date().toISOString().split('T')[0];
                await supabase.from('attendance').insert([{
                    employee_id: selectedWorkerId,
                    date: todayStr,
                    status: `Premya: ${val.toLocaleString()} UZS`
                }]);
            } else if (type === 'Oylik') {
                await supabase.from('employees').update({ salary_info: val.toLocaleString() + " UZS" }).eq('id', selectedWorkerId);
            }

            setTimeout(() => {
                if (hrModal) hrModal.style.display = 'none';
                saveBtn.textContent = originalText;
                saveBtn.style.background = '';
                saveBtn.style.color = '';
                fetchStaff();
            }, 1000);
        } catch (err) {
            console.error(err);
            alert('Xatolik yuz berdi.');
            saveBtn.textContent = originalText;
        }
    }

    async function generateEmployeeReport(daysLimit, format) {
        const worker = allEmployees.find(e => e.id === selectedWorkerId);
        if (!worker) return;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysLimit);
        const startStr = startDate.toISOString().split('T')[0];

        const { data: attendance } = await supabase.from('attendance')
            .select('*')
            .eq('employee_id', selectedWorkerId)
            .gte('date', startStr)
            .order('date', { ascending: true });

        if (!attendance || attendance.length === 0) {
            alert("Ushbu davr uchun ma'lumot topilmadi.");
            return;
        }

        if (format === 'pdf') {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.setFontSize(22);
            doc.setTextColor(0, 124, 82);
            doc.text("AKFA ROMIX ENTERPRISE", 105, 20, { align: "center" });
            doc.setFontSize(14);
            doc.setTextColor(100, 100, 100);
            doc.text(`Xodimlarning Rasmiy Hisoboti`, 105, 30, { align: "center" });

            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(`Xodim: ${worker.full_name}`, 20, 50);
            doc.text(`Lavozimi: ${worker.role || '---'}`, 20, 58);
            doc.text(`Hisobot davri: ${startStr} - ${new Date().toISOString().split('T')[0]}`, 20, 66);
            doc.text(`Joriy oylik stavka: ${worker.salary_info || '---'}`, 20, 74);

            const tableData = attendance.map(a => [a.date, a.status]);
            doc.autoTable({
                startY: 85,
                head: [['SANA', 'HOLAT VA AMALLAR']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [0, 124, 82], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 10, cellPadding: 5 }
            });

            doc.save(`AKFA_Hisobot_${worker.full_name.replace(/ /g, '_')}.pdf`);
        } else {
            const ws = XLSX.utils.json_to_sheet(attendance.map(a => ({
                "SANASI": a.date,
                "F.I.O": worker.full_name,
                "STATUS / AMAL": a.status
            })));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Xodim_Hisoboti");
            XLSX.writeFile(wb, `AKFA_Hisobot_${worker.full_name.replace(/ /g, '_')}.xlsx`);
        }

        if (reportModal) reportModal.style.display = 'none';
    }

    async function deleteWorker() {
        if (!selectedWorkerId) return;
        if (confirm('Xodimni butkul o\'chirmoqchimisiz?')) {
            await supabase.from('employees').delete().eq('id', selectedWorkerId);
            selectedWorkerId = null;
            fetchStaff();
        }
    }

    window.closeHrModal = () => { if (hrModal) hrModal.style.display = 'none'; };

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
