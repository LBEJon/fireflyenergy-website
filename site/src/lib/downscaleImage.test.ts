import { describe, it, expect } from 'vitest';
import { targetSize } from './downscaleImage';

describe('targetSize', () => {
  it('never upscales', () => {
    expect(targetSize(800, 600)).toEqual({ w: 800, h: 600 });
    expect(targetSize(2000, 2000)).toEqual({ w: 2000, h: 2000 });
  });
  it('scales the long edge to max, keeping aspect ratio', () => {
    expect(targetSize(4000, 3000)).toEqual({ w: 2000, h: 1500 });
    expect(targetSize(3000, 4000)).toEqual({ w: 1500, h: 2000 });
  });
  it('rounds to integers', () => {
    const r = targetSize(3001, 1999);
    expect(Number.isInteger(r.w) && Number.isInteger(r.h)).toBe(true);
    expect(r.w).toBe(2000);
  });
  it('honours a custom max', () => {
    expect(targetSize(1000, 500, 100)).toEqual({ w: 100, h: 50 });
  });
});
