// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { setScenario, NODES, EDGES } from './FlowDiagram.client';

/**
 * Minimal SVG scene exercising the data-node / data-edge contract.
 * The real component renders far more, but the scenario logic only
 * cares about these attributes — so the test builds the smallest graph.
 */
function mountScene(): SVGElement {
  document.body.innerHTML = `
    <svg id="scene">
      <g data-node="solar"></g>
      <g data-node="inverter"></g>
      <g data-node="home"></g>
      <g data-node="battery"></g>
      <g data-node="grid"></g>
      <path data-edge="solar-inverter"></path>
      <path data-edge="inverter-home"></path>
      <path data-edge="inverter-battery"></path>
      <path data-edge="grid-inverter"></path>
    </svg>`;
  return document.getElementById('scene') as unknown as SVGElement;
}

const node = (root: ParentNode, key: string) =>
  root.querySelector(`[data-node="${key}"]`) as Element;
const edge = (root: ParentNode, key: string) =>
  root.querySelector(`[data-edge="${key}"]`) as Element;

describe('setScenario', () => {
  let root: SVGElement;
  beforeEach(() => {
    root = mountScene();
  });

  it('exposes the node and edge key constants', () => {
    expect(NODES).toMatchObject({
      solar: 'solar',
      inverter: 'inverter',
      home: 'home',
      battery: 'battery',
      grid: 'grid',
    });
    expect(EDGES.gridInverter).toBe('grid-inverter');
  });

  it('outage: grid dims, edge to grid is cut, home stays active', () => {
    setScenario(root, 'outage');
    expect(node(root, 'grid').classList.contains('is-dim')).toBe(true);
    expect(edge(root, 'grid-inverter').classList.contains('is-cut')).toBe(true);
    expect(node(root, 'home').classList.contains('is-active')).toBe(true);
    // solar + battery carry the home through the outage
    expect(node(root, 'solar').classList.contains('is-active')).toBe(true);
    expect(node(root, 'battery').classList.contains('is-active')).toBe(true);
    // grid is dimmed, never active during an outage
    expect(node(root, 'grid').classList.contains('is-active')).toBe(false);
  });

  it('sun: grid is active (light draw) and NOT dim, solar active', () => {
    setScenario(root, 'sun');
    expect(node(root, 'grid').classList.contains('is-active')).toBe(true);
    expect(node(root, 'grid').classList.contains('is-dim')).toBe(false);
    expect(node(root, 'solar').classList.contains('is-active')).toBe(true);
    expect(node(root, 'home').classList.contains('is-active')).toBe(true);
  });

  it('night: solar idle, grid supports, home stays active', () => {
    setScenario(root, 'night');
    expect(node(root, 'home').classList.contains('is-active')).toBe(true);
    expect(node(root, 'battery').classList.contains('is-active')).toBe(true);
    expect(node(root, 'solar').classList.contains('is-active')).toBe(false);
  });

  it('switching scenarios clears stale classes (no leftover is-dim after sun)', () => {
    setScenario(root, 'outage');
    expect(node(root, 'grid').classList.contains('is-dim')).toBe(true);
    expect(edge(root, 'grid-inverter').classList.contains('is-cut')).toBe(true);

    setScenario(root, 'sun');
    expect(node(root, 'grid').classList.contains('is-dim')).toBe(false);
    expect(edge(root, 'grid-inverter').classList.contains('is-cut')).toBe(false);
  });
});
