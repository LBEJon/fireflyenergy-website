import { test } from 'vitest';
import assert from 'node:assert/strict';
import { getBuildFxRate } from './fxBuild';
import { FX_FALLBACK } from './solutionsPricing';

test('getBuildFxRate falls back when no build key is set', async () => {
  // No SUPABASE_FX_READ_KEY in the test env → must return the fallback,
  // never throw, never block the build.
  const rate = await getBuildFxRate();
  assert.equal(rate, FX_FALLBACK);
});
