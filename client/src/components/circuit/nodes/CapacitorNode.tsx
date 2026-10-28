// ============================================================================
// CapacitorNode.tsx — Custom React Flow node for a Capacitor
// ============================================================================

import React, { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
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

const CapacitorNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const d = data as Record<string, unknown>;
  const rotation = (d.rotation as number) || 0;
  const handles = getHandlePositions(rotation);

  const label = (d.label as string) || 'C';
  const formattedCap = formatCapacitance((d.value as number) || 0.000001);

  return (
    <div className={`relative group transition-all duration-200 select-none ${selected ? 'scale-105' : ''}`}>
      <NodeLabel
        label={label}
        valueText={formattedCap}
        rotation={rotation}
      />

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

      <div className={`flex flex-col items-center px-2 py-1.5 rounded-lg transition-all duration-200 ${
        selected ? 'ring-2 ring-electric-blue bg-dark-800/90 shadow-lg shadow-electric-blue/20' : 'hover:ring-1 hover:ring-dark-500 bg-dark-800/50'
      }`}>
        <div
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease',
          }}
          className="flex items-center justify-center p-1"
        >
          <svg width="64" height="28" viewBox="0 0 64 28">
            <line x1="0" y1="14" x2="26" y2="14" stroke="#06b6d4" strokeWidth="2" />
            <line x1="38" y1="14" x2="64" y2="14" stroke="#06b6d4" strokeWidth="2" />
            {/* Parallel plates */}
            <line x1="26" y1="4" x2="26" y2="24" stroke={selected ? '#3b82f6' : '#e2e8f0'} strokeWidth="3" />
            <line x1="38" y1="4" x2="38" y2="24" stroke={selected ? '#3b82f6' : '#e2e8f0'} strokeWidth="3" />
          </svg>
        </div>
      </div>
    </div>
  );
};

function formatCapacitance(value: number): string {
  if (value >= 1) return `${value}F`;
  if (value >= 1e-3) return `${(value * 1e3).toFixed(1)}mF`;
  if (value >= 1e-6) return `${(value * 1e6).toFixed(1)}µF`;
  if (value >= 1e-9) return `${(value * 1e9).toFixed(1)}nF`;
  return `${(value * 1e12).toFixed(1)}pF`;
}

export default memo(CapacitorNode);
