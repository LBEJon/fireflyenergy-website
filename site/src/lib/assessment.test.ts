import { describe, it, expect } from 'vitest';
import {
  existingSolarKw,
  recommendPanels,
  offsetPct,
  perPanelDailyKwh,
  upsertBill,
  billsDailyKwh,
  billsPending,
  usageKwhPerDay,
  MAX_METERS,
  type BillAnswer,
} from './assessment';

describe('assessment mapping', () => {
  it('existingSolarKw from count + watts', () => {
    expect(existingSolarKw(8, 645)).toBeCloseTo(5.16);
    expect(existingSolarKw(0, 645)).toBe(0);
  });
  it('usageKwhPerDay: manual daily kWh is used directly', () => {
    expect(usageKwhPerDay({ dailyKwh: 20 })).toBe(20);
  });
  it('usageKwhPerDay: legacy bill figure wins over manual', () => {
    expect(usageKwhPerDay({ billKwhPerDay: 25, dailyKwh: 20 })).toBe(25);
  });
  it('usageKwhPerDay: unknown usage is 0 (optional, never blocks)', () => {
    expect(usageKwhPerDay({})).toBe(0);
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

const bill = (o: Partial<BillAnswer>): BillAnswer => ({ pagePaths: [], kwhPerDay: 10, ...o });

describe('multi-meter bills', () => {
  it('upsertBill replaces the same meter (meterNo) in place', () => {
    const a = bill({ meterNo: 'M1', kwhPerDay: 10 });
    const b = bill({ meterNo: 'M2', kwhPerDay: 20 });
    const r = upsertBill([a, b], bill({ meterNo: 'M1', kwhPerDay: 12 }));
    expect(r.replaced).toBe(true);
    expect(r.bills).toHaveLength(2);
    expect(r.bills[0].kwhPerDay).toBe(12);
    expect(r.bills[1]).toBe(b);
  });
  it('upsertBill falls back to serviceNo as the meter key', () => {
    const r = upsertBill([bill({ serviceNo: 'S1' })], bill({ serviceNo: 'S1', kwhPerDay: 5 }));
    expect(r.replaced).toBe(true);
    expect(r.bills).toHaveLength(1);
    expect(r.bills[0].kwhPerDay).toBe(5);
  });
  it('upsertBill appends a new meter, and never merges keyless bills', () => {
    const r = upsertBill([bill({ meterNo: 'M1' })], bill({ meterNo: 'M2' }));
    expect(r.replaced).toBe(false);
    expect(r.bills).toHaveLength(2);
    const k = upsertBill([bill({})], bill({}));
    expect(k.replaced).toBe(false);
    expect(k.bills).toHaveLength(2);
  });
  it('upsertBill does not mutate its input', () => {
    const list = [bill({ meterNo: 'M1' })];
    upsertBill(list, bill({ meterNo: 'M2' }));
    expect(list).toHaveLength(1);
  });
  it('refuses a 7th meter but still replaces an existing one at the cap', () => {
    const six = Array.from({ length: MAX_METERS }, (_, i) => bill({ meterNo: `M${i}` }));
    expect(MAX_METERS).toBe(6);
    const r = upsertBill(six, bill({ meterNo: 'M9' }));
    expect(r.bills).toHaveLength(6);
    expect(r.replaced).toBe(false);
    expect(r.bills.some((b) => b.meterNo === 'M9')).toBe(false);
    const s = upsertBill(six, bill({ meterNo: 'M3', kwhPerDay: 99 }));
    expect(s.replaced).toBe(true);
    expect(s.bills[3].kwhPerDay).toBe(99);
  });
  it('billsDailyKwh prefers the annual average over the period figure', () => {
    expect(billsDailyKwh([bill({ kwhPerDay: 10, annualKwh: 7300 })])).toBeCloseTo(20);
    expect(billsDailyKwh([bill({ kwhPerDay: 10, annualKwh: 0 })])).toBe(10);
  });
  it('billsDailyKwh sums two meters', () => {
    expect(billsDailyKwh([bill({ kwhPerDay: 10 }), bill({ kwhPerDay: 5, annualKwh: 3650 })])).toBeCloseTo(20);
  });
  it('billsDailyKwh treats unread bills and empty lists as 0', () => {
    expect(billsDailyKwh(undefined)).toBe(0);
    expect(billsDailyKwh([bill({ kwhPerDay: null })])).toBe(0);
  });
  it('bills drive usage, ahead of the manual field', () => {
    const bills = [bill({ kwhPerDay: 10 }), bill({ kwhPerDay: 15 })];
    expect(usageKwhPerDay({ bills, dailyKwh: 3 })).toBe(25);
    expect(usageKwhPerDay({ bills: [bill({ kwhPerDay: null })], dailyKwh: 3 })).toBe(3);
  });
});

describe('mixed read + unread meters', () => {
  const read = bill({ meterNo: 'M1', kwhPerDay: 10 });
  const unread = (): BillAnswer => bill({ pagePaths: ['site-lead/x/1.jpg'], kwhPerDay: null });
  it('one read + one unread with no value => partial sum is not used for sizing', () => {
    const bills = [read, unread()];
    expect(billsPending(bills)).toBe(1);
    expect(usageKwhPerDay({ bills, dailyKwh: 30 })).toBe(0);
  });
  it('unread meter with a typed value => summed, keeps its pages', () => {
    const u = unread();
    u.kwhPerDay = 8;
    const bills = [read, u];
    expect(billsPending(bills)).toBe(0);
    expect(usageKwhPerDay({ bills })).toBe(18);
    expect(u.pagePaths).toEqual(['site-lead/x/1.jpg']);
  });
  it('removing the unread meter => known again', () => {
    expect(usageKwhPerDay({ bills: [read] })).toBe(10);
  });
  it('only unread meters still fall back to the manual field', () => {
    expect(billsPending([unread()])).toBe(0);
    expect(usageKwhPerDay({ bills: [unread()], dailyKwh: 12 })).toBe(12);
  });
});
