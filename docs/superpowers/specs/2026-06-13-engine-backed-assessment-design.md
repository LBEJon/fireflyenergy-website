# FireflyEnergy.mx — Engine-Backed Assessment Estimator (design)

**Date:** 2026-06-13
**Supersedes:** the assumption-based quick estimator (Phase 3.3 / `sizing.ts` client-side guess). Pricing is now **gated behind real customer data**.
**Status:** DRAFT — for review before planning/build.

## 1. Principle
**Never show a price from assumptions.** A number appears only after the customer gives enough real data for the same engine the CRM proposal uses to size and price the system. Customers who don't want to answer questions skip straight to a site-visit lead.

## 2. Two doors (estimator entry)
- **Door A — "Get my accurate estimate" (the assessment):** guided steps collect consumption + existing solar + appliance loads → the **real engine** returns a 3-tier estimate. Ends with lead capture ("Get my exact quote") with all inputs attached.
- **Door B — "Have an expert contact me":** short lead capture (name, WhatsApp/email, location, optional note) → CRM lead flagged `site_visit_requested`. **No price shown.** This is the low-friction escape hatch.

Both doors create a CRM lead; Door A's lead carries the full assessment so a rep's wizard is pre-filled.

## 3. The assessment (Door A) — steps
Mirrors the proposal intake. Each step plain-language, bilingual, no price until the end.

1. **Your consumption** — two ways:
   - **Upload your CFE bill** (recommended): file → parsed → we read kWh + billing days → **kWh/day**. Reuses CRM CFE parsing.
   - **Or enter it manually:** average monthly kWh (or "I don't know" → fall back to appliance-derived load only).
2. **Existing solar** — "Do you already have panels?" → if yes: **panel count + watts per panel** → production = `count × watts/1000 × 5.5 PSH × system_eff` (engine constants) → offsets consumption. Sets `hasExistingSolar`, `existingSolarKw`.
3. **Appliance & critical loads** — mirror the engine's list (exact wattages live in the engine):
   - mini-splits (count), refrigerators (count), water pump (none / 110V / 220V), pool pump (y/n), electric oven (y/n), induction cooktop (y/n), elevator (y/n), + base household load (assumed ~600 W).
   - "What must stay on in an outage?" → coverage tier (essential / comfort / full).
4. **Backup goal** — desired backup hours (sizes battery: `(kWh/day ÷ 24) × hours ÷ 0.9`).
5. **Result (price revealed)** — run the engine → 3-tier ladder (Essentials / Critical-circuits + Essential Loads Panel / Recommended), each with the **real** config + price (equipment MSRP + $400 + solar 90% model, IVA separate, USD/MXN) + estimated CFE offset / savings if solar. Then the capture form.

## 4. Architecture — reuse the proposal engine
**New edge function `POST /site-estimate` (firefly-crm, additive, public, read-only):**
- Imports the vendored `_engine.bundle.mjs` (same one `generate-proposal` uses) → calls `analyze(input)` with the website's assessment mapped to the engine input shape (the `dealToInput` contract, but from the request body, not a deal row).
- Injects live catalog MSRP (the website pricing snapshot / or queries active products) so equipment numbers match.
- **Writes nothing.** Returns the 3-tier estimate JSON.
- CORS, rate-limited, input-validated. No cost/dealer data in or out.
- Website `lib/estimateClient.ts` calls it; on failure → graceful "we'll prepare your estimate" + lead capture (never a fake price).

This makes the website estimate identical to the eventual proposal — one engine, one source of truth.

## 5. CFE bill parsing — path + hardening (the sensitive part)
**New edge function `POST /site-cfe-parse` (firefly-crm, public):**
- Accepts a single image/PDF (multipart or base64), size-limited (e.g. ≤ 8 MB), type-allowlisted (jpg/png/pdf).
- Stores to a dedicated **public-intake** storage prefix (not the private `cfe-bills` bucket used by staff), or a temp object with TTL.
- Calls the same Anthropic forced-tool extraction as `extract-cfe-bill` → returns `{ kwh_total, billing_days, kwh_per_day, tariff? }`. Persists nothing to deal/proposal tables.
- **Abuse controls (REQUIRED — this calls the Anthropic API = real cost):**
  - Per-IP rate limit (e.g. N/hour) + global daily cap.
  - File size/type limits; reject non-bills cheaply.
  - Honeypot + optional lightweight challenge if volume spikes.
  - A hard monthly spend ceiling (fail closed → "enter kWh manually" fallback).
- If the customer skips upload, this endpoint is never hit (manual entry path).

## 6. What changes in the current build
- `Estimator.astro` / `Estimator.client.ts`: replaced by the two-door **Assessment** flow. The 3-tier **result UI** is kept (it already renders tiers) but now fed by `/site-estimate`, not client-side `sizing.ts`.
- `sizing.ts` / client `pricing.ts` / `tiers.ts`: demoted to a **fallback only** (used if the endpoint is down) OR removed if we always require the live engine. Decision: keep a minimal fallback that shows "estimate unavailable — request a visit," never a guessed price.
- Homepage calculator teaser → points to the assessment; messaging shifts from "2-minute price" to "get an accurate estimate."
- New: `AssessmentWizard` component(s), `estimateClient.ts`, `cfeUploadClient.ts`, plus the two CRM functions.

## 7. Lead capture (both doors)
- Door A submit → `POST /site-lead` with `segment:'residential'`, `assessment:{consumption, existingSolar, appliances, coverage, backupHours}`, `estimate:{selectedTier, configs}`.
- Door B submit → `POST /site-lead` with `site_visit_requested:true`, minimal contact.
- Honeypot + rate limit on both.

## 8. Security summary (why this needed a spec)
- Three new **public** endpoints (`site-estimate`, `site-cfe-parse`, `site-lead`) → all rate-limited, validated, CORS-scoped, no secrets/cost data exposed.
- **File upload + paid AI call** on `site-cfe-parse` → the main risk; mitigated by size/type limits, per-IP + global caps, hard spend ceiling, fail-closed to manual entry.
- Engine endpoint is read-only and writes nothing.
- All built + tested on localhost; **no deploy** until explicitly approved.

## 9. Decisions (resolved 2026-06-13)
1. **CFE parse exposure:** OPEN, protected — per-IP rate limit + file size/type checks + hard monthly spend ceiling, fail-closed to manual entry. No email gate.
2. **No-consumption fallback:** STRICT no-assumptions — if the customer won't upload a bill or enter kWh, route them to **Door B** (expert contact / site visit). No appliance-only guessed price.
3. **Result tiers:** KEEP the 3-tier ladder (Essentials / Critical-circuits / Recommended), now engine-accurate.
4. **Engine pricing:** `/site-estimate` prices **engine-native** (same MSRP + rules as the proposal) for true parity; the website pricing snapshot is only a fallback if the endpoint is unavailable.
5. **Industrial:** unchanged — still consultative, no calculator.
6. **Plan hardening:** Superpowers track (brainstorm→writing-plans→TDD) + a security-focused review pass.

## 10. Out of scope / deferred
- Deploying the endpoints (separate, explicit step).
- Daily-FX CRM job (still Phase 6b).
- Higgsfield imagery (in progress separately).
