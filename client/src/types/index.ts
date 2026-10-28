// ============================================================================
// types/index.ts — Frontend type definitions
// Re-exports server types and adds frontend-specific types
// ============================================================================

/** Supported electronic component types */
export type ComponentType =
  | 'resistor'
  | 'capacitor'
  | 'inductor'
  | 'voltage_source'
  | 'ground'
  | 'led'
  | 'switch';

/** Position on the 2D canvas */
export interface Position {
  x: number;
  y: number;
}

/** Properties specific to each component */
export interface ComponentProperties {
  value: number;
  unit: string;
  label?: string;
  rotation?: number;
  isOn?: boolean;
}

/** A circuit component node */
export interface CircuitNode {
  id: string;
  type: ComponentType;
  position: Position;
  data: ComponentProperties;
}

/** A wire connecting two components */
export interface CircuitEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
}

/** A user in the room */
export interface User {
  id: string;
  username: string;
  color: string;
  cursor?: Position;
}

/** Room state from server */
export interface Room {
  id: string;
  nodes: CircuitNode[];
  edges: CircuitEdge[];
  users: User[];
  createdAt: number;
  simulationResults?: SimulationResults;
}

/** Simulation results */
export interface SimulationResults {
  nodeVoltages: Record<string, number>;
  branchCurrents: Record<string, number>;
  componentPower: Record<string, number>;
  ledStates: Record<string, boolean>;
  isValid: boolean;
  errors: string[];
}

/** Detected hand gesture types */
export type GestureType =
  | 'pinch'
  | 'drag'
  | 'pan'
  | 'point'
  | 'thumbs_up'
  | 'fist'
  | 'victory'
  | 'none';

/** Tool modes for the circuit editor */
export type ToolMode = 'select' | 'wire' | 'place' | 'delete';

/** Component info for the palette */
export interface ComponentInfo {
  type: ComponentType;
  label: string;
  icon: string;
  defaultValue: number;
  unit: string;
  description: string;
}

/** All available components with defaults */
export const COMPONENTS: ComponentInfo[] = [
  {
    type: 'resistor',
    label: 'Resistor',
    icon: 'R',
    defaultValue: 1000,
    unit: 'Ω',
    description: 'Opposes current flow',
  },
  {
    type: 'capacitor',
    label: 'Capacitor',
    icon: 'C',
    defaultValue: 0.000001,
    unit: 'F',
    description: 'Stores electric charge',
  },
  {
    type: 'inductor',
    label: 'Inductor',
    icon: 'L',
    defaultValue: 0.001,
    unit: 'H',
    description: 'Stores magnetic energy',
  },
  {
    type: 'voltage_source',
    label: 'DC Voltage',
    icon: 'V',
    defaultValue: 5,
    unit: 'V',
    description: 'Provides constant voltage',
  },
  {
    type: 'ground',
    label: 'Ground',
    icon: 'G',
    defaultValue: 0,
    unit: '',
    description: 'Reference voltage (0V)',
  },
  {
    type: 'led',
    label: 'LED',
    icon: 'D',
    defaultValue: 2,
    unit: 'V',
    description: 'Light-emitting diode',
  },
  {
    type: 'switch',
    label: 'Switch',
    icon: 'S',
    defaultValue: 0,
    unit: '',
    description: 'Opens/closes circuit',
  },
];
