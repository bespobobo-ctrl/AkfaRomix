// ═══════════════════════════════════════════════════════════
//  AKFA Romix — To'liq 2D deraza va eshik dizayneri (SVG)
//  Rekursiv split-daraxt: rama → impostlar → bo'limlar (sections).
//  Har bo'limga ochilish turi (kar/kasement/tilt/tilt-turn) + o'lcham.
//  Model → kesim PDF va hisob-kitob uchun.
// ═══════════════════════════════════════════════════════════

let _uid = 0;
const uid = () => 'n' + (++_uid);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const OPENINGS = {
    kar: 'Kar', casement_l: 'Kasement ←', casement_r: 'Kasement →', tilt: 'Tilt (tepaga)', tilt_bottom: 'Tilt (pastga)',
    tilt_turn: 'Tilt-turn ←', tilt_turn_r: 'Tilt-turn →'
};

export function createDesigner(host, opts = {}) {
    const FRAME = 0, IMPOST = 30;
    const VIS_FRAME = 40; // faqat vizual rama chegarasi (layout ga ta'sir qilmaydi)
    let W = opts.W || 1500, H = opts.H || 1600;
    let root = { id: uid(), kind: 'leaf', opening: 'kar' };
    let selected = root.id;
    let out = { cells: [], imposts: [] }; // render()da to'ldiriladi, bindSvg() bo'lim o'lchamini shundan topadi
    let frameOnly = false; // true bo'lsa — kesim hisobida faqat tashqi ramka (impost/stvorka/shtapiksiz)
    const onChange = opts.onChange || (() => { });

    const itemWidthInput = document.getElementById('itemWidth');
    const itemHeightInput = document.getElementById('itemHeight');

    host.innerHTML = `
        <style>
            .d2-container {
                display: grid;
                grid-template-columns: 120px 1fr 120px;
                gap: 15px;
                background: rgba(255, 255, 255, 0.01);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 24px;
                padding: 15px;
                align-items: stretch;
            }
            @media (max-width: 768px) {
                .d2-container {
                    grid-template-columns: 1fr;
                }
            }
            .d2-sidebar {
                display: flex;
                flex-direction: column;
                gap: 8px;
                justify-content: center;
            }
            .d2-btn {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 14px;
                padding: 10px 5px;
                color: rgba(255, 255, 255, 0.7);
                font-size: 0.7rem;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .d2-btn:hover {
                background: rgba(0, 210, 255, 0.08);
                border-color: rgba(0, 210, 255, 0.3);
                color: #fff;
                transform: translateY(-2px);
            }
            .d2-btn.active {
                background: rgba(0, 210, 255, 0.15);
                border-color: #00d2ff;
                color: #00d2ff;
                box-shadow: 0 0 15px rgba(0, 210, 255, 0.15);
            }
            .d2-btn-danger {
                background: rgba(239, 68, 68, 0.05);
                border-color: rgba(239, 68, 68, 0.15);
                color: #ef4444;
            }
            .d2-btn-danger:hover {
                background: rgba(239, 68, 68, 0.15);
                border-color: #ef4444;
                color: #fff;
            }
            .d2-canvas-wrapper {
                background: radial-gradient(circle at 50% 40%, #16283d, #0a1420);
                border-radius: 20px;
                padding: 15px;
                border: 1px solid rgba(255, 255, 255, 0.04);
                display: flex;
                align-items: center;
                justify-content: center;
            }
        </style>
        <div class="d2-container">
            <!-- Left Sidebar: Opening Types -->
            <div class="d2-sidebar d2-left-sidebar">
                <div style="font-size:0.6rem; color:rgba(255,255,255,0.4); font-weight:800; text-transform:uppercase; text-align:center; margin-bottom:5px; letter-spacing:0.5px;">Ochilish</div>
                <button type="button" class="d2-btn" data-op="kar">⏹️<br>Kar</button>
                <button type="button" class="d2-btn" data-op="casement_l">⬅️<br>Chapga</button>
                <button type="button" class="d2-btn" data-op="casement_r">➡️<br>O'ngga</button>
                <button type="button" class="d2-btn" data-op="tilt">⬆️<br>Tepaga</button>
                <button type="button" class="d2-btn" data-op="tilt_bottom">⬇️<br>Pastga</button>
                <button type="button" class="d2-btn" data-op="tilt_turn">🔄<br>2 Rejim ←</button>
                <button type="button" class="d2-btn" data-op="tilt_turn_r">🔄<br>2 Rejim →</button>
            </div>
            
            <!-- Center Canvas -->
            <div class="d2-canvas-wrapper">
                <div class="d2-canvas" style="width: 100%; max-width: 480px;">
                    <!-- SVG will be injected here -->
                </div>
            </div>
            
            <!-- Right Sidebar: Splits & Actions -->
            <div class="d2-sidebar d2-right-sidebar">
                <div style="font-size:0.6rem; color:rgba(255,255,255,0.4); font-weight:800; text-transform:uppercase; text-align:center; margin-bottom:5px; letter-spacing:0.5px;">Bo'limlar</div>
                <button type="button" class="d2-btn" id="d2-split-v">｜<br>Vertikal</button>
                <button type="button" class="d2-btn" id="d2-split-h">－<br>Gorizont</button>
                <button type="button" class="d2-btn" id="d2-split-double">｜｜<br>2 Tavaqa</button>
                <div style="height:10px;"></div>
                <button type="button" class="d2-btn d2-btn-danger" id="d2-delete-btn">🗑️<br>O'chirish</button>
                <div style="height:10px;"></div>
                <button type="button" class="d2-btn" id="d2-frame-only" title="Bo'lim/stvorka/oyna hisoblanmaydi — faqat tashqi ramka profili kesiladi">🖼️<br>Faqat Ramka</button>
            </div>
        </div>

        <!-- O'lcham kiritish oynasi (rasm/prompt o'rniga premium modal) -->
        <div id="d2DimBackdrop" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); z-index:3000; align-items:center; justify-content:center; padding:20px;">
            <div style="width:300px; background:#0f1c2e; border:1px solid rgba(0,210,255,0.25); border-radius:22px; padding:28px; box-shadow:0 25px 60px rgba(0,0,0,0.55);">
                <div id="d2DimTitle" style="font-size:0.9rem; font-weight:800; color:#fff; margin-bottom:20px; text-align:center;">O'lchamni kiriting</div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button type="button" id="d2DimMinus" style="width:46px; height:46px; flex:none; border-radius:12px; border:none; background:rgba(255,255,255,0.08); color:#fff; font-size:1.4rem; font-weight:700; cursor:pointer;">−</button>
                    <input type="number" id="d2DimInput" step="10" style="flex:1; min-width:0; height:46px; text-align:center; font-size:1.25rem; font-weight:800; color:#00d2ff; background:rgba(0,210,255,0.07); border:1px solid rgba(0,210,255,0.3); border-radius:12px;">
                    <button type="button" id="d2DimPlus" style="width:46px; height:46px; flex:none; border-radius:12px; border:none; background:rgba(255,255,255,0.08); color:#fff; font-size:1.4rem; font-weight:700; cursor:pointer;">+</button>
                </div>
                <div style="text-align:center; font-size:0.66rem; color:rgba(255,255,255,0.35); margin-top:8px;">millimetrda (mm), kamida 100</div>
                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button type="button" id="d2DimSave" style="flex:1; background:linear-gradient(135deg,#00d2ff,#00ff88); color:#000; border:none; padding:13px; border-radius:12px; font-weight:800; cursor:pointer;">Saqlash</button>
                    <button type="button" id="d2DimCancel" style="flex:1; background:rgba(255,255,255,0.08); color:#fff; border:none; padding:13px; border-radius:12px; font-weight:700; cursor:pointer;">Bekor</button>
                </div>
            </div>
        </div>
    `;

    const canvasDiv = host.querySelector('.d2-canvas');
    const leftSidebar = host.querySelector('.d2-left-sidebar');

    // O'lcham kiritish oynasi (native prompt() o'rniga)
    const dimBackdrop = host.querySelector('#d2DimBackdrop');
    const dimTitle = host.querySelector('#d2DimTitle');
    const dimInput = host.querySelector('#d2DimInput');
    let dimOnSave = null;

    function openDimModal(title, currentVal, onSave) {
        dimTitle.textContent = title;
        dimInput.value = currentVal;
        dimOnSave = onSave;
        dimBackdrop.style.display = 'flex';
        setTimeout(() => { dimInput.focus(); dimInput.select(); }, 30);
    }
    function closeDimModal() {
        dimBackdrop.style.display = 'none';
        dimOnSave = null;
    }
    function confirmDimModal() {
        const val = parseInt(dimInput.value);
        if (!val || val < 100) { alert("Noto'g'ri qiymat kiritildi (kamida 100mm bo'lishi shart)!"); return; }
        if (dimOnSave) dimOnSave(val);
        closeDimModal();
    }
    host.querySelector('#d2DimMinus').onclick = () => { dimInput.value = Math.max(100, (parseInt(dimInput.value) || 0) - 10); };
    host.querySelector('#d2DimPlus').onclick = () => { dimInput.value = (parseInt(dimInput.value) || 0) + 10; };
    host.querySelector('#d2DimSave').onclick = confirmDimModal;
    host.querySelector('#d2DimCancel').onclick = closeDimModal;
    dimBackdrop.onclick = (e) => { if (e.target === dimBackdrop) closeDimModal(); };
    dimInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmDimModal(); });

    host.querySelector('#d2-split-v').onclick = () => addImpost('v');
    host.querySelector('#d2-split-h').onclick = () => addImpost('h');
    host.querySelector('#d2-split-double').onclick = () => addDoubleSplit('v');
    host.querySelector('#d2-delete-btn').onclick = () => deleteSelected();

    // Faqat Ramka — bo'lim/stvorka/oyna hisobsiz, kesim PDF'da faqat tashqi ramka profili chiqadi
    const frameOnlyBtn = host.querySelector('#d2-frame-only');
    frameOnlyBtn.onclick = () => {
        frameOnly = !frameOnly;
        if (frameOnly) {
            root = { id: uid(), kind: 'leaf', opening: 'kar' };
            selected = root.id;
        }
        frameOnlyBtn.classList.toggle('active', frameOnly);
        host.querySelectorAll('#d2-split-v, #d2-split-h, #d2-split-double').forEach(b => {
            b.disabled = frameOnly;
            b.style.opacity = frameOnly ? '0.35' : '';
            b.style.pointerEvents = frameOnly ? 'none' : '';
        });
        leftSidebar.querySelectorAll('[data-op]').forEach(b => {
            b.disabled = frameOnly;
            b.style.pointerEvents = frameOnly ? 'none' : '';
        });
        render(); onChange();
    };

    leftSidebar.querySelectorAll('[data-op]').forEach(b => {
        b.onclick = () => setOpening(b.getAttribute('data-op'));
    });

    // ── Model yordamchilari ──
    function findNode(node, id, parent = null) {
        if (node.id === id) return { node, parent };
        if (node.kind === 'split') for (const ch of node.children) {
            const r = findNode(ch.node, id, node);
            if (r) return r;
        }
        return null;
    }

    function ancestorSplit(id, dir) {
        function walk(node, parent) {
            if (node.id === id) return null;
            if (node.kind === 'split') for (const ch of node.children) {
                if (ch.node.id === id) return (node.dir === dir) ? { split: node, child: ch } : null;
                const r = walk(ch.node, node);
                if (r) return r;
            }
            return null;
        }
        return walk(root, null);
    }

    function addImpost(dir) {
        const f = findNode(root, selected);
        if (!f) return;
        const leaf = f.node;
        if (f.parent && f.parent.kind === 'split' && f.parent.dir === dir) {
            f.parent.children.push({ size: null, node: { id: uid(), kind: 'leaf', opening: 'kar' } });
        } else if (leaf.kind === 'leaf') {
            const op = leaf.opening;
            leaf.kind = 'split';
            leaf.dir = dir;
            delete leaf.opening;
            leaf.children = [
                { size: null, node: { id: uid(), kind: 'leaf', opening: op } },
                { size: null, node: { id: uid(), kind: 'leaf', opening: 'kar' } }
            ];
            selected = leaf.children[0].node.id;
        } else {
            leaf.children.push({ size: null, node: { id: uid(), kind: 'leaf', opening: 'kar' } });
        }
        render(); onChange();
    }

    function addDoubleSplit(dir) {
        const f = findNode(root, selected);
        if (!f) return;
        const leaf = f.node;
        if (leaf.kind === 'leaf') {
            const op = leaf.opening;
            leaf.kind = 'split';
            leaf.dir = dir;
            delete leaf.opening;
            leaf.children = [
                { size: null, node: { id: uid(), kind: 'leaf', opening: op } },
                { size: null, node: { id: uid(), kind: 'leaf', opening: 'kar' } }
            ];
            selected = leaf.children[0].node.id;
        }
        render(); onChange();
    }

    function deleteSelected() {
        const f = findNode(root, selected);
        if (!f || !f.parent) { root = { id: uid(), kind: 'leaf', opening: 'kar' }; selected = root.id; render(); onChange(); return; }
        const sp = f.parent;
        sp.children = sp.children.filter(ch => ch.node.id !== selected);
        if (sp.children.length === 1) {
            const only = sp.children[0].node;
            sp.kind = only.kind; sp.dir = only.dir; sp.children = only.children; sp.opening = only.opening;
            selected = sp.id;
        } else {
            selected = sp.children[0].node.id;
        }
        render(); onChange();
    }

    function setOpening(op) {
        const f = findNode(root, selected);
        if (f && f.node.kind === 'leaf') { f.node.opening = op; render(); onChange(); }
    }

    function setSpecificCellSize(cellId, dim, val) {
        val = Math.max(100, Math.round(val) || 0);
        const dir = dim === 'w' ? 'v' : 'h';
        if (cellId === 'root') {
            if (dim === 'w') {
                W = val;
                if (itemWidthInput) itemWidthInput.value = W;
            } else {
                H = val;
                if (itemHeightInput) itemHeightInput.value = H;
            }
        } else {
            const f = findNode(root, cellId);
            if (f && f.parent && f.parent.kind === 'split' && f.parent.dir === dir) {
                const child = f.parent.children.find(ch => ch.node.id === cellId);
                if (child) child.size = val;
            }
        }
        render(); onChange();
    }

    // ── Layout (rekursiv) ──
    function layout(node, box, out) {
        if (node.kind === 'leaf') { out.cells.push({ id: node.id, opening: node.opening, box }); return; }
        const horiz = node.dir === 'v'; // v = ustunlar (x bo'ylab)
        const total = horiz ? box.w : box.h;
        const gaps = (node.children.length - 1) * IMPOST;
        const avail = total - gaps;
        const fixed = node.children.reduce((s, c) => s + (c.size || 0), 0);
        const flexN = node.children.filter(c => !c.size).length;
        const flexSize = flexN > 0 ? Math.max(0, (avail - fixed) / flexN) : 0;
        let pos = horiz ? box.x : box.y;
        node.children.forEach((c, i) => {
            const len = c.size || flexSize;
            const sub = horiz ? { x: pos, y: box.y, w: len, h: box.h } : { x: box.x, y: pos, w: box.w, h: len };
            layout(c.node, sub, out);
            pos += len;
            if (i < node.children.length - 1) {
                out.imposts.push(horiz
                    ? { x: pos, y: box.y, w: IMPOST, h: box.h }
                    : { x: box.x, y: pos, w: box.w, h: IMPOST });
                pos += IMPOST;
            }
        });
    }

    function openingSvg(box, op, sel) {
        const { x, y, w, h } = box;
        const col = sel ? '#00d2ff' : 'rgba(255,255,255,0.2)';
        const L = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="10" stroke-dasharray="3 3"/>`;
        let s = '';
        if (op === 'casement_l') s = L(x, y, x + w, y + h / 2) + L(x, y + h, x + w, y + h / 2);
        else if (op === 'casement_r') s = L(x + w, y, x, y + h / 2) + L(x + w, y + h, x, y + h / 2);
        else if (op === 'tilt') s = L(x, y + h, x + w / 2, y) + L(x + w, y + h, x + w / 2, y);
        else if (op === 'tilt_bottom') s = L(x, y, x + w / 2, y + h) + L(x + w, y, x + w / 2, y + h);
        else if (op === 'tilt_turn') s = L(x, y, x + w, y + h / 2) + L(x, y + h, x + w, y + h / 2) + L(x, y + h, x + w / 2, y) + L(x + w, y + h, x + w / 2, y);
        else if (op === 'tilt_turn_r') s = L(x + w, y, x, y + h / 2) + L(x + w, y + h, x, y + h / 2) + L(x, y + h, x + w / 2, y) + L(x + w, y + h, x + w / 2, y);
        return s;
    }

    function drawDim(x1, y1, x2, y2, val, cellId, dim) {
        const isHoriz = y1 === y2;
        const color = 'rgba(255,255,255,0.25)';
        const textColor = '#00d2ff';
        
        let s = '';
        s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="4" stroke-dasharray="6 6"/>`;
        
        if (isHoriz) {
            s += `<line x1="${x1}" y1="${y1 - 12}" x2="${x1}" y2="${y1 + 12}" stroke="${color}" stroke-width="6"/>`;
            s += `<line x1="${x2}" y1="${y2 - 12}" x2="${x2}" y2="${y2 + 12}" stroke="${color}" stroke-width="6"/>`;
            s += `<text x="${(x1 + x2) / 2}" y="${y1 - 15}" fill="${textColor}" font-size="70" font-weight="900" text-anchor="middle" style="cursor:pointer; fill:#00d2ff; filter:drop-shadow(0 0 5px rgba(0,210,255,0.4));" data-edit-dim="${dim}" data-cell-id="${cellId}">← ${Math.round(val)} →</text>`;
        } else {
            s += `<line x1="${x1 - 12}" y1="${y1}" x2="${x1 + 12}" y2="${y1}" stroke="${color}" stroke-width="6"/>`;
            s += `<line x1="${x2 - 12}" y1="${y2}" x2="${x2 + 12}" y2="${y2}" stroke="${color}" stroke-width="6"/>`;
            const cx = x1 - 20;
            const cy = (y1 + y2) / 2;
            s += `<text x="${cx}" y="${cy + 22}" fill="${textColor}" font-size="70" font-weight="900" text-anchor="middle" style="cursor:pointer; fill:#00d2ff; filter:drop-shadow(0 0 5px rgba(0,210,255,0.4));" transform="rotate(-90 ${cx} ${cy})" data-edit-dim="${dim}" data-cell-id="${cellId}">← ${Math.round(val)} →</text>`;
        }
        return s;
    }

    function render() {
        out = { cells: [], imposts: [] };
        const inner = { x: FRAME, y: FRAME, w: W - 2 * FRAME, h: H - 2 * FRAME };
        layout(root, inner, out);

        const pad = 240, padTop = 60;
        const vb = `${-pad} ${-padTop} ${W + pad + 80} ${H + pad + padTop}`;
        let s = `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:350px;display:block;">`;
        
        // Frame/Rama (faqat vizual, layout ga ta'sir qilmaydi)
        s += `<rect x="${-VIS_FRAME}" y="${-VIS_FRAME}" width="${W + 2 * VIS_FRAME}" height="${H + 2 * VIS_FRAME}" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" stroke-width="8" rx="12"/>`;
        s += `<rect x="0" y="0" width="${W}" height="${H}" fill="#0b1320" rx="4"/>`;
        
        // Leaves/Kataklar
        out.cells.forEach(c => {
            const sel = c.id === selected;
            s += `<rect data-id="${c.id}" x="${c.box.x}" y="${c.box.y}" width="${c.box.w}" height="${c.box.h}" fill="${sel ? 'rgba(0,210,255,0.18)' : 'rgba(0,186,255,0.04)'}" stroke="${sel ? '#00d2ff' : 'rgba(0,186,255,0.2)'}" stroke-width="${sel ? 12 : 5}" style="cursor:pointer; transition: all 0.2s;" rx="4"/>`;
            s += openingSvg(c.box, c.opening, sel);
            s += `<text x="${c.box.x + c.box.w / 2}" y="${c.box.y + c.box.h / 2 + 20}" fill="rgba(255,255,255,0.25)" font-size="65" font-weight="700" text-anchor="middle" pointer-events="none">${Math.round(c.box.w)}×${Math.round(c.box.h)}</text>`;
        });
        
        // Imposts
        out.imposts.forEach(im => {
            s += `<rect x="${im.x}" y="${im.y}" width="${im.w}" height="${im.h}" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.05)" stroke-width="2"/>`;
        });

        // Unique bottom-most and left-most cells for section dimensioning
        const bottomCells = out.cells.filter(c => Math.abs((c.box.y + c.box.h) - H) < 2);
        const leftCells = out.cells.filter(c => Math.abs(c.box.x) < 2);

        // Draw individual column widths at H + 65
        bottomCells.forEach(c => {
            s += drawDim(c.box.x, H + 65, c.box.x + c.box.w, H + 65, c.box.w, c.id, 'w');
        });

        // Draw individual row heights at x = -65
        leftCells.forEach(c => {
            s += drawDim(-65, c.box.y, -65, c.box.y + c.box.h, c.box.h, c.id, 'h');
        });

        // Draw overall dimensions
        s += drawDim(0, H + 180, W, H + 180, W, 'root', 'w');
        s += drawDim(-180, 0, -180, H, H, 'root', 'h');

        s += `</svg>`;
        canvasDiv.innerHTML = s;
        bindSvg();
        renderSelPanel();
    }

    function bindSvg() {
        const el = canvasDiv.querySelector('svg');
        if (!el) return;
        el.addEventListener('click', e => {
            const editDim = e.target.getAttribute('data-edit-dim');
            const cellId = e.target.getAttribute('data-cell-id');
            if (editDim && cellId) {
                const currentVal = editDim === 'w' 
                    ? (cellId === 'root' ? W : Math.round(out.cells.find(c => c.id === cellId).box.w))
                    : (cellId === 'root' ? H : Math.round(out.cells.find(c => c.id === cellId).box.h));
                
                const title = cellId === 'root'
                    ? (editDim === 'w' ? "Umumiy enini kiriting" : "Umumiy balandligini kiriting")
                    : (editDim === 'w' ? "Tavaqa enini kiriting" : "Tavaqa balandligini kiriting");

                openDimModal(title, currentVal, (newVal) => setSpecificCellSize(cellId, editDim, newVal));
                return;
            }

            const t = e.target.closest('[data-id]');
            if (t) { selected = t.getAttribute('data-id'); render(); }
        });
    }

    function renderSelPanel() {
        const f = findNode(root, selected);
        const isLeaf = f && f.node.kind === 'leaf';
        const cur = isLeaf ? f.node.opening : null;

        leftSidebar.querySelectorAll('[data-op]').forEach(b => {
            const op = b.getAttribute('data-op');
            if (isLeaf && !frameOnly) {
                b.disabled = false;
                b.style.opacity = '1';
                if (cur === op) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            } else {
                b.disabled = true;
                b.style.opacity = '0.4';
                b.classList.remove('active');
            }
        });
    }

    render();

    return {
        setSize(w, h) { W = Math.max(300, Math.round(w) || W); H = Math.max(300, Math.round(h) || H); render(); },
        getModel() { return { W, H, tree: JSON.parse(JSON.stringify(root)), frameOnly }; },
        render
    };
}
