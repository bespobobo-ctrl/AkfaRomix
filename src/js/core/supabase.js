// ═══════════════════════════════════════════════════════════
//  ROMIX SUPABASE CLIENT  —  with localStorage offline fallback
//  If Supabase is reachable → uses cloud database (shared across devices)
//  If Supabase is offline   → falls back to localStorage silently
// ═══════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://dzsswblbpnjuluyqvewt.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk";

export const realClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── LocalStorage fallback DB ─────────────────────────────────
const DB_PREFIX = 'romix_db_';

const SEEDS = {
    employees: [
        { id: "emp-1",  full_name: "Sharifi Miad",        role: "Ofis",        department: "Ofis",     salary: 7000000,  salary_info: "7000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-2",  full_name: "Mullajonov Xurshid",   role: "Brigadir",    department: "Ustalar",  salary: 12000000, salary_info: "12000000", phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-3",  full_name: "Atbaev Temirxon",      role: "Zamershik",   department: "Sotuv",    salary: 6000000,  salary_info: "6000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-4",  full_name: "Abdullaev Axror",      role: "Omborchi",    department: "Ombor",    salary: 8000000,  salary_info: "8000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-5",  full_name: "Nematov Ziyovuddin",   role: "Ishchi",      department: "Ustalar",  salary: 7000000,  salary_info: "7000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-6",  full_name: "Shorasul",             role: "Ustanovshik", department: "Ustalar",  salary: 8000000,  salary_info: "8000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-7",  full_name: "Ulugbek",              role: "Sborshik",    department: "Ustalar",  salary: 6000000,  salary_info: "6000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-8",  full_name: "Usanov Shuxrat",       role: "Qorovul",     department: "Xo'jalik", salary: 2500000,  salary_info: "2500000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-9",  full_name: "Akramov Zaynabiddin",  role: "Qorovul",     department: "Xo'jalik", salary: 2500000,  salary_info: "2500000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-10", full_name: "Najmiddinov Azimxon",  role: "Ishchi",      department: "Ustalar",  salary: 0,        salary_info: "0",        phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-11", full_name: "Najmiddinov Akobir",   role: "Ishchi",      department: "Ustalar",  salary: 6000000,  salary_info: "6000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-12", full_name: "Abduraxmonov Azizbek", role: "Ishchi",      department: "Ustalar",  salary: 7000000,  salary_info: "7000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-13", full_name: "Xamrayev Eldor",       role: "Ishchi",      department: "Ustalar",  salary: 7000000,  salary_info: "7000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-14", full_name: "Xoliqov Eldor",        role: "Ishchi",      department: "Ustalar",  salary: 6000000,  salary_info: "6000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-15", full_name: "Xolmatov Mansur",      role: "Montajchi",   department: "Ustalar",  salary: 8000000,  salary_info: "8000000",  phone: "", avatar_url: "", photo_url: "" },
    ],
    attendance: [],
    sales_orders: [],
    material_requests: [],
    warehouse_products: [
        { id: "wp-1",  name: "Akfa 60 Series Profil",       category: "Profil",    price: 150000, unit: "m.p." },
        { id: "wp-2",  name: "Akfa 70 Series Profil",       category: "Profil",    price: 180000, unit: "m.p." },
        { id: "wp-3",  name: "Akfa Premium 80 Profil",      category: "Profil",    price: 220000, unit: "m.p." },
        { id: "wp-4",  name: "KBE 70 Profil",               category: "Profil",    price: 190000, unit: "m.p." },
        { id: "wp-5",  name: "Rehau 60 Profil",             category: "Profil",    price: 200000, unit: "m.p." },
        { id: "wp-6",  name: "Steklopaket 24mm",            category: "Steklo",    price: 95000,  unit: "kv.m" },
        { id: "wp-7",  name: "Steklopaket 32mm",            category: "Steklo",    price: 115000, unit: "kv.m" },
        { id: "wp-8",  name: "Rom Qulfi (Zamok)",           category: "Aksesuar",  price: 25000,  unit: "dona" },
        { id: "wp-9",  name: "Rom Ruchkasi",                category: "Aksesuar",  price: 15000,  unit: "dona" },
        { id: "wp-10", name: "Pashshaga qarshi setka",       category: "Aksesuar",  price: 40000,  unit: "dona" },
        { id: "wp-11", name: "Eshik Qulfi (Zamok)",         category: "Aksesuar",  price: 65000,  unit: "dona" },
        { id: "wp-12", name: "Eshik Ruchkasi (Premium)",    category: "Aksesuar",  price: 45000,  unit: "dona" },
        { id: "wp-13", name: "Eshik Yopgichi (Dovodchik)",  category: "Aksesuar",  price: 120000, unit: "dona" },
        { id: "wp-14", name: "Padakonnik PVC 200mm",        category: "Padakonnik",price: 45000,  unit: "m.p." },
        { id: "wp-15", name: "Padakonnik PVC 350mm",        category: "Padakonnik",price: 65000,  unit: "m.p." },
    ],
    salary_records: [],
    leave_requests: [],
    activity_log: [],
};

function readTable(table) {
    const raw = localStorage.getItem(DB_PREFIX + table);
    if (raw) { try { return JSON.parse(raw); } catch { return []; } }
    if (SEEDS[table]) {
        localStorage.setItem(DB_PREFIX + table, JSON.stringify(SEEDS[table]));
        return JSON.parse(JSON.stringify(SEEDS[table]));
    }
    return [];
}
function writeTable(table, rows) { localStorage.setItem(DB_PREFIX + table, JSON.stringify(rows)); }
function genId() { return 'loc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7); }

function localQueryBuilder(table) {
    let _filters = [], _orderBy = null, _orderAsc = true, _limit = null;

    const applyFilters = (rows) => {
        let result = [...rows];
        for (const f of _filters) {
            if (f.type === 'eq')    result = result.filter(r => String(r[f.col]) === String(f.val));
            if (f.type === 'neq')   result = result.filter(r => String(r[f.col]) !== String(f.val));
            if (f.type === 'in')    result = result.filter(r => f.val.map(String).includes(String(r[f.col])));
            if (f.type === 'ilike') result = result.filter(r => String(r[f.col]||'').toLowerCase().includes(String(f.val).replace(/%/g,'').toLowerCase()));
            if (f.type === 'gte')   result = result.filter(r => r[f.col] >= f.val);
            if (f.type === 'lte')   result = result.filter(r => r[f.col] <= f.val);
        }
        if (_orderBy) result.sort((a,b) => { const av=a[_orderBy],bv=b[_orderBy]; return av<bv?(_orderAsc?-1:1):av>bv?(_orderAsc?1:-1):0; });
        if (_limit !== null) result = result.slice(0, _limit);
        return result;
    };

    const ok = (data) => Promise.resolve({ data, error: null });

    const b = {
        select()        { return b; },
        eq(col, val)    { _filters.push({ type:'eq',  col, val }); return b; },
        neq(col, val)   { _filters.push({ type:'neq', col, val }); return b; },
        in(col, val)    { _filters.push({ type:'in',  col, val }); return b; },
        ilike(col, val) { _filters.push({ type:'ilike',col,val }); return b; },
        gte(col, val)   { _filters.push({ type:'gte', col, val }); return b; },
        lte(col, val)   { _filters.push({ type:'lte', col, val }); return b; },
        order(col, opts={}) { _orderBy=col; _orderAsc=opts.ascending!==false; return b; },
        limit(n)        { _limit=n; return b; },
        single()        { const rows=applyFilters(readTable(table)); return ok(rows[0]||null); },
        maybeSingle()   { const rows=applyFilters(readTable(table)); return ok(rows[0]||null); },
        then(resolve, reject) {
            return Promise.resolve({ data: applyFilters(readTable(table)), error: null }).then(resolve, reject);
        },
        insert(records) {
            const rows = readTable(table);
            const inserted = [];
            for (const rec of records) {
                const n = { ...rec, id: rec.id||genId(), created_at: rec.created_at||new Date().toISOString() };
                rows.push(n); inserted.push(n);
            }
            writeTable(table, rows);
            return { select(){ return this; }, single(){ return ok(inserted[0]||null); }, then(res,rej){ return ok(inserted).then(res,rej); } };
        },
        update(updates) {
            const rows = readTable(table);
            const result = rows.map(r => {
                const m = _filters.every(f => f.type==='eq' ? String(r[f.col])===String(f.val) : true);
                return m ? { ...r, ...updates } : r;
            });
            writeTable(table, result);
            return ok(null);
        },
        upsert(records) {
            const arr = Array.isArray(records) ? records : [records];
            const rows = readTable(table);
            const upserted = [];
            for (const rec of arr) {
                const idx = rec.id ? rows.findIndex(r => String(r.id)===String(rec.id)) : -1;
                if (idx !== -1) { rows[idx]={...rows[idx],...rec}; upserted.push(rows[idx]); }
                else { const n={...rec, id:rec.id||genId(), created_at:rec.created_at||new Date().toISOString()}; rows.push(n); upserted.push(n); }
            }
            writeTable(table, rows);
            return ok(upserted);
        },
        delete() {
            const rows = readTable(table);
            writeTable(table, rows.filter(r => !_filters.every(f => f.type==='eq'?String(r[f.col])===String(f.val):true)));
            return ok(null);
        },
    };
    return b;
}

// ══════════════════════════════════════════════════════════════
//  SYNC-BACK QUEUE — offline yozuvlarni Supabase'ga qaytarish
//  Kafolat: har bir yozuv (insert/update/upsert/delete) YO Supabase'ga
//  tushadi, YO navbatda saqlanib, ulanish qaytganda avtomatik yuboriladi.
//  Hech qachon jimgina yo'qolmaydi.
// ══════════════════════════════════════════════════════════════
let _isOnline = true; // optimistic
const QUEUE_KEY = 'romix_sync_queue';
const WRITE_METHODS = ['insert', 'update', 'upsert', 'delete'];

function _readQueue() { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; } }
function _writeQueue(q) { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {} _updateSyncBadge(q.length); }

export function pendingSyncCount() { return _readQueue().length; }

function _enqueueChain(table, chain) {
    try {
        const q = _readQueue();
        // Zanjirni JSON-xavfsiz nusxalaymiz
        const safe = chain.map(c => ({ m: c.m, args: JSON.parse(JSON.stringify(c.args)) }));
        q.push({ id: 'q-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), table, chain: safe, ts: Date.now() });
        _writeQueue(q);
    } catch (e) { console.warn('[SYNC] enqueue xato:', e); }
}

// Offline o'qish uchun mahalliy nusxaga qo'llash (best-effort — murakkab filtrlar bo'lsa e'tiborsiz)
function _mirrorApply(table, chain) {
    try {
        let b = localQueryBuilder(table);
        for (const c of chain) { if (typeof b[c.m] === 'function') b = b[c.m](...c.args); }
    } catch {}
}

let _flushing = false;
async function flushSyncQueue() {
    if (_flushing) return;
    const q = _readQueue();
    if (!q.length) return;
    _flushing = true;
    const remaining = [];
    for (let i = 0; i < q.length; i++) {
        const item = q[i];
        try {
            let qb = realClient.from(item.table);
            for (const c of item.chain) {
                let args = c.args;
                // insert/upsert: loc- id larni olib tashlaymiz — Supabase o'zi uuid beradi
                if ((c.m === 'insert' || c.m === 'upsert') && Array.isArray(args) && Array.isArray(args[0])) {
                    args = [args[0].map(r => {
                        const rr = { ...r };
                        if (typeof rr.id === 'string' && rr.id.startsWith('loc-')) delete rr.id;
                        return rr;
                    })];
                }
                qb = qb[c.m](...args);
            }
            const res = await qb;
            if (res && res.error) throw res.error;
            // muvaffaqiyat — bu itemни navbatdan chiqaramiz
        } catch (e) {
            // Tarmoq/pauza — bu va qolgan HAMMASINI tartib bilan keyingi flushга qoldiramiz
            _isOnline = false;
            for (let j = i; j < q.length; j++) remaining.push(q[j]);
            break;
        }
    }
    _writeQueue(remaining);
    _flushing = false;
}

// Kutilayotgan sinx indikatori (past chapda)
function _updateSyncBadge(n) {
    if (typeof document === 'undefined' || !document.body) return;
    let el = document.getElementById('romix-sync-badge');
    if (!n) { if (el) el.remove(); return; }
    if (!el) {
        el = document.createElement('div');
        el.id = 'romix-sync-badge';
        el.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:99999;background:rgba(255,184,0,0.95);color:#101828;font-family:sans-serif;font-weight:700;font-size:12px;padding:8px 12px;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,0.35);';
        document.body.appendChild(el);
    }
    el.textContent = "⏳ " + n + " ta o'zgarish sinxron kutilmoqda";
}

// Zanjirni yozib oluvchi Proxy — online yozuv xato bo'lsa yoki offline bo'lsa navbatga qo'yadi
function _wrap(builder, ctx, table, isLocal) {
    return new Proxy(builder, {
        get(target, prop) {
            if (prop === 'then') {
                const isWrite = ctx.chain.some(c => WRITE_METHODS.includes(c.m));
                const rawThen = (typeof target.then === 'function') ? target.then.bind(target) : null;
                if (!isWrite || !rawThen) return rawThen;
                return (resolve, reject) => rawThen(
                    (result) => {
                        if (isLocal) { _enqueueChain(table, ctx.chain); return resolve(result); }
                        if (result && result.error) {
                            _enqueueChain(table, ctx.chain); _mirrorApply(table, ctx.chain);
                            return resolve({ data: null, error: null, _queued: true });
                        }
                        return resolve(result);
                    },
                    (err) => {
                        if (isLocal) return reject(err);
                        _enqueueChain(table, ctx.chain); _mirrorApply(table, ctx.chain);
                        return resolve({ data: null, error: null, _queued: true });
                    }
                );
            }
            const v = target[prop];
            if (typeof v === 'function') {
                return (...args) => {
                    ctx.chain.push({ m: prop, args });
                    const res = v.apply(target, args);
                    if (res && typeof res === 'object' &&
                        (typeof res.then === 'function' || typeof res.eq === 'function' || typeof res.insert === 'function')) {
                        return _wrap(res, ctx, table, isLocal);
                    }
                    return res;
                };
            }
            return v;
        }
    });
}

async function checkSupabaseOnline() {
    try {
        const res = await realClient.from('employees').select('id').limit(1);
        _isOnline = !res.error;
    } catch {
        _isOnline = false;
    }
    if (_isOnline) flushSyncQueue(); // ulanish bor — kutayotgan yozuvlarni yuboramiz
}

// Boshlanishда tekshir + qayta ulanishda/vaqti-vaqti bilan flush
checkSupabaseOnline();
if (typeof window !== 'undefined') {
    window.addEventListener('online', checkSupabaseOnline);
    setInterval(checkSupabaseOnline, 60000); // har daqiqada: online tekshir + navbatni yubor
    setTimeout(() => _updateSyncBadge(pendingSyncCount()), 1500);
}

function hybridFrom(table) {
    if (_isOnline) {
        // Wrap real Supabase calls — if error, silently fall back
        const realQ = realClient.from(table);
        const intercepted = new Proxy(realQ, {
            get(target, prop) {
                if (prop === 'then') {
                    return function(resolve, reject) {
                        return target.then(result => {
                            if (result?.error) {
                                console.warn(`[DB] Supabase error on ${table}, using localStorage:`, result.error.message);
                                _isOnline = false;
                                return localQueryBuilder(table).then(resolve, reject);
                            }
                            return resolve(result);
                        }, () => {
                            _isOnline = false;
                            return localQueryBuilder(table).then(resolve, reject);
                        });
                    };
                }
                return Reflect.get(target, prop);
            }
        });
        return intercepted;
    }
    return localQueryBuilder(table);
}

// ── Main export ───────────────────────────────────────────────
export const supabase = {
    from(table) {
        if (_isOnline) {
            // Online: haqiqiy Supabase — lekin yozuv xato bo'lsa navbatga qo'yish uchun wrap
            return _wrap(realClient.from(table), { chain: [] }, table, false);
        }
        // Offline: mahalliy nusxa + yozuvni navbatga qo'yish uchun wrap
        return _wrap(localQueryBuilder(table), { chain: [] }, table, true);
    },

    auth: {
        async signInWithPassword(creds) {
            try {
                if (_isOnline) return await realClient.auth.signInWithPassword(creds);
            } catch {}
            return { data: { user: { email: creds?.email } }, error: null };
        },
        async signOut() {
            try { await realClient.auth.signOut(); } catch {}
            localStorage.removeItem('currentUser');
        },
        async getUser() {
            try {
                if (_isOnline) return await realClient.auth.getUser();
            } catch {}
            return { data: { user: null }, error: null };
        }
    },

    storage: {
        from(bucket) {
            if (_isOnline) return realClient.storage.from(bucket);
            return {
                async upload(path, file) {
                    return new Promise(resolve => {
                        const reader = new FileReader();
                        reader.onload = e => {
                            localStorage.setItem('romix_storage_' + path, e.target.result);
                            resolve({ data: { path }, error: null });
                        };
                        reader.onerror = () => resolve({ data: null, error: { message: 'Upload failed' } });
                        reader.readAsDataURL(file);
                    });
                },
                getPublicUrl(path) {
                    if (_isOnline) return realClient.storage.from(bucket).getPublicUrl(path);
                    const url = localStorage.getItem('romix_storage_' + path) || '';
                    return { data: { publicUrl: url } };
                }
            };
        }
    }
};

// ── Auth helpers ──────────────────────────────────────────────
export function checkAuth(roles = []) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) { window.location.href = '/index.html'; return null; }
    if (roles.length > 0 && !roles.includes(user.role)) { window.location.href = '/index.html'; return null; }
    return user;
}

export function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = '/index.html';
}
