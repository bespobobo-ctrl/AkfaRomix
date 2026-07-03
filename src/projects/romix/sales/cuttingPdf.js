// ═══════════════════════════════════════════════════════════
//  AKFA Romix — Kesim optimizatsiya PDF (OptiCut uslubida)
//  Zakazdagi rom/eshik'larni profil bo'laklariga bo'lib, 6000mm
//  profillarni eng kam chiqit bilan kesish rejasini PDF qiladi.
//
//  Arra zazori:
//    45° kesim (2 arra uchrashganda) = 4 mm
//    90° kesim (1 arra)              = 2 mm
// ═══════════════════════════════════════════════════════════

const FRAME_PROFILE = 60; // rama profil eni (mm)
const SASH_PROFILE = 50;  // stvorka profil eni (mm)
const BEAD_W = 20;        // shtapik eni (mm)
const SASH_GAP = 3;       // rama–stvorka orasidagi zazor (mm)
const IMPOST_MM = 30;     // impost eni (2D dizayner bilan bir xil)
const BAR_LEN = 6000;     // standart profil uzunligi (mm)

const KERF_45 = 4;  // 2 ta arra uchrashganda (45° burchak kesim) → 4mm zazor
const KERF_90 = 2;  // 1 ta arra (90° to'g'ri kesim) → 2mm zazor
const TRIM = 5;     // profil chetidan qirqim (mm)

// 2D dizayner daraxti layout (bo'lim kataklari + impostlar)
function layoutTree(node, box, out) {
    if (!node) return;
    if (node.kind === 'leaf') {
        out.cells.push({ opening: node.opening, box });
        return;
    }
    const horiz = node.dir === 'v';
    const total = horiz ? box.w : box.h;
    const gaps = (node.children.length - 1) * IMPOST_MM;
    const avail = total - gaps;
    const fixed = node.children.reduce((s, c) => s + (c.size || 0), 0);
    const flexN = node.children.filter(c => !c.size).length;
    const flexSize = flexN > 0 ? Math.max(0, (avail - fixed) / flexN) : 0;
    let pos = horiz ? box.x : box.y;
    node.children.forEach((c, i) => {
        const len = c.size || flexSize;
        const sub = horiz
            ? { x: pos, y: box.y, w: len, h: box.h }
            : { x: box.x, y: pos, w: box.w, h: len };
        layoutTree(c.node, sub, out);
        pos += len;
        if (i < node.children.length - 1) {
            // Impost uzunligi = ota katakdagi teskari o'lcham
            const imLen = horiz ? box.h : box.w;
            out.imposts.push({ len: imLen, dir: horiz ? 'v' : 'h' });
            pos += IMPOST_MM;
        }
    });
}

// Arra zazorini aniqlash (qo'shni bo'laklar burchagiga qarab)
function kerfBetween(angleA, angleB) {
    const a45 = angleA && angleA.includes('45');
    const b45 = angleB && angleB.includes('45');
    // Ikkala uchida 45° kesim bo'lsa → 2 arra uchrashadi → 4mm
    // Kamida biri 90° bo'lsa → 1 arra → 2mm
    if (a45 && b45) return KERF_45;
    return KERF_90;
}

// ══════════════════════════════════════════════════════
// 1) Zakaz elementlarini profil bo'laklariga aylantirish
// ══════════════════════════════════════════════════════
export function derivePieces(items) {
    const groups = {}; // material -> [{ref,len,angle,qty}]
    const posMap = {};
    let productIdx = 0;

    items.forEach(it => {
        if (!['rom', 'rom_fortochka', 'eshik'].includes(it.type)) return;
        const baseMat = it.materialName || '40X60X2mm PROFIL';
        productIdx++;
        const P = 'P-' + String(productIdx).padStart(2, '0');
        const qty = Math.max(1, it.quantity || 1);
        const H = Math.round((it.height || 0) * 1000);
        const W = Math.round((it.width || 0) * 1000);

        const add = (mat, len, angle, count) => {
            if (len <= 0 || count <= 0) return;
            if (!groups[mat]) groups[mat] = [];
            const k = P + '|' + mat;
            posMap[k] = (posMap[k] || 0) + 1;
            groups[mat].push({ ref: `${P}/${posMap[k]}`, len: Math.round(len), angle, qty: count });
        };

        // ── 2D DIZAYNER modeli bo'lsa — undan bo'laklar ──
        if (it.design && it.design.tree) {
            const dW = Math.round(it.design.W || W);
            const dH = Math.round(it.design.H || H);
            const out = { cells: [], imposts: [] };

            // Layout: FRAME=0 (dizayner bilan bir xil)
            layoutTree(it.design.tree, { x: 0, y: 0, w: dW, h: dH }, out);

            // ① RAMA (Frame) profillar — tashqi o'lcham, 45° kesim
            const ramaMat = baseMat + ' · Rama';
            add(ramaMat, dH, '45°/45°', 2 * qty);  // 2ta vertikal
            add(ramaMat, dW, '45°/45°', 2 * qty);  // 2ta gorizontal

            // ② IMPOST profillar — ichki o'lcham, 90° kesim
            const impostMat = baseMat + ' · Impost';
            out.imposts.forEach(im => {
                // Impost rama ichiga joylashadi → har ikki uchidan rama profil eni ayriladi
                const cutLen = im.len - 2 * FRAME_PROFILE;
                if (cutLen > 0) {
                    add(impostMat, cutLen, '90°/90°', qty);
                }
            });

            // ③ STVORKA (ochiladigan qism) profillar — 45° kesim
            const sashMat = baseMat + ' · Stvorka';
            out.cells.forEach(c => {
                const cw = Math.round(c.box.w);
                const ch = Math.round(c.box.h);
                if (c.opening && c.opening !== 'kar') {
                    // Stvorka rama ichiga joylashadi, zazor bilan
                    const sashH = ch - 2 * SASH_GAP;
                    const sashW = cw - 2 * SASH_GAP;
                    if (sashH > 0 && sashW > 0) {
                        add(sashMat, sashH, '45°/45°', 2 * qty); // 2ta vertikal
                        add(sashMat, sashW, '45°/45°', 2 * qty); // 2ta gorizontal
                    }
                }
            });

            // ④ SHTAPIK (oyna atrofidagi profillar) — 45° kesim
            const beadMat = baseMat + ' · Shtapik';
            out.cells.forEach(c => {
                const cw = Math.round(c.box.w);
                const ch = Math.round(c.box.h);
                let gW, gH;
                if (c.opening && c.opening !== 'kar') {
                    // Ochiladigan: oyna stvorka ichida
                    gW = cw - 2 * SASH_GAP - 2 * SASH_PROFILE + 2 * BEAD_W;
                    gH = ch - 2 * SASH_GAP - 2 * SASH_PROFILE + 2 * BEAD_W;
                } else {
                    // Kar: oyna to'g'ridan-to'g'ri ramaga o'rnashadi
                    gW = cw - 2 * BEAD_W;
                    gH = ch - 2 * BEAD_W;
                }
                if (gW > 0 && gH > 0) {
                    add(beadMat, gH, '45°/45°', 2 * qty);
                    add(beadMat, gW, '45°/45°', 2 * qty);
                }
            });

            return; // dizayner modeli ishlatildi
        }

        // ── Oddiy hisob (dizaynersiz) ──
        const innerW = W - 2 * FRAME_PROFILE;
        const innerH = H - 2 * FRAME_PROFILE;
        const vDiv = Math.max(0, it.vDiv || 0);
        const hDiv = Math.max(0, it.hDiv || 0);
        const stv = Math.max(0, it.stvorka || 0);

        // 1) Rama
        add(baseMat + ' · Rama', H, '45°/45°', 2 * qty);
        add(baseMat + ' · Rama', W, '45°/45°', 2 * qty);

        // 2) Impostlar
        if (vDiv > 0) add(baseMat + ' · Impost', innerH, '90°/90°', vDiv * qty);
        if (hDiv > 0) add(baseMat + ' · Impost', innerW, '90°/90°', hDiv * qty);

        // 3) Stvorka
        if (stv > 0) {
            const sashMat = baseMat + ' · Stvorka';
            const sashW = Math.round(innerW / stv - 2 * SASH_GAP);
            const sashH = Math.round(innerH - 2 * SASH_GAP);
            add(sashMat, sashH, '45°/45°', 2 * stv * qty);
            add(sashMat, sashW, '45°/45°', 2 * stv * qty);
        }

        // 4) Shtapik
        const cols = vDiv + 1, rows = hDiv + 1;
        const cellW = Math.round(innerW / cols);
        const cellH = Math.round(innerH / rows);
        const gW = cellW - 2 * BEAD_W, gH = cellH - 2 * BEAD_W;
        if (gW > 0 && gH > 0) {
            const beadMat = baseMat + ' · Shtapik';
            add(beadMat, gH, '45°/45°', 2 * cols * rows * qty);
            add(beadMat, gW, '45°/45°', 2 * cols * rows * qty);
        }

        // 5) Fortochka
        if (it.type === 'rom_fortochka') {
            add(baseMat + ' · Rama', Math.round(innerH * 0.32), '45°/45°', 2 * qty);
            add(baseMat + ' · Rama', Math.round(innerW * 0.40), '45°/45°', 2 * qty);
        }
    });

    return groups;
}

// ══════════════════════════════════════════════════════
// 2) Kesim-stok optimizatsiya (First-Fit-Decreasing)
//    Arra zazori: 45° → 4mm, 90° → 2mm
// ══════════════════════════════════════════════════════
export function optimize(pieces, bar = BAR_LEN) {
    const units = [];
    pieces.forEach(p => {
        for (let i = 0; i < p.qty; i++) {
            units.push({ ref: p.ref, len: p.len, angle: p.angle });
        }
    });
    units.sort((a, b) => b.len - a.len);

    const usable = bar - TRIM;
    const bars = [];

    units.forEach(u => {
        let placed = false;
        for (const b of bars) {
            const lastAngle = b.pieces[b.pieces.length - 1].angle;
            const kerf = kerfBetween(lastAngle, u.angle);
            const need = u.len + kerf;
            if (b.remaining >= need) {
                b.pieces.push(u);
                b.remaining -= need;
                placed = true;
                break;
            }
        }
        if (!placed) {
            bars.push({ pieces: [u], remaining: usable - u.len });
        }
    });

    const totalBars = bars.length;
    const totalPieces = units.length;
    const totalBarLen = totalBars * bar;
    const piecesLen = units.reduce((s, u) => s + u.len, 0);
    const offcut = totalBarLen - piecesLen;
    const offcutRate = totalBarLen ? (offcut / totalBarLen * 100) : 0;

    // Bir xil kesim namunalarini guruhlaymiz
    const mapObj = {};
    bars.forEach(b => {
        const key = b.pieces.map(p => p.len + ':' + p.angle).sort().join(',');
        if (!mapObj[key]) mapObj[key] = { pieces: b.pieces, count: 0, remaining: b.remaining };
        mapObj[key].count++;
    });
    const maps = Object.values(mapObj);

    return { bars, maps, totalBars, totalPieces, totalBarLen, piecesLen, offcut, offcutRate };
}

const fmtMm = n => Number(n).toLocaleString('ru-RU');

// ══════════════════════════════════════════════════════
// 3) PDF yaratish
// ══════════════════════════════════════════════════════
export function generateCuttingPdf(order) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('PDF kutubxonasi yuklanmadi. Sahifani yangilang.');
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const PW = doc.internal.pageSize.getWidth();
    const M = 12;
    const dateStr = new Date().toLocaleDateString('uz-UZ');

    const groups = derivePieces(order.items || []);
    const mats = Object.keys(groups);
    if (mats.length === 0) {
        alert("Zakazda rom/eshik yo'q — kesim uchun profil bo'lagi topilmadi.");
        return;
    }

    let first = true;
    const visualPages = [];

    mats.forEach(mat => {
        const pieces = groups[mat];
        const result = optimize(pieces);
        visualPages.push({ mat, result, pieces });

        if (!first) doc.addPage();
        first = false;

        // ── Sarlavha ──
        doc.setFontSize(15); doc.setFont(undefined, 'bold');
        doc.text('AKFA Romix — Kesim Rejasi', M, 14);
        doc.setFontSize(9); doc.setFont(undefined, 'normal');
        doc.text(dateStr, PW - M, 14, { align: 'right' });
        doc.setFontSize(9);
        doc.text(`Mijoz: ${order.customer || '—'}${order.phone ? ' · ' + order.phone : ''}`, M, 20);
        doc.setFont(undefined, 'bold'); doc.setFontSize(10);
        doc.text(`Profil: ${mat}  —  standart ${fmtMm(BAR_LEN)} mm`, M, 27);

        // ── Arra zazori haqida izoh ──
        doc.setFontSize(7.5); doc.setFont(undefined, 'normal');
        doc.setTextColor(120);
        doc.text(`Arra zazori: 45° kesim = ${KERF_45}mm (2 arra) | 90° kesim = ${KERF_90}mm (1 arra)`, M, 32);
        doc.setTextColor(20);

        // ── Cutting List (bo'laklar ro'yxati) ──
        const clRows = pieces.map((p, i) => [i + 1, p.ref, fmtMm(p.len), p.qty, p.angle]);
        doc.autoTable({
            startY: 36,
            head: [['#', 'Reference', 'Uzunlik (mm)', 'Soni', 'Kesim burchagi']],
            body: clRows,
            foot: [['', 'JAMI', '', pieces.reduce((s, p) => s + p.qty, 0), '']],
            styles: { fontSize: 8, cellPadding: 1.5 },
            headStyles: { fillColor: [14, 28, 46] },
            footStyles: { fillColor: [230, 236, 240], textColor: 20, fontStyle: 'bold' },
            margin: { left: M, right: M }
        });

        // ── Kerakli profillar ──
        let y = doc.lastAutoTable.finalY + 6;
        doc.setFont(undefined, 'bold'); doc.setFontSize(10);
        doc.text('Kerakli profillar', M, y); y += 2;
        doc.autoTable({
            startY: y,
            head: [['Profil', 'Uzunlik (mm)', 'Soni (dona)']],
            body: [[mat, fmtMm(BAR_LEN), result.totalBars]],
            styles: { fontSize: 8, cellPadding: 1.5 },
            headStyles: { fillColor: [14, 28, 46] },
            margin: { left: M, right: M }
        });

        // ── Kesim xaritalari ──
        y = doc.lastAutoTable.finalY + 6;
        doc.setFont(undefined, 'bold'); doc.setFontSize(10);
        doc.text('Kesim xaritalari (Cutting Maps)', M, y); y += 2;
        const mapRows = result.maps.map((mp, i) => [
            i + 1, mp.count, mp.pieces.length,
            mp.pieces.map(p => fmtMm(p.len)).join(' + '),
            fmtMm(mp.remaining) + ' mm'
        ]);
        doc.autoTable({
            startY: y,
            head: [['#', 'Profil soni', "Bo'lak", 'Kesim (mm)', 'Chiqit']],
            body: mapRows,
            styles: { fontSize: 7.5, cellPadding: 1.3 },
            headStyles: { fillColor: [14, 28, 46] },
            columnStyles: { 3: { cellWidth: 85 } },
            margin: { left: M, right: M }
        });

        // ── Xulosa ──
        y = doc.lastAutoTable.finalY + 6;
        doc.autoTable({
            startY: y,
            head: [['Xulosa', '']],
            body: [
                ['Kerakli profillar', result.totalBars + ' dona'],
                ['Kesim xaritalari', result.maps.length + ' xil'],
                ['Umumiy profil uzunligi', (result.totalBarLen / 1000).toFixed(2) + ' m'],
                ["Bo'laklar umumiy uzunligi", (result.piecesLen / 1000).toFixed(2) + ' m'],
                ['Chiqit (Off-Cut)', (result.offcut / 1000).toFixed(2) + ' m'],
                ['Chiqit foizi', result.offcutRate.toFixed(2) + ' %'],
            ],
            styles: { fontSize: 8.5, cellPadding: 1.5 },
            headStyles: { fillColor: [16, 122, 124] },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
            margin: { left: M, right: M }
        });
    });

    // ══════════════════════════════════════════════════════
    // Vizual kesim chizmalari — arra zazorlarini aniq ko'rsatish
    // ══════════════════════════════════════════════════════
    visualPages.forEach(({ mat, result }) => {
        doc.addPage();
        doc.setFontSize(12); doc.setFont(undefined, 'bold');
        doc.text('Kesim chizmasi — ' + mat, M, 14);
        doc.setFontSize(8); doc.setFont(undefined, 'normal');
        doc.text(`Standart profil: ${fmtMm(BAR_LEN)} mm  |  Arra zazori: 45°=${KERF_45}mm, 90°=${KERF_90}mm`, M, 19);

        const barW = PW - 2 * M;
        const scale = barW / BAR_LEN;
        let yy = 26;

        result.maps.forEach((mp, mi) => {
            if (yy > 265) { doc.addPage(); yy = 20; }

            // Xarita sarlavhasi
            doc.setFontSize(8.5); doc.setFont(undefined, 'bold'); doc.setTextColor(20);
            doc.text(`${mi + 1}-xarita  ×${mp.count} profil`, M, yy);
            yy += 4;

            const barH = 12;

            // Profil konturi (fon)
            doc.setDrawColor(180); doc.setLineWidth(0.3);
            doc.setFillColor(245, 247, 250);
            doc.rect(M, yy, barW, barH, 'FD');

            let x = M;
            mp.pieces.forEach((p, pi) => {
                const w = p.len * scale;
                const is45 = p.angle && p.angle.includes('45');

                // Bo'lak to'rtburchagi
                if (is45) {
                    doc.setFillColor(200, 225, 245); // ko'k — 45° kesim
                } else {
                    doc.setFillColor(220, 245, 220); // yashil — 90° kesim
                }
                doc.rect(x, yy, w, barH, 'F');
                doc.setDrawColor(80); doc.setLineWidth(0.25);
                doc.rect(x, yy, w, barH);

                // 45° burchak — diagonal arra chiziqlari
                if (is45) {
                    doc.setDrawColor(200, 60, 60); doc.setLineWidth(0.4);
                    // Chap uchi — 45° diagonal
                    const d = Math.min(4, w * 0.15);
                    doc.line(x, yy + barH, x + d, yy);
                    // O'ng uchi — 45° diagonal
                    doc.line(x + w, yy, x + w - d, yy + barH);
                } else {
                    // 90° kesim — to'g'ri vertikal chiziq
                    doc.setDrawColor(60, 150, 60); doc.setLineWidth(0.5);
                    doc.line(x, yy, x, yy + barH);
                    doc.line(x + w, yy, x + w, yy + barH);
                }

                // Bo'lak uzunligi matni
                doc.setFontSize(6.5); doc.setTextColor(20); doc.setFont(undefined, 'bold');
                if (w > 10) {
                    doc.text(fmtMm(p.len), x + w / 2, yy + barH / 2 + 1.5, { align: 'center' });
                }

                x += w;

                // ── ARRA ZAZORI (kerf gap) ──
                if (pi < mp.pieces.length - 1) {
                    const nextAngle = mp.pieces[pi + 1].angle;
                    const kerf = kerfBetween(p.angle, nextAngle);
                    const kerfW = kerf * scale;

                    // Zazor to'rtburchagi — qizil rang
                    doc.setFillColor(255, 80, 80);
                    doc.rect(x, yy, Math.max(kerfW, 0.6), barH, 'F');

                    // Zazor o'lchami (yuqorida)
                    doc.setFontSize(4.5); doc.setTextColor(220, 50, 50); doc.setFont(undefined, 'bold');
                    doc.text(kerf + 'mm', x + Math.max(kerfW, 0.6) / 2, yy - 1, { align: 'center' });

                    x += Math.max(kerfW, 0.6);
                }
            });

            // Chiqit (off-cut) — kulrang
            if (mp.remaining > 0) {
                const remW = Math.max(mp.remaining * scale, 0.5);
                doc.setFillColor(180, 180, 180);
                doc.rect(x, yy, barW - (x - M), barH, 'F');
                doc.setDrawColor(140); doc.rect(x, yy, barW - (x - M), barH);
                // Diagonal chiziqlar (chiqit belgisi)
                doc.setDrawColor(160);
                for (let dx = 0; dx < barW - (x - M); dx += 4) {
                    doc.line(x + dx, yy + barH, x + dx + 3, yy);
                }
                doc.setFontSize(5.5); doc.setTextColor(255); doc.setFont(undefined, 'bold');
                const actualRemW = barW - (x - M);
                if (actualRemW > 12) {
                    doc.text(fmtMm(mp.remaining) + ' chiqit', x + actualRemW / 2, yy + barH / 2 + 1.5, { align: 'center' });
                }
            }

            doc.setTextColor(20);

            // Pastda rang izohi (birinchi xaritada)
            if (mi === 0) {
                yy += barH + 3;
                doc.setFontSize(5); doc.setFont(undefined, 'normal'); doc.setTextColor(100);
                // Rang izohi
                doc.setFillColor(200, 225, 245); doc.rect(M, yy, 4, 3, 'F');
                doc.text('45° kesim', M + 5, yy + 2.5);
                doc.setFillColor(220, 245, 220); doc.rect(M + 22, yy, 4, 3, 'F');
                doc.text('90° kesim', M + 27, yy + 2.5);
                doc.setFillColor(255, 80, 80); doc.rect(M + 50, yy, 4, 3, 'F');
                doc.text('Arra zazori', M + 55, yy + 2.5);
                doc.setFillColor(180, 180, 180); doc.rect(M + 78, yy, 4, 3, 'F');
                doc.text('Chiqit', M + 83, yy + 2.5);
                doc.setTextColor(20);
                yy += 7;
            } else {
                yy += barH + 7;
            }
        });
    });

    const fname = `AKFA_Kesim_${(order.customer || 'zakaz').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fname);
}
