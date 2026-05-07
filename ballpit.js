import * as THREE from 'https://cdn.skypack.dev/three@0.150.1';
import { RoomEnvironment } from 'https://cdn.skypack.dev/three@0.150.1/examples/jsm/environments/RoomEnvironment.js';

class X {
    #config;
    #resizeObserver;
    #intersectionObserver;
    #resizeTimer;
    #animationFrameId = 0;
    #clock = new THREE.Clock();
    #animationState = { elapsed: 0, delta: 0 };
    #isAnimating = false;
    #isVisible = false;
    
    constructor(config) {
        this.#config = config;
        this.canvas = this.#config.canvas;
        this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            powerPreference: "high-performance",
            alpha: true,
            antialias: true,
            ...this.#config.rendererOptions,
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.size = { width: 0, height: 0, wWidth: 0, wHeight: 0, ratio: 0, pixelRatio: 0 };
        this.onBeforeRender = () => {};
        this.onAfterResize = () => {};
        this.#initObservers();
        this.resize();
    }
    
    #initObservers() {
        const parentEl = this.#config.size === "parent" ? this.canvas.parentNode : null;
        if(parentEl) {
            this.#resizeObserver = new ResizeObserver(() => this.#onResize());
            this.#resizeObserver.observe(parentEl);
        } else {
            window.addEventListener("resize", () => this.#onResize());
        }
        this.#intersectionObserver = new IntersectionObserver((e) => this.#onIntersection(e), { threshold: 0 });
        this.#intersectionObserver.observe(this.canvas);
        document.addEventListener("visibilitychange", () => this.#onVisibilityChange());
    }
    
    #onResize() { 
        if (this.#resizeTimer) clearTimeout(this.#resizeTimer); 
        this.#resizeTimer = setTimeout(() => this.resize(), 100); 
    }
    
    resize() {
        const parentEl = this.#config.size === "parent" ? this.canvas.parentNode : null;
        const w = parentEl ? parentEl.offsetWidth : window.innerWidth;
        const h = parentEl ? parentEl.offsetHeight : window.innerHeight;
        this.size.width = w; this.size.height = h; this.size.ratio = w / h;
        this.camera.aspect = this.size.ratio; this.camera.updateProjectionMatrix();
        const fovRad = (this.camera.fov * Math.PI) / 180;
        this.size.wHeight = 2 * Math.tan(fovRad / 2) * this.camera.position.z; 
        this.size.wWidth = this.size.wHeight * this.camera.aspect;
        this.renderer.setSize(w, h); 
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.onAfterResize(this.size);
    }
    
    #onIntersection(e) { 
        this.#isAnimating = e[0].isIntersecting; 
        this.#isAnimating ? this.#startAnimation() : this.#stopAnimation(); 
    }
    
    #onVisibilityChange() { 
        if (this.#isAnimating) document.hidden ? this.#stopAnimation() : this.#startAnimation(); 
    }
    
    #startAnimation() { 
        if (this.#isVisible) return; 
        this.#isVisible = true; 
        this.#clock.start(); 
        const f = () => { 
            this.#animationFrameId = requestAnimationFrame(f); 
            this.#animationState.delta = this.#clock.getDelta(); 
            this.#animationState.elapsed += this.#animationState.delta; 
            this.onBeforeRender(this.#animationState); 
            this.renderer.render(this.scene, this.camera); 
        }; 
        f(); 
    }
    
    #stopAnimation() { 
        if (this.#isVisible) { 
            cancelAnimationFrame(this.#animationFrameId); 
            this.#isVisible = false; 
            this.#clock.stop(); 
        } 
    }
    
    dispose() { 
        this.#stopAnimation(); 
        this.#resizeObserver?.disconnect(); 
        this.#intersectionObserver?.disconnect(); 
        this.scene.clear(); 
        this.renderer.dispose(); 
    }
}

class W {
    constructor(config) {
        this.config = config;
        this.positionData = new Float32Array(3 * config.count);
        this.velocityData = new Float32Array(3 * config.count);
        this.sizeData = new Float32Array(config.count);
        this.center = new THREE.Vector3();
        this.#initializePositions(); 
        this.setSizes();
    }
    #initializePositions() { 
        const { count, maxX, maxY, maxZ } = this.config; 
        this.center.toArray(this.positionData, 0); 
        for (let i = 1; i < count; i++) { 
            const idx = 3 * i; 
            this.positionData[idx] = THREE.MathUtils.randFloatSpread(2 * maxX); 
            this.positionData[idx + 1] = THREE.MathUtils.randFloatSpread(2 * maxY); 
            this.positionData[idx + 2] = THREE.MathUtils.randFloatSpread(2 * maxZ); 
        } 
    }
    setSizes() { 
        const { count, size0, minSize, maxSize } = this.config; 
        this.sizeData[0] = size0; 
        for (let i = 1; i < count; i++) this.sizeData[i] = THREE.MathUtils.randFloat(minSize, maxSize); 
    }
    update(deltaInfo) {
        const { config, center, positionData, sizeData, velocityData } = this;
        const startIdx = config.controlSphere0 ? 1 : 0;
        if (config.controlSphere0) { 
            const p0 = new THREE.Vector3().fromArray(positionData, 0);
            p0.lerp(center, 0.1).toArray(positionData, 0); 
        }
        for (let i = startIdx; i < config.count; i++) {
            const base = 3 * i;
            const pos = new THREE.Vector3().fromArray(positionData, base); 
            const vel = new THREE.Vector3().fromArray(velocityData, base);
            vel.y -= deltaInfo.delta * config.gravity * sizeData[i]; 
            vel.multiplyScalar(config.friction); 
            vel.clampLength(0, config.maxVelocity); 
            pos.add(vel);
            for (let j = i + 1; j < config.count; j++) { 
                const otherBase = 3 * j; 
                const otherPos = new THREE.Vector3().fromArray(positionData, otherBase); 
                const diff = new THREE.Vector3().subVectors(otherPos, pos); 
                const dist = diff.length(); 
                const sumRadius = sizeData[i] + sizeData[j]; 
                if (dist < sumRadius) { 
                    const overlap = (sumRadius - dist) * 0.5; 
                    diff.normalize(); 
                    pos.addScaledVector(diff, -overlap); 
                    otherPos.addScaledVector(diff, overlap); 
                    pos.toArray(positionData, base); 
                    otherPos.toArray(positionData, otherBase); 
                } 
            }
            if (Math.abs(pos.x) + sizeData[i] > config.maxX) { pos.x = Math.sign(pos.x) * (config.maxX - sizeData[i]); vel.x *= -config.wallBounce; }
            if (pos.y - sizeData[i] < -config.maxY) { pos.y = -config.maxY + sizeData[i]; vel.y *= -config.wallBounce; }
            if (Math.abs(pos.z) + sizeData[i] > config.maxZ) { pos.z = Math.sign(pos.z) * (config.maxZ - sizeData[i]); vel.z *= -config.wallBounce; }
            pos.toArray(positionData, base); vel.toArray(velocityData, base);
        }
    }
}

const U = new THREE.Object3D();
class Z extends THREE.InstancedMesh {
    constructor(renderer, params) {
        const pmrem = new THREE.PMREMGenerator(renderer); 
        const envTexture = pmrem.fromScene(new RoomEnvironment(renderer)).texture; 
        pmrem.dispose();
        const geometry = new THREE.SphereGeometry(1, 24, 24);
        const material = new THREE.MeshPhysicalMaterial({ 
            envMap: envTexture, 
            metalness: 0.7, 
            roughness: 0.3, 
            clearcoat: 1, 
            clearcoatRoughness: 0.2,
            ...params.materialParams 
        });
        super(geometry, material, params.count);
        this.config = params; 
        this.physics = new W(this.config);
        this.ambientLight = new THREE.AmbientLight(0xffffff, params.ambientIntensity); 
        this.add(this.ambientLight);
        this.light = new THREE.PointLight(0xffffff, params.lightIntensity, 100, 1); 
        this.add(this.light);
        this.setColors(this.config.colors);
    }
    setColors(colors) {
        if (!Array.isArray(colors) || !colors.length) return;
        const colorObjs = colors.map(c => new THREE.Color(c));
        for (let i = 0; i < this.count; i++) this.setColorAt(i, colorObjs[i % colorObjs.length]);
        if (this.instanceColor) this.instanceColor.needsUpdate = true;
    }
    update(deltaInfo) {
        this.physics.update(deltaInfo);
        for (let i = 0; i < this.count; i++) {
            U.position.fromArray(this.physics.positionData, 3 * i);
            U.scale.setScalar(this.physics.sizeData[i]);
            U.updateMatrix();
            this.setMatrixAt(i, U.matrix);
        }
        this.instanceMatrix.needsUpdate = true;
        if (this.config.controlSphere0) this.light.position.fromArray(this.physics.positionData, 0);
    }
}

const pointer = new THREE.Vector2();
window.addEventListener("pointermove", (e) => {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
});

export function initBallpit(canvasId, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const config = {
        count: 100,
        minSize: 0.3, maxSize: 0.8, size0: 1.0,
        gravity: 0.4, friction: 0.995, wallBounce: 0.2, maxVelocity: 0.1,
        maxX: 10, maxY: 10, maxZ: 10,
        controlSphere0: true, followCursor: true,
        lightIntensity: 3, ambientIntensity: 1.5,
        colors: colors || ["#229d60", "#e8fdf0", "#4ade80"],
        canvas: canvas,
        size: "parent"
    };

    const three = new X(config);
    three.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    three.camera.position.set(0, 0, 20);

    const spheres = new Z(three.renderer, config);
    three.scene.add(spheres);

    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectionPoint = new THREE.Vector3();

    three.onBeforeRender = (deltaInfo) => {
        if (config.followCursor) {
            raycaster.setFromCamera(pointer, three.camera);
            if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
                spheres.physics.center.copy(intersectionPoint);
            }
        }
        spheres.update(deltaInfo);
    };
    
    three.onAfterResize = (size) => {
        spheres.physics.config.maxX = size.wWidth / 2;
        spheres.physics.config.maxY = size.wHeight / 2;
        spheres.physics.config.maxZ = size.wWidth / 4;
    };

    return three;
}
