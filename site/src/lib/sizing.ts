export type HomeSize = 'cozy' | 'family' | 'estate' | 'business';
export type BackupScope = 'essentials' | 'usual' | 'everything';
export type SolarIntent = 'have' | 'add' | 'none';
export interface EstimatorAnswers { home: HomeSize; backup: BackupScope; solar: SolarIntent; }
export interface SystemConfig { inverterKw: number; batteryKwh: number; panels: number; }

const MIN_SOLAR_PANELS = 4;
const INVERTER_BY_HOME: Record<HomeSize, number> = { cozy: 6.5, family: 12, estate: 12, business: 12 };
const BATTERY_BY_BACKUP: Record<BackupScope, number> = { essentials: 5, usual: 16, everything: 16 };

export function sizeSystem(a: EstimatorAnswers): SystemConfig {
  let inverterKw = INVERTER_BY_HOME[a.home];
  if (a.home === 'estate' && a.backup === 'everything') inverterKw = 24;
  const batteryKwh = a.home === 'estate' && a.backup === 'everything' ? 32 : BATTERY_BY_BACKUP[a.backup];
  let panels = 0;
  if (a.solar !== 'none') {
    const raw = Math.round(inverterKw * 0.8);
    panels = raw < MIN_SOLAR_PANELS ? MIN_SOLAR_PANELS : raw;
  }
  return { inverterKw, batteryKwh, panels };
}
