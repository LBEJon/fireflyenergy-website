/**
 * Night hero: San Miguel at night. As the visitor scrolls, the grid fails
 * neighborhood by neighborhood (window lights flicker and die), a scattering of
 * homes stay lit, and the camera pushes into the one Firefly home, dissolving to
 * the installed system.
 *
 * ponytail: plain 2D canvas over the real photo, no WebGL. Window lights are
 * procedural dots placed below an auto-detected skyline. Swap for the Higgsfield
 * flyover video when it lands; this file then goes away.
 */

const SRC = '/assets/photos/hero-dusk.webp';
const HOUSE = { x: 0.49, y: 0.553, r: 0.05 }; // the lit house in hero-dusk, normalized
// Neighborhood seeds, in the order they lose power: a sweep from the far city, across the hill, to the foreground.
const SEEDS = [
  [0.12, 0.25], [0.3, 0.27], [0.2, 0.42], [0.42, 0.33], [0.62, 0.22],
  [0.86, 0.15], [0.83, 0.4], [0.65, 0.6], [0.3, 0.62], [0.12, 0.82], [0.55, 0.88], [0.88, 0.8],
];

type Dot = { x: number; y: number; size: number; region: number; offAt: number; survivor: boolean; warm: number };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// Deterministic PRNG so the town looks the same on every visit.
function rng(seed = 7) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

function glowSprite(rgb: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `rgba(255,246,220,1)`);
  grad.addColorStop(0.14, `rgba(${rgb},1)`);
  grad.addColorStop(0.3, `rgba(${rgb},0.3)`);
  grad.addColorStop(0.6, `rgba(${rgb},0.05)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

/** Per-column skyline (normalized y) found by walking down until the smooth sky gradient breaks. */
function findSkyline(img: HTMLImageElement, cols: number): number[] {
  const w = cols, h = Math.round((img.naturalHeight / img.naturalWidth) * cols);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const lum = (x: number, y: number) => { const i = (y * w + x) * 4; return (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; };
  const out: number[] = [];
  for (let x = 0; x < w; x++) {
    let sky = h * 0.6;
    // Two consecutive breaks, so a single star doesn't count as a rooftop.
    for (let y = 4; y < h * 0.6; y++) {
      if (Math.abs(lum(x, y) - lum(x, y - 3)) > 0.05 && Math.abs(lum(x, y + 1) - lum(x, y - 3)) > 0.05) { sky = y; break; }
    }
    out.push(sky / h);
  }
  // Smooth out single-column spikes (cathedral spires, trees).
  return out.map((_, i) => { const s = out.slice(Math.max(0, i - 3), i + 4).sort((a, b) => a - b); return s[s.length >> 1]; });
}

function makeDots(skyline: number[], count: number): Dot[] {
  const rand = rng(11);
  const dots: Dot[] = [];
  const n = SEEDS.length;
  let guard = 0;
  while (dots.length < count && guard++ < count * 10) {
    const x = rand();
    const sky = skyline[Math.min(skyline.length - 1, Math.floor(x * skyline.length))] + 0.008;
    const y = sky + rand() * (1 - sky);
    if (Math.hypot((x - HOUSE.x) * 1.77, y - HOUSE.y) < HOUSE.r * 1.6) continue; // the real lit house stays photographic
    // Thin the far band into a fine city-lights sprinkle, keep the foreground sparse.
    const depth = clamp01((y - sky) / 0.75);
    if (rand() > 0.35 + 0.65 * (1 - depth * 0.7)) continue;
    let region = 0, best = Infinity;
    SEEDS.forEach(([sx, sy], i) => { const dd = Math.hypot((x - sx) * 1.77, y - sy); if (dd < best) { best = dd; region = i; } });
    dots.push({
      x, y,
      size: 0.0006 + depth * 0.0012 + rand() * 0.0005,
      region,
      offAt: 0.1 + (region / n) * 0.4 + rand() * 0.035,
      survivor: rand() < 0.045,
      warm: rand(),
    });
  }
  return dots;
}

export function mountNightHero(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('.nh__canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const stage = root.querySelector<HTMLElement>('.nh__stage')!;
  const copy = root.querySelector<HTMLElement>('.nh__copy');
  const tag = root.querySelector<HTMLElement>('.nh__tag');
  const inside = root.querySelector<HTMLElement>('.nh__inside');
  const insideImg = inside?.querySelector<HTMLImageElement>('img');
  const gridEl = root.querySelector<HTMLElement>('[data-grid]');
  const homeEl = root.querySelector<HTMLElement>('[data-home]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const amber = glowSprite('255,176,72');
  const amberSoft = glowSprite('255,206,140');
  const img = new Image();
  img.decoding = 'async';
  img.src = SRC;

  let dots: Dot[] = [];
  let W = 0, H = 0, dpr = 1;
  let target = reduced ? 0.5 : 0, current = target;
  let visible = true, raf = 0, gridOff = false;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = stage.clientWidth; H = stage.clientHeight;
    canvas!.width = Math.round(W * dpr); canvas!.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function progress() {
    const r = root.getBoundingClientRect();
    const run = r.height - window.innerHeight;
    return run > 0 ? clamp01(-r.top / run) : 0;
  }

  function setStatus(off: boolean) {
    if (off === gridOff || !gridEl || !homeEl) return;
    gridOff = off;
    gridEl.classList.toggle('is-off', off);
    gridEl.lastChild!.textContent = off ? gridEl.dataset.off! : gridEl.dataset.on!;
    homeEl.classList.toggle('is-batt', off);
    homeEl.lastChild!.textContent = off ? homeEl.dataset.batt! : homeEl.dataset.on!;
  }

  function draw(p: number, now: number) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const s = Math.max(W / iw, H / ih);
    const ox = Math.min(0, Math.max(W - iw * s, W / 2 - HOUSE.x * iw * s));
    const oy = Math.min(0, Math.max(H - ih * s, H * 0.5 - HOUSE.y * ih * s));
    const hx0 = ox + HOUSE.x * iw * s, hy0 = oy + HOUSE.y * ih * s;

    // Camera push into the Firefly home.
    const zt = easeOut(smooth(0.56, 0.92, p));
    const z = 1 + zt * 5.5;
    const cx = hx0 + (W / 2 - hx0) * smooth(0.56, 0.8, p);
    const cy = hy0 + (H * 0.48 - hy0) * smooth(0.56, 0.8, p);
    const X = (nx: number) => cx + (ox + nx * iw * s - hx0) * z;
    const Y = (ny: number) => cy + (oy + ny * ih * s - hy0) * z;

    ctx!.globalCompositeOperation = 'source-over';
    ctx!.globalAlpha = 1;
    ctx!.drawImage(img, X(0), Y(0), iw * s * z, ih * s * z);

    // How much of town is dark right now.
    const dark = smooth(0.1, 0.52, p);

    // Grid-on: warm haze over town. Fades as neighborhoods fail.
    ctx!.globalCompositeOperation = 'screen';
    SEEDS.forEach(([sx, sy], i) => {
      const on = 1 - smooth(0.1 + (i / SEEDS.length) * 0.4, 0.14 + (i / SEEDS.length) * 0.4, p);
      if (on <= 0.01) return;
      const r = 0.22 * W * z;
      const g = ctx!.createRadialGradient(X(sx), Y(sy), 0, X(sx), Y(sy), r);
      g.addColorStop(0, `rgba(255,170,80,${0.26 * on})`);
      g.addColorStop(1, 'rgba(255,170,80,0)');
      ctx!.fillStyle = g;
      ctx!.fillRect(X(sx) - r, Y(sy) - r, r * 2, r * 2);
    });

    // Blackout: deepen everything except a soft pool around the Firefly home.
    ctx!.globalCompositeOperation = 'source-over';
    const hr = HOUSE.r * iw * s * z;
    const shade = ctx!.createRadialGradient(X(HOUSE.x), Y(HOUSE.y), hr * 0.9, X(HOUSE.x), Y(HOUSE.y), hr * 3.2);
    shade.addColorStop(0, 'rgba(4,7,16,0)');
    shade.addColorStop(1, `rgba(4,7,16,${0.12 + 0.42 * dark})`);
    ctx!.fillStyle = shade;
    ctx!.fillRect(0, 0, W, H);

    // Window lights.
    ctx!.globalCompositeOperation = 'lighter';
    const unit = iw * s * z;
    for (const d of dots) {
      let a: number;
      if (d.survivor) a = 0.9;
      else {
        const t = p - d.offAt;
        if (t < -0.03) a = 1;
        else if (t < 0) a = 0.85 * (Math.sin(now / 37 + d.x * 900) > 0.1 ? 1 : 0.15); // brownout flicker
        else a = 0;
      }
      if (a <= 0) continue;
      const x = X(d.x), y = Y(d.y);
      if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
      const r = d.size * unit * (d.survivor ? 1.25 : 1);
      ctx!.globalAlpha = Math.min(1, a * (0.7 + d.warm * 0.3));
      ctx!.drawImage(d.warm > 0.5 ? amber : amberSoft, x - r * 3, y - r * 3, r * 6, r * 6);
    }

    // The Firefly home: a faint lime breath once the town is dark.
    if (dark > 0.2) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 900);
      const r = hr * 2.4;
      ctx!.globalCompositeOperation = 'screen';
      ctx!.globalAlpha = 1;
      const g = ctx!.createRadialGradient(X(HOUSE.x), Y(HOUSE.y), 0, X(HOUSE.x), Y(HOUSE.y), r);
      g.addColorStop(0, `rgba(158,213,0,${(0.1 + 0.08 * pulse) * dark * (1 - zt)})`);
      g.addColorStop(1, 'rgba(158,213,0,0)');
      ctx!.fillStyle = g;
      ctx!.fillRect(X(HOUSE.x) - r, Y(HOUSE.y) - r, r * 2, r * 2);
    }
    ctx!.globalCompositeOperation = 'source-over';
    ctx!.globalAlpha = 1;

    // DOM layers riding the same timeline.
    setStatus(p > 0.13);
    if (!reduced) {
      if (copy) {
        const f = smooth(0.5, 0.6, p);
        copy.style.opacity = String(1 - f);
        copy.style.transform = `translateY(${-24 * f}px)`;
        copy.style.visibility = f > 0.99 ? 'hidden' : '';
      }
      if (tag) {
        const tv = smooth(0.32, 0.4, p) * (1 - smooth(0.6, 0.66, p));
        tag.style.opacity = String(tv);
        tag.style.left = `${X(HOUSE.x)}px`;
        tag.style.top = `${Y(HOUSE.y - HOUSE.r * 0.6)}px`;
      }
      if (inside && insideImg) {
        const iv = smooth(0.8, 0.92, p);
        inside.style.opacity = String(iv);
        insideImg.style.transform = `scale(${1.12 - 0.12 * iv})`;
      }
    }
  }

  function frame(now: number) {
    raf = 0;
    current += (target - current) * 0.14;
    if (Math.abs(target - current) < 0.0005) current = target;
    draw(current, now);
    // Keep running while easing, or while any neighborhood is mid-flicker.
    const flickering = dots.some((d) => !d.survivor && current - d.offAt > -0.03 && current - d.offAt < 0);
    if (visible && (current !== target || flickering || current > 0.12)) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };

  img.addEventListener('load', () => {
    const narrow = window.innerWidth < 700;
    dots = makeDots(findSkyline(img, 240), narrow ? 700 : 1400);
    resize();
    root.classList.add('is-live');
    if (reduced) { draw(0.5, 0); return; }
    target = current = progress();
    kick();
    window.addEventListener('scroll', () => { target = progress(); kick(); }, { passive: true });
    window.addEventListener('resize', () => { resize(); target = progress(); kick(); });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }).observe(root);
  });
}
