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

    let modelGroup = new THREE.Group();
    scene.add(modelGroup);

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

    // params: { type, width(m), height(m), vDiv, hDiv }
    function update(params) {
        clearGroup();
        const type = params.type || 'rom';
        if (!['rom', 'rom_fortochka', 'eshik'].includes(type)) {
            // 3D yo'q turlar uchun bo'sh (chaqiruvchi placeholder ko'rsatadi)
            renderer.render(scene, camera);
            return;
        }

        // Metrни dunyo birligiga solamiz (kattaligi ~3.2 ga normallashtiramiz)
        let W = Math.max(0.3, params.width || 1.5);
        let H = Math.max(0.3, params.height || 2.0);
        const maxDim = Math.max(W, H);
        const scale = 3.2 / maxDim;
        W *= scale; H *= scale;

        const f = Math.max(0.08, 0.06 * scale);  // profil eni (~60mm)
        const d = Math.max(0.06, 0.05 * scale);  // profil chuqurligi
        const impF = f * 0.75;                   // impost eni

        // Tashqi ramka (4 profil)
        box(f, H, d, frameMat, -W / 2 + f / 2, 0, 0);      // chap
        box(f, H, d, frameMat, W / 2 - f / 2, 0, 0);       // o'ng
        box(W - 2 * f, f, d, frameMat, 0, H / 2 - f / 2, 0); // tepa
        box(W - 2 * f, f, d, frameMat, 0, -H / 2 + f / 2, 0);// past

        const innerW = W - 2 * f;
        const innerH = H - 2 * f;
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

        // Shisha (bitta panel, orqaroqda)
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
