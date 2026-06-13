import en from '../content/en.json';
import es from '../content/es.json';

export type Locale = 'en' | 'es';

export const LOCALES: Locale[] = ['en', 'es'];
export const DEFAULT_LOCALE: Locale = 'en';

const dictionaries: Record<Locale, Record<string, string>> = {
  en: en as Record<string, string>,
  es: es as Record<string, string>,
};

/** Derive the active locale from a request URL. Spanish lives under /es/, English at root. */
export function getLocale(url: URL): Locale {
  const seg = url.pathname.split('/').filter(Boolean)[0];
  return seg === 'es' ? 'es' : 'en';
}

/** Look up a translation key for a locale, falling back to the default locale, then the key. */
export function t(locale: Locale, key: string): string {
  return dictionaries[locale]?.[key] ?? dictionaries[DEFAULT_LOCALE]?.[key] ?? key;
}

/**
 * Build the alternate-locale URL for a logical path (used for hreflang links).
 * `path` is the locale-agnostic page path, e.g. '' (home), 'compare', 'faq'.
 * English renders at root; Spanish is prefixed with /es/.
 */
export function altUrl(locale: Locale, path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  if (locale === 'es') {
    return clean ? `/es/${clean}/` : '/es/';
  }
  return clean ? `/${clean}/` : '/';
}
