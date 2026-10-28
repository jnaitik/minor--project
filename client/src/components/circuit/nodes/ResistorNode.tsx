// ============================================================================
// ResistorNode.tsx — Custom React Flow node for a Resistor component
// Renders a schematic-style zigzag resistor symbol with orientation-aware labels
// ============================================================================

import React, { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { useCircuitStore } from '../../../store/circuitStore';
import NodeLabel from './NodeLabel';
import TerminalHandle from './TerminalHandle';

function getHandlePositions(rotation: number = 0) {
  switch (((rotation % 360) + 360) % 360) {
    case 90: return { left: Position.Top, right: Position.Bottom };
    case 180: return { left: Position.Right, right: Position.Left };
    case 270: return { left: Position.Bottom, right: Position.Top };
    default: return { left: Position.Left, right: Position.Right };
  }
}

const ResistorNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const d = data as Record<string, unknown>;
  const rotation = (d.rotation as number) || 0;
  const handles = getHandlePositions(rotation);
  const simulationResults = useCircuitStore(s => s.simulationResults);
  const current = simulationResults?.branchCurrents[id];

  const formattedResistance = formatResistance((d.value as number) || 1000);
  const label = (d.label as string) || 'R';

  return (
    <div
      className={`relative group transition-all duration-200 select-none ${
        selected ? 'scale-105' : ''
      }`}
    >
      {/* Smart, non-obscuring label */}
      <NodeLabel
        label={label}
        valueText={formattedResistance}
        rotation={rotation}
      />

      {/* Connection handles that track rotation with junction indicators */}
      <TerminalHandle
        nodeId={id}
        handleId="left"
        type="source"
        position={handles.left}
        title="Terminal 1"
      />
      <TerminalHandle
        nodeId={id}
        handleId="right"
        type="target"
        position={handles.right}
        title="Terminal 2"
      />

      {/* Component body */}
      <div
        className={`flex flex-col items-center px-2 py-1.5 rounded-lg transition-all duration-200 ${
          selected
            ? 'ring-2 ring-electric-blue bg-dark-800/90 shadow-lg shadow-electric-blue/20'
            : 'hover:ring-1 hover:ring-dark-500 bg-dark-800/50'
        }`}
      >
        {/* SVG Resistor Symbol with rotation */}
        <div
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease',
          }}
          className="flex items-center justify-center p-1"
        >
          <svg width="64" height="24" viewBox="0 0 64 24" className="drop-shadow-sm">
            {/* Wire leads */}
            <line x1="0" y1="12" x2="10" y2="12" stroke="#06b6d4" strokeWidth="2" />
            <line x1="54" y1="12" x2="64" y2="12" stroke="#06b6d4" strokeWidth="2" />
            {/* Zigzag body */}
            <polyline
              points="10,12 14,4 22,20 30,4 38,20 46,4 50,12 54,12"
              fill="none"
              stroke={selected ? '#3b82f6' : '#e2e8f0'}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Simulation results overlay */}
        {current !== undefined && (
          <div className="mt-1 text-[9px] font-mono text-electric-green whitespace-nowrap bg-dark-950/95 border border-electric-green/40 px-1.5 py-0.5 rounded shadow-sm">
            {formatCurrent(current)}
          </div>
        )}
      </div>
    </div>
  );
};

/** Format resistance with SI prefix */
function formatResistance(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}MΩ`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}kΩ`;
  return `${value}Ω`;
}

/** Format current with SI prefix */
function formatCurrent(value: number): string {
  const abs = Math.abs(value);
  if (abs < 1e-6) return `${(value * 1e9).toFixed(1)}nA`;
  if (abs < 1e-3) return `${(value * 1e6).toFixed(1)}µA`;
  if (abs < 1) return `${(value * 1e3).toFixed(1)}mA`;
  return `${value.toFixed(2)}A`;
}

export default memo(ResistorNode);
