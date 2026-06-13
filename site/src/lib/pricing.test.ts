import { describe, it, expect } from 'vitest';
import { priceRange } from './pricing';

describe('priceRange', () => {
  it('returns a USD low<=high band for a config', () => {
    const r = priceRange({ inverterKw: 12, batteryKwh: 16, panels: 8 }, null);
    expect(r.currency).toBe('USD');
    expect(r.low).toBeGreaterThan(0);
    expect(r.high).toBeGreaterThanOrEqual(r.low);
    expect(r.placeholder).toBe(true);
  });
  it('uses live MSRP map when provided', () => {
    const pricing = { inverter: { 12: 3000 }, battery: { 16: 2400 }, panelEach: 150 };
    const r = priceRange({ inverterKw: 12, batteryKwh: 16, panels: 8 }, pricing);
    expect(r.placeholder).toBe(false);
    expect(r.low).toBeGreaterThan(3000);
  });
});
