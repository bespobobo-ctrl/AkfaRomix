const API_URL = '/api/romix-ai-chat';

const tg = window.Telegram && window.Telegram.WebApp;
if (tg) { try { tg.ready(); tg.expand(); } catch (e) { } }

const chatId = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : null;

let voiceSpeaker = 'maftuna';

const screens = {
    notg: document.getElementById('notg-screen'),
    login: document.getElementById('login-screen'),
    call: document.getElementById('call-screen'),
};
const orb = document.getElementById('orb');
const statusLine = document.getElementById('status-line');
const captionUser = document.getElementById('caption-user');
const captionBot = document.getElementById('caption-bot');
const callToggleBtn = document.getElementById('call-toggle-btn');
const confirmOverlay = document.getElementById('confirm-overlay');
const confirmOverlayText = document.getElementById('confirm-overlay-text');
const confirmYesBtn = document.getElementById('confirm-yes-btn');
const confirmNoBtn = document.getElementById('confirm-no-btn');

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

function setOrbState(state) { orb.className = 'orb ' + state; }
function setStatus(text) { statusLine.textContent = text; }

// ═══ Qo'ng'iroq holati ═══
let callActive = false;
let micStream = null;
let audioCtx = null;
let analyser = null;
let dataArray = null;
let rafId = null;
let mediaRecorder = null;
let recordedChunks = [];
let segmentStartTime = 0;
let lastSpeechTime = 0;
let hasSpokenInSegment = false;
let awaitingResponse = false;

const SILENCE_MS = 1100;
const MIN_SPEECH_MS = 400;
const MAX_SEGMENT_MS = 20000;
const RMS_THRESHOLD = 0.02;

function pickMimeType() {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    for (const c of candidates) {
        if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) return c;
    }
    return '';
}

async function startCall() {
    if (callActive) return;
    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
        captionBot.textContent = '⚠️ Mikrofonga ruxsat berilmadi.';
        return;
    }
    callActive = true;
    callToggleBtn.textContent = "📴 Qo'ng'iroqni tugatish";
    callToggleBtn.classList.remove('call-btn-start');
    callToggleBtn.classList.add('call-btn-end');

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(micStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.fftSize);

    startListeningSegment();
    vadLoop();
}

function stopCall() {
    callActive = false;
    awaitingResponse = false;
    callToggleBtn.textContent = "📞 Qo'ng'iroqni boshlash";
    callToggleBtn.classList.remove('call-btn-end');
    callToggleBtn.classList.add('call-btn-start');
    setOrbState('idle');
    setStatus("Qo'ng'iroqni boshlang");
    hideConfirmOverlay();
    if (rafId) cancelAnimationFrame(rafId);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') { try { mediaRecorder.stop(); } catch (e) { } }
    if (micStream) micStream.getTracks().forEach(t => t.stop());
    if (audioCtx) { try { audioCtx.close(); } catch (e) { } }
    micStream = null; audioCtx = null; analyser = null; mediaRecorder = null;
}

function startListeningSegment() {
    if (!callActive) return;
    recordedChunks = [];
    hasSpokenInSegment = false;
    segmentStartTime = Date.now();
    lastSpeechTime = Date.now();
    const mimeType = pickMimeType();
    mediaRecorder = mimeType ? new MediaRecorder(micStream, { mimeType }) : new MediaRecorder(micStream);
    mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = onSegmentStopped;
    mediaRecorder.start();
    awaitingResponse = false;
    setOrbState('listening');
    setStatus('Tinglayapman...');
}

function vadLoop() {
    if (!callActive || !analyser) return;
    analyser.getByteTimeDomainData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) { const v = (dataArray[i] - 128) / 128; sum += v * v; }
    const rms = Math.sqrt(sum / dataArray.length);

    if (!awaitingResponse && mediaRecorder && mediaRecorder.state === 'recording') {
        const now = Date.now();
        if (rms > RMS_THRESHOLD) { lastSpeechTime = now; hasSpokenInSegment = true; }
        const elapsedSinceStart = now - segmentStartTime;
        const silenceElapsed = now - lastSpeechTime;
        if (hasSpokenInSegment && elapsedSinceStart > MIN_SPEECH_MS && silenceElapsed > SILENCE_MS) {
            stopListeningSegment();
        } else if (elapsedSinceStart > MAX_SEGMENT_MS) {
            stopListeningSegment();
        }
    }
    rafId = requestAnimationFrame(vadLoop);
}

function stopListeningSegment() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        awaitingResponse = true;
        mediaRecorder.stop();
    }
}

function onSegmentStopped() {
    if (!callActive) return;
    if (!hasSpokenInSegment || recordedChunks.length === 0) {
        startListeningSegment();
        return;
    }
    const blob = new Blob(recordedChunks, { type: (mediaRecorder && mediaRecorder.mimeType) || 'audio/webm' });
    setOrbState('thinking');
    setStatus("O'ylayapman...");
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64 = String(reader.result).split(',')[1] || '';
        if (!base64) { if (callActive) startListeningSegment(); return; }
        sendVoiceSegment(base64, blob.type);
    };
    reader.readAsDataURL(blob);
}

async function sendVoiceSegment(audioBase64, mimeType) {
    try {
        const r = await api('voice', { audioBase64, mimeType, speaker: voiceSpeaker });
        if (!r.ok) {
            captionBot.textContent = '⚠️ Xatolik yuz berdi.';
            if (callActive) startListeningSegment(); else setOrbState('idle');
            return;
        }
        if (r.transcript) captionUser.textContent = r.transcript;
        await handleCallResult(r.result, r.audioBase64);
    } catch (e) {
        captionBot.textContent = '⚠️ Tarmoq xatosi.';
        if (callActive) startListeningSegment(); else setOrbState('idle');
    }
}

async function handleCallResult(result, audioBase64) {
    if (!result) { if (callActive) startListeningSegment(); else setOrbState('idle'); return; }

    if (result.type === 'confirm') showConfirmOverlay(result.summary);
    else hideConfirmOverlay();

    const speakText = result.type === 'confirm' ? result.summary : (result.text || '');
    if (speakText) captionBot.innerHTML = renderRich(speakText);

    if (audioBase64) {
        setOrbState('speaking');
        setStatus('Gapiryapman...');
        const audio = new Audio('data:audio/mpeg;base64,' + audioBase64);
        const resume = () => { if (callActive) startListeningSegment(); else setOrbState('idle'); };
        audio.onended = resume;
        audio.onerror = resume;
        try { await audio.play(); } catch (e) { resume(); }
    } else {
        setTimeout(() => { if (callActive) startListeningSegment(); else setOrbState('idle'); }, 1200);
    }
}

function showConfirmOverlay(summary) {
    confirmOverlayText.innerHTML = renderRich(summary);
    confirmOverlay.style.display = 'flex';
}
function hideConfirmOverlay() {
    confirmOverlay.style.display = 'none';
}

async function tapConfirm(approved) {
    hideConfirmOverlay();
    setOrbState('thinking');
    setStatus('Bajarilmoqda...');
    try {
        const r = await api('confirm', { approved, speaker: voiceSpeaker });
        if (r.ok) await handleCallResult(r.result, r.audioBase64);
        else { if (callActive) startListeningSegment(); else setOrbState('idle'); }
    } catch (e) {
        if (callActive) startListeningSegment(); else setOrbState('idle');
    }
}

confirmYesBtn.onclick = () => tapConfirm(true);
confirmNoBtn.onclick = () => tapConfirm(false);
callToggleBtn.onclick = () => { callActive ? stopCall() : startCall(); };

// ── Ovoz tanlash ──
const voiceToggleBtn = document.getElementById('voice-toggle-btn');
voiceToggleBtn.onclick = () => {
    voiceSpeaker = (voiceSpeaker === 'maftuna') ? 'bobur' : 'maftuna';
    voiceToggleBtn.textContent = voiceSpeaker === 'maftuna' ? '🎙️ Maftuna' : '🎙️ Bobur';
};

// ── Matn bilan yozish (zaxira usul) ──
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
    captionUser.textContent = text;
    setOrbState('thinking');
    setStatus("O'ylayapman...");
    try {
        const r = await api('chat', { text });
        if (r.ok) await handleCallResult(r.result, null);
        else { captionBot.textContent = '⚠️ Xatolik yuz berdi.'; setOrbState('idle'); }
    } catch (e) {
        captionBot.textContent = '⚠️ Tarmoq xatosi.';
        setOrbState('idle');
    }
};

// ── Init ──
async function enterCall() {
    showScreen('call');
    setOrbState('idle');
    setStatus("Qo'ng'iroqni boshlash tugmasini bosing");
    captionBot.textContent = '👋 Assalomu alaykum! Loyiha haqida savol bering.';
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
