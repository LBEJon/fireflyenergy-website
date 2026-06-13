import type { EstimateBody } from './assessment';

export interface EstimateTier {
  key: string;
  config: {
    inverterKw: number;
    batteryKwh: number;
    panels: number;
    includeSubpanel: boolean;
  };
  price: {
    equipmentUsd: number;
    equipInstallUsd: number;
    solarUsd: number;
    solarInstallUsd: number;
    preIvaUsd: number;
    ivaUsd: number;
    totalUsd: number;
  };
  highlighted: boolean;
}

export interface EstimateResult {
  needsSiteVisit: boolean;
  tiers?: EstimateTier[];
  dailyKwh?: number;
  existingSolarKw?: number;
  fxUsdMxn?: number;
  currency?: string;
}

/**
 * POST the assessment body to the CRM /site-estimate edge function.
 * Returns the parsed JSON on any 2xx response, or { error: true } on ANY
 * failure (network, non-2xx, or parse). Fails safe so the UI routes to
 * Door B (site visit) rather than ever showing a fabricated price.
 */
export async function fetchEstimate(
  baseUrl: string,
  body: EstimateBody,
): Promise<EstimateResult | { error: true }> {
  try {
    const res = await fetch(`${baseUrl}/functions/v1/site-estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { error: true };
    const data = (await res.json()) as EstimateResult;
    if (!data || typeof data !== 'object') return { error: true };
    return data;
  } catch {
    return { error: true };
  }
}
