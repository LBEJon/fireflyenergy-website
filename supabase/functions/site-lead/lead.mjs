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
