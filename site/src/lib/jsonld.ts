/**
 * Structured-data (JSON-LD) builders for the residential pages.
 * Specs only — no brand/model names on the Product, per content rules.
 */
import { altUrl, t, type Locale } from './i18n';

/** LocalBusiness + Product @graph for the homepage. */
export function homeGraph(locale: Locale, site: URL | undefined) {
  const base = site?.href ?? 'https://fireflyenergy.mx/';
  const url = new URL(altUrl(locale, ''), base).href;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LocalBusiness',
        '@id': `${base}#business`,
        name: 'Firefly Energy',
        url,
        email: t(locale, 'common.email'),
        telephone: t(locale, 'common.phone'),
        description: t(locale, 'footer.tagline'),
        areaServed: [
          { '@type': 'City', name: 'San Miguel de Allende' },
          { '@type': 'Country', name: 'Mexico' },
        ],
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'San Miguel de Allende',
          addressCountry: 'MX',
        },
      },
      {
        '@type': 'Product',
        '@id': `${base}#home-battery-system`,
        name:
          locale === 'es'
            ? 'Sistema de respaldo de batería para el hogar'
            : 'Home battery backup system',
        description:
          locale === 'es'
            ? 'Respaldo automático de batería con 12 kW de potencia continua y 16 kWh de almacenamiento, listo para solar, con cambio en menos de 20 milisegundos.'
            : 'Automatic battery backup with 12 kW of continuous power and 16 kWh of storage, solar-ready, switching over in under 20 milliseconds.',
        brand: { '@type': 'Brand', name: 'Firefly Energy' },
        category: locale === 'es' ? 'Respaldo de energía solar' : 'Solar energy storage',
        additionalProperty: [
          {
            '@type': 'PropertyValue',
            name: locale === 'es' ? 'Potencia continua' : 'Continuous power',
            value: '12 kW',
          },
          {
            '@type': 'PropertyValue',
            name: locale === 'es' ? 'Almacenamiento' : 'Storage capacity',
            value: '16 kWh',
          },
          {
            '@type': 'PropertyValue',
            name: locale === 'es' ? 'Tiempo de cambio' : 'Switchover time',
            value: '<20 ms',
          },
        ],
        areaServed: [
          { '@type': 'City', name: 'San Miguel de Allende' },
          { '@type': 'Country', name: 'Mexico' },
        ],
        seller: { '@id': `${base}#business` },
      },
    ],
  };
}

/** FAQPage graph for the calculator page. */
export function faqGraph(locale: Locale) {
  const qa = [
    ['calc.faq_q1', 'calc.faq_a1'],
    ['calc.faq_q2', 'calc.faq_a2'],
    ['calc.faq_q3', 'calc.faq_a3'],
  ] as const;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: qa.map(([q, a]) => ({
      '@type': 'Question',
      name: t(locale, q),
      acceptedAnswer: {
        '@type': 'Answer',
        text: t(locale, a),
      },
    })),
  };
}
