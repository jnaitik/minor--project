// ============================================================================
// VoltageSourceNode.tsx — Custom React Flow node for a DC Voltage Source
// ============================================================================

import React, { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { useCircuitStore } from '../../../store/circuitStore';
import NodeLabel from './NodeLabel';
import TerminalHandle from './TerminalHandle';

function getHandlePositions(rotation: number = 0) {
  switch (((rotation % 360) + 360) % 360) {
    case 90: return { positive: Position.Top, negative: Position.Bottom };
    case 180: return { positive: Position.Right, negative: Position.Left };
    case 270: return { positive: Position.Bottom, negative: Position.Top };
    default: return { positive: Position.Left, negative: Position.Right };
  }
}

const VoltageSourceNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const d = data as Record<string, unknown>;
  const rotation = (d.rotation as number) || 0;
  const handles = getHandlePositions(rotation);
  const simulationResults = useCircuitStore(s => s.simulationResults);
  const current = simulationResults?.branchCurrents[id];

  const label = (d.label as string) || 'V';
  const val = (d.value as number) || 5;

  return (
    <div className={`relative group transition-all duration-200 select-none ${selected ? 'scale-105' : ''}`}>
      {/* Smart, non-obscuring label */}
      <NodeLabel
        label={label}
        valueText={`${val}V`}
        rotation={rotation}
      />

      {/* Handles with polarity colors */}
      <TerminalHandle
        nodeId={id}
        handleId="positive"
        type="source"
        position={handles.positive}
        title="Positive (+)"
        colorClass="!bg-red-500 hover:!bg-red-400"
      />
      <TerminalHandle
        nodeId={id}
        handleId="negative"
        type="target"
        position={handles.negative}
        title="Negative (-)"
        colorClass="!bg-blue-500 hover:!bg-blue-400"
      />

      <div className={`flex flex-col items-center px-2 py-1.5 rounded-lg transition-all duration-200 ${
        selected ? 'ring-2 ring-electric-blue bg-dark-800/90 shadow-lg shadow-electric-blue/20' : 'hover:ring-1 hover:ring-dark-500 bg-dark-800/50'
      }`}>
        {/* SVG Circle Symbol with rotation */}
        <div
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease',
          }}
          className="flex items-center justify-center p-0.5"
        >
          <svg width="48" height="48" viewBox="0 0 48 48">
            {/* Wire leads */}
            <line x1="0" y1="24" x2="12" y2="24" stroke="#06b6d4" strokeWidth="2" />
            <line x1="36" y1="24" x2="48" y2="24" stroke="#06b6d4" strokeWidth="2" />
            {/* Circle */}
            <circle
              cx="24" cy="24" r="12"
              fill="none"
              stroke={selected ? '#3b82f6' : '#e2e8f0'}
              strokeWidth="2"
            />
            {/* + sign */}
            <line x1="16" y1="24" x2="22" y2="24" stroke="#ef4444" strokeWidth="2" />
            <line x1="19" y1="21" x2="19" y2="27" stroke="#ef4444" strokeWidth="2" />
            {/* - sign */}
            <line x1="26" y1="24" x2="32" y2="24" stroke="#3b82f6" strokeWidth="2" />
          </svg>
        </div>

        {current !== undefined && (
          <div className="mt-1 text-[9px] font-mono text-electric-green whitespace-nowrap bg-dark-950/95 border border-electric-green/40 px-1.5 py-0.5 rounded shadow-sm">
            {Math.abs(current * 1000).toFixed(1)}mA
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(VoltageSourceNode);
