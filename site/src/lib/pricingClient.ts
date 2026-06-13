import type { PricingData } from './pricing';

const CACHE_KEY = 'ff_pricing_cache';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  ts: number;
  data: PricingData;
}

function readCache(): PricingData | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed || typeof parsed.ts !== 'number' || !parsed.data) return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: PricingData): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const entry: CacheEntry = { ts: Date.now(), data };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // ignore quota / serialization failures — cache is best-effort
  }
}

/**
 * Fetch the live pricing map from the CRM edge function.
 * Returns parsed PricingData on success, or null on ANY failure
 * (network, non-200, or parse) so the estimator can fall back to
 * the placeholder pricing. Caches a successful result for 1 hour.
 */
export async function fetchPricing(baseUrl: string): Promise<PricingData | null> {
  const cached = readCache();
  if (cached) return cached;

  try {
    const res = await fetch(`${baseUrl}/functions/v1/site-pricing`);
    if (!res.ok) return null;
    const data = (await res.json()) as PricingData;
    if (!data || typeof data !== 'object') return null;
    writeCache(data);
    return data;
  } catch {
    return null;
  }
}
