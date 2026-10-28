// ============================================================================
// SwitchNode.tsx — Custom React Flow node for a Switch
// Click to toggle open/closed state
// ============================================================================

import React, { memo, useCallback } from 'react';
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

const SwitchNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const d = data as Record<string, unknown>;
  const isOn = (d.isOn as boolean) !== false;
  const rotation = (d.rotation as number) || 0;
  const handles = getHandlePositions(rotation);
  const updateNodeData = useCircuitStore(s => s.updateNodeData);

  const toggleSwitch = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    updateNodeData(id, { isOn: !isOn });
  }, [id, isOn, updateNodeData]);

  const label = (d.label as string) || 'SW';

  return (
    <div className={`relative group transition-all duration-200 select-none ${selected ? 'scale-105' : ''}`}>
      <NodeLabel
        label={label}
        statusBadge={isOn ? 'CLOSED' : 'OPEN'}
        statusColor={
          isOn
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            : 'bg-red-500/20 text-red-400 border-red-500/40'
        }
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

      <div
        className={`flex flex-col items-center px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-200 ${
          selected ? 'ring-2 ring-electric-blue bg-dark-800/90 shadow-lg shadow-electric-blue/20' : 'hover:ring-1 hover:ring-dark-500 bg-dark-800/50'
        }`}
        onClick={toggleSwitch}
        title="Click to toggle switch state"
      >
        <div
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease',
          }}
          className="flex items-center justify-center p-0.5"
        >
          <svg width="64" height="28" viewBox="0 0 64 28">
            {/* Wire leads */}
            <line x1="0" y1="20" x2="18" y2="20" stroke="#06b6d4" strokeWidth="2" />
            <line x1="46" y1="20" x2="64" y2="20" stroke="#06b6d4" strokeWidth="2" />
            {/* Contact points */}
            <circle cx="18" cy="20" r="3" fill={selected ? '#3b82f6' : '#e2e8f0'} />
            <circle cx="46" cy="20" r="3" fill={selected ? '#3b82f6' : '#e2e8f0'} />
            {/* Switch arm */}
            <line
              x1="18" y1="20"
              x2={isOn ? 46 : 42}
              y2={isOn ? 20 : 6}
              stroke={isOn ? '#22c55e' : '#ef4444'}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default memo(SwitchNode);
