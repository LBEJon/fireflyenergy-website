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

/**
 * Service @graph for the industrial / commercial BESS page.
 * Specs only — described by capability (BESS, kW/kWh/MWh), never by brand/model.
 */
export function serviceGraph(locale: Locale, site: URL | undefined) {
  const base = site?.href ?? 'https://fireflyenergy.mx/';
  const url = new URL(altUrl(locale, 'industrial'), base).href;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LocalBusiness',
        '@id': `${base}#business`,
        name: 'Firefly Energy',
        url: new URL(altUrl(locale, ''), base).href,
        email: t(locale, 'common.email'),
        telephone: t(locale, 'common.phone'),
        description: t(locale, 'footer.tagline'),
        areaServed: { '@type': 'Country', name: 'Mexico' },
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'San Miguel de Allende',
          addressCountry: 'MX',
        },
      },
      {
        '@type': 'Service',
        '@id': `${base}#industrial-bess`,
        name:
          locale === 'es'
            ? 'Sistemas de almacenamiento de energía en baterías (BESS) industriales y comerciales'
            : 'Industrial and commercial battery energy storage systems (BESS)',
        serviceType:
          locale === 'es'
            ? 'Sistemas de almacenamiento de energía en baterías / BESS'
            : 'Battery energy storage systems / BESS',
        description:
          locale === 'es'
            ? 'Almacenamiento de energía en baterías y autoabasto solar para empresas e instalaciones: reducción de cargos por demanda, respaldo a gran escala y calidad de energía, desde 30 kWh hasta más de 1 MWh.'
            : 'Battery energy storage and solar self-supply for businesses and facilities: demand-charge reduction, backup at scale, and power quality, from 30 kWh to over 1 MWh.',
        provider: { '@id': `${base}#business` },
        url,
        areaServed: { '@type': 'Country', name: 'Mexico' },
        audience: {
          '@type': 'BusinessAudience',
          audienceType:
            locale === 'es' ? 'Empresas e instalaciones industriales' : 'Businesses and industrial facilities',
        },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: locale === 'es' ? 'Capacidades de almacenamiento' : 'Storage capabilities',
          itemListElement: [
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: locale === 'es' ? 'Reducción de picos (cargos por demanda)' : 'Peak shaving (demand charges)',
              },
            },
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: locale === 'es' ? 'Respaldo a gran escala' : 'Backup at scale',
              },
            },
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: locale === 'es' ? 'Autoabasto con solar + almacenamiento' : 'Solar + storage self-supply',
              },
            },
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: locale === 'es' ? 'Calidad de la energía' : 'Power quality',
              },
            },
          ],
        },
      },
    ],
  };
}
