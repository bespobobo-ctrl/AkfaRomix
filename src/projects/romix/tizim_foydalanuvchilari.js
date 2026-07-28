import { supabase } from '@/core/supabase.js';

    function escapeHtml(str) {
        return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    // "buxgalter" roli uchun funksiya darajasidagi himoya (BUH-02) — UI'da bu bo'lim
    // buxgalter uchun CSS bilan yashirilgan, lekin konsoldan to'g'ridan-to'g'ri
    // chaqirilishi mumkin edi. Boshqa rollar (admin/hr/ombor/sotuv/ishlab_chiqarish)
    // bu funksiyalarga hozirgi kabi kirishda davom etadi — faqat buxgalter bloklanadi.
    function __denyIfBuxgalterForUsers(fnName) {
        let role = null;
        try { role = JSON.parse(localStorage.getItem('currentUser') || '{}').role || null; } catch (e) {}
        if (role === 'buxgalter') {
            console.warn(`Ruxsat yo'q: "buxgalter" roli "${fnName}" funksiyasini chaqira olmaydi.`);
            return true;
        }
        return false;
    }

    window.loadSystemUsers = async function() {
        if (__denyIfBuxgalterForUsers('loadSystemUsers')) return;
        const tbody = document.getElementById('sysUsersTable');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; opacity:0.5; padding:20px; color:#fff;">Yuklanmoqda...</td></tr>';
        
        let users = [];
        try {
            const { data, error } = await supabase.from('system_users').select('*').order('username', { ascending: true });
            if (!error && data && data.length > 0) {
                users = data;
            }
        } catch (err) {
            console.warn("Error loading system users from Supabase:", err);
        }
        
        if (users.length === 0) {
            const localRaw = localStorage.getItem('system_users_local');
            if (localRaw) {
                users = JSON.parse(localRaw);
            } else {
                users = [
                    { id: "c019b7cb-1b30-48b0-a526-d87c3535cc89", username: "admin", password: "123", full_name: "Super Admin", role: "admin" },
                    { id: "41842320-5831-4556-aaf9-a00b6c82133d", username: "hr", password: "123", full_name: "Kadirlar Bo'limi", role: "hr" },
                    { id: "550b6df7-52fa-4b43-9285-383d55b6cb86", username: "ombor", password: "123", full_name: "Ali", role: "manager" },
                    { id: "26bce1d4-3e98-4703-abf8-754cd686ed86", username: "sotuv", password: "123", full_name: "Jasur", role: "sotuv" },
                    { id: "401046f5-7668-47c5-8099-cb9c81d0d6ca", username: "123", password: "123", full_name: "botir", role: "ishlab_chiqarish" }
                ];
                localStorage.setItem('system_users_local', JSON.stringify(users));
            }
        }
        
        tbody.innerHTML = '';
        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:15px 24px; color:#fff; font-weight:600;">${escapeHtml(u.full_name)}</td>
                <td><span style="background:rgba(0,210,255,0.1); color:#00d2ff; padding:4px 10px; border-radius:30px; font-size:0.75rem; font-weight:700;">${escapeHtml((u.role || '').toUpperCase())}</span></td>
                <td style="font-family:monospace; color:rgba(255,255,255,0.6); font-size:0.85rem;"><code>${escapeHtml(u.username)}</code> / <code>${escapeHtml(u.password)}</code></td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="width:8px; height:8px; border-radius:50%; background:#00ff88; box-shadow:0 0 8px #00ff88;"></span>
                        <span style="font-size:0.75rem; color:#00ff88; font-weight:700;">Faol</span>
                    </div>
                </td>
                <td>
                    <button onclick="window.deleteSystemUser('${u.id}')" style="background:rgba(255,77,79,0.1); border:1px solid rgba(255,77,79,0.2); color:#ff4d4f; padding:4px 8px; border-radius:6px; cursor:pointer;" title="O'chirish">🗑️ O'chirish</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    };

    window.deleteSystemUser = async function(id) {
        if (__denyIfBuxgalterForUsers('deleteSystemUser')) return;
        if (!confirm("Haqiqatdan ham ushbu loginni o'chirmoqchimisiz?")) return;
        
        try {
            const { error } = await supabase.from('system_users').delete().eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.warn("Could not delete from Supabase", e);
            alert("Xatolik: login bazadan o'chmadi — " + (e.message || "sabab noma'lum") + ". Qayta urinib ko'ring.");
            return;
        }

        let localUsers = JSON.parse(localStorage.getItem('system_users_local') || '[]');
        localUsers = localUsers.filter(u => u.id !== id);
        localStorage.setItem('system_users_local', JSON.stringify(localUsers));

        alert("O'chirildi!");
        window.loadSystemUsers();
    };

