// ============================================================================
// InductorNode.tsx — Custom React Flow node for an Inductor
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

const InductorNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const d = data as Record<string, unknown>;
  const rotation = (d.rotation as number) || 0;
  const handles = getHandlePositions(rotation);

  const label = (d.label as string) || 'L';
  const formattedInductance = formatInductance((d.value as number) || 0.001);

  return (
    <div className={`relative group transition-all duration-200 select-none ${selected ? 'scale-105' : ''}`}>
      <NodeLabel
        label={label}
        valueText={formattedInductance}
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
          <svg width="64" height="24" viewBox="0 0 64 24">
            <line x1="0" y1="12" x2="10" y2="12" stroke="#06b6d4" strokeWidth="2" />
            <line x1="54" y1="12" x2="64" y2="12" stroke="#06b6d4" strokeWidth="2" />
            <path
              d="M10,12 C10,4 18,4 18,12 C18,4 26,4 26,12 C26,4 34,4 34,12 C34,4 42,4 42,12 C42,4 50,4 50,12 L54,12"
              fill="none"
              stroke={selected ? '#3b82f6' : '#e2e8f0'}
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

function formatInductance(value: number): string {
  if (value >= 1) return `${value}H`;
  if (value >= 1e-3) return `${(value * 1e3).toFixed(1)}mH`;
  if (value >= 1e-6) return `${(value * 1e6).toFixed(1)}µH`;
  return `${(value * 1e9).toFixed(1)}nH`;
}

export default memo(InductorNode);
