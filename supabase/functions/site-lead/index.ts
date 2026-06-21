// site-lead — Supabase Edge Function (Deno). PUBLIC, capture-first write endpoint.
//
// Approach A: validate → INSERT one `site_lead` row (durable system of record) →
// return {ok:true} the instant it commits → best-effort ping n8n. Contact creation,
// dedupe, and notification happen downstream in n8n; a reconcile job retries anything
// unfinished, so durability NEVER depends on the n8n ping. Returns {ok:false} on any
// pre-commit failure so the site falls back to the WhatsApp CTA (never fakes success).
import { buildLeadRow } from "./lead.mjs";
import { corsFor } from "./cors.mjs";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ??
  "https://fireflyenergy.mx,https://www.fireflyenergy.mx")
  .split(",").map((s) => s.trim()).filter(Boolean);

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json", ...cors },
  });
}

const MAX_BODY_BYTES = 32 * 1024;

Deno.serve(async (req: Request) => {
  const cors = corsFor(req.headers.get("origin"), ALLOWED_ORIGINS);
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

    // DB-backed per-IP throttle: ≥ 5 inserts from this IP in the last minute → 429.
    // Missing/empty x-forwarded-for all share the "unknown" bucket (still limited).
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await admin.from("site_lead")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip).gte("created_at", since);
    if ((count ?? 0) >= 5) return json({ ok: false, error: "rate_limited" }, 429, cors);

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
