// ═══════════════════════════════════════════════════════════
//  AKFA Romix — Kesim optimizatsiya PDF (OptiCut uslubida)
//  Zakazdagi rom/eshik'larni profil bo'laklariga bo'lib, 6000mm
//  profillarni eng kam chiqit bilan kesish rejasini PDF qiladi.
//
//  Arra zazori:
//    45° kesim (2 arra uchrashganda) = 8mm arra rasxodi + 4mm zazor = 12 mm
//    90° kesim (1 arra)              = 4mm arra rasxodi + 2mm zazor = 6 mm
// ═══════════════════════════════════════════════════════════

const FRAME_PROFILE = 60; // rama profil eni (mm)
const SASH_PROFILE = 50;  // stvorka profil eni (mm)
const BEAD_W = 20;        // shtapik eni (mm)
const SASH_GAP = 3;       // rama–stvorka orasidagi zazor (mm)
const IMPOST_MM = 30;     // impost eni (2D dizayner bilan bir xil)
const BAR_LEN = 6000;     // standart profil uzunligi (mm)

const KERF_45 = 12; // 2 ta arra uchrashganda (45°/45°): 8mm arra rasxodi (2 ta o'tish x 4mm) + 4mm zazor = 12mm
const KERF_90 = 6;  // 1 ta arra (90° to'g'ri kesim): 4mm arra rasxodi + 2mm zazor = 6mm
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
            const imLen = horiz ? box.h : box.w;
            out.imposts.push({
                len: imLen,
                dir: horiz ? 'v' : 'h',
                x1: horiz ? pos : box.x,
                y1: horiz ? box.y : pos,
                x2: horiz ? pos : (box.x + box.w),
                y2: horiz ? (box.y + box.h) : pos
            });
            pos += IMPOST_MM;
        }
    });
}

// ══════════════════════════════════════════════════════
// 0) Buyurtma elementi chizmasi — 2D dizaynerdagi ko'rinish, faqat
//    o'lchamlar (narxsiz). layoutTree() bilan bir xil model ishlatadi.
// ══════════════════════════════════════════════════════
function drawItemDiagram(doc, item, top, pageW, margin) {
    const dW = Math.round((item.design && item.design.W) || (item.width || 0) * 1000);
    const dH = Math.round((item.design && item.design.H) || (item.height || 0) * 1000);
    if (!dW || !dH) return top;

    const labelPad = 26; // chap tomonda balandlik yozuvi uchun joy
    const areaW = pageW - 2 * margin - labelPad;
    const areaH = 95; // bitta chizma uchun maksimal balandlik
    const scale = Math.min(areaW / dW, areaH / dH);
    const drawW = dW * scale, drawH = dH * scale;
    const startX = margin + labelPad + (areaW - drawW) / 2;
    const startY = top + 14;

    // Rama (tashqi chegara)
    doc.setDrawColor(30); doc.setLineWidth(0.6);
    doc.setFillColor(246, 249, 251);
    doc.rect(startX, startY, drawW, drawH, 'FD');

    let out = { cells: [], imposts: [] };
    if (item.design && item.design.tree && !item.design.frameOnly) {
        layoutTree(item.design.tree, { x: 0, y: 0, w: dW, h: dH }, out);
    } else {
        out.cells.push({ opening: 'kar', box: { x: 0, y: 0, w: dW, h: dH } });
    }

    // Impostlar
    doc.setDrawColor(110); doc.setLineWidth(0.45);
    out.imposts.forEach(im => {
        doc.line(startX + im.x1 * scale, startY + im.y1 * scale, startX + im.x2 * scale, startY + im.y2 * scale);
    });

    // Bo'limlar + ochilish belgisi (diagonal) + o'lcham yozuvi
    out.cells.forEach(c => {
        const cx = startX + c.box.x * scale, cy = startY + c.box.y * scale;
        const cw = c.box.w * scale, ch = c.box.h * scale;
        doc.setDrawColor(170); doc.setLineWidth(0.25);
        doc.rect(cx, cy, cw, ch);
        if (c.opening && c.opening !== 'kar' && cw > 4 && ch > 4) {
            doc.setDrawColor(190); doc.setLineWidth(0.2);
            doc.line(cx + 1.5, cy + 1.5, cx + cw - 1.5, cy + ch - 1.5);
            doc.line(cx + 1.5, cy + ch - 1.5, cx + cw - 1.5, cy + 1.5);
        }
        if (cw > 14 && ch > 8) {
            doc.setFontSize(6.5); doc.setTextColor(90); doc.setFont(undefined, 'normal');
            doc.text(`${Math.round(c.box.w)}×${Math.round(c.box.h)}`, cx + cw / 2, cy + ch / 2 + 1.5, { align: 'center' });
        }
    });

    // Umumiy o'lchamlar (pastda — eni, chapda — bo'yi)
    doc.setDrawColor(20); doc.setLineWidth(0.3);
    doc.line(startX, startY + drawH + 4, startX + drawW, startY + drawH + 4);
    doc.setFontSize(8); doc.setFont(undefined, 'bold'); doc.setTextColor(20);
    doc.text(`${dW} mm`, startX + drawW / 2, startY + drawH + 9, { align: 'center' });

    doc.line(startX - 4, startY, startX - 4, startY + drawH);
    doc.text(`${dH} mm`, startX - 6, startY + drawH / 2, { align: 'center', angle: 90 });

    doc.setFont(undefined, 'normal'); doc.setTextColor(20);
    return startY + drawH + 16;
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

            // "Faqat Ramka" rejimi — impost/stvorka/shtapik hisoblanmaydi, faqat tashqi ramka kesiladi
            if (it.design.frameOnly) return;

            // ② IMPOST profillar — ichki o'lcham, 90° kesim
            const impostMat = baseMat + ' · Impost';
            out.imposts.forEach(im => {
                let cutLen = im.len;
                if (im.dir === 'v') {
                    // Vertical impost: hits top boundary?
                    if (Math.abs(im.y1 - 0) < 1) cutLen -= FRAME_PROFILE;
                    // Hits bottom boundary?
                    if (Math.abs(im.y2 - dH) < 1) cutLen -= FRAME_PROFILE;
                } else {
                    // Horizontal impost: hits left boundary?
                    if (Math.abs(im.x1 - 0) < 1) cutLen -= FRAME_PROFILE;
                    // Hits right boundary?
                    if (Math.abs(im.x2 - dW) < 1) cutLen -= FRAME_PROFILE;
                }
                if (cutLen > 0) {
                    add(impostMat, cutLen, '90°/90°', qty);
                }
            });

            // ③ STVORKA (Sash) & ④ SHTAPIK (Glass Bead) - Professional deductions
            const sashMat = baseMat + ' · Stvorka';
            const beadMat = baseMat + ' · Shtapik';
            out.cells.forEach(c => {
                const cw = Math.round(c.box.w);
                const ch = Math.round(c.box.h);

                // Detect if the cell touches outer frame boundaries
                const leftTouchesFrame = Math.abs(c.box.x - 0) < 1;
                const rightTouchesFrame = Math.abs((c.box.x + c.box.w) - dW) < 1;
                const topTouchesFrame = Math.abs(c.box.y - 0) < 1;
                const bottomTouchesFrame = Math.abs((c.box.y + c.box.h) - dH) < 1;

                // Deduct FRAME_PROFILE (60mm) for each border touching the outer frame to get inner light opening
                const W_inner = cw - (leftTouchesFrame ? FRAME_PROFILE : 0) - (rightTouchesFrame ? FRAME_PROFILE : 0);
                const H_inner = ch - (topTouchesFrame ? FRAME_PROFILE : 0) - (bottomTouchesFrame ? FRAME_PROFILE : 0);

                if (c.opening && c.opening !== 'kar') {
                    // Sash (Stvorka) fits inside the cell inner opening with SASH_GAP (3mm) on each side
                    const sashH = H_inner - 2 * SASH_GAP;
                    const sashW = W_inner - 2 * SASH_GAP;
                    if (sashH > 0 && sashW > 0) {
                        add(sashMat, sashH, '45°/45°', 2 * qty); // 2ta vertikal
                        add(sashMat, sashW, '45°/45°', 2 * qty); // 2ta gorizontal

                        if (type === 'eshik') {
                            // Door leaf: has horizontal sash impost and 2 sets of glass/panel beads
                            const sashImpLen = sashW - 2 * SASH_PROFILE;
                            if (sashImpLen > 0) {
                                add(baseMat + ' · Sash Impost', sashImpLen, '90°/90°', qty);
                            }
                            
                            const panelH = sashH * 0.38;
                            const topH = sashH - panelH;
                            
                            const beadW = sashW - 2 * SASH_PROFILE;
                            const beadH_bottom = panelH - SASH_PROFILE - 15;
                            const beadH_top = topH - SASH_PROFILE - 15;
                            
                            // Top glass beads
                            if (beadW > 0 && beadH_top > 0) {
                                add(beadMat, beadH_top, '45°/45°', 2 * qty);
                                add(beadMat, beadW, '45°/45°', 2 * qty);
                            }
                            // Bottom panel beads
                            if (beadW > 0 && beadH_bottom > 0) {
                                add(beadMat, beadH_bottom, '45°/45°', 2 * qty);
                                add(beadMat, beadW, '45°/45°', 2 * qty);
                            }
                        } else {
                            // Window sash: regular 1 set of glass beads
                            const gW = sashW - 2 * SASH_PROFILE;
                            const gH = sashH - 2 * SASH_PROFILE;
                            if (gW > 0 && gH > 0) {
                                add(beadMat, gH, '45°/45°', 2 * qty);
                                add(beadMat, gW, '45°/45°', 2 * qty);
                            }
                        }
                    }
                } else {
                    // Fixed (Kar) cell: Shtapik fits directly in the cell inner opening
                    const gW = W_inner;
                    const gH = H_inner;
                    if (gW > 0 && gH > 0) {
                        add(beadMat, gH, '45°/45°', 2 * qty);
                        add(beadMat, gW, '45°/45°', 2 * qty);
                    }
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

    // ══════════════════════════════════════════════════════
    // BUYURTMA CHIZMALARI — 2D dizaynerdagi ko'rinish + o'lchamlar (narxsiz)
    // ══════════════════════════════════════════════════════
    const romlar = (order.items || []).filter(it => ['rom', 'rom_fortochka', 'eshik'].includes(it.type));
    if (romlar.length > 0) {
        doc.setFontSize(15); doc.setFont(undefined, 'bold');
        doc.text('AKFA Romix — Buyurtma Chizmalari', M, 14);
        doc.setFontSize(9); doc.setFont(undefined, 'normal');
        doc.text(dateStr, PW - M, 14, { align: 'right' });
        doc.text(`Mijoz: ${order.customer || '—'}${order.phone ? ' · ' + order.phone : ''}`, M, 20);

        let dy = 26;
        romlar.forEach((it, idx) => {
            if (dy > 245) { doc.addPage(); dy = 16; }
            doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(20);
            const label = it.type === 'eshik' ? 'Eshik' : it.type === 'rom_fortochka' ? 'Rom (fortochkali)' : 'Rom';
            doc.text(`${idx + 1}. ${label} — ${it.materialName || ''} × ${it.quantity || 1} dona`, M, dy);
            dy = drawItemDiagram(doc, it, dy, PW, M) + 6;
        });
    }

    const visualPages = [];

    mats.forEach(mat => {
        const pieces = groups[mat];
        const result = optimize(pieces);
        visualPages.push({ mat, result, pieces });

        doc.addPage();

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
            if (yy > 235) { doc.addPage(); yy = 22; }

            // Xarita sarlavhasi / Tavsifi
            doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(40);
            doc.text(`${mi + 1}/${result.maps.length} -- ${mat} -- ${fmtMm(BAR_LEN)} mm -- Soni: ${mp.count} dona`, M, yy);
            yy += 6;

            const rulerH = 5;   // yuqoridagi o'lchov chizig'i (ruler) balandligi
            const barH = 13;    // asosiy (qalin) profil balandligi — arra kesimi shu yerda ko'rinadi
            const bevel = 7;    // 45° diagonalning gorizontal cho'zilishi (mm, ekranda)
            const rulerY = yy + 6;
            const barY = rulerY + rulerH + 3;

            // ── 1) Ruler (yupqa o'lchov chizig'i) — har bir bo'lak chegarasida tick + raqam ──
            doc.setDrawColor(140); doc.setLineWidth(0.2);
            doc.setFillColor(255, 255, 255);
            doc.rect(M, rulerY, barW, rulerH, 'FD');

            // ── 2) Asosiy profil (qalin, kulrang fon) ──
            doc.setDrawColor(60); doc.setLineWidth(0.35);
            doc.setFillColor(238, 240, 243);
            doc.rect(M, barY, barW, barH, 'FD');

            const trimW = TRIM * scale;
            let x = M + trimW;

            // Trim (boshlang'ich qirqim)
            doc.setDrawColor(130); doc.setLineWidth(0.3);
            doc.line(M + trimW, rulerY - 1, M + trimW, barY + barH + 1);
            doc.setFontSize(5); doc.setFont(undefined, 'normal'); doc.setTextColor(110);
            doc.text(TRIM.toFixed(2), M + trimW / 2, rulerY - 1.5, { align: 'center' });

            mp.pieces.forEach((p, pi) => {
                const w = p.len * scale;
                const nextPiece = mp.pieces[pi + 1];
                const angles = p.angle ? p.angle.split('/') : ['90°', '90°'];
                const left45 = angles[0] && angles[0].includes('45');
                const right45 = angles[1] && angles[1].includes('45');
                const bevelW = Math.min(bevel, w / 2.2);

                // ── Ruler'da bo'lak chegarasi (tick + o'lcham) ──
                doc.setDrawColor(120); doc.setLineWidth(0.25);
                doc.line(x, rulerY, x, rulerY - 2);
                doc.line(x + w, rulerY, x + w, rulerY - 2);
                doc.setFontSize(6.5); doc.setFont(undefined, 'bold'); doc.setTextColor(30);
                if (w > 10) doc.text(fmtMm(p.len), x + w / 2, rulerY + rulerH / 2 + 1, { align: 'center' });

                // ── Bo'lak (oq, aniq chegarali) ──
                doc.setFillColor(255, 255, 255);
                doc.rect(x, barY, w, barH, 'F');
                doc.setDrawColor(40); doc.setLineWidth(0.35);
                doc.rect(x, barY, w, barH);

                // ── Kesim burchagi — 45° bo'lsa TO'LDIRILGAN uchburchak ("arra izi"), 90° bo'lsa to'g'ri chiziq ──
                doc.setFillColor(165, 170, 178);
                doc.setDrawColor(70); doc.setLineWidth(0.25);
                if (left45) {
                    doc.triangle(x, barY, x + bevelW, barY, x, barY + barH, 'FD');
                } else {
                    doc.line(x, barY, x, barY + barH);
                }
                if (right45) {
                    doc.triangle(x + w, barY, x + w - bevelW, barY, x + w, barY + barH, 'FD');
                } else {
                    doc.line(x + w, barY, x + w, barY + barH);
                }

                // Reference kodi (masalan: P-01 / 2)
                doc.setFontSize(6.5); doc.setTextColor(35); doc.setFont(undefined, 'normal');
                if (w > 14) {
                    doc.text(p.ref, x + w / 2, barY + barH / 2 + 1.5, { align: 'center' });
                }

                x += w;

                // Arra zazori (kerf gap) — ikki bo'lak orasidagi bo'shliq, arra kengligi
                if (nextPiece) {
                    const kerf = kerfBetween(p.angle, nextPiece.angle);
                    const kerfW = kerf * scale;
                    doc.setFillColor(120, 122, 128);
                    doc.rect(x, barY - 0.5, Math.max(kerfW, 0.3), barH + 1, 'F');
                    x += kerfW;
                }
            });

            // Chiqit (off-cut) — bir rangli quyuq kulrang blok
            if (mp.remaining > 0) {
                const remW = barW - (x - M);
                doc.setFillColor(205, 208, 213);
                doc.rect(x, barY, remW, barH, 'F');
                doc.setDrawColor(90); doc.setLineWidth(0.3);
                doc.rect(x, barY, remW, barH);

                doc.setFontSize(6.5); doc.setTextColor(60); doc.setFont(undefined, 'bold');
                if (remW > 20) {
                    doc.text(`Chiqit: ${fmtMm(mp.remaining)}`, x + remW / 2, barY + barH / 2 + 1.5, { align: 'center' });
                } else if (remW > 8) {
                    doc.text(fmtMm(mp.remaining), x + remW / 2, barY + barH / 2 + 1.5, { align: 'center' });
                }
            }

            doc.setTextColor(20);
            yy = barY + barH + 14; // Keyingi chizmagacha masofa
        });
    });

    const fname = `AKFA_Kesim_${(order.customer || 'zakaz').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fname);
}

