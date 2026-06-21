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
): Promise<CfeParseResult | { fallback: 'manual' }> {
  try {
    const res = await fetch(`${baseUrl}/functions/v1/site-cfe-parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mime: file.mime, dataB64: file.dataB64 }),
    });
    if (!res.ok) return { fallback: 'manual' };
    const data = (await res.json()) as Partial<CfeParseResult>;
    if (!data || typeof data.kwhPerDay !== 'number' || !(data.kwhPerDay > 0)) {
      return { fallback: 'manual' };
    }
    return {
      kwhPerDay: data.kwhPerDay,
      kwhTotal: data.kwhTotal,
      periodDays: data.periodDays,
      tariff: data.tariff ?? null,
      address: data.address ?? null,
    };
  } catch {
    return { fallback: 'manual' };
  }
}
