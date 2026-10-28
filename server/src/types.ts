// ============================================================================
// types.ts — Shared type definitions for Circuit Collab
// These types are used by both the server (room management, solver) and
// define the wire protocol for Socket.io events.
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

/** Properties specific to each component (value, unit, state) */
export interface ComponentProperties {
  value: number;        // e.g., 1000 for 1kΩ resistor
  unit: string;         // e.g., 'Ω', 'F', 'H', 'V'
  label?: string;       // user-assigned label like "R1"
  rotation?: number;    // 0, 90, 180, 270 degrees
  isOn?: boolean;       // for switches and LEDs
}

/** A circuit node on the canvas (represents a component) */
export interface CircuitNode {
  id: string;
  type: ComponentType;
  position: Position;
  data: ComponentProperties;
}

/** A wire connecting two components (React Flow edge) */
export interface CircuitEdge {
  id: string;
  source: string;       // source node ID
  target: string;       // target node ID
  sourceHandle: string; // handle ID on source (e.g., 'left', 'right')
  targetHandle: string; // handle ID on target
}

/** A user connected to a room */
export interface User {
  id: string;           // socket ID
  username: string;
  color: string;        // hex color for cursor/avatar
  cursor?: Position;    // current cursor position on canvas
}

/** Full state of a collaboration room */
export interface Room {
  id: string;
  nodes: CircuitNode[];
  edges: CircuitEdge[];
  users: User[];
  createdAt: number;
  simulationResults?: SimulationResults;
}

/** Results from DC circuit analysis */
export interface SimulationResults {
  nodeVoltages: Record<string, number>;    // nodeId → voltage (V)
  branchCurrents: Record<string, number>;  // edgeId → current (A)
  componentPower: Record<string, number>;  // nodeId → power (W)
  ledStates: Record<string, boolean>;      // nodeId → on/off
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// Socket.io Event Types
// ============================================================================

/** Events sent from client → server */
export interface ClientToServerEvents {
  'join-room': (data: { roomId: string; username: string }) => void;
  'leave-room': (data: { roomId: string }) => void;
  'circuit-update': (data: {
    roomId: string;
    nodes: CircuitNode[];
    edges: CircuitEdge[];
  }) => void;
  'cursor-move': (data: {
    roomId: string;
    cursor: Position;
  }) => void;
  'run-simulation': (data: { roomId: string }) => void;
  'chat-message': (data: {
    roomId: string;
    message: string;
  }) => void;
}

/** Events sent from server → client */
export interface ServerToClientEvents {
  'room-joined': (data: {
    room: Room;
    userId: string;
  }) => void;
  'room-error': (data: { message: string }) => void;
  'user-joined': (data: { user: User }) => void;
  'user-left': (data: { userId: string }) => void;
  'circuit-updated': (data: {
    nodes: CircuitNode[];
    edges: CircuitEdge[];
    userId: string;
  }) => void;
  'cursor-updated': (data: {
    userId: string;
    cursor: Position;
  }) => void;
  'simulation-results': (data: SimulationResults) => void;
  'chat-message': (data: {
    userId: string;
    username: string;
    message: string;
    timestamp: number;
  }) => void;
}
