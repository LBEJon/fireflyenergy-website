# Plan: FireflyEnergy.mx lead-capture workflow (durable capture → n8n fan-out)
_Locked via grill — by Claude + Jon (2026-06-14)_

## Goal
Make the marketing site's existing lead forms actually capture leads, with **zero data loss** as the
overriding requirement (Jon has been burned by silent Airtable write failures). The site front-end
already POSTs a rich `LeadPayload` to `${PUBLIC_SUPABASE_URL}/functions/v1/site-lead`, but that edge
function and its storage do not exist yet — so every submission currently falls back to WhatsApp.
We build the backend as a **capture-first** pipeline: the lead is durably persisted before anything
that can fail (CRM write, notification) runs, and a reconcile job retries anything that didn't
complete. Everything lives in the existing **Firefly CRM** Supabase project (`tlsidpnhpirasfrhxfkz`).

## Approach
1. **`site_lead` table (CRM Supabase, new migration).** System of record / durable buffer.
   Columns (proposed): `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`,
   `name text not null`, `contact_raw text not null`, `email text`, `phone text`, `segment text`,
   `locale text`, `answers jsonb`, `config jsonb`, `source text default 'website'`,
   `status text not null default 'received'` with `CHECK (status in
   ('received','processing','processed','error'))` — text+CHECK, NOT a new enum type, to avoid
   enum-migration friction on the prod CRM. `crm_contact_id uuid`, `crm_contact_matched boolean`,
   `attempts int not null default 0`, `last_error text`, `processing_at timestamptz`,
   `processed_at timestamptz`, `notified_at timestamptz`, `ip text`, `user_agent text`.
   RLS **enabled with NO anon/authenticated policies**, plus explicit
   `REVOKE ALL ON site_lead FROM anon, authenticated` (defence-in-depth vs PostgREST) — only the
   service role (which bypasses RLS) reads/writes. The public never touches the table directly.
2. **`site-lead` edge function (Deno, `verify_jwt=false`).** The ONLY public surface.
   - CORS: reflect origin only if in `ALLOWED_ORIGINS` (env): `https://fireflyenergy.mx`,
     `https://www.fireflyenergy.mx`, and `*.pages.dev` previews. The pages.dev wildcard MUST be
     anchored — match `^https://[a-z0-9-]+\.pages\.dev$` (never substring/`endsWith`, which would let
     `pages.dev.attacker.com` through). Handle `OPTIONS` preflight.
   - **Abuse limits:** reject bodies over ~32 KB; cap `name`/`contact` length (~200 chars) and
     `answers`/`config` serialized size (~16 KB); **honeypot**: if `hp` non-empty, return 200
     `{ok:true}` WITHOUT inserting (silently swallow the bot); **per-IP throttle** — reject (HTTP 429,
     still CORS-friendly) if this IP has inserted more than ~5 rows in the last minute (a
     `select count(*) from site_lead where ip=$1 and created_at > now()-interval '1 min'` check via
     service role before inserting).
   - Parse `contact` → `email` (contains `@`, lowercased+trimmed) or `phone` (digits only; if 10 digits
     assume MX-local and prepend `52`), keep the raw string in `contact_raw`.
   - **INSERT the `site_lead` row via service role.** Respond `200 {ok:true}` the instant this succeeds.
     This is the durability guarantee — success is returned ONLY after the row is committed.
   - After responding, **best-effort** POST to `N8N_WEBHOOK_URL` carrying `{ lead_id }` +
     `X-Webhook-Secret: WEBHOOK_SHARED_SECRET`, via `EdgeRuntime.waitUntil` if available, else awaited
     with a ~2 s timeout. **Durability does NOT depend on this call** — if it fails or `waitUntil` is
     unavailable, the row stays `status='received'` and the reconcile job (step 4) processes it. The
     n8n POST is purely a latency optimization for the happy path. Never fails the user response.
3. **n8n "site-lead processor" workflow (new, webhook-triggered).**
   - Verify `X-Webhook-Secret`. **Atomically claim** the row to prevent the webhook and the reconcile
     job from processing the same lead at once: `UPDATE site_lead SET status='processing',
     processing_at=now() WHERE id=$1 AND status IN ('received','error') RETURNING *`. If it returns no
     row, another worker already owns it → exit. Only the claimer proceeds.
   - **Contact dedup:** look up `contact` by normalized email OR phone (normalize BOTH sides in the
     query — e.g. `lower(email)` and `regexp_replace(phone,'\D','','g')` — since stored values aren't
     pre-normalized). If found → reuse (set `crm_contact_matched=true`), do NOT create a duplicate. If
     not found → insert a new `contact` (`full_name`=name, `email`/`phone`/`whatsapp`,
     `language`=locale). **Contact only — no deal.**
   - **Email Jon** (existing `jondenne@lbedesign.com` cred → `jon@fireflyenergy.mx`) — but only if
     `notified_at IS NULL` (notify-once guard); set `notified_at=now()` immediately on successful send.
     Subject/body = name / contact / segment / system-size summary; "returning lead" tag when matched.
     (This email is the server-side backstop; the repliable WhatsApp comes from the customer's `wa.me`
     handoff on the site — see step 6. No Twilio.)
   - On success: update `site_lead` → `status='processed'`, `crm_contact_id`, `processed_at`. On any
     failure: `status='error'`, `last_error`, `attempts=attempts+1` (leave for retry).
4. **n8n "site-lead reconcile" workflow (new, scheduled ~every 15 min).** Select `site_lead` where
   `status in ('received','error')` AND `attempts < 5` AND `created_at < now()-interval '2 min'`
   AND (`processing_at IS NULL OR processing_at < now()-interval '10 min'`) (re-claims stale
   `processing` rows whose worker died), and re-drive each through the SAME claim→process logic in
   step 3. This is the backstop that makes lost leads impossible.
5. **n8n "stuck-lead digest" (new, scheduled daily).** Email Jon a digest of any `site_lead` with
   `status='error'` and `attempts >= 5` (terminal failures needing manual attention) — mirrors the
   existing `ErrorsNotifications` pattern so silent dead-ends surface within 24 h.
6. **Front-end:** add the **`wa.me` success handoff** (the repliable notification). Today the site only
   opens `wa.me` on submit *failure*; change it so a *successful* submit ALSO opens the customer's
   WhatsApp pre-filled to Jon's number (`common.whatsapp`) with a short intro (name + segment + "I just
   requested a quote on fireflyenergy.mx"). Customer taps send → Jon gets it from their number → replies
   in-thread. `leadClient.ts` already posts the correct payload (no change there). Config: set
   `PUBLIC_SUPABASE_URL` to the CRM project URL, and set `common.whatsapp` (currently the placeholder
   `5214150000000`) to Jon's real number at build/deploy.
   ONE thing to verify first: `leadClient` sends NO `apikey`/`Authorization` header. Confirm a
   `verify_jwt=false` function is invocable header-less on this Supabase project; if the gateway still
   requires an `apikey`, add the project's (public) publishable key to the request headers.

## Key decisions & tradeoffs
- **Capture-first durability (Approach A).** Durable insert precedes CRM/notify; the HTTP 200 means
  "saved," not "fully processed." Trades a tiny bit of latency-to-CRM for never losing a lead.
- **Reuse the CRM Supabase project** rather than a separate site project. Simpler, one DB; the cost is
  a public edge function on the production CRM — mitigated by `verify_jwt=false` + strict input
  validation + honeypot + service-role-only table RLS (no anon table access).
- **Contact only, never a deal.** The `deal` table has 6 NOT-NULL columns + enums + a stage write-guard
  RPC; auto-filling it from the web is fragile. The full assessment is preserved on `site_lead.answers`
  /`config` for a rep to build the deal in the CRM wizard. Robustness over richness.
- **Match-and-don't-duplicate dedup** by normalized email OR phone — directly avoids the duplicate-
  contact cleanup Jon has done before.
- **Notification = customer-initiated `wa.me` handoff + server-side email backstop (NO Twilio).** This
  mirrors the existing Airtable survey UX: on submit the site opens the *customer's own* WhatsApp
  pre-filled to Jon's number, so the message arrives FROM the customer and Jon can reply in-thread.
  A Twilio push would arrive from a Twilio number (not repliable to the customer) and add
  template/24h-window/sandbox-expiry friction — so it's dropped. Because `wa.me` needs the customer to
  tap send (client handoff, not guaranteed), n8n ALSO emails Jon for every lead (the guaranteed
  server-side heads-up). Durable `site_lead` capture happens regardless of either.
- **n8n is the fan-out mechanism, not redundant with the CRM.** n8n writes to the CRM + notifies +
  retries; the `site_lead` table is the safety net. The edge function stays decoupled from CRM schema.
- **CORS excludes localhost** (Jon's choice: prod domains + `*.pages.dev` only).

## Risks / open questions
- **Pre-launch E2E testing without localhost CORS.** How do we test the real form submit before launch?
  Options: (a) test on a `*.pages.dev` preview deploy (already allowlisted); (b) temporarily add
  localhost to `ALLOWED_ORIGINS` in a dev-only function deploy; (c) hit the function directly with
  curl/n8n (no Origin = no CORS enforcement server-side). Leaning (a). **Confirm.**
- **Twilio WhatsApp business-initiated template approval.** Self-alerts may require an approved template
  and respect the 24h session window; email fallback mitigates but template setup is a prerequisite task.
- **Phone normalization.** MX numbers arrive as `+52…`, `52…`, or local; normalize to digits for the
  dedup match to be reliable. Email lowercased/trimmed.
- **Reconcile idempotency.** Reconcile must not double-create contacts or double-notify; guard on
  `status` transitions and the contact-match lookup. Cap `attempts` (5) then leave `error` for manual review.
- **`EdgeRuntime.waitUntil` availability** on Supabase Edge (Deno Deploy) — verify the post-response
  hook actually runs; if unavailable, fall back to awaiting the n8n POST with a short timeout (reconcile
  still covers failures).
- **Header-less invocation** of the `verify_jwt=false` function — see Approach step 6; confirm before
  wiring, since the whole front-end path assumes no `apikey` is needed.
- **Residual duplicate-contact risk:** the atomic claim serializes processing of a *single* lead, but
  two *different* brand-new leads for the same person arriving within the same window could both miss
  the dedup match and both insert a contact. Low probability; accept-and-clean, or (riskier) add a
  partial unique index on normalized email/phone to `contact` — deferred because the prod table may
  already hold duplicates that would break the index.
- **Twilio per-message cost + sandbox vs production sender** — confirm a production WhatsApp sender (not
  just the sandbox, which only messages pre-joined numbers) before relying on it; sandbox is fine for testing.
- **Reviewed via Superpowers self-critique, not cross-model** — Codex Act 2 was blocked by a usage limit
  (see PLAN-REVIEW-LOG.md). If a cross-model pass is wanted later, the plan is ready to hand to Codex unchanged.

## Resolved build inputs (2026-06-14)
- **Supabase project URL:** `https://tlsidpnhpirasfrhxfkz.supabase.co` (Firefly CRM).
- **Notifications (NO Twilio):** customer-initiated **`wa.me` handoff** on the site (repliable, mirrors
  the current Airtable survey UX) + **server-side email backstop** via the existing
  **`jondenne@lbedesign.com`** n8n email credential, **recipient = `jon@fireflyenergy.mx`**. Need from
  Jon: his real WhatsApp number (for `common.whatsapp` / the `wa.me` target). The current live Airtable
  survey workflows (`H4pwSumKPKjHvI22`, `L5KMtObXVtVOCzwN`) have NO send node — confirmed the WhatsApp
  is a front-end `wa.me` click from the customer, which is the pattern we replicate.
- **E2E testing:** Cloudflare **`*.pages.dev` preview** deploy (already CORS-allowlisted); no localhost CORS.
- **New-contact owner:** **unassigned** (`owner_rep_id`/`owner_installer_id` null); `source='website'`
  recorded on `site_lead`.

## Out of scope
- The **Solutions page** (separate spec, brainstormed next).
- **Deal creation** in the CRM (contact only).
- The calculator's **estimate / CFE-parse edge functions** (`fetchEstimate`/`parseCfe` hit the same
  base URL but are separate functions; the calculator needs them but they're not part of lead-capture).
- **Legacy Airtable intake** workflows (superseded; CRM is the new system of record).
- **Actual production deploy / launch** — gated on Jon's explicit go-ahead (nothing deployed without OK).
