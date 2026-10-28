// ============================================================================
// circuitSolver.ts — DC Circuit Analysis using Modified Nodal Analysis (MNA)
//
// This solver builds a system of linear equations from the circuit's topology
// and component values, then solves for node voltages and branch currents.
//
// MNA Approach:
//   - Each unique electrical node gets a voltage variable
//   - Each voltage source adds a current variable
//   - Resistors contribute conductance stamps to the G matrix
//   - Voltage sources contribute to the B, C, and E sub-matrices
//   - Ground node is the reference (voltage = 0)
//   - GMIN regularizer (1e-12 S) ensures non-singular matrices with open nodes
//
// For DC steady-state:
//   - Capacitors = open circuit (infinite impedance)
//   - Inductors = short circuit (zero impedance)
// ============================================================================

import type { CircuitNode, CircuitEdge, SimulationResults } from './types.js';

/**
 * Solve the DC circuit using Modified Nodal Analysis.
 * 
 * @param nodes - Circuit components (resistors, sources, etc.)
 * @param edges - Wires connecting component terminals
 * @returns SimulationResults with voltages, currents, and component states
 */
export function solveCircuit(
  nodes: CircuitNode[],
  edges: CircuitEdge[]
): SimulationResults {
  const errors: string[] = [];

  if (nodes.length === 0) {
    errors.push('Circuit has no components to analyze.');
    return { nodeVoltages: {}, branchCurrents: {}, componentPower: {}, ledStates: {}, isValid: false, errors };
  }

  // ---- Step 1: Build the electrical node graph ----
  // Union-Find data structure to merge connected terminals
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

  // Initialize all component terminals
  for (const node of nodes) {
    const handles = getHandlesForType(node.type);
    for (const h of handles) {
      const key = makeKey(node.id, h);
      parent[key] = key;
    }
  }

  // Merge terminals connected by wires and track terminal connectivity
  const terminalConnections: Record<string, number> = {};
  for (const edge of edges) {
    const sourceKey = makeKey(edge.source, edge.sourceHandle);
    const targetKey = makeKey(edge.target, edge.targetHandle);
    union(sourceKey, targetKey);
    terminalConnections[sourceKey] = (terminalConnections[sourceKey] || 0) + 1;
    terminalConnections[targetKey] = (terminalConnections[targetKey] || 0) + 1;
  }

  // Merge inductor terminals (short circuit in DC)
  for (const node of nodes) {
    if (node.type === 'inductor') {
      const leftKey = makeKey(node.id, 'left');
      const rightKey = makeKey(node.id, 'right');
      union(leftKey, rightKey);
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

  // ---- Step 2: Identify ground node ----
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

  // Fallback to negative terminal of first voltage source if no ground component
  if (!groundNodeId) {
    for (const node of nodes) {
      if (node.type === 'voltage_source') {
        const key = makeKey(node.id, 'negative');
        if ((terminalConnections[key] || 0) > 0) {
          groundNodeId = electricalNodeMap[key] || null;
          errors.push('Notice: Using Voltage Source (-) as reference ground (0V).');
          break;
        }
      }
    }
  }

  if (!groundNodeId) {
    errors.push('No ground node found. Add a Ground component to establish reference voltage (0V).');
    return {
      nodeVoltages: {},
      branchCurrents: {},
      componentPower: {},
      ledStates: {},
      isValid: false,
      errors,
    };
  }

  // ---- Step 3: Check for Short Circuits & Source Presence ----
  const voltageSources = nodes.filter(node => node.type === 'voltage_source');
  if (voltageSources.length === 0) {
    errors.push('Circuit has no DC voltage source. Add a Voltage Source to simulate active current.');
  }

  for (const vs of voltageSources) {
    const posRoot = electricalNodeMap[makeKey(vs.id, 'positive')];
    const negRoot = electricalNodeMap[makeKey(vs.id, 'negative')];
    if (posRoot && negRoot && posRoot === negRoot) {
      const label = vs.data?.label || 'V1';
      errors.push(`Short circuit detected: Positive and negative terminals of ${label} are directly connected.`);
      return { nodeVoltages: {}, branchCurrents: {}, componentPower: {}, ledStates: {}, isValid: false, errors };
    }
  }

  // Check for open/dangling terminals on key components and warn
  for (const node of nodes) {
    if (['resistor', 'led', 'voltage_source'].includes(node.type || '')) {
      const handles = getHandlesForType(node.type);
      const openHandles = handles.filter(h => (terminalConnections[makeKey(node.id, h)] || 0) === 0);
      if (openHandles.length > 0) {
        const label = node.data?.label || node.id;
        errors.push(`Warning: Terminal "${openHandles.join(', ')}" of ${label} is not connected to any wire.`);
      }
    }
  }

  // Assign matrix indices
  const nodeList = Array.from(electricalNodes).filter(n => n !== groundNodeId);
  const nodeIndex: Record<string, number> = {};
  nodeList.forEach((n, i) => { nodeIndex[n] = i; });

  const n = nodeList.length;
  const m = voltageSources.length;
  const size = n + m;

  if (size === 0) {
    errors.push('Circuit has no nodes to analyze.');
    return {
      nodeVoltages: {},
      branchCurrents: {},
      componentPower: {},
      ledStates: {},
      isValid: false,
      errors,
    };
  }

  // ---- Step 4: Build MNA matrices with GMIN regularizer ----
  const A: number[][] = Array.from({ length: size }, () =>
    new Array(size).fill(0)
  );
  const b: number[] = new Array(size).fill(0);

  // SPICE GMIN Regularizer: Add tiny conductance (1e-12 S) to ground for all voltage nodes
  const GMIN = 1e-12;
  for (let i = 0; i < n; i++) {
    A[i][i] += GMIN;
  }

  function getNodeIdx(terminalKey: string): number {
    const eNode = electricalNodeMap[terminalKey];
    if (eNode === groundNodeId) return -1;
    return nodeIndex[eNode] ?? -1;
  }

  // Stamp resistors into G matrix
  for (const node of nodes) {
    if (node.type === 'resistor') {
      const resistance = Math.max(1e-6, node.data.value || 1000);
      const conductance = 1 / resistance;

      const leftIdx = getNodeIdx(makeKey(node.id, 'left'));
      const rightIdx = getNodeIdx(makeKey(node.id, 'right'));

      if (leftIdx >= 0) A[leftIdx][leftIdx] += conductance;
      if (rightIdx >= 0) A[rightIdx][rightIdx] += conductance;
      if (leftIdx >= 0 && rightIdx >= 0) {
        A[leftIdx][rightIdx] -= conductance;
        A[rightIdx][leftIdx] -= conductance;
      }
    }

    if (node.type === 'led') {
      const resistance = 50;
      const conductance = 1 / resistance;

      const anodeIdx = getNodeIdx(makeKey(node.id, 'left'));
      const cathodeIdx = getNodeIdx(makeKey(node.id, 'right'));

      if (anodeIdx >= 0) A[anodeIdx][anodeIdx] += conductance;
      if (cathodeIdx >= 0) A[cathodeIdx][cathodeIdx] += conductance;
      if (anodeIdx >= 0 && cathodeIdx >= 0) {
        A[anodeIdx][cathodeIdx] -= conductance;
        A[cathodeIdx][anodeIdx] -= conductance;
      }
    }

    if (node.type === 'switch') {
      const isOn = node.data.isOn !== false;
      const resistance = isOn ? 0.001 : 1e9;
      const conductance = 1 / resistance;

      const leftIdx = getNodeIdx(makeKey(node.id, 'left'));
      const rightIdx = getNodeIdx(makeKey(node.id, 'right'));

      if (leftIdx >= 0) A[leftIdx][leftIdx] += conductance;
      if (rightIdx >= 0) A[rightIdx][rightIdx] += conductance;
      if (leftIdx >= 0 && rightIdx >= 0) {
        A[leftIdx][rightIdx] -= conductance;
        A[rightIdx][leftIdx] -= conductance;
      }
    }
  }

  // Stamp voltage sources into B, C, and E
  voltageSources.forEach((vs, vsIdx) => {
    const voltage = typeof vs.data.value === 'number' ? vs.data.value : 5;
    const posIdx = getNodeIdx(makeKey(vs.id, 'positive'));
    const negIdx = getNodeIdx(makeKey(vs.id, 'negative'));
    const iIdx = n + vsIdx;

    if (posIdx >= 0) {
      A[posIdx][iIdx] += 1;
      A[iIdx][posIdx] += 1;
    }
    if (negIdx >= 0) {
      A[negIdx][iIdx] -= 1;
      A[iIdx][negIdx] -= 1;
    }

    b[iIdx] = voltage;
  });

  // ---- Step 5: Solve Ax = b using Gaussian elimination with partial pivoting ----
  const x = gaussianElimination(A, b, size);

  if (!x) {
    errors.push('Circuit has no unique solution. Check for conflicting voltage sources or disconnected loops.');
    return {
      nodeVoltages: {},
      branchCurrents: {},
      componentPower: {},
      ledStates: {},
      isValid: false,
      errors,
    };
  }

  // ---- Step 6: Extract results ----
  const nodeVoltages: Record<string, number> = {};
  const branchCurrents: Record<string, number> = {};
  const componentPower: Record<string, number> = {};
  const ledStates: Record<string, boolean> = {};

  for (const node of nodes) {
    const handles = getHandlesForType(node.type);
    for (const h of handles) {
      const key = makeKey(node.id, h);
      const eNode = electricalNodeMap[key];
      if (eNode === groundNodeId) {
        nodeVoltages[`${node.id}:${h}`] = 0;
      } else {
        const idx = nodeIndex[eNode];
        if (idx !== undefined && x[idx] !== undefined && !isNaN(x[idx])) {
          nodeVoltages[`${node.id}:${h}`] = Math.round(x[idx] * 1000) / 1000;
        } else {
          nodeVoltages[`${node.id}:${h}`] = 0;
        }
      }
    }
  }

  voltageSources.forEach((vs, vsIdx) => {
    const voltage = typeof vs.data.value === 'number' ? vs.data.value : 5;
    const current = Math.abs(x[n + vsIdx] || 0);
    branchCurrents[vs.id] = Math.round(current * 1000) / 1000;
    componentPower[vs.id] = Math.round(voltage * current * 1000) / 1000;
  });

  for (const node of nodes) {
    if (node.type === 'resistor' || node.type === 'led' || node.type === 'switch') {
      const leftKey = `${node.id}:left`;
      const rightKey = `${node.id}:right`;
      const vLeft = nodeVoltages[leftKey] || 0;
      const vRight = nodeVoltages[rightKey] || 0;
      const vDifference = vLeft - vRight;
      let resistance: number;
      if (node.type === 'resistor') {
        resistance = Math.max(1e-6, node.data.value || 1000);
      } else if (node.type === 'led') {
        resistance = 50;
      } else {
        resistance = node.data.isOn !== false ? 0.001 : 1e9;
      }

      const current = vDifference / resistance;
      branchCurrents[node.id] = Math.round(current * 1000) / 1000;
      componentPower[node.id] = Math.round(Math.abs(vDifference * current) * 1000) / 1000;

      if (node.type === 'led') {
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

/**
 * Gaussian elimination with partial pivoting to solve Ax = b.
 * Returns the solution vector x, or null if the system is singular.
 */
function gaussianElimination(
  A: number[][],
  b: number[],
  n: number
): number[] | null {
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }

    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    if (Math.abs(aug[col][col]) < 1e-13) {
      return null;
    }

    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = aug[row][n];
    for (let col = row + 1; col < n; col++) {
      sum -= aug[row][col] * x[col];
    }
    x[row] = sum / aug[row][row];
  }

  return x;
}

/**
 * Returns the handle IDs for a given component type.
 */
function getHandlesForType(type: string): string[] {
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
