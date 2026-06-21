// supabase/functions/site-lead/cors.mjs
// Pure CORS-header builder for the public site-lead edge function.
// Reflects Access-Control-Allow-Origin only for an explicitly allowed origin
// or an anchored *.pages.dev preview origin; otherwise "null". Kept pure and
// unit-tested under node, imported verbatim by the Deno handler.
export const PAGES_DEV = /^https:\/\/[a-z0-9-]+\.pages\.dev$/; // anchored — no substring match

export function corsFor(origin, allowedOrigins) {
  const ok = !!origin && (allowedOrigins.includes(origin) || PAGES_DEV.test(origin));
  return {
    "Access-Control-Allow-Origin": ok ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
