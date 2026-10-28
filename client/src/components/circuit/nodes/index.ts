// ============================================================================
// nodes/index.ts — Exports all custom node types for React Flow registration
// ============================================================================

import ResistorNode from './ResistorNode';
import CapacitorNode from './CapacitorNode';
import InductorNode from './InductorNode';
import VoltageSourceNode from './VoltageSourceNode';
import GroundNode from './GroundNode';
import LEDNode from './LEDNode';
import SwitchNode from './SwitchNode';

/**
 * Node type registry for React Flow.
 * Maps component type strings to their React components.
 * Must be defined outside of the component to avoid re-creation on each render.
 */
export const nodeTypes = {
  resistor: ResistorNode,
  capacitor: CapacitorNode,
  inductor: InductorNode,
  voltage_source: VoltageSourceNode,
  ground: GroundNode,
  led: LEDNode,
  switch: SwitchNode,
};

export {
  ResistorNode,
  CapacitorNode,
  InductorNode,
  VoltageSourceNode,
  GroundNode,
  LEDNode,
  SwitchNode,
};
