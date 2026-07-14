import { Orb3D } from './orb3d.js';

const API_URL = '/api/romix-ai-chat';
const LIVE_TOKEN_URL = '/api/romix-live-token';
const LIVE_TOOL_URL = '/api/romix-live-tool';
const LIVE_RECAP_URL = '/api/romix-live-recap';

const tg = window.Telegram && window.Telegram.WebApp;
if (tg) { try { tg.ready(); tg.expand(); } catch (e) { } }

const chatId = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : null;

const screens = {
    notg: document.getElementById('notg-screen'),
    login: document.getElementById('login-screen'),
    call: document.getElementById('call-screen'),
};
const orbCanvas = document.getElementById('orb-canvas');
const statusLine = document.getElementById('status-line');
const callToggleBtn = document.getElementById('call-toggle-btn');
const transcriptEl = document.getElementById('transcript');
const liveCaptionEl = document.getElementById('live-caption');
const captionRoleEl = document.getElementById('caption-role');
const captionTextEl = document.getElementById('caption-text');

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

let orb3d = null;
function ensureOrb3d() { if (!orb3d && orbCanvas) orb3d = new Orb3D(orbCanvas); return orb3d; }
function setOrbState(state) { ensureOrb3d()?.setState(state); }
function feedOrbLevel(rms) { orb3d?.feedLevel(rms); }
function setStatus(text) { statusLine.textContent = text; }

function computeRMS(float32Array) {
    let sum = 0;
    for (let i = 0; i < float32Array.length; i++) sum += float32Array[i] * float32Array[i];
    return Math.sqrt(sum / float32Array.length);
}

// ── Transkript (doimiy suhbat yozuvi) ──
function addTranscriptEntry(role, text) {
    if (!text || !text.trim()) return;
    const empty = document.getElementById('transcript-empty');
    if (empty) empty.remove();
    const div = document.createElement('div');
    div.className = 'entry ' + role;
    const roleLabel = role === 'user' ? 'Siz' : 'Yordamchi';
    div.innerHTML = `<div class="entry-role">${roleLabel}</div><div class="entry-text">${renderRich(text)}</div>`;
    transcriptEl.appendChild(div);
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function showLiveCaption(role, text) {
    liveCaptionEl.style.display = 'block';
    captionRoleEl.textContent = role === 'user' ? 'Siz' : 'Yordamchi';
    captionTextEl.innerHTML = renderRich(text);
}
function hideLiveCaption() {
    liveCaptionEl.style.display = 'none';
    captionTextEl.textContent = '';
}

// ═══════════════════════════════════════════════════════════
// Gemini Live — real vaqtli ikki tomonlama ovozli suhbat
// ═══════════════════════════════════════════════════════════

let ws = null;
let callActive = false;
let micStream = null;
let captureCtx = null;
let captureWorklet = null;
let micSource = null;
let audioPlayer = null;
let userTranscript = '';
let botTranscript = '';
let callTranscript = [];

function float32ToPCM16Base64(float32Array) {
    const int16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

class LivePlayer {
    constructor() {
        this.ctx = null;
        this.worklet = null;
        this.gain = null;
        this.ready = null;
    }
    async init() {
        if (this.ready) return this.ready;
        this.ready = (async () => {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
                if (this.ctx.state === 'suspended') await this.ctx.resume();
                await this.ctx.audioWorklet.addModule('/audio-processors/playback.worklet.js');
                this.worklet = new AudioWorkletNode(this.ctx, 'pcm-processor');
                this.gain = this.ctx.createGain();
                this.worklet.connect(this.gain);
                this.gain.connect(this.ctx.destination);
            } catch (e) {
                this.ready = null;
                throw e;
            }
        })();
        return this.ready;
    }
    async play(base64PCM) {
        await this.init();
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        const binary = atob(base64PCM);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const int16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
        this.worklet.port.postMessage(float32);
        if (this.onLevel) this.onLevel(float32);
    }
    interrupt() { if (this.worklet) this.worklet.port.postMessage('interrupt'); }
    destroy() { if (this.ctx) { try { this.ctx.close(); } catch (e) { } } this.ctx = null; this.worklet = null; this.ready = null; }
}

function wsSend(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

async function callLiveTool(name, args) {
    try {
        const r = await fetch(LIVE_TOOL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, name, args })
        });
        const data = await r.json();
        return (data && data.response) || { xato: 'natija yo\'q' };
    } catch (e) {
        return { xato: 'Tarmoq xatosi' };
    }
}

// ── Vizual kartochka: ayrim toollar natijasi ovoz bilan bir vaqtda grafik sifatida ham ko'rsatiladi ──
function parseSom(str) { return Number(String(str || '').replace(/[^\d]/g, '')) || 0; }
function fmtSomShort(n) { return Math.round(n).toLocaleString('uz-UZ') + " so'm"; }

function addVizCard(innerHtml) {
    const empty = document.getElementById('transcript-empty');
    if (empty) empty.remove();
    const div = document.createElement('div');
    div.className = 'entry assistant';
    div.innerHTML = `<div class="entry-role">Yordamchi</div><div class="viz-card">${innerHtml}</div>`;
    transcriptEl.appendChild(div);
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function renderTrendChart(oylar) {
    if (!Array.isArray(oylar) || !oylar.length) return;
    const parsed = oylar.map(o => ({ oy: o.oy, savdo: parseSom(o.savdo), harajat: parseSom(o.harajat) }));
    const max = Math.max(1, ...parsed.flatMap(o => [o.savdo, o.harajat]));
    const legend = `<div class="viz-legend">
        <span class="viz-legend-item"><i class="viz-swatch s1"></i>Savdo</span>
        <span class="viz-legend-item"><i class="viz-swatch s2"></i>Harajat</span>
    </div>`;
    const groups = parsed.map(o => `
        <div class="viz-group">
            <div class="viz-group-label">${renderRich(o.oy)}</div>
            <div class="viz-bar-row"><div class="viz-bar s1" style="width:${Math.max(4, o.savdo / max * 100)}%" title="Savdo: ${fmtSomShort(o.savdo)}"></div></div>
            <div class="viz-bar-row"><div class="viz-bar s2" style="width:${Math.max(4, o.harajat / max * 100)}%" title="Harajat: ${fmtSomShort(o.harajat)}"></div></div>
        </div>`).join('');
    addVizCard(legend + `<div class="viz-bars">${groups}</div>`);
}

function renderTopCustomersChart(mijozlar) {
    if (!Array.isArray(mijozlar) || !mijozlar.length) return;
    const parsed = mijozlar.slice(0, 6).map(m => ({ mijoz: m.mijoz, val: parseSom(m.jami_buyurtma) }));
    const max = Math.max(1, ...parsed.map(m => m.val));
    const rows = parsed.map(m => `
        <div class="viz-row">
            <div class="viz-row-label">${renderRich(m.mijoz)}</div>
            <div class="viz-bar-row"><div class="viz-bar s1" style="width:${Math.max(4, m.val / max * 100)}%" title="${fmtSomShort(m.val)}"></div></div>
        </div>`).join('');
    addVizCard(`<div class="viz-bars">${rows}</div>`);
}

function renderVizCard(name, response) {
    try {
        if (name === 'tendentsiya_tahlili' && response && response.oylar) renderTrendChart(response.oylar);
        else if (name === 'top_mijozlar' && response && response.mijozlar) renderTopCustomersChart(response.mijozlar);
    } catch (e) { /* vizual muvaffaqiyatsiz bo'lsa ham ovozli javobga xalaqit bermasin */ }
}

async function handleToolCall(toolCall) {
    const calls = toolCall.functionCalls || [];
    const functionResponses = await Promise.all(calls.map(async fc => {
        const response = await callLiveTool(fc.name, fc.args || {});
        renderVizCard(fc.name, response);
        return { id: fc.id, name: fc.name, response };
    }));
    wsSend({ toolResponse: { functionResponses } });
}

function commitTurn() {
    addTranscriptEntry('user', userTranscript);
    addTranscriptEntry('assistant', botTranscript);
    if (userTranscript.trim()) callTranscript.push({ role: 'user', text: userTranscript.trim() });
    if (botTranscript.trim()) callTranscript.push({ role: 'assistant', text: botTranscript.trim() });
    userTranscript = '';
    botTranscript = '';
    hideLiveCaption();
}

async function sendRecap() {
    if (!callTranscript.length) return;
    const transcript = callTranscript;
    callTranscript = [];
    try {
        await fetch(LIVE_RECAP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, transcript })
        });
    } catch (e) { /* xulosa yuborilmasa ham qo'ng'iroqni yopishga xalaqit bermasin */ }
}

function handleServerMessage(data) {
    if (data.setupComplete) {
        if (!micStream) {
            setStatus('Ulandi — gapiring');
            startMicCapture();
        } else {
            setOrbState('listening');
            setStatus('Tinglayapman...');
        }
        if (!hasGreeted) {
            hasGreeted = true;
            // Foydalanuvchi hali gapirmasdan turib, yordamchi o'zi qisqa hisobot bilan salomlashsin
            wsSend({ realtimeInput: { text: '(qo\'ng\'iroq boshlandi — o\'zing qisqa salomlash va bugungi eng muhim narsani ayt)' } });
        }
        return;
    }

    if (data.toolCall) {
        setOrbState('thinking');
        setStatus('Ma\'lumot olmoqdaman...');
        handleToolCall(data.toolCall);
        return;
    }

    const sc = data.serverContent;
    if (!sc) return;

    const parts = (sc.modelTurn && sc.modelTurn.parts) || [];
    for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
            setOrbState('speaking');
            setStatus('Gapiryapman...');
            audioPlayer.play(part.inlineData.data);
        }
    }

    if (sc.inputTranscription && sc.inputTranscription.text) {
        userTranscript += sc.inputTranscription.text;
        showLiveCaption('user', userTranscript);
    }
    if (sc.outputTranscription && sc.outputTranscription.text) {
        botTranscript += sc.outputTranscription.text;
        showLiveCaption('assistant', botTranscript);
    }

    if (sc.interrupted) {
        audioPlayer.interrupt();
        commitTurn();
        if (callActive) { setOrbState('listening'); setStatus('Tinglayapman...'); }
    }

    if (sc.turnComplete) {
        commitTurn();
        if (callActive) { setOrbState('listening'); setStatus('Tinglayapman...'); }
    }
}

let micPermissionPromise = null;
function requestMicPermission() {
    micPermissionPromise = navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    }).catch(e => { micPermissionPromise = null; throw e; });
    return micPermissionPromise;
}

async function startMicCapture() {
    try {
        micStream = await (micPermissionPromise || requestMicPermission());
    } catch (e) {
        addTranscriptEntry('assistant', '⚠️ Mikrofonga ruxsat berilmadi.');
        stopCall();
        return;
    }
    try {
        captureCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        await captureCtx.audioWorklet.addModule('/audio-processors/capture.worklet.js');
        captureWorklet = new AudioWorkletNode(captureCtx, 'audio-capture-processor');
        captureWorklet.port.onmessage = (e) => {
            if (!callActive || e.data.type !== 'audio') return;
            const base64 = float32ToPCM16Base64(e.data.data);
            wsSend({ realtimeInput: { audio: { data: base64, mimeType: 'audio/pcm;rate=16000' } } });
            feedOrbLevel(computeRMS(e.data.data));
        };
        micSource = captureCtx.createMediaStreamSource(micStream);
        micSource.connect(captureWorklet);
    } catch (e) {
        addTranscriptEntry('assistant', '⚠️ Audio tizimini ishga tushirib bo\'lmadi (brauzer qo\'llamasligi mumkin).');
        stopCall();
        return;
    }

    setOrbState('listening');
    setStatus('Tinglayapman...');
}

let manualStop = true;
let reconnectAttempts = 0;
let hasGreeted = false;
let lastMessageAt = 0;
let watchdogTimer = null;
const MAX_RECONNECT = 3;
const STALL_MS = 20000;

function startWatchdog() {
    stopWatchdog();
    lastMessageAt = Date.now();
    watchdogTimer = setInterval(() => {
        if (!callActive || manualStop) return;
        if (Date.now() - lastMessageAt > STALL_MS) {
            try { ws && ws.close(); } catch (e) { }
        }
    }, 5000);
}
function stopWatchdog() { if (watchdogTimer) { clearInterval(watchdogTimer); watchdogTimer = null; } }

async function openLiveSocket(isReconnect) {
    let cfg;
    try {
        const r = await fetch(LIVE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId })
        });
        cfg = await r.json();
    } catch (e) {
        if (!isReconnect) addTranscriptEntry('assistant', '⚠️ Tarmoq xatosi.');
        return false;
    }
    if (!cfg || !cfg.ok) {
        if (!isReconnect) addTranscriptEntry('assistant', '⚠️ Ulanib bo\'lmadi: ' + (cfg && cfg.error ? cfg.error : 'noma\'lum xato'));
        return false;
    }

    if (!audioPlayer) {
        audioPlayer = new LivePlayer();
        audioPlayer.onLevel = (float32) => feedOrbLevel(computeRMS(float32));
        try { await audioPlayer.init(); }
        catch (e) {
            audioPlayer = null;
            if (!isReconnect) addTranscriptEntry('assistant', '⚠️ Audio pleer ishga tushmadi.');
            return false;
        }
    }

    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${cfg.token}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        wsSend({
            setup: {
                model: `models/${cfg.model}`,
                generationConfig: { responseModalities: ['AUDIO'] },
                systemInstruction: { parts: [{ text: cfg.systemInstruction }] },
                tools: [{ functionDeclarations: cfg.tools }],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                realtimeInputConfig: {
                    automaticActivityDetection: {
                        disabled: false,
                        startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
                        endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
                        silenceDurationMs: 550,
                        prefixPaddingMs: 200
                    },
                    turnCoverage: 'TURN_INCLUDES_ONLY_ACTIVITY'
                }
            }
        });
        callActive = true;
        manualStop = false;
        reconnectAttempts = 0;
        callToggleBtn.disabled = false;
        callToggleBtn.textContent = "Qo'ng'iroqni tugatish";
        callToggleBtn.classList.remove('call-btn-start');
        callToggleBtn.classList.add('call-btn-end');
        startWatchdog();
    };

    ws.onmessage = async (event) => {
        lastMessageAt = Date.now();
        let data;
        try {
            const raw = (event.data instanceof Blob) ? await event.data.text() : event.data;
            data = JSON.parse(raw);
        } catch (e) { return; }
        handleServerMessage(data);
    };

    ws.onerror = () => { };

    ws.onclose = () => {
        if (manualStop || !callActive) return;
        handleUnexpectedClose();
    };
    return true;
}

async function handleUnexpectedClose() {
    reconnectAttempts++;
    if (reconnectAttempts > MAX_RECONNECT) {
        addTranscriptEntry('assistant', "⚠️ Ulanish uzildi, qo'ng'iroq to'xtatildi.");
        stopCall();
        return;
    }
    setOrbState('thinking');
    setStatus(`Qayta ulanmoqda... (${reconnectAttempts}/${MAX_RECONNECT})`);
    await new Promise(resolve => setTimeout(resolve, 1200));
    if (manualStop) return;
    const ok = await openLiveSocket(true);
    if (!ok) handleUnexpectedClose();
}

async function startCall() {
    if (callActive) return;
    callToggleBtn.disabled = true;
    setOrbState('thinking');
    setStatus('Ulanmoqda...');
    manualStop = false;
    reconnectAttempts = 0;
    hasGreeted = false;
    requestMicPermission().catch(() => { }); // token so'rovi bilan bir vaqtda — ruxsat oldindan tayyor bo'ladi (xato startMicCapture'da qayta ushlanadi)

    const ok = await openLiveSocket(false);
    if (!ok) {
        callToggleBtn.disabled = false;
        setOrbState('idle');
        setStatus("Qo'ng'iroqni boshlang");
    }
}

function stopCall() {
    manualStop = true;
    callActive = false;
    callToggleBtn.disabled = false;
    callToggleBtn.textContent = "Qo'ng'iroqni boshlash";
    callToggleBtn.classList.remove('call-btn-end');
    callToggleBtn.classList.add('call-btn-start');
    setOrbState('idle');
    setStatus("Qo'ng'iroqni boshlang");
    commitTurn();
    sendRecap();
    stopWatchdog();

    if (ws) { try { ws.close(); } catch (e) { } ws = null; }
    if (micSource) { try { micSource.disconnect(); } catch (e) { } micSource = null; }
    if (captureWorklet) { captureWorklet.port.onmessage = null; captureWorklet = null; }
    if (captureCtx) { try { captureCtx.close(); } catch (e) { } captureCtx = null; }
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
    if (audioPlayer) { audioPlayer.destroy(); audioPlayer = null; }
    micPermissionPromise = null;
}

callToggleBtn.onclick = () => { callActive ? stopCall() : startCall(); };

// ── Matn bilan yozish (zaxira usul, ovoz mumkin bo'lmaganda) ──
const textFallbackToggle = document.getElementById('text-fallback-toggle');
const textFallbackRow = document.getElementById('text-fallback');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');

textFallbackToggle.onclick = () => {
    const visible = textFallbackRow.style.display !== 'none';
    textFallbackRow.style.display = visible ? 'none' : 'flex';
    if (!visible) textInput.focus();
};

function autoResize() {
    textInput.style.height = 'auto';
    textInput.style.height = Math.min(textInput.scrollHeight, 100) + 'px';
}
textInput.addEventListener('input', autoResize);
textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); }
});

sendBtn.onclick = async () => {
    const text = textInput.value.trim();
    if (!text) return;
    textInput.value = '';
    autoResize();
    addTranscriptEntry('user', text);
    setStatus("O'ylayapman...");
    try {
        const r = await api('chat', { text });
        setStatus(callActive ? 'Tinglayapman...' : "Qo'ng'iroqni boshlang");
        if (r.ok && r.result) {
            const result = r.result;
            if (result.type === 'confirm') addTranscriptEntry('assistant', result.summary + " Tasdiqlaysizmi?");
            else addTranscriptEntry('assistant', result.text || '');
        } else {
            addTranscriptEntry('assistant', '⚠️ Xatolik yuz berdi.');
        }
    } catch (e) {
        addTranscriptEntry('assistant', '⚠️ Tarmoq xatosi.');
        setStatus(callActive ? 'Tinglayapman...' : "Qo'ng'iroqni boshlang");
    }
};

// ── Init ──
async function enterCall() {
    showScreen('call');
    setOrbState('idle');
    setStatus("Qo'ng'iroqni boshlash tugmasini bosing");
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!chatId) { showScreen('notg'); return; }
    try {
        const r = await api('check');
        if (r.ok && r.authed) { await enterCall(); return; }
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
        if (r.ok && r.authed) { await enterCall(); }
        else { errEl.textContent = r.error || "Parol noto'g'ri."; }
    } catch (e) {
        errEl.textContent = 'Tarmoq xatosi.';
    } finally {
        btn.disabled = false;
    }
};
document.getElementById('login-pass').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('login-btn').click();
});
