// Website pricing snapshot — current Firefly catalog MSRP (USD), taken 2026-06-13.
// MSRP IS the customer price (Firefly-direct, no installer margin on the public site).
// Refresh these when the CRM catalog changes. FX is a daily snapshot (CRM daily-rate job, Phase 6b).
export const PRICING = {
  currency: 'USD' as const,
  inverterUsd: { 6.5: 2075, 7.2: 2075, 10: 2600, 12: 2850 } as Record<number, number>,
  batteryUsd:  { 5: 2150, 10: 3750, 16: 4990 } as Record<number, number>,
  panelUsd: 275,            // Longi 645W
  rackPerPanelUsd: 116,     // Panel Rack — per panel
  cableOnceUsd: 116,        // Solar Panel Cable — ONCE per install (not per panel)
  subpanelUsd: 450,         // Essential Loads Panel (critical-circuits tier only)
  flatEquipInstallUsd: 400, // flat base/main-line install, size-independent
  solarInstallRate: 0.90,   // 90% of solar equipment value
  ivaRate: 0.16,            // shown SEPARATELY (not folded into the headline)
  fxUsdMxn: 18.0,           // daily snapshot placeholder; replaced by CRM daily-rate later
  snapshotDate: '2026-06-13',
};

export type Pricing = typeof PRICING;
