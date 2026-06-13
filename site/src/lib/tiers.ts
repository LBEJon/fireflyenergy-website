import { sizeSystem, type EstimatorAnswers } from './sizing';
import { priceConfig, type PriceConfigInput, type PriceBreakdown } from './pricing';
import { PRICING, type Pricing } from './pricing.config';

// ---- 3-tier pricing ladder (v1 interpretation — ADJUSTABLE) ----------------
//
// From the visitor's three answers we present three priced options:
//
//   essentials   — keeps critical loads running through an outage.
//                  Fixed entry config: 6.5 kW inverter + 5 kWh battery,
//                  no isolation subpanel.
//   critical     — same coverage as essentials, but the critical circuits are
//                  cleanly isolated with the Essential Loads Panel subpanel
//                  (its only difference from essentials is +subpanel).
//   recommended  — right-sized whole-home system derived from sizeSystem(answers).
//
// Solar applies UNIFORMLY across all three tiers: every tier carries the same
// panel count (`recPanels = sizeSystem(answers).panels`), which is 0 when the
// visitor chose solar = 'none'. This keeps the comparison about backup depth,
// not solar size.
//
// Highlight rule: visitors who only want the essentials are steered to the
// cleanly-isolated `critical` tier; everyone else to `recommended`.
//
// This is the v1 ladder. Tune the entry config, the highlight rule, or whether
// solar varies per tier here without touching the pricing model.

const ENTRY_INVERTER_KW = 6.5;
const ENTRY_BATTERY_KWH = 5;

export interface Tier {
  key: 'essentials' | 'critical' | 'recommended';
  config: PriceConfigInput;
  price: PriceBreakdown;
  highlighted: boolean;
}

export function buildTiers(answers: EstimatorAnswers, P: Pricing = PRICING): Tier[] {
  const sized = sizeSystem(answers);
  const recPanels = sized.panels;

  const highlightKey: Tier['key'] = answers.backup === 'essentials' ? 'critical' : 'recommended';

  const configs: { key: Tier['key']; config: PriceConfigInput }[] = [
    {
      key: 'essentials',
      config: { inverterKw: ENTRY_INVERTER_KW, batteryKwh: ENTRY_BATTERY_KWH, panels: recPanels, includeSubpanel: false },
    },
    {
      key: 'critical',
      config: { inverterKw: ENTRY_INVERTER_KW, batteryKwh: ENTRY_BATTERY_KWH, panels: recPanels, includeSubpanel: true },
    },
    {
      key: 'recommended',
      config: { inverterKw: sized.inverterKw, batteryKwh: sized.batteryKwh, panels: recPanels, includeSubpanel: false },
    },
  ];

  return configs.map(({ key, config }) => ({
    key,
    config,
    price: priceConfig(config, P),
    highlighted: key === highlightKey,
  }));
}
