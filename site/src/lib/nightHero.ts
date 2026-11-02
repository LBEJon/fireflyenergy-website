/**
 * Night hero: two pixel-aligned photographs of the same San Miguel view — the
 * town with power (grid-on) and the same town in an outage where only a few
 * homes stay lit. On scroll, neighborhoods switch from the first photo to the
 * second one at a time (with a short flicker), the camera drifts toward the
 * Firefly home, then the scene dissolves into a real install.
 *
 * ponytail: 2D canvas + soft radial masks. Push capped at 1.25x so the 2200px
 * photos stay sharp. Replace with the Higgsfield flyover video when it exists.
 */

const LIT = '/assets/photos/sma-grid-on.webp';
const OUT = '/assets/photos/sma-outage.webp';
const HOUSE = { x: 0.49, y: 0.553 }; // the Firefly home, normalized
// Neighborhoods in the order they lose power: far city + cathedral, across the hill, then the foreground.
const ZONES: [number, number, number][] = [
  [0.1, 0.22, 0.12], [0.3, 0.2, 0.12], [0.44, 0.22, 0.1], [0.62, 0.14, 0.11], [0.82, 0.1, 0.12], [0.95, 0.28, 0.1],
  [0.12, 0.4, 0.12], [0.3, 0.38, 0.11], [0.7, 0.34, 0.12], [0.88, 0.48, 0.12],
  [0.2, 0.6, 0.13], [0.38, 0.52, 0.09], [0.66, 0.56, 0.11], [0.8, 0.7, 0.13],
  [0.1, 0.84, 0.14], [0.35, 0.8, 0.13], [0.6, 0.82, 0.13], [0.9, 0.9, 0.13],
];
const START = 0.04, END = 0.5, FLICKER = 0.025, MAX_PUSH = 0.25;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
  const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src;
});

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

  const mask = document.createElement('canvas');
  const mctx = mask.getContext('2d')!;
  let lit: HTMLImageElement, out: HTMLImageElement;
  let W = 0, H = 0, dpr = 1;
  let target = 0, current = 0, visible = true, raf = 0, gridOff = false;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = stage.clientWidth; H = stage.clientHeight;
    for (const c of [canvas!, mask]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  /** How "on" a neighborhood is: 1 = lit photo, 0 = outage photo, with a brownout flicker on the way down. */
  function zoneOn(i: number, p: number, now: number) {
    const offAt = START + (i / ZONES.length) * (END - START);
    if (p >= offAt + 0.02) return 0;
    if (p < offAt - FLICKER) return 1;
    if (p < offAt) return Math.sin(now / 55 + i * 7.3) > -0.2 ? 1 : 0.25;
    return 1 - (p - offAt) / 0.02;
  }

  function draw(p: number, now: number) {
    const iw = out.naturalWidth, ih = out.naturalHeight;
    const s = Math.max(W / iw, H / ih);
    const ox = Math.min(0, Math.max(W - iw * s, W / 2 - HOUSE.x * iw * s));
    const oy = Math.min(0, Math.max(H - ih * s, H * 0.5 - HOUSE.y * ih * s));
    const hx = ox + HOUSE.x * iw * s, hy = oy + HOUSE.y * ih * s;
    const z = 1 + MAX_PUSH * smooth(0.3, 0.75, p);
    const dx = hx + (ox - hx) * z, dy = hy + (oy - hy) * z, dw = iw * s * z, dh = ih * s * z;

    ctx!.globalCompositeOperation = 'source-over';
    ctx!.drawImage(out, dx, dy, dw, dh);

    // Start from the fully lit town and cut each failed neighborhood out of it, then fade any remainder.
    const litAlpha = 1 - smooth(END - 0.04, END + 0.04, p);
    if (litAlpha > 0) {
      mctx.globalCompositeOperation = 'source-over';
      mctx.clearRect(0, 0, W, H);
      mctx.fillStyle = '#000';
      mctx.fillRect(0, 0, W, H);
      mctx.globalCompositeOperation = 'destination-out';
      ZONES.forEach(([zx, zy, zr], i) => {
        const off = 1 - zoneOn(i, p, now);
        if (off <= 0) return;
        const x = dx + zx * dw, y = dy + zy * dh, r = zr * dw;
        const g = mctx.createRadialGradient(x, y, r * 0.3, x, y, r);
        g.addColorStop(0, `rgba(0,0,0,${off})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        mctx.fillStyle = g;
        mctx.fillRect(x - r, y - r, r * 2, r * 2);
      });
      mctx.globalCompositeOperation = 'source-in';
      mctx.drawImage(lit, dx, dy, dw, dh);
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.globalAlpha = litAlpha;
      ctx!.drawImage(mask, 0, 0);
      ctx!.globalAlpha = 1;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    setStatus(p > START);
    if (reduced) return;
    if (copy) {
      const f = smooth(0.56, 0.64, p);
      copy.style.opacity = String(1 - f);
      copy.style.transform = `translateY(${-16 * f}px)`;
      copy.style.visibility = f > 0.99 ? 'hidden' : '';
    }
    if (cue) cue.style.opacity = String(1 - smooth(0.02, 0.08, p));
    if (tag) {
      tag.style.opacity = String(smooth(0.5, 0.56, p) * (1 - smooth(0.66, 0.7, p)));
      tag.style.left = `${hx}px`;
      tag.style.top = `${hy - 0.035 * dh}px`;
    }
    if (reveal) {
      const rv = smooth(0.7, 0.88, p);
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
    const flickering = current > START - FLICKER - 0.01 && current < END + 0.02;
    if (visible && (current !== target || flickering)) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };

  Promise.all([loadImg(LIT), loadImg(OUT)]).then(([a, b]) => {
    lit = a; out = b;
    resize();
    root.classList.add('is-live');
    if (reduced) { draw(1, 0); return; }
    target = current = progress();
    kick();
    window.addEventListener('scroll', () => { target = progress(); kick(); }, { passive: true });
    window.addEventListener('resize', () => { resize(); target = progress(); kick(); });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }).observe(root);
  }).catch(() => { /* static photo stays visible */ });
}
