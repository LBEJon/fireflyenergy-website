import { describe, it, expect, vi } from 'vitest';
import { createEstimator } from './Estimator.client';

const baseDeps = () => ({ pricing: null, leadClient: vi.fn(async () => ({ ok: true })) });

describe('createEstimator', () => {
  it('starts at step 1', () => {
    expect(createEstimator(baseDeps()).step).toBe(1);
  });

  it('next()/back() clamp to 1..4', () => {
    const e = createEstimator(baseDeps());
    e.next();
    e.next();
    e.next();
    e.next();
    expect(e.step).toBe(4);
    e.back();
    e.back();
    e.back();
    e.back();
    expect(e.step).toBe(1);
  });

  it('getResult() returns config + price once answers set', () => {
    const e = createEstimator(baseDeps());
    e.setAnswer('home', 'family');
    e.setAnswer('backup', 'usual');
    e.setAnswer('solar', 'add');
    const r = e.getResult();
    expect(r.config.inverterKw).toBe(12);
    expect(r.price.low).toBeGreaterThan(0);
    expect(r.price.placeholder).toBe(true);
  });

  it('submit() calls leadClient with residential segment + answers + config', async () => {
    const deps = baseDeps();
    const e = createEstimator(deps);
    e.setAnswer('home', 'family');
    e.setAnswer('backup', 'usual');
    e.setAnswer('solar', 'add');
    const res = await e.submit({ name: 'Ana', contact: '+52 415 000 0000', locale: 'es' });
    expect(res.ok).toBe(true);
    expect(deps.leadClient).toHaveBeenCalledOnce();
    const payload = deps.leadClient.mock.calls[0][0];
    expect(payload.segment).toBe('residential');
    expect(payload.config.inverterKw).toBe(12);
    expect(payload.answers.home).toBe('family');
  });

  it('canSubmit() false until name+contact', () => {
    const e = createEstimator(baseDeps());
    expect(e.canSubmit({ name: '', contact: '' })).toBe(false);
    expect(e.canSubmit({ name: 'Ana', contact: 'a@b.com' })).toBe(true);
  });
});
