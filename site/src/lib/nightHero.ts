/**
 * Night hero: two pixel-aligned photographs of the same San Miguel view — the
 * town with power (grid-on) and the same town in an outage where only a few
 * homes stay lit. Neighborhoods switch from the first photo to the second one
 * section by section like a rolling brownout (lights sag, then cut), the camera
 * pushes toward the Firefly home, cuts to a close-up of that lit house, flies
 * in through its front door and lands on the dusk entrance where the Firefly
 * hangs. The brownout plays on a clock after the first scroll; the flight follows the scroll.
 *
 * ponytail: 2D canvas + soft radial masks. Push capped at 1.25x so the 2200px
 * photos stay sharp. Replace with the Higgsfield flyover video when it exists.
 */

const LIT = '/assets/photos/sma-grid-on.webp';
const OUT = '/assets/photos/sma-outage.webp';
const HOUSE = { x: 0.49, y: 0.553 }; // the Firefly home, normalized
// Neighborhoods in the order they lose power, three per section: far city + cathedral, across the hill, then the foreground.
const ZONES: [number, number, number][] = [
  [0.1, 0.22, 0.12], [0.3, 0.2, 0.12], [0.44, 0.22, 0.1], [0.62, 0.14, 0.11], [0.82, 0.1, 0.12], [0.95, 0.28, 0.1],
  [0.12, 0.4, 0.12], [0.3, 0.38, 0.11], [0.7, 0.34, 0.12], [0.88, 0.48, 0.12],
  [0.2, 0.6, 0.13], [0.38, 0.52, 0.09], [0.66, 0.56, 0.11], [0.8, 0.7, 0.13],
  [0.1, 0.84, 0.14], [0.35, 0.8, 0.13], [0.6, 0.82, 0.13], [0.9, 0.9, 0.13],
];
// The blackout itself runs on a clock, triggered by the first scroll; everything after it follows the scroll.
const BLACKOUT_MS = 7500, SECTIONS = 6, MAX_PUSH = 0.25, NEAR_ZOOM = 1.3;

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
  const near = root.querySelector<HTMLElement>('.nh__near');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const mask = document.createElement('canvas');
  const mctx = mask.getContext('2d')!;
  let lit: HTMLImageElement, out: HTMLImageElement;
  let W = 0, H = 0, dpr = 1;
  let target = 0, current = 0, visible = true, raf = 0;
  let startedAt = 0; // when the blackout was triggered (0 = not yet)
  const blackout = (now: number) => (startedAt ? clamp01((now - startedAt) / BLACKOUT_MS) : 0);

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
  /** How "on" a neighborhood is: 1 = lit, 0 = dark. Its whole section sags to half, holds, then cuts out. */
  function zoneOn(i: number, b: number) {
    const t0 = 0.05 + Math.floor(i / (ZONES.length / SECTIONS)) * 0.15;
    return 1 - 0.5 * smooth(t0, t0 + 0.05, b) - 0.5 * smooth(t0 + 0.07, t0 + 0.09, b);
  }

  function draw(p: number, b: number) {
    const iw = out.naturalWidth, ih = out.naturalHeight;
    const s = Math.max(W / iw, H / ih);
    const ox = Math.min(0, Math.max(W - iw * s, W / 2 - HOUSE.x * iw * s));
    const oy = Math.min(0, Math.max(H - ih * s, H * 0.5 - HOUSE.y * ih * s));
    const hx = ox + HOUSE.x * iw * s, hy = oy + HOUSE.y * ih * s;
    const z = 1 + MAX_PUSH * smooth(0.06, 0.42, p);
    const dx = hx + (ox - hx) * z, dy = hy + (oy - hy) * z, dw = iw * s * z, dh = ih * s * z;

    ctx!.globalCompositeOperation = 'source-over';
    ctx!.drawImage(out, dx, dy, dw, dh);

    // Start from the fully lit town and cut each failed neighborhood out of it, then fade any remainder.
    const litAlpha = 1 - smooth(0.9, 1, b);
    if (litAlpha > 0) {
      mctx.globalCompositeOperation = 'source-over';
      mctx.clearRect(0, 0, W, H);
      mctx.fillStyle = '#000';
      mctx.fillRect(0, 0, W, H);
      mctx.globalCompositeOperation = 'destination-out';
      ZONES.forEach(([zx, zy, zr], i) => {
        const off = 1 - zoneOn(i, b);
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

    if (reduced) return;
    if (copy) {
      const f = smooth(0.22, 0.32, p);
      copy.style.opacity = String(1 - f);
      copy.style.transform = `translateY(${-16 * f}px)`;
      copy.style.visibility = f > 0.99 ? 'hidden' : '';
    }
    if (cue) cue.style.opacity = String(1 - smooth(0, 0.04, p) - (startedAt ? 1 : 0));
    if (tag) {
      tag.style.opacity = String(smooth(0.85, 1, b) * (1 - smooth(0.34, 0.4, p)));
      tag.style.left = `${hx}px`;
      tag.style.top = `${hy - 0.035 * dh}px`;
    }
    if (near) { // close-up of the lit house, flying toward its front door
      const nv = smooth(0.36, 0.48, p);
      near.style.opacity = String(nv * (1 - smooth(0.82, 0.88, p)));
      near.style.visibility = nv > 0 ? 'visible' : 'hidden';
      near.style.setProperty('--nz', String(1 + NEAR_ZOOM * smooth(0.36, 0.84, p) ** 1.6));
    }
    if (reveal) {
      const rv = smooth(0.78, 0.87, p);
      reveal.style.opacity = String(rv);
      reveal.style.visibility = rv > 0 ? 'visible' : 'hidden';
      reveal.style.setProperty('--rv', rv.toFixed(3));
    }
  }

  function frame(now: number) {
    raf = 0;
    current += (target - current) * 0.16;
    if (Math.abs(target - current) < 0.0005) current = target;
    const b = blackout(now);
    draw(current, b);
    const running = startedAt > 0 && b < 1;
    if (visible && (current !== target || running)) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };

  Promise.all([loadImg(LIT), loadImg(OUT)]).then(([a, b]) => {
    lit = a; out = b;
    resize();
    root.classList.add('is-live');
    if (reduced) { draw(0, 1); return; }
    target = current = progress();
    // Landing mid-page (reload, anchor link): show the town already dark.
    if (current > 0.02) startedAt = performance.now() - BLACKOUT_MS;
    const trigger = () => { if (!startedAt) { startedAt = performance.now(); kick(); } };
    kick();
    window.addEventListener('scroll', () => { if (window.scrollY > 2) trigger(); target = progress(); kick(); }, { passive: true });
    window.addEventListener('wheel', (e) => { if (e.deltaY > 0) trigger(); }, { passive: true });
    window.addEventListener('touchmove', trigger, { passive: true });
    window.addEventListener('keydown', (e) => { if (['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key)) trigger(); });
    window.addEventListener('resize', () => { resize(); target = progress(); kick(); });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }).observe(root);
  }).catch(() => { /* static photo stays visible */ });
}
