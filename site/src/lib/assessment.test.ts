import { describe, it, expect } from 'vitest';
import { toEstimateBody, consumptionKnown, existingSolarKw } from './assessment';

describe('assessment mapping', () => {
  it('existingSolarKw from count + watts', () => {
    expect(existingSolarKw(8, 645)).toBeCloseTo(5.16);
    expect(existingSolarKw(0, 645)).toBe(0);
  });
  it('manual monthly kWh -> kwhPerDay (÷30)', () => {
    const b = toEstimateBody({ monthlyKwh: 600, backupHours: 12, appliances: { miniSplits: 2 }, coverageTier: 'comfort', addSolarPanels: 0 });
    expect(b.cfeKwhPerDay).toBeCloseTo(20);
    expect(b.backupHours).toBe(12);
    expect(b.appliances.miniSplits).toBe(2);
  });
  it('bill kwhPerDay wins over manual', () => {
    const b = toEstimateBody({ billKwhPerDay: 25, monthlyKwh: 600, backupHours: 12, appliances: {}, coverageTier: 'comfort' });
    expect(b.cfeKwhPerDay).toBe(25);
  });
  it('no consumption => cfeKwhPerDay undefined + consumptionKnown false', () => {
    expect(consumptionKnown({ appliances: {} })).toBe(false);
    const b = toEstimateBody({ appliances: {}, coverageTier: 'comfort' });
    expect(b.cfeKwhPerDay).toBeUndefined();
  });
  it('consumptionKnown true with bill or manual', () => {
    expect(consumptionKnown({ billKwhPerDay: 25 })).toBe(true);
    expect(consumptionKnown({ monthlyKwh: 600 })).toBe(true);
  });
  it('existing panels feed existingSolarKw + hasExistingSolar', () => {
    const b = toEstimateBody({ monthlyKwh: 600, hasExistingSolar: true, panelCount: 8, panelWatts: 645, appliances: {}, coverageTier: 'comfort' });
    expect(b.existingSolarKw).toBeCloseTo(5.16);
    expect(b.hasExistingSolar).toBe(true);
  });
});
