/**
 * FlowDiagram scenario logic — the "living scene" energy-flow controller.
 *
 * CRM REUSE CONTRACT
 * ------------------
 * This module is intentionally framework-free: NO Astro, NO site imports, no
 * bundler-specific globals. It operates purely on a passed-in SVG/HTML root via
 * the `data-node` / `data-edge` attribute contract below. The firefly-crm
 * proposal (`web/p.html`) is meant to reuse `setScenario` + these data-attribute
 * keys to drive the same diagram. Keep it dependency-free and DOM-only so it can
 * be dropped into any page (Astro island, plain <script>, or the CRM proposal).
 *
 * Contract:
 *   - Nodes:  elements carry `data-node="solar|inverter|home|battery|grid"`.
 *   - Edges:  elements carry `data-edge="<from>-<to>"` (see EDGES below).
 *   - State classes applied by this module:
 *       .is-active  — node/edge carrying or receiving live energy
 *       .is-dim     — node present but idle/de-emphasized (e.g. grid in an outage)
 *       .is-cut     — an edge whose connection is severed (grid during outage)
 *   - This module ONLY toggles those three classes. All visual styling lives in CSS.
 */

export type FlowScenario = 'sun' | 'night' | 'outage';

/** Node keys — the five fixed nodes of the topology. */
export const NODES = {
  solar: 'solar',
  inverter: 'inverter',
  home: 'home',
  battery: 'battery',
  grid: 'grid',
} as const;

/** Edge keys — `<from>-<to>` matching the rendered `data-edge` attributes. */
export const EDGES = {
  solarInverter: 'solar-inverter',
  inverterHome: 'inverter-home',
  inverterBattery: 'inverter-battery',
  gridInverter: 'grid-inverter',
} as const;

export type NodeKey = (typeof NODES)[keyof typeof NODES];
export type EdgeKey = (typeof EDGES)[keyof typeof EDGES];

const STATE_CLASSES = ['is-active', 'is-dim', 'is-cut'] as const;

interface ScenarioSpec {
  /** Nodes that should be lit. */
  activeNodes: NodeKey[];
  /** Nodes that should be dimmed (idle / de-emphasized). */
  dimNodes: NodeKey[];
  /** Edges that should be lit (energy flowing). */
  activeEdges: EdgeKey[];
  /** Edges whose connection is severed. */
  cutEdges: EdgeKey[];
}

const N = NODES;
const E = EDGES;

const SCENARIOS: Record<FlowScenario, ScenarioSpec> = {
  // Sun: solar powers the home and charges the battery; grid stays connected
  // with a light draw (active, NOT dim).
  sun: {
    activeNodes: [N.solar, N.inverter, N.home, N.battery, N.grid],
    dimNodes: [],
    activeEdges: [E.solarInverter, E.inverterHome, E.inverterBattery, E.gridInverter],
    cutEdges: [],
  },
  // Night: solar idle; battery discharges and the grid supports; home powered.
  night: {
    activeNodes: [N.inverter, N.home, N.battery, N.grid],
    dimNodes: [N.solar],
    activeEdges: [E.inverterHome, E.inverterBattery, E.gridInverter],
    cutEdges: [],
  },
  // Outage (the hero moment): grid dims and its edge is cut; solar + battery +
  // inverter keep the home lit.
  outage: {
    activeNodes: [N.solar, N.inverter, N.home, N.battery],
    dimNodes: [N.grid],
    activeEdges: [E.solarInverter, E.inverterHome, E.inverterBattery],
    cutEdges: [E.gridInverter],
  },
};

/** Strip all scenario state classes from every node and edge under `root`. */
function clearAll(root: ParentNode): void {
  root.querySelectorAll('[data-node],[data-edge]').forEach((el) => {
    el.classList.remove(...STATE_CLASSES);
  });
}

function applyTo(root: ParentNode, attr: 'data-node' | 'data-edge', key: string, cls: string): void {
  const el = root.querySelector(`[${attr}="${key}"]`);
  if (el) el.classList.add(cls);
}

/**
 * Apply a scenario to the diagram rooted at `svgRoot`. Clears all prior state
 * first, then sets the per-scenario active/dim/cut classes. Operates only on the
 * passed root — no hardcoded ids, no global lookups.
 */
export function setScenario(svgRoot: SVGElement | HTMLElement, scenario: FlowScenario): void {
  const spec = SCENARIOS[scenario];
  if (!spec) return;
  clearAll(svgRoot);
  for (const k of spec.dimNodes) applyTo(svgRoot, 'data-node', k, 'is-dim');
  for (const k of spec.activeNodes) applyTo(svgRoot, 'data-node', k, 'is-active');
  for (const k of spec.cutEdges) applyTo(svgRoot, 'data-edge', k, 'is-cut');
  for (const k of spec.activeEdges) applyTo(svgRoot, 'data-edge', k, 'is-active');
}

/** Convenience alias — `setScenario` is the canonical contract name. */
export const applyScenario = setScenario;
