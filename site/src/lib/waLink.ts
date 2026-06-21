import { t, type Locale } from './i18n';

/**
 * Build a wa.me deep-link for the post-submit "Continue on WhatsApp" handoff.
 *
 * The customer taps this AFTER a successful lead submission; it opens their
 * own WhatsApp pre-addressed to Firefly's number (`common.whatsapp`) with a
 * locale-aware intro that includes the submitter's name, so they message Jon
 * directly and he can reply in-thread.
 *
 * The message template lives in i18n under `assessment.result.wa_message`
 * (and the industrial equivalent) with a `{name}` placeholder.
 */
export function buildWaSuccessHref(
  locale: Locale,
  messageKey: string,
  name: string,
): string {
  const number = t(locale, 'common.whatsapp');
  const safeName = (name ?? '').trim();
  const message = t(locale, messageKey).replace('{name}', safeName);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
