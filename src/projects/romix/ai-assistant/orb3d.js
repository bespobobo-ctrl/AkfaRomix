// Yordamchining 3D "yuzi" — holatga (tinglash/o'ylash/gapirish) va real ovoz balandligiga
// qarab shakli va rangi o'zgaradigan, doimiy aylanib turadigan shar.
import * as THREE from 'three';

const STATE_PARAMS = {
    idle: { baseAmp: 0.025, speed: 0.18, rotSpeed: 0.05, color: 0x3987e5, emissive: 0.28 },
    listening: { baseAmp: 0.045, speed: 0.55, rotSpeed: 0.16, color: 0x3987e5, emissive: 0.55 },
    thinking: { baseAmp: 0.075, speed: 1.5, rotSpeed: 0.85, color: 0x7c96a8, emissive: 0.5 },
    speaking: { baseAmp: 0.1, speed: 0.9, rotSpeed: 0.22, color: 0xc9a668, emissive: 0.75 }
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
        this._color = new THREE.Color(STATE_PARAMS.idle.color);
        this._targetColor = new THREE.Color(STATE_PARAMS.idle.color);
        this._emissive = STATE_PARAMS.idle.emissive;
        this._targetEmissive = STATE_PARAMS.idle.emissive;

        this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        this.camera.position.set(0, 0, 4.2);

        const geometry = new THREE.IcosahedronGeometry(1, 3);
        this._orig = new Float32Array(geometry.attributes.position.array);

        const material = new THREE.MeshStandardMaterial({
            color: STATE_PARAMS.idle.color,
            emissive: STATE_PARAMS.idle.color,
            emissiveIntensity: STATE_PARAMS.idle.emissive,
            metalness: 0.35,
            roughness: 0.35,
            transparent: true,
            opacity: 0.92
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);

        const wireGeom = new THREE.IcosahedronGeometry(1.012, 2);
        const wireMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.06 });
        this.wireMesh = new THREE.Mesh(wireGeom, wireMat);
        this.scene.add(this.wireMesh);

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
        const key = new THREE.PointLight(0x3987e5, 1.4, 12);
        key.position.set(2.5, 2, 3);
        this.scene.add(key);
        const rim = new THREE.PointLight(0xc9a668, 1.1, 12);
        rim.position.set(-2.5, -1.5, -2);
        this.scene.add(rim);

        this.clock = new THREE.Clock();
        this._resizeObserver = new ResizeObserver(() => this._onResize());
        this._resizeObserver.observe(canvas);
        this._onResize();

        this._running = true;
        this._tick();
    }

    setState(state) {
        if (!STATE_PARAMS[state]) return;
        this.state = state;
        this._targetColor.setHex(STATE_PARAMS[state].color);
        this._targetEmissive = STATE_PARAMS[state].emissive;
    }

    // rms: taxminan 0..0.3 oralig'idagi xom ovoz balandligi (Float32Array RMS)
    feedLevel(rms) {
        this.targetLevel = Math.min(1, Math.max(0, rms * 6));
    }

    _onResize() {
        const size = Math.min(this.canvas.clientWidth, this.canvas.clientHeight) || 200;
        this.renderer.setSize(size, size, false);
        this.camera.aspect = 1;
        this.camera.updateProjectionMatrix();
    }

    _tick() {
        if (!this._running) return;
        requestAnimationFrame(() => this._tick());

        const t = this.clock.getElapsedTime();
        const params = STATE_PARAMS[this.state] || STATE_PARAMS.idle;

        this.level += (this.targetLevel - this.level) * 0.18;
        this.targetLevel *= 0.88;

        const amp = params.baseAmp + this.level * 0.4;
        const positions = this.mesh.geometry.attributes.position;
        const orig = this._orig;
        for (let i = 0; i < positions.count; i++) {
            const ox = orig[i * 3], oy = orig[i * 3 + 1], oz = orig[i * 3 + 2];
            const n = pseudoNoise(ox, oy, oz, t * params.speed);
            const scale = 1 + n * amp;
            positions.setXYZ(i, ox * scale, oy * scale, oz * scale);
        }
        positions.needsUpdate = true;
        this.mesh.geometry.computeVertexNormals();

        this.mesh.rotation.y += 0.0025 + params.rotSpeed * 0.01;
        this.mesh.rotation.x += 0.0012;
        this.wireMesh.rotation.copy(this.mesh.rotation);
        this.wireMesh.scale.setScalar(1 + this.level * 0.06);

        this._color.lerp(this._targetColor, 0.06);
        this._emissive += (this._targetEmissive - this._emissive) * 0.06;
        this.mesh.material.color.copy(this._color);
        this.mesh.material.emissive.copy(this._color);
        this.mesh.material.emissiveIntensity = this._emissive + this.level * 0.5;

        const s = 1 + this.level * 0.08;
        this.mesh.scale.setScalar(s);

        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        this._running = false;
        this._resizeObserver.disconnect();
        this.renderer.dispose();
    }
}
