// ═══════════════════════════════════════════════════════════
//  AKFA Romix — 3D Rom / Eshik ko'rinishi (Three.js)
//  Zakaz konstruktorida turi va o'lchamiga qarab jonli 3D model.
// ═══════════════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const FRAME_COLOR = 0xeef2f5;   // oq PVC/alyumin profil
const GLASS_COLOR = 0x9fd3e8;   // shisha
const PANEL_COLOR = 0xcfd8dc;   // eshik pastki panel
const HANDLE_COLOR = 0x9aa4ad;  // metall ruchka

export function createViewer(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(2.5, 1.5, 5);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 12;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;

    // Yorug'lik
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(4, 6, 6);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xbfd8ff, 0.4);
    dir2.position.set(-5, 2, -4);
    scene.add(dir2);

    const frameMat = new THREE.MeshStandardMaterial({ color: FRAME_COLOR, roughness: 0.55, metalness: 0.15 });
    const glassMat = new THREE.MeshStandardMaterial({ color: GLASS_COLOR, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.32 });
    const panelMat = new THREE.MeshStandardMaterial({ color: PANEL_COLOR, roughness: 0.7, metalness: 0.05 });
    const handleMat = new THREE.MeshStandardMaterial({ color: HANDLE_COLOR, roughness: 0.3, metalness: 0.8 });

    const symMat = new THREE.LineBasicMaterial({ color: 0x1e40af }); // ochilish belgisi (ko'k)

    let modelGroup = new THREE.Group();
    scene.add(modelGroup);

    function line(x1, y1, x2, y2, z) {
        const g = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x1, y1, z), new THREE.Vector3(x2, y2, z)
        ]);
        modelGroup.add(new THREE.Line(g, symMat));
    }

    function clearGroup() {
        modelGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        scene.remove(modelGroup);
        modelGroup = new THREE.Group();
        scene.add(modelGroup);
    }

    function box(w, h, d, mat, x = 0, y = 0, z = 0) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z);
        modelGroup.add(m);
        return m;
    }
    // params: { type, width(m), height(m), vDiv, hDiv, design, arch }
    function update(params) {
        clearGroup();
        const type = params.type || 'rom';
        if (!['rom', 'rom_fortochka', 'eshik'].includes(type)) {
            // 3D yo'q turlar uchun bo'sh (chaqiruvchi placeholder ko'rsatadi)
            renderer.render(scene, camera);
            return;
        }

        // Metrni dunyo birligiga solamiz (kattaligi ~3.2 ga normallashtiramiz)
        let W = Math.max(0.3, params.width || 1.5);
        let H = Math.max(0.3, params.height || 2.0);
        const maxDim = Math.max(W, H);
        const scale = 3.2 / maxDim;
        W *= scale; H *= scale;

        const f = Math.max(0.08, 0.06 * scale);  // profil eni (~60mm)
        const d = Math.max(0.06, 0.05 * scale);  // profil chuqurligi
        const impF = f * 0.75;                   // impost eni

        // Arka (yarim doira tepa) — faqat deraza uchun
        const arch = !!params.arch && type !== 'eshik';
        const archRise = arch ? Math.min(W * 0.5, H * 0.42) : 0;
        const rectH = H - archRise;            // to'g'ri burchakli qism balandligi
        const cyRect = -H / 2 + rectH / 2;
        const springY = -H / 2 + rectH;        // arka boshlanishi

        // Tashqi ramka
        box(f, rectH, d, frameMat, -W / 2 + f / 2, cyRect, 0); // chap
        box(f, rectH, d, frameMat, W / 2 - f / 2, cyRect, 0);  // o'ng
        box(W - 2 * f, f, d, frameMat, 0, -H / 2 + f / 2, 0);  // past
        if (!arch) {
            box(W - 2 * f, f, d, frameMat, 0, H / 2 - f / 2, 0); // to'g'ri tepa
        } else {
            // Arka ramkasi — yarim doira segmentlar
            const R = W / 2;
            const segs = 28;
            for (let i = 0; i < segs; i++) {
                const a = Math.PI * (i + 0.5) / segs;
                const seg = new THREE.Mesh(new THREE.BoxGeometry(Math.PI * R / segs * 1.2, f, d), frameMat);
                seg.position.set(R * Math.cos(a), springY + archRise * Math.sin(a), 0);
                seg.rotation.z = a - Math.PI / 2;
                modelGroup.add(seg);
            }
            // Arka shishasi — yarim disk
            const gd = new THREE.Mesh(new THREE.CircleGeometry(R - f, 40, 0, Math.PI), glassMat);
            gd.position.set(0, springY, -d * 0.1);
            modelGroup.add(gd);
        }

        // ── 2D DIZAYNER Model mavjud bo'lsa ──
        if (params.design && params.design.tree) {
            const dW = params.design.W || 1500;
            const dH = params.design.H || 2000;
            const FRAME_PROFILE = 60;
            const SASH_GAP = 3;
            const IMPOST_MM = 30;
            const SASH_PROFILE = 50;

            function layoutTree3D(node, boxBounds, out) {
                if (!node) return;
                if (node.kind === 'leaf') {
                    out.cells.push({ opening: node.opening, box: boxBounds });
                    return;
                }
                const horiz = node.dir === 'v';
                const total = horiz ? boxBounds.w : boxBounds.h;
                const gaps = (node.children.length - 1) * IMPOST_MM;
                const avail = total - gaps;
                const fixed = node.children.reduce((s, c) => s + (c.size || 0), 0);
                const flexN = node.children.filter(c => !c.size).length;
                const flexSize = flexN > 0 ? Math.max(0, (avail - fixed) / flexN) : 0;
                let pos = horiz ? boxBounds.x : boxBounds.y;

                node.children.forEach((c, i) => {
                    const len = c.size || flexSize;
                    const sub = horiz
                        ? { x: pos, y: boxBounds.y, w: len, h: boxBounds.h }
                        : { x: boxBounds.x, y: pos, w: boxBounds.w, h: len };
                    layoutTree3D(c.node, sub, out);
                    pos += len;

                    if (i < node.children.length - 1) {
                        const imLen = horiz ? boxBounds.h : boxBounds.w;
                        out.imposts.push({
                            len: imLen,
                            dir: horiz ? 'v' : 'h',
                            x1: horiz ? pos : boxBounds.x,
                            y1: horiz ? boxBounds.y : pos,
                            x2: horiz ? pos : (boxBounds.x + boxBounds.w),
                            y2: horiz ? (boxBounds.y + boxBounds.h) : pos,
                            pos: pos
                        });
                        pos += IMPOST_MM;
                    }
                });
            }

            const out = { cells: [], imposts: [] };
            layoutTree3D(params.design.tree, { x: 0, y: 0, w: dW, h: dH }, out);

            // 1) Impostlar chizish
            out.imposts.forEach(im => {
                const imW_mm = im.dir === 'v' ? IMPOST_MM : im.len;
                const imH_mm = im.dir === 'v' ? im.len : IMPOST_MM;
                const imX_mm = im.dir === 'v' ? im.x1 : im.x1;
                const imY_mm = im.dir === 'v' ? im.y1 : im.y1;

                const imW_world = (imW_mm / 1000) * scale;
                const imH_world = (imH_mm / 1000) * scale;
                const imX_world = -W / 2 + ((imX_mm + imW_mm / 2) / 1000) * scale;
                const imY_world = H / 2 - ((imY_mm + imH_mm / 2) / 1000) * scale;

                box(imW_world, imH_world, d, frameMat, imX_world, imY_world, 0);
            });

            // 2) Kataklar (shisha va ochiladigan stvorkalar) chizish
            out.cells.forEach(c => {
                const cw = (c.box.w / 1000) * scale;
                const ch = (c.box.h / 1000) * scale;
                const cx = -W / 2 + ((c.box.x + c.box.w / 2) / 1000) * scale;
                const cy = H / 2 - ((c.box.y + c.box.h / 2) / 1000) * scale;

                const leftShift = (c.box.x === 0) ? f : 0;
                const rightShift = (Math.abs((c.box.x + c.box.w) - dW) < 1) ? f : 0;
                const topShift = (c.box.y === 0) ? f : 0;
                const bottomShift = (Math.abs((c.box.y + c.box.h) - dH) < 1) ? f : 0;

                const iw = cw - leftShift - rightShift;
                const ih = ch - topShift - bottomShift;
                const icx = cx + (leftShift - rightShift) / 2;
                const icy = cy - (topShift - bottomShift) / 2;

                if (c.opening && c.opening !== 'kar') {
                    // Sash (Stvorka) frame and glass
                    const gap_w = (SASH_GAP / 1000) * scale;
                    const sw = iw - gap_w * 2;
                    const sh = ih - gap_w * 2;
                    const sf = impF;
                    const zf = d * 0.35; // slightly forward in Z

                    // Sash profiles
                    box(sf, sh, d * 0.8, frameMat, icx - sw / 2 + sf / 2, icy, zf); // left
                    box(sf, sh, d * 0.8, frameMat, icx + sw / 2 - sf / 2, icy, zf); // right
                    box(sw, sf, d * 0.8, frameMat, icx, icy + sh / 2 - sf / 2, zf); // top
                    box(sw, sf, d * 0.8, frameMat, icx, icy - sh / 2 + sf / 2, zf); // bottom

                    // Glass inside sash
                    const sash_glass_w = sw - sf * 2;
                    const sash_glass_h = sh - sf * 2;
                    box(sash_glass_w, sash_glass_h, d * 0.25, glassMat, icx, icy, zf);

                    // Hinge Lines
                    const ot = c.opening || 'kasement_chap';
                    const L = icx - sw / 2, R = icx + sw / 2, T = icy + sh / 2, B = icy - sh / 2, zs = zf + d * 0.55;
                    const casL = () => { line(L, T, R, icy, zs); line(L, B, R, icy, zs); }; // hinge left
                    const casR = () => { line(R, T, L, icy, zs); line(R, B, L, icy, zs); }; // hinge right
                    const tilt = () => { line(L, B, icx, T, zs); line(R, B, icx, T, zs); }; // tilt top
                    if (ot === 'kasement_chap') casL();
                    else if (ot === 'kasement_ong') casR();
                    else if (ot === 'tilt') tilt();
                    else if (ot === 'tilt_turn') { casL(); tilt(); }
                } else {
                    // Fixed (Kar) glass
                    box(iw * 0.99, ih * 0.99, d * 0.25, glassMat, icx, icy, 0);
                }
            });

            controls.target.set(0, 0, 0);
            camera.position.set(W * 0.5 + 1.5, H * 0.25, 5);
            controls.update();
            return;
        }

        const innerW = W - 2 * f;
        const innerH = rectH - 2 * f;
        const innerLeft = -W / 2 + f;
        const innerBottom = -H / 2 + f;

        // Eshik: pastki 38% panel, tepasi shisha
        let glassBottom = innerBottom;
        let glassH = innerH;
        if (type === 'eshik') {
            const panelH = innerH * 0.38;
            box(innerW, panelH, d * 0.7, panelMat, 0, innerBottom + panelH / 2, 0);
            glassBottom = innerBottom + panelH;
            glassH = innerH - panelH;
            // ruchka
            box(f * 0.35, H * 0.14, d * 1.6, handleMat, W / 2 - f - f * 0.4, 0, 0);
        }

        // Shisha (rect qism paneli)
        box(innerW * 0.99, glassH * 0.99, d * 0.25, glassMat, 0, glassBottom + glassH / 2, 0);

        // Impostlar (bo'linmalar)
        const vDiv = Math.max(0, Math.min(6, parseInt(params.vDiv) || 0));
        const hDiv = Math.max(0, Math.min(6, parseInt(params.hDiv) || 0));
        for (let i = 1; i <= vDiv; i++) {
            const x = innerLeft + (innerW * i) / (vDiv + 1);
            box(impF, glassH, d, frameMat, x, glassBottom + glassH / 2, 0);
        }
        for (let j = 1; j <= hDiv; j++) {
            const y = glassBottom + (glassH * j) / (hDiv + 1);
            box(innerW, impF, d, frameMat, 0, y, 0);
        }

        // Stvorka (ochiladigan ramkalar) — oyna oldida
        const stv = Math.max(0, Math.min(4, parseInt(params.stvorka) || 0));
        if (stv > 0) {
            const gap = f * 0.18;
            const sashW = innerW / stv;
            const sf = impF;
            const zf = d * 0.4;
            for (let s = 0; s < stv; s++) {
                const cx = innerLeft + sashW * s + sashW / 2;
                const sw = sashW - gap * 2;
                const sh = glassH - gap * 2;
                const cy = glassBottom + glassH / 2;
                box(sf, sh, d * 0.8, frameMat, cx - sw / 2 + sf / 2, cy, zf);
                box(sf, sh, d * 0.8, frameMat, cx + sw / 2 - sf / 2, cy, zf);
                box(sw, sf, d * 0.8, frameMat, cx, cy + sh / 2 - sf / 2, zf);
                box(sw, sf, d * 0.8, frameMat, cx, cy - sh / 2 + sf / 2, zf);

                // Ochilish belgisi (kasement diagonal / tilt uchburchak)
                const ot = params.openType || 'kasement_chap';
                const L = cx - sw / 2, R = cx + sw / 2, T = cy + sh / 2, B = cy - sh / 2, zs = zf + d * 0.6;
                const casL = () => { line(L, T, R, cy, zs); line(L, B, R, cy, zs); }; // hinge chapda
                const casR = () => { line(R, T, L, cy, zs); line(R, B, L, cy, zs); }; // hinge o'ngda
                const tilt = () => { line(L, B, cx, T, zs); line(R, B, cx, T, zs); }; // tepaga qiya
                if (ot === 'kasement_chap') casL();
                else if (ot === 'kasement_ong') casR();
                else if (ot === 'tilt') tilt();
                else if (ot === 'tilt_turn') { casL(); tilt(); }
            }
        }

        // Fortochka: tepa-chap katakda kichik forточка ramkasi
        if (type === 'rom_fortochka') {
            const fw = innerW * 0.4, fh = glassH * 0.32;
            const cx = innerLeft + fw / 2 + f * 0.2;
            const cy = glassBottom + glassH - fh / 2 - f * 0.2;
            box(impF, fh, d * 1.1, frameMat, cx - fw / 2, cy, d * 0.2);
            box(impF, fh, d * 1.1, frameMat, cx + fw / 2, cy, d * 0.2);
            box(fw, impF, d * 1.1, frameMat, cx, cy + fh / 2, d * 0.2);
            box(fw, impF, d * 1.1, frameMat, cx, cy - fh / 2, d * 0.2);
        }

        controls.target.set(0, 0, 0);
        camera.position.set(W * 0.5 + 1.5, H * 0.25, 5);
        controls.update();
    }

    function resize() {
        const w = canvas.clientWidth || 400;
        const h = canvas.clientHeight || 300;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    let running = true;
    function loop() {
        if (!running) return;
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(loop);
    }
    resize();
    window.addEventListener('resize', resize);
    loop();

    return { update, resize, dispose() { running = false; renderer.dispose(); } };
}
