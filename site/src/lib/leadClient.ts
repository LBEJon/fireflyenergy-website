export interface LeadPayload {
  name: string;
  /** Composed fallback (phone || email) for back-compat with the older edge fn. */
  contact: string;
  phone?: string;
  email?: string;
  /** Whether the phone is reachable on WhatsApp. */
  whatsapp?: boolean;
  segment: 'residential' | 'industrial';
  answers: unknown;
  config: unknown;
  locale: string;
  hp?: string;
}

/**
 * Submit a lead to the CRM edge function. Returns { ok: true } ONLY on a
 * 2xx response; { ok: false } on any failure (network, non-2xx, thrown).
 * Never throws and never reports a failure as success, so the UI can fall
 * back to the WhatsApp contact path when submission fails.
 */
export async function submitLead(
  baseUrl: string,
  payload: LeadPayload,
): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`${baseUrl}/functions/v1/site-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}
