# Session Checkpoint — FireflyEnergy.mx redesign + engine-backed assessment

**Saved:** 2026-06-13T21:54:28Z
**Working dir:** /Users/jondenne/Claude Code/fireflyenergy-website (Astro app lives in `site/`)
**Also touches:** /Users/jondenne/Claude Code/firefly-crm (CRM edge functions)
**Primary goal:** Rebuild FireflyEnergy.mx as a modern, bilingual (ES/EN), GSAP + Three.js, lead-generation website — built entirely on localhost, the live Cloudflare site never touched until an explicit launch.

## Current state
The full Warm Editorial site is built and reviewed (homepage, /industrial, /calculator, bilingual, brand tokens, GSAP motion, Three.js equipment showcase, living power-flow diagram, SEO/JSON-LD scaffolding). Mid-session the calculator was redesigned into an **engine-backed two-door assessment** that shows NO price without real customer data, runs the *same* proposal engine the CRM uses via a new public endpoint, and ends in a **two-tier result** (Essentials fixed + Recommended 20% range). Website work is on branch `feature/website-redesign-2026`; the 3 new CRM edge functions are on `feature/site-estimate-fn`. **Nothing is deployed.** Locally the calculator routes to Door B because the CRM endpoints aren't deployed yet — that is expected/by-design.

## Next action
Pick up any of the open items (all independent). The most user-blocked one: **generate the Higgsfield hero image** — the user must run `higgsfield auth login` first (the stale credential lock was already cleared this session). Once authed, generate image #1 (residential dusk hero) from `docs/superpowers/specs/higgsfield-image-prompts.md` → save to `site/public/assets/photos/hero-dusk.jpg` (16:9). The Astro dev server runs at http://localhost:4321 (start with `cd site && npm run dev`).

## What's been done
- Astro bilingual static site scaffolded in `site/` (i18n en/es, sitemap, Base layout with SEO/OG/hreflang/JSON-LD). Brand tokens + 2026 logo SVGs + equipment renders imported.
- Shared components: Nav/Footer/WhatsAppBubble, Hero, TrustStrip, DefenseCards, EquipmentShowcase (Three.js turntable, lazy-loaded, isolated chunk), FlowDiagram (sun/night/outage scenarios, CRM-reusable), ProofGallery, CTASection. Homepage + /industrial (consultative BESS, no calculator) + /calculator pages, both locales. GSAP motion layer (count-up, scroll reveals, all reduced-motion-safe).
- **Engine-backed assessment** (replaces old assumption estimator, which was DELETED): two doors (A=accurate assessment, B=site-visit lead). Door A steps: consumption (CFE bill upload OR manual kWh), existing solar (count+watts→kWp), appliances (mini-splits/fridges/water pump/pool/oven/cooktop/elevator + **"add custom appliance"**→engine otherLoads), backup hours, **solar-panel recommendation that offsets ~100% of usage** (stepper + live offset %), result.
- **Two-tier result** (locked to user spec): **Essentials** = FIXED `{inverterKw:6.5, batteryKwh:5, panels:0, includeSubpanel:true}` (lowest inverter hard-capped ≤6.5kW, lowest battery, critical-loads-only via Essential Loads Panel, battery-only) → single "from $5,075 + IVA". **Recommended** = engine-sized whole-home + their solar → 20% range anchored at the estimate (e.g. $13,629–$16,354 + IVA), "final price quoted after a site visit." The old middle "Critical Circuits" tier was removed.
- 3 CRM edge functions built + security-reviewed (TDD, all green, **NOT deployed**): `site-estimate` (runs vendored `_engine.bundle.mjs analyze`, no DB writes, no secrets), `site-cfe-parse` (public CFE parse: rate-limit + size/type limits + daily spend cap + fail-closed-to-manual + inert without ANTHROPIC_API_KEY), `site-lead` (both doors → contact+deal, dedupe via typed `.eq()`, source='website', assessment in deal.metadata).
- Migration `firefly-crm/supabase/migrations/0064_site_lead_fields.sql` adds `contact.source` + `deal.metadata` — additive, nullable, **UNAPPLIED**.

## Key context the next session needs

### Files that matter
- `docs/superpowers/specs/2026-06-13-engine-backed-assessment-design.md` — the approved assessment spec (decisions in §9).
- `docs/superpowers/plans/2026-06-13-engine-backed-assessment.md` — the implementation plan (Phases A/B/C, all executed).
- `docs/superpowers/specs/2026-06-13-fireflyenergy-website-redesign-design.md` + `plans/2026-06-13-fireflyenergy-website-redesign.md` — the original site spec/plan.
- `docs/superpowers/specs/assessment-flow-review.html` — on-brand HTML walkthrough of the live flow with REAL engine numbers (open in browser to review).
- `docs/superpowers/specs/higgsfield-image-prompts.{md,html}` — 5 image prompts (hero, 3 proof homes, industrial). Safeguard: Firefly brand ONLY, no third-party logos; equipment-in-context (#3) uses real renders in `~/Library/Mobile Documents/com~apple~CloudDocs/Firefly/Equipment Images/`; logos in `.../Firefly/Logo Files (2026)/`.
- `site/src/lib/assessment.ts` — wizard→engine-body mapping; `recommendPanels`, `offsetPct`, `existingSolarKw`, `toEstimateBody`, `otherLoads`. Solar constants: PSH 5.5, SYSTEM_EFF 0.80, panel 645W (≈2.838 kWh/panel/day).
- `site/src/components/assessment/{AssessmentEntry.astro, Assessment.client.ts, SiteVisitLead.astro}` — the wizard UI + state machine + result renderer.
- `site/src/lib/{estimateClient,cfeUploadClient,leadClient}.ts` — HTTP clients (fail-safe; never fake a price/success).
- `firefly-crm/supabase/functions/site-estimate/{estimate.mjs, site-pricing.mjs, index.ts}` — the engine-native estimate + pricing snapshot.
- `firefly-crm/supabase/functions/{site-cfe-parse,site-lead}/` — the other two functions (+ `0064` migration).

### Pricing model (lives ONLY in `site-estimate/site-pricing.mjs`; the website's old client pricing libs were deleted)
- MSRP USD: inverters 6.5/7.2→2075, 10→2600, 12→2850, 24→5700; batteries 5→2150, 10→3750, 16→4990, 32→9980; panel(Longi 645W) 275; rack 116/panel; cable 116 ONCE; Essential Loads Panel (subpanel) 450; flat equip install 400; solar install 90% of solar value; IVA 16% (shown SEPARATELY); fxUsdMxn 18.0 (fixed placeholder).
- Formula: `equip = inv + batt + (subpanel?450:0); solar = panels>0 ? panels*(275+116)+116 : 0; preIva = equip + 400 + solar + solar*0.90; iva = preIva*0.16`.

### Decisions made (and why)
- **Warm Editorial** direction (not the Barragán hybrid) — user picked A, then asked for Barragán-accent moments, then reverted to pure Warm Editorial.
- **Architecture A** — homepage IS the residential story; /industrial is a consultative sibling with NO calculator; /calculator is its own page.
- **No price without real consumption** — gated 3 ways; no bill/kWh → Door B. The old home-type-guess estimator was deleted.
- **Reuse the proposal engine** via public read-only `/site-estimate` (numbers must match the real proposal). **Reuse CFE parsing** via hardened public `/site-cfe-parse`.
- **MSRP = customer price** on the public site (installer margin only applies in the partner portal).
- **IVA shown separately** (pre-IVA figure + "+16% IVA" line).
- **Two tiers only**: Essentials fixed-minimal (single "from" price), Recommended 20% range anchored at the estimate (low=estimate, high=+20% — true price lands bottom-to-middle, room for site specifics). `RANGE_PCT=0.20` is one adjustable constant.
- Content rules (enforced + grep-gated, EN+ES): never "weatherproof"/IP65, never "silent"/"silencioso", no equipment brand/model names (specs only kW/kWh/W), positive/energy-independence framing, never disparage CFE, plain language. Most common config messaging: 12 kW + 16 kWh.

### Gotchas / lessons learned
- **Website repo root = the LIVE Cloudflare site.** NEVER edit root files (root `index.html`, `es/`, `compare/`, `faq.html`, `survey/`, `sitemap.xml`, `wrangler.toml`). ALL work goes in `site/`. There is a pre-existing dirty `redesign/index.html` (+ `redesign/survey.html`, `.superpowers/`) at root that is NOT ours — leave it untouched/unstaged.
- **firefly-crm `.env` SERVICE_ROLE key is STALE (401).** For live DB reads use the Supabase MCP (project id `tlsidpnhpirasfrhxfkz`, "Firefly CRM") — it needs OAuth re-auth at session start (`mcp__plugin_supabase_supabase__authenticate`). The `product` table has `active` (bool), NOT `status`; columns `msrp_usd`, `cost_usd`, `category`, `specs jsonb`.
- **Edge functions tested via `deno run` / `deno check`**, NOT `supabase functions serve` (Docker is down). `node --test` runs the pure `.mjs` helpers.
- **context-mode is active:** no curl/wget (blocked) — use `ctx_execute`/`ctx_batch_execute`. Keep raw output out of context.
- **Higgsfield CLI is `higgsfield`** (not `hf`). A stale lock `~/.config/higgsfield/credentials.json.lock` blocked login and was removed; user still needs to re-run `higgsfield auth login`.
- Subagent commits occasionally left page edits uncommitted → once produced a broken HEAD (pages importing a deleted component). After subagent tasks, verify `git status` in `site/` and that HEAD builds.
- Engine `analyze(input)` returns ONE `recommended` config per coverageTier (not tiers). Bundle is `export default FireflyEngine`; unwrap with `enginePkg?.default ?? enginePkg`.

### What NOT to do
- Don't deploy anything (functions, migrations, web) without explicit user go-ahead — deploy is a separate, gated step.
- Don't re-introduce a guessed/assumption-based price anywhere (the whole point of the redesign).
- Don't lock function CORS to the prod origin yet — `*` is needed for localhost; lock at deploy.
- Don't reach for `playwright-cli` skill in this repo (Google-Drive socket issue noted historically) — use the Playwright MCP for browser checks.

## Open questions / blockers
- **Higgsfield auth** — user must `higgsfield auth login` before image generation (blocker for imagery).
- Tier range anchoring is "low=estimate, high=+20%"; if the user later wants the estimate centered in the band, change to `low=preIva*0.9, high=preIva*1.1` — one-line tweak in `estimate.mjs`.
- Per-instance in-memory rate limits/daily cap on the public functions → true ceiling = cap × isolates; fine for launch, move to KV if abused (deploy-time note).

## Before this can go live (deploy checklist — NOT done)
1. Apply migration `0064_site_lead_fields.sql` (adds `contact.source`, `deal.metadata`).
2. Deploy the 3 functions: `supabase functions deploy site-estimate site-cfe-parse site-lead` (set `ANTHROPIC_API_KEY` for cfe-parse; service-role auto-present).
3. Set `PUBLIC_SUPABASE_URL` (+ anon key) in the site env so the clients hit the functions.
4. Lock function CORS `Access-Control-Allow-Origin` to `https://fireflyenergy.mx`.
5. Replace the fixed `fxUsdMxn: 18.0` with a daily-FX source (planned: small CRM daily-rate job reading Banxico FIX).
6. Point Cloudflare at `site/dist` (the launch step — retires the old root files).

## Resume prompt
Continue the FireflyEnergy.mx redesign. Read @/Users/jondenne/Claude Code/fireflyenergy-website/.claude/checkpoints/checkpoint-20260613-155428-fireflyenergy-redesign.md for full state. The bilingual Warm Editorial site + engine-backed two-door assessment are BUILT on branch `feature/website-redesign-2026` (Astro in `site/`, dev server `cd site && npm run dev` → localhost:4321) and the 3 CRM edge functions on `feature/site-estimate-fn` in ~/Claude Code/firefly-crm — nothing deployed. Do NOT touch website repo-root live files (work only in `site/`); no curl/wget (use ctx_execute); CRM live reads via the Supabase MCP (project tlsidpnhpirasfrhxfkz), the .env key is stale. Remaining work: (1) generate the Higgsfield hero image once the user has run `higgsfield auth login` (prompts in docs/superpowers/specs/higgsfield-image-prompts.md → site/public/assets/photos/hero-dusk.jpg) and wire the 5 images in; (2) the deploy checklist (migration 0064, deploy 3 functions, set PUBLIC_SUPABASE_URL, lock CORS); (3) the daily-FX CRM job to replace the fixed 18.0 rate; (4) SEO/Core-Web-Vitals final verification pass. Ask the user which to start with.
