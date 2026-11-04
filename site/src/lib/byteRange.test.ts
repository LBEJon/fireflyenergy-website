import { describe, expect, it } from 'vitest';
import { byteRange } from '../../../worker.js';

describe('byteRange (video Range requests for iOS Safari)', () => {
  it('handles the ranges Safari sends', () => {
    expect(byteRange('bytes=0-1', 100)).toEqual([0, 1]);
    expect(byteRange('bytes=10-', 100)).toEqual([10, 99]);
    expect(byteRange('bytes=90-500', 100)).toEqual([90, 99]);
    expect(byteRange('bytes=-20', 100)).toEqual([80, 99]);
  });
  it('rejects unsatisfiable ranges and ignores ones it does not handle', () => {
    expect(byteRange('bytes=100-', 100)).toBeNull();
    expect(byteRange('bytes=5-2', 100)).toBeNull();
    expect(byteRange('bytes=0-1,5-9', 100)).toBeUndefined();
    expect(byteRange(null, 100)).toBeUndefined();
  });
});
