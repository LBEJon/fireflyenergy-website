/**
 * GSAP motion layer for the residential pages.
 *
 * Every effect is gated behind `prefers-reduced-motion: reduce` — when the user
 * asks for reduced motion, `initMotion()` is a no-op and the page renders in its
 * final, static state (count-up numbers show their real value, cards are visible,
 * the hero is fully in place). Nothing here is required for the page to function;
 * the scenario tabs, estimator and all links work without it.
 *
 * GSAP is imported here (not in the page frontmatter) so Astro emits it as a
 * separate, lazy chunk that does not block first paint.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let started = false;

export function initMotion(): void {
  if (typeof window === 'undefined') return;
  if (started) return;
  started = true;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Respect the user's preference. If they want reduced motion, do nothing —
  // the page already shows its final state, so there is nothing to "undo".
  if (reduce.matches) return;

  gsap.registerPlugin(ScrollTrigger);

  hero();
  trustStripCountUp();
  flowEdgeGlow();
  defenseCards();
  proofDrag();

  // Recompute trigger positions once images/fonts settle.
  ScrollTrigger.refresh();
}

/* ------------------------------------------------------------------ */
/* Hero: headline lines stagger-in on load; image subtle scale on scroll */
/* ------------------------------------------------------------------ */
function hero(): void {
  const h1 = document.querySelector<HTMLElement>('.ff-hero__h1');
  if (h1) {
    // Split the headline into word-spans we can stagger without breaking layout
    // (wrapping/measurement is unchanged — we only wrap existing text nodes).
    const lines = splitIntoLines(h1);
    if (lines.length) {
      gsap.set(lines, { yPercent: 110, opacity: 0 });
      gsap.to(lines, {
        yPercent: 0,
        opacity: 1,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.12,
        delay: 0.05,
      });
    }
    // Fade the supporting copy / actions in just behind the headline.
    const tail = h1.parentElement?.querySelectorAll(
      '.ff-hero__sub, .ff-hero__actions, .ff-hero__chips'
    );
    if (tail && tail.length) {
      gsap.from(tail, {
        y: 16,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.08,
        delay: 0.35,
      });
    }
  }

  const img = document.getElementById('hero-image');
  const media = document.getElementById('hero-media');
  if (img && media) {
    gsap.fromTo(
      img,
      { scale: 1.06 },
      {
        scale: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: media,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      }
    );
  }
}

/**
 * Wrap each whitespace-delimited word of an element's plain-text content in a
 * `<span class="ff-line">`, each inside an overflow-hidden mask span so the
 * yPercent rise reads as a clean "line" reveal. Returns the inner spans.
 * No-ops gracefully if the element has child elements already.
 */
function splitIntoLines(el: HTMLElement): HTMLElement[] {
  const text = el.textContent ?? '';
  if (!text.trim()) return [];
  const words = text.split(/(\s+)/);
  el.textContent = '';
  const inner: HTMLElement[] = [];
  for (const w of words) {
    if (/^\s+$/.test(w)) {
      el.appendChild(document.createTextNode(w));
      continue;
    }
    const mask = document.createElement('span');
    mask.style.display = 'inline-block';
    mask.style.overflow = 'hidden';
    mask.style.verticalAlign = 'top';
    const word = document.createElement('span');
    word.style.display = 'inline-block';
    word.style.willChange = 'transform';
    word.textContent = w;
    mask.appendChild(word);
    el.appendChild(mask);
    inner.push(word);
  }
  return inner;
}

/* ------------------------------------------------------------------ */
/* TrustStrip: count the numeric part of each stat up when in view      */
/* ------------------------------------------------------------------ */
function trustStripCountUp(): void {
  const nums = Array.from(
    document.querySelectorAll<HTMLElement>('.stat-num[data-countup]')
  );
  for (const el of nums) {
    const finalText = el.textContent ?? '';
    const parsed = parseNumeric(finalText);
    // Non-numeric (e.g. "No fuel") — leave it exactly as-is.
    if (!parsed) continue;

    const { prefix, value, decimals, suffix } = parsed;

    // Reserve the final rendered width up front so the count-up cannot cause
    // layout shift: render the final value, lock min-width, then start from 0.
    const minW = el.getBoundingClientRect().width;
    el.style.display = 'inline-block';
    el.style.minWidth = `${Math.ceil(minW)}px`;

    const state = { n: 0 };
    el.textContent = `${prefix}0${suffix}`;

    gsap.to(state, {
      n: value,
      duration: 1.4,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        once: true,
      },
      onUpdate: () => {
        el.textContent = `${prefix}${formatNumber(state.n, decimals)}${suffix}`;
      },
      onComplete: () => {
        // Snap back to the exact authored string (handles rounding/formatting).
        el.textContent = finalText;
      },
    });
  }
}

interface NumericParse {
  prefix: string;
  value: number;
  decimals: number;
  suffix: string;
}

/**
 * Pull a single number out of a stat string, preserving any non-digit prefix
 * (e.g. "<") and suffix (e.g. "%", " yrs", "ms", "kW"). Returns null when there
 * is no number to animate, so the caller can skip it gracefully.
 */
export function parseNumeric(text: string): NumericParse | null {
  const m = text.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/s);
  if (!m) return null;
  const [, prefix, rawNum, suffix] = m;
  const cleaned = rawNum.replace(/,/g, '');
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  const dot = cleaned.indexOf('.');
  const decimals = dot === -1 ? 0 : cleaned.length - dot - 1;
  return { prefix, value, decimals, suffix };
}

function formatNumber(n: number, decimals: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/* ------------------------------------------------------------------ */
/* FlowDiagram: gentle glow pulse on the currently-active edges.        */
/* We animate a drop-shadow glow only — never the stroke-dasharray, so   */
/* the existing CSS "marching ants" dash animation is left untouched.    */
/* ------------------------------------------------------------------ */
function flowEdgeGlow(): void {
  const svg = document.getElementById('ff-flow-svg');
  if (!svg) return;

  const pulse = gsap.to(svg, {
    // A soft lime halo that breathes. Applied to the whole SVG via filter so
    // it does not interfere with per-edge stroke styling/classes.
    filter: 'drop-shadow(0 0 6px rgba(158, 213, 0, 0.55))',
    duration: 1.6,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true,
    paused: true,
  });

  // Only pulse while at least one edge is active and the diagram is on screen.
  const sync = () => {
    const anyActive = svg.querySelector('.ff-edge.is-active');
    if (anyActive) pulse.play();
    else {
      pulse.pause(0);
      gsap.set(svg, { clearProps: 'filter' });
    }
  };

  // React to the scenario tabs flipping classes (the existing JS toggles them).
  const mo = new MutationObserver(sync);
  svg.querySelectorAll('.ff-edge').forEach((edge) =>
    mo.observe(edge, { attributes: true, attributeFilter: ['class'] })
  );

  ScrollTrigger.create({
    trigger: svg,
    start: 'top 80%',
    end: 'bottom 20%',
    onToggle: (self) => {
      if (self.isActive) sync();
      else pulse.pause(0);
    },
  });

  sync();
}

/* ------------------------------------------------------------------ */
/* DefenseCards: cards rise + fade in on scroll, staggered.             */
/* ------------------------------------------------------------------ */
function defenseCards(): void {
  const cards = gsap.utils.toArray<HTMLElement>('.ff-defense__card');
  if (!cards.length) return;
  gsap.from(cards, {
    y: 28,
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out',
    stagger: 0.08,
    scrollTrigger: {
      trigger: '.ff-defense__grid',
      start: 'top 80%',
      once: true,
    },
  });
}

/* ------------------------------------------------------------------ */
/* ProofGallery: enable horizontal drag/scroll of the [data-draggable]  */
/* rail. We switch the rail from a 3-col grid to a horizontal scroller   */
/* (via a class) and add pointer-drag-to-scroll on top of native scroll. */
/* ------------------------------------------------------------------ */
function proofDrag(): void {
  const rail = document.querySelector<HTMLElement>('[data-draggable]');
  if (!rail) return;

  rail.classList.add('is-draggable');

  let down = false;
  let startX = 0;
  let startScroll = 0;
  let moved = false;

  const onDown = (e: PointerEvent) => {
    down = true;
    moved = false;
    startX = e.clientX;
    startScroll = rail.scrollLeft;
    rail.setPointerCapture(e.pointerId);
    rail.classList.add('is-dragging');
  };
  const onMove = (e: PointerEvent) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 3) moved = true;
    rail.scrollLeft = startScroll - dx;
  };
  const onUp = (e: PointerEvent) => {
    if (!down) return;
    down = false;
    rail.classList.remove('is-dragging');
    try {
      rail.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer may already be released */
    }
  };

  rail.addEventListener('pointerdown', onDown);
  rail.addEventListener('pointermove', onMove);
  rail.addEventListener('pointerup', onUp);
  rail.addEventListener('pointercancel', onUp);
  // Don't fire caption/link clicks at the end of a drag.
  rail.addEventListener(
    'click',
    (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );
}
