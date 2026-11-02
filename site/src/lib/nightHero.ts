/**
 * Night hero: San Miguel at night. On scroll, houses lose power neighborhood by
 * neighborhood (each house = a small cluster of windows that flickers and dies
 * together), a scattering of houses stay lit, the camera drifts toward the
 * Firefly home, and the scene dissolves into a real install.
 *
 * ponytail: 2D canvas over the real photo. The push is capped at 1.3x so the
 * 1920px source never pixelates. Replace with the Higgsfield flyover video.
 */

const SRC = '/assets/photos/hero-dusk.webp';
const HOUSE = { x: 0.49, y: 0.553, r: 0.05 }; // the lit house in hero-dusk, normalized
// Neighborhood seeds in the order they lose power: far city, across the hill, then the foreground.
const SEEDS = [
  [0.12, 0.26], [0.3, 0.27], [0.2, 0.42], [0.42, 0.34], [0.62, 0.24],
  [0.86, 0.16], [0.83, 0.42], [0.65, 0.62], [0.3, 0.64], [0.12, 0.84], [0.55, 0.88], [0.88, 0.82],
];
const MAX_PUSH = 0.3;

type Win = { x: number; y: number; w: number; h: number; warm: number };
type House = { wins: Win[]; offAt: number; survivor: boolean; phase: number };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
function rng(seed = 7) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

/** Sample the photo once: per-column skyline and a luminance lookup, both normalized. */
function analyze(img: HTMLImageElement) {
  const w = 320, h = Math.round((img.naturalHeight / img.naturalWidth) * w);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const lum = (x: number, y: number) => { const i = (y * w + x) * 4; return (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; };
  const sky: number[] = [];
  for (let x = 0; x < w; x++) {
    let s = h * 0.6;
    for (let y = 4; y < h * 0.6; y++) {
      if (Math.abs(lum(x, y) - lum(x, y - 3)) > 0.05 && Math.abs(lum(x, y + 1) - lum(x, y - 3)) > 0.05) { s = y; break; }
    }
    sky.push(s / h);
  }
  const skyline = sky.map((_, i) => { const s = sky.slice(Math.max(0, i - 4), i + 5).sort((a, b) => a - b); return s[s.length >> 1]; });
  return {
    skyAt: (nx: number) => skyline[Math.min(w - 1, Math.floor(nx * w))],
    lumAt: (nx: number, ny: number) => lum(Math.min(w - 1, Math.floor(nx * w)), Math.min(h - 1, Math.floor(ny * h))),
  };
}

function makeHouses(img: HTMLImageElement, count: number): House[] {
  const { skyAt, lumAt } = analyze(img);
  const rand = rng(23);
  const houses: House[] = [];
  let guard = 0;
  while (houses.length < count && guard++ < count * 40) {
    const x = rand();
    const sky = skyAt(x) + 0.015;
    const y = sky + rand() * (0.97 - sky);
    if (Math.hypot((x - HOUSE.x) * 1.77, y - HOUSE.y) < HOUSE.r * 1.8) continue; // the real lit house stays photographic
    const L = lumAt(x, y);
    if (L < 0.07 || L > 0.5) continue; // skip trees/shadow and bright sky
    const depth = clamp01((y - sky) / 0.7); // 0 = far, 1 = foreground
    // Window size and spacing in image-width units; far houses are tiny.
    const ww = 0.0012 + depth * 0.0026;
    const wh = ww * (1.3 + rand() * 0.4);
    const cols = 1 + Math.floor(rand() * 3), rows = rand() < 0.35 ? 2 : 1;
    const wins: Win[] = [];
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      if (rand() < 0.25) continue; // not every window is lit
      wins.push({ x: x + k * ww * 2.4, y: y + r * wh * 1.9, w: ww, h: wh, warm: rand() });
    }
    if (!wins.length) continue;
    let region = 0, best = Infinity;
    SEEDS.forEach(([sx, sy], i) => { const dd = Math.hypot((x - sx) * 1.77, y - sy); if (dd < best) { best = dd; region = i; } });
    houses.push({ wins, offAt: 0.08 + (region / SEEDS.length) * 0.32 + rand() * 0.03, survivor: rand() < 0.06, phase: rand() * 1000 });
  }
  return houses;
}

export function mountNightHero(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('.nh__canvas');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  const stage = root.querySelector<HTMLElement>('.nh__stage')!;
  const copy = root.querySelector<HTMLElement>('.nh__copy');
  const tag = root.querySelector<HTMLElement>('.nh__tag');
  const reveal = root.querySelector<HTMLElement>('.nh__reveal');
  const cue = root.querySelector<HTMLElement>('.nh__cue');
  const gridEl = root.querySelector<HTMLElement>('[data-grid]');
  const homeEl = root.querySelector<HTMLElement>('[data-home]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const img = new Image();
  img.decoding = 'async';
  img.src = SRC;

  let houses: House[] = [];
  let W = 0, H = 0;
  let target = 0, current = 0, visible = true, raf = 0, gridOff = false;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = stage.clientWidth; H = stage.clientHeight;
    canvas!.width = Math.round(W * dpr); canvas!.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const progress = () => {
    const r = root.getBoundingClientRect();
    const run = r.height - window.innerHeight;
    return run > 0 ? clamp01(-r.top / run) : 0;
  };
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
    const hx = ox + HOUSE.x * iw * s, hy = oy + HOUSE.y * ih * s;
    // Slow drift toward the Firefly home while the town goes dark.
    const z = 1 + MAX_PUSH * smooth(0.25, 0.7, p);
    const X = (nx: number) => hx + (ox + nx * iw * s - hx) * z;
    const Y = (ny: number) => hy + (oy + ny * ih * s - hy) * z;
    const unit = iw * s * z;

    ctx!.globalCompositeOperation = 'source-over';
    ctx!.globalAlpha = 1;
    ctx!.drawImage(img, X(0), Y(0), iw * s * z, ih * s * z);

    // Grid on: a faint warm lift over the whole town; it drains as neighborhoods fail.
    const dark = smooth(0.08, 0.42, p);
    ctx!.fillStyle = `rgba(255,170,90,${0.07 * (1 - dark)})`;
    ctx!.globalCompositeOperation = 'soft-light';
    ctx!.fillRect(0, 0, W, H);

    // Blackout deepens everything except a pool around the Firefly home.
    ctx!.globalCompositeOperation = 'source-over';
    const hr = HOUSE.r * unit;
    const shade = ctx!.createRadialGradient(hx, hy, hr, hx, hy, hr * 4);
    shade.addColorStop(0, 'rgba(4,7,16,0)');
    shade.addColorStop(1, `rgba(4,7,16,${0.08 + 0.4 * dark})`);
    ctx!.fillStyle = shade;
    ctx!.fillRect(0, 0, W, H);

    // Windows: crisp warm rectangles with a soft bloom, a house at a time.
    for (const hs of houses) {
      let a: number;
      if (hs.survivor) a = 1;
      else {
        const t = p - hs.offAt;
        if (t < -0.025) a = 1;
        else if (t < 0) a = Math.sin(now / 45 + hs.phase) > 0 ? 1 : 0.2; // brownout flicker
        else continue;
      }
      for (const w of hs.wins) {
        const x = X(w.x), y = Y(w.y), ww = Math.max(1, w.w * unit), wh = Math.max(1.2, w.h * unit);
        if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue;
        ctx!.globalCompositeOperation = 'lighter';
        ctx!.globalAlpha = 0.18 * a;
        ctx!.fillStyle = '#ff9a3c';
        ctx!.fillRect(x - ww, y - wh * 0.6, ww * 3, wh * 2.2); // bloom
        ctx!.globalCompositeOperation = 'source-over';
        ctx!.globalAlpha = (0.75 + 0.25 * w.warm) * a;
        ctx!.fillStyle = w.warm > 0.5 ? '#ffc46b' : '#ffdca0';
        ctx!.fillRect(x, y, ww, wh);
      }
    }
    ctx!.globalCompositeOperation = 'source-over';
    ctx!.globalAlpha = 1;

    setStatus(p > 0.1);
    if (reduced) return;
    if (copy) {
      const f = smooth(0.5, 0.6, p);
      copy.style.opacity = String(1 - f);
      copy.style.transform = `translateY(${-16 * f}px)`;
      copy.style.visibility = f > 0.99 ? 'hidden' : '';
    }
    if (cue) cue.style.opacity = String(1 - smooth(0.02, 0.08, p));
    if (tag) {
      tag.style.opacity = String(smooth(0.42, 0.5, p) * (1 - smooth(0.62, 0.68, p)));
      tag.style.left = `${hx}px`;
      tag.style.top = `${Y(HOUSE.y - HOUSE.r * 0.7)}px`;
    }
    if (reveal) {
      // Night town dissolves into the install it was all about.
      const rv = smooth(0.66, 0.86, p);
      reveal.style.opacity = String(rv);
      reveal.style.visibility = rv > 0 ? 'visible' : 'hidden';
      reveal.style.setProperty('--rv', rv.toFixed(3));
    }
  }

  function frame(now: number) {
    raf = 0;
    current += (target - current) * 0.16;
    if (Math.abs(target - current) < 0.0005) current = target;
    draw(current, now);
    const flickering = houses.some((h) => !h.survivor && current - h.offAt > -0.025 && current - h.offAt < 0);
    if (visible && (current !== target || flickering)) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };

  img.addEventListener('load', () => {
    houses = makeHouses(img, window.innerWidth < 700 ? 240 : 420);
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
