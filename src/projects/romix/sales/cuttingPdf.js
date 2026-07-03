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
            headStyles: { fillColor: [80, 80, 80] },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
            margin: { left: M, right: M }
        });
    });

    // ══════════════════════════════════════════════════════
    // Vizual kesim chizmalari — OptiCut Usulida (Greyscale)
    // ══════════════════════════════════════════════════════
    visualPages.forEach(({ mat, result }) => {
        doc.addPage();
        doc.setFontSize(12); doc.setFont(undefined, 'bold');
        doc.setTextColor(40);
        doc.text('Kesim chizmasi — ' + mat, M, 14);
        doc.setFontSize(8.5); doc.setFont(undefined, 'normal');
        doc.setTextColor(80);
        doc.text(`Standart profil: ${fmtMm(BAR_LEN)} mm  |  Arra zazori: 45°=${KERF_45}mm, 90°=${KERF_90}mm  |  Trim: ${TRIM}mm`, M, 19);

        const barW = PW - 2 * M;
        const scale = barW / BAR_LEN;
        let yy = 32;

        result.maps.forEach((mp, mi) => {
            if (yy > 255) { doc.addPage(); yy = 22; }

            // Xarita sarlavhasi / Tavsifi
            doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(40);
            doc.text(`${mi + 1}/${result.maps.length} -- ${mat} -- ${fmtMm(BAR_LEN)} mm -- Soni: ${mp.count} dona`, M, yy);
            yy += 8; // Joy qoldiramiz o'lchamlar uchun

            const barH = 10;
            const bevel = 6 * scale; // 45 gradusli kesimning diagonal eni

            // 1) Profil konturi (fon)
            doc.setDrawColor(180); doc.setLineWidth(0.25);
            doc.setFillColor(250, 250, 250);
            doc.rect(M, yy, barW, barH, 'FD');

            // Trim chizig'i va yozuvi
            const trimW = TRIM * scale;
            doc.setDrawColor(120); doc.setLineWidth(0.4);
            doc.line(M + trimW, yy - 1, M + trimW, yy + barH + 1); // trim kesim chizig'i
            doc.setFontSize(5.5); doc.setFont(undefined, 'normal'); doc.setTextColor(100);
            doc.text(TRIM.toFixed(2), M + trimW / 2, yy + barH + 4, { align: 'center' });

            let x = M + trimW;

            mp.pieces.forEach((p, pi) => {
                const w = p.len * scale;
                const nextPiece = mp.pieces[pi + 1];

                // Burchaklarni tahlil qilish
                // Masalan, angles string: "45°/45°" yoki "45°/90°" va h.k.
                const angles = p.angle ? p.angle.split('/') : ['90°', '90°'];
                const left45 = angles[0] && angles[0].includes('45');
                const right45 = angles[1] && angles[1].includes('45');

                // Bo'lak to'rtburchagi (oq/och-kulrang)
                doc.setFillColor(255, 255, 255);
                doc.rect(x, yy, w, barH, 'F');
                doc.setDrawColor(50); doc.setLineWidth(0.3);
                doc.rect(x, yy, w, barH);

                // Diagonal kesim liniyalari (OptiCut uslubidagi ko'rinish)
                doc.setDrawColor(120); doc.setLineWidth(0.3);
                if (left45) {
                    // Chap tomondagi diagonal
                    doc.line(x, yy + barH, x + bevel, yy);
                    // Kesilgan joyni soya qilish
                    doc.setDrawColor(210);
                    doc.line(x + 0.5, yy + barH - 1, x + bevel - 0.5, yy + 1);
                    doc.setDrawColor(120);
                } else {
                    // 90 darajali kesik chizig'i
                    doc.line(x, yy, x, yy + barH);
                }

                if (right45) {
                    // O'ng tomondagi diagonal
                    doc.line(x + w, yy, x + w - bevel, yy + barH);
                    // Kesilgan joyni soya qilish
                    doc.setDrawColor(210);
                    doc.line(x + w - 0.5, yy + 1, x + w - bevel + 0.5, yy + barH - 1);
                    doc.setDrawColor(120);
                } else {
                    // 90 darajali o'ng kesik chizig'i
                    doc.line(x + w, yy, x + w, yy + barH);
                }

                // Reference kodi (masalan: P-01 / 2)
                doc.setFontSize(6.5); doc.setTextColor(40); doc.setFont(undefined, 'normal');
                if (w > 12) {
                    doc.text(p.ref, x + w / 2, yy + barH / 2 + 1.5, { align: 'center' });
                }

                // O'lcham belgisi (tepasida tick-mark va o'lcham matni)
                doc.setDrawColor(120); doc.setLineWidth(0.25);
                doc.line(x + w / 2, yy, x + w / 2, yy - 3); // Tick mark
                doc.setFontSize(7); doc.setTextColor(30); doc.setFont(undefined, 'bold');
                doc.text(fmtMm(p.len), x + w / 2, yy - 4, { align: 'center' });

                x += w;

                // Arra zazori (kerf gap)
                if (nextPiece) {
                    const kerf = kerfBetween(p.angle, nextPiece.angle);
                    const kerfW = kerf * scale;

                    // Arra kesik chizig'i (rangsiz, faqat bo'shliq)
                    doc.setDrawColor(150); doc.setLineWidth(0.3);
                    doc.line(x, yy - 1, x, yy + barH + 1);
                    doc.line(x + kerfW, yy - 1, x + kerfW, yy + barH + 1);

                    x += kerfW;
                }
            });

            // Chiqit (off-cut) — kulrang va shtrixlangan (hatch lines)
            if (mp.remaining > 0) {
                const remW = barW - (x - M);
                doc.setFillColor(230, 230, 230);
                doc.rect(x, yy, remW, barH, 'F');
                doc.setDrawColor(100); doc.setLineWidth(0.3);
                doc.rect(x, yy, remW, barH);

                // Hatch lines
                doc.setDrawColor(170); doc.setLineWidth(0.2);
                for (let lx = x; lx < x + remW; lx += 4) {
                    doc.line(lx, yy + barH, Math.min(lx + 3, x + remW), yy);
                }

                // Chiqit o'lchami va yozuvi
                doc.setFontSize(6.5); doc.setTextColor(80); doc.setFont(undefined, 'bold');
                if (remW > 18) {
                    doc.text(`Chiqit: ${fmtMm(mp.remaining)}`, x + remW / 2, yy + barH / 2 + 1.5, { align: 'center' });
                } else if (remW > 8) {
                    doc.text(fmtMm(mp.remaining), x + remW / 2, yy + barH / 2 + 1.5, { align: 'center' });
                }
            }

            doc.setTextColor(20);
            yy += barH + 15; // Keyingi chizmagacha masofa
        });
    });

    const fname = `AKFA_Kesim_${(order.customer || 'zakaz').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fname);
}

