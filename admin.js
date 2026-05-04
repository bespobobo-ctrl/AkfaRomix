import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('AKFA Admin Panel v2 Logic Loaded');
    let editingUserId = null;

    // Auth Check
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || user.role !== 'admin') {
        window.location.href = '/';
    }

    // Update Admin Profile Info
    const adminNameDisplay = document.getElementById('adminName');
    const adminAvatar = document.getElementById('adminAvatar');
    if (adminNameDisplay) adminNameDisplay.textContent = user.username.toUpperCase();
    if (adminAvatar) adminAvatar.src = `https://ui-avatars.com/api/?name=${user.username}&background=007c52&color=fff&size=100`;

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

            if (target === 'users') loadSystemUsers();
        });
    });

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
                <td><span class="status-badge" style="background:rgba(0,124,82,0.1); color:#007c52; padding:4px 10px; border-radius:30px;">${user.role.toUpperCase()}</span></td>
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
