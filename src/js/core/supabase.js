// ═══════════════════════════════════════════════════════════
//  ROMIX LOCAL DATABASE  —  Supabase-compatible offline API
//  All data is stored in localStorage as JSON arrays.
//  Drop-in replacement: same .from().select().eq() chain API.
// ═══════════════════════════════════════════════════════════

const DB_PREFIX = 'romix_db_';

// ── Seed default data so the app is never empty ──────────────
const SEEDS = {
    employees: [
        { id: "emp-1",  full_name: "Sharifi Miad",          role: "Ofis",        department: "Ofis",     salary: 7000000,  salary_info: "7000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-2",  full_name: "Mullajonov Xurshid",     role: "Brigadir",    department: "Ustalar",  salary: 12000000, salary_info: "12000000", phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-3",  full_name: "Atbaev Temirxon",        role: "Zamershik",   department: "Sotuv",    salary: 6000000,  salary_info: "6000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-4",  full_name: "Abdullaev Axror",        role: "Omborchi",    department: "Ombor",    salary: 8000000,  salary_info: "8000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-5",  full_name: "Nematov Ziyovuddin",     role: "Ishchi",      department: "Ustalar",  salary: 7000000,  salary_info: "7000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-6",  full_name: "Shorasul",               role: "Ustanovshik", department: "Ustalar",  salary: 8000000,  salary_info: "8000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-7",  full_name: "Ulugbek",                role: "Sborshik",    department: "Ustalar",  salary: 6000000,  salary_info: "6000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-8",  full_name: "Usanov Shuxrat",         role: "Qorovul",     department: "Xo'jalik", salary: 2500000,  salary_info: "2500000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-9",  full_name: "Akramov Zaynabiddin",    role: "Qorovul",     department: "Xo'jalik", salary: 2500000,  salary_info: "2500000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-10", full_name: "Najmiddinov Azimxon",    role: "Ishchi",      department: "Ustalar",  salary: 0,        salary_info: "0",        phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-11", full_name: "Najmiddinov Akobir",     role: "Ishchi",      department: "Ustalar",  salary: 6000000,  salary_info: "6000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-12", full_name: "Abduraxmonov Azizbek",   role: "Ishchi",      department: "Ustalar",  salary: 7000000,  salary_info: "7000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-13", full_name: "Xamrayev Eldor",         role: "Ishchi",      department: "Ustalar",  salary: 7000000,  salary_info: "7000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-14", full_name: "Xoliqov Eldor",          role: "Ishchi",      department: "Ustalar",  salary: 6000000,  salary_info: "6000000",  phone: "", avatar_url: "", photo_url: "" },
        { id: "emp-15", full_name: "Xolmatov Mansur",        role: "Montajchi",   department: "Ustalar",  salary: 8000000,  salary_info: "8000000",  phone: "", avatar_url: "", photo_url: "" },
    ],
    attendance: [],
    sales_orders: [],
    material_requests: [],
    warehouse_products: [
        { id: "wp-1",  name: "Akfa 60 Series Profil",         category: "Profil",    price: 150000, unit: "m.p." },
        { id: "wp-2",  name: "Akfa 70 Series Profil",         category: "Profil",    price: 180000, unit: "m.p." },
        { id: "wp-3",  name: "Akfa Premium 80 Profil",        category: "Profil",    price: 220000, unit: "m.p." },
        { id: "wp-4",  name: "KBE 70 Profil",                 category: "Profil",    price: 190000, unit: "m.p." },
        { id: "wp-5",  name: "Rehau 60 Profil",               category: "Profil",    price: 200000, unit: "m.p." },
        { id: "wp-6",  name: "Steklopaket 24mm",              category: "Steklo",    price: 95000,  unit: "kv.m" },
        { id: "wp-7",  name: "Steklopaket 32mm",              category: "Steklo",    price: 115000, unit: "kv.m" },
        { id: "wp-8",  name: "Rom Qulfi (Zamok)",             category: "Aksesuar",  price: 25000,  unit: "dona" },
        { id: "wp-9",  name: "Rom Ruchkasi",                  category: "Aksesuar",  price: 15000,  unit: "dona" },
        { id: "wp-10", name: "Pashshaga qarshi setka",         category: "Aksesuar",  price: 40000,  unit: "dona" },
        { id: "wp-11", name: "Eshik Qulfi (Zamok)",           category: "Aksesuar",  price: 65000,  unit: "dona" },
        { id: "wp-12", name: "Eshik Ruchkasi (Premium)",      category: "Aksesuar",  price: 45000,  unit: "dona" },
        { id: "wp-13", name: "Eshik Yopgichi (Dovodchik)",    category: "Aksesuar",  price: 120000, unit: "dona" },
        { id: "wp-14", name: "Padakonnik PVC 200mm",          category: "Padakonnik",price: 45000,  unit: "m.p." },
        { id: "wp-15", name: "Padakonnik PVC 350mm",          category: "Padakonnik",price: 65000,  unit: "m.p." },
    ],
    salary_records: [],
    leave_requests: [],
    activity_log: [],
};

// ── Helper: read table from localStorage ─────────────────────
function readTable(table) {
    const raw = localStorage.getItem(DB_PREFIX + table);
    if (raw) {
        try { return JSON.parse(raw); } catch { return []; }
    }
    // First time — seed default data
    if (SEEDS[table]) {
        localStorage.setItem(DB_PREFIX + table, JSON.stringify(SEEDS[table]));
        return JSON.parse(JSON.stringify(SEEDS[table]));
    }
    return [];
}

// ── Helper: write table to localStorage ──────────────────────
function writeTable(table, rows) {
    localStorage.setItem(DB_PREFIX + table, JSON.stringify(rows));
}

// ── Generate a unique ID ──────────────────────────────────────
function genId() {
    return 'loc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

// ── Query Builder — mimics Supabase chaining ──────────────────
function queryBuilder(table) {
    let _filters = [];
    let _orderBy = null;
    let _orderAsc = true;
    let _limit = null;
    let _selectCols = '*';
    let _isSingle = false;
    let _isMaybe = false;

    const applyFilters = (rows) => {
        let result = [...rows];
        for (const f of _filters) {
            if (f.type === 'eq')  result = result.filter(r => String(r[f.col]) === String(f.val));
            if (f.type === 'neq') result = result.filter(r => String(r[f.col]) !== String(f.val));
            if (f.type === 'in')  result = result.filter(r => f.val.map(String).includes(String(r[f.col])));
            if (f.type === 'ilike') result = result.filter(r => String(r[f.col] || '').toLowerCase().includes(String(f.val).replace(/%/g,'').toLowerCase()));
            if (f.type === 'gte') result = result.filter(r => r[f.col] >= f.val);
            if (f.type === 'lte') result = result.filter(r => r[f.col] <= f.val);
        }
        if (_orderBy) {
            result.sort((a, b) => {
                const av = a[_orderBy], bv = b[_orderBy];
                if (av < bv) return _orderAsc ? -1 : 1;
                if (av > bv) return _orderAsc ? 1 : -1;
                return 0;
            });
        }
        if (_limit !== null) result = result.slice(0, _limit);
        return result;
    };

    const ok = (data) => Promise.resolve({ data, error: null });
    const err = (msg) => Promise.resolve({ data: null, error: { message: msg } });

    const builder = {
        select(cols = '*') { _selectCols = cols; return builder; },
        eq(col, val)  { _filters.push({ type: 'eq',  col, val }); return builder; },
        neq(col, val) { _filters.push({ type: 'neq', col, val }); return builder; },
        in(col, val)  { _filters.push({ type: 'in',  col, val }); return builder; },
        ilike(col, val) { _filters.push({ type: 'ilike', col, val }); return builder; },
        gte(col, val) { _filters.push({ type: 'gte', col, val }); return builder; },
        lte(col, val) { _filters.push({ type: 'lte', col, val }); return builder; },
        order(col, opts = {}) { _orderBy = col; _orderAsc = !opts.ascending === false ? true : opts.ascending; return builder; },
        limit(n) { _limit = n; return builder; },
        single()      { _isSingle = true; return builder; },
        maybeSingle() { _isMaybe = true; return builder; },

        // ── TERMINAL OPERATIONS ──
        then(resolve, reject) {
            // Triggered when awaited without explicit terminal method
            const rows = applyFilters(readTable(table));
            if (_isSingle || _isMaybe) {
                return Promise.resolve({ data: rows[0] || null, error: null }).then(resolve, reject);
            }
            return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
        },

        insert(records) {
            const rows = readTable(table);
            const inserted = [];
            for (const rec of records) {
                const newRec = { ...rec, id: rec.id || genId(), created_at: rec.created_at || new Date().toISOString() };
                rows.push(newRec);
                inserted.push(newRec);
            }
            writeTable(table, rows);
            // Return chainable for .select().single()
            return {
                select() { return this; },
                single() { return Promise.resolve({ data: inserted[0] || null, error: null }); },
                then(resolve, reject) {
                    return Promise.resolve({ data: inserted, error: null }).then(resolve, reject);
                }
            };
        },

        update(updates) {
            // applies filters set so far
            const rows = readTable(table);
            let updated = 0;
            const result = rows.map(r => {
                const matches = _filters.every(f => {
                    if (f.type === 'eq') return String(r[f.col]) === String(f.val);
                    return true;
                });
                if (matches) { updated++; return { ...r, ...updates }; }
                return r;
            });
            writeTable(table, result);
            return ok(updated > 0 ? result.filter(r => _filters.every(f => f.type === 'eq' ? String(r[f.col]) === String(f.val) : true)) : []);
        },

        upsert(records) {
            const arr = Array.isArray(records) ? records : [records];
            const rows = readTable(table);
            const upserted = [];
            for (const rec of arr) {
                const idx = rec.id ? rows.findIndex(r => String(r.id) === String(rec.id)) : -1;
                if (idx !== -1) {
                    rows[idx] = { ...rows[idx], ...rec };
                    upserted.push(rows[idx]);
                } else {
                    const newRec = { ...rec, id: rec.id || genId(), created_at: rec.created_at || new Date().toISOString() };
                    rows.push(newRec);
                    upserted.push(newRec);
                }
            }
            writeTable(table, rows);
            return ok(upserted);
        },

        delete() {
            const rows = readTable(table);
            const remaining = rows.filter(r =>
                !_filters.every(f => f.type === 'eq' ? String(r[f.col]) === String(f.val) : true)
            );
            writeTable(table, remaining);
            return ok(null);
        },
    };

    return builder;
}

// ── Main export: Supabase-compatible client ───────────────────
export const supabase = {
    from(table) { return queryBuilder(table); },

    auth: {
        async signInWithPassword({ email, password }) {
            // Auth is handled via localStorage currentUser — just return success
            return { data: { user: { email } }, error: null };
        },
        async signOut() {
            localStorage.removeItem('currentUser');
        }
    },

    storage: {
        from(bucket) {
            return {
                async upload(path, file) {
                    // Store image as base64 in localStorage
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            localStorage.setItem('romix_storage_' + path, e.target.result);
                            resolve({ data: { path }, error: null });
                        };
                        reader.onerror = () => resolve({ data: null, error: { message: 'Upload failed' } });
                        reader.readAsDataURL(file);
                    });
                },
                getPublicUrl(path) {
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
