// ═══════════════════════════════════════════════════════════
//  AKFA Romix — Premium 3D Rom / Eshik ko'rinishi (Three.js)
//  Jonli 3D model, shisha paketlar, metall tutqichlar (ruchka),
//  oshqovoqlar (hinges) va silliq ochilib-yopilish animatsiyasi.
// ═══════════════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const FRAME_COLOR = 0x222a35;   // Premium Anthracite Grey (Matte)
const GLASS_COLOR = 0x8ecae6;   // Glassmorphic Light Blue
const PANEL_COLOR = 0x2c3540;   // Eshik pastki panel rangi
const HANDLE_COLOR = 0xe5e7eb;  // Chrome metal tutqichlar

export function createViewer(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(2.8, 1.8, 5.5);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 2.5;
    controls.maxDistance = 12;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 1.0;

    // Premium Yorug'lik tizimi (Specular highlight va chuqurlik uchun)
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.25);
    dirLight1.position.set(5, 8, 7);
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0xbfd8ff, 0.45);
    dirLight2.position.set(-6, 3, -4);
    scene.add(dirLight2);

    // Premium Materiallar
    const frameMat = new THREE.MeshStandardMaterial({ 
        color: FRAME_COLOR, 
        roughness: 0.42, 
        metalness: 0.28 
    });
    const glassMat = new THREE.MeshStandardMaterial({ 
        color: GLASS_COLOR, 
        roughness: 0.03, 
        metalness: 0.15, 
        transparent: true, 
        opacity: 0.26 
    });
    const panelMat = new THREE.MeshStandardMaterial({ 
        color: PANEL_COLOR, 
        roughness: 0.65, 
        metalness: 0.1 
    });
    const handleMat = new THREE.MeshStandardMaterial({ 
        color: HANDLE_COLOR, 
        roughness: 0.12, 
        metalness: 0.9 
    });
    const spacerMat = new THREE.MeshStandardMaterial({ 
        color: 0x1f2937, 
        roughness: 0.65, 
        metalness: 0.2 
    });
    const gasketMat = new THREE.MeshStandardMaterial({ 
        color: 0x111827, 
        roughness: 0.9, 
        metalness: 0.05 
    }); // EPDM Qora rezina zichlagich

    const symMat = new THREE.LineBasicMaterial({ color: 0x00d2ff }); // Ochilish chiziqlari (neon ko'k)

    let modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // Silliq animatsiya o'zgaruvchilari
    let sashGroups = [];
    let currentOpenRatio = 0.0;
    let targetOpenRatio = 0.0;
    let lastParams = null; // Qayta rang o'zgarganda ishlatish uchun

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
        sashGroups = [];
    }

    function box(w, h, d, mat, x = 0, y = 0, z = 0) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z);
        modelGroup.add(m);
        return m;
    }

    // Billboarding 3D matn sprayti yaratish (CAD o'lchamlari uchun)
    function createTextSprite(text) {
        const canvasSprite = document.createElement('canvas');
        canvasSprite.width = 128;
        canvasSprite.height = 32;
        const ctx = canvasSprite.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, 128, 32);
        ctx.font = 'bold 20px Inter, Arial, sans-serif';
        ctx.fillStyle = '#00d2ff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 64, 16);
        
        const texture = new THREE.CanvasTexture(canvasSprite);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(0.48, 0.12, 1);
        return sprite;
    }

    // Soft Shadow gradient texture yaratish
    function createShadowTexture() {
        const size = 128;
        const canvasShadow = document.createElement('canvas');
        canvasShadow.width = size;
        canvasShadow.height = size;
        const ctx = canvasShadow.getContext('2d');
        const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        return new THREE.CanvasTexture(canvasShadow);
    }

    // params: { type, width(m), height(m), vDiv, hDiv, design, arch }
    function update(params) {
        lastParams = params;
        clearGroup();
        const type = params.type || 'rom';
        if (!['rom', 'rom_fortochka', 'eshik'].includes(type)) {
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

        // Arka (yarim doira tepa)
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
            // Arka ramkasi
            const R = W / 2;
            const segs = 28;
            for (let i = 0; i < segs; i++) {
                const a = Math.PI * (i + 0.5) / segs;
                const seg = new THREE.Mesh(new THREE.BoxGeometry(Math.PI * R / segs * 1.2, f, d), frameMat);
                seg.position.set(R * Math.cos(a), springY + archRise * Math.sin(a), 0);
                seg.rotation.z = a - Math.PI / 2;
                modelGroup.add(seg);
            }
            // Arka shishasi (Double glazing & spacer)
            const gdOuter = new THREE.Mesh(new THREE.CircleGeometry(R - f, 40, 0, Math.PI), glassMat);
            gdOuter.position.set(0, springY, -d * 0.08);
            modelGroup.add(gdOuter);
            const gdInner = new THREE.Mesh(new THREE.CircleGeometry(R - f, 40, 0, Math.PI), glassMat);
            gdInner.position.set(0, springY, d * 0.08);
            modelGroup.add(gdInner);
            const gdSpacer = new THREE.Mesh(new THREE.CircleGeometry(R - f - sf * 0.06, 40, 0, Math.PI), spacerMat);
            gdSpacer.position.set(0, springY, 0);
            modelGroup.add(gdSpacer);
        }

        // Shared Sash (Stvorka) builder with open angle, handle, and cylinder hinges
        function addSash(cx, cy, sw, sh, sf, zf, ot) {
            const group = new THREE.Group();
            
            function groupBox(w_b, h_b, d_b, mat, lx, ly, lz) {
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(w_b, h_b, d_b), mat);
                mesh.position.set(lx, ly, lz);
                group.add(mesh);
            }
            
            let rotationAxis = '';
            let rotationVal = 0;
            let groupX = cx;
            let groupY = cy;
            
            const isLeftHinge = ot === 'casement_chap' || ot === 'casement_l' || ot === 'tilt_turn' || ot === 'tilt_turn_l';
            const isRightHinge = ot === 'casement_ong' || ot === 'casement_r' || ot === 'tilt_turn_r';
            const isTiltTop = ot === 'tilt';
            const isTiltBottom = ot === 'tilt_bottom';
            
            const glassW_loc = isLeftHinge ? sw / 2 : (isRightHinge ? -sw / 2 : 0);
            const glassY_loc = isTiltTop ? sh / 2 : (isTiltBottom ? -sh / 2 : 0);
            
            const B = (isTiltTop) ? 0 : ((isTiltBottom) ? -sh : -sh/2);
            
            // Black Rubber Gasket behind the sash (EPDM seam seal)
            groupBox(sw + sf * 0.12, sh + sf * 0.12, d * 0.15, gasketMat, glassW_loc, glassY_loc, -d * 0.45);

            if (isLeftHinge) {
                groupX = cx - sw / 2;
                groupBox(sf, sh, d * 0.8, frameMat, sf / 2, 0, 0); // chap
                groupBox(sf, sh, d * 0.8, frameMat, sw - sf / 2, 0, 0); // o'ng
                groupBox(sw, sf, d * 0.8, frameMat, sw / 2, sh / 2 - sf / 2, 0); // tepa
                groupBox(sw, sf, d * 0.8, frameMat, sw / 2, -sh / 2 + sf / 2, 0); // past
                
                // Cylinder Hinges (Oshiq-moshiqlar) on front face
                groupBox(sf * 0.22, sh * 0.08, sf * 0.22, handleMat, -sf * 0.12, sh * 0.35, d * 0.45);
                groupBox(sf * 0.22, sh * 0.08, sf * 0.22, handleMat, -sf * 0.12, -sh * 0.35, d * 0.45);
                
                rotationAxis = 'y';
                rotationVal = 0.7; // Swing outward
            } else if (isRightHinge) {
                groupX = cx + sw / 2;
                groupBox(sf, sh, d * 0.8, frameMat, -sf / 2, 0, 0); // o'ng
                groupBox(sf, sh, d * 0.8, frameMat, -sw + sf / 2, 0, 0); // chap
                groupBox(sw, sf, d * 0.8, frameMat, -sw / 2, sh / 2 - sf / 2, 0); // tepa
                groupBox(sw, sf, d * 0.8, frameMat, -sw / 2, -sh / 2 + sf / 2, 0); // past
                
                // Cylinder Hinges
                groupBox(sf * 0.22, sh * 0.08, sf * 0.22, handleMat, sf * 0.12, sh * 0.35, d * 0.45);
                groupBox(sf * 0.22, sh * 0.08, sf * 0.22, handleMat, sf * 0.12, -sh * 0.35, d * 0.45);
                
                rotationAxis = 'y';
                rotationVal = -0.7; // Swing outward
            } else if (isTiltTop) {
                groupY = cy - sh / 2;
                groupBox(sw, sf, d * 0.8, frameMat, 0, sf / 2, 0); // past
                groupBox(sw, sf, d * 0.8, frameMat, 0, sh - sf / 2, 0); // tepa
                groupBox(sf, sh, d * 0.8, frameMat, -sw / 2 + sf / 2, sh / 2, 0); // chap
                groupBox(sf, sh, d * 0.8, frameMat, sw / 2 - sf / 2, sh / 2, 0); // o'ng
                
                // Cylinder Hinges (bottom-left and bottom-right on front face)
                groupBox(sw * 0.08, sf * 0.22, sf * 0.22, handleMat, -sw * 0.35, sf * 0.12, d * 0.45);
                groupBox(sw * 0.08, sf * 0.22, sf * 0.22, handleMat, sw * 0.35, sf * 0.12, d * 0.45);
                
                rotationAxis = 'x';
                rotationVal = -0.22; // Tilt outward
            } else if (isTiltBottom) {
                groupY = cy + sh / 2;
                groupBox(sw, sf, d * 0.8, frameMat, 0, -sf / 2, 0); // tepa
                groupBox(sw, sf, d * 0.8, frameMat, 0, -sh + sf / 2, 0); // past
                groupBox(sf, sh, d * 0.8, frameMat, -sw / 2 + sf / 2, -sh / 2, 0); // chap
                groupBox(sf, sh, d * 0.8, frameMat, sw / 2 - sf / 2, -sh / 2, 0); // o'ng
                
                // Cylinder Hinges (top-left and top-right on front face)
                groupBox(sw * 0.08, sf * 0.22, sf * 0.22, handleMat, -sw * 0.35, -sf * 0.12, d * 0.45);
                groupBox(sw * 0.08, sf * 0.22, sf * 0.22, handleMat, sw * 0.35, -sf * 0.12, d * 0.45);
                
                rotationAxis = 'x';
                rotationVal = 0.22; // Tilt outward
            } else {
                // Fixed/fallback
                groupBox(sf, sh, d * 0.8, frameMat, 0, 0, 0);
                groupBox(sf, sh, d * 0.8, frameMat, 0, 0, 0);
                groupBox(sw, sf, d * 0.8, frameMat, 0, 0, 0);
                groupBox(sw, sf, d * 0.8, frameMat, 0, 0, 0);
            }

            // Eshik yoki Deraza to'ldiruvchisini chizish (Panel yoki Shisha)
            if (type === 'eshik') {
                const panelH = sh * 0.38;
                // Eshik sendvich paneli
                groupBox(sw - sf * 2, panelH - sf * 0.5, d * 0.7, panelMat, glassW_loc, B + panelH / 2 + sf / 2, 0);
                
                // Tepasidagi shisha va zichlagich (EPDM rubber)
                const gcy = B + panelH + (sh - panelH) / 2;
                const gh = sh - panelH - sf;
                
                groupBox(sw - sf * 2, gh, d * 0.05, glassMat, glassW_loc, gcy, -d * 0.08);
                groupBox(sw - sf * 2, gh, d * 0.05, glassMat, glassW_loc, gcy, d * 0.08);
                groupBox(sw - sf * 2 - sf * 0.06, gh - sf * 0.06, d * 0.11, spacerMat, glassW_loc, gcy, 0);
                
                // Glass rubber gasket (EPDM)
                groupBox(sw - sf * 2 + sf * 0.12, gh + sf * 0.12, d * 0.03, gasketMat, glassW_loc, gcy, -d * 0.09);
                groupBox(sw - sf * 2 + sf * 0.12, gh + sf * 0.12, d * 0.03, gasketMat, glassW_loc, gcy, d * 0.09);
                
                // Premium Eshik tutqichi (Chrome cylindrical bar handle)
                const hx = isLeftHinge ? sw - sf * 0.8 : -sw + sf * 0.8;
                const hy = 0;
                groupBox(sf * 0.2, sh * 0.35, d * 0.1, handleMat, hx, hy, d * 0.6);
                groupBox(sf * 0.1, sf * 0.1, d * 0.5, handleMat, hx, hy + sh * 0.12, d * 0.35);
                groupBox(sf * 0.1, sf * 0.1, d * 0.5, handleMat, hx, hy - sh * 0.12, d * 0.35);
            } else {
                // Deraza shishasi (Double glazing, spacer & glass gaskets)
                const gw = sw - sf * 2;
                const gh = sh - sf * 2;
                groupBox(gw, gh, d * 0.05, glassMat, glassW_loc, glassY_loc, -d * 0.08);
                groupBox(gw, gh, d * 0.05, glassMat, glassW_loc, glassY_loc, d * 0.08);
                groupBox(gw - sf * 0.06, gh - sf * 0.06, d * 0.11, spacerMat, glassW_loc, glassY_loc, 0);
                
                // Glass rubber gasket (EPDM)
                groupBox(gw + sf * 0.15, gh + sf * 0.15, d * 0.03, gasketMat, glassW_loc, glassY_loc, -d * 0.09);
                groupBox(gw + sf * 0.15, gh + sf * 0.15, d * 0.03, gasketMat, glassW_loc, glassY_loc, d * 0.09);

                // L-shaklidagi deraza tutqichi (Ruchka)
                let hx = 0, hy = 0;
                let showHandle = true;
                if (isLeftHinge) {
                    hx = sw - sf * 0.7; hy = 0;
                } else if (isRightHinge) {
                    hx = -sw + sf * 0.7; hy = 0;
                } else if (isTiltTop) {
                    hx = 0; hy = sh - sf * 0.7;
                } else if (isTiltBottom) {
                    hx = 0; hy = -sh + sf * 0.7;
                } else {
                    showHandle = false;
                }

                if (showHandle) {
                    const hz = d * 0.45;
                    groupBox(sf * 0.32, sf * 0.55, d * 0.25, handleMat, hx, hy, hz);
                    groupBox(sf * 0.14, sf * 0.14, d * 0.5, handleMat, hx, hy, hz + d * 0.2);
                    groupBox(sf * 0.14, sf * 0.9, sf * 0.25, handleMat, hx, hy - sf * 0.35, hz + d * 0.45);
                }
            }

            group.position.set(groupX, groupY, zf);
            
            if (rotationAxis === 'y') {
                group.rotation.y = rotationVal * currentOpenRatio;
            } else if (rotationAxis === 'x') {
                group.rotation.x = rotationVal * currentOpenRatio;
            }
            
            modelGroup.add(group);
            
            sashGroups.push({
                group: group,
                rotationAxis: rotationAxis,
                maxRotationVal: rotationVal
            });
            
            // Hinge diagonal indicator lines
            const L = isLeftHinge ? 0 : (isRightHinge ? -sw : -sw/2);
            const R = isLeftHinge ? sw : (isRightHinge ? 0 : sw/2);
            const T = (isTiltTop) ? sh : ((isTiltBottom) ? 0 : sh/2);
            const B_line = (isTiltTop) ? 0 : ((isTiltBottom) ? -sh : -sh/2);
            const midY = (isTiltTop || isTiltBottom) ? sh/2 : 0;
            const zs = d * 0.55;
            
            const lineLocal = (lx1, ly1, lx2, ly2) => {
                const g = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(lx1, ly1, zs), new THREE.Vector3(lx2, ly2, zs)
                ]);
                group.add(new THREE.Line(g, symMat));
            };
            
            if (isLeftHinge) {
                lineLocal(L, T, R, midY);
                lineLocal(L, B_line, R, midY);
            } else if (isRightHinge) {
                lineLocal(R, T, L, midY);
                lineLocal(R, B_line, L, midY);
            } else if (isTiltTop) {
                lineLocal(L, B_line, 0, T);
                lineLocal(R, B_line, 0, T);
            } else if (isTiltBottom) {
                lineLocal(L, T, 0, B_line);
                lineLocal(R, T, 0, B_line);
            }
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

            // 2) Kataklar chizish
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

                // Eshik ochiladigan bo'lishini ta'minlash (Faqat bitta katak bo'lsa, uni avtomatik ochiladigan qilamiz.
                // Agar 2 ga bo'lingan bo'lsa, foydalanuvchi tanlagan 'kar' (oynak) yoki boshqa ochilishlarni hurmat qilamiz.)
                const isSingleCell = out.cells.length === 1;
                if (type === 'eshik' && isSingleCell && (!c.opening || c.opening === 'kar')) {
                    c.opening = 'casement_l';
                }

                if (c.opening && c.opening !== 'kar') {
                    const gap_w = (SASH_GAP / 1000) * scale;
                    const sw = iw - gap_w * 2;
                    const sh = ih - gap_w * 2;
                    const sf = impF;
                    const zf = d * 0.35;

                    addSash(icx, icy, sw, sh, sf, zf, c.opening);
                } else {
                    // Fixed (Kar) double glazing unit & spacer
                    box(iw * 0.99, ih * 0.99, d * 0.05, glassMat, icx, icy, -d * 0.08);
                    box(iw * 0.99, ih * 0.99, d * 0.05, glassMat, icx, icy, d * 0.08);
                    box(iw * 0.99 - sf * 0.06, ih * 0.99 - sf * 0.06, d * 0.11, spacerMat, icx, icy, 0);
                    
                    // Glass Gaskets for fixed glass
                    box(iw * 0.99 + sf * 0.15, ih * 0.99 + sf * 0.15, d * 0.03, gasketMat, icx, icy, -d * 0.09);
                    box(iw * 0.99 + sf * 0.15, ih * 0.99 + sf * 0.15, d * 0.03, gasketMat, icx, icy, d * 0.09);
                }
            });
        } else {
            const innerW = W - 2 * f;
            const innerH = rectH - 2 * f;
            const innerLeft = -W / 2 + f;
            const innerBottom = -H / 2 + f;

            if (type === 'eshik') {
                const gap = f * 0.18;
                const sw = innerW - gap * 2;
                const sh = innerH - gap * 2;
                const sf = impF;
                const zf = d * 0.4;
                const cy = innerBottom + innerH / 2;
                addSash(0, cy, sw, sh, sf, zf, params.openType || 'casement_l');
            } else {
                const glassBottom = innerBottom;
                const glassH = innerH;
                // Shisha (Double glazing & spacer)
                box(innerW * 0.99, glassH * 0.99, d * 0.05, glassMat, 0, glassBottom + glassH / 2, -d * 0.08);
                box(innerW * 0.99, glassH * 0.99, d * 0.05, glassMat, 0, glassBottom + glassH / 2, d * 0.08);
                box(innerW * 0.99 - impF * 0.06, glassH * 0.99 - impF * 0.06, d * 0.11, spacerMat, 0, glassBottom + glassH / 2, 0);
                
                // Glass Gaskets for fixed glass
                box(innerW * 0.99 + impF * 0.15, glassH * 0.99 + impF * 0.15, d * 0.03, gasketMat, 0, glassBottom + glassH / 2, -d * 0.09);
                box(innerW * 0.99 + impF * 0.15, glassH * 0.99 + impF * 0.15, d * 0.03, gasketMat, 0, glassBottom + glassH / 2, d * 0.09);

                // Impostlar
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

                // Stvorkalar
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
                        addSash(cx, cy, sw, sh, sf, zf, params.openType || 'kasement_chap');
                    }
                }
            }

            // Fortochka
            if (type === 'rom_fortochka') {
                const fw = innerW * 0.4, fh = glassH * 0.32;
                const cx = innerLeft + fw / 2 + f * 0.2;
                const cy = glassBottom + glassH - fh / 2 - f * 0.2;
                box(impF, fh, d * 1.1, frameMat, cx - fw / 2, cy, d * 0.2);
                box(impF, fh, d * 1.1, frameMat, cx + fw / 2, cy, d * 0.2);
                box(fw, impF, d * 1.1, frameMat, cx, cy + fh / 2, d * 0.2);
                box(fw, impF, d * 1.1, frameMat, cx, cy - fh / 2, d * 0.2);
            }
        }

        // ── Drainage Caps (Drenaj qopqoqlari - front bottom) ──
        box(f * 0.25, f * 0.08, d * 0.08, frameMat, -W / 4, -H / 2 + f / 2, d * 0.52);
        box(f * 0.25, f * 0.08, d * 0.08, frameMat, W / 4, -H / 2 + f / 2, d * 0.52);

        // ── CAD-style 3D O'lchamlari va chiziqlari ──
        const dimOffset = 0.35;
        // Eni o'lchami chizig'i
        const dimY = -H / 2 - dimOffset;
        line(-W / 2, dimY, W / 2, dimY, 0.1);
        line(-W / 2, dimY - 0.05, -W / 2, dimY + 0.05, 0.1);
        line(W / 2, dimY - 0.05, W / 2, dimY + 0.05, 0.1);
        
        // Bo'yi o'lchami chizig'i
        const dimX = -W / 2 - dimOffset;
        line(dimX, -H / 2, dimX, H / 2, 0.1);
        line(dimX - 0.05, -H / 2, dimX + 0.05, -H / 2, 0.1);
        line(dimX - 0.05, H / 2, dimX + 0.05, H / 2, 0.1);
        
        // Millimetrda matn spraytlari (Billboarding)
        const wText = Math.round((params.width || 1.5) * 1000) + ' mm';
        const hText = Math.round((params.height || 2.0) * 1000) + ' mm';
        
        const wSprite = createTextSprite(wText);
        wSprite.position.set(0, dimY - 0.1, 0.15);
        modelGroup.add(wSprite);
        
        const hSprite = createTextSprite(hText);
        hSprite.position.set(dimX - 0.12, 0, 0.15);
        modelGroup.add(hSprite);

        // ── Yumshoq Soya (Soft Shadow Plane) ──
        const shadowTex = createShadowTexture();
        const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.82 });
        const shadow = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.6, 0.4), shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.set(0, -H / 2 - 0.01, 0);
        modelGroup.add(shadow);

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

        // Smooth swing-opening animation
        if (Math.abs(targetOpenRatio - currentOpenRatio) > 0.001) {
            currentOpenRatio += (targetOpenRatio - currentOpenRatio) * 0.09;
            sashGroups.forEach(item => {
                if (item.rotationAxis === 'y') {
                    item.group.rotation.y = item.maxRotationVal * currentOpenRatio;
                } else if (item.rotationAxis === 'x') {
                    item.group.rotation.x = item.maxRotationVal * currentOpenRatio;
                }
            });
        }

        renderer.render(scene, camera);
        requestAnimationFrame(loop);
    }
    resize();
    window.addEventListener('resize', resize);
    loop();

    return { 
        update, 
        resize, 
        setOpenState(isOpen) {
            targetOpenRatio = isOpen ? 1.0 : 0.0;
        },
        setProfileColor(colorKey) {
            let hex = FRAME_COLOR;
            let roughness = 0.42;
            let metalness = 0.28;
            
            if (colorKey === 'white') {
                hex = 0xf3f4f6; roughness = 0.6; metalness = 0.05;
            } else if (colorKey === 'oak') {
                hex = 0x9a3412; roughness = 0.72; metalness = 0.08;
            } else if (colorKey === 'bronze') {
                hex = 0x5c3d2e; roughness = 0.25; metalness = 0.75;
            }
            
            frameMat.color.setHex(hex);
            frameMat.roughness = roughness;
            frameMat.metalness = metalness;
            
            renderer.render(scene, camera);
        },
        resetCamera() {
            controls.reset();
            let W = lastParams ? Math.max(0.3, lastParams.width || 1.5) : 1.5;
            let H = lastParams ? Math.max(0.3, lastParams.height || 2.0) : 2.0;
            const maxDim = Math.max(W, H);
            const scale = 3.2 / maxDim;
            W *= scale; H *= scale;
            
            camera.position.set(W * 0.5 + 1.5, H * 0.25, 5);
            controls.target.set(0, 0, 0);
            controls.update();
            renderer.render(scene, camera);
        },
        dispose() { 
            running = false; 
            renderer.dispose(); 
        } 
    };
}
