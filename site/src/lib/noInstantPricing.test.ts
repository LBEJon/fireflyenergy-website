import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Built from parts so this file itself never matches the repo-wide `grep` for the endpoint name.
const BANNED = new RegExp(['site', 'estimate'].join('-') + '|fetch' + 'Estimate|estimate' + 'Client');
const SRC = join(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|astro)$/.test(name) && !/\.test\.ts$/.test(name)) out.push(p);
  }
  return out;
}

// Firefly prices each job after speaking with the customer: the assessment must never ask a
// pricing endpoint for a number, and must never carry price UI.
describe('assessment never requests or shows an instant price', () => {
  const files = walk(SRC);
  const assessmentFiles = files.filter((f) => f.includes(join('components', 'assessment')));

  it('no source module references the pricing endpoint or an estimate client', () => {
    const offenders = files.filter((f) => BANNED.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
  it('the estimate client module is gone', () => {
    expect(existsSync(join(SRC, 'lib', 'estimateClient.ts'))).toBe(false);
  });
  it('assessment components have no price/currency UI hooks', () => {
    expect(assessmentFiles.length).toBeGreaterThan(0);
    for (const f of assessmentFiles) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/data-(tier|currency|price)|tier-btn|\bIVA\b|price_|currency_/i);
    }
  });
  it('the only network calls from the assessment client are the lead and CFE-bill helpers', () => {
    const client = readFileSync(join(SRC, 'components', 'assessment', 'Assessment.client.ts'), 'utf8');
    expect(client).not.toMatch(/\bfetch\(/);
    expect(client).toMatch(/submitLead\(/);
  });
});
