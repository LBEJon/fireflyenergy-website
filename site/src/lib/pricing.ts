import type { SystemConfig } from './sizing';
import { PRICING, type Pricing } from './pricing.config';

// ---- Real catalog pricing model (USD MSRP = customer price) ----
// See pricing.config.ts for the catalog snapshot. IVA is computed and returned
// SEPARATELY (never folded into the headline number) so the UI can show
// "$X + 16% IVA". FX (USD→MXN) is a display-only conversion handled in the UI.

export interface PriceConfigInput {
  inverterKw: number;
  batteryKwh: number;
  panels: number;
  includeSubpanel: boolean;
}

export interface PriceBreakdown {
  equipmentUsd: number;
  equipInstallUsd: number;
  solarUsd: number;
  solarInstallUsd: number;
  preIvaUsd: number;
  ivaUsd: number;
  totalUsd: number;
}

/**
 * Price a single concrete system configuration from the catalog snapshot.
 *
 *   equipmentUsd    = inverter + battery (+ subpanel if included)
 *   equipInstallUsd = flat base/main-line install (size-independent)
 *   solarUsd        = panels>0 ? panels*(panel + rack) + cable(once) : 0
 *   solarInstallUsd = solarUsd * solarInstallRate
 *   preIvaUsd       = equipment + equipInstall + solar + solarInstall
 *   ivaUsd          = preIvaUsd * ivaRate
 *   totalUsd        = preIvaUsd + ivaUsd
 *
 * Unknown inverter/battery sizes contribute 0 (graceful — same as the prior
 * placeholder behaviour; e.g. a 24kW/32kWh estate config not in the website
 * snapshot still returns a finite breakdown).
 */
export function priceConfig(input: PriceConfigInput, P: Pricing = PRICING): PriceBreakdown {
  const inverter = P.inverterUsd[input.inverterKw] ?? 0;
  const battery = P.batteryUsd[input.batteryKwh] ?? 0;
  const subpanel = input.includeSubpanel ? P.subpanelUsd : 0;
  const equipmentUsd = inverter + battery + subpanel;

  const equipInstallUsd = P.flatEquipInstallUsd;

  const solarUsd =
    input.panels > 0
      ? input.panels * (P.panelUsd + P.rackPerPanelUsd) + P.cableOnceUsd
      : 0;
  const solarInstallUsd = solarUsd * P.solarInstallRate;

  const preIvaUsd = equipmentUsd + equipInstallUsd + solarUsd + solarInstallUsd;
  const ivaUsd = preIvaUsd * P.ivaRate;
  const totalUsd = preIvaUsd + ivaUsd;

  return { equipmentUsd, equipInstallUsd, solarUsd, solarInstallUsd, preIvaUsd, ivaUsd, totalUsd };
}

// ---- Back-compat shim ------------------------------------------------------
// Legacy callers expect a {low, high, placeholder} band off a SystemConfig.
// We keep the shape stable; the band is now derived from the real model
// (total ± a small spread) so nothing that still imports priceRange breaks.
export interface PricingData { inverter: Record<number, number>; battery: Record<number, number>; panelEach: number; }
export interface PriceRangeResult { currency: 'USD'; low: number; high: number; placeholder: boolean; }

export function priceRange(cfg: SystemConfig, pricing: PricingData | null): PriceRangeResult {
  const b = priceConfig({ ...cfg, includeSubpanel: false });
  const total = Math.round(b.totalUsd);
  // ±8% display band around the modeled total.
  return {
    currency: 'USD',
    low: Math.round(total * 0.92),
    high: Math.round(total * 1.08),
    placeholder: pricing === null,
  };
}
