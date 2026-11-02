import type { Locale } from '../lib/i18n';

/** Homepage copy (redesign 2026-11). Numbers match PRODUCT.md — one set, used everywhere. */
const en = {
  metaTitle: 'Battery Backup & Solar in San Miguel de Allende | Firefly Energy',
  metaDesc:
    'Automatic home battery backup and solar, sized from your CFE bill and installed by a local San Miguel de Allende team. Under 20 ms switchover, 8-year warranty.',
  nav: { how: 'How it works', stays: 'What stays on', installs: 'Installs', business: 'Business', faq: 'FAQ', cta: 'Get my proposal' },
  hero: {
    h1a: 'San Miguel goes dark.',
    h1b: 'Your home stays on.',
    sub: 'Automatic battery backup, sized from your CFE bill and installed by a local team. When the grid drops, your lights, internet, fridge and water pump carry on in under 20 milliseconds.',
    cta: 'Get my customized proposal',
    wa: 'WhatsApp us',
    trust: ['20 years serving Mexico', '8-year warranty incl. installation & support', 'Local San Miguel team'],
    gridLabel: 'CFE grid',
    homeLabel: 'Your home',
    on: 'On',
    off: 'Offline',
    battery: 'On battery',
    fireflyHome: 'A Firefly home',
    scroll: 'Scroll',
    imgAlt: 'San Miguel de Allende at night. As the grid fails, neighborhoods go dark one by one while a few homes, one of them a Firefly home, stay lit.',
    insideA: 'This is what keeps the lights on.',
    insideB: 'A Firefly inverter and battery in a San Miguel home: on the wall, out of the way, silent. No fuel, no generator, nothing to switch.',
    insideAlt: 'A Firefly inverter mounted on a terracotta wall above a Firefly battery, beside a potted palm, in a San Miguel de Allende home.',
  },
  handoff: {
    title: 'Twenty milliseconds. Faster than a blink.',
    lede: 'Firefly checks your power 60 times a second. You never touch a switch.',
    steps: [
      { t: '0 ms', h: 'CFE drops.', p: 'The inverter sees the grid fall away, or a voltage spike or dip coming in, and disconnects from it.' },
      { t: '< 20 ms', h: 'Your battery takes over.', p: 'Faster than lights can flicker. Modems, computers and clocks don’t notice.' },
      { t: 'Hours', h: 'Solar keeps it topped up.', p: 'With panels, the battery refills through the day and rides out most long outages.' },
      { t: 'Grid back', h: 'Back to CFE, quietly.', p: 'When the grid returns and steadies, Firefly hands back and recharges. Nothing to reset.' },
    ],
  },
  stays: {
    title: 'Choose what stays on.',
    lede: 'Every system is sized to your home. Pick a starting point; we fine-tune it from your CFE bill.',
    loads: ['Lights', 'Wi-Fi & internet', 'Refrigerator', 'Water pump', 'Air conditioning', 'Kitchen & laundry', 'The whole house'],
    tiers: [
      { key: 'essentials', name: 'Essentials', kit: '6.5 kW inverter · 5 kWh battery', on: 4, hrsCrit: 8, hrsNormal: 4, note: 'Critical circuits on a dedicated sub-panel.' },
      { key: 'comfort', name: 'Comfort', kit: '10 kW inverter · 10 kWh battery', on: 6, hrsCrit: 15, hrsNormal: 9, note: 'Everyday life, including some air conditioning.' },
      { key: 'wholehome', name: 'Whole home', kit: '12 kW inverter · 16 kWh battery', on: 7, hrsCrit: 24, hrsNormal: 14, note: 'Our most common install.' },
    ],
    hrsCritLabel: 'Essentials only',
    hrsNormalLabel: 'Normal use',
    hrs: '~{h} hrs',
    fine: 'Approximate runtime on battery alone, based on ~25 kWh/day of normal use. With solar, most outages are ridden out entirely. Batteries and solar can be added later.',
    cta: 'Size my system',
  },
  installs: {
    title: 'Already working in San Miguel homes.',
    lede: 'Real Firefly installs around town: garages, utility rooms, covered patios. Out of the way and quiet.',
    alt: 'A Firefly inverter and battery installed in a San Miguel de Allende home',
    specs: [
      ['20 years', 'serving homes and businesses across Mexico'],
      ['8-year warranty', 'on inverter and battery, including installation and support'],
      ['6,000+ cycles', 'LiFePO₄ battery chemistry, built for daily use'],
      ['Grows with you', 'add batteries, solar or a generator any time'],
    ],
  },
  process: {
    title: 'Three steps. Then outages stop being your problem.',
    steps: [
      { h: 'Send your bill or book a visit', p: 'Upload a photo of your CFE bill or ask for a site visit. Two minutes, no obligation.' },
      { h: 'We size it and send a proposal', p: 'We read your real usage and design the system around it: what stays on, for how long.' },
      { h: 'We install and stay on call', p: 'Our own local crew installs and configures everything, backed by an 8-year warranty and support.' },
    ],
    cta: 'Start with my CFE bill',
  },
  business: {
    title: 'Running a business?',
    p: 'Battery storage and solar for shops, offices and facilities across Mexico: lower demand charges, keep production running through outages.',
    cta: 'Commercial & industrial',
  },
  faq: {
    title: 'Good questions.',
    items: [
      { q: 'What happens when the battery runs low?', a: 'It switches back to CFE automatically when the grid is available, and recharges from CFE or solar. You never flip a switch.' },
      { q: 'Can I start small and add more later?', a: 'Yes. Batteries stack up to 16 packs and solar can be added any time without replacing the inverter.' },
      { q: 'Does it work with my existing generator?', a: 'Yes. Generator integration is supported; the transfer switch is part of a standard install.' },
      { q: 'Do I need solar panels?', a: 'No. The battery alone backs up your home and smooths out CFE’s dips and spikes. Panels are optional and extend runtime.' },
      { q: 'How much does it cost?', a: 'Every home uses power differently, so we size the system from your CFE bill and send a customized proposal. It’s free and there’s no obligation.' },
      { q: 'Do you work outside San Miguel?', a: 'Yes. We’re based in San Miguel de Allende and install across Mexico, for homes and businesses.' },
    ],
    more: 'All questions',
  },
  closing: {
    title: 'Always connected. Always prepared.',
    p: 'Tell us about your home and we’ll prepare a customized proposal. No pressure, no obligation.',
    cta: 'Get my customized proposal',
    wa: 'Message us on WhatsApp',
  },
  footer: {
    tagline: 'Automatic battery backup and solar for homes and businesses.',
    area: 'San Miguel de Allende and across Mexico',
    by: 'Firefly Energy by Nordic Electric',
    rights: 'All rights reserved.',
    explore: 'Explore',
    contact: 'Contact',
    privacy: 'Privacy',
  },
};

type HomeCopy = typeof en;

const es: HomeCopy = {
  metaTitle: 'Respaldo de baterías y solar en San Miguel de Allende | Firefly Energy',
  metaDesc:
    'Respaldo automático con baterías y energía solar para tu casa, dimensionado con tu recibo de CFE e instalado por un equipo local en San Miguel de Allende. Cambio en menos de 20 ms, garantía de 8 años.',
  nav: { how: 'Cómo funciona', stays: 'Qué se queda encendido', installs: 'Instalaciones', business: 'Negocios', faq: 'Preguntas', cta: 'Mi propuesta' },
  hero: {
    h1a: 'San Miguel se apaga.',
    h1b: 'Tu casa sigue encendida.',
    sub: 'Respaldo automático con baterías, dimensionado con tu recibo de CFE e instalado por un equipo local. Cuando se va la luz, tus luces, internet, refrigerador y bomba de agua siguen funcionando en menos de 20 milisegundos.',
    cta: 'Quiero mi propuesta personalizada',
    wa: 'Escríbenos por WhatsApp',
    trust: ['20 años en México', 'Garantía de 8 años con instalación y soporte', 'Equipo local en San Miguel'],
    gridLabel: 'Red CFE',
    homeLabel: 'Tu casa',
    on: 'Encendida',
    off: 'Sin servicio',
    battery: 'Con batería',
    fireflyHome: 'Una casa Firefly',
    scroll: 'Desliza',
    imgAlt: 'San Miguel de Allende de noche. Al fallar la red, los barrios se apagan y solo algunas casas, entre ellas una casa Firefly, siguen iluminadas.',
    insideA: 'Esto es lo que mantiene la luz.',
    insideB: 'Un inversor y una batería Firefly en una casa de San Miguel: en la pared, discretos, en silencio. Sin combustible, sin generador, sin nada que mover.',
    insideAlt: 'Un inversor Firefly montado en un muro terracota sobre una batería Firefly, junto a una palma en maceta, en una casa de San Miguel de Allende.',
  },
  handoff: {
    title: 'Veinte milisegundos. Más rápido que un parpadeo.',
    lede: 'Firefly revisa tu energía 60 veces por segundo. Nunca tocas un interruptor.',
    steps: [
      { t: '0 ms', h: 'Se va la CFE.', p: 'El inversor detecta la caída de la red, o un pico o baja de voltaje, y se desconecta de ella.' },
      { t: '< 20 ms', h: 'Tu batería toma el control.', p: 'Más rápido de lo que parpadea un foco. Módems, computadoras y relojes ni lo notan.' },
      { t: 'Horas', h: 'El sol la mantiene cargada.', p: 'Con paneles, la batería se recarga durante el día y aguanta la mayoría de los apagones largos.' },
      { t: 'Regresa la red', h: 'De vuelta a CFE, sin ruido.', p: 'Cuando la red regresa y se estabiliza, Firefly la retoma y recarga. Nada que reiniciar.' },
    ],
  },
  stays: {
    title: 'Elige qué se queda encendido.',
    lede: 'Cada sistema se dimensiona para tu casa. Elige un punto de partida; lo afinamos con tu recibo de CFE.',
    loads: ['Luces', 'Wi-Fi e internet', 'Refrigerador', 'Bomba de agua', 'Aire acondicionado', 'Cocina y lavandería', 'Toda la casa'],
    tiers: [
      { key: 'essentials', name: 'Esencial', kit: 'Inversor 6.5 kW · batería 5 kWh', on: 4, hrsCrit: 8, hrsNormal: 4, note: 'Circuitos críticos en un subtablero dedicado.' },
      { key: 'comfort', name: 'Confort', kit: 'Inversor 10 kW · batería 10 kWh', on: 6, hrsCrit: 15, hrsNormal: 9, note: 'La vida diaria, incluido algo de aire acondicionado.' },
      { key: 'wholehome', name: 'Toda la casa', kit: 'Inversor 12 kW · batería 16 kWh', on: 7, hrsCrit: 24, hrsNormal: 14, note: 'Nuestra instalación más común.' },
    ],
    hrsCritLabel: 'Solo esenciales',
    hrsNormalLabel: 'Uso normal',
    hrs: '~{h} h',
    fine: 'Autonomía aproximada solo con batería, con base en ~25 kWh/día de uso normal. Con paneles solares, la mayoría de los apagones se superan por completo. Puedes agregar baterías o paneles después.',
    cta: 'Dimensionar mi sistema',
  },
  installs: {
    title: 'Ya funcionando en casas de San Miguel.',
    lede: 'Instalaciones Firefly reales en la ciudad: cocheras, cuartos de servicio, terrazas techadas. Discretas y silenciosas.',
    alt: 'Un inversor y una batería Firefly instalados en una casa de San Miguel de Allende',
    specs: [
      ['20 años', 'atendiendo hogares y negocios en todo México'],
      ['Garantía de 8 años', 'en inversor y batería, incluida instalación y soporte'],
      ['6,000+ ciclos', 'baterías LiFePO₄, hechas para uso diario'],
      ['Crece contigo', 'agrega baterías, paneles o un generador cuando quieras'],
    ],
  },
  process: {
    title: 'Tres pasos. Y los apagones dejan de ser tu problema.',
    steps: [
      { h: 'Envía tu recibo o agenda una visita', p: 'Sube una foto de tu recibo de CFE o pide una visita. Dos minutos, sin compromiso.' },
      { h: 'Lo dimensionamos y te enviamos una propuesta', p: 'Leemos tu consumo real y diseñamos el sistema a partir de él: qué se queda encendido y por cuánto tiempo.' },
      { h: 'Instalamos y seguimos contigo', p: 'Nuestro propio equipo local instala y configura todo, con garantía de 8 años y soporte.' },
    ],
    cta: 'Empezar con mi recibo de CFE',
  },
  business: {
    title: '¿Tienes un negocio?',
    p: 'Almacenamiento en baterías y solar para comercios, oficinas e instalaciones en todo México: menores cargos por demanda y producción sin interrupciones.',
    cta: 'Comercial e industrial',
  },
  faq: {
    title: 'Buenas preguntas.',
    items: [
      { q: '¿Qué pasa cuando la batería se agota?', a: 'Regresa a CFE automáticamente cuando hay red, y se recarga con CFE o con el sol. Nunca mueves un interruptor.' },
      { q: '¿Puedo empezar con poco y crecer después?', a: 'Sí. Las baterías se suman hasta 16 módulos y los paneles se agregan cuando quieras, sin cambiar el inversor.' },
      { q: '¿Funciona con mi generador?', a: 'Sí. Se puede integrar tu generador; el interruptor de transferencia es parte de la instalación estándar.' },
      { q: '¿Necesito paneles solares?', a: 'No. La batería sola respalda tu casa y suaviza las bajas y picos de CFE. Los paneles son opcionales y extienden la autonomía.' },
      { q: '¿Cuánto cuesta?', a: 'Cada casa consume distinto, así que dimensionamos el sistema con tu recibo de CFE y te enviamos una propuesta personalizada. Es gratis y sin compromiso.' },
      { q: '¿Trabajan fuera de San Miguel?', a: 'Sí. Estamos en San Miguel de Allende e instalamos en todo México, para hogares y negocios.' },
    ],
    more: 'Todas las preguntas',
  },
  closing: {
    title: 'Siempre conectado. Siempre preparado.',
    p: 'Cuéntanos de tu casa y te preparamos una propuesta personalizada. Sin presión, sin compromiso.',
    cta: 'Quiero mi propuesta personalizada',
    wa: 'Escríbenos por WhatsApp',
  },
  footer: {
    tagline: 'Respaldo automático con baterías y energía solar para hogares y negocios.',
    area: 'San Miguel de Allende y todo México',
    by: 'Firefly Energy by Nordic Electric',
    rights: 'Todos los derechos reservados.',
    explore: 'Explora',
    contact: 'Contacto',
    privacy: 'Privacidad',
  },
};

export const homeCopy: Record<Locale, HomeCopy> = { en, es };
