import type { SystemConfig } from './sizing';
export interface PricingData { inverter: Record<number, number>; battery: Record<number, number>; panelEach: number; }
export interface PriceRangeResult { currency: 'USD'; low: number; high: number; placeholder: boolean; }

// NOTE: install band is a PLACEHOLDER. Replace INSTALL_LOW/HIGH + equipment lookup
// when the CRM pricing-schema rebuild lands. Signature is stable.
const INSTALL_LOW = 1.6, INSTALL_HIGH = 2.0;
const PLACEHOLDER_EQUIP: PricingData = { inverter: { 6.5: 1800, 12: 3000, 24: 6000 }, battery: { 5: 900, 16: 2400, 32: 4800 }, panelEach: 150 };

export function priceRange(cfg: SystemConfig, pricing: PricingData | null): PriceRangeResult {
  const data = pricing ?? PLACEHOLDER_EQUIP;
  const equip = (data.inverter[cfg.inverterKw] ?? 0) + (data.battery[cfg.batteryKwh] ?? 0) + cfg.panels * data.panelEach;
  return { currency: 'USD', low: Math.round(equip * INSTALL_LOW), high: Math.round(equip * INSTALL_HIGH), placeholder: pricing === null };
}
