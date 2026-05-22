---
name: firefly-web-design
description: >
  Firefly's modern web & collateral design language, anchored to the 2026 vector
  logo. Use for ANY Firefly customer-facing surface — website, landing pages,
  proposals, install packets, partner tools, dashboards. Light/airy/optimistic,
  bilingual EN/ES, credible enough for residential + installers today and
  industrial tomorrow. HTML/CSS is the source of truth (tokens.css).
metadata:
  type: design-system
  project: firefly
---

# Firefly Web Design System

> One cohesive language across **website → proposals → install packets → tools.**
> Website-first; HTML/CSS drives the look, then cascades to every other surface.
> **Anchor everything to the 2026 logo — never the legacy `brand-guide.md`.**

## 0. The strategic decision (read first)

There are two conflicting Firefly identities in the repo:

| | Legacy `brand-guide.md` (proposals) | **2026 logo (USE THIS)** |
|---|---|---|
| Green | `#A4D233` (olive) | **`#9ED500` (lime)** |
| Ink | `#3A3D42` | **`#2A2D34`** |
| Type | Montserrat + Open Sans | **Archivo Narrow + Archivo** |
| Accents | Sky Blue, Solar Gold, multi | **One green + charcoal; gold for pricing only** |

The 2026 logo redefined the brand to something tighter and more confident.
This system makes the **logo the single source of truth** and retires the
legacy palette. Proposals/packets get migrated to these tokens over time.

## 1. Design principles

1. **Light, airy, optimistic.** Generous white space. The page should feel like
   daylight, not a control panel. Whitespace is also economical for print.
2. **The power is in your hands.** Every layout should reinforce *control,
   independence, resilience* — calm confidence, never fear/CFE-blame.
3. **Credible expert, not box-mover.** Restraint = authority. One accent, used
   precisely, reads more expert than a rainbow of colors.
4. **One language, two business units.** Same DNA flexes from residential +
   installers to **Firefly Industrial**. Pivot emphasis, never the system.
5. **Bilingual by default.** Every string ships EN **and** ES. Spanish is
   written naturally (formal `usted`), never machine-translated. Layouts must
   survive ES running ~20% longer.
6. **Motion is premium, not playful.** Calm easing, subtle lift on hover, the
   firefly "glow" used sparingly behind focal points. No bounce, no confetti.

## 2. Tokens — `tokens.css` is canonical

Always `@import` / `<link>` `tokens.css`. Never hardcode hex. Key tokens:

- **Color:** `--ff-green #9ED500` is the **only** Firefly green (olive retired).
  **Lime rule:** lime owns large/display text + fills + on-dark; **small labels
  use charcoal `--ff-ink`** (eyebrows get a small lime dash via `::before`);
  **chips = lime fill + charcoal text** (step numbers, tags). Never lime as small
  text on white. Plus `--ff-paper #F8F9F4` (warm page bg), `--ff-green-tint`
  (section wash), `--ff-glow` (radial hero glow), `--ff-gold` (pricing only).
- **Accent — `--ff-accent #FF6A3D` (Sunset Coral):** the "look here" trigger.
  Warm complement to lime = maximum attention (contrast, not hue, grabs the eye).
  **SCARCITY RULE (~10%):** only the #1 action per view — primary CTA, savings/ROI
  figure, "featured/Most popular" badge. Lime owns the *story* (independence %),
  coral owns the *trigger* (act now). Never use coral for more than ~3 spots/page.
  `--ff-accent-dk #E24A1E` for hover/coral-text; `--ff-accent-tint` for soft badges.
- **Type:** `--ff-display` = Archivo Narrow 700 (echoes the wordmark — headlines,
  big numbers, eyebrows). `--ff-sans` = Archivo (body/UI). Fluid `clamp()` scale
  `--fs-display … --fs-small`. **Never** Montserrat/Open Sans/Inter/Roboto.
- **Space:** 8pt scale `--sp-1…8`; `--container 1200px`, `--container-tight 760px`.
- **Radius:** soft, capsule-friendly (`--r-md/lg`, `--r-pill`) — echoes the logo
  capsules. **Motion:** `--ease` cubic-bezier(.22,1,.36,1), `--dur .5s`.

## 3. Layout DNA

- Light sections on `--ff-paper`/white; **one** dark `--ff-ink` band per page for
  weight (e.g. product systems). Green-tint band for stats/credibility.
- Alternate light → dark → light to create rhythm without clutter.
- Hero: asymmetric grid (copy ~1.15fr / proof-card ~.85fr) + a single radial
  `--ff-glow` bleeding off the top-right. One headline, one lead, two CTAs max.
- Cards: white, 1px `--ff-line`, generous padding, lift + soft shadow on hover.
- Headline highlight: wrap the payoff phrase in `.hl` (`--ff-green-deep`), never
  more than one highlight per headline.

## 4. Components (see `index.html` for working markup)

Header (sticky, blurred) · EN/ES pill toggle · pill buttons (`.btn-primary`
charcoal / `.btn-green` lime / `.btn-ghost`) · trust strip · numbered step cards
· dark product/package grid · industrial split (`.tag` "Firefly Industrial") ·
stat band · centered CTA · dark footer. Mark green hover states with the glow
shadow, not a color change alone.

## 5. Bilingual pattern

Author one DOM, dual content: `data-en` + `data-es` on every text node; JS swaps
`textContent` (never `innerHTML` — XSS + the security hook will block it). For
phrases needing inline emphasis, split into separate `<span>`s each with their
own `data-*`. Default `lang="en"`, toggle persists choice.

## 6. Voice

Calm, professional, consultative. Lead with benefits — **resilience, savings,
independence**. Avoid "crisis / disaster / collapse" and CFE-blame. Position
Mexico-wide (SMA is home base, not the ceiling). Always **"Firefly by Nordic
Electric"** — never "Nordic Energy". Battery chemistry `LiFePO4` in plain ASCII.

## 7. Applying to other surfaces (later)

- **Proposals / install packets:** swap legacy palette → these tokens; Archivo
  Narrow for cover/section titles, Archivo for body. Keep the airy white-space
  rhythm (also saves ink). Pricing uses `--ff-gold`. Keep 60/40, IVA separate.
- **Tools / dashboards / partner generator:** same tokens; denser spacing
  allowed, but keep one-accent restraint and the capsule radius language.

## 8. Hard don'ts

- ❌ Legacy `#A4D233`, Sky Blue, Montserrat, Open Sans.
- ❌ Lime green as small body text on white (use `--ff-green-deep`).
- ❌ More than one dark band / one headline highlight per view.
- ❌ Recolor, stretch, rotate, or add effects to the logo.
- ❌ Machine-translated Spanish or English-only shipping.
- ❌ `innerHTML` for i18n.

## Files
- `tokens.css` — canonical variables (the contract)
- `index.html` — reference homepage (light/airy, bilingual, all components)
- `assets/` — `firefly-logo.svg`, `firefly-logo-white.svg`, `firefly-icon.svg`
