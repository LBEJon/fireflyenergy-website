export type CoverageTier = 'essential' | 'comfort' | 'full';

export interface ApplianceAnswers {
  miniSplits?: number;
  refrigerators?: number;
  waterPump?: 'none' | '110' | '220';
  poolPump?: boolean;
  electricOven?: boolean;
  inductionCooktop?: boolean;
  elevator?: boolean;
}

export interface AssessmentAnswers {
  billKwhPerDay?: number; // from CFE parse
  monthlyKwh?: number; // manual entry
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
};

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
    (typeof a.monthlyKwh === 'number' && a.monthlyKwh > 0)
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
  } else if (typeof a.monthlyKwh === 'number' && a.monthlyKwh > 0) {
    cfeKwhPerDay = a.monthlyKwh / 30;
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
