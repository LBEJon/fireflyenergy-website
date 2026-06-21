import { describe, it, expect } from 'vitest';
import { buildWaSuccessHref } from './waLink';

describe('buildWaSuccessHref', () => {
  it('builds an EN wa.me href with the real number and encoded name', () => {
    const href = buildWaSuccessHref('en', 'assessment.result.wa_message', 'Ada Lovelace');
    expect(href.startsWith('https://wa.me/524151805030?text=')).toBe(true);
    const text = decodeURIComponent(href.split('?text=')[1]);
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('fireflyenergy.mx');
    expect(text.startsWith("Hi Firefly, I'm Ada Lovelace")).toBe(true);
  });

  it('builds an ES wa.me href with the Spanish message', () => {
    const href = buildWaSuccessHref('es', 'assessment.result.wa_message', 'Juan Pérez');
    expect(href.startsWith('https://wa.me/524151805030?text=')).toBe(true);
    const text = decodeURIComponent(href.split('?text=')[1]);
    expect(text.startsWith('Hola Firefly, soy Juan Pérez')).toBe(true);
    expect(text).toContain('propuesta solar');
  });

  it('URL-encodes the name (spaces, accents, special chars)', () => {
    const href = buildWaSuccessHref('en', 'assessment.result.wa_message', 'José & María');
    // Raw special chars must not appear unencoded in the query string.
    expect(href).not.toContain(' ');
    expect(href).toContain('Jos%C3%A9');
    expect(href).toContain('%26'); // &
  });

  it('trims surrounding whitespace from the name', () => {
    const href = buildWaSuccessHref('en', 'assessment.result.wa_message', '  Sam  ');
    const text = decodeURIComponent(href.split('?text=')[1]);
    expect(text).toContain("I'm Sam —");
  });

  it('supports the industrial message key', () => {
    const href = buildWaSuccessHref('en', 'industrial.form.wa_message', 'Acme Co');
    const text = decodeURIComponent(href.split('?text=')[1]);
    expect(text).toContain('Acme Co');
  });
});
