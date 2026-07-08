// ═══════════════════════════════════════════════════════════
//  AKFA Romix — Bot ma'lumot qatlami (Supabase REST, server tomon)
//  O'qish: zakazlar, ombor, moliya, HR, ishlab chiqarish.
//  Yozish: FAQAT harajat (romix_expenses) va to'lov (qarz/zakaz).
//  Frontend Buxgalter modeli bilan mos (romix_expenses/romix_debts/sales_orders).
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://dzsswblbpnjuluyqvewt.supabase.co";
const ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6c3N3YmxicG5qdWx1eXF2ZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTI2NzcsImV4cCI6MjA5MzQ2ODY3N30.Kwgh1DIzb_j7AH2iEfI5LMboObXBaIm3SGk1JWF3LIk";

const H = { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" };
const round = n => Math.round(Number(n) || 0);
const fmt = n => round(n).toLocaleString("uz-UZ") + " so'm";
const today = () => new Date().toISOString().slice(0, 10);
const monthKey = d => String(d || "").slice(0, 7);

// ── Supabase REST yordamchilari ──
async function sbGet(table, query = "") {
    try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: H });
        if (!r.ok) return [];
        return await r.json();
    } catch (e) { return []; }
}
async function sbInsert(table, record) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(record)
    });
    if (!r.ok) throw new Error(`${table} insert: ${r.status} ${await r.text()}`);
    const d = await r.json();
    return Array.isArray(d) ? d[0] : d;
}
async function sbPatch(table, id, patch) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(patch)
    });
    if (!r.ok) throw new Error(`${table} patch: ${r.status} ${await r.text()}`);
    const d = await r.json();
    return Array.isArray(d) ? d[0] : d;
}

// ═══════════════════ O'QISH ═══════════════════

// Umumiy holat (dashboard)
export async function overview() {
    const [orders, inv, exp, debts, acc, qoldiq, oynak] = await Promise.all([
        sbGet("sales_orders", "select=id,customer_name,total_price,paid_amount,status,created_at&order=created_at.desc&limit=200"),
        sbGet("romix_inventory", "select=product_name,stock_quantity,price,unit"),
        sbGet("romix_expenses", "select=amount,date,category"),
        sbGet("romix_debts", "select=amount,paid_amount,creditor"),
        sbGet("romix_accessories", "select=qty,price"),
        sbGet("romix_qoldiq_profillar", "select=stock_quantity,length"),
        sbGet("romix_oynak", "select=stock_quantity,price")
    ]);
    const mk = monthKey(today());
    const jamiZakaz = orders.length;
    const faolZakaz = orders.filter(o => o.status && !/yetkaz/i.test(o.status)).length;
    const oylikSavdo = orders.filter(o => monthKey(o.created_at) === mk).reduce((s, o) => s + (Number(o.total_price) || 0), 0);
    const tolanmagan = orders.reduce((s, o) => s + Math.max(0, (Number(o.total_price) || 0) - (Number(o.paid_amount) || 0)), 0);

    const profilVal = inv.reduce((s, p) => s + (Number(p.stock_quantity) || 0) * (Number(p.price) || 0), 0);
    const accVal = acc.reduce((s, a) => s + (Number(a.qty) || 0) * (Number(a.price) || 0), 0);
    const qoldiqVal = qoldiq.reduce((s, q) => s + (Number(q.stock_quantity) || 0) * (Number(q.length) || 0) * 25, 0);
    const oynakVal = oynak.reduce((s, o) => s + (Number(o.stock_quantity) || 0) * (Number(o.price) || 0), 0);
    const omborQiymat = profilVal + accVal + qoldiqVal + oynakVal;

    const oylikHarajat = exp.filter(e => monthKey(e.date) === mk).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const qarz = debts.reduce((s, d) => s + Math.max(0, (Number(d.amount) || 0) - (Number(d.paid_amount) || 0)), 0);
    return {
        jami_zakaz: jamiZakaz, faol_zakaz: faolZakaz,
        oylik_savdo: fmt(oylikSavdo), tolanmagan_qarz_mijoz: fmt(tolanmagan),
        ombor_qiymati: fmt(omborQiymat), mahsulot_turlari: inv.length + acc.length + oynak.length,
        shu_oy_harajat: fmt(oylikHarajat), tashqi_qarz: fmt(qarz)
    };
}

// Zakazlar holati (pipeline)
export async function ordersReport(status) {
    let q = "select=customer_name,customer_phone,total_price,paid_amount,status,worker_group,deadline_date,created_at&order=created_at.desc&limit=40";
    const orders = await sbGet("sales_orders", q);
    const filtered = status ? orders.filter(o => (o.status || "").toLowerCase().includes(String(status).toLowerCase())) : orders;
    return {
        soni: filtered.length,
        zakazlar: filtered.slice(0, 20).map(o => ({
            mijoz: o.customer_name, tel: o.customer_phone || "", holat: o.status || "Kutilmoqda", muddat: o.deadline_date || "—",
            summa: fmt(o.total_price), tolangan: fmt(o.paid_amount || 0),
            qoldiq: fmt(Math.max(0, (Number(o.total_price) || 0) - (Number(o.paid_amount) || 0))),
            brigada: o.worker_group || "—"
        }))
    };
}

// Ombor (zaxira)
export async function warehouse() {
    const [inv, acc, qoldiq, oynak] = await Promise.all([
        sbGet("romix_inventory", "select=product_name,stock_quantity,price,unit&order=stock_quantity.asc"),
        sbGet("romix_accessories", "select=name,qty,price,unit"),
        sbGet("romix_qoldiq_profillar", "select=product_name,stock_quantity,length"),
        sbGet("romix_oynak", "select=product_name,stock_quantity,price,unit")
    ]);

    const profilQty = inv.reduce((s, p) => s + (Number(p.stock_quantity) || 0), 0);
    const profilVal = inv.reduce((s, p) => s + (Number(p.stock_quantity) || 0) * (Number(p.price) || 0), 0);

    const accQty = acc.reduce((s, a) => s + (Number(a.qty) || 0), 0);
    const accVal = acc.reduce((s, a) => s + (Number(a.qty) || 0) * (Number(a.price) || 0), 0);

    const qoldiqQty = qoldiq.reduce((s, q) => s + (Number(q.stock_quantity) || 0), 0);
    const qoldiqVal = qoldiq.reduce((s, q) => s + (Number(q.stock_quantity) || 0) * (Number(q.length) || 0) * 25, 0);

    const oynakQty = oynak.reduce((s, o) => s + (Number(o.stock_quantity) || 0), 0);
    const oynakVal = oynak.reduce((s, o) => s + (Number(o.stock_quantity) || 0) * (Number(o.price) || 0), 0);

    const jamiVal = profilVal + accVal + qoldiqVal + oynakVal;

    const kamProfil = inv.filter(p => (Number(p.stock_quantity) || 0) <= 5).map(p => ({ nomi: p.product_name, qoldiq: (Number(p.stock_quantity) || 0) + " " + (p.unit || "kg"), narx: fmt(p.price) }));
    const kamAcc = acc.filter(a => (Number(a.qty) || 0) <= 20).map(a => ({ nomi: a.name, qoldiq: (Number(a.qty) || 0) + " " + (a.unit || "dona"), narx: fmt(a.price) }));
    const kamOynak = oynak.filter(o => (Number(o.stock_quantity) || 0) <= 5).map(o => ({ nomi: o.product_name, qoldiq: (Number(o.stock_quantity) || 0) + " " + (o.unit || "dona"), narx: fmt(o.price) }));

    return {
        mahsulot_turlari: inv.length + acc.length + oynak.length,
        ombor_qiymati: fmt(jamiVal),
        bolimlar: [
            { nomi: "1. Profil ombori", miqdor: profilQty + " kg / dona", qiymat: fmt(profilVal) },
            { nomi: "2. Aksessuarlar ombori", miqdor: accQty + " dona", qiymat: fmt(accVal) },
            { nomi: "3. Qoldiq (parcha) profillar", miqdor: qoldiqQty + " dona", qiymat: fmt(qoldiqVal) },
            { nomi: "4. Oynak (shisha) ombori", miqdor: oynakQty + " dona", qiymat: fmt(oynakVal) }
        ],
        kam_qolganlar: [...kamProfil, ...kamAcc, ...kamOynak].slice(0, 15),
        royxat: inv.slice(0, 15).map(p => ({ nomi: p.product_name, qoldiq: (Number(p.stock_quantity) || 0) + " " + (p.unit || ""), narx: fmt(p.price) }))
    };
}

// Moliya: harajatlar
export async function expensesReport(period) {
    const exp = await sbGet("romix_expenses", "select=date,category,amount,note&order=date.desc&limit=100");
    const mk = monthKey(today());
    const list = (period === "oy" || period === "month") ? exp.filter(e => monthKey(e.date) === mk) : exp;
    return {
        davr: period || "hammasi", jami: fmt(list.reduce((s, e) => s + (Number(e.amount) || 0), 0)), soni: list.length,
        harajatlar: list.slice(0, 20).map(e => ({ sana: e.date, kategoriya: e.category || "Boshqa", summa: fmt(e.amount), izoh: e.note || "" }))
    };
}

// Moliya: qarzlar (tashqi)
export async function debtsReport() {
    const debts = await sbGet("romix_debts", "select=id,creditor,amount,paid_amount,due_date,note&order=created_at.desc&limit=50");
    const active = debts.filter(d => Math.max(0, (Number(d.amount) || 0) - (Number(d.paid_amount) || 0)) > 0);
    return {
        jami_qarz: fmt(active.reduce((s, d) => s + ((Number(d.amount) || 0) - (Number(d.paid_amount) || 0)), 0)), soni: active.length,
        qarzlar: active.slice(0, 20).map(d => ({
            kimga: d.creditor, jami: fmt(d.amount), tolangan: fmt(d.paid_amount || 0),
            qoldiq: fmt(Math.max(0, (Number(d.amount) || 0) - (Number(d.paid_amount) || 0))), muddat: d.due_date || "—"
        }))
    };
}

// HR: xodimlar + davomat
export async function hrReport() {
    const [emp, att] = await Promise.all([
        sbGet("employees", "select=full_name,role,salary_info,status,department&limit=100"),
        sbGet("attendance", `select=employee_id,status,date&date=eq.${today()}`)
    ]);
    const salaryNum = e => Number(String(e.salary_info || "").replace(/[^0-9]/g, "")) || 0;
    const faol = emp.filter(e => !/nofaol|ishdan|inactive/i.test(e.status || ""));
    return {
        jami_xodim: emp.length, faol_xodim: faol.length,
        bugun_kelgan: att.filter(a => /kel|ha|present|bor/i.test(a.status || "")).length,
        oylik_fond: fmt(faol.reduce((s, e) => s + salaryNum(e), 0)),
        xodimlar: faol.slice(0, 20).map(e => ({ ism: e.full_name, lavozim: e.role || e.department || "", oylik: fmt(salaryNum(e)) }))
    };
}

// ═══════════════════ YOZISH (faqat 2 ta) ═══════════════════

// 1) HARAJAT qo'shish → romix_expenses
export async function addExpense({ amount, category, note, date }) {
    const rec = { id: "EXP-" + Date.now(), date: date || today(), category: category || "Boshqa", amount: round(amount), note: note || "", created_at: new Date().toISOString() };
    await sbInsert("romix_expenses", rec);
    const exp = await sbGet("romix_expenses", "select=amount,date");
    const mk = monthKey(today());
    return { ok: true, qoshildi: fmt(rec.amount), kategoriya: rec.category, shu_oy_jami_harajat: fmt(exp.filter(e => monthKey(e.date) === mk).reduce((s, e) => s + (Number(e.amount) || 0), 0)) };
}

// 2a) TO'LOV — tashqi qarzga (romix_debts.paid_amount)
export async function payDebt({ creditor, amount }) {
    const debts = await sbGet("romix_debts", `select=id,creditor,amount,paid_amount&creditor=ilike.*${encodeURIComponent(creditor)}*&order=created_at.desc`);
    if (!debts.length) return { xato: `"${creditor}" nomli qarz topilmadi.` };
    const d = debts[0];
    const rem = Math.max(0, (Number(d.amount) || 0) - (Number(d.paid_amount) || 0));
    const pay = Math.min(round(amount), rem || round(amount));
    const newPaid = (Number(d.paid_amount) || 0) + pay;
    await sbPatch("romix_debts", d.id, { paid_amount: newPaid });
    return { ok: true, kimga: d.creditor, tolandi: fmt(pay), qolgan_qarz: fmt(Math.max(0, (Number(d.amount) || 0) - newPaid)) };
}

// 2b) TO'LOV — mijoz zakaziga (sales_orders.paid_amount)
export async function payOrder({ customer, amount }) {
    const orders = await sbGet("sales_orders", `customer_name=ilike.*${encodeURIComponent(customer)}*&order=created_at.desc`);
    if (!orders.length) return { xato: `"${customer}" mijoz zakazi topilmadi.` };
    const o = orders[0];
    const rem = Math.max(0, (Number(o.total_price) || 0) - (Number(o.paid_amount) || 0));
    const pay = Math.min(round(amount), rem || round(amount));
    const newPaid = (Number(o.paid_amount) || 0) + pay;
    await sbPatch("sales_orders", o.id, { paid_amount: newPaid, payment_date: new Date().toISOString() });
    return { ok: true, mijoz: o.customer_name, tolandi: fmt(pay), qolgan_qarz: fmt(Math.max(0, (Number(o.total_price) || 0) - newPaid)) };
}

// ── YANGI KUCHAYTIRILGAN FUNKSIYALAR (QIDIRUV VA HISOBOTLAR) ──

// Zakaz qidirish
export async function searchOrder(query) {
    const q = `or=(customer_name.ilike.*${encodeURIComponent(query)}*,customer_phone.ilike.*${encodeURIComponent(query)}*)&order=created_at.desc&limit=15`;
    const orders = await sbGet("sales_orders", q);
    return {
        topildi: orders.length,
        zakazlar: orders.map(o => ({
            mijoz: o.customer_name, tel: o.customer_phone || "", holat: o.status || "Kutilmoqda", muddat: o.deadline_date || "—",
            summa: fmt(o.total_price), tolangan: fmt(o.paid_amount || 0),
            qoldiq: fmt(Math.max(0, (Number(o.total_price) || 0) - (Number(o.paid_amount) || 0))),
            brigada: o.worker_group || "—"
        }))
    };
}

// Mahsulot qidirish
export async function searchProduct(query) {
    const inv = await sbGet("romix_inventory", `product_name=ilike.*${encodeURIComponent(query)}*&limit=15`);
    return {
        topildi: inv.length,
        royxat: inv.map(p => ({ nomi: p.product_name, qoldiq: (Number(p.stock_quantity) || 0) + " " + (p.unit || ""), narx: fmt(p.price) }))
    };
}

// Xodim qidirish
export async function searchEmployee(query) {
    const emp = await sbGet("employees", `full_name=ilike.*${encodeURIComponent(query)}*&limit=15`);
    return {
        topildi: emp.length,
        xodimlar: emp.map(e => ({ ism: e.full_name, lavozim: e.role || e.department || "", holat: e.status || "Faol", oylik: e.salary_info || "" }))
    };
}

// Ishlab chiqarish hisoboti
export async function productionReport() {
    const [batches, emp, orders] = await Promise.all([
        sbGet("romix_production_batches", "select=stage,quantity,employee_id,order_id&quantity=gt.0"),
        sbGet("employees", "select=id,full_name"),
        sbGet("sales_orders", "select=id,customer_name")
    ]);
    const empMap = Object.fromEntries(emp.map(e => [e.id, e.full_name]));
    const orderMap = Object.fromEntries(orders.map(o => [o.id, o.customer_name]));

    const stages = { kesish: [], payvandlash: [], yigish_qadoqlash: [], boshqa: [] };
    batches.forEach(b => {
        const st = b.stage || "boshqa";
        const item = {
            mijoz: orderMap[b.order_id] || "Noma'lum",
            miqdor: b.quantity,
            xodim: empMap[b.employee_id] || "Biriktirilmagan"
        };
        if (stages[st]) stages[st].push(item);
        else stages.boshqa.push(item);
    });

    return {
        kesish_soni: stages.kesish.length,
        kesish_royxat: stages.kesish.slice(0, 10),
        payvandlash_soni: stages.payvandlash.length,
        payvandlash_royxat: stages.payvandlash.slice(0, 10),
        yigish_qadoqlash_soni: stages.yigish_qadoqlash.length,
        yigish_qadoqlash_royxat: stages.yigish_qadoqlash.slice(0, 10)
    };
}

// Brigadalar tarkibi
export async function brigadesReport() {
    const [brigades, members, emp] = await Promise.all([
        sbGet("romix_brigades", "select=id,name"),
        sbGet("romix_brigade_members", "select=brigade_id,employee_id"),
        sbGet("employees", "select=id,full_name")
    ]);
    const empMap = Object.fromEntries(emp.map(e => [e.id, e.full_name]));
    const bMap = {};
    brigades.forEach(b => { bMap[b.id] = { nomi: b.name, azolar: [] }; });
    members.forEach(m => {
        if (bMap[m.brigade_id]) {
            bMap[m.brigade_id].azolar.push(empMap[m.employee_id] || "Noma'lum");
        }
    });
    return {
        soni: brigades.length,
        brigadalar: Object.values(bMap)
    };
}

// Material so'rovlari hisoboti
export async function materialRequestsReport() {
    const [reqs, orders] = await Promise.all([
        sbGet("material_requests", "select=order_id,status,created_at&order=created_at.desc&limit=30"),
        sbGet("sales_orders", "select=id,customer_name")
    ]);
    const orderMap = Object.fromEntries(orders.map(o => [o.id, o.customer_name]));
    return {
        soni: reqs.length,
        sorovlar: reqs.map(r => ({
            sana: r.created_at ? r.created_at.slice(0, 10) : "—",
            mijoz: orderMap[r.order_id] || "Noma'lum",
            holat: r.status || "Kutilmoqda"
        }))
    };
}

// Excel hisoboti uchun ma'lumotlar
export async function excelReport(oy) {
    const [orders, exp, payments] = await Promise.all([
        sbGet("sales_orders", "select=created_at,customer_name,customer_phone,total_price,paid_amount,status&order=created_at.asc"),
        sbGet("romix_expenses", "select=date,category,amount,note&order=date.asc"),
        sbGet("romix_payment_log", "select=date,creditor,amount,note&order=date.asc")
    ]);

    const filteredOrders = orders.filter(o => (o.created_at || "").startsWith(oy));
    const filteredExp = exp.filter(e => (e.date || "").startsWith(oy));
    const filteredPayments = payments.filter(p => (p.date || "").startsWith(oy));

    return {
        orders: filteredOrders,
        expenses: filteredExp,
        payments: filteredPayments
    };
}

export default { 
    overview, ordersReport, warehouse, expensesReport, debtsReport, hrReport, addExpense, payDebt, payOrder,
    searchOrder, searchProduct, searchEmployee, productionReport, brigadesReport, materialRequestsReport, excelReport
};
