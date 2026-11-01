import { downscaleImage } from './downscaleImage';

export interface CfeAddress {
  address_line?: string;
  address2?: string;
  colonia?: string;
  city?: string;
  state?: string;
  postal_code?: string;
}

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

/** Mirrors MAX_BILL_PAGES in the CRM (cfe/upload.ts). */
export const MAX_BILL_PAGES = 4;

export type CfePagesResult =
  | {
      ok: true;
      pagePaths: string[];
      hasHistory: boolean;
      allImages: boolean;
      kwhPerDay: number;
      kwhTotal?: number;
      periodDays?: number;
      tariff?: string | null;
      annualKwh?: number;
      meterNo?: string | null;
      serviceNo?: string | null;
      address?: CfeAddress | null;
      extraction?: unknown;
    }
  | { fallback: 'manual'; pagePaths?: string[] };

/**
 * Downscale each page (images only; PDFs pass through) and POST them as { pages } to the
 * /site-cfe-parse proxy. Fails safe to { fallback: 'manual' } — never throws, never blocks.
 */
export async function uploadCfePages(files: File[], baseUrl: string): Promise<CfePagesResult> {
  if (files.length === 0 || files.length > MAX_BILL_PAGES) return { fallback: 'manual' };
  try {
    const pages = await Promise.all(
      files.map(async (f) => {
        const d = await downscaleImage(f);
        if (d.size > MAX_FILE_BYTES) throw new Error('File too large (max 8 MB)');
        return { mime: d.type || 'application/octet-stream', dataB64: bytesToB64(new Uint8Array(await d.arrayBuffer())) };
      }),
    );
    const res = await fetch(`${baseUrl}/functions/v1/site-cfe-parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages }),
    });
    if (!res.ok) return { fallback: 'manual' };
    const data = (await res.json()) as Record<string, unknown> | null;
    const paths = Array.isArray(data?.pagePaths) ? (data!.pagePaths as string[]) : undefined;
    if (data && data.ok === true && typeof data.kwhPerDay === 'number' && data.kwhPerDay > 0) {
      return data as unknown as CfePagesResult;
    }
    return paths ? { fallback: 'manual', pagePaths: paths } : { fallback: 'manual' };
  } catch {
    return { fallback: 'manual' };
  }
}
