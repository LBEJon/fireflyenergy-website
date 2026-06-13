# FireflyEnergy.mx Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modern, bilingual (ES/EN), lead-generation rebuild of FireflyEnergy.mx — Warm Editorial direction, a residential homepage + 4-step estimator, an industrial BESS showcase, GSAP/Three.js islands, and two firefly-crm Supabase edge functions — entirely on localhost, leaving the live Cloudflare site untouched until an explicit launch.

**Architecture:** A new Astro static project lives in `site/` inside the existing `fireflyenergy-website` repo, so the live root files (`index.html`, `wrangler.toml`) are never modified. Astro gives built-in i18n routing, sitemap, and SEO. GSAP and Three.js load as lazy client islands. Pure-logic modules (sizing, pricing interface, estimator state machine) are framework-free and unit-tested with Vitest. The two edge functions are additive to firefly-crm (Deno), following the existing `generate-proposal` CORS/`json()` pattern; pricing exposes MSRP only.

**Tech Stack:** Astro 4 (static output), TypeScript, Vitest, GSAP, Three.js, Astro i18n + `@astrojs/sitemap`, Supabase Edge Functions (Deno), Cloudflare Pages (later). Higgsfield CLI for imagery.

**Critical constraints (from spec §4 content rules — enforce in every copy task):**
1. No "weatherproof" / no IP65 as a selling point.
2. Installation = covered location (garage, utility closet, covered patio); compact, wall-mounted.
3. No "silent"/"0 dB"; frame as "no fuel, no fumes, no generator roar."
4. No equipment brand names/model numbers — specs only (kW/kWh/A).
5. Positive framing; never disparage CFE.
6. Plain, non-technical language. All copy in BOTH es + en.

**Local-only rule:** Never edit repo-root `index.html`, `es/`, `compare/`, `faq.html`, `survey/`, `sitemap.xml`, `robots.txt`, or `wrangler.toml`. All new work lives under `site/`. Verify with `git status` that no root file is staged.

---

## File Structure

```
fireflyenergy-website/
  site/                                  # NEW Astro project (everything below is new)
    package.json  astro.config.mjs  tsconfig.json  vitest.config.ts
    public/
      assets/brand/                      # copied firefly logo SVGs + tokens
      assets/equipment/                  # copied product renders (12kW, 16kWh, panels)
      assets/photos/                     # Higgsfield-generated imagery
      llms.txt  robots.txt
    src/
      styles/tokens.css                  # imported from design-system
      styles/global.css
      lib/
        sizing.ts            # pure: estimator answers -> system config
        sizing.test.ts
        pricing.ts           # PriceRange interface + stub + live-client adapter
        pricing.test.ts
        leadClient.ts        # POST to /site-lead
        pricingClient.ts     # GET /site-pricing (+ cache)
        i18n.ts              # locale helper
      content/
        en.json  es.json     # all UI strings, one key space, two locales
      components/
        Nav.astro  Footer.astro  WhatsAppBubble.astro
        Hero.astro  TrustStrip.astro
        FlowDiagram.astro  FlowDiagram.client.ts     # shared, CRM-reusable
        DefenseCards.astro
        EquipmentShowcase.astro  EquipmentShowcase.client.ts
        Estimator.astro  Estimator.client.ts          # uses lib/sizing + lib/pricing
        ProofGallery.astro
        CTASection.astro
        industrial/IndustrialHero.astro  Propositions.astro  ScaleBand.astro
                   IndustrialEquipment.astro  EngagementPath.astro  AssessmentForm.astro
      layouts/
        Base.astro           # <head>, SEO meta, JSON-LD slot, hreflang
      pages/
        index.astro          # EN residential homepage
        calculator.astro
        industrial.astro
        es/index.astro  es/calculator.astro  es/industrial.astro
  firefly-crm/ (separate repo)
    supabase/functions/site-pricing/index.ts
    supabase/functions/site-lead/index.ts
    supabase/functions/site-lead/lead.test.mjs
```

---

## Phase 0 — Project scaffold & brand foundation

### Task 0.1: Scaffold the Astro project in `site/`

**Files:** Create `site/` via the Astro CLI.

- [ ] **Step 1:** From repo root, scaffold without touching root files:
```bash
cd "/Users/jondenne/Claude Code/fireflyenergy-website"
npm create astro@latest site -- --template minimal --no-install --no-git --typescript strict --skip-houston
```
- [ ] **Step 2:** Install deps + libraries:
```bash
cd site
npm install
npm install gsap three
npm install -D vitest @astrojs/sitemap @types/three
```
- [ ] **Step 3:** Verify dev server boots:
```bash
npm run dev
```
Expected: serves on `http://localhost:4321`. Stop with Ctrl-C.
- [ ] **Step 4:** Commit:
```bash
git add site && git commit -m "chore: scaffold Astro site in site/ (live root untouched)"
```

### Task 0.2: Configure Astro i18n + sitemap

**Files:** Modify `site/astro.config.mjs`.

- [ ] **Step 1:** Write config:
```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://fireflyenergy.mx',
  output: 'static',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [sitemap()],
});
```
- [ ] **Step 2:** Build to verify config is valid:
```bash
npm run build
```
Expected: build succeeds, `dist/sitemap-index.xml` emitted.
- [ ] **Step 3:** Commit: `git add -A && git commit -m "feat: configure Astro i18n + sitemap"`

### Task 0.3: Import brand tokens, fonts, logos, equipment renders

**Files:** Create `site/src/styles/tokens.css`, `site/src/styles/global.css`, copy assets.

- [ ] **Step 1:** Copy canonical brand + equipment assets:
```bash
cd "/Users/jondenne/Claude Code/fireflyenergy-website/site"
mkdir -p public/assets/brand public/assets/equipment public/assets/photos
cp "/Users/jondenne/Claude Code/Firefly/design-system/web/tokens.css" src/styles/tokens.css
cp /Users/jondenne/Claude\ Code/Firefly/design-system/web/assets/firefly-logo*.svg public/assets/brand/
cp /Users/jondenne/Claude\ Code/Firefly/design-system/web/assets/firefly-icon.svg public/assets/brand/
cp "/Users/jondenne/Claude Code/firefly-crm/web/proposal/assets/inverter-12kw-front-clean.png" public/assets/equipment/inverter-12kw.png
cp "/Users/jondenne/Claude Code/firefly-crm/web/proposal/assets/battery-16kwh-lh-cut.png" public/assets/equipment/battery-16kwh.png
```
- [ ] **Step 2:** Write `src/styles/global.css`: import `tokens.css`, set Archivo + Archivo Narrow `@import` from Google Fonts, base `body{font-family:var(--ff-sans);background:var(--ff-paper,#FDFBF7);color:var(--ff-ink)}`, and the display-type rule `h1,.display,.stat-num{font-family:var(--ff-display)}`. (Use the exact token names verified present in `tokens.css`: `--ff-green #9ED500`, `--ff-ink #2A2D34`, `--ff-accent #FF6A3D`, `--ff-display "Archivo Narrow"`, `--ff-sans "Archivo"`.)
- [ ] **Step 3:** Verify in a throwaway page that fonts/colors load (build), then commit:
```bash
git add -A && git commit -m "feat: brand tokens, fonts, logos, equipment renders"
```

### Task 0.4: Base layout with SEO + JSON-LD + hreflang

**Files:** Create `site/src/layouts/Base.astro`, `site/src/lib/i18n.ts`.

- [ ] **Step 1:** `i18n.ts` exports `getLocale(url)`, `t(locale, key)` reading `content/en.json|es.json`, and `altUrl(locale, path)` for hreflang.
- [ ] **Step 2:** `Base.astro` props: `{title, description, locale, path, jsonLd?}`. Renders `<html lang>`, meta title/description/canonical, OG + Twitter tags, `<link rel="alternate" hreflang>` for en/es/x-default, imports `global.css`, injects `firefly-icon.svg` favicon, optional `<script type="application/ld+json">`.
- [ ] **Step 3:** Build + commit: `git add -A && git commit -m "feat: Base layout with SEO, JSON-LD, hreflang"`

---

## Phase 1 — Pure logic modules (TDD)

### Task 1.1: Sizing module

**Files:** Create `site/src/lib/sizing.ts`, `site/src/lib/sizing.test.ts`.

Derives a system config from estimator answers, using the same vocabulary as the CRM proposal engine (`essential` vs running loads; respects the 4-panel inverter-string minimum from `MIN_SOLAR_PANELS`).

- [ ] **Step 1: Write failing test** (`sizing.test.ts`):
```ts
import { describe, it, expect } from 'vitest';
import { sizeSystem } from './sizing';

describe('sizeSystem', () => {
  it('family home + life-as-usual + add-solar => 12kW / 16kWh and >=4 panels', () => {
    const r = sizeSystem({ home: 'family', backup: 'usual', solar: 'add' });
    expect(r.inverterKw).toBe(12);
    expect(r.batteryKwh).toBe(16);
    expect(r.panels).toBeGreaterThanOrEqual(4);
  });
  it('cozy + essentials + battery-only => smaller inverter, 0 panels', () => {
    const r = sizeSystem({ home: 'cozy', backup: 'essentials', solar: 'none' });
    expect(r.inverterKw).toBeLessThanOrEqual(6.5);
    expect(r.panels).toBe(0);
  });
  it('never returns 1-3 panels (string minimum)', () => {
    const r = sizeSystem({ home: 'cozy', backup: 'essentials', solar: 'add' });
    expect(r.panels === 0 || r.panels >= 4).toBe(true);
  });
  it('large estate + everything => largest tier', () => {
    const r = sizeSystem({ home: 'estate', backup: 'everything', solar: 'add' });
    expect(r.inverterKw).toBeGreaterThanOrEqual(12);
  });
});
```
- [ ] **Step 2: Run, verify fail:** `npx vitest run src/lib/sizing.test.ts` → FAIL (sizeSystem not defined).
- [ ] **Step 3: Implement** `sizing.ts`:
```ts
export type HomeSize = 'cozy' | 'family' | 'estate' | 'business';
export type BackupScope = 'essentials' | 'usual' | 'everything';
export type SolarIntent = 'have' | 'add' | 'none';
export interface EstimatorAnswers { home: HomeSize; backup: BackupScope; solar: SolarIntent; }
export interface SystemConfig { inverterKw: number; batteryKwh: number; panels: number; }

const MIN_SOLAR_PANELS = 4;            // inverter-string minimum (mirrors CRM engine)
const INVERTER_BY_HOME: Record<HomeSize, number> = { cozy: 6.5, family: 12, estate: 12, business: 12 };
const BATTERY_BY_BACKUP: Record<BackupScope, number> = { essentials: 5, usual: 16, everything: 16 };

export function sizeSystem(a: EstimatorAnswers): SystemConfig {
  let inverterKw = INVERTER_BY_HOME[a.home];
  if (a.home === 'estate' && a.backup === 'everything') inverterKw = 24; // parallel pair
  const batteryKwh = a.home === 'estate' && a.backup === 'everything' ? 32 : BATTERY_BY_BACKUP[a.backup];
  let panels = 0;
  if (a.solar !== 'none') {
    const raw = Math.round(inverterKw * 0.8);          // ~0.8 panel-kW per inverter-kW heuristic
    panels = raw < MIN_SOLAR_PANELS ? MIN_SOLAR_PANELS : raw;
  }
  return { inverterKw, batteryKwh, panels };
}
```
- [ ] **Step 4: Run, verify pass:** `npx vitest run src/lib/sizing.test.ts` → PASS.
- [ ] **Step 5: Commit:** `git add src/lib/sizing.* && git commit -m "feat: estimator sizing module (TDD)"`

### Task 1.2: Pricing interface + stub (deferred algorithm)

**Files:** Create `site/src/lib/pricing.ts`, `site/src/lib/pricing.test.ts`.

The real algorithm is gated on the CRM pricing-schema rebuild. This task defines a stable interface and a placeholder so the estimator UX is fully buildable; the live computation drops in later behind the same signature.

- [ ] **Step 1: Write failing test:**
```ts
import { describe, it, expect } from 'vitest';
import { priceRange } from './pricing';

describe('priceRange', () => {
  it('returns a USD low<=high band for a config', () => {
    const r = priceRange({ inverterKw: 12, batteryKwh: 16, panels: 8 }, null);
    expect(r.currency).toBe('USD');
    expect(r.low).toBeGreaterThan(0);
    expect(r.high).toBeGreaterThanOrEqual(r.low);
    expect(r.placeholder).toBe(true);   // until live pricing wired
  });
  it('uses live MSRP map when provided', () => {
    const pricing = { inverter: { 12: 3000 }, battery: { 16: 2400 }, panelEach: 150 };
    const r = priceRange({ inverterKw: 12, batteryKwh: 16, panels: 8 }, pricing);
    expect(r.placeholder).toBe(false);
    expect(r.low).toBeGreaterThan(3000);
  });
});
```
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement:**
```ts
import type { SystemConfig } from './sizing';
export interface PricingData { inverter: Record<number, number>; battery: Record<number, number>; panelEach: number; }
export interface PriceRangeResult { currency: 'USD'; low: number; high: number; placeholder: boolean; }

// NOTE: install band is a PLACEHOLDER (±, see spec §6/§11). Replace `INSTALL_LOW/HIGH`
// and the equipment lookup when the CRM pricing schema rebuild lands. Signature is stable.
const INSTALL_LOW = 1.6, INSTALL_HIGH = 2.0; // equipment-multiple placeholders ONLY
const PLACEHOLDER_EQUIP: PricingData = { inverter: { 6.5: 1800, 12: 3000, 24: 6000 }, battery: { 5: 900, 16: 2400, 32: 4800 }, panelEach: 150 };

export function priceRange(cfg: SystemConfig, pricing: PricingData | null): PriceRangeResult {
  const data = pricing ?? PLACEHOLDER_EQUIP;
  const equip = (data.inverter[cfg.inverterKw] ?? 0) + (data.battery[cfg.batteryKwh] ?? 0) + cfg.panels * data.panelEach;
  return { currency: 'USD', low: Math.round(equip * INSTALL_LOW), high: Math.round(equip * INSTALL_HIGH), placeholder: pricing === null };
}
```
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit:** `git add src/lib/pricing.* && git commit -m "feat: pricing interface + deferred placeholder (TDD)"`

### Task 1.3: Pricing + lead clients

**Files:** Create `site/src/lib/pricingClient.ts`, `site/src/lib/leadClient.ts`.

- [ ] **Step 1:** `pricingClient.ts`: `fetchPricing(baseUrl)` GETs `/functions/v1/site-pricing`, returns `PricingData | null` (null on any failure → estimator falls back to placeholder), with a 1h `localStorage` cache guard.
- [ ] **Step 2:** `leadClient.ts`: `submitLead(payload)` POSTs to `/functions/v1/site-lead` with `{ name, contact, segment, answers, config, locale, hp }` (hp = honeypot, empty). Returns `{ok:boolean}`. On failure returns `{ok:false}` so the UI shows the WhatsApp fallback — never a silent success.
- [ ] **Step 3:** Commit: `git add src/lib/*Client.ts && git commit -m "feat: pricing + lead HTTP clients"`

---

## Phase 2 — Shared presentational components

> These are visual Astro components. "Verify" = `npm run build` succeeds AND a Playwright check via the `playwright-cli` skill confirms the section renders with correct copy/brand at 375px and 1280px. Apply ALL content rules. Every string comes from `content/{en,es}.json`.

### Task 2.0: Seed i18n string files
**Files:** Create `site/src/content/en.json`, `es.json`.
- [ ] **Step 1:** Create both with the full key set used by every component below (nav, hero, trust, flow, defense, equipment, estimator steps + results, proof, cta, footer, industrial.*). Spanish is a real translation, not a copy.
- [ ] **Step 2:** Commit.

### Task 2.1: Nav + Footer + WhatsApp bubble
- [ ] Build `Nav.astro` (logo SVG, residential/industrial/calculator links, ES/EN toggle, coral "Get my estimate" button, sticky, mobile hamburger), `Footer.astro` (NAP + service area for local SEO, /industrial, ES/EN, FAQ, privacy), `WhatsAppBubble.astro` (fixed, `wa.me` link). Verify + commit.

### Task 2.2: Hero
- [ ] `Hero.astro` props `{locale, variant:'residential'}`: eyebrow, H1 "Your home, glowing through any outage." (es: "Tu hogar, encendido en cualquier apagón."), benefit-led sub-copy (NO "silent"), coral CTA + ghost "How it works", trust chips. Photo slot uses `public/assets/photos/hero-dusk.*` (Higgsfield placeholder until Phase 5). Verify + commit.

### Task 2.3: TrustStrip
- [ ] `TrustStrip.astro`: 20 yrs · <20ms · 100% automatic · "no fuel, no fumes, no maintenance" (NOT "0 dB"/silent). Count-up animation added in Phase 4. Verify + commit.

### Task 2.4: DefenseCards
- [ ] `DefenseCards.astro`: 3 cards (outages / weak power / dirty power) + "see all 6" expander carrying the remaining rows from the current site's defense table, plain-language. Verify + commit.

### Task 2.5: ProofGallery + CTASection
- [ ] `ProofGallery.astro` (3 home types: colonial/hacienda/Mexican-modern, 2-3 testimonials as placeholders) and `CTASection.astro` (charcoal final CTA: estimate or WhatsApp). Verify + commit.

---

## Phase 3 — Signature interactive components

### Task 3.1: FlowDiagram (shared, CRM-reusable)
**Files:** `site/src/components/FlowDiagram.astro`, `FlowDiagram.client.ts`.
- [ ] **Step 1:** Author the diagram as a self-contained SVG with a documented data model `{ nodes:[solar,inverter,home,battery,grid], scenario:'sun'|'night'|'outage' }` and a pure `setScenario(svgRoot, scenario)` function in `FlowDiagram.client.ts` that toggles node/edge classes (outage: grid node dims, home stays lit). Topology mirrors the CRM proposal `proposal/power-flow.html`. Export `setScenario` so the CRM can import it.
- [ ] **Step 2:** Add a Vitest DOM test for `setScenario` (jsdom): asserts the `grid` node gets `.is-dim` in `'outage'` and `.is-active` in `'sun'`. Run → fail → implement → pass.
- [ ] **Step 3:** Astro component renders the SVG + scenario tabs (sun/night/outage); GSAP pulse animation is layered in Phase 4 (component must render and switch scenarios without GSAP first).
- [ ] **Step 4:** Verify (Playwright: click each tab, assert classes) + commit.

### Task 3.2: EquipmentShowcase (Three.js)
**Files:** `EquipmentShowcase.astro`, `EquipmentShowcase.client.ts`.
- [ ] **Step 1:** `client.ts` builds a Three.js scene with two textured planes/cards (inverter-12kw.png, battery-16kwh.png) on a slow turntable + OrbitControls (drag to rotate), spec chips ("12 kW", "16 kWh") as HTML overlays. Lazy-init via `IntersectionObserver`; respects `prefers-reduced-motion` (static fallback). NO brand names, NO "weatherproof". Install note: "professionally installed in a covered space."
- [ ] **Step 2:** Astro component: `<canvas>` + `client:visible` directive, static `<img>` fallback in `<noscript>`.
- [ ] **Step 3:** Verify (build + Playwright screenshot shows canvas) + commit.

### Task 3.3: Estimator (state machine)
**Files:** `Estimator.astro`, `Estimator.client.ts` (uses `lib/sizing`, `lib/pricing`, `lib/pricingClient`, `lib/leadClient`).
- [ ] **Step 1: Write failing test** `Estimator.client.test.ts` for a framework-free `createEstimator()` store: `next()/back()` move steps 1→4, `setAnswer()` records, at step 4 `getResult()` returns `{config, price}` via `sizeSystem`+`priceRange`, and `submit()` calls the injected lead client. Run → fail.
- [ ] **Step 2: Implement** `createEstimator({pricing, leadClient})` as a pure store (no DOM). Run → pass.
- [ ] **Step 3:** `Estimator.client.ts` binds the store to the DOM (3 question screens + results-first screen; price range shows USD/MXN toggle; results render BEFORE the name+contact capture; "email me my estimate" + WhatsApp soft nets). `Estimator.astro` renders markup, hydrates `client:visible`, fetches pricing (falls back to placeholder).
- [ ] **Step 4:** Verify (Playwright: walk all 4 steps, assert a config + range render, submit hits a mocked endpoint) + commit.

---

## Phase 4 — Page assembly + GSAP motion

### Task 4.1: Residential homepage (en + es)
- [ ] Assemble `pages/index.astro` and `pages/es/index.astro` from components in spec §5 order (Hero → TrustStrip → FlowDiagram → DefenseCards → EquipmentShowcase → Estimator teaser → ProofGallery → CTASection), wrapped in `Base.astro` with residential JSON-LD (`LocalBusiness`+`Product`). Verify both locales build + render; commit.

### Task 4.2: Calculator page (en + es)
- [ ] `pages/calculator.astro` + `es/` — full Estimator with surrounding context copy + FAQ snippet. Verify + commit.

### Task 4.3: GSAP motion layer
- [ ] Add a single `src/lib/motion.ts` that registers ScrollTrigger and wires: hero headline stagger + photo scale, TrustStrip count-up, FlowDiagram pulse + scroll-scrub (desktop only; tap-tabs on mobile), DefenseCards stagger, ProofGallery horizontal drag. All gated on `prefers-reduced-motion`. Verify no layout shift (CLS) + commit.

---

## Phase 5 — Industrial page + imagery

### Task 5.1: Industrial components + page (en + es)
- [ ] Build `industrial/` components per spec §7 (IndustrialHero, Propositions ×4 with expanders, ScaleBand with GSAP grow, IndustrialEquipment, EngagementPath, AssessmentForm) and assemble `pages/industrial.astro` + `es/` with steelier charcoal palette and BESS JSON-LD (`Service`). AssessmentForm posts to `submitLead` with `segment:'industrial'`. Verify + commit.

### Task 5.2: Higgsfield imagery
- [ ] Use the `higgsfield-generate` skill to produce: hero dusk SMA home, 3 proof-home styles (colonial/hacienda/Barragán-modern), industrial blue-hour BESS facility. Save to `public/assets/photos/`, wire `<picture>` with responsive sizes + width/height (CLS). Verify + commit. (If Higgsfield unavailable, leave tasteful gradient placeholders and `log` the gap — do not block.)

---

## Phase 6 — CRM edge functions (firefly-crm repo, additive)

> Work in the firefly-crm repo. Follow the `generate-proposal` Deno pattern (CORS const, `json()` helper, `createClient` from esm.sh). Do NOT deploy — local serve + test only; deploy is a later explicit step gated on Jon.

### Task 6.1: site-pricing function (TDD via local serve)
**Files:** `firefly-crm/supabase/functions/site-pricing/index.ts`.
- [ ] **Step 1:** Implement: on GET, query `product` where `status='active'`, select only `kind, msrp_usd` and the spec fields needed to key inverter kW / battery kWh / panel; build `{ inverter:{kw:usd}, battery:{kwh:usd}, panelEach }` (MSRP ONLY — never select cost/dealer/landed columns); 1h `Cache-Control`; CORS GET/OPTIONS.
- [ ] **Step 2:** Run locally: `supabase functions serve site-pricing --no-verify-jwt` and `curl` (via `ctx_execute`) asserting JSON shape + that no cost fields appear. 
- [ ] **Step 3:** Commit in firefly-crm.

### Task 6.2: site-lead function
**Files:** `firefly-crm/supabase/functions/site-lead/index.ts` + `lead.test.mjs`.
- [ ] **Step 1: Write failing test** (`lead.test.mjs`, node) for a pure `buildRecords(payload)` helper: valid payload → `{contact:{...,source:'website'}, deal:{segment, metadata:{answers,config}}}`; honeypot non-empty → throws; missing contact → throws. Run → fail.
- [ ] **Step 2: Implement** `buildRecords` + the Deno handler (POST: validate, honeypot, basic rate-limit by IP, dedupe contact by email/phone, insert contact then deal with `source='website'` and estimator inputs in `deal.metadata`; segment residential|industrial; industrial flagged). Run test → pass.
- [ ] **Step 3:** Check whether `contact.source` / `deal.metadata` columns exist; if not, write migration `firefly-crm/supabase/migrations/00NN_site_lead_fields.sql` (additive, nullable) — do NOT apply, leave for Jon. Note in commit.
- [ ] **Step 4:** Local serve + `ctx_execute` curl test (valid → 200 + records; honeypot → 400). Commit.

### Task 6.3: Wire site → functions
- [ ] In `site/.env` set `PUBLIC_SUPABASE_URL` + anon key (local/staging project). Point `pricingClient`/`leadClient` at them. End-to-end local test: estimator submit creates a deal in the dev CRM. Verify + commit.

---

## Phase 7 — SEO/AI-search, performance, verification

### Task 7.1: SEO completeness
- [ ] Per-page titles/meta/canonical/OG; JSON-LD (`LocalBusiness`, `Product`/`Service`, `FAQPage`, `BreadcrumbList`); hreflang on every page; `@astrojs/sitemap` output; `public/robots.txt`; `public/llms.txt` summarizing offerings + service area for LLM crawlers. Verify with a build + Playwright assertion that each page has one `<title>`, canonical, and hreflang pair. Commit.

### Task 7.2: Performance / Core Web Vitals
- [ ] Confirm WebGL + GSAP are lazy (`client:visible`), images have width/height + responsive `srcset`, fonts `display:swap`. Run a Lighthouse pass (via playwright-cli/Chrome) on the built site; record scores. Fix any CLS/LCP regressions. Commit.

### Task 7.3: Final verification (REQUIRED SUB-SKILL: superpowers:verification-before-completion)
- [ ] Build `site/` (`npm run build && npm run preview`), walk both locales of all three pages at 375/768/1280px via Playwright, run full Vitest suite, and **grep the built `dist/` for forbidden terms**: `weatherproof|IP65|silent|0 dB|0dB` (EN) and `impermeable|silencioso` (ES) → must be zero hits. Confirm `git status` shows NO modified repo-root live files. Produce a short verification report (pages, tests, screenshots, forbidden-term scan = clean). 

---

## Phase 8 — Launch (DEFERRED — explicit go-ahead only)
- [ ] Not now. When Jon approves: point Cloudflare at `site/dist` (update `wrangler.toml`/Pages build), add redirects, verify live, then retire the old root files. This phase is intentionally NOT executed during the build.

---

## Self-Review (author checklist — completed)

**Spec coverage:** §2 stack→T0.1-0.2; direction/brand §3→T0.3-0.4,Phase 2; arch A→Phase 4-5; languages→T0.2,T2.0,every page task; lead capture §8→T6.2-6.3; pricing source §8/deferred §11→T1.2-1.3,T6.1; content rules §4→stated globally + enforced in every copy task + T7.3 grep gate; homepage §5→Phase 2-4; estimator §6→T1.1-1.2,T3.3; industrial §7→Phase 5; CRM §8→Phase 6; SEO/AI §9→T7.1; isolation §10→file structure + local-only rule; out-of-scope §11→Phase 8 deferred, pricing placeholder. No gaps.

**Placeholder scan:** Pricing "placeholder" is an intentional, interface-stable deferral (not a plan gap) and is clearly bounded. No "TBD/handle edge cases/write tests for the above" without code. Logic tasks include full test + impl code; presentational tasks define exact copy/props + a concrete verify method.

**Type consistency:** `EstimatorAnswers{home,backup,solar}`, `SystemConfig{inverterKw,batteryKwh,panels}`, `PricingData{inverter,battery,panelEach}`, `PriceRangeResult{currency,low,high,placeholder}`, `sizeSystem`, `priceRange`, `setScenario`, `createEstimator`, `submitLead`, `fetchPricing`, `buildRecords` — used consistently across tasks.
