# Session Checkpoint — FireflyEnergy.mx redesign (FAQ port + diagram/protections polish)

**Saved:** 2026-06-14T15:20:50-06:00
**Working dir:** /Users/jondenne/Claude Code/fireflyenergy-website/site
**Primary goal:** Rebuild FireflyEnergy.mx as a modern, bilingual (EN/ES) Astro lead-gen site entirely on localhost; the live Cloudflare site is never touched until an explicit launch.

## Current state
All this session's work is complete and verified on localhost (dev server `:4322`), nothing committed or deployed. Last task done: ported the FAQ page from the live site (`fireflyenergy.mx/faq`) into the new Astro site — bilingual, on-brand, with FAQPage JSON-LD, rendering clean on `/faq/` and `/es/faq/`. Earlier in the session: widened the power-flow diagram to 16:9 (responsive desktop/mobile), and rebuilt the "protections" (DefenseCards) section into a 3×2 grid of six with a stat band.

## Next action
Await user direction. Open offers on the table: (1) wire the FAQ into the top nav (`Nav.astro`) — it's currently only linked from the footer; (2) adjust FAQ copy. No blocking work. If resuming a different thread, the redesign checklist still has: real customer testimonials (ProofGallery is placeholder), deploy prep (set `PUBLIC_SUPABASE_URL`, lock CORS, migration/edge-fn deploys), daily-FX job (replace fixed 18.0 MXN rate), SEO/Core-Web-Vitals pass.

## What's been done (this session)
- **FAQ page ported** — 13 Q&As across 5 categories (System operation, Equipment, Installation, CFE & billing, Warranty & support), faithful EN+ES, including the two spec/warranty tables and bullet lists. Native `<details>` accordions, icon jump-nav, FAQPage JSON-LD. Verified: 0 console errors, 13 items / 2 tables / 3 lists, ES strings + schema (13 questions) confirmed via Playwright.
- **Power-flow diagram → 16:9 responsive** — desktop uses wide viewBox `-80 66 1080 600` with corner nodes spread out + status banner overlaid (now `top:78%`, `width:min(44%,360px)` — sits below inverter, clears battery 57px / home 87px / dots 19px). Mobile (≤680px) swaps via JS `fdLayout()` to a tighter/taller viewBox `0 66 920 600` (nodes shifted back inward, paths/outage-X reset) so equipment reads larger; banner drops to static-below on mobile.
- **DefenseCards rebuilt** — single 3×2 grid of six protections, no expand/collapse. Replaced removed "Lightning surges" card with legit sixth "Flicker & brief dropouts" / "Parpadeos y microcortes". Per-card `<20ms/Full protection` badges removed; folded into a new **stat band** (white bordered card: lead sentence + 4 stats `<20 ms`/`60×/sec`/`100%`/`24/7`, desktop 4-up, mobile 2×2) that replaces the old "weird placeholder" chip line. Title now "Six ways…".

## Key context the next session needs
### Files that matter (all under `site/`)
- `src/lib/faqData.ts` — typed FAQ content (EN+ES) + `faqJsonLd(locale)`. Single source for page + SEO schema. Edit FAQ copy here, NOT in i18n JSON.
- `src/components/Faq.astro` — renders FAQ (header, icon jump-nav, per-category `<details>`, table/list CSS).
- `src/pages/faq.astro` + `src/pages/es/faq.astro` — Base + Nav + Faq + CTASection + Footer + WhatsAppBubble; `path="faq"` (footer already linked this).
- `public/diagram/power-flow.html` — self-contained animated bilingual SVG diagram (embed mode `?embed&lang=`). Holds the responsive `fdLayout()` JS + `#flow-banner` CSS.
- `src/components/DefenseCards.astro` — the protections grid + stat band.
- `src/content/en.json` / `es.json` — flat i18n. `defense.*` keys updated (title→Six, stat_* keys added, c6 → flicker, removed see_all/chip_*/chips).
- `src/components/PowerFlow.astro` — host wrapper (auto-resizing iframe via postMessage).
- `src/layouts/Base.astro` — handles canonical + hreflang from `path`; pass meta `title`/`description` as props.

### Decisions made (and why)
- FAQ content kept in `faqData.ts`, not flat i18n JSON — too rich (bold/lists/tables) for flat strings; one typed source drives page + JSON-LD.
- Added Warranty as its own category/jump-nav entry (old site had it as a category but omitted from the top filter).
- Removed per-card protection badges in favor of one stat band — repeating `<20ms`/`Full protection` ×6 read as noise. **Flagged to user; they may want badges back.**
- Diagram: inverter is the fixed center anchor (x=460) in both layouts; only corner nodes + paths move between desktop/mobile.

### Gotchas / lessons learned
- **Stale-CSS on `.astro` edits:** editing an `.astro` `<style>` can leave the Vite/Astro dev server serving OLD compiled CSS (markup updates, CSS module doesn't invalidate) — symptom: new selectors absent from `document.styleSheets` while old ones apply. Fix: restart the dev server (`kill` the PID on `:4322`, then `npm run dev -- --port 4322`). Happened with the DefenseCards stat band this session.
- Two `astro dev` processes run on this machine (one per port); only restart the `:4322` one. Dev log: `/tmp/firefly-dev-4322.log`.
- `playwright-cli` can't run here (Google-Drive socket) — use the **Playwright MCP** (`mcp__plugin_playwright_playwright__*`).
- context-mode blocks `curl`/`wget`/WebFetch — use `ctx_fetch_and_index` then `ctx_search`.
- Screenshots from Playwright MCP land in the project ROOT (`Claude - Antigravity/`), not `site/` — read them there.
- Inverter bounding box includes a large invisible ambient-glow circle (r=244); ignore its `getBoundingClientRect().bottom` when checking banner-vs-inverter overlap.

### What NOT to do
- Don't touch repo-root live files — work ONLY in `site/`.
- Don't commit or deploy without explicit go-ahead.
- Don't edit FAQ copy in `en.json`/`es.json` — it lives in `faqData.ts`.
- Don't reintroduce a lightning-strike protection claim (can't protect faster than a strike); surge protection is fine.
- CRM `.env` SERVICE_ROLE key is stale (not relevant to this site, but noted).

## Open questions / blockers
- Keep the consolidated stat band, or restore per-card `<20ms`/`Full protection` badges on each of the 6 cards?
- Add FAQ link to the top nav (`Nav.astro`), or leave footer-only?

## Resume prompt
Continue the FireflyEnergy.mx Astro redesign — work ONLY in `/Users/jondenne/Claude Code/fireflyenergy-website/site`, localhost only, nothing committed/deployed without my OK. Full state in @.claude/checkpoints/checkpoint-20260614-152050-fireflyenergy-faq-diagram.md. Dev server runs on `:4322` (restart it if `.astro` style edits don't show — known stale-CSS issue). Use the Playwright MCP (not playwright-cli) to verify; screenshots save to the project root. The FAQ page (`/faq/`, `/es/faq/`) was just finished and verified. Next: tell me whether to (a) add the FAQ to the top nav and/or (b) restore the per-card protection badges — otherwise pick up the redesign checklist (testimonials, deploy prep, daily-FX, SEO/CWV).
