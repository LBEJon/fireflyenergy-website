import { test } from 'vitest';
import assert from 'node:assert/strict';
import { SOLUTION_TIERS, priceFor, formatPrice, FX_FALLBACK } from './solutionsPricing';

test('tiers + prices', () => {
  assert.equal(SOLUTION_TIERS.length, 3);
  assert.equal(priceFor('essentials', false), 6500);
  assert.equal(priceFor('essentials', true), 9600);
  assert.equal(priceFor('wholehome', true), 12600);
});
test('USD format', () => { assert.equal(formatPrice(6500, 'USD', 17.3), '$6,500'); });
test('MXN format rounds to nearest 100', () => {
  // 6500 * 17.3 = 112450 -> round to 112,500
  assert.equal(formatPrice(6500, 'MXN', 17.3), '$112,500');
});
test('fallback fx is a sane number', () => { assert.ok(FX_FALLBACK > 10 && FX_FALLBACK < 30); });
