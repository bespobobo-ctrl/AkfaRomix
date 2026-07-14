// Korxonaning "ontologiya" xaritasi — Palantir Foundry uslubidagi izometrik diagramma.
// Har bir bo'lim TEKIS ikonka-disk ("puck") sifatida platformada turadi, nuqtali chiziqlar
// bilan markazga bog'langan — ilovaning o'zidagi qorong'i-shisha + oltin (dark glass + gold)
// dizayn tiliga mos. AI qaysi bo'lim haqida gapirsa — o'sha disk oltin nur bilan yonadi
// (ovozga ham reaksiya bilan), qolganlari xira turadi.
import * as THREE from 'three';

export const DEPARTMENTS = {
    umumiy: { label: 'Umumiy', pos: [0, 0, 0], verb: null },
    sotuv: { label: 'Sotuv', pos: [2.15, 0, -1.25], verb: "Buyurtma beradi" },
    ombor: { label: 'Ombor', pos: [2.15, 0, 1.25], verb: 'Materialni tortadi' },
    ishlab: { label: 'Ishlab chiqarish', pos: [0, 0, 2.5], verb: 'Ishlab chiqaradi' },
    xodimlar: { label: 'Xodimlar', pos: [-2.15, 0, 1.25], verb: 'Bajaradi' },
    buxgalteriya: { label: "Buxgalteriya", pos: [-2.15, 0, -1.25], verb: 'Sarflaydi/to\'laydi' }
};

const TOOL_DEPARTMENT = {
    umumiy_holat: 'umumiy', eslatmalar: 'umumiy', anomaliyalar: 'umumiy',
    zakazlar: 'sotuv', zakaz_qidirish: 'sotuv', mijoz_360: 'sotuv', buyurtma_hayot_yoli: 'sotuv', top_mijozlar: 'sotuv',
    ombor: 'ombor', mahsulot_qidirish: 'ombor', ombor_harakati: 'ombor',
    ishlab_chiqarish_holati: 'ishlab', brigadalar_tarkibi: 'ishlab', material_sorovlari: 'ishlab',
    xodimlar: 'xodimlar', xodim_qidirish: 'xodimlar', xodim_360: 'xodimlar',
    harajatlar: 'buxgalteriya', qarzlar: 'buxgalteriya', tendentsiya_tahlili: 'buxgalteriya', excel_hisobot: 'buxgalteriya',
    harajat_qoshish: 'buxgalteriya', tolov_qoshish: 'buxgalteriya', tasdiqlash: 'buxgalteriya'
};
export function departmentForTool(name) { return TOOL_DEPARTMENT[name] || 'umumiy'; }

const STATE_SPEED = { idle: 0.5, listening: 1, thinking: 2.2, speaking: 1.4 };

// Ilovaning o'z CSS palitrasi bilan bir xil (style.css: --accent, --bg-dark, --text-main, --border-light)
const ACCENT = 0xc9a668;
const GLASS = 0x1b1d24;
const GLASS_TOP = 0x22242c;
const DIM = 0x5a5c66;

function mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({ color, flatShading: false, roughness: 0.4, metalness: 0.15, transparent: true, opacity: 1, ...opts });
}

// Yumshoq, xira "soya" doirasi — obyektni platformaga "tortib" turadi.
function makeGradientBlob(radius, colorRgb, opacity, falloff = 0.7) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${colorRgb},${opacity})`);
    grad.addColorStop(falloff, `rgba(${colorRgb},${opacity * 0.45})`);
    grad.addColorStop(1, `rgba(${colorRgb},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), material);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
}

// Dumaloq burchakli tekis shakl (platforma uchun).
function roundedRectShape(w, h, r) {
    const shape = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    return shape;
}

// --- Minimal chiziqli ikonkalar (Feather/Lucide uslubida), har biri 100x100 kanvasda ---
const ICON_DRAW = {
    umumiy(ctx) {
        ctx.beginPath(); ctx.arc(50, 50, 9, 0, Math.PI * 2); ctx.stroke();
        [[50, 22], [78, 50], [50, 78], [22, 50]].forEach(([x, y]) => {
            ctx.beginPath(); ctx.moveTo(50, 50); ctx.lineTo(x, y); ctx.stroke();
            ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.stroke();
        });
    },
    sotuv(ctx) {
        ctx.beginPath(); ctx.arc(50, 40, 12, Math.PI, 0); ctx.stroke();
        roundRectPath(ctx, 28, 38, 44, 38, 8); ctx.stroke();
    },
    ombor(ctx) {
        roundRectPath(ctx, 26, 30, 48, 44, 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(26, 46); ctx.lineTo(74, 46); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(50, 30); ctx.lineTo(50, 46); ctx.stroke();
    },
    ishlab(ctx) {
        ctx.beginPath(); ctx.arc(50, 50, 16, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const x1 = 50 + Math.cos(a) * 22, y1 = 50 + Math.sin(a) * 22;
            const x2 = 50 + Math.cos(a) * 29, y2 = 50 + Math.sin(a) * 29;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(50, 50, 5, 0, Math.PI * 2); ctx.stroke();
    },
    xodimlar(ctx) {
        ctx.beginPath(); ctx.arc(50, 34, 12, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(50, 88, 26, Math.PI, 0, true); ctx.stroke();
    },
    buxgalteriya(ctx) {
        ctx.beginPath(); ctx.arc(50, 50, 23, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(41, 62); ctx.bezierCurveTo(41, 56, 59, 56, 59, 50); ctx.bezierCurveTo(59, 44, 41, 44, 41, 38);
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(50, 34); ctx.lineTo(50, 66); ctx.stroke();
    }
};

function makeIconTexture(key, { active }) {
    const scale = 3;
    const size = 100 * scale;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6.5;
    ctx.strokeStyle = active ? '#2a2107' : 'rgba(238,240,242,0.82)';
    (ICON_DRAW[key] || ICON_DRAW.umumiy)(ctx);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function makeLabelSprite(text, { bg = 'rgba(17,18,22,0.88)', fg = '#eef0f2', border = 'rgba(255,255,255,0.12)', height = 0.3 } = {}) {
    const scale = 3;
    const measure = document.createElement('canvas').getContext('2d');
    measure.font = '700 26px Inter, sans-serif';
    const textW = measure.measureText(text).width;
    const padX = 18, h = 48;
    const w = textW + padX * 2;
    const canvas = document.createElement('canvas');
    canvas.width = w * scale; canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    roundRectPath(ctx, 1, 1, w - 2, h - 2, h / 2);
    ctx.fillStyle = bg; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = border; ctx.stroke();
    ctx.font = '700 26px Inter, sans-serif';
    ctx.fillStyle = fg;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, padX, h / 2 + 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(material);
    const aspect = w / h;
    sprite.scale.set(height * aspect, height, 1);
    sprite.renderOrder = 10;
    return sprite;
}

// Bitta bo'lim — tekis "puck" (shisha disk) + ustida tekis ikonka.
function buildNode(key, radius) {
    const group = new THREE.Group();
    const puckHeight = 0.14;

    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, puckHeight, 40),
        mat(GLASS, { roughness: 0.5, metalness: 0.1, opacity: 0.96 })
    );
    body.position.y = puckHeight / 2;
    group.add(body);

    const rim = new THREE.Mesh(
        new THREE.TorusGeometry(radius - 0.01, 0.012, 8, 40),
        mat(0x3a3d47, { roughness: 0.3, metalness: 0.3, opacity: 0.9 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = puckHeight + 0.001;
    group.add(rim);

    const inactiveTex = makeIconTexture(key, { active: false });
    const activeTex = makeIconTexture(key, { active: true });
    const topMat = new THREE.MeshStandardMaterial({
        map: inactiveTex, color: GLASS_TOP, roughness: 0.42, metalness: 0.08,
        transparent: true, emissive: new THREE.Color(ACCENT), emissiveIntensity: 0
    });
    const top = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.99, 40), topMat);
    top.rotation.x = -Math.PI / 2;
    top.position.y = puckHeight + 0.002;
    group.add(top);

    group.userData.body = body;
    group.userData.top = top;
    group.userData.rim = rim;
    group.userData.inactiveTex = inactiveTex;
    group.userData.activeTex = activeTex;
    return group;
}

export class Orb3D {
    constructor(canvas) {
        this.canvas = canvas;
        this.state = 'idle';
        this.level = 0;
        this.targetLevel = 0;
        this.activeDept = 'umumiy';
        this.onDeptChange = null;

        this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.scene = new THREE.Scene();
        const viewSize = 5.6;
        this.camera = new THREE.OrthographicCamera(-viewSize / 2, viewSize / 2, viewSize / 2, -viewSize / 2, 0.1, 100);
        this.camera.position.set(5.2, 4.6, 5.2);
        this.camera.lookAt(0, 0.3, 0);

        // Yumshoq oltin nur — ilovaning --accent-glow rangiga mos, sahnani "asosga tortadi"
        const backdrop = makeGradientBlob(7, '201,166,104', 0.16, 0.55);
        backdrop.position.y = -1.05;
        backdrop.scale.set(1, 1, 1);
        this.scene.add(backdrop);

        // Platforma — dumaloq burchakli qorong'i shisha plita (ilova kartochkalari bilan bir xil til)
        const platformShape = roundedRectShape(6.2, 6.2, 1.1);
        const platformGeom = new THREE.ExtrudeGeometry(platformShape, {
            depth: 0.2, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 6, curveSegments: 12
        });
        platformGeom.rotateX(-Math.PI / 2);
        platformGeom.translate(0, -0.22, 0);
        const platform = new THREE.Mesh(platformGeom, mat(0x14161b, { roughness: 0.4, metalness: 0.2, opacity: 0.94 }));
        platform.rotation.y = Math.PI / 4;
        this.scene.add(platform);

        this.nodes = {};
        this.connections = {};
        Object.entries(DEPARTMENTS).forEach(([key, d]) => {
            const radius = key === 'umumiy' ? 0.62 : 0.5;
            const group = buildNode(key, radius);
            group.position.set(...d.pos);
            this.scene.add(group);

            const shadow = makeGradientBlob(radius * 1.5, '0,0,0', 0.4, 0.6);
            shadow.position.set(d.pos[0], 0.004, d.pos[2]);
            this.scene.add(shadow);

            const glow = makeGradientBlob(radius * 2.4, '201,166,104', 0);
            glow.position.set(d.pos[0], 0.006, d.pos[2]);
            this.scene.add(glow);

            const label = makeLabelSprite(d.label, { height: 0.26 });
            label.position.set(d.pos[0], 1.5, d.pos[2]);
            this.scene.add(label);

            this.nodes[key] = {
                group, label, glow,
                body: group.userData.body, top: group.userData.top, rim: group.userData.rim,
                inactiveTex: group.userData.inactiveTex, activeTex: group.userData.activeTex,
                phase: Math.random() * 10, curScale: 1, curActive: 0
            };

            if (key !== 'umumiy') {
                const hubPos = new THREE.Vector3(...DEPARTMENTS.umumiy.pos).setY(0.03);
                const pts = [hubPos, new THREE.Vector3(...d.pos).setY(0.03)];
                const geom = new THREE.BufferGeometry().setFromPoints(pts);
                const lmat = new THREE.LineDashedMaterial({ color: DIM, dashSize: 0.09, gapSize: 0.07, transparent: true, opacity: 0.35 });
                const line = new THREE.Line(geom, lmat);
                line.computeLineDistances();
                this.scene.add(line);
                this.connections[key] = { line, mat: lmat };
            }
        });

        this.verbSprite = null;

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
        const key1 = new THREE.DirectionalLight(0xffffff, 0.5);
        key1.position.set(4, 6, 3);
        this.scene.add(key1);
        const fill = new THREE.DirectionalLight(0xc9a668, 0.22);
        fill.position.set(-3, 2, -3);
        this.scene.add(fill);
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
        rimLight.position.set(-2, 3, 5);
        this.scene.add(rimLight);

        this.clock = new THREE.Clock();
        this._resizeObserver = new ResizeObserver(() => this._onResize());
        this._resizeObserver.observe(canvas);
        this._onResize();

        this._running = true;
        this._tick();
    }

    focus(deptKey) {
        if (!this.nodes[deptKey] || deptKey === this.activeDept) return;
        this.activeDept = deptKey;
        const def = DEPARTMENTS[deptKey];

        if (this.verbSprite) { this.scene.remove(this.verbSprite); this.verbSprite = null; }
        if (def.verb) {
            const mid = new THREE.Vector3(...DEPARTMENTS.umumiy.pos).add(new THREE.Vector3(...def.pos)).multiplyScalar(0.5);
            mid.y = 0.85;
            this.verbSprite = makeLabelSprite(def.verb, { bg: '#c9a668', fg: '#1a1408', border: 'rgba(255,255,255,0.25)', height: 0.24 });
            this.verbSprite.position.copy(mid);
            this.scene.add(this.verbSprite);
        }
        if (this.onDeptChange) this.onDeptChange(deptKey, def.label);
    }

    setState(state) { if (STATE_SPEED[state]) this.state = state; }
    feedLevel(rms) { this.targetLevel = Math.min(1, Math.max(0, rms * 6)); }

    _onResize() {
        const size = Math.min(this.canvas.clientWidth, this.canvas.clientHeight) || 260;
        this.renderer.setSize(size, size, false);
    }

    _tick() {
        if (!this._running) return;
        requestAnimationFrame(() => this._tick());

        const t = this.clock.getElapsedTime();
        this.level += (this.targetLevel - this.level) * 0.18;
        this.targetLevel *= 0.88;
        const speed = STATE_SPEED[this.state] || 0.5;

        Object.entries(this.nodes).forEach(([key, n]) => {
            const isActive = key === this.activeDept;
            const bob = Math.sin(t * (isActive ? speed * 1.3 : 0.5) + n.phase) * (isActive ? 0.04 + this.level * 0.03 : 0.012);
            n.group.position.y = bob;

            const targetScale = isActive ? 1.1 + this.level * 0.06 : 1;
            n.curScale += (targetScale - n.curScale) * 0.08;
            n.group.scale.set(n.curScale, 1, n.curScale);

            const targetActive = isActive ? 0.55 + this.level * 0.45 : 0;
            const wasBelowHalf = n.curActive < 0.5;
            n.curActive += (targetActive - n.curActive) * 0.1;
            const nowAboveHalf = n.curActive >= 0.5;
            if (wasBelowHalf !== nowAboveHalf) {
                n.top.material.map = nowAboveHalf ? n.activeTex : n.inactiveTex;
                n.top.material.needsUpdate = true;
            }

            n.body.material.emissive = n.body.material.emissive || new THREE.Color(ACCENT);
            n.body.material.emissive.set(ACCENT);
            n.body.material.emissiveIntensity = n.curActive * 0.35;
            n.top.material.emissiveIntensity = n.curActive * 0.5;
            n.rim.material.color.set(isActive ? ACCENT : 0x3a3d47);
            n.rim.material.opacity = 0.4 + n.curActive * 0.6;

            n.glow.material.opacity += ((isActive ? 0.5 + this.level * 0.3 : 0) - n.glow.material.opacity) * 0.1;

            n.label.material.opacity += ((isActive ? 1 : 0.6) - n.label.material.opacity) * 0.1;
        });

        Object.entries(this.connections).forEach(([key, c]) => {
            const isActive = key === this.activeDept;
            c.mat.opacity += ((isActive ? 0.9 : 0.3) - c.mat.opacity) * 0.1;
            c.mat.color.lerp(new THREE.Color(isActive ? ACCENT : DIM), 0.08);
        });

        if (this.verbSprite) {
            this.verbSprite.material.opacity = 0.9 + Math.sin(t * 2) * 0.1;
        }

        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        this._running = false;
        this._resizeObserver.disconnect();
        this.renderer.dispose();
    }
}
