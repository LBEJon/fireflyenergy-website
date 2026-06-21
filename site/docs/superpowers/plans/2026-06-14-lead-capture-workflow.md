# Lead-Capture Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the FireflyEnergy.mx lead forms durably capture every lead — persisting to a `site_lead` buffer in the CRM Supabase before any fallible downstream step, then fanning out via n8n to a CRM contact + a Twilio-WhatsApp alert (email fallback), with a reconcile retry so no lead is ever lost.

**Architecture:** Capture-first (Approach A). The public `site-lead` edge function validates + inserts ONE `site_lead` row (system of record) and returns `{ok:true}` the instant that commits; it then best-effort pings an n8n webhook. n8n (processor) atomically claims the row, dedupes/creates a **contact only** in the CRM, sends the WhatsApp alert (email fallback), and flips status. A 15-min reconcile re-drives anything unfinished; a daily digest surfaces terminal failures. This **supersedes a never-deployed v1** (branch `feature/site-estimate-fn`) that took the rejected inline contact+deal approach and doesn't match the live schema.

**Tech Stack:** Supabase (Postgres + Deno Edge Functions), n8n (czlonkowski MCP), Twilio WhatsApp (sandbox first), Astro front-end (already posts the payload). Tests: `node --test` (backend pure modules), Playwright MCP (front-end E2E on a `*.pages.dev` preview).

---

## ⚠️ Decision update — notifications (2026-06-14, supersedes Twilio everywhere below)
We learned the current Airtable survey's "message from the customer's WhatsApp, I can just reply" UX is
NOT sent by n8n — the live workflows (`H4pwSumKPKjHvI22`, `L5KMtObXVtVOCzwN`) have no send node; it's a
front-end **`wa.me` click-to-chat from the customer**. Twilio would break that (alert comes from a
Twilio number, not repliable). **Decision: DROP Twilio.** Notification =
1. **Front-end `wa.me` success handoff** (new front-end task): on a *successful* submit, open the
   customer's WhatsApp pre-filled to Jon's number (`common.whatsapp`, set to Jon's real number) — the
   repliable channel. (Site currently does `wa.me` only on *failure*; extend to success.)
2. **n8n email backstop** (replaces the Twilio node in the Processor): email
   `jon@fireflyenergy.mx` via the existing `jondenne@lbedesign.com` cred, notify-once guarded.
**Task 5 changes:** delete the `Twilio WhatsApp` node and any WhatsApp-error branching; the notify step
is just the email (notify-once → email → mark notified → finalize). No Twilio creds, sandbox, or `to`
number needed. **Resolved inputs change:** drop Twilio; need Jon's WhatsApp number for `wa.me`; email
cred + recipient unchanged. The Processor workflow `pUiiaKEJCY5mK6cj` is being simplified accordingly.

## Critical pre-flight facts (verified 2026-06-14)

- **Live CRM project:** `tlsidpnhpirasfrhxfkz` (`https://tlsidpnhpirasfrhxfkz.supabase.co`).
- **Live migrations run to `0079`** (`accounting_brex_ingest`); a parallel session is actively adding more. **The true next free version MUST be re-checked with `list_migrations` immediately before applying** — it may be > `0080`. Apply via `execute_sql` (DDL + an explicit `insert into supabase_migrations.schema_migrations(version,name)`), NOT `apply_migration` (which records a timestamp version and breaks alignment). [memory: project_firefly_crm_po_local_delivery]
- **Repo divergence:** the `firefly-crm` checkout is on the stale `feature/site-estimate-fn` branch (local migrations only to `0064_site_lead_fields`, which *collides* with live's `0064_contact_name_parts` and was never applied). **Do NOT build there.** Build in a fresh worktree off `origin/main` (which has 0065–0079).
- **`site-lead`, `site-estimate`, `site-cfe-parse` are NOT deployed** to live; nothing in production to break. (`site-estimate`/`site-cfe-parse` stay OUT OF SCOPE — they power the calculator's price/CFE parse, not lead capture. Test lead capture via **Door B / site-visit**, which submits without an estimate.)
- **`contact.language` enum = `'en' | 'es'`.** `contact.source` does NOT yet exist on live (added by our migration). Deal stays untouched (contact-only).
- **Payload reality:** the site posts `LeadPayload { name, contact, segment, locale, answers, config, hp }` (site/src/lib/leadClient.ts). The v1 `lead.mjs` wrongly read `assessment`/`estimate` — we store `answers`/`config` verbatim as jsonb instead.

---

## File structure

**firefly-crm (fresh worktree off origin/main — e.g. `~/Claude Code/firefly-crm-leadcapture`):**
- Create: `supabase/migrations/0080_site_lead_capture.sql` — `site_lead` table + `contact.source` + RLS/REVOKE + index.
- Rewrite: `supabase/functions/site-lead/lead.mjs` — pure `buildLeadRow(payload, meta)` (one `site_lead` row).
- Rewrite: `supabase/functions/site-lead/lead.test.mjs` — `node --test` for `buildLeadRow`.
- Rewrite: `supabase/functions/site-lead/index.ts` — Approach A handler (capture-first insert + best-effort n8n ping).

**n8n (built via `mcp__n8n-mcp__*`, validated before activation):**
- `Firefly Site Lead — Processor` (webhook): claim → dedupe/create contact → WhatsApp (sandbox) → email fallback → status.
- `Firefly Site Lead — Reconcile` (schedule 15 min): re-drive unfinished leads.
- `Firefly Site Lead — Stuck Digest` (schedule daily): email terminal failures.

**site (this repo):**
- Config: ensure `PUBLIC_SUPABASE_URL=https://tlsidpnhpirasfrhxfkz.supabase.co` at build/deploy (Astro `import.meta.env.PUBLIC_*`).
- Verify only (no code change expected): `src/lib/leadClient.ts` posts the right shape.

---

## Task 1: Isolated worktree off origin/main

**Files:** none (workspace setup).

- [ ] **Step 1: Fetch latest and create a clean worktree**

```bash
git -C "/Users/jondenne/Claude Code/firefly-crm" fetch origin main
git -C "/Users/jondenne/Claude Code/firefly-crm" worktree add -b feature/site-lead-capture "/Users/jondenne/Claude Code/firefly-crm-leadcapture" origin/main
```

- [ ] **Step 2: Confirm the worktree has the funnel migrations (0065–0079 present, no stale 0064 collision)**

Run: `ls "/Users/jondenne/Claude Code/firefly-crm-leadcapture/supabase/migrations" | tail -5`
Expected: shows `0079_accounting_brex_ingest.sql` (or later); NO `0064_site_lead_fields.sql`.

- [ ] **Step 3: Install deps (for `node --test`)**

Run: `cd "/Users/jondenne/Claude Code/firefly-crm-leadcapture" && npm install`
Expected: completes without error.

---

## Task 2: Pure lead-row builder (TDD)

**Files:**
- Test: `supabase/functions/site-lead/lead.test.mjs`
- Modify (rewrite): `supabase/functions/site-lead/lead.mjs`

- [ ] **Step 1: Write the failing test**

```js
// supabase/functions/site-lead/lead.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLeadRow } from './lead.mjs';

test('email contact → lowercased email, null phone', () => {
  const r = buildLeadRow({ name: ' Ana ', contact: 'Ana@Example.com', locale: 'es',
    segment: 'residential', answers: { a: 1 }, config: { selectedTier: 'recommended' } });
  assert.equal(r.name, 'Ana');
  assert.equal(r.email, 'ana@example.com');
  assert.equal(r.phone, null);
  assert.equal(r.locale, 'es');
  assert.equal(r.segment, 'residential');
  assert.deepEqual(r.answers, { a: 1 });
  assert.equal(r.source, 'website');
  assert.equal(r.status, 'received');
});

test('10-digit phone → MX-normalized with 52 prefix, null email', () => {
  const r = buildLeadRow({ name: 'Bob', contact: '(415) 123-4567' });
  assert.equal(r.email, null);
  assert.equal(r.phone, '524151234567');
  assert.equal(r.segment, 'residential'); // default
  assert.equal(r.locale, 'en'); // default
});

test('honeypot throws spam', () => {
  assert.throws(() => buildLeadRow({ name: 'X', contact: 'x@y.z', hp: 'bot' }), /spam/);
});

test('missing name or contact throws missing_contact', () => {
  assert.throws(() => buildLeadRow({ name: '', contact: 'x@y.z' }), /missing_contact/);
  assert.throws(() => buildLeadRow({ name: 'X', contact: '  ' }), /missing_contact/);
});

test('over-long fields throw field_too_long', () => {
  assert.throws(() => buildLeadRow({ name: 'a'.repeat(201), contact: 'x@y.z' }), /field_too_long/);
});

test('industrial segment + meta ip/userAgent passthrough', () => {
  const r = buildLeadRow({ name: 'Co', contact: 'co@x.com', segment: 'industrial' },
    { ip: '1.2.3.4', userAgent: 'UA' });
  assert.equal(r.segment, 'industrial');
  assert.equal(r.ip, '1.2.3.4');
  assert.equal(r.user_agent, 'UA');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/jondenne/Claude Code/firefly-crm-leadcapture" && node --test supabase/functions/site-lead/lead.test.mjs`
Expected: FAIL — `buildLeadRow` is not exported (old file exports `buildRecords`).

- [ ] **Step 3: Rewrite the implementation**

```js
// supabase/functions/site-lead/lead.mjs
// Pure record-builder for the public site-lead edge function (Approach A).
// Produces ONE `site_lead` row — the durable capture buffer. Contact creation +
// dedupe happen downstream in n8n, so this stays simple and side-effect-free
// (unit-tested under node, reused verbatim by the Deno handler).
const MAX_LEN = 200;

export function buildLeadRow(p, meta = {}) {
  if (p.hp) throw new Error('spam'); // honeypot tripped → caller quietly 200s
  const name = (p.name || '').trim();
  const contactRaw = (p.contact || '').trim();
  if (!name || !contactRaw) throw new Error('missing_contact');
  if (name.length > MAX_LEN || contactRaw.length > MAX_LEN) throw new Error('field_too_long');

  const isEmail = contactRaw.includes('@');
  const email = isEmail ? contactRaw.toLowerCase() : null;
  let phone = null;
  if (!isEmail) {
    const digits = contactRaw.replace(/\D/g, '');
    phone = digits.length === 10 ? '52' + digits : digits; // MX-local → +52
  }

  return {
    name,
    contact_raw: contactRaw,
    email,
    phone,
    segment: p.segment === 'industrial' ? 'industrial' : 'residential',
    locale: p.locale === 'es' ? 'es' : 'en',
    answers: p.answers ?? null,
    config: p.config ?? null,
    source: 'website',
    status: 'received',
    ip: meta.ip ?? null,
    user_agent: meta.userAgent ?? null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/jondenne/Claude Code/firefly-crm-leadcapture" && node --test supabase/functions/site-lead/lead.test.mjs`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
cd "/Users/jondenne/Claude Code/firefly-crm-leadcapture"
git add supabase/functions/site-lead/lead.mjs supabase/functions/site-lead/lead.test.mjs
git commit -m "feat(site-lead): pure site_lead row builder (capture-first, contact-only)"
```

---

## Task 3: Migration — site_lead table + contact.source

**Files:**
- Create: `supabase/migrations/0080_site_lead_capture.sql` (rename to the true next free version at apply time)

- [ ] **Step 1: Write the migration**

```sql
-- 0080_site_lead_capture.sql
-- Durable capture buffer for public website leads (Approach A). The site-lead edge
-- function inserts here FIRST (system of record); n8n then creates the CRM contact,
-- notifies, and flips status, with a reconcile retry. Additive + nullable elsewhere.

create table if not exists public.site_lead (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  name                text not null,
  contact_raw         text not null,
  email               text,
  phone               text,
  segment             text,
  locale              text,
  answers             jsonb,
  config              jsonb,
  source              text not null default 'website',
  status              text not null default 'received'
                        check (status in ('received','processing','processed','error')),
  crm_contact_id      uuid references public.contact(id),
  crm_contact_matched boolean,
  attempts            int not null default 0,
  last_error          text,
  processing_at       timestamptz,
  processed_at        timestamptz,
  notified_at         timestamptz,
  ip                  text,
  user_agent          text
);

create index if not exists site_lead_status_idx on public.site_lead (status, created_at);
create index if not exists site_lead_ip_created_idx on public.site_lead (ip, created_at);

-- Public never touches the table directly: RLS on with NO policies (deny anon/auth);
-- service_role bypasses RLS. REVOKE is defence-in-depth vs PostgREST.
alter table public.site_lead enable row level security;
revoke all on public.site_lead from anon, authenticated;

-- Contact provenance for website-originated contacts (added by us; nullable).
alter table public.contact add column if not exists source text;
```

- [ ] **Step 2: Validate the SQL parses (dry syntax check, no apply)**

Run: `cd "/Users/jondenne/Claude Code/firefly-crm-leadcapture" && node -e "const fs=require('fs');const s=fs.readFileSync('supabase/migrations/0080_site_lead_capture.sql','utf8');if(!/create table if not exists public\.site_lead/.test(s)||!/enable row level security/.test(s))process.exit(1);console.log('migration shape OK')"`
Expected: prints `migration shape OK`.

- [ ] **Step 3: Commit (apply to live is gated — Task 9)**

```bash
cd "/Users/jondenne/Claude Code/firefly-crm-leadcapture"
git add supabase/migrations/0080_site_lead_capture.sql
git commit -m "feat(site-lead): migration — site_lead capture buffer + contact.source"
```

> NOTE: Do NOT apply yet. At apply time (Task 9), FIRST re-run `list_migrations` on `tlsidpnhpirasfrhxfkz`; if `0080` is taken, rename the file to the next free version and apply via `execute_sql` (run the DDL, then `insert into supabase_migrations.schema_migrations(version,name) values ('<v>','site_lead_capture');`).

---

## Task 4: Edge function — capture-first handler (Approach A)

**Files:**
- Modify (rewrite): `supabase/functions/site-lead/index.ts`

- [ ] **Step 1: Rewrite the handler**

```ts
// site-lead — Supabase Edge Function (Deno). PUBLIC, capture-first write endpoint.
//
// Approach A: validate → INSERT one `site_lead` row (durable system of record) →
// return {ok:true} the instant it commits → best-effort ping n8n. Contact creation,
// dedupe, and notification happen downstream in n8n; a reconcile job retries anything
// unfinished, so durability NEVER depends on the n8n ping. Returns {ok:false} on any
// pre-commit failure so the site falls back to the WhatsApp CTA (never fakes success).
import { buildLeadRow } from "./lead.mjs";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ??
  "https://fireflyenergy.mx,https://www.fireflyenergy.mx")
  .split(",").map((s) => s.trim()).filter(Boolean);
const PAGES_DEV = /^https:\/\/[a-z0-9-]+\.pages\.dev$/; // anchored — no substring match

function corsFor(origin: string | null): Record<string, string> {
  const ok = !!origin && (ALLOWED_ORIGINS.includes(origin) || PAGES_DEV.test(origin));
  return {
    "Access-Control-Allow-Origin": ok ? origin! : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json", ...cors },
  });
}

const MAX_BODY_BYTES = 32 * 1024;

Deno.serve(async (req: Request) => {
  const cors = corsFor(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405, cors);

  const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  const userAgent = req.headers.get("user-agent") || null;

  // Parse + validate BEFORE env/DB so honeypot/bad bodies fail fast.
  let row: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return json({ ok: false, error: "payload_too_large" }, 413, cors);
    let raw: unknown;
    try { raw = text ? JSON.parse(text) : {}; }
    catch { return json({ ok: false, error: "invalid_json" }, 400, cors); }
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      return json({ ok: false, error: "bad_body" }, 400, cors);
    }
    row = buildLeadRow(raw as Record<string, unknown>, { ip, userAgent });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "invalid_input";
    if (msg === "spam") return json({ ok: true }, 200, cors); // honeypot → no signal to bots
    return json({ ok: false, error: msg }, 400, cors);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ ok: false, error: "not_configured" }, 503, cors);

  try {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // DB-backed per-IP throttle: > 5 inserts from this IP in the last minute → 429.
    if (ip !== "unknown") {
      const since = new Date(Date.now() - 60_000).toISOString();
      const { count } = await admin.from("site_lead")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip).gte("created_at", since);
      if ((count ?? 0) >= 5) return json({ ok: false, error: "rate_limited" }, 429, cors);
    }

    // DURABLE CAPTURE — the guarantee. Success is returned only after this commits.
    const { data: inserted, error: insErr } = await admin
      .from("site_lead").insert(row).select("id").single();
    if (insErr) throw insErr;
    const leadId = inserted.id as string;

    // Best-effort n8n ping (NOT required for durability — reconcile covers failures).
    const hook = Deno.env.get("N8N_WEBHOOK_URL");
    const secret = Deno.env.get("WEBHOOK_SHARED_SECRET");
    if (hook && secret) {
      const ping = fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Webhook-Secret": secret },
        body: JSON.stringify({ lead_id: leadId }),
      }).catch(() => {});
      // Fire after responding if the runtime supports it; otherwise let it race the return.
      // deno-lint-ignore no-explicit-any
      const er = (globalThis as any).EdgeRuntime;
      if (er?.waitUntil) er.waitUntil(ping);
    }

    return json({ ok: true }, 200, cors);
  } catch (_e) {
    return json({ ok: false, error: "lead_failed" }, 500, cors);
  }
});
```

- [ ] **Step 2: Type/lint sanity check (Deno not required locally — grep guard)**

Run: `cd "/Users/jondenne/Claude Code/firefly-crm-leadcapture" && node -e "const s=require('fs').readFileSync('supabase/functions/site-lead/index.ts','utf8');for(const m of ['buildLeadRow','site_lead','EdgeRuntime','PAGES_DEV','WEBHOOK_SHARED_SECRET']){if(!s.includes(m)){console.error('missing',m);process.exit(1)}}console.log('handler refs OK')"`
Expected: prints `handler refs OK`.

- [ ] **Step 3: Re-run the unit tests (builder still green)**

Run: `cd "/Users/jondenne/Claude Code/firefly-crm-leadcapture" && node --test supabase/functions/site-lead/lead.test.mjs`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd "/Users/jondenne/Claude Code/firefly-crm-leadcapture"
git add supabase/functions/site-lead/index.ts
git commit -m "feat(site-lead): capture-first handler — durable insert + best-effort n8n ping"
```

---

## Task 5: n8n — Site Lead Processor (webhook)

**Files:** built via `mcp__n8n-mcp__n8n_create_workflow`; validate with `mcp__n8n-mcp__n8n_validate_workflow` before activating.

> Prereqs collected now: Twilio **sandbox** Account SID + Auth Token + sandbox sender (`whatsapp:+14155238886`) and Jon's destination WhatsApp number (Jon joins the sandbox once); reuse the existing `jondenne@lbedesign.com` email credential; recipient `jon@fireflyenergy.mx`. Generate `WEBHOOK_SHARED_SECRET` (a random 32-byte hex) — store it as the edge-function secret AND in the n8n workflow.

- [ ] **Step 1: Create the workflow with these nodes (in order)**

1. **Webhook** (POST, path `firefly-site-lead`). Capture `{{$json.body.lead_id}}` and header `x-webhook-secret`.
2. **IF — secret valid:** `{{$json.headers['x-webhook-secret']}}` equals the stored secret. False → **Respond 401** + stop.
3. **Postgres/Supabase — atomic claim** (service-role creds):
   ```sql
   update public.site_lead set status='processing', processing_at=now()
   where id = $1 and status in ('received','error')
   returning *;
   ```
   Param `$1 = lead_id`. If 0 rows → another worker owns it → **No-Op / stop**.
4. **Postgres — dedupe contact** (normalize both sides):
   ```sql
   select id from public.contact
   where ($1 is not null and lower(email) = lower($1))
      or ($2 is not null and regexp_replace(coalesce(phone,''),'\\D','','g') = $2)
   limit 1;
   ```
   Params: `$1 = email`, `$2 = phone` (already normalized on the row).
5. **IF — contact found:** True → set `contactId` = found id, `matched=true`. False → **Postgres insert contact**:
   ```sql
   insert into public.contact (full_name, email, phone, whatsapp, language, source)
   values ($1, $2, $3, $3, $4, 'website') returning id;
   ```
   Params: `full_name=name`, `email`, `phone`, `language=locale`. `matched=false`.
6. **IF — notify-once:** proceed to notify only if the row's `notified_at is null`.
7. **Twilio (WhatsApp, sandbox)** — send to Jon's number. Body: `New Firefly lead{{matched?' (returning)':''}}: {{name}} · {{contact_raw}} · {{segment}} · {{config.selectedTier || 'site visit'}}`. On error → continue (don't fail the run).
8. **IF — Twilio errored → Email** (existing `jondenne@lbedesign.com` cred) to `jon@fireflyenergy.mx`, subject `Firefly lead (WhatsApp failed): {{name}}`, body = same summary + lead_id.
9. **Postgres — mark notified** (right after a successful send, before final status):
   `update public.site_lead set notified_at=now() where id=$1 and notified_at is null;`
10. **Postgres — finalize success:**
    `update public.site_lead set status='processed', crm_contact_id=$2, crm_contact_matched=$3, processed_at=now() where id=$1;`
11. **Error Trigger / catch path** for the whole workflow → **Postgres mark error:**
    `update public.site_lead set status='error', last_error=$2, attempts=attempts+1 where id=$1;`

- [ ] **Step 2: Validate**

Run: `mcp__n8n-mcp__n8n_validate_workflow` on the new workflow id.
Expected: no errors (warnings about optional creds acceptable until Twilio is wired).

- [ ] **Step 3: Manual test with a seeded row**

Insert a test `site_lead` row via `execute_sql` (status `received`), POST `{lead_id}` to the webhook with the correct secret, then `select status, crm_contact_id, notified_at from site_lead where id=...`.
Expected: `status='processed'`, a `crm_contact_id`, `notified_at` set; a WhatsApp (or fallback email) received. Clean up the test row + test contact afterward.

---

## Task 6: n8n — Site Lead Reconcile (schedule)

- [ ] **Step 1: Create the workflow**

1. **Schedule Trigger** — every 15 minutes.
2. **Postgres — select stragglers:**
   ```sql
   select id from public.site_lead
   where status in ('received','error')
     and attempts < 5
     and created_at < now() - interval '2 minutes'
     and (processing_at is null or processing_at < now() - interval '10 minutes')
   order by created_at limit 50;
   ```
3. **Loop** → for each, **HTTP Request** POST to the Processor webhook with `{lead_id}` + `X-Webhook-Secret` (re-uses the exact same claim→process logic; the atomic claim makes this safe against the live webhook).

- [ ] **Step 2: Validate + dry-run**

Validate via MCP. Seed one `error` row, run once manually, confirm it transitions to `processed`.

---

## Task 7: n8n — Stuck-Lead Daily Digest

- [ ] **Step 1: Create the workflow**

1. **Schedule Trigger** — daily (e.g. 08:00).
2. **Postgres — terminal failures:**
   `select id, name, contact_raw, last_error, created_at from public.site_lead where status='error' and attempts >= 5 order by created_at;`
3. **IF rows > 0 → Email** (existing cred) to `jon@fireflyenergy.mx`, subject `Firefly: N stuck leads need attention`, body = the list. No rows → No-Op.

- [ ] **Step 2: Validate** via MCP; manually run once (expect "no rows / no email" on a clean table).

---

## Task 8: Front-end config + payload verification

**Files:**
- Verify: `site/src/lib/leadClient.ts` (no change expected)
- Config: site build env (`PUBLIC_SUPABASE_URL`)

- [ ] **Step 1: Confirm the posted payload matches `buildLeadRow`**

Run: `grep -n "segment\|answers\|config\|contact\|locale\|hp" "/Users/jondenne/Claude Code/fireflyenergy-website/site/src/lib/leadClient.ts"`
Expected: payload includes `name, contact, segment, locale, answers, config, hp` — consumed verbatim by `buildLeadRow`. No change needed.

- [ ] **Step 2: Set the Supabase base URL for builds**

Ensure `PUBLIC_SUPABASE_URL=https://tlsidpnhpirasfrhxfkz.supabase.co` is present in the site's `.env`/Cloudflare Pages env (used by `leadClient` to build `${baseUrl}/functions/v1/site-lead`).

Run: `grep -rn "PUBLIC_SUPABASE_URL" "/Users/jondenne/Claude Code/fireflyenergy-website/site" --include=*.ts --include=*.astro --include=.env* 2>/dev/null | head`
Expected: referenced where `baseUrl` is read; add to env if missing.

- [ ] **Step 3: Verify header-less invocation assumption**

After deploy (Task 9), `curl -i -X POST https://tlsidpnhpirasfrhxfkz.supabase.co/functions/v1/site-lead -H 'content-type: application/json' -d '{}'` with NO apikey.
Expected: a JSON response from OUR handler (e.g. `{"ok":false,"error":"missing_contact"}`), NOT a gateway 401. If 401 → add the project publishable key to `leadClient` request headers (it's public) and re-test.

---

## Task 9: Deploy + E2E (GATED on Jon's go-ahead)

> Nothing here runs without Jon's explicit OK. Claude may run Supabase/wrangler deploys after approval.

- [ ] **Step 1: Apply the migration to live**

Re-run `list_migrations` on `tlsidpnhpirasfrhxfkz` → confirm the next free version; rename `0080_*` if needed; apply DDL + `schema_migrations` insert via `execute_sql`. Verify: `select to_regclass('public.site_lead');` is non-null and `contact.source` exists.

- [ ] **Step 2: Set edge-function secrets + deploy the function**

Set secrets on the project: `ALLOWED_ORIGINS`, `N8N_WEBHOOK_URL`, `WEBHOOK_SHARED_SECRET` (`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are auto-injected). Deploy with `--no-verify-jwt`:
`supabase functions deploy site-lead --project-ref tlsidpnhpirasfrhxfkz --no-verify-jwt`

- [ ] **Step 3: Activate the three n8n workflows.**

- [ ] **Step 4: Deploy a `*.pages.dev` preview of the site and run the E2E**

Use the Playwright MCP: open the preview calculator, take **Door B (site visit)** (no estimate needed), submit a real lead. Confirm: success state shown; a `site_lead` row appears (`status` → `processed` within ~1 run); a contact is created/matched in the CRM; WhatsApp (sandbox) or fallback email received. Then submit the SAME contact again → confirm dedupe (no duplicate contact). Clean up test data.

- [ ] **Step 5: Verify durability**

Temporarily point `N8N_WEBHOOK_URL` at an invalid URL, submit a lead → confirm `{ok:true}` still returns and the row is `received`, then the reconcile job promotes it to `processed`. Restore the URL.

- [ ] **Step 6: Open the development branch for finishing**

Use `superpowers:finishing-a-development-branch` to PR/merge the firefly-crm worktree branch.

---

## Self-review notes
- **Spec coverage:** durable buffer (T3), capture-first fn (T4), n8n fan-out/contact-only/dedupe/notify-once/claim (T5), reconcile (T6), stuck digest (T7), CORS+rate-limit+honeypot+size cap (T4), Twilio sandbox + email fallback (T5), pages.dev E2E + durability proof (T9). All Approach-A hardened decisions mapped.
- **Out of scope (unchanged):** deal creation; `site-estimate`/`site-cfe-parse` deploy (calculator dep — Door B avoids it for lead testing); legacy Airtable intake; the Solutions page (separate spec).
- **Residual risks (carried from PLAN.md):** two simultaneous brand-new leads for the same person could both insert a contact (accept-and-clean); Twilio sandbox only messages pre-joined numbers (fine for testing; production sender + approved template before launch); header-less invocation verified in T8 step 3.
