# Solutions Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development. Steps use `- [ ]` checkboxes.

**Goal:** Build the bilingual `/solutions/` page (recommended-led 3-tier spectrum with Without/With-solar + MXN-default/USD toggles, "starting at" pre-IVA prices, Essentials critical-loads caveat) per the spec `docs/superpowers/specs/2026-06-15-solutions-page-design.md`.

**Architecture:** Astro static page. Pure-client toggle logic over a static USD price table; MXN derived from a build-time-baked Supabase FX rate (fallback constant). Reuses existing components + brand tokens. No backend.

**Tech:** Astro (`output:'static'`), TypeScript, `node --test`-free (site uses `vitest`), i18n flat JSON, Playwright MCP for E2E. Localhost only — DO NOT commit or deploy (site convention).

---

## Concrete facts (verified 2026-06-15)
- **Brand tokens** (`src/styles/tokens.css`): `--ff-green #9ED500`, `--ff-ink #2A2D34`, `--ff-accent #FF6A3D` (coral), `--ff-gold #FFB81C` (pricing), `--ff-paper/--ff-mist/--ff-line`; fonts `--ff-display` (Archivo Narrow), `--ff-sans` (Archivo); `--fs-*`, `--sp-1..8`, `--container 1200px`, `--r-sm/md/lg`, `--r-pill`, `--shadow-*`.
- **Patterns**: pages set `const locale='en' as const` (or `'es'`), use `t(locale,key)` + `altUrl(locale,page)` from `src/lib/i18n.ts`; compose `Base` + `Nav` + sections + `CTASection` + `Footer` + `WhatsAppBubble` (see `src/pages/index.astro`, `industrial.astro`). `Base.astro` takes `title`/`description` props + `path` for canonical/hreflang.
- **Reuse**: `Hero.astro`, `EquipmentShowcase.astro`, `DefenseCards.astro`/`TrustStrip.astro`, `CTASection.astro`. Tier-card visual language + `fmt()` currency formatting: mirror `src/components/assessment/Assessment.client.ts`.
- **Calculator link**: `altUrl(locale,'calculator')`. **WhatsApp**: `common.whatsapp` = `524151805030`; reuse `src/lib/waLink.ts` if a prefilled link is wanted.
- **FX**: `fx_rate` table cols `{id, rate_date date, usd_mxn numeric, source, fetched_at}`; latest = `order by rate_date desc limit 1` (current ~17.3). Anonymous read is blocked (needs a key) → bake at build time.
- **Prices (USD, installed, pre-IVA)**: Essentials $6,500 / $9,600 · Comfort $8,000 / $11,100 · Whole-home $9,500 / $12,600 (without / with 6 panels).

---

## Task 1: Price data module + unit tests (TDD)
**Files:** Create `src/lib/solutionsPricing.ts`, `src/lib/solutionsPricing.test.ts`

- [ ] **Step 1: failing test** — assert the data + a `priceFor(tierKey, withSolar)` helper and a `formatPrice(usd, currency, fxUsdMxn)` helper:
```ts
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { SOLUTION_TIERS, priceFor, formatPrice, FX_FALLBACK } from './solutionsPricing';
test('tiers + prices', () => {
  assert.equal(SOLUTION_TIERS.length, 3);
  assert.equal(priceFor('essentials', false), 6500);
  assert.equal(priceFor('essentials', true), 9600);
  assert.equal(priceFor('wholehome', true), 12600);
});
test('USD format', () => { assert.equal(formatPrice(6500, 'USD', 17.3), '$6,500'); });
test('MXN format rounds to nearest 100', () => {
  // 6500 * 17.3 = 112450 -> round to 112,500
  assert.equal(formatPrice(6500, 'MXN', 17.3), '$112,500');
});
test('fallback fx is a sane number', () => { assert.ok(FX_FALLBACK > 10 && FX_FALLBACK < 30); });
```
- [ ] **Step 2: run** `npx vitest run src/lib/solutionsPricing.test.ts` → FAIL (module missing).
- [ ] **Step 3: implement** `solutionsPricing.ts`:
```ts
export type TierKey = 'essentials' | 'comfort' | 'wholehome';
export interface SolutionTier {
  key: TierKey; inverterKw: number; batteryKwh: number; solarCapKw: number;
  recommended: boolean; priceUsd: { withoutSolar: number; withSolar: number };
}
export const SOLAR_PANELS_BASELINE = 6;
export const FX_FALLBACK = 17.5;
export const SOLUTION_TIERS: SolutionTier[] = [
  { key:'essentials', inverterKw:6.5, batteryKwh:5,  solarCapKw:6.5, recommended:false, priceUsd:{ withoutSolar:6500,  withSolar:9600  } },
  { key:'comfort',    inverterKw:10,  batteryKwh:10, solarCapKw:10,  recommended:false, priceUsd:{ withoutSolar:8000,  withSolar:11100 } },
  { key:'wholehome',  inverterKw:12,  batteryKwh:16, solarCapKw:12,  recommended:true,  priceUsd:{ withoutSolar:9500,  withSolar:12600 } },
];
export function priceFor(key: TierKey, withSolar: boolean): number {
  const t = SOLUTION_TIERS.find(t => t.key === key)!;
  return withSolar ? t.priceUsd.withSolar : t.priceUsd.withoutSolar;
}
export function formatPrice(usd: number, currency: 'USD'|'MXN', fxUsdMxn: number): string {
  if (currency === 'MXN') {
    const mxn = Math.round((usd * fxUsdMxn) / 100) * 100;
    return new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN', maximumFractionDigits:0 }).format(mxn);
  }
  return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(usd);
}
```
- [ ] **Step 4: run** the test → PASS.

## Task 2: Build-time FX baker
**Files:** Create `src/lib/fxBuild.ts`

- [ ] **Step 1:** implement an async `getBuildFxRate()` that, given `import.meta.env.PUBLIC_SUPABASE_URL` + a build-only `SUPABASE_FX_READ_KEY` env, GETs `${url}/rest/v1/fx_rate?select=usd_mxn&order=rate_date.desc&limit=1` with `apikey`+`Authorization: Bearer` headers, returns the `usd_mxn` number; on any failure (no key, network, empty) returns `FX_FALLBACK`. Wrap in try/catch; never throw (build must not break). This runs in Astro frontmatter at build, so the key is never shipped to the client.
- [ ] **Step 2:** (no live test — keys aren't in the build env here). Add a `vitest` test that `getBuildFxRate()` returns `FX_FALLBACK` when the env key is unset. Run → PASS.

## Task 3: i18n copy (`solutions.*`)
**Files:** Modify `src/content/en.json`, `src/content/es.json`

- [ ] Add `solutions.*` keys (EN + ES), following the existing flat-key pattern. Cover: `meta_title`/`meta_description`; `hero_eyebrow`/`hero_h1` (value-led, no price)/`hero_sub`/`hero_cta`; `tiers_eyebrow`/`tiers_title`/`tiers_sub`; toggle labels `toggle_without_solar`/`toggle_with_solar`/`toggle_usd`/`toggle_mxn`; per-tier `tier_<key>_name`/`tier_<key>_covers`; `essentials_caveat` ("Critical loads only — includes a dedicated sub-panel"); `with_solar_note` ("shown with 6 panels — additional capacity quoted to your needs"); `iva_note` ("+ IVA"); `starting_at`; `microcopy` ("Starting prices — your exact system and price come after a free site visit"); card CTAs `cta_estimate`/`cta_whatsapp`; equipment section eyebrow/title/sub; why-firefly band copy (or reuse `defense.*`); closing CTA copy. Spanish translations idiomatic (es-MX).
- [ ] Validate both JSON files parse (`node -e "JSON.parse(require('fs').readFileSync('src/content/en.json'))"` etc.).

## Task 4: SolutionsTiers component + client logic
**Files:** Create `src/components/solutions/SolutionsTiers.astro`, `src/components/solutions/solutions.client.ts`

- [ ] **Step 1:** `SolutionsTiers.astro` — props `{ locale, fxUsdMxn }`. Renders: the two toggle groups (Without/With solar; MXN/USD — **MXN + Without-solar selected by default**), then a 3-card grid from `SOLUTION_TIERS`. Each card: tier name (`t(locale,'solutions.tier_<key>_name')`), inverter+battery chips, covers line, `starting at` label, a `[data-price][data-tier=<key>]` price span, the `iva_note` + per-tier solar-cap/with-solar note, and two CTAs (estimate → `altUrl(locale,'calculator')`, WhatsApp → `wa.me`). The `wholehome` card gets the `recommended` badge + emphasis class. The `essentials` card renders the caveat inline. Bake `fxUsdMxn` + the price table into `data-*` attributes (or a JSON `<script type="application/json">`) for the client. Style with brand tokens (mirror the calculator tier-card CSS in `<style>`).
- [ ] **Step 2:** `solutions.client.ts` — `initSolutionsTiers(root)`: reads `fxUsdMxn` + price data from the DOM, holds `{ solar:'off', currency:'MXN' }` state, wires the 4 toggle buttons (active styling + state), and re-renders each `[data-price]` via `formatPrice(priceFor(tier, solar==='on'), currency, fx)`. Default render = MXN + without-solar. Import `priceFor`/`formatPrice` from `solutionsPricing.ts`.
- [ ] **Step 3:** reuse the existing init pattern (a `<script>` in the .astro that imports + calls `initSolutionsTiers` on the root, like `AssessmentEntry.astro`).

## Task 5: The pages
**Files:** Create `src/pages/solutions.astro`, `src/pages/es/solutions.astro`

- [ ] Compose: `Base` (title/description from i18n, `path="solutions"`) → `Nav` → `Hero` (value-led, CTA → calculator) → `SolutionsTiers` (pass `fxUsdMxn` from `await getBuildFxRate()` in frontmatter) → `EquipmentShowcase` (framed "equipment behind every system") → a why-Firefly band (reuse `DefenseCards` or `TrustStrip`) → `CTASection` → `Footer` → `WhatsAppBubble`. ES page mirrors with `locale='es'`. Match how `industrial.astro` wires these.
- [ ] Confirm the nav link now resolves (Nav already links `solutions`).

## Task 6: Verify on localhost (Playwright MCP)
- [ ] Dev server on `:4322` (restart if `.astro` style edits don't show — known stale-CSS issue: kill PID on :4322, `npm run dev -- --port 4322`).
- [ ] `npx vitest run` → all green (new + existing).
- [ ] Playwright MCP: load `/solutions/` — default shows **MXN + Without solar**; toggling With-solar raises each price by the solar delta; toggling USD switches currency/format; Whole-home badged; Essentials caveat visible; CTAs point to calculator + wa.me. Load `/es/solutions/` — Spanish copy + MXN default. 0 console errors. Screenshot both.

## Task 7 (asset, non-blocking): per-tier renders
- [ ] Generate inverter+battery renders for 6.5/5, 10/10, 12/16 (nano-banana/imagegen) into `public/assets/equipment/`; wire into the equipment section. Until then, reuse the existing `12kw`/`16kwh` render generically. Can land after the page is functional.

## Out of scope / notes
- No commit, no deploy (site convention — ships with broader launch).
- The build-env FX key (`SUPABASE_FX_READ_KEY`) is set by Jon in the deploy/build env later; locally the page uses `FX_FALLBACK` — that's expected and fine for dev.
