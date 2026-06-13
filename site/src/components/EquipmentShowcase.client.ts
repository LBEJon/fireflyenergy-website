import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface ShowcaseOptions {
  /** Texture URLs (transparent PNGs). */
  inverterSrc?: string;
  batterySrc?: string;
  /** World height the inverter card is scaled to; the battery is matched proportionally. */
  cardHeight?: number;
  /** Auto-turntable speed in radians/second. */
  autoRotateSpeed?: number;
}

const DEFAULTS = {
  inverterSrc: '/assets/equipment/inverter-12kw.png',
  batterySrc: '/assets/equipment/battery-16kwh.png',
  cardHeight: 3.0,
  autoRotateSpeed: 0.28,
};

/**
 * Build a self-contained Three.js "turntable" of the two equipment renders on
 * upright textured cards over a soft ground shadow. Returns a dispose() fn that
 * tears down every GPU resource, the RAF loop and the ResizeObserver.
 */
export function initShowcase(
  canvas: HTMLCanvasElement,
  opts: ShowcaseOptions = {}
): () => void {
  const o = { ...DEFAULTS, ...opts };
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const parent = canvas.parentElement ?? canvas;
  const initialW = parent.clientWidth || 640;
  const initialH = parent.clientHeight || 460;

  // ---- Renderer (transparent so the paper section shows through) ----
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(initialW, initialH, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // ---- Scene + camera ----
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, initialW / initialH, 0.1, 100);
  camera.position.set(0, 1.4, 9.2);
  camera.lookAt(0, 0.7, 0);

  // ---- Lighting: soft ambient + a warm key for a premium read ----
  const ambient = new THREE.AmbientLight(0xffffff, 1.05);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xfff4e2, 1.15); // warm key
  key.position.set(3.5, 6, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd9ffa6, 0.35); // faint lime rim
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  // ---- The rotating group ----
  const group = new THREE.Group();
  scene.add(group);

  // Track disposables for a clean teardown.
  const textures: THREE.Texture[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const loader = new THREE.TextureLoader();

  /** Build an upright, double-sided textured card sized to the texture aspect. */
  function makeCard(src: string, x: number, z: number): void {
    const tex = loader.load(src, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const img = t.image as { width: number; height: number };
      const aspect = img && img.width ? img.width / img.height : 0.6;
      const h = o.cardHeight;
      const w = h * aspect;
      const geo = new THREE.PlaneGeometry(w, h);
      geometries.push(geo);
      const mat = new THREE.MeshBasicMaterial({
        map: t,
        transparent: true,
        alphaTest: 0.05, // trim soft halos around the cut-out PNG
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      });
      materials.push(mat);
      const mesh = new THREE.Mesh(geo, mat);
      // Cards stand on the ground plane (y=0): lift by half-height.
      mesh.position.set(x, h / 2, z);
      group.add(mesh);
    });
    textures.push(tex);
  }

  // Inverter slightly left/forward, battery right/back — a gentle stagger in depth.
  makeCard(o.inverterSrc, -1.55, 0.45);
  makeCard(o.batterySrc, 1.7, -0.5);

  // ---- Soft contact shadow on a subtle ground ----
  const groundGeo = new THREE.CircleGeometry(4.4, 48);
  geometries.push(groundGeo);
  const groundMat = new THREE.MeshBasicMaterial({
    color: 0x2a2d34,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });
  materials.push(groundMat);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.001;
  group.add(ground);

  // ---- Controls: drag-to-rotate only (no zoom/pan), never flips ----
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.8, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.rotateSpeed = 0.7;
  controls.minPolarAngle = Math.PI * 0.30; // never look from below…
  controls.maxPolarAngle = Math.PI * 0.58; // …or flip over the top
  controls.update();

  // Pause the turntable while the user is dragging; resume shortly after.
  let userInteracting = false;
  let resumeTimer = 0;
  const onStart = () => {
    userInteracting = true;
    if (resumeTimer) window.clearTimeout(resumeTimer);
  };
  const onEnd = () => {
    resumeTimer = window.setTimeout(() => {
      userInteracting = false;
    }, 1200);
  };
  controls.addEventListener('start', onStart);
  controls.addEventListener('end', onEnd);

  // ---- Resize handling on the canvas's parent ----
  function resize(): void {
    const w = parent.clientWidth || initialW;
    const h = parent.clientHeight || initialH;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(parent);

  // ---- Render loop ----
  let raf = 0;
  let last = performance.now();
  let disposed = false;

  function tick(now: number): void {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    // Slow auto-turntable unless reduced-motion or the user is dragging.
    if (!reduceMotion && !userInteracting) {
      group.rotation.y += o.autoRotateSpeed * dt;
    }
    controls.update();
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(tick);

  // ---- Cleanup ----
  return function dispose(): void {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    if (resumeTimer) window.clearTimeout(resumeTimer);
    ro.disconnect();
    controls.removeEventListener('start', onStart);
    controls.removeEventListener('end', onEnd);
    controls.dispose();
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    for (const t of textures) t.dispose();
    renderer.dispose();
  };
}
