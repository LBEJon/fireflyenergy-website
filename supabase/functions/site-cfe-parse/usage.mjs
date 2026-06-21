// supabase/functions/site-cfe-parse/usage.mjs
// Pure helper: turn the model's read_cfe_usage extraction into the shape the website
// calculator expects ({ kwhPerDay, kwhTotal, periodDays, tariff }). Returns null when the
// reading is unusable so the caller falls back to manual entry. Kept pure + node-testable.

// CFE residential bills are bimonthly (~60 days); small-commercial are monthly (~30).
function defaultDays(billClass, tariff) {
  const t = String(tariff ?? "").toUpperCase();
  const commercial = billClass === "commercial" || /PDBT|GDMT|APBT|RABT|PCB/.test(t);
  return commercial ? 30 : 60;
}

// Pull the service-address fields out of the extraction (omit empty ones).
function addressFrom(input) {
  const keys = ["address_line", "address2", "colonia", "city", "state", "postal_code"];
  const addr = {};
  for (const k of keys) {
    const v = input[k];
    if (typeof v === "string" && v.trim()) addr[k] = v.trim();
  }
  return Object.keys(addr).length ? addr : null;
}

export function kwhPerDayFrom(input) {
  if (!input || typeof input !== "object") return null;
  const total = Number(input.current_period_kwh);
  if (!Number.isFinite(total) || total <= 0) return null;

  let days = Number(input.billing_days);
  // Trust only a plausible printed period; otherwise fall back to the tariff's cadence.
  if (!Number.isFinite(days) || days < 20 || days > 75) {
    days = defaultDays(input.bill_class, input.tariff);
  }

  const kwhPerDay = total / days;
  if (!Number.isFinite(kwhPerDay) || kwhPerDay <= 0) return null;

  return {
    kwhPerDay: Math.round(kwhPerDay * 100) / 100,
    kwhTotal: total,
    periodDays: days,
    tariff: input.tariff ?? null,
    address: addressFrom(input),
  };
}
