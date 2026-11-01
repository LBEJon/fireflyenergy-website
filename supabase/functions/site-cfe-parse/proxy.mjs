// supabase/functions/site-cfe-parse/proxy.mjs
// Pure helpers for the bill-read proxy, kept dependency-free so they are unit-tested under node
// (node proxy.test.mjs) and imported verbatim by the Deno handler — same pattern as cors.mjs.

export const MAX_PAGES = 4; // mirrors MAX_BILL_PAGES in the CRM (cfe/upload.ts)
export const MAX_B64_BYTES = 12 * 1024 * 1024; // per page: ~8 MB file -> ~10.7 MB base64; 12 MB headroom
/** Whole-body ceiling checked from Content-Length BEFORE req.json() buffers anything:
 *  every page at its cap plus 64 KB of JSON envelope slack. */
export const MAX_BODY_BYTES = MAX_PAGES * MAX_B64_BYTES + 64 * 1024;

/** True when the declared Content-Length exceeds MAX_BODY_BYTES. A missing/unparseable header is
 *  not rejected here (the per-page checks after parsing still apply). */
export function bodyTooLarge(contentLength) {
  if (contentLength == null || contentLength === "") return false;
  const n = Number(contentLength);
  return Number.isFinite(n) && n > MAX_BODY_BYTES;
}

/** The manual-fallback body for a non-ok CRM answer. 429 = the CRM's per-IP read limit: tell the
 *  site it's "busy" so it can say "try again in a few minutes" instead of "couldn't read". */
export function crmFailureBody(status) {
  return status === 429 ? { fallback: "manual", reason: "busy" } : { fallback: "manual" };
}
