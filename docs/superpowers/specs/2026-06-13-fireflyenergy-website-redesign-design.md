# FireflyEnergy.mx — Website Redesign Design Spec

**Date:** 2026-06-13
**Status:** Approved (sections 1–3 reviewed in brainstorming)
**Scope:** Full marketing-site rebuild, developed on localhost only. The live site at fireflyenergy.mx is NOT touched until explicitly launched.

---

## 1. Goal

Rebuild FireflyEnergy.mx as a modern, lead-generation website that communicates Firefly's value proposition for battery backup + solar in San Miguel de Allende and Mexico nationally. Two audiences:

1. **Residential / light-commercial** — fast, low-friction funnel ending in a CRM lead.
2. **Industrial / BESS** — consultative showcase ending in a booked energy assessment (no calculator).

Lead with energy independence and the positives. Never disparage CFE.

## 2. Decisions (locked)

| Decision | Choice |
|---|---|
| **Stack** | Astro static site (built-in i18n, sitemap, SEO meta/OG); GSAP + Three.js as lightweight islands; pure static output for Cloudflare. |
| **Design direction** | **Warm Editorial** ("San Miguel at Dusk") — warm paper background, golden-hour photography, plain-spoken copy, generous whitespace, rounded cards, pill buttons, soft shadows. Pure C language (NOT the Barragán hybrid). |
| **Site architecture** | **A — "One story, two doors":** homepage IS the residential story; `/industrial` is a flagship sibling page with a steelier palette; `/calculator` dedicated page + homepage teaser. |
| **Languages** | Bilingual ES + EN at launch. Every page has an `/es/` route. |
| **Lead capture** | Direct CRM edge function (`POST /site-lead`) in firefly-crm Supabase. Creates contact + deal, `source = website`, estimator/assessment inputs attached. Honeypot + rate limit + dedupe. |
| **Pricing source** | Live pricing endpoint (`GET /site-pricing`) — active products → **MSRP only**, cached ~1h. Dealer/landed cost/margins never exposed publicly. **Pricing algorithm is a pluggable module — deferred** until the CRM pricing-schema rebuild lands. |
| **Industrial CTA** | Book an energy assessment (structured form: facility type, monthly CFE spend, tariff). |
| **Image/video generation** | Higgsfield CLI for golden-hour SMA/colonial/hacienda/Barragán-modern home photography, product-context shots, industrial blue-hour BESS imagery, and an optional ambient hero video loop. |

## 3. Brand (canonical 2026)

- **Source of truth:** `~/Claude Code/Firefly/design-system/web/tokens.css` + logo SVGs in `design-system/web/assets/`.
- **Colors:** lime `#9ED500` (large/display + fills only, never small text on white), charcoal `#2A2D34`, sunset coral `#FF6A3D` (the single "look here" accent — primary CTA only), warm paper neutrals.
- **Type:** `Archivo Narrow` for display moments only (H1, big stats, CTA headlines); `Archivo` for body/UI.
- **Logo:** canonical 2026 wordmark/icon SVGs (on-dark variants for charcoal sections). All mockups and the build use these.

## 4. Content rules (MANDATORY — apply to all copy, EN + ES)

1. **No "weatherproof" / no IP65 as a selling point.** IP65 is incidental to current sourcing and not stable in the portfolio. Weatherproof solutions exist but are consultation-only, not marketed.
2. **Installation framing:** professionally installed in a covered location — garage, utility closet, or covered patio. Compact, wall-mounted, tucked away.
3. **No "silent" / "0 dB" claims.** There is a cooling fan. Frame by what it lacks: "no fuel, no fumes, no generator roar." Honest, benefit-led.
4. **No equipment brand names or model numbers** — specs only (kW / kWh / amps). (Existing Firefly rule.)
5. **Positive framing** — energy independence over fear; never disparage CFE.
6. **Plain, non-technical language** — clear, concise, easy to understand.

## 5. Residential homepage (8 sections)

1. **Hero** — "Your home, glowing through any outage." Golden-hour SMA dusk photo. GSAP staggered headline + scroll scale; Three.js firefly particles (only WebGL on initial load); Higgsfield photo or 6s ambient loop. CTA: *Get my estimate* (coral).
2. **Trust strip** — 20 yrs serving Mexico · <20ms switchover · 100% automatic · no fuel/no fumes/no maintenance. Numbers count up on scroll.
3. **How it works — enhanced flow diagram** — the CRM proposal power-flow topology redrawn as a living scene: energy pulses travel wires (GSAP motion-path); sunny/night/outage scenario tabs re-route flow (grid dims in outage, home stays lit). Built as a **shared component the CRM proposals can reuse**. Scroll-scrubbed desktop, tap-tabs mobile.
4. **Power Defense layer** — current 6-row table distilled to 3 friendly cards (outages / weak power / dirty power) + "see all 6" expander. GSAP stagger.
5. **Equipment showcase** — Three.js drag-to-rotate of the most common config (12 kW inverter + 16 kWh battery) built from real product renders as textured cards; spec hotspots; lazy-loaded.
6. **Calculator teaser → estimator** (see §6).
7. **Proof — homes like yours** — 3-home Higgsfield gallery (colonial / hacienda / Mexican-modern) + 2–3 testimonials. GSAP horizontal drag.
8. **Final CTA + footer** — estimate or WhatsApp now. Footer: NAP + service area (local SEO), `/industrial` link, ES/EN, FAQ, privacy.

**Funnel:** one primary action sitewide — *Get my estimate* (coral; hero, sticky nav, mid-page, footer). Soft-capture nets for the not-ready: persistent WhatsApp bubble + "email me my estimate."

## 6. Residential estimator (4 steps, ~45s)

- **Step 1 — Your home:** cozy casa / family home / large estate or B&B / small business (closest match, no bills).
- **Step 2 — What stays on in an outage:** essentials / life as usual / everything (sizes the battery).
- **Step 3 — Solar:** already have / add with my system / battery-only (solar-ready).
- **Step 4 — Results first, capture second:** recommended config (e.g. 12 kW + 16 kWh + N panels), installed price **range** USD/MXN toggle, then name + WhatsApp/email → *Get my exact quote*. Abandon net: "email me this estimate."

**Sizing logic:** small client-side mapping derived from the proposal engine's tiers (same vocabulary; respects the 4-panel inverter-string minimum) so the website estimate never contradicts the real proposal. **Pricing/range computation is an isolated module with a defined interface (`PriceRange = f(config, pricingData)`), implementation deferred** to the pricing-schema rebuild. Until then it renders from a stub/placeholder band so the UX is fully buildable.

## 7. Industrial page `/industrial` (6 sections)

1. **Hero** — "Energy storage that pays for itself — and protects everything." Charcoal, blue-hour BESS imagery. CTA: *Book an energy assessment*.
2. **Four propositions** — peak shaving (reduce GDMTH demand charges) / backup at scale / solar + storage self-supply / power quality. Cards expand to problem → how BESS solves it → what we deliver.
3. **Scale band** — 30–50 kWh commercial → 100–500 kWh light industrial → 1 MWh+ industrial. GSAP bars grow + count up.
4. **Equipment we deploy** — cabinet BESS, containerized MWh-class, three-phase hybrid PCS, monitoring/EMS. Specs only. Optional Three.js container model.
5. **Engagement path** — Assess → Engineer → Install → Operate; GSAP connecting line.
6. **Assessment CTA** — form (company, name, facility type, monthly CFE spend, tariff if known, contact) → same `POST /site-lead`, `segment = industrial`, flagged high-value in CRM.

## 8. CRM integration (firefly-crm Supabase)

- **`GET /site-pricing`** — new public edge function. Returns active-product MSRP map only, cached ~1h (CDN/edge). No auth required; read-only; no cost/margin fields.
- **`POST /site-lead`** — new public edge function. Validates payload, honeypot + rate-limit, dedupes by contact, creates contact + deal with `source=website`, segment (residential|industrial), and all estimator/assessment inputs in deal metadata so the rep's wizard starts pre-filled.
- Both are **additive** to firefly-crm; no schema migration required for the website beyond what the lead payload needs (confirm `contact`/`deal` accept a website source + metadata blob; add a minimal migration only if needed).

## 9. SEO + AI-search (LLM) optimization

- Astro per-page `<title>`/meta/canonical/OG/Twitter; hreflang for ES/EN.
- **JSON-LD:** `LocalBusiness` (NAP, service area = San Miguel de Allende + Mexico), `Product`/`Service` for residential + BESS, `FAQPage`, `BreadcrumbList`.
- Auto `sitemap.xml` (Astro integration) + `robots.txt`.
- **AI/LLM capture:** clear question-shaped H2s, concise factual answer blocks, a rich FAQ, semantic HTML, an `llms.txt` summary of offerings/service area. Plain-language definitional copy that answers "battery backup San Miguel," "BESS peak shaving Mexico," etc.
- Performance for Core Web Vitals: static HTML, lazy-loaded WebGL, responsive images, minimal JS islands.

## 10. Architecture & isolation

- **Astro project** at repo root of `fireflyenergy-website`. `src/pages/` (EN) + `src/pages/es/`; shared `src/components/` (Hero, TrustStrip, FlowDiagram, DefenseCards, EquipmentShowcase, Estimator, ProofGallery, CTA, Footer, industrial variants); `src/content/` i18n strings (one source, two locales); `src/lib/` (sizing map, pricing client, lead client, analytics).
- **FlowDiagram** and **EquipmentShowcase** are self-contained islands with documented props; FlowDiagram is authored so the CRM proposal can import the same component.
- **Estimator** = pure state machine + pluggable `sizing` and `pricing` modules; testable independently of the DOM.
- Each unit: single purpose, well-defined props/interface, independently understandable.

## 11. Out of scope / deferred

- Pricing algorithm + install band (gated on CRM pricing-schema rebuild).
- Migrating/redirecting the live domain (launch is a separate, explicit step).
- Industrial calculator (intentionally excluded).
- Real testimonials/case studies content (placeholders until provided).

## 12. Open items to confirm at build time

- Typical install % or proposal-derived band (when pricing module is wired).
- Final hero media: still photo vs ambient video loop.
- Whether a minimal CRM migration is needed for the website lead source/metadata.
