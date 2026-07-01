// ═══════════════════════════════════════════════════════════
//  AKFA Romix — To'liq 2D deraza dizayneri (SVG)
//  Rekursiv split-daraxt: rama → impostlar → bo'limlar (sections).
//  Har bo'limga ochilish turi (kar/kasement/tilt/tilt-turn) + o'lcham.
//  Model → kesim PDF va hisob-kitob uchun.
// ═══════════════════════════════════════════════════════════

let _uid = 0;
const uid = () => 'n' + (++_uid);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const OPENINGS = {
    kar: 'Kar', casement_l: 'Kasement ←', casement_r: 'Kasement →', tilt: 'Tilt', tilt_turn: 'Tilt-turn'
};

export function createDesigner(host, opts = {}) {
    const FRAME = 60, IMPOST = 45;
    let W = opts.W || 1500, H = opts.H || 1600;
    let root = { id: uid(), kind: 'leaf', opening: 'kar' };
    let selected = root.id;
    const onChange = opts.onChange || (() => { });

    host.innerHTML =
        '<div class="d2-toolbar" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;"></div>' +
        '<div class="d2-canvas" style="background:radial-gradient(circle at 50% 40%,#16283d,#0a1420);border-radius:12px;padding:10px;"><svg class="d2-svg" style="width:100%;height:300px;display:block;"></svg></div>' +
        '<div class="d2-sel" style="margin-top:10px;"></div>';

    const canvasDiv = host.querySelector('.d2-canvas');
    const toolbar = host.querySelector('.d2-toolbar');
    const selPanel = host.querySelector('.d2-sel');

    const btn = (label, act, color) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.style.cssText = `padding:8px 12px;border-radius:9px;border:1px solid rgba(255,255,255,0.12);background:${color || 'rgba(255,255,255,0.05)'};color:#fff;font-size:0.8rem;font-weight:700;cursor:pointer;`;
        b.onclick = act;
        return b;
    };
    toolbar.appendChild(btn('➕ Vertikal impost', () => addImpost('v'), 'rgba(0,210,255,0.15)'));
    toolbar.appendChild(btn('➕ Gorizontal impost', () => addImpost('h'), 'rgba(0,210,255,0.15)'));
    toolbar.appendChild(btn('🗑 Bo\'limni o\'chirish', () => deleteSelected(), 'rgba(239,68,68,0.15)'));

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
        // id'dan yuqoriga: shu yo'nalishdagi eng yaqin split va undagi child
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
        // Agar tanlangan bo'lim ota-splitи shu yo'nalishда bo'lsa — yon qo'shamiz (N ustun)
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
            // tanlangan split — unga bola qo'shamiz
            leaf.children.push({ size: null, node: { id: uid(), kind: 'leaf', opening: 'kar' } });
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

    function setCellSize(dim, val) {
        val = Math.max(0, Math.round(val) || 0);
        const dir = dim === 'w' ? 'v' : 'h';
        const a = ancestorSplit(selected, dir);
        if (a) { a.child.size = val || null; }
        else { if (dim === 'w') W = val || W; else H = val || H; }
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
        const col = sel ? '#00d2ff' : '#2563eb';
        const L = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="14"/>`;
        let s = '';
        if (op === 'casement_l') s = L(x, y, x + w, y + h / 2) + L(x, y + h, x + w, y + h / 2);
        else if (op === 'casement_r') s = L(x + w, y, x, y + h / 2) + L(x + w, y + h, x, y + h / 2);
        else if (op === 'tilt') s = L(x, y + h, x + w / 2, y) + L(x + w, y + h, x + w / 2, y);
        else if (op === 'tilt_turn') s = L(x, y, x + w, y + h / 2) + L(x, y + h, x + w, y + h / 2) + L(x, y + h, x + w / 2, y) + L(x + w, y + h, x + w / 2, y);
        return s;
    }

    function render() {
        const out = { cells: [], imposts: [] };
        const inner = { x: FRAME, y: FRAME, w: W - 2 * FRAME, h: H - 2 * FRAME };
        layout(root, inner, out);

        const pad = 160, padTop = 40;
        const vb = `${-pad} ${-padTop} ${W + pad + 80} ${H + pad + padTop}`;
        let s = `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:300px;">`;
        // Rama
        s += `<rect x="0" y="0" width="${W}" height="${H}" fill="#e8eef2" stroke="#9aa4ad" stroke-width="4"/>`;
        s += `<rect x="${FRAME}" y="${FRAME}" width="${W - 2 * FRAME}" height="${H - 2 * FRAME}" fill="#0e2036"/>`;
        // Oyna kataklari
        out.cells.forEach(c => {
            const sel = c.id === selected;
            s += `<rect data-id="${c.id}" x="${c.box.x}" y="${c.box.y}" width="${c.box.w}" height="${c.box.h}" fill="${sel ? 'rgba(0,210,255,0.28)' : '#9fd3e8'}" stroke="${sel ? '#00d2ff' : '#6aa6c4'}" stroke-width="${sel ? 10 : 4}" style="cursor:pointer"/>`;
            s += openingSvg(c.box, c.opening, sel);
            // o'lcham matni (kataklar ichida)
            s += `<text x="${c.box.x + c.box.w / 2}" y="${c.box.y + c.box.h / 2}" fill="#0b111a" font-size="70" font-weight="700" text-anchor="middle" pointer-events="none">${Math.round(c.box.w)}×${Math.round(c.box.h)}</text>`;
        });
        // Impostlar
        out.imposts.forEach(im => {
            s += `<rect x="${im.x}" y="${im.y}" width="${im.w}" height="${im.h}" fill="#cfd8dc" stroke="#9aa4ad" stroke-width="2"/>`;
        });
        // Umumiy o'lchamlar (pastda eni, chapda balandligi)
        const ty = H + 90;
        s += `<line x1="0" y1="${ty}" x2="${W}" y2="${ty}" stroke="#7f8c99" stroke-width="3"/>`;
        s += `<text x="${W / 2}" y="${ty + 55}" fill="#cbd5e1" font-size="70" font-weight="800" text-anchor="middle">${W}</text>`;
        const lx = -90;
        s += `<line x1="${lx}" y1="0" x2="${lx}" y2="${H}" stroke="#7f8c99" stroke-width="3"/>`;
        s += `<text x="${lx - 15}" y="${H / 2}" fill="#cbd5e1" font-size="70" font-weight="800" text-anchor="middle" transform="rotate(-90 ${lx - 15} ${H / 2})">${H}</text>`;
        s += `</svg>`;
        canvasDiv.innerHTML = s;
        bindSvg();
        renderSelPanel();
    }

    function bindSvg() {
        const el = canvasDiv.querySelector('svg');
        if (!el) return;
        el.addEventListener('click', e => {
            const t = e.target.closest('[data-id]');
            if (t) { selected = t.getAttribute('data-id'); render(); }
        });
    }

    function renderSelPanel() {
        const f = findNode(root, selected);
        const isLeaf = f && f.node.kind === 'leaf';
        const cur = isLeaf ? f.node.opening : null;
        const opBtns = Object.keys(OPENINGS).map(k =>
            `<button type="button" data-op="${k}" style="padding:7px 10px;border-radius:8px;border:1px solid ${cur === k ? '#00d2ff' : 'rgba(255,255,255,0.12)'};background:${cur === k ? 'rgba(0,210,255,0.2)' : 'rgba(255,255,255,0.04)'};color:#fff;font-size:0.75rem;font-weight:700;cursor:pointer;">${esc(OPENINGS[k])}</button>`
        ).join('');
        selPanel.innerHTML =
            '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:12px;">' +
            '<div style="font-size:0.78rem;color:var(--adm-text-sec);font-weight:700;margin-bottom:8px;">Tanlangan bo\'lim — ochilish turi:</div>' +
            `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">${isLeaf ? opBtns : '<span style="color:var(--adm-text-sec);font-size:0.8rem;">Bo\'lim tanlang</span>'}</div>` +
            '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">' +
            '<label style="font-size:0.75rem;color:var(--adm-text-sec);">Eni (mm)<input type="number" class="d2-w" style="width:90px;margin-left:6px;padding:6px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:var(--bg-dark-input,#1e293b);color:#fff;"></label>' +
            '<label style="font-size:0.75rem;color:var(--adm-text-sec);">Balandligi (mm)<input type="number" class="d2-h" style="width:90px;margin-left:6px;padding:6px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:var(--bg-dark-input,#1e293b);color:#fff;"></label>' +
            '</div></div>';
        selPanel.querySelectorAll('[data-op]').forEach(b => b.onclick = () => setOpening(b.getAttribute('data-op')));
        const wI = selPanel.querySelector('.d2-w'), hI = selPanel.querySelector('.d2-h');
        // tanlangan katak o'lchamini ko'rsatamiz
        const out = { cells: [], imposts: [] };
        layout(root, { x: FRAME, y: FRAME, w: W - 2 * FRAME, h: H - 2 * FRAME }, out);
        const cell = out.cells.find(c => c.id === selected);
        if (cell && wI && hI) { wI.value = Math.round(cell.box.w); hI.value = Math.round(cell.box.h); }
        if (wI) wI.onchange = () => setCellSize('w', parseInt(wI.value));
        if (hI) hI.onchange = () => setCellSize('h', parseInt(hI.value));
    }

    render();

    return {
        setSize(w, h) { W = Math.max(300, Math.round(w) || W); H = Math.max(300, Math.round(h) || H); render(); },
        getModel() { return { W, H, tree: JSON.parse(JSON.stringify(root)) }; },
        render
    };
}
