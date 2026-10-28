// ============================================================================
// store/circuitStore.ts — Zustand store for circuit state
//
// Manages the React Flow nodes and edges, selected elements,
// simulation results, collision-free placement, and circuit-level operations.
// ============================================================================

import { create } from 'zustand';
import type { Node, Edge, OnNodesChange, OnEdgesChange, OnConnect, Connection } from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import { nanoid } from 'nanoid';
import type { ComponentType, SimulationResults, ToolMode } from '../types';
import { findNearestValidPosition, getComponentCenterOffset } from '../lib/collision';
import { useUIStore } from './uiStore';

export interface PlacementPreview {
  x: number;
  y: number;
  isValid: boolean;
  type: ComponentType;
  suggestedX?: number;
  suggestedY?: number;
}

interface CircuitState {
  // React Flow state
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // Grid and alignment
  gridSnap: boolean;
  gridSize: number;
  toggleGridSnap: () => void;

  // Simulation
  simulationResults: SimulationResults | null;
  isSimulating: boolean;

  // Tool mode
  toolMode: ToolMode;
  placingComponentType: ComponentType | null;
  placementPreview: PlacementPreview | null;

  // Auto-increment labels
  componentCounters: Record<string, number>;

  // React Flow instance for direct high-speed flow coordinate mapping
  reactFlowInstance: any | null;
  setReactFlowInstance: (instance: any | null) => void;
  setPlacementPreview: (preview: PlacementPreview | null) => void;

  // Actions
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (type: ComponentType, rawPosition: { x: number; y: number }, skipCollisionCheck?: boolean, centerOnCursor?: boolean) => Node;
  updateNodeData: (nodeId: string, data: Partial<Record<string, unknown>>) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  repositionNodeSafely: (nodeId: string, targetPos: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedEdge: (edgeId: string | null) => void;
  setCircuit: (nodes: Node[], edges: Edge[]) => void;
  setSimulationResults: (results: SimulationResults | null) => void;
  setIsSimulating: (simulating: boolean) => void;
  setToolMode: (mode: ToolMode) => void;
  setPlacingComponent: (type: ComponentType | null) => void;
  clearCircuit: () => void;
}

/** Default component values by type */
const DEFAULT_VALUES: Record<ComponentType, { value: number; unit: string }> = {
  resistor: { value: 1000, unit: 'Ω' },
  capacitor: { value: 0.000001, unit: 'F' },
  inductor: { value: 0.001, unit: 'H' },
  voltage_source: { value: 5, unit: 'V' },
  ground: { value: 0, unit: '' },
  led: { value: 2, unit: 'V' },
  switch: { value: 0, unit: '' },
};

/** Label prefix by type */
const LABEL_PREFIX: Record<ComponentType, string> = {
  resistor: 'R',
  capacitor: 'C',
  inductor: 'L',
  voltage_source: 'V',
  ground: 'GND',
  led: 'LED',
  switch: 'SW',
};

export const useCircuitStore = create<CircuitState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  gridSnap: true,
  gridSize: 16,
  simulationResults: null,
  isSimulating: false,
  toolMode: 'select',
  placingComponentType: null,
  placementPreview: null,
  componentCounters: {},
  reactFlowInstance: null,

  setReactFlowInstance: (instance) => set({ reactFlowInstance: instance }),
  setPlacementPreview: (preview) => set({ placementPreview: preview }),
  toggleGridSnap: () => set({ gridSnap: !get().gridSnap }),

  // Handle node position changes, selection, etc. from React Flow
  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  // Handle edge changes from React Flow
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  // Handle new connections (wires) between components
  onConnect: (connection: Connection) => {
    // Prevent connecting component to itself
    if (connection.source === connection.target) {
      useUIStore.getState().addNotification('Cannot connect a terminal to the same component', 'warning');
      return;
    }

    // Prevent duplicate wires between the same terminal pair
    const existing = get().edges;
    const isDuplicate = existing.some(e =>
      (e.source === connection.source && e.sourceHandle === connection.sourceHandle &&
       e.target === connection.target && e.targetHandle === connection.targetHandle) ||
      (e.source === connection.target && e.sourceHandle === connection.targetHandle &&
       e.target === connection.source && e.targetHandle === connection.sourceHandle)
    );
    if (isDuplicate) {
      useUIStore.getState().addNotification('Wire already exists between these terminals', 'warning');
      return;
    }

    const newEdge: Edge = {
      id: `wire-${nanoid(8)}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#06b6d4', strokeWidth: 2 },
    };

    set({ edges: addEdge(newEdge, get().edges) });
    useUIStore.getState().addNotification('Connected wire', 'success');
  },

  // Add a new component to the canvas with collision avoidance and cursor centering
  addNode: (
    type: ComponentType,
    rawPosition: { x: number; y: number },
    skipCollisionCheck: boolean = false,
    centerOnCursor: boolean = true
  ) => {
    const existingNodes = get().nodes;
    const gridSize = get().gridSnap ? get().gridSize : 1;

    // Center component relative to cursor coordinates
    const offset = centerOnCursor ? getComponentCenterOffset(type) : { x: 0, y: 0 };
    const centeredPos = {
      x: rawPosition.x - offset.x,
      y: rawPosition.y - offset.y,
    };

    // Resolve non-overlapping position
    let finalPos = {
      x: Math.round(centeredPos.x / gridSize) * gridSize,
      y: Math.round(centeredPos.y / gridSize) * gridSize,
    };

    if (!skipCollisionCheck) {
      const resolved = findNearestValidPosition(type, centeredPos, existingNodes, null, gridSize);
      finalPos = { x: resolved.x, y: resolved.y };
      if (resolved.wasAdjusted) {
        const conflictLabel = resolved.conflictingNode?.data?.label as string;
        useUIStore.getState().addNotification(
          conflictLabel
            ? `Shifted away from ${conflictLabel} to prevent overlap`
            : 'Adjusted position to prevent component overlap',
          'info'
        );
      }
    }

    const counters = { ...get().componentCounters };
    const prefix = LABEL_PREFIX[type];
    counters[type] = (counters[type] || 0) + 1;
    const label = `${prefix}${counters[type]}`;
    const defaults = DEFAULT_VALUES[type];

    const newNode: Node = {
      id: `${type}-${nanoid(8)}`,
      type,
      position: finalPos,
      data: {
        value: defaults.value,
        unit: defaults.unit,
        label,
        rotation: 0,
        isOn: type === 'switch' ? true : undefined,
      },
    };

    set({
      nodes: [...existingNodes, newNode],
      componentCounters: counters,
      selectedNodeId: newNode.id,
      placementPreview: null,
    });

    return newNode;
  },

  // Update a node's data (value, label, rotation, etc.)
  updateNodeData: (nodeId: string, data: Partial<Record<string, unknown>>) => {
    set({
      nodes: get().nodes.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    });
  },

  // Update a node's position directly
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => {
    set({
      nodes: get().nodes.map(node =>
        node.id === nodeId
          ? { ...node, position }
          : node
      ),
    });
  },

  // Safely reposition a node without overlapping other components, preserving all wires
  repositionNodeSafely: (nodeId: string, targetPos: { x: number; y: number }) => {
    const node = get().nodes.find(n => n.id === nodeId);
    if (!node) return;

    const gridSize = get().gridSnap ? get().gridSize : 8;
    const resolved = findNearestValidPosition(
      node.type || 'resistor',
      targetPos,
      get().nodes,
      nodeId,
      gridSize
    );

    get().updateNodePosition(nodeId, { x: resolved.x, y: resolved.y });
    if (resolved.wasAdjusted) {
      useUIStore.getState().addNotification('Repositioned to nearest open grid slot', 'info');
    }
  },

  // Remove a node and its connected edges
  removeNode: (nodeId: string) => {
    const nodeToRemove = get().nodes.find(n => n.id === nodeId);
    const label = (nodeToRemove?.data?.label as string) || nodeId;
    set({
      nodes: get().nodes.filter(n => n.id !== nodeId),
      edges: get().edges.filter(e => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
    });
    useUIStore.getState().addNotification(`Removed ${label}`, 'info');
  },

  // Remove an edge (wire)
  removeEdge: (edgeId: string) => {
    set({
      edges: get().edges.filter(e => e.id !== edgeId),
      selectedEdgeId: get().selectedEdgeId === edgeId ? null : get().selectedEdgeId,
    });
    useUIStore.getState().addNotification('Removed wire', 'info');
  },

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId, selectedEdgeId: null }),
  setSelectedEdge: (edgeId) => set({ selectedEdgeId: edgeId, selectedNodeId: null }),

  // Bulk update from server (collaboration sync)
  setCircuit: (nodes, edges) => set({ nodes, edges }),

  setSimulationResults: (results) => set({ simulationResults: results }),
  setIsSimulating: (simulating) => set({ isSimulating: simulating }),
  setToolMode: (mode) => set({ toolMode: mode }),
  setPlacingComponent: (type) => set({ placingComponentType: type, toolMode: type ? 'place' : 'select' }),

  clearCircuit: () => set({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedEdgeId: null,
    simulationResults: null,
    componentCounters: {},
  }),
}));
