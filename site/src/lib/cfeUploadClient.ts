import { downscaleImage } from './downscaleImage';

export interface CfeAddress {
  address_line?: string;
  address2?: string;
  colonia?: string;
  city?: string;
  state?: string;
  postal_code?: string;
}

export interface CfeParseResult {
  kwhPerDay: number;
  kwhTotal?: number;
  periodDays?: number;
  tariff?: string | null;
  address?: CfeAddress | null;
  /** Storage path of the bill parked in the CRM, to be forwarded with the lead. Null when the
   *  storage leg is unconfigured or failed — it is best-effort and never blocks the parse. */
  filePath?: string | null;
}

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Read a browser File into a base64 payload, stripping the data: URL prefix.
 * Throws if the file exceeds 8 MB. Only call this client-side (uses FileReader).
 */
export async function fileToB64(
  file: File,
): Promise<{ mime: string; dataB64: string }> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('File too large (max 8 MB)');
  }
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
    reader.readAsDataURL(file);
  });
  const comma = dataUrl.indexOf(',');
  const dataB64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return { mime: file.type || 'application/octet-stream', dataB64 };
}

/**
 * POST a CFE bill (mime + base64) to the /site-cfe-parse edge function.
 * Returns the parsed consumption on a 2xx response that carries a numeric
 * kwhPerDay, otherwise { fallback: 'manual' } on any non-200, parse error,
 * or missing/invalid kwhPerDay. Fails safe to manual entry — never blocks.
 */
export async function parseCfe(
  baseUrl: string,
  file: { mime: string; dataB64: string },
): Promise<CfeParseResult | { fallback: 'manual'; filePath?: string | null }> {
  try {
    const res = await fetch(`${baseUrl}/functions/v1/site-cfe-parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mime: file.mime, dataB64: file.dataB64 }),
    });
    if (!res.ok) return { fallback: 'manual' };
    const data = (await res.json()) as Partial<CfeParseResult>;
    if (!data || typeof data.kwhPerDay !== 'number' || !(data.kwhPerDay > 0)) {
      // Unreadable bill, but the edge function still parked the file — keep the path so the
      // lead carries the attachment staff will need in order to read it by hand.
      return { fallback: 'manual', filePath: data?.filePath ?? null };
    }
    return {
      kwhPerDay: data.kwhPerDay,
      kwhTotal: data.kwhTotal,
      periodDays: data.periodDays,
      tariff: data.tariff ?? null,
      address: data.address ?? null,
      filePath: data.filePath ?? null,
    };
  } catch {
    return { fallback: 'manual' };
  }
}

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
