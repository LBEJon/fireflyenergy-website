// supabase/functions/site-lead/lead.mjs
// Pure record-builder for the public site-lead edge function (Approach A).
// Produces ONE `site_lead` row — the durable capture buffer. Contact creation +
// dedupe happen downstream in n8n, so this stays simple and side-effect-free
// (unit-tested under node, reused verbatim by the Deno handler).
//
// Contact may arrive as explicit { phone, email, whatsapp } (current site) or as a
// single legacy `contact` string (older clients). Either way we require a name plus
// at least one reachable channel, and we record phone + email in their own columns.
const MAX_LEN = 200;

export function buildLeadRow(p, meta = {}) {
  if (p.hp) throw new Error('spam'); // honeypot tripped → caller quietly 200s
  const name = (p.name || '').trim();
  if (!name) throw new Error('missing_contact');

  const rawPhone = (p.phone || '').trim();
  const rawEmail = (p.email || '').trim();
  const legacy = (p.contact || '').trim(); // back-compat: one "phone or email" field
  if ([name, rawPhone, rawEmail, legacy].some((s) => s.length > MAX_LEN)) {
    throw new Error('field_too_long');
  }

  // Email: explicit field, else the legacy value if it looks like an email.
  let email = rawEmail || (legacy.includes('@') ? legacy : '');
  email = email ? email.toLowerCase() : null;

  // Phone: explicit field, else the legacy value if it isn't an email. MX-local → +52.
  const phoneSrc = rawPhone || (legacy.includes('@') ? '' : legacy);
  let phone = null;
  if (phoneSrc) {
    const digits = phoneSrc.replace(/\D/g, '');
    phone = digits.length === 10 ? '52' + digits : digits;
  }

  if (!email && !phone) throw new Error('missing_contact');

  if (JSON.stringify(p.answers ?? null).length > 16384 ||
      JSON.stringify(p.config ?? null).length > 16384) throw new Error('payload_too_large');

  // Carry the WhatsApp flag alongside the rest of the config jsonb for n8n.
  const baseConfig = p.config && typeof p.config === 'object' ? p.config : {};
  const config = { ...baseConfig, whatsapp_is_same: !!p.whatsapp };

  return {
    name,
    contact_raw: (phoneSrc || email || legacy).slice(0, MAX_LEN),
    email,
    phone,
    segment: p.segment === 'industrial' ? 'industrial' : 'residential',
    locale: p.locale === 'es' ? 'es' : 'en',
    answers: p.answers ?? null,
    config,
    source: 'website',
    status: 'received',
    ip: meta.ip ?? null,
    user_agent: meta.userAgent ?? null,
  };
}

// The exact storage key the CRM's park endpoint mints (websiteBillStorageKey in
// src/server/services/crm/cfe/upload.ts): `site-lead/<uuid v4>.<ext>`.
const BILL_PATH_RE =
  /^site-lead\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$/;

/**
 * Gate the CFE bill path before forwarding it to the CRM. The value round-trips through the
 * BROWSER (site-cfe-parse hands it to the page; the page posts it back), so it is
 * attacker-controlled by the time we see it — anything shaped like a storage key can be claimed.
 * Returning undefined for a non-matching value means the lead still lands, just unlinked.
 * What actually protects another customer's bill is the unguessable uuid inside the key; this is
 * the cheap outer wall, and the CRM re-validates the `site-lead/` prefix independently
 * (migration 0060).
 */
export function validBillFilePath(v) {
  return typeof v === "string" && BILL_PATH_RE.test(v) ? v : undefined;
}

// Per-page key minted by the CRM park endpoint (multi-page bills): `site-lead/<uuid v4>/<n>.<ext>`,
// n 1-4. Same shape the CRM's intake_promote_v1 (migration 0101) re-validates.
const BILL_PAGE_PATH_RE =
  /^site-lead\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[1-4]\.(pdf|jpg|png|webp)$/;

export function validBillPagePath(v) {
  return typeof v === "string" && BILL_PAGE_PATH_RE.test(v) ? v : undefined;
}

const MAX_BILLS = 6;
const ADDR_KEYS = ["address_line", "address2", "colonia", "city", "state", "postal_code"];

function addressFields(addr) {
  const out = {};
  if (addr && typeof addr === "object") {
    for (const k of ADDR_KEYS) if (addr[k] !== undefined && addr[k] !== null) out[k] = addr[k];
  }
  return out;
}

function pagePathOk(v) {
  return validBillPagePath(v) ?? validBillFilePath(v);
}

/**
 * Build the `cfe` array the CRM intake reads: one entry per meter/bill. Page paths round-trip
 * through the browser, so every one is re-validated; a bad path is dropped but the bill keeps its
 * figures. Falls back to the legacy single-bill answers when `answers.bills` is absent.
 */
export function buildCfeBills(a) {
  const answers = a ?? {};
  if (Array.isArray(answers.bills)) {
    const out = [];
    for (const b of answers.bills.slice(0, MAX_BILLS)) {
      if (!b || typeof b !== "object") continue;
      const pagePaths = (Array.isArray(b.pagePaths) ? b.pagePaths : [])
        .slice(0, 4)
        .map(pagePathOk)
        .filter(Boolean);
      const extraction = b.extraction && typeof b.extraction === "object"
        ? b.extraction
        : {
          tariff: b.tariff,
          current_period_kwh: b.kwhTotal,
          billing_days: b.periodDays,
          ...addressFields(b.address),
        };
      out.push({
        page_paths: pagePaths,
        file_path: pagePaths[0],
        extraction,
        tariff: b.tariff,
        current_period_kwh: b.kwhTotal,
        billing_days: b.periodDays,
        avg_daily_kwh: b.kwhPerDay,
        annual_kwh: b.annualKwh,
        meter_no: b.meterNo,
        service_no: b.serviceNo,
      });
    }
    return out.length ? out : undefined;
  }
  const filePath = pagePathOk(answers.billFilePath);
  if (!filePath && !answers.billKwhPerDay) return undefined;
  return [{
    page_paths: filePath ? [filePath] : [],
    file_path: filePath,
    extraction: {
      tariff: answers.billTariff,
      current_period_kwh: answers.billKwhTotal,
      billing_days: answers.billPeriodDays,
      ...addressFields(answers.billAddress),
    },
    tariff: answers.billTariff,
    current_period_kwh: answers.billKwhTotal,
    billing_days: answers.billPeriodDays,
    avg_daily_kwh: answers.billKwhPerDay,
  }];
}
