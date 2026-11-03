import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The website assessment only gathers facts. Solar sizing, extra panels and connecting
// existing panels are discussed at the assessment visit (Jon, 2026-11-03).
describe('assessment does not size or upsell solar panels', () => {
  const dir = join(__dirname, '..', 'components', 'assessment');
  const entry = readFileSync(join(dir, 'AssessmentEntry.astro'), 'utf8');
  const client = readFileSync(join(dir, 'Assessment.client.ts'), 'utf8');

  it('has no add-panels / recommended-panels / oversize UI', () => {
    expect(entry).not.toMatch(/addsolar|data-panel-rec|data-panel-val|data-panel-none|oversize/);
  });
  it('never recommends or pre-selects a panel count', () => {
    expect(client).not.toMatch(/recommendPanels|addSolarPanels\s*=/);
  });
  it('still asks whether they already have panels', () => {
    expect(entry).toMatch(/data-panel-count/);
  });
});
