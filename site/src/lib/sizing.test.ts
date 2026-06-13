import { describe, it, expect } from 'vitest';
import { sizeSystem } from './sizing';

describe('sizeSystem', () => {
  it('family home + life-as-usual + add-solar => 12kW / 16kWh and >=4 panels', () => {
    const r = sizeSystem({ home: 'family', backup: 'usual', solar: 'add' });
    expect(r.inverterKw).toBe(12);
    expect(r.batteryKwh).toBe(16);
    expect(r.panels).toBeGreaterThanOrEqual(4);
  });
  it('cozy + essentials + battery-only => smaller inverter, 0 panels', () => {
    const r = sizeSystem({ home: 'cozy', backup: 'essentials', solar: 'none' });
    expect(r.inverterKw).toBeLessThanOrEqual(6.5);
    expect(r.panels).toBe(0);
  });
  it('never returns 1-3 panels (string minimum)', () => {
    const r = sizeSystem({ home: 'cozy', backup: 'essentials', solar: 'add' });
    expect(r.panels === 0 || r.panels >= 4).toBe(true);
  });
  it('large estate + everything => largest tier', () => {
    const r = sizeSystem({ home: 'estate', backup: 'everything', solar: 'add' });
    expect(r.inverterKw).toBeGreaterThanOrEqual(12);
  });
});
