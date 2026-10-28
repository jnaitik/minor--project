// ============================================================================
// GroundNode.tsx — Custom React Flow node for Ground reference
// ============================================================================

import React, { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import NodeLabel from './NodeLabel';
import TerminalHandle from './TerminalHandle';

function getGroundHandlePosition(rotation: number = 0) {
  switch (((rotation % 360) + 360) % 360) {
    case 90: return Position.Right;
    case 180: return Position.Bottom;
    case 270: return Position.Left;
    default: return Position.Top;
  }
}

const GroundNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const d = data as Record<string, unknown>;
  const rotation = (d.rotation as number) || 0;
  const handlePos = getGroundHandlePosition(rotation);

  return (
    <div className={`relative group transition-all duration-200 select-none ${selected ? 'scale-105' : ''}`}>
      {/* Smart, non-obscuring label */}
      <NodeLabel
        label="GND"
        valueText="0V"
        rotation={rotation}
      />

      <TerminalHandle
        nodeId={id}
        handleId="top"
        type="target"
        position={handlePos}
        title="Ground Reference (0V)"
        colorClass="!bg-emerald-500 hover:!bg-emerald-400"
      />

      <div className={`flex flex-col items-center px-2 py-1.5 rounded-lg transition-all duration-200 ${
        selected ? 'ring-2 ring-electric-blue bg-dark-800/90 shadow-lg shadow-electric-blue/20' : 'hover:ring-1 hover:ring-dark-500 bg-dark-800/50'
      }`}>
        <div
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease',
          }}
          className="flex items-center justify-center p-0.5"
        >
          <svg width="32" height="32" viewBox="0 0 32 32">
            {/* Vertical wire */}
            <line x1="16" y1="0" x2="16" y2="12" stroke="#06b6d4" strokeWidth="2" />
            {/* Ground lines (decreasing width) */}
            <line x1="4" y1="12" x2="28" y2="12" stroke={selected ? '#3b82f6' : '#e2e8f0'} strokeWidth="2.5" />
            <line x1="8" y1="18" x2="24" y2="18" stroke={selected ? '#3b82f6' : '#e2e8f0'} strokeWidth="2" />
            <line x1="12" y1="24" x2="20" y2="24" stroke={selected ? '#3b82f6' : '#e2e8f0'} strokeWidth="1.5" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default memo(GroundNode);
