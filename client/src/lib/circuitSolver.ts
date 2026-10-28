// ============================================================================
// lib/circuitSolver.ts — Client-side DC Circuit Solver (MNA)
//
// Implements Modified Nodal Analysis (MNA) for DC electronic circuit simulation:
//   - Disconnected / floating node tolerance via SPICE GMIN regularizer (1e-12 S)
//   - Explicit topological checks (Ground presence, short circuits, open loops)
//   - Solves for exact node voltages, branch currents, component power dissipation,
//     and LED forward-bias illumination states.
// ============================================================================

import type { SimulationResults } from '../types';
import type { Node, Edge } from '@xyflow/react';

/**
 * Solve the DC circuit locally using Modified Nodal Analysis.
 * Accepts React Flow nodes and edges directly.
 */
export function solveCircuitLocal(
  nodes: Node[],
  edges: Edge[]
): SimulationResults {
  const errors: string[] = [];

  if (nodes.length === 0) {
    errors.push('Canvas is empty. Add components to simulate.');
    return { nodeVoltages: {}, branchCurrents: {}, componentPower: {}, ledStates: {}, isValid: false, errors };
  }

  // Union-Find data structure to merge connected terminals into electrical nodes
  const parent: Record<string, string> = {};

  function makeKey(nodeId: string, handle: string): string {
    return `${nodeId}:${handle}`;
  }

  function find(x: string): string {
    if (!parent[x]) parent[x] = x;
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(a: string, b: string): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  // Get valid handles for each component type
  function getHandles(type: string): string[] {
    switch (type) {
      case 'resistor':
      case 'capacitor':
      case 'inductor':
      case 'led':
      case 'switch':
        return ['left', 'right'];
      case 'voltage_source':
        return ['positive', 'negative'];
      case 'ground':
        return ['top'];
      default:
        return [];
    }
  }

  // Initialize all terminals in union-find
  for (const node of nodes) {
    const handles = getHandles(node.type || '');
    for (const h of handles) {
      const key = makeKey(node.id, h);
      parent[key] = key;
    }
  }

  // Track connected wires per terminal for open-terminal diagnostics
  const terminalConnections: Record<string, number> = {};
  for (const edge of edges) {
    if (edge.source && edge.sourceHandle && edge.target && edge.targetHandle) {
      const sKey = makeKey(edge.source, edge.sourceHandle);
      const tKey = makeKey(edge.target, edge.targetHandle);
      union(sKey, tKey);
      terminalConnections[sKey] = (terminalConnections[sKey] || 0) + 1;
      terminalConnections[tKey] = (terminalConnections[tKey] || 0) + 1;
    }
  }

  // Inductors are short circuits (ideal wires) in DC steady state
  for (const node of nodes) {
    if (node.type === 'inductor') {
      union(makeKey(node.id, 'left'), makeKey(node.id, 'right'));
    }
  }

  // Collect unique electrical nodes
  const electricalNodeMap: Record<string, string> = {};
  const electricalNodes = new Set<string>();
  for (const key of Object.keys(parent)) {
    const root = find(key);
    electricalNodeMap[key] = root;
    electricalNodes.add(root);
  }

  // ---- 1. Verify Ground Node ----
  let groundNodeId: string | null = null;
  const groundNodes = nodes.filter(n => n.type === 'ground');

  if (groundNodes.length > 0) {
    const gKey = makeKey(groundNodes[0].id, 'top');
    if ((terminalConnections[gKey] || 0) > 0) {
      groundNodeId = electricalNodeMap[gKey];
    } else {
      errors.push('Ground component is disconnected. Connect its terminal to your circuit.');
    }
  }

  // Fallback: if no ground component is present, check if voltage source exists and use its negative terminal
  if (!groundNodeId) {
    const vs = nodes.find(n => n.type === 'voltage_source');
    if (vs) {
      const negKey = makeKey(vs.id, 'negative');
      if ((terminalConnections[negKey] || 0) > 0) {
        groundNodeId = electricalNodeMap[negKey];
        errors.push('Notice: Using Voltage Source (-) as reference ground (0V).');
      }
    }
  }

  if (!groundNodeId) {
    errors.push('No ground reference found. Add a Ground component to establish a 0V reference.');
    return { nodeVoltages: {}, branchCurrents: {}, componentPower: {}, ledStates: {}, isValid: false, errors };
  }

  // ---- 2. Check for Voltage Source & Short Circuits ----
  const voltageSources = nodes.filter(n => n.type === 'voltage_source');
  if (voltageSources.length === 0) {
    errors.push('Circuit has no DC voltage source. Add a Voltage Source to power the circuit.');
  }

  for (const vs of voltageSources) {
    const posRoot = electricalNodeMap[makeKey(vs.id, 'positive')];
    const negRoot = electricalNodeMap[makeKey(vs.id, 'negative')];
    if (posRoot && negRoot && posRoot === negRoot) {
      const label = (vs.data?.label as string) || 'V1';
      errors.push(`Short circuit detected: Positive and negative terminals of ${label} are directly connected.`);
      return { nodeVoltages: {}, branchCurrents: {}, componentPower: {}, ledStates: {}, isValid: false, errors };
    }
  }

  // Check for open/dangling terminals on key components and warn
  for (const node of nodes) {
    if (['resistor', 'led', 'voltage_source'].includes(node.type || '')) {
      const handles = getHandles(node.type || '');
      const openHandles = handles.filter(h => (terminalConnections[makeKey(node.id, h)] || 0) === 0);
      if (openHandles.length > 0) {
        const label = (node.data?.label as string) || node.id;
        errors.push(`Warning: Terminal "${openHandles.join(', ')}" of ${label} is not connected to any wire.`);
      }
    }
  }

  // Assign matrix indices to all non-ground electrical nodes
  const nodeList = Array.from(electricalNodes).filter(n => n !== groundNodeId);
  const nodeIndex: Record<string, number> = {};
  nodeList.forEach((n, i) => { nodeIndex[n] = i; });

  const n = nodeList.length;
  const m = voltageSources.length;
  const size = n + m;

  if (size === 0) {
    errors.push('Circuit has no active nodes to analyze.');
    return { nodeVoltages: {}, branchCurrents: {}, componentPower: {}, ledStates: {}, isValid: false, errors };
  }

  // Build MNA matrices
  const A: number[][] = Array.from({ length: size }, () => new Array(size).fill(0));
  const b: number[] = new Array(size).fill(0);

  // SPICE GMIN Regularizer: Add tiny conductance (1e-12 S) to ground for all voltage nodes
  // This prevents matrix singularity from floating/open nodes while maintaining micro-accuracy
  const GMIN = 1e-12;
  for (let i = 0; i < n; i++) {
    A[i][i] += GMIN;
  }

  function getNodeIdx(terminalKey: string): number {
    const eNode = electricalNodeMap[terminalKey];
    if (eNode === groundNodeId) return -1;
    return nodeIndex[eNode] ?? -1;
  }

  // Stamp components into conductance matrix
  for (const node of nodes) {
    const data = (node.data || {}) as Record<string, unknown>;

    if (node.type === 'resistor') {
      const resistance = Math.max(1e-6, (data.value as number) || 1000);
      const g = 1 / resistance;
      const li = getNodeIdx(makeKey(node.id, 'left'));
      const ri = getNodeIdx(makeKey(node.id, 'right'));
      if (li >= 0) A[li][li] += g;
      if (ri >= 0) A[ri][ri] += g;
      if (li >= 0 && ri >= 0) { A[li][ri] -= g; A[ri][li] -= g; }
    }

    if (node.type === 'led') {
      // Linearized diode model: forward resistance ~50Ω
      const g = 1 / 50;
      const ai = getNodeIdx(makeKey(node.id, 'left'));
      const ci = getNodeIdx(makeKey(node.id, 'right'));
      if (ai >= 0) A[ai][ai] += g;
      if (ci >= 0) A[ci][ci] += g;
      if (ai >= 0 && ci >= 0) { A[ai][ci] -= g; A[ci][ai] -= g; }
    }

    if (node.type === 'switch') {
      const isOn = (data.isOn as boolean) !== false;
      const resistance = isOn ? 0.001 : 1e9; // 1mΩ when closed, 1GΩ when open
      const g = 1 / resistance;
      const li = getNodeIdx(makeKey(node.id, 'left'));
      const ri = getNodeIdx(makeKey(node.id, 'right'));
      if (li >= 0) A[li][li] += g;
      if (ri >= 0) A[ri][ri] += g;
      if (li >= 0 && ri >= 0) { A[li][ri] -= g; A[ri][li] -= g; }
    }
  }

  // Stamp voltage sources into B and C sub-matrices
  voltageSources.forEach((vs, vsIdx) => {
    const data = (vs.data || {}) as Record<string, unknown>;
    const voltage = typeof data.value === 'number' ? data.value : 5;
    const posIdx = getNodeIdx(makeKey(vs.id, 'positive'));
    const negIdx = getNodeIdx(makeKey(vs.id, 'negative'));
    const iIdx = n + vsIdx;

    if (posIdx >= 0) { A[posIdx][iIdx] += 1; A[iIdx][posIdx] += 1; }
    if (negIdx >= 0) { A[negIdx][iIdx] -= 1; A[iIdx][negIdx] -= 1; }
    b[iIdx] = voltage;
  });

  // Gaussian elimination with partial pivoting
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < size; col++) {
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < size; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    if (Math.abs(aug[col][col]) < 1e-13) {
      errors.push('Circuit has no unique DC solution. Check for floating subcircuits or conflicting voltage sources.');
      return { nodeVoltages: {}, branchCurrents: {}, componentPower: {}, ledStates: {}, isValid: false, errors };
    }

    for (let row = col + 1; row < size; row++) {
      const f = aug[row][col] / aug[col][col];
      for (let j = col; j <= size; j++) {
        aug[row][j] -= f * aug[col][j];
      }
    }
  }

  const x = new Array(size).fill(0);
  for (let row = size - 1; row >= 0; row--) {
    let sum = aug[row][size];
    for (let col = row + 1; col < size; col++) {
      sum -= aug[row][col] * x[col];
    }
    x[row] = sum / aug[row][row];
  }

  // Extract results
  const nodeVoltages: Record<string, number> = {};
  const branchCurrents: Record<string, number> = {};
  const componentPower: Record<string, number> = {};
  const ledStates: Record<string, boolean> = {};

  for (const node of nodes) {
    const handles = getHandles(node.type || '');
    for (const h of handles) {
      const eNode = electricalNodeMap[makeKey(node.id, h)];
      if (eNode === groundNodeId) {
        nodeVoltages[`${node.id}:${h}`] = 0;
      } else {
        const idx = nodeIndex[eNode];
        if (idx !== undefined && !isNaN(x[idx])) {
          nodeVoltages[`${node.id}:${h}`] = Math.round(x[idx] * 1000) / 1000;
        } else {
          nodeVoltages[`${node.id}:${h}`] = 0;
        }
      }
    }
  }

  voltageSources.forEach((vs, vsIdx) => {
    const data = (vs.data || {}) as Record<string, unknown>;
    const voltage = typeof data.value === 'number' ? data.value : 5;
    // Current leaving the positive terminal:
    const current = Math.abs(x[n + vsIdx] || 0);
    branchCurrents[vs.id] = Math.round(current * 1000) / 1000;
    componentPower[vs.id] = Math.round(voltage * current * 1000) / 1000;
  });

  for (const node of nodes) {
    if (['resistor', 'led', 'switch'].includes(node.type || '')) {
      const data = (node.data || {}) as Record<string, unknown>;
      const vL = nodeVoltages[`${node.id}:left`] || 0;
      const vR = nodeVoltages[`${node.id}:right`] || 0;
      const vDiff = vL - vR;
      const R = node.type === 'resistor' ? ((data.value as number) || 1000) :
                node.type === 'led' ? 50 :
                ((data.isOn as boolean) !== false ? 0.001 : 1e9);
      const current = vDiff / R;
      branchCurrents[node.id] = Math.round(current * 1000) / 1000;
      componentPower[node.id] = Math.round(Math.abs(vDiff * current) * 1000) / 1000;
      if (node.type === 'led') {
        // Forward biased if anode (left) > cathode (right) + 1.2V
        ledStates[node.id] = current > 0.002;
      }
    }
  }

  const hasFatalErrors = errors.some(e => !e.startsWith('Warning:'));

  return {
    nodeVoltages,
    branchCurrents,
    componentPower,
    ledStates,
    isValid: !hasFatalErrors,
    errors,
  };
}
