export type CoverageTier = 'essential' | 'comfort' | 'full';

export interface OtherLoad {
  name: string;
  watts: number;
  critical?: boolean;
}

export interface ApplianceAnswers {
  miniSplits?: number;
  refrigerators?: number;
  waterPump?: 'none' | '110' | '220';
  poolPump?: boolean;
  electricOven?: boolean;
  inductionCooktop?: boolean;
  elevator?: boolean;
  otherLoads?: OtherLoad[];
}

export interface CfeAddress {
  address_line?: string;
  address2?: string;
  colonia?: string;
  city?: string;
  state?: string;
  postal_code?: string;
}

export interface AssessmentAnswers {
  billKwhPerDay?: number; // from CFE parse
  billAddress?: CfeAddress; // service address read from the CFE bill
  dailyKwh?: number; // manual entry (kWh/day)
  backupHours?: number;
  hasExistingSolar?: boolean;
  panelCount?: number;
  panelWatts?: number;
  addSolarPanels?: number; // new panels to buy (0 = battery only)
  appliances?: ApplianceAnswers;
  coverageTier?: CoverageTier;
  language?: 'en' | 'es';
}

export interface EstimateBody {
  cfeKwhPerDay?: number;
  backupHours: number;
  existingSolarKw: number;
  hasExistingSolar: boolean;
  addSolarPanels: number;
  appliances: Required<ApplianceAnswers>;
  coverageTier: CoverageTier;
  language: 'en' | 'es';
}

const APPLIANCE_DEFAULTS: Required<ApplianceAnswers> = {
  miniSplits: 0,
  refrigerators: 0,
  waterPump: 'none',
  poolPump: false,
  electricOven: false,
  inductionCooktop: false,
  elevator: false,
  otherLoads: [],
};

/** Engine solar constants (FIXED — mirror the site-estimate engine). */
export const PANEL_WATTS = 645;
export const PSH = 5.5; // peak sun hours/day
export const SYSTEM_EFF = 0.8; // system efficiency

/** Daily production (kWh) of a single panel at the fixed engine constants. */
export function perPanelDailyKwh(panelWatts = PANEL_WATTS): number {
  return (panelWatts / 1000) * PSH * SYSTEM_EFF;
}

/**
 * Panels to offset ~100% of daily usage, crediting existing solar, floored to
 * the 4-panel inverter-string minimum (0 allowed when existing already covers
 * it). Non-finite or non-positive consumption returns 0.
 */
export function recommendPanels(
  cfeKwhPerDay: number,
  existingSolarKw = 0,
  panelWatts = PANEL_WATTS,
): number {
  if (!Number.isFinite(cfeKwhPerDay) || cfeKwhPerDay <= 0) return 0;
  const existingDaily = existingSolarKw * PSH * SYSTEM_EFF;
  const need = Math.max(0, cfeKwhPerDay - existingDaily);
  const n = Math.ceil(need / perPanelDailyKwh(panelWatts));
  if (n > 0 && n < 4) return 4;
  return n;
}

/** % of daily usage offset by N new panels plus existing solar, capped 100. */
export function offsetPct(
  panels: number,
  cfeKwhPerDay: number,
  existingSolarKw = 0,
  panelWatts = PANEL_WATTS,
): number {
  if (!Number.isFinite(cfeKwhPerDay) || cfeKwhPerDay <= 0) return 0;
  const prod =
    panels * perPanelDailyKwh(panelWatts) + existingSolarKw * PSH * SYSTEM_EFF;
  return Math.min(100, Math.round((prod / cfeKwhPerDay) * 100));
}

/**
 * Existing rooftop solar capacity in kW from panel count and per-panel watts.
 * Returns 0 unless both are positive.
 */
export function existingSolarKw(count: number, watts: number): number {
  return count > 0 && watts > 0 ? (count * watts) / 1000 : 0;
}

/**
 * Whether the customer's consumption is known — either a parsed CFE bill
 * value or a manual monthly entry. This is the gate: no consumption known
 * means no price can be produced (the UI routes to a site visit / Door B).
 */
export function consumptionKnown(a: AssessmentAnswers): boolean {
  return (
    (typeof a.billKwhPerDay === 'number' && a.billKwhPerDay > 0) ||
    (typeof a.dailyKwh === 'number' && a.dailyKwh > 0)
  );
}

/**
 * Map wizard answers to the /site-estimate request body. Enforces the
 * consumption gate: when no consumption is known, cfeKwhPerDay is left
 * undefined so the estimator cannot fabricate a price.
 */
export function toEstimateBody(a: AssessmentAnswers): EstimateBody {
  let cfeKwhPerDay: number | undefined;
  if (typeof a.billKwhPerDay === 'number' && a.billKwhPerDay > 0) {
    cfeKwhPerDay = a.billKwhPerDay;
  } else if (typeof a.dailyKwh === 'number' && a.dailyKwh > 0) {
    cfeKwhPerDay = a.dailyKwh;
  } else {
    cfeKwhPerDay = undefined;
  }

  const hasExistingSolar = a.hasExistingSolar === true;
  const solarKw = hasExistingSolar
    ? existingSolarKw(a.panelCount ?? 0, a.panelWatts ?? 0)
    : 0;

  return {
    cfeKwhPerDay,
    backupHours: typeof a.backupHours === 'number' ? a.backupHours : 12,
    existingSolarKw: solarKw,
    hasExistingSolar,
    addSolarPanels: typeof a.addSolarPanels === 'number' ? a.addSolarPanels : 0,
    appliances: { ...APPLIANCE_DEFAULTS, ...a.appliances },
    coverageTier: a.coverageTier ?? 'comfort',
    language: a.language ?? 'en',
  };
}
