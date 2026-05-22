# Firefly Website — 2026 Redesign (PARALLEL / UNPUBLISHED)

> ⚠️ **This is a staging workspace on the `redesign-2026` branch. It does NOT
> replace the live site.** The published site (`fireflyenergy.mx`) is served from
> the existing files on `main` and is untouched. Nothing here is deployed.

## What's here
- `index.html` — redesigned marketing homepage (light/airy, bilingual EN/ES).
- `power-flow.html` — the "How it works" Continuous Power System diagram
  (dark feature band, animated energy flow, rendered components, EN/ES toggle,
  3 auto-cycling states: Normal / Outage / Full Battery Backup).
- `tokens.css` — the 2026 design tokens (the brand color/type/spacing schema).
- `SKILL.md` — the Firefly web design system guide.
- `assets/` — 2026 logo variants (incl. `firefly-logo-ondark.svg`, transparent
  light logo for dark backgrounds), icon, and the transparent 3D node renders
  (`render-home/solar/grid.png`) + product photos.

## Preview locally
Open `redesign/index.html` or `redesign/power-flow.html` in a browser.

## Brand
2026 logo–anchored: lime `#9ED500`, charcoal `#2A2D34`, Sunset Coral `#FF6A3D`
accent, Archivo + Archivo Narrow. Full guidelines in the Firefly project
`brand-guide.md`.

## Open TODO
- Embed `power-flow.html` into the homepage in place of the legacy diagram.
- Port over calculator / survey / FAQ flows from the live site.
- When approved, decide integration vs. replacement and deploy path.
