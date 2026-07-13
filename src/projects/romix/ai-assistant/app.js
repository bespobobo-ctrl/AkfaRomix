const API_URL = '/api/romix-ai-chat';

const tg = window.Telegram && window.Telegram.WebApp;
if (tg) { try { tg.ready(); tg.expand(); } catch (e) { } }

const chatId = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : null;

let voiceSpeaker = 'maftuna';
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];

const screens = {
    notg: document.getElementById('notg-screen'),
    login: document.getElementById('login-screen'),
    chat: document.getElementById('chat-screen'),
};
const messagesEl = document.getElementById('messages');
const statusLine = document.getElementById('status-line');

function showScreen(name) {
    Object.entries(screens).forEach(([k, el]) => { el.style.display = (k === name) ? 'flex' : 'none'; });
}

async function api(action, payload = {}) {
    const r = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, chatId, ...payload })
    });
    return r.json();
}

function renderRich(text) {
    let s = String(text == null ? '' : text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    s = s.replace(/&lt;(\/?)(b|i|s|code)&gt;/g, '<$1$2>');
    s = s.replace(/\n/g, '<br>');
    return s;
}

function scrollToBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }

function addMessage(role, text, { audioBase64 } = {}) {
    const div = document.createElement('div');
    div.className = 'msg ' + (role === 'user' ? 'user' : role === 'system' ? 'system' : 'bot');
    div.innerHTML = renderRich(text);
    if (audioBase64) {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.autoplay = true;
        audio.src = 'data:audio/mpeg;base64,' + audioBase64;
        div.appendChild(audio);
    }
    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
}

function addTyping() {
    const div = document.createElement('div');
    div.className = 'typing';
    div.id = 'typing-indicator';
    div.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
}
function removeTyping() {
    const t = document.getElementById('typing-indicator');
    if (t) t.remove();
}

function addConfirmBox(summary, onDecision) {
    const box = document.createElement('div');
    box.className = 'confirm-box';
    box.innerHTML = `<div>${renderRich(summary)}</div><div class="confirm-actions">
        <button class="confirm-yes">✅ Ha, bajar</button>
        <button class="confirm-no">❌ Bekor</button>
    </div>`;
    const yesBtn = box.querySelector('.confirm-yes');
    const noBtn = box.querySelector('.confirm-no');
    const disable = () => { yesBtn.disabled = true; noBtn.disabled = true; };
    yesBtn.onclick = () => { disable(); onDecision(true); };
    noBtn.onclick = () => { disable(); onDecision(false); };
    messagesEl.appendChild(box);
    scrollToBottom();
}

async function handleAssistantResult(result) {
    if (!result) return;
    if (result.type === 'confirm') {
        addConfirmBox(result.summary, async (approved) => {
            const typing = addTyping();
            try {
                const r = await api('confirm', { approved });
                removeTyping();
                if (r.ok && r.result) {
                    if (r.result.type === 'result') addMessage('bot', r.result.text);
                    else if (r.result.type === 'cancelled') addMessage('system', "❌ Bekor qilindi.");
                    else if (r.result.type === 'error') addMessage('bot', r.result.text);
                } else {
                    addMessage('system', '⚠️ Xatolik yuz berdi.');
                }
            } catch (e) { removeTyping(); addMessage('system', '⚠️ Tarmoq xatosi.'); }
        });
        return;
    }
    if (result.type === 'error') { addMessage('bot', result.text || '⚠️ Xatolik.'); return; }
    if (result.type === 'text' && result.text) { addMessage('bot', result.text); return; }
}

async function sendText(text) {
    addMessage('user', text);
    statusLine.textContent = 'Yozmoqda...';
    const typing = addTyping();
    try {
        const r = await api('chat', { text });
        removeTyping();
        statusLine.textContent = "Loyiha haqida so'rang";
        if (r.ok) await handleAssistantResult(r.result);
        else addMessage('system', r.error === 'not_authenticated' ? '🔒 Sessiya tugagan, sahifani qayta oching.' : '⚠️ Xatolik yuz berdi.');
    } catch (e) {
        removeTyping();
        statusLine.textContent = "Loyiha haqida so'rang";
        addMessage('system', '⚠️ Tarmoq xatosi. Qaytadan urinib ko\'ring.');
    }
}

async function sendVoiceMessage(audioBase64, mimeType) {
    const placeholder = addMessage('user', '🎤 Ovozli xabar...');
    statusLine.textContent = 'Eshitmoqda...';
    const typing = addTyping();
    try {
        const r = await api('voice', { audioBase64, mimeType, speaker: voiceSpeaker });
        removeTyping();
        statusLine.textContent = "Loyiha haqida so'rang";
        if (r.ok) {
            if (r.transcript) placeholder.innerHTML = renderRich('🎤 ' + r.transcript);
            if (r.result) {
                if (r.result.type === 'text' && r.audioBase64) {
                    addMessage('bot', r.result.text, { audioBase64: r.audioBase64 });
                } else {
                    await handleAssistantResult(r.result);
                }
            }
        } else {
            addMessage('system', '⚠️ Ovozni qayta ishlab bo\'lmadi.');
        }
    } catch (e) {
        removeTyping();
        statusLine.textContent = "Loyiha haqida so'rang";
        addMessage('system', '⚠️ Tarmoq xatosi.');
    }
}

async function loadHistory() {
    try {
        const r = await api('history');
        if (r.ok && Array.isArray(r.history) && r.history.length) {
            r.history.forEach(h => addMessage(h.role === 'user' ? 'user' : 'bot', h.text));
        } else {
            addMessage('system', "👋 Assalomu alaykum! Loyiha haqida savol bering yoki mikrofon orqali gapiring.");
        }
    } catch (e) {
        addMessage('system', "👋 Assalomu alaykum! Loyiha haqida savol bering.");
    }
}

async function enterChat() {
    showScreen('chat');
    await loadHistory();
}

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
    if (!chatId) { showScreen('notg'); return; }
    try {
        const r = await api('check');
        if (r.ok && r.authed) { await enterChat(); return; }
    } catch (e) { }
    showScreen('login');
});

// ── Login ──
document.getElementById('login-btn').onclick = async () => {
    const passInput = document.getElementById('login-pass');
    const errEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');
    const password = passInput.value.trim();
    errEl.textContent = '';
    if (!password) { errEl.textContent = 'Parolni kiriting.'; return; }
    btn.disabled = true;
    try {
        const r = await api('login', { password });
        if (r.ok && r.authed) { await enterChat(); }
        else { errEl.textContent = r.error || 'Parol noto\'g\'ri.'; }
    } catch (e) {
        errEl.textContent = 'Tarmoq xatosi.';
    } finally {
        btn.disabled = false;
    }
};
document.getElementById('login-pass').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('login-btn').click();
});

// ── Composer ──
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');

function autoResize() {
    textInput.style.height = 'auto';
    textInput.style.height = Math.min(textInput.scrollHeight, 100) + 'px';
}
textInput.addEventListener('input', autoResize);
textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); }
});

sendBtn.onclick = () => {
    const text = textInput.value.trim();
    if (!text) return;
    textInput.value = '';
    autoResize();
    sendText(text);
};

// ── Voice speaker toggle ──
const voiceToggleBtn = document.getElementById('voice-toggle-btn');
voiceToggleBtn.onclick = () => {
    voiceSpeaker = (voiceSpeaker === 'maftuna') ? 'bobur' : 'maftuna';
    voiceToggleBtn.textContent = voiceSpeaker === 'maftuna' ? '🎙️ Maftuna' : '🎙️ Bobur';
};

// ── Mic recording ──
const micBtn = document.getElementById('mic-btn');
function pickMimeType() {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    for (const c of candidates) {
        if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) return c;
    }
    return '';
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = pickMimeType();
        mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        recordedChunks = [];
        mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) recordedChunks.push(e.data); };
        mediaRecorder.onstop = async () => {
            stream.getTracks().forEach(t => t.stop());
            const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || mimeType || 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result;
                const base64 = String(dataUrl).split(',')[1] || '';
                if (base64) sendVoiceMessage(base64, blob.type);
            };
            reader.readAsDataURL(blob);
        };
        mediaRecorder.start();
        isRecording = true;
        micBtn.classList.add('recording');
    } catch (e) {
        addMessage('system', '⚠️ Mikrofonga ruxsat berilmadi.');
    }
}
function stopRecording() {
    if (mediaRecorder && isRecording) { mediaRecorder.stop(); }
    isRecording = false;
    micBtn.classList.remove('recording');
}

micBtn.onclick = () => { isRecording ? stopRecording() : startRecording(); };
