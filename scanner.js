import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {

    // Live Clock Logic
    const clockBox = document.getElementById('clockBox');
    const dateBox = document.getElementById('dateBox');

    setInterval(() => {
        const now = new Date();
        clockBox.textContent = now.toLocaleTimeString('uz-UZ', { hour12: false });
        dateBox.textContent = now.toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }, 1000);

    // Scanner Logic
    const idInput = document.getElementById('manualIdInput');
    const statusMsg = document.getElementById('statusMessage');
    const scanArea = document.getElementById('scanArea');
    const mockButtonsContainer = document.getElementById('mockButtonsContainer');

    // Load available employees as buttons to make testing fast!
    async function loadMockButtons() {
        if (!mockButtonsContainer) return;
        const { data, error } = await supabase.from('employees').select('id, full_name').limit(10);
        if (!error && data) {
            mockButtonsContainer.innerHTML = '';
            data.forEach(emp => {
                const btn = document.createElement('button');
                btn.className = 'primary-btn';
                btn.style.padding = '8px 12px';
                btn.style.fontSize = '0.8rem';
                btn.textContent = emp.full_name;
                btn.onclick = () => {
                    idInput.value = emp.id;
                    processScan(emp.id);
                };
                mockButtonsContainer.appendChild(btn);
            });
        }
    }
    loadMockButtons();

    idInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const rawId = idInput.value.trim();
            idInput.value = ''; // clear instantly

            if (!rawId) return;

            // Allow URL parsing in case the QR has the full URL (e.g., https://akfa.uz/employee/123-abc)
            let empId = rawId;
            if (rawId.includes('/employee/')) {
                empId = rawId.split('/employee/')[1];
            }

            processScan(empId);
        }
    });

    async function processScan(empId) {
        statusMsg.textContent = 'Tekshirilmoqda...';
        statusMsg.style.color = '#fff';
        scanArea.style.borderColor = '#fff';

        // 1. Verify user exists
        const { data: user, error: userErr } = await supabase.from('employees').select('full_name, id').eq('id', empId).single();

        if (userErr || !user) {
            showResult('Noto\'g\'ri QR Kod yoki xodim topilmadi!', false);
            return;
        }

        // 2. Check attendance logic
        const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

        // Find if record exists today
        const { data: attData, error: attErr } = await supabase
            .from('attendance')
            .select('*')
            .eq('employee_id', user.id)
            .gte('date', todayStr)
            .single();

        const now = new Date();
        const currentTimeStr = now.toLocaleTimeString('uz-UZ', { hour12: false, hour: '2-digit', minute: '2-digit' });

        if (!attData) {
            // First time today -> CLOCK IN
            // Check if late (after 08:00)
            let status = 'Vaqtida keldi';
            if (now.getHours() >= 8 && now.getMinutes() > 0) {
                status = 'Kech qoldi';
            }

            const { error: insertErr } = await supabase.from('attendance').insert([{
                employee_id: user.id,
                date: todayStr,
                check_in: currentTimeStr,
                status: status
            }]);

            if (!insertErr) {
                showResult(`Xush kelibsiz, ${user.full_name}! (Keldi: ${currentTimeStr} - ${status})`, true);
            } else {
                showResult(`Xatolik: Tizim ishlamayapti!`, false);
            }

        } else {
            // Already clocked in -> CLOCK OUT
            if (attData.check_out) {
                showResult(`${user.full_name}, siz allaqachon bugungi ishni yakunlagansiz!`, false);
            } else {
                const { error: updateErr } = await supabase.from('attendance').update({
                    check_out: currentTimeStr
                }).eq('id', attData.id);

                if (!updateErr) {
                    showResult(`Rahmat, ${user.full_name}! Xayrli tun! (Ketdi: ${currentTimeStr})`, true);
                } else {
                    showResult(`Xatolik: Ketishni yozib bo'lmadi!`, false);
                }
            }
        }
    }

    function showResult(msg, isSuccess) {
        statusMsg.textContent = msg;
        statusMsg.className = 'status-msg ' + (isSuccess ? 'success' : 'warning');
        scanArea.style.borderColor = isSuccess ? '#00ff88' : '#ff4d4f';

        setTimeout(() => {
            statusMsg.textContent = "Davomat uchun QR Kodni o'qiting";
            statusMsg.className = 'status-msg';
            scanArea.style.borderColor = 'rgba(0, 210, 255, 0.5)';
        }, 3000);
    }
});
