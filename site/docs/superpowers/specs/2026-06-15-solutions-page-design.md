# FireflyEnergy.mx — Solutions Page Design Spec
_Brainstormed with Jon, 2026-06-15_

## Goal
A bilingual `/solutions/` page that highlights Firefly's equipment and three recommended systems, gives customers a real sense of **what it costs to start** — without becoming a cost-first pricing table. Price *informs*; the right-sized system and Firefly's quality lead. Funnels to the personalized calculator and the (now-live) lead capture.

Replaces the current 404 at `/solutions/` (the nav already links it).

## Direction (chosen)
**Recommended-led spectrum** (Approach B). Lead with the recommended system + value; present three rungs where **Essentials is the honest floor** ("starting at"), **Whole-home is the recommended hero**, and price never dominates the layout.

## The three tiers
| Tier | Inverter | Battery | Solar cap | Covers | Notes |
|---|---|---|---|---|---|
| **Essentials** (floor) | 6.5 kW | 5 kWh | up to 6.5 kW | Keep critical things on | **Critical loads only — includes a dedicated sub-panel** (must be explicit) |
| **Comfort** | 10 kW | 10 kWh | up to 10 kW | Everyday life, incl. some A/C | — |
| **Whole-home** (recommended hero) | 12 kW | 16 kWh | up to 12 kW | Run the whole house | Emphasized/badged; your most common install |

## Pricing model
- Each tier shows **"starting at"** with two toggles: **Without solar / With solar** and **MXN / USD**.
  - *Without solar* = inverter + battery only (Jon's floor logic). *With solar* = + a **generic 6-panel baseline** (~3.9 kW @ 645 W; uniform across all tiers for comparability, above the 4-panel minimum). Copy: *"shown with 6 panels — additional solar capacity quoted to your power needs."* The per-tier "up to N kW" is the **max headroom** (more can be added), NOT the priced amount.
  - Basis: **installed, pre-IVA, with a "+ IVA" note** (matches the calculator convention) + microcopy "exact system & price after a free site visit."
- **Currency: MXN is the DEFAULT** (selling in Mexico); USD available via toggle. Both supported.
- **Numbers:** Jon provides the **6 USD figures** (3 tiers × with/without solar) — see "Inputs needed." MXN is **derived live from the Supabase daily FX rate** (the existing `fx_rate` / `fetch-fx-rate` mechanism the calculator already uses), not hardcoded.
- Pure client-side: a small static `solutionsPricing` data module holds the USD figures; MXN computed from the fetched rate. No pricing engine/backend call.

### FX wiring
Reuse the existing Supabase FX rate (migration `0004 fx_rate`; `fetch-fx-rate` edge fn; calculator already receives `fxUsdMxn`). Site is static (`output:'static'`). Approach: **fetch the latest USD→MXN rate at runtime** on page load via a lightweight read (public function or read-only `fx_rate` select with the publishable key), with a **baked fallback rate** (~18) if the fetch fails so the page never shows a blank price. (Exact read mechanism finalized in the plan.)

## Page structure (top → bottom)
1. **Hero** — value-led headline (not a price), e.g. "Backup power, sized to your home." Sub + CTA → calculator. Reuse `Hero.astro` pattern.
2. **Tier spectrum** (core) — the 3 cards above, Whole-home emphasized; the two toggles above the row; Essentials caveat inline; "starting prices" microcopy below; each card CTA → calculator (primary) + WhatsApp (secondary). New component `SolutionsTiers.astro` + a client module for toggle/FX behavior, mirroring the calculator's tier-card visual language (`Assessment.client.ts`) and brand tokens.
3. **Equipment showcase** — reuse `EquipmentShowcase.astro`, framed "the equipment behind every system." Uses the **per-tier renders** (see inputs).
4. **Why Firefly** — trimmed value band (reuse `DefenseCards`/`TrustStrip` style) so the page sells quality, not just price.
5. **Closing CTA** — "Not sure which fits? Get a personalized estimate in 2 minutes" → calculator + WhatsApp. Reuse `CTASection.astro`.

## Components & files (Astro static)
- Create: `src/pages/solutions.astro` + `src/pages/es/solutions.astro` (Base + Nav + sections + Footer + WhatsAppBubble; `path="solutions"`).
- Create: `src/components/solutions/SolutionsTiers.astro` (the tier row + toggles markup).
- Create: `src/components/solutions/solutions.client.ts` (toggle state, FX fetch, currency/solar price rendering, USD/MXN formatting — mirrors the calculator's `fmt`).
- Create: `src/lib/solutionsPricing.ts` (typed tier definitions + the USD figures; one source of truth).
- Create: `src/lib/fxClient.ts` (fetch latest USD→MXN from Supabase with baked fallback) — or extend an existing client.
- Reuse: `Hero`, `EquipmentShowcase`, `DefenseCards`/`TrustStrip`, `CTASection`, `Base`, `Nav`, `Footer`, `WhatsAppBubble`, `tokens.css`.
- i18n: add a `solutions.*` namespace to `src/content/en.json` + `es.json` (tier names, covers lines, caveat, toggle labels, microcopy, hero/CTA copy).

## Anti-"cost-first" guardrails
Value-led hero; "starting at"/"from" language; recommended system emphasized over price; "final price after free site visit"; explicit Essentials critical-loads + sub-panel caveat; funnel to the personalized calculator for the real number.

## Price figures (USD, installed, provided by Jon 2026-06-15)
| Tier | Without solar | With solar (6 panels) |
|---|---|---|
| Essentials (6.5 kW / 5 kWh) | $6,500 | $9,600 |
| Comfort (10 kW / 10 kWh) | $8,000 | $11,100 |
| Whole-home (12 kW / 16 kWh) | $9,500 | $12,600 |

"Includes basic installation." Consistent +$3,100 solar adder (6 panels) across tiers. These feed `solutionsPricing.ts`. **Confirmed pre-IVA → each card shows the price + a "+ IVA" note.** MXN derived live from Supabase FX.

## Inputs still needed (asset task)
1. **Per-tier equipment renders** to generate: 6.5 kW + 5 kWh; 10 kW + 10 kWh; 12 kW + 16 kWh (asset task — generate during build; reuse the existing 12/16 render meanwhile).

## Out of scope
- The personalized calculator / `site-estimate` engine (separate; the page links to it).
- Any pricing-engine/backend work — the page is static with a small price table + live FX read.
- Deploy/launch — folds into the broader site launch (site is not yet live).

## Testing
- Unit: the price/format logic (USD + MXN-from-rate, with/without-solar selection, rounding) in `solutions.client.ts` / `fxClient.ts` via `vitest`.
- Visual/E2E: Playwright MCP on localhost — toggles flip price + currency (MXN default), Essentials caveat present, EN/ES copy correct, 0 console errors.
