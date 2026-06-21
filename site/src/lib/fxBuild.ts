import { FX_FALLBACK } from './solutionsPricing';

/**
 * Read the latest USD→MXN rate from Supabase AT BUILD TIME (Astro frontmatter).
 *
 * Anonymous read of `fx_rate` is blocked, so this needs a build-only key
 * (`SUPABASE_FX_READ_KEY`) that Jon sets in the deploy/build env. Because this
 * runs during the static build, the key is never shipped to the client — only
 * the resolved number is baked into the page.
 *
 * NEVER throws: any failure (no URL, no key, network error, empty result)
 * falls back to `FX_FALLBACK` so the build always succeeds and a price always
 * renders. Locally (no key) this returns the fallback — that's expected.
 */
export async function getBuildFxRate(): Promise<number> {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.SUPABASE_FX_READ_KEY;
  if (!url || !key) return FX_FALLBACK;
  try {
    const endpoint = `${url}/rest/v1/fx_rate?select=usd_mxn&order=rate_date.desc&limit=1`;
    const res = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return FX_FALLBACK;
    const rows = (await res.json()) as Array<{ usd_mxn?: number }>;
    const rate = rows?.[0]?.usd_mxn;
    return typeof rate === 'number' && rate > 0 ? rate : FX_FALLBACK;
  } catch {
    return FX_FALLBACK;
  }
}
