import { supabase, realClient } from '@/core/supabase.js';

/* ═══════════════════════════════════════════════════════════
   AKFA ROMIX — TIZIM DIAGNOSTIKASI
   Sozlamalar panelida bir marta tugma bosilganda ishga tushadi.
   Hech narsani saqlamaydi (on-demand), hech qanday jadval yaratmaydi.
   ═══════════════════════════════════════════════════════════ */

// ── 0. Runtime JS xatolarini yig'ish — sahifa yuklangan zahoti boshlanadi ──
window.__romixDiagErrors = window.__romixDiagErrors || [];
const MAX_ERRORS = 100;

function pushDiagError(entry) {
    window.__romixDiagErrors.unshift({ ...entry, time: new Date().toISOString() });
    if (window.__romixDiagErrors.length > MAX_ERRORS) window.__romixDiagErrors.length = MAX_ERRORS;
}

window.addEventListener('error', (e) => {
    pushDiagError({
        message: e.message || 'Noma\'lum xato',
        source: e.filename ? `${e.filename.split('/').pop()}:${e.lineno}` : '',
    });
});
window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    pushDiagError({
        message: 'Promise rad etildi: ' + (reason && reason.message ? reason.message : String(reason)),
        source: '',
    });
});

// ── 1. Supabase jadvallari — asosiy modullar ──
const CORE_TABLES = [
    'system_users', 'employees', 'attendance', 'sales_orders',
    'material_requests', 'warehouse_products', 'romix_inventory',
    'romix_qoldiq_profillar', 'romix_production_batches', 'romix_oynak',
    'romix_accessories', 'romix_transactions', 'profile_requests',
    'romix_staff', 'romix_brigades',
];

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((resolve) => setTimeout(() => resolve({ error: { message: `${ms / 1000}s ichida javob kelmadi (timeout)` } }), ms)),
    ]);
}

async function checkDatabase() {
    const results = await Promise.all(CORE_TABLES.map(async (table) => {
        try {
            const { error } = await withTimeout(realClient.from(table).select('id').limit(1), 7000);
            if (error) return { table, ok: false, detail: error.message || String(error) };
            return { table, ok: true, detail: 'Ulanish OK' };
        } catch (err) {
            return { table, ok: false, detail: err?.message || String(err) };
        }
    }));
    return results;
}

// ── 2. Runtime JS xatolari ──
function checkRuntimeErrors() {
    return window.__romixDiagErrors.slice(0, 20);
}

// ── 3. Environment / konfiguratsiya ──
function checkConfig() {
    const items = [];
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    items.push({
        name: 'VITE_SUPABASE_URL',
        ok: !!url,
        detail: url ? "Environment'dan o'qildi" : "O'RNATILMAGAN — kodga yozilgan (hardcoded) zaxira qiymat ishlatilmoqda. Xavfsizlik kamchiligi (CLAUDE.md, 3-band).",
    });
    items.push({
        name: 'VITE_SUPABASE_ANON_KEY',
        ok: !!key,
        detail: key ? "Environment'dan o'qildi" : "O'RNATILMAGAN — kodga yozilgan (hardcoded) zaxira qiymat ishlatilmoqda. Xavfsizlik kamchiligi (CLAUDE.md, 3-band).",
    });
    items.push({
        name: 'Ishlash rejimi',
        ok: true,
        detail: import.meta.env.MODE || "noma'lum",
    });
    return items;
}

// ── 4. Cache-buster (?v=) nazorati ──
const VERSIONED_PAGES = [
    { path: '/src/projects/romix/romix_dashboard.html', label: 'Romix Dashboard' },
    { path: '/src/projects/autoclapak/pages/admin_dashboard.html', label: 'AutoClapak — Asosiy Panel' },
    { path: '/src/projects/autoclapak/pages/admin_ombor.html', label: 'AutoClapak — Ombor' },
    { path: '/src/projects/autoclapak/pages/admin_tayyor.html', label: 'AutoClapak — Tayyor Mahsulot' },
    { path: '/src/projects/autoclapak/pages/admin_sotuv.html', label: 'AutoClapak — Sotuv' },
    { path: '/src/projects/autoclapak/pages/admin_buhgalteriya.html', label: 'AutoClapak — Buxgalteriya' },
    { path: '/src/projects/autoclapak/pages/admin_ishlab_chiqarish.html', label: 'AutoClapak — Ishlab Chiqarish' },
    { path: '/src/projects/autoclapak/pages/admin_sozlamalar.html', label: 'AutoClapak — Sozlamalar' },
];

async function fetchVersion(page) {
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 7000);
        const res = await fetch(page.path, { signal: ctrl.signal, cache: 'no-store' });
        clearTimeout(t);
        if (!res.ok) return { ...page, version: null, error: `HTTP ${res.status}` };
        const text = await res.text();
        const m = text.match(/admin\.js\?v=([\d.]+)/);
        return { ...page, version: m ? m[1] : null, error: m ? null : "admin.js havolasi topilmadi" };
    } catch (err) {
        return { ...page, version: null, error: err?.message || String(err) };
    }
}

async function checkCacheBuster() {
    const pages = await Promise.all(VERSIONED_PAGES.map(fetchVersion));
    const found = pages.filter(p => p.version);
    const versions = new Set(found.map(p => p.version));
    return { pages, mismatched: versions.size > 1 };
}

// ── RENDER ──
function statusIcon(ok) { return ok ? '✅' : '❌'; }

function row(icon, title, detail) {
    return `
        <div class="diag-row">
            <span class="diag-row-icon">${icon}</span>
            <div class="diag-row-body">
                <div class="diag-row-title">${title}</div>
                <div class="diag-row-detail">${detail}</div>
            </div>
        </div>`;
}

function section(title, badgeText, badgeClass, bodyHtml) {
    return `
        <div class="diag-section">
            <div class="diag-section-head">
                <h4>${title}</h4>
                <span class="diag-badge ${badgeClass}">${badgeText}</span>
            </div>
            <div class="diag-section-body">${bodyHtml}</div>
        </div>`;
}

function summaryBadge(okCount, warnCount, errCount) {
    if (errCount > 0) return { text: `${errCount} TA XATO`, cls: 'diag-badge-err' };
    if (warnCount > 0) return { text: `${warnCount} TA OGOHLANTIRISH`, cls: 'diag-badge-warn' };
    return { text: `${okCount} TA OK`, cls: 'diag-badge-ok' };
}

window.romixRunDiagnostics = async function () {
    const btn = document.getElementById('diag-run-btn');
    const out = document.getElementById('diag-results');
    if (!out) return;

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Tekshirilmoqda...'; }
    out.innerHTML = '<p style="opacity:0.5; font-size:0.85rem; padding:20px 0; text-align:center;">Tizim tekshirilmoqda, biroz kuting...</p>';

    const [dbResults, cacheResult] = await Promise.all([checkDatabase(), checkCacheBuster()]);
    const runtimeErrors = checkRuntimeErrors();
    const configItems = checkConfig();

    // 1. Ma'lumotlar bazasi
    const dbErrCount = dbResults.filter(r => !r.ok).length;
    const dbBadge = summaryBadge(dbResults.length - dbErrCount, 0, dbErrCount);
    const dbHtml = dbResults.map(r => row(statusIcon(r.ok), `<code>${r.table}</code>`, r.detail)).join('');

    // 2. Runtime JS xatolari
    const errBadge = runtimeErrors.length > 0
        ? { text: `${runtimeErrors.length} TA XATO`, cls: 'diag-badge-err' }
        : { text: "XATO YO'Q", cls: 'diag-badge-ok' };
    const errHtml = runtimeErrors.length > 0
        ? runtimeErrors.map(e => row('❌', e.message, `${e.source || ''} ${e.source ? '·' : ''} ${new Date(e.time).toLocaleString('uz-UZ')}`)).join('')
        : '<p style="opacity:0.5; font-size:0.8rem; padding:10px 0;">Ushbu sessiyada hech qanday JavaScript xatosi qayd etilmadi.</p>';

    // 3. Konfiguratsiya
    const cfgErrCount = configItems.filter(c => !c.ok).length;
    const cfgBadge = cfgErrCount > 0 ? { text: `${cfgErrCount} TA OGOHLANTIRISH`, cls: 'diag-badge-warn' } : { text: 'OK', cls: 'diag-badge-ok' };
    const cfgHtml = configItems.map(c => row(statusIcon(c.ok), c.name, c.detail)).join('');

    // 4. Cache-buster
    const cbBadge = cacheResult.mismatched ? { text: 'MOS EMAS', cls: 'diag-badge-err' } : { text: 'MOS', cls: 'diag-badge-ok' };
    const cbHtml = cacheResult.pages.map(p => {
        if (p.error) return row('⚠️', p.label, `Tekshirib bo'lmadi: ${p.error}`);
        const isOutlier = cacheResult.mismatched;
        return row(isOutlier ? '⚠️' : '✅', p.label, `admin.js?v=${p.version}`);
    }).join('') + (cacheResult.mismatched
        ? '<p style="color:var(--sz-red,#ff4d4f); font-size:0.75rem; margin-top:10px; font-weight:700;">⚠️ Sahifalarda admin.js versiyalari bir xil emas! Brauzer keshi eski faylni ko\'rsatishi mumkin (CLAUDE.md, 7-band). admin.js ga tegilganda barcha sahifalarda ?v= raqamini bir xil oshiring.</p>'
        : '');

    out.innerHTML =
        section('🗄️ Ma\'lumotlar bazasi (Supabase)', dbBadge.text, dbBadge.cls, dbHtml) +
        section('⚠️ Runtime JavaScript xatolari', errBadge.text, errBadge.cls, errHtml) +
        section('🔑 Konfiguratsiya (.env)', cfgBadge.text, cfgBadge.cls, cfgHtml) +
        section('🔄 Cache-buster (admin.js ?v=) nazorati', cbBadge.text, cbBadge.cls, cbHtml) +
        `<p style="opacity:0.35; font-size:0.65rem; text-align:right; margin-top:6px;">Oxirgi tekshiruv: ${new Date().toLocaleString('uz-UZ')}</p>`;

    if (btn) { btn.disabled = false; btn.textContent = '🔍 Diagnostikani ishga tushirish'; }
};
