/**
 * Single source of truth for the Solutions-page tier pricing.
 *
 * Prices are USD, installed, PRE-IVA (each card shows a "+ IVA" note). MXN is
 * derived from a build-time-baked Supabase FX rate (see `fxBuild.ts`), with a
 * sane fallback so a price always renders. The toggle logic (with/without solar,
 * USD/MXN) is pure client-side over this static table — no backend.
 */
export type TierKey = 'essentials' | 'comfort' | 'wholehome';

export interface SolutionTier {
  key: TierKey;
  inverterKw: number;
  batteryKwh: number;
  solarCapKw: number;
  recommended: boolean;
  priceUsd: { withoutSolar: number; withSolar: number };
}

/** Generic 6-panel baseline used for the "with solar" price across all tiers. */
export const SOLAR_PANELS_BASELINE = 6;

/** Fallback USD→MXN rate when the build-time Supabase read is unavailable. */
export const FX_FALLBACK = 17.5;

export const SOLUTION_TIERS: SolutionTier[] = [
  { key: 'essentials', inverterKw: 6.5, batteryKwh: 5,  solarCapKw: 6.5, recommended: false, priceUsd: { withoutSolar: 6500,  withSolar: 9600  } },
  { key: 'comfort',    inverterKw: 10,  batteryKwh: 10, solarCapKw: 10,  recommended: false, priceUsd: { withoutSolar: 8000,  withSolar: 11100 } },
  { key: 'wholehome',  inverterKw: 12,  batteryKwh: 16, solarCapKw: 12,  recommended: true,  priceUsd: { withoutSolar: 9500,  withSolar: 12600 } },
];

/** Pre-IVA USD price for a tier, with or without the 6-panel solar baseline. */
export function priceFor(key: TierKey, withSolar: boolean): number {
  const tier = SOLUTION_TIERS.find((t) => t.key === key)!;
  return withSolar ? tier.priceUsd.withSolar : tier.priceUsd.withoutSolar;
}

/**
 * Format a USD figure for display. MXN is converted via `fxUsdMxn` and rounded
 * to the nearest 100 pesos to keep "starting at" prices clean.
 */
export function formatPrice(usd: number, currency: 'USD' | 'MXN', fxUsdMxn: number): string {
  if (currency === 'MXN') {
    const mxn = Math.round((usd * fxUsdMxn) / 100) * 100;
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(mxn);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(usd);
}
