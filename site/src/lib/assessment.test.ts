import { describe, it, expect } from 'vitest';
import {
  toEstimateBody,
  consumptionKnown,
  existingSolarKw,
  recommendPanels,
  offsetPct,
  perPanelDailyKwh,
} from './assessment';

describe('assessment mapping', () => {
  it('existingSolarKw from count + watts', () => {
    expect(existingSolarKw(8, 645)).toBeCloseTo(5.16);
    expect(existingSolarKw(0, 645)).toBe(0);
  });
  it('manual daily kWh -> kwhPerDay (used directly)', () => {
    const b = toEstimateBody({ dailyKwh: 20, backupHours: 12, appliances: { miniSplits: 2 }, coverageTier: 'comfort', addSolarPanels: 0 });
    expect(b.cfeKwhPerDay).toBeCloseTo(20);
    expect(b.backupHours).toBe(12);
    expect(b.appliances.miniSplits).toBe(2);
  });
  it('bill kwhPerDay wins over manual', () => {
    const b = toEstimateBody({ billKwhPerDay: 25, dailyKwh: 20, backupHours: 12, appliances: {}, coverageTier: 'comfort' });
    expect(b.cfeKwhPerDay).toBe(25);
  });
  it('no consumption => cfeKwhPerDay undefined + consumptionKnown false', () => {
    expect(consumptionKnown({ appliances: {} })).toBe(false);
    const b = toEstimateBody({ appliances: {}, coverageTier: 'comfort' });
    expect(b.cfeKwhPerDay).toBeUndefined();
  });
  it('consumptionKnown true with bill or manual', () => {
    expect(consumptionKnown({ billKwhPerDay: 25 })).toBe(true);
    expect(consumptionKnown({ dailyKwh: 20 })).toBe(true);
  });
  it('existing panels feed existingSolarKw + hasExistingSolar', () => {
    const b = toEstimateBody({ dailyKwh: 20, hasExistingSolar: true, panelCount: 8, panelWatts: 645, appliances: {}, coverageTier: 'comfort' });
    expect(b.existingSolarKw).toBeCloseTo(5.16);
    expect(b.hasExistingSolar).toBe(true);
  });
  it('passes custom otherLoads through to the estimate body', () => {
    const b = toEstimateBody({ dailyKwh: 20, appliances: { otherLoads: [{ name: 'Workshop', watts: 1200, critical: false }] }, coverageTier: 'comfort' });
    expect(b.appliances.otherLoads).toEqual([{ name: 'Workshop', watts: 1200, critical: false }]);
  });
  it('defaults otherLoads to [] when not provided', () => {
    const b = toEstimateBody({ dailyKwh: 20, appliances: {}, coverageTier: 'comfort' });
    expect(b.appliances.otherLoads).toEqual([]);
  });
});

describe('panel recommendation', () => {
  it('perPanelDailyKwh ~2.838 for 645W', () => { expect(perPanelDailyKwh(645)).toBeCloseTo(2.838, 2); });
  it('recommends ~9 panels to offset 25 kWh/day, none existing', () => { expect(recommendPanels(25, 0)).toBe(9); });
  it('credits existing solar (less new panels needed)', () => {
    const withExisting = recommendPanels(25, 5.16); const without = recommendPanels(25, 0);
    expect(withExisting).toBeLessThan(without);
  });
  it('floors a positive recommendation to the 4-panel minimum', () => { expect(recommendPanels(5, 0)).toBe(4); });
  it('returns 0 when existing solar already offsets usage', () => { expect(recommendPanels(10, 10)).toBe(0); });
  it('offsetPct caps at 100 and scales with panels', () => {
    expect(offsetPct(100, 25, 0)).toBe(100);
    expect(offsetPct(0, 25, 0)).toBe(0);
    expect(offsetPct(9, 25, 0)).toBeGreaterThan(90);
  });
});
