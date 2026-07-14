// Korxonaning 3D "xaritasi" — har bir bo'lim alohida tugun. AI qaysi bo'lim haqida
// ma'lumot olayotgan bo'lsa, kamera o'sha tugunga fokus qiladi va u "jonlanadi"
// (real ovoz balandligiga reaksiya bilan); qolganlari sokin, xira turadi.
import * as THREE from 'three';

export const DEPARTMENTS = {
    umumiy: { label: 'Umumiy holat', color: 0x3987e5, pos: [0, 0.3, 0] },
    sotuv: { label: 'Sotuv', color: 0xc9a668, pos: [1.9, 1.05, -0.3] },
    ombor: { label: 'Ombor', color: 0x4caf7d, pos: [-1.9, 1.05, -0.3] },
    ishlab: { label: 'Ishlab chiqarish', color: 0x9d7cc9, pos: [1.9, -0.95, -0.7] },
    xodimlar: { label: 'Xodimlar', color: 0xc0605f, pos: [-1.9, -0.95, -0.7] },
    buxgalteriya: { label: "Buxgalteriya", color: 0xeda100, pos: [0, -1.9, -1.0] }
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

const STATE_PARAMS = {
    idle: { baseAmp: 0.025, speed: 0.18 },
    listening: { baseAmp: 0.045, speed: 0.55 },
    thinking: { baseAmp: 0.075, speed: 1.5 },
    speaking: { baseAmp: 0.1, speed: 0.9 }
};

function pseudoNoise(x, y, z, t) {
    return (
        Math.sin(x * 2.1 + t * 0.6) +
        Math.sin(y * 2.3 + t * 0.5) +
        Math.sin(z * 1.9 + t * 0.7) +
        Math.sin((x + y + z) * 1.3 + t * 0.9)
    ) / 4;
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
        this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
        this.cameraDefaultPos = new THREE.Vector3(0, 0.4, 7.6);
        this.camera.position.copy(this.cameraDefaultPos);
        this.cameraTarget = new THREE.Vector3(0, 0, 0);

        this.nodes = {};
        Object.entries(DEPARTMENTS).forEach(([key, d]) => {
            const isHub = key === 'umumiy';
            const geometry = new THREE.IcosahedronGeometry(isHub ? 1 : 0.6, isHub ? 3 : 1);
            const orig = new Float32Array(geometry.attributes.position.array);
            const material = new THREE.MeshStandardMaterial({
                color: d.color, emissive: d.color, emissiveIntensity: 0.22,
                metalness: 0.32, roughness: 0.4, transparent: true, opacity: 0.92
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(...d.pos);
            this.scene.add(mesh);

            if (!isHub) {
                const hubPos = new THREE.Vector3(...DEPARTMENTS.umumiy.pos);
                const lineGeom = new THREE.BufferGeometry().setFromPoints([hubPos, new THREE.Vector3(...d.pos)]);
                const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 });
                this.scene.add(new THREE.Line(lineGeom, lineMat));
            }

            this.nodes[key] = { mesh, orig, pulsePhase: Math.random() * 10, curEmissive: 0.22, curScale: isHub ? 1 : 0.85 };
        });

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
        const key1 = new THREE.PointLight(0xffffff, 1.3, 24);
        key1.position.set(3, 3, 6);
        this.scene.add(key1);
        const rim = new THREE.PointLight(0xc9a668, 0.6, 24);
        rim.position.set(-3, -2, -3);
        this.scene.add(rim);

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
        if (this.onDeptChange) this.onDeptChange(deptKey, DEPARTMENTS[deptKey].label);
    }

    setState(state) { if (STATE_PARAMS[state]) this.state = state; }
    feedLevel(rms) { this.targetLevel = Math.min(1, Math.max(0, rms * 6)); }

    _onResize() {
        const size = Math.min(this.canvas.clientWidth, this.canvas.clientHeight) || 240;
        this.renderer.setSize(size, size, false);
        this.camera.aspect = 1;
        this.camera.updateProjectionMatrix();
    }

    _tick() {
        if (!this._running) return;
        requestAnimationFrame(() => this._tick());

        const t = this.clock.getElapsedTime();
        this.level += (this.targetLevel - this.level) * 0.18;
        this.targetLevel *= 0.88;

        const activeDef = DEPARTMENTS[this.activeDept];
        const activePos = new THREE.Vector3(...activeDef.pos);
        const desiredCamPos = this.activeDept === 'umumiy'
            ? this.cameraDefaultPos
            : new THREE.Vector3(activePos.x * 0.75, activePos.y * 0.75 + 0.5, activePos.z + 4.6);
        this.camera.position.lerp(desiredCamPos, 0.035);
        this.cameraTarget.lerp(activePos, 0.05);
        this.camera.lookAt(this.cameraTarget);

        Object.entries(this.nodes).forEach(([key, n]) => {
            const isActive = key === this.activeDept;
            const isHub = key === 'umumiy';
            const params = isActive ? (STATE_PARAMS[this.state] || STATE_PARAMS.idle) : STATE_PARAMS.idle;
            const amp = isActive ? params.baseAmp + this.level * 0.4 : 0.018;
            const speed = isActive ? params.speed : 0.1;

            const positions = n.mesh.geometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
                const ox = n.orig[i * 3], oy = n.orig[i * 3 + 1], oz = n.orig[i * 3 + 2];
                const noise = pseudoNoise(ox, oy, oz, t * speed + n.pulsePhase);
                const scale = 1 + noise * amp;
                positions.setXYZ(i, ox * scale, oy * scale, oz * scale);
            }
            positions.needsUpdate = true;
            n.mesh.geometry.computeVertexNormals();
            n.mesh.rotation.y += isActive ? 0.006 : 0.0012;
            n.mesh.rotation.x += isActive ? 0.002 : 0;

            const targetEmissive = isActive ? 0.55 + this.level * 0.6 : (isHub ? 0.2 : 0.14);
            n.curEmissive += (targetEmissive - n.curEmissive) * 0.08;
            n.mesh.material.emissiveIntensity = n.curEmissive;

            const targetScale = isActive ? 1 + this.level * 0.1 : (isHub ? 0.9 : 0.8);
            n.curScale += (targetScale - n.curScale) * 0.06;
            n.mesh.scale.setScalar(n.curScale);

            n.mesh.material.opacity = isActive ? 0.95 : 0.55;
        });

        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        this._running = false;
        this._resizeObserver.disconnect();
        this.renderer.dispose();
    }
}
