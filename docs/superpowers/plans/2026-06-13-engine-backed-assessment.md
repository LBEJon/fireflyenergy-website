# Engine-Backed Assessment Estimator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the assumption-based quick estimator with a two-door assessment that shows a price only after real customer data, computed by the *same* engine the CRM proposal uses, via three additive public firefly-crm edge functions.

**Architecture:** Website (`site/`, Astro) collects an assessment and calls a new public read-only `POST /site-estimate` that runs the vendored `_engine.bundle.mjs` `analyze()` at essential + chosen coverage, prices each tier with the website pricing model, and writes nothing. CFE bills upload to a hardened public `POST /site-cfe-parse` (reuses the Anthropic forced-tool extraction, rate-limited + spend-capped + fail-closed to manual). Leads (both doors) land via `POST /site-lead`. No consumption → no price → Door B (site visit). All logic is TDD'd as pure functions; the Deno handlers are thin wrappers.

**Tech Stack:** Astro + TS + Vitest (website); Supabase Edge Functions (Deno) in firefly-crm; the existing `_engine.bundle.mjs`; Anthropic Messages API (CFE parse).

**Critical constraints:**
- **No deploy.** firefly-crm functions are built + locally served + tested only; deploy is a later explicit step gated on Jon.
- **Website work under `site/`; CRM work under `firefly-crm/supabase/functions/`.** Never touch fireflyenergy-website repo-root live files.
- **Content rules** (all copy EN+ES): no "weatherproof"/"IP65", no "silent"/"silencioso", no brand/model names (specs only), positive framing, never disparage CFE, plain language.
- **Security (public endpoints):** CORS scoped, input validated, per-IP rate limit, no secret/cost/dealer data in or out; `site-cfe-parse` adds file size/type limits + global daily spend cap + fail-closed.
- **No-assumptions rule:** a price is returned ONLY when `cfeKwhPerDay` is known (from bill or manual kWh). Otherwise the response says `needsSiteVisit:true` and the UI routes to Door B.

---

## Engine contract (reference — do not reimplement the engine)
`analyze(input)` (from `engine/index.js`, bundled as `_engine.bundle.mjs`, `export default { analyze }`):
- **input:** `{ appliances, coverageTier:'essential'|'comfort'|'full', comparisonSet:{inverters:[6.5,7.2,10,12],batteries:[5,10,16]}, existingSolarKw?, cfeKwhPerDay?, proposedSolarKw?, targetStorageKwh?, solarArrays?, hasExistingSolar?, language?, inverterPrices?:{kw:usd} }`
- **appliances:** `{ miniSplits:int, refrigerators:int, waterPump:'none'|'110'|'220', poolPump:bool, electricOven:bool, inductionCooktop:bool, elevator:bool, otherLoads:[] }`
- **returns:** `{ load:{dailyKwh,criticalKw,runningKw,...}, dailyKwh, usageSource, target, recommended:{inverterKw,inverterQty,batteryKwh,batteryQty}, verdicts, capacityWarning, caution, cautionReason, route, reason, language, existingSolarKw, proposedSolarKw }`
- Constants: SMA peak sun hours **5.5**; battery usable **0.9**; `targetStorageKwh = (cfeKwhPerDay/24) × backupHours / 0.9`.
- Existing-solar production: `existingSolarKw = panelCount × panelWatts / 1000`; daily production ≈ `existingSolarKw × 5.5 × systemEff`.

---

## Phase A — firefly-crm edge functions (additive, local only)

Work in `/Users/jondenne/Claude Code/firefly-crm`. Follow the `generate-proposal` Deno pattern: `const CORS = {...}`, `function json(body,status)`, `createClient` from esm.sh. Each function dir gets the vendored bundle as needed. Tests are node `.test.mjs` on the PURE helpers (no network).

### Task A1: `site-estimate` — engine-native 3-tier estimate (no writes)
**Files:**
- Create: `firefly-crm/supabase/functions/site-estimate/index.ts`
- Create: `firefly-crm/supabase/functions/site-estimate/estimate.mjs` (pure: request→engine input→3 tiers→priced)
- Create: `firefly-crm/supabase/functions/site-estimate/estimate.test.mjs`
- Copy: the engine bundle into the function dir as `_engine.bundle.mjs` (so deploy uploads it) — `cp ../generate-proposal/_engine.bundle.mjs ./`
- Create: `firefly-crm/supabase/functions/site-estimate/site-pricing.mjs` (the website pricing model + catalog snapshot, ported from `site/src/lib/pricing.config.ts`+`pricing.ts`)

- [ ] **Step 1: Write failing test** `estimate.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert';
import { buildEstimate } from './estimate.mjs';

const baseBody = {
  language: 'en',
  cfeKwhPerDay: 25,
  backupHours: 12,
  existingSolarKw: 0,
  hasExistingSolar: false,
  addSolarPanels: 8,                 // new panels the customer wants (0 = battery only)
  appliances: { miniSplits: 2, refrigerators: 1, waterPump: '110', poolPump: false, electricOven: false, inductionCooktop: false, elevator: false },
  coverageTier: 'comfort',
};

test('returns three priced tiers when consumption is known', () => {
  const r = buildEstimate(baseBody);
  assert.equal(r.needsSiteVisit, false);
  assert.equal(r.tiers.length, 3);
  const keys = r.tiers.map(t => t.key);
  assert.deepEqual(keys, ['essentials', 'critical', 'recommended']);
  // critical tier costs exactly the Essential Loads Panel more than essentials (same sizing)
  const ess = r.tiers.find(t => t.key === 'essentials');
  const crit = r.tiers.find(t => t.key === 'critical');
  assert.equal(crit.price.equipmentUsd - ess.price.equipmentUsd, 450);
  // recommended is sized by the engine at the chosen coverage
  const rec = r.tiers.find(t => t.key === 'recommended');
  assert.ok(rec.config.inverterKw >= 6.5);
  // IVA is separate
  assert.ok(rec.price.ivaUsd > 0 && rec.price.preIvaUsd > 0);
});

test('no consumption => needsSiteVisit, no price', () => {
  const r = buildEstimate({ ...baseBody, cfeKwhPerDay: undefined });
  assert.equal(r.needsSiteVisit, true);
  assert.equal(r.tiers, undefined);
});

test('existing solar production reduces nothing in price but is reported', () => {
  const r = buildEstimate({ ...baseBody, existingSolarKw: 3.2, hasExistingSolar: true });
  assert.ok(r.existingSolarKw === 3.2);
});
```
- [ ] **Step 2: Run, verify fail:** `cd firefly-crm/supabase/functions/site-estimate && node --test estimate.test.mjs` → FAIL.
- [ ] **Step 3: Implement** `site-pricing.mjs` (port the website model verbatim):
```js
// Website pricing snapshot (USD MSRP, 2026-06-13) — MSRP IS the customer price.
export const PRICING = {
  inverterUsd: { 6.5: 2075, 7.2: 2075, 10: 2600, 12: 2850, 24: 5700 },
  batteryUsd:  { 5: 2150, 10: 3750, 16: 4990, 32: 9980 },
  panelUsd: 275, rackPerPanelUsd: 116, cableOnceUsd: 116, subpanelUsd: 450,
  flatEquipInstallUsd: 400, solarInstallRate: 0.90, ivaRate: 0.16, fxUsdMxn: 18.0,
};
export function priceConfig({ inverterKw, batteryKwh, panels, includeSubpanel }, P = PRICING) {
  const equipmentUsd = (P.inverterUsd[inverterKw] || 0) + (P.batteryUsd[batteryKwh] || 0) + (includeSubpanel ? P.subpanelUsd : 0);
  const equipInstallUsd = P.flatEquipInstallUsd;
  const solarUsd = panels > 0 ? panels * (P.panelUsd + P.rackPerPanelUsd) + P.cableOnceUsd : 0;
  const solarInstallUsd = solarUsd * P.solarInstallRate;
  const preIvaUsd = equipmentUsd + equipInstallUsd + solarUsd + solarInstallUsd;
  const ivaUsd = preIvaUsd * P.ivaRate;
  return { equipmentUsd, equipInstallUsd, solarUsd, solarInstallUsd, preIvaUsd, ivaUsd, totalUsd: preIvaUsd + ivaUsd };
}
```
- [ ] **Step 4: Implement** `estimate.mjs`:
```js
import engine from './_engine.bundle.mjs';
import { priceConfig, PRICING } from './site-pricing.mjs';

const COMPARISON = { inverters: [6.5, 7.2, 10, 12], batteries: [5, 10, 16] };
const ZERO_APP = { miniSplits:0, refrigerators:0, waterPump:'none', poolPump:false, electricOven:false, inductionCooktop:false, elevator:false, otherLoads:[] };

function engineInput(body, coverageTier) {
  const cfeKwhPerDay = (typeof body.cfeKwhPerDay === 'number' && body.cfeKwhPerDay > 0) ? body.cfeKwhPerDay : undefined;
  const backupHours = Number.isFinite(body.backupHours) && body.backupHours > 0 ? body.backupHours : 12;
  const targetStorageKwh = cfeKwhPerDay ? (cfeKwhPerDay / 24) * backupHours / 0.9 : undefined;
  const inp = {
    appliances: { ...ZERO_APP, ...(body.appliances || {}) },
    coverageTier, comparisonSet: COMPARISON,
    existingSolarKw: body.existingSolarKw || 0,
    proposedSolarKw: body.existingSolarKw || 0,
    hasExistingSolar: !!body.hasExistingSolar,
    language: body.language === 'es' ? 'es' : 'en',
  };
  if (cfeKwhPerDay !== undefined) inp.cfeKwhPerDay = cfeKwhPerDay;
  if (targetStorageKwh !== undefined) inp.targetStorageKwh = targetStorageKwh;
  return inp;
}

export function buildEstimate(body) {
  const cfeKwhPerDay = (typeof body.cfeKwhPerDay === 'number' && body.cfeKwhPerDay > 0) ? body.cfeKwhPerDay : undefined;
  if (cfeKwhPerDay === undefined) return { needsSiteVisit: true };

  const panels = Number.isFinite(body.addSolarPanels) && body.addSolarPanels >= 4 ? Math.floor(body.addSolarPanels) : 0;
  const essA = engine.analyze(engineInput(body, 'essential'));
  const recCoverage = ['essential','comfort','full'].includes(body.coverageTier) ? body.coverageTier : 'comfort';
  const recA = engine.analyze(engineInput(body, recCoverage));

  const essCfg  = { inverterKw: essA.recommended.inverterKw, batteryKwh: essA.recommended.batteryKwh, panels, includeSubpanel: false };
  const critCfg = { ...essCfg, includeSubpanel: true };
  const recCfg  = { inverterKw: recA.recommended.inverterKw, batteryKwh: recA.recommended.batteryKwh, panels, includeSubpanel: false };

  const tiers = [
    { key: 'essentials',  config: essCfg,  price: priceConfig(essCfg),  highlighted: recCoverage === 'essential' },
    { key: 'critical',    config: critCfg, price: priceConfig(critCfg), highlighted: false },
    { key: 'recommended', config: recCfg,  price: priceConfig(recCfg),  highlighted: recCoverage !== 'essential' },
  ];
  return {
    needsSiteVisit: false,
    dailyKwh: recA.dailyKwh, usageSource: recA.usageSource,
    existingSolarKw: recA.existingSolarKw, proposedSolarKw: panels > 0 ? panels * 0.645 : 0,
    fxUsdMxn: PRICING.fxUsdMxn, currency: 'USD', tiers,
  };
}
```
- [ ] **Step 5: Run, verify pass.** `node --test estimate.test.mjs` → PASS.
- [ ] **Step 6: Implement the Deno handler** `index.ts` (thin): CORS (GET/POST/OPTIONS), POST only, parse JSON body, **validate** (reject if body > 50 KB, appliances counts are sane non-negative ints ≤ 50, coverageTier in enum), in-memory **per-IP rate limit** (e.g. 30/min via a Map keyed on `x-forwarded-for`), call `buildEstimate`, `json(result)`. No DB client, no secrets. On any throw → `json({error:'estimate_failed'}, 500)` (never partial price).
- [ ] **Step 7:** Local serve + curl via `ctx_execute`: `supabase functions serve site-estimate --no-verify-jwt`, POST the baseBody → assert 3 tiers; POST without cfeKwhPerDay → `needsSiteVisit:true`. 
- [ ] **Step 8: Commit** (firefly-crm): `git add supabase/functions/site-estimate && git commit -m "feat: site-estimate edge function (engine-native, read-only)"`

### Task A2: `site-cfe-parse` — hardened public CFE parse
**Files:**
- Create: `firefly-crm/supabase/functions/site-cfe-parse/index.ts`
- Create: `firefly-crm/supabase/functions/site-cfe-parse/validate.mjs` (pure: file validation + extraction→kWh/day mapping)
- Create: `firefly-crm/supabase/functions/site-cfe-parse/validate.test.mjs`

- [ ] **Step 1: Write failing test** `validate.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert';
import { validateUpload, toConsumption, MAX_BYTES, ALLOWED } from './validate.mjs';

test('rejects oversize + bad type, accepts jpg/pdf under limit', () => {
  assert.equal(validateUpload({ mime: 'image/jpeg', bytes: 1000 }).ok, true);
  assert.equal(validateUpload({ mime: 'application/pdf', bytes: MAX_BYTES }).ok, true);
  assert.equal(validateUpload({ mime: 'image/jpeg', bytes: MAX_BYTES + 1 }).ok, false);
  assert.equal(validateUpload({ mime: 'text/html', bytes: 10 }).ok, false);
});

test('toConsumption derives kWh/day from extraction (kwh over billing days)', () => {
  const c = toConsumption({ kwh_total: 600, period_days: 60 });
  assert.equal(c.kwhPerDay, 10);
  assert.equal(c.kwhTotal, 600);
});
test('toConsumption returns null when fields missing', () => {
  assert.equal(toConsumption({ kwh_total: null, period_days: 60 }), null);
});
```
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** `validate.mjs`:
```js
export const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
export const ALLOWED = new Set(['image/jpeg', 'image/png', 'application/pdf']);
export function validateUpload({ mime, bytes }) {
  if (!ALLOWED.has(mime)) return { ok: false, error: 'unsupported_type' };
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > MAX_BYTES) return { ok: false, error: 'too_large' };
  return { ok: true };
}
export function toConsumption(ext) {
  const kwh = Number(ext?.kwh_total), days = Number(ext?.period_days);
  if (!Number.isFinite(kwh) || kwh <= 0 || !Number.isFinite(days) || days <= 0) return null;
  return { kwhTotal: kwh, periodDays: days, kwhPerDay: kwh / days };
}
```
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Implement the Deno handler** `index.ts`: CORS; POST only; accept base64 `{ mime, dataB64 }`; `validateUpload`; **per-IP rate limit** (e.g. 5/hour) + **global daily counter** (module-level Map/int; when exceeded → 503 `{error:'capacity', fallback:'manual'}`); if `ANTHROPIC_API_KEY` unset → 503 (inert, like extract-cfe-bill); else call Anthropic Messages with the SAME forced `record_cfe_bill` tool shape as `extract-cfe-bill` (copy the tool schema + media block builder), map result via `toConsumption`, return `{ kwhPerDay, kwhTotal, periodDays, tariff? }`. Persist NOTHING. On any failure → `json({error:'parse_failed', fallback:'manual'}, 502)` so the UI falls back to manual entry. Document the spend ceiling constant at top.
- [ ] **Step 6:** Local serve; `ctx_execute` test: oversize → 400; missing key → 503; (skip a real AI call unless key present — assert the 503 inert path). 
- [ ] **Step 7: Commit:** `feat: site-cfe-parse edge function (hardened public CFE parsing)`

### Task A3: `site-lead` — both doors → CRM lead
**Files:**
- Create: `firefly-crm/supabase/functions/site-lead/index.ts`
- Create: `firefly-crm/supabase/functions/site-lead/lead.mjs` + `lead.test.mjs`

- [ ] **Step 1: Write failing test** `lead.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert';
import { buildRecords } from './lead.mjs';

test('door A lead carries assessment + estimate, source website', () => {
  const { contact, deal } = buildRecords({
    name: 'Ana', contact: 'ana@x.com', locale: 'es', segment: 'residential',
    assessment: { cfeKwhPerDay: 25, appliances: { miniSplits: 2 } },
    estimate: { selectedTier: 'recommended', tiers: [{ key: 'recommended' }] }, hp: '',
  });
  assert.equal(contact.source, 'website');
  assert.equal(deal.metadata.segment, 'residential');
  assert.equal(deal.metadata.assessment.cfeKwhPerDay, 25);
  assert.equal(deal.metadata.estimate.selectedTier, 'recommended');
});
test('door B = site_visit_requested, no estimate required', () => {
  const { deal } = buildRecords({ name: 'Bob', contact: '+52 415', locale: 'en', segment: 'residential', siteVisitRequested: true, hp: '' });
  assert.equal(deal.metadata.site_visit_requested, true);
});
test('honeypot filled => throws', () => {
  assert.throws(() => buildRecords({ name: 'x', contact: 'y', hp: 'bot' }));
});
test('missing contact => throws', () => {
  assert.throws(() => buildRecords({ name: 'x', contact: '', hp: '' }));
});
```
- [ ] **Step 2: Run, verify fail. Step 3: Implement** `lead.mjs`:
```js
export function buildRecords(p) {
  if (p.hp) throw new Error('spam');
  const name = (p.name || '').trim(); const contact = (p.contact || '').trim();
  if (!name || !contact) throw new Error('missing_contact');
  const isEmail = contact.includes('@');
  return {
    contact: { full_name: name, email: isEmail ? contact : null, phone: isEmail ? null : contact, source: 'website', language: p.locale === 'es' ? 'es' : 'en' },
    deal: { metadata: {
      segment: p.segment || 'residential',
      site_visit_requested: !!p.siteVisitRequested,
      assessment: p.assessment || null,
      estimate: p.estimate || null,
    } },
  };
}
```
- [ ] **Step 4: Run, verify pass. Step 5: Implement handler** `index.ts`: CORS; POST; honeypot + per-IP rate limit; `buildRecords`; dedupe contact by email/phone; insert contact then deal with `source='website'`; service-role `createClient`. On insert failure → 500 `{ok:false}` (UI shows WhatsApp). 
- [ ] **Step 6:** Check whether `contact.source` + `deal.metadata` columns exist (`list_tables` / inspect migrations); if absent, write additive nullable migration `00NN_site_lead_fields.sql` — do NOT apply. 
- [ ] **Step 7: Commit:** `feat: site-lead edge function (both doors, assessment attached)`

---

## Phase B — website assessment flow (site/, replaces Estimator)

Work in `/Users/jondenne/Claude Code/fireflyenergy-website/site`. Bilingual (en.json/es.json parity). Apply content rules.

### Task B1: assessment types + client mapping + gate (TDD)
**Files:** Create `src/lib/assessment.ts`, `src/lib/assessment.test.ts`.
- [ ] **Step 1: Write failing test** covering: `toEstimateBody(answers)` maps the wizard answers → the `/site-estimate` body shape (appliances object, cfeKwhPerDay from bill or manual monthly kWh ÷ 30, backupHours, existingSolarKw from panelCount×watts/1000, addSolarPanels); `consumptionKnown(answers)` is false when neither bill nor manual kWh present; `existingSolarKw(count, watts)` = count×watts/1000.
```ts
import { describe, it, expect } from 'vitest';
import { toEstimateBody, consumptionKnown, existingSolarKw } from './assessment';
describe('assessment mapping', () => {
  it('existingSolarKw from count + watts', () => { expect(existingSolarKw(8, 645)).toBeCloseTo(5.16); });
  it('manual monthly kWh -> kwhPerDay', () => {
    const b = toEstimateBody({ monthlyKwh: 600, backupHours: 12, appliances: { miniSplits: 2 }, coverageTier: 'comfort', addSolarPanels: 0 });
    expect(b.cfeKwhPerDay).toBeCloseTo(20);
  });
  it('bill kwhPerDay wins over manual', () => {
    const b = toEstimateBody({ billKwhPerDay: 25, monthlyKwh: 600, backupHours: 12, appliances: {}, coverageTier: 'comfort' });
    expect(b.cfeKwhPerDay).toBe(25);
  });
  it('no consumption => consumptionKnown false', () => { expect(consumptionKnown({ appliances: {} })).toBe(false); });
});
```
- [ ] **Step 2-4:** Run fail → implement `assessment.ts` (pure types + the three functions; `toEstimateBody` prefers `billKwhPerDay`, else `monthlyKwh/30`, else leaves `cfeKwhPerDay` undefined) → run pass.
- [ ] **Step 5: Commit:** `feat: assessment mapping + consumption gate (TDD)`

### Task B2: estimate + CFE upload clients
**Files:** Create `src/lib/estimateClient.ts`, `src/lib/cfeUploadClient.ts`.
- [ ] `estimateClient.ts`: `fetchEstimate(baseUrl, body)` POSTs `/functions/v1/site-estimate`; returns the estimate JSON or `{ error:true }` on failure (UI then routes to Door B, never a fake price).
- [ ] `cfeUploadClient.ts`: `parseCfe(baseUrl, {mime, dataB64})` POSTs `/functions/v1/site-cfe-parse`; returns `{kwhPerDay,...}` or `{ fallback:'manual' }` on any non-200 so the UI shows manual entry. File read to base64 client-side with a size guard (≤8 MB) before sending.
- [ ] **Commit:** `feat: estimate + CFE upload clients`

### Task B3: AssessmentWizard components (two doors + steps + result)
**Files:** Create `src/components/assessment/AssessmentEntry.astro` (two doors), `ConsumptionStep.astro`, `ExistingSolarStep.astro`, `AppliancesStep.astro`, `BackupGoalStep.astro`, `ResultTiers.astro` (reuse the existing 3-tier card markup), `SiteVisitLead.astro` (Door B + no-data route), and `Assessment.client.ts` (the wizard state machine binding, calling B1/B2 + leadClient).
- [ ] Build the two-door entry: "Get my accurate estimate" (Door A) and "Have an expert contact me" (Door B → `SiteVisitLead`).
- [ ] Door A steps in order: **Consumption** (tab: upload CFE bill → `parseCfe`, shows parsed kWh/day on success, falls back to manual monthly-kWh field on failure or user choice; "I don't know" → route to Door B), **Existing solar** (have panels? count + watts → production note), **Appliances** (mini-splits count, refrigerators count, water pump none/110/220, pool/oven/cooktop/elevator toggles, coverage essential/comfort/full), **Backup goal** (hours slider/options), then **Result** → `fetchEstimate` → if `needsSiteVisit` route to Door B, else `ResultTiers` (3-tier ladder, pre-IVA + separate IVA, USD/MXN) + capture form ("Get my exact quote" → `submitLead` with assessment+estimate; failure→WhatsApp).
- [ ] All strings from i18n `assessment.*` (add EN+ES, keep parity). Accessibility: fieldset/radiogroup per step, focus management, honeypot on both capture forms. Lazy-hydrate (`client:visible`).
- [ ] **Verify:** `npm run build`; browser pass (playwright): Door A manual-kWh path → 3 tiers; Door A "I don't know" → Door B; Door B → lead capture; no console errors (endpoints 404 in local → graceful Door B / WhatsApp). Screenshot. **Commit:** `feat: assessment wizard (two doors, engine-backed result)`.

### Task B4: wire into pages, retire old estimator
**Files:** Modify `src/pages/calculator.astro` + `es/`, `src/components/Estimator.astro` usage on homepage.
- [ ] Replace `Estimator` on `/calculator` with `AssessmentEntry`. Update homepage calculator teaser copy from "price in 2 minutes" → "get an accurate estimate" (EN+ES). Keep old `Estimator.*`, `sizing.ts`, `tiers.ts`, `pricing.ts` as the documented client-side FALLBACK only (no guessed price shown) OR delete if unused — decide based on whether AssessmentWizard imports them; if unused, delete and note in commit.
- [ ] **Verify:** build + both locales render + browser pass. **Commit:** `feat: wire assessment into calculator + homepage, retire assumption estimator`.

---

## Phase C — verification (REQUIRED SUB-SKILL: superpowers:verification-before-completion)
- [ ] **Security review** (dispatch a focused reviewer): all three functions — CORS scoped, POST-only, input validated, per-IP rate limit present, `site-cfe-parse` has size/type + global cap + fail-closed + inert-without-key, NO secret/cost/dealer data in responses, no DB writes from `site-estimate`, `site-lead` dedupes + service-role only server-side. Confirm no `ANTHROPIC_API_KEY`/service-role leaks to client.
- [ ] **Full suite:** website `npx vitest run` + each function `node --test` all green. `npm run build` ok.
- [ ] **Forbidden-term grep** on `site/` built `dist/` + new copy: `weatherproof|IP65|silent|0 ?dB|silencioso|impermeable` → zero.
- [ ] **Browser E2E:** both doors at 375/1280, both locales; confirm NO price ever appears without consumption.
- [ ] **No deploy.** Confirm nothing was deployed; firefly-crm functions committed but not pushed/deployed; any migration unapplied. Confirm fireflyenergy-website root live files untouched (`git status`).

---

## Self-Review (author checklist — completed)
**Spec coverage:** two doors→A1/B3; no-price-without-data→A1 `needsSiteVisit`+B1 gate+B3 routing; engine reuse→A1; CFE parse+hardening→A2; mirror appliance list→A1 input + B3 AppliancesStep; existing panels→B1 `existingSolarKw`; 3-tier ladder kept→A1 tiers + B3 ResultTiers; both doors→CRM→A3; security→A1/A2/A3 handlers + Phase C; localhost-only/no-deploy→stated + Phase C. No gaps.
**Placeholder scan:** logic/security tasks carry full code + tests; B3/B4 are presentational with exact contracts + a concrete verify method (browser). No "TBD/handle errors" without code.
**Type consistency:** `buildEstimate`→`{needsSiteVisit, tiers:[{key,config:{inverterKw,batteryKwh,panels,includeSubpanel},price:{equipmentUsd,equipInstallUsd,solarUsd,solarInstallUsd,preIvaUsd,ivaUsd,totalUsd},highlighted}]}`; `priceConfig`/`PRICING` identical to website; `validateUpload`/`toConsumption`; `buildRecords`→`{contact,deal}`; `toEstimateBody`/`consumptionKnown`/`existingSolarKw`; `fetchEstimate`/`parseCfe`/`submitLead`. Consistent across tasks.
