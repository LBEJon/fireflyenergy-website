import { describe, it, expect } from 'vitest';
import { priceConfig, priceRange } from './pricing';
import { PRICING } from './pricing.config';

describe('priceConfig', () => {
  it('prices the worked example (12kW + 16kWh + 8 panels, no subpanel)', () => {
    const r = priceConfig({ inverterKw: 12, batteryKwh: 16, panels: 8, includeSubpanel: false });
    // equipment = inverter 2850 + battery 4990 = 7840
    expect(r.equipmentUsd).toBe(7840);
    // flat install
    expect(r.equipInstallUsd).toBe(400);
    // solar = 8*(275+116) + 116 = 3128 + 116 = 3244
    expect(r.solarUsd).toBe(3244);
    // solar install = 3244 * 0.90 = 2919.6
    expect(r.solarInstallUsd).toBeCloseTo(2919.6, 2);
    // preIva = 7840 + 400 + 3244 + 2919.6 = 14403.6
    expect(r.preIvaUsd).toBeCloseTo(14403.6, 2);
    // iva = 14403.6 * 0.16 = 2304.576
    expect(r.ivaUsd).toBeCloseTo(2304.576, 3);
    // total
    expect(r.totalUsd).toBeCloseTo(14403.6 + 2304.576, 2);
  });

  it('adds the subpanel only when includeSubpanel is true', () => {
    const without = priceConfig({ inverterKw: 6.5, batteryKwh: 5, panels: 0, includeSubpanel: false });
    const withSub = priceConfig({ inverterKw: 6.5, batteryKwh: 5, panels: 0, includeSubpanel: true });
    expect(withSub.equipmentUsd - without.equipmentUsd).toBe(PRICING.subpanelUsd);
    expect(PRICING.subpanelUsd).toBe(450);
  });

  it('zero panels => no solar cost and no solar install', () => {
    const r = priceConfig({ inverterKw: 6.5, batteryKwh: 5, panels: 0, includeSubpanel: false });
    expect(r.solarUsd).toBe(0);
    expect(r.solarInstallUsd).toBe(0);
    // equipment = inverter 2075 + battery 2150 = 4225; +400 flat install
    expect(r.equipmentUsd).toBe(4225);
    expect(r.preIvaUsd).toBe(4225 + 400);
  });

  it('cable is charged ONCE, not per panel', () => {
    const four = priceConfig({ inverterKw: 6.5, batteryKwh: 5, panels: 4, includeSubpanel: false });
    const eight = priceConfig({ inverterKw: 6.5, batteryKwh: 5, panels: 8, includeSubpanel: false });
    // delta in solarUsd between 8 and 4 panels is exactly 4*(panel+rack), cable unchanged
    expect(eight.solarUsd - four.solarUsd).toBe(4 * (PRICING.panelUsd + PRICING.rackPerPanelUsd));
    // each still includes exactly one cable
    expect(four.solarUsd).toBe(4 * (PRICING.panelUsd + PRICING.rackPerPanelUsd) + PRICING.cableOnceUsd);
  });

  it('iva is shown separately (total = preIva + iva)', () => {
    const r = priceConfig({ inverterKw: 12, batteryKwh: 16, panels: 8, includeSubpanel: true });
    expect(r.totalUsd).toBeCloseTo(r.preIvaUsd + r.ivaUsd, 6);
    expect(r.ivaUsd).toBeCloseTo(r.preIvaUsd * PRICING.ivaRate, 6);
  });

  it('accepts an injected pricing snapshot override', () => {
    const custom = { ...PRICING, inverterUsd: { 12: 1000 } as Record<number, number>, batteryUsd: { 16: 1000 } as Record<number, number> };
    const r = priceConfig({ inverterKw: 12, batteryKwh: 16, panels: 0, includeSubpanel: false }, custom);
    expect(r.equipmentUsd).toBe(2000);
  });
});

// Back-compat: keep priceRange working for any legacy import.
describe('priceRange (back-compat shim)', () => {
  it('returns a USD low<=high band for a config', () => {
    const r = priceRange({ inverterKw: 12, batteryKwh: 16, panels: 8 }, null);
    expect(r.currency).toBe('USD');
    expect(r.low).toBeGreaterThan(0);
    expect(r.high).toBeGreaterThanOrEqual(r.low);
    expect(r.placeholder).toBe(true);
  });
});
