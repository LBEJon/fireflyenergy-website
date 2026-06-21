import type { Locale } from './i18n';

export interface FaqItem {
  q: string;
  /** Trusted, hand-authored HTML (rendered via set:html). */
  a: string;
}

export interface FaqCategory {
  id: string;
  label: string;
  /** Inner SVG markup for a 24×24 stroke icon. */
  icon: string;
  items: FaqItem[];
}

export interface FaqContent {
  meta: { title: string; description: string };
  eyebrow: string;
  title: string;
  sub: string;
  /** [singular, plural] noun for the per-category count. */
  countUnit: [string, string];
  categories: FaqCategory[];
}

// Stroke icons (shared across locales), drawn in the same style as DefenseCards.
const ICON = {
  system: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  equipment:
    '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>',
  installation:
    '<path d="M14.6 6.3a3.7 3.7 0 0 1-4.9 4.9L4.2 16.6V20h3.4l5.4-5.4a3.7 3.7 0 0 0 4.9-4.9l-2.3 2.3-2.1-2.1 2.1-2.6z"/>',
  billing: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9.5 7.5h5M9.5 11.5h5"/>',
  warranty: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
};

export const faqData: Record<Locale, FaqContent> = {
  en: {
    meta: {
      title: 'FAQ — Firefly Energy',
      description:
        'Answers on how the Firefly home battery + solar system works — what’s included, installation, warranty, and how it lowers your CFE bill.',
    },
    eyebrow: 'Knowledge base',
    title: 'Frequently asked questions',
    sub: 'Everything you need to know about how the Firefly system works, what’s included, and how it fits your home.',
    countUnit: ['question', 'questions'],
    categories: [
      {
        id: 'system',
        label: 'System operation',
        icon: ICON.system,
        items: [
          {
            q: 'How does the Firefly system actually power my home?',
            a: `<p>Every watt your home uses — from the battery, your solar panels, or CFE — passes through the hybrid inverter before it reaches your outlets. The inverter is the heart of the system.</p>
<p>When you’re running on <strong>battery or solar</strong>, the inverter generates a clean, pure sine wave from scratch — the stable, ideal form of power your electronics are designed for.</p>
<p>When power comes from <strong>CFE</strong>, the inverter passes it through while monitoring it <strong>60 times per second</strong>, confirming the voltage stays within safe limits — never spiking above or dropping below the threshold for safe operation.</p>
<p>The result: your home always receives clean, conditioned power, and your sensitive equipment is protected from the voltage spikes and dirty power that often come directly from the grid.</p>`,
          },
          {
            q: 'Do I need solar panels for the system to work?',
            a: `<p>No — solar panels are not required for the system to work. The battery and inverter alone provide backup power, protect your home from CFE outages, and deliver clean sine wave power when running on stored energy. Many clients start with battery-only and add solar later.</p>
<p>If you already have solar panels, the hybrid inverter unlocks their full value — storing excess daytime generation for use at night instead of sending it back to the grid unused. If you’re thinking about adding solar, the system is already designed to accommodate panels at any time with no additional equipment changes.</p>`,
          },
          {
            q: 'If I have solar panels, how does the system prioritize power sources?',
            a: `<p>If you have solar panels, <strong>they become the primary power source</strong> during the day — powering your home and charging the battery simultaneously. CFE only kicks in automatically when the battery is running low and solar production isn’t sufficient (cloudy skies, high demand, or nighttime). The system manages all of this automatically with no manual switching required.</p>
<p>If you don’t have solar yet, the battery alone still provides backup power and protects your home from CFE outages and dirty power — and solar panels can be added at any time.</p>
<p><strong>Why this matters for your CFE bill:</strong> Mexico’s residential electricity pricing is tiered — the rate jumps dramatically once you exceed the lower consumption thresholds. If you have solar, the system’s primary goal is to reduce the kWh you purchase from CFE, keeping you in the lower-cost tiers and significantly reducing your bill over time.</p>`,
          },
          {
            q: 'When the battery is empty at night, does it automatically switch back to CFE?',
            a: `<p>Yes. When the battery reaches its low threshold, the system automatically transfers to grid power (CFE) — no manual action required on your end.</p>
<p>Because all power still passes through the inverter, the switch to CFE is seamless — and your equipment stays protected from the voltage spikes and dirty power that often come directly from the grid.</p>`,
          },
          {
            q: 'What happens during a CFE outage?',
            a: `<p>The switchover is seamless and virtually instantaneous. When CFE goes down, the hybrid inverter detects the outage and automatically transfers your home to battery + solar power within milliseconds — fast enough that most electronics and appliances don’t even notice the transition.</p>
<p>During the outage, your home continues running normally on battery and solar. When CFE is restored, the system transfers back automatically.</p>`,
          },
          {
            q: 'Can my existing generator be integrated with the system?',
            a: `<p>Yes. With the <strong>optional automatic transfer switch (ATS)</strong>, your generator integrates directly with the system. You start it manually, the system detects generator power, and the inverter uses it to keep the house running and charge the battery simultaneously.</p>
<p>One important consideration: the generator will prioritize powering the house first, using surplus capacity to charge the battery. Depending on the generator’s output, it may not fully recharge a large battery bank while simultaneously running the whole house — but it significantly extends your runtime during extended outages.</p>
<p>This is one reason we recommend starting with the larger battery capacity (16 kWh). More storage means greater resilience during extended outages.</p>`,
          },
        ],
      },
      {
        id: 'equipment',
        label: 'Equipment & specifications',
        icon: ICON.equipment,
        items: [
          {
            q: 'Can I start with a smaller battery and expand later?',
            a: `<p>Yes, the system is fully modular. You can start with a 5 kWh battery module and add more capacity at any time without changing the inverter or any other equipment. The system supports up to 16 battery units in parallel.</p>
<p>That said, we typically recommend starting with the <strong>16 kWh configuration</strong> if your situation allows. Whether you have an existing solar array or are starting fresh, more battery capacity means greater resilience during outages — and it’s more cost-effective to size correctly upfront than to add modules later.</p>`,
          },
          {
            q: 'Should I use bifacial panels or single-sided panels?',
            a: `<p>It depends on how the panels are mounted:</p>
<ul>
<li><strong>Pergola, elevated, or angled installations:</strong> Bifacial panels are ideal. Raised or tilted off the surface, they capture reflected light from below in addition to direct sunlight from above — exactly what bifacial technology is designed for. Since there’s no cost difference, there’s no reason not to take advantage of the extra generation.</li>
<li><strong>Flat roof installations:</strong> Either bifacial or monofacial (single-sided) panels work well. Mounted flat against the surface, bifacial panels capture little to no reflected light, so they offer no additional benefit over monofacial — same wattage output, same price.</li>
</ul>
<p>We assess each installation individually and specify the correct panel type for your configuration.</p>`,
          },
        ],
      },
      {
        id: 'installation',
        label: 'Installation',
        icon: ICON.installation,
        items: [
          {
            q: 'How is installation priced?',
            a: `<p>Installation is <strong>quoted after a site visit</strong> — because every home is different. Once we’ve seen your electrical panel, the mounting location, and how your home is wired, we can price the work accurately based on the <strong>time and complexity</strong> of the job.</p>
<p>Factors that affect the installation quote include:</p>
<ul>
<li>Circuit-separation subpanels for specific load management</li>
<li>Extended cable runs over long distances</li>
<li>Special structural mounting requirements</li>
<li>Configurations that fall outside standard residential parameters</li>
<li>Accessories such as an automatic transfer switch (ATS) for a generator or multiple-meter connection</li>
<li>Connecting existing solar panels</li>
</ul>
<p>Your full installation cost is laid out clearly in your proposal after the site visit — complete transparency, without surprises.</p>`,
          },
          {
            q: 'How long does a typical installation take?',
            a: `<p>A standard Firefly installation typically takes <strong>1–2 days</strong> depending on the scope of the project. This includes mounting the inverter and battery, wiring the system into your electrical panel, and final testing and commissioning.</p>
<p>If solar panels are part of your project, or if you’re integrating an existing solar array, allow an additional half to full day. Generator ATS integration and other complex configurations may also add time. We’ll give you a clear timeline estimate during your assessment.</p>`,
          },
        ],
      },
      {
        id: 'billing',
        label: 'CFE & billing',
        icon: ICON.billing,
        items: [
          {
            q: 'How does the Firefly system reduce my CFE bill?',
            a: `<p>CFE’s residential tariff (Tarifa 01) uses a tiered pricing structure — the more you consume, the more you pay per kWh. The first small block of consumption is subsidized at low rates, but consumption beyond that jumps to the <em>excedente</em> tier, which can be <strong>3–4× more expensive</strong>.</p>
<p>The Firefly system reduces the kWh you buy from CFE by:</p>
<ul>
<li>Storing energy in the battery and running your home from it rather than the grid</li>
<li><strong>With solar panels:</strong> powering your home directly from the panels during daylight hours and storing the surplus in the battery for use at night</li>
<li>Only drawing from CFE when the battery is low and no other source (solar or generator) is available</li>
</ul>
<p><strong>Firefly with solar panels delivers the biggest bill reduction.</strong> Beyond powering your home and charging the battery, surplus daytime generation is fed back to the grid under Mexico’s net metering program (<em>medición neta</em>), earning kWh credits that offset what you draw at night. In effect, the sunlight you capture by day pays for the power you use after dark.</p>
<p>The result: your metered CFE consumption drops significantly, pushing you back toward the cheaper tiers — where the savings compound over every billing period.</p>`,
          },
          {
            q: 'Does the system work with net metering (medición neta)?',
            a: `<p>Yes — if your system includes solar panels, Mexico’s net metering program (medición neta) allows surplus solar energy to be exported to the CFE grid in exchange for kWh credits, which can offset future consumption.</p>
<p>With the Firefly hybrid system, the battery stores surplus solar energy first — reducing what you draw from the grid at night. Any generation that exceeds both your immediate loads and battery capacity can then be exported for credits. This maximizes the value of every kWh your panels produce.</p>`,
          },
        ],
      },
      {
        id: 'warranty',
        label: 'Warranty & support',
        icon: ICON.warranty,
        items: [
          {
            q: 'What warranty does Firefly provide on equipment?',
            a: `<div class="ff-faq__tablewrap"><table>
<thead><tr><th>Equipment</th><th>Warranty</th><th>Coverage</th></tr></thead>
<tbody>
<tr><td>Inverter</td><td>8 years</td><td>Parts, labor, and after-sales support</td></tr>
<tr><td>Battery system</td><td>8 years</td><td>Parts, labor, and after-sales support</td></tr>
<tr><td>Solar panels — materials</td><td>Typically 25 years</td><td>Product and workmanship defects</td></tr>
<tr><td>Solar panels — power output</td><td>Typically 30 years</td><td>Long-term power output retention guarantee</td></tr>
</tbody>
</table></div>
<p>Solar panel warranty terms vary by manufacturer. Your proposal will list the exact warranty figures for the panels specified in your system.</p>`,
          },
        ],
      },
    ],
  },

  es: {
    meta: {
      title: 'Preguntas frecuentes — Firefly Energy',
      description:
        'Respuestas sobre cómo funciona el sistema Firefly de batería + solar: qué incluye, instalación, garantía y cómo reduce su recibo de CFE.',
    },
    eyebrow: 'Base de conocimiento',
    title: 'Preguntas frecuentes',
    sub: 'Todo lo que necesita saber sobre cómo funciona el sistema Firefly, qué incluye y cómo se adapta a su casa.',
    countUnit: ['pregunta', 'preguntas'],
    categories: [
      {
        id: 'system',
        label: 'Funcionamiento del sistema',
        icon: ICON.system,
        items: [
          {
            q: '¿Cómo alimenta realmente mi casa el sistema Firefly?',
            a: `<p>Cada watt que consume su casa — provenga de la batería, de sus paneles solares o de CFE — pasa a través del inversor híbrido antes de llegar a sus contactos. El inversor es el corazón del sistema.</p>
<p>Cuando opera con <strong>batería o solar</strong>, el inversor genera desde cero una onda senoidal limpia y pura — la forma de energía estable e ideal para la que están diseñados sus electrónicos.</p>
<p>Cuando la energía viene de <strong>CFE</strong>, el inversor la deja pasar mientras la monitorea <strong>60 veces por segundo</strong>, confirmando que el voltaje se mantenga dentro de límites seguros — sin picos por encima ni caídas por debajo del umbral de operación segura.</p>
<p>El resultado: su casa siempre recibe energía limpia y acondicionada, y sus equipos sensibles quedan protegidos de los picos de voltaje y la energía sucia que frecuentemente vienen directo de la red.</p>`,
          },
          {
            q: '¿Necesito paneles solares para que el sistema funcione?',
            a: `<p>No — los paneles solares no son necesarios para que el sistema funcione. La batería y el inversor por sí solos proporcionan energía de respaldo, protegen su casa de los apagones de CFE y entregan energía de onda senoidal limpia cuando opera con energía almacenada. Muchos clientes comienzan solo con batería y agregan solar después.</p>
<p>Si ya tiene paneles solares, el inversor híbrido desbloquea todo su valor — almacenando la generación diurna excedente para usarla de noche en lugar de enviarla de vuelta a la red sin aprovecharla. Si está pensando en agregar solar, el sistema ya está diseñado para acomodar paneles en cualquier momento sin cambios de equipo adicionales.</p>`,
          },
          {
            q: 'Si tengo paneles solares, ¿cómo prioriza el sistema las fuentes de energía?',
            a: `<p>Si usted tiene paneles solares, <strong>se convierten en la fuente de energía principal</strong> durante el día — alimentando su casa y cargando la batería al mismo tiempo. La CFE solo entra automáticamente cuando la batería está baja y la producción solar no es suficiente (cielos nublados, alta demanda o de noche). El sistema maneja todo esto automáticamente sin necesidad de intervención manual.</p>
<p>Si aún no tiene solar, la batería por sí sola proporciona respaldo y protege su casa contra los apagones de CFE y la energía sucia — y los paneles solares se pueden agregar en cualquier momento.</p>
<p><strong>Por qué esto importa para su recibo de CFE:</strong> la tarifa residencial de electricidad en México es escalonada — el precio aumenta considerablemente al superar los umbrales de consumo más bajos. Si tiene solar, el objetivo principal del sistema es reducir los kWh que compra a CFE, manteniéndolo en las tarifas más bajas y reduciendo significativamente su recibo con el tiempo.</p>`,
          },
          {
            q: 'Cuando la batería se agota en la noche, ¿vuelve automáticamente a la CFE?',
            a: `<p>Sí. Cuando la batería llega a su umbral bajo, el sistema se transfiere automáticamente a la energía de la red (CFE) — sin que usted tenga que hacer nada.</p>
<p>Como toda la energía sigue pasando a través del inversor, el cambio a CFE es imperceptible — y sus equipos permanecen protegidos de los picos de voltaje y la energía sucia que frecuentemente vienen directo de la red.</p>`,
          },
          {
            q: '¿Qué pasa durante un apagón de la CFE?',
            a: `<p>El cambio es imperceptible y prácticamente instantáneo. Cuando se va la CFE, el inversor híbrido detecta el apagón y transfiere automáticamente su casa a la energía de batería y solar en milisegundos — tan rápido que la mayoría de los electrónicos y electrodomésticos ni siquiera notan la transición.</p>
<p>Durante el apagón, su casa sigue funcionando normalmente con batería y solar. Cuando regresa la CFE, el sistema se transfiere de vuelta automáticamente.</p>`,
          },
          {
            q: '¿Puedo integrar mi generador existente al sistema?',
            a: `<p>Sí. Con el <strong>interruptor de transferencia automática (ATS) opcional</strong>, su generador se integra directamente con el sistema. Usted lo arranca manualmente, el sistema detecta la energía del generador y el inversor la utiliza para mantener la casa funcionando y cargar la batería al mismo tiempo.</p>
<p>Una consideración importante: el generador dará prioridad a energizar la casa primero, y usará la capacidad sobrante para cargar la batería. Dependiendo de la potencia del generador, es posible que no recargue por completo un banco de baterías grande mientras alimenta toda la casa al mismo tiempo — pero extiende significativamente su autonomía durante apagones prolongados.</p>
<p>Esta es una razón por la que recomendamos comenzar con la mayor capacidad de batería (16 kWh). Más almacenamiento significa mayor resiliencia durante apagones prolongados.</p>`,
          },
        ],
      },
      {
        id: 'equipment',
        label: 'Equipo y especificaciones',
        icon: ICON.equipment,
        items: [
          {
            q: '¿Puedo comenzar con una batería más pequeña y expandirla después?',
            a: `<p>Sí, el sistema es completamente modular. Puede comenzar con un módulo de batería de 5 kWh y agregar más capacidad en cualquier momento sin cambiar el inversor ni ningún otro equipo. El sistema admite hasta 16 unidades de batería en paralelo.</p>
<p>Dicho esto, normalmente recomendamos comenzar con la <strong>configuración de 16 kWh</strong> si su situación lo permite. Ya sea que tenga un sistema solar existente o esté empezando desde cero, más capacidad de batería significa mayor resiliencia durante apagones — y es más rentable dimensionar correctamente desde el inicio que agregar módulos después.</p>`,
          },
          {
            q: '¿Debo usar paneles bifaciales o paneles de una sola cara?',
            a: `<p>Depende de cómo se monten los paneles:</p>
<ul>
<li><strong>Instalaciones en pérgola, elevadas o en ángulo:</strong> los paneles bifaciales son ideales. Al estar elevados o inclinados sobre la superficie, capturan la luz reflejada desde abajo además de la luz directa del sol — exactamente para lo que fue diseñada la tecnología bifacial. Como no hay diferencia de costo, no hay razón para no aprovechar la generación adicional.</li>
<li><strong>Instalaciones en techo plano:</strong> funcionan bien tanto los paneles bifaciales como los monofaciales (de una sola cara). Montados de forma plana sobre la superficie, los paneles bifaciales capturan poca o nula luz reflejada, por lo que no ofrecen un beneficio adicional sobre los monofaciales — misma potencia, mismo precio.</li>
</ul>
<p>Evaluamos cada instalación de manera individual y especificamos el tipo de panel correcto para su configuración.</p>`,
          },
        ],
      },
      {
        id: 'installation',
        label: 'Instalación',
        icon: ICON.installation,
        items: [
          {
            q: '¿Cómo se cotiza la instalación?',
            a: `<p>La instalación se <strong>cotiza después de una visita al sitio</strong> — porque cada casa es diferente. Una vez que vemos su panel eléctrico, el lugar de montaje y cómo está cableada su casa, podemos cotizar el trabajo con precisión según el <strong>tiempo y la complejidad</strong> de la instalación.</p>
<p>Los factores que influyen en la cotización de instalación incluyen:</p>
<ul>
<li>Subpaneles de separación de circuitos para manejo específico de cargas</li>
<li>Tramos de cable extendidos sobre distancias largas</li>
<li>Requisitos especiales de montaje estructural</li>
<li>Configuraciones que quedan fuera de los parámetros residenciales estándar</li>
<li>Accesorios como el interruptor de transferencia automática (ATS) para generador o conexión de múltiples medidores</li>
<li>Conexión de paneles solares existentes</li>
</ul>
<p>El costo total de su instalación se detalla claramente en su propuesta después de la visita al sitio — total transparencia, sin sorpresas.</p>`,
          },
          {
            q: '¿Cuánto tiempo toma una instalación típica?',
            a: `<p>Una instalación estándar de Firefly normalmente toma <strong>1 o 2 días</strong>, dependiendo del alcance del proyecto. Esto incluye montar el inversor y la batería, conectar el sistema a su panel eléctrico y las pruebas finales y puesta en marcha.</p>
<p>Si los paneles solares son parte de su proyecto, o si está integrando un sistema solar existente, considere medio día o un día adicional. La integración del ATS del generador y otras configuraciones complejas también pueden agregar tiempo. Le daremos un estimado claro de tiempos durante su evaluación.</p>`,
          },
        ],
      },
      {
        id: 'billing',
        label: 'CFE y facturación',
        icon: ICON.billing,
        items: [
          {
            q: '¿Cómo reduce el sistema Firefly mi recibo de CFE?',
            a: `<p>La tarifa residencial de CFE (Tarifa 01) tiene una estructura de precios escalonada — mientras más consume, más paga por kWh. El primer bloque pequeño de consumo está subsidiado a tarifas bajas, pero el consumo por encima de eso salta al bloque de <em>excedente</em>, que puede ser <strong>3 o 4 veces más caro</strong>.</p>
<p>El sistema Firefly reduce los kWh que le compra a CFE al:</p>
<ul>
<li>Almacenar energía en la batería y usarla para alimentar su casa en vez de la red</li>
<li><strong>Con paneles solares:</strong> energizar su casa directamente con los paneles durante el día y guardar el excedente en la batería para usarlo de noche</li>
<li>Tomar energía de CFE solo cuando la batería está baja y ninguna otra fuente (solar o generador) está disponible</li>
</ul>
<p><strong>Firefly con paneles solares ofrece la mayor reducción del recibo.</strong> Además de alimentar su casa y cargar la batería, la generación excedente del día se entrega de vuelta a la red bajo el programa de medición neta de México (<em>medición neta</em>), generando créditos en kWh que compensan lo que consume de noche. En efecto, el sol que capta de día paga la energía que usa de noche.</p>
<p>El resultado: su consumo medido por CFE cae considerablemente, regresándolo a los bloques más económicos — donde los ahorros se acumulan en cada período de facturación.</p>`,
          },
          {
            q: '¿Funciona el sistema con medición neta?',
            a: `<p>Sí — si su sistema incluye paneles solares, el programa de medición neta de México permite exportar la energía solar excedente a la red de CFE a cambio de créditos en kWh, que pueden compensar consumo futuro.</p>
<p>Con el sistema híbrido Firefly, la batería almacena primero la energía solar excedente — reduciendo lo que toma de la red por la noche. Cualquier generación que exceda tanto su consumo inmediato como la capacidad de la batería puede entonces exportarse para créditos. Esto maximiza el valor de cada kWh que producen sus paneles.</p>`,
          },
        ],
      },
      {
        id: 'warranty',
        label: 'Garantía y soporte',
        icon: ICON.warranty,
        items: [
          {
            q: '¿Qué garantía ofrece Firefly sobre el equipo?',
            a: `<div class="ff-faq__tablewrap"><table>
<thead><tr><th>Equipo</th><th>Garantía</th><th>Cobertura</th></tr></thead>
<tbody>
<tr><td>Inversor</td><td>8 años</td><td>Partes, mano de obra y soporte posventa</td></tr>
<tr><td>Sistema de batería</td><td>8 años</td><td>Partes, mano de obra y soporte posventa</td></tr>
<tr><td>Paneles solares — materiales</td><td>Típicamente 25 años</td><td>Defectos de producto y de fabricación</td></tr>
<tr><td>Paneles solares — potencia de salida</td><td>Típicamente 30 años</td><td>Garantía de retención de potencia de salida a largo plazo</td></tr>
</tbody>
</table></div>
<p>Los términos de garantía de los paneles solares varían según el fabricante. Su propuesta detallará las cifras exactas de garantía para los paneles especificados en su sistema.</p>`,
          },
        ],
      },
    ],
  },
};

/** FAQPage structured data (rich-result eligible) built from the same source. */
export function faqJsonLd(locale: Locale) {
  const strip = (s: string) =>
    s.replace(/<[^>]+>/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData[locale].categories.flatMap((c) =>
      c.items.map((it) => ({
        '@type': 'Question',
        name: it.q,
        acceptedAnswer: { '@type': 'Answer', text: strip(it.a) },
      })),
    ),
  };
}
