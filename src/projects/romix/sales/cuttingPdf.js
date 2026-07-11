import { jsPDF } from 'jspdf';
import 'jspdf-autotable';


const FP   = 60;   // Rama profil kengligi (mm)
const SP   = 50;   // Stvorka/Qanot profil kengligi (mm)
const BW   = 20;   // Shtapik kengligi (mm)
const GAP  = 3;    // Rama–stvorka orasidagi bo'shliq (mm)
const IMP  = 30;   // Impost kengligi (mm)
const BAR  = 6000; // Standart profil uzunligi (mm)
const MINR = 800;  // Qoldiqni saqlash minimal uzunligi (mm)
const K45  = 12;   // 45°/45° arra zazori (mm)
const K90  = 6;    // 90°/90° arra zazori (mm)
const TRIM = 5;    // Profil uchidan qirqim (mm)

// ─── Arra zazori ───────────────────────────────────────────
function kerf(a, b) {
    return (a && a.includes('45') && b && b.includes('45')) ? K45 : K90;
}

// ─── 2D dizayner daraxti yoyish ────────────────────────────
function layoutTree(node, box, out) {
    if (!node) return;
    if (node.kind === 'leaf') { out.cells.push({ opening: node.opening, box }); return; }
    const horiz = node.dir === 'v';
    const total = horiz ? box.w : box.h;
    const gaps  = (node.children.length - 1) * IMP;
    const avail = total - gaps;
    const fixed = node.children.reduce((s, c) => s + (c.size || 0), 0);
    const flexN = node.children.filter(c => !c.size).length;
    const flexS = flexN > 0 ? Math.max(0, (avail - fixed) / flexN) : 0;
    let pos = horiz ? box.x : box.y;
    node.children.forEach((c, i) => {
        const len = c.size || flexS;
        const sub = horiz
            ? { x: pos, y: box.y, w: len, h: box.h }
            : { x: box.x, y: pos, w: box.w, h: len };
        layoutTree(c.node, sub, out);
        pos += len;
        if (i < node.children.length - 1) {
            const imLen = horiz ? box.h : box.w;
            out.imposts.push({
                len: imLen, dir: horiz ? 'v' : 'h',
                x1: horiz ? pos : box.x, y1: horiz ? box.y : pos,
                x2: horiz ? pos : (box.x + box.w), y2: horiz ? (box.y + box.h) : pos
            });
            pos += IMP;
        }
    });
}

// ─── Rasm: bitta mahsulot chizmasi ─────────────────────────
function drawItemDiagram(doc, item, top, pageW, M) {
    const dW = Math.round((item.design && item.design.W) || (item.width  || 0) * 1000);
    const dH = Math.round((item.design && item.design.H) || (item.height || 0) * 1000);
    if (!dW || !dH) return top;

    const lpad  = 28;
    const areaW = pageW - 2 * M - lpad;
    const areaH = 90;
    const scale = Math.min(areaW / dW, areaH / dH);
    const drawW = dW * scale, drawH = dH * scale;
    const sX    = M + lpad + (areaW - drawW) / 2;
    const sY    = top + 12;

    // Tashqi ramka
    doc.setDrawColor(30); doc.setLineWidth(0.7);
    doc.setFillColor(245, 248, 252);
    doc.rect(sX, sY, drawW, drawH, 'FD');

    // Bo'limlar
    const out = { cells: [], imposts: [] };
    if (item.design && item.design.tree && !item.design.frameOnly) {
        layoutTree(item.design.tree, { x: 0, y: 0, w: dW, h: dH }, out);
    } else {
        out.cells.push({ opening: 'kar', box: { x: 0, y: 0, w: dW, h: dH } });
    }

    // Impostlar
    doc.setDrawColor(100); doc.setLineWidth(0.5);
    out.imposts.forEach(im => {
        doc.line(sX + im.x1 * scale, sY + im.y1 * scale, sX + im.x2 * scale, sY + im.y2 * scale);
    });

    // Katak + ochilish belgisi
    out.cells.forEach(c => {
        const cx = sX + c.box.x * scale, cy = sY + c.box.y * scale;
        const cw = c.box.w * scale,      ch = c.box.h * scale;
        doc.setDrawColor(180); doc.setLineWidth(0.25);
        doc.rect(cx, cy, cw, ch);

        const op = c.opening || 'kar';
        if (op !== 'kar' && cw > 5 && ch > 5) {
            doc.setDrawColor(100, 149, 237); doc.setLineWidth(0.3);
            if (op === 'sol' || op === 'chapga') {
                doc.line(cx + cw, cy, cx, cy + ch / 2);
                doc.line(cx + cw, cy + ch, cx, cy + ch / 2);
            } else if (op === 'ong' || op === 'o\'ngga') {
                doc.line(cx, cy, cx + cw, cy + ch / 2);
                doc.line(cx, cy + ch, cx + cw, cy + ch / 2);
            } else {
                // povorka / eshik — diagonal xoch
                doc.line(cx, cy, cx + cw, cy + ch);
                doc.line(cx + cw, cy, cx, cy + ch);
            }
        }

        if (cw > 14 && ch > 8) {
            doc.setFontSize(5.5); doc.setTextColor(80);
            doc.text(`${Math.round(c.box.w)}×${Math.round(c.box.h)}`, cx + cw / 2, cy + ch / 2 + 1.5, { align: 'center' });
        }
    });

    // O'lcham chiziqlari
    doc.setDrawColor(20); doc.setLineWidth(0.3);
    doc.line(sX, sY + drawH + 4, sX + drawW, sY + drawH + 4);
    doc.setFontSize(7.5); doc.setFont(undefined, 'bold'); doc.setTextColor(20);
    doc.text(`${dW} mm`, sX + drawW / 2, sY + drawH + 9, { align: 'center' });

    doc.line(sX - 4, sY, sX - 4, sY + drawH);
    doc.text(`${dH} mm`, sX - 6, sY + drawH / 2, { align: 'center', angle: 90 });

    doc.setFont(undefined, 'normal'); doc.setTextColor(20);
    return sY + drawH + 16;
}

// ═══════════════════════════════════════════════════════════
// 1) Profillarni hisoblash (2D dizayndan)
//    Qaytaradi: { mat: [{ role, ref, len, angle, qty, itemLabel }] }
// ═══════════════════════════════════════════════════════════
export function derivePieces(items) {
    const groups  = {};
    const posMap  = {};
    let   prodIdx = 0;

    const add = (mat, role, len, angle, count, ref) => {
        if (len <= 0 || count <= 0) return;
        if (!groups[mat]) groups[mat] = [];
        groups[mat].push({ role, ref, len: Math.round(len), angle, qty: count });
    };

    items.forEach(it => {
        if (!['rom', 'rom_fortochka', 'eshik'].includes(it.type)) return;
        const baseMat = it.materialName || 'PROFIL';
        const itType  = it.type;
        prodIdx++;
        const P   = 'P-' + String(prodIdx).padStart(2, '0');
        const qty = Math.max(1, it.quantity || 1);

        if (it.design && it.design.tree) {
            const dW  = Math.round(it.design.W || (it.width  || 0) * 1000);
            const dH  = Math.round(it.design.H || (it.height || 0) * 1000);
            const out = { cells: [], imposts: [] };
            layoutTree(it.design.tree, { x: 0, y: 0, w: dW, h: dH }, out);

            // ① Rama — tashqi ramka 45° kesim
            const ramaMat = baseMat + ' · Rama';
            add(ramaMat, 'Rama', dH, '45°/45°', 2 * qty, P + '/R-V');
            add(ramaMat, 'Rama', dW, '45°/45°', 2 * qty, P + '/R-H');

            if (it.design.frameOnly) return;

            // ② Impost — o'rta bo'linma 90° kesim
            const impostMat = baseMat + ' · Impost';
            out.imposts.forEach((im, ii) => {
                let cutLen = im.len;
                if (im.dir === 'v') {
                    if (Math.abs(im.y1)       < 1) cutLen -= FP;
                    if (Math.abs(im.y2 - dH)  < 1) cutLen -= FP;
                } else {
                    if (Math.abs(im.x1)       < 1) cutLen -= FP;
                    if (Math.abs(im.x2 - dW)  < 1) cutLen -= FP;
                }
                if (cutLen > 0) add(impostMat, 'Impost', cutLen, '90°/90°', qty, `${P}/I-${ii + 1}`);
            });

            // ③ Stvorka & ④ Shtapik — kataklar bo'yicha
            const stvorMat  = baseMat + ' · Stvorka';
            const beadMat   = baseMat + ' · Shtapik';
            out.cells.forEach((c, ci) => {
                const cw = Math.round(c.box.w), ch = Math.round(c.box.h);
                const leftF  = Math.abs(c.box.x)                  < 1;
                const rightF = Math.abs((c.box.x + c.box.w) - dW) < 1;
                const topF   = Math.abs(c.box.y)                  < 1;
                const botF   = Math.abs((c.box.y + c.box.h) - dH) < 1;

                const Wi = cw - (leftF ? FP : 0) - (rightF ? FP : 0);
                const Hi = ch - (topF  ? FP : 0) - (botF   ? FP : 0);

                if (c.opening && c.opening !== 'kar') {
                    // Stvorka (qanot)
                    const sW = Wi - 2 * GAP;
                    const sH = Hi - 2 * GAP;
                    if (sW > 0 && sH > 0) {
                        add(stvorMat, 'Stvorka', sH, '45°/45°', 2 * qty, `${P}/S${ci}-V`);
                        add(stvorMat, 'Stvorka', sW, '45°/45°', 2 * qty, `${P}/S${ci}-H`);

                        if (itType === 'eshik') {
                            // Eshik: qanot ichida gorizontal impost + 2 ta shtapik to'plami
                            const sImp = sW - 2 * SP;
                            if (sImp > 0) add(baseMat + ' · Sash-Impost', 'Sash-Impost', sImp, '90°/90°', qty, `${P}/SI${ci}`);
                            const panH = sH * 0.38;
                            const topH = sH - panH;
                            const bW   = sW - 2 * SP;
                            const bHt  = topH - SP - 15;
                            const bHb  = panH - SP - 15;
                            if (bW > 0 && bHt > 0) { add(beadMat, 'Shtapik', bHt, '45°/45°', 2 * qty, `${P}/BT${ci}-V`); add(beadMat, 'Shtapik', bW, '45°/45°', 2 * qty, `${P}/BT${ci}-H`); }
                            if (bW > 0 && bHb > 0) { add(beadMat, 'Shtapik', bHb, '45°/45°', 2 * qty, `${P}/BB${ci}-V`); add(beadMat, 'Shtapik', bW, '45°/45°', 2 * qty, `${P}/BB${ci}-H`); }
                        } else {
                            // Rom: shtapik stvorka ichida
                            const gW = sW - 2 * SP, gH = sH - 2 * SP;
                            if (gW > 0 && gH > 0) {
                                add(beadMat, 'Shtapik', gH, '45°/45°', 2 * qty, `${P}/B${ci}-V`);
                                add(beadMat, 'Shtapik', gW, '45°/45°', 2 * qty, `${P}/B${ci}-H`);
                            }
                        }
                    }
                } else {
                    // Kar (yopiq, shisha to'g'ridan-to'g'ri ramkaga)
                    if (Wi > 0 && Hi > 0) {
                        add(beadMat, 'Shtapik', Hi, '45°/45°', 2 * qty, `${P}/B${ci}-V`);
                        add(beadMat, 'Shtapik', Wi, '45°/45°', 2 * qty, `${P}/B${ci}-H`);
                    }
                }
            });

        } else {
            // ── Oddiy hisob (2D dizaynsiz) ──────────────────────────
            const H = Math.round((it.height || 0) * 1000);
            const W = Math.round((it.width  || 0) * 1000);
            const innerW = W - 2 * FP, innerH = H - 2 * FP;
            const vDiv = Math.max(0, it.vDiv    || 0);
            const hDiv = Math.max(0, it.hDiv    || 0);
            const stv  = Math.max(0, it.stvorka || 0);

            add(baseMat + ' · Rama',    'Rama',    H, '45°/45°', 2 * qty, P + '/R-V');
            add(baseMat + ' · Rama',    'Rama',    W, '45°/45°', 2 * qty, P + '/R-H');
            if (vDiv > 0) add(baseMat + ' · Impost', 'Impost', innerH, '90°/90°', vDiv * qty, P + '/I-V');
            if (hDiv > 0) add(baseMat + ' · Impost', 'Impost', innerW, '90°/90°', hDiv * qty, P + '/I-H');
            if (stv > 0) {
                const sW = Math.round(innerW / stv - 2 * GAP);
                const sH = Math.round(innerH - 2 * GAP);
                add(baseMat + ' · Stvorka', 'Stvorka', sH, '45°/45°', 2 * stv * qty, P + '/S-V');
                add(baseMat + ' · Stvorka', 'Stvorka', sW, '45°/45°', 2 * stv * qty, P + '/S-H');
            }
            const cols = vDiv + 1, rows = hDiv + 1;
            const cW = Math.round(innerW / cols), cH = Math.round(innerH / rows);
            const gW = cW - 2 * BW, gH = cH - 2 * BW;
            if (gW > 0 && gH > 0) {
                add(baseMat + ' · Shtapik', 'Shtapik', gH, '45°/45°', 2 * cols * rows * qty, P + '/B-V');
                add(baseMat + ' · Shtapik', 'Shtapik', gW, '45°/45°', 2 * cols * rows * qty, P + '/B-H');
            }
            if (itType === 'rom_fortochka') {
                add(baseMat + ' · Rama', 'Rama', Math.round(innerH * 0.32), '45°/45°', 2 * qty, P + '/F-V');
                add(baseMat + ' · Rama', 'Rama', Math.round(innerW * 0.40), '45°/45°', 2 * qty, P + '/F-H');
            }
        }
    });

    return groups;
}

// ═══════════════════════════════════════════════════════════
// 2) First-Fit-Decreasing kesim optimizer
//    existingRemnants: [{ id, profile_type, length }]
//    Qaytaradi: { bars, maps, stats, newRemnants, usedRemnantIds }
// ═══════════════════════════════════════════════════════════
export function optimize(pieces, barLen = BAR, existingRemnants = []) {
    const units = [];
    pieces.forEach(p => { for (let i = 0; i < p.qty; i++) units.push({ ref: p.ref, role: p.role, len: p.len, angle: p.angle }); });
    units.sort((a, b) => b.len - a.len);

    const remnants = [...existingRemnants].sort((a, b) => b.length - a.length);
    const bars = [];
    const usedRemnantIds = [];
    const newRemnants    = [];
    let   totalWaste     = 0;

    units.forEach(u => {
        let placed = false;

        // 1) Avval qoldiq profildan
        for (const rem of remnants) {
            const gap  = kerf(rem.lastAngle || u.angle, u.angle);
            const need = rem.placed ? u.len + gap : u.len;
            if (rem.length >= need) {
                if (!rem._bar) {
                    rem._bar = { type: 'REMNANT', initial: rem.length, remaining: rem.length, pieces: [], remId: rem.id, remProfile: rem.profile_type || '' };
                    bars.push(rem._bar);
                    usedRemnantIds.push(rem.id);
                }
                rem._bar.pieces.push(u);
                rem._bar.remaining -= need;
                rem.length         -= need;
                rem.lastAngle       = u.angle;
                rem.placed          = true;
                placed = true;
                break;
            }
        }
        if (placed) return;

        // 2) Ochiq yangi profilga sig'adimi
        for (const b of bars) {
            if (b.type === 'REMNANT') continue;
            const gap  = kerf(b.pieces[b.pieces.length - 1].angle, u.angle);
            const need = u.len + gap;
            if (b.remaining >= need) {
                b.pieces.push(u); b.remaining -= need; placed = true; break;
            }
        }

        // 3) Yangi profil och
        if (!placed) bars.push({ type: 'NEW', initial: barLen, remaining: barLen - TRIM - u.len, pieces: [u] });
    });

    remnants.forEach(r => { delete r._bar; delete r.lastAngle; delete r.placed; });

    // Qoldiqlarni ajratish
    bars.forEach(b => {
        if (b.remaining >= MINR) newRemnants.push({ length: Math.round(b.remaining), source: b.type });
        else totalWaste += b.remaining;
    });

    const newBars     = bars.filter(b => b.type === 'NEW');
    const remBars     = bars.filter(b => b.type === 'REMNANT');
    const totalBarLen = newBars.length * barLen + remBars.reduce((s, b) => s + b.initial, 0);
    const piecesLen   = units.reduce((s, u) => s + u.len, 0);
    const offcut      = bars.reduce((s, b) => s + b.remaining, 0);
    const offcutRate  = totalBarLen ? (offcut / totalBarLen * 100) : 0;

    // Guruhlaymiz
    const mapObj = {};
    bars.forEach(b => {
        const key = b.type + '|' + b.pieces.map(p => p.len + ':' + p.angle).sort().join(',');
        if (!mapObj[key]) mapObj[key] = { ...b, count: 0 };
        mapObj[key].count++;
    });

    return {
        bars, maps: Object.values(mapObj),
        totalBars: newBars.length, remnantBarsUsed: remBars.length,
        totalBarLen, piecesLen, offcut, offcutRate, totalWaste,
        usedRemnantIds, newRemnants,
        efficiency: totalBarLen ? ((piecesLen / totalBarLen) * 100) : 0
    };
}

// ─── 3 xil optimizatsiya varianti ─────────────────────────
function optimizeScenarios(pieces) {
    // Variant A: Standart (6000mm)
    const A = optimize(pieces, 6000);

    // Variant B: Konservativ (3000mm qisqa profillar)
    const B = optimize(pieces, 3000);

    // Variant C: Agressiv (boshlangich sortlash: uzunlikka ko'ra, keyin parallel guruh)
    // Agressiv: 6000mm, lekin qo'shimcha qoldiq saqlash chegarasi 500mm
    const units = [];
    pieces.forEach(p => { for (let i = 0; i < p.qty; i++) units.push({ ref: p.ref, role: p.role, len: p.len, angle: p.angle }); });
    units.sort((a, b) => {
        if (a.angle !== b.angle) return a.angle > b.angle ? -1 : 1; // avval bir xil burchak
        return b.len - a.len;
    });
    const barsC = [];
    units.forEach(u => {
        let placed = false;
        for (const b of barsC) {
            const gap  = kerf(b.pieces[b.pieces.length - 1].angle, u.angle);
            const need = u.len + gap;
            if (b.remaining >= need) { b.pieces.push(u); b.remaining -= need; placed = true; break; }
        }
        if (!placed) barsC.push({ type: 'NEW', initial: 6000, remaining: 6000 - TRIM - u.len, pieces: [u] });
    });
    const pLen = units.reduce((s, u) => s + u.len, 0);
    const totC = barsC.length * 6000;
    const offC = barsC.reduce((s, b) => s + b.remaining, 0);
    const C = {
        totalBars: barsC.length, totalBarLen: totC, piecesLen: pLen,
        offcut: offC, offcutRate: totC ? (offC / totC * 100) : 0,
        efficiency: totC ? (pLen / totC * 100) : 0,
        bars: barsC, maps: [], remnantBarsUsed: 0, newRemnants: []
    };
    // maps for C
    const cMap = {};
    barsC.forEach(b => {
        const key = b.pieces.map(p => p.len + ':' + p.angle).sort().join(',');
        if (!cMap[key]) cMap[key] = { ...b, count: 0 };
        cMap[key].count++;
    });
    C.maps = Object.values(cMap);

    return { A, B, C };
}

// ─── Sayfa yangi sahifadan boshlanishi kerakmi? ────────────
function ensurePage(doc, y, needed = 40) {
    if (y + needed > 278) { doc.addPage(); return 16; }
    return y;
}

const fmt  = n => Number(n).toLocaleString('ru-RU');
const fmtM = n => (n / 1000).toFixed(3);

export async function generateCuttingPdf(order) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const PW  = doc.internal.pageSize.getWidth();
    const M   = 12;
    const date = new Date().toLocaleDateString('uz-UZ');

    const groups = derivePieces(order.items || []);
    const mats   = Object.keys(groups);
    if (!mats.length) {
        alert("Zakazda rom/eshik yo'q — kesim uchun profil bo'lagi topilmadi.");
        return null;
    }

    const romlar = (order.items || []).filter(it => ['rom', 'rom_fortochka', 'eshik'].includes(it.type));
    const remnants = order.remnants || [];
    const allUsedRemnantIds = [];
    const allNewRemnants    = [];

    // ══════════════════════════════════════════════════════
    // SAHIFA 1: Buyurtma ko'rinishi (2D chizmalar)
    // ══════════════════════════════════════════════════════
    doc.setFillColor(14, 28, 46);
    doc.rect(0, 0, PW, 22, 'F');
    doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('AKFA Romix — Kesim Rejasi', M, 10);
    doc.setFontSize(8.5); doc.setFont(undefined, 'normal');
    doc.text(`Mijoz: ${order.customer || '—'}${order.phone ? '  ·  ' + order.phone : ''}`, M, 16);
    doc.text(date, PW - M, 16, { align: 'right' });
    doc.setTextColor(20);

    let dy = 28;
    romlar.forEach((it, idx) => {
        dy = ensurePage(doc, dy, 120);
        const label = it.type === 'eshik' ? 'Eshik' : it.type === 'rom_fortochka' ? 'Rom (fortochkali)' : 'Rom';
        const dW = Math.round((it.design && it.design.W) || (it.width  || 0) * 1000);
        const dH = Math.round((it.design && it.design.H) || (it.height || 0) * 1000);
        doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(20);
        doc.text(`${idx + 1}. ${label} — ${it.materialName || ''}  ·  ${dW}×${dH} mm  ·  ${it.quantity || 1} dona`, M, dy);
        dy = drawItemDiagram(doc, it, dy, PW, M) + 4;
    });

    // ══════════════════════════════════════════════════════
    // SAHIFA 2: Umumiy profil sarfi (barcha profillar ro'yxati)
    // ══════════════════════════════════════════════════════
    doc.addPage();
    doc.setFillColor(14, 28, 46);
    doc.rect(0, 0, PW, 22, 'F');
    doc.setFontSize(13); doc.setFont(undefined, 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('Buyurtma profil sarfi tahlili', M, 10);
    doc.setFontSize(8.5); doc.setFont(undefined, 'normal');
    doc.text(`Profil uzunligi: ${fmt(BAR)} mm  |  Arra zazori: 45°=${K45}mm, 90°=${K90}mm  |  Trim: ${TRIM}mm`, M, 16);
    doc.setTextColor(20);

    let y = 26;

    // Har bir material guruhini jadval ko'rinishida chiqaramiz
    mats.forEach(mat => {
        const pieces = groups[mat];

        // Material nomi sarlavha
        y = ensurePage(doc, y, 30);
        doc.setFillColor(235, 240, 248);
        doc.rect(M, y, PW - 2 * M, 7, 'F');
        doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(14, 28, 46);
        doc.text(`▶  ${mat}`, M + 2, y + 5);
        y += 8;

        // Rol bo'yicha guruh
        const byRole = {};
        pieces.forEach(p => {
            const r = p.role || 'Boshqa';
            if (!byRole[r]) byRole[r] = { pieces: [], totalLen: 0, totalQty: 0 };
            byRole[r].pieces.push(p);
            byRole[r].totalLen += p.len * p.qty;
            byRole[r].totalQty += p.qty;
        });

        const roleRows = Object.entries(byRole).map(([role, info]) => [
            role,
            info.pieces.length + ' xil o\'lcham',
            info.totalQty + ' ta bo\'lak',
            fmt(info.totalLen) + ' mm',
            fmtM(info.totalLen) + ' m',
            Math.ceil(info.totalLen / (BAR - TRIM)) + ' ta profil'
        ]);

        doc.autoTable({
            startY: y,
            head: [['Profil turi', "O'lchamlar", "Bo'laklar soni", 'Jami uzunlik', 'Metrda', 'Min. profillar']],
            body: roleRows,
            styles: { fontSize: 8, cellPadding: 1.8 },
            headStyles: { fillColor: [60, 80, 120], textColor: 255 },
            alternateRowStyles: { fillColor: [248, 250, 254] },
            margin: { left: M, right: M }
        });
        y = doc.lastAutoTable.finalY + 4;

        // Batafsil kesim ro'yxati
        y = ensurePage(doc, y, 20);
        doc.setFontSize(8); doc.setFont(undefined, 'italic'); doc.setTextColor(80);
        doc.text('Batafsil bo\'laklar ro\'yxati:', M + 2, y + 4);
        y += 6;

        const detailRows = pieces.map((p, i) => [
            i + 1,
            p.role || '—',
            p.ref  || '—',
            fmt(p.len) + ' mm',
            p.qty + ' ta',
            p.angle || '—',
            fmt(p.len * p.qty) + ' mm'
        ]);

        doc.autoTable({
            startY: y,
            head: [['#', 'Rol', 'Ref', "Uzunlik", 'Soni', 'Kesim', 'Jami']],
            body: detailRows,
            styles: { fontSize: 7.5, cellPadding: 1.3 },
            headStyles: { fillColor: [80, 100, 140], textColor: 255 },
            alternateRowStyles: { fillColor: [250, 251, 255] },
            foot: [['', '', 'JAMI', '', pieces.reduce((s, p) => s + p.qty, 0) + ' ta', '', fmt(pieces.reduce((s, p) => s + p.len * p.qty, 0)) + ' mm']],
            footStyles: { fillColor: [220, 230, 245], fontStyle: 'bold' },
            margin: { left: M, right: M }
        });
        y = doc.lastAutoTable.finalY + 8;
    });

    // ══════════════════════════════════════════════════════
    // SAHIFA 3+: 3 XIL OPTIMIZATSIYA VARIANTI
    // ══════════════════════════════════════════════════════
    const scenarioLabels = [
        { key: 'A', title: 'Variant A — Standart (6000mm profillar)',    barLen: 6000, color: [14, 28, 46] },
        { key: 'B', title: 'Variant B — Konservativ (3000mm profillar)', barLen: 3000, color: [30, 100, 70] },
        { key: 'C', title: 'Variant C — Agressiv (burchak bo\'yicha guruh)', barLen: 6000, color: [120, 50, 20] },
    ];

    mats.forEach(mat => {
        const pieces = groups[mat];
        const matchR = remnants.filter(r => {
            const rk = (r.profile_type || '').toLowerCase();
            const mk = mat.toLowerCase();
            return mk.includes(rk) || rk.includes(mk.split(' ·')[0].trim());
        });

        // 3 variant
        const scenResults = {
            A: optimize(pieces, 6000, matchR),
            B: optimize(pieces, 3000),
            C: (() => {
                const units2 = [];
                pieces.forEach(p => { for (let i = 0; i < p.qty; i++) units2.push({ ...p }); });
                units2.sort((a, b) => {
                    if (a.angle !== b.angle) return a.angle > b.angle ? -1 : 1;
                    return b.len - a.len;
                });
                const bars2 = [];
                units2.forEach(u => {
                    let placed = false;
                    for (const b of bars2) {
                        const g = kerf(b.pieces[b.pieces.length - 1].angle, u.angle);
                        if (b.remaining >= u.len + g) { b.pieces.push(u); b.remaining -= u.len + g; placed = true; break; }
                    }
                    if (!placed) bars2.push({ type: 'NEW', initial: 6000, remaining: 6000 - TRIM - u.len, pieces: [u] });
                });
                const pL = units2.reduce((s, u) => s + u.len, 0);
                const tL = bars2.length * 6000;
                const oC = bars2.reduce((s, b) => s + b.remaining, 0);
                const cMapObj = {};
                bars2.forEach(b => { const k = b.pieces.map(p => p.len + ':' + p.angle).sort().join(','); if (!cMapObj[k]) cMapObj[k] = { ...b, count: 0 }; cMapObj[k].count++; });
                return { bars: bars2, maps: Object.values(cMapObj), totalBars: bars2.length, remnantBarsUsed: 0, totalBarLen: tL, piecesLen: pL, offcut: oC, offcutRate: tL ? (oC / tL * 100) : 0, efficiency: tL ? (pL / tL * 100) : 0, newRemnants: [], usedRemnantIds: [] };
            })()
        };

        // Variant A qoldiqlarini yig'ish
        scenResults.A.usedRemnantIds.forEach(id => allUsedRemnantIds.push(id));
        scenResults.A.newRemnants.forEach(r => allNewRemnants.push({ ...r, mat }));

        scenarioLabels.forEach(({ key, title, color }) => {
            const res = scenResults[key];

            doc.addPage();
            doc.setFillColor(...color);
            doc.rect(0, 0, PW, 22, 'F');
            doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(255, 255, 255);
            doc.text(title, M, 10);
            doc.setFontSize(8); doc.setFont(undefined, 'normal');
            doc.text(`Profil: ${mat.split(' ·')[0]}`, M, 16);
            doc.text(date, PW - M, 16, { align: 'right' });
            doc.setTextColor(20);

            // Xulosa kartochkalar (quti ko'rinishida)
            const cards = [
                { l: 'Kerakli profillar',   v: res.totalBars + ' ta (×' + (key === 'B' ? '3000' : '6000') + 'mm)' },
                { l: 'Qoldiq ishlatildi',   v: res.remnantBarsUsed + ' ta (IQTISOD)'   },
                { l: 'Jami uzunlik',        v: (res.totalBarLen / 1000).toFixed(2) + ' m' },
                { l: "Bo'laklari uzunligi", v: (res.piecesLen   / 1000).toFixed(2) + ' m' },
                { l: 'Chiqit (off-cut)',    v: (res.offcut      / 1000).toFixed(2) + ' m (' + res.offcutRate.toFixed(1) + '%)' },
                { l: 'Samaradorlik',        v: res.efficiency.toFixed(1) + '%' },
                { l: 'Yangi qoldiqlar',     v: res.newRemnants.length + ' ta (≥800mm)' },
            ];

            let cy2 = 26;
            const cw = (PW - 2 * M - 6) / 4;
            cards.forEach((c, ci) => {
                const cx = M + (ci % 4) * (cw + 2);
                if (ci % 4 === 0 && ci > 0) cy2 += 18;
                if (ci === 0) cy2 = 26;
                doc.setFillColor(245, 248, 253);
                doc.setDrawColor(180, 200, 230);
                doc.setLineWidth(0.3);
                doc.roundedRect(cx, cy2, cw, 15, 1.5, 1.5, 'FD');
                doc.setFontSize(6.5); doc.setFont(undefined, 'normal'); doc.setTextColor(100);
                doc.text(c.l, cx + cw / 2, cy2 + 5, { align: 'center' });
                doc.setFontSize(8.5); doc.setFont(undefined, 'bold');
                const vColor = c.l === 'Samaradorlik' && res.efficiency >= 85
                    ? [0, 130, 60] : c.l.includes('Qoldiq') && res.remnantBarsUsed > 0
                    ? [0, 100, 180] : [14, 28, 46];
                doc.setTextColor(...vColor);
                doc.text(c.v, cx + cw / 2, cy2 + 12, { align: 'center' });
            });
            doc.setTextColor(20);

            let yy = cy2 + 20;

            // Kesim xaritalari jadvali
            yy = ensurePage(doc, yy, 20);
            doc.setFont(undefined, 'bold'); doc.setFontSize(9);
            doc.text('Kesim xaritalari', M, yy); yy += 2;

            const mapRows = res.maps.map((mp, mi) => [
                mi + 1,
                mp.type === 'REMNANT' ? `★ Qoldiq (${mp.remProfile || ''})` : 'Yangi profil',
                mp.count,
                mp.pieces.length,
                mp.pieces.map(p => fmt(p.len)).join(' + ') + ' mm',
                fmt(mp.remaining) + ' mm'
            ]);
            doc.autoTable({
                startY: yy,
                head: [['#', 'Profil', 'Soni', "Bo'laklar", 'Kesim mm', 'Qoldiq']],
                body: mapRows,
                styles: { fontSize: 7.5, cellPadding: 1.3 },
                headStyles: { fillColor: color, textColor: 255 },
                didParseCell: data => {
                    if (data.section === 'body' && String(data.row.raw[1]).startsWith('★')) {
                        data.cell.styles.fillColor  = [220, 255, 220];
                        data.cell.styles.textColor  = [0, 120, 0];
                    }
                },
                columnStyles: { 4: { cellWidth: 75 } },
                margin: { left: M, right: M }
            });
            yy = doc.lastAutoTable.finalY + 6;

            // Visual kesim chizmasi (bar diagram)
            yy = ensurePage(doc, yy, 20);
            doc.setFont(undefined, 'bold'); doc.setFontSize(9);
            doc.text('Kesim chizmasi (vizual)', M, yy); yy += 3;

            const barW   = PW - 2 * M;
            const sc     = barW / Math.max(6000, key === 'B' ? 3000 : 6000);
            const barH   = 10;
            const rulerH = 4;

            res.maps.slice(0, 12).forEach((mp, mi) => {
                yy = ensurePage(doc, yy, barH + rulerH + 10);

                const lbl = `${mi + 1}/${res.maps.length} — Soni: ${mp.count} ta`;
                doc.setFontSize(7); doc.setFont(undefined, 'bold'); doc.setTextColor(60);
                doc.text(lbl, M, yy);
                yy += 4;

                const rulerY = yy;
                const barY   = rulerY + rulerH + 1;

                // Ruler
                doc.setFillColor(250, 250, 250); doc.setDrawColor(170);
                doc.setLineWidth(0.15);
                doc.rect(M, rulerY, barW, rulerH, 'FD');

                // Profil fon
                doc.setFillColor(225, 228, 235); doc.setDrawColor(80); doc.setLineWidth(0.3);
                doc.rect(M, barY, barW, barH, 'FD');

                // Trim
                const trimW = TRIM * sc;
                doc.setFillColor(200, 60, 60);
                doc.rect(M, barY, trimW, barH, 'F');

                let x = M + trimW;
                mp.pieces.forEach((p, pi) => {
                    const pw      = p.len * sc;
                    const nxt     = mp.pieces[pi + 1];
                    const angles  = (p.angle || '90°/90°').split('/');
                    const l45     = angles[0] && angles[0].includes('45');
                    const r45     = angles[1] && angles[1].includes('45');
                    const bev     = Math.min(barH * 0.5, pw / 2.5);

                    // Bo'lak rangi: rol bo'yicha
                    const roleColor = p.role === 'Rama' ? [180, 200, 240]
                        : p.role === 'Stvorka'          ? [180, 240, 200]
                        : p.role === 'Shtapik'          ? [240, 220, 180]
                        : p.role === 'Impost'           ? [220, 180, 240]
                        : [220, 222, 226];

                    doc.setFillColor(...roleColor);
                    doc.rect(x, barY, pw, barH, 'F');
                    doc.setDrawColor(60); doc.setLineWidth(0.3);
                    doc.rect(x, barY, pw, barH);

                    // 45° burchak belgisi
                    doc.setFillColor(130, 140, 160);
                    if (l45 && bev > 0) doc.triangle(x, barY, x + bev, barY, x, barY + barH, 'FD');
                    if (r45 && bev > 0) doc.triangle(x + pw, barY, x + pw - bev, barY, x + pw, barY + barH, 'FD');

                    // Ruler: uzunlik
                    doc.setFontSize(5.5); doc.setFont(undefined, 'bold'); doc.setTextColor(30);
                    if (pw > 8) doc.text(fmt(p.len), x + pw / 2, rulerY + rulerH / 2 + 1, { align: 'center' });

                    // Ref
                    doc.setFontSize(5); doc.setFont(undefined, 'normal'); doc.setTextColor(20);
                    if (pw > 10) doc.text((p.ref || '') + ' ' + (p.role || ''), x + pw / 2, barY + barH / 2 + 1.5, { align: 'center' });

                    x += pw;

                    // Arra zazori
                    if (nxt) {
                        const kw = kerf(p.angle, nxt.angle) * sc;
                        doc.setFillColor(90, 90, 95);
                        doc.rect(x, barY - 0.5, Math.max(kw, 0.5), barH + 1, 'F');
                        x += kw;
                    }
                });

                // Chiqit
                const remW = (M + barW) - x;
                if (remW > 0.5) {
                    doc.setFillColor(220, 50, 50, 0.5);
                    doc.setFillColor(210, 80, 80);
                    doc.rect(x, barY, remW, barH, 'F');
                    doc.setFontSize(5.5); doc.setTextColor(255);
                    if (remW > 8) doc.text(fmt(mp.remaining) + 'mm', x + remW / 2, barY + barH / 2 + 1.5, { align: 'center' });
                }
                doc.setTextColor(20);
                yy = barY + barH + 7;
            });

            // Izoh: ranglar
            yy = ensurePage(doc, yy, 14);
            const legend = [
                { c: [180, 200, 240], l: 'Rama'      },
                { c: [180, 240, 200], l: 'Stvorka'   },
                { c: [240, 220, 180], l: 'Shtapik'   },
                { c: [220, 180, 240], l: 'Impost'    },
                { c: [200, 60,  60],  l: 'Trim'      },
                { c: [210, 80,  80],  l: 'Chiqit'    },
                { c: [90,  90,  95],  l: 'Arra zazor'},
            ];
            let lx = M;
            legend.forEach(lg => {
                doc.setFillColor(...lg.c); doc.rect(lx, yy, 5, 3, 'F');
                doc.setFontSize(6.5); doc.setTextColor(40);
                doc.text(lg.l, lx + 6, yy + 2.5);
                lx += 24;
            });
            doc.setTextColor(20);
            yy += 8;
        });
    });

    // ══════════════════════════════════════════════════════
    // OXIRGI SAHIFA: 3 Variant taqqoslama jadvali
    // ══════════════════════════════════════════════════════
    doc.addPage();
    doc.setFillColor(40, 60, 90);
    doc.rect(0, 0, PW, 22, 'F');
    doc.setFontSize(13); doc.setFont(undefined, 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('3 Xil Variant Taqqoslamasi', M, 10);
    doc.setFontSize(8); doc.setFont(undefined, 'normal');
    doc.text('Eng yaxshi variantni tanlash uchun quyidagi jadvalga qarang', M, 16);
    doc.setTextColor(20);

    let cy3 = 28;
    mats.forEach(mat => {
        const pieces = groups[mat];
        const matchR = remnants.filter(r => {
            const rk = (r.profile_type || '').toLowerCase();
            const mk = mat.toLowerCase();
            return mk.includes(rk) || rk.includes(mk.split(' ·')[0].trim());
        });
        const A = optimize(pieces, 6000, matchR);
        const B = optimize(pieces, 3000);
        const units3 = []; pieces.forEach(p => { for (let i = 0; i < p.qty; i++) units3.push({ ...p }); });
        units3.sort((a, b) => { if (a.angle !== b.angle) return a.angle > b.angle ? -1 : 1; return b.len - a.len; });
        const bars3 = []; units3.forEach(u => { let ok = false; for (const b of bars3) { const g = kerf(b.pieces[b.pieces.length - 1].angle, u.angle); if (b.remaining >= u.len + g) { b.pieces.push(u); b.remaining -= u.len + g; ok = true; break; } } if (!ok) bars3.push({ remaining: 6000 - TRIM - u.len, pieces: [u] }); });
        const pL3 = units3.reduce((s, u) => s + u.len, 0);
        const tL3 = bars3.length * 6000;
        const oC3 = bars3.reduce((s, b) => s + b.remaining, 0);
        const C = { totalBars: bars3.length, totalBarLen: tL3, offcut: oC3, offcutRate: tL3 ? (oC3 / tL3 * 100) : 0, efficiency: tL3 ? (pL3 / tL3 * 100) : 0, newRemnants: [] };

        cy3 = ensurePage(doc, cy3, 30);
        doc.setFillColor(235, 240, 248);
        doc.rect(M, cy3, PW - 2 * M, 7, 'F');
        doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(14, 28, 46);
        doc.text(`▶ ${mat}`, M + 2, cy3 + 5);
        cy3 += 9;

        const best = [A, B, C].sort((x, z) => x.offcutRate - z.offcutRate)[0];

        doc.autoTable({
            startY: cy3,
            head: [['Variant', 'Profillar', 'Bar uzunligi', 'Jami', 'Chiqit', 'Chiqit %', 'Samaradorlik', 'Tavsiya']],
            body: [
                ['A — Standart',    A.totalBars + ' ta', '6000 mm', (A.totalBarLen / 1000).toFixed(2) + ' m', (A.offcut / 1000).toFixed(2) + ' m', A.offcutRate.toFixed(1) + '%', A.efficiency.toFixed(1) + '%', A.offcutRate <= B.offcutRate && A.offcutRate <= C.offcutRate ? '✅ ENG YAXSHI' : ''],
                ['B — Konservativ', B.totalBars + ' ta', '3000 mm', (B.totalBarLen / 1000).toFixed(2) + ' m', (B.offcut / 1000).toFixed(2) + ' m', B.offcutRate.toFixed(1) + '%', B.efficiency.toFixed(1) + '%', B.offcutRate < A.offcutRate && B.offcutRate <= C.offcutRate ? '✅ ENG YAXSHI' : ''],
                ['C — Agressiv',    C.totalBars + ' ta', '6000 mm', (C.totalBarLen / 1000).toFixed(2) + ' m', (C.offcut / 1000).toFixed(2) + ' m', C.offcutRate.toFixed(1) + '%', C.efficiency.toFixed(1) + '%', C.offcutRate < A.offcutRate && C.offcutRate < B.offcutRate ? '✅ ENG YAXSHI' : ''],
            ],
            styles:  { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [40, 60, 90], textColor: 255 },
            didParseCell: data => {
                if (data.section === 'body' && String(data.row.raw[7]).includes('✅')) {
                    data.cell.styles.fillColor = [200, 255, 210];
                    data.cell.styles.textColor  = [0, 120, 0];
                    data.cell.styles.fontStyle  = 'bold';
                }
            },
            margin: { left: M, right: M }
        });
        cy3 = doc.lastAutoTable.finalY + 8;
    });

    // Izoh
    cy3 = ensurePage(doc, cy3, 24);
    doc.setFillColor(250, 253, 240); doc.setDrawColor(180, 210, 150); doc.setLineWidth(0.3);
    doc.roundedRect(M, cy3, PW - 2 * M, 22, 2, 2, 'FD');
    doc.setFontSize(8.5); doc.setFont(undefined, 'bold'); doc.setTextColor(50, 100, 30);
    doc.text('♻️  Smart Remnant AI haqida', M + 3, cy3 + 6);
    doc.setFont(undefined, 'normal'); doc.setFontSize(7.5); doc.setTextColor(60);
    doc.text(`• Variant A da ombordagi ${remnants.length} ta qoldiq profil tekshirildi.`, M + 3, cy3 + 12);
    doc.text(`• Chiqit ≥ ${MINR}mm bo'lsa, u avtomatik omborga qaytib yoziladi.`, M + 3, cy3 + 17);

    const fname = `AKFA_Kesim_${(order.customer || 'zakaz').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fname);

    return { usedRemnantIds: allUsedRemnantIds, newRemnants: allNewRemnants };
}
