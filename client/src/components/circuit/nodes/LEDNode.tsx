// ============================================================================
// LEDNode.tsx — Custom React Flow node for an LED
// Lights up (glows) when simulation shows positive forward current
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

const LEDNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const d = data as Record<string, unknown>;
  const rotation = (d.rotation as number) || 0;
  const handles = getHandlePositions(rotation);
  const simulationResults = useCircuitStore(s => s.simulationResults);
  const isLit = simulationResults?.ledStates[id] || false;
  const current = simulationResults?.branchCurrents[id];

  const label = (d.label as string) || 'LED';

  return (
    <div className={`relative group transition-all duration-200 select-none ${selected ? 'scale-105' : ''}`}>
      <NodeLabel
        label={label}
        statusBadge={isLit ? 'ON' : 'OFF'}
        statusColor={
          isLit
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
            : 'bg-dark-950/90 text-dark-400 border-dark-600/70'
        }
        rotation={rotation}
      />

      <TerminalHandle
        nodeId={id}
        handleId="left"
        type="source"
        position={handles.left}
        title="Anode (+)"
      />
      <TerminalHandle
        nodeId={id}
        handleId="right"
        type="target"
        position={handles.right}
        title="Cathode (-)"
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
          <svg width="56" height="32" viewBox="0 0 56 32">
            {/* Glow effect when lit */}
            {isLit && (
              <circle cx="28" cy="16" r="18" fill="#22c55e" opacity="0.25">
                <animate attributeName="opacity" values="0.15;0.35;0.15" dur="1.2s" repeatCount="indefinite" />
              </circle>
            )}
            {/* Wire leads */}
            <line x1="0" y1="16" x2="16" y2="16" stroke="#06b6d4" strokeWidth="2" />
            <line x1="40" y1="16" x2="56" y2="16" stroke="#06b6d4" strokeWidth="2" />
            {/* Triangle (diode body) */}
            <polygon
              points="16,6 16,26 36,16"
              fill={isLit ? '#22c55e' : 'none'}
              stroke={isLit ? '#22c55e' : selected ? '#3b82f6' : '#e2e8f0'}
              strokeWidth="2"
              opacity={isLit ? 0.9 : 1}
            />
            {/* Cathode bar */}
            <line x1="36" y1="6" x2="36" y2="26"
              stroke={isLit ? '#22c55e' : selected ? '#3b82f6' : '#e2e8f0'} strokeWidth="2" />
            {/* Light rays when lit */}
            {isLit && (
              <>
                <line x1="30" y1="4" x2="35" y2="0" stroke="#22c55e" strokeWidth="2" />
                <line x1="35" y1="7" x2="40" y2="3" stroke="#22c55e" strokeWidth="2" />
              </>
            )}
          </svg>
        </div>

        {current !== undefined && (
          <div className="mt-1 text-[9px] font-mono text-electric-green whitespace-nowrap bg-dark-950/95 border border-electric-green/40 px-1.5 py-0.5 rounded shadow-sm">
            {(Math.abs(current) * 1000).toFixed(1)}mA
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(LEDNode);
