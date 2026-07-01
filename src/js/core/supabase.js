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

// ── Hybrid client: Supabase first, localStorage fallback ─────
let _isOnline = true; // optimistic

async function checkSupabaseOnline() {
    try {
        const res = await realClient.from('employees').select('id').limit(1);
        _isOnline = !res.error;
    } catch {
        _isOnline = false;
    }
}

// Check once on load
checkSupabaseOnline();

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
            // Use real Supabase directly — errors caught per-call in each module
            return realClient.from(table);
        }
        return localQueryBuilder(table);
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
