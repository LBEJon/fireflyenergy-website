import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('./downscaleImage', () => ({
  downscaleImage: vi.fn(async (f: File) => new File(['DOWNSCALED'], f.name, { type: f.type })),
}));

import { uploadCfePages } from './cfeUploadClient';
import { downscaleImage } from './downscaleImage';

const img = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
const pdf = new File(['%PDF'], 'b.pdf', { type: 'application/pdf' });

afterEach(() => vi.unstubAllGlobals());

describe('uploadCfePages', () => {
  it('posts { pages } with downscaled images and returns the figures', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, pagePaths: ['p1'], hasHistory: true, allImages: true, kwhPerDay: 12 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const r = await uploadCfePages([img, pdf], 'https://x.supabase.co');
    expect(downscaleImage).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://x.supabase.co/functions/v1/site-cfe-parse');
    const body = JSON.parse(init.body as string);
    expect(body.pages).toHaveLength(2);
    expect(body.pages[0].mime).toBe('image/jpeg');
    expect(atob(body.pages[0].dataB64)).toBe('DOWNSCALED');
    expect(r).toMatchObject({ ok: true, kwhPerDay: 12, pagePaths: ['p1'] });
  });
  it('maps { fallback: manual } and carries pagePaths', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ fallback: 'manual', pagePaths: ['p1'] }), { status: 200 })));
    expect(await uploadCfePages([img], 'https://x')).toEqual({ fallback: 'manual', pagePaths: ['p1'] });
  });
  it('falls back on network error, non-200, or too many pages', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('boom'); }));
    expect(await uploadCfePages([img], 'https://x')).toEqual({ fallback: 'manual' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
    expect(await uploadCfePages([img], 'https://x')).toEqual({ fallback: 'manual' });
    expect(await uploadCfePages([img, img, img, img, img], 'https://x')).toEqual({ fallback: 'manual' });
  });
});
