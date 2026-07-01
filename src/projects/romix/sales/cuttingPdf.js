// ═══════════════════════════════════════════════════════════
//  AKFA Romix — Kesim optimizatsiya PDF (OptiCut uslubida)
//  Zakazdagi rom/eshik'larni profil bo'laklariga bo'lib, 6000mm
//  profillarni eng kam chiqit bilan kesish rejasini PDF qiladi.
// ═══════════════════════════════════════════════════════════

const FRAME_W = 60;   // rama profil eni (mm)
const SASH_W = 60;    // stvorka (створка) profil eni (mm)
const BEAD_W = 20;    // shtapik (штапик) eni (mm)
const SASH_GAP = 4;   // rama–stvorka orasidagi zazor (mm)
const BAR_LEN = 6000; // standart profil uzunligi (mm)
const KERF = 10;      // arra kesuvi (mm)
const TRIM = 10;      // chetdan qirqim (mm)

// 1) Zakaz elementlarini profil bo'laklariga aylantirish
export function derivePieces(items) {
    const groups = {}; // material -> [{ref,len,angle,qty}]
    const posMap = {}; // "P-xx|material" -> position counter
    let productIdx = 0;

    items.forEach(it => {
        if (!['rom', 'rom_fortochka', 'eshik'].includes(it.type)) return;
        const baseMat = it.materialName || '40X60X2mm PROFIL';
        productIdx++;
        const P = 'P-' + String(productIdx).padStart(2, '0');
        const qty = Math.max(1, it.quantity || 1);
        const H = Math.round((it.height || 0) * 1000);
        const W = Math.round((it.width || 0) * 1000);
        const vDiv = Math.max(0, it.vDiv || 0);
        const hDiv = Math.max(0, it.hDiv || 0);
        const stv = Math.max(0, it.stvorka || 0);
        const innerW = W - 2 * FRAME_W, innerH = H - 2 * FRAME_W;

        // Har komponent o'z profilidan kesiladi — alohida guruh
        const add = (mat, len, angle, count) => {
            if (len <= 0 || count <= 0) return;
            if (!groups[mat]) groups[mat] = [];
            const k = P + '|' + mat;
            posMap[k] = (posMap[k] || 0) + 1;
            groups[mat].push({ ref: `${P} / ${posMap[k]}`, len: Math.round(len), angle, qty: count });
        };

        // 1) Rama (frame) — 45°
        add(baseMat, H, '45° ; 45°', 2 * qty);
        add(baseMat, W, '45° ; 45°', 2 * qty);
        // 2) Impostlar — 90°
        add(baseMat, innerH, '90° ; 90°', vDiv * qty);
        add(baseMat, innerW, '90° ; 90°', hDiv * qty);

        // 3) Stvorka (створка) — alohida profil, 45°
        if (stv > 0) {
            const sashMat = baseMat + ' · Stvorka';
            const sashW = Math.round(innerW / stv - 2 * SASH_GAP);
            const sashH = Math.round(innerH - 2 * SASH_GAP);
            add(sashMat, sashH, '45° ; 45°', 2 * stv * qty);
            add(sashMat, sashW, '45° ; 45°', 2 * stv * qty);
        }

        // 4) Shtapik (штапик) — alohida profil, har oyna katagi atrofida, 45°
        const cols = vDiv + 1, rows = hDiv + 1;
        const impW = Math.round(FRAME_W * 0.75);
        const cellW = Math.round((innerW - vDiv * impW) / cols);
        const cellH = Math.round((innerH - hDiv * impW) / rows);
        const gW = cellW - 2 * BEAD_W, gH = cellH - 2 * BEAD_W;
        if (gW > 0 && gH > 0) {
            const beadMat = baseMat + ' · Shtapik';
            add(beadMat, gH, '45° ; 45°', 2 * cols * rows * qty);
            add(beadMat, gW, '45° ; 45°', 2 * cols * rows * qty);
        }

        // 5) Fortochka — kichik ramka (rama profilidan)
        if (it.type === 'rom_fortochka') {
            add(baseMat, Math.round(innerH * 0.32), '45° ; 45°', 2 * qty);
            add(baseMat, Math.round(innerW * 0.40), '45° ; 45°', 2 * qty);
        }
    });
    return groups; // { material: [pieces] }
}

// 2) Kesim-stok optimizatsiya (First-Fit-Decreasing)
export function optimize(pieces, bar = BAR_LEN, kerf = KERF, trim = TRIM) {
    const units = [];
    pieces.forEach(p => { for (let i = 0; i < p.qty; i++) units.push({ ref: p.ref, len: p.len, angle: p.angle }); });
    units.sort((a, b) => b.len - a.len);

    const usable = bar - trim;
    const bars = [];
    units.forEach(u => {
        let placed = false;
        for (const b of bars) {
            const need = u.len + (b.pieces.length > 0 ? kerf : 0);
            if (b.remaining >= need) { b.pieces.push(u); b.remaining -= need; placed = true; break; }
        }
        if (!placed) bars.push({ pieces: [u], remaining: usable - u.len });
    });

    const totalBars = bars.length;
    const totalPieces = units.length;
    const totalBarLen = totalBars * bar;
    const piecesLen = units.reduce((s, u) => s + u.len, 0);
    const offcut = totalBarLen - piecesLen;
    const offcutRate = totalBarLen ? (offcut / totalBarLen * 100) : 0;

    // Bir xil kesim namunalarini guruhlaymiz (cutting maps)
    const mapObj = {};
    bars.forEach(b => {
        const key = b.pieces.map(p => p.len).sort((a, z) => z - a).join(',');
        if (!mapObj[key]) mapObj[key] = { pieces: b.pieces, count: 0, remaining: b.remaining };
        mapObj[key].count++;
    });
    const maps = Object.values(mapObj);

    return { bars, maps, totalBars, totalPieces, totalBarLen, piecesLen, offcut, offcutRate };
}

const fmtMm = n => Number(n).toLocaleString('ru-RU');

// 3) PDF yaratish
export function generateCuttingPdf(order) {
    if (!window.jspdf || !window.jspdf.jsPDF) { alert('PDF kutubxonasi yuklanmadi. Sahifani yangilang.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const PW = doc.internal.pageSize.getWidth();
    const M = 12;
    const dateStr = new Date().toLocaleDateString('uz-UZ');

    const groups = derivePieces(order.items || []);
    const mats = Object.keys(groups);
    if (mats.length === 0) { alert("Zakazda rom/eshik yo'q — kesim uchun profil bo'lagi topilmadi."); return; }

    let first = true;
    const visualPages = []; // { mat, result } — vizual chizmalar uchun

    mats.forEach(mat => {
        const pieces = groups[mat];
        const result = optimize(pieces);
        visualPages.push({ mat, result });

        if (!first) doc.addPage();
        first = false;

        // Sarlavha
        doc.setFontSize(15); doc.setFont(undefined, 'bold');
        doc.text('AKFA Romix — Kesim Optimizatsiya', M, 14);
        doc.setFontSize(9); doc.setFont(undefined, 'normal');
        doc.text(dateStr, PW - M, 14, { align: 'right' });
        doc.setFontSize(9);
        doc.text(`Mijoz: ${order.customer || '—'}${order.phone ? ' · ' + order.phone : ''}`, M, 20);
        doc.setFont(undefined, 'bold'); doc.setFontSize(10);
        doc.text(`Profil: ${mat}  —  standart ${fmtMm(BAR_LEN)} mm`, M, 27);

        // Cutting List
        const clRows = pieces.map((p, i) => [i + 1, p.ref, fmtMm(p.len), p.qty, p.angle]);
        doc.autoTable({
            startY: 31,
            head: [['#', 'Reference', "Uzunlik (mm)", 'Soni', 'Burchak']],
            body: clRows,
            foot: [['', 'JAMI', '', pieces.reduce((s, p) => s + p.qty, 0), '']],
            styles: { fontSize: 8, cellPadding: 1.5 },
            headStyles: { fillColor: [14, 28, 46] },
            footStyles: { fillColor: [230, 236, 240], textColor: 20, fontStyle: 'bold' },
            margin: { left: M, right: M }
        });

        // Required Bars + Cutting Maps
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
            head: [['#', 'Soni', "Bo'lak", 'Kesim (mm)', 'Chiqit']],
            body: mapRows,
            styles: { fontSize: 7.5, cellPadding: 1.3 },
            headStyles: { fillColor: [14, 28, 46] },
            columnStyles: { 3: { cellWidth: 90 } },
            margin: { left: M, right: M }
        });

        // Recapitulatory
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

    // ── Vizual kesim chizmalari ──
    visualPages.forEach(({ mat, result }) => {
        doc.addPage();
        doc.setFontSize(12); doc.setFont(undefined, 'bold');
        doc.text('Kesim chizmasi — ' + mat, M, 14);
        doc.setFontSize(8); doc.setFont(undefined, 'normal');
        doc.text(`Standart profil ${fmtMm(BAR_LEN)} mm`, M, 19);

        const barW = PW - 2 * M;
        const scale = barW / BAR_LEN;
        let yy = 26;
        result.maps.forEach((mp, mi) => {
            if (yy > 270) { doc.addPage(); yy = 20; }
            doc.setFontSize(8.5); doc.setFont(undefined, 'bold');
            doc.text(`${mi + 1}-xarita  ×${mp.count} profil`, M, yy);
            yy += 3;
            const barH = 9;
            // profil konturi
            doc.setDrawColor(120); doc.setLineWidth(0.2);
            doc.rect(M, yy, barW, barH);
            let x = M;
            mp.pieces.forEach((p, pi) => {
                const w = p.len * scale;
                // bo'lak
                doc.setFillColor(224, 232, 238);
                doc.rect(x, yy, w, barH, 'F');
                doc.setDrawColor(90); doc.rect(x, yy, w, barH);
                // 45° burchak — diagonal chiziq
                if (p.angle && p.angle.indexOf('45') >= 0) {
                    doc.setDrawColor(150);
                    doc.line(x, yy, x + Math.min(3, w), yy + barH);
                    doc.line(x + w, yy, x + w - Math.min(3, w), yy + barH);
                }
                // uzunlik yozuvi
                doc.setFontSize(6); doc.setTextColor(20);
                if (w > 8) doc.text(fmtMm(p.len), x + w / 2, yy + barH / 2 + 1, { align: 'center' });
                x += w;
                // kerf gap
                if (pi < mp.pieces.length - 1) x += KERF * scale;
            });
            // chiqit (off-cut) — kulrang
            if (mp.remaining > 0) {
                const w = mp.remaining * scale;
                doc.setFillColor(160, 160, 160);
                doc.rect(x, yy, w, barH, 'F');
                doc.setFontSize(6); doc.setTextColor(255);
                if (w > 10) doc.text(fmtMm(mp.remaining), x + w / 2, yy + barH / 2 + 1, { align: 'center' });
            }
            doc.setTextColor(20);
            yy += barH + 8;
        });
    });

    const fname = `AKFA_Kesim_${(order.customer || 'zakaz').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fname);
}
