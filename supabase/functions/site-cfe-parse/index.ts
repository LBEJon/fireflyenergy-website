// site-cfe-parse — Supabase Edge Function (Deno). PUBLIC thin proxy to the CRM's shared bill reader.
//
// POST { pages: [{ mime, dataB64 }] } (<= 4 pages; legacy { mime, dataB64 } = one page) ->
// cheap checks (type, size, count) -> POST FIREFLY_CRM_BILL_URL with the intake bearer secret and
// X-Client-Ip. The CRM stores the pages, reads them, and rate-limits per client IP; its answer is
// passed straight through. This function holds no model key, no limiter, no storage logic.
//
// Fails safe: unset URL/secret, CRM error, non-ok outcome, or a 25 s timeout all return
// { fallback: "manual" } (carrying pagePaths when the CRM stored the pages) so the site drops the
// user to manual kWh entry and the flow never blocks.
import { corsFor } from "./cors.mjs";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ??
  "https://fireflyenergy.mx,https://www.fireflyenergy.mx")
  .split(",").map((s) => s.trim()).filter(Boolean);

const MAX_PAGES = 4; // mirrors MAX_BILL_PAGES in the CRM (cfe/upload.ts)
const MAX_B64_BYTES = 12 * 1024 * 1024; // per page: ~8 MB file -> ~10.7 MB base64; 12 MB headroom
const TIMEOUT_MS = 25_000;

// Mirrors ALLOWED_BILL_MIME_TYPES in the CRM (src/server/services/crm/cfe/upload.ts).
const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json", ...cors },
  });
}

/** Legacy single-file clients read `filePath`; keep it populated from the first stored page. */
function withLegacyPath<T extends { pagePaths?: unknown }>(body: T): T & { filePath?: string } {
  const first = Array.isArray(body.pagePaths) ? body.pagePaths[0] : undefined;
  return typeof first === "string" ? { ...body, filePath: first } : body;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = corsFor(req.headers.get("origin"), ALLOWED_ORIGINS);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ fallback: "manual" }, 405, cors);

  // Unset => behave exactly as the manual-kWh fallback, before touching the body.
  const url = Deno.env.get("FIREFLY_CRM_BILL_URL");
  const secret = Deno.env.get("FIREFLY_CRM_INTAKE_SECRET");
  if (!url || !secret) return json({ fallback: "manual" }, 200, cors);

  let pages: { mime: string; dataB64: string }[];
  try {
    const body = await req.json();
    const raw = Array.isArray(body?.pages) ? body.pages : [{ mime: body?.mime, dataB64: body?.dataB64 }];
    pages = raw.map((p: { mime?: unknown; dataB64?: unknown }) => ({
      mime: String(p?.mime ?? ""),
      dataB64: String(p?.dataB64 ?? ""),
    }));
  } catch {
    return json({ fallback: "manual" }, 400, cors);
  }
  if (pages.length < 1 || pages.length > MAX_PAGES) return json({ fallback: "manual" }, 400, cors);
  for (const p of pages) {
    if (!p.dataB64 || p.dataB64.length > MAX_B64_BYTES) return json({ fallback: "manual" }, 400, cors);
    if (!ALLOWED_MIME.includes(p.mime)) return json({ fallback: "manual" }, 400, cors);
  }

  // cf-connecting-ip is set by Cloudflare in front of Supabase and can't be forged (a forged one is
  // rejected at the edge); the gateway also rewrites x-forwarded-for, kept only as a fallback.
  const ip = req.headers.get("cf-connecting-ip")?.trim() ||
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
        // The CRM keys its rate limit on this; every call reaches it from this one function, so
        // without it the whole public site would share a single bucket.
        "X-Client-Ip": ip,
      },
      body: JSON.stringify({ pages }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return json({ fallback: "manual" }, 200, cors);
    const data = await res.json();
    if (data?.ok === true) {
      const { ok: _ok, ...rest } = data;
      return json(withLegacyPath({ ok: true, ...rest }), 200, cors);
    }
    const fb: { fallback: "manual"; pagePaths?: string[] } = { fallback: "manual" };
    if (Array.isArray(data?.pagePaths)) fb.pagePaths = data.pagePaths;
    return json(withLegacyPath(fb), 200, cors);
  } catch {
    return json({ fallback: "manual" }, 200, cors);
  }
});
