// node --test usage.test.mjs  (or: node usage.test.mjs)
import assert from "node:assert/strict";
import { kwhPerDayFrom } from "./usage.mjs";

// residential bimonthly: 600 kWh over printed 61 days
assert.deepEqual(kwhPerDayFrom({ tariff: "01", bill_class: "residential", billing_days: 61, current_period_kwh: 600 }),
  { kwhPerDay: 9.84, kwhTotal: 600, periodDays: 61, tariff: "01", address: null });

// missing days, residential tariff -> defaults to 60-day cadence
assert.deepEqual(kwhPerDayFrom({ tariff: "01", current_period_kwh: 600 }),
  { kwhPerDay: 10, kwhTotal: 600, periodDays: 60, tariff: "01", address: null });

// address fields are pulled through, blanks dropped
assert.deepEqual(
  kwhPerDayFrom({ tariff: "01", current_period_kwh: 600, address_line: "Allende 22", colonia: "Caracol", city: "San Miguel de Allende", state: "Guanajuato", postal_code: "37769", address2: "  " }).address,
  { address_line: "Allende 22", colonia: "Caracol", city: "San Miguel de Allende", state: "Guanajuato", postal_code: "37769" });

// implausible days (model misread "6") -> fall back to cadence, not 100 kWh/day
assert.equal(kwhPerDayFrom({ tariff: "DAC", current_period_kwh: 600, billing_days: 6 }).periodDays, 60);

// commercial monthly -> 30-day default
assert.equal(kwhPerDayFrom({ tariff: "PDBT", current_period_kwh: 900 }).periodDays, 30);

// unusable readings -> null (caller falls back to manual)
assert.equal(kwhPerDayFrom({ tariff: "01" }), null);
assert.equal(kwhPerDayFrom({ current_period_kwh: 0 }), null);
assert.equal(kwhPerDayFrom(null), null);

console.log("usage.test.mjs OK");
