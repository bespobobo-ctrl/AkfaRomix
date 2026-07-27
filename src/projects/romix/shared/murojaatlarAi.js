// ═══════════════════════════════════════════════════════════
// 💬🤖 ROMIX MUROJAATLAR + AI YORDAMCHI — umumiy floating widget
// Ombor panelidagi ("warehouse_dashboard.html") Murojaatlar va Romix AI
// Yordamchisi bilan bir xil funksionallikni istalgan bo'lim (Sotuv, HR,
// Ishlab Chiqarish, Buhgalter) sahifasiga bitta chaqiruv bilan qo'shadi.
//
// Har bir bo'lim o'z sidebar/tab tuzilishiga ega bo'lgani uchun (va HR'da
// "requests" nomi allaqachon boshqa maqsadda — xodim profil so'rovlari —
// band bo'lgani uchun) bu widget mavjud sahifa tab tizimiga bog'lanmaydi:
// ikkalasi ham mustaqil floating tugma+drawer sifatida qo'shiladi, shuning
// uchun hech qanday sahifaning HTML/JS tuzilishiga tegilmaydi.
//
// Ma'lumotlar dedicated `romix_murojaatlar` jadvalida saqlanadi (Ombor
// avvalgi `profile_requests`dan shu jadvalga o'tkazildi — sabab: HR'ning
// xodim-so'rovlar bo'limi shu jadvaldagi BARCHA "pending" yozuvlarni
// employees bilan JOIN qilib o'qirdi va Ombor murojaati kelsa xato berib
// butunlay ishlamay qolardi).
import { supabase } from '@/core/supabase.js';
import { authService } from '@/services/auth/authService.js';

const REQUEST_TYPES = [
    '⚡ Material Yetishmovchiligi',
    '📦 Yangi Material So\'rovi',
    '🛠️ Texnik / Uskuna Murojaati',
    'ℹ️ Umumiy Xabarnoma'
];

let _reqFilter = 'all';
let _cachedRequests = [];
let _askFn = null;

function injectStyles() {
    if (document.getElementById('rmjSharedStyles')) return;
    const style = document.createElement('style');
    style.id = 'rmjSharedStyles';
    style.textContent = `
        .rmj-float-btn { position:fixed; right:25px; background:linear-gradient(135deg, #00d2ff, #007c52); color:#fff; border-radius:30px; padding:12px 22px; font-weight:800; font-size:0.9rem; cursor:pointer; box-shadow:0 10px 30px rgba(0,210,255,0.4); display:flex; align-items:center; gap:10px; z-index:3000; transition:transform 0.2s; font-family:'Outfit',sans-serif; }
        .rmj-float-btn:hover { transform:scale(1.05); }
        .rmj-float-btn.rmj-secondary { background:linear-gradient(135deg, #f59e0b, #d97706); }
        .rmj-drawer { display:none; position:fixed; right:25px; width:390px; max-width:92vw; background:#141e2d; border:1px solid rgba(0,210,255,0.3); border-radius:24px; box-shadow:0 20px 60px rgba(0,0,0,0.8); backdrop-filter:blur(16px); z-index:3001; flex-direction:column; overflow:hidden; box-sizing:border-box; color:#fff; font-family:'Outfit',sans-serif; }
        .rmj-drawer * { box-sizing:border-box; }
        .rmj-drawer-header { background:linear-gradient(135deg, rgba(0,210,255,0.2), rgba(0,124,82,0.2)); padding:15px 20px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center; }
        .rmj-drawer-close { background:none; border:none; color:#fff; font-size:1.2rem; cursor:pointer; }
        .rmj-chip { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:rgba(255,255,255,0.75); padding:6px 14px; border-radius:10px; font-size:0.75rem; font-weight:700; cursor:pointer; white-space:nowrap; }
        .rmj-chip.active { background:rgba(0,210,255,0.15); border-color:rgba(0,210,255,0.4); color:#00d2ff; }
        .rmj-input, .rmj-select, .rmj-textarea { width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:12px; padding:10px 12px; color:#fff; font-size:0.85rem; outline:none; font-family:inherit; }
        .rmj-req-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:14px; margin-bottom:10px; }
        .rmj-btn-primary { background:#00d2ff; color:#000; border:none; padding:10px 16px; border-radius:12px; font-weight:800; font-size:0.85rem; cursor:pointer; }
        .rmj-scroll::-webkit-scrollbar { width:5px; } .rmj-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15); border-radius:10px; }
    `;
    document.head.appendChild(style);
}

function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return ''; }
}

function statusBadge(status) {
    if (status === 'in_progress') return `<span style="background:rgba(245,158,11,0.15); color:#f59e0b; border:1px solid rgba(245,158,11,0.3); padding:3px 9px; border-radius:8px; font-weight:800; font-size:0.7rem;">🟡 Jarayonda</span>`;
    if (status === 'resolved') return `<span style="background:rgba(0,255,136,0.15); color:#00ff88; border:1px solid rgba(0,255,136,0.3); padding:3px 9px; border-radius:8px; font-weight:800; font-size:0.7rem;">🟢 Bajarildi</span>`;
    if (status === 'rejected') return `<span style="background:rgba(142,142,147,0.15); color:#8e8e93; border:1px solid rgba(142,142,147,0.3); padding:3px 9px; border-radius:8px; font-weight:800; font-size:0.7rem;">❌ Rad etildi</span>`;
    return `<span style="background:rgba(255,77,79,0.15); color:#ff4d4f; border:1px solid rgba(255,77,79,0.3); padding:3px 9px; border-radius:8px; font-weight:800; font-size:0.7rem;">🔴 Kutilmoqda</span>`;
}

function priorityLabel(p) {
    if (p === 'high') return `<span style="color:#ff4d4f; font-weight:800;">🔴 Shoshilinch</span>`;
    if (p === 'low') return `<span style="color:#00d2ff;">🔵 Oddiy</span>`;
    return `<span style="color:#f59e0b; font-weight:800;">🟡 O'rta</span>`;
}

// ─────────────────────────────────────────────────────────
// 💬 MUROJAATLAR WIDGET
// ─────────────────────────────────────────────────────────
export function initMurojaatlarWidget({ department, departmentLabel } = {}) {
    injectStyles();
    if (!department) throw new Error('initMurojaatlarWidget: department majburiy');

    const wrap = document.createElement('div');
    wrap.innerHTML = `
        <div id="rmjReqFloatBtn" class="rmj-float-btn rmj-secondary" style="bottom:95px;">
            <span style="font-size:1.3rem;">💬</span>
            <span>Murojaatlar</span>
            <span id="rmjReqBadge" style="display:none; background:#ff4d4f; border-radius:50%; min-width:18px; height:18px; padding:0 4px; font-size:0.7rem; align-items:center; justify-content:center;"></span>
        </div>

        <div id="rmjReqDrawer" class="rmj-drawer" style="bottom:155px; height:540px;">
            <div class="rmj-drawer-header">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:1.6rem;">💬</span>
                    <div>
                        <span style="font-weight:800; font-size:0.92rem; display:block;">Murojaatlar va Bildirishnomalar</span>
                        <span style="font-size:0.7rem; color:#a0aec0;">${departmentLabel || ''}</span>
                    </div>
                </div>
                <button class="rmj-drawer-close" id="rmjReqCloseBtn">✕</button>
            </div>

            <div style="padding:10px 15px; display:flex; gap:8px; overflow-x:auto;" id="rmjReqFilterRow">
                <div class="rmj-chip active" data-f="all">🗂️ Barchasi</div>
                <div class="rmj-chip" data-f="pending">🔴 Kutilmoqda</div>
                <div class="rmj-chip" data-f="in_progress">🟡 Jarayonda</div>
                <div class="rmj-chip" data-f="resolved">🟢 Bajarildi</div>
            </div>

            <div id="rmjReqList" class="rmj-scroll" style="flex:1; overflow-y:auto; padding:0 15px 10px;"></div>

            <div style="padding:12px 15px; border-top:1px solid rgba(255,255,255,0.1);">
                <button class="rmj-btn-primary" id="rmjNewReqBtn" style="width:100%;">🚀 Yangi Murojaat Yuborish</button>
            </div>
        </div>

        <div id="rmjNewReqModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:3100; align-items:center; justify-content:center; padding:20px;">
            <div style="width:480px; max-width:100%; background:#141e2d; border:1px solid rgba(255,255,255,0.1); border-radius:24px; padding:22px; color:#fff; font-family:'Outfit',sans-serif; box-sizing:border-box;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
                    <h3 style="margin:0; font-size:1.15rem;">💬 Yangi Murojaat</h3>
                    <button class="rmj-drawer-close" id="rmjNewReqCloseBtn">✕</button>
                </div>
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <select id="rmjReqType" class="rmj-select">
                        ${REQUEST_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
                    </select>
                    <select id="rmjReqPriority" class="rmj-select">
                        <option value="high">🔴 Yuqori (Shoshilinch)</option>
                        <option value="medium" selected>🟡 O'rta</option>
                        <option value="low">🔵 Oddiy</option>
                    </select>
                    <input id="rmjReqTitle" class="rmj-input" placeholder="📝 Murojaat sarlavhasi..." />
                    <textarea id="rmjReqDesc" class="rmj-textarea" rows="4" placeholder="💬 Batafsil izoh..."></textarea>
                    <button class="rmj-btn-primary" id="rmjReqSubmitBtn">🚀 Yuborish</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(wrap);

    const drawer = document.getElementById('rmjReqDrawer');
    const modal = document.getElementById('rmjNewReqModal');

    document.getElementById('rmjReqFloatBtn').onclick = () => {
        const hidden = drawer.style.display === 'none' || !drawer.style.display;
        drawer.style.display = hidden ? 'flex' : 'none';
        if (hidden) loadRequests(department);
    };
    document.getElementById('rmjReqCloseBtn').onclick = () => drawer.style.display = 'none';
    document.getElementById('rmjNewReqBtn').onclick = () => modal.style.display = 'flex';
    document.getElementById('rmjNewReqCloseBtn').onclick = () => modal.style.display = 'none';
    document.getElementById('rmjReqSubmitBtn').onclick = () => submitNewRequest(department);

    document.querySelectorAll('#rmjReqFilterRow [data-f]').forEach(chip => {
        chip.onclick = () => {
            document.querySelectorAll('#rmjReqFilterRow [data-f]').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            _reqFilter = chip.dataset.f;
            renderRequestsList();
        };
    });

    refreshBadge(department);
    setInterval(() => refreshBadge(department), 60000);
}

async function refreshBadge(department) {
    try {
        const { count } = await supabase.from('romix_murojaatlar').select('id', { count: 'exact', head: true }).eq('status', 'pending');
        const badge = document.getElementById('rmjReqBadge');
        if (!badge) return;
        if (count > 0) { badge.style.display = 'flex'; badge.textContent = count; }
        else badge.style.display = 'none';
    } catch (e) { /* offline — jim o'tkazamiz */ }
}

async function loadRequests() {
    const list = document.getElementById('rmjReqList');
    if (!list) return;
    list.innerHTML = `<div style="text-align:center; padding:30px; color:rgba(255,255,255,0.4); font-size:0.85rem;">Yuklanmoqda...</div>`;

    let requests = [];
    try {
        const { data, error } = await supabase.from('romix_murojaatlar').select('*').order('created_at', { ascending: false });
        if (!error && data) requests = data;
    } catch (e) { console.warn('romix_murojaatlar fetch fallback:', e); }

    _cachedRequests = requests;
    renderRequestsList();
}

function renderRequestsList() {
    const list = document.getElementById('rmjReqList');
    if (!list) return;

    const filtered = _reqFilter === 'all' ? _cachedRequests : _cachedRequests.filter(r => r.status === _reqFilter);

    if (!filtered.length) {
        list.innerHTML = `<div style="text-align:center; padding:30px; color:rgba(255,255,255,0.4); font-size:0.85rem;">Ushbu toifada murojaat topilmadi.</div>`;
        return;
    }

    list.innerHTML = filtered.map(r => `
        <div class="rmj-req-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                ${statusBadge(r.status)}
                ${priorityLabel(r.priority)}
            </div>
            <div style="font-size:0.72rem; color:#00d2ff; font-weight:800; margin-bottom:3px;">${r.type || ''} · ${(r.department || '').toUpperCase()}</div>
            <h4 style="font-size:0.95rem; font-weight:800; margin:0 0 5px 0;">${escapeHtml(r.title)}</h4>
            <p style="font-size:0.8rem; color:rgba(255,255,255,0.6); margin:0 0 10px 0; line-height:1.4;">${escapeHtml(r.description || '')}</p>
            <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:rgba(255,255,255,0.4); margin-bottom:8px;">
                <span>👤 ${escapeHtml(r.sender || '')}</span>
                <span>🕒 ${fmtDate(r.created_at)}</span>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                ${r.status !== 'resolved' ? `<button class="rmj-chip" data-act="resolve" data-id="${r.id}" style="flex:1; color:#00ff88; text-align:center;">✅ Bajarildi</button>` : ''}
                ${r.status === 'pending' ? `<button class="rmj-chip" data-act="progress" data-id="${r.id}" style="flex:1; color:#f59e0b; text-align:center;">🟡 Jarayonga</button>` : ''}
                <button class="rmj-chip" data-act="delete" data-id="${r.id}" style="color:#ff4d4f;">🗑️</button>
            </div>
        </div>
    `).join('');

    list.querySelectorAll('[data-act]').forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            if (btn.dataset.act === 'resolve') updateStatus(id, 'resolved');
            if (btn.dataset.act === 'progress') updateStatus(id, 'in_progress');
            if (btn.dataset.act === 'delete') deleteRequest(id);
        };
    });
}

async function updateStatus(id, status) {
    try { await supabase.from('romix_murojaatlar').update({ status }).eq('id', id); } catch (e) {}
    await loadRequests();
}

async function deleteRequest(id) {
    if (!confirm("Ushbu murojaatni o'chirmoqchimisiz?")) return;
    try { await supabase.from('romix_murojaatlar').delete().eq('id', id); } catch (e) {}
    await loadRequests();
}

async function submitNewRequest(department) {
    const type = document.getElementById('rmjReqType')?.value;
    const priority = document.getElementById('rmjReqPriority')?.value;
    const title = document.getElementById('rmjReqTitle')?.value.trim();
    const desc = document.getElementById('rmjReqDesc')?.value.trim();

    if (!title) { alert('Murojaat sarlavhasini kiriting!'); return; }

    const user = authService.getCurrentUser() || {};
    const senderName = user.full_name || user.username || departmentLabelFallback(department);

    try {
        await supabase.from('romix_murojaatlar').insert({
            department,
            sender: senderName,
            sender_user_id: user.id || null,
            type,
            priority,
            title,
            description: desc || null,
            status: 'pending'
        });
    } catch (e) {
        alert("Yuborishda xatolik: " + (e?.message || e));
        return;
    }

    document.getElementById('rmjReqTitle').value = '';
    document.getElementById('rmjReqDesc').value = '';
    document.getElementById('rmjNewReqModal').style.display = 'none';
    alert('✅ Murojaat muvaffaqiyatli yuborildi!');
    await loadRequests();
}

function departmentLabelFallback(d) {
    const map = { sotuv: 'Sotuv xodimi', hr: 'HR xodimi', ishlab_chiqarish: 'Ishlab chiqarish xodimi', buxgalter: 'Buhgalter' };
    return map[d] || d;
}

function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// ─────────────────────────────────────────────────────────
// 🤖 ROMIX AI YORDAMCHI WIDGET
// ─────────────────────────────────────────────────────────
export function initRomixAiWidget({ title = 'Romix AI Yordamchisi', welcome, askFn, quickPrompts = [] } = {}) {
    injectStyles();
    _askFn = typeof askFn === 'function' ? askFn : (() => "🤖 Hozircha bu bo'lim uchun AI javoblari sozlanmagan.");

    const wrap = document.createElement('div');
    wrap.innerHTML = `
        <div id="rmjAiFloatBtn" class="rmj-float-btn" style="bottom:25px;">
            <span style="font-size:1.3rem;">🤖</span>
            <span>Romix AI Yordamchi</span>
            <span style="background:#00ff88; border-radius:50%; width:10px; height:10px; display:inline-block; box-shadow:0 0 8px #00ff88;"></span>
        </div>

        <div id="rmjAiDrawer" class="rmj-drawer" style="bottom:85px; height:530px; width:390px;">
            <div class="rmj-drawer-header">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:1.8rem; background:rgba(0,210,255,0.15); padding:6px; border-radius:12px; border:1px solid rgba(0,210,255,0.3);">🤖</span>
                    <div>
                        <span style="font-weight:800; font-size:0.95rem; display:block;">${title}</span>
                        <span style="font-size:0.7rem; color:#00ff88; font-weight:700;">🟢 Faol (Online)</span>
                    </div>
                </div>
                <button class="rmj-drawer-close" id="rmjAiCloseBtn">✕</button>
            </div>

            ${quickPrompts.length ? `
            <div style="padding:10px 15px; background:rgba(0,0,0,0.2); border-bottom:1px solid rgba(255,255,255,0.05); display:flex; gap:6px; overflow-x:auto; white-space:nowrap;">
                ${quickPrompts.map(q => `<button class="rmj-chip" data-qp="${escapeHtml(q.prompt)}">${escapeHtml(q.label)}</button>`).join('')}
            </div>` : ''}

            <div id="rmjAiHistory" class="rmj-scroll" style="flex:1; padding:15px; overflow-y:auto; display:flex; flex-direction:column; gap:12px; font-size:0.85rem;">
                <div style="background:rgba(0,210,255,0.08); border:1px solid rgba(0,210,255,0.2); border-radius:14px; padding:12px; align-self:flex-start; max-width:88%; line-height:1.4;">
                    ${welcome || `👋 Assalomu alaykum! Men <strong>Romix AI</strong> yordamchiman. Savollaringizni yozing.`}
                </div>
            </div>

            <div style="padding:12px 15px; background:rgba(0,0,0,0.3); border-top:1px solid rgba(255,255,255,0.1); display:flex; gap:8px;">
                <input type="text" id="rmjAiInput" class="rmj-input" placeholder="Savol yoki buyruq yozing..." style="flex:1;" />
                <button class="rmj-btn-primary" id="rmjAiSendBtn">Yuborish 🚀</button>
            </div>
        </div>
    `;
    document.body.appendChild(wrap);

    const drawer = document.getElementById('rmjAiDrawer');
    document.getElementById('rmjAiFloatBtn').onclick = () => {
        const hidden = drawer.style.display === 'none' || !drawer.style.display;
        drawer.style.display = hidden ? 'flex' : 'none';
        if (hidden) document.getElementById('rmjAiInput')?.focus();
    };
    document.getElementById('rmjAiCloseBtn').onclick = () => drawer.style.display = 'none';
    document.getElementById('rmjAiSendBtn').onclick = submitAiMessage;
    document.getElementById('rmjAiInput').onkeydown = (e) => { if (e.key === 'Enter') submitAiMessage(); };
    document.querySelectorAll('#rmjAiDrawer [data-qp]').forEach(btn => {
        btn.onclick = () => {
            document.getElementById('rmjAiInput').value = btn.dataset.qp;
            submitAiMessage();
        };
    });
}

async function submitAiMessage() {
    const input = document.getElementById('rmjAiInput');
    const history = document.getElementById('rmjAiHistory');
    if (!input || !history) return;

    const text = input.value.trim();
    if (!text) return;

    const userBubble = document.createElement('div');
    userBubble.style.cssText = 'background:rgba(0,210,255,0.18); border:1px solid rgba(0,210,255,0.3); border-radius:14px; padding:10px 14px; align-self:flex-end; max-width:85%; font-weight:600; line-height:1.4;';
    userBubble.textContent = text;
    history.appendChild(userBubble);
    input.value = '';

    const typingBubble = document.createElement('div');
    typingBubble.id = 'rmjAiTyping';
    typingBubble.style.cssText = 'background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:14px; padding:10px 14px; color:rgba(255,255,255,0.6); align-self:flex-start; font-size:0.8rem; font-style:italic;';
    typingBubble.textContent = "🤖 Romix AI o'ylamoqda...";
    history.appendChild(typingBubble);
    history.scrollTop = history.scrollHeight;

    let answer;
    try {
        answer = await _askFn(text);
    } catch (e) {
        answer = "⚠️ Javob berishda xatolik yuz berdi.";
    }

    document.getElementById('rmjAiTyping')?.remove();
    const aiBubble = document.createElement('div');
    aiBubble.style.cssText = 'background:rgba(0,210,255,0.08); border:1px solid rgba(0,210,255,0.25); border-radius:14px; padding:12px 14px; align-self:flex-start; max-width:88%; line-height:1.5; font-size:0.85rem;';
    aiBubble.innerHTML = answer;
    history.appendChild(aiBubble);
    history.scrollTop = history.scrollHeight;
}
