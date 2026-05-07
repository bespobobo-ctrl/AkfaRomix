import { supabase } from './supabase.js';

let currentProfileEmp = null;
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth Check
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || user.role !== 'hr') {
        window.location.href = '/';
        return;
    }

    document.getElementById('userNameLabel').textContent = user.username.toUpperCase();
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = '/';
    });

    // UX Tab Switching Logic
    const tabEmployees = document.getElementById('tabEmployees');
    const tabAttendance = document.getElementById('tabAttendance');
    const secEmployees = document.getElementById('employeesSection');
    const secAttendance = document.getElementById('attendanceSection');
    const secProfile = document.getElementById('profileViewSection');
    const payrollStatCard = document.getElementById('payrollStatCard');

    tabEmployees.addEventListener('click', (e) => {
        e.preventDefault();
        tabEmployees.classList.add('active');
        tabAttendance.classList.remove('active');
        secEmployees.style.display = 'block';
        payrollStatCard.style.display = 'block';
        secAttendance.style.display = 'none';
        secProfile.style.display = 'none';

        // Show top summary info
        document.querySelectorAll('.stat-card').forEach(el => el.style.display = 'block');
        document.getElementById('yearlyChartContainer').style.display = 'block';

        loadEmployees();
    });

    tabAttendance.addEventListener('click', (e) => {
        e.preventDefault();
        tabAttendance.classList.add('active');
        tabEmployees.classList.remove('active');
        secAttendance.style.display = 'block';
        secAttendance.style.gridColumn = 'span 4';
        secEmployees.style.display = 'none';
        payrollStatCard.style.display = 'none';
        secProfile.style.display = 'none';

        // Hide top summary info
        document.querySelectorAll('.stat-card').forEach(el => el.style.display = 'none');
        document.getElementById('yearlyChartContainer').style.display = 'none';

        loadAttendance();
    });

    document.getElementById('backToEmployees').addEventListener('click', () => {
        secProfile.style.display = 'none';
        secEmployees.style.display = 'block';
        payrollStatCard.style.display = 'block';

        // Show top summary info
        document.querySelectorAll('.stat-card').forEach(el => el.style.display = 'block');
        document.getElementById('yearlyChartContainer').style.display = 'block';
    });

    document.getElementById('attendanceDatePicker').value = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDatePicker').addEventListener('change', () => {
        loadAttendance();
    });

    document.getElementById('prevMonth').addEventListener('click', () => {
        calMonth--;
        if (calMonth < 0) {
            calMonth = 11;
            calYear--;
        }
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        calMonth++;
        if (calMonth > 11) {
            calMonth = 0;
            calYear++;
        }
        renderCalendar();
    });

    // 2. Fetch Employees from Supabase
    const tableBody = document.getElementById('employeeList');
    let employeesData = [];

    async function loadEmployees() {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Yuklanmoqda...</td></tr>';

        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Xatolik:', error);
            tableBody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Baza topilmadi yoki ulanishda xato.</td></tr>`;
            return;
        }

        employeesData = data;
        tableBody.innerHTML = '';

        // Update Dashboard Stats
        document.getElementById('totalEmployeesCount').textContent = data.length;

        // Dynamic Payroll Calculation
        let totalPayroll = 0;
        data.forEach(emp => {
            const rawSalary = emp.salary_info || "0";
            const salaryNum = parseInt(rawSalary.toString().replace(/[^0-9]/g, '')) || 0;
            totalPayroll += salaryNum;
        });

        const payrollValueDisplay = document.querySelector('#payrollStatCard .stat-value');
        if (payrollValueDisplay) {
            payrollValueDisplay.innerHTML = `${totalPayroll.toLocaleString()} <span>UZS</span>`;
        }

        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Hali hech qanday ishchi qo\'shilmagan.</td></tr>';
        }

        data.forEach(emp => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${emp.full_name}</td>
                <td>${emp.role}</td>
                <td>${new Date(emp.created_at).toLocaleDateString()}</td>
                <td>${emp.salary_info || 'Belgilanmagan'}</td>
                <td><span class="status-badge ${emp.status === 'Ishlamoqda' ? 'process' : 'new'}">${emp.status}</span></td>
                <td>
                    <button class="text-btn view-btn" data-id="${emp.id}" style="margin-right: 15px; font-size:1.2rem;" title="Profil">👁️</button>
                    <button class="text-btn edit-btn" data-id="${emp.id}" style="margin-right: 15px; font-size:1.1rem;" title="Tahrirlash">✏️</button>
                    <button class="text-btn delete-btn" data-id="${emp.id}" style="color: #ff4d4f; font-size:1.1rem;" title="O'chirish">🗑️</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('Haqiqatdan ham bu xodimni barcha ma\'lumotlari bilan birga o\'chirib tashlamoqchimisiz?')) {
                    try {
                        // 1. Attendance o'chirish
                        const { error: attErr } = await supabase.from('attendance').delete().eq('employee_id', id);
                        if (attErr) {
                            console.error("Attendance delete error:", attErr);
                            alert("Davomatni o'chirishda xatolik: " + attErr.message);
                            return;
                        }

                        // 2. Xodimni o'chirish
                        const { error: empErr } = await supabase.from('employees').delete().eq('id', id);
                        if (!empErr) {
                            alert("Xodim muvaffaqiyatli o'chirildi!");
                            loadEmployees();
                        } else {
                            console.error("Employee delete error:", empErr);
                            alert("Xodimni o'chirishda xatolik (RLS bo'lishi mumkin): " + empErr.message);
                        }
                    } catch (err) {
                        console.error("Critical delete error:", err);
                        alert("Kutilmagan xatolik yuz berdi!");
                    }
                }
            });
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const emp = employeesData.find(x => x.id === id);
                if (emp) openModalForEdit(emp);
            });
        });

        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const emp = employeesData.find(x => x.id === id);
                if (emp) openProfileDashboard(emp);
            });
        });
    }

    loadEmployees();

    async function openProfileDashboard(emp) {
        secEmployees.style.display = 'none';
        payrollStatCard.style.display = 'none';
        secProfile.style.display = 'block';
        secProfile.style.gridColumn = 'span 4';

        // Hide top summary info
        document.querySelectorAll('.stat-card').forEach(el => el.style.display = 'none');
        document.getElementById('yearlyChartContainer').style.display = 'none';

        // Set Text Fields
        document.getElementById('profName').textContent = emp.full_name;
        document.getElementById('profRole').textContent = emp.role;
        document.getElementById('profSalary').textContent = parseInt(emp.salary_info.replace(/[^0-9]/g, '') || 0).toLocaleString();

        // New Profile Fields
        const profPhone = document.querySelector('.prof-acc-item strong'); // First item in accordion
        if (profPhone) profPhone.textContent = emp.phone || 'Kiritilmagan';

        const joinedDate = new Date(emp.created_at);
        document.getElementById('profJoinedDate').textContent = `${joinedDate.getFullYear()}, ${joinedDate.getMonth() + 1}-oy, ${joinedDate.getDate()}-kun`;
        document.getElementById('profImage').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.full_name)}&background=106f70&color=fff&size=200`;

        // Calculate Staj (Time since created_at)
        const joined = new Date(emp.created_at);
        const diffTime = Math.abs(new Date() - joined);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        document.getElementById('profJoinedDate').textContent = diffDays === 0 ? "Bugun ishga kirdi" : `${diffDays} kundan beri`;

        // Hours Today Calculation
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: att } = await supabase.from('attendance')
            .select('*').eq('employee_id', emp.id).eq('date', todayStr).single();

        let hoursStr = "00:00";
        const taskItem = document.querySelector('.task-item');

        if (att) {
            if (att.status === 'Vaqtida keldi') {
                taskItem.classList.add('checked');
                taskItem.querySelector('.fake-check').innerHTML = '✓';
            } else {
                taskItem.classList.remove('checked');
                taskItem.querySelector('.fake-check').innerHTML = '';
            }

            const [inH, inM] = att.check_in.split(':').map(Number);
            let endH, endM;
            if (att.check_out) {
                [endH, endM] = att.check_out.split(':').map(Number);
                document.getElementById('profNormStatus').textContent = "Yakunlangan";
            } else {
                const now = new Date();
                endH = now.getHours();
                endM = now.getMinutes();
                document.getElementById('profNormStatus').textContent = "Jarayonda... (Hali ketmadi)";
            }

            let totalMins = (endH * 60 + endM) - (inH * 60 + inM);
            if (totalMins < 0) totalMins = 0;
            const h = Math.floor(totalMins / 60);
            const m = totalMins % 60;
            hoursStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        } else {
            taskItem.classList.remove('checked');
            taskItem.querySelector('.fake-check').innerHTML = '';
            document.getElementById('profNormStatus').textContent = "Bugun Kelmadi";
        }

        document.getElementById('profHoursToday').textContent = hoursStr;

        // Dynamic Progress and Details
        const trackerCircle = document.querySelector('.tracker-circle');
        const profCheckIn = document.getElementById('profCheckIn');
        const profCheckOut = document.getElementById('profCheckOut');
        const profEntryStatus = document.getElementById('profEntryStatus');

        if (att) {
            profCheckIn.textContent = att.check_in;
            profCheckOut.textContent = att.check_out || 'Hali ketmadi';
            profEntryStatus.textContent = att.status;

            const entryItem = profEntryStatus.closest('.task-item');
            if (entryItem) {
                entryItem.classList.add('checked');
                entryItem.querySelector('.fake-check').innerHTML = '✓';
            }

            // Calc progress (assume 9 hours is 100%)
            const [h, m] = hoursStr.split(':').map(Number);
            const totalHours = h + (m / 60);
            const percent = Math.min(Math.round((totalHours / 9) * 100), 100);
            trackerCircle.style.setProperty('--p', percent);

            if (!att.check_out) trackerCircle.classList.add('active');
            else trackerCircle.classList.remove('active');
        } else {
            profCheckIn.textContent = '--:--';
            profCheckOut.textContent = '--:--';
            profEntryStatus.textContent = 'Kelmadi';
            trackerCircle.style.setProperty('--p', 0);
            trackerCircle.classList.remove('active');
        }

        // Random/Calc KPI for visual richness
        const kpiBase = 88;
        const kpi = kpiBase + Math.floor(Math.random() * 12);
        document.getElementById('profKpiValue').textContent = kpi + '% KPI';
        document.getElementById('profKpiBar').style.width = kpi + '%';

        // Weekly Avg and Mini Chart
        const bars = document.querySelectorAll('.mini-chart .bar');
        const last7Days = [];
        for (let i = 4; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Days.push(d.toISOString().split('T')[0]);
        }

        const { data: weekData } = await supabase.from('attendance')
            .select('*').eq('employee_id', emp.id)
            .in('date', last7Days);

        let totalMinsWeek = 0;
        last7Days.forEach((dateStr, idx) => {
            const dayRec = weekData?.find(x => x.date === dateStr);
            let dayMins = 0;
            if (dayRec) {
                const [inH, inM] = dayRec.check_in.split(':').map(Number);
                const [outH, outM] = (dayRec.check_out || '18:00').split(':').map(Number);
                dayMins = (outH * 60 + outM) - (inH * 60 + inM);
                if (dayMins < 0) dayMins = 0;
            }
            totalMinsWeek += dayMins;
            const hPercent = Math.min(Math.round((dayMins / (9 * 60)) * 100), 100);
            bars[idx].style.height = hPercent + '%';
            if (dateStr === todayStr) bars[idx].classList.add('active-bar');
            else bars[idx].classList.remove('active-bar');
        });

        const avgMins = totalMinsWeek / 5;
        const avgH = Math.floor(avgMins / 60);
        const avgM = Math.round(avgMins % 60);
        document.getElementById('profWeeklyAvg').textContent = `${avgH.toString().padStart(2, '0')}:${avgM.toString().padStart(2, '0')} Soat`;

        // Calendar Generation
        currentProfileEmp = emp;
        const nowObj = new Date();
        calMonth = nowObj.getMonth();
        calYear = nowObj.getFullYear();
        renderCalendar();
    }

    async function renderCalendar() {
        if (!currentProfileEmp) return;
        const emp = currentProfileEmp;
        const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];

        document.getElementById('profCalendarTitle').textContent = `${monthNames[calMonth]} ${calYear}`;

        const startOfMonth = new Date(calYear, calMonth, 1).toISOString().split('T')[0];
        const endOfMonth = new Date(calYear, calMonth + 1, 0).toISOString().split('T')[0];

        const { data: monthAtt } = await supabase.from('attendance')
            .select('*').eq('employee_id', emp.id)
            .gte('date', startOfMonth).lte('date', endOfMonth);

        const calGrid = document.getElementById('profCalendar');
        calGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px;">Yuklanmoqda...</div>';

        const now = new Date();
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        calGrid.innerHTML = '';

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = monthAtt ? monthAtt.find(x => x.date === dateStr) : null;

            let statusClass = '';
            let timeLabel = '';

            const cellDate = new Date(calYear, calMonth, day);
            cellDate.setHours(23, 59, 59); // Consider late in the day

            if (cellDate > now) {
                statusClass = 'disabled';
                timeLabel = '-';
            } else if (record) {
                statusClass = record.status === 'Vaqtida keldi' ? 'present' : 'late';
                timeLabel = record.check_in;
            } else {
                const weekDay = new Date(calYear, calMonth, day).getDay();
                if (weekDay === 0) {
                    statusClass = 'disabled';
                    timeLabel = 'Dam olish';
                } else {
                    statusClass = 'absent';
                    timeLabel = 'Kelmadi';
                }
            }

            const div = document.createElement('div');
            div.className = `cal-day ${statusClass}`;
            div.innerHTML = `<span>${day}</span><small>${timeLabel}</small>`;
            calGrid.appendChild(div);
        }
    }

    // 2.5 Fetch Attendance
    const attendanceTableBody = document.getElementById('attendanceList');

    async function loadAttendance() {
        if (!attendanceTableBody) return;
        attendanceTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Yuklanmoqda...</td></tr>';

        const filteredDate = document.getElementById('attendanceDatePicker').value;
        const { data, error } = await supabase
            .from('attendance')
            .select(`
                id, check_in, check_out, status,
                employees ( full_name )
            `)
            .eq('date', filteredDate)
            .order('check_in', { ascending: false });

        attendanceTableBody.innerHTML = '';

        let arrived = 0;
        let late = 0;

        if (error || !data || data.length === 0) {
            attendanceTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Tanlangan sana uchun davomat qayd etilmagan.</td></tr>';
            if (filteredDate === new Date().toISOString().split('T')[0]) {
                document.getElementById('todayArrivedCount').textContent = 0;
                document.getElementById('todayLateCount').textContent = 0;
            }
            document.getElementById('attPresentStat').textContent = '0 Kelgan';
            document.getElementById('attLateStat').textContent = '0 Kechiqqan';
            return;
        }

        data.forEach(att => {
            arrived++;
            if (att.status === 'Kech qoldi') late++;

            const tr = document.createElement('tr');
            const empName = att.employees ? att.employees.full_name : 'No\'malum';
            const checkOutStr = att.check_out ? att.check_out : `<span style="color:#ffb800">Ishlamoqda...</span>`;

            // Calc duration
            let duration = '--:--';
            if (att.check_in && att.check_out) {
                const [inH, inM] = att.check_in.split(':').map(Number);
                const [outH, outM] = att.check_out.split(':').map(Number);
                let totalMins = (outH * 60 + outM) - (inH * 60 + inM);
                if (totalMins < 0) totalMins = 0;
                const h = Math.floor(totalMins / 60);
                const m = totalMins % 60;
                duration = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            }

            let badgeClass = 'process';
            if (att.status === 'Vaqtida keldi') badgeClass = 'completed';
            if (att.status === 'Kech qoldi') badgeClass = 'new';

            tr.innerHTML = `
                <td><strong>${empName}</strong></td>
                <td>${att.check_in}</td>
                <td>${checkOutStr}</td>
                <td>${duration}</td>
                <td><span class="status-badge ${badgeClass}">${att.status}</span></td>
            `;
            attendanceTableBody.appendChild(tr);
        });

        // Update Stats labels in top part only if it's today
        if (filteredDate === new Date().toISOString().split('T')[0]) {
            document.getElementById('todayArrivedCount').textContent = arrived;
            document.getElementById('todayLateCount').textContent = late;
        }

        // Update stats in the section itself
        document.getElementById('attPresentStat').textContent = arrived + ' Kelgan';
        document.getElementById('attLateStat').textContent = late + ' Kechiqqan';
    }

    loadAttendance();

    // 3. Add & Edit Employee Logic with Premium UI
    const addWorkerModalOverlay = document.getElementById('addWorkerModalOverlay');
    const badgeModalOverlay = document.getElementById('badgeModalOverlay');
    const addBtn = document.getElementById('addWorkerBtn');

    const modalHeader = addWorkerModalOverlay.querySelector('.modal-header');
    const modalPhotoPreview = document.getElementById('modalPhotoPreview');
    const plusIcon = document.querySelector('.plus-icon');
    const empPhotoFileInput = document.getElementById('empPhotoFile');
    const empFirstNameInput = document.getElementById('empFirstName');
    const empLastNameInput = document.getElementById('empLastName');
    const empBirthYearInput = document.getElementById('empBirthYear');
    const empPhoneInput = document.getElementById('empPhone');
    const empRoleInput = document.getElementById('empRole');
    const empSalaryInput = document.getElementById('empSalary');

    const badgePreviewPhoto = document.getElementById('badgePreviewPhoto');
    const badgePreviewSurname = document.getElementById('badgePreviewSurname');
    const badgePreviewName = document.getElementById('badgePreviewName');
    const badgePreviewRole = document.getElementById('badgePreviewRole');
    const badgePreviewAge = document.getElementById('badgePreviewAge');
    const badgePreviewQR = document.getElementById('badgePreviewQR');

    empPhotoFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            const dataUrl = await getBaseDataUrl(file);
            modalPhotoPreview.src = dataUrl;
            modalPhotoPreview.style.display = 'block';
            if (plusIcon) plusIcon.style.display = 'none';
        }
    });

    let editingWorkerId = null;

    function getBaseDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (err) => reject(err);
        });
    }

    addBtn.addEventListener('click', () => {
        editingWorkerId = null;
        modalHeader.textContent = "Yangi Xodim Qo'shish";
        addWorkerModalOverlay.classList.add('active');
        empNameInput.value = '';
        empRoleInput.value = '';
        empSalaryInput.value = '';
        empPhotoFileInput.value = '';
    });

    function openModalForEdit(emp) {
        editingWorkerId = emp.id;
        modalHeader.textContent = "Xodimni Tahrirlash";

        const nameParts = emp.full_name.split(' ');
        empFirstNameInput.value = emp.first_name || nameParts[0] || '';
        empLastNameInput.value = emp.last_name || nameParts.slice(1).join(' ') || '';
        empBirthYearInput.value = emp.birth_year || '';
        empPhoneInput.value = emp.phone || '';

        empRoleInput.value = emp.role;
        empSalaryInput.value = emp.salary_info;
        empPhotoFileInput.value = '';
        addWorkerModalOverlay.classList.add('active');
    }

    document.getElementById('closeAddWorkerBtn').addEventListener('click', () => {
        addWorkerModalOverlay.classList.remove('active');
    });

    document.getElementById('closeBadgeBtn').addEventListener('click', () => {
        badgeModalOverlay.classList.remove('active');
    });

    document.getElementById('saveWorkerBtn').addEventListener('click', async (e) => {
        const fname = empFirstNameInput.value.trim();
        const lname = empLastNameInput.value.trim();
        const birthYear = empBirthYearInput.value;
        const phone = empPhoneInput.value.trim();
        const role = empRoleInput.value.trim();
        const salary = empSalaryInput.value.trim();

        const fullName = `${fname} ${lname}`.trim();

        let customPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'HR')}&background=106f70&color=fff&size=200`;
        if (empPhotoFileInput.files && empPhotoFileInput.files[0]) {
            customPhoto = await getBaseDataUrl(empPhotoFileInput.files[0]);
        }

        if (fname && lname && role) {
            e.target.textContent = 'Saqlanmoqda...';
            let queryResult;

            const employeeData = {
                first_name: fname,
                last_name: lname,
                full_name: fullName,
                birth_year: birthYear,
                phone: phone,
                role: role,
                salary_info: salary,
                avatar_url: customPhoto
            };

            if (editingWorkerId) {
                queryResult = await supabase.from('employees').update(employeeData).eq('id', editingWorkerId).select();
            } else {
                employeeData.status = 'Ishlamoqda';
                queryResult = await supabase.from('employees').insert([employeeData]).select();
            }

            const { data, error } = queryResult;
            e.target.textContent = 'Saqlash';

            if (!error) {
                addWorkerModalOverlay.classList.remove('active');
                const workerId = data && data[0] && data[0].id ? data[0].id : 'AKFA-' + Math.floor(Math.random() * 10000);
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://akfa.uz/employee/' + workerId)}`;

                badgePreviewPhoto.src = customPhoto;
                badgePreviewSurname.textContent = lname.toUpperCase();
                badgePreviewName.textContent = fname.toUpperCase();
                badgePreviewRole.textContent = role;

                // Calculate and show Age on Badge
                if (birthYear) {
                    const age = new Date().getFullYear() - parseInt(birthYear);
                    badgePreviewAge.textContent = `${age} YOSH`;
                    badgePreviewAge.style.display = 'block';
                } else {
                    badgePreviewAge.style.display = 'none';
                }

                badgePreviewQR.src = qrUrl;

                setTimeout(() => { badgeModalOverlay.classList.add('active'); }, 300);
                loadEmployees();
            } else {
                alert("Xatolik (Supabase ruxsati yoki ulanish serverida): \n" + error.message);
            }
        } else {
            alert('Iltimos, Ism, Familiya va Kasbni kiring!');
        }
    });

});
