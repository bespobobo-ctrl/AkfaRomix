// Korxonaning "ontologiya" xaritasi — Palantir Foundry uslubidagi izometrik diagramma.
// Har bir bo'lim tekis, sodda ikonka-shaklidagi 3D obyekt sifatida platformada turadi,
// nuqtali chiziqlar bilan markazga bog'langan. AI qaysi bo'lim haqida gapirsa — o'sha
// obyekt va bog'lovchi chiziq yashil rangda yonadi (ovozga ham reaksiya bilan), qolganlari xira turadi.
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

const ACCENT = 0x4caf7d;
const NEUTRAL = 0xe4e2f1;
const NEUTRAL_2 = 0xf4f3fa;
const DIM = 0x9a97b3;

function mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.75, metalness: 0.05, transparent: true, opacity: 1, ...opts });
}

function ring(radius) {
    return new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.08, 0.1, 24), mat(NEUTRAL_2));
}

function buildIcon(key) {
    const group = new THREE.Group();
    const accent = mat(ACCENT);
    switch (key) {
        case 'umumiy': {
            const base = ring(0.55); base.position.y = 0.05; group.add(base);
            const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.95, 8), accent);
            tower.position.y = 0.1 + 0.475; group.add(tower);
            const cap = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.28, 8), accent);
            cap.position.y = 0.1 + 0.95 + 0.14; group.add(cap);
            group.userData.accent = [tower, cap];
            break;
        }
        case 'sotuv': {
            const base = ring(0.5); base.position.y = 0.05; group.add(base);
            const shop = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.5, 0.5), accent);
            shop.position.y = 0.1 + 0.25; group.add(shop);
            const roof = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.3, 4), accent.clone());
            roof.rotation.y = Math.PI / 4; roof.position.y = 0.1 + 0.5 + 0.15; group.add(roof);
            group.userData.accent = [shop, roof];
            break;
        }
        case 'ombor': {
            const base = ring(0.56); base.position.y = 0.05; group.add(base);
            const box = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.4, 0.5), accent);
            box.position.y = 0.1 + 0.2; group.add(box);
            const roofL = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.56), accent.clone());
            roofL.position.set(-0.18, 0.1 + 0.4 + 0.16, 0); roofL.rotation.z = 0.35; group.add(roofL);
            const roofR = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.56), accent.clone());
            roofR.position.set(0.18, 0.1 + 0.4 + 0.16, 0); roofR.rotation.z = -0.35; group.add(roofR);
            group.userData.accent = [box, roofL, roofR];
            break;
        }
        case 'ishlab': {
            const base = ring(0.5); base.position.y = 0.05; group.add(base);
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.42, 10), accent);
            post.position.y = 0.1 + 0.21; group.add(post);
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), accent.clone());
            arm.position.set(0.2, 0.1 + 0.44, 0); group.add(arm);
            const claw = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), mat(NEUTRAL_2));
            claw.position.set(0.42, 0.1 + 0.44, 0); group.add(claw);
            group.userData.accent = [post, arm];
            break;
        }
        case 'xodimlar': {
            const base = ring(0.46); base.position.y = 0.05; group.add(base);
            const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.34, 4, 10), accent);
            body.position.y = 0.1 + 0.17 + 0.17; group.add(body);
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 14), mat(NEUTRAL_2));
            head.position.y = 0.1 + 0.34 + 0.17 + 0.15; group.add(head);
            group.userData.accent = [body];
            break;
        }
        case 'buxgalteriya': {
            const base = ring(0.54); base.position.y = 0.05; group.add(base);
            const bank = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.46, 0.5), accent);
            bank.position.y = 0.1 + 0.23; group.add(bank);
            const coin = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.045, 10, 22), mat(NEUTRAL_2));
            coin.rotation.x = Math.PI / 2; coin.position.y = 0.1 + 0.46 + 0.16; group.add(coin);
            group.userData.accent = [bank];
            break;
        }
    }
    return group;
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

function makeLabelSprite(text, { bg = 'rgba(255,255,255,0.94)', fg = '#2a2a33', height = 0.32 } = {}) {
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
    roundRectPath(ctx, 0, 0, w, h, h / 2);
    ctx.fillStyle = bg; ctx.fill();
    ctx.font = '700 26px Inter, sans-serif';
    ctx.fillStyle = fg;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, padX, h / 2 + 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(material);
    const aspect = w / h;
    sprite.scale.set(height * aspect, height, 1);
    sprite.renderOrder = 10;
    return sprite;
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

        this.scene = new THREE.Scene();
        const viewSize = 5.6;
        this.camera = new THREE.OrthographicCamera(-viewSize / 2, viewSize / 2, viewSize / 2, -viewSize / 2, 0.1, 100);
        this.camera.position.set(5.2, 4.6, 5.2);
        this.camera.lookAt(0, 0.3, 0);

        // Platforma (kvadrat plita)
        const platform = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.16, 4, 1), mat(0xf1f0f8, { roughness: 0.95 }));
        platform.rotation.y = Math.PI / 4;
        platform.position.y = -0.08;
        this.scene.add(platform);

        this.nodes = {};
        this.connections = {};
        Object.entries(DEPARTMENTS).forEach(([key, d]) => {
            const group = buildIcon(key);
            group.position.set(...d.pos);
            this.scene.add(group);

            const label = makeLabelSprite(d.label, { height: 0.26 });
            label.position.set(d.pos[0], 1.55, d.pos[2]);
            this.scene.add(label);

            this.nodes[key] = {
                group, label, accent: group.userData.accent || [],
                phase: Math.random() * 10, curScale: key === 'umumiy' ? 1 : 1, curEmissive: 0
            };

            if (key !== 'umumiy') {
                const hubPos = new THREE.Vector3(...DEPARTMENTS.umumiy.pos).setY(0.03);
                const pts = [hubPos, new THREE.Vector3(...d.pos).setY(0.03)];
                const geom = new THREE.BufferGeometry().setFromPoints(pts);
                const lmat = new THREE.LineDashedMaterial({ color: DIM, dashSize: 0.09, gapSize: 0.07, transparent: true, opacity: 0.3 });
                const line = new THREE.Line(geom, lmat);
                line.computeLineDistances();
                this.scene.add(line);
                this.connections[key] = { line, mat: lmat };
            }
        });

        this.verbSprite = null;

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
        const key1 = new THREE.DirectionalLight(0xffffff, 0.55);
        key1.position.set(4, 6, 3);
        this.scene.add(key1);
        const fill = new THREE.DirectionalLight(0x4caf7d, 0.15);
        fill.position.set(-3, 2, -3);
        this.scene.add(fill);

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
            this.verbSprite = makeLabelSprite(def.verb, { bg: 'rgba(76,175,125,0.95)', fg: '#ffffff', height: 0.24 });
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
            const bob = Math.sin(t * (isActive ? speed * 1.3 : 0.5) + n.phase) * (isActive ? 0.05 + this.level * 0.04 : 0.015);
            n.group.position.y = bob;

            const targetScale = isActive ? 1.15 + this.level * 0.08 : 1;
            n.curScale += (targetScale - n.curScale) * 0.08;
            n.group.scale.setScalar(n.curScale);

            const targetEmissive = isActive ? 0.55 + this.level * 0.7 : 0.05;
            n.curEmissive += (targetEmissive - n.curEmissive) * 0.09;
            n.accent.forEach(mesh => {
                mesh.material.emissive = mesh.material.emissive || new THREE.Color(ACCENT);
                mesh.material.emissive.set(ACCENT);
                mesh.material.emissiveIntensity = n.curEmissive;
                mesh.material.opacity = isActive ? 1 : 0.55;
            });

            n.label.material.opacity += ((isActive ? 1 : 0.55) - n.label.material.opacity) * 0.1;
        });

        Object.entries(this.connections).forEach(([key, c]) => {
            const isActive = key === this.activeDept;
            c.mat.opacity += ((isActive ? 0.9 : 0.28) - c.mat.opacity) * 0.1;
            c.mat.color.lerp(new THREE.Color(isActive ? ACCENT : DIM), 0.08);
        });

        if (this.verbSprite) {
            this.verbSprite.material.opacity = 0.85 + Math.sin(t * 2) * 0.15;
        }

        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        this._running = false;
        this._resizeObserver.disconnect();
        this.renderer.dispose();
    }
}
